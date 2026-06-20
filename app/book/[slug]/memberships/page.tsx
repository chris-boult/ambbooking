'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string | null
  slug: string | null
  logo_url?: string | null
  primary_colour?: string | null
  secondary_colour?: string | null
  business_description?: string | null
}

type MembershipPlan = {
  id: string
  business_id: string
  name: string
  description: string | null
  status: string | null
  billing_interval: string | null
  monthly_amount: number | null
  included_sessions: number | null
  rollover_sessions: boolean | null
  stripe_price_id: string | null
  membership_type?: string | null
  joining_fee?: number | null
  discount_percent?: number | null
  priority_booking?: boolean | null
  member_only_pricing?: boolean | null
  free_addons?: boolean | null
  early_access?: boolean | null
  featured?: boolean | null
  display_order?: number | null
}

function money(value: number | string | null | undefined) {
  return `£${Number(value || 0).toFixed(2)}`
}

function intervalLabel(value?: string | null) {
  if (value === 'weekly') return 'week'
  if (value === 'yearly') return 'year'
  return 'month'
}

function typeLabel(value?: string | null) {
  if (value === 'unlimited') return 'Unlimited'
  if (value === 'discount_club') return 'Discount Club'
  if (value === 'hybrid') return 'Hybrid'
  return 'Session Based'
}

function benefits(plan: MembershipPlan) {
  const items: string[] = []

  if (plan.membership_type === 'unlimited') {
    items.push('Unlimited eligible sessions')
  } else if (plan.membership_type === 'discount_club') {
    items.push(`${Number(plan.discount_percent || 0)}% member discount`)
  } else if (plan.membership_type === 'hybrid') {
    items.push(`${Number(plan.included_sessions || 0)} included sessions`)
    items.push(`${Number(plan.discount_percent || 0)}% off extras`)
  } else {
    items.push(`${Number(plan.included_sessions || 0)} included sessions`)
  }

  if (plan.priority_booking) items.push('Priority booking')
  if (plan.member_only_pricing) items.push('Member-only pricing')
  if (plan.free_addons) items.push('Free add-ons')
  if (plan.early_access) items.push('Early access')
  if (plan.rollover_sessions) items.push('Unused sessions roll over')

  return items
}

