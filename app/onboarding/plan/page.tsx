'use client'

import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Crown,
  Loader2,
  Rocket,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string
  created_at: string
}

type Plan = {
  id: 'starter' | 'growth' | 'pro'
  name: string
  eyebrow: string
  price: string
  vatPrice: string
  description: string
  highlighted?: boolean
  icon: any
  included: string[]
  also: string[]
}

const STORAGE_KEY = 'amb_onboarding_business_id'

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    eyebrow: 'Perfect for startups',
    price: '£19',
    vatPrice: '£22.80 inc VAT',
    description:
      'For small service businesses that want online booking, customer records, a cleaner calendar and a better way to manage appointments.',
    icon: Rocket,
    included: [
      'Online booking page',
      'Calendar management',
      'Customer CRM',
      'Money Centre',
    ],
    also: [
      'Team members',
      'Email confirmations',
      'Customer notes',
      'Basic reporting',
      'In-system support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    eyebrow: 'Most popular',
    price: '£49',
    vatPrice: '£58.80 inc VAT',
    description:
      'For growing businesses that want to reduce admin, take payments, improve communication and turn more bookings into repeat customers.',
    highlighted: true,
    icon: Sparkles,
    included: [
      'Everything in Starter',
      'Deposits and online payments',
      'Gift vouchers',
      'Packages',
    ],
    also: [
      'Waiting list',
      'Review requests',
      'SMS reminders',
      'Push notifications',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    eyebrow: 'Everything unlocked',
    price: '£89',
    vatPrice: '£106.80 inc VAT',
    description:
      'For serious operators that want memberships, white-label branding, custom domains, apps and deeper control over the customer experience.',
    icon: Crown,
    included: [
      'Everything in Growth',
      'Memberships',
      'White-label branding',
      'Custom domain',
    ],
    also: [
      'Free SSL',
      'Advanced reporting',
      'PWA included',
      'Mobile app ready',
      'Priority support',
    ],
  },
]

function OnboardingPlanContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessId, setBusinessId] = useState('')
  const [loadingPage, setLoadingPage] = useState(true)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState('')

  const selectedBusiness = businesses.find((business) => business.id === businessId)

  useEffect(() => {
    loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadBusinesses() {
    setLoadingPage(true)
    setError('')

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push('/login')
      return
    }

    const { data, error: businessError } = await supabase
      .from('businesses')
      .select('id,business_name,created_at')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })

    if (businessError) {
      setError(businessError.message)
      setLoadingPage(false)
      return
    }

    if (!data || data.length === 0) {
      router.push('/business/create')
      return
    }

    setBusinesses(data as Business[])

    const queryBusinessId = searchParams.get('businessId')
    const storedBusinessId =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY)
        : null

    const chosenBusiness =
      data.find((business) => business.id === queryBusinessId) ||
      data.find((business) => business.id === storedBusinessId)

    if (!chosenBusiness) {
      setBusinessId('')
      setError('Please select the business you want to set up.')
      setLoadingPage(false)
      return
    }

    selectBusiness(chosenBusiness.id, false)
    setLoadingPage(false)
  }

  function selectBusiness(nextBusinessId: string, shouldReplaceUrl = true) {
    setError('')
    setBusinessId(nextBusinessId)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextBusinessId)
    }

    if (shouldReplaceUrl) {
      router.replace(`/onboarding/plan?businessId=${nextBusinessId}`)
    }
  }

  async function choosePlan(plan: Plan['id']) {
    try {
      setError('')

      if (!businessId) {
        setError('Please select the business you want to set up first.')
        return
      }

      setLoadingPlan(plan)

      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/create-subscription-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          businessId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Something went wrong creating checkout.')
        return
      }

      if (!result.url) {
        setError('Stripe checkout URL was not returned.')
        return
      }

      window.location.href = result.url
    } catch (checkoutError) {
      console.error(checkoutError)
      setError('Unable to create checkout session.')
    } finally {
      setLoadingPlan(null)
    }
  }

  if (loadingPage) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-6 text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.22),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,.16),transparent_30%),radial-gradient(circle_at_20%_70%,rgba(124,58,237,.15),transparent_28%)]" />

        <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-[#07111f] px-8 py-6 shadow-[0_50px_180px_rgba(0,0,0,.55)]">
          <Loader2 className="animate-spin text-cyan-300" />
          <span className="font-black text-slate-200">Loading plans</span>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] px-6 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.22),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,.16),transparent_30%),radial-gradient(circle_at_20%_70%,rgba(124,58,237,.15),transparent_28%)]" />

      <header className="mx-auto flex h-32 max-w-[1500px] items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="AMB Booking"
            width={340}
            height={104}
            priority
            className="h-20 w-auto object-contain"
          />
        </Link>

        <Link
          href="/business/dashboard"
          className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/[0.08] md:inline-flex"
        >
          Skip to dashboard
        </Link>
      </header>

      <section className="mx-auto max-w-[1500px] pb-20">
        <div className="mx-auto mb-12 max-w-5xl text-center">
          <p className="mb-6 text-xs font-black uppercase tracking-[0.38em] text-cyan-300">
            Step 5 of 5
          </p>

          <h1 className="text-5xl font-black leading-[1.02] tracking-[-0.055em] md:text-7xl">
            Choose your AMB Booking plan.
          </h1>

          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-lg leading-8 text-slate-300">
            <p>
              Start your 7-day free trial and launch your booking platform with the tools your business needs today.
            </p>

            <p>
              No payment is taken until your trial ends. You can change plan later from your AMB Booking dashboard.
            </p>
          </div>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-5">
          {['Business', 'Services', 'Team', 'Availability', 'Launch'].map((item, index) => (
            <div
              key={item}
              className={`rounded-2xl border px-5 py-4 ${
                index === 4
                  ? 'border-cyan-300 bg-cyan-400 text-slate-950'
                  : index < 4
                    ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100'
                    : 'border-white/10 bg-white/[0.035] text-slate-400'
              }`}
            >
              <div className="text-xs font-black uppercase tracking-[0.22em]">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="mt-2 font-black">{item}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        <div className="mb-10 rounded-[2rem] border border-white/10 bg-[#07111f] p-6">
          <div className="mb-4 flex items-center gap-3">
            <Briefcase size={20} className="text-cyan-300" />
            <label className="block text-sm font-black text-cyan-300">
              Choose the business you are setting up
            </label>
          </div>

          <select
            value={businessId}
            onChange={(e) => selectBusiness(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
          >
            <option value="" disabled>
              Select a business
            </option>

            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.business_name}
              </option>
            ))}
          </select>

          {selectedBusiness && (
            <p className="mt-4 text-sm font-bold text-slate-400">
              Plan selection will be connected to {selectedBusiness.business_name}.
            </p>
          )}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const Icon = plan.icon

            return (
              <motion.article
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
                className={`relative rounded-[2.5rem] border p-8 shadow-[0_50px_180px_rgba(0,0,0,.5)] ${
                  plan.highlighted
                    ? 'border-cyan-300/50 bg-cyan-400 text-slate-950 shadow-[0_0_120px_rgba(34,211,238,.28)] lg:-translate-y-4'
                    : 'border-white/10 bg-[#07111f] text-white'
                }`}
              >
                <div
                  className={`mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                    plan.highlighted
                      ? 'bg-slate-950 text-cyan-300'
                      : 'border border-white/10 bg-white/[0.04] text-cyan-300'
                  }`}
                >
                  {plan.eyebrow}
                </div>

                <div
                  className={`mb-8 flex h-16 w-16 items-center justify-center rounded-3xl ${
                    plan.highlighted
                      ? 'bg-slate-950 text-cyan-300'
                      : 'bg-cyan-400 text-slate-950'
                  }`}
                >
                  <Icon size={28} />
                </div>

                <h2 className="text-3xl font-black tracking-[-0.04em]">
                  {plan.name}
                </h2>

                <div className="mt-7">
                  <div className="flex items-start gap-3">
                    <span className="text-7xl font-black leading-none tracking-[-0.07em]">
                      {plan.price}
                    </span>

                    <div
                      className={`pt-3 text-left text-sm font-black leading-5 ${
                        plan.highlighted ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      <div>/ month</div>
                      <div>+ VAT</div>
                    </div>
                  </div>

                  <div
                    className={`mt-3 text-sm font-bold ${
                      plan.highlighted ? 'text-slate-700' : 'text-slate-500'
                    }`}
                  >
                    {plan.vatPrice}
                  </div>
                </div>

                <p
                  className={`mt-7 min-h-[112px] leading-7 ${
                    plan.highlighted ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {plan.description}
                </p>

                <button
                  onClick={() => choosePlan(plan.id)}
                  disabled={loadingPlan !== null || !businessId}
                  className={`mt-8 inline-flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-5 text-sm font-black transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60 ${
                    plan.highlighted
                      ? 'bg-slate-950 text-white hover:bg-slate-900'
                      : 'bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-950 hover:from-cyan-300 hover:to-blue-300'
                  }`}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating checkout
                    </>
                  ) : (
                    <>
                      Start 7-day free trial
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div
                  className={`mt-8 border-t pt-8 ${
                    plan.highlighted ? 'border-slate-950/15' : 'border-white/10'
                  }`}
                >
                  <p
                    className={`mb-4 text-xs font-black uppercase tracking-[0.22em] ${
                      plan.highlighted ? 'text-slate-700' : 'text-cyan-300'
                    }`}
                  >
                    Included
                  </p>

                  <div className="space-y-4">
                    {plan.included.map((feature) => (
                      <div key={feature} className="flex gap-3">
                        <CheckCircle2
                          size={19}
                          className={`mt-0.5 shrink-0 ${
                            plan.highlighted ? 'text-slate-950' : 'text-cyan-300'
                          }`}
                        />
                        <span className="font-bold">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className={`mt-8 border-t pt-8 ${
                    plan.highlighted ? 'border-slate-950/15' : 'border-white/10'
                  }`}
                >
                  <p
                    className={`mb-4 text-xs font-black uppercase tracking-[0.22em] ${
                      plan.highlighted ? 'text-slate-700' : 'text-cyan-300'
                    }`}
                  >
                    Also includes
                  </p>

                  <div className="space-y-4">
                    {plan.also.map((feature) => (
                      <div key={feature} className="flex gap-3">
                        <CheckCircle2
                          size={19}
                          className={`mt-0.5 shrink-0 ${
                            plan.highlighted ? 'text-slate-950' : 'text-cyan-300'
                          }`}
                        />
                        <span className="font-bold">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-4">
          {[
            ['7-day free trial', Sparkles],
            ['£0 taken today', CheckCircle2],
            ['Secure Stripe billing', ShieldCheck],
            ['Support included', CheckCircle2],
          ].map(([label, Icon]: any) => (
            <div
              key={label}
              className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5"
            >
              <Icon size={19} className="text-cyan-300" />
              <span className="font-black text-white">{label}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

export default function OnboardingPlanPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
          Loading plans...
        </main>
      }
    >
      <OnboardingPlanContent />
    </Suspense>
  )
}
