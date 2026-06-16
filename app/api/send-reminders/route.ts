import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

type Booking = {
  id: string
  business_id: string
  customer_id: string | null
  service_id: string | null
  team_member_id: string | null
  booking_date: string
  booking_time: string
  status: string | null
  reminder_24h_sent: boolean | null
  reminder_2h_sent: boolean | null
}

type Customer = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
}

type Service = {
  id: string
  name: string
}

type TeamMember = {
  id: string
  full_name: string
}

type Business = {
  id: string
  business_name: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const resendApiKey = process.env.RESEND_API_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
}

if (!resendApiKey) {
  throw new Error('Missing RESEND_API_KEY')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const resend = new Resend(resendApiKey)

function toDateString(date: Date) {
  return date.toISOString().split('T')[0]
}

function addHours(date: Date, hours: number) {
  const next = new Date(date)
  next.setHours(next.getHours() + hours)
  return next
}

function getDateTime(bookingDate: string, bookingTime: string) {
  return new Date(`${bookingDate}T${bookingTime}`)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(time: string) {
  return time?.slice(0, 5)
}

function uniqueValues(values: (string | null)[]) {
  return Array.from(new Set(values.filter(Boolean))) as string[]
}

function reminderEmailHtml({
  customerName,
  businessName,
  serviceName,
  teamMemberName,
  bookingDate,
  bookingTime,
  reminderType,
}: {
  customerName: string
  businessName: string
  serviceName: string
  teamMemberName: string
  bookingDate: string
  bookingTime: string
  reminderType: '24h' | '2h'
}) {
  const heading =
    reminderType === '24h'
      ? 'Your appointment is tomorrow'
      : 'Your appointment is coming up soon'

  return `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px; color: #111827;">
      <h1 style="font-size: 28px; margin-bottom: 12px;">${heading}</h1>
      <p style="font-size: 16px; line-height: 1.6;">Hi ${customerName},</p>
      <p style="font-size: 16px; line-height: 1.6;">This is a reminder about your upcoming appointment with ${businessName}.</p>

      <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 10px;"><strong>Date:</strong> ${formatDate(bookingDate)}</p>
        <p style="margin: 0 0 10px;"><strong>Time:</strong> ${formatTime(bookingTime)}</p>
        <p style="margin: 0 0 10px;"><strong>Service:</strong> ${serviceName}</p>
        <p style="margin: 0;"><strong>Team member:</strong> ${teamMemberName}</p>
      </div>

      <p style="font-size: 16px; line-height: 1.6;">We look forward to seeing you.</p>
      <p style="font-size: 16px; line-height: 1.6;">${businessName}</p>
    </div>
  `
}

async function sendReminder({
  booking,
  customer,
  service,
  teamMember,
  business,
  reminderType,
}: {
  booking: Booking
  customer: Customer | undefined
  service: Service | undefined
  teamMember: TeamMember | undefined
  business: Business | undefined
  reminderType: '24h' | '2h'
}) {
  if (!customer?.email) {
    return {
      sent: false,
      reason: 'Missing customer email',
    }
  }

  const customerName = `${customer.first_name || ''} ${
    customer.last_name || ''
  }`.trim()

  const businessName = business?.business_name || 'AMB Booking'
  const serviceName = service?.name || 'Appointment'
  const teamMemberName = teamMember?.full_name || 'Team member'

  await resend.emails.send({
    from: `${businessName} <onboarding@resend.dev>`,
    to: customer.email,
    subject:
      reminderType === '24h'
        ? 'Reminder: your appointment is tomorrow'
        : 'Reminder: your appointment is coming up soon',
    html: reminderEmailHtml({
      customerName: customerName || 'there',
      businessName,
      serviceName,
      teamMemberName,
      bookingDate: booking.booking_date,
      bookingTime: booking.booking_time,
      reminderType,
    }),
  })

  await supabase
    .from('bookings')
    .update(
      reminderType === '24h'
        ? { reminder_24h_sent: true }
        : { reminder_2h_sent: true }
    )
    .eq('id', booking.id)

  return {
    sent: true,
    reason: null,
  }
}

export async function GET() {
  const now = new Date()

  const tomorrow = addHours(now, 24)
  const tomorrowDate = toDateString(tomorrow)

  const twoHoursFromNow = addHours(now, 2)
  const twoHoursDate = toDateString(twoHoursFromNow)

  const { data: bookingsData, error: bookingsError } = await supabase
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
      reminder_24h_sent,
      reminder_2h_sent
    `)
    .neq('status', 'cancelled')
    .neq('status', 'no_show')

  if (bookingsError) {
    return NextResponse.json(
      {
        success: false,
        step: 'fetch_bookings',
        error: bookingsError.message,
      },
      { status: 500 }
    )
  }

  const bookings = (bookingsData as Booking[]) || []

  const reminders24h = bookings.filter((booking) => {
    return (
      booking.booking_date === tomorrowDate &&
      !booking.reminder_24h_sent &&
      (booking.status || 'confirmed') === 'confirmed'
    )
  })

  const reminders2h = bookings.filter((booking) => {
    if (booking.reminder_2h_sent) return false
    if ((booking.status || 'confirmed') !== 'confirmed') return false
    if (booking.booking_date !== twoHoursDate) return false

    const appointmentDateTime = getDateTime(
      booking.booking_date,
      booking.booking_time
    )

    const diffMs = appointmentDateTime.getTime() - now.getTime()
    const diffMinutes = Math.round(diffMs / 60000)

    return diffMinutes >= 90 && diffMinutes <= 150
  })

  const reminderBookings = [...reminders24h, ...reminders2h]

  const customerIds = uniqueValues(reminderBookings.map((booking) => booking.customer_id))
  const serviceIds = uniqueValues(reminderBookings.map((booking) => booking.service_id))
  const teamMemberIds = uniqueValues(reminderBookings.map((booking) => booking.team_member_id))
  const businessIds = uniqueValues(reminderBookings.map((booking) => booking.business_id))

  let customers: Customer[] = []
  let services: Service[] = []
  let teamMembers: TeamMember[] = []
  let businesses: Business[] = []

  if (customerIds.length > 0) {
    const { data, error } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email')
      .in('id', customerIds)

    if (error) {
      return NextResponse.json({ success: false, step: 'fetch_customers', error: error.message }, { status: 500 })
    }

    customers = (data as Customer[]) || []
  }

  if (serviceIds.length > 0) {
    const { data, error } = await supabase
      .from('services')
      .select('id, name')
      .in('id', serviceIds)

    if (error) {
      return NextResponse.json({ success: false, step: 'fetch_services', error: error.message }, { status: 500 })
    }

    services = (data as Service[]) || []
  }

  if (teamMemberIds.length > 0) {
    const { data, error } = await supabase
      .from('team_members')
      .select('id, full_name')
      .in('id', teamMemberIds)

    if (error) {
      return NextResponse.json({ success: false, step: 'fetch_team_members', error: error.message }, { status: 500 })
    }

    teamMembers = (data as TeamMember[]) || []
  }

  if (businessIds.length > 0) {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, business_name')
      .in('id', businessIds)

    if (error) {
      return NextResponse.json({ success: false, step: 'fetch_businesses', error: error.message }, { status: 500 })
    }

    businesses = (data as Business[]) || []
  }

  const results = []

  for (const booking of reminders24h) {
    const result = await sendReminder({
      booking,
      customer: customers.find((customer) => customer.id === booking.customer_id),
      service: services.find((service) => service.id === booking.service_id),
      teamMember: teamMembers.find((teamMember) => teamMember.id === booking.team_member_id),
      business: businesses.find((business) => business.id === booking.business_id),
      reminderType: '24h',
    })

    results.push({
      bookingId: booking.id,
      reminderType: '24h',
      ...result,
    })
  }

  for (const booking of reminders2h) {
    const result = await sendReminder({
      booking,
      customer: customers.find((customer) => customer.id === booking.customer_id),
      service: services.find((service) => service.id === booking.service_id),
      teamMember: teamMembers.find((teamMember) => teamMember.id === booking.team_member_id),
      business: businesses.find((business) => business.id === booking.business_id),
      reminderType: '2h',
    })

    results.push({
      bookingId: booking.id,
      reminderType: '2h',
      ...result,
    })
  }

  return NextResponse.json({
    success: true,
    checkedAt: now.toISOString(),
    reminders24hFound: reminders24h.length,
    reminders2hFound: reminders2h.length,
    sent: results.filter((item) => item.sent).length,
    results,
  })
}
