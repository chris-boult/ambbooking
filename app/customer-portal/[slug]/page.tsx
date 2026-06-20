'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Business = {
  id: string
  business_name: string | null
  slug: string | null
  logo_url?: string | null
  primary_colour?: string | null
  secondary_colour?: string | null
}

type Customer = {
  id: string
  business_id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone?: string | null
  email_reminders?: boolean | null
  sms_reminders?: boolean | null
  marketing_opt_in?: boolean | null
}

type ServiceOption = {
  id: string
  name: string
  price?: number | null
  duration_minutes?: number | null
}

type TeamMemberOption = {
  id: string
  full_name: string
}

type Booking = {
  id: string
  business_id: string
  customer_id: string | null
  service_id: string | null
  team_member_id: string | null
  booking_date: string
  booking_time: string
  status: string | null
  notes?: string | null
  total_price: number | null
  total_duration_minutes: number | null
  payment_status?: string | null
  amount_paid?: number | null
  amount_due?: number | null
  services?: {
    name: string | null
    price?: number | null
    duration_minutes?: number | null
  } | {
    name: string | null
    price?: number | null
    duration_minutes?: number | null
  }[] | null
  team_members?: {
    full_name: string | null
  } | {
    full_name: string | null
  }[] | null
}

type CustomerPackage = {
  id: string
  business_id: string
  customer_id: string | null
  package_id?: string | null
  sessions_purchased?: number | null
  sessions_used?: number | null
  sessions_remaining?: number | null
  purchase_date?: string | null
  expiry_date?: string | null
  status?: string | null
  packages?: {
    name?: string | null
    package_name?: string | null
  } | {
    name?: string | null
    package_name?: string | null
  }[] | null
}

type GiftVoucher = {
  id: string
  business_id: string
  code?: string | null
  amount?: number | null
  remaining_amount?: number | null
  recipient_name?: string | null
  recipient_email?: string | null
  purchaser_name?: string | null
  purchaser_email?: string | null
  expiry_date?: string | null
  status?: string | null
  redeemed_at?: string | null
  redeemed_booking_id?: string | null
  created_at?: string | null
}

type WaitingListEntry = {
  id: string
  business_id: string
  customer_id: string | null
  service_id: string | null
  team_member_id: string | null
  preferred_date: string | null
  preferred_time_range: string | null
  status: string | null
  notes: string | null
  created_at: string | null
  services?: {
    name: string | null
  } | {
    name: string | null
  }[] | null
  team_members?: {
    full_name: string | null
  } | {
    full_name: string | null
  }[] | null
}

type CustomerMembership = {
  id: string
  business_id: string
  customer_id: string
  membership_name: string
  status: string | null
  billing_interval: string | null
  monthly_amount: number | null
  included_sessions: number | null
  sessions_used: number | null
  current_period_start: string | null
  current_period_end: string | null
  stripe_subscription_id: string | null
  created_at: string | null
}

function joinOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] || null
  return value
}

