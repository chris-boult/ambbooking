export async function triggerBookingPush({
  businessId,
  bookingId,
  eventType,
}: {
  businessId: string
  bookingId: string
  eventType: 'created' | 'cancelled' | 'rescheduled' | 'completed' | 'no_show' | 'updated'
}) {
  try {
    await fetch('/api/push/booking-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, bookingId, eventType }),
    })
  } catch (error) {
    console.error('Booking push notification failed:', error)
  }
}
