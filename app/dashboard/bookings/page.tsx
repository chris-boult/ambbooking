'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Booking = {
  id: string
  booking_date: string
  booking_time: string
  status: string
  team_member_id: string
  customers: {
    first_name: string
    last_name: string
    email: string
  } | null
  services: {
    name: string
    price: number
  } | null
  team_members: {
    full_name: string
  } | null
}

type Availability = {
  day_of_week: number
  start_time: string | null
  end_time: string | null
  is_available: boolean
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [bookedTimes, setBookedTimes] = useState<string[]>([])
  const [message, setMessage] = useState('')

  const dateOptions = useMemo(() => {
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() + index)

      const value = date.toISOString().split('T')[0]

      return {
        value,
        day: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        date: date.toLocaleDateString('en-GB', { day: 'numeric' }),
        month: date.toLocaleDateString('en-GB', { month: 'short' }),
      }
    })
  }, [])

  const selectedDayOfWeek = newDate ? new Date(newDate).getDay() : null

  const timeSlots = useMemo(() => {
    const slots: string[] = []

    if (!availability || !availability.is_available) return slots
    if (!availability.start_time || !availability.end_time) return slots

    const start = availability.start_time.slice(0, 5)
    const end = availability.end_time.slice(0, 5)

    let [hour, minute] = start.split(':').map(Number)
    const [endHour, endMinute] = end.split(':').map(Number)

    while (hour < endHour || (hour === endHour && minute < endMinute)) {
      slots.push(
        `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      )

      minute += 30

      if (minute >= 60) {
        minute = 0
        hour += 1
      }
    }

    return slots
  }, [availability])

  const availableTimeSlots = timeSlots.filter(
    (slot) => !bookedTimes.includes(slot)
  )

  async function loadBookings() {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        booking_time,
        status,
        team_member_id,
        customers (
          first_name,
          last_name,
          email
        ),
        services (
          name,
          price
        ),
        team_members (
          full_name
        )
      `)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true })

    if (!error && data) {
      setBookings(data as unknown as Booking[])
    }

    setLoading(false)
  }

  async function cancelBooking(id: string) {
    const booking = bookings.find((item) => item.id === id)

    if (!booking) return

    const confirmed = window.confirm(
      'Are you sure you want to cancel this booking?'
    )

    if (!confirmed) return

    await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)

    await fetch('/api/send-booking-update-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerName: `${booking.customers?.first_name || ''} ${
          booking.customers?.last_name || ''
        }`,
        customerEmail: booking.customers?.email || '',
        bookingDate: new Date(booking.booking_date).toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        bookingTime: booking.booking_time?.slice(0, 5),
        action: 'cancelled',
      }),
    })

    loadBookings()
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
      .update({
        booking_date: newDate,
        booking_time: newTime,
      })
      .eq('id', rescheduleBooking.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await fetch('/api/send-booking-update-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerName: `${rescheduleBooking.customers?.first_name || ''} ${
          rescheduleBooking.customers?.last_name || ''
        }`,
        customerEmail: rescheduleBooking.customers?.email || '',
        bookingDate: new Date(newDate).toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        bookingTime: newTime,
        action: 'rescheduled',
      }),
    })

    closeReschedule()
    loadBookings()
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

      const times =
        (bookingsData as { booking_time: string }[] | null)?.map((booking) =>
          booking.booking_time.slice(0, 5)
        ) || []

      setBookedTimes(times)
    }

    loadAvailabilityAndBookedTimes()
  }, [rescheduleBooking, newDate, selectedDayOfWeek])

  const today = new Date().toISOString().split('T')[0]

  const upcomingBookings = bookings.filter(
    (booking) =>
      booking.booking_date >= today &&
      booking.status !== 'cancelled'
  )

  const cancelledBookings = bookings.filter(
    (booking) => booking.status === 'cancelled'
  )

  const pastBookings = bookings.filter(
    (booking) =>
      booking.booking_date < today &&
      booking.status !== 'cancelled'
  )

  if (loading) {
    return <div className="p-8 text-white">Loading bookings...</div>
  }

  return (
    <div className="p-8 text-white">
      <h1 className="text-4xl font-bold mb-8">Bookings</h1>

      <BookingSection
        title="Upcoming Bookings"
        bookings={upcomingBookings}
        showActions
        onCancel={cancelBooking}
        onReschedule={openReschedule}
      />

      <BookingSection title="Past Bookings" bookings={pastBookings} />

      <BookingSection
        title="Cancelled Bookings"
        bookings={cancelledBookings}
      />

      {rescheduleBooking && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-2">Reschedule booking</h2>

            <p className="text-slate-400 mb-6">
              Choose a new available slot for{' '}
              {rescheduleBooking.customers?.first_name}{' '}
              {rescheduleBooking.customers?.last_name}.
            </p>

            <div className="mb-6">
              <p className="text-slate-400 mb-3">Choose a new date</p>

              <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                {dateOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setNewDate(option.value)
                      setNewTime('')
                      setMessage('')
                    }}
                    className={`rounded-xl border p-4 text-center ${
                      newDate === option.value
                        ? 'bg-white text-slate-950 border-white'
                        : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  >
                    <span className="block text-sm">{option.day}</span>
                    <span className="block text-2xl font-bold">
                      {option.date}
                    </span>
                    <span className="block text-sm">{option.month}</span>
                  </button>
                ))}
              </div>
            </div>

            {newDate && (
              <div className="mb-6">
                <p className="text-slate-400 mb-3">Choose a new time</p>

                {availability === null && (
                  <p className="text-slate-500">
                    No availability has been set for this day.
                  </p>
                )}

                {availability && !availability.is_available && (
                  <p className="text-slate-500">
                    This team member is not available on this day.
                  </p>
                )}

                {availability && availability.is_available && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {availableTimeSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => {
                            setNewTime(slot)
                            setMessage('')
                          }}
                          className={`p-3 rounded-lg border ${
                            newTime === slot
                              ? 'bg-white text-slate-950 border-white'
                              : 'bg-slate-800 border-slate-700 text-white'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>

                    {availableTimeSlots.length === 0 && (
                      <p className="text-slate-500 mt-3">
                        No available slots for this date.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {message && (
              <p className="text-slate-300 mb-4">{message}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={saveReschedule}
                className="flex-1 bg-white text-slate-950 font-bold p-3 rounded-lg"
              >
                Save changes
              </button>

              <button
                onClick={closeReschedule}
                className="flex-1 bg-slate-700 hover:bg-slate-600 font-bold p-3 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BookingSection({
  title,
  bookings,
  showActions = false,
  onCancel,
  onReschedule,
}: {
  title: string
  bookings: Booking[]
  showActions?: boolean
  onCancel?: (id: string) => void
  onReschedule?: (booking: Booking) => void
}) {
  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>

      {bookings.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400">
          No bookings found.
        </div>
      )}

      <div className="space-y-4">
        {bookings.map((booking) => {
          const formattedDate = new Date(
            booking.booking_date
          ).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })

          const formattedTime = booking.booking_time?.slice(0, 5)

          return (
            <div
              key={booking.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-xl font-bold">
                    {booking.customers?.first_name}{' '}
                    {booking.customers?.last_name}
                  </h3>

                  <p className="text-slate-400">
                    {booking.customers?.email}
                  </p>

                  <div className="mt-4 grid gap-2 text-sm text-slate-300">
                    <p>
                      <span className="text-slate-500">Service:</span>{' '}
                      {booking.services?.name || 'Unknown'}
                    </p>

                    <p>
                      <span className="text-slate-500">Value:</span>{' '}
                      £{booking.services?.price || 0}
                    </p>

                    <p>
                      <span className="text-slate-500">Team member:</span>{' '}
                      {booking.team_members?.full_name || 'Unknown'}
                    </p>

                    <p>
                      <span className="text-slate-500">Date:</span>{' '}
                      {formattedDate}
                    </p>

                    <p>
                      <span className="text-slate-500">Time:</span>{' '}
                      {formattedTime}
                    </p>

                    <p>
                      <span className="text-slate-500">Status:</span>{' '}
                      <span
                        className={
                          booking.status === 'cancelled'
                            ? 'text-red-400'
                            : 'text-emerald-400'
                        }
                      >
                        {booking.status}
                      </span>
                    </p>
                  </div>
                </div>

                {showActions &&
                  booking.status !== 'cancelled' &&
                  onCancel &&
                  onReschedule && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onReschedule(booking)}
                        className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold"
                      >
                        Reschedule
                      </button>

                      <button
                        onClick={() => onCancel(booking.id)}
                        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}