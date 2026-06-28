'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const plans = [
  { id: 'starter', name: 'Starter', price: '£19' },
  { id: 'growth', name: 'Growth', price: '£49' },
  { id: 'pro', name: 'Pro', price: '£89' },
]

const REFERRAL_STORAGE_KEY = 'amb_referral_code'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const defaultPlan = searchParams.get('plan') || 'growth'

  const urlReferralCode =
    searchParams.get('ref') ||
    searchParams.get('partner') ||
    searchParams.get('affiliate') ||
    ''

  const storedReferralCode =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(REFERRAL_STORAGE_KEY) || ''
      : ''

  const [plan, setPlan] = useState(defaultPlan)
  const [manualReferralCode, setManualReferralCode] = useState(
    urlReferralCode || storedReferralCode
  )
  const [businessName, setBusinessName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (manualReferralCode.trim() && typeof window !== 'undefined') {
      window.localStorage.setItem(
        REFERRAL_STORAGE_KEY,
        manualReferralCode.trim()
      )
    }
  }, [manualReferralCode])

  const selectedPlan = useMemo(
    () => plans.find((item) => item.id === plan) || plans[1],
    [plan]
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!businessName.trim() || !fullName.trim() || !email.trim() || !password.trim()) {
        setError('Please complete all fields.')
        return
      }

      const finalReferralCode = manualReferralCode.trim() || null

      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            business_name: businessName.trim(),
            plan,
            referral_code: finalReferralCode,
            partner_code: finalReferralCode,
            affiliate_code: finalReferralCode,
          },
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      })

      if (signupError) {
        setError(signupError.message)
        return
      }

      router.push('/onboarding')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] px-6 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.22),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,.16),transparent_30%),radial-gradient(circle_at_20%_70%,rgba(124,58,237,.15),transparent_28%)]" />

      <header className="mx-auto flex h-32 max-w-[1500px] items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="AMB Booking"
            width={340}
            height={104}
            priority
            className="h-20 w-auto object-contain"
          />
        </Link>

        <div className="hidden items-center gap-4 md:flex">
          <span className="text-sm font-bold text-slate-400">
            Already have an account?
          </span>

          <Link
            href="/login"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
          >
            Login
          </Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-128px)] max-w-[1500px] items-center gap-14 pb-20 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <p className="mb-6 text-xs font-black uppercase tracking-[0.38em] text-cyan-300">
            Start your free trial
          </p>

          <h1 className="max-w-4xl text-6xl font-black leading-[1.02] tracking-[-0.055em] md:text-8xl">
            Launch your booking platform today.
          </h1>

          <div className="mt-8 max-w-2xl space-y-5 text-lg leading-8 text-slate-300">
            <p>
              Create your AMB Booking account and start setting up online booking, customer CRM, calendar management and your Money Centre from one connected platform.
            </p>

            <p>
              Start simple, then unlock payments, memberships, packages, vouchers, reminders, white-label branding and app-ready experiences as your business grows.
            </p>
          </div>

          <div className="mt-10 grid max-w-2xl gap-4 md:grid-cols-3">
            {[
              '7-day free trial',
              'Money Centre included',
              'Upgrade as you grow',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4"
              >
                <CheckCircle2 size={18} className="text-cyan-300" />
                <span className="font-black text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.65 }}
          className="relative"
        >
          <div className="absolute -inset-8 rounded-[4rem] bg-cyan-400/10 blur-[120px]" />

          <form
            onSubmit={handleSubmit}
            className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_70px_240px_rgba(0,0,0,.7)]"
          >
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-cyan-300">
                  Create account
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  Start with {selectedPlan.name}
                </h2>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.35)]">
                <Sparkles size={24} />
              </div>
            </div>

            <div className="mb-8">
              <label className="mb-2 block text-sm font-black text-slate-300">
                Partner / affiliate code
              </label>

              <input
                value={manualReferralCode}
                onChange={(e) => setManualReferralCode(e.target.value)}
                placeholder="Optional referral code"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
              />

              <p className="mt-2 text-sm text-slate-500">
                Add a partner or affiliate code if you were referred.
              </p>
            </div>

            <div className="mb-8 grid gap-3 md:grid-cols-3">
              {plans.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPlan(item.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    plan === item.id
                      ? 'border-cyan-300 bg-cyan-400 text-slate-950'
                      : 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="font-black">{item.name}</div>
                  <div
                    className={`mt-1 text-sm font-bold ${
                      plan === item.id ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {item.price} + VAT / month
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-black text-slate-300">
                  Business name
                </label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Business Name"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-300">
                  Your name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Business Owner Name"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-300">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.co.uk"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-300">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 pr-14 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm font-bold text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-7 py-5 text-sm font-black text-slate-950 shadow-[0_0_80px_rgba(34,211,238,.35)] transition hover:-translate-y-1 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating account
                </>
              ) : (
                <>
                  Start your free trial
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <ShieldCheck size={20} className="mt-1 shrink-0 text-cyan-300" />
              <p className="text-sm leading-6 text-slate-400">
                Your account will be created securely. You can complete business setup, services, team members and availability during onboarding.
              </p>
            </div>
          </form>
        </motion.div>
      </section>
    </main>
  )
}