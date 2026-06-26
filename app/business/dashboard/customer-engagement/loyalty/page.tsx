'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

const LOYALTY_FEATURE_KEY = 'loyalty'
const LOYALTY_REWARDS_FEATURE_KEY = 'loyalty_rewards'
const LOYALTY_REDEMPTION_FEATURE_KEY = 'loyalty_redemption'
const LOYALTY_REPORTING_FEATURE_KEY = 'loyalty_reporting'

type Business = {
  id: string
  business_name: string | null
  slug: string | null
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

type Customer = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

type LoyaltyWallet = {
  id: string
  business_id: string
  customer_id: string
  visits_required: number | null
  visits_completed: number | null
  reward_label: string | null
  status: string | null
  created_at: string | null
}

type LoyaltyWithCustomer = LoyaltyWallet & {
  customer_lookup?: Customer | null
}

type FeatureState = {
  loyalty: boolean
  rewards: boolean
  redemption: boolean
  reporting: boolean
}

type StatusFilter = 'all' | 'active' | 'earned' | 'redeemed' | 'cancelled'

const defaultFeatureState: FeatureState = {
  loyalty: false,
  rewards: false,
  redemption: false,
  reporting: false,
}

const planFeatures: Record<string, FeatureState> = {
  starter: {
    loyalty: false,
    rewards: false,
    redemption: false,
    reporting: false,
  },
  growth: {
    loyalty: true,
    rewards: true,
    redemption: true,
    reporting: false,
  },
  pro: {
    loyalty: true,
    rewards: true,
    redemption: true,
    reporting: true,
  },
  agency: {
    loyalty: true,
    rewards: true,
    redemption: true,
    reporting: true,
  },
  enterprise: {
    loyalty: true,
    rewards: true,
    redemption: true,
    reporting: true,
  },
}

function customerName(customer?: Customer | null) {
  if (!customer) return 'Unknown customer'
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Customer'
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function progressPercent(wallet: LoyaltyWallet) {
  const required = Number(wallet.visits_required || 0)
  const completed = Number(wallet.visits_completed || 0)
  if (required <= 0) return 0
  return Math.min(100, Math.round((completed / required) * 100))
}

function isEarned(wallet: LoyaltyWallet) {
  return Number(wallet.visits_completed || 0) >= Number(wallet.visits_required || 0)
}

export default function LoyaltyManagementPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [features, setFeatures] = useState<FeatureState>(defaultFeatureState)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [wallets, setWallets] = useState<LoyaltyWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [customerId, setCustomerId] = useState('')
  const [visitsRequired, setVisitsRequired] = useState(10)
  const [visitsCompleted, setVisitsCompleted] = useState(0)
  const [rewardLabel, setRewardLabel] = useState('Free appointment')

  useEffect(() => {
    loadData()
  }, [])

  async function getBusinessForUser() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) throw userError
    if (!user) throw new Error('You need to be logged in.')

    const { data: ownerBusinesses, error: ownerError } = await supabase
      .from('businesses')
      .select('id,business_name,slug,plan,status,lifetime_access')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!ownerError && ownerBusinesses?.[0]) return ownerBusinesses[0] as Business

    const { data: ownedBusinesses, error: businessError } = await supabase
      .from('businesses')
      .select('id,business_name,slug,plan,status,lifetime_access')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (businessError) throw businessError

    const ownedBusiness = ownedBusinesses?.[0]
    if (ownedBusiness) return ownedBusiness as Business

    const { data: staffRows } = await supabase
      .from('staff_users')
      .select('business_id')
      .eq('email', user.email)
      .limit(1)

    if (staffRows?.[0]?.business_id) {
      const { data: staffBusinesses, error: staffBusinessError } = await supabase
        .from('businesses')
        .select('id,business_name,slug,plan,status,lifetime_access')
        .eq('id', staffRows[0].business_id)
        .limit(1)

      if (staffBusinessError) throw staffBusinessError

      const staffBusiness = staffBusinesses?.[0]
      if (staffBusiness) return staffBusiness as Business
    }

    throw new Error('No business found for this user.')
  }

  async function loadFeatureState(foundBusiness: Business) {
    const plan = String(foundBusiness.plan || 'starter').toLowerCase()
    const baseFeatures = foundBusiness.lifetime_access
      ? planFeatures.enterprise
      : planFeatures[plan] || defaultFeatureState

    const nextFeatures: FeatureState = {
      ...baseFeatures,
    }

    const { data } = await supabase
      .from('business_features')
      .select('*')
      .eq('business_id', foundBusiness.id)

    const rows = ((data || []) as BusinessFeature[])

    rows.forEach((row) => {
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

      if (key === LOYALTY_FEATURE_KEY) {
        nextFeatures.loyalty = enabled || (!disabled && nextFeatures.loyalty)
      }

      if (key === LOYALTY_REWARDS_FEATURE_KEY) {
        nextFeatures.rewards = enabled || (!disabled && nextFeatures.rewards)
      }

      if (key === LOYALTY_REDEMPTION_FEATURE_KEY) {
        nextFeatures.redemption = enabled || (!disabled && nextFeatures.redemption)
      }

      if (key === LOYALTY_REPORTING_FEATURE_KEY) {
        nextFeatures.reporting = enabled || (!disabled && nextFeatures.reporting)
      }
    })

    setFeatures(nextFeatures)
    return nextFeatures
  }

  async function loadData() {
    setLoading(true)
    setMessage('')

    try {
      const foundBusiness = await getBusinessForUser()
      setBusiness(foundBusiness)

      await loadFeatureState(foundBusiness)

      const [customerResult, loyaltyResult] = await Promise.all([
        supabase
          .from('customers')
          .select('id,first_name,last_name,email')
          .eq('business_id', foundBusiness.id)
          .order('first_name', { ascending: true }),
        supabase
          .from('customer_loyalty')
          .select('*')
          .eq('business_id', foundBusiness.id)
          .order('created_at', { ascending: false }),
      ])

      if (customerResult.error) throw customerResult.error
      if (loyaltyResult.error) throw loyaltyResult.error

      const customerRows = (customerResult.data as Customer[]) || []
      const loyaltyRows = (loyaltyResult.data as LoyaltyWallet[]) || []
      const customerMap = new Map(customerRows.map((customer) => [customer.id, customer]))

      setCustomers(customerRows)
      setWallets(
        loyaltyRows.map((wallet) => ({
          ...wallet,
          customer_lookup: customerMap.get(wallet.customer_id) || null,
        }))
      )
    } catch (error: any) {
      console.error('Loyalty load error:', error)
      setMessage(error?.message || 'Could not load loyalty programme.')
    }

    setLoading(false)
  }

  function requireFeature(enabled: boolean, featureName: string) {
    if (enabled) return true
    setMessage(`${featureName} is not included on this plan. Upgrade the business plan to unlock it.`)
    return false
  }

  async function createWallet() {
    if (!business) return

    setMessage('')

    if (!requireFeature(features.rewards, 'Loyalty wallet creation')) return

    if (!customerId) {
      setMessage('Choose a customer.')
      return
    }

    if (visitsRequired <= 0) {
      setMessage('Visits required must be more than zero.')
      return
    }

    setSaving(true)

    const { data: existingWallet, error: existingError } = await supabase
      .from('customer_loyalty')
      .select('id')
      .eq('business_id', business.id)
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .maybeSingle()

    if (existingError) {
      setMessage(existingError.message)
      setSaving(false)
      return
    }

    if (existingWallet) {
      setMessage('This customer already has an active loyalty wallet.')
      setSaving(false)
      return
    }

    const { data, error } = await supabase
      .from('customer_loyalty')
      .insert({
        business_id: business.id,
        customer_id: customerId,
        visits_required: visitsRequired,
        visits_completed: visitsCompleted,
        reward_label: rewardLabel.trim() || 'Free appointment',
        status: 'active',
      })
      .select('*')
      .single()

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    const selectedCustomer = customers.find((customer) => customer.id === customerId) || null

    setWallets((current) => [
      {
        ...(data as LoyaltyWallet),
        customer_lookup: selectedCustomer,
      },
      ...current,
    ])

    setCustomerId('')
    setVisitsRequired(10)
    setVisitsCompleted(0)
    setRewardLabel('Free appointment')
    setMessage('Loyalty wallet created.')
    setSaving(false)
  }

  async function updateVisits(wallet: LoyaltyWithCustomer, direction: 'add' | 'remove') {
    setMessage('')

    if (!requireFeature(features.rewards, 'Loyalty visit tracking')) return

    const current = Number(wallet.visits_completed || 0)
    const next = direction === 'add' ? current + 1 : Math.max(0, current - 1)

    const nextStatus =
      wallet.status === 'redeemed' || wallet.status === 'cancelled'
        ? wallet.status
        : next >= Number(wallet.visits_required || 0)
          ? 'earned'
          : 'active'

    const { error } = await supabase
      .from('customer_loyalty')
      .update({
        visits_completed: next,
        status: nextStatus,
      })
      .eq('id', wallet.id)
      .eq('business_id', wallet.business_id)

    if (error) {
      setMessage(error.message)
      return
    }

    setWallets((currentWallets) =>
      currentWallets.map((item) =>
        item.id === wallet.id
          ? { ...item, visits_completed: next, status: nextStatus }
          : item
      )
    )
  }

  async function updateStatus(wallet: LoyaltyWithCustomer, status: string) {
    setMessage('')

    if (status === 'redeemed' && !requireFeature(features.redemption, 'Loyalty redemption')) return
    if (status !== 'redeemed' && !requireFeature(features.rewards, 'Loyalty wallet management')) return

    const { error } = await supabase
      .from('customer_loyalty')
      .update({ status })
      .eq('id', wallet.id)
      .eq('business_id', wallet.business_id)

    if (error) {
      setMessage(error.message)
      return
    }

    setWallets((current) =>
      current.map((item) => (item.id === wallet.id ? { ...item, status } : item))
    )

    setMessage(`Loyalty wallet marked as ${status}.`)
  }

  async function deleteWallet(wallet: LoyaltyWithCustomer) {
    if (!requireFeature(features.rewards, 'Loyalty wallet management')) return
    if (!confirm('Delete this loyalty wallet?')) return

    const { error } = await supabase
      .from('customer_loyalty')
      .delete()
      .eq('id', wallet.id)
      .eq('business_id', wallet.business_id)

    if (error) {
      setMessage(error.message)
      return
    }

    setWallets((current) => current.filter((item) => item.id !== wallet.id))
    setMessage('Loyalty wallet deleted.')
  }

  const filteredWallets = useMemo(() => {
    const q = search.toLowerCase().trim()

    return wallets.filter((wallet) => {
      const actualStatus = isEarned(wallet) && wallet.status === 'active' ? 'earned' : wallet.status || 'active'
      const matchesStatus = statusFilter === 'all' || actualStatus === statusFilter
      const matchesSearch =
        !q ||
        [
          customerName(wallet.customer_lookup),
          wallet.customer_lookup?.email || '',
          wallet.reward_label || '',
          wallet.status || '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)

      return matchesStatus && matchesSearch
    })
  }, [wallets, search, statusFilter])

  const stats = useMemo(() => {
    const active = wallets.filter((wallet) => wallet.status === 'active')
    const earned = wallets.filter((wallet) => isEarned(wallet) && wallet.status !== 'redeemed' && wallet.status !== 'cancelled')
    const redeemed = wallets.filter((wallet) => wallet.status === 'redeemed')
    const cancelled = wallets.filter((wallet) => wallet.status === 'cancelled')
    const totalRequired = active.reduce((sum, wallet) => sum + Number(wallet.visits_required || 0), 0)
    const totalCompleted = active.reduce((sum, wallet) => sum + Number(wallet.visits_completed || 0), 0)

    return {
      total: wallets.length,
      active: active.length,
      earned: earned.length,
      redeemed: redeemed.length,
      cancelled: cancelled.length,
      completionRate: totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0,
    }
  }, [wallets])

  const currentPlan = useMemo(() => {
    return String(business?.plan || 'starter').toUpperCase()
  }, [business?.plan])

  if (loading) {
    return <div className="text-white">Loading loyalty...</div>
  }

  if (!features.loyalty) {
    return (
      <div>
        <section className="mb-10">
          <p className="mb-2 text-slate-400">Pack 7 commercial gating</p>
          <h1 className="mb-2 text-4xl font-bold">Loyalty</h1>
          <p className="max-w-3xl text-slate-500">
            Loyalty wallets are not included on the current {currentPlan} plan.
            {business?.business_name ? ` Connected to ${business.business_name}.` : ''}
          </p>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
            {message}
          </div>
        )}

        <LockedFeatureCard
          title="Loyalty is locked"
          description="Upgrade this business to unlock visit-based loyalty wallets, reward tracking, redemption and loyalty reporting."
          feature="Loyalty"
          plan={currentPlan}
        />
      </div>
    )
  }

  return (
    <div>
      <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-slate-400">Pack 7 commercial gating</p>
          <h1 className="mb-2 text-4xl font-bold">Loyalty</h1>
          <p className="max-w-3xl text-slate-500">
            Create and manage visit-based loyalty wallets for customers.
            {business?.business_name ? ` Connected to ${business.business_name}.` : ''}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Current plan
            </p>
            <p className="mt-1 text-xl font-black text-white">{currentPlan}</p>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950"
          >
            Refresh
          </button>
        </div>
      </section>

      {message && (
        <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
          {message}
        </div>
      )}

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <FeatureStatusCard
          title="Loyalty"
          enabled={features.loyalty}
          description="View and manage the loyalty module."
        />
        <FeatureStatusCard
          title="Rewards"
          enabled={features.rewards}
          description="Create wallets and update visit progress."
        />
        <FeatureStatusCard
          title="Redemption"
          enabled={features.redemption}
          description="Redeem earned loyalty rewards."
        />
        <FeatureStatusCard
          title="Reporting"
          enabled={features.reporting}
          description="View loyalty performance metrics."
        />
      </section>

      {features.reporting && (
        <section className="mb-8 grid gap-6 md:grid-cols-5">
          <StatCard label="Total wallets" value={stats.total} />
          <StatCard label="Active wallets" value={stats.active} />
          <StatCard label="Rewards earned" value={stats.earned} />
          <StatCard label="Rewards redeemed" value={stats.redeemed} />
          <StatCard label="Completion rate" value={`${stats.completionRate}%`} />
        </section>
      )}

      {!features.reporting && (
        <div className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
          Loyalty reporting is locked on this plan. Wallet management remains available where enabled.
        </div>
      )}

      <section className="mb-8 grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="mb-2 text-2xl font-bold">Create loyalty wallet</h2>
              <p className="text-slate-400">
                Assign a reward target to a customer. Progress appears in their customer portal.
              </p>
            </div>
            {!features.rewards && <SmallLockedBadge />}
          </div>

          {!features.rewards && (
            <LockedInline message="Loyalty wallet creation is not included on this plan." />
          )}

          <div className={`space-y-4 ${!features.rewards ? 'pointer-events-none opacity-40' : ''}`}>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Customer</span>
              <select
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                <option value="">Choose customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customerName(customer)}{customer.email ? ` · ${customer.email}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-400">Visits required</span>
                <input
                  type="number"
                  min="1"
                  value={visitsRequired}
                  onChange={(event) => setVisitsRequired(Number(event.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-400">Starting visits</span>
                <input
                  type="number"
                  min="0"
                  value={visitsCompleted}
                  onChange={(event) => setVisitsCompleted(Number(event.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Reward</span>
              <input
                value={rewardLabel}
                onChange={(event) => setRewardLabel(event.target.value)}
                placeholder="Free appointment"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <button
              type="button"
              onClick={createWallet}
              disabled={saving || !features.rewards}
              className="w-full rounded-xl bg-white px-5 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create loyalty wallet'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search loyalty wallets..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="earned">Earned</option>
              <option value="redeemed">Redeemed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {filteredWallets.map((wallet) => (
              <LoyaltyCard
                key={wallet.id}
                wallet={wallet}
                redemptionEnabled={features.redemption}
                rewardsEnabled={features.rewards}
                onAddVisit={() => updateVisits(wallet, 'add')}
                onRemoveVisit={() => updateVisits(wallet, 'remove')}
                onRedeem={() => updateStatus(wallet, 'redeemed')}
                onReactivate={() => updateStatus(wallet, 'active')}
                onCancel={() => updateStatus(wallet, 'cancelled')}
                onDelete={() => deleteWallet(wallet)}
              />
            ))}

            {filteredWallets.length === 0 && <EmptyState message="No loyalty wallets found." />}
          </div>
        </section>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="mb-2 text-slate-400">{label}</p>
      <h2 className="text-3xl font-bold">{value}</h2>
    </div>
  )
}

function LoyaltyCard({
  wallet,
  redemptionEnabled,
  rewardsEnabled,
  onAddVisit,
  onRemoveVisit,
  onRedeem,
  onReactivate,
  onCancel,
  onDelete,
}: {
  wallet: LoyaltyWithCustomer
  redemptionEnabled: boolean
  rewardsEnabled: boolean
  onAddVisit: () => void
  onRemoveVisit: () => void
  onRedeem: () => void
  onReactivate: () => void
  onCancel: () => void
  onDelete: () => void
}) {
  const earned = isEarned(wallet)
  const status = earned && wallet.status === 'active' ? 'earned' : wallet.status || 'active'

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-bold">{customerName(wallet.customer_lookup)}</h3>
            <StatusPill value={status} />
          </div>

          <p className="text-slate-400">
            {Number(wallet.visits_completed || 0)} of {Number(wallet.visits_required || 0)} visits completed
          </p>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-cyan-300" style={{ width: `${progressPercent(wallet)}%` }} />
          </div>

          <div className="mt-4 grid gap-3 text-sm text-slate-500 md:grid-cols-3">
            <p>Reward: {wallet.reward_label || 'Free appointment'}</p>
            <p>Started: {formatDate(wallet.created_at)}</p>
            <p>Progress: {progressPercent(wallet)}%</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 lg:w-44">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRemoveVisit}
              disabled={!rewardsEnabled}
              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              - Visit
            </button>

            <button
              type="button"
              onClick={onAddVisit}
              disabled={!rewardsEnabled}
              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Visit
            </button>
          </div>

          {status === 'redeemed' || status === 'cancelled' ? (
            <button
              type="button"
              onClick={onReactivate}
              disabled={!rewardsEnabled}
              className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={onRedeem}
              disabled={!redemptionEnabled}
              className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Redeem reward
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            disabled={!rewardsEnabled}
            className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-300 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={!rewardsEnabled}
            className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}

function StatusPill({ value }: { value: string }) {
  const good = value === 'active'
  const earned = value === 'earned'
  const redeemed = value === 'redeemed'
  const bad = value === 'cancelled'

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${
        good
          ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300'
          : earned
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
            : redeemed
              ? 'border-violet-500/20 bg-violet-500/10 text-violet-300'
              : bad
                ? 'border-red-500/20 bg-red-500/10 text-red-300'
                : 'border-slate-500/20 bg-slate-500/10 text-slate-300'
      }`}
    >
      {value}
    </span>
  )
}

