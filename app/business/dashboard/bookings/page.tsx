'use client'

import { useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { supabase } from '@/lib/supabase'
import { Availability, Booking, Customer, RawBooking, Service, TeamMember } from './types'
import { formatBookingDate, uniqueValues } from './utils/bookingFormatting'
import BookingSection from './components/BookingSection'
import RescheduleModal from './components/RescheduleModal'

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [bookedTimes, setBookedTimes] = useState<string[]>([])
  const [message, setMessage] = useState('')

  const dateOptions = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)
    return {
      value: date.toISOString().split('T')[0],
      day: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      date: date.toLocaleDateString('en-GB', { day: 'numeric' }),
      month: date.toLocaleDateString('en-GB', { month: 'short' }),
    }
  }), [])

  const selectedDayOfWeek = newDate ? new Date(newDate).getDay() : null

  const timeSlots = useMemo(() => {
    const slots: string[] = []
    if (!availability?.is_available || !availability.start_time || !availability.end_time) return slots
    let [hour, minute] = availability.start_time.slice(0, 5).split(':').map(Number)
    const [endHour, endMinute] = availability.end_time.slice(0, 5).split(':').map(Number)
    while (hour < endHour || (hour === endHour && minute < endMinute)) {
      slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
      minute += 30
      if (minute >= 60) { minute = 0; hour += 1 }
    }
    return slots
  }, [availability])

  const availableTimeSlots = timeSlots.filter((slot) => !bookedTimes.includes(slot))

  async function loadBookings() {
    setLoading(true)
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select('id,business_id,customer_id,service_id,team_member_id,booking_date,booking_time,status')
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true })

    if (bookingError || !bookingData) { setBookings([]); setLoading(false); return }

    const rawBookings = bookingData as RawBooking[]
    const customerIds = uniqueValues(rawBookings.map((booking) => booking.customer_id))
    const serviceIds = uniqueValues(rawBookings.map((booking) => booking.service_id))
    const teamMemberIds = uniqueValues(rawBookings.map((booking) => booking.team_member_id))

    let customers: Customer[] = []
    let services: Service[] = []
    let teamMembers: TeamMember[] = []

    if (customerIds.length) {
      const { data } = await supabase.from('customers').select('id, first_name, last_name, email').in('id', customerIds)
      customers = (data as Customer[]) || []
    }
    if (serviceIds.length) {
      const { data } = await supabase.from('services').select('id, name, price').in('id', serviceIds)
      services = (data as Service[]) || []
    }
    if (teamMemberIds.length) {
      const { data } = await supabase.from('team_members').select('id, full_name').in('id', teamMemberIds)
      teamMembers = (data as TeamMember[]) || []
    }

    setBookings(rawBookings.map((booking) => {
      const customer = customers.find((item) => item.id === booking.customer_id)
      const service = services.find((item) => item.id === booking.service_id)
      const teamMember = teamMembers.find((item) => item.id === booking.team_member_id)
      return {
        ...booking,
        customers: customer ? [{ first_name: customer.first_name, last_name: customer.last_name, email: customer.email }] : null,
        services: service ? [{ name: service.name, price: service.price }] : null,
        team_members: teamMember ? [{ full_name: teamMember.full_name }] : null,
      }
    }))
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
    const isNowEarned = Number(loyaltyWallet.visits_required || 0) > 0 && nextVisits >= Number(loyaltyWallet.visits_required || 0)
    const wasAlreadyEarned = loyaltyWallet.status === 'earned'
    const { error: updateError } = await supabase.from('customer_loyalty').update({ visits_completed: nextVisits, status: isNowEarned ? 'earned' : 'active' }).eq('id', loyaltyWallet.id)
    if (updateError) return
    if (isNowEarned && !wasAlreadyEarned) {
      try {
        await fetch('/api/messaging/send-loyalty-reward-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: booking.business_id, customerId: booking.customer_id, bookingId: booking.id, loyaltyId: loyaltyWallet.id, rewardLabel: loyaltyWallet.reward_label || 'your loyalty reward' }),
        })
      } catch (error) { console.error('Loyalty reward SMS failed:', error) }
    }
  }

  async function updateBookingStatus(id: string, status: string) {
    const booking = bookings.find((item) => item.id === id)
    if (!booking || !window.confirm(`Mark this booking as ${status}?`)) return
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) { setMessage(error.message); return }
    if (status === 'completed' && booking.status !== 'completed') await awardLoyaltyVisitForCompletedBooking(booking)
    await loadBookings()
  }

  async function cancelBooking(id: string) {
    const booking = bookings.find((item) => item.id === id)
    if (!booking || !window.confirm('Are you sure you want to cancel this booking?')) return
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    try {
      await fetch('/api/process-waiting-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: booking.business_id, service_id: booking.service_id, team_member_id: booking.team_member_id, booking_date: booking.booking_date, booking_time: booking.booking_time }),
      })
    } catch (error) { console.error('Waiting list processing failed', error) }
    await fetch('/api/send-booking-update-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: booking.business_id, customerId: booking.customer_id, bookingId: booking.id, customerName: `${booking.customers?.[0]?.first_name || ''} ${booking.customers?.[0]?.last_name || ''}`, customerEmail: booking.customers?.[0]?.email || '', bookingDate: formatBookingDate(booking.booking_date), bookingTime: booking.booking_time?.slice(0, 5), serviceName: booking.services?.[0]?.name || 'Your appointment', teamMemberName: booking.team_members?.[0]?.full_name || 'Your specialist', action: 'cancelled' }),
    })
    await loadBookings()
  }

  function openReschedule(booking: Booking) {
    setRescheduleBooking(booking); setNewDate(booking.booking_date); setNewTime(''); setAvailability(null); setBookedTimes([]); setMessage('')
  }
  function closeReschedule() {
    setRescheduleBooking(null); setNewDate(''); setNewTime(''); setAvailability(null); setBookedTimes([]); setMessage('')
  }

  async function saveReschedule() {
    if (!rescheduleBooking || !newDate || !newTime) { setMessage('Please choose a new date and time.'); return }
    if (bookedTimes.includes(newTime)) { setMessage('That slot is no longer available.'); setNewTime(''); return }
    const { error } = await supabase.from('bookings').update({ booking_date: newDate, booking_time: newTime, status: 'confirmed' }).eq('id', rescheduleBooking.id)
    if (error) { setMessage(error.message); return }
    await fetch('/api/send-booking-update-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: rescheduleBooking.business_id, customerId: rescheduleBooking.customer_id, bookingId: rescheduleBooking.id, customerName: `${rescheduleBooking.customers?.[0]?.first_name || ''} ${rescheduleBooking.customers?.[0]?.last_name || ''}`, customerEmail: rescheduleBooking.customers?.[0]?.email || '', bookingDate: formatBookingDate(newDate), bookingTime: newTime, serviceName: rescheduleBooking.services?.[0]?.name || 'Your appointment', teamMemberName: rescheduleBooking.team_members?.[0]?.full_name || 'Your specialist', action: 'rescheduled' }),
    })
    closeReschedule()
    await loadBookings()
  }

  useEffect(() => { loadBookings() }, [])

  useEffect(() => {
    async function loadAvailabilityAndBookedTimes() {
      if (!rescheduleBooking || !newDate || selectedDayOfWeek === null) { setAvailability(null); setBookedTimes([]); return }
      const { data: currentBooking } = await supabase.from('bookings').select('business_id').eq('id', rescheduleBooking.id).single()
      if (!currentBooking) return
      const { data: availabilityData } = await supabase.from('availability').select('day_of_week,start_time,end_time,is_available').eq('business_id', currentBooking.business_id).eq('team_member_id', rescheduleBooking.team_member_id).eq('day_of_week', selectedDayOfWeek).maybeSingle()
      setAvailability((availabilityData as Availability | null) || null)
      const { data: bookingsData } = await supabase.from('bookings').select('booking_time,id').eq('business_id', currentBooking.business_id).eq('team_member_id', rescheduleBooking.team_member_id).eq('booking_date', newDate).neq('id', rescheduleBooking.id).neq('status', 'cancelled')
      setBookedTimes((bookingsData as { booking_time: string }[] | null)?.map((booking) => booking.booking_time.slice(0, 5)) || [])
    }
    loadAvailabilityAndBookedTimes()
  }, [rescheduleBooking, newDate, selectedDayOfWeek])

  const today = new Date().toISOString().split('T')[0]
  const upcomingBookings = bookings.filter((booking) => booking.booking_date >= today && booking.status === 'confirmed')
  const pastConfirmedBookings = bookings.filter((booking) => booking.booking_date < today && booking.status === 'confirmed')
  const completedBookings = bookings.filter((booking) => booking.status === 'completed')
  const noShowBookings = bookings.filter((booking) => booking.status === 'no_show')
  const cancelledBookings = bookings.filter((booking) => booking.status === 'cancelled')

  if (loading) return <div className="p-8 text-white">Loading bookings...</div>

  return (
    <div className="p-8 text-white">
      <PageHeader title="Bookings" />
      {message && <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">{message}</div>}
      <BookingSection title="Upcoming Bookings" bookings={upcomingBookings} showActions onCancel={cancelBooking} onReschedule={openReschedule} onComplete={(id) => updateBookingStatus(id, 'completed')} onNoShow={(id) => updateBookingStatus(id, 'no_show')} />
      <BookingSection title="Past Confirmed Bookings" bookings={pastConfirmedBookings} showActions onCancel={cancelBooking} onReschedule={openReschedule} onComplete={(id) => updateBookingStatus(id, 'completed')} onNoShow={(id) => updateBookingStatus(id, 'no_show')} />
      <BookingSection title="Completed Bookings" bookings={completedBookings} />
      <BookingSection title="No Shows" bookings={noShowBookings} />
      <BookingSection title="Cancelled Bookings" bookings={cancelledBookings} />
      {rescheduleBooking && <RescheduleModal booking={rescheduleBooking} dateOptions={dateOptions} newDate={newDate} newTime={newTime} availability={availability} availableTimeSlots={availableTimeSlots} message={message} setNewDate={setNewDate} setNewTime={setNewTime} clearMessage={() => setMessage('')} onSave={saveReschedule} onClose={closeReschedule} />}
    </div>
  )
}
