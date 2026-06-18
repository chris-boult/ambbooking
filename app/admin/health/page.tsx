'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string
  email: string | null
  plan: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  created_at: string
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

type HealthRow = {
  business: Business
  health_score: number
  risk_score: number
  status: string
  churn_level: string
  churn_reason: string
  growth_status: string
  attention_required: boolean
  total_bookings: number
  total_customers: number
  total_revenue: number
  bookings_last_30_days: number
  customers_last_30_days: number
  revenue_last_30_days: number
  last_booking_date: string | null
  reasons: string[]
}

export default function PlatformHealthPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadHealth()
  }, [])

  async function loadHealth() {
    setLoading(true)
    setMessage('')

    const [businessRes, bookingRes, customerRes] = await Promise.all([
      supabase
        .from('businesses')
        .select('id,business_name,email,plan,subscription_status,trial_ends_at,created_at')
        .order('business_name'),

      supabase
        .from('bookings')
        .select('id,business_id,booking_date,total_price,amount_paid,status')
        .neq('status', 'cancelled'),

      supabase
        .from('customers')
        .select('id,business_id,created_at'),
    ])

    if (businessRes.error) {
      setMessage(businessRes.error.message)
    }

    setBusinesses((businessRes.data as Business[]) || [])
    setBookings((bookingRes.data as Booking[]) || [])
    setCustomers((customerRes.data as Customer[]) || [])
    setLoading(false)
  }

  const healthRows = useMemo(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)

    return businesses.map((business) => {
      const businessBookings = bookings.filter(
        (booking) => booking.business_id === business.id
      )

      const businessCustomers = customers.filter(
        (customer) => customer.business_id === business.id
      )

      const bookingsLast30 = businessBookings.filter(
        (booking) => new Date(booking.booking_date) >= thirtyDaysAgo
      )

      const customersLast30 = businessCustomers.filter(
        (customer) => new Date(customer.created_at) >= thirtyDaysAgo
      )

      const totalRevenue = businessBookings.reduce(
        (sum, booking) =>
          sum + Number(booking.total_price || booking.amount_paid || 0),
        0
      )

      const revenueLast30 = bookingsLast30.reduce(
        (sum, booking) =>
          sum + Number(booking.total_price || booking.amount_paid || 0),
        0
      )

      const sortedBookings = [...businessBookings].sort((a, b) =>
        String(b.booking_date).localeCompare(String(a.booking_date))
      )

      const lastBookingDate = sortedBookings[0]?.booking_date || null

      const reasons: string[] = []
      let health = 100
      let risk = 0

      if (business.subscription_status === 'cancelled') {
        health -= 80
        risk += 90
        reasons.push('Subscription cancelled')
      }

      if (business.subscription_status === 'suspended') {
        health -= 70
        risk += 80
        reasons.push('Account suspended')
      }

      if (business.subscription_status === 'trialing') {
        risk += 10
        reasons.push('Trial account')
      }

      if (business.trial_ends_at) {
        const trialEnd = new Date(business.trial_ends_at)
        const daysLeft = Math.ceil(
          (trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysLeft <= 7 && daysLeft >= 0) {
          health -= 10
          risk += 15
          reasons.push('Trial ends within 7 days')
        }

        if (daysLeft <= 3 && daysLeft >= 0) {
          health -= 15
          risk += 25
          reasons.push('Trial ends within 3 days')
        }

        if (daysLeft < 0 && business.subscription_status === 'trialing') {
          health -= 35
          risk += 45
          reasons.push('Trial expired')
        }
      }

      if (businessBookings.length === 0) {
        health -= 40
        risk += 50
        reasons.push('No bookings yet')
      }

      if (bookingsLast30.length === 0) {
        health -= 25
        risk += 35
        reasons.push('No bookings in the last 30 days')
      }

      if (businessCustomers.length === 0) {
        health -= 25
        risk += 30
        reasons.push('No customers yet')
      }

      if (customersLast30.length === 0) {
        health -= 10
        risk += 15
        reasons.push('No new customers in the last 30 days')
      }

      if (revenueLast30 === 0) {
        health -= 20
        risk += 25
        reasons.push('No revenue in the last 30 days')
      }

      if (bookingsLast30.length >= 20) {
        health += 10
        risk -= 10
        reasons.push('Strong recent booking volume')
      }

      if (customersLast30.length >= 10) {
        health += 10
        risk -= 10
        reasons.push('Strong customer growth')
      }

      if (revenueLast30 >= 1000) {
        health += 10
        risk -= 10
        reasons.push('Strong recent revenue')
      }

      if (bookingsLast30.length >= 50 && revenueLast30 >= 2500) {
        health += 10
        risk -= 10
        reasons.push('Power growth account')
      }

      health = Math.max(0, Math.min(100, health))
      risk = Math.max(0, Math.min(100, risk))

      const status = getStatus(health, risk)

      let churnLevel = 'Healthy'
      let growthStatus = 'Stable'
      let attentionRequired = false
      let churnReason = ''

      if (risk >= 80) {
        churnLevel = 'Immediate Attention'
        attentionRequired = true
        churnReason = reasons[0] || 'High risk account'
      } else if (risk >= 60) {
        churnLevel = 'At Risk'
        attentionRequired = true
        churnReason = reasons[0] || 'Usage declining'
      } else if (risk >= 30) {
        churnLevel = 'Monitor'
        churnReason = reasons[0] || 'Worth monitoring'
      }

      if (bookingsLast30.length >= 20 && revenueLast30 >= 1000) {
        growthStatus = 'Growing'
      }

      if (bookingsLast30.length >= 50 && revenueLast30 >= 2500) {
        growthStatus = 'Power Growth'
      }

      return {
        business,
        health_score: health,
        risk_score: risk,
        status,
        churn_level: churnLevel,
        churn_reason: churnReason,
        growth_status: growthStatus,
        attention_required: attentionRequired,
        total_bookings: businessBookings.length,
        total_customers: businessCustomers.length,
        total_revenue: totalRevenue,
        bookings_last_30_days: bookingsLast30.length,
        customers_last_30_days: customersLast30.length,
        revenue_last_30_days: revenueLast30,
        last_booking_date: lastBookingDate,
        reasons,
      }
    })
  }, [businesses, bookings, customers])

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim()

    if (!q) return healthRows

    return healthRows.filter((row) => {
      return (
        row.business.business_name.toLowerCase().includes(q) ||
        row.business.email?.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q) ||
        row.churn_level.toLowerCase().includes(q) ||
        row.growth_status.toLowerCase().includes(q) ||
        row.business.plan?.toLowerCase().includes(q)
      )
    })
  }, [healthRows, search])

  const summary = useMemo(() => {
    return {
      powerUsers: healthRows.filter((row) => row.status === 'Power User').length,
      healthy: healthRows.filter((row) => row.status === 'Healthy').length,
      warning: healthRows.filter((row) => row.status === 'Warning').length,
      atRisk: healthRows.filter((row) => row.status === 'At Risk').length,
      dormant: healthRows.filter((row) => row.status === 'Dormant').length,
      immediate: healthRows.filter((row) => row.churn_level === 'Immediate Attention').length,
      attention: healthRows.filter((row) => row.attention_required).length,
      growing: healthRows.filter((row) => row.growth_status === 'Growing' || row.growth_status === 'Power Growth').length,
    }
  }, [healthRows])

  async function saveHealthScores() {
    setSaving(true)
    setMessage('')

    const rows = healthRows.map((row) => ({
      business_id: row.business.id,
      health_score: row.health_score,
      risk_score: row.risk_score,
      status: row.status,
      churn_level: row.churn_level,
      churn_reason: row.churn_reason,
      growth_status: row.growth_status,
      attention_required: row.attention_required,
      total_bookings: row.total_bookings,
      total_customers: row.total_customers,
      total_revenue: row.total_revenue,
      bookings_last_30_days: row.bookings_last_30_days,
      customers_last_30_days: row.customers_last_30_days,
      revenue_last_30_days: row.revenue_last_30_days,
      last_booking_date: row.last_booking_date,
      last_calculated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('business_health')
      .upsert(rows, { onConflict: 'business_id' })

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    await supabase.from('audit_logs').insert({
      actor_email: userData.user?.email || 'unknown',
      action: 'business_health_scores_recalculated',
      entity_type: 'business_health',
      entity_id: 'all',
      metadata: {
        count: rows.length,
        attention_required: summary.attention,
        immediate_attention: summary.immediate,
      },
    })

    setMessage('Health and churn scores saved.')
    setSaving(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">
            Customer success intelligence
          </p>

          <h1 className="mt-2 text-4xl font-black">Health & Churn Engine</h1>

          <p className="mt-3 max-w-3xl text-slate-400">
            Track customer health, churn risk, usage, revenue, booking activity
            and accounts that need attention.
          </p>
        </div>

        <button
          onClick={saveHealthScores}
          disabled={saving || loading}
          className="rounded-2xl bg-white px-5 py-4 font-black text-slate-950 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save scores'}
        </button>
      </div>

      {message && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
          {message}
        </div>
      )}

      {loading && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          Calculating health and churn scores...
        </div>
      )}

      {!loading && (
        <>
          <section className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
            <StatCard label="Power users" value={summary.powerUsers} />
            <StatCard label="Healthy" value={summary.healthy} />
            <StatCard label="Warning" value={summary.warning} />
            <StatCard label="At risk" value={summary.atRisk} />
            <StatCard label="Dormant" value={summary.dormant} />
            <StatCard label="Attention" value={summary.attention} />
            <StatCard label="Growing" value={summary.growing} />
          </section>

          {summary.immediate > 0 && (
            <section className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
              <h2 className="text-2xl font-black">
                Immediate attention required
              </h2>
              <p className="mt-2">
                {summary.immediate} account{summary.immediate === 1 ? '' : 's'} need urgent intervention.
              </p>
            </section>
          )}

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search health, churn, growth, business, email or plan..."
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-slate-600"
          />

          <section className="space-y-4">
            {filteredRows.map((row) => (
              <div
                key={row.business.id}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
              >
                <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
                  <div className="w-full">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/admin/businesses/${row.business.id}`}
                        className="text-2xl font-black hover:text-blue-300"
                      >
                        {row.business.business_name}
                      </Link>

                      <Badge status={row.status} />
                      <ChurnBadge level={row.churn_level} />
                      <GrowthBadge status={row.growth_status} />
                    </div>

                    <p className="mt-2 text-slate-400">
                      {row.business.email || 'No email'} ·{' '}
                      {row.business.plan || 'No plan'} ·{' '}
                      {row.business.subscription_status || 'No status'}
                    </p>

                    {row.attention_required && (
                      <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
                        <p className="font-black">Attention required</p>
                        <p className="mt-1 text-sm">{row.churn_reason}</p>
                      </div>
                    )}

                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                      <MiniStat label="Health" value={`${row.health_score}/100`} />
                      <MiniStat label="Risk" value={`${row.risk_score}/100`} />
                      <MiniStat label="Churn" value={row.churn_level} />
                      <MiniStat label="Growth" value={row.growth_status} />
                      <MiniStat label="30d bookings" value={row.bookings_last_30_days} />
                      <MiniStat label="30d revenue" value={money(row.revenue_last_30_days)} />
                      <MiniStat label="Customers" value={row.total_customers} />
                      <MiniStat
                        label="Last booking"
                        value={
                          row.last_booking_date
                            ? new Date(row.last_booking_date).toLocaleDateString('en-GB')
                            : 'Never'
                        }
                      />
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {row.reasons.map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-slate-400"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredRows.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-500">
                No businesses found.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function getStatus(health: number, risk: number) {
  if (health >= 90 && risk <= 20) return 'Power User'
  if (health >= 70) return 'Healthy'
  if (health >= 50) return 'Warning'
  if (health >= 25) return 'At Risk'
  return 'Dormant'
}

function Badge({ status }: { status: string }) {
  const classes =
    status === 'Power User'
      ? 'bg-violet-500/10 text-violet-300'
      : status === 'Healthy'
        ? 'bg-emerald-500/10 text-emerald-300'
        : status === 'Warning'
          ? 'bg-amber-500/10 text-amber-300'
          : status === 'At Risk'
            ? 'bg-red-500/10 text-red-300'
            : 'bg-slate-500/10 text-slate-300'

  return (
    <span className={`rounded-full px-3 py-1 text-sm font-bold ${classes}`}>
      {status}
    </span>
  )
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

  return (
    <span className={`rounded-full px-3 py-1 text-sm font-bold ${classes}`}>
      {level}
    </span>
  )
}

function GrowthBadge({ status }: { status: string }) {
  const classes =
    status === 'Power Growth'
      ? 'bg-violet-500/10 text-violet-300'
      : status === 'Growing'
        ? 'bg-blue-500/10 text-blue-300'
        : 'bg-slate-500/10 text-slate-300'

  return (
    <span className={`rounded-full px-3 py-1 text-sm font-bold ${classes}`}>
      {status}
    </span>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  )
}

function money(value: number) {
  return `£${Number(value || 0).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}