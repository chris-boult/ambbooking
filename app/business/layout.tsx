'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BrandProvider, resolveBrand, useBrand, type BrandConfig } from '@/lib/branding'
import NotificationBell from '@/components/notifications/NotificationBell'

type UserRole = 'owner' | 'manager' | 'staff' | null
type NavRole = 'owner' | 'manager' | 'staff'

type NavItem = {
  name: string
  href: string
  roles: NavRole[]
}

type BusinessBrandRow = {
  id?: string
  business_name?: string | null
  slug?: string | null
  logo_url?: string | null
  favicon_url?: string | null
  primary_colour?: string | null
  secondary_colour?: string | null
  accent_colour?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  custom_domain?: string | null
  white_label_mode?: boolean | null
  hide_amb_branding?: boolean | null
  brand_mode?: 'amb' | 'co_branded' | 'white_label' | 'agency' | null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [role, setRole] = useState<UserRole>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loadingRole, setLoadingRole] = useState(true)
  const [brand, setBrand] = useState<BrandConfig | undefined>()

  useEffect(() => {
    async function loadRoleAndBrand() {
      const { data: userData } = await supabase.auth.getUser()
      setUserId(userData.user?.id || null)

      if (!userData.user?.email) {
        setRole(null)
        setLoadingRole(false)
        return
      }

      const { data: staffData } = await supabase
        .from('staff_users')
        .select('role, business_id')
        .eq('email', userData.user.email)
        .limit(1)

      const staffRow = staffData?.[0]
      setRole((staffRow?.role as UserRole) || null)

      let businessRow: BusinessBrandRow | null = null

      if (staffRow?.business_id) {
        const { data } = await supabase
          .from('businesses')
          .select(`
            id,
            business_name,
            slug,
            logo_url,
            favicon_url,
            primary_colour,
            secondary_colour,
            accent_colour,
            email,
            phone,
            website,
            custom_domain,
            white_label_mode,
            hide_amb_branding,
            brand_mode
          `)
          .eq('id', staffRow.business_id)
          .maybeSingle()

        businessRow = data as BusinessBrandRow | null
      } else {
        const { data } = await supabase
          .from('businesses')
          .select(`
            id,
            business_name,
            slug,
            logo_url,
            favicon_url,
            primary_colour,
            secondary_colour,
            accent_colour,
            email,
            phone,
            website,
            custom_domain,
            white_label_mode,
            hide_amb_branding,
            brand_mode
          `)
          .eq('user_id', userData.user.id)
          .order('created_at', { ascending: false })
          .limit(1)

        businessRow = (data?.[0] as BusinessBrandRow | undefined) || null
      }

      setBrand(resolveBrand(businessRow))
      setLoadingRole(false)
    }

    loadRoleAndBrand()
  }, [])

  return (
    <BrandProvider brand={brand}>
      <DashboardShell role={role} loadingRole={loadingRole} userId={userId}>
        {children}
      </DashboardShell>
    </BrandProvider>
  )
}

function DashboardShell({
  children,
  role,
  loadingRole,
  userId,
}: {
  children: React.ReactNode
  role: UserRole
  loadingRole: boolean
  userId: string | null
}) {
  const brand = useBrand()

  const navItems = useMemo<NavItem[]>((() => {
    const allItems: NavItem[] = [
      { name: 'Overview', href: '/business/dashboard', roles: ['owner', 'manager', 'staff'] },
      { name: 'Calendar', href: '/business/dashboard/calendar', roles: ['owner', 'manager', 'staff'] },
      { name: 'Bookings', href: '/business/dashboard/bookings', roles: ['owner', 'manager', 'staff'] },
      { name: 'Customers', href: '/business/dashboard/customers', roles: ['owner', 'manager', 'staff'] },
      { name: 'Services', href: '/business/dashboard/services', roles: ['owner', 'manager'] },
      { name: 'Team', href: '/business/dashboard/team', roles: ['owner', 'manager'] },
      { name: 'Staff', href: '/business/dashboard/staff', roles: ['owner', 'manager'] },
      { name: 'Packages', href: '/business/dashboard/packages', roles: ['owner', 'manager'] },
      { name: 'Memberships', href: '/business/dashboard/memberships', roles: ['owner', 'manager'] },
      { name: 'Gift Vouchers', href: '/business/dashboard/gift-vouchers', roles: ['owner', 'manager'] },
      { name: 'Customer Engagement', href: '/business/dashboard/customer-engagement', roles: ['owner', 'manager'] },
      { name: 'SMS Marketing', href: '/business/dashboard/marketing/sms', roles: ['owner', 'manager'] },
      { name: 'Email Campaigns', href: '/business/dashboard/marketing/email', roles: ['owner', 'manager'] },
      { name: 'Reports', href: '/business/dashboard/reports', roles: ['owner', 'manager'] },
      { name: 'Money', href: '/business/dashboard/money', roles: ['owner', 'manager'] },
      { name: 'Support', href: '/business/dashboard/support', roles: ['owner', 'manager', 'staff'] },
      { name: 'Settings', href: '/business/dashboard/settings', roles: ['owner'] },
    ]

    const resolvedRole: NavRole = role ?? 'owner'
    return allItems.filter((item) => item.roles.includes(resolvedRole))
  }), [role])

  const logoUrl = brand.logoUrl || ''

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#020617] text-white"
      style={
        {
          '--brand-primary': brand.primaryColour,
          '--brand-secondary': brand.secondaryColour,
          '--brand-accent': brand.accentColour,
        } as React.CSSProperties
      }
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: `radial-gradient(circle at top left, ${brand.accentColour}33 0%, transparent 30%), radial-gradient(circle at bottom right, ${brand.primaryColour}33 0%, transparent 32%)`,
        }}
      />

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-black/50 px-6 py-7 backdrop-blur-2xl lg:flex">
          <Link href="/business/dashboard" className="mb-10 block">
            <div className="rounded-2xl border border-white/10 bg-black p-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brand.businessName || brand.platformName || 'Business'}
                  className="block h-auto w-full max-w-[170px]"
                />
              ) : (
                <div className="text-xl font-black tracking-tight">
                  {brand.platformName}
                </div>
              )}
            </div>

            <div className="mt-4 text-[10px] uppercase tracking-[0.45em] text-slate-500">
              {brand.whiteLabel ? 'BOOKING' : brand.bookingName}
            </div>
          </Link>

          <nav className="space-y-1 overflow-y-auto pr-1">
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
            <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">
              {role ? `${role} access` : 'owner access'}
            </div>

            <div className="text-lg font-bold">Growth Plan</div>

            <p className="mt-2 text-sm text-slate-400">
              Your booking system is live.
            </p>

            {(role || 'owner') === 'owner' && (
              <Link
                href="/onboarding/plan"
                className="mt-5 block rounded-xl px-4 py-3 text-center text-sm font-bold text-white"
                style={{
                  background: `linear-gradient(90deg, ${brand.accentColour}, ${brand.primaryColour})`,
                }}
              >
                Manage Plan
              </Link>
            )}
          </div>
        </aside>

        <div className="flex-1">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#020617]/80 px-6 py-5 backdrop-blur-2xl lg:px-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.45em] text-slate-500">
                  {brand.platformName}
                </div>

                <div className="mt-1 text-sm text-slate-400">
                  {brand.whiteLabel
                    ? `Manage ${brand.businessName}`
                    : 'Book more. Manage less.'}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {userId && <NotificationBell userId={userId} />}

                {(role || 'owner') === 'owner' && (
                  <Link
                    href="/business/dashboard/settings"
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-300 hover:text-white"
                  >
                    Settings
                  </Link>
                )}
              </div>
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