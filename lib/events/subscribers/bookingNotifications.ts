import { subscribe } from '../subscribe'
import { supabase } from '@/lib/supabase'

subscribe('booking.created', async (event) => {
  const bookingId = (event.payload as any)?.bookingId

  const { error } = await supabase
    .from('notifications')
    .insert({
      business_id: event.businessId,
      user_id: event.userId ?? null,
      customer_id: event.customerId ?? null,
      type: 'booking.created',
      title: 'New booking',
      message: 'A new booking has been created.',
      link: bookingId
        ? `/business/dashboard/bookings?id=${bookingId}`
        : '/business/dashboard/bookings',
      data: event.payload,
    })

  if (error) {
    console.error(
      '[Notifications] Failed to create notification',
      error
    )
  }
})