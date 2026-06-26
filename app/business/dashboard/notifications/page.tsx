'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { NotificationSettings } from '@/components/notifications/NotificationSettings'

export default function BusinessNotificationsPage() {
  const [businessId, setBusinessId] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadBusiness()
  }, [])

  async function loadBusiness() {
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setMessage('You need to be logged in.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !data?.[0]) {
      setMessage(error?.message || 'No business found.')
      setLoading(false)
      return
    }

    setBusinessId(data[0].id)
    setLoading(false)
  }

  if (loading) return <div className="text-white">Loading notifications...</div>

  if (!businessId) {
    return <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-200">{message || 'No business found.'}</div>
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-2 text-slate-400">Business</p>
        <h1 className="text-4xl font-black text-white">Notifications</h1>
        <p className="mt-2 max-w-3xl text-slate-500">
          View your notification history and manage which updates you receive.
        </p>
      </section>

      <NotificationPanel businessId={businessId} />
      <NotificationSettings businessId={businessId} />
    </div>
  )
}
