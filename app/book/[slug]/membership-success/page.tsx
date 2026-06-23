'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string | null
  slug: string | null
  logo_url: string | null
  primary_colour: string | null
  secondary_colour: string | null
}

type Customer = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
}

type Membership = {
  id: string
  business_id: string
  customer_id: string
  membership_plan_id: string | null
  membership_name: string
  status: string | null
  billing_interval: string | null
  monthly_amount: number | null
  included_sessions: number | null
  sessions_used: number | null
  current_period_start: string | null
  current_period_end: string | null
  stripe_subscription_id: string | null
  customers?: Customer | Customer[] | null
  businesses?: Business | Business[] | null
}

type Benefit = {
  id: string
  business_id: string
  membership_plan_id: string
  benefit: string
  display_order: number | null
}

function joinOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] || null
  return value
}

function money(value: number | string | null | undefined) {
  return `£${Number(value || 0).toFixed(2)}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function intervalLabel(value?: string | null) {
  if (value === 'weekly') return 'week'
  if (value === 'yearly') return 'year'
  return 'month'
}

function sessionsRemaining(membership: Membership) {
  return Math.max(0, Number(membership.included_sessions || 0) - Number(membership.sessions_used || 0))
}

function utilisationPercent(membership: Membership) {
  const included = Number(membership.included_sessions || 0)
  const used = Number(membership.sessions_used || 0)
  if (included <= 0) return 0
  return Math.min(100, Math.round((used / included) * 100))
}

export default function MembershipSuccessPage() {
  const searchParams = useSearchParams()
  const subscriptionId = searchParams.get('subscription_id') || ''
  const customerEmail = searchParams.get('email') || ''
  const businessSlug = searchParams.get('slug') || ''

  const [membership, setMembership] = useState<Membership | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [benefits, setBenefits] = useState<Benefit[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadMembership()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId, customerEmail, businessSlug])

  async function loadMembership() {
    setLoading(true)
    setMessage('')

    try {
      let foundMembership: Membership | null = null

      if (subscriptionId) {
        const { data, error } = await supabase
          .from('customer_memberships')
          .select('*, customers(id,first_name,last_name,email), businesses(id,business_name,slug,logo_url,primary_colour,secondary_colour)')
          .eq('stripe_subscription_id', subscriptionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error
        foundMembership = (data as unknown as Membership) || null
      }

      if (!foundMembership && customerEmail) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .ilike('email', customerEmail.trim())
          .limit(1)
          .maybeSingle()

        if (customer?.id) {
          const { data, error } = await supabase
            .from('customer_memberships')
            .select('*, customers(id,first_name,last_name,email), businesses(id,business_name,slug,logo_url,primary_colour,secondary_colour)')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (error) throw error
          foundMembership = (data as unknown as Membership) || null
        }
      }

      if (!foundMembership && businessSlug) {
        const { data: businessData } = await supabase
          .from('businesses')
          .select('id,business_name,slug,logo_url,primary_colour,secondary_colour')
          .eq('slug', businessSlug)
          .maybeSingle()

        if (businessData?.id) {
          setBusiness(businessData as Business)
        }
      }

      if (!foundMembership) {
        setMessage('Your membership is active and ready to use. Book your first appointment and choose "Use Membership" during checkout.')
        setLoading(false)
        return
      }

      setMembership(foundMembership)

      const foundBusiness = joinOne(foundMembership.businesses as any)
      if (foundBusiness) setBusiness(foundBusiness)

      if (foundMembership.membership_plan_id) {
        const { data: benefitData } = await supabase
          .from('membership_plan_benefits')
          .select('*')
          .eq('business_id', foundMembership.business_id)
          .eq('membership_plan_id', foundMembership.membership_plan_id)
          .order('display_order', { ascending: true })

        setBenefits((benefitData as Benefit[]) || [])
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Your membership is active, but we could not load the latest membership details yet.')
    }

    setLoading(false)
  }

  const customer = joinOne(membership?.customers as any)
  const accent = business?.primary_colour || '#f97316'
  const secondAccent = business?.secondary_colour || '#facc15'
  const planName = membership?.membership_name || 'Membership'
  const remaining = membership ? sessionsRemaining(membership) : 0
  const included = Number(membership?.included_sessions || 0)
  const used = Number(membership?.sessions_used || 0)
  const usage = membership ? utilisationPercent(membership) : 0

  const bookingUrl = useMemo(() => {
    if (business?.slug) return `/book/${business.slug}`
    if (businessSlug) return `/book/${businessSlug}`
    return '/book'
  }, [business?.slug, businessSlug])

  const membershipsUrl = useMemo(() => {
    if (business?.slug) return `/book/${business.slug}/memberships`
    if (businessSlug) return `/book/${businessSlug}/memberships`
    return '#'
  }, [business?.slug, businessSlug])

  const displayBenefits = benefits.length > 0 ? benefits : [
    {
      id: 'included-sessions',
      business_id: membership?.business_id || '',
      membership_plan_id: membership?.membership_plan_id || '',
      benefit: `${included || 'Your'} included sessions`,
      display_order: 1,
    },
  ]

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080808] p-8 text-white">
        <p className="text-stone-400">Loading membership...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          background: `radial-gradient(circle at 15% 10%, ${accent}22 0%, transparent 30%), radial-gradient(circle at 85% 0%, ${secondAccent}18 0%, transparent 32%), linear-gradient(135deg, #080808 0%, #111111 55%, #17120c 100%)`,
        }}
      />

      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:py-12">
        <section className="overflow-hidden rounded-[36px] border border-white/10 bg-[#111111]/90 shadow-2xl backdrop-blur-2xl">
          <div
            className="h-2 w-full"
            style={{
              background: `linear-gradient(90deg, ${accent}, ${secondAccent})`,
            }}
          />

          <div className="grid gap-8 p-6 md:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-black"
                  style={{ background: accent }}
                >
                  ✓
                </span>
                <span className="text-xs font-black uppercase tracking-[0.25em] text-stone-300">
                  Membership activated
                </span>
              </div>

              <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
                Welcome to {planName}.
              </h1>

              <p className="mt-6 max-w-2xl text-xl leading-8 text-stone-300">
                {customer?.first_name ? `${customer.first_name}, your` : 'Your'} membership is active and ready to use.
              </p>

              <div className="mt-8 rounded-[28px] border border-white/10 bg-black/30 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-stone-500">
                      Ready this month
                    </p>
                    <p className="mt-2 text-3xl font-black">
                      {membership ? `${remaining} session${remaining === 1 ? '' : 's'} available` : 'Ready to book'}
                    </p>
                    <p className="mt-3 max-w-xl text-stone-300">
                      Choose <span className="font-black text-white">Use Membership</span> when booking and we’ll automatically deduct sessions from your balance.
                    </p>
                  </div>

                  {membership && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:min-w-48">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Status</p>
                      <p className="mt-2 text-2xl font-black capitalize">{membership.status || 'active'}</p>
                    </div>
                  )}
                </div>

                {membership && included > 0 && (
                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-sm text-stone-400">
                      <span>{used} used</span>
                      <span>{included} included</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${usage}%`,
                          background: `linear-gradient(90deg, ${accent}, ${secondAccent})`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {message && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-stone-300">
                  {message}
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={bookingUrl}
                  className="rounded-2xl px-6 py-4 text-center font-black text-black shadow-lg transition hover:scale-[1.01]"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${secondAccent})` }}
                >
                  Use your first session
                </Link>

                <Link
                  href={membershipsUrl}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-center font-black text-white transition hover:bg-white/10"
                >
                  View memberships
                </Link>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-black/35 p-6 shadow-2xl">
              <div className="flex items-center gap-4">
                {business?.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={business.business_name || 'Business logo'}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black text-black"
                    style={{ background: accent }}
                  >
                    {(business?.business_name || 'M').slice(0, 1)}
                  </div>
                )}

                <div>
                  <p className="text-sm text-stone-500">Membership with</p>
                  <p className="text-xl font-black">{business?.business_name || 'Your business'}</p>
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-stone-500">Membership card</p>
                <p className="mt-4 text-4xl font-black">{planName}</p>
                <p className="mt-3 text-stone-300">
                  {membership ? `${money(membership.monthly_amount)} / ${intervalLabel(membership.billing_interval)}` : 'Active'}
                </p>

                {membership && (
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">Remaining</p>
                      <p className="mt-2 text-2xl font-black">{remaining}</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">Renews</p>
                      <p className="mt-2 text-lg font-black">{formatDate(membership.current_period_end)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-stone-500">How it works</p>

                <div className="mt-5 space-y-4">
                  <HowStep number="1" title="Book appointment" copy="Choose your service, specialist, date and time." accent={accent} />
                  <HowStep number="2" title="Select Use Membership" copy="Your active membership will appear on the booking form." accent={accent} />
                  <HowStep number="3" title="Session deducted automatically" copy="When the booking is completed, your balance updates." accent={accent} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-white/10 bg-[#111111]/80 p-6 backdrop-blur-2xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-stone-500">Your membership includes</p>
            <h2 className="mt-3 text-3xl font-black">Ready to use today.</h2>

            <div className="mt-5 space-y-3">
              <IncludedItem label={`${included || 'Your'} included sessions`} accent={accent} />
              {displayBenefits.slice(0, 4).map((benefit) => (
                <IncludedItem key={benefit.id} label={benefit.benefit} accent={accent} />
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[#111111]/80 p-6 backdrop-blur-2xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-stone-500">Next step</p>
            <h2 className="mt-3 text-3xl font-black">Book your first member appointment.</h2>
            <p className="mt-4 text-lg leading-8 text-stone-300">
              Your membership balance will be picked up by the booking form automatically once you enter the email address used for this membership.
            </p>

            <Link
              href={bookingUrl}
              className="mt-6 inline-flex rounded-2xl px-6 py-4 font-black text-black shadow-lg transition hover:scale-[1.01]"
              style={{ background: `linear-gradient(135deg, ${accent}, ${secondAccent})` }}
            >
              Use your first session
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

function IncludedItem({ label, accent }: { label: string; accent: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-stone-300">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-black"
        style={{ background: accent }}
      >
        ✓
      </span>
      <span>{label}</span>
    </div>
  )
}

function HowStep({
  number,
  title,
  copy,
  accent,
}: {
  number: string
  title: string
  copy: string
  accent: string
}) {
  return (
    <div className="flex gap-4">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-black"
        style={{ background: accent }}
      >
        {number}
      </span>
      <div>
        <p className="font-black">{title}</p>
        <p className="mt-1 text-sm leading-6 text-stone-400">{copy}</p>
      </div>
    </div>
  )
}
