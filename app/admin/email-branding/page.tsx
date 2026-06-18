'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string | null
  slug: string | null
  logo_url: string | null
  primary_colour: string | null
  secondary_colour: string | null
  sender_name: string | null
  sender_email: string | null
  reply_to_email: string | null
  custom_domain: string | null
  white_label_mode: string | null
  hide_amb_branding: boolean | null
}

type EmailBranding = {
  id: string
  business_id: string
  sender_name: string | null
  sender_email: string | null
  reply_to_email: string | null
  header_logo_url: string | null
  primary_colour: string | null
  secondary_colour: string | null
  footer_text: string | null
  booking_confirmation_enabled: boolean | null
  booking_reminder_enabled: boolean | null
  booking_cancellation_enabled: boolean | null
  booking_reschedule_enabled: boolean | null
  created_at: string | null
  updated_at: string | null
}

type EmailBrandingForm = {
  sender_name: string
  sender_email: string
  reply_to_email: string
  header_logo_url: string
  primary_colour: string
  secondary_colour: string
  footer_text: string
  booking_confirmation_enabled: boolean
  booking_reminder_enabled: boolean
  booking_cancellation_enabled: boolean
  booking_reschedule_enabled: boolean
}

const defaultForm: EmailBrandingForm = {
  sender_name: '',
  sender_email: '',
  reply_to_email: '',
  header_logo_url: '',
  primary_colour: '#111827',
  secondary_colour: '#6366f1',
  footer_text: '',
  booking_confirmation_enabled: true,
  booking_reminder_enabled: true,
  booking_cancellation_enabled: true,
  booking_reschedule_enabled: true,
}

