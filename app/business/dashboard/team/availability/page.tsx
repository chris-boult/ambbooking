'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  Save,
  Sparkles,
  Users,
} from 'lucide-react'

type TeamMember = {
  id: string
  full_name: string
}

type AvailabilityRow = {
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

const days = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
]

export default function AvailabilityPage() {
  const [businessId, setBusinessId] = useState('')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamMemberId, setTeamMemberId] = useState('')
  const [availability, setAvailability] = useState<AvailabilityRow[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const selectedTeamMember = teamMembers.find((member) => member.id === teamMemberId)

  const summary = useMemo(() => {
    const openDays = availability.filter((row) => row.is_available).length

    return {
      openDays,
      closedDays: availability.length ? availability.length - openDays : 0,
      teamCount: teamMembers.length,
    }
  }, [availability, teamMembers.length])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (teamMemberId) {
      loadAvailability(teamMemberId)
    }
  }, [teamMemberId])

  async function loadInitialData() {
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setLoading(false)
      return
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()

    if (!business) {
      setLoading(false)
      return
    }

    setBusinessId(business.id)

    const { data: teamData } = await supabase
      .from('team_members')
      .select('id, full_name')
      .eq('business_id', business.id)
      .order('full_name')

    const members = teamData || []
    setTeamMembers(members)

    if (members.length > 0) {
      setTeamMemberId(members[0].id)
    }

    setLoading(false)
  }

  async function loadAvailability(selectedTeamMemberId: string) {
    const { data } = await supabase
      .from('availability')
      .select('*')
      .eq('team_member_id', selectedTeamMemberId)
      .order('day_of_week', { ascending: true })

    if (data && data.length > 0) {
      setAvailability(
        days.map((day) => {
          const existing = data.find((row) => row.day_of_week === day.value)

          return {
            day_of_week: day.value,
            start_time: existing?.start_time?.slice(0, 5) || '09:00',
            end_time: existing?.end_time?.slice(0, 5) || '17:00',
            is_available: existing?.is_available ?? day.value !== 0,
          }
        })
      )
      return
    }

    setAvailability(
      days.map((day) => ({
        day_of_week: day.value,
        start_time: day.value === 0 ? '09:00' : '09:00',
        end_time: day.value === 0 ? '17:00' : '17:00',
        is_available: day.value !== 0,
      }))
    )
  }

  function updateAvailability(
    day: number,
    field: keyof AvailabilityRow,
    value: string | boolean
  ) {
    setAvailability((current) =>
      current.map((row) =>
        row.day_of_week === day ? { ...row, [field]: value } : row
      )
    )
  }

  function copyMondayToWeekdays() {
    const monday = availability.find((row) => row.day_of_week === 1)

    if (!monday) return

    setAvailability((current) =>
      current.map((row) =>
        row.day_of_week >= 1 && row.day_of_week <= 5
          ? {
              ...row,
              is_available: monday.is_available,
              start_time: monday.start_time,
              end_time: monday.end_time,
            }
          : row
      )
    )

    setMessage('Monday hours copied to weekdays.')
  }

  async function saveAvailability() {
    if (!teamMemberId) {
      setMessage('Please select a team member.')
      return
    }

    setSaving(true)
    setMessage('')

    await supabase
      .from('availability')
      .delete()
      .eq('business_id', businessId)
      .eq('team_member_id', teamMemberId)

    const rows = availability.map((row) => ({
      business_id: businessId,
      team_member_id: teamMemberId,
      day_of_week: row.day_of_week,
      start_time: row.is_available ? row.start_time : null,
      end_time: row.is_available ? row.end_time : null,
      is_available: row.is_available,
    }))

    const { error } = await supabase.from('availability').insert(rows)

    setSaving(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Availability updated successfully.')
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-[#07111f] px-8 py-6 text-slate-300">
          <Loader2 className="animate-spin text-cyan-300" />
          <span className="font-black">Loading availability...</span>
        </div>
      </main>
    )
  }

  return (
    <main className="space-y-8">
      <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
              <CalendarDays size={14} />
              Availability centre
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.055em] md:text-6xl">
              Control when your team can be booked.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              Set working days, opening times and closed days for each team member so customers only see appointments that can actually be booked.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <MiniKpi label="Team" value={summary.teamCount} />
            <MiniKpi label="Open days" value={summary.openDays} />
            <MiniKpi label="Closed days" value={summary.closedDays} />
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-bold text-slate-300">
          {message}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/10 blur-[80px]" />

          <div className="relative">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-cyan-300">Team member</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  Choose a schedule
                </h2>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.35)]">
                <Users size={24} />
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-300">
                Team member
              </span>

              <select
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
                value={teamMemberId}
                onChange={(e) => {
                  setMessage('')
                  setTeamMemberId(e.target.value)
                }}
              >
                <option value="">Select team member</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </label>

            {selectedTeamMember && (
              <div className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-lg font-black text-slate-950">
                    {getInitials(selectedTeamMember.full_name)}
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white">
                      {selectedTeamMember.full_name}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Editing bookable hours for this team member.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={copyMondayToWeekdays}
              disabled={!teamMemberId || availability.length === 0}
              className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-7 py-5 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy size={18} />
              Copy Monday to weekdays
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-cyan-300">Working hours</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                Weekly availability
              </h2>
            </div>

            <Sparkles className="text-cyan-300" />
          </div>

          {!teamMemberId && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                <Clock size={24} />
              </div>
              <h3 className="text-xl font-black text-white">
                Select a team member
              </h3>
              <p className="mt-2 text-slate-500">
                Choose someone from the left to edit their bookable hours.
              </p>
            </div>
          )}

          {teamMemberId && availability.length > 0 && (
            <div className="space-y-4">
              {days.map((day) => {
                const row = availability.find((item) => item.day_of_week === day.value)

                if (!row) return null

                return (
                  <div
                    key={day.value}
                    className={`grid gap-4 rounded-2xl border p-5 md:grid-cols-[150px_130px_1fr_1fr] md:items-center ${
                      row.is_available
                        ? 'border-white/10 bg-slate-950'
                        : 'border-white/10 bg-white/[0.025] opacity-70'
                    }`}
                  >
                    <div>
                      <div className="font-black text-white">{day.label}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {row.is_available ? 'Bookable' : 'Closed'}
                      </div>
                    </div>

                    <label className="flex items-center gap-3 text-sm font-black text-slate-300">
                      <input
                        type="checkbox"
                        checked={row.is_available}
                        onChange={(e) =>
                          updateAvailability(day.value, 'is_available', e.target.checked)
                        }
                        className="h-4 w-4 accent-cyan-400"
                      />
                      Open
                    </label>

                    <input
                      type="time"
                      disabled={!row.is_available}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                      value={row.start_time || ''}
                      onChange={(e) =>
                        updateAvailability(day.value, 'start_time', e.target.value)
                      }
                    />

                    <input
                      type="time"
                      disabled={!row.is_available}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                      value={row.end_time || ''}
                      onChange={(e) =>
                        updateAvailability(day.value, 'end_time', e.target.value)
                      }
                    />
                  </div>
                )
              })}

              <button
                onClick={saveAvailability}
                disabled={saving}
                className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-7 py-5 text-sm font-black text-slate-950 shadow-[0_0_80px_rgba(34,211,238,.35)] transition hover:-translate-y-1 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving availability
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save availability
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function MiniKpi({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}