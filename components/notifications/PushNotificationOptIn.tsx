'use client'

import { useState } from 'react'
import { registerPushSubscription } from '@/lib/push/client'

export function PushNotificationOptIn({ businessId }: { businessId?: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function enablePush() {
    setLoading(true)
    setMessage('')

    try {
      await registerPushSubscription(businessId)
      setMessage('Push notifications enabled.')
    } catch (error: any) {
      setMessage(error?.message || 'Could not enable push notifications.')
    }

    setLoading(false)
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-2xl font-black text-white">Push notifications</h2>
      <p className="mt-2 text-slate-400">
        Receive booking updates, reminders, cancellations and important alerts on this device.
      </p>

      {message && (
        <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={enablePush}
        disabled={loading}
        className="mt-5 rounded-2xl bg-white px-5 py-3 font-black text-slate-950 disabled:opacity-50"
      >
        {loading ? 'Enabling...' : 'Enable push notifications'}
      </button>
    </section>
  )
}
