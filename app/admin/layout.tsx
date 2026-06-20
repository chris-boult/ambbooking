'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type PlatformAdmin = {
  email: string
  full_name: string | null
  role: string
  is_active: boolean
}

const navItems = [
  { name: 'Overview', href: '/admin' },
  { name: 'Search', href: '/admin/search' },

  { name: 'Businesses', href: '/admin/businesses' },
  { name: 'Create Business', href: '/admin/businesses/create' },

  { name: 'Partner Centre', href: '/admin/partners' },

  { name: 'Customers', href: '/admin/customers' },
  { name: 'Bookings', href: '/admin/bookings' },

  { name: 'Revenue', href: '/admin/revenue' },
  { name: 'Subscriptions', href: '/admin/subscriptions' },

  { name: 'White Label', href: '/admin/branding' },
  { name: 'Domains', href: '/admin/domains' },
  { name: 'Email Branding', href: '/admin/email-branding' },
  { name: 'Launch Readiness', href: '/admin/launch-readiness' },

  { name: 'Support', href: '/admin/support' },
  { name: 'Platform Health', href: '/admin/health' },
  { name: 'Feature Flags', href: '/admin/feature-flags' },
  { name: 'Audit Logs', href: '/admin/audit' },

  { name: 'Activity', href: '/admin/activity' },
  { name: 'Settings', href: '/admin/settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkPlatformAdmin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkPlatformAdmin() {
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    const email = userData.user?.email?.toLowerCase()

    if (!email) {
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('platform_admins')
      .select('email,full_name,role,is_active')
      .eq('email', email)
      .eq('is_active', true)
      .limit(1)

    if (error || !data?.[0]) {
      setAdmin(null)
      setLoading(false)
      return
    }

    setAdmin(data[0] as PlatformAdmin)
    setLoading(false)
  }

  const title = useMemo(() => {
    const match = [...navItems]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) =>
        item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
      )

    return match?.name || 'Master Admin'
  }, [pathname])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020617] p-8 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          Loading master admin...
        </div>
      </main>
    )
  }

  if (!admin) {
    return (
      <main className="min-h-screen bg-[#020617] p-8 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8">
          <h1 className="text-3xl font-black">Access denied</h1>
          <p className="mt-3 text-red-200">
            This area is restricted to active platform administrators.
          </p>
          <Link
            href="/business"
            className="mt-6 inline-block rounded-2xl bg-white px-5 py-3 font-black text-slate-950"
          >
            Return to dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020617] text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,#8B5CF633_0%,transparent_30%),radial-gradient(circle_at_bottom_right,#2563EB33_0%,transparent_32%)]" />

      <div className="relative z-10 flex min-h-screen w-full">
        <aside className="hidden h-screen w-72 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-black/50 px-6 py-7 backdrop-blur-2xl lg:flex">
          <Link href="/admin" className="mb-8 block">
            <div className="rounded-2xl border border-white/10 bg-black p-4">
              <img src="/logo.png" alt="AMB360" className="block h-auto w-full max-w-[170px]" />
            </div>
            <div className="mt-4 text-[10px] uppercase tracking-[0.45em] text-slate-500">
              MASTER ADMIN
            </div>
          </Link>

          <nav className="space-y-1 pb-6">
            {navItems.map((item) => {
              const active =
                item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    active
                      ? 'bg-white text-slate-950'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
              {admin.role}
            </div>
            <div className="mt-2 break-words text-lg font-bold">
              {admin.full_name || admin.email}
            </div>
            <p className="mt-2 text-sm text-slate-400">Full platform control enabled.</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#020617]/80 px-4 py-5 backdrop-blur-2xl sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.45em] text-slate-500">
                  AMB BOOKING
                </div>
                <h1 className="mt-1 truncate text-2xl font-black">{title}</h1>
              </div>

              <Link
                href="/business"
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-300 hover:text-white"
              >
                Business dashboard
              </Link>
            </div>
          </header>

          <main className="w-full max-w-none overflow-x-auto px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <div className="w-full min-w-0">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}