'use client'

import { useDroppable } from '@dnd-kit/core'
import type { Booking, StaffColumn, TimelineSettings } from '@/lib/calendar/calendarTypes'
import {
  buildBookingLayout,
  minutesToTime,
  occupancyClass,
  staffOccupancy,
  staffRevenue,
  timelineHeight,
} from '@/lib/calendar/calendarHelpers'
import { TimelineBookingBlock } from './TimelineBookingBlock'

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
  settings,
  onSelectBooking,
}: {
  selectedDate: string
  column: StaffColumn
  settings: TimelineSettings
  onSelectBooking: (booking: Booking) => void
}) {
  const columnHeight = timelineHeight(settings)
  const slotMinutes = 15
  const slotHeight = (slotMinutes / 60) * settings.pixelsPerHour

  const startMinutes = settings.startHour * 60
  const endMinutes = settings.endHour * 60

  const slots = Array.from({ length: (endMinutes - startMinutes) / slotMinutes }, (_, index) => {
    const minutes = startMinutes + index * slotMinutes

    return {
      time: minutesToTime(minutes),
      top: index * slotHeight,
    }
  })

  const layoutItems = buildBookingLayout(column.bookings)
  const occupancy = staffOccupancy(column.bookings, settings)

  return (
    <div className="relative min-w-[280px] border-r border-white/10 bg-black/20" style={{ height: columnHeight }}>
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-20 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 backdrop-blur">
        <div>
          <p className="text-xs font-black text-white">{column.bookings.length} booking{column.bookings.length === 1 ? '' : 's'}</p>
          <p className="text-[11px] text-slate-500">£{staffRevenue(column.bookings).toFixed(2)}</p>
        </div>

        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${occupancyClass(occupancy)}`}>
          {occupancy}%
        </span>
      </div>

      {Array.from({ length: settings.endHour - settings.startHour }).map((_, index) => (
        <div
          key={index}
          className="absolute left-0 right-0 z-0 border-t border-white/10"
          style={{ top: index * settings.pixelsPerHour }}
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

      {layoutItems.map((item) => (
        <TimelineBookingBlock
          key={item.booking.id}
          item={item}
          column={column}
          settings={settings}
          onClick={() => onSelectBooking(item.booking)}
        />
      ))}

      {column.bookings.length === 0 && (
        <div className="pointer-events-none absolute inset-x-4 top-20 z-20 rounded-2xl border border-dashed border-cyan-300/20 bg-cyan-300/5 p-4 text-center text-sm text-cyan-100">
          Drop bookings here
        </div>
      )}
    </div>
  )
}
