import { subscribe } from '../subscribe'
import { notify } from '@/lib/notifications/notify'

subscribe('booking.created', async (event) => {
  const bookingId = (event.payload as any)?.bookingId

  await notify({
    businessId: event.businessId,
    userId: event.userId,
    customerId: event.customerId,

    type: 'booking.created',

    title: 'New booking',

    message: 'A new booking has been created.',

    link: bookingId
      ? `/business/dashboard/bookings?id=${bookingId}`
      : '/business/dashboard/bookings',

    data: event.payload,
  })
})