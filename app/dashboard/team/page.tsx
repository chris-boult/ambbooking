'use client'

import RoleGuard from '@/components/RoleGuard'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type TeamMember = {
  id: string
  full_name: string
  email: string | null
  role: string | null
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [businessId, setBusinessId] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userData.user.id)
      .single()

    if (!business) return

    setBusinessId(business.id)

    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    setTeamMembers(data || [])
  }

  async function createTeamMember(e: React.FormEvent) {
    e.preventDefault()

    const { error } = await supabase.from('team_members').insert({
      business_id: businessId,
      full_name: fullName,
      email,
      role,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setFullName('')
    setEmail('')
    setRole('')
    setMessage('Team member created successfully')
    loadData()
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-2">Team</h1>
      <p className="text-slate-400 mb-8">
        Manage staff members and roles.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">Add Team Member</h2>

          <form onSubmit={createTeamMember} className="space-y-4">
            <input
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <input
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              placeholder="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />

            <button className="w-full bg-white text-slate-950 font-bold p-3 rounded-lg">
              Create Team Member
            </button>

            {message && <p className="text-slate-300">{message}</p>}
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">Your Team</h2>

          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="border border-slate-800 rounded-xl p-4"
              >
                <h3 className="font-bold">{member.full_name}</h3>
                <p className="text-slate-400 text-sm">{member.role}</p>
                <p className="text-slate-400 text-sm">{member.email}</p>
              </div>
            ))}

            {teamMembers.length === 0 && (
              <p className="text-slate-500">No team members yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}