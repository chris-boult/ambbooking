'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    router.push('/admin')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#020617] px-6 text-white">
      <form
        onSubmit={login}
        className="w-full max-w-md rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.55)]"
      >
        <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
          AMB Booking Admin
        </p>

        <h1 className="mb-8 text-4xl font-black tracking-[-0.04em]">
          Admin login
        </h1>

        <div className="space-y-4">
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-cyan-400 px-6 py-4 font-black text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.25)] transition hover:-translate-y-1 hover:bg-cyan-300 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Login to admin'}
          </button>
        </div>

        {message && (
          <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-200">
            {message}
          </p>
        )}
      </form>
    </main>
  )
}