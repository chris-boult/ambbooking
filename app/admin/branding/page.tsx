'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type WhiteLabelMode = 'amb_branded' | 'co_branded' | 'fully_white_label'

type Business = {
  id: string
  business_name: string | null
  slug: string | null
  logo_url: string | null
  hero_image_url: string | null
  primary_colour: string | null
  secondary_colour: string | null
  business_description: string | null
  email: string | null
  custom_domain: string | null
  white_label_mode: WhiteLabelMode | string | null
  hide_amb_branding: boolean | null
  custom_booking_headline: string | null
  custom_booking_intro: string | null
  reply_to_email: string | null
  domain_status: string | null
  ssl_status: string | null
  domain_last_checked_at: string | null
  domain_verification_token: string | null
  domain_verified_at: string | null
  privacy_policy_url: string | null
  terms_url: string | null
  sender_name: string | null
  sender_email: string | null
  branding_status: string | null
}

type BrandingForm = {
  business_name: string
  logo_url: string
  hero_image_url: string
  primary_colour: string
  secondary_colour: string
  business_description: string
  custom_domain: string
  white_label_mode: WhiteLabelMode
  hide_amb_branding: boolean
  custom_booking_headline: string
  custom_booking_intro: string
  reply_to_email: string
  privacy_policy_url: string
  terms_url: string
  sender_name: string
  sender_email: string
  branding_status: string
}

const defaultForm: BrandingForm = {
  business_name: '',
  logo_url: '',
  hero_image_url: '',
  primary_colour: '#111827',
  secondary_colour: '#6366f1',
  business_description: '',
  custom_domain: '',
  white_label_mode: 'amb_branded',
  hide_amb_branding: false,
  custom_booking_headline: '',
  custom_booking_intro: '',
  reply_to_email: '',
  privacy_policy_url: '',
  terms_url: '',
  sender_name: '',
  sender_email: '',
  branding_status: 'live',
}

function normaliseBusinessToForm(business: Business): BrandingForm {
  return {
    business_name: business.business_name || '',
    logo_url: business.logo_url || '',
    hero_image_url: business.hero_image_url || '',
    primary_colour: business.primary_colour || '#111827',
    secondary_colour: business.secondary_colour || '#6366f1',
    business_description: business.business_description || '',
    custom_domain: business.custom_domain || '',
    white_label_mode: (business.white_label_mode as WhiteLabelMode) || 'amb_branded',
    hide_amb_branding: Boolean(business.hide_amb_branding),
    custom_booking_headline: business.custom_booking_headline || '',
    custom_booking_intro: business.custom_booking_intro || '',
    reply_to_email: business.reply_to_email || '',
    privacy_policy_url: business.privacy_policy_url || '',
    terms_url: business.terms_url || '',
    sender_name: business.sender_name || '',
    sender_email: business.sender_email || '',
    branding_status: business.branding_status || 'live',
  }
}

function generateToken() {
  return `amb-verify-${Math.random().toString(36).slice(2, 10)}`
}

function statusLabel(status?: string | null) {
  if (!status) return 'Not set'
  return status.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase())
}

