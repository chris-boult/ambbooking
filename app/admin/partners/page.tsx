'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
type Partner = {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  referral_code: string
  commission_type: string | null
  commission_value: number | null
  fixed_bounty: number | null
  lifetime_commission: boolean | null
  status: string | null
  total_referrals: number | null
  total_active_businesses: number | null
  total_mrr: number | null
  total_commission_earned: number | null
  total_commission_paid: number | null
  created_at: string | null
  updated_at: string | null
}

type PartnerReferral = {
  id: string
  partner_id: string
  business_id: string | null
  referral_code: string | null
  referral_source: string | null
  referral_url: string | null
  subscription_value: number | null
  monthly_recurring_revenue: number | null
  status: string | null
  signup_date: string | null
  created_at: string | null
  businesses?: any
}

type PartnerCommission = {
  id: string
  partner_id: string
  referral_id: string | null
  business_id: string | null
  commission_type: string | null
  commission_month: string | null
  amount: number | null
  status: string | null
  notes: string | null
  created_at: string | null
}

type PartnerPayout = {
  id: string
  partner_id: string
  payout_amount: number | null
  payout_date: string | null
  notes: string | null
  status: string | null
  created_at: string | null
}

type ActiveTab = 'overview' | 'referrals' | 'commissions' | 'payouts'

type PartnerWithStats = Partner & {
  referrals?: number
  active_businesses?: number
  total_mrr?: number
  total_commission?: number
  total_paid?: number
}

const money = (value: number | null | undefined) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(value || 0))

const date = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('en-GB') : '—'

const displayCommission = (partner: { commission_type?: string | null; commission_value?: number | null; fixed_bounty?: number | null }) => {
  if (partner.commission_type === 'fixed') return `${money(partner.fixed_bounty)} bounty`
  if (partner.commission_type === 'hybrid') return `${Number(partner.commission_value || 0)}% + ${money(partner.fixed_bounty)}`
  return `${Number(partner.commission_value || 0)}%`
}

