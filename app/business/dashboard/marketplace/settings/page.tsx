'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string | null
  marketplace_enabled: boolean | null
  competitor_protection: boolean | null
  industry: string | null
}

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
  ['physiotherapy', 'Physiotherapy'],
  ['coffee_shop', 'Coffee Shop'],
  ['restaurant', 'Restaurant'],
  ['cleaner', 'Cleaner'],
  ['garage', 'Garage'],
  ['accountant', 'Accountant'],
  ['other', 'Other'],
]

export default function MarketplaceSettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(true)
  const [competitorProtection, setCompetitorProtection] = useState(true)
  const [industry, setIndustry] = useState('other')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadBusiness()
  }, [])

  async function loadBusiness() {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setMessage('You need to be logged in.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('businesses')
      .select('id,business_name,marketplace_enabled,competitor_protection,industry')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const foundBusiness = data?.[0] as Business | undefined
    if (!foundBusiness) {
      setMessage('No business found.')
      setLoading(false)
      return
    }

    setBusiness(foundBusiness)
    setMarketplaceEnabled(foundBusiness.marketplace_enabled !== false)
    setCompetitorProtection(foundBusiness.competitor_protection !== false)
    setIndustry(foundBusiness.industry || 'other')
    setLoading(false)
  }

  async function saveSettings() {
    if (!business) return
    setSaving(true)

    const { error } = await supabase
      .from('businesses')
      .update({
        marketplace_enabled: marketplaceEnabled,
        competitor_protection: competitorProtection,
        industry,
      })
      .eq('id', business.id)

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setMessage('Marketplace settings saved.')
    setSaving(false)
    await loadBusiness()
  }

  if (loading) return <div className="text-white">Loading marketplace settings...</div>

  return (
    <div className="max-w-4xl">
      <section className="mb-10">
        <p className="mb-2 text-slate-400">Marketplace</p>
        <h1 className="mb-2 text-4xl font-bold">Marketplace settings</h1>
        <p className="max-w-3xl text-slate-500">
          Control how your business appears in the marketplace and protect your customers from competing businesses.
        </p>
      </section>

      {message && (
        <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
          {message}
        </div>
      )}

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-6 text-2xl font-bold">Marketplace visibility</h2>

        <div className="space-y-4">
          <ToggleRow title="Show my business in Marketplace" description="Allow your approved marketplace listings to appear publicly." enabled={marketplaceEnabled} onChange={setMarketplaceEnabled} />
          <ToggleRow title="Protect my customers from competitors" description="Your customers will not be shown direct competitors based on your business type." enabled={competitorProtection} onChange={setCompetitorProtection} />

          <label className="block rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <span className="mb-2 block font-bold text-white">Business type</span>
            <span className="mb-4 block text-sm text-slate-500">Used by Competitor Protection™.</span>
            <select value={industry} onChange={(event) => setIndustry(event.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none">
              {industries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <button type="button" onClick={saveSettings} disabled={saving} className="w-full rounded-2xl bg-white px-5 py-4 font-black text-slate-950 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save marketplace settings'}
          </button>
        </div>
      </section>
    </div>
  )
}

function ToggleRow({ title, description, enabled, onChange }: { title: string; description: string; enabled: boolean; onChange: (enabled: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <span>
        <span className="block font-bold text-white">{title}</span>
        <span className="mt-1 block text-sm text-slate-500">{description}</span>
      </span>
      <input type="checkbox" checked={enabled} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-white" />
    </label>
  )
}
