import { subscribe } from '../subscribe'
import { notify } from '@/lib/notifications/notify'

function bookingLink(event: any) {
  const bookingId = event.payload?.bookingId
  return bookingId
    ? `/business/dashboard/bookings?id=${bookingId}`
    : '/business/dashboard/bookings'
}

function metadata(event: any) {
  return event.payload || {}
}

subscribe('booking.created', async (event) => {
  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'booking_created',
    priority: 'success',
    title: 'New booking',
    message: 'A new booking has been created.',
    link: bookingLink(event),
    icon: '📅',
    metadata: metadata(event),
    sendPush: true,
  })
})

subscribe('booking.updated', async (event) => {
  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'booking_rescheduled',
    priority: 'info',
    title: 'Booking updated',
    message: 'A booking has been updated.',
    link: bookingLink(event),
    icon: '🔄',
    metadata: metadata(event),
    sendPush: true,
  })
})

subscribe('booking.cancelled', async (event) => {
  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'booking_cancelled',
    priority: 'warning',
    title: 'Booking cancelled',
    message: 'A booking has been cancelled.',
    link: bookingLink(event),
    icon: '❌',
    metadata: metadata(event),
    sendPush: true,
  })
})

subscribe('booking.completed', async (event) => {
  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'booking_completed',
    priority: 'success',
    title: 'Booking completed',
    message: 'A booking has been marked as completed.',
    link: bookingLink(event),
    icon: '✅',
    metadata: metadata(event),
    sendPush: true,
  })
})