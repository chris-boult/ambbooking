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
  const [copyMessage, setCopyMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setMessage('')

    const result = await getCurrentPartner()

    if (!result.partner) {
      window.location.href = '/partner/login'
      return
    }

    setPartner(result.partner)

    const [referralResult, commissionResult, payoutResult] = await Promise.all([
      supabase
        .from('partner_referrals')
        .select('*, businesses(business_name,email,status,plan,monthly_amount)')
        .eq('partner_id', result.partner.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('partner_commissions')
        .select('*')
        .eq('partner_id', result.partner.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('partner_payouts')
        .select('*')
        .eq('partner_id', result.partner.id)
        .order('created_at', { ascending: false }),
    ])

    if (referralResult.error || commissionResult.error || payoutResult.error) {
      setMessage(
        referralResult.error?.message ||
          commissionResult.error?.message ||
          payoutResult.error?.message ||
          'Could not load dashboard.'
      )
    }

    setReferrals(referralResult.data || [])
    setCommissions(commissionResult.data || [])
    setPayouts(payoutResult.data || [])
    setLoading(false)
  }

  const stats = useMemo(() => {
    const activeCustomers = referrals.filter(
      (item) => item.status === 'active' || item.businesses?.status === 'active'
    ).length

    const mrr = referrals.reduce(
      (sum, item) =>
        sum +
        Number(
          item.monthly_recurring_revenue ||
            item.subscription_value ||
            item.businesses?.monthly_amount ||
            0
        ),
      0
    )

    const earned = commissions.reduce((sum, item) => sum + Number(item.amount || 0), 0)

    const due = commissions
      .filter((item) => item.status === 'pending')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)

    const paid = payouts
      .filter((item) => item.status === 'paid')
      .reduce((sum, item) => sum + Number(item.payout_amount || 0), 0)

    const pendingPayouts = payouts
      .filter((item) => item.status === 'pending')
      .reduce((sum, item) => sum + Number(item.payout_amount || 0), 0)

    return { activeCustomers, mrr, earned, due, paid, pendingPayouts }
  }, [referrals, commissions, payouts])

  const referralCode = partner?.referral_code || ''

  const referralBaseUrl =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || ''

  const referralLink = partner && referralCode ? `${referralBaseUrl}/signup?ref=${referralCode}` : ''

  async function copyReferralLink() {
    if (!referralLink) return

    try {
      await navigator.clipboard.writeText(referralLink)
      setCopyMessage('Referral link copied.')
      setTimeout(() => setCopyMessage(''), 2500)
    } catch {
      setCopyMessage('Could not copy link. Please copy it manually.')
    }
  }

  return (
    <PartnerShell>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
            Partner dashboard
          </p>
          <h1 className="mt-2 text-4xl font-bold">
            Welcome{partner?.company_name ? `, ${partner.company_name}` : ''}
          </h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Track referrals, generated MRR, commission due, commission paid and your live referral link.
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-6 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">
          {message}
        </div>
      )}

      {copyMessage && (
        <div className="mb-6 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">
          {copyMessage}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-slate-400">
          Loading dashboard...
        </div>
      )}

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

          <section className="mb-8 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                    Your referral link
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Share this with new businesses</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Any business that signs up through this link can be attributed to your partner account once the signup attribution engine is connected.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Referral code</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-cyan-200">
                    {referralCode || 'Not set'}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 lg:flex-row">
                <input
                  readOnly
                  value={referralLink || 'Referral code missing'}
                  className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm text-cyan-100 outline-none"
                />
                <button
                  onClick={copyReferralLink}
                  disabled={!referralLink}
                  className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Copy link
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                Payout snapshot
              </p>
              <div className="mt-5 space-y-4">
                <DashboardStat label="Commission due" value={money(stats.due)} />
                <DashboardStat label="Pending payouts" value={money(stats.pendingPayouts)} />
                <DashboardStat label="Commission paid" value={money(stats.paid)} />
              </div>
            </div>
          </section>

          <section className="mb-8 grid gap-4 lg:grid-cols-3">
            <MiniCard title="Signup URL" value="/signup?ref=" highlight={referralCode || 'Not set'} />
            <MiniCard title="Short URL" value="/r/" highlight={referralCode || 'Not set'} />
            <MiniCard title="Attribution status" value="Ready for" highlight="Pack 4B" />
          </section>

          <section>
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-bold">Recent referrals</h2>
                <p className="mt-1 text-sm text-slate-400">
                  The latest businesses connected to your partner account.
                </p>
              </div>
            </div>

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

function DashboardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-lg font-bold text-white">{value}</span>
    </div>
  )
}

function MiniCard({ title, value, highlight }: { title: string; value: string; highlight: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-3 break-all font-mono text-sm text-slate-300">
        {value}
        <span className="text-cyan-200">{highlight}</span>
      </p>
    </div>
  )
}
