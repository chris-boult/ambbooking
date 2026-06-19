'use client'

import { DEFAULT_TIMELINE_SETTINGS, visibleHours } from '@/lib/calendar/calendarHelpers'

export function TimelineHourGrid() {
  const hours = visibleHours(DEFAULT_TIMELINE_SETTINGS)

  return (
    <div className="relative" style={{ height: DEFAULT_TIMELINE_SETTINGS.pixelsPerHour * (DEFAULT_TIMELINE_SETTINGS.endHour - DEFAULT_TIMELINE_SETTINGS.startHour) }}>
      {hours.map((hour, index) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-white/10"
          style={{ top: index * DEFAULT_TIMELINE_SETTINGS.pixelsPerHour }}
        >
          <span className="absolute -top-2 left-0 bg-slate-950 pr-3 text-xs font-bold text-slate-500">
            {String(hour).padStart(2, '0')}:00
          </span>
        </div>
      ))}
    </div>
  )
}
