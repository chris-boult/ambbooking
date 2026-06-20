'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Partner = {
  id: string
  email: string | null
  full_name: string | null
  company_name: string | null
  referral_code: string | null
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

type PartnerSettings = {
  id: string
  default_commission_type: string | null
  default_commission_value: number | null
  default_fixed_bounty: number | null
  minimum_payout: number | null
  auto_payouts: boolean | null
  created_at: string | null
}

type PartnerReferral = {
  id: string
  partner_id: string | null
  business_id: string | null
  referral_code: string | null
  referral_source: string | null
  referral_url: string | null
  subscription_value: number | null
  monthly_recurring_revenue: number | null
  status: string | null
  signup_date: string | null
  created_at: string | null
  businesses?: {
    business_name?: string | null
    email?: string | null
    status?: string | null
    plan?: string | null
    monthly_amount?: number | null
  } | null
}

type PartnerCommission = {
  id: string
  partner_id: string | null
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
  partner_id: string | null
  payout_amount: number | null
  payout_date: string | null
  notes: string | null
  status: string | null
  created_at: string | null
}

type PartnerNote = {
  id: string
  partner_id: string | null
  note: string | null
  created_by: string | null
  created_at: string | null
}

function money(value: number | string | null | undefined) {
  return `£${Number(value || 0).toFixed(2)}`
}

function shortDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function monthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function partnerDisplayName(partner: Partner) {
  return partner.company_name || partner.full_name || partner.email || 'Unnamed partner'
}

function slugifyCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function statusClass(status?: string | null) {
  if (status === 'active' || status === 'paid') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
  if (status === 'pending' || status === 'approved') return 'border-amber-500/20 bg-amber-500/10 text-amber-300'
  if (status === 'inactive' || status === 'cancelled' || status === 'rejected') return 'border-red-500/20 bg-red-500/10 text-red-300'
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300'
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [settings, setSettings] = useState<PartnerSettings | null>(null)
  const [referrals, setReferrals] = useState<PartnerReferral[]>([])
  const [commissions, setCommissions] = useState<PartnerCommission[]>([])
  const [payouts, setPayouts] = useState<PartnerPayout[]>([])
  const [notes, setNotes] = useState<PartnerNote[]>([])

  const [selectedPartnerId, setSelectedPartnerId] = useState('all')
  const [activeTab, setActiveTab] = useState<'partners' | 'referrals' | 'commissions' | 'payouts' | 'settings'>('partners')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [companyName, setCompanyName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [commissionType, setCommissionType] = useState('percentage')
  const [commissionValue, setCommissionValue] = useState('20')
  const [fixedBounty, setFixedBounty] = useState('250')
  const [lifetimeCommission, setLifetimeCommission] = useState(true)

  const [manualPartnerId, setManualPartnerId] = useState('')
  const [manualReferralId, setManualReferralId] = useState('')
  const [manualBusinessId, setManualBusinessId] = useState('')
  const [manualCommissionType, setManualCommissionType] = useState('fixed_bounty')
  const [manualCommissionAmount, setManualCommissionAmount] = useState('')
  const [manualCommissionNotes, setManualCommissionNotes] = useState('')

  const [payoutPartnerId, setPayoutPartnerId] = useState('')
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutNotes, setPayoutNotes] = useState('')

  const [notePartnerId, setNotePartnerId] = useState('')
  const [noteText, setNoteText] = useState('')

  const [defaultCommissionType, setDefaultCommissionType] = useState('percentage')
  const [defaultCommissionValue, setDefaultCommissionValue] = useState('20')
  const [defaultFixedBounty, setDefaultFixedBounty] = useState('250')
  const [minimumPayout, setMinimumPayout] = useState('50')
  const [autoPayouts, setAutoPayouts] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setMessage('')

    const [partnersResult, settingsResult, referralsResult, commissionsResult, payoutsResult, notesResult] =
      await Promise.all([
        supabase.from('partners').select('*').order('created_at', { ascending: false }),
        supabase.from('partner_settings').select('*').limit(1).maybeSingle(),
        supabase
          .from('partner_referrals')
          .select('*, businesses(business_name,email,status,plan,monthly_amount)')
          .order('created_at', { ascending: false }),
        supabase.from('partner_commissions').select('*').order('created_at', { ascending: false }),
        supabase.from('partner_payouts').select('*').order('created_at', { ascending: false }),
        supabase.from('partner_notes').select('*').order('created_at', { ascending: false }),
      ])

    if (
      partnersResult.error ||
      settingsResult.error ||
      referralsResult.error ||
      commissionsResult.error ||
      payoutsResult.error ||
      notesResult.error
    ) {
      setMessage(
        partnersResult.error?.message ||
          settingsResult.error?.message ||
          referralsResult.error?.message ||
          commissionsResult.error?.message ||
          payoutsResult.error?.message ||
          notesResult.error?.message ||
          'Could not load partner centre.'
      )
      setLoading(false)
      return
    }

    const loadedSettings = settingsResult.data as PartnerSettings | null

    setPartners((partnersResult.data as Partner[]) || [])
    setSettings(loadedSettings)
    setReferrals((referralsResult.data as PartnerReferral[]) || [])
    setCommissions((commissionsResult.data as PartnerCommission[]) || [])
    setPayouts((payoutsResult.data as PartnerPayout[]) || [])
    setNotes((notesResult.data as PartnerNote[]) || [])

    if (loadedSettings) {
      setDefaultCommissionType(loadedSettings.default_commission_type || 'percentage')
      setDefaultCommissionValue(String(loadedSettings.default_commission_value ?? 20))
      setDefaultFixedBounty(String(loadedSettings.default_fixed_bounty ?? 250))
      setMinimumPayout(String(loadedSettings.minimum_payout ?? 50))
      setAutoPayouts(Boolean(loadedSettings.auto_payouts))
    }

    setLoading(false)
  }

  async function createPartner() {
    setMessage('')

    if (!companyName.trim() && !fullName.trim()) {
      setMessage('Add a company name or contact name.')
      return
    }

    if (!email.trim()) {
      setMessage('Add an email address.')
      return
    }

    setSaving(true)

    const generatedCode =
      slugifyCode(referralCode || companyName || fullName || email.split('@')[0]) ||
      `PARTNER-${Math.floor(Math.random() * 9999)}`

    const { error } = await supabase.from('partners').insert({
      company_name: companyName.trim() || null,
      full_name: fullName.trim() || null,
      email: email.trim().toLowerCase(),
      referral_code: generatedCode,
      commission_type: commissionType,
      commission_value: Number(commissionValue || 0),
      fixed_bounty: Number(fixedBounty || 0),
      lifetime_commission: lifetimeCommission,
      status: 'active',
      total_referrals: 0,
      total_active_businesses: 0,
      total_mrr: 0,
      total_commission_earned: 0,
      total_commission_paid: 0,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setCompanyName('')
    setFullName('')
    setEmail('')
    setReferralCode('')
    setCommissionType(defaultCommissionType || 'percentage')
    setCommissionValue(defaultCommissionValue || '20')
    setFixedBounty(defaultFixedBounty || '250')
    setLifetimeCommission(true)
    setMessage('Reseller created.')
    setSaving(false)
    await load()
  }

  async function updatePartner(partnerId: string, patch: Partial<Partner>) {
    setMessage('')

    const { error } = await supabase
      .from('partners')
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', partnerId)

    if (error) {
      setMessage(error.message)
      return
    }

    setPartners((current) =>
      current.map((partner) => (partner.id === partnerId ? { ...partner, ...patch } : partner))
    )

    setMessage('Partner updated.')
  }

  async function saveSettings() {
    setMessage('')
    setSaving(true)

    const payload = {
      default_commission_type: defaultCommissionType,
      default_commission_value: Number(defaultCommissionValue || 0),
      default_fixed_bounty: Number(defaultFixedBounty || 0),
      minimum_payout: Number(minimumPayout || 0),
      auto_payouts: autoPayouts,
    }

    const { error } = settings?.id
      ? await supabase.from('partner_settings').update(payload).eq('id', settings.id)
      : await supabase.from('partner_settings').insert(payload)

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setMessage('Partner settings saved.')
    setSaving(false)
    await load()
  }

  async function createManualCommission() {
    setMessage('')

    if (!manualPartnerId || !manualCommissionAmount) {
      setMessage('Choose a partner and enter a commission amount.')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('partner_commissions').insert({
      partner_id: manualPartnerId,
      referral_id: manualReferralId || null,
      business_id: manualBusinessId || null,
      commission_type: manualCommissionType,
      commission_month: monthValue(),
      amount: Number(manualCommissionAmount || 0),
      status: 'pending',
      notes: manualCommissionNotes || null,
    })

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setManualBusinessId('')
    setManualReferralId('')
    setManualCommissionAmount('')
    setManualCommissionNotes('')
    setMessage('Manual commission added.')
    setSaving(false)
    await load()
  }

  async function updateCommissionStatus(commissionId: string, status: string) {
    setMessage('')

    const { error } = await supabase.from('partner_commissions').update({ status }).eq('id', commissionId)

    if (error) {
      setMessage(error.message)
      return
    }

    setCommissions((current) =>
      current.map((commission) =>
        commission.id === commissionId ? { ...commission, status } : commission
      )
    )

    setMessage(`Commission marked as ${status}.`)
  }

  async function createPayout() {
    setMessage('')

    if (!payoutPartnerId || !payoutAmount) {
      setMessage('Choose a partner and enter payout amount.')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('partner_payouts').insert({
      partner_id: payoutPartnerId,
      payout_amount: Number(payoutAmount || 0),
      payout_date: new Date().toISOString(),
      notes: payoutNotes || null,
      status: 'pending',
    })

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setPayoutAmount('')
    setPayoutNotes('')
    setMessage('Payout created.')
    setSaving(false)
    await load()
  }

  async function updatePayoutStatus(payoutId: string, status: string) {
    setMessage('')

    const { error } = await supabase.from('partner_payouts').update({ status }).eq('id', payoutId)

    if (error) {
      setMessage(error.message)
      return
    }

    setPayouts((current) =>
      current.map((payout) => (payout.id === payoutId ? { ...payout, status } : payout))
    )

    setMessage(`Payout marked as ${status}.`)
  }

  async function createNote() {
    setMessage('')

    if (!notePartnerId || !noteText.trim()) {
      setMessage('Choose a partner and enter a note.')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('partner_notes').insert({
      partner_id: notePartnerId,
      note: noteText.trim(),
      created_by: 'Platform admin',
    })

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setNoteText('')
    setMessage('Note added.')
    setSaving(false)
    await load()
  }

  const filteredPartnerIds = useMemo(() => {
    if (selectedPartnerId === 'all') return partners.map((partner) => partner.id)
    return [selectedPartnerId]
  }, [partners, selectedPartnerId])

  const filteredPartners = useMemo(() => {
    if (selectedPartnerId === 'all') return partners
    return partners.filter((partner) => partner.id === selectedPartnerId)
  }, [partners, selectedPartnerId])

  const filteredReferrals = referrals.filter((item) => item.partner_id && filteredPartnerIds.includes(item.partner_id))
  const filteredCommissions = commissions.filter((item) => item.partner_id && filteredPartnerIds.includes(item.partner_id))
  const filteredPayouts = payouts.filter((item) => item.partner_id && filteredPartnerIds.includes(item.partner_id))
  const filteredNotes = notes.filter((item) => item.partner_id && filteredPartnerIds.includes(item.partner_id))

  const stats = useMemo(() => {
    const activePartners = partners.filter((partner) => partner.status !== 'inactive').length
    const activeReferrals = referrals.filter((item) => item.status === 'active' || item.businesses?.status === 'active').length
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
    const due = commissions
      .filter((item) => item.status === 'pending' || item.status === 'approved')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const paid = payouts
      .filter((item) => item.status === 'paid')
      .reduce((sum, item) => sum + Number(item.payout_amount || 0), 0)

    return { activePartners, activeReferrals, mrr, due, paid }
  }, [partners, referrals, commissions, payouts])

  function statsForPartner(partnerId: string) {
    const partnerReferrals = referrals.filter((item) => item.partner_id === partnerId)
    const partnerCommissions = commissions.filter((item) => item.partner_id === partnerId)
    const partnerPayouts = payouts.filter((item) => item.partner_id === partnerId)

    return {
      referrals: partnerReferrals.length,
      activeReferrals: partnerReferrals.filter((item) => item.status === 'active' || item.businesses?.status === 'active').length,
      mrr: partnerReferrals.reduce(
        (sum, item) =>
          sum +
          Number(
            item.monthly_recurring_revenue ||
              item.subscription_value ||
              item.businesses?.monthly_amount ||
              0
          ),
        0
      ),
      due: partnerCommissions
        .filter((item) => item.status === 'pending' || item.status === 'approved')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      paid: partnerPayouts
        .filter((item) => item.status === 'paid')
        .reduce((sum, item) => sum + Number(item.payout_amount || 0), 0),
    }
  }

  return (
    <div className="space-y-8 text-white">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">Platform admin</p>
          <h1 className="text-4xl font-black">Partner Centre</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Full reseller control: fixed bounties, recurring commission, lifetime deals, payout settings and manual adjustments.
          </p>
        </div>

        <button type="button" onClick={load} className="rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950 hover:bg-cyan-300">
          Refresh
        </button>
      </div>

      {message && <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">{message}</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Kpi title="Partners" value={String(partners.length)} />
        <Kpi title="Active partners" value={String(stats.activePartners)} />
        <Kpi title="Active referrals" value={String(stats.activeReferrals)} />
        <Kpi title="MRR generated" value={money(stats.mrr)} />
        <Kpi title="Commission due" value={money(stats.due)} />
        <Kpi title="Paid out" value={money(stats.paid)} />
      </section>

      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            ['partners', 'Partners'],
            ['referrals', 'Referrals'],
            ['commissions', 'Commissions'],
            ['payouts', 'Payouts'],
            ['settings', 'Settings'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`rounded-2xl px-4 py-3 text-sm font-black ${
                activeTab === key ? 'bg-white text-slate-950' : 'border border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={selectedPartnerId}
          onChange={(event) => setSelectedPartnerId(event.target.value)}
          className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
        >
          <option value="all">All partners</option>
          {partners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {partnerDisplayName(partner)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-slate-400">Loading partner centre...</div>
      ) : (
        <>
          {activeTab === 'partners' && (
            <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-2xl font-black">Create reseller</h2>
                <p className="mt-2 text-slate-400">Set both recurring commission and a fixed signup bounty at partner level.</p>

                <div className="mt-6 space-y-4">
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Contact full name" className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                  <input value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} placeholder="Referral code" className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />

                  <div className="grid gap-4 md:grid-cols-3">
                    <select value={commissionType} onChange={(e) => setCommissionType(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed recurring</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="fixed_bounty">Fixed bounty only</option>
                    </select>
                    <input value={commissionValue} onChange={(e) => setCommissionValue(e.target.value)} type="number" placeholder="Commission" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                    <input value={fixedBounty} onChange={(e) => setFixedBounty(e.target.value)} type="number" placeholder="Fixed bounty" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                  </div>

                  <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950 px-4 py-4">
                    <span>
                      <span className="block font-black">Lifetime commission</span>
                      <span className="text-sm text-slate-400">Keep paying while referred customer stays active.</span>
                    </span>
                    <input type="checkbox" checked={lifetimeCommission} onChange={(e) => setLifetimeCommission(e.target.checked)} className="h-5 w-5" />
                  </label>

                  <button type="button" onClick={createPartner} disabled={saving} className="w-full rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Create reseller'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {filteredPartners.map((partner) => {
                  const pStats = statsForPartner(partner.id)

                  return (
                    <div key={partner.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <p className="text-xl font-black">{partnerDisplayName(partner)}</p>
                          <p className="mt-1 text-sm text-slate-400">{partner.email || 'No email'}</p>
                          <p className="mt-2 font-mono text-sm text-cyan-300">{partner.referral_code || 'No referral code'}</p>
                          <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(partner.status)}`}>
                            {partner.status || 'active'}
                          </span>
                        </div>

                        <div className="grid gap-2 md:grid-cols-3 xl:min-w-[420px]">
                          <MiniStat label="Refs" value={String(pStats.referrals)} />
                          <MiniStat label="MRR" value={money(pStats.mrr)} />
                          <MiniStat label="Due" value={money(pStats.due)} />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 xl:grid-cols-5">
                        <select defaultValue={partner.commission_type || 'percentage'} onChange={(e) => updatePartner(partner.id, { commission_type: e.target.value })} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none">
                          <option value="percentage">Percentage</option>
                          <option value="fixed">Fixed recurring</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="fixed_bounty">Fixed bounty only</option>
                        </select>

                        <input type="number" defaultValue={Number(partner.commission_value || 0)} onBlur={(e) => updatePartner(partner.id, { commission_value: Number(e.target.value || 0) })} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none" />
                        <input type="number" defaultValue={Number(partner.fixed_bounty || 0)} onBlur={(e) => updatePartner(partner.id, { fixed_bounty: Number(e.target.value || 0) })} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none" />

                        <button type="button" onClick={() => updatePartner(partner.id, { lifetime_commission: !partner.lifetime_commission })} className={`rounded-2xl border px-4 py-3 font-black ${partner.lifetime_commission ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-white/10 text-slate-300 hover:bg-white/10'}`}>
                          {partner.lifetime_commission ? 'Lifetime on' : 'Lifetime off'}
                        </button>

                        <button type="button" onClick={() => updatePartner(partner.id, { status: partner.status === 'inactive' ? 'active' : 'inactive' })} className="rounded-2xl border border-white/10 px-4 py-3 font-black text-white hover:bg-white/10">
                          {partner.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
                        </button>
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
                        <input
                          value={notePartnerId === partner.id ? noteText : ''}
                          onFocus={() => setNotePartnerId(partner.id)}
                          onChange={(e) => {
                            setNotePartnerId(partner.id)
                            setNoteText(e.target.value)
                          }}
                          placeholder="Add internal note"
                          className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
                        />

                        <button type="button" onClick={createNote} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 font-black text-cyan-100 hover:bg-cyan-300/20">
                          Add note
                        </button>
                      </div>
                    </div>
                  )
                })}

                {filteredPartners.length === 0 && <EmptyState message="No partners found." />}
              </div>
            </section>
          )}

          {activeTab === 'referrals' && (
            <DataTable
              headers={['Business', 'Partner', 'Code', 'Plan', 'MRR', 'Status', 'Signup']}
              rows={filteredReferrals.map((referral) => {
                const partner = partners.find((item) => item.id === referral.partner_id)
                return [
                  referral.businesses?.business_name || referral.businesses?.email || 'Unknown business',
                  partner ? partnerDisplayName(partner) : 'Unknown',
                  referral.referral_code || '—',
                  referral.businesses?.plan || '—',
                  money(referral.monthly_recurring_revenue || referral.subscription_value || referral.businesses?.monthly_amount),
                  referral.status || referral.businesses?.status || 'active',
                  shortDate(referral.signup_date || referral.created_at),
                ]
              })}
            />
          )}

          {activeTab === 'commissions' && (
            <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-2xl font-black">Manual commission</h2>
                <p className="mt-2 text-slate-400">Add fixed bounty, recurring commission or adjustment manually.</p>

                <div className="mt-6 space-y-4">
                  <select value={manualPartnerId} onChange={(e) => setManualPartnerId(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                    <option value="">Choose partner</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partnerDisplayName(partner)}
                      </option>
                    ))}
                  </select>

                  <select value={manualReferralId} onChange={(e) => {
                    setManualReferralId(e.target.value)
                    const referral = referrals.find((item) => item.id === e.target.value)
                    setManualBusinessId(referral?.business_id || '')
                    setManualPartnerId(referral?.partner_id || manualPartnerId)
                  }} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                    <option value="">Optional linked referral</option>
                    {referrals.map((referral) => {
                      const partner = partners.find((item) => item.id === referral.partner_id)
                      return (
                        <option key={referral.id} value={referral.id}>
                          {partner ? partnerDisplayName(partner) : 'Unknown'} · {referral.businesses?.business_name || referral.businesses?.email || referral.id}
                        </option>
                      )
                    })}
                  </select>

                  <select value={manualCommissionType} onChange={(e) => setManualCommissionType(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                    <option value="fixed_bounty">Fixed bounty</option>
                    <option value="recurring_percentage">Recurring percentage</option>
                    <option value="recurring_fixed">Recurring fixed</option>
                    <option value="manual_adjustment">Manual adjustment</option>
                    <option value="bonus">Bonus</option>
                  </select>

                  <input value={manualCommissionAmount} onChange={(e) => setManualCommissionAmount(e.target.value)} type="number" placeholder="Amount" className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                  <textarea value={manualCommissionNotes} onChange={(e) => setManualCommissionNotes(e.target.value)} placeholder="Notes" className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />

                  <button type="button" onClick={createManualCommission} disabled={saving} className="w-full rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
                    Add commission
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredCommissions.map((commission) => {
                  const partner = partners.find((item) => item.id === commission.partner_id)
                  return (
                    <div key={commission.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-lg font-black">{money(commission.amount)}</p>
                          <p className="mt-1 text-sm text-slate-400">{partner ? partnerDisplayName(partner) : 'Unknown partner'} · {commission.commission_type || 'commission'}</p>
                          {commission.notes && <p className="mt-2 text-sm text-slate-500">{commission.notes}</p>}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(commission.status)}`}>{commission.status || 'pending'}</span>
                          {['pending', 'approved', 'paid', 'rejected'].map((status) => (
                            <button key={status} type="button" onClick={() => updateCommissionStatus(commission.id, status)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:bg-white/10">
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {filteredCommissions.length === 0 && <EmptyState message="No commissions found." />}
              </div>
            </section>
          )}

          {activeTab === 'payouts' && (
            <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-2xl font-black">Create payout</h2>
                <div className="mt-6 space-y-4">
                  <select value={payoutPartnerId} onChange={(e) => setPayoutPartnerId(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                    <option value="">Choose partner</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partnerDisplayName(partner)}
                      </option>
                    ))}
                  </select>
                  <input value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} type="number" placeholder="Payout amount" className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                  <textarea value={payoutNotes} onChange={(e) => setPayoutNotes(e.target.value)} placeholder="Payout notes" className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                  <button type="button" onClick={createPayout} disabled={saving} className="w-full rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
                    Create payout
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredPayouts.map((payout) => {
                  const partner = partners.find((item) => item.id === payout.partner_id)
                  return (
                    <div key={payout.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-lg font-black">{money(payout.payout_amount)}</p>
                          <p className="mt-1 text-sm text-slate-400">{partner ? partnerDisplayName(partner) : 'Unknown partner'} · {shortDate(payout.payout_date || payout.created_at)}</p>
                          {payout.notes && <p className="mt-2 text-sm text-slate-500">{payout.notes}</p>}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(payout.status)}`}>{payout.status || 'pending'}</span>
                          {['pending', 'paid', 'cancelled'].map((status) => (
                            <button key={status} type="button" onClick={() => updatePayoutStatus(payout.id, status)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:bg-white/10">
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {filteredPayouts.length === 0 && <EmptyState message="No payouts found." />}
              </div>
            </section>
          )}

          {activeTab === 'settings' && (
            <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-2xl font-black">Default partner settings</h2>
                <p className="mt-2 text-slate-400">These defaults are used when creating new reseller records.</p>
                <div className="mt-6 space-y-4">
                  <select value={defaultCommissionType} onChange={(e) => setDefaultCommissionType(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed recurring</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="fixed_bounty">Fixed bounty only</option>
                  </select>
                  <input value={defaultCommissionValue} onChange={(e) => setDefaultCommissionValue(e.target.value)} type="number" placeholder="Default commission value" className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                  <input value={defaultFixedBounty} onChange={(e) => setDefaultFixedBounty(e.target.value)} type="number" placeholder="Default fixed bounty" className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                  <input value={minimumPayout} onChange={(e) => setMinimumPayout(e.target.value)} type="number" placeholder="Minimum payout" className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />

                  <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950 px-4 py-4">
                    <span>
                      <span className="block font-black">Auto payouts</span>
                      <span className="text-sm text-slate-400">Future automation setting.</span>
                    </span>
                    <input type="checkbox" checked={autoPayouts} onChange={(e) => setAutoPayouts(e.target.checked)} className="h-5 w-5" />
                  </label>

                  <button type="button" onClick={saveSettings} disabled={saving} className="w-full rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
                    Save settings
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-2xl font-black">Recent notes</h2>
                <div className="mt-6 space-y-3">
                  {filteredNotes.slice(0, 12).map((note) => {
                    const partner = partners.find((item) => item.id === note.partner_id)
                    return (
                      <div key={note.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="font-black">{partner ? partnerDisplayName(partner) : 'Unknown partner'}</p>
                        <p className="mt-2 text-sm text-slate-300">{note.note}</p>
                        <p className="mt-2 text-xs text-slate-500">{note.created_by || 'Admin'} · {shortDate(note.created_at)}</p>
                      </div>
                    )
                  })}
                  {filteredNotes.length === 0 && <EmptyState message="No notes found." />}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  )
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="border-b border-white/10 px-4 py-3">{header}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-white/5">
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-4 text-slate-300 first:font-bold first:text-white">{cell}</td>
                ))}
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.04] p-8 text-center text-slate-500">{message}</div>
}
