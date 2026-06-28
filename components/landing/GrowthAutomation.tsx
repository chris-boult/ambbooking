'use client'

import { motion } from 'framer-motion'
import {
  CalendarCheck,
  Repeat2,
  Smartphone,
  Star,
  User,
  Zap,
} from 'lucide-react'

const events = [
  {
    label: 'Capture demand',
    detail: 'Turn website visitors, social traffic and returning customers into confirmed bookings instead of missed enquiries.',
    icon: CalendarCheck,
  },
  {
    label: 'Reduce leakage',
    detail: 'Use reminders and automated communication to reduce no-shows, forgotten appointments and manual admin.',
    icon: Smartphone,
  },
  {
    label: 'Increase retention',
    detail: 'Keep customers connected after the appointment with review requests, loyalty prompts and rebooking opportunities.',
    icon: Repeat2,
  },
  {
    label: 'Grow reputation',
    detail: 'Make review generation part of the workflow so happy customers are prompted at the right moment.',
    icon: Star,
  },
  {
    label: 'Sell more value',
    detail: 'Promote packages, vouchers and memberships to turn occasional customers into higher-value relationships.',
    icon: Zap,
  },
  {
    label: 'Lifetime customer',
    detail: 'Use connected customer data, marketing touchpoints and repeat booking flows to compound growth over time.',
    icon: User,
  },
]

export default function GrowthAutomation() {
  return (
    <section id="growth" className="relative overflow-hidden bg-[#020617] px-6 py-44 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,.13),transparent_35%),radial-gradient(circle_at_80%_75%,rgba(124,58,237,.13),transparent_35%)]" />

      <div className="mx-auto max-w-[1500px]">
        <div className="mx-auto mb-20 max-w-5xl text-center">
          <p className="mb-6 text-xs font-black uppercase tracking-[0.38em] text-cyan-300">
            Growth Engine
          </p>

          <h2 className="text-5xl font-black leading-[1.02] tracking-[-0.045em] md:text-7xl">
            Growth without
            <br />
            another platform.
          </h2>

          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-lg leading-8 text-slate-300">
            <p>
              AMB Booking is not just a place to take appointments. It gives service businesses the tools to capture more demand, reduce missed revenue, bring customers back and increase the value of every relationship.
            </p>

            <p>
              Email marketing, SMS, push notifications, review requests, loyalty, packages, vouchers and memberships are connected to the booking and customer record, so growth activity is based on real behaviour rather than guesswork.
            </p>
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="absolute -inset-10 rounded-[4rem] bg-cyan-400/10 blur-[120px]" />

          <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_70px_240px_rgba(0,0,0,.7)] lg:p-12">
            <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-white/10 lg:block" />

            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="absolute left-1/2 top-0 hidden h-full w-px origin-top -translate-x-1/2 bg-gradient-to-b from-cyan-300 via-blue-400 to-violet-500 lg:block"
            />

            <div className="space-y-8">
              {events.map((event, index) => {
                const Icon = event.icon
                const right = index % 2 === 1

                return (
                  <motion.div
                    key={event.label}
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08, duration: 0.55 }}
                    className={`relative flex ${right ? 'lg:justify-end' : 'lg:justify-start'}`}
                  >
                    <div className="relative w-full rounded-[2rem] border border-white/10 bg-slate-950 p-6 lg:w-[44%]">
                      <div
                        className={`absolute top-8 hidden h-px w-20 bg-white/10 lg:block ${
                          right ? 'right-full' : 'left-full'
                        }`}
                      />

                      <div
                        className={`absolute top-5 hidden h-10 w-10 rounded-full border border-cyan-300/30 bg-[#07111f] shadow-[0_0_50px_rgba(34,211,238,.45)] lg:block ${
                          right ? 'right-[calc(100%+4.25rem)]' : 'left-[calc(100%+4.25rem)]'
                        }`}
                      />

                      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.35)]">
                        <Icon size={24} />
                      </div>

                      <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-600">
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      <h3 className="mt-3 text-2xl font-black tracking-[-0.04em]">
                        {event.label}
                      </h3>

                      <p className="mt-4 text-sm leading-6 text-slate-400">
                        {event.detail}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}