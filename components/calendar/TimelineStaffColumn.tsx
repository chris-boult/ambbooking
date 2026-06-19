'use client'

import { useDroppable } from '@dnd-kit/core'
import type { Booking, StaffColumn } from '@/lib/calendar/calendarTypes'
import {
  DEFAULT_TIMELINE_SETTINGS,
  timelineHeight,
} from '@/lib/calendar/calendarHelpers'
import { TimelineBookingBlock } from './TimelineBookingBlock'

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function DropSlot({
  staffId,
  time,
  top,
  height,
}: {
  staffId: string
  time: string
  top: number
  height: number
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot:${staffId}:${time}`,
  })

  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 right-0 z-0 transition ${
        isOver ? 'bg-cyan-300/10 ring-1 ring-inset ring-cyan-300/40' : ''
      }`}
      style={{
        top,
        height,
      }}
    />
  )
}

export function TimelineStaffColumn({
  selectedDate,
  column,
  onSelectBooking,
}: {
  selectedDate: string
  column: StaffColumn
  onSelectBooking: (booking: Booking) => void
}) {
  const columnHeight = timelineHeight(DEFAULT_TIMELINE_SETTINGS)
  const slotMinutes = 15
  const slotHeight = (slotMinutes / 60) * DEFAULT_TIMELINE_SETTINGS.pixelsPerHour
  const startMinutes = DEFAULT_TIMELINE_SETTINGS.startHour * 60
  const endMinutes = DEFAULT_TIMELINE_SETTINGS.endHour * 60
  const slots = Array.from(
    { length: (endMinutes - startMinutes) / slotMinutes },
    (_, index) => {
      const minutes = startMinutes + index * slotMinutes

      return {
        time: minutesToTime(minutes),
        top: index * slotHeight,
      }
    }
  )

  return (
    <div className="min-w-[260px] rounded-2xl border border-white/10 bg-black/20">
      <div className={`sticky top-0 z-20 rounded-t-2xl border-b ${column.colour.border} bg-slate-950/95 p-4 backdrop-blur`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${column.colour.dot}`} />
              <h3 className="truncate font-black">{column.name}</h3>
            </div>

            <p className="mt-1 truncate text-xs text-slate-500">
              {column.role || 'Staff member'}
            </p>
          </div>

          <span className={`rounded-full border px-2 py-1 text-xs font-bold ${column.colour.border} ${column.colour.bg} ${column.colour.text}`}>
            {column.bookings.length}
          </span>
        </div>
      </div>

      <div className="relative" style={{ height: columnHeight }}>
        {Array.from({ length: DEFAULT_TIMELINE_SETTINGS.endHour - DEFAULT_TIMELINE_SETTINGS.startHour }).map((_, index) => (
          <div
            key={index}
            className="absolute left-0 right-0 z-0 border-t border-white/10"
            style={{ top: index * DEFAULT_TIMELINE_SETTINGS.pixelsPerHour }}
          />
        ))}

        {slots.map((slot) => (
          <DropSlot
            key={`${selectedDate}-${column.id}-${slot.time}`}
            staffId={column.id}
            time={slot.time}
            top={slot.top}
            height={slotHeight}
          />
        ))}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-full bg-gradient-to-b from-white/[0.02] to-transparent" />

        <div className="relative z-10">
          {column.bookings.map((booking) => (
            <TimelineBookingBlock
              key={booking.id}
              booking={booking}
              column={column}
              onClick={() => onSelectBooking(booking)}
            />
          ))}
        </div>

        {column.bookings.length === 0 && (
          <div className="pointer-events-none absolute inset-x-4 top-6 z-10 rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-500">
            No bookings
          </div>
        )}
      </div>
    </div>
  )
}