const makeReferralCode = (name: string, email: string) => {
  const base = (name || email.split('@')[0] || 'PARTNER')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8)
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${base}${suffix}`
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<PartnerWithStats[]>([])
  const [selectedPartner, setSelectedPartner] = useState<PartnerWithStats | null>(null)
  const [referrals, setReferrals] = useState<PartnerReferral[]>([])
  const [commissions, setCommissions] = useState<PartnerCommission[]>([])
  const [payouts, setPayouts] = useState<PartnerPayout[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    email: '',
    full_name: '',
    company_name: '',
    referral_code: '',
    commission_type: 'percentage',
    commission_value: '10',
    fixed_bounty: '0',
    lifetime_commission: true,
    status: 'active',
  })

  useEffect(() => {
    loadPartners()
  }, [])

  useEffect(() => {
    if (selectedPartner?.id) {
      loadPartnerDetails(selectedPartner.id)
    }
  }, [selectedPartner?.id])

  const filteredPartners = useMemo(() => {
    const q = search.toLowerCase()
    return partners.filter((partner) => {
      return [partner.email, partner.full_name, partner.company_name, partner.referral_code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    })
  }, [partners, search])

  const totals = useMemo(() => {
    return partners.reduce(
      (acc, partner) => {
        acc.partners += 1
        acc.referrals += Number(partner.referrals || 0)
        acc.activeBusinesses += Number(partner.active_businesses || 0)
        acc.mrr += Number(partner.total_mrr || 0)
        acc.commission += Number(partner.total_commission || 0)
        acc.paid += Number(partner.total_paid || 0)
        return acc
      },
      { partners: 0, referrals: 0, activeBusinesses: 0, mrr: 0, commission: 0, paid: 0 }
    )
  }, [partners])

  async function loadPartners() {
    setLoading(true)
    setMessage('')

    const { data: performanceData, error: performanceError } = await supabase
      .from('partner_performance')
      .select('*')
      .order('company_name', { ascending: true })

    if (performanceError) {
      setMessage(performanceError.message)
      setLoading(false)
      return
    }

    const partnerIds = (performanceData || []).map((item) => item.id)

    const { data: partnerRows, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .in('id', partnerIds.length ? partnerIds : ['00000000-0000-0000-0000-000000000000'])

    if (partnerError) {
      setMessage(partnerError.message)
      setLoading(false)
      return
    }

    const merged = (performanceData || []).map((perf) => {
      const partner = (partnerRows || []).find((row) => row.id === perf.id)
      return { ...partner, ...perf } as PartnerWithStats
    })

    const { data: allPartners } = await supabase.from('partners').select('*').order('created_at', { ascending: false })
    const missing = (allPartners || []).filter((partner) => !merged.some((item) => item.id === partner.id))

    const nextPartners = [...merged, ...missing]
    setPartners(nextPartners)

    setSelectedPartner((current) => {
      if (!current) return nextPartners.length ? nextPartners[0] : null
      return nextPartners.find((partner) => partner.id === current.id) || current
    })

    setLoading(false)
  }

  async function loadPartnerDetails(partnerId: string) {
    const [referralResult, commissionResult, payoutResult] = await Promise.all([
      supabase
        .from('partner_referrals')
        .select('*, businesses(business_name,email,status,monthly_amount,plan)')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('partner_commissions')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('partner_payouts')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false }),
    ])

    setReferrals((referralResult.data || []) as PartnerReferral[])
    setCommissions((commissionResult.data || []) as PartnerCommission[])
    setPayouts((payoutResult.data || []) as PartnerPayout[])
  }

  function resetForm() {
    setForm({
      email: '',
      full_name: '',
      company_name: '',
      referral_code: '',
      commission_type: 'percentage',
      commission_value: '10',
      fixed_bounty: '0',
      lifetime_commission: true,
      status: 'active',
    })
  }

  function openEdit(partner: PartnerWithStats) {
    setSelectedPartner(partner)
    setForm({
      email: partner.email || '',
      full_name: partner.full_name || '',
      company_name: partner.company_name || '',
      referral_code: partner.referral_code || '',
      commission_type: partner.commission_type || 'percentage',
      commission_value: String(partner.commission_value ?? 10),
      fixed_bounty: String(partner.fixed_bounty ?? 0),
      lifetime_commission: Boolean(partner.lifetime_commission),
      status: partner.status || 'active',
    })
    setShowEdit(true)
  }

  async function createPartner() {
    setSaving(true)
    setMessage('')

    const referralCode = form.referral_code || makeReferralCode(form.company_name || form.full_name, form.email)

    const { error } = await supabase.from('partners').insert({
      email: form.email.trim().toLowerCase(),
      full_name: form.full_name.trim(),
      company_name: form.company_name.trim(),
      referral_code: referralCode,
      commission_type: form.commission_type,
      commission_value: Number(form.commission_value || 0),
      fixed_bounty: Number(form.fixed_bounty || 0),
      lifetime_commission: form.lifetime_commission,
      status: form.status,
    })

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setShowCreate(false)
    resetForm()
    await loadPartners()
    setSaving(false)
    setMessage('Partner created successfully.')
  }

  async function updatePartner() {
    if (!selectedPartner) return
    setSaving(true)
    setMessage('')

    const cleanReferralCode = form.referral_code.trim().toUpperCase()

    const updatePayload = {
      email: form.email.trim().toLowerCase(),
      full_name: form.full_name.trim(),
      company_name: form.company_name.trim(),
      referral_code: cleanReferralCode,
      commission_type: form.commission_type,
      commission_value: Number(form.commission_value || 0),
      fixed_bounty: Number(form.fixed_bounty || 0),
      lifetime_commission: Boolean(form.lifetime_commission),
      status: form.status,
      updated_at: new Date().toISOString(),
    }

    const { data: updatedRows, error } = await supabase
      .from('partners')
      .update(updatePayload)
      .eq('id', selectedPartner.id)
      .select('*')

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    const updatedPartner = Array.isArray(updatedRows) ? updatedRows[0] : null

    if (!updatedPartner) {
      setMessage('Nothing was saved. Supabase did not return an updated partner row. This is usually an RLS update/select policy issue for the partners table.')
      setSaving(false)
      return
    }

    const updatedWithStats = {
      ...selectedPartner,
      ...updatedPartner,
    } as PartnerWithStats

    setPartners((current) => current.map((partner) => (partner.id === selectedPartner.id ? { ...partner, ...updatedWithStats } : partner)))
    setSelectedPartner(updatedWithStats)
    setForm({
      email: updatedPartner.email || '',
      full_name: updatedPartner.full_name || '',
      company_name: updatedPartner.company_name || '',
      referral_code: updatedPartner.referral_code || '',
      commission_type: updatedPartner.commission_type || 'percentage',
      commission_value: String(updatedPartner.commission_value ?? 10),
      fixed_bounty: String(updatedPartner.fixed_bounty ?? 0),
      lifetime_commission: Boolean(updatedPartner.lifetime_commission),
      status: updatedPartner.status || 'active',
    })

    setShowEdit(false)
    await loadPartners()
    setSaving(false)
    setMessage('Partner updated successfully.')
  }

  async function toggleStatus(partner: PartnerWithStats) {
    const nextStatus = partner.status === 'suspended' ? 'active' : 'suspended'
    const { error } = await supabase
      .from('partners')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', partner.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadPartners()
    setMessage(`Partner ${nextStatus === 'active' ? 'activated' : 'suspended'}.`)
  }

  async function createPayout() {
    if (!selectedPartner) return
    const pending = commissions
      .filter((commission) => commission.status === 'pending')
      .reduce((sum, commission) => sum + Number(commission.amount || 0), 0)

    if (pending <= 0) {
      setMessage('There are no pending commissions to pay.')
      return
    }

    const { error } = await supabase.from('partner_payouts').insert({
      partner_id: selectedPartner.id,
      payout_amount: pending,
      status: 'pending',
      notes: 'Generated from pending commissions in Admin Partner Centre.',
    })

    if (error) {
      setMessage(error.message)
      return
    }

    await loadPartnerDetails(selectedPartner.id)
    setMessage('Pending payout created.')
  }

  async function markPayoutPaid(payout: PartnerPayout) {
    if (!selectedPartner) return

    const { error: payoutError } = await supabase
      .from('partner_payouts')
      .update({ status: 'paid', payout_date: new Date().toISOString() })
      .eq('id', payout.id)

    if (payoutError) {
      setMessage(payoutError.message)
      return
    }

    await supabase
      .from('partner_commissions')
      .update({ status: 'paid' })
      .eq('partner_id', selectedPartner.id)
      .eq('status', 'pending')

    await loadPartnerDetails(selectedPartner.id)
    await loadPartners()
    setMessage('Payout marked as paid and pending commissions updated.')
  }

  const selectedDue = commissions
    .filter((commission) => commission.status === 'pending')
    .reduce((sum, commission) => sum + Number(commission.amount || 0), 0)

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">AMB Booking</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">Partner Centre</h1>
            <p className="mt-2 max-w-3xl text-slate-400">
              Manage affiliates, referral partners, reseller relationships, commission rules and payout workflows from the master admin centre.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">
              Back to admin
            </Link>
            <button
              onClick={() => {
                resetForm()
                setShowCreate(true)
              }}
              className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
            >
              Create partner
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
            {message}
          </div>
        )}

        <section className="mb-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Kpi title="Partners" value={totals.partners.toString()} />
          <Kpi title="Referrals" value={totals.referrals.toString()} />
          <Kpi title="Active customers" value={totals.activeBusinesses.toString()} />
          <Kpi title="MRR generated" value={money(totals.mrr)} />
          <Kpi title="Commission earned" value={money(totals.commission)} />
          <Kpi title="Commission paid" value={money(totals.paid)} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Partners</h2>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{filteredPartners.length}</span>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search partner, company, email or code"
              className="mb-4 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none ring-cyan-300/40 focus:ring-2"
            />

            <div className="space-y-3">
              {loading && <p className="text-sm text-slate-400">Loading partners...</p>}
              {!loading && filteredPartners.length === 0 && <p className="text-sm text-slate-400">No partners found.</p>}
              {filteredPartners.map((partner) => (
                <button
                  key={partner.id}
                  onClick={() => setSelectedPartner(partner)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedPartner?.id === partner.id
                      ? 'border-cyan-300/60 bg-cyan-300/10'
                      : 'border-white/10 bg-slate-900/60 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{partner.company_name || partner.full_name || partner.email}</p>
                      <p className="mt-1 text-sm text-slate-400">{partner.email}</p>
                    </div>
                    <StatusPill status={partner.status || 'active'} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                    <span className="rounded-full bg-white/10 px-2 py-1">{partner.referral_code}</span>
                    <span className="rounded-full bg-white/10 px-2 py-1">{displayCommission(partner)}</span>
                    <span className="rounded-full bg-white/10 px-2 py-1">{money(partner.total_commission)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            {!selectedPartner ? (
              <div className="py-20 text-center text-slate-400">Select a partner to view details.</div>
            ) : (
              <>
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold">{selectedPartner.company_name || selectedPartner.full_name}</h2>
                      <StatusPill status={selectedPartner.status || 'active'} />
                    </div>
                    <p className="mt-2 text-slate-400">{selectedPartner.email}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Referral link: <span className="font-mono text-cyan-200">/signup?ref={selectedPartner.referral_code}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openEdit(selectedPartner)} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/10">
                      Edit
                    </button>
                    <button onClick={() => toggleStatus(selectedPartner)} className="rounded-xl border border-amber-300/30 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/10">
                      {selectedPartner.status === 'suspended' ? 'Activate' : 'Suspend'}
                    </button>
                    <button onClick={createPayout} className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300">
                      Create payout
                    </button>
                  </div>
                </div>

                <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                  <Kpi title="Referrals" value={String(selectedPartner.referrals || referrals.length || 0)} compact />
                  <Kpi title="Active" value={String(selectedPartner.active_businesses || 0)} compact />
                  <Kpi title="MRR" value={money(selectedPartner.total_mrr)} compact />
                  <Kpi title="Earned" value={money(selectedPartner.total_commission)} compact />
                  <Kpi title="Due" value={money(selectedDue)} compact />
                  <Kpi title="Paid" value={money(selectedPartner.total_paid)} compact />
                </div>

                <div className="mb-5 flex flex-wrap gap-2">
                  {(['overview', 'referrals', 'commissions', 'payouts'] as ActiveTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize ${
                        activeTab === tab ? 'bg-cyan-400 text-slate-950' : 'border border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === 'overview' && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <InfoCard title="Commission setup">
                      <InfoRow label="Type" value={selectedPartner.commission_type || 'percentage'} />
                      <InfoRow label="Commission" value={displayCommission(selectedPartner)} />
                      <InfoRow label="Recurring percentage" value={`${Number(selectedPartner.commission_value || 0)}%`} />
                      <InfoRow label="Fixed bounty" value={money(selectedPartner.fixed_bounty)} />
                      <InfoRow label="Lifetime" value={selectedPartner.lifetime_commission ? 'Yes' : 'No'} />
                    </InfoCard>
                    <InfoCard title="Attribution">
                      <InfoRow label="Referral code" value={selectedPartner.referral_code} />
                      <InfoRow label="Signup URL" value={`/signup?ref=${selectedPartner.referral_code}`} />
                      <InfoRow label="Short URL" value={`/r/${selectedPartner.referral_code}`} />
                      <InfoRow label="Created" value={date(selectedPartner.created_at)} />
                    </InfoCard>
                  </div>
                )}

                {activeTab === 'referrals' && (
                  <DataTable
                    headers={['Business', 'Plan', 'MRR', 'Status', 'Signup']}
                    rows={referrals.map((referral) => [
                      referral.businesses?.business_name || referral.businesses?.email || 'Unknown business',
                      referral.businesses?.plan || '—',
                      money(referral.monthly_recurring_revenue || referral.subscription_value),
                      referral.status || 'active',
                      date(referral.signup_date),
                    ])}
                  />
                )}

                {activeTab === 'commissions' && (
                  <DataTable
                    headers={['Month', 'Type', 'Amount', 'Status', 'Notes']}
                    rows={commissions.map((commission) => [
                      commission.commission_month || date(commission.created_at),
                      commission.commission_type || '—',
                      money(commission.amount),
                      commission.status || 'pending',
                      commission.notes || '—',
                    ])}
                  />
                )}

                {activeTab === 'payouts' && (
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Created</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Paid date</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {payouts.map((payout) => (
                          <tr key={payout.id}>
                            <td className="px-4 py-3">{date(payout.created_at)}</td>
                            <td className="px-4 py-3 font-semibold">{money(payout.payout_amount)}</td>
                            <td className="px-4 py-3">{payout.status}</td>
                            <td className="px-4 py-3">{date(payout.payout_date)}</td>
                            <td className="px-4 py-3">
                              {payout.status !== 'paid' && (
                                <button onClick={() => markPayoutPaid(payout)} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950">
                                  Mark paid
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {payouts.length === 0 && <div className="p-6 text-sm text-slate-400">No payouts yet.</div>}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {(showCreate || showEdit) && (
        <PartnerModal
          title={showCreate ? 'Create partner' : 'Edit partner'}
          form={form}
          setForm={setForm}
          saving={saving}
          onClose={() => {
            setShowCreate(false)
            setShowEdit(false)
          }}
          onSave={showCreate ? createPartner : updatePartner}
        />
      )}
    </main>
  )
}

function Kpi({ title, value, compact = false }: { title: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.04] ${compact ? 'p-4' : 'p-5'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <p className={`${compact ? 'mt-2 text-xl' : 'mt-3 text-2xl'} font-bold text-white`}>{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const isActive = status === 'active'
  const isSuspended = status === 'suspended'
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
        isActive
          ? 'bg-emerald-400/15 text-emerald-200'
          : isSuspended
            ? 'bg-rose-400/15 text-rose-200'
            : 'bg-amber-400/15 text-amber-200'
      }`}
    >
      {status}
    </span>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <h3 className="mb-4 text-lg font-bold">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-100">{value}</span>
    </div>
  )
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((row, index) => (
              <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3">{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <div className="p-6 text-sm text-slate-400">Nothing to show yet.</div>}
    </div>
  )
}

