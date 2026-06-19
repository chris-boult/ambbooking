'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CalendarStats } from '@/components/calendar/CalendarStats'
import { TimelineDayView } from '@/components/calendar/TimelineDayView'
import type { Booking, TeamMember, ViewMode } from '@/lib/calendar/calendarTypes'
import { canMoveBooking } from '@/lib/calendar/calendarScheduling'
import {
  bookingDuration,
  bookingPrice,
  buildStaffColumns,
  customerName,
  formatDate,
  money,
  parseDate,
  serviceName,
  staffName,
  startOfWeek,
  statusClass,
  statusLabel,
  TimelineZoom,
  toDateValue,
} from '@/lib/calendar/calendarHelpers'
import { calculateDayUtilisation } from '@/lib/calendar/utilisation'

export default function CalendarPage() {
  const [businessId, setBusinessId] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedDate, setSelectedDate] = useState(toDateValue(new Date()))
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [timelineZoom, setTimelineZoom] = useState<TimelineZoom>('normal')
  const [selectedStaffId, setSelectedStaffId] = useState('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCalendar()
  }, [])

  async function loadCalendar() {
    setLoading(true)
    setMessage('')

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      setMessage('You need to be logged in.')
      setLoading(false)
      return
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()

    if (businessError || !business) {
      setMessage(businessError?.message || 'No business found for this account.')
      setLoading(false)
      return
    }

    setBusinessId(business.id)

    const [bookingsResult, teamResult] = await Promise.all([
      supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          booking_time,
          status,
          total_price,
          total_duration_minutes,
          customer_id,
          service_id,
          team_member_id,
          customers(first_name,last_name,email),
          services(name,price,duration_minutes),
          team_members(id,full_name)
        `)
        .eq('business_id', business.id)
        .neq('status', 'cancelled')
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true }),
      supabase
        .from('team_members')
        .select('id, full_name, role')
        .eq('business_id', business.id)
        .order('full_name'),
    ])

    if (bookingsResult.error || teamResult.error) {
      setMessage(bookingsResult.error?.message || teamResult.error?.message || 'Could not load calendar.')
      setLoading(false)
      return
    }

    setBookings((bookingsResult.data as unknown as Booking[]) || [])
    setTeamMembers((teamResult.data as TeamMember[]) || [])
    setLoading(false)
  }

  async function updateBookingStatus(bookingId: string, status: string) {
    setMessage('')

    const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId)

    if (error) {
      setMessage(error.message)
      return
    }

    setBookings((current) =>
      status === 'cancelled'
        ? current.filter((booking) => booking.id !== bookingId)
        : current.map((booking) => (booking.id === bookingId ? { ...booking, status } : booking))
    )

    if (status === 'cancelled') {
      setSelectedBooking(null)
    } else {
      setSelectedBooking((current) => (current && current.id === bookingId ? { ...current, status } : current))
    }

    setMessage(`Booking marked as ${statusLabel(status)}.`)
  }

  async function rescheduleBooking(bookingId: string, date: string, time: string) {
    setMessage('')

    const validation = canMoveBooking({
      bookingId,
      bookingDate: date,
      bookingTime: time,
      teamMemberId: selectedBooking?.team_member_id || null,
      bookings,
    })

    if (!validation.valid) {
      setMessage(validation.reason)
      return
    }

    const { error } = await supabase
      .from('bookings')
      .update({ booking_date: date, booking_time: time })
      .eq('id', bookingId)

    if (error) {
      setMessage(error.message)
      return
    }

    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId ? { ...booking, booking_date: date, booking_time: time } : booking
      )
    )

    setSelectedBooking((current) =>
      current && current.id === bookingId ? { ...current, booking_date: date, booking_time: time } : current
    )

    setMessage('Booking rescheduled.')
  }

  async function moveBooking(bookingId: string, bookingDate: string, bookingTime: string, teamMemberId: string | null) {
    setMessage('')

    const validation = canMoveBooking({
      bookingId,
      bookingDate,
      bookingTime,
      teamMemberId,
      bookings,
    })

    if (!validation.valid) {
      setMessage(validation.reason)
      return
    }

    const previousBookings = bookings

    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              booking_date: bookingDate,
              booking_time: bookingTime,
              team_member_id: teamMemberId,
            }
          : booking
      )
    )

    setSelectedBooking((current) =>
      current && current.id === bookingId
        ? {
            ...current,
            booking_date: bookingDate,
            booking_time: bookingTime,
            team_member_id: teamMemberId,
          }
        : current
    )

    const { error } = await supabase
      .from('bookings')
      .update({
        booking_date: bookingDate,
        booking_time: bookingTime,
        team_member_id: teamMemberId,
      })
      .eq('id', bookingId)

    if (error) {
      setBookings(previousBookings)
      setMessage(error.message)
      return
    }

    setMessage('Booking moved.')
  }

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => selectedStaffId === 'all' || booking.team_member_id === selectedStaffId)
  }, [bookings, selectedStaffId])

  const selectedDateBookings = useMemo(() => {
    return filteredBookings
      .filter((booking) => booking.booking_date === selectedDate)
      .sort((a, b) => a.booking_time.localeCompare(b.booking_time))
  }, [filteredBookings, selectedDate])

  const upcomingBookings = useMemo(() => {
    const today = toDateValue(new Date())

    return filteredBookings
      .filter((booking) => booking.booking_date >= today)
      .sort((a, b) => `${a.booking_date} ${a.booking_time}`.localeCompare(`${b.booking_date} ${b.booking_time}`))
  }, [filteredBookings])

  const revenueForSelectedDay = selectedDateBookings.reduce((total, booking) => total + bookingPrice(booking), 0)
  const selectedDateDuration = selectedDateBookings.reduce((total, booking) => total + bookingDuration(booking), 0)
  const staffColumns = useMemo(() => buildStaffColumns(teamMembers, selectedDateBookings), [teamMembers, selectedDateBookings])

  const weekDays = useMemo(() => {
    const start = startOfWeek(parseDate(selectedDate))

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const value = toDateValue(date)
      const dayBookings = filteredBookings.filter((booking) => booking.booking_date === value)

      return {
        value,
        label: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        day: date.toLocaleDateString('en-GB', { day: 'numeric' }),
        month: date.toLocaleDateString('en-GB', { month: 'short' }),
        bookings: dayBookings,
        revenue: dayBookings.reduce((total, booking) => total + bookingPrice(booking), 0),
      }
    })
  }, [selectedDate, filteredBookings])

  const monthDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    const today = toDateValue(new Date())
    const days: Array<null | { value: string; day: number; bookings: Booking[]; revenue: number; isToday: boolean }> = []

    for (let i = 0; i < startOffset; i++) days.push(null)

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      const value = toDateValue(date)
      const dayBookings = filteredBookings.filter((booking) => booking.booking_date === value)

      days.push({
        value,
        day,
        bookings: dayBookings,
        revenue: dayBookings.reduce((total, booking) => total + bookingPrice(booking), 0),
        isToday: value === today,
      })
    }

    return days
  }, [calendarMonth, filteredBookings])

  return (
    <div className="space-y-8 text-white">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">Staff calendar V3.4</p>
          <h1 className="text-4xl font-black">Your schedule</h1>
          <p className="mt-3 max-w-2xl text-slate-400">
            Smart staff timeline with drag-and-drop, collision stacking, current-time indicator, timeline zoom and conflict prevention.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-2xl px-5 py-3 text-sm font-black capitalize ${
                viewMode === mode
                  ? 'bg-white text-slate-950'
                  : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {message && <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">{message}</div>}

      {loading && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-slate-400">Loading calendar...</div>}

      {!loading && (
        <>
          <CalendarStats
            bookingsToday={selectedDateBookings.length}
            upcomingBookings={upcomingBookings.length}
            revenueToday={money(revenueForSelectedDay)}
            bookedMinutes={`${selectedDateDuration} mins`}
            utilisationPercent={`${calculateDayUtilisation(selectedDateBookings)}%`}
          />

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-400">Staff filter</label>
                <select
                  value={selectedStaffId}
                  onChange={(event) => setSelectedStaffId(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none lg:w-80"
                >
                  <option value="all">All staff</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date()
                    setSelectedDate(toDateValue(today))
                    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                  }}
                  className="rounded-2xl border border-white/10 px-5 py-3 font-black text-white hover:bg-white/10"
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={loadCalendar}
                  className="rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950 hover:bg-cyan-300"
                >
                  Refresh
                </button>
              </div>
            </div>
          </section>

          {viewMode === 'day' && (
            <TimelineDayView
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              formattedSelectedDate={formatDate(selectedDate)}
              selectedDateBookings={selectedDateBookings}
              staffColumns={staffColumns}
              timelineZoom={timelineZoom}
              setTimelineZoom={setTimelineZoom}
              setSelectedBooking={setSelectedBooking}
              onMoveBooking={moveBooking}
            />
          )}

          {viewMode === 'week' && (
            <WeekView
              weekDays={weekDays}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              setViewMode={setViewMode}
              setSelectedBooking={setSelectedBooking}
            />
          )}

          {viewMode === 'month' && (
            <MonthView
              calendarMonth={calendarMonth}
              setCalendarMonth={setCalendarMonth}
              monthDays={monthDays}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              setViewMode={setViewMode}
            />
          )}

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-black">Upcoming bookings</h2>
              <p className="text-slate-400">The next appointments across your business.</p>
            </div>

            <div className="space-y-3">
              {upcomingBookings.slice(0, 8).map((booking) => (
                <BookingRow key={booking.id} booking={booking} onClick={() => setSelectedBooking(booking)} />
              ))}
              {upcomingBookings.length === 0 && <EmptyState message="No upcoming bookings." />}
            </div>
          </section>
        </>
      )}

      {selectedBooking && (
        <BookingDrawer
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onStatusChange={updateBookingStatus}
          onReschedule={rescheduleBooking}
        />
      )}
    </div>
  )
}

function WeekView({
  weekDays,
  selectedDate,
  setSelectedDate,
  setViewMode,
  setSelectedBooking,
}: {
  weekDays: { value: string; label: string; day: string; month: string; bookings: Booking[]; revenue: number }[]
  selectedDate: string
  setSelectedDate: (date: string) => void
  setViewMode: (mode: ViewMode) => void
  setSelectedBooking: (booking: Booking) => void
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-black">Week view</h2>
        <p className="mt-1 text-slate-400">Click a day to open the full staff timeline.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        {weekDays.map((day) => {
          const selected = selectedDate === day.value

          return (
            <div
              key={day.value}
              className={`rounded-2xl border p-4 ${
                selected ? 'border-cyan-300/40 bg-cyan-300/10' : 'border-white/10 bg-black/20'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(day.value)
                  setViewMode('day')
                }}
                className="mb-4 w-full text-left"
              >
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">{day.label}</p>
                <p className="text-3xl font-black">{day.day}</p>
                <p className="text-sm text-slate-400">{day.month}</p>
                <p className="mt-3 text-sm font-bold text-cyan-300">
                  {day.bookings.length} booking{day.bookings.length === 1 ? '' : 's'}
                </p>
                <p className="text-sm text-slate-400">{money(day.revenue)}</p>
              </button>

              <div className="space-y-2">
                {day.bookings.slice(0, 4).map((booking) => (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={() => setSelectedBooking(booking)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/10"
                  >
                    <p className="text-sm font-black">{booking.booking_time.slice(0, 5)}</p>
                    <p className="truncate text-sm text-slate-400">{customerName(booking)}</p>
                  </button>
                ))}

                {day.bookings.length > 4 && <p className="text-xs text-slate-500">+{day.bookings.length - 4} more</p>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MonthView({
  calendarMonth,
  setCalendarMonth,
  monthDays,
  selectedDate,
  setSelectedDate,
  setViewMode,
}: {
  calendarMonth: Date
  setCalendarMonth: (date: Date) => void
  monthDays: Array<null | { value: string; day: number; bookings: Booking[]; revenue: number; isToday: boolean }>
  selectedDate: string
  setSelectedDate: (date: string) => void
  setViewMode: (mode: ViewMode) => void
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
          className="rounded-2xl border border-white/10 px-4 py-3 font-black hover:bg-white/10"
        >
          ←
        </button>

        <h2 className="text-center text-2xl font-black">
          {calendarMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </h2>

        <button
          type="button"
          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
          className="rounded-2xl border border-white/10 px-4 py-3 font-black hover:bg-white/10"
        >
          →
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-black uppercase text-slate-500">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {monthDays.map((day, index) => {
          if (!day) return <div key={index} />

          const selected = selectedDate === day.value

          return (
            <button
              key={day.value}
              type="button"
              onClick={() => {
                setSelectedDate(day.value)
                setViewMode('day')
              }}
              className={`min-h-28 rounded-2xl border p-3 text-left transition ${
                selected ? 'border-cyan-300/40 bg-cyan-300/10' : 'border-white/10 bg-black/20 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black">{day.day}</span>
                {day.isToday && (
                  <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-[10px] font-black text-slate-950">
                    Today
                  </span>
                )}
              </div>

              {day.bookings.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-bold text-cyan-300">
                    {day.bookings.length} booking{day.bookings.length === 1 ? '' : 's'}
                  </p>
                  <p className="text-xs text-slate-400">{money(day.revenue)}</p>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function BookingDrawer({
  booking,
  onClose,
  onStatusChange,
  onReschedule,
}: {
  booking: Booking
  onClose: () => void
  onStatusChange: (bookingId: string, status: string) => void
  onReschedule: (bookingId: string, date: string, time: string) => void
}) {
  const [newDate, setNewDate] = useState(booking.booking_date)
  const [newTime, setNewTime] = useState(booking.booking_time.slice(0, 5))

  useEffect(() => {
    setNewDate(booking.booking_date)
    setNewTime(booking.booking_time.slice(0, 5))
  }, [booking])

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70">
      <button type="button" aria-label="Close booking drawer" className="absolute inset-0 cursor-default" onClick={onClose} />

      <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">Booking details</p>
            <h2 className="text-3xl font-black">{customerName(booking)}</h2>
            <p className="mt-2 text-slate-400">
              {serviceName(booking)} with {staffName(booking)}
            </p>
          </div>

          <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 px-4 py-2 font-black hover:bg-white/10">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Appointment</p>
            <p className="text-xl font-black">
              {formatDate(booking.booking_date)} at {booking.booking_time.slice(0, 5)}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <span className={`rounded-full border px-3 py-1 text-sm font-bold capitalize ${statusClass(booking.status)}`}>
                {statusLabel(booking.status)}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-slate-300">
                {bookingDuration(booking)} mins
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-slate-300">
                {money(bookingPrice(booking))}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Quick reschedule</p>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="date"
                value={newDate}
                onChange={(event) => setNewDate(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />

              <input
                type="time"
                value={newTime}
                onChange={(event) => setNewTime(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => onReschedule(booking.id, newDate, newTime)}
              className="mt-4 w-full rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 hover:bg-cyan-300"
            >
              Save new time
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Status</p>

            <div className="grid gap-3 md:grid-cols-2">
              <button type="button" onClick={() => onStatusChange(booking.id, 'completed')} className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 font-black text-blue-300">
                Completed
              </button>

              <button type="button" onClick={() => onStatusChange(booking.id, 'no_show')} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 font-black text-amber-300">
                No-show
              </button>

              <button type="button" onClick={() => onStatusChange(booking.id, 'confirmed')} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 font-black text-emerald-300">
                Confirmed
              </button>

              <button type="button" onClick={() => onStatusChange(booking.id, 'cancelled')} className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-black text-red-300">
                Cancel booking
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}

function BookingRow({ booking, onClick }: { booking: Booking; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-left hover:bg-white/10 md:grid-cols-[120px_1fr_auto]"
    >
      <div>
        <p className="font-black text-cyan-300">{booking.booking_time.slice(0, 5)}</p>
        <p className="text-sm text-slate-500">
          {formatDate(booking.booking_date, { weekday: 'short', day: 'numeric', month: 'short', year: undefined })}
        </p>
      </div>

      <div>
        <p className="font-black">{customerName(booking)}</p>
        <p className="text-sm text-slate-400">
          {serviceName(booking)} with {staffName(booking)}
        </p>
      </div>

      <div className="text-left md:text-right">
        <p className="font-black">{money(bookingPrice(booking))}</p>
        <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize ${statusClass(booking.status)}`}>
          {statusLabel(booking.status)}
        </span>
      </div>
    </button>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-slate-500">{message}</div>
}
