'use client'

import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PartnerLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function login() {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    window.location.href = '/partner/dashboard'
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">AMB Booking</p>
        <h1 className="mt-3 text-3xl font-bold">Partner login</h1>
        <p className="mt-2 text-sm text-slate-400">Access your referrals, commissions, payouts and partner resources.</p>

        {message && <div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">{message}</div>}

        <div className="mt-6 space-y-4">
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="Password" value={password} onChange={setPassword} type="password" />
          <button disabled={loading} onClick={login} className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-60">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        <div className="mt-6 flex justify-between text-sm text-slate-400">
          <Link href="/partner/signup" className="hover:text-cyan-200">Create account</Link>
          <Link href="/partner/reset-password" className="hover:text-cyan-200">Reset password</Link>
        </div>
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
