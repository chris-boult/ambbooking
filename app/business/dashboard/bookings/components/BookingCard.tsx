import Card from '@/components/ui/Card'
import { Booking } from '../types'
import { formatBookingDate, formatBookingTime } from '../utils/bookingFormatting'
import BookingStatusBadge from './BookingStatusBadge'

export default function BookingCard({
  booking,
  showActions = false,
  onCancel,
  onReschedule,
  onComplete,
  onNoShow,
}: {
  booking: Booking
  showActions?: boolean
  onCancel?: (id: string) => void
  onReschedule?: (booking: Booking) => void
  onComplete?: (id: string) => void
  onNoShow?: (id: string) => void
}) {
  return (
    <Card className="rounded-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">
            {booking.customers?.[0]?.first_name} {booking.customers?.[0]?.last_name}
          </h3>
          <p className="text-slate-400">{booking.customers?.[0]?.email}</p>

          <div className="mt-4 grid gap-2 text-sm text-slate-300">
            <p><span className="text-slate-500">Service:</span> {booking.services?.[0]?.name || 'Unknown'}</p>
            <p><span className="text-slate-500">Value:</span> £{booking.services?.[0]?.price || 0}</p>
            <p><span className="text-slate-500">Team member:</span> {booking.team_members?.[0]?.full_name || 'Unknown'}</p>
            <p><span className="text-slate-500">Date:</span> {formatBookingDate(booking.booking_date)}</p>
            <p><span className="text-slate-500">Time:</span> {formatBookingTime(booking.booking_time)}</p>
            <p className="flex items-center gap-2"><span className="text-slate-500">Status:</span> <BookingStatusBadge status={booking.status} /></p>
          </div>
        </div>

        {showActions && (
          <div className="flex flex-wrap justify-end gap-2">
            {onComplete && <button type="button" onClick={() => onComplete(booking.id)} className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-700">Complete</button>}
            {onNoShow && <button type="button" onClick={() => onNoShow(booking.id)} className="rounded-lg bg-orange-600 px-4 py-2 font-semibold hover:bg-orange-700">No show</button>}
            {onReschedule && <button type="button" onClick={() => onReschedule(booking)} className="rounded-lg bg-slate-700 px-4 py-2 font-semibold hover:bg-slate-600">Reschedule</button>}
            {onCancel && <button type="button" onClick={() => onCancel(booking.id)} className="rounded-lg bg-red-600 px-4 py-2 font-semibold hover:bg-red-700">Cancel</button>}
          </div>
        )}
      </div>
    </Card>
  )
}
