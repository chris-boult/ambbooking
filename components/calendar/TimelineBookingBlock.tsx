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
  const height = Math.max(bookingHeight(booking), 46)
  const compact = height < 74

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `booking:${booking.id}`,
    data: {
      bookingId: booking.id,
      teamMemberId: booking.team_member_id,
    },
  })

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`absolute left-3 right-3 z-30 overflow-hidden rounded-xl border ${column.colour.border} bg-slate-900 p-3 text-left shadow-xl shadow-black/30 transition ${
        isDragging
          ? 'cursor-grabbing opacity-80 ring-2 ring-cyan-300/70'
          : 'cursor-grab hover:-translate-y-0.5 hover:bg-slate-800'
      }`}
      style={{
        top,
        height,
        transform: CSS.Translate.toString(transform),
        touchAction: 'none',
      }}
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

      <h4 className="mt-1 truncate font-black leading-tight">
        {customerName(booking)}
      </h4>

      <p className="truncate text-sm text-slate-300">
        {serviceName(booking)}
      </p>

      {!compact && (
        <p className="mt-1 text-xs font-bold text-slate-400">
          {money(bookingPrice(booking))}
        </p>
      )}
    </div>
  )
}