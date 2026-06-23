import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

function escapeHtml(value: string) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function brandedEmailHtml({
  title,
  customerName,
  intro,
  serviceName,
  teamMemberName,
  bookingDate,
  bookingTime,
  logoUrl,
  primaryColour,
  secondaryColour,
  footerText,
  brandName,
  showAmbBranding,
}: any) {
  return `
    <div style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:620px;margin:0 auto;padding:28px 16px;">
        <div style="background:${primaryColour};border-radius:22px 22px 0 0;padding:28px;">
          ${
            logoUrl
              ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brandName)}" style="max-height:58px;max-width:220px;background:#fff;border-radius:12px;padding:8px;" />`
              : `<h1 style="margin:0;color:#fff;font-size:24px;">${escapeHtml(brandName)}</h1>`
          }
        </div>

        <div style="background:#ffffff;border-radius:0 0 22px 22px;padding:32px;">
          <h2 style="margin:0 0 18px;font-size:28px;line-height:1.2;color:#111827;">${escapeHtml(title)}</h2>

          <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi ${escapeHtml(customerName)},</p>

          <p style="font-size:16px;line-height:1.6;margin:0 0 22px;">${escapeHtml(intro)}</p>

          <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin:24px 0;">
            <p style="margin:0 0 8px;"><strong>Service:</strong> ${escapeHtml(serviceName)}</p>
            <p style="margin:0 0 8px;"><strong>Team member:</strong> ${escapeHtml(teamMemberName)}</p>
            <p style="margin:0 0 8px;"><strong>Date:</strong> ${escapeHtml(bookingDate)}</p>
            <p style="margin:0;"><strong>Time:</strong> ${escapeHtml(bookingTime)}</p>
          </div>

          <div style="margin-top:24px;">
            <span style="display:inline-block;background:${secondaryColour};color:#fff;padding:13px 18px;border-radius:14px;font-weight:bold;">
              Booking confirmed
            </span>
          </div>

          <p style="margin:30px 0 0;font-size:14px;line-height:1.6;color:#64748b;">
            ${escapeHtml(footerText)}
          </p>

          ${
            showAmbBranding
              ? `<p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">Powered by AMB Booking</p>`
              : ''
          }
        </div>
      </div>
    </div>
  `
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

function buildConfirmationSmsMessage({
  customerName,
  serviceName,
  teamMemberName,
  bookingDate,
  bookingTime,
  brandName,
}: {
  customerName: string
  serviceName: string
  teamMemberName: string
  bookingDate: string
  bookingTime: string
  brandName: string
}) {
  const firstName = customerName.split(' ')[0] || 'there'

  return `Hi ${firstName}, your booking with ${brandName} is confirmed: ${serviceName} with ${teamMemberName} on ${bookingDate} at ${bookingTime}.`
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
    const { data } = await supabaseAdmin
      .from('customers')
      .select('id,phone,sms_reminders')
      .eq('business_id', businessId)
      .eq('id', customerId)
      .maybeSingle()

    if (data) return data
  }

  if (customerEmail && customerEmail.includes('@')) {
    const { data } = await supabaseAdmin
      .from('customers')
      .select('id,phone,sms_reminders')
      .eq('business_id', businessId)
      .eq('email', customerEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) return data
  }

  return null
}

async function sendBookingConfirmationSms({
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
  brandName: string
}) {
  if (!businessId) {
    return {
      sent: false,
      reason: 'Missing business ID',
    }
  }

  const { data: settings, error: settingsError } = await supabaseAdmin
    .from('sms_settings')
    .select('id,business_id,provider,sender_name,account_sid,auth_token,from_number,is_enabled')
    .eq('business_id', businessId)
    .maybeSingle()

  if (settingsError) {
    return {
      sent: false,
      reason: settingsError.message,
    }
  }

  if (!settings?.is_enabled) {
    return {
      sent: false,
      reason: 'SMS disabled',
    }
  }

  if (!settings.account_sid || !settings.auth_token || !settings.from_number) {
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

  const smsMessage = buildConfirmationSmsMessage({
    customerName,
    serviceName,
    teamMemberName,
    bookingDate,
    bookingTime,
    brandName,
  })

  try {
    const result = await sendTwilioSms({
      accountSid: settings.account_sid,
      authToken: settings.auth_token,
      from: settings.from_number,
      to: customer.phone,
      body: smsMessage,
    })

    await supabaseAdmin.from('sms_logs').insert({
      business_id: businessId,
      customer_id: customer.id || customerId || null,
      booking_id: bookingId || null,
      phone: customer.phone,
      message: smsMessage,
      event_type: 'booking_confirmation',
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

    await supabaseAdmin.from('sms_logs').insert({
      business_id: businessId,
      customer_id: customer.id || customerId || null,
      booking_id: bookingId || null,
      phone: customer.phone,
      message: smsMessage,
      event_type: 'booking_confirmation',
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
    } = body

    if (!bookingDate || !bookingTime || !serviceName) {
      return NextResponse.json(
        { error: 'Missing booking email details' },
        { status: 400 }
      )
    }

    const safeCustomerName = customerName?.trim() || 'there'
    const safeTeamMemberName = teamMemberName?.trim() || 'Your specialist'
    const safeCustomerEmail = customerEmail?.trim()

    let business: any = null
    let emailBranding: any = null

    if (businessId) {
      const { data: businessData } = await supabaseAdmin
        .from('businesses')
        .select('id,business_name,logo_url,primary_colour,secondary_colour,hide_amb_branding,white_label_mode,sender_name,sender_email,reply_to_email')
        .eq('id', businessId)
        .maybeSingle()

      business = businessData

      const { data: brandingData } = await supabaseAdmin
        .from('email_branding')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle()

      emailBranding = brandingData
    }

    const brandName =
      emailBranding?.sender_name ||
      business?.sender_name ||
      business?.business_name ||
      'AMB Booking'

    const replyTo =
      emailBranding?.reply_to_email ||
      business?.reply_to_email ||
      emailBranding?.sender_email ||
      business?.sender_email ||
      undefined

    const logoUrl =
      emailBranding?.header_logo_url ||
      business?.logo_url ||
      ''

    const primaryColour =
      emailBranding?.primary_colour ||
      business?.primary_colour ||
      '#111827'

    const secondaryColour =
      emailBranding?.secondary_colour ||
      business?.secondary_colour ||
      '#6366f1'

    const footerText =
      emailBranding?.footer_text ||
      `Thank you for booking with ${brandName}.`

    const showAmbBranding =
      !(business?.hide_amb_branding || business?.white_label_mode === 'fully_white_label')

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || `AMB Booking <onboarding@resend.dev>`

    const businessEmail =
      process.env.BUSINESS_NOTIFICATION_EMAIL || 'chris@amb360.co.uk'

    let customerData = null
    let customerError = null
    let businessData = null
    let businessError = null

    if (safeCustomerEmail && safeCustomerEmail.includes('@')) {
      const result = await resend.emails.send({
        from: `${brandName} <${fromEmail.includes('<') ? fromEmail.split('<')[1].replace('>', '') : fromEmail}>`,
        to: safeCustomerEmail,
        replyTo,
        subject: 'Your booking is confirmed',
        html: brandedEmailHtml({
          title: 'Booking confirmed',
          customerName: safeCustomerName,
          intro: 'Your booking has been confirmed.',
          serviceName,
          teamMemberName: safeTeamMemberName,
          bookingDate,
          bookingTime,
          logoUrl,
          primaryColour,
          secondaryColour,
          footerText,
          brandName,
          showAmbBranding,
        }),
      })

      customerData = result.data
      customerError = result.error

      if (customerError) console.error('Customer email error:', customerError)
    }

    if (businessEmail && businessEmail.includes('@')) {
      const result = await resend.emails.send({
        from: fromEmail,
        to: businessEmail,
        replyTo,
        subject: `New booking received - ${brandName}`,
        html: brandedEmailHtml({
          title: 'New booking received',
          customerName: 'admin',
          intro: 'A new booking has been made.',
          serviceName,
          teamMemberName: safeTeamMemberName,
          bookingDate,
          bookingTime,
          logoUrl,
          primaryColour,
          secondaryColour,
          footerText: `Customer: ${safeCustomerName}. Email: ${safeCustomerEmail || 'Not provided'}.`,
          brandName,
          showAmbBranding: false,
        }),
      })

      businessData = result.data
      businessError = result.error

      if (businessError) console.error('Business email error:', businessError)
    }

    const smsResult = await sendBookingConfirmationSms({
      businessId,
      customerId,
      bookingId,
      customerName: safeCustomerName,
      customerEmail: safeCustomerEmail,
      customerPhone,
      serviceName,
      teamMemberName: safeTeamMemberName,
      bookingDate,
      bookingTime,
      brandName,
    })

    return NextResponse.json({
      success: true,
      customerData,
      customerError,
      businessData,
      businessError,
      smsSent: smsResult.sent,
      smsReason: smsResult.reason,
      smsData: smsResult.data || null,
    })
  } catch (error: any) {
    console.error('Booking confirmation email route error:', error)

    return NextResponse.json(
      { error: error.message || 'Failed to send booking email' },
      { status: 500 }
    )
  }
}
