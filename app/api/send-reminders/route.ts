import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import {
  getEmailBranding,
  resolveEmailBranding,
  buildBrandedEmail,
} from '@/lib/email-branding'

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
  phone: string | null
  sms_reminders: boolean | null
}

type Service = {
  id: string
  name: string
}

type TeamMember = {
  id: string
  full_name: string
}

type SmsSettings = {
  id: string
  business_id: string
  provider: string | null
  sender_name: string | null
  account_sid: string | null
  auth_token: string | null
  from_number: string | null
  is_enabled: boolean | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

function uniqueValues(values: (string | null)[]) {
  return Array.from(new Set(values.filter(Boolean))) as string[]
}

function addHours(date: Date, hours: number) {
  const next = new Date(date)
  next.setHours(next.getHours() + hours)
  return next
}

function toDateString(date: Date) {
  return date.toISOString().split('T')[0]
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

function fromAddress() {
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || 'AMB Booking <onboarding@resend.dev>'

  return fromEmail.includes('<')
    ? fromEmail.split('<')[1].replace('>', '')
    : fromEmail
}

function buildReminderSmsMessage({
  customer,
  service,
  teamMember,
  booking,
  reminderType,
}: {
  customer: Customer | undefined
  service: Service | undefined
  teamMember: TeamMember | undefined
  booking: Booking
  reminderType: '24h' | '2h'
}) {
  const customerName = customer?.first_name || 'there'
  const serviceName = service?.name || 'appointment'
  const teamMemberName = teamMember?.full_name || 'your specialist'
  const date = formatDate(booking.booking_date)
  const time = formatTime(booking.booking_time)

  if (reminderType === '24h') {
    return `Hi ${customerName}, reminder: your ${serviceName} with ${teamMemberName} is tomorrow, ${date} at ${time}.`
  }

  return `Hi ${customerName}, reminder: your ${serviceName} with ${teamMemberName} is coming up today at ${time}.`
}

async function sendTwilioSms({
  accountSid,
  authToken,
  from,
  to,
  body,
}: {
  accountSid: string
  authToken: string
  from: string
  to: string
  body: string
}) {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: body,
      }),
    }
  )

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(result?.message || 'Twilio SMS failed.')
  }

  return result
}

