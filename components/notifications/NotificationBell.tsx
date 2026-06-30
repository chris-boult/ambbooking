'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type NotificationRecord = {
  id: string
  title: string
  message: string
  type: string | null
  priority: string | null
  link: string | null
  icon?: string | null
  is_read: boolean | null
  is_archived?: boolean | null
  archived?: boolean | null
  created_at: string
}

function iconFor(type?: string | null, priority?: string | null) {
  if (priority === 'critical') return '🚨'
  if (priority === 'warning') return '⚠️'
  if (type?.includes('booking')) return '📅'
  if (type?.includes('payment')) return '💳'
  if (type?.includes('membership')) return '👥'
  if (type?.includes('review')) return '⭐'
  if (type?.includes('support')) return '🎧'
  if (type?.includes('waiting')) return '⏳'
  return '🔔'
}

function timeAgo(value: string) {
  const created = new Date(value)
  const diff = Math.floor((Date.now() - created.getTime()) / 60000)
  if (diff < 1) return 'Just now'
  if (diff < 60) return `${diff}m ago`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function isVisibleNotification(item: NotificationRecord) {
  return !(item.is_archived ?? item.archived ?? false)
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [livePulse, setLivePulse] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read && isVisibleNotification(item)).length,
    [notifications]
  )

  async function loadNotifications() {
    if (!userId) return

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8)

    if (!error) {
      setNotifications(((data as NotificationRecord[]) || []).filter(isVisibleNotification))
    }

    setLoading(false)
  }

  async function markAllRead() {
    if (!userId || unreadCount === 0) return

    const response = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, markAll: true }),
    })

    if (response.ok) {
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
    }
  }

  async function markOneRead(notificationId: string) {
    if (!userId) return

    const response = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, notificationId }),
    })

    if (response.ok) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        )
      )
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [userId])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notification-bell-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as NotificationRecord

          if (!isVisibleNotification(next)) return

          setNotifications((current) => {
            const exists = current.some((item) => item.id === next.id)
            if (exists) return current
            return [next, ...current].slice(0, 8)
          })

          setLivePulse(true)
          window.setTimeout(() => setLivePulse(false), 1600)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as NotificationRecord

          setNotifications((current) => {
            const next = current.map((item) => (item.id === updated.id ? updated : item)).filter(isVisibleNotification)
            return next.slice(0, 8)
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-lg shadow-xl transition hover:bg-white/[0.1] ${
          livePulse ? 'ring-4 ring-cyan-300/20' : ''
        }`}
        aria-label="Notifications"
      >
        <span className={unreadCount > 0 ? 'animate-pulse' : ''}>🔔</span>

        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black leading-4 text-white ring-2 ring-[#020617]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-white/10 bg-[#07111f]/95 shadow-[0_35px_140px_rgba(0,0,0,.65)] backdrop-blur-2xl">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-black text-white">Notifications</p>
                <p className="mt-1 text-sm text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'You are all caught up'}
                </p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                  Live
                </p>
              </div>

              <button
                type="button"
                onClick={markAllRead}
                disabled={unreadCount === 0}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Mark all read
              </button>
            </div>
          </div>

          <div className="max-h-[28rem] overflow-y-auto p-3">
            {loading ? (
              <div className="p-5 text-sm text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-2xl">
                  🔔
                </div>
                <p className="font-black text-white">No notifications yet</p>
                <p className="mt-2 text-sm text-slate-400">New booking and business updates will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 5).map((notification) => {
                  const href = notification.link || '/business/dashboard/notifications'
                  const unread = !notification.is_read

                  return (
                    <Link
                      key={notification.id}
                      href={href}
                      onClick={() => {
                        markOneRead(notification.id)
                        setOpen(false)
                      }}
                      className={`block rounded-2xl border p-4 transition hover:bg-white/[0.07] ${
                        unread
                          ? 'border-cyan-300/20 bg-cyan-400/[0.06]'
                          : 'border-white/10 bg-white/[0.025]'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-lg">
                          {notification.icon || iconFor(notification.type, notification.priority)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="line-clamp-1 font-black text-white">{notification.title}</p>
                            {unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-300" />}
                          </div>

                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-400">
                            {notification.message}
                          </p>

                          <p className="mt-2 text-xs font-bold text-slate-500">
                            {timeAgo(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-3">
            <Link
              href="/business/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-cyan-300"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
