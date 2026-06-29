import Link from 'next/link'
import type { Booking } from '../types'
import BookingRow from './BookingRow'

export default function BookingPanel({
  title,
  subtitle,
  href,
  hrefLabel,
  bookings,
  empty,
  showDate = false,
}: {
  title: string
  subtitle: string
  href: string
  hrefLabel: string
  bookings: Booking[]
  empty: string
  showDate?: boolean
}) {
  return (
    <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
      <div className="mb-8 flex items-start justify-between gap-5">
        <div>
          <p className="text-sm font-bold text-cyan-300">{subtitle}</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">{title}</h2>
        </div>

        <Link href={href} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white">
          {hrefLabel}
        </Link>
      </div>

      <div className="space-y-4">
        {bookings.map((booking) => <BookingRow key={booking.id} booking={booking} showDate={showDate} />)}

        {bookings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-500">
            {empty}
          </div>
        )}
      </div>
    </section>
  )
}
