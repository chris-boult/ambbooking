'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { NotificationItem, type NotificationRow } from './NotificationItem'

export function NotificationBell({ businessId }: { businessId?: string }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  async function loadNotifications() {
    if (!businessId) return

    const params = new URLSearchParams({ businessId, limit: '10' })
    const response = await fetch(`/api/notifications/history?${params.toString()}`)
    const result = await response.json()

    setNotifications(result.notifications || [])
  }

  async function markRead(id: string) {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, is_read: true } : item)))
  }

  async function markAllRead() {
    if (!businessId) return

    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId }),
    })

    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
  }

  const unread = notifications.filter((item) => !item.is_read).length

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 font-black text-white hover:bg-slate-800"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-cyan-300 px-2 text-xs font-black text-slate-950">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[380px] rounded-3xl border border-slate-800 bg-slate-950 p-4 shadow-2xl">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white">Notifications</h3>
              <p className="text-xs text-slate-500">{unread} unread</p>
            </div>

            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-bold text-cyan-300 hover:text-white">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {notifications.slice(0, 8).map((notification) => (
              <NotificationItem key={notification.id} notification={notification} onRead={markRead} />
            ))}

            {notifications.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
                No notifications yet.
              </div>
            )}
          </div>

          <Link href="/business/dashboard/notifications" className="mt-4 block rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-slate-950">
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}
