'use client'

import type { StaffColumn } from '@/lib/calendar/calendarTypes'
import { money } from '@/lib/calendar/calendarHelpers'
import { calculateStaffUtilisation } from '@/lib/calendar/utilisation'

export function StaffUtilisationCard({ column }: { column: StaffColumn }) {
  const utilisation = calculateStaffUtilisation(column)

  return (
    <div className={`rounded-2xl border ${column.colour.border} ${column.colour.bg} p-4`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${column.colour.dot}`} />
            <h3 className="truncate font-black">{column.name}</h3>
          </div>
          <p className="mt-1 truncate text-xs text-slate-400">{column.role || 'Staff member'}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-black ${column.colour.text}`}>{utilisation.utilisationPercent}%</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Used</p>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-black/30">
        <div
          className={`h-full rounded-full ${column.colour.bgStrong}`}
          style={{ width: `${Math.min(utilisation.utilisationPercent, 100)}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="font-black">{utilisation.bookings}</p>
          <p className="text-xs text-slate-500">Bookings</p>
        </div>
        <div>
          <p className="font-black">{Math.round(utilisation.bookedMinutes / 60 * 10) / 10}h</p>
          <p className="text-xs text-slate-500">Booked</p>
        </div>
        <div>
          <p className="font-black">{money(utilisation.revenue)}</p>
          <p className="text-xs text-slate-500">Revenue</p>
        </div>
      </div>
    </div>
  )
}
