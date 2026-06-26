import { subscribe } from '../subscribe'
import { notify } from '@/lib/notifications/notify'

subscribe('membership.renewed', async (event) => {
  const payload = event.payload as any

  await notify({
    businessId: event.businessId,
    customerId: event.customerId,

    type: 'membership.renewed',

    title: 'Membership updated',

    message:
      payload.sessionsRemaining != null
        ? `Membership updated. ${payload.sessionsRemaining} sessions remaining.`
        : 'Membership updated.',

    link: '/business/dashboard/memberships',

    data: payload,
  })
})