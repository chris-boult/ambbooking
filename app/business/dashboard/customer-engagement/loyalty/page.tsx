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

type StatusFilter = 'all' | 'active' | 'earned' | 'redeemed' | 'cancelled'

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

  async function loadData() {
    setLoading(true)
    setMessage('')

    try {
      const foundBusiness = await getBusinessForUser()
      setBusiness(foundBusiness)

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

  async function createWallet() {
    if (!business) return

    setMessage('')

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

    const { error } = await supabase
      .from('customer_loyalty')
      .update({ status })
      .eq('id', wallet.id)

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
    if (!confirm('Delete this loyalty wallet?')) return

    const { error } = await supabase
      .from('customer_loyalty')
      .delete()
      .eq('id', wallet.id)

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
    const totalRequired = active.reduce((sum, wallet) => sum + Number(wallet.visits_required || 0), 0)
    const totalCompleted = active.reduce((sum, wallet) => sum + Number(wallet.visits_completed || 0), 0)

    return {
      active: active.length,
      earned: earned.length,
      redeemed: redeemed.length,
      completionRate: totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0,
    }
  }, [wallets])

  if (loading) {
    return <div className="text-white">Loading loyalty...</div>
  }

  return (
    <div>
      <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-slate-400">Customer Engagement</p>
          <h1 className="mb-2 text-4xl font-bold">Loyalty</h1>
          <p className="max-w-3xl text-slate-500">
            Create and manage visit-based loyalty wallets for customers.
            {business?.business_name ? ` Connected to ${business.business_name}.` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950"
        >
          Refresh
        </button>
      </section>

      {message && (
        <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
          {message}
        </div>
      )}

      <section className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard label="Active wallets" value={stats.active} />
        <StatCard label="Rewards earned" value={stats.earned} />
        <StatCard label="Rewards redeemed" value={stats.redeemed} />
        <StatCard label="Completion rate" value={`${stats.completionRate}%`} />
      </section>

      <section className="mb-8 grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-2 text-2xl font-bold">Create loyalty wallet</h2>
          <p className="mb-6 text-slate-400">
            Assign a reward target to a customer. Progress appears in their customer portal.
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
              disabled={saving}
              className="w-full rounded-xl bg-white px-5 py-3 font-bold text-slate-950 disabled:opacity-50"
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
  onAddVisit,
  onRemoveVisit,
  onRedeem,
  onReactivate,
  onCancel,
  onDelete,
}: {
  wallet: LoyaltyWithCustomer
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
              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10"
            >
              - Visit
            </button>

            <button
              type="button"
              onClick={onAddVisit}
              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10"
            >
              + Visit
            </button>
          </div>

          {status === 'redeemed' || status === 'cancelled' ? (
            <button
              type="button"
              onClick={onReactivate}
              className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
            >
              Reactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={onRedeem}
              className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
            >
              Redeem reward
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-300 hover:bg-amber-500/20"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/20"
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-8 text-center text-slate-500">
      {message}
    </div>
  )
}
