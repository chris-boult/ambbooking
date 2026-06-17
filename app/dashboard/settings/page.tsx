'use client'

import RoleGuard from '@/components/RoleGuard'
import { ChangeEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string
  slug: string | null
  logo_url: string | null
  hero_image_url: string | null
  primary_colour: string | null
  secondary_colour: string | null
  business_description: string | null
  brand_theme: string | null
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
  team_members: {
    full_name: string
  } | null
}

const brandThemes = [
  { id: 'classic_dark', name: 'Classic dark', description: 'Premium dark style with soft gradients.' },
  { id: 'clean_light', name: 'Clean light', description: 'Bright, minimal and simple.' },
  { id: 'luxury_gold', name: 'Luxury gold', description: 'Black, gold and premium feel.' },
  { id: 'clinic_rose', name: 'Clinic rose', description: 'Soft, elegant and ideal for beauty or clinics.' },
  { id: 'electric_blue', name: 'Electric blue', description: 'Modern, sharp and energetic.' },
  { id: 'forest_green', name: 'Forest green', description: 'Calm, natural and professional.' },
  { id: 'monochrome', name: 'Monochrome', description: 'Black, white and timeless.' },
]

function safeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
}

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])

  const [businessName, setBusinessName] = useState('')
  const [slug, setSlug] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [primaryColour, setPrimaryColour] = useState('#7c3aed')
  const [secondaryColour, setSecondaryColour] = useState('#2563eb')
  const [businessDescription, setBusinessDescription] = useState('')
  const [brandTheme, setBrandTheme] = useState('classic_dark')

  const [teamMemberId, setTeamMemberId] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [staffRole, setStaffRole] = useState('staff')

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingStaff, setAddingStaff] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
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
      .select(`
        id,
        business_name,
        slug,
        logo_url,
        hero_image_url,
        primary_colour,
        secondary_colour,
        business_description,
        brand_theme
      `)
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
      setBusiness(null)
      setMessage('No business is linked to this login. Check the user_id on the businesses table.')
      setLoading(false)
      return
    }

    setBusiness(businessData as Business)
    setBusinessName(businessData.business_name || '')
    setSlug(businessData.slug || '')
    setLogoUrl(businessData.logo_url || '')
    setHeroImageUrl(businessData.hero_image_url || '')
    setPrimaryColour(businessData.primary_colour || '#7c3aed')
    setSecondaryColour(businessData.secondary_colour || '#2563eb')
    setBusinessDescription(businessData.business_description || '')
    setBrandTheme(businessData.brand_theme || 'classic_dark')

    const { data: teamData, error: teamError } = await supabase
      .from('team_members')
      .select('id,full_name')
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
        team_members!staff_users_team_member_id_fkey (
          full_name
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

  async function saveBusinessDetails() {
    if (!business) {
      setMessage('Business not loaded. Refresh the page and try again.')
      return
    }

    setSaving(true)
    setMessage('')

    const cleanedSlug = slug
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const { data, error } = await supabase
      .from('businesses')
      .update({
        business_name: businessName,
        slug: cleanedSlug,
        logo_url: logoUrl,
        hero_image_url: heroImageUrl,
        primary_colour: primaryColour,
        secondary_colour: secondaryColour,
        business_description: businessDescription,
        brand_theme: brandTheme,
      })
      .eq('id', business.id)
      .select()

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    if (!data || data.length === 0) {
      setMessage('No business row was updated. Check that this business belongs to the logged-in user.')
      setSaving(false)
      return
    }

    setSlug(cleanedSlug)
    setMessage('Business settings saved.')
    await loadSettings()
    setSaving(false)
  }

  async function uploadBrandAsset(
    event: ChangeEvent<HTMLInputElement>,
    bucket: 'business-logos' | 'business-hero-images'
  ) {
    if (!business) {
      setMessage('Business not loaded. Refresh the page and try again.')
      return
    }

    const file = event.target.files?.[0]
    if (!file) return

    const isLogo = bucket === 'business-logos'

    if (isLogo) {
      setUploadingLogo(true)
    } else {
      setUploadingHero(true)
    }

    setMessage('')

    const filePath = `${business.id}/${Date.now()}-${safeFileName(file.name)}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      setMessage(uploadError.message)
      setUploadingLogo(false)
      setUploadingHero(false)
      return
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)

    if (isLogo) {
      setLogoUrl(data.publicUrl)
    } else {
      setHeroImageUrl(data.publicUrl)
    }

    setMessage(isLogo ? 'Logo uploaded. Click Save branding to publish it.' : 'Hero image uploaded. Click Save branding to publish it.')
    setUploadingLogo(false)
    setUploadingHero(false)
  }

  async function createStaffUser() {
    if (!business) {
      setMessage('Business not loaded. Refresh the page and try again.')
      return
    }

    if (!teamMemberId || !staffEmail) {
      setMessage('Please choose a team member and enter an email.')
      return
    }

    setAddingStaff(true)
    setMessage('')

    const { error } = await supabase.from('staff_users').insert({
      business_id: business.id,
      team_member_id: teamMemberId,
      email: staffEmail.trim(),
      role: staffRole,
    })

    if (error) {
      setMessage(error.message)
      setAddingStaff(false)
      return
    }

    setTeamMemberId('')
    setStaffEmail('')
    setStaffRole('staff')
    setMessage('Staff account added.')
    await loadSettings()
    setAddingStaff(false)
  }

  async function deleteStaffUser(id: string) {
    const confirmed = window.confirm('Are you sure you want to remove this staff account?')
    if (!confirmed) return

    const { error } = await supabase.from('staff_users').delete().eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Staff account removed.')
    await loadSettings()
  }

  const selectedTheme = brandThemes.find((theme) => theme.id === brandTheme)

  const bookingUrl =
    typeof window !== 'undefined' && slug
      ? `${window.location.origin}/book/${slug}`
      : ''

  return (
    <RoleGuard allowedRoles={['owner']}>
      <div>
      <div className="mb-10">
        <p className="text-slate-400 mb-2">Settings</p>
        <h1 className="text-4xl font-bold mb-2">Business settings</h1>
        <p className="text-slate-500">
          Manage your public booking page, branding and staff accounts.
        </p>
      </div>

      {message && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-8 text-slate-300">
          {message}
        </div>
      )}

      {loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-300">
          Loading settings...
        </div>
      )}

      {!loading && (
        <div className="grid xl:grid-cols-2 gap-8">
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Business profile</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-2">Business name</label>
                <input
                  className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-2">Business description</label>
                <textarea
                  className="w-full min-h-28 p-3 rounded-lg bg-slate-800 border border-slate-700"
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  placeholder="Tell customers what you do, where you are based, and why they should book with you."
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-2">Booking slug</label>
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
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Branding</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-slate-400 mb-2">Brand theme</label>

                <select
                  className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                  value={brandTheme}
                  onChange={(e) => setBrandTheme(e.target.value)}
                >
                  {brandThemes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>

                {selectedTheme && (
                  <p className="text-slate-500 text-sm mt-2">
                    {selectedTheme.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-2">Logo upload</label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => uploadBrandAsset(event, 'business-logos')}
                  className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                />

                {uploadingLogo && (
                  <p className="text-slate-500 text-sm mt-2">Uploading logo...</p>
                )}

                {logoUrl && (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-slate-500 text-sm mb-3">Current logo</p>
                    <img
                      src={logoUrl}
                      alt="Business logo"
                      className="max-h-20 max-w-56 object-contain"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-2">Hero image upload</label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => uploadBrandAsset(event, 'business-hero-images')}
                  className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                />

                {uploadingHero && (
                  <p className="text-slate-500 text-sm mt-2">Uploading hero image...</p>
                )}

                {heroImageUrl && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                    <img
                      src={heroImageUrl}
                      alt="Business hero"
                      className="h-40 w-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-2">Primary colour</label>
                  <input
                    type="color"
                    className="w-full h-12 rounded-lg bg-slate-800 border border-slate-700"
                    value={primaryColour}
                    onChange={(e) => setPrimaryColour(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-2">Secondary colour</label>
                  <input
                    type="color"
                    className="w-full h-12 rounded-lg bg-slate-800 border border-slate-700"
                    value={secondaryColour}
                    onChange={(e) => setSecondaryColour(e.target.value)}
                  />
                </div>
              </div>

              <div
                className="rounded-2xl p-6 border border-slate-800"
                style={{
                  background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})`,
                }}
              >
                <p className="text-white/80 text-sm mb-2">Live brand preview</p>
                <h3 className="text-3xl font-bold text-white">
                  {businessName || 'Your Business'}
                </h3>
                <p className="text-white/80 mt-2">
                  {businessDescription ||
                    'Your customer-facing booking page will use your selected theme and brand assets.'}
                </p>
              </div>

              <button
                type="button"
                onClick={saveBusinessDetails}
                disabled={saving || !business}
                className="w-full bg-white text-slate-950 font-bold px-5 py-3 rounded-xl disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save branding'}
              </button>
            </div>
          </section>

          <section className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Staff accounts</h2>

            <div className="grid lg:grid-cols-3 gap-4 mb-8">
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
                type="button"
                onClick={createStaffUser}
                disabled={addingStaff || !business}
                className="bg-white text-slate-950 font-bold px-5 py-3 rounded-xl lg:col-span-3 disabled:opacity-50"
              >
                {addingStaff ? 'Adding...' : 'Add staff account'}
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
                      {staff.team_members?.full_name || 'Unknown team member'}
                    </p>
                    <p className="text-slate-400 text-sm">{staff.email}</p>
                    <p className="text-slate-500 text-sm">{staff.role}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteStaffUser(staff.id)}
                    className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {staffUsers.length === 0 && (
                <p className="text-slate-500">No staff accounts added yet.</p>
              )}
            </div>
          </section>
        </div>
      )}
      </div>
    </RoleGuard>
  )
}
