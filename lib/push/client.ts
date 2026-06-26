export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export async function registerPushSubscription(businessId?: string) {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.')
  }

  if (!('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser.')
  }

  const { supabase } = await import('@/lib/supabase')

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('You need to be logged in to enable push notifications.')
  }

  const permission = await Notification.requestPermission()

  if (permission !== 'granted') {
    throw new Error('Push permission was not granted.')
  }

  const registration = await navigator.serviceWorker.register('/push-sw.js')
  await navigator.serviceWorker.ready

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  if (!publicKey) {
    throw new Error('Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY.')
  }

  const existing = await registration.pushManager.getSubscription()

  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      businessId,
      subscription,
      userAgent: navigator.userAgent,
      accessToken: session.access_token,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result?.error || 'Could not save push subscription.')
  }

  return result
}