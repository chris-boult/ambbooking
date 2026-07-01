export type PlatformEventType =
  | 'booking.created'
  | 'booking.updated'
  | 'booking.cancelled'
  | 'booking.completed'

  | 'payment.received'
  | 'payment.failed'
  | 'payment.deposit_received'
  | 'payment.refunded'

  | 'membership.created'
  | 'membership.updated'
  | 'membership.renewed'
  | 'membership.cancelled'
  | 'membership.past_due'

  | 'voucher.purchased'
  | 'package.purchased'
  | 'subscription.purchased'

  | 'marketplace.enquiry'

  | 'review.received'
  | 'review.requested'

  | 'waitinglist.offer'

  | 'support.ticket.created'
  | 'support.ticket.reply.admin'
  | 'support.ticket.reply.business'
  | 'support.ticket.attachment'
  | 'support.ticket.resolved'
  | 'support.ticket.reopened'

export interface PlatformEvent<T = Record<string, unknown>> {
  id: string
  type: PlatformEventType
  businessId: string
  userId?: string
  customerId?: string
  createdAt: string
  payload: T
}

export type EventHandler<T = any> = (
  event: PlatformEvent<T>
) => Promise<void> | void
