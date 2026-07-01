'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Gift,
  Headphones,
  Home,
  Mail,
  Menu,
  MessageSquare,
  Package,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { BrandProvider, resolveBrand, useBrand, type BrandConfig } from '@/lib/branding'
import NotificationBell from '@/components/notifications/NotificationBell'

type UserRole = 'owner' | 'manager' | 'staff' | null
type NavRole = 'owner' | 'manager' | 'staff'

type NavItem = {
  name: string
  href: string
  roles: NavRole[]
  group: 'Core' | 'Management' | 'Marketing' | 'Finance' | 'System'
  icon: React.ElementType
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

const navItems: NavItem[] = [
  { name: 'Overview', href: '/business/dashboard', roles: ['owner', 'manager', 'staff'], group: 'Core', icon: Home },
  { name: 'Calendar', href: '/business/dashboard/calendar', roles: ['owner', 'manager', 'staff'], group: 'Core', icon: CalendarDays },
  { name: 'Bookings', href: '/business/dashboard/bookings', roles: ['owner', 'manager', 'staff'], group: 'Core', icon: BookOpen },
  { name: 'Customers', href: '/business/dashboard/customers', roles: ['owner', 'manager', 'staff'], group: 'Core', icon: Users },

  { name: 'Services', href: '/business/dashboard/services', roles: ['owner', 'manager'], group: 'Management', icon: Sparkles },
  { name: 'Team', href: '/business/dashboard/team', roles: ['owner', 'manager'], group: 'Management', icon: Users },
  { name: 'Staff', href: '/business/dashboard/staff', roles: ['owner', 'manager'], group: 'Management', icon: Users },
  { name: 'Packages', href: '/business/dashboard/packages', roles: ['owner', 'manager'], group: 'Management', icon: Package },
  { name: 'Memberships', href: '/business/dashboard/memberships', roles: ['owner', 'manager'], group: 'Management', icon: CreditCard },
  { name: 'Gift Vouchers', href: '/business/dashboard/gift-vouchers', roles: ['owner', 'manager'], group: 'Management', icon: Gift },

  { name: 'Customer Engagement', href: '/business/dashboard/customer-engagement', roles: ['owner', 'manager'], group: 'Marketing', icon: MessageSquare },
  { name: 'SMS Marketing', href: '/business/dashboard/marketing/sms', roles: ['owner', 'manager'], group: 'Marketing', icon: MessageSquare },
  { name: 'Email Campaigns', href: '/business/dashboard/marketing/email', roles: ['owner', 'manager'], group: 'Marketing', icon: Mail },

  { name: 'Reports', href: '/business/dashboard/reports', roles: ['owner', 'manager'], group: 'Finance', icon: BarChart3 },
  { name: 'Money', href: '/business/dashboard/money', roles: ['owner', 'manager'], group: 'Finance', icon: CreditCard },

  { name: 'Support', href: '/business/dashboard/support', roles: ['owner', 'manager', 'staff'], group: 'System', icon: Headphones },
  { name: 'Settings', href: '/business/dashboard/settings', roles: ['owner'], group: 'System', icon: Settings },
]

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
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
      <BusinessShell role={role} loadingRole={loadingRole} userId={userId}>
        {children}
      </BusinessShell>
    </BrandProvider>
  )
}

