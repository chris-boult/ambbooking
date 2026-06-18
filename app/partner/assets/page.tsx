'use client'

import { useEffect, useState } from 'react'
import PartnerShell from '@/components/partner/PartnerShell'
import { getCurrentPartner, shortDate } from '@/lib/partnerPortal'
import { supabase } from '@/lib/supabase'

export default function PartnerAssetsPage() {
  const [assets, setAssets] = useState<any[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const result = await getCurrentPartner()
    if (!result.partner) { window.location.href = '/partner/login'; return }
    const { data, error } = await supabase.from('partner_assets').select('*').order('created_at', { ascending: false })
    if (error) setMessage(error.message)
    setAssets(data || [])
  }

  return (
    <PartnerShell>
      <h1 className="text-4xl font-bold">Asset library</h1>
      <p className="mt-2 text-slate-400">Download AMB Booking logos, screenshots, sales resources and marketing materials.</p>
      {message && <div className="mt-6 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">{message}</div>}
      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {assets.map((asset) => (
          <article key={asset.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            {asset.thumbnail_url ? <img src={asset.thumbnail_url} alt="" className="mb-4 h-40 w-full rounded-2xl object-cover" /> : <div className="mb-4 flex h-40 items-center justify-center rounded-2xl bg-slate-900 text-slate-500">No preview</div>}
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">{asset.category || 'Resource'}</p>
            <h2 className="mt-2 text-xl font-bold">{asset.title || 'Untitled asset'}</h2>
            <p className="mt-2 min-h-[44px] text-sm text-slate-400">{asset.description || 'Partner marketing resource.'}</p>
            <p className="mt-3 text-xs text-slate-500">Added {shortDate(asset.created_at)}</p>
            {asset.file_url && <a href={asset.file_url} target="_blank" className="mt-5 block rounded-xl bg-cyan-400 px-4 py-3 text-center text-sm font-bold text-slate-950 hover:bg-cyan-300">Download</a>}
          </article>
        ))}
      </section>
      {assets.length === 0 && <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">No assets have been uploaded yet.</div>}
    </PartnerShell>
  )
}
