import type {
  Booking,
  BookingLayoutItem,
  StaffColumn,
  StaffUtilisation,
  TeamMember,
  TimelineSettings,
} from './calendarTypes'
import { colourForStaff, UNASSIGNED_COLOUR } from './calendarColours'

export const DEFAULT_TIMELINE_SETTINGS: TimelineSettings = {
  startHour: 8,
  endHour: 20,
  pixelsPerHour: 96,
  minimumBookingHeight: 46,
}

export const TIMELINE_ZOOMS = {
  compact: 72,
  normal: 96,
  expanded: 132,
} as const

export type TimelineZoom = keyof typeof TIMELINE_ZOOMS

export function settingsForZoom(zoom: TimelineZoom): TimelineSettings {
  return {
    ...DEFAULT_TIMELINE_SETTINGS,
    pixelsPerHour: TIMELINE_ZOOMS[zoom],
  }
}

export function toDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return ''

  return parseDate(value).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  })
}

export function startOfWeek(date: Date) {
  const copy = new Date(date)
  copy.setHours(12, 0, 0, 0)

  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)

  return copy
}

export function money(value: number | string | null | undefined) {
  return `£${Number(value || 0).toFixed(2)}`
}

export function timeToMinutes(time: string) {
  const safeTime = (time || '00:00').slice(0, 5)
  const [hours, minutes] = safeTime.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

export function minutesToTime(totalMinutes: number) {
  const safeMinutes = Math.max(0, totalMinutes)
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function joinOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] || null
  return value
}

export function customerName(booking: Booking) {
  const customer = joinOne(booking.customers)
  if (!customer) return 'Unknown customer'

  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown customer'
}

export function serviceName(booking: Booking) {
  const service = joinOne(booking.services)
  return service?.name || 'Unknown service'
}

export function staffName(booking: Booking) {
  const staff = joinOne(booking.team_members)
  return staff?.full_name || 'Unassigned'
}

export function bookingPrice(booking: Booking) {
  const service = joinOne(booking.services)
  return Number(booking.total_price ?? service?.price ?? 0)
}

export function bookingDuration(booking: Booking) {
  const service = joinOne(booking.services)
  return Math.max(15, Number(booking.total_duration_minutes ?? service?.duration_minutes ?? 30))
}

export function bookingEndMinutes(booking: Booking) {
  return timeToMinutes(booking.booking_time) + bookingDuration(booking)
}

export function statusClass(status: string) {
  if (status === 'confirmed') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
  if (status === 'cancelled') return 'bg-red-500/10 text-red-300 border-red-500/20'
  if (status === 'completed') return 'bg-blue-500/10 text-blue-300 border-blue-500/20'
  if (status === 'no_show') return 'bg-amber-500/10 text-amber-300 border-amber-500/20'
  return 'bg-slate-500/10 text-slate-300 border-slate-500/20'
}

export function statusLabel(status: string) {
  return status.replaceAll('_', ' ')
}

export function timelineHeight(settings = DEFAULT_TIMELINE_SETTINGS) {
  return (settings.endHour - settings.startHour) * settings.pixelsPerHour
}

export function visibleHours(settings = DEFAULT_TIMELINE_SETTINGS) {
  return Array.from(
    { length: settings.endHour - settings.startHour + 1 },
    (_, index) => settings.startHour + index
  )
}

export function bookingTop(booking: Booking, settings = DEFAULT_TIMELINE_SETTINGS) {
  const start = timeToMinutes(booking.booking_time)
  const timelineStart = settings.startHour * 60
  const minutesFromStart = start - timelineStart

  return Math.max(0, (minutesFromStart / 60) * settings.pixelsPerHour)
}

export function bookingHeight(booking: Booking, settings = DEFAULT_TIMELINE_SETTINGS) {
  return Math.max(settings.minimumBookingHeight, (bookingDuration(booking) / 60) * settings.pixelsPerHour)
}

export function bookingsOverlap(a: Booking, b: Booking) {
  const aStart = timeToMinutes(a.booking_time)
  const aEnd = bookingEndMinutes(a)

  const bStart = timeToMinutes(b.booking_time)
  const bEnd = bookingEndMinutes(b)

  return aStart < bEnd && bStart < aEnd
}

