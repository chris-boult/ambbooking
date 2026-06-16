import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

type Booking = {
  id: string
  business_id: string
  booking_date: string
  booking_time: string
  status: string | null
  reminder_24h_sent: boolean | null
  reminder_2h_sent: boolean | null
  customers:
    | {
        first_name: string
        last_name: string | null
        email: string | null
      }[]
    | null
  services:
    | {
        name: string
      }[]
    | null
  team_members:
    | {
        full_name: string
      }[]
    | null
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

      <p style="font-size: 16px; line-height: 1.6;">
        Hi ${customerName},
      </p>

      <p style="font-size: 16px; line-height: 1.6;">
        This is a reminder about your upcoming appointment.
      </p>

      <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 10px;"><strong>Date:</strong> ${formatDate(bookingDate)}</p>
        <p style="margin: 0 0 10px;"><strong>Time:</strong> ${formatTime(bookingTime)}</p>
        <p style="margin: 0 0 10px;"><strong>Service:</strong> ${serviceName}</p>
        <p style="margin: 0;"><strong>Team member:</strong> ${teamMemberName}</p>
      </div>

      <p style="font-size: 16px; line-height: 1.6;">
        We look forward to seeing you.
      </p>

      <p style="font-size: 16px; line-height: 1.6;">
        ${businessName}
      </p>
    </div>
  `
}

async function sendReminder(booking: Booking, reminderType: '24h' | '2h') {
  const customer = booking.customers?.[0]
  const service = booking.services?.[0]
  const teamMember = booking.team_members?.[0]

  if (!customer?.email) {
    return {
      sent: false,
      reason: 'Missing customer email',
    }
  }

  const customerName = `${customer.first_name || ''} ${
    customer.last_name || ''
  }`.trim()

  const businessName = 'AMB Booking'
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

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      business_id,
      booking_date,
      booking_time,
      status,
      reminder_24h_sent,
      reminder_2h_sent,
      customers (
        first_name,
        last_name,
        email
      ),
      services (
        name
      ),
      team_members (
        full_name
      )
    `)
    .neq('status', 'cancelled')
    .neq('status', 'no_show')

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }

  const bookings = (data as unknown as Booking[]) || []

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

  const results = []

  for (const booking of reminders24h) {
    const result = await sendReminder(booking, '24h')
    results.push({
      bookingId: booking.id,
      reminderType: '24h',
      ...result,
    })
  }

  for (const booking of reminders2h) {
    const result = await sendReminder(booking, '2h')
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