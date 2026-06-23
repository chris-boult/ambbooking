'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string | null
  slug: string | null
}

type SmsSettings = {
  id: string
  business_id: string
  provider: string | null
  sender_name: string | null
  account_sid: string | null
  auth_token: string | null
  from_number: string | null
  is_enabled: boolean | null
  created_at: string | null
}

type SmsLog = {
  id: string
  business_id: string
  customer_id: string | null
  booking_id: string | null
  phone: string | null
  message: string | null
  event_type: string | null
  status: string | null
  provider_message_id: string | null
  error_message: string | null
  created_at: string | null
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function maskSecret(value?: string | null) {
  if (!value) return 'Not set'
  if (value.length <= 8) return '••••••••'
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`
}

export default function MessagingSettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [settings, setSettings] = useState<SmsSettings | null>(null)
  const [logs, setLogs] = useState<SmsLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState('')

  const [provider, setProvider] = useState('twilio')
  const [senderName, setSenderName] = useState('')
  const [accountSid, setAccountSid] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [fromNumber, setFromNumber] = useState('')
  const [isEnabled, setIsEnabled] = useState(false)

  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('This is a test SMS from AMB Booking.')

  useEffect(() => {
    loadData()
  }, [])

  async function getBusinessForUser() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) throw userError
    if (!user) throw new Error('You need to be logged in.')

    const { data: ownedBusinesses, error: businessError } = await supabase
      .from('businesses')
      .select('id,business_name,slug')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (businessError) throw businessError

    const ownedBusiness = ownedBusinesses?.[0]
    if (ownedBusiness) return ownedBusiness as Business

    const { data: staffRows } = await supabase
      .from('staff_users')
      .select('business_id')
      .eq('email', user.email)
      .limit(1)

    if (staffRows?.[0]?.business_id) {
      const { data: staffBusinesses, error: staffBusinessError } = await supabase
        .from('businesses')
        .select('id,business_name,slug')
        .eq('id', staffRows[0].business_id)
        .limit(1)

      if (staffBusinessError) throw staffBusinessError

      const staffBusiness = staffBusinesses?.[0]
      if (staffBusiness) return staffBusiness as Business
    }

    throw new Error('No business found for this user.')
  }

  async function loadData() {
    setLoading(true)
    setMessage('')

    try {
      const foundBusiness = await getBusinessForUser()
      setBusiness(foundBusiness)

      const [settingsResult, logsResult] = await Promise.all([
        supabase
          .from('sms_settings')
          .select('*')
          .eq('business_id', foundBusiness.id)
          .maybeSingle(),
        supabase
          .from('sms_logs')
          .select('*')
          .eq('business_id', foundBusiness.id)
          .order('created_at', { ascending: false })
          .limit(25),
      ])

      if (settingsResult.error) throw settingsResult.error
      if (logsResult.error) throw logsResult.error

      const loadedSettings = settingsResult.data as SmsSettings | null
      setSettings(loadedSettings)
      setLogs((logsResult.data as SmsLog[]) || [])

      if (loadedSettings) {
        setProvider(loadedSettings.provider || 'twilio')
        setSenderName(loadedSettings.sender_name || '')
        setAccountSid(loadedSettings.account_sid || '')
        setAuthToken(loadedSettings.auth_token || '')
        setFromNumber(loadedSettings.from_number || '')
        setIsEnabled(Boolean(loadedSettings.is_enabled))
      }
    } catch (error: any) {
      console.error('Messaging load error:', error)
      setMessage(error?.message || 'Could not load messaging settings.')
    }

    setLoading(false)
  }

  async function saveSettings() {
    if (!business) return

    setSaving(true)
    setMessage('')

    const payload = {
      business_id: business.id,
      provider,
      sender_name: senderName.trim() || null,
      account_sid: accountSid.trim() || null,
      auth_token: authToken.trim() || null,
      from_number: fromNumber.trim() || null,
      is_enabled: isEnabled,
    }

    const { data, error } = settings?.id
      ? await supabase
          .from('sms_settings')
          .update(payload)
          .eq('id', settings.id)
          .select('*')
          .single()
      : await supabase
          .from('sms_settings')
          .insert(payload)
          .select('*')
          .single()

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setSettings(data as SmsSettings)
    setMessage('Messaging settings saved.')
    setSaving(false)
  }

  async function sendTestSms() {
    if (!business) return

    if (!testPhone.trim()) {
      setMessage('Enter a test phone number.')
      return
    }

    if (!testMessage.trim()) {
      setMessage('Enter a test message.')
      return
    }

    setTesting(true)
    setMessage('')

    const response = await fetch('/api/messaging/send-test-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: business.id,
        phone: testPhone.trim(),
        message: testMessage.trim(),
      }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setMessage(result?.error || 'Could not send test SMS.')
      setTesting(false)
      await loadData()
      return
    }

    setMessage('Test SMS sent.')
    setTesting(false)
    await loadData()
  }

  const stats = useMemo(() => {
    return {
      total: logs.length,
      sent: logs.filter((log) => log.status === 'sent' || log.status === 'delivered').length,
      failed: logs.filter((log) => log.status === 'failed').length,
      pending: logs.filter((log) => log.status === 'pending').length,
    }
  }, [logs])

  if (loading) {
    return <div className="text-white">Loading messaging settings...</div>
  }

  return (
    <div>
      <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-slate-400">Settings</p>
          <h1 className="mb-2 text-4xl font-bold">Messaging</h1>
          <p className="max-w-3xl text-slate-500">
            Configure SMS reminders and customer notifications.
            {business?.business_name ? ` Connected to ${business.business_name}.` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950"
        >
          Refresh
        </button>
      </section>

      {message && (
        <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
          {message}
        </div>
      )}

      <section className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard label="SMS status" value={isEnabled ? 'Enabled' : 'Disabled'} />
        <StatCard label="Messages logged" value={stats.total} />
        <StatCard label="Sent" value={stats.sent} />
        <StatCard label="Failed" value={stats.failed} />
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-2 text-2xl font-bold">SMS settings</h2>
          <p className="mb-6 text-slate-400">
            Start with Twilio. You can add MessageBird, Vonage or WhatsApp later using the same messaging logs.
          </p>

          <div className="space-y-4">
            <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4">
              <span>
                <span className="block font-bold">Enable SMS</span>
                <span className="mt-1 block text-sm text-slate-500">Only send SMS when this is enabled.</span>
              </span>

              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(event) => setIsEnabled(event.target.checked)}
                className="h-5 w-5"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Provider</span>
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                <option value="twilio">Twilio</option>
                <option value="messagebird">MessageBird</option>
                <option value="vonage">Vonage</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Sender name</span>
              <input
                value={senderName}
                onChange={(event) => setSenderName(event.target.value)}
                placeholder="AMB Booking"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Twilio Account SID</span>
              <input
                value={accountSid}
                onChange={(event) => setAccountSid(event.target.value)}
                placeholder="AC..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Twilio Auth Token</span>
              <input
                type="password"
                value={authToken}
                onChange={(event) => setAuthToken(event.target.value)}
                placeholder={settings?.auth_token ? maskSecret(settings.auth_token) : 'Auth token'}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">From number</span>
              <input
                value={fromNumber}
                onChange={(event) => setFromNumber(event.target.value)}
                placeholder="+447..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="w-full rounded-xl bg-white px-5 py-3 font-bold text-slate-950 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save messaging settings'}
            </button>
          </div>
        </section>

        <section className="space-y-8">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-2 text-2xl font-bold">Send test SMS</h2>
            <p className="mb-6 text-slate-400">
              Use this to confirm your provider settings before switching on automated reminders.
            </p>

            <div className="space-y-4">
              <input
                value={testPhone}
                onChange={(event) => setTestPhone(event.target.value)}
                placeholder="+447..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />

              <textarea
                value={testMessage}
                onChange={(event) => setTestMessage(event.target.value)}
                className="min-h-28 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />

              <button
                type="button"
                onClick={sendTestSms}
                disabled={testing}
                className="w-full rounded-xl bg-slate-800 px-5 py-3 font-bold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {testing ? 'Sending...' : 'Send test SMS'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-2xl font-bold">Recent SMS logs</h2>

            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="font-bold">{log.phone || 'No phone'}</p>
                    <StatusPill value={log.status || 'pending'} />
                  </div>

                  <p className="text-sm text-slate-400">{log.message || 'No message'}</p>

                  <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    {log.event_type || 'manual'} · {formatDate(log.created_at)}
                  </p>

                  {log.error_message && (
                    <p className="mt-2 text-sm text-red-300">{log.error_message}</p>
                  )}
                </div>
              ))}

              {logs.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-8 text-center text-slate-500">
                  No SMS messages logged yet.
                </div>
              )}
            </div>
          </section>
        </section>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="mb-2 text-slate-400">{label}</p>
      <h2 className="text-3xl font-bold">{value}</h2>
    </div>
  )
}

function StatusPill({ value }: { value: string }) {
  const good = value === 'sent' || value === 'delivered'
  const pending = value === 'pending'
  const bad = value === 'failed'

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${
        good
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
          : pending
            ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
            : bad
              ? 'border-red-500/20 bg-red-500/10 text-red-300'
              : 'border-slate-500/20 bg-slate-500/10 text-slate-300'
      }`}
    >
      {value}
    </span>
  )
}
