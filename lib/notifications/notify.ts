import { supabase } from '@/lib/supabase'
import { sendPushNotification } from './push'
import { sendEmailNotification } from './email'

export interface NotifyOptions {
  businessId: string

  userId?: string

  customerId?: string

  type: string

  title: string

  message: string

  link?: string

  data?: Record<string, any>

  email?: string
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

  if (options.email) {
    await sendEmailNotification({
      to: options.email,
      subject: options.title,
      html: `
        <div style="font-family:Arial,sans-serif;padding:32px">
          <h2>${options.title}</h2>

          <p>${options.message}</p>

          ${
            options.link
              ? `<p><a href="${options.link}">Open notification</a></p>`
              : ''
          }
        </div>
      `,
    })
  }
}