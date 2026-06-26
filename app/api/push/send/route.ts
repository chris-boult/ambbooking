import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { supabase } from '@/lib/supabase'

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:hello@example.com'

  if (!publicKey || !privateKey) {
    throw new Error('Missing VAPID keys.')
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export async function POST(request: NextRequest) {
  try {
    configureWebPush()

    const body = await request.json()
    const { businessId, userId, title, message, url } = body

    if (!title) {
      return NextResponse.json({ error: 'Missing title.' }, { status: 400 })
    }

    let query = supabase
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true)

    if (businessId) query = query.eq('business_id', businessId)
    if (userId) query = query.eq('user_id', userId)

    const { data: subscriptions, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const payload = JSON.stringify({
      title,
      body: message || '',
      url: url || '/',
    })

    const results = await Promise.allSettled(
      (subscriptions || []).map(async (sub: any) => {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )

        await supabase.from('push_notification_logs').insert({
          business_id: sub.business_id,
          user_id: sub.user_id,
          title,
          body: message || null,
          url: url || null,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
      })
    )

    const sent = results.filter((result) => result.status === 'fulfilled').length
    const failed = results.length - sent

    return NextResponse.json({
      sent,
      failed,
      total: results.length,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not send push notification.' },
      { status: 500 }
    )
  }
}