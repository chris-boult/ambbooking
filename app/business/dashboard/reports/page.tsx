'use client'

import { useEffect, useState } from 'react'
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

export default function ReportsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReports()
  }, [])

  async function loadReports() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()

    if (!business) return

    const { data } = await supabase
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
      .eq('business_id', business.id)
      .order('booking_date', { ascending: false })

    const all = (data as unknown as Booking[]) || []
    const active = all.filter((booking) => booking.status !== 'cancelled')

    setAllBookings(all)
    setBookings(active)
    setLoading(false)
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

  if (loading) {
    return <div className="text-white">Loading reports...</div>
  }

  return (
    <div>
      <div className="mb-10">
        <p className="text-slate-400 mb-2">Reports</p>
        <h1 className="text-4xl font-bold mb-2">Revenue reporting</h1>
        <p className="text-slate-500">
          Track revenue, top services, team performance and customer trends.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard label="Today" value={`£${revenueToday}`} />
        <StatCard label="This week" value={`£${revenueThisWeek}`} />
        <StatCard label="This month" value={`£${revenueThisMonth}`} />
        <StatCard label="This year" value={`£${revenueThisYear}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard label="Total customers" value={totalCustomers} />
        <StatCard label="Avg booking value" value={`£${averageBookingValue}`} />
        <StatCard label="Total bookings" value={totalBookings} />
        <StatCard label="Cancellation rate" value={`${cancellationRate}%`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <InsightCard label="Most popular service" value={mostPopularService} />
        <InsightCard label="Best team member" value={bestTeamMember} />
        <InsightCard label="Busiest day" value={busiestDay} />
        <InsightCard label="Busiest hour" value={busiestHour} />
      </div>

      <div className="grid xl:grid-cols-2 gap-8 mb-8">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">Revenue last 30 days</h2>
          <Line data={revenueChartData} />
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">Bookings last 30 days</h2>
          <Bar data={bookingsChartData} />
        </section>
      </div>

      <div className="grid xl:grid-cols-2 gap-8 mb-8">
        <Leaderboard title="Top services" items={topServices} />
        <Leaderboard title="Top team members" items={topTeamMembers} />
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-6">Recent revenue</h2>

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
}: {
  title: string
  items: LeaderboardItem[]
}) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>

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
    </section>
  )
}