'use client'

import Link from 'next/link'

export type NotificationRow = {
  id: string
  business_id?: string | null
  user_id?: string | null
  type: string
  title: string
  message?: string | null
  link?: string | null
  is_read: boolean
  archived?: boolean
  priority?: string | null
  created_at: string
}

export function NotificationItem({
  notification,
  onRead,
  onDelete,
}: {
  notification: NotificationRow
  onRead: (id: string) => void
  onDelete?: (id: string) => void
}) {
  const inner = (
    <div className={`rounded-2xl border p-4 ${notification.is_read ? 'border-slate-800 bg-slate-950' : 'border-cyan-300/20 bg-cyan-300/10'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {!notification.is_read && <span className="h-2 w-2 rounded-full bg-cyan-300" />}
            <p className="font-black text-white">{notification.title}</p>
            {notification.priority === 'high' && (
              <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs font-black text-red-300">High</span>
            )}
          </div>

          {notification.message && <p className="text-sm text-slate-400">{notification.message}</p>}
          <p className="mt-2 text-xs text-slate-600">{new Date(notification.created_at).toLocaleString('en-GB')}</p>
        </div>

        <div className="flex shrink-0 gap-2">
          {!notification.is_read && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                onRead(notification.id)
              }}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/10"
            >
              Read
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                onDelete(notification.id)
              }}
              className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )

  if (notification.link) {
    return (
      <Link href={notification.link} onClick={() => !notification.is_read && onRead(notification.id)}>
        {inner}
      </Link>
    )
  }

  return inner
}
