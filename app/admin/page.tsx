'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string
  plan: string | null
  subscription_status: string | null
  is_internal: boolean | null
  created_at: string
  monthly_amount?: number | null
  lifetime_access?: boolean | null
}

type Booking = {
  id: string
  business_id: string
  booking_date: string
  total_price: number | null
  amount_paid: number | null
  status: string | null
}

type Customer = {
  id: string
  business_id: string
  created_at: string
}

type BusinessHealth = {
  business_id: string
  health_score: number | null
  risk_score: number | null
  status: string | null
  churn_level: string | null
  churn_reason: string | null
  growth_status: string | null
  attention_required: boolean | null
  revenue_last_30_days: number | null
  bookings_last_30_days: number | null
  customers_last_30_days: number | null
  last_booking_date: string | null
}

export default function AdminOverviewPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [healthRows, setHealthRows] = useState<BusinessHealth[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadAdminOverview()
  }, [])

  async function loadAdminOverview() {
    setLoading(true)
    setMessage('')

    const [businessRes, bookingRes, customerRes, healthRes, ticketRes] =
      await Promise.all([
        supabase
          .from('businesses')
          .select(
            'id,business_name,plan,subscription_status,is_internal,created_at,monthly_amount,lifetime_access'
          )
          .order('created_at', { ascending: false }),

        supabase
          .from('bookings')
          .select('id,business_id,booking_date,total_price,amount_paid,status')
          .neq('status', 'cancelled'),

        supabase.from('customers').select('id,business_id,created_at'),

        supabase
          .from('business_health')
          .select(
            'business_id,health_score,risk_score,status,churn_level,churn_reason,growth_status,attention_required,revenue_last_30_days,bookings_last_30_days,customers_last_30_days,last_booking_date'
          ),

        supabase.from('support_tickets').select('*').neq('status', 'resolved'),
      ])

    if (businessRes.error) setMessage(businessRes.error.message)

    setBusinesses((businessRes.data as Business[]) || [])
    setBookings((bookingRes.data as Booking[]) || [])
    setCustomers((customerRes.data as Customer[]) || [])
    setHealthRows((healthRes.data as BusinessHealth[]) || [])
    setTickets(ticketRes.data || [])
    setLoading(false)
  }

  const healthByBusiness = useMemo(() => {
    const map: Record<string, BusinessHealth> = {}

    healthRows.forEach((row) => {
      map[row.business_id] = row
    })

    return map
  }, [healthRows])

  const stats = useMemo(() => {
    const today = todayISO()
    const monthStart = monthStartISO()
    const yearStart = yearStartISO()

    const activeBusinesses = businesses.filter(
      (business) =>
        business.subscription_status !== 'cancelled' &&
        business.subscription_status !== 'suspended'
    )

    const trialBusinesses = businesses.filter(
      (business) => business.subscription_status === 'trialing'
    )

    const internalBusinesses = businesses.filter(
      (business) => business.is_internal
    )

    const lifetimeBusinesses = businesses.filter(
      (business) => business.lifetime_access
    )

    const bookingsToday = bookings.filter(
      (booking) => booking.booking_date === today
    )

    const bookingsMonth = bookings.filter(
      (booking) => booking.booking_date >= monthStart
    )

    const bookingsYear = bookings.filter(
      (booking) => booking.booking_date >= yearStart
    )

    const revenueToday = bookingsToday.reduce(
      (sum, booking) => sum + Number(booking.total_price || booking.amount_paid || 0),
      0
    )

    const revenueMonth = bookingsMonth.reduce(
      (sum, booking) => sum + Number(booking.total_price || booking.amount_paid || 0),
      0
    )

    const revenueYear = bookingsYear.reduce(
      (sum, booking) => sum + Number(booking.total_price || booking.amount_paid || 0),
      0
    )

    const mrr = activeBusinesses
      .filter((business) => !business.lifetime_access)
      .reduce(
        (sum, business) =>
          sum + Number(business.monthly_amount || estimatePlanAmount(business.plan)),
        0
      )

    const attentionAccounts = healthRows.filter(
      (row) => row.attention_required
    )

    const immediateAttention = healthRows.filter(
      (row) => row.churn_level === 'Immediate Attention'
    )

    const growingAccounts = healthRows.filter(
      (row) =>
        row.growth_status === 'Growing' || row.growth_status === 'Power Growth'
    )

    const atRiskAccounts = healthRows.filter(
      (row) =>
        row.status === 'At Risk' ||
        row.status === 'Dormant' ||
        row.churn_level === 'At Risk' ||
        row.churn_level === 'Immediate Attention'
    )

    return {
      totalBusinesses: businesses.length,
      activeBusinesses: activeBusinesses.length,
      trialBusinesses: trialBusinesses.length,
      internalBusinesses: internalBusinesses.length,
      lifetimeBusinesses: lifetimeBusinesses.length,
      bookingsToday: bookingsToday.length,
      bookingsMonth: bookingsMonth.length,
      bookingsYear: bookingsYear.length,
      customers: customers.length,
      revenueToday,
      revenueMonth,
      revenueYear,
      openTickets: tickets.length,
      mrr,
      arr: mrr * 12,
      attentionAccounts: attentionAccounts.length,
      immediateAttention: immediateAttention.length,
      growingAccounts: growingAccounts.length,
      atRiskAccounts: atRiskAccounts.length,
    }
  }, [businesses, bookings, customers, tickets, healthRows])

  const recentBusinesses = businesses.slice(0, 8)

  const priorityBusinesses = useMemo(() => {
    return businesses
      .map((business) => ({
        business,
        health: healthByBusiness[business.id],
      }))
      .filter((row) => row.health?.attention_required)
      .sort((a, b) => Number(b.health?.risk_score || 0) - Number(a.health?.risk_score || 0))
      .slice(0, 8)
  }, [businesses, healthByBusiness])

  const growthBusinesses = useMemo(() => {
    return businesses
      .map((business) => ({
        business,
        health: healthByBusiness[business.id],
      }))
      .filter(
        (row) =>
          row.health?.growth_status === 'Growing' ||
          row.health?.growth_status === 'Power Growth'
      )
      .sort(
        (a, b) =>
          Number(b.health?.revenue_last_30_days || 0) -
          Number(a.health?.revenue_last_30_days || 0)
      )
      .slice(0, 8)
  }, [businesses, healthByBusiness])

  return (
    <div className="space-y-8">
      {message && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
          {message}
        </div>
      )}

      {loading && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          Loading platform overview...
        </div>
      )}

      {!loading && (
        <>
          <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="MRR" value={money(stats.mrr)} />
            <StatCard label="ARR" value={money(stats.arr)} />
            <StatCard label="Revenue month" value={money(stats.revenueMonth)} />
            <StatCard label="Active businesses" value={stats.activeBusinesses} />
            <StatCard label="At risk" value={stats.atRiskAccounts} />
            <StatCard label="Attention" value={stats.attentionAccounts} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">CEO command centre</h2>
                  <p className="mt-2 text-slate-400">
                    Revenue, growth, churn risk and operational alerts in one place.
                  </p>
                </div>

                <Link
                  href="/admin/businesses/create"
                  className="rounded-2xl bg-white px-5 py-3 font-black text-slate-950"
                >
                  Create business
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <StatCard label="Bookings today" value={stats.bookingsToday} />
                <StatCard label="Bookings this month" value={stats.bookingsMonth} />
                <StatCard label="Revenue today" value={money(stats.revenueToday)} />
                <StatCard label="Revenue this year" value={money(stats.revenueYear)} />
                <StatCard label="Customers" value={stats.customers} />
                <StatCard label="Open support items" value={stats.openTickets} />
                <StatCard label="Trial businesses" value={stats.trialBusinesses} />
                <StatCard label="Growing accounts" value={stats.growingAccounts} />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
              <h2 className="text-2xl font-black">Executive alerts</h2>
              <p className="mt-2 text-slate-400">
                The issues that need attention before they become churn.
              </p>

              <div className="mt-6 space-y-3">
                {stats.immediateAttention > 0 && (
                  <Link
                    href="/admin/health?search=Immediate Attention"
                    className="block rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-200 hover:bg-red-500/20"
                  >
                    {stats.immediateAttention} accounts need immediate attention.
                  </Link>
                )}

                {stats.atRiskAccounts > 0 && (
                  <Link
                    href="/admin/health?search=At Risk"
                    className="block rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 font-bold text-amber-200 hover:bg-amber-500/20"
                  >
                    {stats.atRiskAccounts} accounts are at risk or dormant.
                  </Link>
                )}

                {stats.openTickets > 0 && (
                  <Link
                    href="/admin/support"
                    className="block rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 font-bold text-blue-200 hover:bg-blue-500/20"
                  >
                    {stats.openTickets} open support tickets.
                  </Link>
                )}

                {stats.trialBusinesses > 0 && (
                  <Link
                    href="/admin/subscriptions"
                    className="block rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 font-bold text-violet-200 hover:bg-violet-500/20"
                  >
                    {stats.trialBusinesses} businesses currently in trial.
                  </Link>
                )}

                {stats.immediateAttention === 0 &&
                  stats.atRiskAccounts === 0 &&
                  stats.openTickets === 0 && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-200">
                      No urgent alerts right now.
                    </div>
                  )}

                <Link
                  href="/admin/settings"
                  className="block rounded-2xl border border-white/10 bg-black/20 p-4 font-bold hover:bg-white/10"
                >
                  Platform settings
                </Link>

                <Link
                  href="/admin/audit"
                  className="block rounded-2xl border border-white/10 bg-black/20 p-4 font-bold hover:bg-white/10"
                >
                  Audit logs
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-black">Priority accounts</h2>
                <Link
                  href="/admin/health"
                  className="text-sm font-bold text-slate-300 hover:text-white"
                >
                  View health
                </Link>
              </div>

              <div className="space-y-3">
                {priorityBusinesses.map(({ business, health }) => (
                  <Link
                    key={business.id}
                    href={`/admin/businesses/${business.id}`}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 hover:bg-red-500/20 md:flex-row md:items-center"
                  >
                    <div>
                      <p className="font-black">{business.business_name}</p>
                      <p className="mt-1 text-sm text-red-200">
                        {health?.churn_level || 'At risk'} ·{' '}
                        {health?.churn_reason || 'Needs attention'}
                      </p>
                    </div>

                    <span className="text-sm font-bold text-red-200">
                      Risk {health?.risk_score || 0}/100
                    </span>
                  </Link>
                ))}

                {priorityBusinesses.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-slate-500">
                    No priority accounts right now.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-black">Growth accounts</h2>
                <Link
                  href="/admin/health?search=Growing"
                  className="text-sm font-bold text-slate-300 hover:text-white"
                >
                  View growth
                </Link>
              </div>

              <div className="space-y-3">
                {growthBusinesses.map(({ business, health }) => (
                  <Link
                    key={business.id}
                    href={`/admin/businesses/${business.id}`}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 hover:bg-emerald-500/20 md:flex-row md:items-center"
                  >
                    <div>
                      <p className="font-black">{business.business_name}</p>
                      <p className="mt-1 text-sm text-emerald-200">
                        {health?.growth_status || 'Growing'} ·{' '}
                        {health?.bookings_last_30_days || 0} bookings last 30 days
                      </p>
                    </div>

                    <span className="text-sm font-bold text-emerald-200">
                      {money(Number(health?.revenue_last_30_days || 0))}
                    </span>
                  </Link>
                ))}

                {growthBusinesses.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-slate-500">
                    No growth accounts identified yet.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black">Newest businesses</h2>
              <Link
                href="/admin/businesses"
                className="text-sm font-bold text-slate-300 hover:text-white"
              >
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {recentBusinesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/admin/businesses/${business.id}`}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 hover:bg-white/10 md:flex-row md:items-center"
                >
                  <div>
                    <p className="font-black">{business.business_name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {business.plan || 'No plan'} ·{' '}
                      {business.subscription_status || 'No status'}
                    </p>
                  </div>

                  <span className="text-sm text-slate-500">
                    {new Date(business.created_at).toLocaleDateString('en-GB')}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      {hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
    </div>
  )
}

function estimatePlanAmount(plan?: string | null) {
  const normalised = (plan || '').toLowerCase()
  if (normalised.includes('starter')) return 29
  if (normalised.includes('growth')) return 79
  if (normalised.includes('premium')) return 149
  if (normalised.includes('enterprise')) return 299
  return 0
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

function yearStartISO() {
  const date = new Date()
  date.setMonth(0, 1)
  return date.toISOString().split('T')[0]
}