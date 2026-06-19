import type { Booking, StaffColumn, StaffUtilisation, TimelineSettings } from './calendarTypes'
import { bookingDuration, bookingPrice, DEFAULT_TIMELINE_SETTINGS } from './calendarHelpers'

export function calculateStaffUtilisation(
  column: StaffColumn,
  settings: TimelineSettings = DEFAULT_TIMELINE_SETTINGS
): StaffUtilisation {
  const availableMinutes = (settings.endHour - settings.startHour) * 60
  const bookedMinutes = column.bookings.reduce((total, booking) => total + bookingDuration(booking), 0)
  const revenue = column.bookings.reduce((total, booking) => total + bookingPrice(booking), 0)
  const cappedBookedMinutes = Math.min(bookedMinutes, availableMinutes)

  return {
    staffId: column.id,
    staffName: column.name,
    bookings: column.bookings.length,
    bookedMinutes,
    freeMinutes: Math.max(0, availableMinutes - cappedBookedMinutes),
    utilisationPercent: availableMinutes > 0 ? Math.round((cappedBookedMinutes / availableMinutes) * 100) : 0,
    revenue,
  }
}

export function calculateDayUtilisation(bookings: Booking[], settings: TimelineSettings = DEFAULT_TIMELINE_SETTINGS) {
  const availableMinutes = (settings.endHour - settings.startHour) * 60
  const bookedMinutes = bookings.reduce((total, booking) => total + bookingDuration(booking), 0)
  return availableMinutes > 0 ? Math.round((Math.min(bookedMinutes, availableMinutes) / availableMinutes) * 100) : 0
}
