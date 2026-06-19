'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { Booking, StaffColumn } from '@/lib/calendar/calendarTypes'
import {
  currentTimePosition,
  isCurrentTimeVisible,
  isDateToday,
  settingsForZoom,
  TimelineZoom,
  visibleHours,
  customerName,
  serviceName,
} from '@/lib/calendar/calendarHelpers'
import { StaffUtilisationCard } from './StaffUtilisationCard'
import { TimelineStaffColumn } from './TimelineStaffColumn'

export function TimelineDayView({
  selectedDate,
  setSelectedDate,
  formattedSelectedDate,
  selectedDateBookings,
  staffColumns,
  timelineZoom,
  setTimelineZoom,
  setSelectedBooking,
  onMoveBooking,
}: {
  selectedDate: string
  setSelectedDate: (value: string) => void
  formattedSelectedDate: string
  selectedDateBookings: Booking[]
  staffColumns: StaffColumn[]
  timelineZoom: TimelineZoom
  setTimelineZoom: (value: TimelineZoom) => void
  setSelectedBooking: (booking: Booking) => void
  onMoveBooking: (bookingId: string, bookingDate: string, bookingTime: string, teamMemberId: string | null) => Promise<void> | void
}) {
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null)

  const settings = useMemo(() => settingsForZoom(timelineZoom), [timelineZoom])
  const hours = visibleHours(settings)
  const bodyHeight = (settings.endHour - settings.startHour) * settings.pixelsPerHour
  const showCurrentTime = isDateToday(selectedDate) && isCurrentTimeVisible(settings)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id)

    if (!activeId.startsWith('booking:')) return

    const bookingId = activeId.replace('booking:', '')
    const booking = selectedDateBookings.find((item) => item.id === bookingId) || null

    setActiveBooking(booking)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : ''

    setActiveBooking(null)

    if (!activeId.startsWith('booking:') || !overId.startsWith('slot|')) return

    const bookingId = activeId.replace('booking:', '')
    const [, staffId, time] = overId.split('|')

    if (!bookingId || !staffId || !time) return

    await onMoveBooking(bookingId, selectedDate, time, staffId === 'unassigned' ? null : staffId)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveBooking(null)}>
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">
              V3.4 smart scheduling timeline
            </p>

            <h2 className="text-2xl font-black">{formattedSelectedDate}</h2>

            <p className="mt-1 text-slate-400">
              Drag bookings between staff and times. Conflicting moves are blocked before they save.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex rounded-2xl border border-white/10 bg-slate-950 p-1">
              {(['compact', 'normal', 'expanded'] as TimelineZoom[]).map((zoom) => (
                <button
                  key={zoom}
                  type="button"
                  onClick={() => setTimelineZoom(zoom)}
                  className={`rounded-xl px-3 py-2 text-xs font-black capitalize ${
                    timelineZoom === zoom ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {zoom}
                </button>
              ))}
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
            />
          </div>
        </div>

        {staffColumns.length > 0 && (
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {staffColumns.map((column) => (
              <StaffUtilisationCard key={column.id} column={column} />
            ))}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/70">
          <div className="min-w-[960px]">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `88px repeat(${Math.max(staffColumns.length, 1)}, minmax(280px, 1fr))`,
              }}
            >
              <div className="sticky left-0 top-0 z-30 border-b border-r border-white/10 bg-slate-950 p-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                Time
              </div>

              {staffColumns.map((column) => (
                <div key={column.id} className="border-b border-r border-white/10 bg-slate-950 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${column.colour.dot}`} />
                      <p className="truncate font-black">{column.name}</p>
                    </div>

                    {column.role && <p className="truncate text-xs font-bold text-slate-500">{column.role}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="relative grid"
              style={{
                gridTemplateColumns: `88px repeat(${Math.max(staffColumns.length, 1)}, minmax(280px, 1fr))`,
              }}
            >
              <div className="sticky left-0 z-20 border-r border-white/10 bg-slate-950" style={{ height: bodyHeight }}>
                {hours.slice(0, -1).map((hour, index) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-white/10 px-3 pt-2 text-xs font-bold text-slate-500"
                    style={{ top: index * settings.pixelsPerHour }}
                  >
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {showCurrentTime && (
                <div
                  className="pointer-events-none absolute left-[88px] right-0 z-40 border-t-2 border-red-400"
                  style={{ top: currentTimePosition(settings) }}
                >
                  <span className="absolute -top-2 left-2 rounded-full bg-red-400 px-2 py-0.5 text-[10px] font-black text-white">
                    Now
                  </span>
                </div>
              )}

              {staffColumns.length > 0 ? (
                staffColumns.map((column) => (
                  <TimelineStaffColumn
                    key={column.id}
                    selectedDate={selectedDate}
                    column={column}
                    settings={settings}
                    onSelectBooking={setSelectedBooking}
                  />
                ))
              ) : (
                <div className="col-span-full p-8 text-center text-slate-500">
                  No staff members found. Add staff to use the timeline calendar.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <DragOverlay>
        {activeBooking ? (
          <div className="w-72 rounded-2xl border border-cyan-300/40 bg-slate-900 p-4 text-white shadow-2xl shadow-cyan-950/40">
            <p className="text-sm font-black text-cyan-300">{activeBooking.booking_time.slice(0, 5)}</p>
            <p className="mt-1 font-black">{customerName(activeBooking)}</p>
            <p className="text-sm text-slate-400">{serviceName(activeBooking)}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
