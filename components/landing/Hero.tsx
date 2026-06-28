'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Mail,
  MessageSquare,
  Smartphone,
  Users,
  Zap,
} from 'lucide-react'

const baseUrl = 'https://amb-booking.co.uk'

function CTA({
  href,
  children,
  secondary = false,
}: {
  href: string
  children: React.ReactNode
  secondary?: boolean
}) {
  return (
    <Link
      href={href}
      className={
        secondary
          ? 'group inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-7 py-4 text-sm font-black text-white backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.09]'
          : 'group inline-flex items-center gap-3 rounded-2xl bg-cyan-400 px-7 py-4 text-sm font-black text-slate-950 shadow-[0_0_80px_rgba(34,211,238,.35)] transition hover:-translate-y-1 hover:bg-cyan-300'
      }
    >
      {children}
      <ArrowRight size={17} className="transition group-hover:translate-x-1" />
    </Link>
  )
}

export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#020617] px-6 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.22),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,.16),transparent_30%),radial-gradient(circle_at_20%_70%,rgba(124,58,237,.15),transparent_28%)]" />

      <header className="mx-auto flex h-32 max-w-[1500px] items-center justify-between">
  <Link href="/" className="flex items-center">
    <Image
      src="/logo.png"
      alt="AMB Booking"
      width={340}
      height={104}
      priority
      className="h-20 w-auto object-contain"
    />
  </Link>

  <nav className="hidden items-center gap-9 xl:flex">
    {[
      ['Bookings', '#bookings'],
      ['Calendar', '#calendar'],
      ['CRM', '#crm'],
      ['Money Centre', '#money'],
      ['Growth', '#growth'],
      ['White-label', '#white-label'],
      ['Features', '#features'],
      ['Pricing', '#pricing'],
    ].map(([label, href]) => (
      <a
        key={href}
        href={href}
        className="text-[15px] font-black text-slate-300 transition hover:text-white"
      >
        {label}
      </a>
    ))}
  </nav>

  <div className="hidden items-center gap-4 lg:flex">
    <Link
      href={`${baseUrl}/login`}
      className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
    >
      Login
    </Link>

    <Link
      href={`${baseUrl}/signup`}
      className="group inline-flex items-center gap-3 rounded-2xl bg-cyan-400 px-7 py-3.5 text-sm font-black text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.35)] transition hover:-translate-y-0.5 hover:bg-cyan-300"
    >
      Start free trial
      <ArrowRight size={17} className="transition group-hover:translate-x-1" />
    </Link>
  </div>
</header>

      <div className="mx-auto grid min-h-[calc(100vh-112px)] max-w-7xl items-center gap-14 pb-20 lg:grid-cols-[0.88fr_1.12fr]">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-6xl font-black leading-[1.03] tracking-[-0.055em] md:text-8xl"
          >
            The operating system for{' '}
            <span className="amb-animated-gradient bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-500 bg-clip-text text-transparent">
              service
            </span>{' '}
            businesses.
          </motion.h1>

          <p className="mt-8 max-w-2xl text-xl leading-9 text-slate-300">
            Bookings, CRM, payments, memberships, marketing, reporting and white-label tools. All connected. All under one roof.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <CTA href={`${baseUrl}/signup`}>Start free</CTA>
            <CTA href={`${baseUrl}/contact`} secondary>Book a demo</CTA>
          </div>
        </div>

        <div className="relative hidden h-[690px] lg:block">
          <div className="absolute right-0 top-12 h-[560px] w-[760px] rounded-full bg-cyan-400/10 blur-[120px]" />

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.8 }}
            className="absolute right-0 top-20 w-[680px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#07111f] shadow-[0_60px_200px_rgba(0,0,0,.65)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <Image src="/logo.png" alt="AMB Booking" width={145} height={46} className="h-10 w-auto object-contain" />
              <span className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-black text-slate-950">Live</span>
            </div>

            <div className="grid grid-cols-[180px_1fr]">
              <aside className="border-r border-white/10 bg-black/20 p-5">
                {[
                  ['Calendar', CalendarDays],
                  ['Customers', Users],
                  ['Payments', CreditCard],
                  ['Messages', MessageSquare],
                ].map(([label, Icon]: any, index) => (
                  <div
                    key={label}
                    className={`mb-2 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${
                      index === 0 ? 'bg-cyan-400 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </div>
                ))}
              </aside>

              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-cyan-300">Today</p>
                    <h2 className="text-2xl font-black">Drag-and-drop schedule</h2>
                  </div>
                </div>

                <div className="grid gap-3">
                  {[
                    ['09:00', 'Cut & finish', 'Confirmed'],
                    ['10:15', 'Colour appointment', 'Paid'],
                    ['11:30', 'Membership visit', 'Active'],
                    ['12:45', 'Open slot', 'Available'],
                  ].map((row, index) => (
                    <div
                      key={row[0]}
                      className="grid grid-cols-[70px_1fr_100px] items-center rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-sm"
                    >
                      <span className="font-bold text-slate-500">{row[0]}</span>
                      <span className="font-black text-white">{row[1]}</span>
                      <span
                        className={
                          index < 3
                            ? 'rounded-full bg-cyan-400/10 px-3 py-1 text-center text-xs font-black text-cyan-300'
                            : 'rounded-full bg-white/5 px-3 py-1 text-center text-xs font-black text-slate-500'
                        }
                      >
                        {row[2]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="absolute left-0 top-40 w-[280px] rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-2xl"
          >
            <Mail className="mb-4 text-cyan-300" />
            <h3 className="font-black text-white">Booking confirmed</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">Confirmation email sent.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.7 }}
            className="absolute left-12 bottom-28 w-[300px] rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-2xl"
          >
            <CreditCard className="mb-4 text-cyan-300" />
            <h3 className="font-black text-white">Payments connected</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">Deposits, packages and memberships.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="absolute right-10 bottom-8 w-[280px] rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-2xl"
          >
            <Smartphone className="mb-4 text-cyan-300" />
            <h3 className="font-black text-white">Mobile ready</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">PWA booking journeys for customers.</p>
          </motion.div>

          <motion.div
            animate={{ x: [0, 18, 0], y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-[365px] top-[430px] flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white backdrop-blur-xl"
          >
            <Zap size={16} className="text-cyan-300" />
            Drag to reschedule
          </motion.div>
        </div>
      </div>
    </section>
  )
}