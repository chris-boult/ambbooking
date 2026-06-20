'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string | null
  slug: string | null
}

type MembershipPlan = {
  id: string
  business_id: string
  name: string
  description: string | null
  status: string | null
  billing_interval: string | null
  monthly_amount: number | null
  included_sessions: number | null
  rollover_sessions: boolean | null
  stripe_price_id: string | null
  stripe_product_id: string | null
  membership_type?: string | null
  joining_fee?: number | null
  discount_percent?: number | null
  priority_booking?: boolean | null
  member_only_pricing?: boolean | null
  free_addons?: boolean | null
  early_access?: boolean | null
  featured?: boolean | null
  created_at: string | null
}

type Customer = {
  id: string
  business_id: string
  first_name: string
  last_name: string | null
  email: string | null
}

type CustomerMembership = {
  id: string
  business_id: string
  customer_id: string
  membership_plan_id: string | null
  membership_name: string
  status: string | null
  billing_interval: string | null
  monthly_amount: number | null
  included_sessions: number | null
  sessions_used: number | null
  current_period_start: string | null
  current_period_end: string | null
  stripe_subscription_id: string | null
  customers?:
    | {
        first_name: string
        last_name: string | null
        email: string | null
      }
    | {
        first_name: string
        last_name: string | null
        email: string | null
      }[]
    | null
}

function joinOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] || null
  return value
}

