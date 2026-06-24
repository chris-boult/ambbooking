'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import QRCode from 'react-qr-code'

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
  stripe_customer_id?: string | null
  membership_plan_id?: string | null
  created_at: string | null
}

type MembershipBenefit = {
  id: string
  business_id: string
  membership_plan_id: string
  benefit: string
  display_order: number | null
  created_at?: string | null
}

type MembershipUsage = {
  id: string
  business_id: string
  customer_membership_id: string
  customer_id: string | null
  booking_id: string | null
  sessions_used: number | null
  notes: string | null
  created_at: string | null
  usage_date: string | null
  usage_type: string | null
  benefit_name: string | null
  quantity: number | null
  created_by: string | null
}

type CustomerReferral = {
  id: string
  business_id: string
  customer_id: string
  referral_code: string
  friend_email: string | null
  status: string | null
  reward_amount: number | null
  created_at: string | null
}

type CustomerReview = {
  id: string
  business_id: string
  customer_id: string
  booking_id: string | null
  rating: number | null
  review_text: string | null
  status: string | null
  created_at: string | null
}

type CustomerDocument = {
  id: string
  business_id: string
  customer_id: string | null
  title: string
  file_url: string
  category: string | null
  created_at: string | null
}

type CustomerLoyalty = {
  id: string
  business_id: string
  customer_id: string
  visits_required: number | null
  visits_completed: number | null
  reward_label: string | null
  status: string | null
  created_at: string | null
}

type CustomerNotification = {
  id: string
  business_id: string
  customer_id: string
  title: string
  message: string
  notification_type: string | null
  read: boolean | null
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

function membershipSessionsRemaining(membership: CustomerMembership) {
  return Math.max(0, Number(membership.included_sessions || 0) - Number(membership.sessions_used || 0))
}

function membershipUtilisation(membership: CustomerMembership) {
  const included = Number(membership.included_sessions || 0)
  const used = Number(membership.sessions_used || 0)
  if (included <= 0) return 0
  return Math.min(100, Math.round((used / included) * 100))
}

function customerInitials(customer: Customer | null) {
  if (!customer) return 'M'
  const first = customer.first_name?.slice(0, 1) || ''
  const last = customer.last_name?.slice(0, 1) || ''
  return `${first}${last}`.trim() || 'M'
}

function generateReferralCode(customer: Customer, business: Business) {
  const name = `${customer.first_name || 'MEMBER'}${customer.last_name || ''}`.replace(/[^a-z0-9]/gi, '').toUpperCase()
  const businessPrefix = (business.slug || business.business_name || 'AMB').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 4)
  const customerPrefix = name.slice(0, 6) || 'MEMBER'
  return `${businessPrefix}-${customerPrefix}`
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

const PORTAL_SESSION_KEY = 'amb_customer_portal_session'

type PortalSession = {
  customerId: string
  email: string | null
  businessId: string
  expires: number
}

function savePortalSession(customer: Customer, business: Business) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(
    PORTAL_SESSION_KEY,
    JSON.stringify({
      customerId: customer.id,
      email: customer.email,
      businessId: business.id,
      expires: Date.now() + 1000 * 60 * 60 * 24 * 30,
    })
  )
}

function clearPortalSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(PORTAL_SESSION_KEY)
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
  const [membershipBenefits, setMembershipBenefits] = useState<MembershipBenefit[]>([])
  const [membershipUsage, setMembershipUsage] = useState<MembershipUsage[]>([])
  const [referrals, setReferrals] = useState<CustomerReferral[]>([])
  const [reviews, setReviews] = useState<CustomerReview[]>([])
  const [documents, setDocuments] = useState<CustomerDocument[]>([])
  const [loyalty, setLoyalty] = useState<CustomerLoyalty | null>(null)
  const [notifications, setNotifications] = useState<CustomerNotification[]>([])
  const [services, setServices] = useState<ServiceOption[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([])

  const [activeTab, setActiveTab] = useState<
    | 'home'
    | 'bookings'
    | 'packages'
    | 'memberships'
    | 'vouchers'
    | 'waitlist'
    | 'payments'
    | 'referrals'
    | 'reviews'
    | 'documents'
    | 'loyalty'
    | 'wallet'
    | 'notifications'
    | 'discover'
    | 'timeline'
    | 'profile'
  >('home')
  const [message, setMessage] = useState('')
  const [loadingBusiness, setLoadingBusiness] = useState(true)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [codeRequested, setCodeRequested] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)

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

  const [portalLoadingAction, setPortalLoadingAction] = useState('')
  const [friendEmail, setFriendEmail] = useState('')
  const [reviewBookingId, setReviewBookingId] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')

  useEffect(() => {
    loadBusiness()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  useEffect(() => {
    if (!business || customer || sessionChecked) return

    restoreStoredSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, customer, sessionChecked])

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

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Business lookup timed out. Check Supabase connection.')), 8000)
  )

  try {
    const query = supabase
      .from('businesses')
      .select('id,business_name,slug,logo_url,primary_colour,secondary_colour')
      .eq('slug', slug)
      .maybeSingle()

    const { data, error } = await Promise.race([query, timeout]) as any

    if (error) {
      setMessage(error.message)
      return
    }

    if (!data) {
      setMessage(`No business found for slug: ${slug}`)
      return
    }

    setBusiness(data as Business)
  } catch (error: any) {
    console.error('Load business failed:', error)
    setMessage(error?.message || 'Could not load customer portal.')
  } finally {
    setLoadingBusiness(false)
  }
}

  async function restoreStoredSession() {
    if (!business || typeof window === 'undefined') {
      setSessionChecked(true)
      return
    }

    const rawSession = window.localStorage.getItem(PORTAL_SESSION_KEY)

    if (!rawSession) {
      setSessionChecked(true)
      return
    }

    try {
      const saved = JSON.parse(rawSession) as PortalSession

      if (!saved?.customerId || saved.businessId !== business.id || saved.expires < Date.now()) {
        clearPortalSession()
        setSessionChecked(true)
        return
      }

      const { data, error } = await supabase
        .from('customers')
        .select('id,business_id,first_name,last_name,email,phone,email_reminders,sms_reminders,marketing_opt_in')
        .eq('id', saved.customerId)
        .eq('business_id', business.id)
        .maybeSingle()

      if (error || !data) {
        clearPortalSession()
        setSessionChecked(true)
        return
      }

      await loadPortal(data as Customer)
    } catch {
      clearPortalSession()
    } finally {
      setSessionChecked(true)
    }
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
    clearPortalSession()
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

    savePortalSession(result.customer as Customer, business)
    await loadPortal(result.customer as Customer)
  }

  async function loadPortal(loadedCustomer: Customer) {
    if (!business) return

    setLoadingPortal(true)
    setCustomer(loadedCustomer)

    const customerEmail = loadedCustomer.email || email.trim()

    const [
      bookingResult,
      packageResult,
      voucherResult,
      waitlistResult,
      membershipResult,
      membershipBenefitResult,
      membershipUsageResult,
      referralResult,
      reviewResult,
      documentResult,
      loyaltyResult,
      servicesResult,
      teamResult,
      notificationResult,
    ] = await Promise.all([
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
        .from('membership_plan_benefits')
        .select('*')
        .eq('business_id', business.id)
        .order('display_order', { ascending: true }),
      supabase
        .from('membership_usage')
        .select('*')
        .eq('business_id', business.id)
        .eq('customer_id', loadedCustomer.id)
        .order('usage_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('customer_referrals')
        .select('*')
        .eq('business_id', business.id)
        .eq('customer_id', loadedCustomer.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('customer_reviews')
        .select('*')
        .eq('business_id', business.id)
        .eq('customer_id', loadedCustomer.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('customer_documents')
        .select('*')
        .eq('business_id', business.id)
        .or(`customer_id.eq.${loadedCustomer.id},customer_id.is.null`)
        .order('created_at', { ascending: false }),
      supabase
        .from('customer_loyalty')
        .select('*')
        .eq('business_id', business.id)
        .eq('customer_id', loadedCustomer.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
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
      supabase
        .from('customer_notifications')
        .select('*')
        .eq('business_id', business.id)
        .eq('customer_id', loadedCustomer.id)
        .order('created_at', { ascending: false }),
    ])

    if (
      bookingResult.error ||
      packageResult.error ||
      voucherResult.error ||
      waitlistResult.error ||
      membershipResult.error ||
      membershipBenefitResult.error ||
      membershipUsageResult.error ||
      referralResult.error ||
      reviewResult.error ||
      documentResult.error ||
      loyaltyResult.error ||
      servicesResult.error ||
      teamResult.error ||
      notificationResult.error
    ) {
      setMessage(
        bookingResult.error?.message ||
          packageResult.error?.message ||
          voucherResult.error?.message ||
          waitlistResult.error?.message ||
          membershipResult.error?.message ||
          membershipBenefitResult.error?.message ||
          membershipUsageResult.error?.message ||
          referralResult.error?.message ||
          reviewResult.error?.message ||
          documentResult.error?.message ||
          loyaltyResult.error?.message ||
          servicesResult.error?.message ||
          teamResult.error?.message ||
          notificationResult.error?.message ||
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
    setMembershipBenefits((membershipBenefitResult.data as MembershipBenefit[]) || [])
    setMembershipUsage((membershipUsageResult.data as MembershipUsage[]) || [])
    setReferrals((referralResult.data as CustomerReferral[]) || [])
    setReviews((reviewResult.data as CustomerReview[]) || [])
    setDocuments((documentResult.data as CustomerDocument[]) || [])
    setLoyalty((loyaltyResult.data as CustomerLoyalty) || null)
    setServices((servicesResult.data as ServiceOption[]) || [])
    setTeamMembers((teamResult.data as TeamMemberOption[]) || [])
    setNotifications((notificationResult.data as CustomerNotification[]) || [])
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

  async function openMembershipBilling(membership: CustomerMembership) {
    if (!membership.stripe_customer_id) {
      setMessage('This membership does not have online billing attached.')
      return
    }

    setPortalLoadingAction(`billing-${membership.id}`)
    setMessage('')

    const response = await fetch('/api/memberships/create-portal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stripeCustomerId: membership.stripe_customer_id,
        returnUrl: `${window.location.origin}/book/${slug}/portal`,
      }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.url) {
      setPortalLoadingAction('')
      setMessage(result?.error || 'Could not open billing portal.')
      return
    }

    window.location.href = result.url
  }


  async function createMembershipWalletPass(
    membership: CustomerMembership
  ) {
    if (!business || !customer) return

    setMessage('Creating wallet pass...')

    const response = await fetch('/api/memberships/wallet-pass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId: business.id,
        customerId: customer.id,
        membershipId: membership.id,
      }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.passUrl) {
      setMessage(result?.error || 'Could not create wallet pass.')
      return
    }

    window.open(result.passUrl, '_blank')
    setMessage('Digital membership pass opened.')
  }


  async function createLoyaltyWalletPass(
    loyaltyWallet: CustomerLoyalty
  ) {
    if (!business || !customer) return

    setMessage('Creating loyalty pass...')

    const response = await fetch('/api/loyalty/wallet-pass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId: business.id,
        customerId: customer.id,
        loyaltyId: loyaltyWallet.id,
      }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.passUrl) {
      setMessage(result?.error || 'Could not create loyalty pass.')
      return
    }

    window.open(result.passUrl, '_blank')
    setMessage('Digital loyalty pass opened.')
  }


  async function createVoucherWalletPass(voucher: GiftVoucher) {
    if (!business || !customer) return

    setMessage('Creating voucher pass...')

    const response = await fetch('/api/vouchers/wallet-pass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId: business.id,
        customerId: customer.id,
        voucherId: voucher.id,
      }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.passUrl) {
      setMessage(result?.error || 'Could not create voucher pass.')
      return
    }

    window.open(result.passUrl, '_blank')
    setMessage('Digital voucher pass opened.')
  }

  function bookAgain(booking: Booking) {
    const query = new URLSearchParams()
    if (booking.service_id) query.set('service', booking.service_id)
    if (booking.team_member_id) query.set('team', booking.team_member_id)
    window.location.href = `/book/${slug}${query.toString() ? `?${query.toString()}` : ''}`
  }

  function bookAppointment() {
    window.location.href = `/book/${slug}`
  }

  function rebookLastService() {
    const lastBooking = bookings[0]
    if (lastBooking) {
      bookAgain(lastBooking)
      return
    }

    bookAppointment()
  }

  function manageActiveMembership() {
    if (activeMembership?.stripe_customer_id) {
      openMembershipBilling(activeMembership)
      return
    }

    setActiveTab('memberships')
  }

  async function createReferral() {
    if (!business || !customer) return

    setMessage('')

    const referralCode = referrals[0]?.referral_code || generateReferralCode(customer, business)

    const { data, error } = await supabase
      .from('customer_referrals')
      .insert({
        business_id: business.id,
        customer_id: customer.id,
        referral_code: referralCode,
        friend_email: friendEmail.trim().toLowerCase() || null,
        reward_amount: 10,
        status: 'pending',
      })
      .select('*')
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setReferrals((current) => [data as CustomerReferral, ...current])
    setFriendEmail('')
    setMessage('Referral created.')
  }

  async function submitReview() {
    if (!business || !customer) return

    if (!reviewBookingId) {
      setMessage('Choose a completed booking to review.')
      return
    }

    setMessage('')

    const { data, error } = await supabase
      .from('customer_reviews')
      .insert({
        business_id: business.id,
        customer_id: customer.id,
        booking_id: reviewBookingId,
        rating: reviewRating,
        review_text: reviewText.trim() || null,
        status: 'submitted',
      })
      .select('*')
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setReviews((current) => [data as CustomerReview, ...current])
    setReviewBookingId('')
    setReviewRating(5)
    setReviewText('')
    setMessage('Review submitted. Thank you.')
  }

  async function createLoyaltyWallet() {
    if (!business || !customer) return

    setMessage('')

    const completedVisits = bookings.filter((booking) => booking.status === 'completed').length

    const { data, error } = await supabase
      .from('customer_loyalty')
      .insert({
        business_id: business.id,
        customer_id: customer.id,
        visits_required: 10,
        visits_completed: completedVisits,
        reward_label: 'Free appointment',
        status: 'active',
      })
      .select('*')
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setLoyalty(data as CustomerLoyalty)
    setMessage('Loyalty wallet activated.')
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
  const completedBookings = bookings.filter((booking) => booking.status === 'completed')
  const reviewableBookings = completedBookings.filter((booking) => !reviews.some((review) => review.booking_id === booking.id))
  const referralCode = customer && business ? referrals[0]?.referral_code || generateReferralCode(customer, business) : ''
  const loyaltyVisitsRequired = Number(loyalty?.visits_required || 10)
  const loyaltyVisitsCompleted = Number(loyalty?.visits_completed ?? completedBookings.length)
  const loyaltyProgress = loyaltyVisitsRequired > 0 ? Math.min(100, Math.round((loyaltyVisitsCompleted / loyaltyVisitsRequired) * 100)) : 0
  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length

  const timelineItems = [
    ...bookings.map((booking) => ({
      id: `booking-${booking.id}`,
      date: booking.booking_date,
      title: serviceName(booking),
      description: `${booking.status || 'confirmed'} booking at ${String(booking.booking_time).slice(0, 5)}`,
      type: 'Booking',
    })),
    ...packages.map((item) => ({
      id: `package-${item.id}`,
      date: item.purchase_date || item.expiry_date || '',
      title: packageName(item),
      description: `${sessionsRemaining(item)} sessions remaining`,
      type: 'Package',
    })),
    ...memberships.map((item) => ({
      id: `membership-${item.id}`,
      date: item.created_at || item.current_period_start || '',
      title: item.membership_name,
      description: `${item.status || 'active'} membership`,
      type: 'Membership',
    })),
    ...vouchers.map((item) => ({
      id: `voucher-${item.id}`,
      date: item.created_at || item.expiry_date || '',
      title: voucherCode(item),
      description: `${money(voucherBalance(item))} voucher balance`,
      type: 'Voucher',
    })),
    ...membershipUsage.map((item) => ({
      id: `usage-${item.id}`,
      date: item.usage_date || item.created_at || '',
      title: item.usage_type === 'benefit' ? item.benefit_name || 'Benefit used' : 'Membership session used',
      description: `${item.sessions_used || 0} sessions · ${item.notes || 'Usage recorded'}`,
      type: 'Usage',
    })),
  ].filter((item) => item.date).sort((a, b) => b.date.localeCompare(a.date))

  const recentActivity = timelineItems.slice(0, 5)
  const memberSince = activeMembership?.created_at || activeMembership?.current_period_start || null
  const nextBookingText = nextBooking
    ? `${serviceName(nextBooking)} on ${formatDate(nextBooking.booking_date)} at ${String(nextBooking.booking_time).slice(0, 5)}`
    : 'No upcoming booking yet.'

  return (
    <main className="min-h-screen bg-[#020617] px-4 pb-28 pt-8 text-white xl:pb-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl md:p-6 xl:block">
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
                <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-300">Customer portal V10</p>
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

                <button
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  className="relative rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-slate-300 hover:bg-white/10"
                >
                  Notifications
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-cyan-300 px-2 text-xs font-black text-slate-950">
                      {unreadNotificationCount}
                    </span>
                  )}
                </button>

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

        {(loadingBusiness || (business && !customer && !sessionChecked)) && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-slate-400">
            Loading portal...
          </div>
        )}

        {!loadingBusiness && sessionChecked && !customer && (
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
          <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
            <section className="space-y-4 xl:hidden">
              <div className="rounded-[32px] border border-cyan-300/20 bg-gradient-to-br from-cyan-300/20 via-white/[0.06] to-slate-950 p-5 shadow-2xl">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200">
                      {business?.business_name || 'Your account'}
                    </p>
                    <h2 className="mt-3 text-4xl font-black leading-tight">
                      Hi {customer.first_name}.
                    </h2>
                  </div>

                  {business?.logo_url ? (
                    <img src={business.logo_url} alt={business.business_name || 'Business logo'} className="h-16 w-16 shrink-0 rounded-3xl object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-cyan-300 text-2xl font-black text-slate-950">
                      {customerInitials(customer)}
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Next appointment</p>
                  <p className="mt-2 text-2xl font-black">{nextBooking ? serviceName(nextBooking) : 'Nothing booked'}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {nextBooking
                      ? `${formatDate(nextBooking.booking_date)} · ${String(nextBooking.booking_time).slice(0, 5)}`
                      : 'Book your next appointment when you are ready.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={bookAppointment}
                  className="mt-5 w-full rounded-3xl bg-cyan-300 px-6 py-5 text-lg font-black uppercase tracking-[0.12em] text-slate-950 shadow-xl shadow-cyan-950/30"
                >
                  Book now
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MobileActionTile title="Bookings" value={nextBooking ? 'Upcoming' : 'Book now'} onClick={() => setActiveTab('bookings')} />
                <MobileActionTile title="Wallet" value={money(totalVoucherBalance)} onClick={() => setActiveTab('wallet')} />
                <MobileActionTile title="Rewards" value={`${loyaltyProgress}%`} onClick={() => setActiveTab('loyalty')} />
                <MobileActionTile title="Alerts" value={unreadNotificationCount > 0 ? `${unreadNotificationCount} unread` : 'None'} onClick={() => setActiveTab('notifications')} />
              </div>
            </section>
            <aside className="hidden xl:sticky xl:top-8 xl:block xl:self-start">
              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
                <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Customer menu</p>
                  <p className="mt-2 font-black">{customerName(customer)}</p>
                  <p className="mt-1 text-xs text-slate-500">{customer.email}</p>
                </div>

                <nav className="space-y-2">
                  <NavGroup
                    title="Customer"
                    items={[
                      ['home', 'Overview'],
                      ['bookings', 'Bookings'],
                      ['memberships', 'Memberships'],
                      ['packages', 'Packages'],
                      ['vouchers', 'Gift vouchers'],
                      ['waitlist', 'Waitlist'],
                    ]}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                  />

                  <NavGroup
                    title="Account"
                    items={[
                      ['wallet', 'Wallet'],
                      ['payments', 'Payments'],
                      ['referrals', 'Referrals'],
                      ['reviews', 'Reviews'],
                      ['documents', 'Documents'],
                      ['loyalty', 'Loyalty'],
                      ['timeline', 'Timeline'],
                      ['notifications', 'Notifications'],
                      ['discover', 'Discover'],
                    ]}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                  />

                  <NavGroup
                    title="Settings"
                    items={[
                      ['profile', 'Profile'],
                    ]}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                  />
                </nav>

                <button
                  type="button"
                  onClick={resetAccess}
                  className="mt-4 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-slate-300 hover:bg-white/10"
                >
                  Use different email
                </button>
              </section>
            </aside>

            <div className="min-w-0 space-y-6">
              <section className="hidden gap-4 sm:grid-cols-2 xl:grid xl:grid-cols-5">
                <Kpi title="Next booking" value={nextBooking ? serviceName(nextBooking) : 'None'} />
                <Kpi title="Membership" value={activeMembership ? activeMembership.status || 'active' : 'None'} />
                <Kpi title="Sessions" value={String(activeMembership ? membershipSessionsRemaining(activeMembership) : activePackage ? sessionsRemaining(activePackage) : 0)} />
                <Kpi title="Vouchers" value={money(totalVoucherBalance)} />
                <Kpi title="Loyalty" value={`${loyaltyProgress}%`} />
              </section>

            <section className="hidden rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5 xl:block">
              <div className="grid gap-4 lg:grid-cols-5">
                <MiniSummary label="Next booking" value={nextBooking ? `${serviceName(nextBooking)} · ${formatDate(nextBooking.booking_date)}` : 'None booked'} />
                <MiniSummary label="Active package" value={activePackage ? `${packageName(activePackage)} · ${sessionsRemaining(activePackage)} left` : 'None active'} />
                <MiniSummary label="Membership" value={activeMembership ? activeMembership.membership_name : 'None active'} />
                <MiniSummary label="Voucher balance" value={money(totalVoucherBalance)} />
                <MiniSummary label="Outstanding" value={money(outstandingTotal)} />
              </div>
            </section>

            <section className="hidden rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5 xl:block">
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

            {activeTab === 'home' && (
              <div className="space-y-6">
                <section className="hidden rounded-[32px] border border-cyan-300/20 bg-cyan-300/10 p-6 md:p-8 xl:block">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-200">Overview</p>
                      <h2 className="mt-2 text-4xl font-black md:text-5xl">
                        Welcome back, {customer.first_name}.
                      </h2>
                      <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                        {nextBookingText}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button type="button" onClick={bookAppointment} className={primaryButtonClass()}>
                        Book appointment
                      </button>
                      <button type="button" onClick={manageActiveMembership} className={secondaryButtonClass()}>
                        Manage membership
                      </button>
                    </div>
                  </div>
                </section>

                <section className="hidden gap-4 md:grid md:grid-cols-4">
                  <HighlightCard title="Next appointment" value={nextBooking ? serviceName(nextBooking) : 'None booked'} helper={nextBooking ? `${formatDate(nextBooking.booking_date)} · ${String(nextBooking.booking_time).slice(0, 5)}` : 'Book when you are ready'} />
                  <HighlightCard title="Membership" value={activeMembership ? activeMembership.membership_name : 'None active'} helper={activeMembership ? `${membershipSessionsRemaining(activeMembership)} sessions remaining` : 'No current plan'} />
                  <HighlightCard title="Available sessions" value={activeMembership ? `${membershipSessionsRemaining(activeMembership)} / ${activeMembership.included_sessions || 0}` : activePackage ? `${sessionsRemaining(activePackage)} package sessions` : '0'} helper="Ready to use" />
                  <HighlightCard title="Outstanding" value={money(outstandingTotal)} helper="Current balance" />
                </section>

                <section className="grid gap-4 xl:hidden">
                  <button type="button" onClick={bookAppointment} className="rounded-[32px] bg-cyan-300 p-6 text-left text-slate-950 shadow-xl shadow-cyan-950/30">
                    <p className="text-xs font-black uppercase tracking-[0.22em] opacity-70">Primary action</p>
                    <p className="mt-3 text-3xl font-black">Book appointment</p>
                    <p className="mt-2 text-sm font-bold opacity-80">Choose a service, date and time.</p>
                  </button>

                  {nextBooking && (
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Upcoming</p>
                      <p className="mt-3 text-2xl font-black">{serviceName(nextBooking)}</p>
                      <p className="mt-2 text-sm text-slate-400">{formatDate(nextBooking.booking_date)} · {String(nextBooking.booking_time).slice(0, 5)}</p>
                    </div>
                  )}
                </section>

                <section className="hidden gap-4 md:grid md:grid-cols-3">
                  <button type="button" onClick={() => setActiveTab('wallet')} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-cyan-300/30 hover:bg-cyan-300/10">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Wallet</p>
                    <p className="mt-3 text-2xl font-black">Passes</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Membership, loyalty and voucher passes.</p>
                  </button>

                  <button type="button" onClick={() => setActiveTab('loyalty')} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-cyan-300/30 hover:bg-cyan-300/10">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Rewards</p>
                    <p className="mt-3 text-2xl font-black">{loyaltyProgress}%</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Track loyalty and referral rewards.</p>
                  </button>

                  <button type="button" onClick={rebookLastService} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-cyan-300/30 hover:bg-cyan-300/10">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Book again</p>
                    <p className="mt-3 text-2xl font-black">Book now</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Rebook your last appointment quickly.</p>
                  </button>
                </section>

                <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                  <Panel title="Membership card">
                    {activeMembership ? (
                      <div className="space-y-3">
                        <MembershipCard
                          membership={activeMembership}
                          customer={customer}
                          memberSince={memberSince}
                          onManage={() => manageActiveMembership()}
                          loading={portalLoadingAction === `billing-${activeMembership.id}`}
                        />

                        <button
                          type="button"
                          onClick={() => createMembershipWalletPass(activeMembership)}
                          className="w-full rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 font-black text-cyan-100 hover:bg-cyan-300/20"
                        >
                          Open Digital Membership Pass
                        </button>
                      </div>
                    ) : (
                      <EmptyState message="No active membership yet." />
                    )}
                  </Panel>

                  <Panel title="Quick actions">
                    <div className="grid gap-3">
                      <ActionButton title="Book appointment" description="Choose a new service, date and time." onClick={bookAppointment} />
                      <ActionButton title="Rebook last service" description="Start from your most recent appointment." onClick={rebookLastService} />
                      <ActionButton title="Manage membership" description="Review billing, sessions and benefits." onClick={manageActiveMembership} />
                      <ActionButton title="Refer a friend" description="Share your referral code." onClick={() => setActiveTab('referrals')} />
                    </div>
                  </Panel>
                </section>

                <Panel title="Recent activity">
                  <div className="space-y-3">
                    {recentActivity.map((item) => (
                      <TimelineRow key={item.id} item={item} />
                    ))}
                    {recentActivity.length === 0 && <EmptyState message="No recent activity yet." />}
                  </div>
                </Panel>
              </div>
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
                      <BookingCard key={booking.id} booking={booking} onRebook={() => bookAgain(booking)} />
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
              <section className="space-y-6">
                <Panel title="Membership">
                  {memberships.length > 0 ? (
                    <div className="space-y-6">
                      {memberships.map((membership) => {
                        const benefits = membershipBenefits.filter((benefit) => benefit.membership_plan_id === membership.membership_plan_id)
                        const usageHistory = membershipUsage.filter((item) => item.customer_membership_id === membership.id)
                        return (
                          <div key={membership.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                              <div className="space-y-3">
                                <MembershipCard
                                  membership={membership}
                                  customer={customer}
                                  memberSince={membership.created_at || membership.current_period_start}
                                  onManage={membership.stripe_customer_id ? () => openMembershipBilling(membership) : undefined}
                                  loading={portalLoadingAction === `billing-${membership.id}`}
                                />

                                <button
                                  type="button"
                                  onClick={() => createMembershipWalletPass(membership)}
                                  className="w-full rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 font-black text-cyan-100 hover:bg-cyan-300/20"
                                >
                                  Open Digital Membership Pass
                                </button>
                              </div>

                              <div className="space-y-4">
                                <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
                                  <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Benefits</p>
                                  <div className="space-y-2">
                                    {benefits.map((benefit) => (
                                      <div key={benefit.id} className="flex items-start gap-3 text-sm text-slate-300">
                                        <span className="text-cyan-300">✓</span>
                                        <span>{benefit.benefit}</span>
                                      </div>
                                    ))}
                                    {benefits.length === 0 && <p className="text-sm text-slate-500">No benefits listed yet.</p>}
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
                                  <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Usage history</p>
                                  <div className="space-y-2">
                                    {usageHistory.slice(0, 8).map((item) => (
                                      <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                                        <span className="text-slate-300">{item.usage_type === 'benefit' ? item.benefit_name || 'Benefit used' : 'Session used'}</span>
                                        <span className="text-slate-500">{formatDate(item.usage_date)}</span>
                                      </div>
                                    ))}
                                    {usageHistory.length === 0 && <p className="text-sm text-slate-500">No usage recorded yet.</p>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <EmptyState message="No active memberships yet." />
                  )}
                </Panel>
              </section>
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
                      <div className="mt-4 flex justify-center rounded-2xl border border-white/10 bg-white p-4">
                        <QRCode value={voucherCode(voucher)} size={132} />
                      </div>

                      <button
                        type="button"
                        onClick={() => createVoucherWalletPass(voucher)}
                        className="mt-4 w-full rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 font-black text-cyan-100 hover:bg-cyan-300/20"
                      >
                        Open Digital Voucher Pass
                      </button>

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


            {activeTab === 'wallet' && (
              <section className="space-y-6">
                <Panel title="Customer wallet">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <WalletCard
                      title="Membership sessions"
                      value={activeMembership ? `${membershipSessionsRemaining(activeMembership)} remaining` : 'None'}
                      helper={activeMembership ? `${activeMembership.sessions_used || 0} used from ${activeMembership.included_sessions || 0}` : 'No active membership'}
                    />

                    <WalletCard
                      title="Package sessions"
                      value={activePackage ? `${sessionsRemaining(activePackage)} remaining` : 'None'}
                      helper={activePackage ? packageName(activePackage) : 'No active package'}
                    />

                    <WalletCard
                      title="Voucher balance"
                      value={money(totalVoucherBalance)}
                      helper={`${vouchers.length} voucher${vouchers.length === 1 ? '' : 's'} on account`}
                    />

                    <WalletCard
                      title="Loyalty progress"
                      value={`${loyaltyVisitsCompleted} / ${loyaltyVisitsRequired}`}
                      helper={loyalty?.reward_label || 'No reward active'}
                    />
                  </div>
                </Panel>

                <Panel title="Loyalty stamp card">
                  {loyalty ? (
                    <div className="space-y-3">
                      <LoyaltyStampCard
                        rewardLabel={loyalty.reward_label || 'Reward'}
                        completed={loyaltyVisitsCompleted}
                        required={loyaltyVisitsRequired}
                        progress={loyaltyProgress}
                        status={loyalty.status || 'active'}
                      />

                      <button
                        type="button"
                        onClick={() => createLoyaltyWalletPass(loyalty)}
                        className="w-full rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 font-black text-cyan-100 hover:bg-cyan-300/20"
                      >
                        Open Digital Loyalty Pass
                      </button>
                    </div>
                  ) : (
                    <EmptyState message="No loyalty wallet yet." />
                  )}
                </Panel>

                <Panel title="Wallet passes">
                  <div className="grid gap-4 md:grid-cols-2">
                    {activeMembership && customer && (
                      <div className="space-y-3">
                        <DigitalPass
                          title={activeMembership.membership_name}
                          subtitle={customerName(customer)}
                          code={activeMembership.id}
                          helper={`Renews ${formatDate(activeMembership.current_period_end)}`}
                        />

                        <button
                          type="button"
                          onClick={() => createMembershipWalletPass(activeMembership)}
                          className="w-full rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 font-black text-cyan-100 hover:bg-cyan-300/20"
                        >
                          Open Digital Membership Pass
                        </button>
                      </div>
                    )}

                    {loyalty && customer && (
                      <div className="space-y-3">
                        <DigitalPass
                          title={loyalty.reward_label || 'Loyalty reward'}
                          subtitle={customerName(customer)}
                          code={loyalty.id}
                          helper={`${loyaltyVisitsCompleted} / ${loyaltyVisitsRequired} visits`}
                        />

                        <button
                          type="button"
                          onClick={() => createLoyaltyWalletPass(loyalty)}
                          className="w-full rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 font-black text-cyan-100 hover:bg-cyan-300/20"
                        >
                          Open Digital Loyalty Pass
                        </button>
                      </div>
                    )}

                    {vouchers.slice(0, 4).map((voucher) => (
                      <div key={voucher.id} className="space-y-3">
                        <DigitalPass
                          title={voucherCode(voucher)}
                          subtitle={money(voucherBalance(voucher))}
                          code={voucherCode(voucher)}
                          helper={`Expires ${formatDate(voucher.expiry_date)}`}
                        />

                        <button
                          type="button"
                          onClick={() => createVoucherWalletPass(voucher)}
                          className="w-full rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 font-black text-cyan-100 hover:bg-cyan-300/20"
                        >
                          Open Digital Voucher Pass
                        </button>
                      </div>
                    ))}

                    {!activeMembership && !loyalty && vouchers.length === 0 && (
                      <EmptyState message="No wallet passes yet." />
                    )}
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

            {activeTab === 'referrals' && (
              <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <Panel title="Refer a friend">
                  <p className="mb-5 text-slate-400">
                    Share your referral code with a friend. You can reward both sides later with credit, discounts or free sessions.
                  </p>

                  <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Your code</p>
                    <p className="mt-3 font-mono text-3xl font-black">{referralCode}</p>
                  </div>

                  <div className="mt-5 space-y-3">
                    <input
                      type="email"
                      value={friendEmail}
                      onChange={(event) => setFriendEmail(event.target.value)}
                      placeholder="Friend email address optional"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none"
                    />
                    <button type="button" onClick={createReferral} className={`w-full ${primaryButtonClass()}`}>
                      Create referral
                    </button>
                  </div>
                </Panel>

                <Panel title="Referral history">
                  <div className="space-y-3">
                    {referrals.map((referral) => (
                      <div key={referral.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <p className="font-mono text-lg font-black text-cyan-300">{referral.referral_code}</p>
                        <p className="mt-2 text-slate-400">{referral.friend_email || 'No friend email added'}</p>
                        <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                          {referral.status || 'pending'} · reward {money(referral.reward_amount)}
                        </p>
                      </div>
                    ))}
                    {referrals.length === 0 && <EmptyState message="No referrals yet." />}
                  </div>
                </Panel>
              </section>
            )}

            {activeTab === 'reviews' && (
              <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <Panel title="Leave a review">
                  <div className="space-y-4">
                    <select value={reviewBookingId} onChange={(event) => setReviewBookingId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                      <option value="">Choose completed booking</option>
                      {reviewableBookings.map((booking) => (
                        <option key={booking.id} value={booking.id}>
                          {serviceName(booking)} · {formatDate(booking.booking_date)}
                        </option>
                      ))}
                    </select>

                    <select value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none">
                      <option value={5}>★★★★★ Excellent</option>
                      <option value={4}>★★★★ Good</option>
                      <option value={3}>★★★ Okay</option>
                      <option value={2}>★★ Poor</option>
                      <option value={1}>★ Bad</option>
                    </select>

                    <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} placeholder="Tell us how it went" className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none" />

                    <button type="button" onClick={submitReview} className={`w-full ${primaryButtonClass()}`}>
                      Submit review
                    </button>
                  </div>
                </Panel>

                <Panel title="Your reviews">
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div key={review.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <p className="text-xl font-black">{'★'.repeat(Number(review.rating || 0))}</p>
                        {review.review_text && <p className="mt-2 text-slate-300">{review.review_text}</p>}
                        <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                          {review.status || 'submitted'} · {formatDate(review.created_at?.slice(0, 10))}
                        </p>
                      </div>
                    ))}
                    {reviews.length === 0 && <EmptyState message="No reviews submitted yet." />}
                  </div>
                </Panel>
              </section>
            )}

            {activeTab === 'documents' && (
              <Panel title="Documents and downloads">
                <div className="grid gap-3 md:grid-cols-2">
                  {documents.map((document) => (
                    <a key={document.id} href={document.file_url} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-black/20 p-5 hover:bg-white/10">
                      <p className="text-lg font-black">{document.title}</p>
                      <p className="mt-2 text-sm text-slate-500">{document.category || 'Document'} · {formatDate(document.created_at?.slice(0, 10))}</p>
                    </a>
                  ))}
                  {documents.length === 0 && <EmptyState message="No documents have been shared yet." />}
                </div>
              </Panel>
            )}

            {activeTab === 'loyalty' && (
              <Panel title="Loyalty wallet">
                {loyalty ? (
                  <LoyaltyStampCard
                    rewardLabel={loyalty.reward_label || 'Free appointment'}
                    completed={loyaltyVisitsCompleted}
                    required={loyaltyVisitsRequired}
                    progress={loyaltyProgress}
                    status={loyalty.status || 'active'}
                  />
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-xl font-black">No loyalty wallet yet</p>
                    <p className="mt-2 text-slate-400">Start tracking visits towards a reward.</p>
                    <button type="button" onClick={createLoyaltyWallet} className={`mt-5 ${primaryButtonClass()}`}>
                      Activate loyalty wallet
                    </button>
                  </div>
                )}
              </Panel>
            )}

            {activeTab === 'timeline' && (
              <Panel title="Customer timeline">
                <div className="space-y-3">
                  {timelineItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-lg font-black">{item.title}</p>
                          <p className="mt-1 text-slate-400">{item.description}</p>
                        </div>
                        <div className="md:text-right">
                          <span className="inline-flex rounded-full border border-white/10 px-3 py-1 text-xs font-black uppercase text-slate-300">{item.type}</span>
                          <p className="mt-2 text-sm text-slate-500">{formatDate(item.date.slice(0, 10))}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {timelineItems.length === 0 && <EmptyState message="No timeline activity yet." />}
                </div>
              </Panel>
            )}
            {activeTab === 'notifications' && (
              <Panel title={`Notifications${unreadNotificationCount > 0 ? ` (${unreadNotificationCount} unread)` : ''}`}>
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`rounded-2xl border p-5 ${
                        notification.read
                          ? 'border-white/10 bg-black/20'
                          : 'border-cyan-300/20 bg-cyan-300/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black">{notification.title}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {notification.message}
                          </p>
                        </div>

                        {!notification.read && (
                          <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-cyan-300" />
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black uppercase text-slate-400">
                          {notification.notification_type || 'general'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {notification.created_at
                            ? new Date(notification.created_at).toLocaleString('en-GB')
                            : 'Recently'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {notifications.length === 0 && (
                    <>
                      {nextBooking && (
                        <NotificationCard
                          title="Upcoming appointment"
                          description={`${serviceName(nextBooking)} on ${formatDate(nextBooking.booking_date)} at ${String(nextBooking.booking_time).slice(0, 5)}`}
                        />
                      )}

                      {activeMembership && (
                        <NotificationCard
                          title="Membership renewal"
                          description={`${activeMembership.membership_name} renews on ${formatDate(activeMembership.current_period_end)}`}
                        />
                      )}

                      {loyalty && loyaltyProgress >= 100 && (
                        <NotificationCard
                          title="Loyalty reward unlocked"
                          description={`You have earned ${loyalty.reward_label || 'your reward'}.`}
                        />
                      )}

                      {activeWaitlist && (
                        <NotificationCard
                          title="Waitlist request active"
                          description={`${serviceName(activeWaitlist)} on ${formatDate(activeWaitlist.preferred_date)} · ${activeWaitlist.preferred_time_range || 'Any time'}`}
                        />
                      )}

                      {vouchers.filter((voucher) => voucherBalance(voucher) > 0).slice(0, 3).map((voucher) => (
                        <NotificationCard
                          key={voucher.id}
                          title="Voucher available"
                          description={`${voucherCode(voucher)} has ${money(voucherBalance(voucher))} remaining.`}
                        />
                      ))}

                      {!nextBooking && !activeMembership && !loyalty && !activeWaitlist && vouchers.length === 0 && (
                        <EmptyState message="No notifications yet." />
                      )}
                    </>
                  )}
                </div>
              </Panel>
            )}

            {activeTab === 'discover' && (
              <Panel title="Discover">
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-6">
                  <p className="text-2xl font-black">Coming soon</p>
                  <p className="mt-2 text-slate-300">
                    Offers, products, featured services and marketplace recommendations will appear here.
                  </p>
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

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <button type="button" onClick={saveProfile} className={primaryButtonClass()}>
                    Save profile
                  </button>

                  <button type="button" onClick={resetAccess} className={secondaryButtonClass()}>
                    Use different email
                  </button>
                </div>
              </Panel>
            )}
            </div>
          </div>
        )}

        {customer && activeTab !== 'home' && (
          <div className="fixed inset-x-4 bottom-24 z-40 xl:hidden">
            <button
              type="button"
              onClick={bookAppointment}
              className="w-full rounded-3xl bg-cyan-300 px-6 py-4 text-base font-black uppercase tracking-[0.12em] text-slate-950 shadow-2xl shadow-cyan-950/40"
            >
              Book now
            </button>
          </div>
        )}

        {customer && (
          <nav className="fixed inset-x-3 bottom-3 z-50 rounded-[30px] border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-2xl xl:hidden">
            <div className="grid grid-cols-5 gap-1">
              <MobileNavButton icon="⌂" label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
              <MobileNavButton icon="◷" label="Bookings" active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')} />
              <MobileNavButton icon="▣" label="Wallet" active={activeTab === 'wallet' || activeTab === 'loyalty'} onClick={() => setActiveTab('wallet')} />
              <MobileNavButton icon="!" label={unreadNotificationCount > 0 ? `${unreadNotificationCount}` : 'Alerts'} active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
              <MobileNavButton icon="◉" label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            </div>
          </nav>
        )}
      </div>
    </main>
  )
}


function NavGroup({
  title,
  items,
  activeTab,
  setActiveTab,
}: {
  title: string
  items: string[][]
  activeTab: string
  setActiveTab: (value: any) => void
}) {
  return (
    <div className="space-y-2">
      <p className="px-3 pt-4 text-xs font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
      {items.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setActiveTab(key)}
          className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
            activeTab === key
              ? 'bg-white text-slate-950'
              : 'border border-white/10 bg-slate-950/40 text-slate-300 hover:bg-white/10'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function HighlightCard({
  title,
  value,
  helper,
}: {
  title: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{helper}</p>
    </div>
  )
}

function MembershipCard({
  membership,
  customer,
  memberSince,
  onManage,
  loading,
}: {
  membership: CustomerMembership
  customer: Customer | null
  memberSince?: string | null
  onManage?: () => void
  loading?: boolean
}) {
  return (
    <div className="rounded-[28px] border border-cyan-300/20 bg-cyan-300/10 p-6">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200">
        {membership.membership_name}
      </p>

      <p className="mt-4 text-3xl font-black">{customerName(customer)}</p>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <MiniSummary
          label="Sessions remaining"
          value={`${membershipSessionsRemaining(membership)} / ${membership.included_sessions || 0}`}
        />
        <MiniSummary label="Renews" value={formatDate(membership.current_period_end)} />
        <MiniSummary label="Member since" value={formatDate(memberSince?.slice(0, 10))} />
        <MiniSummary label="Status" value={membership.status || 'active'} />
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-cyan-300"
          style={{ width: `${membershipUtilisation(membership)}%` }}
        />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Member number</p>
          <p className="mt-2 font-mono text-sm font-black text-white">{membership.id.slice(0, 8).toUpperCase()}</p>
        </div>

        <div className="rounded-2xl bg-white p-3">
          <QRCode value={membership.id} size={110} />
        </div>
      </div>

      {onManage && (
        <button type="button" onClick={onManage} disabled={loading} className={`mt-5 w-full ${primaryButtonClass()}`}>
          {loading ? 'Opening...' : 'Manage billing'}
        </button>
      )}
    </div>
  )
}

function ActionButton({
  title,
  description,
  onClick,
}: {
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-white/10 bg-black/20 p-5 text-left transition hover:bg-white/10"
    >
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </button>
  )
}

function TimelineRow({
  item,
}: {
  item: {
    id: string
    date: string
    title: string
    description: string
    type: string
  }
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-black">{item.title}</p>
          <p className="mt-1 text-sm text-slate-400">{item.description}</p>
        </div>
        <div className="md:text-right">
          <span className="inline-flex rounded-full border border-white/10 px-3 py-1 text-xs font-black uppercase text-slate-300">
            {item.type}
          </span>
          <p className="mt-2 text-sm text-slate-500">{formatDate(item.date.slice(0, 10))}</p>
        </div>
      </div>
    </div>
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


function WalletCard({
  title,
  value,
  helper,
}: {
  title: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">{title}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{helper}</p>
    </div>
  )
}

function DigitalPass({
  title,
  subtitle,
  code,
  helper,
}: {
  title: string
  subtitle: string
  code: string
  helper: string
}) {
  return (
    <div className="rounded-[28px] border border-cyan-300/20 bg-cyan-300/10 p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Digital pass</p>
          <p className="mt-2 text-2xl font-black">{title}</p>
          <p className="mt-1 text-slate-300">{subtitle}</p>
          <p className="mt-3 text-sm text-slate-500">{helper}</p>
          <p className="mt-3 font-mono text-xs font-black uppercase text-cyan-200">{code.slice(0, 18)}</p>
        </div>

        <div className="self-start rounded-2xl bg-white p-3">
          <QRCode value={code} size={120} />
        </div>
      </div>
    </div>
  )
}

function LoyaltyStampCard({
  rewardLabel,
  completed,
  required,
  progress,
  status,
}: {
  rewardLabel: string
  completed: number
  required: number
  progress: number
  status: string
}) {
  const safeRequired = Math.max(1, required || 10)
  const stamps = Array.from({ length: safeRequired }, (_, index) => index < completed)

  return (
    <div className="rounded-[28px] border border-cyan-300/20 bg-cyan-300/10 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200">Loyalty reward</p>
          <p className="mt-3 text-3xl font-black">{rewardLabel}</p>
          <p className="mt-2 text-slate-300">{completed} of {safeRequired} visits completed</p>
        </div>

        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${statusPill(status)}`}>
          {progress >= 100 ? 'earned' : status}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-5 gap-3 sm:grid-cols-10">
        {stamps.map((filled, index) => (
          <div
            key={index}
            className={`flex aspect-square items-center justify-center rounded-2xl border text-xl font-black ${
              filled
                ? 'border-cyan-300/30 bg-cyan-300 text-slate-950'
                : 'border-white/10 bg-black/20 text-slate-600'
            }`}
          >
            {filled ? '★' : '○'}
          </div>
        ))}
      </div>

      <div className="mt-6 h-4 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-cyan-300" style={{ width: `${progress}%` }} />
      </div>

      <p className="mt-3 text-sm text-slate-400">
        {progress >= 100 ? 'Reward unlocked. Ask at your next visit to redeem it.' : `${Math.max(0, safeRequired - completed)} visits to unlock your reward.`}
      </p>
    </div>
  )
}

function NotificationCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  )
}


function MobileActionTile({
  title,
  value,
  onClick,
}: {
  title: string
  value: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-left"
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className="mt-3 text-xl font-black">{value}</p>
    </button>
  )
}

function MobileNavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl px-2 py-3 text-center text-[11px] font-black transition ${
        active ? 'bg-cyan-300 text-slate-950' : 'bg-white/[0.04] text-slate-300'
      }`}
    >
      <span className="block text-lg leading-none">{icon}</span>
      <span className="mt-1 block">{label}</span>
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
