'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string | null
  slug: string | null
}

type Customer = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

type CustomerReferral = {
  id: string
  business_id: string
  customer_id: string
  referral_code: string
  friend_email: string | null
  status: string | null
  reward_amount: number | null
  created_at: string | null
}

type ReferralWithCustomer = CustomerReferral & {
  customer_lookup?: Customer | null
}

type StatusFilter = 'all' | 'pending' | 'converted' | 'paid' | 'cancelled'

const REFERRALS_FEATURE = 'referrals'
const REFERRAL_REWARDS_FEATURE = 'referral_rewards'
const REFERRAL_EXPORT_FEATURE = 'referral_export'
const REFERRAL_ANALYTICS_FEATURE = 'referral_analytics'

type FeatureState = {
  referrals: boolean
  rewards: boolean
  exportCsv: boolean
  analytics: boolean
}

const defaultFeatureState: FeatureState = {
  referrals: false,
  rewards: false,
  exportCsv: false,
  analytics: false,
}

function money(value: number | string | null | undefined) {
  return `£${Number(value || 0).toFixed(2)}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function customerName(customer?: Customer | null) {
  if (!customer) return 'Unknown customer'
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Customer'
}

function referralStatus(value?: string | null) {
  return value || 'pending'
}

export default function ReferralsManagementPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [referrals, setReferrals] = useState<ReferralWithCustomer[]>([])
  const [features, setFeatures] = useState<FeatureState>(defaultFeatureState)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [customerId, setCustomerId] = useState('')
  const [friendEmail, setFriendEmail] = useState('')
  const [rewardAmount, setRewardAmount] = useState(10)

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

    const { data: ownedBusinesses, error: businessError } = await supabase
      .from('businesses')
      .select('id,business_name,slug')
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
        .select('id,business_name,slug')
        .eq('id', staffRows[0].business_id)
        .limit(1)

      if (staffBusinessError) throw staffBusinessError

      const staffBusiness = staffBusinesses?.[0]
      if (staffBusiness) return staffBusiness as Business
    }

    throw new Error('No business found for this user.')
  }

  function generateReferralCode(customer: Customer, foundBusiness: Business) {
    const businessPrefix = (foundBusiness.slug || foundBusiness.business_name || 'BUS')
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase()
      .slice(0, 4)

    const customerPrefix = `${customer.first_name || ''}${customer.last_name || ''}`
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase()
      .slice(0, 6) || 'CUSTOM'

    return `${businessPrefix}-${customerPrefix}`
  }

  async function loadFeatureState(businessId: string) {
    const { data, error } = await supabase
      .from('business_features')
      .select('feature_key, enabled')
      .eq('business_id', businessId)

    if (error) {
      setFeatures(defaultFeatureState)
      return
    }

    const enabled = (key: string) =>
      data?.some(
        (feature) =>
          feature.feature_key === key &&
          feature.enabled === true
      ) ?? false

    setFeatures({
      referrals: enabled(REFERRALS_FEATURE),
      rewards: enabled(REFERRAL_REWARDS_FEATURE),
      exportCsv: enabled(REFERRAL_EXPORT_FEATURE),
      analytics: enabled(REFERRAL_ANALYTICS_FEATURE),
    })
  }

  async function loadData() {
    setLoading(true)
    setMessage('')

    try {
      const foundBusiness = await getBusinessForUser()
      setBusiness(foundBusiness)
      await loadFeatureState(foundBusiness.id)

      const [customerResult, referralResult] = await Promise.all([
        supabase
          .from('customers')
          .select('id,first_name,last_name,email')
          .eq('business_id', foundBusiness.id)
          .order('first_name', { ascending: true }),
        supabase
          .from('customer_referrals')
          .select('*')
          .eq('business_id', foundBusiness.id)
          .order('created_at', { ascending: false }),
      ])

      if (customerResult.error) throw customerResult.error
      if (referralResult.error) throw referralResult.error

      const customerRows = (customerResult.data as Customer[]) || []
      const referralRows = (referralResult.data as CustomerReferral[]) || []
      const customerMap = new Map(customerRows.map((customer) => [customer.id, customer]))

      setCustomers(customerRows)
      setReferrals(
        referralRows.map((referral) => ({
          ...referral,
          customer_lookup: customerMap.get(referral.customer_id) || null,
        }))
      )
    } catch (error: any) {
      console.error('Referrals load error:', error)
      setMessage(error?.message || 'Could not load referrals.')
    }

    setLoading(false)
  }

  async function createReferral() {
    if (!business) return

    setMessage('')

    if (!features.referrals) {
      setMessage('Referrals are not enabled on this plan.')
      return
    }

    if (!customerId) {
      setMessage('Choose a customer.')
      return
    }

    const customer = customers.find((item) => item.id === customerId)

    if (!customer) {
      setMessage('Customer not found.')
      return
    }

    if (rewardAmount > 0 && !features.rewards) {
      setMessage('Referral rewards are not enabled on this plan.')
      return
    }

    const referralCode = generateReferralCode(customer, business)

    const { data, error } = await supabase
      .from('customer_referrals')
      .insert({
        business_id: business.id,
        customer_id: customer.id,
        referral_code: referralCode,
        friend_email: friendEmail.trim().toLowerCase() || null,
        reward_amount: rewardAmount,
        status: 'pending',
      })
      .select('*')
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setReferrals((current) => [
      {
        ...(data as CustomerReferral),
        customer_lookup: customer,
      },
      ...current,
    ])

    setCustomerId('')
    setFriendEmail('')
    setRewardAmount(10)
    setMessage('Referral created.')
  }

  async function updateReferralStatus(referral: ReferralWithCustomer, status: string) {
    setSavingId(referral.id)
    setMessage('')

    if (status === 'paid' && !features.rewards) {
      setMessage('Referral rewards are not enabled on this plan.')
      setSavingId('')
      return
    }

    const { error } = await supabase
      .from('customer_referrals')
      .update({ status })
      .eq('id', referral.id)

    if (error) {
      setMessage(error.message)
      setSavingId('')
      return
    }

    setReferrals((current) =>
      current.map((item) => (item.id === referral.id ? { ...item, status } : item))
    )

    setSavingId('')
    setMessage(`Referral marked as ${status}.`)
  }

  async function deleteReferral(referral: ReferralWithCustomer) {
    if (!confirm('Delete this referral?')) return

    const { error } = await supabase
      .from('customer_referrals')
      .delete()
      .eq('id', referral.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setReferrals((current) => current.filter((item) => item.id !== referral.id))
    setMessage('Referral deleted.')
  }

  function exportCsv() {
    if (!features.exportCsv) {
      setMessage('Referral CSV export is not enabled on this plan.')
      return
    }

    const rows = [
      ['Date', 'Customer', 'Customer email', 'Referral code', 'Friend email', 'Status', 'Reward amount'],
      ...filteredReferrals.map((referral) => [
        formatDate(referral.created_at),
        customerName(referral.customer_lookup),
        referral.customer_lookup?.email || '',
        referral.referral_code,
        referral.friend_email || '',
        referralStatus(referral.status),
        money(referral.reward_amount),
      ]),
    ]

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `customer-referrals-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const filteredReferrals = useMemo(() => {
    const q = search.toLowerCase().trim()

    return referrals.filter((referral) => {
      const status = referralStatus(referral.status)
      const matchesStatus = statusFilter === 'all' || status === statusFilter
      const matchesSearch =
        !q ||
        [
          customerName(referral.customer_lookup),
          referral.customer_lookup?.email || '',
          referral.friend_email || '',
          referral.referral_code,
          status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)

      return matchesStatus && matchesSearch
    })
  }, [referrals, search, statusFilter])

  const stats = useMemo(() => {
    const pending = referrals.filter((referral) => referralStatus(referral.status) === 'pending')
    const converted = referrals.filter((referral) => referralStatus(referral.status) === 'converted')
    const paid = referrals.filter((referral) => referralStatus(referral.status) === 'paid')

    return {
      total: referrals.length,
      converted: converted.length,
      pending: pending.length,
      paidRewards: paid.reduce((sum, referral) => sum + Number(referral.reward_amount || 0), 0),
    }
  }, [referrals])

  const topReferrers = useMemo(() => {
    const map = new Map<string, { name: string; count: number; reward: number }>()

    referrals.forEach((referral) => {
      const name = customerName(referral.customer_lookup)
      const existing = map.get(referral.customer_id)

      if (existing) {
        existing.count += 1
        existing.reward += Number(referral.reward_amount || 0)
      } else {
        map.set(referral.customer_id, {
          name,
          count: 1,
          reward: Number(referral.reward_amount || 0),
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [referrals])

  if (loading) {
    return <div className="text-white">Loading referrals...</div>
  }

  if (!features.referrals) {
    return (
      <div>
        <section className="mb-10">
          <p className="mb-2 text-slate-400">Customer Engagement</p>
          <h1 className="mb-2 text-4xl font-bold">Referrals</h1>
          <p className="max-w-3xl text-slate-500">
            Customer referrals are locked on this plan.
            {business?.business_name ? ` Connected to ${business.business_name}.` : ''}
          </p>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
            {message}
          </div>
        )}

        <LockedFeatureCard
          title="Referrals are locked"
          text="Upgrade this business or enable referrals from the Master Admin Feature Manager to unlock customer referral tracking."
        />
      </div>
    )
  }

  return (
    <div>
      <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-slate-400">Customer Engagement</p>
          <h1 className="mb-2 text-4xl font-bold">Referrals</h1>
          <p className="max-w-3xl text-slate-500">
            Track customer referrals, reward status and converted leads.
            {business?.business_name ? ` Connected to ${business.business_name}.` : ''}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={exportCsv}
            disabled={!features.exportCsv}
            className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>

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
        <FeatureCard title="Referrals" enabled={features.referrals} />
        <FeatureCard title="Rewards" enabled={features.rewards} />
        <FeatureCard title="CSV Export" enabled={features.exportCsv} />
        <FeatureCard title="Analytics" enabled={features.analytics} />
      </section>

      <section className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard label="Referral leads" value={stats.total} />
        <StatCard label="Converted" value={stats.converted} />
        <StatCard label="Pending rewards" value={stats.pending} />
        <StatCard label="Rewards paid" value={money(stats.paidRewards)} />
      </section>

      <section className="mb-8 grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-2 text-2xl font-bold">Create referral</h2>
          <p className="mb-6 text-slate-400">
            Create a referral record manually or let customers generate one from their portal.
          </p>

          <div className="space-y-4">
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

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Friend email</span>
              <input
                type="email"
                value={friendEmail}
                onChange={(event) => setFriendEmail(event.target.value)}
                placeholder="friend@example.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-400">Reward amount</span>
              <input
                type="number"
                min="0"
                disabled={!features.rewards}
                value={rewardAmount}
                onChange={(event) => setRewardAmount(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none disabled:opacity-50"
              />
            </label>

            <button
              type="button"
              onClick={createReferral}
              disabled={!features.referrals}
              className="w-full rounded-xl bg-white px-5 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create referral
            </button>
          </div>

          {features.analytics ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <h3 className="mb-3 font-bold">Top referrers</h3>
            <div className="space-y-3">
              {topReferrers.map((referrer) => (
                <div key={referrer.name} className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-bold">{referrer.name}</p>
                    <p className="text-sm text-slate-500">{referrer.count} referrals</p>
                  </div>
                  <p className="font-bold">{money(referrer.reward)}</p>
                </div>
              ))}

              {topReferrers.length === 0 && <p className="text-sm text-slate-500">No referrers yet.</p>}
            </div>
          </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-200">
              Referral analytics are locked on this plan.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search referrals..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="converted">Converted</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {filteredReferrals.map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
                saving={savingId === referral.id}
                rewardsEnabled={features.rewards}
                onPending={() => updateReferralStatus(referral, 'pending')}
                onConverted={() => updateReferralStatus(referral, 'converted')}
                onPaid={() => updateReferralStatus(referral, 'paid')}
                onCancelled={() => updateReferralStatus(referral, 'cancelled')}
                onDelete={() => deleteReferral(referral)}
              />
            ))}

            {filteredReferrals.length === 0 && <EmptyState message="No referrals found." />}
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

function ReferralCard({
  referral,
  saving,
  rewardsEnabled,
  onPending,
  onConverted,
  onPaid,
  onCancelled,
  onDelete,
}: {
  referral: ReferralWithCustomer
  saving: boolean
  rewardsEnabled: boolean
  onPending: () => void
  onConverted: () => void
  onPaid: () => void
  onCancelled: () => void
  onDelete: () => void
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-bold">{customerName(referral.customer_lookup)}</h3>
            <StatusPill value={referralStatus(referral.status)} />
          </div>

          <p className="font-mono text-lg font-black text-cyan-300">{referral.referral_code}</p>

          <div className="mt-4 grid gap-3 text-sm text-slate-500 md:grid-cols-3">
            <p>Friend: {referral.friend_email || 'Not provided'}</p>
            <p>Reward: {money(referral.reward_amount)}</p>
            <p>Created: {formatDate(referral.created_at)}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 lg:w-44">
          <button
            type="button"
            onClick={onConverted}
            disabled={saving}
            className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            Converted
          </button>

          <button
            type="button"
            onClick={onPaid}
            disabled={saving || !rewardsEnabled}
            className="rounded-xl bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-300 hover:bg-violet-500/20 disabled:opacity-50"
          >
            Mark paid
          </button>

          <button
            type="button"
            onClick={onPending}
            disabled={saving}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10 disabled:opacity-50"
          >
            Pending
          </button>

          <button
            type="button"
            onClick={onCancelled}
            disabled={saving}
            className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}

function StatusPill({ value }: { value: string }) {
  const pending = value === 'pending'
  const converted = value === 'converted'
  const paid = value === 'paid'
  const cancelled = value === 'cancelled'

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${
        paid
          ? 'border-violet-500/20 bg-violet-500/10 text-violet-300'
          : converted
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
            : pending
              ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300'
              : cancelled
                ? 'border-red-500/20 bg-red-500/10 text-red-300'
                : 'border-slate-500/20 bg-slate-500/10 text-slate-300'
      }`}
    >
      {value}
    </span>
  )
}

function FeatureCard({ title, enabled }: { title: string; enabled: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="font-bold text-white">{title}</p>
        <span
          className={
            enabled
              ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300'
              : 'rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-300'
          }
        >
          {enabled ? 'Enabled' : 'Locked'}
        </span>
      </div>
    </div>
  )
}

function LockedFeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="max-w-3xl rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8 text-amber-100">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-amber-300">
        Upgrade required
      </p>
      <h2 className="text-3xl font-black text-white">{title}</h2>
      <p className="mt-3 text-slate-300">{text}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-8 text-center text-slate-500">
      {message}
    </div>
  )
}
