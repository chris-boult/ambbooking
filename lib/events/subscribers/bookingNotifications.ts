import { subscribe } from '../subscribe'
import { notify } from '@/lib/notifications/notify'

subscribe('booking.created', async (event) => {
  const bookingId = (event.payload as any)?.bookingId

  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'booking_created',
    priority: 'success',
    title: 'New booking',
    message: 'A new booking has been created.',
    link: bookingId
      ? `/business/dashboard/bookings?id=${bookingId}`
      : '/business/dashboard/bookings',
    icon: '📅',
    metadata: event.payload || {},
    sendPush: true,
  })
})