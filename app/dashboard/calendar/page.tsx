'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ViewMode = 'day' | 'week' | 'month'

type CustomerJoin =
  | {
      first_name: string
      last_name: string | null
      email?: string | null
    }[]
  | {
      first_name: string
      last_name: string | null
      email?: string | null
    }
  | null

type ServiceJoin =
  | {
      name: string
      price: number
      duration_minutes?: number | null
    }[]
  | {
      name: string
      price: number
      duration_minutes?: number | null
    }
  | null

type TeamMemberJoin =
  | {
      id?: string | null
      full_name: string
    }[]
  | {
      id?: string | null
      full_name: string
    }
  | null

type Booking = {
  id: string
  booking_date: string
  booking_time: string
  status: string
  total_price?: number | null
  total_duration_minutes?: number | null
  customer_id?: string | null
  service_id?: string | null
  team_member_id?: string | null
  customers: CustomerJoin
  services: ServiceJoin
  team_members: TeamMemberJoin
}

type TeamMember = {
  id: string
  full_name: string
  role?: string | null
}

function toDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return ''

  return parseDate(value).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  })
}

function startOfWeek(date: Date) {
  const copy = new Date(date)
  copy.setHours(12, 0, 0, 0)

  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)

  return copy
}

function money(value: number | string | null | undefined) {
  return `£${Number(value || 0).toFixed(2)}`
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number)
  return hours * 60 + minutes
}

function joinOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] || null
  return value
}

function customerName(booking: Booking) {
  const customer = joinOne(booking.customers)

  if (!customer) return 'Unknown customer'

  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
}

function serviceName(booking: Booking) {
  const service = joinOne(booking.services)
  return service?.name || 'Unknown service'
}

function staffName(booking: Booking) {
  const staff = joinOne(booking.team_members)
  return staff?.full_name || 'Unassigned'
}

function bookingPrice(booking: Booking) {
  const service = joinOne(booking.services)
  return Number(booking.total_price ?? service?.price ?? 0)
}

function bookingDuration(booking: Booking) {
  const service = joinOne(booking.services)
  return Number(booking.total_duration_minutes ?? service?.duration_minutes ?? 30)
}

function statusClass(status: string) {
  if (status === 'confirmed') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
  if (status === 'cancelled') return 'bg-red-500/10 text-red-300 border-red-500/20'
  if (status === 'completed') return 'bg-blue-500/10 text-blue-300 border-blue-500/20'
  if (status === 'no_show') return 'bg-amber-500/10 text-amber-300 border-amber-500/20'
  return 'bg-slate-500/10 text-slate-300 border-slate-500/20'
}

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

    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)

    if (error) {
      setMessage(error.message)
      return
    }

    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId ? { ...booking, status } : booking
      )
    )

    setSelectedBooking((current) =>
      current && current.id === bookingId ? { ...current, status } : current
    )

    setMessage(`Booking marked as ${status.replace('_', ' ')}.`)
  }

  async function rescheduleBooking(bookingId: string, date: string, time: string) {
    setMessage('')

    const { error } = await supabase
      .from('bookings')
      .update({
        booking_date: date,
        booking_time: time,
      })
      .eq('id', bookingId)

    if (error) {
      setMessage(error.message)
      return
    }

    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId
          ? { ...booking, booking_date: date, booking_time: time }
          : booking
      )
    )

    setSelectedBooking((current) =>
      current && current.id === bookingId
        ? { ...current, booking_date: date, booking_time: time }
        : current
    )

    setMessage('Booking rescheduled.')
  }

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (selectedStaffId === 'all') return true
      return booking.team_member_id === selectedStaffId
    })
  }, [bookings, selectedStaffId])

  const selectedDateBookings = useMemo(() => {
    return filteredBookings
      .filter((booking) => booking.booking_date === selectedDate)
      .sort((a, b) => a.booking_time.localeCompare(b.booking_time))
  }, [filteredBookings, selectedDate])

  const upcomingBookings = useMemo(() => {
    const today = toDateValue(new Date())
    return filteredBookings.filter((booking) => booking.booking_date >= today)
  }, [filteredBookings])

  const revenueForSelectedDay = selectedDateBookings.reduce((total, booking) => {
    return total + bookingPrice(booking)
  }, 0)

  const appointmentsForSelectedDay = selectedDateBookings.length

  const selectedDateDuration = selectedDateBookings.reduce((total, booking) => {
    return total + bookingDuration(booking)
  }, 0)

  const selectedDateByStaff = useMemo(() => {
    const groups: Record<string, Booking[]> = {}

    selectedDateBookings.forEach((booking) => {
      const id = booking.team_member_id || 'unassigned'
      groups[id] = groups[id] || []
      groups[id].push(booking)
    })

    return groups
  }, [selectedDateBookings])

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
    const days: Array<null | {
      value: string
      day: number
      bookings: Booking[]
      revenue: number
      isToday: boolean
    }> = []

    for (let i = 0; i < startOffset; i++) {
      days.push(null)
    }

    const today = toDateValue(new Date())

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

  const staffColumns = useMemo(() => {
    const base = teamMembers.map((member) => ({
      id: member.id,
      name: member.full_name,
      bookings: selectedDateByStaff[member.id] || [],
    }))

    const unassigned = selectedDateByStaff.unassigned || []

    if (unassigned.length > 0) {
      base.push({
        id: 'unassigned',
        name: 'Unassigned',
        bookings: unassigned,
      })
    }

    return base
  }, [teamMembers, selectedDateByStaff])

  const formattedSelectedDate = formatDate(selectedDate)

  return (
    <div className="space-y-8 text-white">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">
            Staff calendar
          </p>

          <h1 className="text-4xl font-black">Your schedule</h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            View bookings by day, week, month and staff member.
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

      {message && (
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
          {message}
        </div>
      )}

      {loading && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-slate-400">
          Loading calendar...
        </div>
      )}

      {!loading && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Bookings selected day" value={appointmentsForSelectedDay} />
            <StatCard label="Upcoming bookings" value={upcomingBookings.length} />
            <StatCard label="Revenue selected day" value={money(revenueForSelectedDay)} />
            <StatCard label="Booked minutes" value={`${selectedDateDuration} mins`} />
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-400">
                  Staff filter
                </label>

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
            <DayView
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              formattedSelectedDate={formattedSelectedDate}
              selectedDateBookings={selectedDateBookings}
              staffColumns={staffColumns}
              selectedBooking={selectedBooking}
              setSelectedBooking={setSelectedBooking}
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
            <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black">Upcoming bookings</h2>
                <p className="text-slate-400">
                  The next appointments across your business.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {upcomingBookings.slice(0, 8).map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  onClick={() => setSelectedBooking(booking)}
                />
              ))}

              {upcomingBookings.length === 0 && (
                <EmptyState message="No upcoming bookings." />
              )}
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

