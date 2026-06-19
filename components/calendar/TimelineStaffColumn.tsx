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
    id: `slot|${staffId}|${time}`,
  })

  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 right-0 z-10 transition ${
        isOver ? 'bg-cyan-300/20 ring-1 ring-inset ring-cyan-300/60' : ''
      }`}
      style={{ top, height }}
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
  const slotHeight =
    (slotMinutes / 60) * DEFAULT_TIMELINE_SETTINGS.pixelsPerHour

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
    <div
      className="relative min-w-[260px] border-r border-white/10 bg-black/20"
      style={{ height: columnHeight }}
    >
      {Array.from({
        length: DEFAULT_TIMELINE_SETTINGS.endHour - DEFAULT_TIMELINE_SETTINGS.startHour,
      }).map((_, index) => (
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

      {column.bookings.map((booking) => (
        <TimelineBookingBlock
          key={booking.id}
          booking={booking}
          column={column}
          onClick={() => onSelectBooking(booking)}
        />
      ))}

      {column.bookings.length === 0 && (
        <div className="pointer-events-none absolute inset-x-4 top-6 z-20 rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-500">
          No bookings
        </div>
      )}
    </div>
  )
}