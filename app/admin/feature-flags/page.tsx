'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type FeatureFlag = {
  id: string
  flag_key: string
  name: string
  description: string | null
  enabled: boolean
  rollout: string | null
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFlags()
  }, [])

  async function loadFlags() {
    setLoading(true)
    const { data, error } = await supabase.from('feature_flags').select('*').order('name')
    if (error) setMessage(error.message)
    setFlags((data as FeatureFlag[]) || [])
    setLoading(false)
  }

  async function toggleFlag(flag: FeatureFlag) {
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from('feature_flags').update({ enabled: !flag.enabled, updated_at: new Date().toISOString() }).eq('id', flag.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await supabase.from('audit_logs').insert({
      actor_email: userData.user?.email || 'unknown',
      action: 'feature_flag_toggled',
      entity_type: 'feature_flag',
      entity_id: flag.id,
      metadata: { flag_key: flag.flag_key, enabled: !flag.enabled },
    })

    await loadFlags()
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">Rollout controls</p>
        <h1 className="mt-2 text-4xl font-black">Feature Flags</h1>
        <p className="mt-3 max-w-2xl text-slate-400">Turn features on and off without redeploying.</p>
      </div>

      {message && <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">{message}</div>}
      {loading && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">Loading feature flags...</div>}

      {!loading && (
        <section className="grid gap-4 md:grid-cols-2">
          {flags.map((flag) => (
            <div key={flag.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">{flag.name}</h2>
                  <p className="mt-2 text-sm text-slate-400">{flag.description || flag.flag_key}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-600">{flag.rollout || 'global'}</p>
                </div>

                <button
                  onClick={() => toggleFlag(flag)}
                  className={`rounded-2xl px-5 py-3 font-black ${flag.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}
                >
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