function money(value: number | string | null | undefined) {
  return `£${Number(value || 0).toFixed(2)}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatLongDate(value?: string | null) {
  if (!value) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function customerName(customer: Customer | null) {
  if (!customer) return ''
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
}

function serviceName(item: Booking | WaitingListEntry) {
  const service = joinOne(item.services)
  return service?.name || 'Service'
}

function staffName(item: Booking | WaitingListEntry) {
  const staff = joinOne(item.team_members)
  return staff?.full_name || 'Any staff'
}

function packageName(customerPackage: CustomerPackage) {
  const pack = joinOne(customerPackage.packages)
  return pack?.name || pack?.package_name || 'Package'
}

function sessionsRemaining(customerPackage: CustomerPackage) {
  return Number(customerPackage.sessions_remaining ?? 0)
}

function sessionsUsed(customerPackage: CustomerPackage) {
  return Number(customerPackage.sessions_used ?? 0)
}

function sessionsPurchased(customerPackage: CustomerPackage) {
  return Number(customerPackage.sessions_purchased ?? 0)
}

function voucherCode(voucher: GiftVoucher) {
  return voucher.code || voucher.id.slice(0, 8).toUpperCase()
}

function voucherBalance(voucher: GiftVoucher) {
  return Number(voucher.remaining_amount ?? voucher.amount ?? 0)
}

function statusPill(status?: string | null) {
  if (status === 'confirmed' || status === 'active' || status === 'claimed' || status === 'paid') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
  }

  if (status === 'cancelled' || status === 'expired' || status === 'redeemed') {
    return 'border-red-500/20 bg-red-500/10 text-red-300'
  }

  if (status === 'pending' || status === 'notified' || status === 'open') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-300'
  }

  return 'border-slate-500/20 bg-slate-500/10 text-slate-300'
}

function primaryButtonClass() {
  return 'rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50 disabled:hover:bg-cyan-400'
}

function secondaryButtonClass() {
  return 'rounded-2xl border border-white/10 px-5 py-4 font-black text-white hover:bg-white/10'
}

export default function CustomerPortalPage() {
  const params = useParams()
  const slug = String(params.slug || '')

  const [business, setBusiness] = useState<Business | null>(null)
  const [email, setEmail] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)

  const [bookings, setBookings] = useState<Booking[]>([])
  const [packages, setPackages] = useState<CustomerPackage[]>([])
  const [vouchers, setVouchers] = useState<GiftVoucher[]>([])
  const [waitlist, setWaitlist] = useState<WaitingListEntry[]>([])
  const [memberships, setMemberships] = useState<CustomerMembership[]>([])
  const [services, setServices] = useState<ServiceOption[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([])

  const [activeTab, setActiveTab] = useState<'home' | 'bookings' | 'packages' | 'memberships' | 'vouchers' | 'waitlist' | 'payments' | 'profile'>('home')
  const [message, setMessage] = useState('')
  const [loadingBusiness, setLoadingBusiness] = useState(true)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [codeRequested, setCodeRequested] = useState(false)

  const [rescheduleBookingId, setRescheduleBookingId] = useState('')
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  const [cancelBookingId, setCancelBookingId] = useState('')
  const [cancelReason, setCancelReason] = useState('Can’t attend')
  const [cancelNotes, setCancelNotes] = useState('')

  const [waitlistServiceId, setWaitlistServiceId] = useState('')
  const [waitlistStaffId, setWaitlistStaffId] = useState('any')
  const [waitlistDate, setWaitlistDate] = useState(new Date().toISOString().slice(0, 10))
  const [waitlistTime, setWaitlistTime] = useState('Any time')
  const [waitlistNotes, setWaitlistNotes] = useState('')

  const [profileFirstName, setProfileFirstName] = useState('')
  const [profileLastName, setProfileLastName] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [emailReminders, setEmailReminders] = useState(true)
  const [smsReminders, setSmsReminders] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)

  useEffect(() => {
    loadBusiness()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  useEffect(() => {
    if (!customer) return

    setProfileFirstName(customer.first_name || '')
    setProfileLastName(customer.last_name || '')
    setProfilePhone(customer.phone || '')
    setEmailReminders(customer.email_reminders ?? true)
    setSmsReminders(Boolean(customer.sms_reminders))
    setMarketingOptIn(Boolean(customer.marketing_opt_in))
  }, [customer])

  async function loadBusiness() {
    setLoadingBusiness(true)
    setMessage('')

    const { data, error } = await supabase
      .from('businesses')
      .select('id,business_name,slug,logo_url,primary_colour,secondary_colour')
      .eq('slug', slug)
      .maybeSingle()

    if (error || !data) {
      setMessage(error?.message || 'Customer portal not found.')
      setLoadingBusiness(false)
      return
    }

    setBusiness(data as Business)
    setLoadingBusiness(false)
  }

  async function requestAccessCode() {
    setMessage('')

    if (!business) {
      setMessage('Business not loaded yet.')
      return
    }

    if (!email.trim()) {
      setMessage('Enter your email address.')
      return
    }

    setLoadingPortal(true)

    const response = await fetch('/api/customer-portal/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id, email: email.trim() }),
    })

    const result = await response.json().catch(() => null)

    setLoadingPortal(false)

    if (!response.ok) {
      setMessage(result?.error || 'Could not send access code.')
      return
    }

    setCodeRequested(true)
    setAccessCode('')
    setMessage('Access code sent. Check your email.')
  }

  function resetAccess() {
    setCustomer(null)
    setCodeRequested(false)
    setAccessCode('')
    setEmail('')
    setMessage('Enter your email to request a new access code.')
  }

  async function verifyAccessCode() {
    setMessage('')

    if (!business) {
      setMessage('Business not loaded yet.')
      return
    }

    if (!email.trim() || !accessCode.trim()) {
      setMessage('Enter your email and access code.')
      return
    }

    setLoadingPortal(true)

    const response = await fetch('/api/customer-portal/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id, email: email.trim(), code: accessCode.trim() }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.customer) {
      setLoadingPortal(false)
      setMessage(result?.error || 'That access code is not correct.')
      return
    }

    await loadPortal(result.customer as Customer)
  }

  async function loadPortal(loadedCustomer: Customer) {
    if (!business) return

    setLoadingPortal(true)
    setCustomer(loadedCustomer)

    const customerEmail = loadedCustomer.email || email.trim()

    const [bookingResult, packageResult, voucherResult, waitlistResult, membershipResult, servicesResult, teamResult] = await Promise.all([
      supabase
        .from('bookings')
        .select(`
          id,
          business_id,
          customer_id,
          service_id,
          team_member_id,
          booking_date,
          booking_time,
          status,
          notes,
          total_price,
          total_duration_minutes,
          payment_status,
          amount_paid,
          amount_due,
          services(name,price,duration_minutes),
          team_members(full_name)
        `)
        .eq('business_id', business.id)
        .eq('customer_id', loadedCustomer.id)
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false }),
      supabase
        .from('customer_packages')
        .select('*, packages(*)')
        .eq('business_id', business.id)
        .eq('customer_id', loadedCustomer.id)
        .order('purchase_date', { ascending: false }),
      supabase
        .from('gift_vouchers')
        .select('*')
        .eq('business_id', business.id)
        .or(`recipient_email.ilike.${customerEmail},purchaser_email.ilike.${customerEmail}`)
        .order('created_at', { ascending: false }),
      supabase
        .from('waiting_list')
        .select('*, services(name), team_members(full_name)')
        .eq('business_id', business.id)
        .eq('customer_id', loadedCustomer.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('customer_memberships')
        .select('*')
        .eq('business_id', business.id)
        .eq('customer_id', loadedCustomer.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('services')
        .select('id,name,price,duration_minutes')
        .eq('business_id', business.id)
        .order('name'),
      supabase
        .from('team_members')
        .select('id,full_name')
        .eq('business_id', business.id)
        .order('full_name'),
    ])

    if (
      bookingResult.error ||
      packageResult.error ||
      voucherResult.error ||
      waitlistResult.error ||
      membershipResult.error ||
      servicesResult.error ||
      teamResult.error
    ) {
      setMessage(
        bookingResult.error?.message ||
          packageResult.error?.message ||
          voucherResult.error?.message ||
          waitlistResult.error?.message ||
          membershipResult.error?.message ||
          servicesResult.error?.message ||
          teamResult.error?.message ||
          'Could not load customer portal.'
      )
      setLoadingPortal(false)
      return
    }

    setBookings((bookingResult.data as unknown as Booking[]) || [])
    setPackages((packageResult.data as unknown as CustomerPackage[]) || [])
    setVouchers((voucherResult.data as unknown as GiftVoucher[]) || [])
    setWaitlist((waitlistResult.data as unknown as WaitingListEntry[]) || [])
    setMemberships((membershipResult.data as CustomerMembership[]) || [])
    setServices((servicesResult.data as ServiceOption[]) || [])
    setTeamMembers((teamResult.data as TeamMemberOption[]) || [])
    setLoadingPortal(false)
    setActiveTab('home')
    setMessage('')
  }

  async function cancelBooking() {
    if (!cancelBookingId) {
      setMessage('Choose a booking to cancel.')
      return
    }

    setMessage('')

    const noteText = `Customer cancelled via portal. Reason: ${cancelReason}${cancelNotes ? `. Notes: ${cancelNotes}` : ''}`

    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        notes: noteText,
      })
      .eq('id', cancelBookingId)

    if (error) {
      setMessage(error.message)
      return
    }

    await fetch('/api/customer-portal/booking-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: cancelBookingId, type: 'cancelled' }),
    }).catch(() => null)

    setBookings((current) =>
      current.map((booking) =>
        booking.id === cancelBookingId ? { ...booking, status: 'cancelled', notes: noteText } : booking
      )
    )
    setCancelBookingId('')
    setCancelReason('Can’t attend')
    setCancelNotes('')
    setMessage('Booking cancelled.')
  }

  async function canRescheduleToSlot(booking: Booking, date: string, time: string) {
    if (!business) return false

    setCheckingAvailability(true)

    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('business_id', business.id)
      .eq('booking_date', date)
      .eq('booking_time', time)
      .neq('id', booking.id)
      .neq('status', 'cancelled')
      .limit(1)

    setCheckingAvailability(false)

    if (error) {
      setMessage(error.message)
      return false
    }

    if (data && data.length > 0) {
      setMessage('That slot already has a booking. Choose another time.')
      return false
    }

    return true
  }

  async function rescheduleBooking() {
    if (!rescheduleBookingId || !rescheduleDate || !rescheduleTime) {
      setMessage('Choose a booking, date and time.')
      return
    }

    const booking = bookings.find((item) => item.id === rescheduleBookingId)
    if (!booking) {
      setMessage('Booking not found.')
      return
    }

    setMessage('')

    const available = await canRescheduleToSlot(booking, rescheduleDate, rescheduleTime)
    if (!available) return

    const { error } = await supabase
      .from('bookings')
      .update({
        booking_date: rescheduleDate,
        booking_time: rescheduleTime,
        notes: 'Customer rescheduled via portal.',
      })
      .eq('id', rescheduleBookingId)

    if (error) {
      setMessage(error.message)
      return
    }

    await fetch('/api/customer-portal/booking-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: rescheduleBookingId, type: 'rescheduled' }),
    }).catch(() => null)

    setBookings((current) =>
      current.map((item) =>
        item.id === rescheduleBookingId
          ? { ...item, booking_date: rescheduleDate, booking_time: rescheduleTime }
          : item
      )
    )

    setRescheduleBookingId('')
    setRescheduleDate('')
    setRescheduleTime('')
    setMessage('Booking rescheduled.')
  }

  async function rebookService(booking: Booking) {
    setActiveTab('waitlist')
    setWaitlistServiceId(booking.service_id || '')
    setWaitlistStaffId(booking.team_member_id || 'any')
    setWaitlistDate(new Date().toISOString().slice(0, 10))
    setWaitlistTime('Any time')
    setWaitlistNotes(`Rebook request based on previous booking from ${formatDate(booking.booking_date)}.`)
    setMessage('Choose a date and join the waitlist or request a similar slot.')
  }

  async function joinWaitlist() {
    if (!business || !customer) return

    if (!waitlistServiceId) {
      setMessage('Choose a service.')
      return
    }

    setMessage('')

    const { data, error } = await supabase
      .from('waiting_list')
      .insert({
        business_id: business.id,
        customer_id: customer.id,
        service_id: waitlistServiceId,
        team_member_id: waitlistStaffId === 'any' ? null : waitlistStaffId,
        preferred_date: waitlistDate,
        preferred_time_range: waitlistTime,
        status: 'open',
        notification_batch: 0,
        notes: waitlistNotes || null,
      })
      .select('*, services(name), team_members(full_name)')
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setWaitlist((current) => [data as unknown as WaitingListEntry, ...current])
    setWaitlistServiceId('')
    setWaitlistStaffId('any')
    setWaitlistTime('Any time')
    setWaitlistNotes('')
    setMessage('Waitlist request added.')
  }

  async function cancelWaitlistEntry(entryId: string) {
    if (!confirm('Cancel this waitlist request?')) return

    setMessage('')

    const { error } = await supabase
      .from('waiting_list')
      .update({ status: 'cancelled' })
      .eq('id', entryId)

    if (error) {
      setMessage(error.message)
      return
    }

    setWaitlist((current) =>
      current.map((entry) => (entry.id === entryId ? { ...entry, status: 'cancelled' } : entry))
    )
    setMessage('Waitlist request cancelled.')
  }

  async function saveProfile() {
    if (!customer) return

    setMessage('')

    const patch = {
      first_name: profileFirstName.trim(),
      last_name: profileLastName.trim() || null,
      phone: profilePhone.trim() || null,
      email_reminders: emailReminders,
      sms_reminders: smsReminders,
      marketing_opt_in: marketingOptIn,
    }

    const { error } = await supabase
      .from('customers')
      .update(patch)
      .eq('id', customer.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setCustomer({ ...customer, ...patch })
    setMessage('Profile updated.')
  }

  const upcomingBookings = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return bookings
      .filter((booking) => booking.status !== 'cancelled' && booking.booking_date >= today)
      .sort((a, b) => `${a.booking_date} ${a.booking_time}`.localeCompare(`${b.booking_date} ${b.booking_time}`))
  }, [bookings])

  const pastBookings = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return bookings
      .filter((booking) => booking.booking_date < today || booking.status === 'cancelled')
      .sort((a, b) => `${b.booking_date} ${b.booking_time}`.localeCompare(`${a.booking_date} ${a.booking_time}`))
  }, [bookings])

  const nextBooking = upcomingBookings[0] || null
  const activePackage = packages.find((item) => item.status !== 'expired' && sessionsRemaining(item) > 0) || null
  const activeMembership = memberships.find((item) => item.status === 'active') || null
  const activeWaitlist = waitlist.find((entry) => entry.status !== 'cancelled' && entry.status !== 'claimed') || null
  const totalVoucherBalance = vouchers.reduce((sum, voucher) => sum + voucherBalance(voucher), 0)
  const paidTotal = bookings.reduce((sum, booking) => sum + Number(booking.amount_paid || 0), 0)
  const outstandingTotal = bookings.reduce((sum, booking) => sum + Number(booking.amount_due || 0), 0)

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {business?.logo_url ? (
                <img src={business.logo_url} alt={business.business_name || 'Business logo'} className="h-14 w-14 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-xl font-black text-slate-950">
                  {(business?.business_name || 'B').slice(0, 1)}
                </div>
              )}

              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-300">Customer portal V5</p>
                <h1 className="mt-1 text-2xl font-black md:text-3xl">
                  {business?.business_name ? `${business.business_name} Account Centre` : 'Your account centre'}
                </h1>
              </div>
            </div>

            {customer && (
              <div className="flex flex-col gap-3 md:items-end">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 md:text-right">
                  <p className="text-sm text-slate-400">Signed in as</p>
                  <p className="font-black">{customerName(customer)}</p>
                </div>

                <button type="button" onClick={resetAccess} className="rounded-xl border border-white/10 px-3 py-2 text-sm font-black text-slate-300 hover:bg-white/10">
                  Use different email
                </button>
              </div>
            )}
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
            {message}
          </div>
        )}

        {loadingBusiness && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-slate-400">
            Loading portal...
          </div>
        )}

        {!loadingBusiness && !customer && (
          <section className="mx-auto max-w-xl rounded-[32px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
            <h2 className="text-3xl font-black">Access your account</h2>
            <p className="mt-3 text-slate-400">
              Enter the email address you use with {business?.business_name || 'this business'}.
            </p>

            <div className="mt-6 space-y-4">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white placeholder:text-slate-500 outline-none"
              />

              <button type="button" disabled={loadingPortal} onClick={requestAccessCode} className={`w-full ${primaryButtonClass()}`}>
                {loadingPortal ? 'Checking...' : codeRequested ? 'Send new access code' : 'Send access code'}
              </button>

              {codeRequested && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-300">Access code</span>
                    <input
                      value={accessCode}
                      onChange={(event) => setAccessCode(event.target.value)}
                      placeholder="Enter 6-digit code"
                      inputMode="numeric"
                      className="w-full rounded-2xl border border-white/10 bg-white px-4 py-4 text-slate-950 placeholder:text-slate-500 outline-none"
                    />
                  </label>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <button type="button" disabled={loadingPortal} onClick={verifyAccessCode} className={primaryButtonClass()}>
                      Verify and continue
                    </button>

                    <button type="button" disabled={loadingPortal} onClick={requestAccessCode} className={secondaryButtonClass()}>
                      Send new code
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {customer && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Kpi title="Upcoming" value={String(upcomingBookings.length)} />
              <Kpi title="Packages" value={String(packages.length)} />
              <Kpi title="Memberships" value={String(memberships.length)} />
              <Kpi title="Vouchers" value={money(totalVoucherBalance)} />
              <Kpi title="Waitlist" value={String(waitlist.filter((entry) => entry.status !== 'cancelled' && entry.status !== 'claimed').length)} />
            </section>

            <section className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
              <div className="grid gap-4 lg:grid-cols-5">
                <MiniSummary label="Next booking" value={nextBooking ? `${serviceName(nextBooking)} · ${formatDate(nextBooking.booking_date)}` : 'None booked'} />
                <MiniSummary label="Active package" value={activePackage ? `${packageName(activePackage)} · ${sessionsRemaining(activePackage)} left` : 'None active'} />
                <MiniSummary label="Membership" value={activeMembership ? activeMembership.membership_name : 'None active'} />
                <MiniSummary label="Voucher balance" value={money(totalVoucherBalance)} />
                <MiniSummary label="Outstanding" value={money(outstandingTotal)} />
              </div>
            </section>

            <section className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-200">Waitlist</p>
                  <h2 className="mt-1 text-2xl font-black">Need a slot that is not available?</h2>
                  <p className="mt-1 text-slate-300">Join the waitlist for a service, date and preferred time.</p>
                </div>

                <button type="button" onClick={() => setActiveTab('waitlist')} className={primaryButtonClass()}>
                  Join waitlist
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap gap-2">
                {[
                  ['home', 'Home'],
                  ['bookings', 'Bookings'],
                  ['packages', 'Packages'],
                  ['memberships', 'Memberships'],
                  ['vouchers', 'Gift vouchers'],
                  ['waitlist', 'Waitlist'],
                  ['payments', 'Payments'],
                  ['profile', 'Profile'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key as typeof activeTab)}
                    className={`rounded-2xl px-4 py-3 text-sm font-black ${
                      activeTab === key ? 'bg-white text-slate-950' : 'border border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {activeTab === 'home' && (
              <section className="grid gap-6 lg:grid-cols-2">
                <Panel title="Next booking">
                  {nextBooking ? (
                    <BookingCard
                      booking={nextBooking}
                      onCancel={() => {
                        setCancelBookingId(nextBooking.id)
                        setActiveTab('bookings')
                      }}
                      onReschedule={() => {
                        setRescheduleBookingId(nextBooking.id)
                        setRescheduleDate(nextBooking.booking_date)
                        setRescheduleTime(String(nextBooking.booking_time).slice(0, 5))
                        setActiveTab('bookings')
                      }}
                    />
                  ) : (
                    <EmptyState message="No upcoming booking." />
                  )}
                </Panel>

                <Panel title="Account overview">
                  <div className="grid gap-3">
                    <ProfileRow label="Active package" value={activePackage ? packageName(activePackage) : 'None'} />
                    <ProfileRow label="Active membership" value={activeMembership ? activeMembership.membership_name : 'None'} />
                    <ProfileRow label="Voucher balance" value={money(totalVoucherBalance)} />
                    <ProfileRow label="Outstanding balance" value={money(outstandingTotal)} />
                  </div>
                </Panel>
              </section>
            )}

            {activeTab === 'bookings' && (
              <section className="grid gap-6 lg:grid-cols-2">
                <Panel title="Upcoming bookings">
                  <div className="space-y-3">
                    {upcomingBookings.map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        onCancel={() => setCancelBookingId(booking.id)}
                        onReschedule={() => {
                          setRescheduleBookingId(booking.id)
                          setRescheduleDate(booking.booking_date)
                          setRescheduleTime(String(booking.booking_time).slice(0, 5))
                        }}
                      />
                    ))}
                    {upcomingBookings.length === 0 && <EmptyState message="No upcoming bookings." />}
                  </div>
                </Panel>

                <Panel title="Change booking">
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="mb-3 font-black">Reschedule</p>
                      <div className="space-y-3">
                        <select value={rescheduleBookingId} onChange={(event) => setRescheduleBookingId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                          <option value="">Choose booking</option>
                          {upcomingBookings.map((booking) => (
                            <option key={booking.id} value={booking.id}>
                              {serviceName(booking)} · {formatDate(booking.booking_date)} · {String(booking.booking_time).slice(0, 5)}
                            </option>
                          ))}
                        </select>

                        <div className="grid gap-3 md:grid-cols-2">
                          <input type="date" value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                          <input type="time" value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                        </div>

                        <button type="button" disabled={checkingAvailability} onClick={rescheduleBooking} className={`w-full ${primaryButtonClass()}`}>
                          {checkingAvailability ? 'Checking availability...' : 'Save new time'}
                        </button>

                        <p className="text-sm text-slate-500">
                          V5 blocks exact clashes before saving. V6 should use the full availability engine.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="mb-3 font-black">Cancel</p>
                      <div className="space-y-3">
                        <select value={cancelBookingId} onChange={(event) => setCancelBookingId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                          <option value="">Choose booking</option>
                          {upcomingBookings.map((booking) => (
                            <option key={booking.id} value={booking.id}>
                              {serviceName(booking)} · {formatDate(booking.booking_date)} · {String(booking.booking_time).slice(0, 5)}
                            </option>
                          ))}
                        </select>

                        <select value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                          <option>Can’t attend</option>
                          <option>Booked wrong time</option>
                          <option>No longer needed</option>
                          <option>Other</option>
                        </select>

                        <textarea value={cancelNotes} onChange={(event) => setCancelNotes(event.target.value)} placeholder="Optional notes" className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />

                        <button type="button" onClick={cancelBooking} className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 font-black text-red-300 hover:bg-red-500/20">
                          Cancel booking
                        </button>
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel title="Past bookings">
                  <div className="space-y-3">
                    {pastBookings.slice(0, 10).map((booking) => (
                      <BookingCard key={booking.id} booking={booking} onRebook={() => rebookService(booking)} />
                    ))}
                    {pastBookings.length === 0 && <EmptyState message="No past bookings." />}
                  </div>
                </Panel>
              </section>
            )}

            {activeTab === 'packages' && (
              <Panel title="Packages">
                <div className="grid gap-3 md:grid-cols-2">
                  {packages.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <p className="text-lg font-black">{packageName(item)}</p>
                      <p className="mt-2 text-slate-400">
                        {sessionsRemaining(item)} remaining · {sessionsUsed(item)} used · {sessionsPurchased(item)} purchased
                      </p>
                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-cyan-300" style={{ width: `${sessionsPurchased(item) > 0 ? Math.min(100, (sessionsRemaining(item) / sessionsPurchased(item)) * 100) : 0}%` }} />
                      </div>
                      <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                        {item.status || 'active'} · bought {formatDate(item.purchase_date)} · expires {formatDate(item.expiry_date)}
                      </p>
                    </div>
                  ))}
                  {packages.length === 0 && <EmptyState message="No packages found." />}
                </div>
              </Panel>
            )}

            {activeTab === 'memberships' && (
              <Panel title="Memberships">
                <div className="space-y-3">
                  {memberships.map((membership) => (
                    <div key={membership.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <p className="text-lg font-black">{membership.membership_name}</p>
                      <p className="mt-1 text-slate-400">
                        {money(membership.monthly_amount)} · {membership.billing_interval || 'monthly'}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {Number(membership.included_sessions || 0) - Number(membership.sessions_used || 0)} of {membership.included_sessions || 0} sessions remaining this period
                      </p>
                      <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                        {membership.status || 'active'} · renews {formatDate(membership.current_period_end)}
                      </p>
                    </div>
                  ))}
                  {memberships.length === 0 && <EmptyState message="No active memberships yet." />}
                </div>
              </Panel>
            )}

            {activeTab === 'vouchers' && (
              <Panel title="Gift vouchers">
                <div className="grid gap-3 md:grid-cols-2">
                  {vouchers.map((voucher) => (
                    <div key={voucher.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <p className="font-mono text-lg font-black text-cyan-300">{voucherCode(voucher)}</p>
                      <p className="mt-2 text-slate-400">
                        Balance: <span className="font-black text-white">{money(voucherBalance(voucher))}</span>
                      </p>
                      <p className="text-sm text-slate-500">Original value: {money(voucher.amount)}</p>
                      {voucher.recipient_name && <p className="mt-1 text-sm text-slate-500">For {voucher.recipient_name}</p>}
                      {voucher.purchaser_name && <p className="mt-1 text-sm text-slate-500">Purchased by {voucher.purchaser_name}</p>}
                      <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-center font-mono text-sm text-slate-400">
                        QR code placeholder · {voucherCode(voucher)}
                      </div>
                      <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                        {voucher.status || 'active'} · expires {formatDate(voucher.expiry_date)}
                      </p>
                    </div>
                  ))}
                  {vouchers.length === 0 && <EmptyState message="No gift vouchers found." />}
                </div>
              </Panel>
            )}

            {activeTab === 'waitlist' && (
              <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <Panel title="Join waitlist">
                  <div className="space-y-4">
                    <select value={waitlistServiceId} onChange={(event) => setWaitlistServiceId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                      <option value="">Choose service</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>{service.name}</option>
                      ))}
                    </select>

                    <select value={waitlistStaffId} onChange={(event) => setWaitlistStaffId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                      <option value="any">Any staff</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>{member.full_name}</option>
                      ))}
                    </select>

                    <div className="grid gap-4 md:grid-cols-2">
                      <input type="date" value={waitlistDate} onChange={(event) => setWaitlistDate(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                      <select value={waitlistTime} onChange={(event) => setWaitlistTime(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                        <option>Any time</option>
                        <option>Morning</option>
                        <option>Afternoon</option>
                        <option>Evening</option>
                        <option>ASAP</option>
                      </select>
                    </div>

                    <textarea value={waitlistNotes} onChange={(event) => setWaitlistNotes(event.target.value)} placeholder="Optional notes" className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />

                    <button type="button" onClick={joinWaitlist} className={`w-full ${primaryButtonClass()}`}>
                      Join waitlist
                    </button>
                  </div>
                </Panel>

                <Panel title="Your waitlist requests">
                  <div className="space-y-3">
                    {waitlist.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <p className="text-lg font-black">{serviceName(entry)}</p>
                        <p className="mt-1 text-slate-400">
                          {formatDate(entry.preferred_date)} · {entry.preferred_time_range || 'Any time'} · {staffName(entry)}
                        </p>
                        {entry.notes && <p className="mt-3 text-sm text-slate-500">{entry.notes}</p>}

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${statusPill(entry.status)}`}>
                            {entry.status || 'open'}
                          </span>

                          {entry.status !== 'cancelled' && entry.status !== 'claimed' && (
                            <button type="button" onClick={() => cancelWaitlistEntry(entry.id)} className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300 hover:bg-red-500/20">
                              Cancel waitlist request
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {waitlist.length === 0 && <EmptyState message="No waitlist entries." />}
                  </div>
                </Panel>
              </section>
            )}

            {activeTab === 'payments' && (
              <Panel title="Payment history">
                <div className="mb-5 grid gap-4 md:grid-cols-2">
                  <Kpi title="Paid" value={money(paidTotal)} />
                  <Kpi title="Outstanding" value={money(outstandingTotal)} />
                </div>

                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-black">{serviceName(booking)}</p>
                          <p className="text-sm text-slate-400">{formatLongDate(booking.booking_date)}</p>
                        </div>
                        <div className="md:text-right">
                          <p className="font-black">{money(booking.total_price)}</p>
                          <p className="text-sm text-slate-500">
                            Paid {money(booking.amount_paid)} · Due {money(booking.amount_due)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {bookings.length === 0 && <EmptyState message="No payment history found." />}
                </div>
              </Panel>
            )}

            {activeTab === 'profile' && (
              <Panel title="Profile and preferences">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-400">First name</span>
                    <input value={profileFirstName} onChange={(event) => setProfileFirstName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-400">Last name</span>
                    <input value={profileLastName} onChange={(event) => setProfileLastName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                  </label>

                  <ProfileRow label="Email" value={customer.email || '—'} />

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-400">Phone</span>
                    <input value={profilePhone} onChange={(event) => setProfilePhone(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />
                  </label>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <PreferenceToggle label="Email reminders" checked={emailReminders} setChecked={setEmailReminders} />
                  <PreferenceToggle label="SMS reminders" checked={smsReminders} setChecked={setSmsReminders} />
                  <PreferenceToggle label="Offers and updates" checked={marketingOptIn} setChecked={setMarketingOptIn} />
                </div>

                <button type="button" onClick={saveProfile} className={`mt-6 ${primaryButtonClass()}`}>
                  Save profile
                </button>
              </Panel>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  )
}

function MiniSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">{label}</p>
      <p className="mt-2 text-sm font-black text-white">{value}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
      <h2 className="mb-5 text-2xl font-black">{title}</h2>
      {children}
    </section>
  )
}

function BookingCard({
  booking,
  onCancel,
  onReschedule,
  onRebook,
}: {
  booking: Booking
  onCancel?: () => void
  onReschedule?: () => void
  onRebook?: () => void
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-lg font-black">{serviceName(booking)}</p>
          <p className="mt-1 text-slate-400">
            {formatDate(booking.booking_date)} at {String(booking.booking_time).slice(0, 5)}
          </p>
          <p className="mt-1 text-sm text-slate-500">{staffName(booking)}</p>
        </div>

        <div className="md:text-right">
          <p className="font-black">{money(booking.total_price)}</p>
          <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${statusPill(booking.status)}`}>
            {booking.status || 'confirmed'}
          </span>
        </div>
      </div>

      {(onCancel || onReschedule || onRebook) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {onReschedule && (
            <button type="button" onClick={onReschedule} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300/20">
              Reschedule
            </button>
          )}

          {onRebook && (
            <button type="button" onClick={onRebook} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10">
              Book this again
            </button>
          )}

          {onCancel && (
            <button type="button" onClick={onCancel} className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 hover:bg-red-500/20">
              Cancel booking
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 font-black">{value}</p>
    </div>
  )
}

function PreferenceToggle({
  label,
  checked,
  setChecked,
}: {
  label: string
  checked: boolean
  setChecked: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => setChecked(!checked)}
      className={`rounded-2xl border p-5 text-left ${
        checked ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-black/20 text-slate-400'
      }`}
    >
      <p className="font-black">{label}</p>
      <p className="mt-1 text-sm">{checked ? 'Enabled' : 'Disabled'}</p>
    </button>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-slate-500">
      {message}
    </div>
  )
}
