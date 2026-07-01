import { subscribe } from '../subscribe'
import { notify } from '@/lib/notifications/notify'

subscribe('waitinglist.offer', async (event) => {
  const customerName = (event.payload as any)?.customerName
  const serviceName = (event.payload as any)?.serviceName
  const bookingDate = (event.payload as any)?.bookingDate
  const bookingTime = (event.payload as any)?.bookingTime

  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'general',
    priority: 'info',
    title: 'Waiting list customer notified',
    message: `${customerName || 'A customer'} was offered a slot for ${
      serviceName || 'an appointment'
    } on ${bookingDate} at ${bookingTime?.slice?.(0, 5) || bookingTime}.`,
    link: '/business/dashboard/customer-engagement',
    icon: '⏳',
    metadata: event.payload ?? {},
    sendPush: true,
  })
})