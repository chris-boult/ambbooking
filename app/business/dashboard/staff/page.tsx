'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import RoleGuard from '@/components/RoleGuard'

type Business = {
  id: string
  business_name: string
  slug?: string | null
}

type Service = {
  id: string
  name: string
  duration_minutes: number
  price: number
}

type TeamMember = {
  id: string
  full_name: string
  role: string | null
  email?: string | null
  phone?: string | null
  bio?: string | null
  is_active?: boolean | null
  colour?: string | null
  profile_image_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  tiktok_url?: string | null
  linkedin_url?: string | null
  website_url?: string | null
  years_experience?: number | null
  specialties?: string | null
  display_on_booking_page?: boolean | null
  display_order?: number | null
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

type Assignment = {
  id: string
  team_member_id: string
  service_id: string
}

type WorkingHour = {
  id?: string
  team_member_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

type StaffStats = {
  bookingsThisMonth: number
  revenueThisMonth: number
  upcomingBookings: number
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

const colours = [
  '#7c3aed',
  '#2563eb',
  '#059669',
  '#d97706',
  '#dc2626',
  '#db2777',
  '#0891b2',
  '#111827',
]

function monthStartDate() {
  const date = new Date()
  date.setDate(1)
  return date.toISOString().split('T')[0]
}

function todayDate() {
  return new Date().toISOString().split('T')[0]
}

function normaliseTime(value: string) {
  return value ? value.slice(0, 5) : ''
}

export default function StaffPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])
  const [staffStats, setStaffStats] = useState<Record<string, StaffStats>>({})

  const [fullName, setFullName] = useState('')
  const [teamRole, setTeamRole] = useState('')
  const [teamEmail, setTeamEmail] = useState('')
  const [teamPhone, setTeamPhone] = useState('')
  const [teamBio, setTeamBio] = useState('')
  const [teamColour, setTeamColour] = useState('#7c3aed')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [specialties, setSpecialties] = useState('')
  const [displayOnBookingPage, setDisplayOnBookingPage] = useState(true)
  const [displayOrder, setDisplayOrder] = useState('0')
  const [editingTeamMemberId, setEditingTeamMemberId] = useState<string | null>(null)

  const [teamMemberId, setTeamMemberId] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')

  const [expandedHoursId, setExpandedHoursId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingTeamMember, setSavingTeamMember] = useState(false)
  const [savingAccess, setSavingAccess] = useState(false)
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
      .select('id,business_name,slug')
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
      .select('*')
      .eq('business_id', businessData.id)
      .order('display_order', { ascending: true })
      .order('full_name', { ascending: true })

    if (teamError) {
      setMessage(teamError.message)
      setLoading(false)
      return
    }

    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select('id,name,duration_minutes,price')
      .eq('business_id', businessData.id)
      .order('name')

    if (servicesError) {
      setMessage(servicesError.message)
      setLoading(false)
      return
    }

    const { data: assignmentData, error: assignmentError } = await supabase
      .from('team_member_services')
      .select('id,team_member_id,service_id')
      .eq('business_id', businessData.id)

    if (assignmentError) {
      setMessage(assignmentError.message)
      setLoading(false)
      return
    }

    const { data: hoursData, error: hoursError } = await supabase
      .from('staff_working_hours')
      .select('id,team_member_id,day_of_week,start_time,end_time,is_available')
      .eq('business_id', businessData.id)

    if (hoursError) {
      setMessage(hoursError.message)
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

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('team_member_id,total_price,booking_date,status')
      .eq('business_id', businessData.id)
      .neq('status', 'cancelled')

    const monthStart = monthStartDate()
    const today = todayDate()
    const stats: Record<string, StaffStats> = {}

    ;((bookingsData || []) as any[]).forEach((booking) => {
      if (!booking.team_member_id) return

      if (!stats[booking.team_member_id]) {
        stats[booking.team_member_id] = {
          bookingsThisMonth: 0,
          revenueThisMonth: 0,
          upcomingBookings: 0,
        }
      }

      if (booking.booking_date >= monthStart) {
        stats[booking.team_member_id].bookingsThisMonth += 1
        stats[booking.team_member_id].revenueThisMonth += Number(booking.total_price || 0)
      }

      if (booking.booking_date >= today) {
        stats[booking.team_member_id].upcomingBookings += 1
      }
    })

    setTeamMembers((teamData as TeamMember[]) || [])
    setServices((servicesData as Service[]) || [])
    setAssignments((assignmentData as Assignment[]) || [])
    setWorkingHours((hoursData as WorkingHour[]) || [])
    setStaffUsers((staffData as unknown as StaffUser[]) || [])
    setStaffStats(stats)
    setLoading(false)
  }

  function resetTeamMemberForm() {
    setFullName('')
    setTeamRole('')
    setTeamEmail('')
    setTeamPhone('')
    setTeamBio('')
    setTeamColour('#7c3aed')
    setProfileImageUrl('')
    setInstagramUrl('')
    setFacebookUrl('')
    setTiktokUrl('')
    setLinkedinUrl('')
    setWebsiteUrl('')
    setYearsExperience('')
    setSpecialties('')
    setDisplayOnBookingPage(true)
    setDisplayOrder('0')
    setEditingTeamMemberId(null)
  }

  function startEditTeamMember(member: TeamMember) {
    setEditingTeamMemberId(member.id)
    setFullName(member.full_name || '')
    setTeamRole(member.role || '')
    setTeamEmail(member.email || '')
    setTeamPhone(member.phone || '')
    setTeamBio(member.bio || '')
    setTeamColour(member.colour || '#7c3aed')
    setProfileImageUrl(member.profile_image_url || '')
    setInstagramUrl(member.instagram_url || '')
    setFacebookUrl(member.facebook_url || '')
    setTiktokUrl(member.tiktok_url || '')
    setLinkedinUrl(member.linkedin_url || '')
    setWebsiteUrl(member.website_url || '')
    setYearsExperience(String(member.years_experience || ''))
    setSpecialties(member.specialties || '')
    setDisplayOnBookingPage(member.display_on_booking_page ?? true)
    setDisplayOrder(String(member.display_order || 0))
    setMessage(`Editing ${member.full_name}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveTeamMember(e: React.FormEvent) {
    e.preventDefault()

    if (!business) {
      setMessage('Business not loaded.')
      return
    }

    if (!fullName.trim()) {
      setMessage('Please enter a staff member name.')
      return
    }

    setSavingTeamMember(true)
    setMessage('')

    const payload = {
      business_id: business.id,
      full_name: fullName.trim(),
      role: teamRole.trim() || null,
      email: teamEmail.trim().toLowerCase() || null,
      phone: teamPhone.trim() || null,
      bio: teamBio.trim() || null,
      colour: teamColour,
      profile_image_url: profileImageUrl.trim() || null,
      instagram_url: instagramUrl.trim() || null,
      facebook_url: facebookUrl.trim() || null,
      tiktok_url: tiktokUrl.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      website_url: websiteUrl.trim() || null,
      years_experience: yearsExperience ? Number(yearsExperience) : null,
      specialties: specialties.trim() || null,
      display_on_booking_page: displayOnBookingPage,
      display_order: Number(displayOrder || 0),
      is_active: true,
    }

    const { error } = editingTeamMemberId
      ? await supabase
          .from('team_members')
          .update(payload)
          .eq('id', editingTeamMemberId)
      : await supabase.from('team_members').insert(payload)

    if (error) {
      setMessage(error.message)
      setSavingTeamMember(false)
      return
    }

    setMessage(editingTeamMemberId ? 'Team member updated.' : 'Team member created.')
    resetTeamMemberForm()
    await loadStaffManagement()
    setSavingTeamMember(false)
  }

  async function toggleTeamMemberActive(member: TeamMember) {
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: !(member.is_active ?? true) })
      .eq('id', member.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage((member.is_active ?? true) ? 'Team member deactivated.' : 'Team member activated.')
    await loadStaffManagement()
  }

  async function deleteTeamMember(memberId: string) {
    const confirmed = window.confirm(
      'Delete this team member? This may affect existing bookings and cannot be undone.'
    )

    if (!confirmed) return

    const { error } = await supabase.from('team_members').delete().eq('id', memberId)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Team member deleted.')
    await loadStaffManagement()
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

    setSavingAccess(true)
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
      setSavingAccess(false)
      return
    }

    setTeamMemberId('')
    setEmail('')
    setRole('staff')
    setMessage('Staff access added.')
    await loadStaffManagement()
    setSavingAccess(false)
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

  function isAssigned(teamMemberId: string, serviceId: string) {
    return assignments.some(
      (assignment) =>
        assignment.team_member_id === teamMemberId &&
        assignment.service_id === serviceId
    )
  }

  async function toggleServiceAssignment(teamMemberId: string, serviceId: string) {
    if (!business) {
      setMessage('Business not loaded.')
      return
    }

    setMessage('')

    const existing = assignments.find(
      (assignment) =>
        assignment.team_member_id === teamMemberId &&
        assignment.service_id === serviceId
    )

    if (existing) {
      const { error } = await supabase
        .from('team_member_services')
        .delete()
        .eq('id', existing.id)

      if (error) {
        setMessage(error.message)
        return
      }
    } else {
      const { error } = await supabase.from('team_member_services').insert({
        business_id: business.id,
        team_member_id: teamMemberId,
        service_id: serviceId,
      })

      if (error) {
        setMessage(error.message)
        return
      }
    }

    await loadStaffManagement()
  }

  async function assignAllServices(memberId: string) {
    if (!business) return

    const existingServiceIds = assignments
      .filter((assignment) => assignment.team_member_id === memberId)
      .map((assignment) => assignment.service_id)

    const rows = services
      .filter((service) => !existingServiceIds.includes(service.id))
      .map((service) => ({
        business_id: business.id,
        team_member_id: memberId,
        service_id: service.id,
      }))

    if (rows.length === 0) {
      setMessage('All services are already assigned.')
      return
    }

    const { error } = await supabase.from('team_member_services').insert(rows)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('All services assigned.')
    await loadStaffManagement()
  }

  async function clearAllServices(memberId: string) {
    const confirmed = window.confirm('Clear all service assignments for this team member?')

    if (!confirmed) return

    const { error } = await supabase
      .from('team_member_services')
      .delete()
      .eq('team_member_id', memberId)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Service assignments cleared.')
    await loadStaffManagement()
  }

  function assignmentCount(teamMemberId: string) {
    return assignments.filter((assignment) => assignment.team_member_id === teamMemberId).length
  }

  function getWorkingHour(memberId: string, day: number) {
    return workingHours.find(
      (hour) => hour.team_member_id === memberId && hour.day_of_week === day
    )
  }

  async function saveWorkingHour(
    memberId: string,
    day: number,
    values: { start_time: string; end_time: string; is_available: boolean }
  ) {
    if (!business) return

    const existing = getWorkingHour(memberId, day)

    const payload = {
      business_id: business.id,
      team_member_id: memberId,
      day_of_week: day,
      start_time: values.start_time,
      end_time: values.end_time,
      is_available: values.is_available,
    }

    const { error } = existing?.id
      ? await supabase.from('staff_working_hours').update(payload).eq('id', existing.id)
      : await supabase.from('staff_working_hours').insert(payload)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Working hours updated.')
    await loadStaffManagement()
  }

  function copyStaffLink(member: TeamMember) {
    if (!business?.slug) {
      setMessage('Business slug not found, so the booking link could not be copied.')
      return
    }

    const url = `${window.location.origin}/book/${business.slug}?staff=${member.id}`
    navigator.clipboard.writeText(url)
    setMessage(`Copied booking link for ${member.full_name}.`)
  }

  const filteredTeamMembers = useMemo(() => {
    const q = search.toLowerCase().trim()

    if (!q) return teamMembers

    return teamMembers.filter((member) => {
      return (
        member.full_name.toLowerCase().includes(q) ||
        member.role?.toLowerCase().includes(q) ||
        member.email?.toLowerCase().includes(q) ||
        member.phone?.toLowerCase().includes(q) ||
        member.specialties?.toLowerCase().includes(q)
      )
    })
  }, [search, teamMembers])

  return (
    <RoleGuard allowedRoles={['owner', 'manager']}>
      <main className="min-h-screen space-y-8 bg-slate-950 p-6 text-white md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">
              Staff management
            </p>

            <h1 className="mt-2 text-4xl font-black">Staff</h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              Manage staff profiles, social links, dashboard access, permissions, working hours
              and which services each team member can perform.
            </p>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
          />
        </div>

        {message && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
            {message}
          </div>
        )}

        {loading && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-slate-300">
            Loading staff...
          </div>
        )}

        {!loading && (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <StatCard label="Team members" value={teamMembers.length} />
              <StatCard
                label="Active"
                value={teamMembers.filter((member) => member.is_active ?? true).length}
              />
              <StatCard label="Dashboard users" value={staffUsers.length} />
              <StatCard label="Services" value={services.length} />
            </section>

            <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
                <h2 className="text-2xl font-black">
                  {editingTeamMemberId ? 'Edit team member' : 'Add team member'}
                </h2>

                {editingTeamMemberId && (
                  <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-blue-300">
                    You are editing an existing team member. Save changes or cancel edit.
                  </div>
                )}

                <form onSubmit={saveTeamMember} className="mt-6 space-y-4">
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />

                  <input
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                    placeholder="Role, e.g. Senior Barber"
                    value={teamRole}
                    onChange={(e) => setTeamRole(e.target.value)}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                      placeholder="Email"
                      value={teamEmail}
                      onChange={(e) => setTeamEmail(e.target.value)}
                    />

                    <input
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                      placeholder="Phone"
                      value={teamPhone}
                      onChange={(e) => setTeamPhone(e.target.value)}
                    />
                  </div>

                  <textarea
                    className="min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                    placeholder="Short bio or notes"
                    value={teamBio}
                    onChange={(e) => setTeamBio(e.target.value)}
                  />

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                      Public profile
                    </p>

                    <input
                      className="mb-4 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                      placeholder="Profile image URL"
                      value={profileImageUrl}
                      onChange={(e) => setProfileImageUrl(e.target.value)}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                        placeholder="Years experience"
                        type="number"
                        value={yearsExperience}
                        onChange={(e) => setYearsExperience(e.target.value)}
                      />

                      <input
                        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                        placeholder="Display order"
                        type="number"
                        value={displayOrder}
                        onChange={(e) => setDisplayOrder(e.target.value)}
                      />
                    </div>

                    <textarea
                      className="mt-4 min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                      placeholder="Specialities, e.g. Skin fades, beard sculpting, colour correction"
                      value={specialties}
                      onChange={(e) => setSpecialties(e.target.value)}
                    />

                    <label className="mt-4 flex items-center gap-3 text-slate-300">
                      <input
                        type="checkbox"
                        checked={displayOnBookingPage}
                        onChange={(e) => setDisplayOnBookingPage(e.target.checked)}
                      />
                      Display this team member on the public booking page
                    </label>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                      Social links
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                        placeholder="Instagram URL"
                        value={instagramUrl}
                        onChange={(e) => setInstagramUrl(e.target.value)}
                      />

                      <input
                        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                        placeholder="Facebook URL"
                        value={facebookUrl}
                        onChange={(e) => setFacebookUrl(e.target.value)}
                      />

                      <input
                        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                        placeholder="TikTok URL"
                        value={tiktokUrl}
                        onChange={(e) => setTiktokUrl(e.target.value)}
                      />

                      <input
                        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                        placeholder="LinkedIn URL"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                      />

                      <input
                        className="md:col-span-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                        placeholder="Website URL"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                      Calendar colour
                    </p>

                    <div className="flex flex-wrap gap-3">
                      {colours.map((colour) => (
                        <button
                          key={colour}
                          type="button"
                          onClick={() => setTeamColour(colour)}
                          className={`h-10 w-10 rounded-full border-2 ${
                            teamColour === colour ? 'border-white' : 'border-transparent'
                          }`}
                          style={{ background: colour }}
                          aria-label={`Choose ${colour}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      disabled={savingTeamMember}
                      className="rounded-2xl bg-white px-5 py-4 font-black text-slate-950 disabled:opacity-50"
                    >
                      {savingTeamMember
                        ? 'Saving...'
                        : editingTeamMemberId
                          ? 'Update team member'
                          : 'Create team member'}
                    </button>

                    {editingTeamMemberId && (
                      <button
                        type="button"
                        onClick={resetTeamMemberForm}
                        className="rounded-2xl border border-white/10 px-5 py-4 font-black text-white hover:bg-white/10"
                      >
                        Cancel edit
                      </button>
                    )}
                  </div>
                </form>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
                <h2 className="text-2xl font-black">Add dashboard access</h2>

                <p className="mt-2 text-slate-400">
                  Give staff access to log in and manage relevant areas.
                </p>

                <div className="mt-6 space-y-4">
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none"
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
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
                    placeholder="Login email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <select
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>

                  <button
                    type="button"
                    onClick={addStaffUser}
                    disabled={savingAccess}
                    className="w-full rounded-2xl bg-white px-5 py-4 font-black text-slate-950 disabled:opacity-50"
                  >
                    {savingAccess ? 'Adding...' : 'Add staff access'}
                  </button>
                </div>
              </section>
            </div>

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-black">Team members</h2>
                  <p className="mt-2 text-slate-400">
                    Assign services, working hours and public booking profiles.
                  </p>
                </div>

                <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-slate-300">
                  {filteredTeamMembers.length} shown
                </span>
              </div>

              <div className="space-y-5">
                {filteredTeamMembers.map((member) => {
                  const active = member.is_active ?? true
                  const stats = staffStats[member.id] || {
                    bookingsThisMonth: 0,
                    revenueThisMonth: 0,
                    upcomingBookings: 0,
                  }

                  return (
                    <div
                      key={member.id}
                      className="rounded-3xl border border-white/10 bg-black/20 p-6"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-4">
                          <div
                            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl font-black text-white"
                            style={{ background: member.colour || '#7c3aed' }}
                          >
                            {member.profile_image_url ? (
                              <img
                                src={member.profile_image_url}
                                alt={member.full_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              member.full_name
                                .split(' ')
                                .map((part) => part[0])
                                .join('')
                                .slice(0, 2)
                            )}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-2xl font-black">{member.full_name}</h3>

                              <span
                                className={`rounded-full px-3 py-1 text-sm font-bold ${
                                  active
                                    ? 'bg-emerald-500/10 text-emerald-300'
                                    : 'bg-red-500/10 text-red-300'
                                }`}
                              >
                                {active ? 'Active' : 'Inactive'}
                              </span>

                              {member.display_on_booking_page !== false && (
                                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm font-bold text-blue-300">
                                  Public
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-slate-400">
                              {member.role || 'No role set'}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                              {member.email && <span>{member.email}</span>}
                              {member.phone && <span>{member.phone}</span>}
                              <span>{assignmentCount(member.id)} assigned services</span>
                              {member.years_experience ? (
                                <span>{member.years_experience} years experience</span>
                              ) : null}
                            </div>

                            {member.specialties && (
                              <p className="mt-3 max-w-2xl text-slate-400">
                                <span className="font-bold text-slate-300">Specialities:</span>{' '}
                                {member.specialties}
                              </p>
                            )}

                            {member.bio && (
                              <p className="mt-3 max-w-2xl text-slate-400">{member.bio}</p>
                            )}

                            <div className="mt-4 flex flex-wrap gap-2 text-sm">
                              {member.instagram_url && <SocialLink href={member.instagram_url} label="Instagram" />}
                              {member.facebook_url && <SocialLink href={member.facebook_url} label="Facebook" />}
                              {member.tiktok_url && <SocialLink href={member.tiktok_url} label="TikTok" />}
                              {member.linkedin_url && <SocialLink href={member.linkedin_url} label="LinkedIn" />}
                              {member.website_url && <SocialLink href={member.website_url} label="Website" />}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditTeamMember(member)}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => copyStaffLink(member)}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
                          >
                            Copy link
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleTeamMemberActive(member)}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
                          >
                            {active ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteTeamMember(member.id)}
                            className="rounded-xl bg-red-500/15 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/25"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <MiniStat label="Bookings this month" value={stats.bookingsThisMonth} />
                        <MiniStat label="Revenue this month" value={`£${stats.revenueThisMonth.toFixed(2)}`} />
                        <MiniStat label="Upcoming bookings" value={stats.upcomingBookings} />
                      </div>

                      <div className="mt-6 border-t border-white/10 pt-6">
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                            Service assignments
                          </p>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => assignAllServices(member.id)}
                              className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/10"
                            >
                              Assign all
                            </button>

                            <button
                              type="button"
                              onClick={() => clearAllServices(member.id)}
                              className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/10"
                            >
                              Clear all
                            </button>
                          </div>
                        </div>

                        {services.length > 0 ? (
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {services.map((service) => {
                              const assigned = isAssigned(member.id, service.id)

                              return (
                                <button
                                  key={service.id}
                                  type="button"
                                  onClick={() => toggleServiceAssignment(member.id, service.id)}
                                  className={`rounded-2xl border p-4 text-left transition ${
                                    assigned
                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                      : 'border-white/10 bg-black/20 text-slate-400 hover:bg-white/10'
                                  }`}
                                >
                                  <p className="font-black">{service.name}</p>
                                  <p className="mt-1 text-sm opacity-80">
                                    {service.duration_minutes} mins · £{Number(service.price || 0).toFixed(2)}
                                  </p>
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-slate-500">Create services before assigning them to staff.</p>
                        )}
                      </div>

                      <div className="mt-6 border-t border-white/10 pt-6">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedHoursId(expandedHoursId === member.id ? null : member.id)
                          }
                          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
                        >
                          {expandedHoursId === member.id ? 'Hide working hours' : 'Edit working hours'}
                        </button>

                        {expandedHoursId === member.id && (
                          <div className="mt-5 grid gap-3">
                            {days.map((day) => {
                              const hour = getWorkingHour(member.id, day.value)
                              const available = hour?.is_available ?? true
                              const start = normaliseTime(hour?.start_time || '09:00')
                              const end = normaliseTime(hour?.end_time || '17:00')

                              return (
                                <WorkingHourRow
                                  key={day.value}
                                  label={day.label}
                                  initialStart={start}
                                  initialEnd={end}
                                  initialAvailable={available}
                                  onSave={(values) =>
                                    saveWorkingHour(member.id, day.value, values)
                                  }
                                />
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {filteredTeamMembers.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-slate-500">
                    No team members found.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">Dashboard users</h2>
                  <p className="mt-2 text-slate-400">
                    These users can log in and access this business dashboard.
                  </p>
                </div>

                <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-slate-300">
                  {staffUsers.length} users
                </span>
              </div>

              <div className="space-y-4">
                {staffUsers.map((staff) => (
                  <div
                    key={staff.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 lg:flex-row lg:items-center"
                  >
                    <div>
                      <p className="text-lg font-black">
                        {staff.team_members?.full_name || 'Unknown team member'}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">{staff.email}</p>

                      <p className="mt-1 text-sm text-slate-500">
                        Team role: {staff.team_members?.role || 'Not set'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <select
                        className="rounded-xl border border-white/10 bg-slate-900 p-3 text-white"
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
                        className="rounded-xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/25"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {staffUsers.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-slate-500">
                    No staff access has been added yet.
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </RoleGuard>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  )
}

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-full border border-white/10 px-3 py-1 font-bold text-slate-300 hover:bg-white/10"
    >
      {label}
    </a>
  )
}

function WorkingHourRow({
  label,
  initialStart,
  initialEnd,
  initialAvailable,
  onSave,
}: {
  label: string
  initialStart: string
  initialEnd: string
  initialAvailable: boolean
  onSave: (values: { start_time: string; end_time: string; is_available: boolean }) => void
}) {
  const [start, setStart] = useState(initialStart)
  const [end, setEnd] = useState(initialEnd)
  const [available, setAvailable] = useState(initialAvailable)

  useEffect(() => {
    setStart(initialStart)
    setEnd(initialEnd)
    setAvailable(initialAvailable)
  }, [initialStart, initialEnd, initialAvailable])

  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
      <p className="font-bold text-white">{label}</p>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={available}
          onChange={(e) => setAvailable(e.target.checked)}
        />
        Available
      </label>

      <div className="flex gap-2">
        <input
          type="time"
          value={start}
          disabled={!available}
          onChange={(e) => setStart(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white disabled:opacity-40"
        />

        <input
          type="time"
          value={end}
          disabled={!available}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white disabled:opacity-40"
        />
      </div>

      <button
        type="button"
        onClick={() =>
          onSave({
            start_time: start,
            end_time: end,
            is_available: available,
          })
        }
        className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950"
      >
        Save
      </button>
    </div>
  )
}
