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

const WHITE_LABEL_FEATURE = 'white_label'
const BRANDING_FEATURE = 'branding'
const CUSTOM_THEMES_FEATURE = 'custom_themes'
const EMAIL_BRANDING_FEATURE = 'email_branding'
const CUSTOM_DOMAIN_FEATURE = 'custom_domain'
const REMOVE_AMB_BRANDING_FEATURE = 'remove_amb_branding'

type FeatureState = {
  whiteLabel: boolean
  branding: boolean
  customThemes: boolean
  emailBranding: boolean
  customDomain: boolean
  removeAmbBranding: boolean
}

const defaultFeatureState: FeatureState = {
  whiteLabel: false,
  branding: false,
  customThemes: false,
  emailBranding: false,
  customDomain: false,
  removeAmbBranding: false,
}

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
  const [features, setFeatures] = useState<FeatureState>(defaultFeatureState)

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

  async function loadFeatureState(businessId: string) {
    const { data, error } = await supabase
      .from('business_features')
      .select('feature_key, enabled')
      .eq('business_id', businessId)

    if (error) {
      setFeatures(defaultFeatureState)
      return
    }

    const enabled = (key: string) =>
      data?.some(
        (feature) =>
          feature.feature_key === key &&
          feature.enabled === true
      ) ?? false

    setFeatures({
      whiteLabel: enabled(WHITE_LABEL_FEATURE),
      branding: enabled(BRANDING_FEATURE),
      customThemes: enabled(CUSTOM_THEMES_FEATURE),
      emailBranding: enabled(EMAIL_BRANDING_FEATURE),
      customDomain: enabled(CUSTOM_DOMAIN_FEATURE),
      removeAmbBranding: enabled(REMOVE_AMB_BRANDING_FEATURE),
    })
  }

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
    await loadFeatureState(businessData.id)
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
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">
            White Label controls are powered by the commercial entitlement system. Pro businesses can use branding, custom themes, email branding, custom domains and AMB branding removal when enabled from the Master Admin feature controls.
          </p>
        </div>
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
            {!features.whiteLabel && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-100">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-bold text-amber-200">White Label locked</p>
                    <p className="mt-1 text-sm">
                      Branding controls are available on Pro when enabled for this business.
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-200">
                    Pro Feature
                  </span>
                </div>
              </div>
            )}


              <div>
                <label className="block text-slate-400 mb-2">Brand theme</label>

                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-400">Brand theme</label>
                  {!features.customThemes && <span className="text-xs rounded bg-amber-500/20 px-2 py-1 text-amber-300">Pro Feature</span>}
                </div>

                <select
                  disabled={!features.customThemes}
                  className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-50"
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
                  disabled={!features.branding}
                  accept="image/*"
                  onChange={(event) => uploadBrandAsset(event, 'business-logos')}
                  className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                />

                {!features.branding && (
                  <p className="mt-2 text-sm text-amber-300">Logo upload is locked until Branding is enabled.</p>
                )}

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
                  disabled={!features.branding}
                  accept="image/*"
                  onChange={(event) => uploadBrandAsset(event, 'business-hero-images')}
                  className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
                />

                {!features.branding && (
                  <p className="mt-2 text-sm text-amber-300">Hero image upload is locked until Branding is enabled.</p>
                )}

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
                    disabled={!features.branding}
                    className="w-full h-12 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-50"
                    value={primaryColour}
                    onChange={(e) => setPrimaryColour(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-2">Secondary colour</label>
                  <input
                    type="color"
                    disabled={!features.branding}
                    className="w-full h-12 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-50"
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
                disabled={saving || !business || !features.branding}
                className="w-full bg-white text-slate-950 font-bold px-5 py-3 rounded-xl disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save branding'}
              </button>
            </div>
          </section>

          
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Commercial features</h2>

            <div className="space-y-4">
              <FeatureRow title="White Label" enabled={features.whiteLabel}/>
              <FeatureRow title="Branding" enabled={features.branding}/>
              <FeatureRow title="Custom Themes" enabled={features.customThemes}/>
              <FeatureRow title="Email Branding" enabled={features.emailBranding}/>
              <FeatureRow title="Custom Domain" enabled={features.customDomain}/>
              <FeatureRow title="Remove AMB Branding" enabled={features.removeAmbBranding}/>
            </div>

            {!features.emailBranding && (
              <LockedCard title="Email Branding" text="Available on the Pro plan." />
            )}

            {!features.customDomain && (
              <LockedCard title="Custom Domain" text="Available on the Pro plan." />
            )}

            {!features.removeAmbBranding && (
              <LockedCard title="Remove AMB Branding" text="Available on the Pro plan." />
            )}
          </section>



          <section className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Email branding & Domains</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-800 p-5">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">Email Branding</h3>
                  <span className={features.emailBranding ? "text-emerald-400":"text-amber-300"}>
                    {features.emailBranding ? "Enabled":"Locked"}
                  </span>
                </div>
                <input
                  disabled={!features.emailBranding}
                  placeholder="Email sender coming in Email Branding V2"
                  className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 disabled:opacity-50"
                />
              </div>

              <div className="rounded-xl border border-slate-800 p-5">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">Custom Domain</h3>
                  <span className={features.customDomain ? "text-emerald-400":"text-amber-300"}>
                    {features.customDomain ? "Enabled":"Locked"}
                  </span>
                </div>
                <input
                  disabled={!features.customDomain}
                  placeholder="Custom domain coming in Domain Manager V2"
                  className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-800 p-5">
              <label className="flex items-center justify-between">
                <span className="font-semibold">Remove AMB Branding</span>
                <input
                  type="checkbox"
                  disabled={!features.removeAmbBranding}
                />
              </label>
            </div>
          </section>


          <section className="xl:col-span-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-6 text-cyan-100">
            <h2 className="text-2xl font-bold">White Label status</h2>
            <p className="mt-2 text-sm">
              This page is now wired to business feature entitlements. The Master Admin Feature Manager will be able to enable or disable each white-label capability per business without changing this page again.
            </p>
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

function FeatureRow({ title, enabled }: { title: string; enabled: boolean }) {
  return(
    <div className="flex items-center justify-between rounded-xl border border-slate-800 p-3">
      <span>{title}</span>
      <span className={enabled?"text-emerald-400":"text-amber-300"}>
        {enabled?"Enabled":"Locked"}
      </span>
    </div>
  )
}

function LockedCard({ title, text }: { title: string; text: string }) {
  return(
    <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
      <h3 className="font-bold text-amber-200">{title}</h3>
      <p className="text-amber-100 text-sm mt-1">{text}</p>
    </div>
  )
}
