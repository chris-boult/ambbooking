'use client'

import { useEffect, useState } from 'react'
import PartnerShell from '@/components/partner/PartnerShell'
import PartnerTable from '@/components/partner/PartnerTable'
import { getCurrentPartner, money, shortDate, type PartnerProfile } from '@/lib/partnerPortal'
import { supabase } from '@/lib/supabase'

export default function PartnerReferralsPage() {
  const [partner, setPartner] = useState<PartnerProfile | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const result = await getCurrentPartner()
    if (!result.partner) { window.location.href = '/partner/login'; return }
    setPartner(result.partner)
    const { data, error } = await supabase.from('partner_referrals').select('*, businesses(business_name,email,status,plan,monthly_amount)').eq('partner_id', result.partner.id).order('created_at', { ascending: false })
    if (error) setMessage(error.message)
    setRows(data || [])
  }

  const referralLink = partner ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${partner.referral_code}` : ''

  return (
    <PartnerShell>
      <h1 className="text-4xl font-bold">Referrals</h1>
      <p className="mt-2 text-slate-400">View businesses attributed to your partner code.</p>
      {message && <div className="mt-6 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">{message}</div>}
      <section className="my-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl font-bold">Referral link</h2>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row">
          <input readOnly value={referralLink} className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-cyan-100" />
          <button onClick={() => navigator.clipboard.writeText(referralLink)} className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300">Copy</button>
        </div>
      </section>
      <PartnerTable headers={['Business', 'Email', 'Plan', 'MRR', 'Status', 'Signup']} rows={rows.map((item) => [item.businesses?.business_name || 'Unknown', item.businesses?.email || '—', item.businesses?.plan || '—', money(item.monthly_recurring_revenue || item.subscription_value || item.businesses?.monthly_amount), item.status || item.businesses?.status || 'active', shortDate(item.signup_date || item.created_at)])} />
    </PartnerShell>
  )
}
