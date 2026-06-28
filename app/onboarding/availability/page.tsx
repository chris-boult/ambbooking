'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Clock,
  Loader2,
  Settings,
  Sparkles,
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
  role: string | null
}

type AvailabilityRow = {
  day_of_week: number
  is_available: boolean
  start_time: string
  end_time: string
}

const STORAGE_KEY = 'amb_onboarding_business_id'

const days = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
]

function defaultAvailability(): AvailabilityRow[] {
  return days.map((day) => ({
    day_of_week: day.value,
    is_available: day.value >= 1 && day.value <= 5,
    start_time: '09:00',
    end_time: '17:00',
  }))
}

function normaliseAvailability(rows: AvailabilityRow[]) {
  return days.map((day) => {
    const existing = rows.find((row) => row.day_of_week === day.value)

    return {
      day_of_week: day.value,
      is_available: existing?.is_available ?? (day.value >= 1 && day.value <= 5),
      start_time: existing?.start_time?.slice(0, 5) || '09:00',
      end_time: existing?.end_time?.slice(0, 5) || '17:00',
    }
  })
}

function OnboardingAvailabilityContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessId, setBusinessId] = useState('')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [availability, setAvailability] = useState<Record<string, AvailabilityRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedBusiness = businesses.find((business) => business.id === businessId)

  const availabilitySummary = useMemo(() => {
    let availableDays = 0
    let totalDays = 0

    Object.values(availability).forEach((rows) => {
      rows.forEach((row) => {
        totalDays += 1
        if (row.is_available) availableDays += 1
      })
    })

    return {
      availableDays,
      totalDays,
      teamCount: teamMembers.length,
    }
  }, [availability, teamMembers.length])

  useEffect(() => {
    loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadBusinesses() {
    setLoading(true)
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
      setLoading(false)
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
      setTeamMembers([])
      setAvailability({})
      setError('Please select the business you want to set up.')
      setLoading(false)
      return
    }

    await selectBusiness(chosenBusiness.id, false)
    setLoading(false)
  }

  async function selectBusiness(nextBusinessId: string, shouldReplaceUrl = true) {
    setError('')
    setBusinessId(nextBusinessId)
    setTeamMembers([])
    setAvailability({})

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextBusinessId)
    }

    if (shouldReplaceUrl) {
      router.replace(`/onboarding/availability?businessId=${nextBusinessId}`)
    }

    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('id, full_name, role')
      .eq('business_id', nextBusinessId)
      .order('created_at', { ascending: true })

    if (membersError) {
      setError(membersError.message)
      return
    }

    const loadedMembers = (members || []) as TeamMember[]
    setTeamMembers(loadedMembers)

    const nextAvailability: Record<string, AvailabilityRow[]> = {}

    for (const member of loadedMembers) {
      const { data: rows, error: rowsError } = await supabase
        .from('availability')
        .select('day_of_week, is_available, start_time, end_time')
        .eq('team_member_id', member.id)
        .order('day_of_week', { ascending: true })

      if (rowsError) {
        setError(rowsError.message)
        return
      }

      nextAvailability[member.id] =
        rows && rows.length > 0
          ? normaliseAvailability(rows as AvailabilityRow[])
          : defaultAvailability()
    }

    setAvailability(nextAvailability)
  }

  function updateRow(
    teamMemberId: string,
    dayOfWeek: number,
    field: keyof AvailabilityRow,
    value: string | boolean
  ) {
    setAvailability((current) => ({
      ...current,
      [teamMemberId]: (current[teamMemberId] || defaultAvailability()).map((row) =>
        row.day_of_week === dayOfWeek ? { ...row, [field]: value } : row
      ),
    }))
  }

  function copyMondayToWeekdays(teamMemberId: string) {
    const rows = availability[teamMemberId] || []
    const monday = rows.find((row) => row.day_of_week === 1)

    if (!monday) return

    setAvailability((current) => ({
      ...current,
      [teamMemberId]: (current[teamMemberId] || defaultAvailability()).map((row) =>
        row.day_of_week >= 1 && row.day_of_week <= 5
          ? {
              ...row,
              is_available: monday.is_available,
              start_time: monday.start_time,
              end_time: monday.end_time,
            }
          : row
      ),
    }))
  }

  async function saveAvailability() {
    setError('')

    if (!businessId) {
      setError('Please select the business you want to set up first.')
      return
    }

    if (teamMembers.length === 0) {
      setError('Add at least one team member before setting availability.')
      return
    }

    setSaving(true)

    for (const member of teamMembers) {
      const rows = availability[member.id] || []

      for (const row of rows) {
        const { error: upsertError } = await supabase.from('availability').upsert(
          {
            business_id: businessId,
            team_member_id: member.id,
            day_of_week: row.day_of_week,
            is_available: row.is_available,
            start_time: row.start_time,
            end_time: row.end_time,
          },
          {
            onConflict: 'team_member_id,day_of_week',
          }
        )

        if (upsertError) {
          setSaving(false)
          setError(upsertError.message)
          return
        }
      }
    }

    setSaving(false)
    router.push(`/onboarding/plan?businessId=${businessId}`)
  }

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-6 text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.22),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,.16),transparent_30%),radial-gradient(circle_at_20%_70%,rgba(124,58,237,.15),transparent_28%)]" />

        <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-[#07111f] px-8 py-6 shadow-[0_50px_180px_rgba(0,0,0,.55)]">
          <Loader2 className="animate-spin text-cyan-300" />
          <span className="font-black text-slate-200">Loading availability</span>
        </div>
      </main>
    )
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
              Step 4 of 5
            </p>

            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.055em] md:text-7xl">
              Set when your team can be booked.
            </h1>
          </motion.div>

          <div className="max-w-2xl space-y-5 text-lg leading-8 text-slate-300">
            <p>
              Availability controls when each team member can accept bookings. Set working days,
              start times and finish times so customers only see bookable slots.
            </p>

            <p>
              You can start with simple weekday availability now and fine-tune individual schedules,
              holidays and time off later from the dashboard.
            </p>
          </div>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-5">
          {['Business', 'Services', 'Team', 'Availability', 'Launch'].map((item, index) => (
            <div
              key={item}
              className={`rounded-2xl border px-5 py-4 ${
                index === 3
                  ? 'border-cyan-300 bg-cyan-400 text-slate-950'
                  : index < 3
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

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            {teamMembers.length === 0 && (
              <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_70px_240px_rgba(0,0,0,.55)]">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
                  <Users size={24} />
                </div>

                <h2 className="text-3xl font-black tracking-[-0.04em]">
                  No team members found
                </h2>

                <p className="mt-4 max-w-2xl leading-7 text-slate-400">
                  Add at least one team member before setting availability.
                </p>

                <button
                  onClick={() => router.push(`/onboarding/team?businessId=${businessId}`)}
                  className="mt-8 inline-flex items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-7 py-5 text-sm font-black text-slate-950 transition hover:-translate-y-1 hover:bg-cyan-300"
                >
                  Back to team setup
                  <ArrowRight size={18} />
                </button>
              </div>
            )}

            {teamMembers.map((member, memberIndex) => (
              <motion.section
                key={member.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: memberIndex * 0.06, duration: 0.45 }}
                className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_70px_240px_rgba(0,0,0,.55)]"
              >
                <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.35)]">
                      <Users size={24} />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-cyan-300">
                        {member.role || 'Team member'}
                      </p>
                      <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">
                        {member.full_name}
                      </h2>
                    </div>
                  </div>

                  <button
                    onClick={() => copyMondayToWeekdays(member.id)}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
                  >
                    Copy Monday to weekdays
                  </button>
                </div>

                <div className="space-y-4">
                  {(availability[member.id] || []).map((row) => {
                    const day = days.find((item) => item.value === row.day_of_week)

                    return (
                      <div
                        key={row.day_of_week}
                        className={`grid gap-4 rounded-2xl border p-4 md:grid-cols-[160px_150px_1fr_1fr] md:items-center ${
                          row.is_available
                            ? 'border-white/10 bg-slate-950'
                            : 'border-white/10 bg-white/[0.025] opacity-70'
                        }`}
                      >
                        <div>
                          <div className="font-black">{day?.label}</div>
                          <div className="mt-1 text-xs font-bold text-slate-500">
                            {row.is_available ? 'Bookable' : 'Closed'}
                          </div>
                        </div>

                        <label className="flex items-center gap-3 text-sm font-black text-slate-300">
                          <input
                            type="checkbox"
                            checked={row.is_available}
                            onChange={(e) =>
                              updateRow(
                                member.id,
                                row.day_of_week,
                                'is_available',
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 accent-cyan-400"
                          />
                          Available
                        </label>

                        <input
                          type="time"
                          value={row.start_time}
                          disabled={!row.is_available}
                          onChange={(e) =>
                            updateRow(
                              member.id,
                              row.day_of_week,
                              'start_time',
                              e.target.value
                            )
                          }
                          className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                        />

                        <input
                          type="time"
                          value={row.end_time}
                          disabled={!row.is_available}
                          onChange={(e) =>
                            updateRow(
                              member.id,
                              row.day_of_week,
                              'end_time',
                              e.target.value
                            )
                          }
                          className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </div>
                    )
                  })}
                </div>
              </motion.section>
            ))}
          </div>

          <div className="space-y-8">
            <div className="sticky top-8 overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_70px_240px_rgba(0,0,0,.55)]">
              <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-cyan-300">
                    Availability preview
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                    Your bookable week
                  </h2>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
                  <Sparkles size={24} />
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-slate-950 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <CalendarDays size={20} className="mb-4 text-cyan-300" />
                    <div className="text-3xl font-black">
                      {availabilitySummary.availableDays}
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-400">
                      available day slots
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <Users size={20} className="mb-4 text-cyan-300" />
                    <div className="text-3xl font-black">
                      {availabilitySummary.teamCount}
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-400">
                      team members
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                  <Clock size={20} className="mb-4 text-cyan-300" />
                  <p className="text-sm font-bold leading-6 text-cyan-100">
                    Customers will only see available times based on these working hours.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-4">
                <button
                  onClick={saveAvailability}
                  disabled={saving || !businessId || teamMembers.length === 0}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-7 py-5 text-sm font-black text-slate-950 transition hover:-translate-y-1 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving availability
                    </>
                  ) : (
                    <>
                      Save availability & continue
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <button
                  onClick={() => router.push('/business/dashboard')}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-7 py-5 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/[0.09]"
                >
                  Go to dashboard
                  <Settings size={18} />
                </button>
              </div>

              {selectedBusiness && (
                <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-sm font-bold text-slate-500">
                    Setting up
                  </p>
                  <p className="mt-1 font-black text-white">
                    {selectedBusiness.business_name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}


export default function OnboardingAvailabilityPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
          Loading availability...
        </main>
      }
    >
      <OnboardingAvailabilityContent />
    </Suspense>
  )
}
