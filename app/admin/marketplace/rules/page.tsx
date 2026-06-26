'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PlatformSettings = any
type IndustryRule = any

const industries = [
  ['barber', 'Barber'],
  ['hairdresser', 'Hairdresser'],
  ['mens_grooming', "Men's Grooming"],
  ['beauty_salon', 'Beauty Salon'],
  ['aesthetics', 'Aesthetics'],
  ['nail_salon', 'Nail Salon'],
  ['tattoo_studio', 'Tattoo Studio'],
  ['gym', 'Gym'],
  ['personal_trainer', 'Personal Trainer'],
  ['fitness_class', 'Fitness Class'],
  ['physiotherapy', 'Physiotherapy'],
  ['massage', 'Massage'],
  ['nutrition', 'Nutrition'],
  ['supplements', 'Supplements'],
  ['coffee_shop', 'Coffee Shop'],
  ['restaurant', 'Restaurant'],
  ['clothing', 'Clothing'],
  ['car_valeting', 'Car Valeting'],
  ['garage', 'Garage'],
  ['accountant', 'Accountant'],
  ['insurance', 'Insurance'],
  ['finance', 'Finance'],
  ['cleaner', 'Cleaner'],
  ['electrician', 'Electrician'],
  ['plumber', 'Plumber'],
  ['photography', 'Photography'],
  ['other', 'Other'],
]

function industryLabel(value: string) {
  return industries.find(([key]) => key === value)?.[1] || value
}

export default function AdminMarketplaceRulesPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [rules, setRules] = useState<IndustryRule[]>([])
  const [selectedIndustry, setSelectedIndustry] = useState('barber')
  const [relatedIndustry, setRelatedIndustry] = useState('barber')
  const [relationshipType, setRelationshipType] = useState<'competitor' | 'complementary'>('competitor')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [settingsRes, rulesRes] = await Promise.all([
      supabase.from('platform_marketplace_settings').select('*').limit(1).maybeSingle(),
      supabase.from('marketplace_industry_rules').select('*').order('primary_industry'),
    ])
    if (settingsRes.error) setMessage(settingsRes.error.message)
    if (rulesRes.error) setMessage(rulesRes.error.message)
    setSettings(settingsRes.data || null)
    setRules(rulesRes.data || [])
    setLoading(false)
  }

  async function saveSettings() {
    if (!settings) return
    setSaving(true)
    const { error } = await supabase.from('platform_marketplace_settings').update({
      marketplace_enabled: settings.marketplace_enabled,
      competitor_protection_enabled: settings.competitor_protection_enabled,
      allow_open_marketplace: settings.allow_open_marketplace,
      require_listing_approval: settings.require_listing_approval,
      allow_featured_listings: settings.allow_featured_listings,
      allow_sponsored_listings: settings.allow_sponsored_listings,
      allow_affiliate_listings: settings.allow_affiliate_listings,
      updated_at: new Date().toISOString(),
    }).eq('id', settings.id)

    if (error) setMessage(error.message)
    else setMessage('Marketplace settings saved.')
    setSaving(false)
    await loadData()
  }

  async function addRule() {
    const { error } = await supabase.from('marketplace_industry_rules').insert({
      primary_industry: selectedIndustry,
      related_industry: relatedIndustry,
      relationship_type: relationshipType,
    })
    if (error) setMessage(error.message)
    else setMessage('Industry rule added.')
    await loadData()
  }

  async function deleteRule(rule: IndustryRule) {
    const { error } = await supabase.from('marketplace_industry_rules').delete().eq('id', rule.id)
    if (error) setMessage(error.message)
    else setMessage('Industry rule deleted.')
    await loadData()
  }

  const selectedRules = useMemo(() => rules.filter((rule) => rule.primary_industry === selectedIndustry), [rules, selectedIndustry])
  const competitors = selectedRules.filter((rule) => rule.relationship_type === 'competitor')
  const complementary = selectedRules.filter((rule) => rule.relationship_type === 'complementary')

  if (loading) return <div className="text-white">Loading marketplace rules...</div>

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-2 text-slate-400">Admin</p>
        <h1 className="text-4xl font-black">Marketplace rules</h1>
        <p className="mt-2 max-w-3xl text-slate-500">Control Competitor Protection™, open marketplace behaviour and industry relationships.</p>
      </section>

      {message && <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">{message}</div>}

      {settings && (
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="mb-6 text-2xl font-black">Platform marketplace settings</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ToggleCard title="Enable Marketplace" description="Master switch." enabled={settings.marketplace_enabled} onChange={(value) => setSettings({ ...settings, marketplace_enabled: value })} />
            <ToggleCard title="Competitor Protection™" description="Hide direct competitors." enabled={settings.competitor_protection_enabled} onChange={(value) => setSettings({ ...settings, competitor_protection_enabled: value })} />
            <ToggleCard title="Open Marketplace" description="Allow competitor advertising." enabled={settings.allow_open_marketplace} onChange={(value) => setSettings({ ...settings, allow_open_marketplace: value })} />
            <ToggleCard title="Require Approval" description="Approve listings first." enabled={settings.require_listing_approval} onChange={(value) => setSettings({ ...settings, require_listing_approval: value })} />
            <ToggleCard title="Featured Listings" description="Allow featured listings." enabled={settings.allow_featured_listings} onChange={(value) => setSettings({ ...settings, allow_featured_listings: value })} />
            <ToggleCard title="Sponsored Listings" description="Paid placements." enabled={settings.allow_sponsored_listings} onChange={(value) => setSettings({ ...settings, allow_sponsored_listings: value })} />
          </div>
          <button type="button" onClick={saveSettings} disabled={saving} className="mt-6 rounded-2xl bg-white px-6 py-4 font-black text-slate-950 disabled:opacity-50">{saving ? 'Saving...' : 'Save platform settings'}</button>
        </section>
      )}

      <section className="grid gap-8 xl:grid-cols-[360px_1fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="mb-5 text-2xl font-black">Add industry rule</h2>
          <div className="space-y-4">
            <Select label="Primary industry" value={selectedIndustry} onChange={setSelectedIndustry} />
            <Select label="Related industry" value={relatedIndustry} onChange={setRelatedIndustry} />
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-500">Relationship</span>
              <select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as any)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none">
                <option value="competitor">Competitor</option>
                <option value="complementary">Complementary</option>
              </select>
            </label>
            <button type="button" onClick={addRule} className="w-full rounded-2xl bg-white px-5 py-4 font-black text-slate-950">Add rule</button>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="mb-5 text-2xl font-black">{industryLabel(selectedIndustry)} rules</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <RuleList title="Competitors" rows={competitors} onDelete={deleteRule} />
            <RuleList title="Complementary" rows={complementary} onDelete={deleteRule} />
          </div>
        </section>
      </section>
    </div>
  )
}

function Select({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none">
        {industries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  )
}

function ToggleCard({ title, description, enabled, onChange }: { title: string; description: string; enabled: boolean; onChange: (enabled: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-5">
      <span><span className="block font-black text-white">{title}</span><span className="mt-1 block text-sm text-slate-500">{description}</span></span>
      <input type="checkbox" checked={enabled} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 accent-white" />
    </label>
  )
}

function RuleList({ title, rows, onDelete }: { title: string; rows: IndustryRule[]; onDelete: (rule: IndustryRule) => void }) {
  return (
    <div>
      <h3 className="mb-4 text-xl font-black">{title}</h3>
      <div className="space-y-3">
        {rows.map((rule) => (
          <div key={rule.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="font-bold text-slate-200">{industryLabel(rule.related_industry)}</p>
            <button type="button" onClick={() => onDelete(rule)} className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-black text-red-300">Remove</button>
          </div>
        ))}
        {rows.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-slate-500">No rules yet.</div>}
      </div>
    </div>
  )
}
