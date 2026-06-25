'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { hasFeature } from '@/lib/features'

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

type MembershipBenefit = {
  id: string
  business_id: string
  membership_plan_id: string
  benefit: string
  display_order: number | null
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
  stripe_customer_id?: string | null
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

type MembershipUsage = {
  id: string
  business_id: string
  customer_membership_id: string
  customer_id: string | null
  booking_id: string | null
  sessions_used: number | null
  notes: string | null
  created_at: string | null
  usage_date: string | null
  usage_type: string | null
  benefit_name: string | null
  quantity: number | null
  created_by: string | null
  customer_memberships?:
    | {
        membership_name: string
        included_sessions: number | null
        sessions_used: number | null
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
    | {
        membership_name: string
        included_sessions: number | null
        sessions_used: number | null
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
      }[]
    | null
}

type TabKey = 'plans' | 'benefits' | 'members' | 'usage' | 'reporting'

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

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

function endOfCurrentMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
}

function customerName(value: Customer | CustomerMembership['customers']) {
  const customer = joinOne(value as any)
  if (!customer) return 'Unknown customer'
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Unknown customer'
}

function usageMembership(value: MembershipUsage) {
  return joinOne(value.customer_memberships as any)
}

function usageCustomerName(value: MembershipUsage) {
  const membership = usageMembership(value)
  return customerName(membership?.customers as any)
}

function sessionsRemaining(membership: CustomerMembership) {
  return Math.max(0, Number(membership.included_sessions || 0) - Number(membership.sessions_used || 0))
}

function planBenefits(planId: string, benefits: MembershipBenefit[]) {
  return benefits
    .filter((benefit) => benefit.membership_plan_id === planId)
    .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0))
}

