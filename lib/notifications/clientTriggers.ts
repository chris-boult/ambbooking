export async function triggerBookingNotification({
  businessId,
  bookingId,
  eventType,
  sendPush = true,
}: {
  businessId: string
  bookingId: string
  eventType: 'created' | 'cancelled' | 'rescheduled' | 'completed' | 'no_show' | 'updated'
  sendPush?: boolean
}) {
  try {
    const response = await fetch('/api/notifications/booking-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, bookingId, eventType, sendPush }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Booking notification failed:', data.error)
      return null
    }

    return data.notification
  } catch (error) {
    console.error('Booking notification failed:', error)
    return null
  }
}
