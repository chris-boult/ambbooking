'use client'

import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const makeCode = (company: string, email: string) => {
  const base = (company || email.split('@')[0] || 'PARTNER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${base}${suffix}`
}

export default function PartnerSignupPage() {
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function signup() {
    setLoading(true)
    setMessage('')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    })

    if (authError || !authData.user) {
      setMessage(authError?.message || 'Could not create account.')
      setLoading(false)
      return
    }

    const referralCode = makeCode(companyName || fullName, email)

    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .insert({
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        company_name: companyName.trim(),
        referral_code: referralCode,
        commission_type: 'percentage',
        commission_value: 10,
        fixed_bounty: 0,
        lifetime_commission: true,
        status: 'pending',
      })
      .select('*')
      .maybeSingle()

    if (partnerError || !partner) {
      setMessage(partnerError?.message || 'Account created, but partner profile could not be created.')
      setLoading(false)
      return
    }

    const { error: linkError } = await supabase.from('partner_users').insert({
      partner_id: partner.id,
      user_id: authData.user.id,
      role: 'owner',
    })

    if (linkError) {
      setMessage(linkError.message)
      setLoading(false)
      return
    }

    setMessage('Partner account created. If email confirmation is enabled, check your inbox. Otherwise you can log in now.')
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">AMB Booking</p>
        <h1 className="mt-3 text-3xl font-bold">Partner signup</h1>
        <p className="mt-2 text-sm text-slate-400">Create a partner account and start tracking referrals.</p>

        {message && <div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">{message}</div>}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Full name" value={fullName} onChange={setFullName} />
          <Field label="Company name" value={companyName} onChange={setCompanyName} />
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="Password" value={password} onChange={setPassword} type="password" />
        </div>

        <button disabled={loading} onClick={signup} className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-60">
          {loading ? 'Creating account...' : 'Create partner account'}
        </button>

        <p className="mt-6 text-sm text-slate-400">Already have an account? <Link href="/partner/login" className="text-cyan-200">Log in</Link></p>
      </div>
    </main>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-300">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none ring-cyan-300/40 focus:ring-2" />
    </label>
  )
}
