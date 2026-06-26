import { subscribe } from '../subscribe'
import { supabase } from '@/lib/supabase'
import { sendPushNotification } from '@/lib/notifications/push'

subscribe('booking.created', async (event) => {
  const bookingId = (event.payload as any)?.bookingId

  const title = 'New booking'
  const message = 'A new booking has been created.'

  const link = bookingId
    ? `/business/dashboard/bookings?id=${bookingId}`
    : '/business/dashboard/bookings'

  const { error } = await supabase
    .from('notifications')
    .insert({
      business_id: event.businessId,
      user_id: event.userId ?? null,
      customer_id: event.customerId ?? null,
      type: 'booking.created',
      title,
      message,
      link,
      data: event.payload,
    })

  if (error) {
    console.error(
      '[Notifications] Failed to create notification',
      error
    )
    return
  }

  await sendPushNotification({
    businessId: event.businessId,
    title,
    message,
    url: link,
  })
})