function statusLabel(value?: string | null) {
  if (!value) return 'Not set'
  return value.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function buildFormFromBusinessAndBranding(business: Business | null, branding: EmailBranding | null): EmailBrandingForm {
  return {
    sender_name: branding?.sender_name || business?.sender_name || business?.business_name || '',
    sender_email: branding?.sender_email || business?.sender_email || '',
    reply_to_email: branding?.reply_to_email || business?.reply_to_email || business?.sender_email || '',
    header_logo_url: branding?.header_logo_url || business?.logo_url || '',
    primary_colour: branding?.primary_colour || business?.primary_colour || '#111827',
    secondary_colour: branding?.secondary_colour || business?.secondary_colour || '#6366f1',
    footer_text: branding?.footer_text || '',
    booking_confirmation_enabled: branding?.booking_confirmation_enabled ?? true,
    booking_reminder_enabled: branding?.booking_reminder_enabled ?? true,
    booking_cancellation_enabled: branding?.booking_cancellation_enabled ?? true,
    booking_reschedule_enabled: branding?.booking_reschedule_enabled ?? true,
  }
}

export default function AdminEmailBrandingPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [brandings, setBrandings] = useState<EmailBranding[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [form, setForm] = useState<EmailBrandingForm>(defaultForm)
  const [activePreview, setActivePreview] = useState<'confirmation' | 'reminder' | 'reschedule' | 'cancellation'>('confirmation')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadPage()
  }, [])

  const selectedBusiness = useMemo(() => {
    return businesses.find(business => business.id === selectedBusinessId) || null
  }, [businesses, selectedBusinessId])

  const selectedBranding = useMemo(() => {
    return brandings.find(branding => branding.business_id === selectedBusinessId) || null
  }, [brandings, selectedBusinessId])

  useEffect(() => {
    setForm(buildFormFromBusinessAndBranding(selectedBusiness, selectedBranding))
  }, [selectedBusiness, selectedBranding])

  async function loadPage() {
    setLoading(true)
    setError('')
    setMessage('')

    const [businessRes, brandingRes] = await Promise.all([
      supabase
        .from('businesses')
        .select(`
          id,
          business_name,
          slug,
          logo_url,
          primary_colour,
          secondary_colour,
          sender_name,
          sender_email,
          reply_to_email,
          custom_domain,
          white_label_mode,
          hide_amb_branding
        `)
        .order('business_name', { ascending: true }),

      supabase
        .from('email_branding')
        .select('*')
        .order('updated_at', { ascending: false }),
    ])

    if (businessRes.error) {
      setError(businessRes.error.message)
      setLoading(false)
      return
    }

    if (brandingRes.error) {
      setError(brandingRes.error.message)
      setLoading(false)
      return
    }

    const businessRows = (businessRes.data || []) as Business[]
    setBusinesses(businessRows)
    setBrandings((brandingRes.data || []) as EmailBranding[])

    if (!selectedBusinessId && businessRows.length > 0) {
      setSelectedBusinessId(businessRows[0].id)
    }

    setLoading(false)
  }

  function updateForm<K extends keyof EmailBrandingForm>(key: K, value: EmailBrandingForm[K]) {
    setForm(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  async function saveEmailBranding() {
    if (!selectedBusiness) return

    setSaving(true)
    setError('')
    setMessage('')

    const payload = {
      business_id: selectedBusiness.id,
      sender_name: form.sender_name || null,
      sender_email: form.sender_email || null,
      reply_to_email: form.reply_to_email || null,
      header_logo_url: form.header_logo_url || null,
      primary_colour: form.primary_colour || null,
      secondary_colour: form.secondary_colour || null,
      footer_text: form.footer_text || null,
      booking_confirmation_enabled: form.booking_confirmation_enabled,
      booking_reminder_enabled: form.booking_reminder_enabled,
      booking_cancellation_enabled: form.booking_cancellation_enabled,
      booking_reschedule_enabled: form.booking_reschedule_enabled,
      updated_at: new Date().toISOString(),
    }

    const { error: upsertError } = await supabase
      .from('email_branding')
      .upsert(payload, { onConflict: 'business_id' })

    if (upsertError) {
      setError(upsertError.message)
      setSaving(false)
      return
    }

    const { error: businessError } = await supabase
      .from('businesses')
      .update({
        sender_name: form.sender_name || null,
        sender_email: form.sender_email || null,
        reply_to_email: form.reply_to_email || null,
      })
      .eq('id', selectedBusiness.id)

    if (businessError) {
      setError(businessError.message)
      setSaving(false)
      return
    }

    await supabase.from('audit_logs').insert({
      actor_email: 'admin',
      action: 'email_branding_updated',
      entity_type: 'business',
      entity_id: selectedBusiness.id,
      metadata: {
        sender_name: form.sender_name,
        sender_email: form.sender_email,
        reply_to_email: form.reply_to_email,
      },
    })

    setMessage('Email branding saved successfully.')
    await loadPage()
    setSaving(false)
  }

  const completion = useMemo(() => {
    const checks = [
      Boolean(form.sender_name),
      Boolean(form.sender_email),
      Boolean(form.reply_to_email),
      Boolean(form.header_logo_url),
      Boolean(form.primary_colour),
      Boolean(form.secondary_colour),
      Boolean(form.footer_text),
      form.booking_confirmation_enabled,
      form.booking_reminder_enabled,
      form.booking_cancellation_enabled,
      form.booking_reschedule_enabled,
    ]

    const done = checks.filter(Boolean).length
    return {
      done,
      total: checks.length,
      percentage: Math.round((done / checks.length) * 100),
    }
  }, [form])

  const preview = getPreviewContent(activePreview)

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <p className="text-slate-300">Loading email branding...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold text-indigo-300">Platform Admin</p>
            <h1 className="mt-1 text-3xl font-black md:text-4xl">White Label Email Centre</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Manage sender identity, reply routing, logo, colours, footer copy and customer-facing email templates for each business.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/admin/branding" className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10">
              Branding Centre
            </Link>
            <Link href="/admin/domains" className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10">
              Domain Centre
            </Link>
            <button onClick={loadPage} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">
              Refresh
            </button>
          </div>
        </header>

        {message && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Businesses" value={businesses.length} />
          <Metric label="Email Branding" value={`${completion.percentage}%`} />
          <Metric label="White Label Mode" value={statusLabel(selectedBusiness?.white_label_mode)} />
          <Metric label="Domain" value={selectedBusiness?.custom_domain || 'Not set'} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_1fr_460px]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-300">Business</span>
              <select
                value={selectedBusinessId}
                onChange={event => setSelectedBusinessId(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
              >
                {businesses.map(business => (
                  <option key={business.id} value={business.id}>
                    {business.business_name || 'Unnamed business'}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-black text-slate-300">Email readiness</p>
              <p className="mt-3 text-4xl font-black">{completion.percentage}%</p>
              <p className="mt-1 text-sm text-slate-500">{completion.done} of {completion.total} items complete</p>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-white" style={{ width: `${completion.percentage}%` }} />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <ChecklistItem label="Sender name" done={Boolean(form.sender_name)} />
              <ChecklistItem label="Sender email" done={Boolean(form.sender_email)} />
              <ChecklistItem label="Reply-to email" done={Boolean(form.reply_to_email)} />
              <ChecklistItem label="Logo" done={Boolean(form.header_logo_url)} />
              <ChecklistItem label="Footer text" done={Boolean(form.footer_text)} />
              <ChecklistItem label="Confirmation enabled" done={form.booking_confirmation_enabled} />
              <ChecklistItem label="Reminder enabled" done={form.booking_reminder_enabled} />
              <ChecklistItem label="Cancellation enabled" done={form.booking_cancellation_enabled} />
              <ChecklistItem label="Reschedule enabled" done={form.booking_reschedule_enabled} />
            </div>

            {selectedBusiness && (
              <Link
                href={`/admin/businesses/${selectedBusiness.id}`}
                className="mt-5 block rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-black text-white hover:bg-white/10"
              >
                Open Business Command Centre
              </Link>
            )}
          </aside>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-black">Email settings</h2>
                <p className="mt-1 text-sm text-slate-400">
                  These settings control how booking emails appear to customers.
                </p>
              </div>

              <button
                onClick={saveEmailBranding}
                disabled={saving}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Email Branding'}
              </button>
            </div>

            <div className="space-y-6">
              <PanelBlock title="Sender identity">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Sender Name">
                    <input
                      value={form.sender_name}
                      onChange={event => updateForm('sender_name', event.target.value)}
                      className="input"
                      placeholder="The Barbers Lounge"
                    />
                  </Field>

                  <Field label="Sender Email">
                    <input
                      value={form.sender_email}
                      onChange={event => updateForm('sender_email', event.target.value)}
                      className="input"
                      placeholder="bookings@example.co.uk"
                    />
                  </Field>
                </div>

                <Field label="Reply-To Email">
                  <input
                    value={form.reply_to_email}
                    onChange={event => updateForm('reply_to_email', event.target.value)}
                    className="input"
                    placeholder="hello@example.co.uk"
                  />
                </Field>
              </PanelBlock>

              <PanelBlock title="Visual branding">
                <Field label="Header Logo URL">
                  <input
                    value={form.header_logo_url}
                    onChange={event => updateForm('header_logo_url', event.target.value)}
                    className="input"
                    placeholder="https://..."
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Primary Colour">
                    <input
                      value={form.primary_colour}
                      onChange={event => updateForm('primary_colour', event.target.value)}
                      className="input"
                      placeholder="#111827"
                    />
                  </Field>

                  <Field label="Secondary Colour">
                    <input
                      value={form.secondary_colour}
                      onChange={event => updateForm('secondary_colour', event.target.value)}
                      className="input"
                      placeholder="#6366f1"
                    />
                  </Field>
                </div>

                <Field label="Footer Text">
                  <textarea
                    value={form.footer_text}
                    onChange={event => updateForm('footer_text', event.target.value)}
                    className="textarea"
                    rows={4}
                    placeholder="Thanks for booking with us. If you need to change your appointment, please contact us."
                  />
                </Field>
              </PanelBlock>

              <PanelBlock title="Template controls">
                <div className="grid gap-3 md:grid-cols-2">
                  <Toggle
                    label="Booking Confirmation"
                    checked={form.booking_confirmation_enabled}
                    onChange={value => updateForm('booking_confirmation_enabled', value)}
                  />

                  <Toggle
                    label="Booking Reminder"
                    checked={form.booking_reminder_enabled}
                    onChange={value => updateForm('booking_reminder_enabled', value)}
                  />

                  <Toggle
                    label="Booking Cancellation"
                    checked={form.booking_cancellation_enabled}
                    onChange={value => updateForm('booking_cancellation_enabled', value)}
                  />

                  <Toggle
                    label="Booking Reschedule"
                    checked={form.booking_reschedule_enabled}
                    onChange={value => updateForm('booking_reschedule_enabled', value)}
                  />
                </div>
              </PanelBlock>
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4">
              <h2 className="text-2xl font-black">Live preview</h2>
              <p className="mt-1 text-sm text-slate-400">Customer-facing email preview.</p>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2">
              {[
                ['confirmation', 'Confirmation'],
                ['reminder', 'Reminder'],
                ['reschedule', 'Reschedule'],
                ['cancellation', 'Cancellation'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActivePreview(key as typeof activePreview)}
                  className={`rounded-xl px-3 py-2 text-xs font-black ${
                    activePreview === key
                      ? 'bg-white text-slate-950'
                      : 'border border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <EmailPreview
              business={selectedBusiness}
              form={form}
              title={preview.title}
              intro={preview.intro}
              status={preview.status}
              button={preview.button}
            />
          </aside>
        </section>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.2);
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
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.2);
          padding: 0.85rem 1rem;
          color: white;
          outline: none;
        }

        .textarea:focus {
          border-color: rgb(129, 140, 248);
        }
      `}</style>
    </main>
  )
}

function getPreviewContent(type: 'confirmation' | 'reminder' | 'reschedule' | 'cancellation') {
  if (type === 'reminder') {
    return {
      title: 'Appointment reminder',
      intro: 'This is a friendly reminder about your upcoming appointment.',
      status: 'Your appointment is tomorrow at 14:30.',
      button: 'View booking',
    }
  }

  if (type === 'reschedule') {
    return {
      title: 'Booking rescheduled',
      intro: 'Your appointment has been updated.',
      status: 'Your new appointment time is 21 June 2026 at 15:00.',
      button: 'View updated booking',
    }
  }

  if (type === 'cancellation') {
    return {
      title: 'Booking cancelled',
      intro: 'Your appointment has been cancelled.',
      status: 'No further action is needed.',
      button: 'Book again',
    }
  }

  return {
    title: 'Booking confirmed',
    intro: 'Thanks for your booking. Your appointment has been confirmed.',
    status: 'We look forward to seeing you on 21 June 2026 at 14:30.',
    button: 'Manage booking',
  }
}

function EmailPreview({
  business,
  form,
  title,
  intro,
  status,
  button,
}: {
  business: Business | null
  form: EmailBrandingForm
  title: string
  intro: string
  status: string
  button: string
}) {
  const brandName = form.sender_name || business?.business_name || 'Your Business'
  const logo = form.header_logo_url
  const primary = form.primary_colour || '#111827'
  const secondary = form.secondary_colour || '#6366f1'
  const footer = form.footer_text || `Thank you for booking with ${brandName}.`

  return (
    <div className="overflow-hidden rounded-3xl bg-white text-slate-950 shadow-2xl">
      <div className="p-6" style={{ background: primary }}>
        {logo ? (
          <img src={logo} alt="Email logo preview" className="max-h-14 max-w-[220px] rounded bg-white/95 p-2 object-contain" />
        ) : (
          <p className="text-xl font-black text-white">{brandName}</p>
        )}
      </div>

      <div className="p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">From: {brandName}</p>
        <p className="mt-1 text-xs text-slate-400">
          Reply to: {form.reply_to_email || form.sender_email || 'Not configured'}
        </p>

        <h3 className="mt-6 text-3xl font-black">{title}</h3>
        <p className="mt-4 text-sm leading-6 text-slate-600">Hi Chris,</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">{intro}</p>

        <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
          <p><strong>Service:</strong> Skin Fade & Beard Trim</p>
          <p><strong>Team member:</strong> Alex</p>
          <p><strong>Date:</strong> 21 June 2026</p>
          <p><strong>Time:</strong> 14:30</p>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-600">{status}</p>

        <button
          className="mt-6 rounded-2xl px-5 py-3 text-sm font-black text-white"
          style={{ background: secondary }}
        >
          {button}
        </button>

        <div className="mt-8 border-t border-slate-200 pt-5">
          <p className="text-xs leading-5 text-slate-500">{footer}</p>
          {business?.hide_amb_branding || business?.white_label_mode === 'fully_white_label' ? null : (
            <p className="mt-4 text-xs text-slate-400">Powered by AMB Booking</p>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 truncate text-2xl font-black">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-black text-slate-300">{label}</span>
      {children}
    </label>
  )
}

function PanelBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-5">
      <h3 className="text-xl font-black">{title}</h3>
      {children}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <span className="text-sm font-black text-slate-200">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="h-5 w-5"
      />
    </label>
  )
}

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-sm font-semibold text-slate-300">{label}</span>
      <span className={`rounded-full px-2 py-1 text-xs font-black ${done ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
        {done ? 'Done' : 'Missing'}
      </span>
    </div>
  )
}
