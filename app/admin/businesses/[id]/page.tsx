'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Business = any
type Customer = any
type Booking = any
type TeamMember = any
type Service = any
type PackageRow = any
type GiftVoucher = any
type WaitingListRow = any
type BusinessNote = any
type AuditLog = any
type SubscriptionOverride = any
type BusinessHealth = any
type SupportTicket = any
type LaunchReadiness = any
type EmailBranding = any

const tabs = [
  'overview',
  'launch',
  'white-label',
  'commercial',
  'health',
  'customers',
  'bookings',
  'staff',
  'services',
  'packages',
  'vouchers',
  'waiting-list',
  'support',
  'notes',
  'billing',
  'audit',
] as const

type Tab = typeof tabs[number]

export default function AdminBusinessDetailPage() {
  const params = useParams()
  const businessId = String(params.id)

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [business, setBusiness] = useState<Business | null>(null)
  const [health, setHealth] = useState<BusinessHealth | null>(null)
  const [launchReadiness, setLaunchReadiness] = useState<LaunchReadiness | null>(null)
  const [emailBranding, setEmailBranding] = useState<EmailBranding | null>(null)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [packages, setPackages] = useState<PackageRow[]>([])
  const [customerPackages, setCustomerPackages] = useState<any[]>([])
  const [giftVouchers, setGiftVouchers] = useState<GiftVoucher[]>([])
  const [waitingList, setWaitingList] = useState<WaitingListRow[]>([])
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])
  const [notes, setNotes] = useState<BusinessNote[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [subscriptionOverrides, setSubscriptionOverrides] = useState<SubscriptionOverride[]>([])

  const [newNote, setNewNote] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingSuccess, setSavingSuccess] = useState(false)

  useEffect(() => {
    loadBusinessDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  async function loadBusinessDetail() {
    setLoading(true)
    setMessage('')

    const [
      businessRes,
      healthRes,
      launchRes,
      emailBrandingRes,
      customersRes,
      bookingsRes,
      teamRes,
      servicesRes,
      packagesRes,
      customerPackagesRes,
      vouchersRes,
      waitingRes,
      supportRes,
      notesRes,
      auditRes,
      subscriptionRes,
    ] = await Promise.all([
      supabase.from('businesses').select('*').eq('id', businessId).single(),
      supabase.from('business_health').select('*').eq('business_id', businessId).maybeSingle(),
      supabase.from('launch_readiness_checks').select('*').eq('business_id', businessId).maybeSingle(),
      supabase.from('email_branding').select('*').eq('business_id', businessId).maybeSingle(),
      supabase.from('customers').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(200),
      supabase.from('bookings').select('*,customers(first_name,last_name,email,phone),team_members(full_name),services(name)').eq('business_id', businessId).order('booking_date', { ascending: false }).limit(250),
      supabase.from('team_members').select('*').eq('business_id', businessId).order('full_name'),
      supabase.from('services').select('*').eq('business_id', businessId).order('name'),
      supabase.from('packages').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
      supabase.from('customer_packages').select('*').eq('business_id', businessId).order('purchase_date', { ascending: false }),
      supabase.from('gift_vouchers').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
      supabase.from('waiting_list').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
      supabase.from('support_tickets').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(100),
      supabase.from('business_notes').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
      supabase.from('audit_logs').select('*').eq('entity_type', 'business').eq('entity_id', businessId).order('created_at', { ascending: false }).limit(100),
      supabase.from('subscription_overrides').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(50),
    ])

    if (businessRes.error) setMessage(businessRes.error.message)

    setBusiness(businessRes.data || null)
    setHealth(healthRes.data || null)
    setLaunchReadiness(launchRes.data || null)
    setEmailBranding(emailBrandingRes.data || null)
    setCustomers(customersRes.data || [])
    setBookings(bookingsRes.data || [])
    setTeamMembers(teamRes.data || [])
    setServices(servicesRes.data || [])
    setPackages(packagesRes.data || [])
    setCustomerPackages(customerPackagesRes.data || [])
    setGiftVouchers(vouchersRes.data || [])
    setWaitingList(waitingRes.data || [])
    setSupportTickets(supportRes.data || [])
    setNotes(notesRes.data || [])
    setAuditLogs(auditRes.data || [])
    setSubscriptionOverrides(subscriptionRes.data || [])
    setLoading(false)
  }

  const metrics = useMemo(() => {
    const today = todayISO()
    const monthStart = monthStartISO()
    const activeBookings = bookings.filter((b) => b.status !== 'cancelled')
    const monthBookings = activeBookings.filter((b) => b.booking_date >= monthStart)
    const todayBookings = activeBookings.filter((b) => b.booking_date === today)

    const revenueMonth = monthBookings.reduce(
      (sum, b) => sum + Number(b.total_price || b.amount_paid || 0),
      0
    )

    const revenueAll = activeBookings.reduce(
      (sum, b) => sum + Number(b.total_price || b.amount_paid || 0),
      0
    )

    const noShows = bookings.filter((b) => b.status === 'no_show').length
    const averageBookingValue = activeBookings.length ? revenueAll / activeBookings.length : 0

    const voucherLiability = giftVouchers.reduce((sum, v) => {
      const amount = Number(v.remaining_amount ?? v.amount_remaining ?? v.value ?? v.amount ?? 0)
      return sum + amount
    }, 0)

    const vipCustomers = customers.filter((c) => c.vip).length
    const outstandingBalance = customers.reduce(
      (sum, c) => sum + Number(c.outstanding_balance || 0),
      0
    )

    const openSupport = supportTickets.filter(
      (ticket) => ticket.status !== 'resolved' && ticket.status !== 'closed'
    ).length

    return {
      revenueMonth,
      revenueAll,
      averageBookingValue,
      todayBookings: todayBookings.length,
      monthBookings: monthBookings.length,
      customers: customers.length,
      vipCustomers,
      outstandingBalance,
      staff: teamMembers.length,
      services: services.length,
      packages: packages.length,
      vouchers: giftVouchers.length,
      waiting: waitingList.length,
      noShows,
      voucherLiability,
      openSupport,
      bookings: activeBookings.length,
    }
  }, [bookings, customers, teamMembers, services, packages, giftVouchers, waitingList, supportTickets])

  const launchScore = launchReadiness?.overall_score ?? business?.launch_readiness_score ?? 0
  const launchStatus = launchReadiness?.readiness_status ?? business?.launch_readiness_status ?? 'not_ready'
  const suspended = (business?.status || business?.subscription_status) === 'suspended'

  const whiteLabelScore = useMemo(() => {
    const checks = [
      Boolean(business?.logo_url),
      Boolean(business?.primary_colour),
      Boolean(business?.secondary_colour),
      Boolean(business?.custom_booking_headline),
      Boolean(business?.custom_booking_intro),
      Boolean(business?.custom_domain),
      business?.domain_status === 'connected',
      business?.ssl_status === 'active',
      Boolean(emailBranding?.sender_name || business?.sender_name),
      Boolean(emailBranding?.reply_to_email || business?.reply_to_email),
    ]

    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [business, emailBranding])

  async function audit(action: string, metadata: any = {}) {
    const { data: userData } = await supabase.auth.getUser()

    await supabase.from('audit_logs').insert({
      actor_email: userData.user?.email || 'unknown',
      action,
      entity_type: 'business',
      entity_id: businessId,
      metadata,
    })
  }

  async function updateBusiness(patch: any, action: string) {
    const { error } = await supabase.from('businesses').update(patch).eq('id', businessId)

    if (error) {
      setMessage(error.message)
      return
    }

    await audit(action, patch)
    setMessage('Business updated.')
    await loadBusinessDetail()
  }

  async function updateCustomerSuccess() {
    if (!business) return

    setSavingSuccess(true)

    const patch = {
      onboarding_status: valueById('onboarding_status') || null,
      acquisition_source: valueById('acquisition_source') || null,
      acquisition_reference: valueById('acquisition_reference') || null,
      account_manager: valueById('account_manager') || null,
      launch_date: valueById('launch_date') ? new Date(valueById('launch_date')).toISOString() : null,
      last_contacted_at: valueById('last_contacted_at') ? new Date(valueById('last_contacted_at')).toISOString() : null,
      next_review_at: valueById('next_review_at') ? new Date(valueById('next_review_at')).toISOString() : null,
    }

    await updateBusiness(patch, 'customer_success_updated')
    setSavingSuccess(false)
  }

  async function recalculateLaunchReadiness() {
    setMessage('Recalculating launch readiness...')

    const response = await fetch('/api/admin/launch-readiness/recalculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId }),
    })

    const result = await response.json()

    if (!response.ok) {
      setMessage(result?.error || 'Launch readiness recalculation failed.')
      return
    }

    setMessage('Launch readiness recalculated.')
    await loadBusinessDetail()
  }

  async function addNote() {
    if (!newNote.trim()) {
      setMessage('Write a note first.')
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase.from('business_notes').insert({
      business_id: businessId,
      note: newNote.trim(),
      created_by: userData.user?.email || 'unknown',
    })

    if (error) {
      setMessage(error.message)
      return
    }

    await audit('business_note_added', { note: newNote.trim() })
    setNewNote('')
    setMessage('Note added.')
    await loadBusinessDetail()
  }

  async function extendTrial() {
    const days = window.prompt('Extend trial by how many days?', '14')
    if (!days) return

    const date = new Date(business?.trial_ends_at || new Date())
    date.setDate(date.getDate() + Number(days))

    await updateBusiness(
      { trial_ends_at: date.toISOString(), subscription_status: 'trialing' },
      'trial_extended'
    )

    await supabase.from('subscription_overrides').insert({
      business_id: businessId,
      billing_type: business?.billing_type || 'manual',
      override_plan: business?.plan || null,
      monthly_amount: Number(business?.monthly_amount || 0),
      lifetime_access: Boolean(business?.lifetime_access),
      trial_extended_until: date.toISOString(),
      notes: `Trial extended by ${days} days`,
      created_by: (await supabase.auth.getUser()).data.user?.email || 'unknown',
    })
  }

  async function changeMonthlyAmount() {
    const amount = window.prompt('New monthly amount?', String(business?.monthly_amount || 0))
    if (amount === null) return

    await updateBusiness({ monthly_amount: Number(amount || 0) }, 'monthly_amount_changed')

    await supabase.from('subscription_overrides').insert({
      business_id: businessId,
      billing_type: business?.billing_type || 'manual',
      override_plan: business?.plan || null,
      monthly_amount: Number(amount || 0),
      lifetime_access: Boolean(business?.lifetime_access),
      notes: `Monthly amount changed to ${amount}`,
      created_by: (await supabase.auth.getUser()).data.user?.email || 'unknown',
    })
  }

  async function changePlan(plan: string) {
    await updateBusiness({ plan }, `plan_changed_to_${plan}`)

    await supabase.from('subscription_overrides').insert({
      business_id: businessId,
      billing_type: business?.billing_type || 'manual',
      override_plan: plan,
      monthly_amount: Number(business?.monthly_amount || 0),
      lifetime_access: Boolean(business?.lifetime_access),
      notes: `Plan changed to ${plan}`,
      created_by: (await supabase.auth.getUser()).data.user?.email || 'unknown',
    })
  }

  async function impersonate() {
    if (!business) return

    const reason = window.prompt(`Reason for impersonating ${business.business_name}?`)
    if (!reason) return

    const { data: userData } = await supabase.auth.getUser()

    await supabase.from('impersonation_logs').insert({
      admin_email: userData.user?.email || 'unknown',
      business_id: businessId,
      reason,
    })

    await audit('impersonation_started', { reason })

    localStorage.setItem('admin_impersonating_business_id', businessId)
    localStorage.setItem('admin_impersonating_business_name', business.business_name)

    setMessage(`Impersonation logged for ${business.business_name}. True session switching comes next.`)
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-white">
        Loading business...
      </div>
    )
  }

  if (!business) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-200">
        Business not found.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link href="/admin/businesses" className="text-sm font-bold text-slate-400 hover:text-white">
            ← Back to businesses
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-black">{business.business_name}</h1>

            <Badge label={suspended ? 'Suspended' : business.subscription_status || 'No status'} tone={suspended ? 'red' : 'green'} />
            {business.is_internal && <Badge label="Internal" tone="blue" />}
            {business.lifetime_access && <Badge label="Lifetime" tone="purple" />}
            <ReadinessBadge status={launchStatus} />
            {health?.status && <HealthBadge status={health.status} />}
            {health?.churn_level && <ChurnBadge level={health.churn_level} />}
          </div>

          <p className="mt-3 max-w-3xl text-slate-400">
            {[business.owner_first_name, business.owner_last_name].filter(Boolean).join(' ') || 'No owner'} · {business.email || 'No email'} · {business.phone || 'No phone'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={impersonate} className="rounded-2xl bg-blue-500/15 px-4 py-3 font-bold text-blue-300 hover:bg-blue-500/25">
            Impersonate
          </button>

          <button onClick={recalculateLaunchReadiness} className="rounded-2xl bg-emerald-500/15 px-4 py-3 font-bold text-emerald-300 hover:bg-emerald-500/25">
            Recalculate launch
          </button>

          <button onClick={extendTrial} className="rounded-2xl bg-violet-500/15 px-4 py-3 font-bold text-violet-300 hover:bg-violet-500/25">
            Extend trial
          </button>

          <button onClick={changeMonthlyAmount} className="rounded-2xl border border-white/10 px-4 py-3 font-bold text-white hover:bg-white/10">
            Change price
          </button>

          <button onClick={() => updateBusiness({ is_internal: !business.is_internal }, 'business_internal_toggled')} className="rounded-2xl border border-white/10 px-4 py-3 font-bold text-white hover:bg-white/10">
            {business.is_internal ? 'Remove internal' : 'Internal'}
          </button>

          <button onClick={() => updateBusiness({ lifetime_access: !business.lifetime_access, billing_type: !business.lifetime_access ? 'lifetime' : 'stripe' }, 'business_lifetime_toggled')} className="rounded-2xl border border-white/10 px-4 py-3 font-bold text-white hover:bg-white/10">
            {business.lifetime_access ? 'Remove lifetime' : 'Lifetime'}
          </button>

          <button
            onClick={() =>
              updateBusiness(
                suspended
                  ? { status: 'active', subscription_status: 'active', suspended_at: null, suspended_reason: null }
                  : { status: 'suspended', subscription_status: 'suspended', suspended_at: new Date().toISOString(), suspended_reason: 'Suspended by master admin' },
                suspended ? 'business_unsuspended' : 'business_suspended'
              )
            }
            className={`rounded-2xl px-4 py-3 font-bold ${suspended ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}
          >
            {suspended ? 'Unsuspend' : 'Suspend'}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <HeroCard
          label="Launch readiness"
          value={`${launchScore}%`}
          sub={statusLabel(launchStatus)}
          tone={launchScore >= 90 ? 'green' : launchScore >= 70 ? 'blue' : launchScore >= 40 ? 'amber' : 'red'}
          href="/admin/launch-readiness"
        />

        <HeroCard
          label="White label health"
          value={`${whiteLabelScore}%`}
          sub={`${statusLabel(business.white_label_mode || 'amb_branded')} · ${business.domain_status || 'No domain'}`}
          tone={whiteLabelScore >= 90 ? 'green' : whiteLabelScore >= 60 ? 'amber' : 'red'}
          href="/admin/branding"
        />

        <HeroCard
          label="Subscription"
          value={business.plan || 'No plan'}
          sub={`${money(business.monthly_amount || 0)} / month · ${business.billing_type || 'stripe'}`}
          tone={suspended ? 'red' : 'green'}
          href="#billing"
          onClick={() => setActiveTab('billing')}
        />

        <HeroCard
          label="Commercial"
          value={money(metrics.revenueAll)}
          sub={`${metrics.bookings} bookings · ${metrics.customers} customers`}
          tone="blue"
          href="#commercial"
          onClick={() => setActiveTab('commercial')}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="MRR" value={money(business.monthly_amount || 0)} />
        <StatCard label="Health" value={health?.health_score != null ? `${health.health_score}/100` : 'N/A'} />
        <StatCard label="Risk" value={health?.risk_score != null ? `${health.risk_score}/100` : 'N/A'} />
        <StatCard label="30d revenue" value={money(health?.revenue_last_30_days || metrics.revenueMonth)} />
        <StatCard label="30d bookings" value={health?.bookings_last_30_days ?? metrics.monthBookings} />
        <StatCard label="Customers" value={metrics.customers} />
        <StatCard label="Support" value={metrics.openSupport} />
        <StatCard label="Waiting" value={metrics.waiting} />
      </section>

      {health?.attention_required && (
        <section className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          <h2 className="text-2xl font-black">Attention required</h2>
          <p className="mt-2">{health.churn_reason || 'This account needs customer success attention.'}</p>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-2xl px-4 py-3 text-sm font-black capitalize ${
              activeTab === tab
                ? 'bg-white text-slate-950'
                : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <Panel title="Executive overview">
            <Detail label="Business name" value={business.business_name} />
            <Detail label="Owner" value={[business.owner_first_name, business.owner_last_name].filter(Boolean).join(' ') || 'Not set'} />
            <Detail label="Email" value={business.email || 'Not set'} />
            <Detail label="Phone" value={business.phone || 'Not set'} />
            <Detail label="Website" value={business.website || 'Not set'} />
            <Detail label="Slug" value={business.slug || 'Not set'} />
            <Detail label="Industry" value={business.industry || 'Not set'} />
            <Detail label="Status" value={business.status || business.subscription_status || 'Not set'} />
            <Detail label="Onboarding status" value={statusLabel(business.onboarding_status || 'setup')} />
            <Detail label="Created" value={business.created_at ? new Date(business.created_at).toLocaleString('en-GB') : 'Not set'} />

            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/admin/launch-readiness" className="rounded-2xl bg-white px-5 py-3 font-black text-slate-950">
                View Launch Readiness
              </Link>

              <Link href="/admin/branding" className="rounded-2xl border border-white/10 px-5 py-3 font-black text-white hover:bg-white/10">
                Manage Branding
              </Link>

              <Link href="/admin/domains" className="rounded-2xl border border-white/10 px-5 py-3 font-black text-white hover:bg-white/10">
                Manage Domain
              </Link>

              <Link href="/admin/email-branding" className="rounded-2xl border border-white/10 px-5 py-3 font-black text-white hover:bg-white/10">
                Manage Emails
              </Link>
            </div>
          </Panel>

          <Panel title="Customer success">
            <EditableSuccessField id="onboarding_status" label="Onboarding status" defaultValue={business.onboarding_status || 'setup'} />
            <EditableSuccessField id="account_manager" label="Account manager" defaultValue={business.account_manager || ''} />
            <EditableSuccessField id="acquisition_source" label="Acquisition source" defaultValue={business.acquisition_source || ''} />
            <EditableSuccessField id="acquisition_reference" label="Acquisition reference" defaultValue={business.acquisition_reference || ''} />
            <EditableSuccessField id="launch_date" label="Launch date" type="date" defaultValue={dateInput(business.launch_date)} />
            <EditableSuccessField id="last_contacted_at" label="Last contacted" type="date" defaultValue={dateInput(business.last_contacted_at)} />
            <EditableSuccessField id="next_review_at" label="Next review" type="date" defaultValue={dateInput(business.next_review_at)} />

            <button
              onClick={updateCustomerSuccess}
              disabled={savingSuccess}
              className="mt-5 rounded-2xl bg-white px-5 py-3 font-black text-slate-950 disabled:opacity-60"
            >
              {savingSuccess ? 'Saving...' : 'Save customer success'}
            </button>
          </Panel>
        </section>
      )}

      {activeTab === 'launch' && (
        <Panel title="Launch readiness">
          <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-center">
              <p className={`text-7xl font-black ${scoreClass(launchScore)}`}>{launchScore}%</p>
              <p className="mt-3 text-sm font-black uppercase tracking-wide text-slate-500">{statusLabel(launchStatus)}</p>

              <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full ${progressClass(launchScore)}`} style={{ width: `${launchScore}%` }} />
              </div>

              <button onClick={recalculateLaunchReadiness} className="mt-6 rounded-2xl bg-white px-5 py-3 font-black text-slate-950">
                Recalculate
              </button>
            </div>

            <div className="grid gap-3">
              <ScoreDetail label="Branding" value={Number(launchReadiness?.branding_score || 0)} />
              <ScoreDetail label="Domain" value={Number(launchReadiness?.domain_score || 0)} />
              <ScoreDetail label="SSL" value={Number(launchReadiness?.ssl_score || 0)} />
              <ScoreDetail label="Email" value={Number(launchReadiness?.email_score || 0)} />
              <ScoreDetail label="Services" value={Number(launchReadiness?.services_score || 0)} />
              <ScoreDetail label="Team" value={Number(launchReadiness?.team_score || 0)} />
              <ScoreDetail label="Availability" value={Number(launchReadiness?.availability_score || 0)} />
            </div>
          </div>
        </Panel>
      )}

      {activeTab === 'white-label' && (
        <section className="grid gap-6 xl:grid-cols-2">
          <Panel title="White label health">
            <ScoreDetail label="White label health" value={whiteLabelScore} />
            <Detail label="White label mode" value={statusLabel(business.white_label_mode || 'amb_branded')} />
            <Detail label="Hide AMB branding" value={business.hide_amb_branding ? 'Yes' : 'No'} />
            <Detail label="Branding status" value={statusLabel(business.branding_status || 'live')} />
            <Detail label="Logo" value={business.logo_url ? 'Configured' : 'Missing'} />
            <Detail label="Booking headline" value={business.custom_booking_headline || 'Missing'} />
            <Detail label="Booking intro" value={business.custom_booking_intro || 'Missing'} />

            <div className="mt-6">
              <Link href="/admin/branding" className="inline-block rounded-2xl bg-white px-5 py-3 font-black text-slate-950">
                Open Branding Centre
              </Link>
            </div>
          </Panel>

          <Panel title="Domain and email">
            <Detail label="Custom domain" value={business.custom_domain || 'Not set'} />
            <Detail label="Domain status" value={statusLabel(business.domain_status || 'not_connected')} />
            <Detail label="SSL status" value={statusLabel(business.ssl_status || 'not_checked')} />
            <Detail label="SSL days remaining" value={business.ssl_days_remaining ?? 'Not checked'} />
            <Detail label="Email sender" value={emailBranding?.sender_name || business.sender_name || 'Not set'} />
            <Detail label="Reply to" value={emailBranding?.reply_to_email || business.reply_to_email || 'Not set'} />
            <Detail label="Email footer" value={emailBranding?.footer_text || 'Not set'} />

            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/admin/domains" className="rounded-2xl bg-white px-5 py-3 font-black text-slate-950">
                Open Domain Centre
              </Link>

              <Link href="/admin/email-branding" className="rounded-2xl border border-white/10 px-5 py-3 font-black text-white hover:bg-white/10">
                Open Email Branding
              </Link>
            </div>
          </Panel>
        </section>
      )}

      {activeTab === 'commercial' && (
        <section className="grid gap-6 xl:grid-cols-2">
          <Panel title="Commercial intelligence">
            <Detail label="Plan" value={business.plan || 'Not set'} />
            <Detail label="Subscription status" value={business.subscription_status || 'Not set'} />
            <Detail label="Billing type" value={business.billing_type || 'stripe'} />
            <Detail label="Monthly amount" value={money(business.monthly_amount || 0)} />
            <Detail label="Revenue this month" value={money(metrics.revenueMonth)} />
            <Detail label="All-time revenue" value={money(metrics.revenueAll)} />
            <Detail label="Average booking value" value={money(metrics.averageBookingValue)} />
            <Detail label="Lifetime access" value={business.lifetime_access ? 'Yes' : 'No'} />
          </Panel>

          <Panel title="Operational commercial summary">
            <Detail label="Bookings today" value={metrics.todayBookings} />
            <Detail label="Bookings this month" value={metrics.monthBookings} />
            <Detail label="Total customers" value={metrics.customers} />
            <Detail label="VIP customers" value={metrics.vipCustomers} />
            <Detail label="No-shows" value={metrics.noShows} />
            <Detail label="Voucher liability" value={money(metrics.voucherLiability)} />
            <Detail label="Outstanding balance" value={money(metrics.outstandingBalance)} />
            <Detail label="Open support tickets" value={metrics.openSupport} />
          </Panel>
        </section>
      )}

      {activeTab === 'health' && (
        <Panel title="Customer success health">
          <Detail label="Health score" value={health?.health_score != null ? `${health.health_score}/100` : 'Not calculated'} />
          <Detail label="Risk score" value={health?.risk_score != null ? `${health.risk_score}/100` : 'Not calculated'} />
          <Detail label="Health status" value={health?.status || 'Not calculated'} />
          <Detail label="Churn level" value={health?.churn_level || 'Not calculated'} />
          <Detail label="Growth status" value={health?.growth_status || 'Not calculated'} />
          <Detail label="Attention required" value={health?.attention_required ? 'Yes' : 'No'} />
          <Detail label="Churn reason" value={health?.churn_reason || 'None'} />
          <Detail label="30d revenue" value={money(health?.revenue_last_30_days || 0)} />
          <Detail label="30d bookings" value={health?.bookings_last_30_days || 0} />
          <Detail label="30d customers" value={health?.customers_last_30_days || 0} />
          <Detail label="Last booking" value={health?.last_booking_date ? new Date(health.last_booking_date).toLocaleDateString('en-GB') : 'Never'} />
          <Detail label="Last calculated" value={health?.last_calculated_at ? new Date(health.last_calculated_at).toLocaleString('en-GB') : 'Never'} />

          <div className="mt-6">
            <Link href="/admin/health" className="inline-block rounded-2xl bg-white px-5 py-3 font-black text-slate-950">
              Open Health Engine
            </Link>
          </div>
        </Panel>
      )}

      {activeTab === 'customers' && (
        <Panel title="Customers">
          <DataList rows={customers} empty="No customers found." render={(customer) => (
            <Row key={customer.id}>
              <div>
                <p className="font-black">{customer.first_name} {customer.last_name}</p>
                <p className="mt-1 text-sm text-slate-500">{customer.email || 'No email'} · {customer.phone || 'No phone'}</p>
              </div>
              <div className="text-sm text-slate-400">
                VIP: {customer.vip ? 'Yes' : 'No'} · No-shows: {customer.no_show_count || 0} · Balance: {money(customer.outstanding_balance || 0)}
              </div>
            </Row>
          )} />
        </Panel>
      )}

      {activeTab === 'bookings' && (
        <Panel title="Bookings">
          <DataList rows={bookings} empty="No bookings found." render={(booking) => (
            <Row key={booking.id}>
              <div>
                <p className="font-black">{booking.booking_date} at {String(booking.booking_time || '').slice(0, 5)}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {booking.customers ? `${booking.customers.first_name || ''} ${booking.customers.last_name || ''}` : 'No customer'} · {booking.team_members?.full_name || 'No staff'}
                </p>
              </div>
              <div className="text-sm text-slate-400">
                {booking.status || 'No status'} · {booking.payment_status || 'No payment'} · {money(booking.total_price || booking.amount_paid || 0)}
              </div>
            </Row>
          )} />
        </Panel>
      )}

      {activeTab === 'staff' && (
        <Panel title="Staff">
          <DataList rows={teamMembers} empty="No staff found." render={(member) => (
            <Row key={member.id}>
              <div>
                <p className="font-black">{member.full_name}</p>
                <p className="mt-1 text-sm text-slate-500">{member.role || 'No role'} · {member.email || 'No email'}</p>
              </div>
              <div className="text-sm text-slate-400">
                Active: {member.is_active === false ? 'No' : 'Yes'} · Public: {member.display_on_booking_page === false ? 'No' : 'Yes'}
              </div>
            </Row>
          )} />
        </Panel>
      )}

      {activeTab === 'services' && (
        <Panel title="Services">
          <DataList rows={services} empty="No services found." render={(service) => (
            <Row key={service.id}>
              <div>
                <p className="font-black">{service.name}</p>
                <p className="mt-1 text-sm text-slate-500">{service.duration_minutes || 0} minutes</p>
              </div>
              <div className="text-sm text-slate-400">{money(service.price || 0)}</div>
            </Row>
          )} />
        </Panel>
      )}

      {activeTab === 'packages' && (
        <Panel title="Packages">
          <DataList rows={packages} empty="No packages found." render={(pack) => (
            <Row key={pack.id}>
              <div>
                <p className="font-black">{pack.name || pack.package_name || 'Package'}</p>
                <p className="mt-1 text-sm text-slate-500">Customers using packages: {customerPackages.length}</p>
              </div>
              <div className="text-sm text-slate-400">{money(pack.price || 0)}</div>
            </Row>
          )} />
        </Panel>
      )}

      {activeTab === 'vouchers' && (
        <Panel title="Gift vouchers">
          <DataList rows={giftVouchers} empty="No gift vouchers found." render={(voucher) => (
            <Row key={voucher.id}>
              <div>
                <p className="font-black">{voucher.code || voucher.voucher_code || 'Voucher'}</p>
                <p className="mt-1 text-sm text-slate-500">{voucher.recipient_email || voucher.customer_email || 'No recipient email'}</p>
              </div>
              <div className="text-sm text-slate-400">
                {voucher.status || 'No status'} · {money(voucher.value || voucher.amount || 0)}
              </div>
            </Row>
          )} />
        </Panel>
      )}

      {activeTab === 'waiting-list' && (
        <Panel title="Waiting list">
          <DataList rows={waitingList} empty="No waiting list entries found." render={(entry) => (
            <Row key={entry.id}>
              <div>
                <p className="font-black">{entry.customer_name || entry.name || entry.email || 'Waiting list entry'}</p>
                <p className="mt-1 text-sm text-slate-500">{entry.preferred_date || 'No preferred date'} · {entry.preferred_time_range || 'No time range'}</p>
              </div>
              <div className="text-sm text-slate-400">{entry.status || 'Waiting'}</div>
            </Row>
          )} />
        </Panel>
      )}

      {activeTab === 'support' && (
        <Panel title="Support tickets">
          <DataList rows={supportTickets} empty="No support tickets found." render={(ticket) => (
            <Row key={ticket.id}>
              <div>
                <p className="font-black">{ticket.subject}</p>
                <p className="mt-1 text-sm text-slate-500">{ticket.message || 'No message'}</p>
              </div>
              <div className="text-sm text-slate-400">
                {ticket.priority || 'normal'} · {ticket.status || 'open'} · {new Date(ticket.created_at).toLocaleDateString('en-GB')}
              </div>
            </Row>
          )} />
        </Panel>
      )}

      {activeTab === 'notes' && (
        <Panel title="Internal notes">
          <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto]">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add an internal note about this business..."
              className="min-h-28 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
            />

            <button onClick={addNote} className="rounded-2xl bg-white px-5 py-4 font-black text-slate-950">
              Add note
            </button>
          </div>

          <DataList rows={notes} empty="No notes yet." render={(note) => (
            <Row key={note.id}>
              <div>
                <p className="whitespace-pre-wrap font-medium text-slate-200">{note.note}</p>
                <p className="mt-2 text-sm text-slate-500">{note.created_by || 'Unknown'} · {new Date(note.created_at).toLocaleString('en-GB')}</p>
              </div>
            </Row>
          )} />
        </Panel>
      )}

      {activeTab === 'billing' && (
        <Panel title="Billing and overrides">
          <div className="mb-6 flex flex-wrap gap-2">
            {['starter', 'growth', 'premium', 'enterprise'].map((plan) => (
              <button
                key={plan}
                onClick={() => changePlan(plan)}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/10"
              >
                {plan}
              </button>
            ))}
          </div>

          <Detail label="Plan" value={business.plan || 'Not set'} />
          <Detail label="Subscription status" value={business.subscription_status || 'Not set'} />
          <Detail label="Billing type" value={business.billing_type || 'stripe'} />
          <Detail label="Monthly amount" value={money(business.monthly_amount || 0)} />
          <Detail label="Trial ends" value={business.trial_ends_at ? new Date(business.trial_ends_at).toLocaleString('en-GB') : 'Not set'} />
          <Detail label="Lifetime access" value={business.lifetime_access ? 'Yes' : 'No'} />
          <Detail label="Stripe customer" value={business.stripe_customer_id || 'Not set'} />
          <Detail label="Stripe subscription" value={business.stripe_subscription_id || 'Not set'} />

          <div className="mt-8">
            <h3 className="mb-4 text-xl font-black">Override history</h3>

            <DataList rows={subscriptionOverrides} empty="No overrides yet." render={(item) => (
              <Row key={item.id}>
                <div>
                  <p className="font-black">{item.notes || 'Subscription override'}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.created_by || 'Unknown'} · {new Date(item.created_at).toLocaleString('en-GB')}</p>
                </div>
                <div className="text-sm text-slate-400">{item.billing_type} · {item.override_plan || 'No plan'} · {money(item.monthly_amount || 0)}</div>
              </Row>
            )} />
          </div>
        </Panel>
      )}

      {activeTab === 'audit' && (
        <Panel title="Audit logs">
          <DataList rows={auditLogs} empty="No audit logs for this business yet." render={(log) => (
            <Row key={log.id}>
              <div>
                <p className="font-black">{humanAction(log.action)}</p>
                <p className="mt-1 text-sm text-slate-500">{log.actor_email || 'Unknown'} · {new Date(log.created_at).toLocaleString('en-GB')}</p>
              </div>

              <pre className="max-w-xl whitespace-pre-wrap break-words text-xs text-slate-500">
                {JSON.stringify(log.metadata || {}, null, 2)}
              </pre>
            </Row>
          )} />
        </Panel>
      )}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
      <h2 className="mb-6 text-2xl font-black">{title}</h2>
      {children}
    </section>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 lg:flex-row lg:items-center">
      {children}
    </div>
  )
}

