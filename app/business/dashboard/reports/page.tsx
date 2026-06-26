'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

import { Line, Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const REPORTING_FEATURE_KEY = 'reporting'
const ADVANCED_REPORTING_FEATURE_KEY = 'advanced_reporting'
const EXPORTS_FEATURE_KEY = 'exports'
const FINANCIAL_REPORTING_FEATURE_KEY = 'financial_reporting'
const STAFF_REPORTING_FEATURE_KEY = 'staff_reporting'

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
  reporting: boolean
  advancedReporting: boolean
  exports: boolean
  financialReporting: boolean
  staffReporting: boolean
}

type Booking = {
  id: string
  booking_date: string
  booking_time: string
  status: string
  services: {
    name: string
    price: number
  } | null
  team_members: {
    full_name: string
  } | null
  customers: {
    first_name: string
    last_name: string | null
  } | null
}

type LeaderboardItem = {
  name: string
  bookings: number
  revenue: number
}

const defaultFeatureState: FeatureState = {
  reporting: false,
  advancedReporting: false,
  exports: false,
  financialReporting: false,
  staffReporting: false,
}

const planFeatures: Record<string, FeatureState> = {
  starter: {
    reporting: false,
    advancedReporting: false,
    exports: false,
    financialReporting: false,
    staffReporting: false,
  },
  growth: {
    reporting: true,
    advancedReporting: false,
    exports: false,
    financialReporting: false,
    staffReporting: false,
  },
  pro: {
    reporting: true,
    advancedReporting: true,
    exports: true,
    financialReporting: true,
    staffReporting: true,
  },
  agency: {
    reporting: true,
    advancedReporting: true,
    exports: true,
    financialReporting: true,
    staffReporting: true,
  },
  enterprise: {
    reporting: true,
    advancedReporting: true,
    exports: true,
    financialReporting: true,
    staffReporting: true,
  },
}