function PartnerModal({
  title,
  form,
  setForm,
  saving,
  onClose,
  onSave,
}: {
  title: string
  form: any
  setForm: (value: any) => void
  saving: boolean
  onClose: () => void
  onSave: () => void
}) {
  const update = (key: string, value: string | boolean) => setForm((current: any) => ({ ...current, [key]: value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/10">Close</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email" value={form.email} onChange={(value) => update('email', value)} />
          <Field label="Full name" value={form.full_name} onChange={(value) => update('full_name', value)} />
          <Field label="Company name" value={form.company_name} onChange={(value) => update('company_name', value)} />
          <Field label="Referral code" value={form.referral_code} onChange={(value) => update('referral_code', value.toUpperCase())} />

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-300">Commission type</span>
            <select
              value={form.commission_type}
              onChange={(event) => update('commission_type', event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none ring-cyan-300/40 focus:ring-2"
            >
              <option value="percentage">Percentage recurring</option>
              <option value="fixed">Fixed bounty</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>

          <Field label="Recurring percentage" value={form.commission_value} onChange={(value) => update('commission_value', value)} type="number" />
          <Field label="Fixed bounty" value={form.fixed_bounty} onChange={(value) => update('fixed_bounty', value)} type="number" />

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-300">Status</span>
            <select
              value={form.status}
              onChange={(event) => update('status', event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none ring-cyan-300/40 focus:ring-2"
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
        </div>

        <label className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={form.lifetime_commission}
            onChange={(event) => update('lifetime_commission', event.target.checked)}
            className="h-4 w-4"
          />
          Lifetime commission enabled
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/10">Cancel</button>
          <button disabled={saving} onClick={onSave} className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save partner'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none ring-cyan-300/40 focus:ring-2"
      />
    </label>
  )
}
