'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  Copy,
  Download,
  Gift,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Ticket,
  Wallet,
  XCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import DashboardPage from '@/components/dashboard/DashboardPage'
import DashboardHero from '@/components/dashboard/DashboardHero'
import DashboardGrid from '@/components/dashboard/DashboardGrid'
import StatCard from '@/components/dashboard/StatCard'
import SectionCard from '@/components/dashboard/SectionCard'

const GIFT_VOUCHERS_FEATURE_KEY = 'gift_vouchers'
const GIFT_VOUCHER_MANUAL_FEATURE_KEY = 'gift_voucher_manual_creation'
const GIFT_VOUCHER_REDEMPTION_FEATURE_KEY = 'gift_voucher_redemption'
const GIFT_VOUCHER_EXPORT_FEATURE_KEY = 'gift_voucher_export'

type GiftVoucher = {
  id: string
  business_id: string
  code: string
  amount: number
  remaining_amount: number
  recipient_name: string | null
  recipient_email: string | null
  purchaser_name: string | null
  purchaser_email: string | null
  expiry_date: string | null
  status: string | null
  created_at?: string | null
}

type Business = {
  id: string
  plan?: string | null
  status?: string | null
  lifetime_access?: boolean | null
}

type BusinessFeature = {
  id?: string
  business_id?: string
  feature_key?: string | null
  feature?: string | null
  key?: string | null
  enabled?: boolean | null
  is_enabled?: boolean | null
  active?: boolean | null
  status?: string | null
}

type FeatureState = {
  giftVouchers: boolean
  manualCreation: boolean
  redemption: boolean
  exportCsv: boolean
}

type FilterKey = 'all' | 'active' | 'redeemed' | 'expired' | 'cancelled'

const defaultFeatureState: FeatureState = {
  giftVouchers: false,
  manualCreation: false,
  redemption: false,
  exportCsv: false,
}