export default function ReportsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [features, setFeatures] = useState<FeatureState>(defaultFeatureState)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadReports()
  }, [])

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

      if (key === REPORTING_FEATURE_KEY) {
        nextFeatures.reporting = enabled || (!disabled && nextFeatures.reporting)
      }

      if (key === ADVANCED_REPORTING_FEATURE_KEY) {
        nextFeatures.advancedReporting = enabled || (!disabled && nextFeatures.advancedReporting)
      }

      if (key === EXPORTS_FEATURE_KEY) {
        nextFeatures.exports = enabled || (!disabled && nextFeatures.exports)
      }

      if (key === FINANCIAL_REPORTING_FEATURE_KEY) {
        nextFeatures.financialReporting = enabled || (!disabled && nextFeatures.financialReporting)
      }

      if (key === STAFF_REPORTING_FEATURE_KEY) {
        nextFeatures.staffReporting = enabled || (!disabled && nextFeatures.staffReporting)
      }
    })

    setFeatures(nextFeatures)
    return nextFeatures
  }

  async function loadReports() {
    setLoading(true)
    setMessage('')

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setMessage('You need to be logged in.')
      setLoading(false)
      return
    }

    const { data: ownerBusiness } = await supabase
      .from('businesses')
      .select('id,plan,status,lifetime_access')
      .eq('owner_id', userData.user.id)
      .maybeSingle()

    let foundBusiness = ownerBusiness as Business | null

    if (!foundBusiness) {
      const { data: userBusiness } = await supabase
        .from('businesses')
        .select('id,plan,status,lifetime_access')
        .eq('user_id', userData.user.id)
        .maybeSingle()

      foundBusiness = userBusiness as Business | null
    }

    if (!foundBusiness) {
      const { data: anyBusiness } = await supabase
        .from('businesses')
        .select('id,plan,status,lifetime_access')
        .limit(1)
        .maybeSingle()

      foundBusiness = anyBusiness as Business | null
    }

    if (!foundBusiness) {
      setMessage('No business found.')
      setLoading(false)
      return
    }

    setBusiness(foundBusiness)
    await loadFeatureState(foundBusiness)

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        booking_time,
        status,
        services(name,price),
        team_members(full_name),
        customers(first_name,last_name)
      `)
      .eq('business_id', foundBusiness.id)
      .order('booking_date', { ascending: false })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const all = (data as unknown as Booking[]) || []
    const active = all.filter((booking) => booking.status !== 'cancelled')

    setAllBookings(all)
    setBookings(active)
    setLoading(false)
  }

  function requireFeature(enabled: boolean, featureName: string) {
    if (enabled) return true
    setMessage(`${featureName} is not included on this plan. Upgrade the business plan to unlock it.`)
    return false
  }

  function exportCsv() {
    setMessage('')

    if (!requireFeature(features.exports, 'Reporting exports')) return

    const rows = [
      ['Date', 'Time', 'Customer', 'Service', 'Team member', 'Status', 'Revenue'],
      ...bookings.map((booking) => [
        booking.booking_date,
        booking.booking_time,
        `${booking.customers?.first_name || ''} ${booking.customers?.last_name || ''}`.trim(),
        booking.services?.name || '',
        booking.team_members?.full_name || '',
        booking.status,
        String(Number(booking.services?.price || 0)),
      ]),
    ]

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reports-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const today = new Date()
  const todayString = today.toISOString().split('T')[0]

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + 1)
  const weekStartString = weekStart.toISOString().split('T')[0]

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split('T')[0]

  const yearStart = new Date(today.getFullYear(), 0, 1)
    .toISOString()
    .split('T')[0]

  function revenueFrom(startDate: string, endDate?: string) {
    return bookings
      .filter((booking) => {
        if (endDate) {
          return (
            booking.booking_date >= startDate &&
            booking.booking_date <= endDate
          )
        }

        return booking.booking_date >= startDate
      })
      .reduce((total, booking) => {
        return total + Number(booking.services?.price || 0)
      }, 0)
  }

  const revenueToday = revenueFrom(todayString, todayString)
  const revenueThisWeek = revenueFrom(weekStartString)
  const revenueThisMonth = revenueFrom(monthStart)
  const revenueThisYear = revenueFrom(yearStart)

  const totalBookings = bookings.length

  const totalCustomers = new Set(
    allBookings
      .map((booking) => {
        const first = booking.customers?.first_name || ''
        const last = booking.customers?.last_name || ''
        return `${first} ${last}`.trim()
      })
      .filter(Boolean)
  ).size

  const totalRevenue = bookings.reduce((total, booking) => {
    return total + Number(booking.services?.price || 0)
  }, 0)

  const averageBookingValue =
    totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0

  const cancelledBookings = allBookings.filter(
    (booking) => booking.status === 'cancelled'
  ).length

  const cancellationRate =
    allBookings.length > 0
      ? Math.round((cancelledBookings / allBookings.length) * 100)
      : 0

  const topServices = buildLeaderboard(
    bookings,
    (booking) => booking.services?.name || 'Unknown service'
  )

  const topTeamMembers = buildLeaderboard(
    bookings,
    (booking) => booking.team_members?.full_name || 'Unknown team member'
  )

  const mostPopularService = topServices[0]?.name || 'No data'
  const bestTeamMember = topTeamMembers[0]?.name || 'No data'
  const busiestDay = getBusiestDay(bookings)
  const busiestHour = getBusiestHour(bookings)

  const recentRevenue = bookings.slice(0, 8)

  const chartData = buildLast30DaysChart(bookings)

  const revenueChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Revenue',
        data: chartData.revenueData,
      },
    ],
  }

  const bookingsChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Bookings',
        data: chartData.bookingData,
      },
    ],
  }

  const currentPlan = useMemo(() => {
    return String(business?.plan || 'starter').toUpperCase()
  }, [business?.plan])

  if (loading) {
    return <div className="text-white">Loading reports...</div>
  }

  if (!features.reporting) {
    return (
      <div>
        <div className="mb-10">
          <p className="text-slate-400 mb-2">Pack 9 commercial gating</p>
          <h1 className="text-4xl font-bold mb-2">Revenue reporting</h1>
          <p className="text-slate-500">
            Reporting is not included on the current {currentPlan} plan.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
            {message}
          </div>
        )}

        <LockedFeatureCard
          title="Reporting is locked"
          description="Upgrade this business to unlock revenue reporting, booking analytics, leaderboards, trends and exports."
          feature="Reporting"
          plan={currentPlan}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-slate-400 mb-2">Pack 9 commercial gating</p>
          <h1 className="text-4xl font-bold mb-2">Revenue reporting</h1>
          <p className="text-slate-500">
            Track revenue, top services, team performance and customer trends.
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
            onClick={exportCsv}
            disabled={!features.exports}
            className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>

          <button
            type="button"
            onClick={loadReports}
            className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950"
          >
            Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
          {message}
        </div>
      )}

      <div className="mb-8 grid gap-4 md:grid-cols-5">
        <FeatureStatusCard title="Reporting" enabled={features.reporting} description="Basic reporting dashboard." />
        <FeatureStatusCard title="Advanced" enabled={features.advancedReporting} description="Charts and trend insights." />
        <FeatureStatusCard title="Exports" enabled={features.exports} description="CSV reporting exports." />
        <FeatureStatusCard title="Financial" enabled={features.financialReporting} description="Revenue and value analytics." />
        <FeatureStatusCard title="Staff" enabled={features.staffReporting} description="Team performance reports." />
      </div>

      {features.financialReporting && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard label="Today" value={`£${revenueToday}`} />
          <StatCard label="This week" value={`£${revenueThisWeek}`} />
          <StatCard label="This month" value={`£${revenueThisMonth}`} />
          <StatCard label="This year" value={`£${revenueThisYear}`} />
        </div>
      )}

      {!features.financialReporting && (
        <LockedInline message="Financial reporting is locked on this plan." />
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard label="Total customers" value={totalCustomers} />
        <StatCard label="Avg booking value" value={features.financialReporting ? `£${averageBookingValue}` : 'Locked'} />
        <StatCard label="Total bookings" value={totalBookings} />
        <StatCard label="Cancellation rate" value={`${cancellationRate}%`} />
      </div>

      {features.advancedReporting && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <InsightCard label="Most popular service" value={mostPopularService} />
          <InsightCard label="Best team member" value={features.staffReporting ? bestTeamMember : 'Locked'} />
          <InsightCard label="Busiest day" value={busiestDay} />
          <InsightCard label="Busiest hour" value={busiestHour} />
        </div>
      )}

      {!features.advancedReporting && (
        <LockedInline message="Advanced reporting insights are locked on this plan." />
      )}

      {features.advancedReporting && (
        <div className="grid xl:grid-cols-2 gap-8 mb-8">
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Revenue last 30 days</h2>
            {features.financialReporting ? <Line data={revenueChartData} /> : <LockedChart message="Financial charts are locked." />}
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Bookings last 30 days</h2>
            <Bar data={bookingsChartData} />
          </section>
        </div>
      )}

      <div className="grid xl:grid-cols-2 gap-8 mb-8">
        <Leaderboard title="Top services" items={topServices} locked={!features.advancedReporting} />
        <Leaderboard title="Top team members" items={topTeamMembers} locked={!features.staffReporting} />
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-6">Recent revenue</h2>

        {!features.financialReporting && (
          <LockedInline message="Recent revenue is locked on this plan." />
        )}

        {features.financialReporting && (
          <div className="space-y-4">
            {recentRevenue.map((booking) => (
              <div
                key={booking.id}
                className="border border-slate-800 rounded-xl p-4 flex justify-between gap-4"
              >
                <div>
                  <p className="font-bold">
                    {booking.customers?.first_name}{' '}
                    {booking.customers?.last_name}
                  </p>

                  <p className="text-slate-400 text-sm">
                    {booking.services?.name} with{' '}
                    {booking.team_members?.full_name}
                  </p>

                  <p className="text-slate-500 text-sm">
                    {new Date(booking.booking_date).toLocaleDateString('en-GB')}{' '}
                    at {booking.booking_time?.slice(0, 5)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold">
                    £{booking.services?.price || 0}
                  </p>

                  <p className="text-emerald-400 text-sm">
                    {booking.status}
                  </p>
                </div>
              </div>
            ))}

            {recentRevenue.length === 0 && (
              <p className="text-slate-500">No revenue yet.</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function buildLast30DaysChart(bookings: Booking[]) {
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - index))

    const value = date.toISOString().split('T')[0]

    return {
      value,
      label: date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      }),
    }
  })

  const revenueData = days.map((day) => {
    return bookings
      .filter((booking) => booking.booking_date === day.value)
      .reduce((total, booking) => {
        return total + Number(booking.services?.price || 0)
      }, 0)
  })

  const bookingData = days.map((day) => {
    return bookings.filter((booking) => booking.booking_date === day.value)
      .length
  })

  return {
    labels: days.map((day) => day.label),
    revenueData,
    bookingData,
  }
}

function buildLeaderboard(
  bookings: Booking[],
  getName: (booking: Booking) => string
): LeaderboardItem[] {
  const map = new Map<string, LeaderboardItem>()

  bookings.forEach((booking) => {
    const name = getName(booking)
    const revenue = Number(booking.services?.price || 0)

    const existing = map.get(name)

    if (existing) {
      existing.bookings += 1
      existing.revenue += revenue
    } else {
      map.set(name, {
        name,
        bookings: 1,
        revenue,
      })
    }
  })

  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
}

function getBusiestDay(bookings: Booking[]) {
  const days = new Map<string, number>()

  bookings.forEach((booking) => {
    const day = new Date(booking.booking_date).toLocaleDateString('en-GB', {
      weekday: 'long',
    })

    days.set(day, (days.get(day) || 0) + 1)
  })

  return [...days.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'No data'
}

function getBusiestHour(bookings: Booking[]) {
  const hours = new Map<string, number>()

  bookings.forEach((booking) => {
    const hour = booking.booking_time?.slice(0, 2)
    if (!hour) return

    const label = `${hour}:00`
    hours.set(label, (hours.get(label) || 0) + 1)
  })

  return [...hours.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'No data'
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <p className="text-slate-400 mb-2">{label}</p>
      <h2 className="text-3xl font-bold">{value}</h2>
    </div>
  )
}

function InsightCard({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <p className="text-slate-400 mb-2">{label}</p>
      <h2 className="text-xl font-bold">{value}</h2>
    </div>
  )
}

function Leaderboard({
  title,
  items,
  locked,
}: {
  title: string
  items: LeaderboardItem[]
  locked?: boolean
}) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>

      {locked && <LockedInline message={`${title} is locked on this plan.`} />}

      {!locked && (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.name}
              className="border border-slate-800 rounded-xl p-4 flex justify-between gap-4"
            >
              <div>
                <p className="font-bold">{item.name}</p>
                <p className="text-slate-400 text-sm">
                  {item.bookings} booking{item.bookings === 1 ? '' : 's'}
                </p>
              </div>

              <p className="font-bold">£{item.revenue}</p>
            </div>
          ))}

          {items.length === 0 && (
            <p className="text-slate-500">No data yet.</p>
          )}
        </div>
      )}
    </section>
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
          <span className="font-black text-white">Action:</span> Enable this feature from platform admin feature controls or move the business to a reporting-enabled plan.
        </p>
      </div>
    </div>
  )
}

function LockedInline({ message }: { message: string }) {
  return (
    <div className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
      {message}
    </div>
  )
}

function LockedChart({ message }: { message: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center text-amber-200">
      {message}
    </div>
  )
}
