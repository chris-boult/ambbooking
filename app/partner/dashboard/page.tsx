'use client'

import { useEffect, useMemo, useState } from 'react'
import PartnerShell from '@/components/partner/PartnerShell'
import PartnerKpi from '@/components/partner/PartnerKpi'
import PartnerTable from '@/components/partner/PartnerTable'
import { getCurrentPartner, money, shortDate, type PartnerProfile } from '@/lib/partnerPortal'
import { supabase } from '@/lib/supabase'

export default function PartnerDashboardPage() {
  const [partner, setPartner] = useState<PartnerProfile | null>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [commissions, setCommissions] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const result = await getCurrentPartner()
    if (!result.partner) {
      window.location.href = '/partner/login'
      return
    }

    setPartner(result.partner)

    const [referralResult, commissionResult, payoutResult] = await Promise.all([
      supabase.from('partner_referrals').select('*, businesses(business_name,email,status,plan,monthly_amount)').eq('partner_id', result.partner.id).order('created_at', { ascending: false }),
      supabase.from('partner_commissions').select('*').eq('partner_id', result.partner.id).order('created_at', { ascending: false }),
      supabase.from('partner_payouts').select('*').eq('partner_id', result.partner.id).order('created_at', { ascending: false }),
    ])

    if (referralResult.error || commissionResult.error || payoutResult.error) {
      setMessage(referralResult.error?.message || commissionResult.error?.message || payoutResult.error?.message || 'Could not load dashboard.')
    }

    setReferrals(referralResult.data || [])
    setCommissions(commissionResult.data || [])
    setPayouts(payoutResult.data || [])
    setLoading(false)
  }

  const stats = useMemo(() => {
    const activeCustomers = referrals.filter((item) => item.status === 'active' || item.businesses?.status === 'active').length
    const mrr = referrals.reduce((sum, item) => sum + Number(item.monthly_recurring_revenue || item.subscription_value || item.businesses?.monthly_amount || 0), 0)
    const earned = commissions.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const due = commissions.filter((item) => item.status === 'pending').reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const paid = payouts.filter((item) => item.status === 'paid').reduce((sum, item) => sum + Number(item.payout_amount || 0), 0)
    return { activeCustomers, mrr, earned, due, paid }
  }, [referrals, commissions, payouts])

  const referralLink = partner ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${partner.referral_code}` : ''

  return (
    <PartnerShell>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">Partner dashboard</p>
          <h1 className="mt-2 text-4xl font-bold">Welcome{partner?.company_name ? `, ${partner.company_name}` : ''}</h1>
          <p className="mt-2 max-w-3xl text-slate-400">Track referrals, generated MRR, commission due, commission paid and your live referral link.</p>
        </div>
      </div>

      {message && <div className="mb-6 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">{message}</div>}
      {loading && <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-slate-400">Loading dashboard...</div>}

      {!loading && partner && (
        <>
          <section className="mb-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <PartnerKpi title="Referrals" value={String(referrals.length)} />
            <PartnerKpi title="Active customers" value={String(stats.activeCustomers)} />
            <PartnerKpi title="MRR generated" value={money(stats.mrr)} />
            <PartnerKpi title="Commission earned" value={money(stats.earned)} />
            <PartnerKpi title="Commission due" value={money(stats.due)} />
            <PartnerKpi title="Commission paid" value={money(stats.paid)} />
          </section>

          <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-bold">Your referral link</h2>
            <div className="mt-4 flex flex-col gap-3 lg:flex-row">
              <input readOnly value={referralLink} className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-cyan-100" />
              <button onClick={() => navigator.clipboard.writeText(referralLink)} className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300">Copy link</button>
            </div>
            <p className="mt-3 text-sm text-slate-400">Referral code: <span className="font-mono text-cyan-200">{partner.referral_code}</span></p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold">Recent referrals</h2>
            <PartnerTable
              headers={['Business', 'Plan', 'MRR', 'Status', 'Signup']}
              rows={referrals.slice(0, 8).map((item) => [
                item.businesses?.business_name || item.businesses?.email || 'Unknown business',
                item.businesses?.plan || '—',
                money(item.monthly_recurring_revenue || item.subscription_value || item.businesses?.monthly_amount),
                item.status || item.businesses?.status || 'active',
                shortDate(item.signup_date || item.created_at),
              ])}
            />
          </section>
        </>
      )}
    </PartnerShell>
  )
}
