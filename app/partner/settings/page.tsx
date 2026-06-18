'use client'

import { useEffect, useState } from 'react'
import PartnerShell from '@/components/partner/PartnerShell'
import { getCurrentPartner, type PartnerProfile } from '@/lib/partnerPortal'
import { supabase } from '@/lib/supabase'

export default function PartnerSettingsPage() {
  const [partner, setPartner] = useState<PartnerProfile | null>(null)
  const [form, setForm] = useState({ full_name: '', company_name: '', email: '' })
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const result = await getCurrentPartner()
    if (!result.partner) { window.location.href = '/partner/login'; return }
    setPartner(result.partner)
    setForm({ full_name: result.partner.full_name || '', company_name: result.partner.company_name || '', email: result.partner.email || '' })
  }

  async function save() {
    if (!partner) return
    setSaving(true)
    setMessage('')
    const { data, error } = await supabase
      .from('partners')
      .update({ full_name: form.full_name.trim(), company_name: form.company_name.trim(), email: form.email.trim().toLowerCase(), updated_at: new Date().toISOString() })
      .eq('id', partner.id)
      .select('*')
      .maybeSingle()

    if (error) { setMessage(error.message); setSaving(false); return }
    if (data) setPartner(data as PartnerProfile)
    setMessage('Settings saved.')
    setSaving(false)
  }

  return (
    <PartnerShell>
      <h1 className="text-4xl font-bold">Settings</h1>
      <p className="mt-2 text-slate-400">Manage your partner profile details.</p>
      {message && <div className="mt-6 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">{message}</div>}
      <section className="mt-8 max-w-2xl rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name" value={form.full_name} onChange={(value) => setForm((f) => ({ ...f, full_name: value }))} />
          <Field label="Company name" value={form.company_name} onChange={(value) => setForm((f) => ({ ...f, company_name: value }))} />
          <Field label="Email" value={form.email} onChange={(value) => setForm((f) => ({ ...f, email: value }))} />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-300">Referral code</span>
            <input readOnly value={partner?.referral_code || ''} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-400" />
          </label>
        </div>
        <button disabled={saving} onClick={save} className="mt-6 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-60">{saving ? 'Saving...' : 'Save settings'}</button>
      </section>
    </PartnerShell>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-300">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none ring-cyan-300/40 focus:ring-2" />
    </label>
  )
}
