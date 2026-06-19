'use client'

import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { Booking, StaffColumn } from '@/lib/calendar/calendarTypes'
import { DEFAULT_TIMELINE_SETTINGS, visibleHours } from '@/lib/calendar/calendarHelpers'
import { StaffUtilisationCard } from './StaffUtilisationCard'
import { TimelineStaffColumn } from './TimelineStaffColumn'

export function TimelineDayView({
  selectedDate,
  setSelectedDate,
  formattedSelectedDate,
  selectedDateBookings,
  staffColumns,
  setSelectedBooking,
  onMoveBooking,
}: {
  selectedDate: string
  setSelectedDate: (value: string) => void
  formattedSelectedDate: string
  selectedDateBookings: Booking[]
  staffColumns: StaffColumn[]
  setSelectedBooking: (booking: Booking) => void
  onMoveBooking: (bookingId: string, bookingDate: string, bookingTime: string, teamMemberId: string | null) => Promise<void> | void
}) {
  const hours = visibleHours(DEFAULT_TIMELINE_SETTINGS)
  const bodyHeight =
    (DEFAULT_TIMELINE_SETTINGS.endHour - DEFAULT_TIMELINE_SETTINGS.startHour) *
    DEFAULT_TIMELINE_SETTINGS.pixelsPerHour

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : ''

    if (!activeId.startsWith('booking:') || !overId.startsWith('slot:')) return

    const bookingId = activeId.replace('booking:', '')
    const [, staffId, time] = overId.split(':')

    if (!bookingId || !staffId || !time) return

    await onMoveBooking(
      bookingId,
      selectedDate,
      time,
      staffId === 'unassigned' ? null : staffId
    )
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">
              V3.2 drag and drop timeline
            </p>

            <h2 className="text-2xl font-black">{formattedSelectedDate}</h2>

            <p className="mt-1 text-slate-400">
              Drag bookings between times and staff columns. {selectedDateBookings.length} booking
              {selectedDateBookings.length === 1 ? '' : 's'} scheduled across {staffColumns.length} column
              {staffColumns.length === 1 ? '' : 's'}.
            </p>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
          />
        </div>

        {staffColumns.length > 0 && (
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {staffColumns.map((column) => (
              <StaffUtilisationCard key={column.id} column={column} />
            ))}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/70">
          <div className="min-w-[920px]">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `88px repeat(${Math.max(staffColumns.length, 1)}, minmax(260px, 1fr))`,
              }}
            >
              <div className="sticky left-0 top-0 z-30 border-b border-r border-white/10 bg-slate-950 p-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                Time
              </div>

              {staffColumns.map((column) => (
                <div key={column.id} className="border-b border-r border-white/10 bg-slate-950 p-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${column.colour.dot}`} />
                    <p className="truncate font-black">{column.name}</p>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: `88px repeat(${Math.max(staffColumns.length, 1)}, minmax(260px, 1fr))`,
              }}
            >
              <div className="sticky left-0 z-20 border-r border-white/10 bg-slate-950" style={{ height: bodyHeight }}>
                {hours.slice(0, -1).map((hour, index) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-white/10 px-3 pt-2 text-xs font-bold text-slate-500"
                    style={{ top: index * DEFAULT_TIMELINE_SETTINGS.pixelsPerHour }}
                  >
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {staffColumns.length > 0 ? (
                staffColumns.map((column) => (
                  <TimelineStaffColumn
                    key={column.id}
                    selectedDate={selectedDate}
                    column={column}
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
    </DndContext>
  )
}
