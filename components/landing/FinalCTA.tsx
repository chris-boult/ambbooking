import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'

const baseUrl = 'https://amb-booking.co.uk'

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#020617] px-6 py-32 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.16),transparent_34%),radial-gradient(circle_at_85%_70%,rgba(124,58,237,.13),transparent_32%)]" />

      <div className="mx-auto max-w-[1500px]">
        <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] px-8 py-16 text-center shadow-[0_70px_240px_rgba(0,0,0,.7)] md:px-16 md:py-24">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-cyan-400/10 blur-[100px]" />
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-violet-500/10 blur-[100px]" />

          <div className="relative mx-auto max-w-5xl">
            <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-400 text-slate-950 shadow-[0_0_80px_rgba(34,211,238,.35)]">
              <Sparkles size={28} />
            </div>

            <p className="mb-6 text-xs font-black uppercase tracking-[0.38em] text-cyan-300">
              Ready to launch
            </p>

            <h2 className="text-5xl font-black leading-[1.02] tracking-[-0.045em] md:text-7xl">
              Run bookings, customers
              <br />
              and payments from one place.
            </h2>

            <div className="mx-auto mt-8 max-w-3xl space-y-5 text-lg leading-8 text-slate-300">
              <p>
                Start your free trial and see how AMB Booking connects online booking, calendar management, customer CRM, Money Centre, reminders, memberships and growth tools into one complete platform.
              </p>

              <p>
                Launch with the essentials today, then unlock payments, packages, vouchers, white-label branding and app-ready experiences as your business grows.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href={`${baseUrl}/signup`}
                className="group inline-flex items-center gap-3 rounded-2xl bg-cyan-400 px-8 py-5 text-sm font-black text-slate-950 shadow-[0_0_80px_rgba(34,211,238,.35)] transition hover:-translate-y-1 hover:bg-cyan-300"
              >
                Start your free trial
                <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </Link>

              <Link
                href={`${baseUrl}/contact`}
                className="group inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-8 py-5 text-sm font-black text-white backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.09]"
              >
                Book a demo
                <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-3">
              {[
                '7-day free trial',
                'In-system support',
                'Upgrade as you grow',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4"
                >
                  <CheckCircle2 size={18} className="text-cyan-300" />
                  <span className="font-black text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="mt-16 border-t border-white/10 pt-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <Image
              src="/logo.png"
              alt="AMB Booking"
              width={220}
              height={70}
              className="h-14 w-auto object-contain"
            />

            <div className="flex flex-wrap gap-6 text-sm font-bold text-slate-400">
              <a href="#bookings" className="hover:text-white">Bookings</a>
              <a href="#calendar" className="hover:text-white">Calendar</a>
              <a href="#crm" className="hover:text-white">CRM</a>
              <a href="#money" className="hover:text-white">Money Centre</a>
              <a href="#pricing" className="hover:text-white">Pricing</a>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>
              AMB Booking. Booking, CRM and business management platform for service businesses.
            </p>

            <p>
              © {new Date().getFullYear()} AMB Booking. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </section>
  )
}