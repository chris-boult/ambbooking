import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { subscription, businessId, userAgent, accessToken } = body

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'Missing push subscription.' }, { status: 400 })
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Missing access token.' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  )

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken)
  const user = userData.user

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const keys = subscription.keys || {}

  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        business_id: businessId || null,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: userAgent || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ subscription: data })
}