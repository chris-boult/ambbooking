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
    const { businessId, customerId, bookingId, loyaltyId, rewardLabel } = await request.json()

    if (!businessId || !customerId) {
      return NextResponse.json(
        { error: 'Missing business or customer ID.' },
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
      return NextResponse.json({ skipped: true, reason: 'SMS disabled.' })
    }

    if (!settings.account_sid || !settings.auth_token || !settings.from_number) {
      return NextResponse.json({ skipped: true, reason: 'Missing SMS provider settings.' })
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id,first_name,phone,sms_reminders')
      .eq('business_id', businessId)
      .eq('id', customerId)
      .maybeSingle()

    if (customerError) throw customerError

    if (!customer?.phone) {
      return NextResponse.json({ skipped: true, reason: 'Missing customer phone.' })
    }

    if (customer.sms_reminders === false) {
      return NextResponse.json({ skipped: true, reason: 'Customer has disabled SMS reminders.' })
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('business_name')
      .eq('id', businessId)
      .maybeSingle()

    const brandName = business?.business_name || 'AMB Booking'
    const firstName = customer.first_name || 'there'
    const reward = rewardLabel || 'your loyalty reward'

    const message = `Hi ${firstName}, congratulations. You've earned ${reward} with ${brandName}. Ask us to redeem it at your next visit.`

    const result = await sendTwilioSms({
      accountSid: settings.account_sid,
      authToken: settings.auth_token,
      from: settings.from_number,
      to: customer.phone,
      body: message,
    })

    await supabase.from('sms_logs').insert({
      business_id: businessId,
      customer_id: customerId,
      booking_id: bookingId || null,
      phone: customer.phone,
      message,
      event_type: 'loyalty_reward_earned',
      status: 'sent',
      provider_message_id: result?.sid || null,
    })

    return NextResponse.json({
      success: true,
      provider_message_id: result?.sid || null,
      loyalty_id: loyaltyId || null,
    })
  } catch (error: any) {
    console.error('Loyalty reward SMS error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not send loyalty reward SMS.' },
      { status: 500 }
    )
  }
}
