'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOutPartner } from '@/lib/partnerPortal'

const navItems = [
  { name: 'Dashboard', href: '/partner/dashboard' },
  { name: 'Referrals', href: '/partner/referrals' },
  { name: 'Commissions', href: '/partner/commissions' },
  { name: 'Payouts', href: '/partner/payouts' },
  { name: 'Assets', href: '/partner/assets' },
  { name: 'Settings', href: '/partner/settings' },
]

export default function PartnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-white/10 bg-slate-950/95 p-5">
          <Link href="/partner/dashboard" className="mb-8 block rounded-2xl border border-white/10 bg-black p-4 text-lg font-bold">
            AMB Booking
            <span className="mt-1 block text-xs font-medium uppercase tracking-[0.25em] text-cyan-300">Partner Portal</span>
          </Link>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-4 py-3 text-sm font-semibold ${
                    active ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <button
            onClick={signOutPartner}
            className="mt-8 w-full rounded-xl border border-white/10 px-4 py-3 text-left text-sm font-semibold text-slate-300 hover:bg-white/10"
          >
            Sign out
          </button>
        </aside>

        <section className="p-6 lg:p-8">{children}</section>
      </div>
    </main>
  )
}
