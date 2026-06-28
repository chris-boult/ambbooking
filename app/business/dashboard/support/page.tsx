'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function BusinessSupportPage() {
  const [businessId, setBusinessId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState('normal')
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadBusiness()
  }, [])

  async function loadBusiness() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: business } = await supabase
      .from('businesses')
      .select('id,business_name')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (business) {
      setBusinessId(business.id)
      setBusinessName(business.business_name || '')
    }
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault()
    setStatus('')

    if (!subject.trim() || !message.trim()) {
      setStatus('Please add a subject and message.')
      return
    }

    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase.from('support_tickets').insert({
      business_id: businessId,
      business_name: businessName,
      user_id: userData.user?.id || null,
      user_email: userData.user?.email || null,
      subject: subject.trim(),
      message: message.trim(),
      category,
      priority,
      status: 'open',
      source: 'business_dashboard',
    })

    setLoading(false)

    if (error) {
      setStatus(error.message)
      return
    }

    setSubject('')
    setMessage('')
    setPriority('normal')
    setCategory('general')
    setStatus('Support ticket raised successfully. AMB Booking support can now see this in the admin centre.')
  }

  return (
    <main className="space-y-8 text-white">
      <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
        <div className="mb-6 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
          Support centre
        </div>

        <h1 className="max-w-5xl text-5xl font-black leading-[1.02] tracking-[-0.055em] md:text-6xl">
          Need help with AMB Booking?
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-400">
          Raise a support ticket and it will feed directly into the platform admin support centre for review.
        </p>
      </section>

      {status && (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-4 text-sm font-bold text-cyan-100">
          {status}
        </div>
      )}

      <section className="max-w-4xl rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.42)]">
        <form onSubmit={submitTicket} className="space-y-5">
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <select
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="general">General</option>
              <option value="billing">Billing</option>
              <option value="payments">Payments</option>
              <option value="bookings">Bookings</option>
              <option value="technical">Technical issue</option>
              <option value="feature_request">Feature request</option>
            </select>

            <select
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <textarea
            className="min-h-48 w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
            placeholder="Tell us what you need help with..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <button
            disabled={loading}
            className="rounded-2xl bg-cyan-400 px-7 py-5 text-sm font-black text-slate-950 shadow-[0_0_80px_rgba(34,211,238,.35)] transition hover:-translate-y-1 hover:bg-cyan-300 disabled:opacity-60"
          >
            {loading ? 'Submitting ticket...' : 'Raise support ticket'}
          </button>
        </form>
      </section>
    </main>
  )
}