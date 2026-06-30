import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { businessId, userId, subscription, userAgent } = body

    if (!businessId || !userId || !subscription?.endpoint) {
      return NextResponse.json({ error: 'Missing required subscription data.' }, { status: 400 })
    }

    const p256dh = subscription.keys?.p256dh
    const auth = subscription.keys?.auth

    if (!p256dh || !auth) {
      return NextResponse.json({ error: 'Missing push encryption keys.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          business_id: businessId,
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          user_agent: userAgent || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Push subscribe failed.' }, { status: 500 })
  }
}