function money(value: number | string | null | undefined) {
  return `£${Number(value || 0).toFixed(2)}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function customerName(value: Customer | CustomerMembership['customers']) {
  const customer = joinOne(value as any)
  if (!customer) return 'Unknown customer'
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Unknown customer'
}

function sessionsRemaining(membership: CustomerMembership) {
  return Math.max(0, Number(membership.included_sessions || 0) - Number(membership.sessions_used || 0))
}

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

function endOfCurrentMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
}

export default function MembershipsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [memberships, setMemberships] = useState<CustomerMembership[]>([])
  const [tab, setTab] = useState<'plans' | 'members' | 'reporting'>('plans')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stripeLoadingId, setStripeLoadingId] = useState('')
  const [message, setMessage] = useState('')

  const [planName, setPlanName] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [planAmount, setPlanAmount] = useState('49')
  const [planInterval, setPlanInterval] = useState('monthly')
  const [planSessions, setPlanSessions] = useState('4')
  const [planType, setPlanType] = useState('session_based')
  const [joiningFee, setJoiningFee] = useState('0')
  const [discountPercent, setDiscountPercent] = useState('0')
  const [priorityBooking, setPriorityBooking] = useState(false)
  const [memberOnlyPricing, setMemberOnlyPricing] = useState(false)
  const [freeAddons, setFreeAddons] = useState(false)
  const [earlyAccess, setEarlyAccess] = useState(false)
  const [rolloverSessions, setRolloverSessions] = useState(false)
  const [featured, setFeatured] = useState(false)

  const [assignCustomerId, setAssignCustomerId] = useState('')
  const [assignPlanId, setAssignPlanId] = useState('')
  const [assignStartDate, setAssignStartDate] = useState(todayValue())
  const [assignEndDate, setAssignEndDate] = useState(endOfCurrentMonth())

  useEffect(() => {
    loadData()
  }, [])

  async function getBusinessForUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('You need to be logged in.')

    const { data: ownedBusiness } = await supabase
      .from('businesses')
      .select('id,business_name,slug')
      .eq('user_id', user.id)
      .maybeSingle()

    if (ownedBusiness) return ownedBusiness as Business

    const { data: firstBusiness } = await supabase
      .from('businesses')
      .select('id,business_name,slug')
      .limit(1)
      .maybeSingle()

    if (!firstBusiness) throw new Error('No business found.')
    return firstBusiness as Business
  }

  async function loadData() {
    setLoading(true)
    setMessage('')

    try {
      const foundBusiness = await getBusinessForUser()
      setBusiness(foundBusiness)

      const [plansResult, customersResult, membershipsResult] = await Promise.all([
        supabase
          .from('membership_plans')
          .select('*')
          .eq('business_id', foundBusiness.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('customers')
          .select('id,business_id,first_name,last_name,email')
          .eq('business_id', foundBusiness.id)
          .order('first_name'),
        supabase
          .from('customer_memberships')
          .select('*, customers(first_name,last_name,email)')
          .eq('business_id', foundBusiness.id)
          .order('created_at', { ascending: false }),
      ])

      if (plansResult.error || customersResult.error || membershipsResult.error) {
        setMessage(
          plansResult.error?.message ||
            customersResult.error?.message ||
            membershipsResult.error?.message ||
            'Could not load memberships.'
        )
      } else {
        setPlans((plansResult.data as MembershipPlan[]) || [])
        setCustomers((customersResult.data as Customer[]) || [])
        setMemberships((membershipsResult.data as unknown as CustomerMembership[]) || [])
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load memberships.')
    }

    setLoading(false)
  }

  async function createPlan() {
    if (!business) return

    if (!planName.trim()) {
      setMessage('Enter a plan name.')
      return
    }

    setSaving(true)
    setMessage('')

    const { data, error } = await supabase
      .from('membership_plans')
      .insert({
        business_id: business.id,
        name: planName.trim(),
        description: planDescription.trim() || null,
        status: 'active',
        billing_interval: planInterval,
        monthly_amount: Number(planAmount || 0),
        included_sessions: Number(planSessions || 0),
        membership_type: planType,
        joining_fee: Number(joiningFee || 0),
        discount_percent: Number(discountPercent || 0),
        priority_booking: priorityBooking,
        member_only_pricing: memberOnlyPricing,
        free_addons: freeAddons,
        early_access: earlyAccess,
        rollover_sessions: rolloverSessions,
        featured,
      })
      .select('*')
      .single()

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setPlans((current) => [data as MembershipPlan, ...current])
    setPlanName('')
    setPlanDescription('')
    setPlanAmount('49')
    setPlanInterval('monthly')
    setPlanSessions('4')
    setPlanType('session_based')
    setJoiningFee('0')
    setDiscountPercent('0')
    setPriorityBooking(false)
    setMemberOnlyPricing(false)
    setFreeAddons(false)
    setEarlyAccess(false)
    setRolloverSessions(false)
    setFeatured(false)

    setSaving(false)
    setMessage('Membership plan created. Now click Create Stripe price on the plan.')
  }

  async function createStripePrice(planId: string) {
    setMessage('')
    setStripeLoadingId(planId)

    const response = await fetch('/api/memberships/create-stripe-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setMessage(result?.error || 'Could not create Stripe price.')
      setStripeLoadingId('')
      return
    }

    setPlans((current) =>
      current.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              stripe_product_id: result.stripe_product_id,
              stripe_price_id: result.stripe_price_id,
            }
          : plan
      )
    )

    setStripeLoadingId('')
    setMessage('Stripe product and recurring price created.')
  }

  async function assignMembership() {
    if (!business) return

    const plan = plans.find((item) => item.id === assignPlanId)

    if (!assignCustomerId || !plan) {
      setMessage('Choose a customer and membership plan.')
      return
    }

    setSaving(true)
    setMessage('')

    const { data, error } = await supabase
      .from('customer_memberships')
      .insert({
        business_id: business.id,
        customer_id: assignCustomerId,
        membership_plan_id: plan.id,
        membership_name: plan.name,
        status: 'active',
        billing_interval: plan.billing_interval,
        monthly_amount: plan.monthly_amount,
        included_sessions: plan.included_sessions,
        sessions_used: 0,
        current_period_start: assignStartDate,
        current_period_end: assignEndDate,
      })
      .select('*, customers(first_name,last_name,email)')
      .single()

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setMemberships((current) => [data as unknown as CustomerMembership, ...current])
    setAssignCustomerId('')
    setAssignPlanId('')
    setSaving(false)
    setMessage('Membership assigned.')
  }

  async function updateMembershipStatus(id: string, status: string) {
    const { error } = await supabase
      .from('customer_memberships')
      .update({ status })
      .eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMemberships((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  const stats = useMemo(() => {
    const active = memberships.filter((item) => item.status === 'active')
    const paused = memberships.filter((item) => item.status === 'paused')
    const cancelled = memberships.filter((item) => item.status === 'cancelled')
    const mrr = active.reduce((sum, item) => sum + Number(item.monthly_amount || 0), 0)
    const included = active.reduce((sum, item) => sum + Number(item.included_sessions || 0), 0)
    const used = active.reduce((sum, item) => sum + Number(item.sessions_used || 0), 0)
    const utilisation = included > 0 ? Math.round((used / included) * 100) : 0

    return {
      active: active.length,
      paused: paused.length,
      cancelled: cancelled.length,
      mrr,
      included,
      used,
      utilisation,
    }
  }, [memberships])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020617] p-8 text-white">
        <p className="text-slate-400">Loading memberships...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#020617] p-6 text-white md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-300">
              Membership engine Phase 2
            </p>
            <h1 className="mt-2 text-4xl font-black">Memberships</h1>
            <p className="mt-3 max-w-3xl text-slate-400">
              Create membership plans, connect them to Stripe, sell subscriptions and manage recurring revenue.
            </p>
            {business?.slug && (
              <p className="mt-2 text-sm text-slate-500">
                Public membership page: /book/{business.slug}/memberships
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={loadData}
            className="rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950 hover:bg-cyan-300"
          >
            Refresh
          </button>
        </section>

        {message && (
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
            {message}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-5">
          <Kpi title="Membership MRR" value={money(stats.mrr)} />
          <Kpi title="Active members" value={String(stats.active)} />
          <Kpi title="Paused" value={String(stats.paused)} />
          <Kpi title="Cancelled" value={String(stats.cancelled)} />
          <Kpi title="Utilisation" value={`${stats.utilisation}%`} />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-wrap gap-2">
            {[
              ['plans', 'Plans'],
              ['members', 'Members'],
              ['reporting', 'Reporting'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key as typeof tab)}
                className={`rounded-2xl px-4 py-3 text-sm font-black ${
                  tab === key
                    ? 'bg-white text-slate-950'
                    : 'border border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {tab === 'plans' && (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Create membership plan">
              <div className="space-y-4">
                <LabelledInput
                  label="Plan name"
                  value={planName}
                  onChange={setPlanName}
                  placeholder="Gold Membership"
                />

                <LabelledTextarea
                  label="Description"
                  value={planDescription}
                  onChange={setPlanDescription}
                  placeholder="Describe what members get."
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <LabelledInput
                    label="Membership price (£)"
                    helper="Amount charged each billing cycle."
                    value={planAmount}
                    onChange={setPlanAmount}
                    type="number"
                  />

                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-300">Billing frequency</span>
                    <select
                      value={planInterval}
                      onChange={(event) => setPlanInterval(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <span className="mt-2 block text-xs text-slate-500">How often the customer is billed.</span>
                  </label>

                  <LabelledInput
                    label="Included sessions"
                    helper="Number of appointments included per billing cycle."
                    value={planSessions}
                    onChange={setPlanSessions}
                    type="number"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-300">Membership type</span>
                    <select
                      value={planType}
                      onChange={(event) => setPlanType(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none"
                    >
                      <option value="session_based">Session Based</option>
                      <option value="unlimited">Unlimited</option>
                      <option value="discount_club">Discount Club</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                    <span className="mt-2 block text-xs text-slate-500">How this membership should behave.</span>
                  </label>

                  <LabelledInput
                    label="Joining fee (£)"
                    helper="Optional one-off setup fee."
                    value={joiningFee}
                    onChange={setJoiningFee}
                    type="number"
                  />

                  <LabelledInput
                    label="Discount %"
                    helper="Used for discount or hybrid memberships."
                    value={discountPercent}
                    onChange={setDiscountPercent}
                    type="number"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Check label="Priority booking" checked={priorityBooking} setChecked={setPriorityBooking} />
                  <Check label="Member-only pricing" checked={memberOnlyPricing} setChecked={setMemberOnlyPricing} />
                  <Check label="Free add-ons" checked={freeAddons} setChecked={setFreeAddons} />
                  <Check label="Early access" checked={earlyAccess} setChecked={setEarlyAccess} />
                  <Check label="Rollover unused sessions" checked={rolloverSessions} setChecked={setRolloverSessions} />
                  <Check label="Featured public plan" checked={featured} setChecked={setFeatured} />
                </div>

                <button
                  type="button"
                  onClick={createPlan}
                  disabled={saving}
                  className="w-full rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create plan'}
                </button>
              </div>
            </Panel>

            <Panel title="Membership plans">
              <div className="space-y-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-lg font-black">{plan.name}</p>
                        <p className="mt-1 text-slate-400">{plan.description || 'No description'}</p>
                        <p className="mt-2 text-sm text-cyan-300">
                          {money(plan.monthly_amount)} · {plan.billing_interval || 'monthly'} ·{' '}
                          {plan.included_sessions || 0} sessions · {plan.membership_type || 'session_based'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Stripe price: {plan.stripe_price_id || 'Not connected yet'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => createStripePrice(plan.id)}
                        disabled={stripeLoadingId === plan.id}
                        className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-50"
                      >
                        {stripeLoadingId === plan.id
                          ? 'Creating...'
                          : plan.stripe_price_id
                            ? 'Refresh Stripe price'
                            : 'Create Stripe price'}
                      </button>
                    </div>
                  </div>
                ))}

                {plans.length === 0 && <EmptyState message="No membership plans yet." />}
              </div>
            </Panel>
          </section>
        )}

        {tab === 'members' && (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Assign membership manually">
              <div className="space-y-4">
                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-300">Customer</span>
                  <select
                    value={assignCustomerId}
                    onChange={(event) => setAssignCustomerId(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none"
                  >
                    <option value="">Choose customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customerName(customer)} {customer.email ? `· ${customer.email}` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-300">Membership plan</span>
                  <select
                    value={assignPlanId}
                    onChange={(event) => setAssignPlanId(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none"
                  >
                    <option value="">Choose plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} · {money(plan.monthly_amount)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <LabelledInput label="Period start" value={assignStartDate} onChange={setAssignStartDate} type="date" />
                  <LabelledInput label="Period end" value={assignEndDate} onChange={setAssignEndDate} type="date" />
                </div>

                <button
                  type="button"
                  onClick={assignMembership}
                  disabled={saving}
                  className="w-full rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                >
                  Assign membership
                </button>
              </div>
            </Panel>

            <Panel title="Customer memberships">
              <div className="space-y-3">
                {memberships.map((membership) => (
                  <div key={membership.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-lg font-black">{membership.membership_name}</p>
                        <p className="mt-1 text-slate-400">
                          {customerName(membership.customers)} · {money(membership.monthly_amount)}
                        </p>
                        <p className="mt-2 text-sm text-cyan-300">
                          {sessionsRemaining(membership)} of {membership.included_sessions || 0} sessions remaining
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                          {formatDate(membership.current_period_start)} - {formatDate(membership.current_period_end)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <StatusPill value={membership.status || 'active'} />
                        <button
                          type="button"
                          onClick={() =>
                            updateMembershipStatus(
                              membership.id,
                              membership.status === 'paused' ? 'active' : 'paused'
                            )
                          }
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:bg-white/10"
                        >
                          {membership.status === 'paused' ? 'Resume' : 'Pause'}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateMembershipStatus(membership.id, 'cancelled')}
                          className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300 hover:bg-red-500/20"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {memberships.length === 0 && <EmptyState message="No customer memberships yet." />}
              </div>
            </Panel>
          </section>
        )}

        {tab === 'reporting' && (
          <Panel title="Membership reporting">
            <section className="grid gap-4 md:grid-cols-4">
              <Kpi title="Membership MRR" value={money(stats.mrr)} />
              <Kpi title="Active members" value={String(stats.active)} />
              <Kpi title="Sessions used" value={`${stats.used}/${stats.included}`} />
              <Kpi title="Utilisation" value={`${stats.utilisation}%`} />
            </section>
          </Panel>
        )}
      </div>
    </main>
  )
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <h2 className="mb-5 text-2xl font-black">{title}</h2>
      {children}
    </section>
  )
}

function LabelledInput({
  label,
  helper,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  helper?: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none placeholder:text-slate-600"
      />
      {helper && <span className="mt-2 block text-xs text-slate-500">{helper}</span>}
    </label>
  )
}

function LabelledTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-slate-300">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none placeholder:text-slate-600"
      />
    </label>
  )
}

function Check({
  label,
  checked,
  setChecked,
}: {
  label: string
  checked: boolean
  setChecked: (value: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950 px-4 py-4">
      <span className="font-bold">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => setChecked(event.target.checked)}
        className="h-5 w-5"
      />
    </label>
  )
}

function StatusPill({ value }: { value: string }) {
  const good = value === 'active'
  const warning = value === 'paused' || value === 'pending'
  const bad = value === 'cancelled' || value === 'inactive'

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${
        good
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
          : warning
            ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
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
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-slate-500">
      {message}
    </div>
  )
}
