import type { Booking, LeaderboardItem } from '../types'

export function getRevenue(bookings: Booking[]) {
  return bookings.reduce((total, booking) => total + Number(booking.services?.[0]?.price || 0), 0)
}

export function buildLeaderboard(bookings: Booking[], getName: (booking: Booking) => string): LeaderboardItem[] {
  const map = new Map<string, LeaderboardItem>()

  bookings.forEach((booking) => {
    const name = getName(booking)
    const revenue = Number(booking.services?.[0]?.price || 0)
    const existing = map.get(name)

    if (existing) {
      existing.bookings += 1
      existing.revenue += revenue
    } else {
      map.set(name, { name, bookings: 1, revenue })
    }
  })

  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
}

export function buildLast30DaysChart(bookings: Booking[]) {
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
      .reduce((total, booking) => total + Number(booking.services?.[0]?.price || 0), 0)
  })

  return {
    labels: days.map((day) => day.label),
    revenueData,
  }
}

export function buildDashboardData(bookings: Booking[]) {
  const today = new Date()
  const todayString = today.toISOString().split('T')[0]

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + 1)
  const weekStartString = weekStart.toISOString().split('T')[0]

  const confirmedBookings = bookings.filter((booking) => (booking.status || 'confirmed') === 'confirmed')
  const completedBookings = bookings.filter((booking) => booking.status === 'completed')
  const cancelledBookings = bookings.filter((booking) => booking.status === 'cancelled')
  const noShowBookings = bookings.filter((booking) => booking.status === 'no_show')
  const revenueBookings = bookings.filter((booking) => (booking.status || 'confirmed') === 'confirmed' || booking.status === 'completed')
  const todayBookings = confirmedBookings.filter((booking) => booking.booking_date === todayString)
  const upcomingBookings = confirmedBookings.filter((booking) => booking.booking_date >= todayString)
  const revenueToday = getRevenue(revenueBookings.filter((booking) => booking.booking_date === todayString))
  const revenueThisWeek = getRevenue(revenueBookings.filter((booking) => booking.booking_date >= weekStartString))
  const totalRevenue = getRevenue(revenueBookings)
  const averageBookingValue = revenueBookings.length > 0 ? Math.round(totalRevenue / revenueBookings.length) : 0
  const cancellationRate = bookings.length > 0 ? Math.round((cancelledBookings.length / bookings.length) * 100) : 0
  const noShowRate = bookings.length > 0 ? Math.round((noShowBookings.length / bookings.length) * 100) : 0
  const topServices = buildLeaderboard(revenueBookings, (booking) => booking.services?.[0]?.name || 'Unknown service')
  const topTeamMembers = buildLeaderboard(revenueBookings, (booking) => booking.team_members?.[0]?.full_name || 'Unknown team member')

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
    chartData: buildLast30DaysChart(revenueBookings),
  }
}
