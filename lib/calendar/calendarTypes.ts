export type ViewMode = 'day' | 'week' | 'month'

export type CustomerJoin =
  | {
      first_name: string
      last_name: string | null
      email?: string | null
    }[]
  | {
      first_name: string
      last_name: string | null
      email?: string | null
    }
  | null

export type ServiceJoin =
  | {
      name: string
      price: number
      duration_minutes?: number | null
    }[]
  | {
      name: string
      price: number
      duration_minutes?: number | null
    }
  | null

export type TeamMemberJoin =
  | {
      id?: string | null
      full_name: string
    }[]
  | {
      id?: string | null
      full_name: string
    }
  | null

export type Booking = {
  id: string
  booking_date: string
  booking_time: string
  status: string
  total_price?: number | null
  total_duration_minutes?: number | null
  customer_id?: string | null
  service_id?: string | null
  team_member_id?: string | null
  customers: CustomerJoin
  services: ServiceJoin
  team_members: TeamMemberJoin
}

export type TeamMember = {
  id: string
  full_name: string
  role?: string | null
}

export type StaffColumn = {
  id: string
  name: string
  role?: string | null
  bookings: Booking[]
  colour: StaffColour
  isUnassigned?: boolean
}

export type StaffColour = {
  accent: string
  border: string
  bg: string
  bgStrong: string
  text: string
  dot: string
  gradient: string
}

export type TimelineSettings = {
  startHour: number
  endHour: number
  pixelsPerHour: number
  minimumBookingHeight: number
}

export type StaffUtilisation = {
  staffId: string
  staffName: string
  bookings: number
  bookedMinutes: number
  freeMinutes: number
  utilisationPercent: number
  revenue: number
}

export type BookingLayoutItem = {
  booking: Booking
  lane: number
  totalLanes: number
  hasCollision: boolean
}
