'use client'

import type { Booking, StaffColumn } from '@/lib/calendar/calendarTypes'
import { DEFAULT_TIMELINE_SETTINGS, timelineHeight } from '@/lib/calendar/calendarHelpers'
import { TimelineBookingBlock } from './TimelineBookingBlock'

export function TimelineStaffColumn({
  column,
  onSelectBooking,
}: {
  column: StaffColumn
  onSelectBooking: (booking: Booking) => void
}) {
  return (
    <div className="min-w-[260px] rounded-2xl border border-white/10 bg-black/20">
      <div className={`sticky top-0 z-20 rounded-t-2xl border-b ${column.colour.border} bg-slate-950/95 p-4 backdrop-blur`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${column.colour.dot}`} />
              <h3 className="truncate font-black">{column.name}</h3>
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">{column.role || 'Staff member'}</p>
          </div>
          <span className={`rounded-full border px-2 py-1 text-xs font-bold ${column.colour.border} ${column.colour.bg} ${column.colour.text}`}>
            {column.bookings.length}
          </span>
        </div>
      </div>

      <div className="relative" style={{ height: timelineHeight(DEFAULT_TIMELINE_SETTINGS) }}>
        {Array.from({ length: DEFAULT_TIMELINE_SETTINGS.endHour - DEFAULT_TIMELINE_SETTINGS.startHour }).map((_, index) => (
          <div
            key={index}
            className="absolute left-0 right-0 border-t border-white/10"
            style={{ top: index * DEFAULT_TIMELINE_SETTINGS.pixelsPerHour }}
          />
        ))}

        <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-white/[0.02] to-transparent" />

        {column.bookings.map((booking) => (
          <TimelineBookingBlock
            key={booking.id}
            booking={booking}
            column={column}
            onClick={() => onSelectBooking(booking)}
          />
        ))}

        {column.bookings.length === 0 && (
          <div className="absolute inset-x-4 top-6 rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-500">
            No bookings
          </div>
        )}
      </div>
    </div>
  )
}
