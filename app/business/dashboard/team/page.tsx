'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Briefcase,
  Loader2,
  Mail,
  Plus,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react'

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
  const [role, setRole] = useState('Team Member')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

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
    setMessage('')

    if (!fullName.trim()) {
      setMessage('Please enter a team member name.')
      return
    }

    setLoading(true)

    const { error } = await supabase.from('team_members').insert({
      business_id: businessId,
      full_name: fullName.trim(),
      email: email.trim() || null,
      role,
    })

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setFullName('')
    setEmail('')
    setRole('Team Member')
    setMessage('Team member created successfully.')
    loadData()
  }

  return (
    <main className="space-y-8">
      <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
              <Users size={14} />
              Team centre
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.055em] md:text-6xl">
              Manage the people who take bookings.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              Add team members, assign their role and prepare your business for staff calendars, availability and customer booking journeys.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <MiniKpi label="Team" value={teamMembers.length} />
            <MiniKpi label="Managers" value={teamMembers.filter((m) => m.role === 'Manager').length} />
            <MiniKpi label="Owners" value={teamMembers.filter((m) => m.role === 'Owner').length} />
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-bold text-slate-300">
          {message}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/10 blur-[80px]" />

          <div className="relative">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-cyan-300">New team member</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  Add someone to the team
                </h2>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.35)]">
                <UserPlus size={24} />
              </div>
            </div>

            <form onSubmit={createTeamMember} className="space-y-5">
              <FieldLabel label="Full name">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
                  placeholder="e.g. Sarah Johnson"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </FieldLabel>

              <FieldLabel label="Email address">
                <input
                  type="email"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
                  placeholder="sarah@business.co.uk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FieldLabel>

              <FieldLabel label="Role">
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none focus:border-cyan-300"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option>Team Member</option>
                  <option>Manager</option>
                  <option>Owner</option>
                </select>
              </FieldLabel>

              <button
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-7 py-5 text-sm font-black text-slate-950 shadow-[0_0_80px_rgba(34,211,238,.35)] transition hover:-translate-y-1 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating team member
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Create team member
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-cyan-300">Your team</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                {teamMembers.length} people added
              </h2>
            </div>

            <Sparkles className="text-cyan-300" />
          </div>

          <div className="grid gap-4">
            {teamMembers.map((member) => (
              <article
                key={member.id}
                className="rounded-[2rem] border border-white/10 bg-slate-950 p-5 transition hover:-translate-y-1 hover:border-cyan-300/30"
              >
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-lg font-black text-slate-950">
                    {getInitials(member.full_name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-black text-white">
                        {member.full_name}
                      </h3>

                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-300">
                        {member.role || 'Team Member'}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <Mail size={15} />
                        {member.email || 'No email added'}
                      </span>

                      <span className="inline-flex items-center gap-2">
                        <ShieldCheck size={15} />
                        Booking access ready
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {teamMembers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                  <Briefcase size={24} />
                </div>
                <h3 className="text-xl font-black text-white">No team members yet</h3>
                <p className="mt-2 text-slate-500">
                  Add your first team member to start building staff calendars.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function FieldLabel({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-300">
        {label}
      </span>
      {children}
    </label>
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