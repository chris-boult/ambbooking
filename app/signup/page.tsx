'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [referralCode, setReferralCode] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')

    if (ref) {
      const cleanRef = ref.trim().toUpperCase()

      localStorage.setItem('partner_ref', cleanRef)

      document.cookie = `partner_ref=${cleanRef}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`

      setReferralCode(cleanRef)
    } else {
      const storedRef = localStorage.getItem('partner_ref')
      if (storedRef) {
        setReferralCode(storedRef)
      }
    }
  }, [])

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    const storedReferralCode =
      referralCode ||
      localStorage.getItem('partner_ref') ||
      ''

    const { error } = await supabase.auth.signUp({
  email: email.trim().toLowerCase(),
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/business/create`,
    data: {
      partner_ref: storedReferralCode || null,
      acquisition_source: storedReferralCode ? 'Partner' : 'Direct',
    },
  },
})

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Check your email to confirm your account.')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <form
        onSubmit={handleSignUp}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8"
      >
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
          AMB Booking
        </p>

        <h1 className="mb-3 text-3xl font-bold">Create your account</h1>

        <p className="mb-6 text-sm text-slate-400">
          Start building your booking platform.
        </p>

        {referralCode && (
          <div className="mb-5 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">
            Referral code applied:{' '}
            <span className="font-mono font-bold">{referralCode}</span>
          </div>
        )}

        <input
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-800 p-3"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-800 p-3"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <button className="w-full rounded-lg bg-white p-3 font-bold text-slate-950">
          Sign up
        </button>

        {message && <p className="mt-4 text-slate-300">{message}</p>}
      </form>
    </main>
  )
}