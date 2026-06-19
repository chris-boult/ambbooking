'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Service = {
  id: string
  name: string
  description?: string | null
  price: number
  duration_minutes: number
  category?: string | null
  service_type?: string | null
  is_add_on?: boolean | null
  parent_service_id?: string | null
  recommended_service_ids?: string[] | null
  requires_service_id?: string | null
  bundle_price?: number | null
  bundle_discount_type?: string | null
  bundle_discount_value?: number | null
  sort_order?: number | null
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

type BookedTimesByDate = Record<string, BookedTime[]>

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

type Step = 'service' | 'staff' | 'datetime' | 'details' | 'review'

function toDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDisplayDate(dateValue: string) {
  if (!dateValue) return ''

  const [year, month, day] = dateValue.split('-').map(Number)
  const safeDate = new Date(year, month - 1, day, 12, 0, 0)

  return safeDate.toLocaleDateString('en-GB', {
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

function money(value: number | string | null | undefined) {
  return `£${Number(value || 0).toFixed(2)}`
}

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
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
  const [step, setStep] = useState<Step>('service')
  const [mainServiceId, setMainServiceId] = useState('')
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [addOnsOpen, setAddOnsOpen] = useState(true)
  const [showStaffList, setShowStaffList] = useState(false)
  const [staffSearch, setStaffSearch] = useState('')

  const [selectedTeamMember, setSelectedTeamMember] = useState('any')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [bookedTimes, setBookedTimes] = useState<BookedTime[]>([])
  const [bookedTimesByDate, setBookedTimesByDate] = useState<BookedTimesByDate>({})
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

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
  const [showVoucher, setShowVoucher] = useState(false)

  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const primaryButtonStyle = {
    background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})`,
  }

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => {
      const categoryA = a.category || 'Other'
      const categoryB = b.category || 'Other'
      if (categoryA !== categoryB) return categoryA.localeCompare(categoryB)
      return Number(a.sort_order || 0) - Number(b.sort_order || 0) || a.name.localeCompare(b.name)
    })
  }, [services])

  const mainServices = useMemo(() => sortedServices.filter((service) => !service.is_add_on), [sortedServices])

  const selectedMainService = useMemo(() => {
    return services.find((service) => service.id === mainServiceId) || null
  }, [mainServiceId, services])

  const recommendedAddOns = useMemo(() => {
    if (!selectedMainService) return []

    const recommendedIds = selectedMainService.recommended_service_ids || []

    return sortedServices.filter((service) => {
      if (service.id === selectedMainService.id) return false
      if (selectedAddOnIds.includes(service.id)) return false

      const recommended = recommendedIds.includes(service.id)
      const parentMatch = service.parent_service_id === selectedMainService.id

      return recommended || parentMatch
    })
  }, [selectedMainService, selectedAddOnIds, sortedServices])

  const selectedServiceDetails = useMemo(() => {
    const ids = [mainServiceId, ...selectedAddOnIds].filter(Boolean)
    return services.filter((service) => ids.includes(service.id))
  }, [mainServiceId, selectedAddOnIds, services])

  const totalPrice = selectedServiceDetails.reduce((sum, service) => sum + Number(service.price || 0), 0)
  const totalDuration = selectedServiceDetails.reduce((sum, service) => sum + Number(service.duration_minutes || 0), 0)
  const voucherDiscount = appliedVoucher?.discountAmount || 0
  const amountDueAfterVoucher = Math.max(totalPrice - voucherDiscount, 0)

  const filteredMainServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase()
    if (!q) return mainServices
    return mainServices.filter((service) =>
      [service.name, service.description, service.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    )
  }, [mainServices, serviceSearch])

  const groupedMainServices = useMemo(() => {
    return filteredMainServices.reduce<Record<string, Service[]>>((groups, service) => {
      const category = service.category || 'Other'
      groups[category] = groups[category] || []
      groups[category].push(service)
      return groups
    }, {})
  }, [filteredMainServices])

  const filteredTeamMembers = useMemo(() => {
    const q = staffSearch.trim().toLowerCase()
    if (!q) return teamMembers
    return teamMembers.filter((member) => member.full_name.toLowerCase().includes(q))
  }, [teamMembers, staffSearch])


  const monthBaseDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    const today = startOfToday()
    const days: Array<null | { date: Date; value: string; day: number; isPast: boolean; isToday: boolean }> = []

    for (let i = 0; i < startOffset; i++) {
      days.push(null)
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      date.setHours(0, 0, 0, 0)

      days.push({
        date,
        value: toDateValue(date),
        day,
        isPast: date < today,
        isToday: date.getTime() === today.getTime(),
      })
    }

    return days
  }, [calendarMonth])

  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 9; hour < 17; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`)
      slots.push(`${String(hour).padStart(2, '0')}:30`)
    }
    return slots
  }, [])

  function getAvailableSlotsForDate(dateValue: string) {
    if (totalDuration <= 0) return []

    const dateBookedTimes = bookedTimesByDate[dateValue] || []

    return timeSlots.filter((slot) => {
      const candidateStart = timeToMinutes(slot)
      const candidateEnd = candidateStart + totalDuration
      const businessClose = 17 * 60

      if (candidateEnd > businessClose) return false

      return !dateBookedTimes.some((booked) => {
        const bookedStart = timeToMinutes(booked.time)
        const bookedEnd = bookedStart + booked.duration
        return candidateStart < bookedEnd && candidateEnd > bookedStart
      })
    })
  }


  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return []
    return getAvailableSlotsForDate(selectedDate)
  }, [selectedDate, bookedTimesByDate, totalDuration, timeSlots])

  const morningSlots = availableTimeSlots.filter((slot) => timeToMinutes(slot) < 12 * 60)
  const afternoonSlots = availableTimeSlots.filter(
    (slot) => timeToMinutes(slot) >= 12 * 60 && timeToMinutes(slot) < 17 * 60
  )

  const monthDays = useMemo(() => {
    return monthBaseDays.map((day) => {
      if (!day) return null

      const availableSlots = day.isPast ? [] : getAvailableSlotsForDate(day.value)
      const slotCount = availableSlots.length

      let availability: 'none' | 'limited' | 'good' = 'none'

      if (slotCount >= 5) {
        availability = 'good'
      } else if (slotCount > 0) {
        availability = 'limited'
      }

      return {
        ...day,
        slotCount,
        availability,
      }
    })
  }, [monthBaseDays, bookedTimesByDate, totalDuration, timeSlots])

  const nextAvailable = useMemo(() => {
    const today = startOfToday()

    for (let i = 0; i < 60; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const value = toDateValue(date)
      const slots = getAvailableSlotsForDate(value)

      if (slots.length > 0) {
        return {
          date: value,
          time: slots[0],
        }
      }
    }

    return null
  }, [bookedTimesByDate, totalDuration, timeSlots])

  const formattedDate = formatDisplayDate(selectedDate)
  const selectedStaffName =
    selectedTeamMember === 'any'
      ? 'Any available staff'
      : teamMembers.find((member) => member.id === selectedTeamMember)?.full_name || 'Selected staff'

  const selectedDateSummary = selectedDate
    ? `${formatDisplayDate(selectedDate)}${selectedTime ? ` at ${selectedTime}` : ''}`
    : ''

  const progress = {
    service: 1,
    staff: 2,
    datetime: 3,
    details: 4,
    review: 5,
  }[step]

  useEffect(() => {
    setAppliedVoucher(null)
    setVoucherMessage('')
    setVoucherAmountUsed(0)
    setRemainingVoucherBalance(null)
  }, [mainServiceId, selectedAddOnIds, voucherCode])

  useEffect(() => {
    async function loadBookedTimesForMonth() {
      if (!mainServiceId || selectedTeamMember === 'any') {
        setBookedTimes([])
        setBookedTimesByDate({})
        return
      }

      const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
      const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)

      const { data } = await supabase
        .from('bookings')
        .select('booking_date, booking_time, total_duration_minutes')
        .eq('business_id', businessId)
        .eq('team_member_id', selectedTeamMember)
        .gte('booking_date', toDateValue(monthStart))
        .lte('booking_date', toDateValue(monthEnd))
        .neq('status', 'cancelled')

      const grouped =
        (data as Array<Booking & { booking_date: string }> | null)?.reduce<BookedTimesByDate>((acc, booking) => {
          const date = booking.booking_date
          acc[date] = acc[date] || []
          acc[date].push({
            time: booking.booking_time.slice(0, 5),
            duration: Number(booking.total_duration_minutes || 30),
          })
          return acc
        }, {}) || {}

      setBookedTimesByDate(grouped)

      if (selectedDate) {
        setBookedTimes(grouped[selectedDate] || [])
      }
    }

    loadBookedTimesForMonth()
  }, [businessId, selectedTeamMember, selectedDate, mainServiceId, calendarMonth])

  function selectMainService(serviceId: string) {
    setMainServiceId(serviceId)
    setSelectedAddOnIds([])
    setSelectedDate('')
    setSelectedTime('')
    setMessage('')
  }

  function toggleAddOn(serviceId: string) {
    setSelectedTime('')
    setSelectedAddOnIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    )
  }

  function goNext() {
    setMessage('')

    if (step === 'service') {
      if (!mainServiceId) {
        setMessage('Please choose a service.')
        return
      }
      setStep('staff')
      return
    }

    if (step === 'staff') {
      if (!selectedTeamMember) {
        setMessage('Please choose a staff option.')
        return
      }
      setStep('datetime')
      return
    }

    if (step === 'datetime') {
      if (!selectedDate || !selectedTime) {
        setMessage('Please choose a date and time.')
        return
      }
      setStep('details')
      return
    }

    if (step === 'details') {
      if (!firstName || !email) {
        setMessage('Please enter your first name and email address.')
        return
      }
      setStep('review')
    }
  }

  function goBack() {
    setMessage('')
    if (step === 'review') return setStep('details')
    if (step === 'details') return setStep('datetime')
    if (step === 'datetime') return setStep('staff')
    if (step === 'staff') return setStep('service')
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
        body: JSON.stringify({
          code: voucherCode,
          businessId,
          bookingTotal: totalPrice,
        }),
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

    if (selectedServiceDetails.length === 0 || !selectedDate || !selectedTime || !firstName || !email) {
      setMessage('Please complete all required fields.')
      return
    }

    if (!availableTimeSlots.includes(selectedTime)) {
      setMessage('Sorry, that time is no longer available for the selected services.')
      setSelectedTime('')
      setStep('datetime')
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

    const firstService = selectedServiceDetails[0]
    const finalTeamMemberId = selectedTeamMember === 'any' ? teamMembers[0]?.id || null : selectedTeamMember

    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        service_id: firstService?.id || null,
        team_member_id: finalTeamMemberId,
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
      price: service.price,
      duration_minutes: service.duration_minutes,
    }))

    const { error: bookingServicesError } = await supabase
      .from('booking_services')
      .insert(bookingServicesRows)

    if (bookingServicesError) {
      setMessage(bookingServicesError.message)
      setLoading(false)
      return
    }

    if (appliedVoucher) {
      const response = await fetch('/api/redeem-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: appliedVoucher.code,
          booking_id: bookingData.id,
          business_id: businessId,
          amount_due: totalPrice,
        }),
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
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white" style={primaryButtonStyle}>✓</div>
        <h2 className="mb-4 text-3xl font-black">Booking confirmed</h2>
        <p className={`${textClassName} mb-4`}>Your appointment has been booked successfully.</p>
        <BookingSummary
          services={selectedServiceDetails}
          totalPrice={totalPrice}
          totalDuration={totalDuration}
          date={formattedDate}
          time={selectedTime}
          staff={selectedStaffName}
          innerCardClassName={innerCardClassName}
          textClassName={textClassName}
          mutedClassName={mutedClassName}
        />
      </div>
    )
  }

  return (
    <div className={`rounded-[28px] border p-5 backdrop-blur-2xl md:p-6 ${cardClassName}`}>
      <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className={`mb-2 text-xs font-black uppercase tracking-[0.22em] ${mutedClassName}`}>
            Step {progress} of 5
          </p>
          <h2 className="text-2xl font-black md:text-3xl">
            {step === 'service' && 'Choose a service'}
            {step === 'staff' && 'Choose your specialist'}
            {step === 'datetime' && 'Choose a date and time'}
            {step === 'details' && 'Your details'}
            {step === 'review' && 'Review booking'}
          </h2>
        </div>

        <CompactSummary
          services={selectedServiceDetails}
          totalPrice={totalPrice}
          totalDuration={totalDuration}
          textClassName={textClassName}
        />
      </div>

      <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{
            ...primaryButtonStyle,
            width: `${(progress / 5) * 100}%`,
          }}
        />
      </div>

      {message && (
        <div className={`mb-5 rounded-2xl border p-4 ${innerCardClassName}`}>
          <p className={textClassName}>{message}</p>
        </div>
      )}

      <div className="min-h-[340px]">
        {step === 'service' && (
          <section className="space-y-4">
            <p className={`${textClassName}`}>Choose one main service. Recommended add-ons will appear underneath.</p>

            <input
              className={`w-full rounded-2xl border p-4 outline-none ${innerCardClassName}`}
              placeholder="Search services"
              value={serviceSearch}
              onChange={(event) => setServiceSearch(event.target.value)}
            />

            <select
              value={mainServiceId}
              onChange={(event) => selectMainService(event.target.value)}
              className={`w-full rounded-2xl border p-4 outline-none ${innerCardClassName}`}
            >
              <option value="">Choose a service</option>
              {Object.entries(groupedMainServices).map(([category, categoryServices]) => (
                <optgroup key={category} label={category}>
                  {categoryServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} • {service.duration_minutes} mins • {money(service.price)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {selectedMainService && (
              <SelectedPanel
                title={selectedMainService.name}
                subtitle={`${selectedMainService.duration_minutes} mins • ${money(selectedMainService.price)}`}
                description={selectedMainService.description || ''}
                innerCardClassName={innerCardClassName}
                textClassName={textClassName}
              />
            )}

            <div className="space-y-3">
              {Object.entries(groupedMainServices).map(([category, categoryServices]) => (
                <div key={category} className={`rounded-2xl border ${innerCardClassName}`}>
                  <button
                    type="button"
                    onClick={() => setOpenCategory(openCategory === category ? null : category)}
                    className="flex w-full items-center justify-between p-4 text-left font-black"
                  >
                    <span>{category}</span>
                    <span>{openCategory === category ? '−' : '+'}</span>
                  </button>

                  {openCategory === category && (
                    <div className="max-h-72 space-y-2 overflow-y-auto border-t border-white/10 p-3">
                      {categoryServices.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => selectMainService(service.id)}
                          className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:bg-white/10"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black">{service.name}</p>
                              <p className={`mt-1 text-sm ${textClassName}`}>{service.duration_minutes} mins</p>
                            </div>
                            <p className="font-black">{money(service.price)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedMainService && recommendedAddOns.length > 0 && (
              <div className={`rounded-2xl border p-4 ${innerCardClassName}`}>
                <button
                  type="button"
                  onClick={() => setAddOnsOpen((current) => !current)}
                  className="flex w-full items-center justify-between text-left font-black"
                >
                  <span>Customers often add</span>
                  <span>{addOnsOpen ? '−' : '+'}</span>
                </button>

                {addOnsOpen && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {recommendedAddOns.map((service) => {
                      const selected = selectedAddOnIds.includes(service.id)
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleAddOn(service.id)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            selected ? 'border-transparent text-white' : `${innerCardClassName} hover:opacity-80`
                          }`}
                          style={selected ? primaryButtonStyle : undefined}
                        >
                          <p className="font-black">{selected ? '✓ ' : '+ '}{service.name}</p>
                          <p className="mt-1 text-sm opacity-75">+{service.duration_minutes} mins • +{money(service.price)}</p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {step === 'staff' && (
          <section className="space-y-4">
            <p className={`${textClassName}`}>Choose anyone available, or pick a specific staff member.</p>

            <button
              type="button"
              onClick={() => {
                setSelectedTeamMember('any')
                setShowStaffList(false)
                setSelectedTime('')
              }}
              className={`w-full rounded-2xl border p-4 text-left font-black ${
                selectedTeamMember === 'any' ? 'border-transparent text-white' : innerCardClassName
              }`}
              style={selectedTeamMember === 'any' ? primaryButtonStyle : undefined}
            >
              Any available staff
            </button>

            <button
              type="button"
              onClick={() => setShowStaffList((current) => !current)}
              className={`w-full rounded-2xl border p-4 text-left font-black ${innerCardClassName}`}
            >
              {showStaffList ? 'Hide staff list' : 'Choose a specific staff member'}
            </button>

            {showStaffList && (
              <div className="space-y-3">
                <input
                  className={`w-full rounded-2xl border p-4 outline-none ${innerCardClassName}`}
                  placeholder="Search staff"
                  value={staffSearch}
                  onChange={(event) => setStaffSearch(event.target.value)}
                />

                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {filteredTeamMembers.map((member) => {
                    const selected = selectedTeamMember === member.id
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setSelectedTeamMember(member.id)
                          setSelectedTime('')
                        }}
                        className={`w-full rounded-2xl border p-4 text-left font-black ${
                          selected ? 'border-transparent text-white' : innerCardClassName
                        }`}
                        style={selected ? primaryButtonStyle : undefined}
                      >
                        {member.full_name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {step === 'datetime' && (
          <section className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className={`${textClassName}`}>
                  Choose a day, then pick an available time.
                </p>

                {selectedDateSummary && (
                  <p className="mt-2 text-lg font-black">
                    {selectedDateSummary}
                  </p>
                )}
              </div>

              {nextAvailable && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(nextAvailable.date)
                    setSelectedTime(nextAvailable.time)
                  }}
                  className="rounded-2xl px-4 py-3 text-sm font-black text-white"
                  style={primaryButtonStyle}
                >
                  Select next available slot
                </button>
              )}
            </div>

            {selectedServiceDetails.length > 0 && (
              <div className={`rounded-2xl border p-4 ${innerCardClassName}`}>
                <p className={`mb-2 text-xs font-black uppercase tracking-[0.2em] ${mutedClassName}`}>
                  Your appointment length
                </p>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-black">
                      {selectedServiceDetails.map((service) => service.name).join(' + ')}
                    </p>

                    <p className={`${textClassName} mt-1`}>
                      {totalDuration} mins
                    </p>
                  </div>

                  <p className="text-xl font-black">
                    {money(totalPrice)}
                  </p>
                </div>
              </div>
            )}

            <div className={`rounded-2xl border p-4 ${innerCardClassName}`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                    )
                  }
                  className="rounded-xl border border-white/10 px-3 py-2 font-black"
                >
                  ←
                </button>

                <div className="text-center">
                  <h3 className="text-lg font-black">
                    {calendarMonth.toLocaleDateString('en-GB', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h3>

                  <div className={`mt-1 flex items-center justify-center gap-3 text-xs ${mutedClassName}`}>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Good
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      Limited
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-500" />
                      None
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                    )
                  }
                  className="rounded-xl border border-white/10 px-3 py-2 font-black"
                >
                  →
                </button>
              </div>

              <div className={`mb-2 grid grid-cols-7 gap-2 text-center text-xs font-black uppercase ${mutedClassName}`}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((day, index) => {
                  if (!day) {
                    return <div key={index} />
                  }

                  const selected = selectedDate === day.value
                  const disabled = day.isPast || day.slotCount === 0

                  const availabilityDot =
                    day.availability === 'good'
                      ? 'bg-emerald-400'
                      : day.availability === 'limited'
                        ? 'bg-amber-400'
                        : 'bg-slate-500'

                  return (
                    <button
                      key={day.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setSelectedDate(day.value)
                        setSelectedTime('')
                      }}
                      title={
                        day.isPast
                          ? 'Date has passed'
                          : day.slotCount === 0
                            ? 'No availability'
                            : `${day.slotCount} slot${day.slotCount === 1 ? '' : 's'} available`
                      }
                      className={`relative aspect-square rounded-xl border p-1 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-35 ${
                        selected
                          ? 'border-transparent text-white ring-2 ring-white/60'
                          : `${innerCardClassName} hover:opacity-80`
                      }`}
                      style={selected ? primaryButtonStyle : undefined}
                    >
                      <span>{day.day}</span>

                      <span className={`absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${availabilityDot}`} />

                      {!day.isPast && day.slotCount > 0 && day.slotCount <= 2 && (
                        <span className="absolute right-1 top-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-slate-950">
                          {day.slotCount}
                        </span>
                      )}

                      {day.isToday && (
                        <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedDate && (
              <div className="space-y-4">
                <div className={`rounded-2xl border p-4 ${innerCardClassName}`}>
                  <p className="font-black">{formatDisplayDate(selectedDate)}</p>
                  <p className={`${textClassName} mt-1`}>
                    {availableTimeSlots.length > 0
                      ? `${availableTimeSlots.length} available slot${availableTimeSlots.length === 1 ? '' : 's'}`
                      : 'No availability on this date'}
                  </p>
                </div>

                <TimeSlotGroup
                  title="Morning"
                  slots={morningSlots}
                  selectedTime={selectedTime}
                  setSelectedTime={setSelectedTime}
                  innerCardClassName={innerCardClassName}
                  primaryButtonStyle={primaryButtonStyle}
                  mutedClassName={mutedClassName}
                />

                <TimeSlotGroup
                  title="Afternoon"
                  slots={afternoonSlots}
                  selectedTime={selectedTime}
                  setSelectedTime={setSelectedTime}
                  innerCardClassName={innerCardClassName}
                  primaryButtonStyle={primaryButtonStyle}
                  mutedClassName={mutedClassName}
                />
              </div>
            )}
          </section>
        )}

        {step === 'details' && (
          <section className="space-y-4">
            <p className={`${textClassName}`}>We’ll use these details for your booking confirmation.</p>

            <div className="grid gap-4 md:grid-cols-2">
              <input className={`w-full rounded-2xl border p-4 outline-none ${innerCardClassName}`} placeholder="First name *" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <input className={`w-full rounded-2xl border p-4 outline-none ${innerCardClassName}`} placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>

            <input className={`w-full rounded-2xl border p-4 outline-none ${innerCardClassName}`} placeholder="Email address *" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className={`w-full rounded-2xl border p-4 outline-none ${innerCardClassName}`} placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />

            <button
              type="button"
              onClick={() => setShowVoucher((current) => !current)}
              className={`w-full rounded-2xl border p-4 text-left font-black ${innerCardClassName}`}
            >
              {showVoucher ? 'Hide voucher' : 'Have a gift voucher?'}
            </button>

            {showVoucher && (
              <div className={`rounded-2xl border p-5 ${innerCardClassName}`}>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <input
                    className={`w-full rounded-2xl border p-4 outline-none ${innerCardClassName}`}
                    placeholder="Gift voucher code"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  />

                  <button
                    type="button"
                    onClick={validateVoucher}
                    disabled={voucherValidating || !voucherCode.trim()}
                    className="rounded-2xl px-5 py-4 font-black text-white disabled:opacity-50"
                    style={primaryButtonStyle}
                  >
                    {voucherValidating ? 'Checking...' : 'Apply'}
                  </button>
                </div>

                {voucherMessage && <p className={`${textClassName} mt-4`}>{voucherMessage}</p>}
              </div>
            )}
          </section>
        )}

        {step === 'review' && (
          <section className="space-y-4">
            <BookingSummary
              services={selectedServiceDetails}
              totalPrice={totalPrice}
              totalDuration={totalDuration}
              date={formattedDate}
              time={selectedTime}
              staff={selectedStaffName}
              innerCardClassName={innerCardClassName}
              textClassName={textClassName}
              mutedClassName={mutedClassName}
              voucherDiscount={voucherDiscount}
              amountDueAfterVoucher={amountDueAfterVoucher}
            />

            <button
              type="button"
              onClick={createBooking}
              disabled={loading}
              className="w-full rounded-2xl p-5 font-black text-white disabled:opacity-60"
              style={primaryButtonStyle}
            >
              {loading
                ? 'Booking...'
                : appliedVoucher
                  ? `Confirm booking — ${money(amountDueAfterVoucher)} due`
                  : 'Confirm booking'}
            </button>
          </section>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 'service' || loading}
          className={`rounded-2xl border px-5 py-3 font-black disabled:cursor-not-allowed disabled:opacity-40 ${innerCardClassName}`}
        >
          Back
        </button>

        {step !== 'review' && (
          <button
            type="button"
            onClick={goNext}
            disabled={loading}
            className="rounded-2xl px-5 py-3 font-black text-white disabled:opacity-60"
            style={primaryButtonStyle}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  )
}


function TimeSlotGroup({
  title,
  slots,
  selectedTime,
  setSelectedTime,
  innerCardClassName,
  primaryButtonStyle,
  mutedClassName,
}: {
  title: string
  slots: string[]
  selectedTime: string
  setSelectedTime: (slot: string) => void
  innerCardClassName: string
  primaryButtonStyle: React.CSSProperties
  mutedClassName: string
}) {
  return (
    <div>
      <p className={`mb-3 text-sm font-black uppercase tracking-[0.2em] ${mutedClassName}`}>
        {title} {slots.length > 0 ? `(${slots.length})` : ''}
      </p>

      {slots.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {slots.map((slot) => {
            const selected = selectedTime === slot

            return (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedTime(slot)}
                className={`rounded-full border px-5 py-3 font-black transition ${
                  selected
                    ? 'border-transparent text-white'
                    : `${innerCardClassName} hover:opacity-80`
                }`}
                style={selected ? primaryButtonStyle : undefined}
              >
                {slot}
              </button>
            )
          })}
        </div>
      ) : (
        <p className={mutedClassName}>No {title.toLowerCase()} availability.</p>
      )}
    </div>
  )
}

function CompactSummary({
  services,
  totalPrice,
  totalDuration,
  textClassName,
}: {
  services: Service[]
  totalPrice: number
  totalDuration: number
  textClassName: string
}) {
  if (services.length === 0) {
    return <div className={`text-sm ${textClassName}`}>No service selected yet</div>
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
      <p className="font-black">{services.map((service) => service.name).join(' + ')}</p>
      <p className={`${textClassName} mt-1`}>{totalDuration} mins • {money(totalPrice)}</p>
    </div>
  )
}

function SelectedPanel({
  title,
  subtitle,
  description,
  innerCardClassName,
  textClassName,
}: {
  title: string
  subtitle: string
  description?: string
  innerCardClassName: string
  textClassName: string
}) {
  return (
    <div className={`rounded-2xl border p-5 ${innerCardClassName}`}>
      <p className="text-lg font-black">{title}</p>
      <p className={`${textClassName} mt-1`}>{subtitle}</p>
      {description && <p className={`${textClassName} mt-3`}>{description}</p>}
    </div>
  )
}

function BookingSummary({
  services,
  totalPrice,
  totalDuration,
  date,
  time,
  staff,
  innerCardClassName,
  textClassName,
  mutedClassName,
  voucherDiscount = 0,
  amountDueAfterVoucher,
}: {
  services: Service[]
  totalPrice: number
  totalDuration: number
  date: string
  time: string
  staff: string
  innerCardClassName: string
  textClassName: string
  mutedClassName: string
  voucherDiscount?: number
  amountDueAfterVoucher?: number
}) {
  return (
    <div className={`rounded-2xl border p-5 ${innerCardClassName}`}>
      <p className={`mb-4 text-sm font-black uppercase tracking-[0.2em] ${mutedClassName}`}>Booking summary</p>

      <div className="space-y-2">
        {services.map((service) => (
          <div key={service.id} className={`flex justify-between gap-4 ${textClassName}`}>
            <span>{service.name}</span>
            <span>{money(service.price)}</span>
          </div>
        ))}
      </div>

      <div className={`mt-5 space-y-2 border-t border-white/10 pt-5 ${textClassName}`}>
        {date && time && <p>{date} at {time}</p>}
        {staff && <p>{staff}</p>}
        <p>Total duration: {totalDuration} mins</p>
        <p>Total price: {money(totalPrice)}</p>
        {voucherDiscount > 0 && <p>Gift voucher: -{money(voucherDiscount)}</p>}
        {amountDueAfterVoucher !== undefined && voucherDiscount > 0 && (
          <p className="font-black text-white">Amount due: {money(amountDueAfterVoucher)}</p>
        )}
      </div>
    </div>
  )
}
