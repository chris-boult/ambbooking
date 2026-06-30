export type NotificationPriority = 'info' | 'success' | 'warning' | 'critical'

export type NotificationType =
  | 'general'
  | 'booking_created'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'booking_completed'
  | 'booking_no_show'
  | 'waiting_list'
  | 'membership'
  | 'payment'
  | 'review'
  | 'support'
  | 'system'

export type CreateNotificationInput = {
  businessId: string
  userId?: string | null
  type: NotificationType
  priority?: NotificationPriority
  title: string
  message: string
  link?: string | null
  icon?: string | null
  colour?: string | null
  metadata?: Record<string, unknown>
  sendPush?: boolean
}

export type NotificationRecord = {
  id: string
  business_id: string
  user_id: string | null
  type: NotificationType | string
  priority: NotificationPriority | string
  title: string
  message: string
  link: string | null
  icon: string | null
  colour: string | null
  metadata: Record<string, unknown>
  is_read: boolean
  is_archived: boolean
  read_at: string | null
  archived_at: string | null
  created_at: string
}
export type NotificationRequest = CreateNotificationInput