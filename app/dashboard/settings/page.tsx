'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string
  slug: string | null
}

type TeamMember = {
  id: string
  full_name: string
}

type StaffUser = {
  id: string
  email: string
  role: string
  team_member_id: string
  team_members:
    | {
        full_name: string
      }[]
    | null
}

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])

  const [businessName, setBusinessName] = useState('')
  const [slug, setSlug] = useState('')

  const [teamMemberId, setTeamMemberId] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [staffRole, setStaffRole] = useState('staff')

  const [message, setMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: businessData } = await supabase
      .from('businesses')
      .select('id,business_name,slug')
      .eq('user_id', userData.user.id)
      .single()

    if (!businessData) return

    setBusiness(businessData)
    setBusinessName(businessData.business_name || '')
    setSlug(businessData.slug || '')

    const { data: teamData } = await supabase
      .from('team_members')
      .select('id,full_name')
      .eq('business_id', businessData.id)
      .order('full_name')

    const { data: staffData } = await supabase
      .from('staff_users')
      .select(`
        id,
        email,
        role,
        team_member_id,
        team_members (
          full_name
        )
      `)
      .eq('business_id', businessData.id)
      .order('created_at', { ascending: false })

    setTeamMembers((teamData as TeamMember[]) || [])
    setStaffUsers((staffData as unknown as StaffUser[]) || [])
  }

  async function saveBusinessDetails() {
    if (!business) return

    setMessage('')

    const cleanedSlug = slug
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const { error } = await supabase
      .from('businesses')
      .update({
        business_name: businessName,
        slug: cleanedSlug,
      })
      .eq('id', business.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setSlug(cleanedSlug)
    setMessage('Business settings saved.')
    loadSettings()
  }

  async function createStaffUser() {
    if (!business || !teamMemberId || !staffEmail) {
      setMessage('Please choose a team member and enter an email.')
      return
    }

    setMessage('')

    const { error } = await supabase.from('staff_users').insert({
      business_id: business.id,
      team_member_id: teamMemberId,
      email: staffEmail,
      role: staffRole,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setTeamMemberId('')
    setStaffEmail('')
    setStaffRole('staff')
    setMessage('Staff account added.')
    loadSettings()
  }

  async function deleteStaffUser(id: string) {
    const confirmed = window.confirm(
      'Are you sure you want to remove this staff account?'
    )

    if (!confirmed) return

    await supabase.from('staff_users').delete().eq('id', id)

    loadSettings()
  }

  const bookingUrl =
    typeof window !== 'undefined' && slug
      ? `${window.location.origin}/book/${slug}`
      : ''

  return (
    <div>
      <div className="mb-10">
        <p className="text-slate-400 mb-2">Settings</p>
        <h1 className="text-4xl font-bold mb-2">Business settings</h1>
        <p className="text-slate-500">
          Manage your business profile, public booking link and staff accounts.
        </p>
      </div>

      {message && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-8 text-slate-300">
          {message}
        </div>
      )}

      <div className="grid xl:grid-cols-2 gap-8">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">Business details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 mb-2">
                Business name
              </label>
              <input
                className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-2">
                Booking slug
              </label>
              <input
                className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="your-business-name"
              />
            </div>

            {bookingUrl && (
              <div className="border border-slate-800 rounded-xl p-4">
                <p className="text-slate-400 mb-2">Public booking link</p>
                <p className="font-bold break-all">{bookingUrl}</p>
              </div>
            )}

            <button
              onClick={saveBusinessDetails}
              className="bg-white text-slate-950 font-bold px-5 py-3 rounded-xl"
            >
              Save business details
            </button>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">Staff accounts</h2>

          <div className="space-y-4 mb-8">
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
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              placeholder="Staff login email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
            />

            <select
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value)}
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>

            <button
              onClick={createStaffUser}
              className="bg-white text-slate-950 font-bold px-5 py-3 rounded-xl"
            >
              Add staff account
            </button>
          </div>

          <div className="space-y-4">
            {staffUsers.map((staff) => (
              <div
                key={staff.id}
                className="border border-slate-800 rounded-xl p-4 flex justify-between gap-4"
              >
                <div>
                  <p className="font-bold">
                    {staff.team_members?.[0]?.full_name ||
                      'Unknown team member'}
                  </p>
                  <p className="text-slate-400 text-sm">{staff.email}</p>
                  <p className="text-slate-500 text-sm">{staff.role}</p>
                </div>

                <button
                  onClick={() => deleteStaffUser(staff.id)}
                  className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm font-semibold"
                >
                  Remove
                </button>
              </div>
            ))}

            {staffUsers.length === 0 && (
              <p className="text-slate-500">
                No staff accounts added yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}