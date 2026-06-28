'use client'

import { motion } from 'framer-motion'
import {
  CreditCard,
  Crown,
  Gift,
  Layers3,
  LineChart,
  Receipt,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

const revenueStreams = [
  {
    title: 'Deposits',
    text: 'Take an upfront payment when customers book online, helping reduce no-shows and protect valuable appointment slots.',
    icon: CreditCard,
  },
  {
    title: 'Full payments',
    text: 'Let customers pay the full amount before their visit, creating a smoother checkout experience for both customer and business.',
    icon: Receipt,
  },
  {
    title: 'Packages',
    text: 'Sell bundles of sessions, track usage automatically and keep package balances connected to the customer record.',
    icon: Layers3,
  },
  {
    title: 'Gift vouchers',
    text: 'Create another revenue stream by selling vouchers that can be redeemed against future bookings.',
    icon: Gift,
  },
  {
    title: 'Memberships',
    text: 'Build recurring revenue with membership plans, benefits, usage tracking and Stripe-ready subscription payments.',
    icon: Crown,
  },
]

export default function MoneyCentreShowcase() {
  return (
    <section id="money" className="relative overflow-hidden bg-[#050b14] px-6 py-44 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.12),transparent_34%),radial-gradient(circle_at_85%_70%,rgba(124,58,237,.12),transparent_32%)]" />

      <div className="mx-auto max-w-[1500px]">
        <div className="mx-auto mb-20 max-w-5xl text-center">
          <p className="mb-6 text-xs font-black uppercase tracking-[0.38em] text-cyan-300">
            Money Centre
          </p>

          <h2 className="text-5xl font-black leading-[1.02] tracking-[-0.045em] md:text-7xl">
            Turn bookings into
            <br />
            predictable revenue.
          </h2>

          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-lg leading-8 text-slate-300">
            <p>
              AMB Booking connects the commercial side of your business directly to the booking journey. Deposits, full payments, gift vouchers, packages and memberships all work from the same platform, giving you more ways to generate revenue before, during and after the appointment.
            </p>

            <p>
              Instead of treating payments as a separate system, the Money Centre keeps checkout, customer records, membership usage, package balances and reporting connected. That means less manual admin, clearer revenue visibility and a smoother customer experience.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-[4rem] bg-cyan-400/10 blur-[110px]" />

          <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] shadow-[0_70px_240px_rgba(0,0,0,.7)]">
            <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
              <div className="border-b border-white/10 bg-black/20 p-8 lg:border-b-0 lg:border-r lg:p-10">
                <div className="mb-10 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-cyan-300">
                      Revenue dashboard
                    </p>

                    <h3 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                      Connected payment flows
                    </h3>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.35)]">
                    <LineChart size={25} />
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-slate-950 p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-sm font-black uppercase tracking-[0.25em] text-slate-500">
                      Revenue mix
                    </span>

                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
                      Stripe-ready
                    </span>
                  </div>

                  <div className="flex h-72 items-end gap-3">
                    {[42, 64, 52, 78, 68, 91, 74, 88, 96, 82, 93, 100].map((height, index) => (
                      <motion.div
                        key={index}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.55, delay: index * 0.04 }}
                        className="flex-1 rounded-t-2xl bg-gradient-to-t from-cyan-500 to-blue-400 shadow-[0_0_40px_rgba(34,211,238,.18)]"
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    ['Checkout', CreditCard],
                    ['Reporting', LineChart],
                    ['Security', ShieldCheck],
                  ].map(([label, Icon]: any) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                      <Icon className="mb-4 text-cyan-300" />
                      <div className="font-black">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 lg:p-10">
                <div className="mb-10">
                  <p className="text-sm font-bold text-cyan-300">
                    Revenue streams
                  </p>

                  <h3 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                    More than taking payments.
                  </h3>

                  <p className="mt-4 max-w-xl leading-7 text-slate-400">
                    The Money Centre is built around the way service businesses actually earn. It supports one-off payments, repeat purchases and recurring revenue without separating them from bookings or customer history.
                  </p>
                </div>

                <div className="space-y-4">
                  {revenueStreams.map((stream, index) => {
                    const Icon = stream.icon

                    return (
                      <motion.div
                        key={stream.title}
                        initial={{ opacity: 0, x: 24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.08, duration: 0.5 }}
                        whileHover={{ x: 6 }}
                        className="flex gap-5 rounded-3xl border border-white/10 bg-slate-950 p-5"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
                          <Icon size={21} />
                        </div>

                        <div>
                          <h4 className="text-lg font-black">
                            {stream.title}
                          </h4>

                          <p className="mt-1 leading-7 text-slate-400">
                            {stream.text}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                <div className="mt-6 flex items-center gap-4 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                  <RefreshCw className="shrink-0 text-cyan-300" />

                  <p className="text-sm font-bold leading-6 text-cyan-100">
                    Built for one-off sales, repeat purchases and recurring memberships without disconnecting payments from bookings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}