export default function BrandingCentrePage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [form, setForm] = useState<BrandingForm>(defaultForm)
  const [activeTab, setActiveTab] = useState<'identity' | 'booking' | 'domain' | 'email' | 'legal' | 'preview'>('identity')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBusinesses()
  }, [])

  useEffect(() => {
    const business = businesses.find(item => item.id === selectedBusinessId) || null
    setSelectedBusiness(business)
    setForm(business ? normaliseBusinessToForm(business) : defaultForm)
  }, [selectedBusinessId, businesses])

  async function fetchBusinesses() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
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
        email,
        custom_domain,
        white_label_mode,
        hide_amb_branding,
        custom_booking_headline,
        custom_booking_intro,
        reply_to_email,
        domain_status,
        ssl_status,
        domain_last_checked_at,
        domain_verification_token,
        domain_verified_at,
        privacy_policy_url,
        terms_url,
        sender_name,
        sender_email,
        branding_status
      `)
      .order('business_name', { ascending: true })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const rows = (data || []) as Business[]
    setBusinesses(rows)

    if (!selectedBusinessId && rows.length > 0) {
      setSelectedBusinessId(rows[0].id)
    }

    setLoading(false)
  }

  function updateForm<K extends keyof BrandingForm>(key: K, value: BrandingForm[K]) {
    setForm(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  async function saveBranding() {
    if (!selectedBusiness) return

    setSaving(true)
    setMessage('')
    setError('')

    const { error } = await supabase
      .from('businesses')
      .update({
        business_name: form.business_name || null,
        logo_url: form.logo_url || null,
        hero_image_url: form.hero_image_url || null,
        primary_colour: form.primary_colour || null,
        secondary_colour: form.secondary_colour || null,
        business_description: form.business_description || null,
        custom_domain: form.custom_domain || null,
        white_label_mode: form.white_label_mode,
        hide_amb_branding: form.white_label_mode === 'fully_white_label' ? true : form.hide_amb_branding,
        custom_booking_headline: form.custom_booking_headline || null,
        custom_booking_intro: form.custom_booking_intro || null,
        reply_to_email: form.reply_to_email || null,
        privacy_policy_url: form.privacy_policy_url || null,
        terms_url: form.terms_url || null,
        sender_name: form.sender_name || null,
        sender_email: form.sender_email || null,
        branding_status: form.branding_status || 'live',
      })
      .eq('id', selectedBusiness.id)

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    setMessage('Branding saved successfully.')
    await fetchBusinesses()
    setSaving(false)
  }

  async function createVerificationToken() {
    if (!selectedBusiness) return

    setSaving(true)
    setMessage('')
    setError('')

    const token = selectedBusiness.domain_verification_token || generateToken()

    const { error } = await supabase
      .from('businesses')
      .update({
        domain_verification_token: token,
        domain_status: form.custom_domain ? 'pending_verification' : 'not_connected',
        ssl_status: 'not_checked',
        domain_last_checked_at: new Date().toISOString(),
        custom_domain: form.custom_domain || null,
      })
      .eq('id', selectedBusiness.id)

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    setMessage('Domain verification token generated.')
    await fetchBusinesses()
    setSaving(false)
  }

  async function markDomainConnected() {
    if (!selectedBusiness) return

    setSaving(true)
    setMessage('')
    setError('')

    const { error } = await supabase
      .from('businesses')
      .update({
        domain_status: 'connected',
        ssl_status: 'active',
        domain_verified_at: new Date().toISOString(),
        domain_last_checked_at: new Date().toISOString(),
        custom_domain: form.custom_domain || null,
      })
      .eq('id', selectedBusiness.id)

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    await supabase.from('domain_checks').insert({
      business_id: selectedBusiness.id,
      domain_status: 'connected',
      ssl_status: 'active',
      notes: 'Manually marked as connected from Branding Centre.',
    })

    setMessage('Domain marked as connected.')
    await fetchBusinesses()
    setSaving(false)
  }

  const completion = useMemo(() => {
    const checks = [
      Boolean(form.logo_url),
      Boolean(form.primary_colour),
      Boolean(form.custom_booking_headline),
      Boolean(form.custom_booking_intro),
      Boolean(form.privacy_policy_url),
      Boolean(form.terms_url),
      Boolean(form.sender_name),
      Boolean(form.reply_to_email || form.sender_email),
      Boolean(form.custom_domain),
    ]

    const done = checks.filter(Boolean).length
    return {
      done,
      total: checks.length,
      percentage: Math.round((done / checks.length) * 100),
    }
  }, [form])

  const publicBookingUrl = selectedBusiness?.slug ? `/b/${selectedBusiness.slug}` : '#'

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-300">Loading Branding Centre...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-300">Platform Admin</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">White Label Branding Centre</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Manage business-level branding, booking page copy, sender details, legal links, custom domains and preview settings.
            </p>
          </div>

          <div className="flex flex-col gap-2 md:min-w-[320px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Business</label>
            <select
              value={selectedBusinessId}
              onChange={event => setSelectedBusinessId(event.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
            >
              {businesses.map(business => (
                <option key={business.id} value={business.id}>
                  {business.business_name || 'Unnamed business'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        )}

        {!selectedBusiness ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-slate-300">
            No businesses found.
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Branding Health</p>
                <p className="mt-2 text-4xl font-bold">{completion.percentage}%</p>
                <p className="mt-1 text-sm text-slate-300">{completion.done} of {completion.total} completed</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Mode</p>
                <p className="mt-2 text-xl font-semibold">{statusLabel(form.white_label_mode)}</p>
                <p className="mt-1 text-sm text-slate-300">{form.hide_amb_branding ? 'AMB branding hidden' : 'AMB branding visible'}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Domain</p>
                <p className="mt-2 text-xl font-semibold">{statusLabel(selectedBusiness.domain_status)}</p>
                <p className="mt-1 truncate text-sm text-slate-300">{form.custom_domain || 'No custom domain'}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">SSL</p>
                <p className="mt-2 text-xl font-semibold">{statusLabel(selectedBusiness.ssl_status)}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {selectedBusiness.domain_last_checked_at
                    ? new Date(selectedBusiness.domain_last_checked_at).toLocaleString('en-GB')
                    : 'Not checked'}
                </p>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
                {[
                  ['identity', 'Brand Identity'],
                  ['booking', 'Booking Page'],
                  ['domain', 'Custom Domain'],
                  ['email', 'Email Branding'],
                  ['legal', 'Legal'],
                  ['preview', 'Preview'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as typeof activeTab)}
                    className={`mb-2 w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                      activeTab === key
                        ? 'bg-indigo-500 text-white'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}

                <button
                  onClick={saveBranding}
                  disabled={saving}
                  className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Branding'}
                </button>
              </aside>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
                {activeTab === 'identity' && (
                  <div className="space-y-5">
                    <SectionTitle title="Brand Identity" description="Control the visible brand used across booking journeys and emails." />

                    <Field label="Business Name">
                      <input value={form.business_name} onChange={e => updateForm('business_name', e.target.value)} className="input" />
                    </Field>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Logo URL">
                        <input value={form.logo_url} onChange={e => updateForm('logo_url', e.target.value)} className="input" placeholder="https://..." />
                      </Field>

                      <Field label="Hero Image URL">
                        <input value={form.hero_image_url} onChange={e => updateForm('hero_image_url', e.target.value)} className="input" placeholder="https://..." />
                      </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Primary Colour">
                        <input value={form.primary_colour} onChange={e => updateForm('primary_colour', e.target.value)} className="input" placeholder="#111827" />
                      </Field>

                      <Field label="Secondary Colour">
                        <input value={form.secondary_colour} onChange={e => updateForm('secondary_colour', e.target.value)} className="input" placeholder="#6366f1" />
                      </Field>
                    </div>

                    <Field label="Business Description">
                      <textarea value={form.business_description} onChange={e => updateForm('business_description', e.target.value)} className="textarea" rows={5} />
                    </Field>

                    <Field label="White Label Mode">
                      <select value={form.white_label_mode} onChange={e => updateForm('white_label_mode', e.target.value as WhiteLabelMode)} className="input">
                        <option value="amb_branded">AMB Branded</option>
                        <option value="co_branded">Co-Branded</option>
                        <option value="fully_white_label">Fully White Label</option>
                      </select>
                    </Field>

                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={form.hide_amb_branding}
                        onChange={e => updateForm('hide_amb_branding', e.target.checked)}
                        className="h-4 w-4"
                      />
                      Hide AMB branding where allowed
                    </label>
                  </div>
                )}

                {activeTab === 'booking' && (
                  <div className="space-y-5">
                    <SectionTitle title="Booking Page" description="Customise the public booking page headline, intro copy and customer-facing tone." />

                    <Field label="Custom Booking Headline">
                      <input
                        value={form.custom_booking_headline}
                        onChange={e => updateForm('custom_booking_headline', e.target.value)}
                        className="input"
                        placeholder="Book your appointment"
                      />
                    </Field>

                    <Field label="Custom Booking Intro">
                      <textarea
                        value={form.custom_booking_intro}
                        onChange={e => updateForm('custom_booking_intro', e.target.value)}
                        className="textarea"
                        rows={5}
                        placeholder="Choose your service, date and preferred team member below."
                      />
                    </Field>

                    <div className="rounded-3xl border border-white/10 bg-slate-900 p-5">
                      <p className="text-sm font-semibold text-slate-300">Public booking URL</p>
                      <a href={publicBookingUrl} target="_blank" className="mt-2 inline-block text-sm font-semibold text-indigo-300 hover:text-indigo-200">
                        {publicBookingUrl}
                      </a>
                    </div>
                  </div>
                )}

                {activeTab === 'domain' && (
                  <div className="space-y-5">
                    <SectionTitle title="Custom Domain" description="Prepare domain verification and track connection and SSL status." />

                    <Field label="Custom Domain">
                      <input
                        value={form.custom_domain}
                        onChange={e => updateForm('custom_domain', e.target.value)}
                        className="input"
                        placeholder="bookings.example.co.uk"
                      />
                    </Field>

                    <div className="grid gap-4 md:grid-cols-2">
                      <StatusBox label="Domain Status" value={statusLabel(selectedBusiness.domain_status)} />
                      <StatusBox label="SSL Status" value={statusLabel(selectedBusiness.ssl_status)} />
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-slate-900 p-5">
                      <p className="text-sm font-semibold text-slate-300">DNS TXT Record</p>
                      <p className="mt-2 text-sm text-slate-400">Name / Host</p>
                      <code className="mt-1 block rounded-xl bg-black/40 p-3 text-sm text-indigo-200">_ambbooking</code>

                      <p className="mt-4 text-sm text-slate-400">Value</p>
                      <code className="mt-1 block rounded-xl bg-black/40 p-3 text-sm text-indigo-200">
                        {selectedBusiness.domain_verification_token || 'Generate a token first'}
                      </code>
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row">
                      <button onClick={createVerificationToken} disabled={saving} className="buttonSecondary">
                        Generate Verification Token
                      </button>
                      <button onClick={markDomainConnected} disabled={saving} className="buttonSecondary">
                        Mark Connected
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'email' && (
                  <div className="space-y-5">
                    <SectionTitle title="Email Branding" description="Control sender details and reply routing for booking emails." />

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Sender Name">
                        <input value={form.sender_name} onChange={e => updateForm('sender_name', e.target.value)} className="input" placeholder="The Barbers Lounge" />
                      </Field>

                      <Field label="Sender Email">
                        <input value={form.sender_email} onChange={e => updateForm('sender_email', e.target.value)} className="input" placeholder="bookings@example.co.uk" />
                      </Field>
                    </div>

                    <Field label="Reply-To Email">
                      <input value={form.reply_to_email} onChange={e => updateForm('reply_to_email', e.target.value)} className="input" placeholder="hello@example.co.uk" />
                    </Field>

                    <div className="rounded-3xl border border-white/10 bg-slate-900 p-5">
                      <p className="text-sm font-semibold text-slate-300">Email Header Preview</p>
                      <div className="mt-4 rounded-2xl bg-white p-5 text-slate-950">
                        {form.logo_url ? (
                          <img src={form.logo_url} alt="Logo preview" className="mb-4 max-h-12 max-w-[180px] object-contain" />
                        ) : (
                          <div className="mb-4 text-xl font-bold">{form.business_name || 'Business Name'}</div>
                        )}
                        <p className="text-sm">From: {form.sender_name || form.business_name || 'Business Name'}</p>
                        <p className="text-sm">Reply to: {form.reply_to_email || form.sender_email || 'Not configured'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'legal' && (
                  <div className="space-y-5">
                    <SectionTitle title="Legal Links" description="Add customer-facing policy links for booking and email footers." />

                    <Field label="Privacy Policy URL">
                      <input value={form.privacy_policy_url} onChange={e => updateForm('privacy_policy_url', e.target.value)} className="input" placeholder="https://..." />
                    </Field>

                    <Field label="Terms URL">
                      <input value={form.terms_url} onChange={e => updateForm('terms_url', e.target.value)} className="input" placeholder="https://..." />
                    </Field>

                    <Field label="Branding Status">
                      <select value={form.branding_status} onChange={e => updateForm('branding_status', e.target.value)} className="input">
                        <option value="live">Live</option>
                        <option value="draft">Draft</option>
                        <option value="needs_review">Needs Review</option>
                        <option value="paused">Paused</option>
                      </select>
                    </Field>
                  </div>
                )}

                {activeTab === 'preview' && (
                  <div className="space-y-5">
                    <SectionTitle title="Preview System" description="See how the booking page and basic email branding will look before launch." />

                    <div className="grid gap-5 xl:grid-cols-2">
                      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white text-slate-950">
                        <div
                          className="h-36 bg-slate-900 bg-cover bg-center"
                          style={{
                            backgroundImage: form.hero_image_url ? `url(${form.hero_image_url})` : undefined,
                            backgroundColor: form.primary_colour || '#111827',
                          }}
                        />
                        <div className="p-6">
                          {form.logo_url ? (
                            <img src={form.logo_url} alt="Logo preview" className="mb-5 max-h-14 max-w-[190px] object-contain" />
                          ) : (
                            <p className="mb-5 text-xl font-bold">{form.business_name || 'Business Name'}</p>
                          )}
                          <h2 className="text-2xl font-bold">
                            {form.custom_booking_headline || 'Book your appointment'}
                          </h2>
                          <p className="mt-3 text-sm text-slate-600">
                            {form.custom_booking_intro || 'Choose your service, date and preferred team member below.'}
                          </p>
                          <button
                            className="mt-6 rounded-2xl px-5 py-3 text-sm font-bold text-white"
                            style={{ backgroundColor: form.secondary_colour || '#6366f1' }}
                          >
                            Choose a service
                          </button>
                          {!form.hide_amb_branding && form.white_label_mode !== 'fully_white_label' && (
                            <p className="mt-6 text-xs text-slate-400">
                              {form.white_label_mode === 'co_branded'
                                ? `Powered by AMB Booking for ${form.business_name || 'this business'}`
                                : 'Powered by AMB Booking'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-white p-6 text-slate-950">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email Preview</p>
                        <div className="mt-5 border-b border-slate-200 pb-5">
                          {form.logo_url ? (
                            <img src={form.logo_url} alt="Logo preview" className="max-h-12 max-w-[180px] object-contain" />
                          ) : (
                            <p className="text-xl font-bold">{form.business_name || 'Business Name'}</p>
                          )}
                        </div>
                        <h2 className="mt-5 text-2xl font-bold">Booking confirmed</h2>
                        <p className="mt-3 text-sm text-slate-600">
                          Your appointment has been confirmed. We look forward to seeing you soon.
                        </p>
                        <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm">
                          <p><strong>Service:</strong> Example service</p>
                          <p><strong>Date:</strong> 18/06/2026</p>
                          <p><strong>Time:</strong> 10:30</p>
                        </div>
                        {!form.hide_amb_branding && form.white_label_mode !== 'fully_white_label' && (
                          <p className="mt-6 text-xs text-slate-400">Powered by AMB Booking</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.85);
          padding: 0.85rem 1rem;
          color: white;
          outline: none;
        }

        .input:focus {
          border-color: rgb(129, 140, 248);
        }

        .textarea {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.85);
          padding: 0.85rem 1rem;
          color: white;
          outline: none;
        }

        .textarea:focus {
          border-color: rgb(129, 140, 248);
        }

        .buttonSecondary {
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.08);
          padding: 0.85rem 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: white;
          transition: background 0.2s ease;
        }

        .buttonSecondary:hover {
          background: rgba(255, 255, 255, 0.14);
        }
      `}</style>
    </main>
  )
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-slate-300">{description}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-300">{label}</span>
      {children}
    </label>
  )
}

function StatusBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
    </div>
  )
}
