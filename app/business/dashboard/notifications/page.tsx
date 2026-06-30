'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type NotificationRecord = {
  id: string
  business_id: string | null
  user_id: string | null
  type: string | null
  priority: string | null
  title: string
  message: string
  link: string | null
  icon?: string | null
  colour?: string | null
  is_read: boolean | null
  is_archived?: boolean | null
  archived?: boolean | null
  created_at: string
}

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Bookings', value: 'booking' },
  { label: 'Payments', value: 'payment' },
  { label: 'Customers', value: 'customer' },
  { label: 'Memberships', value: 'membership' },
  { label: 'Reviews', value: 'review' },
  { label: 'Support', value: 'support' },
  { label: 'System', value: 'system' },
]

function notificationIcon(type?: string | null, priority?: string | null) {
  if (priority === 'critical') return '🚨'
  if (priority === 'warning') return '⚠️'
  if (type?.includes('booking')) return '📅'
  if (type?.includes('payment')) return '💳'
  if (type?.includes('membership')) return '👥'
  if (type?.includes('review')) return '⭐'
  if (type?.includes('support')) return '🎧'
  if (type?.includes('waiting')) return '⏳'
  if (type?.includes('system')) return '⚙️'
  return '🔔'
}

function priorityClasses(priority?: string | null) {
  if (priority === 'critical') return 'border-red-400/30 bg-red-500/10 text-red-200'
  if (priority === 'warning') return 'border-amber-400/30 bg-amber-400/10 text-amber-200'
  if (priority === 'success') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
  return 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
}

function typeMatches(type: string | null, filter: string) {
  if (filter === 'all') return true
  return String(type || '').toLowerCase().includes(filter)
}

function formatRelativeDate(value: string) {
  const created = new Date(value)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - created.getTime()) / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  return created.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function groupNotifications(notifications: NotificationRecord[]) {
  const today = new Date()
  const todayKey = today.toDateString()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayKey = yesterday.toDateString()
  const groups: Record<string, NotificationRecord[]> = { Today: [], Yesterday: [], 'This week': [], Older: [] }

  notifications.forEach((notification) => {
    const date = new Date(notification.created_at)
    const dateKey = date.toDateString()
    const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000)

    if (dateKey === todayKey) groups.Today.push(notification)
    else if (dateKey === yesterdayKey) groups.Yesterday.push(notification)
    else if (diffDays < 7) groups['This week'].push(notification)
    else groups.Older.push(notification)
  })

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, notifications]) => ({ label, notifications }))
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    setLoading(true)
    setMessage('')

    const { data: userData } = await supabase.auth.getUser()
    const currentUserId = userData.user?.id || null
    setUserId(currentUserId)

    if (!currentUserId) {
      setNotifications([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setNotifications(((data as NotificationRecord[]) || []).filter((n) => !(n.is_archived ?? n.archived ?? false)))
    setLoading(false)
  }

  async function markAllRead() {
    if (!userId) return
    setMessage('')

    const response = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, markAll: true }),
    })

    const result = await response.json()
    if (!response.ok) {
      setMessage(result.error || 'Could not mark notifications as read.')
      return
    }

    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })))
  }

  async function markRead(notificationId: string) {
    if (!userId) return

    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, notificationId }),
    })

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, is_read: true } : notification
      )
    )
  }

  const filteredNotifications = useMemo(() => {
    const q = search.trim().toLowerCase()

    return notifications.filter((notification) => {
      if (!typeMatches(notification.type, filter)) return false
      if (!q) return true
      return [notification.title, notification.message, notification.type, notification.priority]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    })
  }, [notifications, search, filter])

  const unreadCount = notifications.filter((notification) => !notification.is_read).length
  const todayCount = notifications.filter((notification) => new Date(notification.created_at).toDateString() === new Date().toDateString()).length
  const highPriorityCount = notifications.filter((notification) => ['critical', 'warning'].includes(String(notification.priority || ''))).length
  const thisWeekCount = notifications.filter((notification) => {
    const diffDays = Math.floor((new Date().getTime() - new Date(notification.created_at).getTime()) / 86400000)
    return diffDays < 7
  }).length

  const groups = groupNotifications(filteredNotifications)

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[#07111f] shadow-[0_60px_220px_rgba(0,0,0,.35)]">
          <div className="h-2 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />
          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                  <span>🔔</span>
                  Notification centre
                </div>
                <h1 className="text-4xl font-black tracking-[-0.04em] md:text-6xl">
                  Stay on top of everything.
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-400">
                  Track bookings, payments, memberships, support activity and important platform updates from one business command centre.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                  className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mark all read
                </button>
                <Link
                  href="/business/dashboard/settings"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Notification settings
                </Link>
              </div>
            </div>
          </div>
        </section>

        {message && <div className="mb-6 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-amber-100">{message}</div>}

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Unread" value={unreadCount} detail="Needs attention" accent="cyan" />
          <StatCard label="Today" value={todayCount} detail="New activity" accent="emerald" />
          <StatCard label="This week" value={thisWeekCount} detail="Recent updates" accent="blue" />
          <StatCard label="High priority" value={highPriorityCount} detail="Warnings and critical" accent="amber" />
        </section>

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notifications..."
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600"
            />
            <button type="button" onClick={loadNotifications} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white transition hover:bg-white/[0.08]">
              Refresh
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  filter === item.value
                    ? 'bg-white text-slate-950'
                    : 'border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-slate-400">Loading notifications...</section>
        ) : groups.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.035] p-12 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-400/10 text-3xl">🔔</div>
            <h2 className="text-2xl font-black">Nothing to show yet</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Notifications will appear here when bookings, payments, reviews, memberships and support updates happen.
            </p>
          </section>
        ) : (
          <section className="space-y-8">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="mb-4 flex items-center gap-4">
                  <h2 className="text-sm font-black uppercase tracking-[0.28em] text-slate-500">{group.label}</h2>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <div className="space-y-3">
                  {group.notifications.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} onMarkRead={() => markRead(notification.id)} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}

