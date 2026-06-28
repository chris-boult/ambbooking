'use client'

import { motion } from 'framer-motion'
import {
  CalendarDays,
  CreditCard,
  Crown,
  FileText,
  History,
  Mail,
  MessageSquare,
  Package,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'

const timeline = [
  { title: 'Booking confirmed', meta: 'Appointment added to the customer timeline', icon: CalendarDays },
  { title: 'Reminder queued', meta: 'Email, SMS or push reminder scheduled', icon: MessageSquare },
  { title: 'Membership active', meta: 'Benefits available for future visits', icon: Crown },
  { title: 'Review request ready', meta: 'Sent automatically after completion', icon: Star },
]

export default function CRMShowcase() {
  return (
    <section id="crm" className="relative overflow-hidden bg-[#020617] px-6 py-44 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,.12),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,.12),transparent_32%)]" />

      <div className="mx-auto max-w-7xl">
        <div className="mb-16 grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="mb-6 text-xs font-black uppercase tracking-[0.38em] text-cyan-300">
              Customer CRM
            </p>

            <h2 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.045em] md:text-7xl">
              Know every customer properly.
            </h2>
          </div>

          <div className="max-w-2xl space-y-5 text-lg leading-8 text-slate-300">
            <p>
              AMB Booking gives service businesses a built-in customer CRM that connects every appointment, payment, package, membership and message to one clear customer record.
            </p>

            <p>
              Instead of jumping between booking software, spreadsheets, email notes and payment systems, your team can see the full relationship history in one place.
            </p>

            <p>
              Customer notes, previous bookings, package balances, membership status, review activity and communication history all stay connected, helping you improve retention and deliver a better customer experience.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-[4rem] bg-cyan-400/10 blur-[100px]" />

          <div className="relative grid overflow-hidden rounded-[2.75rem] border border-white/10 bg-[#07111f] shadow-[0_60px_220px_rgba(0,0,0,.65)] lg:grid-cols-[340px_1fr_340px]">
            <div className="border-b border-white/10 bg-black/20 p-8 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-cyan-400 text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.35)]">
                  <Users size={34} />
                </div>

                <div>
                  <h3 className="text-3xl font-black tracking-[-0.04em]">
                    Customer record
                  </h3>
                  <p className="mt-1 text-slate-400">
                    Everything in one profile
                  </p>
                </div>
              </div>

              <div className="mt-10 space-y-4">
                {[
                  ['Customer notes', FileText],
                  ['Booking history', History],
                  ['Messages', MessageSquare],
                  ['Email activity', Mail],
                ].map(([label, Icon]: any) => (
                  <motion.div
                    key={label}
                    whileHover={{ x: 6 }}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <Icon size={20} className="text-cyan-300" />
                    <span className="font-black text-slate-200">
                      {label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="bg-slate-950/70 p-8">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-cyan-300">
                    Timeline
                  </p>

                  <h3 className="mt-1 text-3xl font-black tracking-[-0.04em]">
                    Customer activity
                  </h3>
                </div>

                <div className="hidden rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 md:block">
                  Live record
                </div>
              </div>

              <div className="relative space-y-5">
                <div className="absolute bottom-8 left-6 top-8 w-px bg-white/10" />

                {timeline.map((item, index) => {
                  const Icon = item.icon

                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: 24 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.09, duration: 0.5 }}
                      className="relative flex gap-5 rounded-3xl border border-white/10 bg-[#07111f] p-5 shadow-[0_20px_80px_rgba(0,0,0,.35)]"
                    >
                      <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
                        <Icon size={21} />
                      </div>

                      <div>
                        <h4 className="text-lg font-black">
                          {item.title}
                        </h4>

                        <p className="mt-1 text-slate-400">
                          {item.meta}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-white/10 bg-black/20 p-8 lg:border-l lg:border-t-0">
              <div className="mb-8 flex items-center gap-3">
                <Sparkles className="text-cyan-300" />
                <h3 className="text-2xl font-black tracking-[-0.04em]">
                  Connected value
                </h3>
              </div>

              <div className="space-y-4">
                {[
                  ['Membership', 'Active', Crown],
                  ['Packages', 'Balance tracked', Package],
                  ['Payments', 'Connected', CreditCard],
                  ['Reviews', 'Automated', Star],
                ].map(([label, value, Icon]: any) => (
                  <motion.div
                    key={label}
                    whileHover={{ y: -4 }}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                  >
                    <Icon size={20} className="mb-4 text-cyan-300" />

                    <div className="font-black">
                      {label}
                    </div>

                    <div className="mt-1 text-sm text-slate-400">
                      {value}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}