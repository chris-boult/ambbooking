'use client'

import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PartnerResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function resetPassword() {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/partner/login`,
    })

    setMessage(error ? error.message : 'Password reset email sent.')
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">AMB Booking</p>
        <h1 className="mt-3 text-3xl font-bold">Reset password</h1>
        <p className="mt-2 text-sm text-slate-400">Enter your partner email and we’ll send a reset link.</p>
        {message && <div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">{message}</div>}
        <label className="mt-6 block">
          <span className="mb-2 block text-sm font-semibold text-slate-300">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none ring-cyan-300/40 focus:ring-2" />
        </label>
        <button disabled={loading} onClick={resetPassword} className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-60">
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
        <p className="mt-6 text-sm text-slate-400"><Link href="/partner/login" className="text-cyan-200">Back to login</Link></p>
      </div>
    </main>
  )
}