function StatCard({ label, value, detail, accent }: { label: string; value: number; detail: string; accent: 'cyan' | 'emerald' | 'blue' | 'amber' }) {
  const accentClass =
    accent === 'emerald'
      ? 'text-emerald-300 bg-emerald-400/10'
      : accent === 'blue'
        ? 'text-blue-300 bg-blue-400/10'
        : accent === 'amber'
          ? 'text-amber-300 bg-amber-400/10'
          : 'text-cyan-300 bg-cyan-400/10'

  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#07111f] p-6 shadow-[0_35px_120px_rgba(0,0,0,.35)]">
      <div className={`mb-5 inline-flex rounded-2xl px-3 py-2 text-sm font-black ${accentClass}`}>{label}</div>
      <div className="text-4xl font-black tracking-[-0.05em]">{value}</div>
      <p className="mt-2 text-sm font-bold text-slate-500">{detail}</p>
    </div>
  )
}

function NotificationCard({ notification, onMarkRead }: { notification: NotificationRecord; onMarkRead: () => void }) {
  const icon = notification.icon || notificationIcon(notification.type, notification.priority)
  const unread = !notification.is_read
  const link = notification.link || '/business/dashboard/notifications'

  return (
    <article className={`group rounded-[1.75rem] border p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.055] ${
      unread ? 'border-cyan-300/25 bg-cyan-400/[0.06] shadow-[0_35px_120px_rgba(34,211,238,.08)]' : 'border-white/10 bg-white/[0.035]'
    }`}>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl ${priorityClasses(notification.priority)}`}>{icon}</div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-black text-white">{notification.title}</h3>
              {unread && <span className="rounded-full bg-cyan-300 px-2.5 py-1 text-xs font-black text-slate-950">Unread</span>}
              {notification.priority && <span className={`rounded-full border px-2.5 py-1 text-xs font-black capitalize ${priorityClasses(notification.priority)}`}>{notification.priority}</span>}
            </div>
            <p className="mt-2 max-w-3xl leading-7 text-slate-400">{notification.message}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>{formatRelativeDate(notification.created_at)}</span>
              {notification.type && <span className="capitalize">• {notification.type.replaceAll('_', ' ')}</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3 md:justify-end">
          {unread && (
            <button type="button" onClick={onMarkRead} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white">
              Mark read
            </button>
          )}
          <Link href={link} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-300">
            Open
          </Link>
        </div>
      </div>
    </article>
  )
}
