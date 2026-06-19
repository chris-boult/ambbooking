import type { Booking } from './calendarTypes'
import { bookingDuration, customerName, timeToMinutes } from './calendarHelpers'

type CanMoveBookingParams = {
  bookingId: string
  bookingDate: string
  bookingTime: string
  teamMemberId: string | null
  bookings: Booking[]
}

export type SchedulingValidationResult = {
  valid: boolean
  reason: string
  conflictingBookingId?: string
}

export function canMoveBooking({
  bookingId,
  bookingDate,
  bookingTime,
  teamMemberId,
  bookings,
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

  const businessOpen = 8 * 60
  const businessClose = 20 * 60

  if (proposedStart < businessOpen || proposedEnd > businessClose) {
    return {
      valid: false,
      reason: 'This move is outside the visible calendar day.',
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

    return proposedStart < existingEnd && existingStart < proposedEnd
  })

  if (conflict) {
    return {
      valid: false,
      reason: `This move would overlap with ${customerName(conflict)} at ${conflict.booking_time.slice(0, 5)}.`,
      conflictingBookingId: conflict.id,
    }
  }

  return {
    valid: true,
    reason: '',
  }
}