export default function PublicMembershipsPage() {
  const params = useParams()
  const slug = String(params.slug || '')

  const [business, setBusiness] = useState<Business | null>(null)
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [joiningPlanId, setJoiningPlanId] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function load() {
    setLoading(true)
    setMessage('')

    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id,business_name,slug,logo_url,primary_colour,secondary_colour,business_description')
      .eq('slug', slug)
      .maybeSingle()

    if (businessError || !businessData) {
      setMessage('Membership page not found.')
      setLoading(false)
      return
    }

    setBusiness(businessData as Business)

    const { data: planData, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('business_id', businessData.id)
      .eq('status', 'active')
      .order('display_order', { ascending: true })
      .order('monthly_amount', { ascending: true })

    if (planError) {
      setMessage(planError.message)
      setLoading(false)
      return
    }

    setPlans((planData as MembershipPlan[]) || [])
    setLoading(false)
  }

  async function joinMembership(plan: MembershipPlan) {
    setMessage('')

    if (!business) return

    if (!firstName.trim() || !email.trim()) {
      setMessage('Enter your first name and email address first.')
      return
    }

    if (!plan.stripe_price_id) {
      setMessage('This membership is not ready for online checkout yet.')
      return
    }

    setJoiningPlanId(plan.id)

    const response = await fetch('/api/memberships/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: business.id,
        planId: plan.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
      }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.url) {
      setMessage(result?.error || 'Could not start checkout.')
      setJoiningPlanId('')
      return
    }

    window.location.href = result.url
  }

  const featuredPlan = useMemo(() => plans.find((plan) => plan.featured) || plans[0] || null, [plans])
  const accent = business?.primary_colour || '#22d3ee'

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020617] p-8 text-white">
        <p className="text-slate-400">Loading memberships...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,#22d3ee22_0%,transparent_35%),radial-gradient(circle_at_bottom_right,#8b5cf622_0%,transparent_35%)]" />

      <div className="relative z-10 mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-cyan-300">
                Memberships
              </p>

              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
                Join {business?.business_name || 'our'} membership club.
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Get regular appointments, exclusive benefits and better value with a recurring membership.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-bold text-slate-300">
                  Included sessions
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-bold text-slate-300">
                  Member benefits
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-bold text-slate-300">
                  Stripe secure checkout
                </span>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-black/30 p-6">
              <div className="flex items-center gap-4">
                {business?.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={business.business_name || 'Business logo'}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black text-slate-950"
                    style={{ background: accent }}
                  >
                    {(business?.business_name || 'B').slice(0, 1)}
                  </div>
                )}

                <div>
                  <p className="text-sm text-slate-500">Memberships by</p>
                  <p className="text-xl font-black">{business?.business_name || 'Business'}</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-slate-400">Available plans</p>
                <p className="mt-1 text-3xl font-black">{plans.length}</p>
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
            {message}
          </div>
        )}

        <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black">Your details</h2>
              <p className="mt-2 text-slate-400">Enter your details before choosing a membership.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="First name"
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none placeholder:text-slate-600"
            />

            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Last name"
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none placeholder:text-slate-600"
            />

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none placeholder:text-slate-600"
            />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const isFeatured = featuredPlan?.id === plan.id
            const planBenefits = benefits(plan)

            return (
              <article
                key={plan.id}
                className={`relative overflow-hidden rounded-[36px] border p-6 ${
                  isFeatured
                    ? 'border-cyan-300/40 bg-cyan-300/10 shadow-2xl shadow-cyan-950/30'
                    : 'border-white/10 bg-white/[0.04]'
                }`}
              >
                {isFeatured && (
                  <div className="absolute right-5 top-5 rounded-full bg-cyan-400 px-3 py-1 text-xs font-black uppercase text-slate-950">
                    Featured
                  </div>
                )}

                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  {typeLabel(plan.membership_type)}
                </p>

                <h2 className="mt-4 pr-20 text-2xl font-black">{plan.name}</h2>

                <p className="mt-3 min-h-14 text-slate-400">
                  {plan.description || 'A flexible membership for regular customers.'}
                </p>

                <div className="mt-7">
                  <span className="text-5xl font-black">{money(plan.monthly_amount)}</span>
                  <span className="text-slate-400"> / {intervalLabel(plan.billing_interval)}</span>
                </div>

                {Number(plan.joining_fee || 0) > 0 && (
                  <p className="mt-2 text-sm text-slate-400">
                    Joining fee: {money(plan.joining_fee)}
                  </p>
                )}

                <div className="mt-7 space-y-3">
                  {planBenefits.map((benefit) => (
                    <div key={benefit} className="flex items-start gap-3 text-slate-300">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-slate-950"
                        style={{ background: accent }}
                      >
                        ✓
                      </span>
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={joiningPlanId === plan.id}
                  onClick={() => joinMembership(plan)}
                  className="mt-8 w-full rounded-2xl px-5 py-4 font-black text-slate-950 shadow-lg disabled:opacity-50"
                  style={{ background: accent }}
                >
                  {joiningPlanId === plan.id ? 'Starting checkout...' : 'Join membership'}
                </button>

                {!plan.stripe_price_id && (
                  <p className="mt-3 text-center text-xs text-amber-300">
                    This plan needs Stripe setup before customers can join.
                  </p>
                )}
              </article>
            )
          })}
        </section>

        {plans.length === 0 && (
          <div className="rounded-[32px] border border-dashed border-white/10 bg-white/[0.04] p-10 text-center">
            <h2 className="text-2xl font-black">No memberships available yet</h2>
            <p className="mt-2 text-slate-500">Please check back soon.</p>
          </div>
        )}
      </div>
    </main>
  )
}
