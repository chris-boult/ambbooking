'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function PushNotificationOptIn({ businessId }: { businessId: string }) {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    setSupported(isSupported)

    if (isSupported) {
      setPermission(Notification.permission)
      navigator.serviceWorker.register('/sw.js').catch(() => {
        setMessage('Could not register push service worker.')
      })
    }
  }, [])

  async function enablePush() {
    setLoading(true)
    setMessage('')

    try {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        setMessage('You need to be logged in to enable notifications.')
        setLoading(false)
        return
      }

      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        setMessage('Notifications were not enabled.')
        setLoading(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const existingSubscription = await registration.pushManager.getSubscription()

      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        }))

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          userId: userData.user.id,
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.error || 'Could not save push subscription.')
        setLoading(false)
        return
      }

      setMessage('Push notifications enabled.')
    } catch (error: any) {
      setMessage(error.message || 'Could not enable push notifications.')
    }

    setLoading(false)
  }

  async function disablePush() {
    setLoading(true)
    setMessage('')

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })

        await subscription.unsubscribe()
      }

      setMessage('Push notifications disabled.')
      setPermission(Notification.permission)
    } catch (error: any) {
      setMessage(error.message || 'Could not disable push notifications.')
    }

    setLoading(false)
  }

  if (!supported) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
        Push notifications are not supported on this browser.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-black text-white">Push notifications</p>
          <p className="mt-1 text-sm text-slate-400">
            Get alerts for new bookings, cancellations and important business updates.
          </p>
          {message && <p className="mt-2 text-sm text-cyan-300">{message}</p>}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={enablePush}
            disabled={loading || permission === 'granted'}
            className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
          >
            {permission === 'granted' ? 'Enabled' : loading ? 'Working...' : 'Enable'}
          </button>

          <button
            type="button"
            onClick={disablePush}
            disabled={loading}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10 disabled:opacity-50"
          >
            Disable
          </button>
        </div>
      </div>
    </div>
  )
}
