'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Service = {
  id: string
  name: string
  price: number
  duration_minutes: number
}

type TeamMember = {
  id: string
  full_name: string
}

type Booking = {
  booking_time: string
}

type Availability = {
  day_of_week: number
  start_time: string | null
  end_time: string | null
  is_available: boolean
}

type Props = {
  businessId: string
  services: Service[]
  teamMembers: TeamMember[]
}

export default function BookingForm({
  businessId,
  services,
  teamMembers,
}: Props) {
  const [selectedService, setSelectedService] = useState('')
  const [selectedTeamMember, setSelectedTeamMember] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')

  const [bookedTimes, setBookedTimes] = useState<string[]>([])
  const [staffAvailability, setStaffAvailability] =
    useState<Availability | null>(null)
  const [isTimeOff, setIsTimeOff] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

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

  const selectedDayOfWeek = selectedDate
    ? new Date(selectedDate).getDay()
    : null

  const timeSlots = useMemo(() => {
    const slots: string[] = []

    if (isTimeOff) return slots
    if (!staffAvailability || !staffAvailability.is_available) return slots
    if (!staffAvailability.start_time || !staffAvailability.end_time) return slots

    const start = staffAvailability.start_time.slice(0, 5)
    const end = staffAvailability.end_time.slice(0, 5)

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
  }, [staffAvailability, isTimeOff])

  const availableTimeSlots = timeSlots.filter(
    (slot) => !bookedTimes.includes(slot)
  )

  const formattedDate = selectedDate
    ? new Date(selectedDate).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  useEffect(() => {
    async function loadBookedTimesAndAvailability() {
      if (!selectedTeamMember || !selectedDate || selectedDayOfWeek === null) {
        setBookedTimes([])
        setStaffAvailability(null)
        setIsTimeOff(false)
        return
      }

      const { data: availabilityData } = await supabase
        .from('availability')
        .select('day_of_week,start_time,end_time,is_available')
        .eq('business_id', businessId)
        .eq('team_member_id', selectedTeamMember)
        .eq('day_of_week', selectedDayOfWeek)
        .maybeSingle()

      setStaffAvailability((availabilityData as Availability | null) || null)

      const { data: timeOffData } = await supabase
        .from('team_time_off')
        .select('id')
        .eq('business_id', businessId)
        .eq('team_member_id', selectedTeamMember)
        .lte('start_date', selectedDate)
        .gte('end_date', selectedDate)
        .maybeSingle()

      setIsTimeOff(!!timeOffData)

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('booking_time')
        .eq('business_id', businessId)
        .eq('team_member_id', selectedTeamMember)
        .eq('booking_date', selectedDate)
        .neq('status', 'cancelled')

      const times =
        (bookingsData as Booking[] | null)?.map((booking) =>
          booking.booking_time.slice(0, 5)
        ) || []

      setBookedTimes(times)
    }

    loadBookedTimesAndAvailability()
  }, [businessId, selectedTeamMember, selectedDate, selectedDayOfWeek])

  async function createBooking() {
    setMessage('')

    if (
      !selectedService ||
      !selectedTeamMember ||
      !selectedDate ||
      !selectedTime ||
      !firstName ||
      !email
    ) {
      setMessage('Please complete all required fields.')
      return
    }

    if (isTimeOff) {
      setMessage('This team member is unavailable on this date.')
      setSelectedTime('')
      return
    }

    if (bookedTimes.includes(selectedTime)) {
      setMessage(
        'Sorry, that time has just been booked. Please choose another slot.'
      )
      setSelectedTime('')
      return
    }

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('email', email)
      .maybeSingle()

    let customerId = existingCustomer?.id

    if (!customerId) {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          business_id: businessId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
        })
        .select()
        .single()

      if (customerError) {
        setMessage(customerError.message)
        return
      }

      customerId = newCustomer.id
    }

    const { error: bookingError } = await supabase.from('bookings').insert({
      business_id: businessId,
      customer_id: customerId,
      service_id: selectedService,
      team_member_id: selectedTeamMember,
      booking_date: selectedDate,
      booking_time: selectedTime,
      status: 'confirmed',
    })

    if (bookingError) {
      setMessage(bookingError.message)
      return
    }

    await fetch('/api/send-booking-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerName: `${firstName} ${lastName}`,
        customerEmail: email,
        bookingDate: formattedDate,
        bookingTime: selectedTime,
        serviceName:
          services.find((service) => service.id === selectedService)?.name || '',
        teamMemberName:
          teamMembers.find((member) => member.id === selectedTeamMember)
            ?.full_name || '',
      }),
    })

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <h2 className="text-3xl font-bold mb-4">Booking confirmed</h2>

        <p className="text-slate-400 mb-4">
          Your appointment has been booked successfully.
        </p>

        <p className="font-bold">
          {formattedDate} at {selectedTime}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
      <h2 className="text-3xl font-bold mb-6">Make a booking</h2>

      <div className="space-y-5">
        <select
          value={selectedService}
          onChange={(e) => setSelectedService(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
        >
          <option value="">Select service</option>

          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} (£{service.price})
            </option>
          ))}
        </select>

        <select
          value={selectedTeamMember}
          onChange={(e) => {
            setSelectedTeamMember(e.target.value)
            setSelectedTime('')
            setMessage('')
          }}
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
        >
          <option value="">Select team member</option>

          {teamMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.full_name}
            </option>
          ))}
        </select>

        <div>
          <p className="text-slate-400 mb-3">Choose a date</p>

          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            {dateOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelectedDate(option.value)
                  setSelectedTime('')
                  setMessage('')
                }}
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
        </div>

        {selectedDate && selectedTeamMember && (
          <div>
            <p className="text-slate-400 mb-3">
              Available times for {formattedDate}
            </p>

            {isTimeOff && (
              <p className="text-slate-500">
                This team member is marked as unavailable on this date.
              </p>
            )}

            {!isTimeOff && staffAvailability === null && (
              <p className="text-slate-500">
                No availability has been set for this day.
              </p>
            )}

            {!isTimeOff && staffAvailability && !staffAvailability.is_available && (
              <p className="text-slate-500">
                This team member is not available on this day.
              </p>
            )}

            {!isTimeOff && staffAvailability && staffAvailability.is_available && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {availableTimeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        setSelectedTime(slot)
                        setMessage('')
                      }}
                      className={`p-3 rounded-lg border ${
                        selectedTime === slot
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

        {selectedService &&
          selectedTeamMember &&
          selectedDate &&
          selectedTime && (
            <div className="border border-slate-800 rounded-xl p-4">
              <p className="text-slate-400 mb-1">Selected appointment</p>
              <p className="font-bold">
                {formattedDate} at {selectedTime}
              </p>
            </div>
          )}

        <div className="grid md:grid-cols-2 gap-4">
          <input
            className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
            placeholder="First name *"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <input
            className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <input
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
          placeholder="Email address *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <button
          type="button"
          onClick={createBooking}
          className="w-full bg-white text-slate-950 font-bold p-4 rounded-xl"
        >
          Book appointment
        </button>

        {message && <p className="text-slate-300">{message}</p>}
      </div>
    </div>
  )
}