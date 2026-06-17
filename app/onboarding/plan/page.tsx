'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Plan = {
  id: 'starter' | 'growth' | 'pro'
  name: string
  eyebrow: string
  price: string
  vatPrice: string
  description: string
  highlighted?: boolean
  features: string[]
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    eyebrow: 'For sole traders',
    price: '£19',
    vatPrice: '£22.80 inc VAT',
    description: 'The essential booking system for independent professionals who need a simple, reliable way to take bookings online.',
    features: [
      'Online booking page',
      'Unlimited bookings',
      'Services',
      'Availability',
      'Time off management',
      'Customer database',
      'Email confirmations',
      'Booking management',
      '7-day free trial',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    eyebrow: 'Most popular',
    price: '£49',
    vatPrice: '£58.80 inc VAT',
    description: 'For growing businesses that need team management, payments, reporting and stronger day-to-day control.',
    highlighted: true,
    features: [
      'Everything in Starter',
      'Unlimited team members',
      'Deposits',
      'Full online payments',
      'Revenue reporting',
      'Team performance reporting',
      'Customer history',
      'Automated reminders',
      'Business insights dashboard',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    eyebrow: 'For serious operators',
    price: '£89',
    vatPrice: '£106.80 inc VAT',
    description: 'Advanced tools for established businesses, multi-site operators and brands that want more commercial firepower.',
    features: [
      'Everything in Growth',
      'Multi-location support',
      'SMS reminders',
      'Gift cards',
      'Service packages',
      'Memberships',
      'Promotional codes',
      'Waitlists',
      'Recurring appointments',
      'Custom branding',
      'Advanced analytics',
      'Priority support',
    ],
  },
]

export default function OnboardingPlanPage() {
  const router = useRouter()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  async function choosePlan(plan: Plan['id']) {
    try {
      setLoadingPlan(plan)

      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.push('/login')
        return
      }

      const { data: businesses, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })

      if (businessError) {
        alert(businessError.message)
        return
      }

      const business = businesses?.[0]

      if (!business) {
        router.push('/business/create')
        return
      }

      const response = await fetch('/api/create-subscription-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          businessId: business.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        alert(result.error || 'Something went wrong creating checkout')
        return
      }

      if (!result.url) {
        alert('Stripe checkout URL was not returned')
        return
      }

      window.location.href = result.url
    } catch (error) {
      console.error(error)
      alert('Unable to create checkout session')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#0ea5e933_0%,transparent_28%),radial-gradient(circle_at_bottom_right,#7c3aed33_0%,transparent_32%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <div className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sky-300 text-sm font-semibold mb-6">
            STEP 5 OF 5
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5">
            Choose your
            <span className="block bg-gradient-to-r from-sky-400 via-cyan-300 to-violet-300 bg-clip-text text-transparent">
              AMB Booking plan.
            </span>
          </h1>

          <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-8">
            Start your 7-day free trial today. No payment is taken until your trial ends.
          </p>

          <p className="text-slate-500 mt-3">
            All prices exclude VAT. VAT is shown for clarity at 20%.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`relative rounded-[32px] p-8 border backdrop-blur-xl transition ${
                plan.highlighted
                  ? 'bg-sky-500/10 border-sky-400 shadow-2xl shadow-sky-500/10 lg:-translate-y-4'
                  : 'bg-white/5 border-white/10 hover:border-sky-500/30'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-8 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 px-4 py-2 text-sm font-bold text-slate-950">
                  Most popular
                </div>
              )}

              <div className="mb-8">
                <div className="text-sky-300 text-sm font-semibold mb-3">
                  {plan.eyebrow}
                </div>

                <h2 className="text-3xl font-bold mb-4">
                  {plan.name}
                </h2>

                <p className="text-slate-400 leading-7 min-h-[104px]">
                  {plan.description}
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-6xl font-bold">
                    {plan.price}
                  </span>

                  <span className="text-slate-400 pb-2">
                    + VAT / month
                  </span>
                </div>

                <div className="text-slate-500 text-sm">
                  {plan.vatPrice}
                </div>
              </div>

              <button
                onClick={() => choosePlan(plan.id)}
                disabled={loadingPlan !== null}
                className={`w-full h-14 rounded-2xl font-bold transition mb-8 ${
                  plan.highlighted
                    ? 'bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 hover:opacity-90'
                    : 'bg-white text-slate-950 hover:bg-slate-200'
                } disabled:opacity-60`}
              >
                {loadingPlan === plan.id
                  ? 'Creating checkout...'
                  : 'Start 7-day free trial →'}
              </button>

              <div className="space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex gap-3 text-sm leading-6">
                    <span className="text-green-400 shrink-0">✓</span>
                    <span className="text-slate-200">{feature}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <section className="mt-14 rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-8">
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-white mb-2">
                7 days
              </div>
              <div className="text-slate-400 text-sm">
                Free trial included
              </div>
            </div>

            <div>
              <div className="text-2xl font-bold text-white mb-2">
                £0
              </div>
              <div className="text-slate-400 text-sm">
                Taken today
              </div>
            </div>

            <div>
              <div className="text-2xl font-bold text-white mb-2">
                Secure
              </div>
              <div className="text-slate-400 text-sm">
                Stripe billing
              </div>
            </div>

            <div>
              <div className="text-2xl font-bold text-white mb-2">
                UK
              </div>
              <div className="text-slate-400 text-sm">
                Support and updates
              </div>
            </div>
          </div>
        </section>

        <p className="text-center text-slate-500 text-sm mt-8">
          You can change plan later from your AMB Booking dashboard.
        </p>
      </div>
    </main>
  )
}
