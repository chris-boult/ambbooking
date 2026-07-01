import { subscribe } from '../subscribe'
import { notify } from '@/lib/notifications/notify'

subscribe('review.requested', async (event) => {
  const customerName = (event.payload as any)?.customerName
  const serviceName = (event.payload as any)?.serviceName

  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'general',
    priority: 'info',
    title: 'Review request sent',
    message: `Review request sent to ${customerName || 'customer'}${serviceName ? ` after ${serviceName}` : ''}.`,
    link: '/business/dashboard/reviews',
    icon: '⭐',
    metadata: event.payload ?? {},
    sendPush: true,
  })
})