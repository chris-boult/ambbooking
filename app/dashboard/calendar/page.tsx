'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Booking = {
  id: string
  booking_date: string
  booking_time: string
  status: string
  customers:
  | {
      first_name: string
      last_name: string | null
    }[]
  | null
  services: {
    name: string
    price: number
  } | null
  team_members: {
    full_name: string
  } | null
}

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  useEffect(() => {
    loadBookings()
  }, [])

  async function loadBookings() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()

    if (!business) return

    const { data } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        booking_time,
        status,
        customers(first_name,last_name),
        services(name,price),
        team_members(full_name)
      `)
      .eq('business_id', business.id)
      .neq('status', 'cancelled')
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true })

    setBookings((data as Booking[]) || [])
  }

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

  const selectedBookings = bookings.filter(
    (booking) => booking.booking_date === selectedDate
  )

  const upcomingBookings = bookings.filter(
    (booking) => booking.booking_date >= new Date().toISOString().split('T')[0]
  )

  const revenueForSelectedDay = selectedBookings.reduce((total, booking) => {
    return total + Number(booking.services?.price || 0)
  }, 0)

  const formattedSelectedDate = new Date(selectedDate).toLocaleDateString(
    'en-GB',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  )

  return (
    <div>
      <div className="mb-10">
        <p className="text-slate-400 mb-2">Calendar</p>
        <h1 className="text-4xl font-bold mb-2">Your schedule</h1>
        <p className="text-slate-500">
          View bookings by day and manage upcoming appointments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard label="Bookings selected day" value={selectedBookings.length} />
        <StatCard label="Upcoming bookings" value={upcomingBookings.length} />
        <StatCard label="Revenue selected day" value={`£${revenueForSelectedDay}`} />
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Choose a day</h2>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {dateOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedDate(option.value)}
              className={`rounded-xl border p-4 text-center ${
                selectedDate === option.value
                  ? 'bg-white text-slate-950 border-white'
                  : 'bg-slate-800 border-slate-700 text-white'
              }`}
            >
              <span className="block text-sm">{option.day}</span>
              <span className="block text-2xl font-bold">{option.date}</span>
              <span className="block text-sm">{option.month}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{formattedSelectedDate}</h2>
            <p className="text-slate-400">
              {selectedBookings.length} booking
              {selectedBookings.length === 1 ? '' : 's'} scheduled
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {selectedBookings.map((booking) => (
            <div
              key={booking.id}
              className="border border-slate-800 rounded-xl p-5 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-slate-400 text-sm mb-1">
                  {booking.booking_time?.slice(0, 5)}
                </p>

                <h3 className="text-xl font-bold">
                  {booking.customers?.[0]?.first_name}{' '}
                  {booking.customers?.[0]?.last_name}
                </h3>

                <p className="text-slate-400">
                  {booking.services?.name} with{' '}
                  {booking.team_members?.full_name}
                </p>
              </div>

              <div className="text-right">
                <p className="font-bold">
                  £{booking.services?.price || 0}
                </p>

                <p className="text-sm text-emerald-400">
                  {booking.status}
                </p>
              </div>
            </div>
          ))}

          {selectedBookings.length === 0 && (
            <div className="border border-slate-800 rounded-xl p-6 text-slate-500">
              No bookings scheduled for this day.
            </div>
          )}
        </div>
      </section>
    </div>
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <p className="text-slate-400 mb-2">{label}</p>
      <h2 className="text-3xl font-bold">{value}</h2>
    </div>
  )
}