async function sendReminderSms({
  booking,
  customer,
  service,
  teamMember,
  reminderType,
}: {
  booking: Booking
  customer: Customer | undefined
  service: Service | undefined
  teamMember: TeamMember | undefined
  reminderType: '24h' | '2h'
}) {
  if (!customer?.phone) {
    return {
      sent: false,
      reason: 'Missing customer phone',
    }
  }

  if (customer.sms_reminders === false) {
    return {
      sent: false,
      reason: 'Customer has disabled SMS reminders',
    }
  }

  const { data: settings, error: settingsError } = await supabase
    .from('sms_settings')
    .select('id,business_id,provider,sender_name,account_sid,auth_token,from_number,is_enabled')
    .eq('business_id', booking.business_id)
    .maybeSingle()

  if (settingsError) {
    return {
      sent: false,
      reason: settingsError.message,
    }
  }

  const smsSettings = settings as SmsSettings | null

  if (!smsSettings?.is_enabled) {
    return {
      sent: false,
      reason: 'SMS disabled',
    }
  }

  if (!smsSettings.account_sid || !smsSettings.auth_token || !smsSettings.from_number) {
    return {
      sent: false,
      reason: 'Missing SMS provider settings',
    }
  }

  const message = buildReminderSmsMessage({
    customer,
    service,
    teamMember,
    booking,
    reminderType,
  })

  try {
    const result = await sendTwilioSms({
      accountSid: smsSettings.account_sid,
      authToken: smsSettings.auth_token,
      from: smsSettings.from_number,
      to: customer.phone,
      body: message,
    })

    await supabase.from('sms_logs').insert({
      business_id: booking.business_id,
      customer_id: booking.customer_id,
      booking_id: booking.id,
      phone: customer.phone,
      message,
      event_type: reminderType === '24h' ? 'booking_reminder_24h' : 'booking_reminder_2h',
      status: 'sent',
      provider_message_id: result?.sid || null,
    })

    return {
      sent: true,
      reason: null,
      data: result,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'SMS failed'

    await supabase.from('sms_logs').insert({
      business_id: booking.business_id,
      customer_id: booking.customer_id,
      booking_id: booking.id,
      phone: customer.phone,
      message,
      event_type: reminderType === '24h' ? 'booking_reminder_24h' : 'booking_reminder_2h',
      status: 'failed',
      error_message: errorMessage,
    })

    return {
      sent: false,
      reason: errorMessage,
    }
  }
}

async function sendReminder({
  booking,
  customer,
  service,
  teamMember,
  reminderType,
}: {
  booking: Booking
  customer: Customer | undefined
  service: Service | undefined
  teamMember: TeamMember | undefined
  reminderType: '24h' | '2h'
}) {
  let emailResult = {
    sent: false,
    reason: 'Missing customer email',
    data: null as unknown,
  }

  if (customer?.email && customer.email.includes('@')) {
    const customerName = `${customer.first_name || ''} ${
      customer.last_name || ''
    }`.trim()

    const serviceName = service?.name || 'Appointment'
    const teamMemberName = teamMember?.full_name || 'Your specialist'

    const branding = await getEmailBranding(booking.business_id)
    const resolvedBranding = resolveEmailBranding(branding)

    const title =
      reminderType === '24h'
        ? 'Your appointment is tomorrow'
        : 'Your appointment is coming up soon'

    const subject =
      reminderType === '24h'
        ? 'Reminder: your appointment is tomorrow'
        : 'Reminder: your appointment is coming up soon'

    const intro =
      reminderType === '24h'
        ? 'This is a friendly reminder about your appointment tomorrow.'
        : 'This is a friendly reminder that your appointment is coming up soon.'

    const { data, error } = await resend.emails.send({
      from: `${resolvedBranding.brandName} <${fromAddress()}>`,
      to: customer.email,
      replyTo: resolvedBranding.replyTo,
      subject,
      html: buildBrandedEmail({
        title,
        customerName: customerName || 'there',
        intro,
        serviceName,
        teamMemberName,
        bookingDate: formatDate(booking.booking_date),
        bookingTime: formatTime(booking.booking_time),
        buttonText: 'View booking',
        branding,
      }),
    })

    if (error) {
      console.error('Reminder email error:', error)

      emailResult = {
        sent: false,
        reason: error.message || 'Resend failed',
        data: null,
      }
    } else {
      emailResult = {
        sent: true,
        reason: null as unknown as string,
        data,
      }
    }
  }

  const smsResult = await sendReminderSms({
    booking,
    customer,
    service,
    teamMember,
    reminderType,
  })

  if (emailResult.sent || smsResult.sent) {
    await supabase
      .from('bookings')
      .update(
        reminderType === '24h'
          ? { reminder_24h_sent: true }
          : { reminder_2h_sent: true }
      )
      .eq('id', booking.id)
  }

  return {
    sent: emailResult.sent || smsResult.sent,
    emailSent: emailResult.sent,
    smsSent: smsResult.sent,
    reason: emailResult.sent || smsResult.sent ? null : `${emailResult.reason}; ${smsResult.reason}`,
    emailReason: emailResult.reason,
    smsReason: smsResult.reason,
    emailData: emailResult.data,
    smsData: smsResult.data || null,
  }
}

export async function GET() {
  try {
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
        { success: false, step: 'fetch_bookings', error: bookingsError.message },
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

    const customerIds = uniqueValues(
      reminderBookings.map((booking) => booking.customer_id)
    )
    const serviceIds = uniqueValues(
      reminderBookings.map((booking) => booking.service_id)
    )
    const teamMemberIds = uniqueValues(
      reminderBookings.map((booking) => booking.team_member_id)
    )

    let customers: Customer[] = []
    let services: Service[] = []
    let teamMembers: TeamMember[] = []

    if (customerIds.length > 0) {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone, sms_reminders')
        .in('id', customerIds)

      if (error) {
        return NextResponse.json(
          { success: false, step: 'fetch_customers', error: error.message },
          { status: 500 }
        )
      }

      customers = (data as Customer[]) || []
    }

    if (serviceIds.length > 0) {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .in('id', serviceIds)

      if (error) {
        return NextResponse.json(
          { success: false, step: 'fetch_services', error: error.message },
          { status: 500 }
        )
      }

      services = (data as Service[]) || []
    }

    if (teamMemberIds.length > 0) {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, full_name')
        .in('id', teamMemberIds)

      if (error) {
        return NextResponse.json(
          { success: false, step: 'fetch_team_members', error: error.message },
          { status: 500 }
        )
      }

      teamMembers = (data as TeamMember[]) || []
    }

    const results = []

    for (const booking of reminders24h) {
      const result = await sendReminder({
        booking,
        customer: customers.find(
          (customer) => customer.id === booking.customer_id
        ),
        service: services.find((service) => service.id === booking.service_id),
        teamMember: teamMembers.find(
          (teamMember) => teamMember.id === booking.team_member_id
        ),
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
        customer: customers.find(
          (customer) => customer.id === booking.customer_id
        ),
        service: services.find((service) => service.id === booking.service_id),
        teamMember: teamMembers.find(
          (teamMember) => teamMember.id === booking.team_member_id
        ),
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
      emailSent: results.filter((item) => item.emailSent).length,
      smsSent: results.filter((item) => item.smsSent).length,
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reminder route failed'

    console.error('Reminder route error:', error)

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
