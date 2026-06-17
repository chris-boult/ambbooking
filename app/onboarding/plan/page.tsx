'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '£19',
    description: 'Perfect for sole traders and small service businesses.',
    features: [
      'Online booking page',
      'Services',
      'Team members',
      'Availability',
      'Time off',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '£39',
    description: 'For businesses ready to take payments and manage growth.',
    features: [
      'Everything in Starter',
      'Deposits',
      'Full online payments',
      'Customer CRM',
      'Email confirmations',
      'Reporting',
    ],
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '£79',
    description: 'For larger teams and businesses needing more control.',
    features: [
      'Everything in Growth',
      'Multiple locations',
      'Team performance',
      'Advanced analytics',
      'Priority support',
    ],
  },
]

export default function OnboardingPlanPage() {
  const router = useRouter()

  async function choosePlan(plan: string) {
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push('/login')
      return
    }

    const { data: businesses } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })

    const business = businesses?.[0]

    if (!business) {
      router.push('/business/create')
      return
    }

    const { error } = await supabase
      .from('businesses')
      .update({
        plan,
        subscription_status: 'trial',
      })
      .eq('id', business.id)

    if (error) {
      alert(error.message)
      return
    }

    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <div className="text-sky-400 font-semibold mb-3">
            STEP 5 OF 5
          </div>

          <h1 className="text-5xl font-bold mb-4">
            Choose your plan
          </h1>

          <p className="text-slate-400 text-lg">
            Start your 7-day free trial. No payment taken today.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl p-8 border ${
                plan.highlighted
                  ? 'bg-sky-500/10 border-sky-400'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              {plan.highlighted && (
                <div className="inline-flex mb-5 rounded-full bg-sky-400 text-slate-950 text-sm font-bold px-4 py-2">
                  Most popular
                </div>
              )}

              <h2 className="text-3xl font-bold mb-3">
                {plan.name}
              </h2>

              <div className="mb-5">
                <span className="text-5xl font-bold">
                  {plan.price}
                </span>
                <span className="text-slate-400">
                  /month
                </span>
              </div>

              <p className="text-slate-400 mb-8">
                {plan.description}
              </p>

              <div className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex gap-3">
                    <span className="text-green-400">✓</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => choosePlan(plan.id)}
                className={`w-full h-14 rounded-xl font-bold ${
                  plan.highlighted
                    ? 'bg-sky-400 text-slate-950'
                    : 'bg-white text-slate-950'
                }`}
              >
                Start free trial →
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}