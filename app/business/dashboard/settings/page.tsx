'use client'

import RoleGuard from '@/components/RoleGuard'
import { ChangeEvent, useEffect, useMemo, useState } from 'react'
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
  plan?: string | null
  subscription_status?: string | null
  monthly_amount?: number | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  stripe_connect_account_id?: string | null
  stripe_connect_status?: string | null
  stripe_connect_charges_enabled?: boolean | null
  stripe_connect_payouts_enabled?: boolean | null
  stripe_connect_onboarding_complete?: boolean | null
  email?: string | null
  phone?: string | null
  website?: string | null
  timezone?: string | null
  company_number?: string | null
  vat_number?: string | null
  address_line_1?: string | null
  address_line_2?: string | null
  city?: string | null
  postcode?: string | null
  country?: string | null
  booking_seo_title?: string | null
  booking_seo_description?: string | null
  booking_social_image_url?: string | null
  archived_at?: string | null
  archive_reason?: string | null
  public_booking_disabled?: boolean | null
  custom_domain?: string | null
}

type TeamMember = { id: string; full_name: string }

type StaffUser = {
  id: string
  email: string
  role: string
  team_member_id: string
  team_members: { full_name: string } | null
}

type NotificationSettings = {
  booking_confirmations: boolean
  cancellation_emails: boolean
  reminder_24h: boolean
  reminder_2h: boolean
  review_requests: boolean
  new_booking_alerts: boolean
  push_notifications: boolean
  sms_notifications: boolean
}

type UsageStats = { services: number; teamMembers: number; customers: number; bookings: number }

const defaultNotificationSettings: NotificationSettings = {
  booking_confirmations: true,
  cancellation_emails: true,
  reminder_24h: true,
  reminder_2h: true,
  review_requests: true,
  new_booking_alerts: true,
  push_notifications: false,
  sms_notifications: false,
}

const defaultUsageStats: UsageStats = { services: 0, teamMembers: 0, customers: 0, bookings: 0 }

const brandThemes = [
  { id: 'classic_dark', name: 'Classic dark', description: 'Premium dark style with soft gradients.' },
  { id: 'clean_light', name: 'Clean light', description: 'Bright, minimal and simple.' },
  { id: 'luxury_gold', name: 'Luxury gold', description: 'Black, gold and premium feel.' },
  { id: 'clinic_rose', name: 'Clinic rose', description: 'Soft, elegant and ideal for beauty or clinics.' },
  { id: 'electric_blue', name: 'Electric blue', description: 'Modern, sharp and energetic.' },
  { id: 'forest_green', name: 'Forest green', description: 'Calm, natural and professional.' },
  { id: 'monochrome', name: 'Monochrome', description: 'Black, white and timeless.' },
]

const featureKeys = {
  whiteLabel: 'white_label',
  branding: 'branding',
  customThemes: 'custom_themes',
  emailBranding: 'email_branding',
  customDomain: 'custom_domain',
  removeAmbBranding: 'remove_amb_branding',
}

type FeatureState = Record<keyof typeof featureKeys, boolean>
const defaultFeatureState: FeatureState = {
  whiteLabel: false,
  branding: false,
  customThemes: false,
  emailBranding: false,
  customDomain: false,
  removeAmbBranding: false,
}

type SettingsTab = 'business' | 'branding' | 'billing' | 'team' | 'features' | 'notifications' | 'advanced'

function safeFileName(fileName: string) {
  return fileName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9.-]/g, '')
}

