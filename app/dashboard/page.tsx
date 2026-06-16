'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Booking = {
  id: string
  booking_date: string
  booking_time: string
  status: string
  customers: { first_name: string; last_name: string | null } | null
  services: { name: string; price: number } | null
  team_members: { full_name: string } | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [stats, setStats] = useState({
    bookingsToday: 0,
    upcomingBookings: 0,
    customers: 0,
    services: 0,
    teamMembers: 0,
    revenueThisMonth: 0,
  })
  const [todaysBookings, setTodaysBookings] = useState<Booking[]>([])
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push('/login')
      return
    }

    setEmail(userData.user.email || '')

    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userData.user.id)
      .single()

    if (!business) {
      router.push('/business/create')
      return
    }

    setBusinessName(business.business_name)

    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthStartString = monthStart.toISOString().split('T')[0]

    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)

    const { count: serviceCount } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)

    const { count: teamCount } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)

    const { count: bookingsTodayCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('booking_date', today)
      .neq('status', 'cancelled')

    const { count: upcomingBookingsCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('booking_date', today)
      .neq('status', 'cancelled')

    const { data: monthBookings } = await supabase
      .from('bookings')
      .select(`
        status,
        booking_date,
        services(price)
      `)
      .eq('business_id', business.id)
      .gte('booking_date', monthStartString)
      .neq('status', 'cancelled')

    const revenueThisMonth =
      monthBookings?.reduce((total, booking: any) => {
        return total + Number(booking.services?.price || 0)
      }, 0) || 0

    const { data: todaysData } = await supabase
      .from('bookings')
      .select(`
        *,
        customers(first_name,last_name),
        services(name,price),
        team_members(full_name)
      `)
      .eq('business_id', business.id)
      .eq('booking_date', today)
      .neq('status', 'cancelled')
      .order('booking_time', { ascending: true })

    const { data: recentData } = await supabase
      .from('bookings')
      .select(`
        *,
        customers(first_name,last_name),
        services(name,price),
        team_members(full_name)
      `)
      .eq('business_id', business.id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(5)

    setStats({
      bookingsToday: bookingsTodayCount || 0,
      upcomingBookings: upcomingBookingsCount || 0,
      customers: customerCount || 0,
      services: serviceCount || 0,
      teamMembers: teamCount || 0,
      revenueThisMonth,
    })

    setTodaysBookings((todaysData as Booking[]) || [])
    setRecentBookings((recentData as Booking[]) || [])
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
            href="/dashboard/bookings"
            className="bg-white text-slate-950 font-bold px-5 py-3 rounded-xl"
          >
            Manage bookings
          </Link>

          <Link
            href="/dashboard/services"
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-3 rounded-xl"
          >
            Add service
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-6 mb-10">
        <StatCard label="Today" value={stats.bookingsToday} />
        <StatCard label="Upcoming" value={stats.upcomingBookings} />
        <StatCard label="Revenue this month" value={`£${stats.revenueThisMonth}`} />
        <StatCard label="Customers" value={stats.customers} />
        <StatCard label="Services" value={stats.services} />
        <StatCard label="Team" value={stats.teamMembers} />
      </div>

      <div className="grid xl:grid-cols-2 gap-8">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Today's schedule</h2>
            <Link href="/dashboard/calendar" className="text-sm text-slate-400 hover:text-white">
              View calendar
            </Link>
          </div>

          <div className="space-y-4">
            {todaysBookings.map((booking) => (
              <BookingRow key={booking.id} booking={booking} />
            ))}

            {todaysBookings.length === 0 && (
              <p className="text-slate-500">No bookings scheduled for today.</p>
            )}
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recent bookings</h2>
            <Link href="/dashboard/bookings" className="text-sm text-slate-400 hover:text-white">
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

function BookingRow({
  booking,
  showDate = false,
}: {
  booking: Booking
  showDate?: boolean
}) {
  const formattedDate = new Date(booking.booking_date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
      <div>
        <h3 className="font-bold">
          {booking.customers?.first_name} {booking.customers?.last_name}
        </h3>

        <p className="text-slate-400 text-sm">
          {booking.services?.name} with {booking.team_members?.full_name}
        </p>
      </div>

      <div className="text-right">
        {showDate && <p className="font-bold">{formattedDate}</p>}
        <p className="text-slate-400 text-sm">
          {booking.booking_time?.slice(0, 5)}
        </p>
        <p className="text-slate-500 text-sm">
          £{booking.services?.price || 0}
        </p>
      </div>
    </div>
  )
}