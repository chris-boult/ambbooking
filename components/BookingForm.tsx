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

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const timeSlots = useMemo(() => {
    const slots = []

    for (let hour = 9; hour < 17; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`)
      slots.push(`${String(hour).padStart(2, '0')}:30`)
    }

    return slots
  }, [])

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
    async function loadBookedTimes() {
      if (!selectedTeamMember || !selectedDate) {
        setBookedTimes([])
        return
      }

      const { data } = await supabase
        .from('bookings')
        .select('booking_time')
        .eq('business_id', businessId)
        .eq('team_member_id', selectedTeamMember)
        .eq('booking_date', selectedDate)

      const times =
        (data as Booking[] | null)?.map((booking) =>
          booking.booking_time.slice(0, 5)
        ) || []

      setBookedTimes(times)
    }

    loadBookedTimes()
  }, [businessId, selectedTeamMember, selectedDate])

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

    if (bookedTimes.includes(selectedTime)) {
      setMessage('Sorry, that time has just been booked. Please choose another slot.')
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

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value)
            setSelectedTime('')
          }}
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
        />

        {selectedDate && selectedTeamMember && (
          <div>
            <p className="text-slate-400 mb-3">
              Available times for {formattedDate}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availableTimeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedTime(slot)}
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