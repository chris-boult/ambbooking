import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import {
  getEmailBranding,
  resolveEmailBranding,
  buildBrandedEmail,
} from '@/lib/email-branding'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type SmsSettings = {
  id: string
  business_id: string
  account_sid: string | null
  auth_token: string | null
  from_number: string | null
  is_enabled: boolean | null
}

type CustomerForSms = {
  id: string
  phone: string | null
  sms_reminders: boolean | null
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

function buildBookingUpdateSmsMessage({
  customerName,
  serviceName,
  teamMemberName,
  bookingDate,
  bookingTime,
  action,
  brandName,
}: {
  customerName: string
  serviceName: string
  teamMemberName: string
  bookingDate: string
  bookingTime: string
  action: string
  brandName: string
}) {
  const firstName = customerName.split(' ')[0] || 'there'

  if (action === 'cancelled') {
    return `Hi ${firstName}, your booking with ${brandName} has been cancelled: ${serviceName} with ${teamMemberName} on ${bookingDate} at ${bookingTime}.`
  }

  return `Hi ${firstName}, your booking with ${brandName} has been rescheduled: ${serviceName} with ${teamMemberName} on ${bookingDate} at ${bookingTime}.`
}

async function resolveCustomerForSms({
  businessId,
  customerId,
  customerEmail,
  customerPhone,
}: {
  businessId?: string
  customerId?: string
  customerEmail?: string
  customerPhone?: string
}) {
  if (customerPhone) {
    return {
      id: customerId || null,
      phone: customerPhone,
      sms_reminders: true,
    }
  }

  if (!businessId) return null

  if (customerId) {
    const { data } = await supabase
      .from('customers')
      .select('id,phone,sms_reminders')
      .eq('business_id', businessId)
      .eq('id', customerId)
      .maybeSingle()

    if (data) return data as CustomerForSms
  }

  if (customerEmail && customerEmail.includes('@')) {
    const { data } = await supabase
      .from('customers')
      .select('id,phone,sms_reminders')
      .eq('business_id', businessId)
      .eq('email', customerEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) return data as CustomerForSms
  }

  return null
}

async function sendBookingUpdateSms({
  businessId,
  customerId,
  bookingId,
  customerName,
  customerEmail,
  customerPhone,
  serviceName,
  teamMemberName,
  bookingDate,
  bookingTime,
  action,
  brandName,
}: {
  businessId?: string
  customerId?: string
  bookingId?: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  serviceName: string
  teamMemberName: string
  bookingDate: string
  bookingTime: string
  action: string
  brandName: string
}) {
  if (!businessId) {
    return {
      sent: false,
      reason: 'Missing business ID',
    }
  }

  const { data: settings, error: settingsError } = await supabase
    .from('sms_settings')
    .select('id,business_id,account_sid,auth_token,from_number,is_enabled')
    .eq('business_id', businessId)
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

  const customer = await resolveCustomerForSms({
    businessId,
    customerId,
    customerEmail,
    customerPhone,
  })

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

  const smsMessage = buildBookingUpdateSmsMessage({
    customerName,
    serviceName,
    teamMemberName,
    bookingDate,
    bookingTime,
    action,
    brandName,
  })

  try {
    const result = await sendTwilioSms({
      accountSid: smsSettings.account_sid,
      authToken: smsSettings.auth_token,
      from: smsSettings.from_number,
      to: customer.phone,
      body: smsMessage,
    })

    await supabase.from('sms_logs').insert({
      business_id: businessId,
      customer_id: customer.id || customerId || null,
      booking_id: bookingId || null,
      phone: customer.phone,
      message: smsMessage,
      event_type: action === 'cancelled' ? 'booking_cancelled' : 'booking_rescheduled',
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
      business_id: businessId,
      customer_id: customer.id || customerId || null,
      booking_id: bookingId || null,
      phone: customer.phone,
      message: smsMessage,
      event_type: action === 'cancelled' ? 'booking_cancelled' : 'booking_rescheduled',
      status: 'failed',
      error_message: errorMessage,
    })

    return {
      sent: false,
      reason: errorMessage,
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      businessId,
      customerId,
      bookingId,
      customerName,
      customerEmail,
      customerPhone,
      bookingDate,
      bookingTime,
      serviceName,
      teamMemberName,
      action,
    } = body

    if (!bookingDate || !bookingTime || !action) {
      return NextResponse.json(
        { error: 'Missing booking update details' },
        { status: 400 }
      )
    }

    const safeCustomerName = customerName?.trim() || 'there'
    const safeCustomerEmail = customerEmail?.trim()
    const safeServiceName = serviceName?.trim() || 'Your appointment'
    const safeTeamMemberName = teamMemberName?.trim() || 'Your specialist'

    const branding = await getEmailBranding(businessId)
    const resolvedBranding = resolveEmailBranding(branding)

    const subject =
      action === 'cancelled'
        ? 'Your appointment has been cancelled'
        : 'Your appointment has been rescheduled'

    const title =
      action === 'cancelled'
        ? 'Booking cancelled'
        : 'Booking rescheduled'

    const intro =
      action === 'cancelled'
        ? 'Your appointment has been cancelled.'
        : 'Your appointment has been moved to a new date and time.'

    const buttonText =
      action === 'cancelled'
        ? 'Booking cancelled'
        : 'View updated booking'

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      'AMB Booking <onboarding@resend.dev>'

    const fromAddress = fromEmail.includes('<')
      ? fromEmail.split('<')[1].replace('>', '')
      : fromEmail

    let emailData = null
    let emailError = null
    let emailSkipped = false
    let emailSkipReason = null

    if (safeCustomerEmail && safeCustomerEmail.includes('@')) {
      const result = await resend.emails.send({
        from: `${resolvedBranding.brandName} <${fromAddress}>`,
        to: safeCustomerEmail,
        replyTo: resolvedBranding.replyTo,
        subject,
        html: buildBrandedEmail({
          title,
          customerName: safeCustomerName,
          intro,
          serviceName: safeServiceName,
          teamMemberName: safeTeamMemberName,
          bookingDate,
          bookingTime,
          buttonText,
          branding,
        }),
      })

      emailData = result.data
      emailError = result.error

      if (emailError) console.error('Resend booking update email error:', emailError)
    } else {
      emailSkipped = true
      emailSkipReason = 'Missing customer email'
    }

    const smsResult = await sendBookingUpdateSms({
      businessId,
      customerId,
      bookingId,
      customerName: safeCustomerName,
      customerEmail: safeCustomerEmail,
      customerPhone,
      serviceName: safeServiceName,
      teamMemberName: safeTeamMemberName,
      bookingDate,
      bookingTime,
      action,
      brandName: resolvedBranding.brandName || 'AMB Booking',
    })

    if (emailError && !smsResult.sent) {
      return NextResponse.json(
        {
          error: emailError.message || 'Booking update notification failed',
          emailError,
          smsSent: smsResult.sent,
          smsReason: smsResult.reason,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      emailSkipped,
      emailSkipReason,
      emailData,
      emailError,
      smsSent: smsResult.sent,
      smsReason: smsResult.reason,
      smsData: smsResult.data || null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Notification failed'

    console.error('Booking update notification failed:', error)

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
