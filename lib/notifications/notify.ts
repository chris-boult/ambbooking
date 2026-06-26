import { supabase } from '@/lib/supabase'
import { sendPushNotification } from './push'

export interface NotifyOptions {
  businessId: string
  userId?: string
  customerId?: string

  type: string

  title: string
  message: string

  link?: string

  data?: Record<string, any>
}

export async function notify(options: NotifyOptions) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      business_id: options.businessId,
      user_id: options.userId ?? null,
      customer_id: options.customerId ?? null,

      type: options.type,

      title: options.title,
      message: options.message,

      link: options.link ?? null,

      data: options.data ?? {},
    })

  if (error) {
    console.error('[Notify]', error)
    return
  }

  await sendPushNotification({
    businessId: options.businessId,
    title: options.title,
    message: options.message,
    url: options.link,
  })
}