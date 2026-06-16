'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CreateBusinessPage() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('')
  const [website, setWebsite] = useState('')
  const [phone, setPhone] = useState('')
  const [timezone, setTimezone] = useState('Europe/London')
  const [message, setMessage] = useState('')

  async function handleCreateBusiness(e: React.FormEvent) {
    e.preventDefault()

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push('/login')
      return
    }

    const { error } = await supabase.from('businesses').insert({
      user_id: userData.user.id,
      business_name: businessName,
      industry,
      website,
      phone,
      timezone,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <form onSubmit={handleCreateBusiness} className="w-full max-w-xl bg-slate-900 p-8 rounded-2xl border border-slate-800">
        <h1 className="text-3xl font-bold mb-2">Create your business</h1>
        <p className="text-slate-400 mb-6">Set up the first business profile for your booking platform.</p>

        <input className="w-full mb-4 p-3 rounded-lg bg-slate-800 border border-slate-700" placeholder="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />

        <input className="w-full mb-4 p-3 rounded-lg bg-slate-800 border border-slate-700" placeholder="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />

        <input className="w-full mb-4 p-3 rounded-lg bg-slate-800 border border-slate-700" placeholder="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />

        <input className="w-full mb-4 p-3 rounded-lg bg-slate-800 border border-slate-700" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <input className="w-full mb-6 p-3 rounded-lg bg-slate-800 border border-slate-700" placeholder="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />

        <button className="w-full bg-white text-slate-950 font-bold p-3 rounded-lg">
          Create business
        </button>

        {message && <p className="mt-4 text-slate-300">{message}</p>}
      </form>
    </main>
  )
}