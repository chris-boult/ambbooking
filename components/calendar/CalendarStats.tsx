'use client'

export function CalendarStats({
  bookingsToday,
  upcomingBookings,
  revenueToday,
  bookedMinutes,
  utilisationPercent,
}: {
  bookingsToday: number
  upcomingBookings: number
  revenueToday: string
  bookedMinutes: string
  utilisationPercent: string
}) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      <StatCard label="Bookings today" value={bookingsToday} />
      <StatCard label="Upcoming" value={upcomingBookings} />
      <StatCard label="Revenue today" value={revenueToday} />
      <StatCard label="Booked time" value={bookedMinutes} />
      <StatCard label="Utilisation" value={utilisationPercent} />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="mb-2 text-sm text-slate-400">{label}</p>
      <h2 className="text-2xl font-black md:text-3xl">{value}</h2>
    </div>
  )
}
