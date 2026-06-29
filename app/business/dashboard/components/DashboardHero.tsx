import { Sparkles } from 'lucide-react'
import DashboardButton from './DashboardButton'

export default function DashboardHero({ businessName, email }: { businessName: string; email: string }) {
  return (
    <div className="mb-8 overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_70px_240px_rgba(0,0,0,.55)]">
      <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
            <Sparkles size={14} />
            Business dashboard
          </div>

          <h1 className="max-w-5xl text-5xl font-black leading-[1.02] tracking-[-0.055em] md:text-7xl">
            Welcome back,
            <br />
            {businessName}.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Monitor today&apos;s bookings, revenue, customers, team performance and business activity from one connected command centre.
          </p>

          <p className="mt-3 text-sm font-bold text-slate-500">Logged in as {email}</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <DashboardButton href="/business/dashboard/bookings" primary>Manage bookings</DashboardButton>
          <DashboardButton href="/business/dashboard/calendar">View calendar</DashboardButton>
          <DashboardButton href="/business/dashboard/reports">Reports</DashboardButton>
        </div>
      </div>
    </div>
  )
}
