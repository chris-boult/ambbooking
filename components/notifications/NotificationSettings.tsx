'use client'

import { useEffect, useState } from 'react'

type Preferences = {
  push_enabled: boolean
  email_enabled: boolean
  sms_enabled: boolean
  whatsapp_enabled: boolean
  booking_notifications: boolean
  marketplace_notifications: boolean
  membership_notifications: boolean
  review_notifications: boolean
  payment_notifications: boolean
  daily_summary_enabled: boolean
}

const defaults: Preferences = {
  push_enabled: true,
  email_enabled: true,
  sms_enabled: false,
  whatsapp_enabled: false,
  booking_notifications: true,
  marketplace_notifications: true,
  membership_notifications: true,
  review_notifications: true,
  payment_notifications: true,
  daily_summary_enabled: false,
}

export function NotificationSettings({ businessId }: { businessId: string }) {
  const [preferences, setPreferences] = useState<Preferences>(defaults)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadPreferences()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  async function loadPreferences() {
    const params = new URLSearchParams({ businessId })
    const response = await fetch(`/api/notifications/preferences?${params.toString()}`)
    const result = await response.json()
    setPreferences({ ...defaults, ...(result.preferences || {}) })
  }

  async function save(next: Preferences) {
    setPreferences(next)
    setMessage('Saving...')

    const response = await fetch('/api/notifications/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, preferences: next }),
    })

    const result = await response.json()
    setMessage(response.ok ? 'Preferences saved.' : result?.error || 'Could not save preferences.')
  }

  function update(key: keyof Preferences, value: boolean) {
    save({ ...preferences, [key]: value })
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-5 text-2xl font-black text-white">Notification preferences</h2>

      {message && <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">{message}</div>}

      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(preferences).map(([key, value]) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <span className="font-bold text-slate-300">{key.replaceAll('_', ' ')}</span>
            <input type="checkbox" checked={Boolean(value)} onChange={(event) => update(key as keyof Preferences, event.target.checked)} className="h-5 w-5 accent-white" />
          </label>
        ))}
      </div>
    </section>
  )
}
