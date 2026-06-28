'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PushNotificationOptIn } from '@/components/notifications/PushNotificationOptIn'

import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  LineChart,
  PoundSterling,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
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
  const [businessId, setBusinessId] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [customersCount, setCustomersCount] = useState(0)
  const [servicesCount, setServicesCount] = useState(0)
  const [teamCount, setTeamCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setBusinessId(business.id)

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

  const dashboard = useMemo(() => {
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

    const chartData = buildLast30DaysChart(revenueBookings)

    return {
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      noShowBookings,
      revenueBookings,
      todayBookings,
      upcomingBookings,
      revenueToday,
      revenueThisWeek,
      totalRevenue,
      averageBookingValue,
      cancellationRate,
      noShowRate,
      topServices,
      topTeamMembers,
      topService: topServices[0]?.name || 'No data',
      topStaff: topTeamMembers[0]?.name || 'No data',
      recentBookings: bookings.slice(0, 6),
      chartData,
    }
  }, [bookings])

  const revenueChartData = {
    labels: dashboard.chartData.labels,
    datasets: [
      {
        label: 'Revenue',
        data: dashboard.chartData.revenueData,
        tension: 0.42,
        fill: true,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 5,
      },
    ],
  }

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#020617',
        titleColor: '#ffffff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 14,
        callbacks: {
          label: (context: any) => `Revenue: £${context.raw}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255,255,255,0.04)',
        },
        ticks: {
          color: '#64748b',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255,255,255,0.06)',
        },
        ticks: {
          color: '#64748b',
          callback: (value: any) => `£${value}`,
        },
      },
    },
  }

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-6 text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.18),transparent_34%),radial-gradient(circle_at_85%_70%,rgba(124,58,237,.13),transparent_32%)]" />
        <div className="rounded-[2rem] border border-white/10 bg-[#07111f] px-8 py-6 font-black text-slate-200 shadow-[0_50px_180px_rgba(0,0,0,.55)]">
          Loading dashboard...
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_25%_0%,rgba(34,211,238,.12),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(59,130,246,.10),transparent_30%),radial-gradient(circle_at_20%_85%,rgba(124,58,237,.10),transparent_34%)]" />

      <div className="mx-auto max-w-[1500px] px-6 py-10">
        <div className="mb-8 overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_70px_240px_rgba(0,0,0,.55)]">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
                <Sparkles size={14} />
                Business dashboard
              </div>

              <h1 className="max-w-5xl text-5xl font-black leading-[1.02] tracking-[-0.055em] md:text-7xl">
                Welcome back,
                <br />
                {businessName}.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
                Monitor today&apos;s bookings, revenue, customers, team performance and business activity from one connected command centre.
              </p>

              <p className="mt-3 text-sm font-bold text-slate-500">
                Logged in as {email}
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <DashboardButton href="/business/dashboard/bookings" primary>
                Manage bookings
              </DashboardButton>

              <DashboardButton href="/business/dashboard/calendar">
                View calendar
              </DashboardButton>

              <DashboardButton href="/business/dashboard/reports">
                Reports
              </DashboardButton>
            </div>
          </div>
        </div>

        {businessId && (
          <div className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
            <PushNotificationOptIn businessId={businessId} />
          </div>
        )}

        <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Today&apos;s revenue"
            value={`£${dashboard.revenueToday}`}
            icon={PoundSterling}
            detail={`${dashboard.todayBookings.length} bookings today`}
            featured
          />
          <StatCard
            label="This week"
            value={`£${dashboard.revenueThisWeek}`}
            icon={TrendingUp}
            detail="Confirmed and completed revenue"
          />
          <StatCard
            label="Customers"
            value={customersCount}
            icon={Users}
            detail={`${bookings.length} total bookings`}
          />
          <StatCard
            label="Avg booking"
            value={`£${dashboard.averageBookingValue}`}
            icon={CreditCard}
            detail="Average booking value"
          />
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            label="Bookings today"
            value={dashboard.todayBookings.length}
            icon={CalendarDays}
          />
          <InsightCard
            label="Upcoming"
            value={dashboard.upcomingBookings.length}
            icon={Clock}
          />
          <InsightCard
            label="Completed"
            value={dashboard.completedBookings.length}
            icon={CheckCircle2}
          />
          <InsightCard
            label="No shows"
            value={dashboard.noShowBookings.length}
            icon={XCircle}
          />
        </div>

        <div className="mb-8 grid gap-8 xl:grid-cols-[1.45fr_0.8fr]">
          <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-cyan-300">
                  Revenue
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  Last 30 days
                </h2>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-300">
                Total £{dashboard.totalRevenue}
              </div>
            </div>

            <div className="h-[340px]">
              <Line data={revenueChartData} options={revenueChartOptions} />
            </div>
          </section>

          <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-cyan-300">
                  Snapshot
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  Business health
                </h2>
              </div>

              <BarChart3 className="text-cyan-300" />
            </div>

            <div className="space-y-4">
              <MiniStat label="Services" value={servicesCount} />
              <MiniStat label="Team members" value={teamCount} />
              <MiniStat label="Total bookings" value={bookings.length} />
              <MiniStat label="Confirmed" value={dashboard.confirmedBookings.length} />
              <MiniStat label="Cancelled" value={dashboard.cancelledBookings.length} />
              <MiniStat label="Total revenue" value={`£${dashboard.totalRevenue}`} />
            </div>
          </section>
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            label="Cancellation rate"
            value={`${dashboard.cancellationRate}%`}
            icon={XCircle}
          />
          <InsightCard
            label="No-show rate"
            value={`${dashboard.noShowRate}%`}
            icon={UserRound}
          />
          <InsightCard
            label="Top service"
            value={dashboard.topService}
            icon={LineChart}
          />
          <InsightCard
            label="Top staff"
            value={dashboard.topStaff}
            icon={Users}
          />
        </div>

        <div className="grid gap-8 xl:grid-cols-2">
          <BookingPanel
            title="Today&apos;s schedule"
            subtitle="Confirmed appointments for today"
            href="/business/dashboard/calendar"
            hrefLabel="View calendar"
            bookings={dashboard.todayBookings}
            empty="No bookings scheduled for today."
          />

          <BookingPanel
            title="Recent activity"
            subtitle="Latest booking activity across your business"
            href="/business/dashboard/bookings"
            hrefLabel="View all"
            bookings={dashboard.recentBookings}
            empty="No recent bookings yet."
            showDate
          />
        </div>
      </div>
    </main>
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

function DashboardButton({
  href,
  children,
  primary = false,
}: {
  href: string
  children: React.ReactNode
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-black transition hover:-translate-y-1 ${
        primary
          ? 'bg-cyan-400 text-slate-950 shadow-[0_0_80px_rgba(34,211,238,.25)] hover:bg-cyan-300'
          : 'border border-white/10 bg-white/[0.045] text-white hover:bg-white/[0.09]'
      }`}
    >
      {children}
      <ArrowRight size={17} className="transition group-hover:translate-x-1" />
    </Link>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  detail,
  featured = false,
}: {
  label: string
  value: number | string
  icon: any
  detail: string
  featured?: boolean
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_40px_140px_rgba(0,0,0,.35)] ${
        featured
          ? 'border-cyan-300/40 bg-cyan-400 text-slate-950'
          : 'border-white/10 bg-[#07111f] text-white'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`mb-3 text-sm font-black ${featured ? 'text-slate-700' : 'text-slate-400'}`}>
            {label}
          </p>
          <h2 className="text-4xl font-black tracking-[-0.05em]">{value}</h2>
          <p className={`mt-3 text-sm font-bold ${featured ? 'text-slate-700' : 'text-slate-500'}`}>
            {detail}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            featured ? 'bg-slate-950 text-cyan-300' : 'bg-cyan-400 text-slate-950'
          }`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  )
}

function InsightCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number | string
  icon: any
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
        <Icon size={20} />
      </div>
      <p className="mb-2 text-sm font-bold text-slate-400">{label}</p>
      <h2 className="text-2xl font-black tracking-[-0.03em]">{value}</h2>
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
    <div className="flex items-center justify-between gap-5 rounded-2xl border border-white/10 bg-slate-950 px-5 py-4">
      <p className="text-sm font-bold text-slate-400">{label}</p>
      <p className="text-lg font-black text-white">{value}</p>
    </div>
  )
}

function BookingPanel({
  title,
  subtitle,
  href,
  hrefLabel,
  bookings,
  empty,
  showDate = false,
}: {
  title: string
  subtitle: string
  href: string
  hrefLabel: string
  bookings: Booking[]
  empty: string
  showDate?: boolean
}) {
  return (
    <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
      <div className="mb-8 flex items-start justify-between gap-5">
        <div>
          <p className="text-sm font-bold text-cyan-300">{subtitle}</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">{title}</h2>
        </div>

        <Link
          href={href}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
        >
          {hrefLabel}
        </Link>
      </div>

      <div className="space-y-4">
        {bookings.map((booking) => (
          <BookingRow key={booking.id} booking={booking} showDate={showDate} />
        ))}

        {bookings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-500">
            {empty}
          </div>
        )}
      </div>
    </section>
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

  const customerName = `${booking.customers?.[0]?.first_name || 'Customer'} ${
    booking.customers?.[0]?.last_name || ''
  }`.trim()

  const status = booking.status || 'confirmed'

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h3 className="font-black text-white">{customerName}</h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {booking.services?.[0]?.name || 'Service'} with{' '}
            {booking.team_members?.[0]?.full_name || 'Team member'}
          </p>

          <div className="mt-3 inline-flex rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-300">
            {status.replace('_', ' ')}
          </div>
        </div>

        <div className="text-right">
          {showDate && <p className="font-black text-white">{formattedDate}</p>}

          <p className="text-sm font-bold text-slate-400">
            {booking.booking_time?.slice(0, 5)}
          </p>

          <p className="mt-2 text-lg font-black text-white">
            £{booking.services?.[0]?.price || 0}
          </p>
        </div>
      </div>
    </div>
  )
}
