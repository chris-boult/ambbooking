'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

export default function OnboardingAvailabilityPage() {
  const router = useRouter()

  const [businessId, setBusinessId] = useState('')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [availability, setAvailability] = useState<Record<string, AvailabilityRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push('/login')
      return
    }

    const { data: businesses } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })

    const business = businesses?.[0]

    if (!business) {
      router.push('/business/create')
      return
    }

    setBusinessId(business.id)

    const { data: members } = await supabase
      .from('team_members')
      .select('id, full_name, role')
      .eq('business_id', business.id)
      .order('created_at', { ascending: true })

    const loadedMembers = members || []
    setTeamMembers(loadedMembers)

    const nextAvailability: Record<string, AvailabilityRow[]> = {}

    for (const member of loadedMembers) {
      const { data: rows } = await supabase
        .from('availability')
        .select('day_of_week, is_available, start_time, end_time')
        .eq('team_member_id', member.id)
        .order('day_of_week', { ascending: true })

      nextAvailability[member.id] =
        rows && rows.length > 0
          ? normaliseAvailability(rows as AvailabilityRow[])
          : defaultAvailability()
    }

    setAvailability(nextAvailability)
    setLoading(false)
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

  function updateRow(
    teamMemberId: string,
    dayOfWeek: number,
    field: keyof AvailabilityRow,
    value: string | boolean
  ) {
    setAvailability((current) => ({
      ...current,
      [teamMemberId]: current[teamMemberId].map((row) =>
        row.day_of_week === dayOfWeek
          ? { ...row, [field]: value }
          : row
      ),
    }))
  }

  function copyMondayToWeekdays(teamMemberId: string) {
    const rows = availability[teamMemberId]
    const monday = rows.find((row) => row.day_of_week === 1)

    if (!monday) return

    setAvailability((current) => ({
      ...current,
      [teamMemberId]: current[teamMemberId].map((row) =>
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
    if (!businessId) {
      alert('Business not loaded yet')
      return
    }

    setSaving(true)

    for (const member of teamMembers) {
      const rows = availability[member.id] || []

      for (const row of rows) {
        const { error } = await supabase
          .from('availability')
          .upsert(
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

        if (error) {
          setSaving(false)
          alert(error.message)
          return
        }
      }
    }

    setSaving(false)
    router.push('/onboarding/plan')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading availability...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-12">
          <div className="text-sky-400 font-semibold mb-3">
            STEP 4 OF 5
          </div>

          <h1 className="text-5xl font-bold mb-4">
            Set availability
          </h1>

          <p className="text-slate-400 text-lg">
            Choose when each team member can accept bookings.
          </p>
        </div>

        {teamMembers.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <h2 className="text-2xl font-bold mb-3">
              No team members found
            </h2>

            <p className="text-slate-400 mb-6">
              Add at least one team member before setting availability.
            </p>

            <button
              onClick={() => router.push('/onboarding/team')}
              className="h-12 px-6 rounded-xl bg-white text-slate-950 font-bold"
            >
              Back to team setup
            </button>
          </div>
        )}

        <div className="space-y-8">
          {teamMembers.map((member) => (
            <section
              key={member.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-8"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold">
                    {member.full_name}
                  </h2>

                  <p className="text-slate-400">
                    {member.role || 'Team member'}
                  </p>
                </div>

                <button
                  onClick={() => copyMondayToWeekdays(member.id)}
                  className="h-11 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold"
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
                      className="grid md:grid-cols-[160px_120px_1fr_1fr] gap-4 items-center border border-slate-800 rounded-2xl p-4"
                    >
                      <div className="font-semibold">
                        {day?.label}
                      </div>

                      <label className="flex items-center gap-3 text-slate-300">
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
                        className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 disabled:opacity-40"
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
                        className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 disabled:opacity-40"
                      />
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {teamMembers.length > 0 && (
          <div className="mt-10 flex justify-end">
            <button
              onClick={saveAvailability}
              disabled={saving}
              className="h-14 px-8 rounded-xl bg-white text-slate-950 font-bold"
            >
              {saving ? 'Saving...' : 'Save availability & continue →'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}