import { subscribe } from '../subscribe'
import { notify } from '@/lib/notifications/notify'

const formatMoney = (value: unknown) => `£${Number(value || 0).toFixed(2)}`

subscribe('subscription.purchased', async (event) => {
  const plan = (event.payload as any)?.plan
  const monthlyAmount = (event.payload as any)?.monthlyAmount

  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'general',
    priority: 'success',
    title: 'Subscription purchased',
    message: `A ${plan || 'new'} subscription has been purchased${monthlyAmount ? ` at ${formatMoney(monthlyAmount)} per month` : ''}.`,
    link: '/business/dashboard/settings',
    icon: '💼',
    metadata: event.payload ?? {},
    sendPush: true,
  })
})
