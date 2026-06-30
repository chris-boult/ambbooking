import type { NotificationPriority, NotificationType } from './types'

export const NOTIFICATION_TYPES: Record<NotificationType, string> = {
  general: 'General',
  booking_created: 'Booking created',
  booking_cancelled: 'Booking cancelled',
  booking_rescheduled: 'Booking rescheduled',
  booking_completed: 'Booking completed',
  booking_no_show: 'Booking no-show',
  waiting_list: 'Waiting list',
  membership: 'Membership',
  payment: 'Payment',
  review: 'Review',
  support: 'Support',
  system: 'System',
}

export const NOTIFICATION_PRIORITIES: Record<NotificationPriority, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  critical: 'Critical',
}

export const DEFAULT_NOTIFICATION_LINK = '/business/dashboard/notifications'
