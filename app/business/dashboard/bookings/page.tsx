'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Search,
  UserRound,
  XCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import DashboardPage from '@/components/dashboard/DashboardPage'
import DashboardHero from '@/components/dashboard/DashboardHero'
import DashboardGrid from '@/components/dashboard/DashboardGrid'
import StatCard from '@/components/dashboard/StatCard'
import SectionCard from '@/components/dashboard/SectionCard'
import { Availability, Booking, Customer, RawBooking, Service, TeamMember } from './types'
import { formatBookingDate, uniqueValues } from './utils/bookingFormatting'
import RescheduleModal from './components/RescheduleModal'

type FilterKey = 'upcoming' | 'past' | 'completed' | 'no_show' | 'cancelled' | 'all'

const filters: { key: FilterKey; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'completed', label: 'Completed' },
  { key: 'no_show', label: 'No shows' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
]

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [bookedTimes, setBookedTimes] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('upcoming')

  const dateOptions = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const date = new Date()
        date.setDate(date.getDate() + index)

        return {
          value: date.toISOString().split('T')[0],
          day: date.toLocaleDateString('en-GB', { weekday: 'short' }),
          date: date.toLocaleDateString('en-GB', { day: 'numeric' }),
          month: date.toLocaleDateString('en-GB', { month: 'short' }),
        }
      }),
    []
  )

  const selectedDayOfWeek = newDate ? new Date(newDate).getDay() : null

  const timeSlots = useMemo(() => {
    const slots: string[] = []
    if (!availability?.is_available || !availability.start_time || !availability.end_time) return slots

    let [hour, minute] = availability.start_time.slice(0, 5).split(':').map(Number)
    const [endHour, endMinute] = availability.end_time.slice(0, 5).split(':').map(Number)

    while (hour < endHour || (hour === endHour && minute < endMinute)) {
      slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
      minute += 30
      if (minute >= 60) {
        minute = 0
        hour += 1
      }
    }

    return slots
  }, [availability])

  const availableTimeSlots = timeSlots.filter((slot) => !bookedTimes.includes(slot))

  async function publishBookingEvent({
    type,
    booking,
    bookingDate,
    bookingTime,
    status,
  }: {
    type: 'booking.updated' | 'booking.cancelled' | 'booking.completed'
    booking: Booking
    bookingDate?: string
    bookingTime?: string
    status?: string
  }) {
    try {
      await fetch('/api/events/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          businessId: booking.business_id,
          customerId: booking.customer_id,
          payload: {
            bookingId: booking.id,
            status: status || booking.status,
            bookingDate: bookingDate || booking.booking_date,
            bookingTime: bookingTime || booking.booking_time,
            serviceName: booking.services?.[0]?.name || 'Appointment',
            customerName: getCustomerName(booking),
            customerEmail: booking.customers?.[0]?.email || '',
            teamMemberName: booking.team_members?.[0]?.full_name || '',
          },
        }),
      })
    } catch (error) {
      console.error('Booking event publish failed:', error)
    }
  }

  async function loadBookings() {
    setLoading(true)

    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select('id,business_id,customer_id,service_id,team_member_id,booking_date,booking_time,status')
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true })

    if (bookingError || !bookingData) {
      setBookings([])
      setLoading(false)
      return
    }

    const rawBookings = bookingData as RawBooking[]
    const customerIds = uniqueValues(rawBookings.map((booking) => booking.customer_id))
    const serviceIds = uniqueValues(rawBookings.map((booking) => booking.service_id))
    const teamMemberIds = uniqueValues(rawBookings.map((booking) => booking.team_member_id))

    let customers: Customer[] = []
    let services: Service[] = []
    let teamMembers: TeamMember[] = []

    if (customerIds.length) {
      const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email')
        .in('id', customerIds)

      customers = (data as Customer[]) || []
    }

    if (serviceIds.length) {
      const { data } = await supabase
        .from('services')
        .select('id, name, price')
        .in('id', serviceIds)

      services = (data as Service[]) || []
    }

    if (teamMemberIds.length) {
      const { data } = await supabase
        .from('team_members')
        .select('id, full_name')
        .in('id', teamMemberIds)

      teamMembers = (data as TeamMember[]) || []
    }

    setBookings(
      rawBookings.map((booking) => {
        const customer = customers.find((item) => item.id === booking.customer_id)
        const service = services.find((item) => item.id === booking.service_id)
        const teamMember = teamMembers.find((item) => item.id === booking.team_member_id)

        return {
          ...booking,
          customers: customer
            ? [{ first_name: customer.first_name, last_name: customer.last_name, email: customer.email }]
            : null,
          services: service ? [{ name: service.name, price: service.price }] : null,
          team_members: teamMember ? [{ full_name: teamMember.full_name }] : null,
        }
      })
    )

    setLoading(false)
  }

  async function awardLoyaltyVisitForCompletedBooking(booking: Booking) {
    if (!booking.customer_id) return

    const { data: loyaltyWallet, error: loyaltyError } = await supabase
      .from('customer_loyalty')
      .select('id, visits_required, visits_completed, reward_label, status')
      .eq('business_id', booking.business_id)
      .eq('customer_id', booking.customer_id)
      .in('status', ['active', 'earned'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (loyaltyError || !loyaltyWallet) return

    const nextVisits = Number(loyaltyWallet.visits_completed || 0) + 1
    const isNowEarned =
      Number(loyaltyWallet.visits_required || 0) > 0 &&
      nextVisits >= Number(loyaltyWallet.visits_required || 0)
    const wasAlreadyEarned = loyaltyWallet.status === 'earned'

    const { error: updateError } = await supabase
      .from('customer_loyalty')
      .update({ visits_completed: nextVisits, status: isNowEarned ? 'earned' : 'active' })
      .eq('id', loyaltyWallet.id)

    if (updateError) return

    if (isNowEarned && !wasAlreadyEarned) {
      try {
        await fetch('/api/messaging/send-loyalty-reward-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: booking.business_id,
            customerId: booking.customer_id,
            bookingId: booking.id,
            loyaltyId: loyaltyWallet.id,
            rewardLabel: loyaltyWallet.reward_label || 'your loyalty reward',
          }),
        })
      } catch (error) {
        console.error('Loyalty reward SMS failed:', error)
      }
    }
  }

  async function updateBookingStatus(id: string, status: string) {
    const booking = bookings.find((item) => item.id === id)
    if (!booking || !window.confirm(`Mark this booking as ${status}?`)) return

    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    await publishBookingEvent({
      type: status === 'completed' ? 'booking.completed' : 'booking.updated',
      booking,
      status,
    })

    if (status === 'completed' && booking.status !== 'completed') {
      await awardLoyaltyVisitForCompletedBooking(booking)
    }

    await loadBookings()
  }

  async function cancelBooking(id: string) {
    const booking = bookings.find((item) => item.id === id)
    if (!booking || !window.confirm('Are you sure you want to cancel this booking?')) return

    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    await publishBookingEvent({
      type: 'booking.cancelled',
      booking,
      status: 'cancelled',
    })

    try {
      await fetch('/api/process-waiting-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: booking.business_id,
          service_id: booking.service_id,
          team_member_id: booking.team_member_id,
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
        }),
      })
    } catch (error) {
      console.error('Waiting list processing failed', error)
    }

    await fetch('/api/send-booking-update-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: booking.business_id,
        customerId: booking.customer_id,
        bookingId: booking.id,
        customerName: getCustomerName(booking),
        customerEmail: booking.customers?.[0]?.email || '',
        bookingDate: formatBookingDate(booking.booking_date),
        bookingTime: booking.booking_time?.slice(0, 5),
        serviceName: booking.services?.[0]?.name || 'Your appointment',
        teamMemberName: booking.team_members?.[0]?.full_name || 'Your specialist',
        action: 'cancelled',
      }),
    })

    await loadBookings()
  }

  function openReschedule(booking: Booking) {
    setRescheduleBooking(booking)
    setNewDate(booking.booking_date)
    setNewTime('')
    setAvailability(null)
    setBookedTimes([])
    setMessage('')
  }

  function closeReschedule() {
    setRescheduleBooking(null)
    setNewDate('')
    setNewTime('')
    setAvailability(null)
    setBookedTimes([])
    setMessage('')
  }

  async function saveReschedule() {
    if (!rescheduleBooking || !newDate || !newTime) {
      setMessage('Please choose a new date and time.')
      return
    }

    if (bookedTimes.includes(newTime)) {
      setMessage('That slot is no longer available.')
      setNewTime('')
      return
    }

    const { error } = await supabase
      .from('bookings')
      .update({ booking_date: newDate, booking_time: newTime, status: 'confirmed' })
      .eq('id', rescheduleBooking.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await publishBookingEvent({
      type: 'booking.updated',
      booking: rescheduleBooking,
      bookingDate: newDate,
      bookingTime: newTime,
      status: 'confirmed',
    })

    await fetch('/api/send-booking-update-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: rescheduleBooking.business_id,
        customerId: rescheduleBooking.customer_id,
        bookingId: rescheduleBooking.id,
        customerName: getCustomerName(rescheduleBooking),
        customerEmail: rescheduleBooking.customers?.[0]?.email || '',
        bookingDate: formatBookingDate(newDate),
        bookingTime: newTime,
        serviceName: rescheduleBooking.services?.[0]?.name || 'Your appointment',
        teamMemberName: rescheduleBooking.team_members?.[0]?.full_name || 'Your specialist',
        action: 'rescheduled',
      }),
    })

    closeReschedule()
    await loadBookings()
  }

  useEffect(() => {
    loadBookings()
  }, [])

  useEffect(() => {
    async function loadAvailabilityAndBookedTimes() {
      if (!rescheduleBooking || !newDate || selectedDayOfWeek === null) {
        setAvailability(null)
        setBookedTimes([])
        return
      }

      const { data: currentBooking } = await supabase
        .from('bookings')
        .select('business_id')
        .eq('id', rescheduleBooking.id)
        .single()

      if (!currentBooking) return

      const { data: availabilityData } = await supabase
        .from('availability')
        .select('day_of_week,start_time,end_time,is_available')
        .eq('business_id', currentBooking.business_id)
        .eq('team_member_id', rescheduleBooking.team_member_id)
        .eq('day_of_week', selectedDayOfWeek)
        .maybeSingle()

      setAvailability((availabilityData as Availability | null) || null)

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('booking_time,id')
        .eq('business_id', currentBooking.business_id)
        .eq('team_member_id', rescheduleBooking.team_member_id)
        .eq('booking_date', newDate)
        .neq('id', rescheduleBooking.id)
        .neq('status', 'cancelled')

      setBookedTimes(
        ((bookingsData as { booking_time: string }[] | null) || []).map((booking) =>
          booking.booking_time.slice(0, 5)
        )
      )
    }

    loadAvailabilityAndBookedTimes()
  }, [rescheduleBooking, newDate, selectedDayOfWeek])

  const today = new Date().toISOString().split('T')[0]

  const upcomingBookings = bookings.filter(
    (booking) => booking.booking_date >= today && booking.status === 'confirmed'
  )
  const pastConfirmedBookings = bookings.filter(
    (booking) => booking.booking_date < today && booking.status === 'confirmed'
  )
  const completedBookings = bookings.filter((booking) => booking.status === 'completed')
  const noShowBookings = bookings.filter((booking) => booking.status === 'no_show')
  const cancelledBookings = bookings.filter((booking) => booking.status === 'cancelled')

  const filteredBookings = useMemo(() => {
    const base =
      activeFilter === 'upcoming'
        ? upcomingBookings
        : activeFilter === 'past'
          ? pastConfirmedBookings
          : activeFilter === 'completed'
            ? completedBookings
            : activeFilter === 'no_show'
              ? noShowBookings
              : activeFilter === 'cancelled'
                ? cancelledBookings
                : bookings

    const query = search.trim().toLowerCase()

    if (!query) return base

    return base.filter((booking) => {
      return [
        getCustomerName(booking),
        booking.customers?.[0]?.email || '',
        booking.services?.[0]?.name || '',
        booking.team_members?.[0]?.full_name || '',
        booking.status || '',
        booking.booking_date || '',
        booking.booking_time || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [
    activeFilter,
    bookings,
    cancelledBookings,
    completedBookings,
    noShowBookings,
    pastConfirmedBookings,
    search,
    upcomingBookings,
  ])

  if (loading) {
    return (
      <DashboardPage className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-[2rem] border border-white/10 bg-[#07111f] px-8 py-6 font-black text-slate-200 shadow-[0_50px_180px_rgba(0,0,0,.55)]">
          Loading bookings...
        </div>
      </DashboardPage>
    )
  }

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Bookings"
        title="Manage bookings."
        description="View upcoming appointments, reschedule customers, complete visits and manage cancellations."
      />

      {message && (
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-100">
          {message}
        </div>
      )}

      <DashboardGrid columns={4}>
        <StatCard
          label="Upcoming"
          value={upcomingBookings.length}
          icon={<CalendarDays size={22} />}
          colour="cyan"
        />
        <StatCard
          label="Past confirmed"
          value={pastConfirmedBookings.length}
          icon={<Clock size={22} />}
          colour="amber"
        />
        <StatCard
          label="Completed"
          value={completedBookings.length}
          icon={<CheckCircle2 size={22} />}
          colour="emerald"
        />
        <StatCard
          label="Cancelled"
          value={cancelledBookings.length}
          icon={<XCircle size={22} />}
          colour="rose"
        />
      </DashboardGrid>

      <SectionCard>
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search bookings..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950 py-4 pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300 lg:w-96"
              />
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {filters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${
                    activeFilter === filter.key
                      ? 'border-cyan-300/30 bg-cyan-400/15 text-cyan-100'
                      : 'border-white/10 bg-white/[0.04] text-slate-400'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
              <p className="text-lg font-black text-white">No bookings found.</p>
              <p className="mt-2 text-sm text-slate-500">
                Try another filter or search term.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredBookings.map((booking) => {
                const canAct = booking.status === 'confirmed'

                return (
                  <MobileBookingCard
                    key={booking.id}
                    booking={booking}
                    showActions={canAct}
                    onCancel={cancelBooking}
                    onReschedule={openReschedule}
                    onComplete={(id) => updateBookingStatus(id, 'completed')}
                    onNoShow={(id) => updateBookingStatus(id, 'no_show')}
                  />
                )
              })}
            </div>
          )}
        </div>
      </SectionCard>

      {rescheduleBooking && (
        <RescheduleModal
          booking={rescheduleBooking}
          dateOptions={dateOptions}
          newDate={newDate}
          newTime={newTime}
          availability={availability}
          availableTimeSlots={availableTimeSlots}
          message={message}
          setNewDate={setNewDate}
          setNewTime={setNewTime}
          clearMessage={() => setMessage('')}
          onSave={saveReschedule}
          onClose={closeReschedule}
        />
      )}
    </DashboardPage>
  )
}

function MobileBookingCard({
  booking,
  showActions,
  onCancel,
  onReschedule,
  onComplete,
  onNoShow,
}: {
  booking: Booking
  showActions: boolean
  onCancel: (id: string) => void
  onReschedule: (booking: Booking) => void
  onComplete: (id: string) => void
  onNoShow: (id: string) => void
}) {
  const customerName = getCustomerName(booking)
  const serviceName = booking.services?.[0]?.name || 'Appointment'
  const teamMemberName = booking.team_members?.[0]?.full_name || 'Unassigned'
  const price = booking.services?.[0]?.price
  const time = booking.booking_time?.slice(0, 5) || 'Time not set'

  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 shadow-[0_30px_100px_rgba(0,0,0,.35)]">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black tracking-[-0.03em] text-white">
              {customerName || 'Unknown customer'}
            </h3>
            <p className="mt-1 truncate text-sm font-bold text-cyan-200">
              {serviceName}
            </p>
          </div>

          <StatusBadge status={booking.status || 'confirmed'} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <InfoTile label="Date" value={formatBookingDate(booking.booking_date)} />
          <InfoTile label="Time" value={time} />
          <InfoTile label="Team" value={teamMemberName} />
          <InfoTile label="Price" value={price !== null && price !== undefined ? `£${price}` : '—'} />
        </div>
      </div>

      {showActions && (
        <div className="grid grid-cols-2 gap-2 border-t border-white/10 bg-white/[0.025] p-3 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => onComplete(booking.id)}
            className="rounded-2xl bg-emerald-400/10 px-3 py-3 text-xs font-black text-emerald-200 hover:bg-emerald-400/20"
          >
            Complete
          </button>

          <button
            type="button"
            onClick={() => onReschedule(booking)}
            className="rounded-2xl bg-cyan-400/10 px-3 py-3 text-xs font-black text-cyan-200 hover:bg-cyan-400/20"
          >
            Reschedule
          </button>

          <button
            type="button"
            onClick={() => onNoShow(booking.id)}
            className="rounded-2xl bg-amber-400/10 px-3 py-3 text-xs font-black text-amber-200 hover:bg-amber-400/20"
          >
            No show
          </button>

          <button
            type="button"
            onClick={() => onCancel(booking.id)}
            className="rounded-2xl bg-rose-400/10 px-3 py-3 text-xs font-black text-rose-200 hover:bg-rose-400/20"
          >
            Cancel
          </button>
        </div>
      )}
    </article>
  )
}

function InfoTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-black text-white">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colour =
    status === 'completed'
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
      : status === 'cancelled'
        ? 'border-rose-400/20 bg-rose-400/10 text-rose-200'
        : status === 'no_show'
          ? 'border-amber-400/20 bg-amber-400/10 text-amber-200'
          : 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200'

  return (
    <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${colour}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function getCustomerName(booking: Booking) {
  return `${booking.customers?.[0]?.first_name || ''} ${booking.customers?.[0]?.last_name || ''}`.trim()
}