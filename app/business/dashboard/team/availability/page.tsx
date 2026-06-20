'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (teamMemberId) {
      loadAvailability(teamMemberId)
    }
  }, [teamMemberId])

  async function loadInitialData() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()

    if (!business) return

    setBusinessId(business.id)

    const { data: teamData } = await supabase
      .from('team_members')
      .select('id, full_name')
      .eq('business_id', business.id)

    setTeamMembers(teamData || [])
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
          const existing = data.find(
            (row) => row.day_of_week === day.value
          )

          return {
            day_of_week: day.value,
            start_time: existing?.start_time || '09:00',
            end_time: existing?.end_time || '17:00',
            is_available: existing?.is_available ?? day.value !== 0,
          }
        })
      )
      return
    }

    setAvailability(
      days.map((day) => ({
        day_of_week: day.value,
        start_time: day.value === 0 ? '' : '09:00',
        end_time: day.value === 0 ? '' : '17:00',
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
        row.day_of_week === day
          ? { ...row, [field]: value }
          : row
      )
    )
  }

  async function saveAvailability() {
    if (!teamMemberId) {
      setMessage('Please select a team member.')
      return
    }

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

    const { error } = await supabase
      .from('availability')
      .insert(rows)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Availability updated successfully.')
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-2">Availability</h1>
      <p className="text-slate-400 mb-8">
        Edit working hours for each team member.
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-4xl">
        <label className="block text-slate-400 mb-2">
          Team member
        </label>

        <select
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 mb-6"
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

        {availability.length > 0 && (
          <div className="space-y-4">
            {days.map((day) => {
              const row = availability.find(
                (item) => item.day_of_week === day.value
              )

              if (!row) return null

              return (
                <div
                  key={day.value}
                  className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center border border-slate-800 rounded-xl p-4"
                >
                  <div className="font-medium">{day.label}</div>

                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={row.is_available}
                      onChange={(e) =>
                        updateAvailability(
                          day.value,
                          'is_available',
                          e.target.checked
                        )
                      }
                    />
                    Open
                  </label>

                  <input
                    type="time"
                    disabled={!row.is_available}
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40"
                    value={row.start_time || ''}
                    onChange={(e) =>
                      updateAvailability(
                        day.value,
                        'start_time',
                        e.target.value
                      )
                    }
                  />

                  <input
                    type="time"
                    disabled={!row.is_available}
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40"
                    value={row.end_time || ''}
                    onChange={(e) =>
                      updateAvailability(
                        day.value,
                        'end_time',
                        e.target.value
                      )
                    }
                  />
                </div>
              )
            })}

            <button
              onClick={saveAvailability}
              className="w-full bg-white text-slate-950 font-bold p-3 rounded-lg mt-6"
            >
              Save availability
            </button>
          </div>
        )}

        {message && (
          <p className="text-slate-300 mt-4">{message}</p>
        )}
      </div>
    </div>
  )
}