function formatPlan(plan?: string | null) {
  if (!plan) return 'No plan selected'
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

function formatStatus(status?: string | null) {
  if (!status) return 'Unknown'
  return status.replace(/_/g, ' ')
}

function downloadCsv(filename: string, rows: Record<string, any>[], setMessage: (message: string) => void) {
  if (!rows.length) {
    setMessage('No data available to export.')
    return
  }

  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((field) => JSON.stringify(row[field] ?? '')).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('business')
  const [business, setBusiness] = useState<Business | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])
  const [features, setFeatures] = useState<FeatureState>(defaultFeatureState)
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotificationSettings)
  const [usage, setUsage] = useState<UsageStats>(defaultUsageStats)

  const [businessName, setBusinessName] = useState('')
  const [slug, setSlug] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [primaryColour, setPrimaryColour] = useState('#7c3aed')
  const [secondaryColour, setSecondaryColour] = useState('#2563eb')
  const [businessDescription, setBusinessDescription] = useState('')
  const [brandTheme, setBrandTheme] = useState('classic_dark')
  const [businessEmail, setBusinessEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [timezone, setTimezone] = useState('Europe/London')
  const [companyNumber, setCompanyNumber] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')
  const [country, setCountry] = useState('United Kingdom')
  const [bookingSeoTitle, setBookingSeoTitle] = useState('')
  const [bookingSeoDescription, setBookingSeoDescription] = useState('')
  const [bookingSocialImageUrl, setBookingSocialImageUrl] = useState('')
  const [publicBookingDisabled, setPublicBookingDisabled] = useState(false)
  const [teamMemberId, setTeamMemberId] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [staffRole, setStaffRole] = useState('staff')
  const [archiveReason, setArchiveReason] = useState('')

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [addingStaff, setAddingStaff] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [openingBilling, setOpeningBilling] = useState(false)
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false)
  const [exportingCustomers, setExportingCustomers] = useState(false)
  const [exportingBookings, setExportingBookings] = useState(false)
  const [archivingBusiness, setArchivingBusiness] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const selectedTheme = brandThemes.find((theme) => theme.id === brandTheme)
  const bookingUrl = useMemo(() => {
    if (typeof window === 'undefined' || !slug) return ''
    return `${window.location.origin}/book/${slug}`
  }, [slug])

  async function loadFeatureState(businessId: string) {
    const { data, error } = await supabase.from('business_features').select('feature_key, enabled').eq('business_id', businessId)
    if (error) return setFeatures(defaultFeatureState)
    const enabled = (key: string) => data?.some((feature) => feature.feature_key === key && feature.enabled === true) ?? false
    setFeatures({
      whiteLabel: enabled(featureKeys.whiteLabel),
      branding: enabled(featureKeys.branding),
      customThemes: enabled(featureKeys.customThemes),
      emailBranding: enabled(featureKeys.emailBranding),
      customDomain: enabled(featureKeys.customDomain),
      removeAmbBranding: enabled(featureKeys.removeAmbBranding),
    })
  }

  async function loadNotificationSettings(businessId: string) {
    const { data, error } = await supabase
      .from('business_notification_settings')
      .select('booking_confirmations,cancellation_emails,reminder_24h,reminder_2h,review_requests,new_booking_alerts,push_notifications,sms_notifications')
      .eq('business_id', businessId)
      .maybeSingle()

    if (error) return setNotifications(defaultNotificationSettings)
    if (!data) {
      const { data: inserted, error: insertError } = await supabase
        .from('business_notification_settings')
        .insert({ business_id: businessId, ...defaultNotificationSettings })
        .select('booking_confirmations,cancellation_emails,reminder_24h,reminder_2h,review_requests,new_booking_alerts,push_notifications,sms_notifications')
        .single()
      if (insertError || !inserted) return setNotifications(defaultNotificationSettings)
      return setNotifications(inserted as NotificationSettings)
    }
    setNotifications(data as NotificationSettings)
  }

  async function loadUsageStats(businessId: string) {
    const [servicesResult, teamResult, customersResult, bookingsResult] = await Promise.all([
      supabase.from('services').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
    ])
    setUsage({ services: servicesResult.count || 0, teamMembers: teamResult.count || 0, customers: customersResult.count || 0, bookings: bookingsResult.count || 0 })
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
      .select('id,business_name,slug,logo_url,hero_image_url,primary_colour,secondary_colour,business_description,brand_theme,plan,subscription_status,monthly_amount,stripe_customer_id,stripe_subscription_id,stripe_connect_account_id,stripe_connect_status,stripe_connect_charges_enabled,stripe_connect_payouts_enabled,stripe_connect_onboarding_complete,email,phone,website,timezone,company_number,vat_number,address_line_1,address_line_2,city,postcode,country,booking_seo_title,booking_seo_description,booking_social_image_url,archived_at,archive_reason,public_booking_disabled,custom_domain')
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
      setMessage('No business is linked to this login.')
      setLoading(false)
      return
    }

    setBusiness(businessData as Business)
    await Promise.all([loadFeatureState(businessData.id), loadNotificationSettings(businessData.id), loadUsageStats(businessData.id)])

    setBusinessName(businessData.business_name || '')
    setSlug(businessData.slug || '')
    setLogoUrl(businessData.logo_url || '')
    setHeroImageUrl(businessData.hero_image_url || '')
    setPrimaryColour(businessData.primary_colour || '#7c3aed')
    setSecondaryColour(businessData.secondary_colour || '#2563eb')
    setBusinessDescription(businessData.business_description || '')
    setBrandTheme(businessData.brand_theme || 'classic_dark')
    setBusinessEmail(businessData.email || '')
    setPhone(businessData.phone || '')
    setWebsite(businessData.website || '')
    setTimezone(businessData.timezone || 'Europe/London')
    setCompanyNumber(businessData.company_number || '')
    setVatNumber(businessData.vat_number || '')
    setAddressLine1(businessData.address_line_1 || '')
    setAddressLine2(businessData.address_line_2 || '')
    setCity(businessData.city || '')
    setPostcode(businessData.postcode || '')
    setCountry(businessData.country || 'United Kingdom')
    setBookingSeoTitle(businessData.booking_seo_title || '')
    setBookingSeoDescription(businessData.booking_seo_description || '')
    setBookingSocialImageUrl(businessData.booking_social_image_url || '')
    setPublicBookingDisabled(Boolean(businessData.public_booking_disabled))

    const { data: teamData, error: teamError } = await supabase.from('team_members').select('id,full_name').eq('business_id', businessData.id).order('full_name')
    if (teamError) {
      setMessage(teamError.message)
      setLoading(false)
      return
    }

    const { data: staffData, error: staffError } = await supabase
      .from('staff_users')
      .select('id,email,role,team_member_id,team_members!staff_users_team_member_id_fkey(full_name)')
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
    if (!business) return setMessage('Business not loaded. Refresh the page and try again.')
    setSaving(true)
    setMessage('')

    const cleanedSlug = slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
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
        email: businessEmail,
        phone,
        website,
        timezone,
        company_number: companyNumber,
        vat_number: vatNumber,
        address_line_1: addressLine1,
        address_line_2: addressLine2,
        city,
        postcode,
        country,
        booking_seo_title: bookingSeoTitle,
        booking_seo_description: bookingSeoDescription,
        booking_social_image_url: bookingSocialImageUrl,
        public_booking_disabled: publicBookingDisabled,
      })
      .eq('id', business.id)
      .select()

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }
    if (!data || data.length === 0) {
      setMessage('No business row was updated.')
      setSaving(false)
      return
    }
    setSlug(cleanedSlug)
    setMessage('Settings saved.')
    await loadSettings()
    setSaving(false)
  }

  async function uploadBrandAsset(event: ChangeEvent<HTMLInputElement>, bucket: 'business-logos' | 'business-hero-images') {
    if (!business) return setMessage('Business not loaded. Refresh the page and try again.')
    const file = event.target.files?.[0]
    if (!file) return
    const isLogo = bucket === 'business-logos'
    isLogo ? setUploadingLogo(true) : setUploadingHero(true)
    setMessage('')
    const filePath = `${business.id}/${Date.now()}-${safeFileName(file.name)}`
    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, { cacheControl: '3600', upsert: false })
    if (uploadError) {
      setMessage(uploadError.message)
      setUploadingLogo(false)
      setUploadingHero(false)
      return
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
    isLogo ? setLogoUrl(data.publicUrl) : setHeroImageUrl(data.publicUrl)
    setMessage(isLogo ? 'Logo uploaded. Click Save to publish it.' : 'Hero image uploaded. Click Save to publish it.')
    setUploadingLogo(false)
    setUploadingHero(false)
  }

  async function createStaffUser() {
    if (!business) return setMessage('Business not loaded. Refresh the page and try again.')
    if (!teamMemberId || !staffEmail) return setMessage('Please choose a team member and enter an email.')
    setAddingStaff(true)
    setMessage('')
    const { error } = await supabase.from('staff_users').insert({ business_id: business.id, team_member_id: teamMemberId, email: staffEmail.trim(), role: staffRole })
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
    if (!window.confirm('Are you sure you want to remove this staff account?')) return
    const { error } = await supabase.from('staff_users').delete().eq('id', id)
    if (error) return setMessage(error.message)
    setMessage('Staff account removed.')
    await loadSettings()
  }

  async function openBusinessBillingPortal() {
    if (!business) return
    setOpeningBilling(true)
    setMessage('')
    const res = await fetch('/api/business-billing-portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: business.id }) })
    const data = await res.json()
    if (!res.ok || !data.url) {
      setMessage(data.error || 'Could not open billing portal.')
      setOpeningBilling(false)
      return
    }
    window.location.href = data.url
  }

  async function copyBookingLink() {
    if (!bookingUrl) return
    await navigator.clipboard.writeText(bookingUrl)
    setMessage('Booking link copied.')
  }

  function updateNotificationValue(key: keyof NotificationSettings, value: boolean) {
    setNotifications((current) => ({ ...current, [key]: value }))
  }

  async function saveNotificationSettings() {
    if (!business) return setMessage('Business not loaded. Refresh the page and try again.')
    setSavingNotifications(true)
    setMessage('')
    const { error } = await supabase.from('business_notification_settings').upsert({ business_id: business.id, ...notifications, updated_at: new Date().toISOString() }, { onConflict: 'business_id' })
    if (error) {
      setMessage(error.message)
      setSavingNotifications(false)
      return
    }
    setMessage('Notification preferences saved.')
    setSavingNotifications(false)
  }

  async function sendPasswordReset() {
    setSendingPasswordReset(true)
    setMessage('')
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user?.email) {
      setMessage(userError?.message || 'Could not find your email address.')
      setSendingPasswordReset(false)
      return
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.amb-booking.co.uk'
    const { error } = await supabase.auth.resetPasswordForEmail(userData.user.email, { redirectTo: `${appUrl.replace(/\/$/, '')}/reset-password` })
    if (error) {
      setMessage(error.message)
      setSendingPasswordReset(false)
      return
    }
    setMessage('Password reset email sent.')
    setSendingPasswordReset(false)
  }

  async function exportCustomers() {
    if (!business) return
    setExportingCustomers(true)
    setMessage('')
    const { data, error } = await supabase.from('customers').select('*').eq('business_id', business.id).order('created_at', { ascending: false })
    if (error) {
      setMessage(error.message)
      setExportingCustomers(false)
      return
    }
    downloadCsv(`${business.slug || 'business'}-customers.csv`, (data || []) as Record<string, any>[], setMessage)
    setExportingCustomers(false)
  }

  async function exportBookings() {
    if (!business) return
    setExportingBookings(true)
    setMessage('')
    const { data, error } = await supabase.from('bookings').select('*').eq('business_id', business.id).order('created_at', { ascending: false })
    if (error) {
      setMessage(error.message)
      setExportingBookings(false)
      return
    }
    downloadCsv(`${business.slug || 'business'}-bookings.csv`, (data || []) as Record<string, any>[], setMessage)
    setExportingBookings(false)
  }

  async function archiveBusiness() {
    if (!business) return
    if (!window.confirm('Archive this business? This disables the public booking page but keeps historical data safe.')) return
    setArchivingBusiness(true)
    setMessage('')
    const { error } = await supabase.from('businesses').update({ archived_at: new Date().toISOString(), archive_reason: archiveReason.trim() || 'Archived by business owner', public_booking_disabled: true, status: 'archived' }).eq('id', business.id)
    if (error) {
      setMessage(error.message)
      setArchivingBusiness(false)
      return
    }
    setMessage('Business archived and public booking page disabled.')
    await loadSettings()
    setArchivingBusiness(false)
  }

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'business', label: 'Business' },
    { id: 'branding', label: 'Branding' },
    { id: 'billing', label: 'Billing' },
    { id: 'team', label: 'Team' },
    { id: 'features', label: 'Features' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'advanced', label: 'Advanced' },
  ]

  return (
    <RoleGuard allowedRoles={['owner']}>
      <div>
        <div className="mb-8">
          <p className="text-slate-400 mb-2">Settings</p>
          <h1 className="text-4xl font-bold mb-2">Business settings</h1>
          <p className="text-slate-500">Manage your business profile, subscription, team, branding and platform preferences.</p>
        </div>

        <div className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${activeTab === tab.id ? 'bg-white text-slate-950' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {message && <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-8 text-slate-300">{message}</div>}
        {loading && <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-300">Loading settings...</div>}

        {!loading && activeTab === 'business' && (
          <section className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-6">Business profile</h2>
              <div className="grid lg:grid-cols-2 gap-6">
                <Field label="Business name" value={businessName} onChange={setBusinessName} />
                <Field label="Booking slug" value={slug} onChange={setSlug} placeholder="your-business-name" />
                <Field label="Business email" value={businessEmail} onChange={setBusinessEmail} />
                <Field label="Phone" value={phone} onChange={setPhone} />
                <Field label="Website" value={website} onChange={setWebsite} />
                <Field label="Timezone" value={timezone} onChange={setTimezone} />
                <Field label="Company number" value={companyNumber} onChange={setCompanyNumber} />
                <Field label="VAT number" value={vatNumber} onChange={setVatNumber} />
                <div className="lg:col-span-2">
                  <label className="block text-slate-400 mb-2">Business description</label>
                  <textarea className="w-full min-h-32 p-3 rounded-lg bg-slate-800 border border-slate-700" value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} placeholder="Tell customers what you do, where you are based, and why they should book with you." />
                </div>
                {bookingUrl && (
                  <div className="lg:col-span-2 border border-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 mb-2">Public booking link</p>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <p className="font-bold break-all">{bookingUrl}</p>
                      <button type="button" onClick={copyBookingLink} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold hover:bg-slate-700">Copy link</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-6">Address</h2>
              <div className="grid lg:grid-cols-2 gap-6">
                <Field label="Address line 1" value={addressLine1} onChange={setAddressLine1} />
                <Field label="Address line 2" value={addressLine2} onChange={setAddressLine2} />
                <Field label="City" value={city} onChange={setCity} />
                <Field label="Postcode" value={postcode} onChange={setPostcode} />
                <Field label="Country" value={country} onChange={setCountry} />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-6">Booking page SEO</h2>
              <div className="grid lg:grid-cols-2 gap-6">
                <Field label="SEO title" value={bookingSeoTitle} onChange={setBookingSeoTitle} />
                <Field label="Social image URL" value={bookingSocialImageUrl} onChange={setBookingSocialImageUrl} />
                <div className="lg:col-span-2">
                  <label className="block text-slate-400 mb-2">SEO description</label>
                  <textarea className="w-full min-h-28 p-3 rounded-lg bg-slate-800 border border-slate-700" value={bookingSeoDescription} onChange={(e) => setBookingSeoDescription(e.target.value)} placeholder="Short description for search engines and social sharing." />
                </div>
                <label className="lg:col-span-2 flex cursor-pointer items-center justify-between rounded-xl border border-slate-800 p-4">
                  <span><span className="block font-bold">Disable public booking page</span><span className="text-sm text-slate-500">Useful while setting up or if the business is archived.</span></span>
                  <input type="checkbox" checked={publicBookingDisabled} onChange={(event) => setPublicBookingDisabled(event.target.checked)} className="h-5 w-5" />
                </label>
              </div>
            </div>

            <button type="button" onClick={saveBusinessDetails} disabled={saving || !business} className="bg-white text-slate-950 font-bold px-5 py-3 rounded-xl disabled:opacity-50">{saving ? 'Saving...' : 'Save business settings'}</button>
          </section>
        )}

        {!loading && activeTab === 'branding' && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Branding</h2>
            {!features.whiteLabel && <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-100"><p className="font-bold text-amber-200">White Label locked</p><p className="mt-1 text-sm">Branding controls are available when enabled for this business.</p></div>}
            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2"><label className="text-slate-400">Brand theme</label>{!features.customThemes && <span className="text-xs rounded bg-amber-500/20 px-2 py-1 text-amber-300">Pro Feature</span>}</div>
                <select disabled={!features.customThemes} className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-50" value={brandTheme} onChange={(e) => setBrandTheme(e.target.value)}>{brandThemes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select>
                {selectedTheme && <p className="text-slate-500 text-sm mt-2">{selectedTheme.description}</p>}
              </div>
              <div><label className="block text-slate-400 mb-2">Logo upload</label><input type="file" disabled={!features.branding} accept="image/*" onChange={(event) => uploadBrandAsset(event, 'business-logos')} className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-50" />{uploadingLogo && <p className="text-slate-500 text-sm mt-2">Uploading logo...</p>}{logoUrl && <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-slate-500 text-sm mb-3">Current logo</p><img src={logoUrl} alt="Business logo" className="max-h-20 max-w-56 object-contain" /></div>}</div>
              <div><label className="block text-slate-400 mb-2">Hero image upload</label><input type="file" disabled={!features.branding} accept="image/*" onChange={(event) => uploadBrandAsset(event, 'business-hero-images')} className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-50" />{uploadingHero && <p className="text-slate-500 text-sm mt-2">Uploading hero image...</p>}{heroImageUrl && <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950"><img src={heroImageUrl} alt="Business hero" className="h-40 w-full object-cover" /></div>}</div>
              <div className="grid md:grid-cols-2 gap-4"><div><label className="block text-slate-400 mb-2">Primary colour</label><input type="color" disabled={!features.branding} className="w-full h-12 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-50" value={primaryColour} onChange={(e) => setPrimaryColour(e.target.value)} /></div><div><label className="block text-slate-400 mb-2">Secondary colour</label><input type="color" disabled={!features.branding} className="w-full h-12 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-50" value={secondaryColour} onChange={(e) => setSecondaryColour(e.target.value)} /></div></div>
              <div className="lg:col-span-2 rounded-2xl p-6 border border-slate-800" style={{ background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})` }}><p className="text-white/80 text-sm mb-2">Live brand preview</p><h3 className="text-3xl font-bold text-white">{businessName || 'Your Business'}</h3><p className="text-white/80 mt-2">{businessDescription || 'Your customer-facing booking page will use your selected theme and brand assets.'}</p></div>
            </div>
            <button type="button" onClick={saveBusinessDetails} disabled={saving || !business || !features.branding} className="mt-6 bg-white text-slate-950 font-bold px-5 py-3 rounded-xl disabled:opacity-50">{saving ? 'Saving...' : 'Save branding'}</button>
          </section>
        )}

        {!loading && activeTab === 'billing' && (
          <section className="space-y-6">
            <div className="grid xl:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="text-2xl font-bold mb-6">Subscription & billing</h2><div className="space-y-4"><BillingRow label="Current plan" value={formatPlan(business?.plan)} /><BillingRow label="Subscription status" value={formatStatus(business?.subscription_status)} /><BillingRow label="Monthly amount" value={business?.monthly_amount ? `£${Number(business.monthly_amount).toFixed(2)}` : 'Not set'} /><BillingRow label="Stripe billing customer" value={business?.stripe_customer_id ? 'Connected' : 'Not connected'} /></div><button type="button" onClick={openBusinessBillingPortal} disabled={openingBilling || !business?.stripe_customer_id} className="mt-6 w-full rounded-xl bg-white px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{openingBilling ? 'Opening...' : 'Manage subscription'}</button></div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="text-2xl font-bold mb-6">Stripe Connect</h2><div className="space-y-4"><BillingRow label="Connected account" value={business?.stripe_connect_account_id ? 'Connected' : 'Not connected'} /><BillingRow label="Connect status" value={formatStatus(business?.stripe_connect_status)} /><BillingRow label="Charges enabled" value={business?.stripe_connect_charges_enabled ? 'Yes' : 'No'} /><BillingRow label="Payouts enabled" value={business?.stripe_connect_payouts_enabled ? 'Yes' : 'No'} /></div><p className="mt-5 text-sm text-slate-500">Booking payments are paid into the business Stripe Express account. AMB Booking does not take a transaction fee.</p></div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="text-2xl font-bold mb-6">Plan usage</h2><div className="grid md:grid-cols-4 gap-4"><UsageCard label="Services" value={usage.services} /><UsageCard label="Team members" value={usage.teamMembers} /><UsageCard label="Customers" value={usage.customers} /><UsageCard label="Bookings" value={usage.bookings} /></div></div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="text-2xl font-bold mb-6">Connected services</h2><div className="grid md:grid-cols-3 gap-4"><IntegrationCard title="Stripe billing" status={business?.stripe_customer_id ? 'Connected' : 'Not connected'} active={Boolean(business?.stripe_customer_id)} /><IntegrationCard title="Stripe Connect" status={business?.stripe_connect_onboarding_complete ? 'Active' : 'Incomplete'} active={Boolean(business?.stripe_connect_onboarding_complete)} /><IntegrationCard title="Custom domain" status={business?.custom_domain ? 'Configured' : 'Not configured'} active={Boolean(business?.custom_domain)} /><IntegrationCard title="Email branding" status={features.emailBranding ? 'Enabled' : 'Locked'} active={features.emailBranding} /><IntegrationCard title="Push notifications" status={notifications.push_notifications ? 'Enabled' : 'Off'} active={notifications.push_notifications} /><IntegrationCard title="SMS notifications" status={notifications.sms_notifications ? 'Enabled' : 'Off'} active={notifications.sms_notifications} /></div></div>
          </section>
        )}

        {!loading && activeTab === 'team' && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="text-2xl font-bold mb-6">Staff accounts</h2><div className="grid lg:grid-cols-3 gap-4 mb-8"><select className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700" value={teamMemberId} onChange={(e) => setTeamMemberId(e.target.value)}><option value="">Select team member</option>{teamMembers.map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}</select><input className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700" placeholder="Staff login email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} /><select className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700" value={staffRole} onChange={(e) => setStaffRole(e.target.value)}><option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option></select><button type="button" onClick={createStaffUser} disabled={addingStaff || !business} className="bg-white text-slate-950 font-bold px-5 py-3 rounded-xl lg:col-span-3 disabled:opacity-50">{addingStaff ? 'Adding...' : 'Add staff account'}</button></div><div className="space-y-4">{staffUsers.map((staff) => <div key={staff.id} className="border border-slate-800 rounded-xl p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="font-bold">{staff.team_members?.full_name || 'Unknown team member'}</p><p className="text-slate-400 text-sm">{staff.email}</p><p className="text-slate-500 text-sm capitalize">{staff.role}</p></div><button type="button" onClick={() => deleteStaffUser(staff.id)} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm font-semibold">Remove</button></div>)}{staffUsers.length === 0 && <p className="text-slate-500">No staff accounts added yet.</p>}</div></section>
        )}

        {!loading && activeTab === 'features' && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="text-2xl font-bold mb-6">Plan features</h2><div className="grid md:grid-cols-2 gap-4"><FeatureRow title="White Label" enabled={features.whiteLabel} /><FeatureRow title="Branding" enabled={features.branding} /><FeatureRow title="Custom Themes" enabled={features.customThemes} /><FeatureRow title="Email Branding" enabled={features.emailBranding} /><FeatureRow title="Custom Domain" enabled={features.customDomain} /><FeatureRow title="Remove AMB Branding" enabled={features.removeAmbBranding} /></div><p className="mt-6 text-sm text-slate-500">Feature access is controlled by your subscription plan and AMB Booking feature entitlements.</p></section>
        )}

        {!loading && activeTab === 'notifications' && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="text-2xl font-bold mb-6">Notifications</h2><div className="grid md:grid-cols-2 gap-4"><NotificationToggle label="Booking confirmations" checked={notifications.booking_confirmations} onChange={(value) => updateNotificationValue('booking_confirmations', value)} /><NotificationToggle label="Cancellation emails" checked={notifications.cancellation_emails} onChange={(value) => updateNotificationValue('cancellation_emails', value)} /><NotificationToggle label="24 hour reminders" checked={notifications.reminder_24h} onChange={(value) => updateNotificationValue('reminder_24h', value)} /><NotificationToggle label="2 hour reminders" checked={notifications.reminder_2h} onChange={(value) => updateNotificationValue('reminder_2h', value)} /><NotificationToggle label="Review requests" checked={notifications.review_requests} onChange={(value) => updateNotificationValue('review_requests', value)} /><NotificationToggle label="New booking alerts" checked={notifications.new_booking_alerts} onChange={(value) => updateNotificationValue('new_booking_alerts', value)} /><NotificationToggle label="Push notifications" checked={notifications.push_notifications} onChange={(value) => updateNotificationValue('push_notifications', value)} /><NotificationToggle label="SMS notifications" checked={notifications.sms_notifications} onChange={(value) => updateNotificationValue('sms_notifications', value)} /></div><button type="button" onClick={saveNotificationSettings} disabled={savingNotifications || !business} className="mt-6 rounded-xl bg-white px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{savingNotifications ? 'Saving...' : 'Save notification preferences'}</button></section>
        )}

        {!loading && activeTab === 'advanced' && (
          <section className="grid xl:grid-cols-2 gap-6"><div className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="text-2xl font-bold mb-6">Security</h2><div className="space-y-4"><ActionButton title="Change password" text="Send a secure password reset email to your account email address." buttonLabel={sendingPasswordReset ? 'Sending...' : 'Send reset email'} disabled={sendingPasswordReset} onClick={sendPasswordReset} /><InfoRow title="Two-factor authentication" text="Coming in a dedicated security phase." /><InfoRow title="Active sessions" text="Coming in a dedicated security phase." /></div></div><div className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="text-2xl font-bold mb-6">Data export</h2><div className="space-y-4"><ActionButton title="Export customers" text="Download a CSV export of this business's customer records." buttonLabel={exportingCustomers ? 'Exporting...' : 'Export customers'} disabled={exportingCustomers} onClick={exportCustomers} /><ActionButton title="Export bookings" text="Download a CSV export of this business's booking records." buttonLabel={exportingBookings ? 'Exporting...' : 'Export bookings'} disabled={exportingBookings} onClick={exportBookings} /></div></div><div className="xl:col-span-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-6"><h2 className="text-2xl font-bold text-red-200">Danger zone</h2><p className="mt-2 text-sm text-red-100">Archiving disables the public booking page and keeps historical records safe. It does not permanently delete data or cancel billing.</p><div className="mt-5"><label className="block text-red-100 mb-2">Archive reason</label><input value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} className="w-full rounded-lg border border-red-500/20 bg-red-950/30 p-3 text-red-50" placeholder="Optional reason" /></div><button type="button" onClick={archiveBusiness} disabled={archivingBusiness || Boolean(business?.archived_at)} className="mt-5 rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-50">{business?.archived_at ? 'Business archived' : archivingBusiness ? 'Archiving...' : 'Archive business'}</button></div></section>
        )}
      </div>
    </RoleGuard>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <div><label className="block text-slate-400 mb-2">{label}</label><input className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>
}

function FeatureRow({ title, enabled }: { title: string; enabled: boolean }) {
  return <div className="flex items-center justify-between rounded-xl border border-slate-800 p-4"><span className="font-semibold">{title}</span><span className={enabled ? 'text-emerald-400' : 'text-amber-300'}>{enabled ? 'Enabled' : 'Locked'}</span></div>
}

function BillingRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-xl border border-slate-800 p-4"><span className="text-slate-400">{label}</span><span className="font-bold capitalize">{value}</span></div>
}

function UsageCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-800 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>
}

function IntegrationCard({ title, status, active }: { title: string; status: string; active: boolean }) {
  return <div className="rounded-xl border border-slate-800 p-4"><p className="font-bold">{title}</p><p className={`mt-2 text-sm ${active ? 'text-emerald-400' : 'text-amber-300'}`}>{status}</p></div>
}

function NotificationToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-800 p-4"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5" /></label>
}

function ActionButton({ title, text, buttonLabel, disabled, onClick }: { title: string; text: string; buttonLabel: string; disabled?: boolean; onClick: () => void }) {
  return <div className="rounded-xl border border-slate-800 p-4"><p className="font-bold">{title}</p><p className="mt-1 text-sm text-slate-500">{text}</p><button type="button" onClick={onClick} disabled={disabled} className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold hover:bg-slate-700 disabled:opacity-50">{buttonLabel}</button></div>
}

function InfoRow({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-slate-800 p-4"><p className="font-bold">{title}</p><p className="mt-1 text-sm text-slate-500">{text}</p></div>
}
