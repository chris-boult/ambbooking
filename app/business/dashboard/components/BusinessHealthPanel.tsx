import { BarChart3 } from 'lucide-react'
import MiniStat from './MiniStat'

export default function BusinessHealthPanel({
  servicesCount,
  teamCount,
  bookingsCount,
  dashboard,
}: {
  servicesCount: number
  teamCount: number
  bookingsCount: number
  dashboard: any
}) {
  return (
    <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_60px_200px_rgba(0,0,0,.45)]">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-cyan-300">Snapshot</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Business health</h2>
        </div>

        <BarChart3 className="text-cyan-300" />
      </div>

      <div className="space-y-4">
        <MiniStat label="Services" value={servicesCount} />
        <MiniStat label="Team members" value={teamCount} />
        <MiniStat label="Total bookings" value={bookingsCount} />
        <MiniStat label="Confirmed" value={dashboard.confirmedBookings.length} />
        <MiniStat label="Cancelled" value={dashboard.cancelledBookings.length} />
        <MiniStat label="Total revenue" value={`£${dashboard.totalRevenue}`} />
      </div>
    </section>
  )
}
