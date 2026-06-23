import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

function personaliseMessage(message: string, customer: { firstName?: string | null; lastName?: string | null }) {
  return message
    .replaceAll('{first_name}', customer.firstName || '')
    .replaceAll('{last_name}', customer.lastName || '')
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

export async function POST(request: Request) {
  try {
    const { businessId, campaignName, audienceType, message, recipients } = await request.json()

    if (!businessId || !message || !Array.isArray(recipients)) {
      return NextResponse.json(
        { error: 'Missing campaign details.' },
        { status: 400 }
      )
    }

    const { data: settings, error: settingsError } = await supabase
      .from('sms_settings')
      .select('account_sid,auth_token,from_number,is_enabled')
      .eq('business_id', businessId)
      .maybeSingle()

    if (settingsError) throw settingsError

    if (!settings?.is_enabled) {
      return NextResponse.json({ error: 'SMS is disabled for this business.' }, { status: 400 })
    }

    if (!settings.account_sid || !settings.auth_token || !settings.from_number) {
      return NextResponse.json({ error: 'Missing SMS provider settings.' }, { status: 400 })
    }

    let sent = 0
    let failed = 0

    for (const recipient of recipients) {
      if (!recipient.phone) continue

      const personalised = personaliseMessage(message, recipient)

      try {
        const result = await sendTwilioSms({
          accountSid: settings.account_sid,
          authToken: settings.auth_token,
          from: settings.from_number,
          to: recipient.phone,
          body: personalised,
        })

        await supabase.from('sms_logs').insert({
          business_id: businessId,
          customer_id: recipient.customerId || null,
          phone: recipient.phone,
          message: personalised,
          event_type: 'campaign',
          status: 'sent',
          provider_message_id: result?.sid || null,
        })

        sent += 1
      } catch (error: any) {
        await supabase.from('sms_logs').insert({
          business_id: businessId,
          customer_id: recipient.customerId || null,
          phone: recipient.phone,
          message: personalised,
          event_type: 'campaign',
          status: 'failed',
          error_message: `${campaignName || 'SMS campaign'} · ${audienceType || 'audience'} · ${error?.message || 'Send failed'}`,
        })

        failed += 1
      }
    }

    return NextResponse.json({ sent, failed })
  } catch (error: any) {
    console.error('Send SMS campaign error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not send SMS campaign.' },
      { status: 500 }
    )
  }
}
