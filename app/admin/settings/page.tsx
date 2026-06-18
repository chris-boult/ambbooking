'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Setting = {
  id: string
  setting_key: string
  setting_value: string | null
  setting_type: string | null
  description: string | null
}

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    const { data, error } = await supabase.from('platform_settings').select('*').order('setting_key')
    if (error) setMessage(error.message)
    setSettings((data as Setting[]) || [])
    setLoading(false)
  }

  async function updateSetting(setting: Setting, value: string) {
    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('platform_settings')
      .update({ setting_value: value, updated_at: new Date().toISOString() })
      .eq('id', setting.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await supabase.from('audit_logs').insert({
      actor_email: userData.user?.email || 'unknown',
      action: 'platform_setting_updated',
      entity_type: 'platform_setting',
      entity_id: setting.id,
      metadata: { setting_key: setting.setting_key, setting_value: value },
    })

    setMessage('Setting updated.')
    await loadSettings()
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">Configuration centre</p>
        <h1 className="mt-2 text-4xl font-black">Settings</h1>
        <p className="mt-3 max-w-2xl text-slate-400">Global platform controls for trials, signup status, bookings and maintenance mode.</p>
      </div>

      {message && <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">{message}</div>}
      {loading && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">Loading settings...</div>}

      {!loading && (
        <section className="space-y-4">
          {settings.map((setting) => (
            <SettingRow key={setting.id} setting={setting} onSave={(value) => updateSetting(setting, value)} />
          ))}
        </section>
      )}
    </div>
  )
}

function SettingRow({ setting, onSave }: { setting: Setting; onSave: (value: string) => void }) {
  const [value, setValue] = useState(setting.setting_value || '')

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px_auto] lg:items-center">
        <div>
          <h2 className="font-black">{setting.setting_key}</h2>
          <p className="mt-1 text-sm text-slate-400">{setting.description || setting.setting_type}</p>
        </div>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />

        <button onClick={() => onSave(value)} className="rounded-2xl bg-white px-5 py-3 font-black text-slate-950">
          Save
        </button>
      </div>
    </div>
  )
}
