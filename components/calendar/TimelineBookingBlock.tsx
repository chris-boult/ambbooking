'use client'

import { CSS } from '@dnd-kit/utilities'
import { useDraggable } from '@dnd-kit/core'
import type { Booking, StaffColumn } from '@/lib/calendar/calendarTypes'
import {
  bookingDuration,
  bookingHeight,
  bookingPrice,
  bookingTop,
  customerName,
  money,
  serviceName,
  statusClass,
  statusLabel,
} from '@/lib/calendar/calendarHelpers'

export function TimelineBookingBlock({
  booking,
  column,
  onClick,
}: {
  booking: Booking
  column: StaffColumn
  onClick: () => void
}) {
  const top = bookingTop(booking)
  const height = bookingHeight(booking)
  const compact = height < 70

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `booking:${booking.id}`,
    data: {
      booking,
      column,
    },
  })

  const style = {
    top,
    height,
    transform: CSS.Translate.toString(transform),
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={`absolute left-2 right-2 overflow-hidden rounded-2xl border ${column.colour.border} bg-gradient-to-br ${column.colour.gradient} p-3 text-left shadow-xl shadow-black/20 transition hover:scale-[1.01] hover:bg-white/10 ${
        isDragging ? 'z-50 cursor-grabbing opacity-70 ring-2 ring-cyan-300/50' : 'z-20 cursor-grab'
      }`}
      style={style}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-sm font-black ${column.colour.text}`}>
            {booking.booking_time.slice(0, 5)}
          </p>

          {!compact && (
            <p className="text-xs text-slate-400">
              {bookingDuration(booking)} mins
            </p>
          )}
        </div>

        {!compact && (
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${statusClass(booking.status)}`}>
            {statusLabel(booking.status)}
          </span>
        )}
      </div>

      <h4 className="mt-2 truncate font-black leading-tight">
        {customerName(booking)}
      </h4>

      <p className="mt-1 truncate text-sm text-slate-300">
        {serviceName(booking)}
      </p>

      {!compact && (
        <p className="mt-2 text-xs font-bold text-slate-400">
          {money(bookingPrice(booking))}
        </p>
      )}
    </button>
  )
}
