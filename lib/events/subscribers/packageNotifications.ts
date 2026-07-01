import { subscribe } from '../subscribe'
import { notify } from '@/lib/notifications/notify'

subscribe('package.purchased', async (event) => {
  const totalSessions = (event.payload as any)?.totalSessions
  const customerName = (event.payload as any)?.customerName

  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'general',
    priority: 'success',
    title: 'Package purchased',
    message: `${customerName || 'A customer'} purchased a package${totalSessions ? ` with ${totalSessions} sessions` : ''}.`,
    link: '/business/dashboard/packages',
    icon: '📦',
    metadata: event.payload ?? {},
    sendPush: true,
  })
})
