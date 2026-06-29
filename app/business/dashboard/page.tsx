'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PushNotificationOptIn } from '@/components/notifications/PushNotificationOptIn'

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  LineChart,
  PoundSterling,
  TrendingUp,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react'

import type { Booking } from '@/app/business/dashboard/types'
import { buildDashboardData } from '@/app/business/dashboard/utils/dashboardMetrics'
import DashboardHero from './components/DashboardHero'
import DashboardStatCard from './components/DashboardStatCard'
import InsightCard from './components/InsightCard'
import RevenueChartPanel from './components/RevenueChartPanel'
import BusinessHealthPanel from './components/BusinessHealthPanel'
import BookingPanel from './components/BookingPanel'

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

    const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', business.id)
    const { count: serviceCount } = await supabase.from('services').select('*', { count: 'exact', head: true }).eq('business_id', business.id)
    const { count: teamMemberCount } = await supabase.from('team_members').select('*', { count: 'exact', head: true }).eq('business_id', business.id)

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

  const dashboard = useMemo(() => buildDashboardData(bookings), [bookings])

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
        <DashboardHero businessName={businessName} email={email} />

        {businessId && (
          <div className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
            <PushNotificationOptIn businessId={businessId} />
          </div>
        )}

        <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard label="Today&apos;s revenue" value={`£${dashboard.revenueToday}`} icon={PoundSterling} detail={`${dashboard.todayBookings.length} bookings today`} featured />
          <DashboardStatCard label="This week" value={`£${dashboard.revenueThisWeek}`} icon={TrendingUp} detail="Confirmed and completed revenue" />
          <DashboardStatCard label="Customers" value={customersCount} icon={Users} detail={`${bookings.length} total bookings`} />
          <DashboardStatCard label="Avg booking" value={`£${dashboard.averageBookingValue}`} icon={CreditCard} detail="Average booking value" />
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <InsightCard label="Bookings today" value={dashboard.todayBookings.length} icon={CalendarDays} />
          <InsightCard label="Upcoming" value={dashboard.upcomingBookings.length} icon={Clock} />
          <InsightCard label="Completed" value={dashboard.completedBookings.length} icon={CheckCircle2} />
          <InsightCard label="No shows" value={dashboard.noShowBookings.length} icon={XCircle} />
        </div>

        <div className="mb-8 grid gap-8 xl:grid-cols-[1.45fr_0.8fr]">
          <RevenueChartPanel labels={dashboard.chartData.labels} revenueData={dashboard.chartData.revenueData} totalRevenue={dashboard.totalRevenue} />
          <BusinessHealthPanel servicesCount={servicesCount} teamCount={teamCount} bookingsCount={bookings.length} dashboard={dashboard} />
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <InsightCard label="Cancellation rate" value={`${dashboard.cancellationRate}%`} icon={XCircle} />
          <InsightCard label="No-show rate" value={`${dashboard.noShowRate}%`} icon={UserRound} />
          <InsightCard label="Top service" value={dashboard.topService} icon={LineChart} />
          <InsightCard label="Top staff" value={dashboard.topStaff} icon={Users} />
        </div>

        <div className="grid gap-8 xl:grid-cols-2">
          <BookingPanel title="Today&apos;s schedule" subtitle="Confirmed appointments for today" href="/business/dashboard/calendar" hrefLabel="View calendar" bookings={dashboard.todayBookings} empty="No bookings scheduled for today." />
          <BookingPanel title="Recent activity" subtitle="Latest booking activity across your business" href="/business/dashboard/bookings" hrefLabel="View all" bookings={dashboard.recentBookings} empty="No recent bookings yet." showDate />
        </div>
      </div>
    </main>
  )
}
