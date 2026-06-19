import type { Booking, StaffColumn, TeamMember, TimelineSettings } from './calendarTypes'
import { colourForStaff, UNASSIGNED_COLOUR } from './calendarColours'

export const DEFAULT_TIMELINE_SETTINGS: TimelineSettings = {
  startHour: 8,
  endHour: 20,
  pixelsPerHour: 96,
  minimumBookingHeight: 46,
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
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
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

export function bookingTop(booking: Booking, settings = DEFAULT_TIMELINE_SETTINGS) {
  const start = timeToMinutes(booking.booking_time)
  const timelineStart = settings.startHour * 60
  const minutesFromStart = start - timelineStart
  return Math.max(0, (minutesFromStart / 60) * settings.pixelsPerHour)
}

export function bookingHeight(booking: Booking, settings = DEFAULT_TIMELINE_SETTINGS) {
  return Math.max(settings.minimumBookingHeight, (bookingDuration(booking) / 60) * settings.pixelsPerHour)
}

export function buildStaffColumns(teamMembers: TeamMember[], selectedDateBookings: Booking[]): StaffColumn[] {
  const grouped: Record<string, Booking[]> = {}

  selectedDateBookings.forEach((booking) => {
    const id = booking.team_member_id || 'unassigned'
    grouped[id] = grouped[id] || []
    grouped[id].push(booking)
  })

  const columns = teamMembers.map((member, index) => ({
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

export function visibleHours(settings = DEFAULT_TIMELINE_SETTINGS) {
  return Array.from(
    { length: settings.endHour - settings.startHour + 1 },
    (_, index) => settings.startHour + index
  )
}
