'use client'

import { CSS } from '@dnd-kit/utilities'
import { useDraggable } from '@dnd-kit/core'
import type { BookingLayoutItem, StaffColumn, TimelineSettings } from '@/lib/calendar/calendarTypes'
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
  item,
  column,
  settings,
  onClick,
}: {
  item: BookingLayoutItem
  column: StaffColumn
  settings: TimelineSettings
  onClick: () => void
}) {
  const { booking, lane, totalLanes, hasCollision } = item

  const top = bookingTop(booking, settings)
  const height = Math.max(bookingHeight(booking, settings), settings.minimumBookingHeight)
  const compact = height < 74

  const gutter = 12
  const laneGap = 6
  const widthPercent = 100 / totalLanes
  const left = `calc(${lane * widthPercent}% + ${gutter}px)`
  const right = `calc(${(totalLanes - lane - 1) * widthPercent}% + ${gutter}px)`

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `booking:${booking.id}`,
    data: {
      bookingId: booking.id,
      teamMemberId: booking.team_member_id,
    },
  })

  return (
    <div
      ref={setNodeRef}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`absolute z-30 overflow-hidden rounded-xl border ${column.colour.border} bg-slate-900 p-3 text-left shadow-xl shadow-black/30 transition ${
        isDragging
          ? 'cursor-grabbing opacity-60 ring-2 ring-cyan-300/70 scale-[1.02]'
          : 'cursor-grab hover:-translate-y-0.5 hover:bg-slate-800'
      } ${hasCollision ? 'ring-1 ring-amber-300/40' : ''}`}
      style={{
        top,
        height,
        left,
        right,
        marginRight: totalLanes > 1 ? laneGap : 0,
        transform: CSS.Translate.toString(transform),
        touchAction: 'none',
      }}
      {...listeners}
      {...attributes}
    >
      {hasCollision && (
        <div className="absolute right-2 top-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-black text-amber-200">
          clash
        </div>
      )}

      <div className="flex items-start justify-between gap-2 pr-10">
        <div className="min-w-0">
          <p className={`text-sm font-black ${column.colour.text}`}>{booking.booking_time.slice(0, 5)}</p>

          {!compact && <p className="text-xs text-slate-400">{bookingDuration(booking)} mins</p>}
        </div>

        {!compact && !hasCollision && (
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${statusClass(booking.status)}`}>
            {statusLabel(booking.status)}
          </span>
        )}
      </div>

      <h4 className="mt-1 truncate font-black leading-tight">{customerName(booking)}</h4>

      <p className="truncate text-sm text-slate-300">{serviceName(booking)}</p>

      {!compact && <p className="mt-1 text-xs font-bold text-slate-400">{money(bookingPrice(booking))}</p>}

      <div className={`absolute inset-x-0 bottom-0 h-1 ${column.colour.bgStrong}`} />
    </div>
  )
}
