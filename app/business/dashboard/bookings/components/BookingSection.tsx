import EmptyState from '@/components/ui/EmptyState'
import { Booking } from '../types'
import BookingCard from './BookingCard'

export default function BookingSection({
  title,
  bookings,
  showActions = false,
  onCancel,
  onReschedule,
  onComplete,
  onNoShow,
}: {
  title: string
  bookings: Booking[]
  showActions?: boolean
  onCancel?: (id: string) => void
  onReschedule?: (booking: Booking) => void
  onComplete?: (id: string) => void
  onNoShow?: (id: string) => void
}) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>

      {bookings.length === 0 ? (
        <EmptyState title="No bookings found." />
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              showActions={showActions}
              onCancel={onCancel}
              onReschedule={onReschedule}
              onComplete={onComplete}
              onNoShow={onNoShow}
            />
          ))}
        </div>
      )}
    </section>
  )
}
