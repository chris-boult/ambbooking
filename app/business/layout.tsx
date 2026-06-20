'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type UserRole = 'owner' | 'manager' | 'staff' | null

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [role, setRole] = useState<UserRole>(null)
  const [loadingRole, setLoadingRole] = useState(true)

  useEffect(() => {
    async function loadRole() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user?.email) {
        setRole(null)
        setLoadingRole(false)
        return
      }

      const { data } = await supabase
        .from('staff_users')
        .select('role')
        .eq('email', userData.user.email)
        .limit(1)

      setRole((data?.[0]?.role as UserRole) || null)
      setLoadingRole(false)
    }

    loadRole()
  }, [])

  const navItems = useMemo(() => {
    const allItems = [
      { name: 'Overview', href: '/business', roles: ['owner', 'manager', 'staff'] },
      { name: 'Calendar', href: '/business/dashboard/calendar', roles: ['owner', 'manager', 'staff'] },
      { name: 'Bookings', href: '/business/dashboard/bookings', roles: ['owner', 'manager', 'staff'] },
      { name: 'Customers', href: '/business/dashboard/customers', roles: ['owner', 'manager', 'staff'] },
      { name: 'Services', href: '/business/dashboard/services', roles: ['owner', 'manager'] },
      { name: 'Team', href: '/business/dashboard/team', roles: ['owner', 'manager'] },
      { name: 'Staff', href: '/business/dashboard/staff', roles: ['owner', 'manager'] },
      { name: 'Packages', href: '/business/dashboard/packages', roles: ['owner', 'manager'] },
      { name: 'Reports', href: '/business/dashboard/reports', roles: ['owner', 'manager'] },
   { name: 'Memberships', href: '/business/dashboard/memberships', roles: ['owner', 'manager'] },
      { name: 'Gift Vouchers', href: '/business/dashboard/gift-vouchers', roles: ['owner', 'manager'] },
      { name: 'Settings', href: '/business/dashboard/settings', roles: ['owner'] },
    ]

    return allItems.filter((item) => role && item.roles.includes(role))
  }, [role])

  return (
    <div className="min-h-screen bg-[#020617] text-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,#8B5CF633_0%,transparent_30%),radial-gradient(circle_at_bottom_right,#2563EB33_0%,transparent_32%)]" />

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/10 bg-black/50 backdrop-blur-2xl px-6 py-7">
          <Link href="/business" className="mb-10 block">
            <div className="rounded-2xl border border-white/10 bg-black p-4">
              <img
                src="/logo.png"
                alt="AMB360"
                className="block w-full max-w-[170px] h-auto"
              />
            </div>

            <div className="mt-4 text-[10px] uppercase tracking-[0.45em] text-slate-500">
              BOOKING
            </div>
          </Link>

          <nav className="space-y-1">
            {loadingRole && (
              <div className="px-4 py-3 text-sm text-slate-500">
                Loading menu...
              </div>
            )}

            {!loadingRole &&
              navItems.map((item) => (
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
              {role ? `${role} access` : 'No role found'}
            </div>

            <div className="text-lg font-bold">Growth Plan</div>

            <p className="mt-2 text-sm text-slate-400">
              Your booking system is live.
            </p>

            {role === 'owner' && (
              <Link
                href="/onboarding/plan"
                className="mt-5 block rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-4 py-3 text-center text-sm font-bold"
              >
                Manage Plan
              </Link>
            )}
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

              {role === 'owner' && (
                <Link
                  href="/business/dashboard/settings"
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-300 hover:text-white"
                >
                  Settings
                </Link>
              )}
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