export default function MembershipsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [featureAllowed, setFeatureAllowed] = useState<boolean | null>(null)
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [benefits, setBenefits] = useState<MembershipBenefit[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [memberships, setMemberships] = useState<CustomerMembership[]>([])
  const [usage, setUsage] = useState<MembershipUsage[]>([])
  const [tab, setTab] = useState<TabKey>('plans')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stripeLoadingId, setStripeLoadingId] = useState('')
  const [portalLoadingId, setPortalLoadingId] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')

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

  const [benefitPlanId, setBenefitPlanId] = useState('')
  const [benefitText, setBenefitText] = useState('')
  const [benefitOrder, setBenefitOrder] = useState('1')

  const [consumeMembershipId, setConsumeMembershipId] = useState('')
  const [consumeType, setConsumeType] = useState<'session' | 'benefit' | 'adjustment'>('session')
  const [consumeSessions, setConsumeSessions] = useState('1')
  const [consumeBenefit, setConsumeBenefit] = useState('')
  const [consumeQuantity, setConsumeQuantity] = useState('1')
  const [consumeDate, setConsumeDate] = useState(todayValue())
  const [consumeCreatedBy, setConsumeCreatedBy] = useState('')
  const [consumeNotes, setConsumeNotes] = useState('')

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

      const allowed = await hasFeature(supabase, foundBusiness.id, 'memberships')
      setFeatureAllowed(allowed)

      if (!allowed) {
        setLoading(false)
        return
      }

      const [plansResult, benefitsResult, customersResult, membershipsResult, usageResult] = await Promise.all([
        supabase
          .from('membership_plans')
          .select('*')
          .eq('business_id', foundBusiness.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('membership_plan_benefits')
          .select('*')
          .eq('business_id', foundBusiness.id)
          .order('display_order', { ascending: true }),
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
        supabase
          .from('membership_usage')
          .select('*, customer_memberships(membership_name,included_sessions,sessions_used, customers(first_name,last_name,email))')
          .eq('business_id', foundBusiness.id)
          .order('usage_date', { ascending: false })
          .order('created_at', { ascending: false }),
      ])

      if (
        plansResult.error ||
        benefitsResult.error ||
        customersResult.error ||
        membershipsResult.error ||
        usageResult.error
      ) {
        setMessage(
          plansResult.error?.message ||
            benefitsResult.error?.message ||
            customersResult.error?.message ||
            membershipsResult.error?.message ||
            usageResult.error?.message ||
            'Could not load memberships.'
        )
      } else {
        setPlans((plansResult.data as MembershipPlan[]) || [])
        setBenefits((benefitsResult.data as MembershipBenefit[]) || [])
        setCustomers((customersResult.data as Customer[]) || [])
        setMemberships((membershipsResult.data as unknown as CustomerMembership[]) || [])
        setUsage((usageResult.data as unknown as MembershipUsage[]) || [])
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
    const { error } = await supabase.from('customer_memberships').update({ status }).eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMemberships((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  async function openStripePortal(membership: CustomerMembership) {
    if (!membership.stripe_customer_id) {
      setMessage('This is a manual membership, so there is no Stripe billing profile to manage.')
      return
    }

    setMessage('')
    setPortalLoadingId(membership.id)

    const response = await fetch('/api/memberships/create-portal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stripeCustomerId: membership.stripe_customer_id,
        returnUrl: `${window.location.origin}/business/dashboard/memberships`,
      }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.url) {
      setMessage(result?.error || 'Could not open Stripe billing portal.')
      setPortalLoadingId('')
      return
    }

    window.location.href = result.url
  }

  async function createBenefit() {
    if (!business) return

    if (!benefitPlanId || !benefitText.trim()) {
      setMessage('Choose a plan and enter the benefit.')
      return
    }

    setSaving(true)
    setMessage('')

    const { data, error } = await supabase
      .from('membership_plan_benefits')
      .insert({
        business_id: business.id,
        membership_plan_id: benefitPlanId,
        benefit: benefitText.trim(),
        display_order: Number(benefitOrder || 1),
      })
      .select('*')
      .single()

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setBenefits((current) =>
      [...current, data as MembershipBenefit].sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0))
    )
    setBenefitText('')
    setBenefitOrder(String(Number(benefitOrder || 1) + 1))
    setSaving(false)
    setMessage('Benefit added to membership plan.')
  }

  async function deleteBenefit(id: string) {
    const { error } = await supabase.from('membership_plan_benefits').delete().eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    setBenefits((current) => current.filter((benefit) => benefit.id !== id))
    setMessage('Benefit removed.')
  }

  async function consumeMembershipUsage() {
    if (!business) return

    const membership = memberships.find((item) => item.id === consumeMembershipId)
    if (!membership) {
      setMessage('Choose a membership to consume usage against.')
      return
    }

    const sessionsToUse = consumeType === 'session' || consumeType === 'adjustment' ? Math.max(0, Number(consumeSessions || 0)) : 0
    const quantity = Math.max(1, Number(consumeQuantity || 1))

    if (consumeType === 'session' && sessionsToUse <= 0) {
      setMessage('Enter the number of sessions to consume.')
      return
    }

    if (consumeType === 'benefit' && !consumeBenefit.trim()) {
      setMessage('Choose or enter the benefit being redeemed.')
      return
    }

    const remaining = sessionsRemaining(membership)
    if (consumeType === 'session' && sessionsToUse > remaining) {
      setMessage(`This member only has ${remaining} sessions remaining.`)
      return
    }

    setSaving(true)
    setMessage('')

    const nextSessionsUsed = Number(membership.sessions_used || 0) + sessionsToUse

    const { data: usageData, error: usageError } = await supabase
      .from('membership_usage')
      .insert({
        business_id: business.id,
        customer_membership_id: membership.id,
        customer_id: membership.customer_id,
        booking_id: null,
        sessions_used: sessionsToUse,
        notes: consumeNotes.trim() || null,
        usage_date: consumeDate,
        usage_type: consumeType,
        benefit_name: consumeType === 'benefit' ? consumeBenefit.trim() : null,
        quantity,
        created_by: consumeCreatedBy.trim() || null,
      })
      .select('*, customer_memberships(membership_name,included_sessions,sessions_used, customers(first_name,last_name,email))')
      .single()

    if (usageError) {
      setMessage(usageError.message)
      setSaving(false)
      return
    }

    if (sessionsToUse > 0) {
      const { error: updateError } = await supabase
        .from('customer_memberships')
        .update({ sessions_used: nextSessionsUsed })
        .eq('id', membership.id)

      if (updateError) {
        setMessage(updateError.message)
        setSaving(false)
        return
      }

      setMemberships((current) =>
        current.map((item) => (item.id === membership.id ? { ...item, sessions_used: nextSessionsUsed } : item))
      )
    }

    setUsage((current) => [usageData as unknown as MembershipUsage, ...current])
    setConsumeSessions('1')
    setConsumeQuantity('1')
    setConsumeBenefit('')
    setConsumeNotes('')
    setSaving(false)
    setMessage('Membership usage recorded.')
  }

  function exportUsageCsv() {
    const rows = [
      ['Date', 'Customer', 'Membership', 'Usage Type', 'Benefit', 'Sessions Used', 'Quantity', 'Created By', 'Notes'],
      ...filteredUsage.map((item) => {
        const membership = usageMembership(item)
        return [
          item.usage_date || '',
          usageCustomerName(item),
          membership?.membership_name || '',
          item.usage_type || 'session',
          item.benefit_name || '',
          String(item.sessions_used || 0),
          String(item.quantity || 1),
          item.created_by || '',
          item.notes || '',
        ]
      }),
    ]

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `membership-usage-${todayValue()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const filteredMemberships = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return memberships
    return memberships.filter((membership) => {
      return [membership.membership_name, customerName(membership.customers), membership.status || '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [memberships, search])

  const filteredUsage = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return usage
    return usage.filter((item) => {
      const membership = usageMembership(item)
      return [
        usageCustomerName(item),
        membership?.membership_name || '',
        item.usage_type || '',
        item.benefit_name || '',
        item.notes || '',
        item.created_by || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [usage, search])

  const stats = useMemo(() => {
    const active = memberships.filter((item) => item.status === 'active')
    const paused = memberships.filter((item) => item.status === 'paused')
    const cancelled = memberships.filter((item) => item.status === 'cancelled')
    const mrr = active.reduce((sum, item) => sum + Number(item.monthly_amount || 0), 0)
    const included = active.reduce((sum, item) => sum + Number(item.included_sessions || 0), 0)
    const used = active.reduce((sum, item) => sum + Number(item.sessions_used || 0), 0)
    const remaining = Math.max(0, included - used)
    const utilisation = included > 0 ? Math.round((used / included) * 100) : 0
    const benefitRedemptions = usage
      .filter((item) => item.usage_type === 'benefit')
      .reduce((sum, item) => sum + Number(item.quantity || 1), 0)
    const revenuePerMember = active.length > 0 ? mrr / active.length : 0
    const avgSessionsUsed = active.length > 0 ? used / active.length : 0
    const remainingLiability = included > 0 && mrr > 0 ? (remaining / included) * mrr : 0

    return {
      active: active.length,
      paused: paused.length,
      cancelled: cancelled.length,
      mrr,
      included,
      used,
      remaining,
      utilisation,
      benefitRedemptions,
      revenuePerMember,
      avgSessionsUsed,
      remainingLiability,
      benefitCount: benefits.length,
    }
  }, [memberships, usage, benefits])

  const topPlans = useMemo(() => {
    return plans
      .map((plan) => {
        const planMembers = memberships.filter((membership) => membership.membership_plan_id === plan.id)
        const activeMembers = planMembers.filter((membership) => membership.status === 'active')
        const revenue = activeMembers.reduce((sum, membership) => sum + Number(membership.monthly_amount || 0), 0)
        const used = activeMembers.reduce((sum, membership) => sum + Number(membership.sessions_used || 0), 0)
        const included = activeMembers.reduce((sum, membership) => sum + Number(membership.included_sessions || 0), 0)
        return { plan, members: activeMembers.length, revenue, used, included }
      })
      .sort((a, b) => b.revenue - a.revenue)
  }, [plans, memberships])

  const topMembers = useMemo(() => {
    return [...memberships].sort((a, b) => Number(b.sessions_used || 0) - Number(a.sessions_used || 0)).slice(0, 8)
  }, [memberships])

  const selectedConsumeMembership = memberships.find((item) => item.id === consumeMembershipId)
  const selectedConsumeBenefits = selectedConsumeMembership?.membership_plan_id
    ? planBenefits(selectedConsumeMembership.membership_plan_id, benefits)
    : []

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020617] p-8 text-white">
        <p className="text-slate-400">Loading memberships...</p>
      </main>
    )
  }

  if (featureAllowed === false) {
    return (
      <main className="min-h-screen bg-[#020617] p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-300">Feature unavailable</p>
          <h1 className="mt-3 text-4xl font-black">Memberships are not enabled</h1>
          <p className="mt-4 text-slate-400">
            This business does not currently have access to the memberships feature.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#020617] p-6 text-white md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-300">Membership engine V3</p>
            <h1 className="mt-2 text-4xl font-black">Memberships</h1>
            <p className="mt-3 max-w-3xl text-slate-400">
              Create plans, manage benefits, assign members, consume sessions manually and track every membership usage event.
            </p>
            {business?.slug && <p className="mt-2 text-sm text-slate-500">Public membership page: /book/{business.slug}/memberships</p>}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search members or usage..."
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600"
            />
            <button
              type="button"
              onClick={loadData}
              className="rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950 hover:bg-cyan-300"
            >
              Refresh
            </button>
          </div>
        </section>

        {message && <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">{message}</div>}

        <section className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
          <Kpi title="Membership MRR" value={money(stats.mrr)} />
          <Kpi title="Active members" value={String(stats.active)} />
          <Kpi title="Paused" value={String(stats.paused)} />
          <Kpi title="Cancelled" value={String(stats.cancelled)} />
          <Kpi title="Sessions used" value={String(stats.used)} />
          <Kpi title="Remaining" value={String(stats.remaining)} />
          <Kpi title="Benefits" value={String(stats.benefitCount)} />
          <Kpi title="Utilisation" value={`${stats.utilisation}%`} />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-wrap gap-2">
            {[
              ['plans', 'Plans'],
              ['benefits', 'Benefits'],
              ['members', 'Members'],
              ['usage', 'Usage'],
              ['reporting', 'Reporting'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key as TabKey)}
                className={`rounded-2xl px-4 py-3 text-sm font-black ${
                  tab === key ? 'bg-white text-slate-950' : 'border border-white/10 text-slate-300 hover:bg-white/10'
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
                <LabelledInput label="Plan name" value={planName} onChange={setPlanName} placeholder="Gold Membership" />
                <LabelledTextarea label="Description" value={planDescription} onChange={setPlanDescription} placeholder="Describe what members get." />

                <div className="grid gap-4 md:grid-cols-3">
                  <LabelledInput label="Membership price (£)" helper="Amount charged each billing cycle." value={planAmount} onChange={setPlanAmount} type="number" />

                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-300">Billing frequency</span>
                    <select value={planInterval} onChange={(event) => setPlanInterval(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <span className="mt-2 block text-xs text-slate-500">How often the customer is billed.</span>
                  </label>

                  <LabelledInput label="Included sessions" helper="Number of appointments included per billing cycle." value={planSessions} onChange={setPlanSessions} type="number" />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-300">Membership type</span>
                    <select value={planType} onChange={(event) => setPlanType(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                      <option value="session_based">Session Based</option>
                      <option value="unlimited">Unlimited</option>
                      <option value="discount_club">Discount Club</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                    <span className="mt-2 block text-xs text-slate-500">How this membership should behave.</span>
                  </label>

                  <LabelledInput label="Joining fee (£)" helper="Optional one-off setup fee." value={joiningFee} onChange={setJoiningFee} type="number" />
                  <LabelledInput label="Discount %" helper="Used for discount or hybrid memberships." value={discountPercent} onChange={setDiscountPercent} type="number" />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Check label="Priority booking" checked={priorityBooking} setChecked={setPriorityBooking} />
                  <Check label="Member-only pricing" checked={memberOnlyPricing} setChecked={setMemberOnlyPricing} />
                  <Check label="Free add-ons" checked={freeAddons} setChecked={setFreeAddons} />
                  <Check label="Early access" checked={earlyAccess} setChecked={setEarlyAccess} />
                  <Check label="Rollover unused sessions" checked={rolloverSessions} setChecked={setRolloverSessions} />
                  <Check label="Featured public plan" checked={featured} setChecked={setFeatured} />
                </div>

                <button type="button" onClick={createPlan} disabled={saving} className="w-full rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create plan'}
                </button>
              </div>
            </Panel>

            <Panel title="Membership plans">
              <div className="space-y-3">
                {plans.map((plan) => {
                  const benefitsForPlan = planBenefits(plan.id, benefits)
                  const activeMembers = memberships.filter((membership) => membership.membership_plan_id === plan.id && membership.status === 'active')
                  const planMrr = activeMembers.reduce((sum, membership) => sum + Number(membership.monthly_amount || 0), 0)

                  return (
                    <div key={plan.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-black">{plan.name}</p>
                            {plan.featured && <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-200">Featured</span>}
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{benefitsForPlan.length} benefits</span>
                          </div>
                          <p className="mt-1 text-slate-400">{plan.description || 'No description'}</p>
                          <p className="mt-2 text-sm text-cyan-300">
                            {money(plan.monthly_amount)} · {plan.billing_interval || 'monthly'} · {plan.included_sessions || 0} sessions · {plan.membership_type || 'session_based'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Active members: {activeMembers.length} · Plan MRR: {money(planMrr)} · Stripe price: {plan.stripe_price_id || 'Not connected yet'}
                          </p>
                        </div>

                        <button type="button" onClick={() => createStripePrice(plan.id)} disabled={stripeLoadingId === plan.id} className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-50">
                          {stripeLoadingId === plan.id ? 'Creating...' : plan.stripe_price_id ? 'Refresh Stripe price' : 'Create Stripe price'}
                        </button>
                      </div>
                    </div>
                  )
                })}

                {plans.length === 0 && <EmptyState message="No membership plans yet." />}
              </div>
            </Panel>
          </section>
        )}

        {tab === 'benefits' && (
          <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <Panel title="Add benefit to plan">
              <div className="space-y-4">
                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-300">Membership plan</span>
                  <select value={benefitPlanId} onChange={(event) => setBenefitPlanId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                    <option value="">Choose plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </label>

                <LabelledInput label="Benefit" value={benefitText} onChange={setBenefitText} placeholder="Priority booking, free add-on, 10% discount..." />
                <LabelledInput label="Display order" value={benefitOrder} onChange={setBenefitOrder} type="number" helper="Lower numbers show first on the public membership page." />

                <button type="button" onClick={createBenefit} disabled={saving} className="w-full rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add benefit'}
                </button>
              </div>
            </Panel>

            <Panel title="Plan benefits">
              <div className="space-y-4">
                {plans.map((plan) => {
                  const benefitsForPlan = planBenefits(plan.id, benefits)
                  return (
                    <div key={plan.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-lg font-black">{plan.name}</p>
                          <p className="text-sm text-slate-500">{benefitsForPlan.length} benefits attached</p>
                        </div>
                        <button type="button" onClick={() => setBenefitPlanId(plan.id)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black hover:bg-white/10">
                          Add here
                        </button>
                      </div>

                      <div className="mt-4 space-y-2">
                        {benefitsForPlan.map((benefit) => (
                          <div key={benefit.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950 p-3">
                            <div>
                              <p className="font-bold">{benefit.benefit}</p>
                              <p className="text-xs text-slate-500">Display order {benefit.display_order || 0}</p>
                            </div>
                            <button type="button" onClick={() => deleteBenefit(benefit.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300 hover:bg-red-500/20">
                              Remove
                            </button>
                          </div>
                        ))}

                        {benefitsForPlan.length === 0 && <p className="text-sm text-slate-500">No benefits added yet.</p>}
                      </div>
                    </div>
                  )
                })}

                {plans.length === 0 && <EmptyState message="Create a membership plan before adding benefits." />}
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
                  <select value={assignCustomerId} onChange={(event) => setAssignCustomerId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
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
                  <select value={assignPlanId} onChange={(event) => setAssignPlanId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
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

                <button type="button" onClick={assignMembership} disabled={saving} className="w-full rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
                  Assign membership
                </button>
              </div>
            </Panel>

            <Panel title="Customer memberships">
              <div className="space-y-3">
                {filteredMemberships.map((membership) => {
                  const benefitsForMembership = membership.membership_plan_id ? planBenefits(membership.membership_plan_id, benefits) : []
                  const memberUsage = usage.filter((item) => item.customer_membership_id === membership.id)
                  const lastUsed = memberUsage[0]

                  return (
                    <div key={membership.id} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-lg font-black">{membership.membership_name}</p>
                          <p className="mt-1 text-slate-400">
                            {customerName(membership.customers)} · {money(membership.monthly_amount)}
                          </p>
                          <p className="mt-2 text-sm text-cyan-300">
                            {sessionsRemaining(membership)} of {membership.included_sessions || 0} sessions remaining
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                            {formatDate(membership.current_period_start)} - {formatDate(membership.current_period_end)} · Last used: {lastUsed?.usage_date ? formatDate(lastUsed.usage_date) : 'Never'}
                          </p>
                          {benefitsForMembership.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {benefitsForMembership.map((benefit) => (
                                <span key={benefit.id} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                                  {benefit.benefit}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[190px]">
                          <StatusPill value={membership.status || 'active'} />

                          <button type="button" onClick={() => { setConsumeMembershipId(membership.id); setTab('usage') }} className="w-full rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/20">
                            Consume usage
                          </button>

                          {membership.stripe_customer_id && (
                            <button type="button" onClick={() => openStripePortal(membership)} disabled={portalLoadingId === membership.id} className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-100 disabled:opacity-50">
                              {portalLoadingId === membership.id ? 'Opening...' : 'Manage billing'}
                            </button>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => updateMembershipStatus(membership.id, membership.status === 'paused' ? 'active' : 'paused')} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black transition hover:bg-white/10">
                              {membership.status === 'paused' ? 'Resume' : 'Pause'}
                            </button>
                            <button type="button" onClick={() => updateMembershipStatus(membership.id, 'cancelled')} className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/20">
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {filteredMemberships.length === 0 && <EmptyState message="No customer memberships found." />}
              </div>
            </Panel>
          </section>
        )}

        {tab === 'usage' && (
          <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <Panel title="Manual session consumption">
              <div className="space-y-4">
                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-300">Customer membership</span>
                  <select value={consumeMembershipId} onChange={(event) => setConsumeMembershipId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                    <option value="">Choose membership</option>
                    {memberships.filter((membership) => membership.status !== 'cancelled').map((membership) => (
                      <option key={membership.id} value={membership.id}>
                        {customerName(membership.customers)} · {membership.membership_name} · {sessionsRemaining(membership)} left
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-300">Usage type</span>
                  <select value={consumeType} onChange={(event) => setConsumeType(event.target.value as typeof consumeType)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                    <option value="session">Session consumption</option>
                    <option value="benefit">Benefit redemption</option>
                    <option value="adjustment">Manual adjustment</option>
                  </select>
                </label>

                {(consumeType === 'session' || consumeType === 'adjustment') && (
                  <LabelledInput label="Sessions used" value={consumeSessions} onChange={setConsumeSessions} type="number" helper="This updates the member's sessions_used balance." />
                )}

                {consumeType === 'benefit' && (
                  <>
                    <label>
                      <span className="mb-2 block text-sm font-bold text-slate-300">Benefit redeemed</span>
                      <select value={consumeBenefit} onChange={(event) => setConsumeBenefit(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                        <option value="">Choose benefit</option>
                        {selectedConsumeBenefits.map((benefit) => (
                          <option key={benefit.id} value={benefit.benefit}>
                            {benefit.benefit}
                          </option>
                        ))}
                      </select>
                    </label>
                    <LabelledInput label="Quantity" value={consumeQuantity} onChange={setConsumeQuantity} type="number" />
                  </>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <LabelledInput label="Usage date" value={consumeDate} onChange={setConsumeDate} type="date" />
                  <LabelledInput label="Created by" value={consumeCreatedBy} onChange={setConsumeCreatedBy} placeholder="Staff name" />
                </div>

                <LabelledTextarea label="Notes" value={consumeNotes} onChange={setConsumeNotes} placeholder="Optional audit note." />

                {selectedConsumeMembership && (
                  <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">
                    Current balance: {sessionsRemaining(selectedConsumeMembership)} of {selectedConsumeMembership.included_sessions || 0} sessions remaining.
                  </div>
                )}

                <button type="button" onClick={consumeMembershipUsage} disabled={saving} className="w-full rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
                  {saving ? 'Recording...' : 'Record usage'}
                </button>
              </div>
            </Panel>

            <Panel title="Membership usage ledger">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">Every manual session, adjustment and benefit redemption is logged here.</p>
                <button type="button" onClick={exportUsageCsv} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black hover:bg-white/10">
                  Export CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="border-b border-white/10 px-3 py-3">Date</th>
                      <th className="border-b border-white/10 px-3 py-3">Customer</th>
                      <th className="border-b border-white/10 px-3 py-3">Membership</th>
                      <th className="border-b border-white/10 px-3 py-3">Type</th>
                      <th className="border-b border-white/10 px-3 py-3">Benefit</th>
                      <th className="border-b border-white/10 px-3 py-3">Sessions</th>
                      <th className="border-b border-white/10 px-3 py-3">Qty</th>
                      <th className="border-b border-white/10 px-3 py-3">By</th>
                      <th className="border-b border-white/10 px-3 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsage.map((item) => {
                      const membership = usageMembership(item)
                      return (
                        <tr key={item.id} className="text-slate-300">
                          <td className="border-b border-white/5 px-3 py-3">{formatDate(item.usage_date)}</td>
                          <td className="border-b border-white/5 px-3 py-3">{usageCustomerName(item)}</td>
                          <td className="border-b border-white/5 px-3 py-3">{membership?.membership_name || '—'}</td>
                          <td className="border-b border-white/5 px-3 py-3"><StatusPill value={item.usage_type || 'session'} /></td>
                          <td className="border-b border-white/5 px-3 py-3">{item.benefit_name || '—'}</td>
                          <td className="border-b border-white/5 px-3 py-3">{item.sessions_used || 0}</td>
                          <td className="border-b border-white/5 px-3 py-3">{item.quantity || 1}</td>
                          <td className="border-b border-white/5 px-3 py-3">{item.created_by || '—'}</td>
                          <td className="border-b border-white/5 px-3 py-3">{item.notes || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filteredUsage.length === 0 && <EmptyState message="No membership usage has been recorded yet." />}
            </Panel>
          </section>
        )}

        {tab === 'reporting' && (
          <div className="space-y-6">
            <Panel title="Membership reporting V3">
              <section className="grid gap-4 md:grid-cols-4">
                <Kpi title="Membership MRR" value={money(stats.mrr)} />
                <Kpi title="Active members" value={String(stats.active)} />
                <Kpi title="Sessions used" value={`${stats.used}/${stats.included}`} />
                <Kpi title="Sessions remaining" value={String(stats.remaining)} />
                <Kpi title="Benefit redemptions" value={String(stats.benefitRedemptions)} />
                <Kpi title="Revenue/member" value={money(stats.revenuePerMember)} />
                <Kpi title="Avg sessions used" value={stats.avgSessionsUsed.toFixed(1)} />
                <Kpi title="Unused liability" value={money(stats.remainingLiability)} />
              </section>
            </Panel>

            <section className="grid gap-6 xl:grid-cols-2">
              <Panel title="Top membership plans">
                <div className="space-y-3">
                  {topPlans.map(({ plan, members, revenue, used, included }) => (
                    <div key={plan.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black">{plan.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{members} active members · {used}/{included} sessions used</p>
                        </div>
                        <p className="font-black text-cyan-300">{money(revenue)}</p>
                      </div>
                    </div>
                  ))}
                  {topPlans.length === 0 && <EmptyState message="No plans to report on yet." />}
                </div>
              </Panel>

              <Panel title="Most active members">
                <div className="space-y-3">
                  {topMembers.map((membership) => (
                    <div key={membership.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black">{customerName(membership.customers)}</p>
                          <p className="mt-1 text-sm text-slate-500">{membership.membership_name}</p>
                        </div>
                        <p className="font-black text-cyan-300">{membership.sessions_used || 0}/{membership.included_sessions || 0}</p>
                      </div>
                    </div>
                  ))}
                  {topMembers.length === 0 && <EmptyState message="No members to report on yet." />}
                </div>
              </Panel>
            </section>
          </div>
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
      <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="h-5 w-5" />
    </label>
  )
}

function StatusPill({ value }: { value: string }) {
  const good = value === 'active' || value === 'session'
  const warning = value === 'paused' || value === 'pending' || value === 'benefit' || value === 'adjustment'
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