function FeatureStatusCard({
  title,
  enabled,
  description,
}: {
  title: string
  enabled: boolean
  description: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="font-black text-white">{title}</h3>
        <span
          className={
            enabled
              ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300'
              : 'rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-300'
          }
        >
          {enabled ? 'Unlocked' : 'Locked'}
        </span>
      </div>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  )
}

function LockedFeatureCard({
  title,
  description,
  feature,
  plan,
}: {
  title: string
  description: string
  feature: string
  plan: string
}) {
  return (
    <div className="max-w-3xl rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-amber-300">
        Upgrade required
      </p>
      <h2 className="text-3xl font-black text-white">{title}</h2>
      <p className="mt-3 text-slate-300">{description}</p>
      <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-slate-300">
        <p>
          <span className="font-black text-white">Feature:</span> {feature}
        </p>
        <p>
          <span className="font-black text-white">Current plan:</span> {plan}
        </p>
        <p>
          <span className="font-black text-white">Action:</span> Enable this feature from platform admin feature controls or move the business to a loyalty-enabled plan.
        </p>
      </div>
    </div>
  )
}

function LockedInline({ message }: { message: string }) {
  return (
    <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-semibold text-amber-200">
      {message}
    </div>
  )
}

function SmallLockedBadge() {
  return (
    <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">
      Locked
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-8 text-center text-slate-500">
      {message}
    </div>
  )
}