function DataList<T>({ rows, render, empty }: { rows: T[]; render: (row: T) => React.ReactNode; empty: string }) {
  if (!rows.length) {
    return <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-slate-500">{empty}</div>
  }

  return <div className="space-y-4">{rows.map(render)}</div>
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid gap-2 border-b border-white/10 py-3 md:grid-cols-[220px_1fr]">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="break-words font-medium text-slate-200">{value}</p>
    </div>
  )
}

function Badge({ label, tone }: { label: string; tone: 'green' | 'red' | 'blue' | 'purple' | 'amber' }) {
  const classes = {
    green: 'bg-emerald-500/10 text-emerald-300',
    red: 'bg-red-500/10 text-red-300',
    blue: 'bg-blue-500/10 text-blue-300',
    purple: 'bg-violet-500/10 text-violet-300',
    amber: 'bg-amber-500/10 text-amber-300',
  }

  return <span className={`rounded-full px-3 py-1 text-sm font-bold ${classes[tone]}`}>{label}</span>
}

function HealthBadge({ status }: { status: string }) {
  const tone =
    status === 'Power User'
      ? 'purple'
      : status === 'Healthy'
        ? 'green'
        : status === 'Warning'
          ? 'blue'
          : 'red'

  return <Badge label={status} tone={tone as any} />
}

