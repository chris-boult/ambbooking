import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const navItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Calendar', href: '/dashboard/calendar' },
  { name: 'Bookings', href: '/dashboard/bookings' },
  { name: 'Reports', href: '/dashboard/reports' },
  { name: 'Customers', href: '/dashboard/customers' },
  { name: 'Services', href: '/dashboard/services' },
  { name: 'Team', href: '/dashboard/team' },
  { name: 'Availability', href: '/dashboard/team/availability' },
  { name: 'Settings', href: '/dashboard/settings' },
]

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <aside className="w-72 bg-slate-900 border-r border-slate-800 p-6">
        <h1 className="text-2xl font-bold mb-10">AMB Booking</h1>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-10">{children}</main>
    </div>
  )
}