export function buildBookingLayout(bookings: Booking[]): BookingLayoutItem[] {
  const sorted = [...bookings].sort((a, b) => {
    const startDifference = timeToMinutes(a.booking_time) - timeToMinutes(b.booking_time)
    if (startDifference !== 0) return startDifference

    return bookingDuration(b) - bookingDuration(a)
  })

  const laneBookings: Booking[][] = []
  const items: BookingLayoutItem[] = []

  sorted.forEach((booking) => {
    let lane = 0

    while (laneBookings[lane]?.some((existing) => bookingsOverlap(existing, booking))) {
      lane += 1
    }

    laneBookings[lane] = laneBookings[lane] || []
    laneBookings[lane].push(booking)

    const hasCollision = sorted.some((other) => other.id !== booking.id && bookingsOverlap(booking, other))

    items.push({
      booking,
      lane,
      totalLanes: 1,
      hasCollision,
    })
  })

  items.forEach((item) => {
    const overlappingItems = items.filter(
      (other) => other.booking.id === item.booking.id || bookingsOverlap(item.booking, other.booking)
    )

    item.totalLanes = Math.max(1, ...overlappingItems.map((other) => other.lane + 1))
  })

  return items
}

export function currentTimePosition(settings = DEFAULT_TIMELINE_SETTINGS) {
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const timelineStart = settings.startHour * 60

  return ((minutes - timelineStart) / 60) * settings.pixelsPerHour
}

export function isDateToday(value: string) {
  return value === toDateValue(new Date())
}

export function isCurrentTimeVisible(settings = DEFAULT_TIMELINE_SETTINGS) {
  const now = new Date()
  const hour = now.getHours()

  return hour >= settings.startHour && hour < settings.endHour
}

export function staffRevenue(bookings: Booking[]) {
  return bookings.reduce((sum, booking) => sum + bookingPrice(booking), 0)
}

export function staffBookedMinutes(bookings: Booking[]) {
  return bookings.reduce((sum, booking) => sum + bookingDuration(booking), 0)
}

export function staffOccupancy(bookings: Booking[], settings = DEFAULT_TIMELINE_SETTINGS) {
  const bookedMinutes = staffBookedMinutes(bookings)
  const totalMinutes = (settings.endHour - settings.startHour) * 60

  if (totalMinutes <= 0) return 0

  return Math.min(100, Math.round((bookedMinutes / totalMinutes) * 100))
}

export function occupancyClass(percent: number) {
  if (percent >= 85) return 'border-red-500/30 bg-red-500/10 text-red-300'
  if (percent >= 65) return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
}

export function staffUtilisation(column: StaffColumn, settings = DEFAULT_TIMELINE_SETTINGS): StaffUtilisation {
  const totalMinutes = (settings.endHour - settings.startHour) * 60
  const bookedMinutes = staffBookedMinutes(column.bookings)
  const freeMinutes = Math.max(0, totalMinutes - bookedMinutes)

  return {
    staffId: column.id,
    staffName: column.name,
    bookings: column.bookings.length,
    bookedMinutes,
    freeMinutes,
    utilisationPercent: staffOccupancy(column.bookings, settings),
    revenue: staffRevenue(column.bookings),
  }
}

export function buildStaffColumns(teamMembers: TeamMember[], selectedDateBookings: Booking[]): StaffColumn[] {
  const grouped: Record<string, Booking[]> = {}

  selectedDateBookings.forEach((booking) => {
    const id = booking.team_member_id || 'unassigned'
    grouped[id] = grouped[id] || []
    grouped[id].push(booking)
  })

  const columns: StaffColumn[] = teamMembers.map((member, index) => ({
    id: member.id,
    name: member.full_name,
    role: member.role,
    colour: colourForStaff(index),
    bookings: (grouped[member.id] || []).sort((a, b) => a.booking_time.localeCompare(b.booking_time)),
  }))

  if (grouped.unassigned?.length) {
    columns.push({
      id: 'unassigned',
      name: 'Unassigned',
      role: 'Needs assigning',
      colour: UNASSIGNED_COLOUR,
      bookings: grouped.unassigned.sort((a, b) => a.booking_time.localeCompare(b.booking_time)),
      isUnassigned: true,
    })
  }

  return columns
}
