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
  review_request_sent: boolean | null
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

type SmsSettings = {
  id: string
  business_id: string
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

function getDateTime(bookingDate: string, bookingTime: string) {
  return new Date(`${bookingDate}T${bookingTime}`)
}

function fromAddress() {
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || 'AMB Booking <onboarding@resend.dev>'

  return fromEmail.includes('<')
    ? fromEmail.split('<')[1].replace('>', '')
    : fromEmail
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

function buildReviewSmsMessage({
  customer,
  service,
  brandName,
  reviewUrl,
}: {
  customer: Customer | undefined
  service: Service | undefined
  brandName: string
  reviewUrl: string
}) {
  const firstName = customer?.first_name || 'there'
  const serviceName = service?.name || 'appointment'

  return `Hi ${firstName}, thanks for visiting ${brandName} for your ${serviceName}. We'd really appreciate a quick review: ${reviewUrl}`
}

async function sendReviewRequestSms({
  booking,
  customer,
  service,
  brandName,
  reviewUrl,
}: {
  booking: Booking
  customer: Customer | undefined
  service: Service | undefined
  brandName: string
  reviewUrl: string
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
    .select('id,business_id,account_sid,auth_token,from_number,is_enabled')
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

  const message = buildReviewSmsMessage({
    customer,
    service,
    brandName,
    reviewUrl,
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
      event_type: 'review_request',
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
      event_type: 'review_request',
      status: 'failed',
      error_message: errorMessage,
    })

    return {
      sent: false,
      reason: errorMessage,
    }
  }
}

async function sendReviewRequest({
  booking,
  customer,
  service,
}: {
  booking: Booking
  customer: Customer | undefined
  service: Service | undefined
}) {
  const customerName = `${customer?.first_name || ''} ${
    customer?.last_name || ''
  }`.trim()

  const serviceName = service?.name || 'appointment'
  const reviewUrl = process.env.REVIEW_URL || '#'

  const branding = await getEmailBranding(booking.business_id)
  const resolvedBranding = resolveEmailBranding(branding)

  let emailResult = {
    sent: false,
    reason: 'Missing customer email',
    data: null as unknown,
  }

  if (customer?.email && customer.email.includes('@')) {
    const { data, error } = await resend.emails.send({
      from: `${resolvedBranding.brandName} <${fromAddress()}>`,
      to: customer.email,
      replyTo: resolvedBranding.replyTo,
      subject: 'How was your appointment?',
      html: buildBrandedEmail({
        title: 'How did we do?',
        customerName: customerName || 'there',
        intro: `Thanks for visiting us for your ${serviceName}. We would really appreciate it if you could leave a quick review.`,
        serviceName,
        teamMemberName: 'Your specialist',
        bookingDate: booking.booking_date,
        bookingTime: booking.booking_time,
        buttonText: 'Leave a review',
        branding,
      }).replace('Leave a review</span>', `<a href="${reviewUrl}" style="color:#fff;text-decoration:none;">Leave a review</a></span>`),
    })

    if (error) {
      console.error('Review request email error:', error)

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

  const smsResult = await sendReviewRequestSms({
    booking,
    customer,
    service,
    brandName: resolvedBranding.brandName || 'AMB Booking',
    reviewUrl,
  })

  if (emailResult.sent || smsResult.sent) {
    await supabase
      .from('bookings')
      .update({ review_request_sent: true })
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
    const fourHoursAgo = addHours(now, -4)

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
        review_request_sent
      `)
      .eq('status', 'completed')
      .eq('review_request_sent', false)

    if (bookingsError) {
      return NextResponse.json(
        { success: false, step: 'fetch_bookings', error: bookingsError.message },
        { status: 500 }
      )
    }

    const bookings = ((bookingsData as Booking[]) || []).filter((booking) => {
      const appointmentDateTime = getDateTime(
        booking.booking_date,
        booking.booking_time
      )

      return appointmentDateTime <= fourHoursAgo
    })

    const customerIds = uniqueValues(
      bookings.map((booking) => booking.customer_id)
    )
    const serviceIds = uniqueValues(bookings.map((booking) => booking.service_id))

    let customers: Customer[] = []
    let services: Service[] = []

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

    const results = []

    for (const booking of bookings) {
      const result = await sendReviewRequest({
        booking,
        customer: customers.find(
          (customer) => customer.id === booking.customer_id
        ),
        service: services.find((service) => service.id === booking.service_id),
      })

      results.push({
        bookingId: booking.id,
        ...result,
      })
    }

    return NextResponse.json({
      success: true,
      checkedAt: now.toISOString(),
      reviewRequestsFound: bookings.length,
      sent: results.filter((item) => item.sent).length,
      emailSent: results.filter((item) => item.emailSent).length,
      smsSent: results.filter((item) => item.smsSent).length,
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Review request route failed'

    console.error('Review request route error:', error)

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
