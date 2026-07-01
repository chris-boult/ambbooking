import { subscribe } from '../subscribe'
import { notify } from '@/lib/notifications/notify'

const formatMoney = (value: unknown) => `£${Number(value || 0).toFixed(2)}`

subscribe('voucher.purchased', async (event) => {
  const amount = (event.payload as any)?.amount
  const recipientName = (event.payload as any)?.recipientName
  const voucherCode = (event.payload as any)?.voucherCode

  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'general',
    priority: 'success',
    title: 'Gift voucher purchased',
    message: `${formatMoney(amount)} gift voucher purchased${recipientName ? ` for ${recipientName}` : ''}.`,
    link: '/business/dashboard/gift-vouchers',
    icon: '🎁',
    metadata: {
      ...(event.payload || {}),
      voucher_code: voucherCode,
    },
    sendPush: true,
  })
})
