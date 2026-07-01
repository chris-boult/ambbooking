import { registerEventHandler } from '../registry'
import { notify } from '@/lib/notifications/notify'

registerEventHandler('support.ticket.created', async (event) => {
  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'support',
    priority: 'warning',
    title: 'New support ticket',
    message:
      (event.payload as any).subject ??
      'A new support ticket has been created.',
    icon: 'life-buoy',
    colour: 'cyan',
    link: '/admin/support',
    metadata: event.payload,
  })
})

registerEventHandler('support.ticket.reply.admin', async (event) => {
  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'support',
    priority: 'info',
    title: 'Support replied',
    message: 'AMB Booking Support has replied to your ticket.',
    icon: 'message-circle',
    colour: 'cyan',
    link: '/business/dashboard/support',
    metadata: event.payload,
  })
})

registerEventHandler('support.ticket.reply.business', async (event) => {
  await notify({
    businessId: event.businessId,
    type: 'support',
    priority: 'info',
    title: 'Customer replied',
    message: 'A business has replied to a support ticket.',
    icon: 'message-square',
    colour: 'cyan',
    link: '/admin/support',
    metadata: event.payload,
  })
})

registerEventHandler('support.ticket.attachment', async (event) => {
  await notify({
    businessId: event.businessId,
    type: 'support',
    priority: 'info',
    title: 'Attachment uploaded',
    message: 'A new attachment has been added to a support ticket.',
    icon: 'paperclip',
    colour: 'cyan',
    link: '/admin/support',
    metadata: event.payload,
  })
})

registerEventHandler('support.ticket.resolved', async (event) => {
  await notify({
    businessId: event.businessId,
    userId: event.userId,
    type: 'support',
    priority: 'success',
    title: 'Support ticket resolved',
    message: 'Your support request has been marked as resolved.',
    icon: 'check-circle',
    colour: 'emerald',
    link: '/business/dashboard/support',
    metadata: event.payload,
  })
})

registerEventHandler('support.ticket.reopened', async (event) => {
  await notify({
    businessId: event.businessId,
    type: 'support',
    priority: 'warning',
    title: 'Support ticket reopened',
    message: 'A support ticket has been reopened.',
    icon: 'rotate-ccw',
    colour: 'amber',
    link: '/admin/support',
    metadata: event.payload,
  })
})