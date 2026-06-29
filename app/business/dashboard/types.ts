export type Booking = {
  id: string
  booking_date: string
  booking_time: string
  status: string | null
  customers: { first_name: string; last_name: string | null }[] | null
  services: { name: string; price: number }[] | null
  team_members: { full_name: string }[] | null
}

export type LeaderboardItem = {
  name: string
  bookings: number
  revenue: number
}
