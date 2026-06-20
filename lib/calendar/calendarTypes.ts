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
  business_id: string
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

export type StaffAvailabilityRule = {
  id?: string
  business_id?: string
  team_member_id: string
  day_of_week?: number | string | null
  start_time?: string | null
  end_time?: string | null
  is_available?: boolean | null
  break_start?: string | null
  break_end?: string | null
}

export type TeamTimeOff = {
  id?: string
  business_id?: string
  team_member_id: string
  start_date?: string | null
  end_date?: string | null
  date?: string | null
  start_time?: string | null
  end_time?: string | null
  reason?: string | null
  is_all_day?: boolean | null
}

export type StaffColumn = {
  id: string
  name: string
  role?: string | null
  bookings: Booking[]
  colour: StaffColour
  isUnassigned?: boolean
  availability?: StaffAvailabilityRule | null
  timeOff?: TeamTimeOff[]
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

export type AvailabilityBlockType = 'outside_hours' | 'break' | 'time_off'

export type AvailabilityBlock = {
  id: string
  type: AvailabilityBlockType
  label: string
  startMinutes: number
  endMinutes: number
}

export type CalendarBlockType = 'break' | 'time_off'

export type CreateCalendarBlockInput = {
  staffId: string
  selectedDate: string
  startTime: string
  endTime: string
  type: CalendarBlockType
  label: string
}
