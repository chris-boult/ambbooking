'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type TeamMember = {
  id: string
  full_name: string
  email: string
  role: string
}

export default function TeamOnboardingPage() {
  const router = useRouter()

  const [businessId, setBusinessId] = useState('')
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Team Member')

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

    if (!businesses || businesses.length === 0) {
      router.push('/business/create')
      return
    }

    const business = businesses[0]

    setBusinessId(business.id)

    const { data: teamData } = await supabase
      .from('team_members')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    setTeam(teamData || [])
  }

  async function addTeamMember() {
    if (!fullName.trim()) {
      alert('Please enter a name')
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from('team_members')
      .insert({
        business_id: businessId,
        full_name: fullName,
        email,
        role,
      })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setFullName('')
    setEmail('')
    setRole('Team Member')

    loadData()
  }

  async function deleteMember(id: string) {
    if (!confirm('Delete this team member?')) return

    await supabase
      .from('team_members')
      .delete()
      .eq('id', id)

    loadData()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">

        <div className="mb-12">
          <div className="text-sky-400 font-semibold mb-3">
            STEP 3 OF 5
          </div>

          <h1 className="text-5xl font-bold mb-4">
            Add your team
          </h1>

          <p className="text-slate-400 text-lg">
            Add staff members who can take bookings.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">

            <h2 className="text-2xl font-bold mb-6">
              New Team Member
            </h2>

            <div className="space-y-4">

              <input
                className="w-full p-4 rounded-xl bg-slate-800"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />

              <input
                className="w-full p-4 rounded-xl bg-slate-800"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <select
                className="w-full p-4 rounded-xl bg-slate-800"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option>Team Member</option>
                <option>Senior Stylist</option>
                <option>Barber</option>
                <option>Manager</option>
                <option>Owner</option>
              </select>

              <button
                onClick={addTeamMember}
                disabled={loading}
                className="w-full h-14 rounded-xl bg-sky-500 hover:bg-sky-600 font-semibold"
              >
                {loading ? 'Adding...' : 'Add Team Member'}
              </button>

            </div>

          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">

            <h2 className="text-2xl font-bold mb-6">
              Your Team
            </h2>

            <div className="space-y-4">

              {team.map((member) => (
                <div
                  key={member.id}
                  className="border border-slate-800 rounded-2xl p-4 flex justify-between items-center"
                >
                  <div>
                    <div className="font-semibold">
                      {member.full_name}
                    </div>

                    <div className="text-slate-400 text-sm">
                      {member.role}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteMember(member.id)}
                    className="text-red-400 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}

              {team.length === 0 && (
                <div className="text-slate-500">
                  No team members added yet.
                </div>
              )}

            </div>

            <button
              onClick={() => router.push('/onboarding/availability')}
              className="w-full mt-8 h-14 rounded-xl bg-white text-slate-950 font-bold"
            >
              Continue →
            </button>

          </div>

        </div>

      </div>
    </main>
  )
}