export type PlatformEventType =
  | 'booking.created'
  | 'booking.updated'
  | 'booking.cancelled'
  | 'booking.completed'
  | 'membership.created'
  | 'membership.renewed'
  | 'voucher.purchased'
  | 'marketplace.enquiry'
  | 'review.received'

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