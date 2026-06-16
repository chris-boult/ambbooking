'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Business = {
  id: string
  business_name: string
  industry: string | null
  website: string | null
  phone: string | null
  timezone: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.push('/login')
        return
      }

      setEmail(userData.user.email ?? null)

      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', userData.user.id)
        .single()

      if (!businessData) {
        router.push('/business/create')
        return
      }

      setBusiness(businessData)
    }

    loadDashboard()
  }, [router])

  return (
    <>
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        {email && <p className="text-slate-400">Logged in as: {email}</p>}
      </div>

      {business && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 mb-2">Business</p>
            <h2 className="text-2xl font-bold">{business.business_name}</h2>
            <p className="text-slate-400 mt-2">{business.industry}</p>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 mb-2">Upcoming bookings</p>
            <h2 className="text-3xl font-bold">0</h2>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 mb-2">Revenue this month</p>
            <h2 className="text-3xl font-bold">£0</h2>
          </section>
        </div>
      )}
    </>
  )
}