const planFeatures: Record<string, FeatureState> = {
  starter: defaultFeatureState,
  growth: { giftVouchers: true, manualCreation: true, redemption: true, exportCsv: false },
  pro: { giftVouchers: true, manualCreation: true, redemption: true, exportCsv: true },
  agency: { giftVouchers: true, manualCreation: true, redemption: true, exportCsv: true },
  enterprise: { giftVouchers: true, manualCreation: true, redemption: true, exportCsv: true },
}

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'redeemed', label: 'Redeemed' },
  { key: 'expired', label: 'Expired' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default function GiftVouchersDashboardPage() {
  const [businessId, setBusinessId] = useState('')
  const [business, setBusiness] = useState<Business | null>(null)
  const [features, setFeatures] = useState<FeatureState>(defaultFeatureState)
  const [vouchers, setVouchers] = useState<GiftVoucher[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [manualAmount, setManualAmount] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [purchaserName, setPurchaserName] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadFeatureState(foundBusinessId: string, loadedBusiness?: Business | null) {
    const plan = String(loadedBusiness?.plan || business?.plan || 'starter').toLowerCase()
    const baseFeatures = loadedBusiness?.lifetime_access
      ? planFeatures.enterprise
      : planFeatures[plan] || defaultFeatureState

    const nextFeatures: FeatureState = { ...baseFeatures }

    const { data } = await supabase
      .from('business_features')
      .select('*')
      .eq('business_id', foundBusinessId)

    ;((data || []) as BusinessFeature[]).forEach((row) => {
      const key = row.feature_key || row.feature || row.key || ''
      const enabled =
        row.enabled === true ||
        row.is_enabled === true ||
        row.active === true ||
        row.status === 'active' ||
        row.status === 'enabled'
      const disabled =
        row.enabled === false ||
        row.is_enabled === false ||
        row.active === false ||
        row.status === 'disabled' ||
        row.status === 'inactive'

      if (key === GIFT_VOUCHERS_FEATURE_KEY) nextFeatures.giftVouchers = enabled || (!disabled && nextFeatures.giftVouchers)
      if (key === GIFT_VOUCHER_MANUAL_FEATURE_KEY) nextFeatures.manualCreation = enabled || (!disabled && nextFeatures.manualCreation)
      if (key === GIFT_VOUCHER_REDEMPTION_FEATURE_KEY) nextFeatures.redemption = enabled || (!disabled && nextFeatures.redemption)
      if (key === GIFT_VOUCHER_EXPORT_FEATURE_KEY) nextFeatures.exportCsv = enabled || (!disabled && nextFeatures.exportCsv)
    })

    setFeatures(nextFeatures)
    return nextFeatures
  }

  async function loadData() {
    setLoading(true)
    setError('')
    setSuccess('')

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('You need to be logged in.')
      setLoading(false)
      return
    }

    let loadedBusiness: Business | null = null

    const { data: ownedBusiness } = await supabase
      .from('businesses')
      .select('id, plan, status, lifetime_access')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (ownedBusiness) {
      loadedBusiness = ownedBusiness as Business
    } else {
      const { data: userBusiness } = await supabase
        .from('businesses')
        .select('id, plan, status, lifetime_access')
        .eq('user_id', user.id)
        .maybeSingle()

      if (userBusiness) {
        loadedBusiness = userBusiness as Business
      } else {
        const { data: firstBusiness } = await supabase
          .from('businesses')
          .select('id, plan, status, lifetime_access')
          .limit(1)
          .maybeSingle()

        if (firstBusiness) loadedBusiness = firstBusiness as Business
      }
    }

    if (!loadedBusiness) {
      setError('No business found.')
      setLoading(false)
      return
    }

    setBusiness(loadedBusiness)
    setBusinessId(loadedBusiness.id)
    await loadFeatureState(loadedBusiness.id, loadedBusiness)

    const { data, error: vouchersError } = await supabase
      .from('gift_vouchers')
      .select('*')
      .eq('business_id', loadedBusiness.id)
      .order('created_at', { ascending: false })

    if (vouchersError) setError(vouchersError.message)
    else setVouchers((data as GiftVoucher[]) || [])

    setLoading(false)
  }

  function generateCode() {
    return `GV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  }

  function requireFeature(enabled: boolean, featureName: string) {
    if (enabled) return true
    setError(`${featureName} is not included on this plan. Upgrade the business plan to unlock it.`)
    return false
  }

  async function createManualVoucher(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!requireFeature(features.manualCreation, 'Manual gift voucher creation')) return

    const amount = Number(manualAmount)

    if (!businessId) {
      setError('No business selected.')
      return
    }

    if (!amount || amount < 1) {
      setError('Enter a valid voucher amount.')
      return
    }

    if (!recipientName || !recipientEmail) {
      setError('Recipient name and email are required.')
      return
    }

    setSaving(true)

    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)

    const { error } = await supabase.from('gift_vouchers').insert({
      business_id: businessId,
      code: generateCode(),
      amount,
      remaining_amount: amount,
      recipient_name: recipientName.trim(),
      recipient_email: recipientEmail.trim().toLowerCase(),
      purchaser_name: purchaserName.trim() || 'Manual voucher',
      purchaser_email: null,
      expiry_date: expiryDate.toISOString().split('T')[0],
      status: 'active',
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Gift voucher created.')
      setManualAmount('')
      setRecipientName('')
      setRecipientEmail('')
      setPurchaserName('')
      setShowCreateForm(false)
      await loadData()
    }

    setSaving(false)
  }

  async function markRedeemed(voucher: GiftVoucher) {
    setError('')
    setSuccess('')
    if (!requireFeature(features.redemption, 'Gift voucher redemption')) return

    const { error } = await supabase
      .from('gift_vouchers')
      .update({ remaining_amount: 0, status: 'redeemed' })
      .eq('id', voucher.id)
      .eq('business_id', businessId)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(`${voucher.code} marked as redeemed.`)
    await loadData()
  }

  async function cancelVoucher(voucher: GiftVoucher) {
    setError('')
    setSuccess('')
    if (!requireFeature(features.redemption, 'Gift voucher management')) return

    const { error } = await supabase
      .from('gift_vouchers')
      .update({ status: 'cancelled' })
      .eq('id', voucher.id)
      .eq('business_id', businessId)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(`${voucher.code} cancelled.`)
    await loadData()
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code)
    setSuccess(`Copied ${code}`)
  }

  function exportCsv() {
    setError('')
    setSuccess('')
    if (!requireFeature(features.exportCsv, 'Gift voucher CSV export')) return

    const headers = ['Code', 'Recipient Name', 'Recipient Email', 'Purchaser Name', 'Purchaser Email', 'Original Amount', 'Remaining Amount', 'Expiry Date', 'Status', 'Created At']
    const rows = filteredVouchers.map((voucher) => [voucher.code, voucher.recipient_name || '', voucher.recipient_email || '', voucher.purchaser_name || '', voucher.purchaser_email || '', Number(voucher.amount || 0).toFixed(2), Number(voucher.remaining_amount || 0).toFixed(2), voucher.expiry_date || '', voucher.status || 'active', voucher.created_at || ''])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gift-vouchers-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const filteredVouchers = useMemo(() => {
    const q = search.toLowerCase().trim()

    return vouchers.filter((voucher) => {
      const status = voucher.status || 'active'
      if (activeFilter !== 'all' && status !== activeFilter) return false
      if (!q) return true
      return (
        voucher.code?.toLowerCase().includes(q) ||
        voucher.recipient_name?.toLowerCase().includes(q) ||
        voucher.recipient_email?.toLowerCase().includes(q) ||
        voucher.purchaser_name?.toLowerCase().includes(q) ||
        voucher.purchaser_email?.toLowerCase().includes(q) ||
        voucher.status?.toLowerCase().includes(q)
      )
    })
  }, [activeFilter, search, vouchers])

  const today = new Date().toISOString().split('T')[0]
  const monthKey = new Date().toISOString().slice(0, 7)
  const totalSold = vouchers.reduce((sum, v) => sum + Number(v.amount || 0), 0)
  const totalRemaining = vouchers.reduce((sum, v) => sum + Number(v.remaining_amount || 0), 0)
  const soldToday = vouchers.filter((v) => v.created_at?.startsWith(today)).reduce((sum, v) => sum + Number(v.amount || 0), 0)
  const soldThisMonth = vouchers.filter((v) => v.created_at?.startsWith(monthKey)).reduce((sum, v) => sum + Number(v.amount || 0), 0)
  const activeCount = vouchers.filter((v) => (v.status || 'active') === 'active').length
  const redeemedCount = vouchers.filter((v) => v.status === 'redeemed').length
  const cancelledCount = vouchers.filter((v) => v.status === 'cancelled').length
  const expiredCount = vouchers.filter((v) => v.status === 'expired').length

  const currentPlan = useMemo(() => String(business?.plan || 'starter').toUpperCase(), [business?.plan])

  if (loading) {
    return (
      <DashboardPage className="flex min-h-[55vh] items-center justify-center">
        <div className="rounded-[2rem] border border-white/10 bg-[#07111f] px-8 py-6 font-black text-slate-200 shadow-[0_50px_180px_rgba(0,0,0,.55)]">
          Loading gift vouchers...
        </div>
      </DashboardPage>
    )
  }

  if (!features.giftVouchers) {
    return (
      <DashboardPage>
        <DashboardHero eyebrow="Gift vouchers" title="Gift vouchers are locked." description={`Gift voucher sales, balances and redemptions are not included on the current ${currentPlan} plan.`} />
        <LockedFeatureCard title="Gift vouchers are locked" description="Upgrade this business to unlock voucher creation, voucher balance tracking, redemption management and CSV export." feature="Gift vouchers" plan={currentPlan} />
      </DashboardPage>
    )
  }

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Gift vouchers"
        title="Gift vouchers."
        description="Manage voucher sales, outstanding balances, redemptions, expiry dates and manual voucher creation."
        actions={
          <>
            <ActionButton onClick={() => setShowCreateForm((value) => !value)} variant="primary" icon={<Plus size={17} />} disabled={!features.manualCreation}>
              {showCreateForm ? 'Close form' : 'Create voucher'}
            </ActionButton>
            <ActionButton onClick={exportCsv} icon={<Download size={17} />} disabled={!features.exportCsv}>Export CSV</ActionButton>
          </>
        }
      />

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">{success}</div>}

      <DashboardGrid columns={4}>
        <StatCard label="Sold today" value={`£${soldToday.toFixed(2)}`} icon={<Wallet size={22} />} colour="emerald" />
        <StatCard label="This month" value={`£${soldThisMonth.toFixed(2)}`} icon={<Gift size={22} />} />
        <StatCard label="Total sold" value={`£${totalSold.toFixed(2)}`} icon={<Ticket size={22} />} colour="violet" />
        <StatCard label="Outstanding" value={`£${totalRemaining.toFixed(2)}`} icon={<Archive size={22} />} colour="amber" />
      </DashboardGrid>

      <DashboardGrid columns={4}>
        <StatCard label="Active" value={activeCount} icon={<ShieldCheck size={22} />} colour="emerald" />
        <StatCard label="Redeemed" value={redeemedCount} icon={<Gift size={22} />} />
        <StatCard label="Expired" value={expiredCount} icon={<Archive size={22} />} colour="amber" />
        <StatCard label="Cancelled" value={cancelledCount} icon={<XCircle size={22} />} colour="rose" />
      </DashboardGrid>

      <DashboardGrid columns={4}>
        <FeatureStatusCard title="Gift vouchers" enabled={features.giftVouchers} description="View and manage voucher records." />
        <FeatureStatusCard title="Manual creation" enabled={features.manualCreation} description="Create goodwill, competition or offline purchase vouchers." />
        <FeatureStatusCard title="Redemption" enabled={features.redemption} description="Redeem and cancel voucher balances." />
        <FeatureStatusCard title="CSV export" enabled={features.exportCsv} description="Download voucher reports." />
      </DashboardGrid>

      {showCreateForm && (
        <SectionCard title="Create manual voucher" description="Issue goodwill vouchers, competition prizes, offline purchases or refund credits." actions={!features.manualCreation ? <SmallLockedBadge /> : null}>
          {!features.manualCreation && <LockedInline message="Manual voucher creation is not included on this plan." />}
          <form onSubmit={createManualVoucher} className={`grid gap-4 md:grid-cols-2 xl:grid-cols-4 ${!features.manualCreation ? 'pointer-events-none opacity-40' : ''}`}>
            <Input label="Amount" type="number" value={manualAmount} onChange={setManualAmount} placeholder="50" />
            <Input label="Recipient name" value={recipientName} onChange={setRecipientName} placeholder="Jane Smith" />
            <Input label="Recipient email" type="email" value={recipientEmail} onChange={setRecipientEmail} placeholder="jane@example.com" />
            <Input label="Purchaser name" value={purchaserName} onChange={setPurchaserName} placeholder="Manual voucher" />
            <div className="md:col-span-2 xl:col-span-4">
              <button type="submit" disabled={saving || !features.manualCreation} className="w-full rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? 'Creating...' : 'Create voucher'}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard>
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.03em] text-white">All vouchers</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Search by code, recipient, purchaser, email or status.</p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vouchers..." className="w-full rounded-2xl border border-white/10 bg-slate-950 py-4 pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300 lg:w-96" />
            </div>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {filters.map((filter) => (
              <button key={filter.key} type="button" onClick={() => setActiveFilter(filter.key)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${activeFilter === filter.key ? 'border-cyan-300/30 bg-cyan-400/15 text-cyan-100' : 'border-white/10 bg-white/[0.04] text-slate-400'}`}>
                {filter.label}
              </button>
            ))}
          </div>

          {filteredVouchers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
              <p className="text-lg font-black text-white">No gift vouchers found.</p>
              <p className="mt-2 text-sm text-slate-500">Create your first voucher or change your search/filter.</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredVouchers.map((voucher) => (
                <VoucherCard key={voucher.id} voucher={voucher} features={features} onCopy={copyCode} onRedeem={markRedeemed} onCancel={cancelVoucher} />
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </DashboardPage>
  )
}

function VoucherCard({ voucher, features, onCopy, onRedeem, onCancel }: { voucher: GiftVoucher; features: FeatureState; onCopy: (code: string) => void; onRedeem: (voucher: GiftVoucher) => void; onCancel: (voucher: GiftVoucher) => void }) {
  const status = voucher.status || 'active'
  const amount = Number(voucher.amount || 0)
  const remaining = Number(voucher.remaining_amount || 0)
  const used = Math.max(0, amount - remaining)
  const percentUsed = amount > 0 ? Math.min(100, Math.round((used / amount) * 100)) : 0

  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 shadow-[0_30px_100px_rgba(0,0,0,.35)]">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-xl font-black tracking-[-0.03em] text-white">{voucher.code}</h3>
              <button type="button" onClick={() => onCopy(voucher.code)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white" aria-label="Copy voucher code">
                <Copy size={16} />
              </button>
            </div>
            <p className="mt-2 truncate text-sm font-bold text-cyan-200">{voucher.recipient_name || 'No recipient name'}</p>
            <p className="mt-1 truncate text-sm text-slate-500">{voucher.recipient_email || 'No recipient email'}</p>
          </div>
          <VoucherBadge status={status} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <InfoTile label="Original" value={`£${amount.toFixed(2)}`} />
          <InfoTile label="Remaining" value={`£${remaining.toFixed(2)}`} />
          <InfoTile label="Purchaser" value={voucher.purchaser_name || 'Unknown'} />
          <InfoTile label="Expiry" value={voucher.expiry_date ? new Date(voucher.expiry_date).toLocaleDateString('en-GB') : 'No expiry'} />
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.18em]">
            <span className="text-slate-500">Used</span>
            <span className="text-slate-300">{percentUsed}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-cyan-300" style={{ width: `${percentUsed}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-white/10 bg-white/[0.025] p-3">
        <button type="button" onClick={() => onCopy(voucher.code)} className="rounded-2xl bg-white/[0.05] px-3 py-3 text-xs font-black text-white hover:bg-white/[0.09]">Copy</button>
        <button type="button" onClick={() => onRedeem(voucher)} disabled={status !== 'active' || !features.redemption} className="rounded-2xl bg-emerald-400/10 px-3 py-3 text-xs font-black text-emerald-200 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40">Redeem</button>
        <button type="button" onClick={() => onCancel(voucher)} disabled={status === 'cancelled' || !features.redemption} className="rounded-2xl bg-rose-400/10 px-3 py-3 text-xs font-black text-rose-200 hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-40">Cancel</button>
      </div>
    </article>
  )
}

