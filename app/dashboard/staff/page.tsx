'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import RoleGuard from '@/components/RoleGuard'

type Business = {
  id: string
  business_name: string
}

type TeamMember = {
  id: string
  full_name: string
  role: string | null
}

type StaffUser = {
  id: string
  email: string
  role: string
  team_member_id: string
  created_at: string
  team_members: {
    full_name: string
    role: string | null
  } | null
}

export default function StaffPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])

  const [teamMemberId, setTeamMemberId] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadStaffManagement()
  }, [])

  async function loadStaffManagement() {
    setLoading(true)
    setMessage('')

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError) {
      setMessage(userError.message)
      setLoading(false)
      return
    }

    if (!userData.user) {
      setMessage('You are not logged in.')
      setLoading(false)
      return
    }

    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id,business_name')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (businessError) {
      setMessage(businessError.message)
      setLoading(false)
      return
    }

    const businessData = businesses?.[0]

    if (!businessData) {
      setMessage('No business is linked to this login.')
      setLoading(false)
      return
    }

    setBusiness(businessData as Business)

    const { data: teamData, error: teamError } = await supabase
      .from('team_members')
      .select('id,full_name,role')
      .eq('business_id', businessData.id)
      .order('full_name')

    if (teamError) {
      setMessage(teamError.message)
      setLoading(false)
      return
    }

    const { data: staffData, error: staffError } = await supabase
      .from('staff_users')
      .select(`
        id,
        email,
        role,
        team_member_id,
        created_at,
        team_members!staff_users_team_member_id_fkey (
          full_name,
          role
        )
      `)
      .eq('business_id', businessData.id)
      .order('created_at', { ascending: false })

    if (staffError) {
      setMessage(staffError.message)
      setLoading(false)
      return
    }

    setTeamMembers((teamData as TeamMember[]) || [])
    setStaffUsers((staffData as unknown as StaffUser[]) || [])
    setLoading(false)
  }

  async function addStaffUser() {
    if (!business) {
      setMessage('Business not loaded.')
      return
    }

    if (!teamMemberId || !email.trim()) {
      setMessage('Please choose a team member and enter an email.')
      return
    }

    setSaving(true)
    setMessage('')

    const cleanedEmail = email.trim().toLowerCase()

    const { error } = await supabase.from('staff_users').insert({
      business_id: business.id,
      team_member_id: teamMemberId,
      email: cleanedEmail,
      role,
    })

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setTeamMemberId('')
    setEmail('')
    setRole('staff')
    setMessage('Staff access added.')
    await loadStaffManagement()
    setSaving(false)
  }

  async function removeStaffUser(id: string) {
    const confirmed = window.confirm('Remove this staff user access?')

    if (!confirmed) return

    const { error } = await supabase.from('staff_users').delete().eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Staff access removed.')
    await loadStaffManagement()
  }

  async function updateStaffRole(id: string, nextRole: string) {
    const { error } = await supabase
      .from('staff_users')
      .update({ role: nextRole })
      .eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Staff role updated.')
    await loadStaffManagement()
  }

  return (
    <RoleGuard allowedRoles={['owner', 'manager']}>
      <div>
        <div className="mb-10">
          <p className="text-slate-400 mb-2">Staff management</p>
          <h1 className="text-4xl font-bold mb-2">Staff access</h1>
          <p className="text-slate-500">
            Manage who can access the dashboard and what they are allowed to do.
          </p>
        </div>

        {message && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-8 text-slate-300">
            {message}
          </div>
        )}

        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-300">
            Loading staff...
          </div>
        )}

        {!loading && (
          <div className="grid xl:grid-cols-3 gap-8">
            <section className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-6">Add staff access</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 mb-2">
                    Team member
                  </label>

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
                </div>

                <div>
                  <label className="block text-slate-400 mb-2">
                    Login email
                  </label>

                  <input
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-2">
                    Permission level
                  </label>

                  <select
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={addStaffUser}
                  disabled={saving}
                  className="w-full bg-white text-slate-950 font-bold px-5 py-3 rounded-xl disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add staff access'}
                </button>
              </div>
            </section>

            <section className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Current staff users</h2>
                  <p className="text-slate-500 mt-1">
                    These users can log in and access this business dashboard.
                  </p>
                </div>

                <div className="rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-400">
                  {staffUsers.length} users
                </div>
              </div>

              <div className="space-y-4">
                {staffUsers.map((staff) => (
                  <div
                    key={staff.id}
                    className="border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-lg font-bold">
                        {staff.team_members?.full_name || 'Unknown team member'}
                      </p>

                      <p className="text-slate-400 text-sm mt-1">
                        {staff.email}
                      </p>

                      <p className="text-slate-500 text-sm mt-1">
                        Team role: {staff.team_members?.role || 'Not set'}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        className="p-3 rounded-lg bg-slate-800 border border-slate-700"
                        value={staff.role}
                        onChange={(e) => updateStaffRole(staff.id, e.target.value)}
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="owner">Owner</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => removeStaffUser(staff.id)}
                        className="bg-red-600 hover:bg-red-700 px-4 py-3 rounded-lg text-sm font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {staffUsers.length === 0 && (
                  <div className="rounded-2xl border border-slate-800 p-6 text-slate-500">
                    No staff access has been added yet.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
