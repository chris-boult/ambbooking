'use client'

import { useEffect, useMemo, useState } from 'react'
import PartnerShell from '@/components/partner/PartnerShell'
import PartnerKpi from '@/components/partner/PartnerKpi'
import PartnerTable from '@/components/partner/PartnerTable'
import { getCurrentPartner, money, shortDate } from '@/lib/partnerPortal'
import { supabase } from '@/lib/supabase'

export default function PartnerCommissionsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const result = await getCurrentPartner()
    if (!result.partner) { window.location.href = '/partner/login'; return }
    const { data, error } = await supabase.from('partner_commissions').select('*').eq('partner_id', result.partner.id).order('created_at', { ascending: false })
    if (error) setMessage(error.message)
    setRows(data || [])
  }

  const stats = useMemo(() => ({
    earned: rows.reduce((s, r) => s + Number(r.amount || 0), 0),
    due: rows.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount || 0), 0),
    paid: rows.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount || 0), 0),
  }), [rows])

  return (
    <PartnerShell>
      <h1 className="text-4xl font-bold">Commissions</h1>
      <p className="mt-2 text-slate-400">Track pending and paid commission from your referrals.</p>
      {message && <div className="mt-6 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">{message}</div>}
      <section className="my-8 grid gap-4 md:grid-cols-3">
        <PartnerKpi title="Earned" value={money(stats.earned)} />
        <PartnerKpi title="Due" value={money(stats.due)} />
        <PartnerKpi title="Paid" value={money(stats.paid)} />
      </section>
      <PartnerTable headers={['Month', 'Type', 'Amount', 'Status', 'Notes', 'Created']} rows={rows.map((item) => [item.commission_month || '—', item.commission_type || '—', money(item.amount), item.status || 'pending', item.notes || '—', shortDate(item.created_at)])} />
    </PartnerShell>
  )
}
