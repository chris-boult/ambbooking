'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type TeamMember = {
  id: string
  full_name: string
}

type TimeOff = {
  id: string
  start_date: string
  end_date: string
  reason: string | null
  team_members:
    | {
        full_name: string
      }[]
    | null
}

export default function TimeOffPage() {
  const [businessId, setBusinessId] = useState('')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [timeOff, setTimeOff] = useState<TimeOff[]>([])

  const [teamMemberId, setTeamMemberId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
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
      .order('full_name')

    const { data: timeOffData } = await supabase
      .from('team_time_off')
      .select(`
        id,
        start_date,
        end_date,
        reason,
        team_members (
          full_name
        )
      `)
      .eq('business_id', business.id)
      .order('start_date', { ascending: true })

    setTeamMembers((teamData as TeamMember[]) || [])
    setTimeOff((timeOffData as unknown as TimeOff[]) || [])
  }

  async function createTimeOff(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    if (!businessId || !teamMemberId || !startDate || !endDate) {
      setMessage('Please complete all required fields.')
      return
    }

    const { error } = await supabase.from('team_time_off').insert({
      business_id: businessId,
      team_member_id: teamMemberId,
      start_date: startDate,
      end_date: endDate,
      reason,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setTeamMemberId('')
    setStartDate('')
    setEndDate('')
    setReason('')
    setMessage('Time off saved successfully.')
    loadData()
  }

  async function deleteTimeOff(id: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this time off?'
    )

    if (!confirmed) return

    await supabase
      .from('team_time_off')
      .delete()
      .eq('id', id)

    loadData()
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-2">Time off</h1>

      <p className="text-slate-400 mb-8">
        Manage holidays, sickness, training days and staff unavailability.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">Add time off</h2>

          <form onSubmit={createTimeOff} className="space-y-4">
            <select
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              value={teamMemberId}
              onChange={(e) => setTeamMemberId(e.target.value)}
            >
              <option value="">Select team member</option>

              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <input
              type="date"
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            <input
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              placeholder="Reason, e.g. Holiday, sickness, training"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <button className="w-full bg-white text-slate-950 font-bold p-3 rounded-lg">
              Save time off
            </button>

            {message && (
              <p className="text-slate-300">{message}</p>
            )}
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">Scheduled time off</h2>

          <div className="space-y-4">
            {timeOff.map((item) => (
              <div
                key={item.id}
                className="border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <h3 className="font-bold">
                    {item.team_members?.[0]?.full_name || 'Unknown team member'}
                  </h3>

                  <p className="text-slate-400 text-sm mt-1">
                    {new Date(item.start_date).toLocaleDateString('en-GB')} -{' '}
                    {new Date(item.end_date).toLocaleDateString('en-GB')}
                  </p>

                  {item.reason && (
                    <p className="text-slate-400 text-sm mt-1">
                      {item.reason}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => deleteTimeOff(item.id)}
                  className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm font-semibold"
                >
                  Delete
                </button>
              </div>
            ))}

            {timeOff.length === 0 && (
              <p className="text-slate-500">
                No time off recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}