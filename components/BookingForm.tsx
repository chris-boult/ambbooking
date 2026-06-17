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
  primaryColour?: string
  secondaryColour?: string
  cardClassName?: string
  innerCardClassName?: string
  textClassName?: string
  mutedClassName?: string
}

function toDateValue(date: Date) {
  return date.toISOString().split('T')[0]
}

function formatDisplayDate(dateValue: string) {
  if (!dateValue) return ''

  return new Date(dateValue).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function BookingForm({
  businessId,
  services,
  teamMembers,
  primaryColour = '#7c3aed',
  secondaryColour = '#2563eb',
  cardClassName = 'border-white/10 bg-white/[0.05]',
  innerCardClassName = 'border-white/10 bg-black/20',
  textClassName = 'text-slate-300',
  mutedClassName = 'text-slate-500',
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

  const [voucherCode, setVoucherCode] = useState('')
  const [voucherMessage, setVoucherMessage] = useState('')
  const [voucherAmountUsed, setVoucherAmountUsed] = useState(0)
  const [remainingVoucherBalance, setRemainingVoucherBalance] = useState<number | null>(null)

  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const selectedServiceDetails = services.find(
    (service) => service.id === selectedService
  )

  const dateOptions = useMemo(() => {
    const dates = []

    for (let i = 0; i < 14; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)

      dates.push({
        value: toDateValue(date),
        day: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        date: date.toLocaleDateString('en-GB', { day: 'numeric' }),
        month: date.toLocaleDateString('en-GB', { month: 'short' }),
      })
    }

    return dates
  }, [])

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

  const formattedDate = formatDisplayDate(selectedDate)

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
        .neq('status', 'cancelled')

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
    setVoucherMessage('')
    setVoucherAmountUsed(0)
    setRemainingVoucherBalance(null)

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

    setLoading(true)

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
        setLoading(false)
        return
      }

      customerId = newCustomer.id
    }

    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        service_id: selectedService,
        team_member_id: selectedTeamMember,
        booking_date: selectedDate,
        booking_time: selectedTime,
        status: 'confirmed',
      })
      .select('id')
      .single()

    if (bookingError) {
      setMessage(bookingError.message)
      setLoading(false)
      return
    }

    if (voucherCode.trim()) {
      const response = await fetch('/api/redeem-voucher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: voucherCode,
          booking_id: bookingData.id,
          business_id: businessId,
          amount_due: selectedServiceDetails?.price || 0,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setVoucherMessage(result.error || 'Voucher could not be applied.')
      } else {
        setVoucherAmountUsed(Number(result.amount_used || 0))
        setRemainingVoucherBalance(Number(result.new_remaining_amount || 0))
        setVoucherMessage(
          `Voucher applied. £${Number(result.amount_used || 0).toFixed(2)} used.`
        )
      }
    }

    setLoading(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className={`rounded-[28px] border backdrop-blur-2xl p-8 ${cardClassName}`}>
        <div
          className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white"
          style={{
            background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})`,
          }}
        >
          ✓
        </div>

        <h2 className="text-3xl font-black mb-4">Booking confirmed</h2>

        <p className={`${textClassName} mb-4`}>
          Your appointment has been booked successfully.
        </p>

        <div className={`rounded-2xl border p-5 ${innerCardClassName}`}>
          <p className={`text-sm font-bold uppercase tracking-[0.2em] mb-2 ${mutedClassName}`}>
            Appointment
          </p>

          <p className="text-xl font-black">
            {formattedDate} at {selectedTime}
          </p>

          {voucherMessage && (
            <p className={`${textClassName} mt-4`}>
              {voucherMessage}
            </p>
          )}

          {voucherAmountUsed > 0 && (
            <p className={`${textClassName} mt-2`}>
              Voucher used: £{voucherAmountUsed.toFixed(2)}
              {remainingVoucherBalance !== null &&
                ` • Remaining balance: £${remainingVoucherBalance.toFixed(2)}`}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-[28px] border backdrop-blur-2xl p-6 md:p-8 ${cardClassName}`}>
      <div className="mb-8">
        <p className={`text-sm font-bold uppercase tracking-[0.2em] mb-2 ${mutedClassName}`}>
          Final step
        </p>

        <h2 className="text-3xl md:text-4xl font-black">Make a booking</h2>

        <p className={`${textClassName} mt-3`}>
          Choose your service, specialist, date and time.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className={`w-full p-4 rounded-2xl border outline-none ${innerCardClassName}`}
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
            className={`w-full p-4 rounded-2xl border outline-none ${innerCardClassName}`}
          >
            <option value="">Select team member</option>

            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block text-sm font-bold mb-3 ${textClassName}`}>
            Choose a date
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {dateOptions.map((date) => {
              const selected = selectedDate === date.value

              return (
                <button
                  key={date.value}
                  type="button"
                  onClick={() => {
                    setSelectedDate(date.value)
                    setSelectedTime('')
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? 'border-transparent text-white shadow-lg'
                      : `${innerCardClassName} hover:opacity-80`
                  }`}
                  style={
                    selected
                      ? {
                          background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})`,
                        }
                      : undefined
                  }
                >
                  <div className="text-xs font-bold uppercase opacity-70">
                    {date.day}
                  </div>

                  <div className="text-2xl font-black leading-tight">
                    {date.date}
                  </div>

                  <div className="text-xs font-semibold opacity-70">
                    {date.month}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {selectedDate && selectedTeamMember && (
          <div>
            <p className={`text-sm font-bold mb-3 ${textClassName}`}>
              Available times for {formattedDate}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availableTimeSlots.map((slot) => {
                const selected = selectedTime === slot

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`p-4 rounded-2xl border font-bold transition ${
                      selected
                        ? 'border-transparent text-white'
                        : `${innerCardClassName} hover:opacity-80`
                    }`}
                    style={
                      selected
                        ? {
                            background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})`,
                          }
                        : undefined
                    }
                  >
                    {slot}
                  </button>
                )
              })}
            </div>

            {availableTimeSlots.length === 0 && (
              <p className={`${mutedClassName} mt-3`}>
                No available slots for this date.
              </p>
            )}
          </div>
        )}

        {selectedService &&
          selectedTeamMember &&
          selectedDate &&
          selectedTime && (
            <div
              className="rounded-2xl p-5 text-white"
              style={{
                background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})`,
              }}
            >
              <p className="text-white/70 text-sm font-bold uppercase tracking-[0.2em] mb-1">
                Selected appointment
              </p>

              <p className="text-xl font-black">
                {formattedDate} at {selectedTime}
              </p>

              {selectedServiceDetails && (
                <p className="text-white/80 mt-2">
                  Price: £{Number(selectedServiceDetails.price).toFixed(2)}
                </p>
              )}
            </div>
          )}

        <div className="grid md:grid-cols-2 gap-4">
          <input
            className={`w-full p-4 rounded-2xl border outline-none ${innerCardClassName}`}
            placeholder="First name *"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <input
            className={`w-full p-4 rounded-2xl border outline-none ${innerCardClassName}`}
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <input
          className={`w-full p-4 rounded-2xl border outline-none ${innerCardClassName}`}
          placeholder="Email address *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className={`w-full p-4 rounded-2xl border outline-none ${innerCardClassName}`}
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          className={`w-full p-4 rounded-2xl border outline-none ${innerCardClassName}`}
          placeholder="Gift voucher code optional"
          value={voucherCode}
          onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
        />

        <button
          type="button"
          onClick={createBooking}
          disabled={loading}
          className="w-full p-5 rounded-2xl text-white font-black disabled:opacity-60"
          style={{
            background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})`,
          }}
        >
          {loading ? 'Booking...' : 'Book appointment'}
        </button>

        {message && (
          <p className={`rounded-2xl border p-4 ${innerCardClassName}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}