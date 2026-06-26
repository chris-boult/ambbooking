'use client'

import { useEffect, useState } from 'react'
import { NotificationItem, type NotificationRow } from './NotificationItem'

export function NotificationPanel({ businessId }: { businessId: string }) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, filter])

  async function loadNotifications() {
    setLoading(true)

    const params = new URLSearchParams({
      businessId,
      limit: '100',
      unreadOnly: String(filter === 'unread'),
    })

    const response = await fetch(`/api/notifications/history?${params.toString()}`)
    const result = await response.json()

    setNotifications(result.notifications || [])
    setLoading(false)
  }

  async function markRead(id: string) {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, is_read: true } : item)))
  }

  async function remove(id: string) {
    await fetch('/api/notifications/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    setNotifications((current) => current.filter((item) => item.id !== id))
  }

  async function markAllRead() {
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId }),
    })

    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Notification history</h2>
          <p className="mt-1 text-sm text-slate-500">Important updates from bookings, payments, marketplace and more.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFilter('all')} className={`rounded-xl px-4 py-3 text-sm font-black ${filter === 'all' ? 'bg-white text-slate-950' : 'border border-slate-800 text-white'}`}>
            All
          </button>
          <button type="button" onClick={() => setFilter('unread')} className={`rounded-xl px-4 py-3 text-sm font-black ${filter === 'unread' ? 'bg-white text-slate-950' : 'border border-slate-800 text-white'}`}>
            Unread
          </button>
          <button type="button" onClick={markAllRead} className="rounded-xl border border-slate-800 px-4 py-3 text-sm font-black text-white">
            Mark all read
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-500">Loading notifications...</div>
      ) : notifications.length ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onRead={markRead} onDelete={remove} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-8 text-center text-slate-500">No notifications found.</div>
      )}
    </section>
  )
}
