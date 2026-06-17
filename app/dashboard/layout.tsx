import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const navItems = [
    { name: 'Overview', href: '/dashboard' },
    { name: 'Calendar', href: '/dashboard/calendar' },
    { name: 'Bookings', href: '/dashboard/bookings' },
    { name: 'Customers', href: '/dashboard/customers' },
    { name: 'Services', href: '/dashboard/services' },
    { name: 'Team', href: '/dashboard/team' },
    { name: 'Insights', href: '/dashboard/reports' },
    { name: 'Settings', href: '/dashboard/settings' },
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,#8B5CF633_0%,transparent_30%),radial-gradient(circle_at_bottom_right,#2563EB33_0%,transparent_32%)]" />

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/10 bg-black/50 backdrop-blur-2xl px-6 py-7">
          <Link href="/dashboard" className="mb-10 block">
           <img
  src="/logo.png"
  alt="AMB360"
  className="w-40 h-auto block"
/>

            <div className="mt-4 text-[10px] uppercase tracking-[0.45em] text-slate-500">
              BOOKING
            </div>
          </Link>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-2xl px-4 py-3 text-sm font-bold text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-3">
              Trial Active
            </div>

            <div className="text-lg font-bold">
              Growth Plan
            </div>

            <p className="mt-2 text-sm text-slate-400">
              Your booking system is live.
            </p>

            <Link
              href="/onboarding/plan"
              className="mt-5 block rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-4 py-3 text-center text-sm font-bold"
            >
              Manage Plan
            </Link>
          </div>
        </aside>

        <div className="flex-1">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#020617]/80 backdrop-blur-2xl px-6 py-5 lg:px-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.45em] text-slate-500">
                  AMB360 BOOKING
                </div>

                <div className="mt-1 text-sm text-slate-400">
                  Book more. Manage less.
                </div>
              </div>

              <Link
                href="/dashboard/settings"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-300 hover:text-white"
              >
                Settings
              </Link>
            </div>
          </header>

          <main className="px-6 py-8 lg:px-10 lg:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}