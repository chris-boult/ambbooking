export type Booking = {
  id: string
  business_id: string
  customer_id: string | null
  service_id: string | null
  team_member_id: string | null
  booking_date: string
  booking_time: string
  status: string
  customers: { first_name: string; last_name: string | null; email: string | null }[] | null
  services: { name: string; price: number }[] | null
  team_members: { full_name: string }[] | null
}

export type RawBooking = {
  id: string
  business_id: string
  customer_id: string | null
  service_id: string | null
  team_member_id: string | null
  booking_date: string
  booking_time: string
  status: string
}

export type Customer = { id: string; first_name: string; last_name: string | null; email: string | null }
export type Service = { id: string; name: string; price: number }
export type TeamMember = { id: string; full_name: string }

export type Availability = {
  day_of_week: number
  start_time: string | null
  end_time: string | null
  is_available: boolean
}
