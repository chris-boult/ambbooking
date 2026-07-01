import { subscribe } from '../subscribe'
import { notify } from '@/lib/notifications/notify'

const formatMoney = (value: unknown) => `£${Number(value || 0).toFixed(2)}`

subscribe('membership.created', async (event) => {
  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'membership',
    priority: 'success',
    title: 'Membership purchased',
    message: 'A new membership has been purchased.',
    link: '/business/dashboard/memberships',
    icon: '👥',
    metadata: event.payload ?? {},
    sendPush: true,
  })
})

subscribe('membership.updated', async (event) => {
  const status = (event.payload as any)?.status

  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'membership',
    priority: status === 'past_due' ? 'warning' : 'info',
    title: 'Membership updated',
    message: `A membership has been updated${status ? ` to ${String(status).replaceAll('_', ' ')}` : ''}.`,
    link: '/business/dashboard/memberships',
    icon: '👥',
    metadata: event.payload ?? {},
    sendPush: true,
  })
})

subscribe('membership.renewed', async (event) => {
  const amount = (event.payload as any)?.amount

  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'membership',
    priority: 'success',
    title: 'Membership renewed',
    message: amount
      ? `A membership renewed successfully for ${formatMoney(amount)}.`
      : 'A membership renewed successfully.',
    link: '/business/dashboard/memberships',
    icon: '🔄',
    metadata: event.payload ?? {},
    sendPush: true,
  })
})

subscribe('membership.cancelled', async (event) => {
  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'membership',
    priority: 'warning',
    title: 'Membership cancelled',
    message: 'A membership has been cancelled.',
    link: '/business/dashboard/memberships',
    icon: '❌',
    metadata: event.payload ?? {},
    sendPush: true,
  })
})

subscribe('membership.past_due', async (event) => {
  const amount = (event.payload as any)?.amount

  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'membership',
    priority: 'warning',
    title: 'Membership payment overdue',
    message: amount
      ? `A membership payment of ${formatMoney(amount)} is overdue.`
      : 'A membership payment is overdue.',
    link: '/business/dashboard/memberships',
    icon: '⚠️',
    metadata: event.payload ?? {},
    sendPush: true,
  })
})
