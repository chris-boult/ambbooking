'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type NotificationRecord = {
  id: string
  waitlist_id: string | null
  booking_id: string | null
  notification_sent: boolean | null
  claimed: boolean | null
  expires_at: string | null
  created_at: string | null
  waiting_list?: {
    id: string
    business_id: string
    customer_id: string | null
    service_id: string | null
    team_member_id: string | null
    preferred_date: string | null
    preferred_time_range: string | null
    status: string | null
    notes: string | null
    customers?: {
      first_name: string
      last_name: string | null
      email?: string | null
      phone?: string | null
    } | null
    services?: {
      name: string
      price?: number | null
      duration_minutes?: number | null
    } | null
  } | null
  bookings?: {
    id: string
    business_id: string
    booking_date: string
    booking_time: string
    service_id: string | null
    team_member_id: string | null
    total_price?: number | null
    total_duration_minutes?: number | null
  } | null
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function WaitlistClaimPage() {
  const params = useParams()
  const notificationId = String(params.notificationId || '')

  const [record, setRecord] = useState<NotificationRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationId])

  async function load() {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase
      .from('waitlist_notifications')
      .select(`
        *,
        waiting_list(
          id,
          business_id,
          customer_id,
          service_id,
          team_member_id,
          preferred_date,
          preferred_time_range,
          status,
          notes,
          customers(first_name,last_name,email,phone),
          services(name,price,duration_minutes)
        ),
        bookings(
          id,
          business_id,
          booking_date,
          booking_time,
          service_id,
          team_member_id,
          total_price,
          total_duration_minutes
        )
      `)
      .eq('id', notificationId)
      .maybeSingle()

    if (error || !data) {
      setMessage(error?.message || 'This waitlist claim link was not found.')
      setLoading(false)
      return
    }

    setRecord(data as unknown as NotificationRecord)
    setLoading(false)
  }

  async function claimSlot() {
    if (!record || !record.waiting_list || !record.bookings) return

    setClaiming(true)
    setMessage('')

    if (record.claimed) {
      setMessage('This slot has already been claimed.')
      setClaiming(false)
      return
    }

    if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
      setMessage('This claim link has expired.')
      setClaiming(false)
      return
    }

    const waitlist = record.waiting_list
    const releasedBooking = record.bookings

    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        business_id: waitlist.business_id,
        customer_id: waitlist.customer_id,
        service_id: waitlist.service_id || releasedBooking.service_id,
        team_member_id: waitlist.team_member_id || releasedBooking.team_member_id,
        booking_date: releasedBooking.booking_date,
        booking_time: releasedBooking.booking_time,
        status: 'confirmed',
        payment_status: 'unpaid',
        total_price: releasedBooking.total_price || waitlist.services?.price || 0,
        total_duration_minutes: releasedBooking.total_duration_minutes || waitlist.services?.duration_minutes || 30,
        notes: waitlist.notes ? `Claimed from waitlist. ${waitlist.notes}` : 'Claimed from waitlist.',
      })
      .select('id')
      .single()

    if (bookingError || !newBooking) {
      setMessage(bookingError?.message || 'Could not create booking.')
      setClaiming(false)
      return
    }

    const [{ error: waitlistError }, { error: notificationError }] = await Promise.all([
      supabase
        .from('waiting_list')
        .update({
          status: 'claimed',
          claimed_at: new Date().toISOString(),
          claimed_booking_id: newBooking.id,
        })
        .eq('id', waitlist.id),
      supabase
        .from('waitlist_notifications')
        .update({
          claimed: true,
        })
        .eq('id', record.id),
    ])

    if (waitlistError || notificationError) {
      setMessage(waitlistError?.message || notificationError?.message || 'Booking created, but waitlist status could not be updated.')
      setClaiming(false)
      return
    }

    setRecord({
      ...record,
      claimed: true,
      waiting_list: {
        ...waitlist,
        status: 'claimed',
      },
    })
    setMessage('Slot claimed. Your booking is confirmed.')
    setClaiming(false)
  }

  const customer = record?.waiting_list?.customers
  const service = record?.waiting_list?.services
  const booking = record?.bookings

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
          <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-cyan-300">
            Waitlist claim
          </p>

          {loading ? (
            <p className="text-slate-400">Loading slot...</p>
          ) : (
            <>
              <h1 className="text-4xl font-black">A slot is available</h1>

              {message && (
                <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
                  {message}
                </div>
              )}

              {record && booking && (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                      Appointment
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {formatDate(booking.booking_date)}
                    </p>
                    <p className="mt-1 text-xl text-cyan-300">
                      {String(booking.booking_time).slice(0, 5)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                      Details
                    </p>
                    <p className="mt-2 font-black">{customer?.first_name} {customer?.last_name || ''}</p>
                    <p className="text-slate-400">{service?.name || 'Selected service'}</p>
                  </div>

                  {record.claimed ? (
                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5 text-emerald-100">
                      This slot has been claimed.
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={claimSlot}
                      disabled={claiming}
                      className="w-full rounded-2xl bg-cyan-400 px-5 py-5 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                    >
                      {claiming ? 'Claiming...' : 'Claim this slot'}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
