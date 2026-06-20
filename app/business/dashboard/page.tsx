'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'

import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
)

type Booking = {
  id: string
  booking_date: string
  booking_time: string
  status: string | null
  customers:
    | {
        first_name: string
        last_name: string | null
      }[]
    | null
  services:
    | {
        name: string
        price: number
      }[]
    | null
  team_members:
    | {
        full_name: string
      }[]
    | null
}

type LeaderboardItem = {
  name: string
  bookings: number
  revenue: number
}

export default function DashboardPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [customersCount, setCustomersCount] = useState(0)
  const [servicesCount, setServicesCount] = useState(0)
  const [teamCount, setTeamCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
  setLoading(true)

  const { data: userData } = await supabase.auth.getUser()

  if (!userData.user) {
    router.push('/login')
    return
  }

  setEmail(userData.user.email || '')

  const { data: businesses, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (businessError) {
    console.error(businessError)
    setLoading(false)
    return
  }

  const business = businesses?.[0]

  if (!business) {
    router.push('/business/create')
    return
  }

  setBusinessName(business.business_name)

  const { count: customerCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id)

  const { count: serviceCount } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id)

  const { count: teamMemberCount } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id)

  const { data: bookingsData } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_date,
      booking_time,
      status,
      customers(first_name,last_name),
      services(name,price),
      team_members(full_name)
    `)
    .eq('business_id', business.id)
    .order('booking_date', { ascending: false })
    .order('booking_time', { ascending: true })

  setCustomersCount(customerCount || 0)
  setServicesCount(serviceCount || 0)
  setTeamCount(teamMemberCount || 0)
  setBookings((bookingsData as unknown as Booking[]) || [])
  setLoading(false)
}

  const today = new Date()
  const todayString = today.toISOString().split('T')[0]

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + 1)
  const weekStartString = weekStart.toISOString().split('T')[0]

  const confirmedBookings = bookings.filter(
    (booking) => (booking.status || 'confirmed') === 'confirmed'
  )

  const completedBookings = bookings.filter(
    (booking) => booking.status === 'completed'
  )

  const cancelledBookings = bookings.filter(
    (booking) => booking.status === 'cancelled'
  )

  const noShowBookings = bookings.filter(
    (booking) => booking.status === 'no_show'
  )

  const revenueBookings = bookings.filter(
    (booking) =>
      (booking.status || 'confirmed') === 'confirmed' ||
      booking.status === 'completed'
  )

  const todayBookings = confirmedBookings.filter(
    (booking) => booking.booking_date === todayString
  )

  const upcomingBookings = confirmedBookings.filter(
    (booking) => booking.booking_date >= todayString
  )

  const revenueToday = getRevenue(
    revenueBookings.filter((booking) => booking.booking_date === todayString)
  )

  const revenueThisWeek = getRevenue(
    revenueBookings.filter((booking) => booking.booking_date >= weekStartString)
  )

  const totalRevenue = getRevenue(revenueBookings)

  const averageBookingValue =
    revenueBookings.length > 0
      ? Math.round(totalRevenue / revenueBookings.length)
      : 0

  const cancellationRate =
    bookings.length > 0
      ? Math.round((cancelledBookings.length / bookings.length) * 100)
      : 0

  const noShowRate =
    bookings.length > 0
      ? Math.round((noShowBookings.length / bookings.length) * 100)
      : 0

  const topServices = buildLeaderboard(
    revenueBookings,
    (booking) => booking.services?.[0]?.name || 'Unknown service'
  )

  const topTeamMembers = buildLeaderboard(
    revenueBookings,
    (booking) => booking.team_members?.[0]?.full_name || 'Unknown team member'
  )

  const topService = topServices[0]?.name || 'No data'
  const topStaff = topTeamMembers[0]?.name || 'No data'

  const recentBookings = bookings.slice(0, 6)

  const chartData = buildLast30DaysChart(revenueBookings)

  const revenueChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Revenue',
        data: chartData.revenueData,
      },
    ],
  }

  if (loading) {
    return <div className="text-white">Loading dashboard...</div>
  }

  return (
    <div>
      <div className="mb-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <p className="text-slate-400 mb-2">Welcome back</p>
          <h1 className="text-4xl font-bold mb-2">{businessName}</h1>
          <p className="text-slate-500">Logged in as: {email}</p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/business/dashboard/bookings"
            className="bg-white text-slate-950 font-bold px-5 py-3 rounded-xl"
          >
            Manage bookings
          </Link>

          <Link
            href="/business/dashboard/reports"
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-3 rounded-xl"
          >
            View reports
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard label="Today's revenue" value={`£${revenueToday}`} />
        <StatCard label="This week" value={`£${revenueThisWeek}`} />
        <StatCard label="Customers" value={customersCount} />
        <StatCard label="Avg booking" value={`£${averageBookingValue}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <InsightCard label="Bookings today" value={todayBookings.length} />
        <InsightCard label="Upcoming" value={upcomingBookings.length} />
        <InsightCard label="Completed" value={completedBookings.length} />
        <InsightCard label="No shows" value={noShowBookings.length} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <InsightCard label="Cancellation rate" value={`${cancellationRate}%`} />
        <InsightCard label="No-show rate" value={`${noShowRate}%`} />
        <InsightCard label="Top service" value={topService} />
        <InsightCard label="Top staff" value={topStaff} />
      </div>

      <div className="grid xl:grid-cols-3 gap-8 mb-8">
        <section className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">Revenue last 30 days</h2>
          <Line data={revenueChartData} />
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">Business snapshot</h2>

          <div className="space-y-4">
            <MiniStat label="Services" value={servicesCount} />
            <MiniStat label="Team members" value={teamCount} />
            <MiniStat label="Total bookings" value={bookings.length} />
            <MiniStat label="Confirmed" value={confirmedBookings.length} />
            <MiniStat label="Cancelled" value={cancelledBookings.length} />
            <MiniStat label="Total revenue" value={`£${totalRevenue}`} />
          </div>
        </section>
      </div>

      <div className="grid xl:grid-cols-2 gap-8">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Today's schedule</h2>
            <Link
              href="/business/dashboard/calendar"
              className="text-sm text-slate-400 hover:text-white"
            >
              View calendar
            </Link>
          </div>

          <div className="space-y-4">
            {todayBookings.map((booking) => (
              <BookingRow key={booking.id} booking={booking} />
            ))}

            {todayBookings.length === 0 && (
              <p className="text-slate-500">No bookings scheduled for today.</p>
            )}
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recent activity</h2>
            <Link
              href="/business/dashboard/bookings"
              className="text-sm text-slate-400 hover:text-white"
            >
              View all
            </Link>
          </div>

          <div className="space-y-4">
            {recentBookings.map((booking) => (
              <BookingRow key={booking.id} booking={booking} showDate />
            ))}

            {recentBookings.length === 0 && (
              <p className="text-slate-500">No recent bookings yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function getRevenue(bookings: Booking[]) {
  return bookings.reduce((total, booking) => {
    return total + Number(booking.services?.[0]?.price || 0)
  }, 0)
}

function buildLeaderboard(
  bookings: Booking[],
  getName: (booking: Booking) => string
): LeaderboardItem[] {
  const map = new Map<string, LeaderboardItem>()

  bookings.forEach((booking) => {
    const name = getName(booking)
    const revenue = Number(booking.services?.[0]?.price || 0)

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
        return total + Number(booking.services?.[0]?.price || 0)
      }, 0)
  })

  return {
    labels: days.map((day) => day.label),
    revenueData,
  }
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

function MiniStat({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="border border-slate-800 rounded-xl p-4">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

function BookingRow({
  booking,
  showDate = false,
}: {
  booking: Booking
  showDate?: boolean
}) {
  const formattedDate = new Date(booking.booking_date).toLocaleDateString(
    'en-GB',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }
  )

  return (
    <div className="border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
      <div>
        <h3 className="font-bold">
          {booking.customers?.[0]?.first_name}{' '}
          {booking.customers?.[0]?.last_name}
        </h3>

        <p className="text-slate-400 text-sm">
          {booking.services?.[0]?.name} with{' '}
          {booking.team_members?.[0]?.full_name}
        </p>
      </div>

      <div className="text-right">
        {showDate && <p className="font-bold">{formattedDate}</p>}

        <p className="text-slate-400 text-sm">
          {booking.booking_time?.slice(0, 5)}
        </p>

        <p className="text-slate-500 text-sm">
          £{booking.services?.[0]?.price || 0}
        </p>

        <p className="text-slate-500 text-xs mt-1">
          {booking.status || 'confirmed'}
        </p>
      </div>
    </div>
  )
}
