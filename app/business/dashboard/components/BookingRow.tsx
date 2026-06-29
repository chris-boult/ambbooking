import type { Booking } from '../types'

export default function BookingRow({ booking, showDate = false }: { booking: Booking; showDate?: boolean }) {
  const formattedDate = new Date(booking.booking_date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const customerName = `${booking.customers?.[0]?.first_name || 'Customer'} ${booking.customers?.[0]?.last_name || ''}`.trim()
  const status = booking.status || 'confirmed'

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h3 className="font-black text-white">{customerName}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {booking.services?.[0]?.name || 'Service'} with {booking.team_members?.[0]?.full_name || 'Team member'}
          </p>
          <div className="mt-3 inline-flex rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-300">
            {status.replace('_', ' ')}
          </div>
        </div>

        <div className="text-right">
          {showDate && <p className="font-black text-white">{formattedDate}</p>}
          <p className="text-sm font-bold text-slate-400">{booking.booking_time?.slice(0, 5)}</p>
          <p className="mt-2 text-lg font-black text-white">£{booking.services?.[0]?.price || 0}</p>
        </div>
      </div>
    </div>
  )
}