function BusinessShell({
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
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const resolvedRole: NavRole = role ?? 'owner'

  const filteredNav = useMemo(() => {
    return navItems.filter((item) => item.roles.includes(resolvedRole))
  }, [resolvedRole])

  const groupedNav = useMemo(() => {
    return filteredNav.reduce<Record<string, NavItem[]>>((groups, item) => {
      groups[item.group] = groups[item.group] || []
      groups[item.group].push(item)
      return groups
    }, {})
  }, [filteredNav])

  const bottomNav = filteredNav.filter((item) =>
    ['Overview', 'Calendar', 'Bookings', 'Customers'].includes(item.name)
  )

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
          background: `radial-gradient(circle at top left, ${brand.accentColour}24 0%, transparent 32%), radial-gradient(circle at bottom right, ${brand.primaryColour}22 0%, transparent 34%)`,
        }}
      />

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-black/50 px-6 py-7 backdrop-blur-2xl lg:flex">
          <BrandBlock logoUrl={logoUrl} brand={brand} />

          <nav className="space-y-1 overflow-y-auto pr-1">
            {loadingRole && (
              <div className="px-4 py-3 text-sm text-slate-500">Loading menu...</div>
            )}

            {!loadingRole &&
              filteredNav.map((item) => (
                <DesktopNavLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                />
              ))}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">
              {role ? `${role} access` : 'owner access'}
            </div>

            <div className="text-lg font-bold">Growth Plan</div>

            <p className="mt-2 text-sm text-slate-400">Your booking system is live.</p>

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

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            <aside className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-hidden rounded-t-[2rem] border border-white/10 bg-[#020617] shadow-[0_-30px_120px_rgba(0,0,0,.85)]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
                <div className="min-w-0">
                  <div className="truncate text-lg font-black">
                    {brand.businessName || brand.platformName}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">
                    {role ? `${role} access` : 'owner access'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="max-h-[68vh] space-y-5 overflow-y-auto px-5 py-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
                {Object.entries(groupedNav).map(([group, items]) => (
                  <div key={group}>
                    <div className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                      {group}
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
                      {items.map((item, index) => {
                        const Icon = item.icon
                        const active = isActive(pathname, item.href)

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={[
                              'flex min-h-[56px] items-center gap-4 px-4 py-3 transition active:scale-[0.99]',
                              index > 0 ? 'border-t border-white/10' : '',
                              active ? 'bg-cyan-400/12 text-cyan-100' : 'text-slate-300',
                            ].join(' ')}
                          >
                            <span
                              className={[
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                                active
                                  ? 'border-cyan-400/25 bg-cyan-400/15 text-cyan-100'
                                  : 'border-white/10 bg-black/20 text-slate-400',
                              ].join(' ')}
                            >
                              <Icon size={18} />
                            </span>

                            <span className="min-w-0 flex-1 text-sm font-black">
                              {item.name}
                            </span>

                            <ChevronRight size={17} className="text-slate-600" />
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#020617]/88 px-4 py-3 backdrop-blur-2xl pt-[max(0.9rem,env(safe-area-inset-top))] lg:px-10 lg:py-5">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white lg:hidden"
                aria-label="Open menu"
              >
                <Menu size={21} />
              </button>

              <div className="min-w-0 flex-1 lg:flex-none">
                <div className="truncate text-base font-black lg:text-[10px] lg:uppercase lg:tracking-[0.45em] lg:text-slate-500">
                  {brand.businessName || brand.platformName}
                </div>

                <div className="mt-1 hidden text-sm text-slate-400 lg:block">
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
                    className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-300 hover:text-white sm:block"
                  >
                    Settings
                  </Link>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 pb-24 sm:px-6 lg:px-10 lg:py-10 lg:pb-10">
            {children}
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
            <div className="mx-auto grid max-w-sm grid-cols-5 gap-1 rounded-[1.8rem] border border-white/10 bg-[#020617]/95 p-2 shadow-[0_20px_90px_rgba(0,0,0,.85)] backdrop-blur-2xl">
              {bottomNav.map((item) => {
                const Icon = item.icon
                const active = isActive(pathname, item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.name === 'Overview' ? 'Home' : item.name}
                    title={item.name === 'Overview' ? 'Home' : item.name}
                    className={[
                      'flex h-12 items-center justify-center rounded-2xl transition active:scale-95',
                      active
                        ? 'bg-cyan-400/15 text-cyan-100 shadow-[0_0_25px_rgba(34,211,238,.18)]'
                        : 'text-slate-500 hover:text-slate-200',
                    ].join(' ')}
                  >
                    <Icon size={21} strokeWidth={2.4} />
                  </Link>
                )
              })}

              <button
                type="button"
                aria-label="Open menu"
                title="Menu"
                onClick={() => setMobileOpen(true)}
                className="flex h-12 items-center justify-center rounded-2xl text-slate-500 transition hover:text-slate-200 active:scale-95"
              >
                <Menu size={21} strokeWidth={2.4} />
              </button>
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}

function BrandBlock({
  logoUrl,
  brand,
}: {
  logoUrl: string
  brand: BrandConfig
}) {
  return (
    <Link href="/business/dashboard" className="mb-10 block">
      <div className="rounded-2xl border border-white/10 bg-black p-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={brand.businessName || brand.platformName || 'Business'}
            className="block h-auto w-full max-w-[170px]"
          />
        ) : (
          <div className="text-xl font-black tracking-tight">{brand.platformName}</div>
        )}
      </div>

      <div className="mt-4 text-[10px] uppercase tracking-[0.45em] text-slate-500">
        {brand.whiteLabel ? 'BOOKING' : brand.bookingName}
      </div>
    </Link>
  )
}

function DesktopNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
        active
          ? 'bg-cyan-400/15 text-cyan-100'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={17} />
      {item.name}
    </Link>
  )
}

function isActive(pathname: string, href: string) {
  if (href === '/business/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}