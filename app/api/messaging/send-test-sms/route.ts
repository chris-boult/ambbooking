import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

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
    const { businessId, phone, message } = await request.json()

    if (!businessId || !phone || !message) {
      return NextResponse.json(
        { error: 'Missing business, phone or message.' },
        { status: 400 }
      )
    }

    const { data: settings, error: settingsError } = await supabase
      .from('sms_settings')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle()

    if (settingsError) throw settingsError

    if (!settings?.is_enabled) {
      await supabase.from('sms_logs').insert({
        business_id: businessId,
        phone,
        message,
        event_type: 'test',
        status: 'failed',
        error_message: 'SMS is disabled for this business.',
      })

      return NextResponse.json(
        { error: 'SMS is disabled for this business.' },
        { status: 400 }
      )
    }

    if (!settings.account_sid || !settings.auth_token || !settings.from_number) {
      await supabase.from('sms_logs').insert({
        business_id: businessId,
        phone,
        message,
        event_type: 'test',
        status: 'failed',
        error_message: 'Missing SMS provider settings.',
      })

      return NextResponse.json(
        { error: 'Missing SMS provider settings.' },
        { status: 400 }
      )
    }

    const twilioResult = await sendTwilioSms({
      accountSid: settings.account_sid,
      authToken: settings.auth_token,
      from: settings.from_number,
      to: phone,
      body: message,
    })

    const { error: logError } = await supabase.from('sms_logs').insert({
      business_id: businessId,
      phone,
      message,
      event_type: 'test',
      status: 'sent',
      provider_message_id: twilioResult?.sid || null,
    })

    if (logError) throw logError

    return NextResponse.json({
      success: true,
      provider_message_id: twilioResult?.sid || null,
    })
  } catch (error: any) {
    console.error('Send test SMS error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not send test SMS.' },
      { status: 500 }
    )
  }
}
