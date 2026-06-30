import { subscribe } from '../subscribe'
import { notify } from '@/lib/notifications/notify'

subscribe('membership.renewed', async (event) => {
  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'membership',
    priority: 'success',
    title: 'Membership updated',
    message: 'A membership has been updated or renewed.',
    link: '/business/dashboard/memberships',
    icon: '👥',
    metadata: event.payload || {},
    sendPush: true,
  })
})