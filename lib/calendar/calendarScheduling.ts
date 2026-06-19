import type { Booking, StaffAvailabilityRule, TeamTimeOff, TimelineSettings } from './calendarTypes'
import {
  DEFAULT_TIMELINE_SETTINGS,
  availabilityForStaffOnDate,
  bookingDuration,
  customerName,
  dateMatchesTimeOff,
  timeToMinutes,
} from './calendarHelpers'

type CanMoveBookingParams = {
  bookingId: string
  bookingDate: string
  bookingTime: string
  teamMemberId: string | null
  bookings: Booking[]
  availabilityRules?: StaffAvailabilityRule[]
  timeOff?: TeamTimeOff[]
  settings?: TimelineSettings
}

export type SchedulingValidationResult = {
  valid: boolean
  reason: string
  conflictingBookingId?: string
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd
}

export function canMoveBooking({
  bookingId,
  bookingDate,
  bookingTime,
  teamMemberId,
  bookings,
  availabilityRules = [],
  timeOff = [],
  settings = DEFAULT_TIMELINE_SETTINGS,
}: CanMoveBookingParams): SchedulingValidationResult {
  const movingBooking = bookings.find((booking) => booking.id === bookingId)

  if (!movingBooking) {
    return {
      valid: false,
      reason: 'Booking not found.',
    }
  }

  const proposedStart = timeToMinutes(bookingTime)
  const proposedEnd = proposedStart + bookingDuration(movingBooking)

  const timelineOpen = settings.startHour * 60
  const timelineClose = settings.endHour * 60

  if (proposedStart < timelineOpen || proposedEnd > timelineClose) {
    return {
      valid: false,
      reason: 'This move is outside the calendar day.',
    }
  }

  const conflict = bookings.find((booking) => {
    if (booking.id === bookingId) return false
    if (booking.booking_date !== bookingDate) return false

    const existingStaffId = booking.team_member_id || null
    const proposedStaffId = teamMemberId || null

    if (existingStaffId !== proposedStaffId) return false

    const existingStart = timeToMinutes(booking.booking_time)
    const existingEnd = existingStart + bookingDuration(booking)

    return rangesOverlap(proposedStart, proposedEnd, existingStart, existingEnd)
  })

  if (conflict) {
    return {
      valid: false,
      reason: `This move would overlap with ${customerName(conflict)} at ${conflict.booking_time.slice(0, 5)}.`,
      conflictingBookingId: conflict.id,
    }
  }

  if (!teamMemberId) {
    return {
      valid: true,
      reason: '',
    }
  }

  const staffAvailability = availabilityForStaffOnDate(teamMemberId, bookingDate, availabilityRules)

  if (staffAvailability?.is_available === false) {
    return {
      valid: false,
      reason: 'This staff member is unavailable on that day.',
    }
  }

  if (staffAvailability?.start_time && staffAvailability?.end_time) {
    const availableStart = timeToMinutes(staffAvailability.start_time)
    const availableEnd = timeToMinutes(staffAvailability.end_time)

    if (proposedStart < availableStart || proposedEnd > availableEnd) {
      return {
        valid: false,
        reason: 'This move is outside this staff member’s working hours.',
      }
    }
  }

  if (staffAvailability?.break_start && staffAvailability?.break_end) {
    const breakStart = timeToMinutes(staffAvailability.break_start)
    const breakEnd = timeToMinutes(staffAvailability.break_end)

    if (rangesOverlap(proposedStart, proposedEnd, breakStart, breakEnd)) {
      return {
        valid: false,
        reason: 'This move overlaps with this staff member’s break.',
      }
    }
  }

  const staffTimeOff = timeOff.filter((item) => item.team_member_id === teamMemberId && dateMatchesTimeOff(bookingDate, item))

  const timeOffConflict = staffTimeOff.find((item) => {
    if (item.is_all_day !== false || !item.start_time || !item.end_time) return true

    const offStart = timeToMinutes(item.start_time)
    const offEnd = timeToMinutes(item.end_time)

    return rangesOverlap(proposedStart, proposedEnd, offStart, offEnd)
  })

  if (timeOffConflict) {
    return {
      valid: false,
      reason: timeOffConflict.reason
        ? `This move overlaps with time off: ${timeOffConflict.reason}.`
        : 'This move overlaps with staff time off.',
    }
  }

  return {
    valid: true,
    reason: '',
  }
}