function FeatureStatusCard({ title, enabled, description }: { title: string; enabled: boolean; description: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#07111f] p-5 shadow-[0_35px_120px_rgba(0,0,0,.32)]">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="font-black text-white">{title}</h3>
        <span className={enabled ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300' : 'rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-300'}>
          {enabled ? 'Unlocked' : 'Locked'}
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-400">{description}</p>
    </div>
  )
}

function VoucherBadge({ status }: { status: string }) {
  const normalised = status.toLowerCase()
  if (normalised === 'redeemed') return <span className="shrink-0 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-300">Redeemed</span>
  if (normalised === 'expired') return <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-300">Expired</span>
  if (normalised === 'cancelled') return <span className="shrink-0 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-black text-red-300">Cancelled</span>
  return <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">Active</span>
}

function InfoTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 truncate text-sm font-black text-white">{value}</p>
    </div>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-400">{label}</span>
      <input type={type} min={type === 'number' ? '1' : undefined} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function ActionButton({ children, onClick, variant = 'default', icon, disabled = false }: { children: React.ReactNode; onClick: () => void; variant?: 'default' | 'primary'; icon?: React.ReactNode; disabled?: boolean }) {
  const styles = {
    default: 'border-white/10 bg-white/[0.045] text-white hover:bg-white/[0.09]',
    primary: 'border-cyan-400/20 bg-cyan-400 text-slate-950 hover:bg-cyan-300',
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}>
      {icon}
      {children}
    </button>
  )
}

function LockedFeatureCard({ title, description, feature, plan }: { title: string; description: string; feature: string; plan: string }) {
  return (
    <div className="max-w-3xl rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-200"><Lock size={22} /></div>
      <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-amber-300">Upgrade required</p>
      <h2 className="text-3xl font-black text-white">{title}</h2>
      <p className="mt-3 text-slate-300">{description}</p>
      <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-slate-300">
        <p><span className="font-black text-white">Feature:</span> {feature}</p>
        <p><span className="font-black text-white">Current plan:</span> {plan}</p>
        <p><span className="font-black text-white">Action:</span> Enable this feature from the platform admin feature controls or move the business to a voucher-enabled plan.</p>
      </div>
    </div>
  )
}

function LockedInline({ message }: { message: string }) {
  return <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-semibold text-amber-200">{message}</div>
}

function SmallLockedBadge() {
  return <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">Locked</span>
}
