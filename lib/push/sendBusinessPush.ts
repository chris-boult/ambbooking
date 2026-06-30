import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export async function sendBusinessPush({
  businessId,
  title,
  body,
  url = '/business/dashboard',
}: {
  businessId: string
  title: string
  body: string
  url?: string
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:hello@amb-booking.co.uk'

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    throw new Error('Missing push notification environment variables.')
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('business_id', businessId)
    .eq('is_active', true)

  if (error) throw new Error(error.message)

  const payload = JSON.stringify({
    title,
    body,
    url,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
  })

  const results = await Promise.allSettled(
    (subscriptions || []).map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
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

  return { attempted: subscriptions?.length || 0, failed: failedIds.length }
}
