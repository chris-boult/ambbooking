import { createNotification } from '@/lib/notifications/createNotification'
import type { NotificationPriority, NotificationType } from '@/lib/notifications/types'

export type NotifyInput = {
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

export async function notify(input: NotifyInput) {
  return createNotification({
    businessId: input.businessId,
    userId: input.userId || null,
    type: input.type,
    priority: input.priority || 'info',
    title: input.title,
    message: input.message,
    link: input.link || null,
    icon: input.icon || null,
    colour: input.colour || null,
    metadata: input.metadata || {},
    sendPush: input.sendPush !== false,
  })
}
