import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:hello@amb-booking.co.uk'

    if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: 'Missing push notification environment variables.' },
        { status: 500 }
      )
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { businessId, title, body: messageBody, url = '/business/dashboard' } = await req.json()

    if (!businessId || !title || !messageBody) {
      return NextResponse.json({ error: 'Missing push payload.' }, { status: 400 })
    }

    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('business_id', businessId)
      .eq('is_active', true)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const payload = JSON.stringify({
      title,
      body: messageBody,
      url,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
    })

    const results = await Promise.allSettled(
      (subscriptions || []).map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )
      )
    )

    const failedIds = results
      .map((result, index) => ({ result, sub: subscriptions?.[index] }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ sub }) => sub?.id)
      .filter(Boolean)

    if (failedIds.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('id', failedIds)
    }

    return NextResponse.json({
      ok: true,
      attempted: subscriptions?.length || 0,
      failed: failedIds.length,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Push send failed.' },
      { status: 500 }
    )
  }
}