function DayView({
  selectedDate,
  setSelectedDate,
  formattedSelectedDate,
  selectedDateBookings,
  staffColumns,
  selectedBooking,
  setSelectedBooking,
}: {
  selectedDate: string
  setSelectedDate: (value: string) => void
  formattedSelectedDate: string
  selectedDateBookings: Booking[]
  staffColumns: { id: string; name: string; bookings: Booking[] }[]
  selectedBooking: Booking | null
  setSelectedBooking: (booking: Booking) => void
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black">{formattedSelectedDate}</h2>
          <p className="mt-1 text-slate-400">
            {selectedDateBookings.length} booking
            {selectedDateBookings.length === 1 ? '' : 's'} scheduled
          </p>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[220px_1fr]">
        <div className="hidden rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-500 xl:block">
          <p className="mb-4 font-black uppercase tracking-[0.2em]">Day timeline</p>

          <div className="space-y-8">
            {Array.from({ length: 9 }, (_, index) => 9 + index).map((hour) => (
              <div key={hour}>{String(hour).padStart(2, '0')}:00</div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(staffColumns.length, 1)}, minmax(220px, 1fr))` }}>
            {staffColumns.length > 0 ? (
              staffColumns.map((column) => (
                <div key={column.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-4 border-b border-white/10 pb-3">
                    <h3 className="font-black">{column.name}</h3>
                    <p className="text-sm text-slate-500">
                      {column.bookings.length} booking{column.bookings.length === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {column.bookings
                      .sort((a, b) => a.booking_time.localeCompare(b.booking_time))
                      .map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          compact={false}
                          onClick={() => setSelectedBooking(booking)}
                        />
                      ))}

                    {column.bookings.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">
                        No bookings
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="No staff members found. Add staff to use staff columns." />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function WeekView({
  weekDays,
  selectedDate,
  setSelectedDate,
  setViewMode,
  setSelectedBooking,
}: {
  weekDays: {
    value: string
    label: string
    day: string
    month: string
    bookings: Booking[]
    revenue: number
  }[]
  selectedDate: string
  setSelectedDate: (date: string) => void
  setViewMode: (mode: ViewMode) => void
  setSelectedBooking: (booking: Booking) => void
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-black">Week view</h2>
        <p className="mt-1 text-slate-400">Click a day to open the full staff day view.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        {weekDays.map((day) => {
          const selected = selectedDate === day.value

          return (
            <div
              key={day.value}
              className={`rounded-2xl border p-4 ${
                selected
                  ? 'border-cyan-300/40 bg-cyan-300/10'
                  : 'border-white/10 bg-black/20'
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
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                  {day.label}
                </p>

                <p className="text-3xl font-black">
                  {day.day}
                </p>

                <p className="text-sm text-slate-400">
                  {day.month}
                </p>

                <p className="mt-3 text-sm font-bold text-cyan-300">
                  {day.bookings.length} booking{day.bookings.length === 1 ? '' : 's'}
                </p>

                <p className="text-sm text-slate-400">
                  {money(day.revenue)}
                </p>
              </button>

              <div className="space-y-2">
                {day.bookings.slice(0, 4).map((booking) => (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={() => setSelectedBooking(booking)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/10"
                  >
                    <p className="text-sm font-black">
                      {booking.booking_time.slice(0, 5)}
                    </p>
                    <p className="truncate text-sm text-slate-400">
                      {customerName(booking)}
                    </p>
                  </button>
                ))}

                {day.bookings.length > 4 && (
                  <p className="text-xs text-slate-500">
                    +{day.bookings.length - 4} more
                  </p>
                )}
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
  monthDays: Array<null | {
    value: string
    day: number
    bookings: Booking[]
    revenue: number
    isToday: boolean
  }>
  selectedDate: string
  setSelectedDate: (date: string) => void
  setViewMode: (mode: ViewMode) => void
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() =>
            setCalendarMonth(
              new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
            )
          }
          className="rounded-2xl border border-white/10 px-4 py-3 font-black hover:bg-white/10"
        >
          ←
        </button>

        <h2 className="text-center text-2xl font-black">
          {calendarMonth.toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric',
          })}
        </h2>

        <button
          type="button"
          onClick={() =>
            setCalendarMonth(
              new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
            )
          }
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
                selected
                  ? 'border-cyan-300/40 bg-cyan-300/10'
                  : 'border-white/10 bg-black/20 hover:bg-white/10'
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

                  <p className="text-xs text-slate-400">
                    {money(day.revenue)}
                  </p>
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
      <button
        type="button"
        aria-label="Close booking drawer"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">
              Booking details
            </p>

            <h2 className="text-3xl font-black">
              {customerName(booking)}
            </h2>

            <p className="mt-2 text-slate-400">
              {serviceName(booking)} with {staffName(booking)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 px-4 py-2 font-black hover:bg-white/10"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
              Appointment
            </p>

            <p className="text-xl font-black">
              {formatDate(booking.booking_date)} at {booking.booking_time.slice(0, 5)}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <span className={`rounded-full border px-3 py-1 text-sm font-bold ${statusClass(booking.status)}`}>
                {booking.status}
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
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
              Quick reschedule
            </p>

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
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
              Status
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => onStatusChange(booking.id, 'completed')}
                className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 font-black text-blue-300"
              >
                Completed
              </button>

              <button
                type="button"
                onClick={() => onStatusChange(booking.id, 'no_show')}
                className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 font-black text-amber-300"
              >
                No-show
              </button>

              <button
                type="button"
                onClick={() => onStatusChange(booking.id, 'confirmed')}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 font-black text-emerald-300"
              >
                Confirmed
              </button>

              <button
                type="button"
                onClick={() => onStatusChange(booking.id, 'cancelled')}
                className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-black text-red-300"
              >
                Cancel booking
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}

function BookingCard({
  booking,
  compact,
  onClick,
}: {
  booking: Booking
  compact: boolean
  onClick: () => void
}) {
  const startMinutes = timeToMinutes(booking.booking_time)
  const duration = bookingDuration(booking)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-left hover:bg-white/10"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-cyan-300">
            {booking.booking_time.slice(0, 5)}
          </p>

          {!compact && (
            <p className="text-xs text-slate-500">
              {duration} mins
            </p>
          )}
        </div>

        <span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass(booking.status)}`}>
          {booking.status}
        </span>
      </div>

      <h4 className="font-black">
        {customerName(booking)}
      </h4>

      <p className="mt-1 text-sm text-slate-400">
        {serviceName(booking)}
      </p>

      <p className="mt-3 text-sm font-bold text-slate-300">
        {money(bookingPrice(booking))}
      </p>
    </button>
  )
}

function BookingRow({
  booking,
  onClick,
}: {
  booking: Booking
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-left hover:bg-white/10 md:grid-cols-[120px_1fr_auto]"
    >
      <div>
        <p className="font-black text-cyan-300">
          {booking.booking_time.slice(0, 5)}
        </p>

        <p className="text-sm text-slate-500">
          {formatDate(booking.booking_date, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: undefined,
          })}
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
        <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(booking.status)}`}>
          {booking.status}
        </span>
      </div>
    </button>
  )
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <p className="mb-2 text-slate-400">{label}</p>
      <h2 className="text-3xl font-black">{value}</h2>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-slate-500">
      {message}
    </div>
  )
}
