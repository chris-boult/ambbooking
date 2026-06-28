'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Layers3,
  Settings,
  Sparkles,
  Store,
  Users,
} from 'lucide-react'

const steps = [
  {
    title: 'Business details',
    text: 'Add your business name, contact details, industry and public booking identity.',
    icon: Store,
    status: 'Ready',
  },
  {
    title: 'Services',
    text: 'Create the services customers can book, including price, duration and payment options.',
    icon: Layers3,
    status: 'Next',
  },
  {
    title: 'Team',
    text: 'Add team members, assign services and prepare staff calendars.',
    icon: Users,
    status: 'Then',
  },
  {
    title: 'Availability',
    text: 'Set working hours, days off, booking rules and appointment availability.',
    icon: Clock,
    status: 'Then',
  },
  {
    title: 'Payments',
    text: 'Connect deposits, full payments, packages, vouchers and memberships when you are ready.',
    icon: CreditCard,
    status: 'Optional',
  },
  {
    title: 'Launch',
    text: 'Preview your booking page, test the journey and start taking live bookings.',
    icon: CalendarDays,
    status: 'Final',
  },
]

export default function OnboardingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] px-6 text-white">
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

        <Link
          href="/business/dashboard"
          className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/[0.08] md:inline-flex"
        >
          Skip to dashboard
        </Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-128px)] max-w-[1500px] items-center gap-14 pb-20 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <p className="mb-6 text-xs font-black uppercase tracking-[0.38em] text-cyan-300">
            Onboarding
          </p>

          <h1 className="max-w-4xl text-6xl font-black leading-[1.02] tracking-[-0.055em] md:text-8xl">
            Build your booking platform.
          </h1>

          <div className="mt-8 max-w-2xl space-y-5 text-lg leading-8 text-slate-300">
            <p>
              Set up the essentials first, then launch when your booking page, services, team and availability are ready.
            </p>

            <p>
              AMB Booking will guide you through the core steps needed to start taking bookings, managing customers and running your business from one connected dashboard.
            </p>
          </div>

          <div className="mt-10 grid max-w-2xl gap-4 md:grid-cols-3">
            {['Services', 'Team', 'Availability'].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4"
              >
                <CheckCircle2 size={18} className="text-cyan-300" />
                <span className="font-black text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.65 }}
          className="relative"
        >
          <div className="absolute -inset-8 rounded-[4rem] bg-cyan-400/10 blur-[120px]" />

          <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_70px_240px_rgba(0,0,0,.7)]">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-cyan-300">
                  Setup journey
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  Get ready to launch
                </h2>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.35)]">
                <Sparkles size={24} />
              </div>
            </div>

            <div className="space-y-4">
              {steps.map((step, index) => {
                const Icon = step.icon

                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06, duration: 0.45 }}
                    className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
                        <Icon size={21} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="font-black text-white">
                            {step.title}
                          </h3>

                          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-400">
                            {step.status}
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {step.text}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Link
                href="/onboarding/services"
                className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-7 py-5 text-sm font-black text-slate-950 shadow-[0_0_80px_rgba(34,211,238,.35)] transition hover:-translate-y-1 hover:bg-cyan-300"
              >
                Add your services
                <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </Link>

              <Link
                href="/business/dashboard"
                className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-7 py-5 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/[0.09]"
              >
                Go to dashboard
                <Settings size={18} />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  )
}