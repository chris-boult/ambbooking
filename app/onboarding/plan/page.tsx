'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '£19',
    vatPrice: '£22.80',
    description: 'Perfect for sole traders and independent professionals.',
    features: [
      'Online booking page',
      'Unlimited bookings',
      'Services',
      'Availability',
      'Time off management',
      'Customer database',
      'Email confirmations',
      'Booking management',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '£49',
    vatPrice: '£58.80',
    description: 'For growing businesses and teams.',
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
    price: '£89',
    vatPrice: '£106.80',
    description: 'For ambitious businesses and multi-site operators.',
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

  async function choosePlan(plan: string) {
    try {
      setLoadingPlan(plan)

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

      const response = await fetch(
        '/api/create-subscription-checkout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plan,
            businessId: business.id,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        alert(result.error || 'Something went wrong')
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
            Start your 7-day free trial today.
          </p>

          <p className="text-slate-500 mt-2">
            No payment taken until your trial ends. All prices exclude VAT.
          </p>
        </div>
      </div>
    </main>
  )
}
