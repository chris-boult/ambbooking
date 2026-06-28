'use client'

import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Loader2,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string
  created_at: string
}

type TeamMember = {
  id: string
  full_name: string
  email: string | null
  role: string
}

const STORAGE_KEY = 'amb_onboarding_business_id'

function TeamOnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessId, setBusinessId] = useState('')
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingBusiness, setLoadingBusiness] = useState(true)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Team Member')

  const selectedBusiness = businesses.find((business) => business.id === businessId)
  const canContinue = Boolean(businessId) && team.length > 0

  useEffect(() => {
    loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadBusinesses() {
    setLoadingBusiness(true)
    setError('')

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push('/login')
      return
    }

    const { data, error: businessError } = await supabase
      .from('businesses')
      .select('id,business_name,created_at')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })

    if (businessError) {
      setError(businessError.message)
      setLoadingBusiness(false)
      return
    }

    if (!data || data.length === 0) {
      router.push('/business/create')
      return
    }

    setBusinesses(data as Business[])

    const queryBusinessId = searchParams.get('businessId')
    const storedBusinessId =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY)
        : null

    const chosenBusiness =
      data.find((business) => business.id === queryBusinessId) ||
      data.find((business) => business.id === storedBusinessId)

    if (!chosenBusiness) {
      setBusinessId('')
      setTeam([])
      setLoadingBusiness(false)
      setError('Please select the business you want to set up.')
      return
    }

    await selectBusiness(chosenBusiness.id, false)
    setLoadingBusiness(false)
  }

  async function selectBusiness(nextBusinessId: string, shouldReplaceUrl = true) {
    setError('')
    setBusinessId(nextBusinessId)
    setTeam([])

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextBusinessId)
    }

    if (shouldReplaceUrl) {
      router.replace(`/onboarding/team?businessId=${nextBusinessId}`)
    }

    const { data, error: teamError } = await supabase
      .from('team_members')
      .select('*')
      .eq('business_id', nextBusinessId)
      .order('created_at', { ascending: false })

    if (teamError) {
      setError(teamError.message)
      return
    }

    setTeam((data || []) as TeamMember[])
  }

  async function addTeamMember() {
    setError('')

    if (!businessId) {
      setError('Please select the business you want to set up first.')
      return
    }

    if (!fullName.trim()) {
      setError('Please enter a team member name.')
      return
    }

    setLoading(true)

    const { error: insertError } = await supabase.from('team_members').insert({
      business_id: businessId,
      full_name: fullName.trim(),
      email: email.trim(),
      role,
    })

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setFullName('')
    setEmail('')
    setRole('Team Member')

    await selectBusiness(businessId, false)
  }

  async function deleteMember(id: string) {
    if (!businessId) return

    const confirmed = window.confirm('Delete this team member?')
    if (!confirmed) return

    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    await selectBusiness(businessId, false)
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

        <Link
          href="/business/dashboard"
          className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/[0.08] md:inline-flex"
        >
          Skip to dashboard
        </Link>
      </header>

      <section className="mx-auto max-w-[1500px] pb-20">
        <div className="mb-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="mb-6 text-xs font-black uppercase tracking-[0.38em] text-cyan-300">
              Step 3 of 5
            </p>

            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.055em] md:text-7xl">
              Add the people who take bookings.
            </h1>
          </motion.div>

          <div className="max-w-2xl space-y-5 text-lg leading-8 text-slate-300">
            <p>
              Team members are the people customers can book with. Add your staff, assign their role and prepare your calendar for real availability.
            </p>

            <p>
              You can start with one person now and add the rest later from the business dashboard.
            </p>
          </div>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-5">
          {['Business', 'Services', 'Team', 'Availability', 'Launch'].map((item, index) => (
            <div
              key={item}
              className={`rounded-2xl border px-5 py-4 ${
                index === 2
                  ? 'border-cyan-300 bg-cyan-400 text-slate-950'
                  : index < 2
                    ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100'
                    : 'border-white/10 bg-white/[0.035] text-slate-400'
              }`}
            >
              <div className="text-xs font-black uppercase tracking-[0.22em]">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="mt-2 font-black">{item}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        <div className="mb-8 rounded-[2rem] border border-white/10 bg-[#07111f] p-6">
          <div className="mb-4 flex items-center gap-3">
            <Briefcase size={20} className="text-cyan-300" />
            <label className="block text-sm font-black text-cyan-300">
              Choose the business you are setting up
            </label>
          </div>

          <select
            value={businessId}
            onChange={(e) => selectBusiness(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
          >
            <option value="" disabled>
              Select a business
            </option>

            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.business_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative">
            <div className="absolute -inset-8 rounded-[4rem] bg-cyan-400/10 blur-[120px]" />

            <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_70px_240px_rgba(0,0,0,.7)]">
              <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-cyan-300">
                    {selectedBusiness?.business_name || 'Select a business first'}
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                    Add a team member
                  </h2>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.35)]">
                  <UserPlus size={24} />
                </div>
              </div>

              <div className="space-y-5">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!businessId}
                />

                <input
                  type="email"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!businessId}
                />

                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={!businessId}
                >
                  <option>Team Member</option>
                  <option>Manager</option>
                  <option>Owner</option>
                </select>

                <button
                  onClick={addTeamMember}
                  disabled={loading || loadingBusiness || !businessId}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-7 py-5 text-sm font-black text-slate-950 shadow-[0_0_80px_rgba(34,211,238,.35)] transition hover:-translate-y-1 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Adding team member
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Add team member
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_70px_240px_rgba(0,0,0,.55)]">
              <p className="text-sm font-bold text-cyan-300">Team preview</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                Who customers can book with
              </h2>

              <div className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950 p-6">
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
                    <Users size={24} />
                  </div>

                  <div>
                    <h3 className="text-2xl font-black">
                      {fullName || 'Example team member'}
                    </h3>
                    <p className="mt-2 leading-7 text-slate-400">
                      {role} {email ? `· ${email}` : ''}
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan-400/10 px-4 py-2 text-sm font-black text-cyan-300">
                      <CheckCircle2 size={16} />
                      Ready for service assignment
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_70px_240px_rgba(0,0,0,.55)]">
              <p className="text-sm font-bold text-cyan-300">Your team</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                {team.length} added
              </h2>

              <div className="mt-8 space-y-4">
                {team.map((member) => (
                  <div key={member.id} className="rounded-2xl border border-white/10 bg-slate-950 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-black text-white">{member.full_name}</div>
                        <div className="mt-1 text-sm text-slate-400">
                          {member.role}
                        </div>
                        {member.email && (
                          <div className="mt-2 text-sm font-bold text-cyan-300">
                            {member.email}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => deleteMember(member.id)}
                        className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-slate-400 transition hover:bg-red-400/10 hover:text-red-300"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}

                {team.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-500">
                    No team members added for this business yet.
                  </div>
                )}
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => router.push(`/onboarding/availability?businessId=${businessId}`)}
                  disabled={!canContinue}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-7 py-5 text-sm font-black text-slate-950 transition hover:-translate-y-1 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue to availability
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={() => router.push('/business/dashboard')}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-7 py-5 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/[0.09]"
                >
                  Go to dashboard
                  <Settings size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function TeamOnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
          Loading team...
        </main>
      }
    >
      <TeamOnboardingContent />
    </Suspense>
  )
}
