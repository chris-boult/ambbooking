'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Service = {
  id: string
  name: string
  price: number
  duration_minutes: number
  category?: string | null
  service_type?: string | null
  is_add_on?: boolean | null
  parent_service_id?: string | null
  recommended_service_ids?: string[] | null
  bundle_price?: number | null
}

type TeamMember = {
  id: string
  full_name: string
}

type Booking = {
  booking_time: string
  total_duration_minutes: number | null
}

type BookedTime = {
  time: string
  duration: number
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

type AppliedVoucher = {
  id: string
  code: string
  remainingAmount: number
  discountAmount: number
  status: string
  expiryDate: string | null
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

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
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
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedTeamMember, setSelectedTeamMember] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [bookedTimes, setBookedTimes] = useState<BookedTime[]>([])

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [voucherCode, setVoucherCode] = useState('')
  const [voucherMessage, setVoucherMessage] = useState('')
  const [voucherAmountUsed, setVoucherAmountUsed] = useState(0)
  const [remainingVoucherBalance, setRemainingVoucherBalance] = useState<number | null>(null)
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null)
  const [voucherValidating, setVoucherValidating] = useState(false)

  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const selectedServiceDetails = services.filter((service) => selectedServices.includes(service.id))

  const displayServices = useMemo(() => {
    return services.filter((service) => !service.is_add_on || selectedServices.includes(service.id))
  }, [services, selectedServices])

  const servicesByCategory = useMemo(() => {
    return displayServices.reduce<Record<string, Service[]>>((acc, service) => {
      const category = service.category || (service.is_add_on ? 'Add-ons' : service.service_type === 'bundle' ? 'Bundles' : 'Services')
      if (!acc[category]) acc[category] = []
      acc[category].push(service)
      return acc
    }, {})
  }, [displayServices])

  const recommendedServices = useMemo(() => {
    const recommendedIds = new Set<string>()

    selectedServiceDetails.forEach((service) => {
      ;(service.recommended_service_ids || []).forEach((id) => recommendedIds.add(id))
    })

    return services.filter((service) => recommendedIds.has(service.id) && !selectedServices.includes(service.id))
  }, [services, selectedServiceDetails, selectedServices])

  const totalPrice = selectedServiceDetails.reduce((sum, service) => sum + Number(service.bundle_price || service.price || 0), 0)
  const totalDuration = selectedServiceDetails.reduce((sum, service) => sum + Number(service.duration_minutes || 0), 0)
  const voucherDiscount = appliedVoucher?.discountAmount || 0
  const amountDueAfterVoucher = Math.max(totalPrice - voucherDiscount, 0)

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

  const availableTimeSlots = timeSlots.filter((slot) => {
    if (totalDuration <= 0) return false

    const candidateStart = timeToMinutes(slot)
    const candidateEnd = candidateStart + totalDuration
    const businessClose = 17 * 60

    if (candidateEnd > businessClose) return false

    return !bookedTimes.some((booked) => {
      const bookedStart = timeToMinutes(booked.time)
      const bookedEnd = bookedStart + booked.duration
      return candidateStart < bookedEnd && candidateEnd > bookedStart
    })
  })

  const formattedDate = formatDisplayDate(selectedDate)

  useEffect(() => {
    setAppliedVoucher(null)
    setVoucherMessage('')
    setVoucherAmountUsed(0)
    setRemainingVoucherBalance(null)
  }, [selectedServices, voucherCode])

  useEffect(() => {
    async function loadBookedTimes() {
      if (!selectedTeamMember || !selectedDate) {
        setBookedTimes([])
        return
      }

      const { data } = await supabase
        .from('bookings')
        .select('booking_time, total_duration_minutes')
        .eq('business_id', businessId)
        .eq('team_member_id', selectedTeamMember)
        .eq('booking_date', selectedDate)
        .neq('status', 'cancelled')

      const times =
        (data as Booking[] | null)?.map((booking) => ({
          time: booking.booking_time.slice(0, 5),
          duration: Number(booking.total_duration_minutes || 30),
        })) || []

      setBookedTimes(times)
    }

    loadBookedTimes()
  }, [businessId, selectedTeamMember, selectedDate])

  function toggleService(serviceId: string) {
    setSelectedTime('')
    setSelectedServices((current) =>
      current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId]
    )
  }

  async function validateVoucher() {
    setVoucherMessage('')
    setAppliedVoucher(null)

    if (selectedServiceDetails.length === 0) {
      setVoucherMessage('Please choose at least one service before applying a voucher.')
      return
    }

    if (!voucherCode.trim()) {
      setVoucherMessage('Enter a gift voucher code.')
      return
    }

    setVoucherValidating(true)

    try {
      const response = await fetch('/api/validate-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucherCode, businessId, bookingTotal: totalPrice }),
      })

      const result = await response.json()

      if (!response.ok || !result.valid) {
        setVoucherMessage(result.error || 'Voucher could not be validated.')
        setVoucherValidating(false)
        return
      }

      setAppliedVoucher(result.voucher)
      setVoucherMessage('Voucher applied successfully.')
    } catch (error: any) {
      setVoucherMessage(error.message || 'Voucher could not be validated.')
    }

    setVoucherValidating(false)
  }

  async function createBooking() {
    setMessage('')

    if (selectedServices.length === 0 || !selectedTeamMember || !selectedDate || !selectedTime || !firstName || !email) {
      setMessage('Please complete all required fields.')
      return
    }

    if (!availableTimeSlots.includes(selectedTime)) {
      setMessage('Sorry, that time is no longer available for the selected services.')
      setSelectedTime('')
      return
    }

    setLoading(true)

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .ilike('email', email.trim())
      .maybeSingle()

    let customerId = existingCustomer?.id

    if (!customerId) {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({ business_id: businessId, first_name: firstName, last_name: lastName, email, phone })
        .select()
        .single()

      if (customerError) {
        setMessage(customerError.message)
        setLoading(false)
        return
      }

      customerId = newCustomer.id
    }

    const firstService = selectedServiceDetails[0]

    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        service_id: firstService?.id || null,
        team_member_id: selectedTeamMember,
        booking_date: selectedDate,
        booking_time: selectedTime,
        status: 'confirmed',
        total_price: totalPrice,
        total_duration_minutes: totalDuration,
      })
      .select('id')
      .single()

    if (bookingError) {
      setMessage(bookingError.message)
      setLoading(false)
      return
    }

    const bookingServicesRows = selectedServiceDetails.map((service) => ({
      booking_id: bookingData.id,
      service_id: service.id,
      service_name: service.name,
      price: Number(service.bundle_price || service.price || 0),
      duration_minutes: service.duration_minutes,
    }))

    const { error: bookingServicesError } = await supabase.from('booking_services').insert(bookingServicesRows)

    if (bookingServicesError) {
      setMessage(bookingServicesError.message)
      setLoading(false)
      return
    }

    if (appliedVoucher) {
      const response = await fetch('/api/redeem-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: appliedVoucher.code, booking_id: bookingData.id, business_id: businessId, amount_due: totalPrice }),
      })

      const result = await response.json()

      if (!response.ok) {
        setVoucherMessage(result.error || 'Voucher could not be applied.')
      } else {
        setVoucherAmountUsed(Number(result.amount_used || 0))
        setRemainingVoucherBalance(Number(result.new_remaining_amount || 0))
        setVoucherMessage(`Voucher applied. £${Number(result.amount_used || 0).toFixed(2)} used.`)
      }
    }

    const checkoutResponse = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: bookingData.id }),
    })

    const checkoutResult = await checkoutResponse.json()

    if (!checkoutResponse.ok) {
      setMessage(checkoutResult.error || 'Could not start checkout.')
      setLoading(false)
      return
    }

    if (checkoutResult.requiresPayment && checkoutResult.checkoutUrl) {
      window.location.href = checkoutResult.checkoutUrl
      return
    }

    setLoading(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className={`rounded-[28px] border p-8 backdrop-blur-2xl ${cardClassName}`}>
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white" style={{ background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})` }}>✓</div>
        <h2 className="mb-4 text-3xl font-black">Booking confirmed</h2>
        <p className={`${textClassName} mb-4`}>Your appointment has been booked successfully.</p>
        <div className={`rounded-2xl border p-5 ${innerCardClassName}`}>
          <p className={`mb-2 text-sm font-bold uppercase tracking-[0.2em] ${mutedClassName}`}>Appointment</p>
          <p className="text-xl font-black">{formattedDate} at {selectedTime}</p>
          <div className="mt-4 space-y-2">
            {selectedServiceDetails.map((service) => (
              <div key={service.id} className={`${textClassName} flex justify-between gap-4`}>
                <span>{service.name}</span>
                <span>£{Number(service.bundle_price || service.price).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className={`mt-5 border-t pt-5 ${textClassName}`}>
            <p>Total duration: {totalDuration} mins</p>
            <p>Total price: £{totalPrice.toFixed(2)}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-[28px] border p-6 backdrop-blur-2xl md:p-8 ${cardClassName}`}>
      <div className="mb-8">
        <p className={`mb-2 text-sm font-bold uppercase tracking-[0.2em] ${mutedClassName}`}>Final step</p>
        <h2 className="text-3xl font-black md:text-4xl">Make a booking</h2>
        <p className={`${textClassName} mt-3`}>Choose a service, add any recommended extras, then select your specialist, date and time.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className={`mb-3 block text-sm font-bold ${textClassName}`}>Choose services</label>
          <div className="space-y-5">
            {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
              <div key={category}>
                <p className={`mb-3 text-xs font-black uppercase tracking-[0.2em] ${mutedClassName}`}>{category}</p>
                <div className="space-y-3">
                  {categoryServices.map((service) => {
                    const selected = selectedServices.includes(service.id)
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleService(service.id)}
                        className={`w-full rounded-2xl border p-5 text-left transition ${selected ? 'border-transparent text-white' : `${innerCardClassName} hover:opacity-80`}`}
                        style={selected ? { background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})` } : undefined}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-black">{service.name}</p>
                              {service.is_add_on && <span className="rounded-full bg-white/15 px-2 py-1 text-xs font-bold">Add-on</span>}
                              {service.service_type === 'bundle' && <span className="rounded-full bg-white/15 px-2 py-1 text-xs font-bold">Bundle</span>}
                            </div>
                            <p className="mt-1 text-sm opacity-75">{service.duration_minutes} mins</p>
                          </div>
                          <p className="font-black">£{Number(service.bundle_price || service.price).toFixed(2)}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {recommendedServices.length > 0 && (
          <div className={`rounded-2xl border p-5 ${innerCardClassName}`}>
            <p className={`mb-2 text-sm font-bold uppercase tracking-[0.2em] ${mutedClassName}`}>Popular add-ons</p>
            <p className={`${textClassName} mb-4`}>Customers often add these to your selected service.</p>
            <div className="space-y-3">
              {recommendedServices.map((service) => (
                <button key={service.id} type="button" onClick={() => toggleService(service.id)} className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black">Add {service.name}</p>
                      <p className="mt-1 text-sm opacity-70">+{service.duration_minutes} mins</p>
                    </div>
                    <p className="font-black">+£{Number(service.price || 0).toFixed(2)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedServiceDetails.length > 0 && (
          <div className={`rounded-2xl border p-5 ${innerCardClassName}`}>
            <p className={`mb-3 text-sm font-bold uppercase tracking-[0.2em] ${mutedClassName}`}>Selected services</p>
            <div className="space-y-2">
              {selectedServiceDetails.map((service) => (
                <div key={service.id} className={`flex justify-between gap-4 ${textClassName}`}>
                  <span>{service.name}</span>
                  <span>£{Number(service.bundle_price || service.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="font-black">Total: £{totalPrice.toFixed(2)}</p>
              <p className={`${textClassName} mt-1`}>Total duration: {totalDuration} mins</p>
            </div>
          </div>
        )}

        <select value={selectedTeamMember} onChange={(e) => { setSelectedTeamMember(e.target.value); setSelectedTime('') }} className={`w-full rounded-2xl border p-4 outline-none ${innerCardClassName}`}>
          <option value="">Select team member</option>
          {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}
        </select>

        <div>
          <label className={`mb-3 block text-sm font-bold ${textClassName}`}>Choose a date</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {dateOptions.map((date) => {
              const selected = selectedDate === date.value
              return (
                <button key={date.value} type="button" onClick={() => { setSelectedDate(date.value); setSelectedTime('') }} className={`rounded-2xl border p-4 text-left transition ${selected ? 'border-transparent text-white shadow-lg' : `${innerCardClassName} hover:opacity-80`}`} style={selected ? { background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})` } : undefined}>
                  <div className="text-xs font-bold uppercase opacity-70">{date.day}</div>
                  <div className="text-2xl font-black leading-tight">{date.date}</div>
                  <div className="text-xs font-semibold opacity-70">{date.month}</div>
                </button>
              )
            })}
          </div>
        </div>

        {selectedDate && selectedTeamMember && selectedServices.length > 0 && (
          <div>
            <p className={`mb-3 text-sm font-bold ${textClassName}`}>Available times for {formattedDate}</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {availableTimeSlots.map((slot) => {
                const selected = selectedTime === slot
                return <button key={slot} type="button" onClick={() => setSelectedTime(slot)} className={`rounded-2xl border p-4 font-bold transition ${selected ? 'border-transparent text-white' : `${innerCardClassName} hover:opacity-80`}`} style={selected ? { background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})` } : undefined}>{slot}</button>
              })}
            </div>
            {availableTimeSlots.length === 0 && <p className={`${mutedClassName} mt-3`}>No available slots for this date and service length.</p>}
          </div>
        )}

        {selectedServices.length > 0 && selectedTeamMember && selectedDate && selectedTime && (
          <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})` }}>
            <p className="mb-1 text-sm font-bold uppercase tracking-[0.2em] text-white/70">Selected appointment</p>
            <p className="text-xl font-black">{formattedDate} at {selectedTime}</p>
            <div className="mt-3 space-y-1 text-white/80">
              <p>Total services: {selectedServiceDetails.length}</p>
              <p>Total duration: {totalDuration} mins</p>
              <p>Total price: £{totalPrice.toFixed(2)}</p>
              {appliedVoucher && <><p>Gift voucher: -£{voucherDiscount.toFixed(2)}</p><p className="font-black text-white">Amount due: £{amountDueAfterVoucher.toFixed(2)}</p></>}
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <input className={`w-full rounded-2xl border p-4 outline-none ${innerCardClassName}`} placeholder="First name *" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <input className={`w-full rounded-2xl border p-4 outline-none ${innerCardClassName}`} placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>

        <input className={`w-full rounded-2xl border p-4 outline-none ${innerCardClassName}`} placeholder="Email address *" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={`w-full rounded-2xl border p-4 outline-none ${innerCardClassName}`} placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <div className={`rounded-2xl border p-5 ${innerCardClassName}`}>
          <p className={`mb-2 text-sm font-bold uppercase tracking-[0.2em] ${mutedClassName}`}>Gift voucher</p>
          <p className={`${textClassName} mb-4`}>Enter a voucher code to apply it to this booking.</p>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input className={`w-full rounded-2xl border p-4 outline-none ${innerCardClassName}`} placeholder="Gift voucher code" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value.toUpperCase())} />
            <button type="button" onClick={validateVoucher} disabled={voucherValidating || !voucherCode.trim()} className="rounded-2xl px-5 py-4 font-black text-white disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})` }}>{voucherValidating ? 'Checking...' : 'Apply'}</button>
          </div>
          {voucherMessage && <p className={`${textClassName} mt-4`}>{voucherMessage}</p>}
        </div>

        <button type="button" onClick={createBooking} disabled={loading} className="w-full rounded-2xl p-5 font-black text-white disabled:opacity-60" style={{ background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})` }}>
          {loading ? 'Booking...' : appliedVoucher ? `Book appointment — £${amountDueAfterVoucher.toFixed(2)} due` : 'Book appointment'}
        </button>

        {message && <p className={`rounded-2xl border p-4 ${innerCardClassName}`}>{message}</p>}
      </div>
    </div>
  )
}