function ChurnBadge({ level }: { level: string }) {
  const classes =
    level === 'Immediate Attention'
      ? 'bg-red-500/10 text-red-300'
      : level === 'At Risk'
        ? 'bg-orange-500/10 text-orange-300'
        : level === 'Monitor'
          ? 'bg-amber-500/10 text-amber-300'
          : 'bg-emerald-500/10 text-emerald-300'

  return <span className={`rounded-full px-3 py-1 text-sm font-bold ${classes}`}>{level}</span>
}

function ReadinessBadge({ status }: { status: string }) {
  const tone =
    status === 'ready_for_launch'
      ? 'green'
      : status === 'nearly_ready'
        ? 'blue'
        : status === 'in_progress'
          ? 'amber'
          : 'red'

  return <Badge label={statusLabel(status)} tone={tone as any} />
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  )
}

function HeroCard({
  label,
  value,
  sub,
  tone,
  href,
  onClick,
}: {
  label: string
  value: string | number
  sub: string
  tone: 'green' | 'red' | 'blue' | 'purple' | 'amber'
  href: string
  onClick?: () => void
}) {
  const toneClasses = {
    green: 'from-emerald-500/20 to-emerald-500/5 text-emerald-200',
    red: 'from-red-500/20 to-red-500/5 text-red-200',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-200',
    purple: 'from-violet-500/20 to-violet-500/5 text-violet-200',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-200',
  }

  const content = (
    <div className={`rounded-3xl border border-white/10 bg-gradient-to-br p-6 ${toneClasses[tone]}`}>
      <p className="text-sm font-black uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-3 text-4xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm">{sub}</p>
    </div>
  )

  if (onClick) {
    return (
      <button onClick={onClick} className="text-left">
        {content}
      </button>
    )
  }

  return <Link href={href}>{content}</Link>
}

