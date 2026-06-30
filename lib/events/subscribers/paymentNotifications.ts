import { subscribe } from '../subscribe'
import { notify } from '@/lib/notifications/notify'

const formatMoney = (value: unknown) =>
  `£${Number(value || 0).toFixed(2)}`

subscribe('payment.received', async (event) => {
  const bookingId = (event.payload as any)?.bookingId
  const amount = (event.payload as any)?.amount
  const paymentType = (event.payload as any)?.paymentType

  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'payment',
    priority: 'success',
    title:
      paymentType === 'deposit'
        ? 'Deposit received'
        : 'Payment received',
    message: amount
      ? `${formatMoney(amount)} has been received.`
      : 'Payment received successfully.',
    link: bookingId
      ? `/business/dashboard/bookings?id=${bookingId}`
      : '/business/dashboard/money',
    icon: '💳',
    metadata: event.payload ?? {},
    sendPush: true,
  })
})

subscribe('payment.failed', async (event) => {
  const invoiceId = (event.payload as any)?.invoiceId
  const amount = (event.payload as any)?.amount

  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'payment',
    priority: 'warning',
    title: 'Payment failed',
    message: amount
      ? `${formatMoney(amount)} payment failed.`
      : 'A payment has failed.',
    link: invoiceId
      ? `/business/dashboard/money?invoice=${invoiceId}`
      : '/business/dashboard/money',
    icon: '⚠️',
    metadata: event.payload ?? {},
    sendPush: true,
  })
})

subscribe('payment.deposit_received', async (event) => {
  const bookingId = (event.payload as any)?.bookingId
  const amount = (event.payload as any)?.amount

  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'payment',
    priority: 'success',
    title: 'Deposit received',
    message: amount
      ? `${formatMoney(amount)} deposit received.`
      : 'A deposit has been received.',
    link: bookingId
      ? `/business/dashboard/bookings?id=${bookingId}`
      : '/business/dashboard/money',
    icon: '💰',
    metadata: event.payload ?? {},
    sendPush: true,
  })
})

subscribe('payment.refunded', async (event) => {
  const amount = (event.payload as any)?.amount

  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'payment',
    priority: 'warning',
    title: 'Refund processed',
    message: amount
      ? `${formatMoney(amount)} refunded.`
      : 'A refund has been processed.',
    link: '/business/dashboard/money',
    icon: '↩️',
    metadata: event.payload ?? {},
    sendPush: true,
  })
})