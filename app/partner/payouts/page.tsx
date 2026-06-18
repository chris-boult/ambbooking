'use client'

import { useEffect, useMemo, useState } from 'react'
import PartnerShell from '@/components/partner/PartnerShell'
import PartnerKpi from '@/components/partner/PartnerKpi'
import PartnerTable from '@/components/partner/PartnerTable'
import { getCurrentPartner, money, shortDate, type PartnerProfile } from '@/lib/partnerPortal'
import { supabase } from '@/lib/supabase'

export default function PartnerPayoutsPage() {
  const [partner, setPartner] = useState<PartnerProfile | null>(null)
  const [payouts, setPayouts] = useState<any[]>([])
  const [commissions, setCommissions] = useState<any[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const result = await getCurrentPartner()
    if (!result.partner) { window.location.href = '/partner/login'; return }
    setPartner(result.partner)
    const [payoutResult, commissionResult] = await Promise.all([
      supabase.from('partner_payouts').select('*').eq('partner_id', result.partner.id).order('created_at', { ascending: false }),
      supabase.from('partner_commissions').select('*').eq('partner_id', result.partner.id).order('created_at', { ascending: false }),
    ])
    if (payoutResult.error || commissionResult.error) setMessage(payoutResult.error?.message || commissionResult.error?.message || 'Could not load payouts.')
    setPayouts(payoutResult.data || [])
    setCommissions(commissionResult.data || [])
  }

  const stats = useMemo(() => ({
    due: commissions.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount || 0), 0),
    pendingPayouts: payouts.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.payout_amount || 0), 0),
    paid: payouts.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.payout_amount || 0), 0),
  }), [payouts, commissions])

  async function requestPayout() {
    if (!partner) return
    if (stats.due <= 0) { setMessage('There is no commission due to request.'); return }
    const { error } = await supabase.from('partner_payouts').insert({ partner_id: partner.id, payout_amount: stats.due, status: 'pending', notes: 'Requested by partner portal.' })
    if (error) { setMessage(error.message); return }
    setMessage('Payout request created.')
    await load()
  }

  return (
    <PartnerShell>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold">Payouts</h1>
          <p className="mt-2 text-slate-400">View payout status and request payment for due commission.</p>
        </div>
        <button onClick={requestPayout} className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300">Request payout</button>
      </div>
      {message && <div className="mt-6 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">{message}</div>}
      <section className="my-8 grid gap-4 md:grid-cols-3">
        <PartnerKpi title="Commission due" value={money(stats.due)} />
        <PartnerKpi title="Pending payouts" value={money(stats.pendingPayouts)} />
        <PartnerKpi title="Paid" value={money(stats.paid)} />
      </section>
      <PartnerTable headers={['Created', 'Amount', 'Status', 'Paid date', 'Notes']} rows={payouts.map((item) => [shortDate(item.created_at), money(item.payout_amount), item.status || 'pending', shortDate(item.payout_date), item.notes || '—'])} />
    </PartnerShell>
  )
}