function ScoreDetail({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-black text-slate-300">{label}</p>
        <p className={`text-lg font-black ${scoreClass(value)}`}>{value}%</p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${progressClass(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function EditableSuccessField({
  id,
  label,
  defaultValue,
  type = 'text',
}: {
  id: string
  label: string
  defaultValue: string
  type?: string
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-2 block text-sm font-bold text-slate-500">{label}</span>
      <input
        id={id}
        type={type}
        defaultValue={defaultValue}
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400"
      />
    </label>
  )
}

function valueById(id: string) {
  if (typeof document === 'undefined') return ''
  const el = document.getElementById(id) as HTMLInputElement | null
  return el?.value || ''
}

function humanAction(action: string) {
  return action
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusLabel(value: string) {
  return String(value || 'not_ready')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function scoreClass(score: number) {
  if (score >= 90) return 'text-emerald-300'
  if (score >= 70) return 'text-blue-300'
  if (score >= 40) return 'text-amber-300'
  return 'text-red-300'
}

function progressClass(score: number) {
  if (score >= 90) return 'bg-emerald-400'
  if (score >= 70) return 'bg-blue-400'
  if (score >= 40) return 'bg-amber-400'
  return 'bg-red-400'
}

function money(value: number) {
  return `£${Number(value || 0).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function monthStartISO() {
  const date = new Date()
  date.setDate(1)
  return date.toISOString().split('T')[0]
}

function dateInput(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toISOString().split('T')[0]
}
