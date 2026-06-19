'use client'

import { useDroppable } from '@dnd-kit/core'
import type {
  AvailabilityBlock,
  Booking,
  CalendarBlockType,
  StaffColumn,
  TimelineSettings,
} from '@/lib/calendar/calendarTypes'
import {
  buildAvailabilityBlocks,
  buildBookingLayout,
  minutesToHeight,
  minutesToTime,
  minutesToTop,
  occupancyClass,
  staffAvailableMinutes,
  staffOccupancy,
  staffRevenue,
  timeToMinutes,
  timelineHeight,
} from '@/lib/calendar/calendarHelpers'
import { TimelineBookingBlock } from './TimelineBookingBlock'

function blockClass(block: AvailabilityBlock) {
  if (block.type === 'time_off') return 'border-red-400/20 bg-red-500/10 text-red-200'
  if (block.type === 'break') return 'border-amber-400/20 bg-amber-500/10 text-amber-200'
  return 'border-slate-500/20 bg-slate-700/30 text-slate-400'
}

function addMinutes(time: string, minutesToAdd: number) {
  const total = timeToMinutes(time) + minutesToAdd
  return minutesToTime(total)
}

function AvailabilityOverlayBlock({
  block,
  settings,
}: {
  block: AvailabilityBlock
  settings: TimelineSettings
}) {
  const top = minutesToTop(block.startMinutes, settings)
  const height = minutesToHeight(block.startMinutes, block.endMinutes, settings)

  if (height <= 0) return null

  return (
    <div
      className={`pointer-events-none absolute left-2 right-2 z-[5] rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] backdrop-blur ${blockClass(block)}`}
      style={{ top, height }}
    >
      <div className="sticky top-2">
        <p>{block.label}</p>
        <p className="mt-0.5 text-[10px] opacity-70">
          {minutesToTime(block.startMinutes)}–{minutesToTime(block.endMinutes)}
        </p>
      </div>
    </div>
  )
}

function DropSlot({
  staffId,
  time,
  top,
  height,
  onCreateBlock,
}: {
  staffId: string
  time: string
  top: number
  height: number
  onCreateBlock?: (staffId: string, startTime: string, endTime: string, type: CalendarBlockType) => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot|${staffId}|${time}`,
  })

  const endTime = addMinutes(time, 60)

  return (
    <div
      ref={setNodeRef}
      className={`group absolute left-0 right-0 z-10 transition ${
        isOver ? 'bg-cyan-300/20 ring-1 ring-inset ring-cyan-300/60' : ''
      }`}
      style={{ top, height }}
    >
      {onCreateBlock && staffId !== 'unassigned' && (
        <div className="pointer-events-none absolute right-2 top-1 hidden gap-1 group-hover:flex">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onCreateBlock(staffId, time, endTime, 'break')
            }}
            className="pointer-events-auto rounded-full border border-amber-300/30 bg-amber-400/20 px-2 py-1 text-[10px] font-black text-amber-100 shadow-xl"
          >
            + Break
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onCreateBlock(staffId, time, endTime, 'time_off')
            }}
            className="pointer-events-auto rounded-full border border-red-300/30 bg-red-500/20 px-2 py-1 text-[10px] font-black text-red-100 shadow-xl"
          >
            + Block
          </button>
        </div>
      )}
    </div>
  )
}

export function TimelineStaffColumn({
  selectedDate,
  column,
  settings,
  onSelectBooking,
  onCreateBlock,
}: {
  selectedDate: string
  column: StaffColumn
  settings: TimelineSettings
  onSelectBooking: (booking: Booking) => void
  onCreateBlock?: (staffId: string, startTime: string, endTime: string, type: CalendarBlockType) => void
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
  const availableMinutes = staffAvailableMinutes(column, settings)
  const occupancy = staffOccupancy(column.bookings, settings, availableMinutes)
  const availabilityBlocks = buildAvailabilityBlocks(column, settings)

  return (
    <div className="relative min-w-[280px] border-r border-white/10 bg-black/20" style={{ height: columnHeight }}>
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-20 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 backdrop-blur">
        <div>
          <p className="text-xs font-black text-white">{column.bookings.length} booking{column.bookings.length === 1 ? '' : 's'}</p>
          <p className="text-[11px] text-slate-500">
            £{staffRevenue(column.bookings).toFixed(2)} · {availableMinutes} mins available
          </p>
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

      {availabilityBlocks.map((block) => (
        <AvailabilityOverlayBlock key={block.id} block={block} settings={settings} />
      ))}

      {slots.map((slot) => (
        <DropSlot
          key={`${selectedDate}-${column.id}-${slot.time}`}
          staffId={column.id}
          time={slot.time}
          top={slot.top}
          height={slotHeight}
          onCreateBlock={onCreateBlock}
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
