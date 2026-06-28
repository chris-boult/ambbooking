'use client'

import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  Mail,
  Palette,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'

const platformStates = [
  {
    label: 'AMB Booking',
    domain: 'amb-booking.co.uk',
    colour: 'bg-cyan-400',
    text: 'text-cyan-300',
    border: 'border-cyan-400/30',
  },
  {
    label: 'Your Brand',
    domain: 'book.yourbusiness.co.uk',
    colour: 'bg-violet-400',
    text: 'text-violet-300',
    border: 'border-violet-400/30',
  },
]

const visibleTouchpoints = [
  'Booking page',
  'Customer portal',
  'Confirmation emails',
  'Payment screens',
  'Review requests',
  'Reminders',
]

const hiddenEngine = [
  ['Bookings', CalendarDays],
  ['CRM', Users],
  ['Payments', CreditCard],
  ['Emails', Mail],
  ['Branding', Palette],
  ['Access control', ShieldCheck],
]

export default function WhiteLabelShowcase() {
  return (
    <section id="white-label" className="relative overflow-hidden bg-[#020617] px-6 py-44 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.12),transparent_34%),radial-gradient(circle_at_85%_70%,rgba(124,58,237,.14),transparent_32%)]" />

      <div className="mx-auto max-w-[1500px]">
        <div className="mx-auto mb-20 max-w-5xl text-center">
          <p className="mb-6 text-xs font-black uppercase tracking-[0.38em] text-cyan-300">
            Your software
          </p>

          <h2 className="text-5xl font-black leading-[1.02] tracking-[-0.045em] md:text-7xl">
            It looks like
            <br />
            you built it.
          </h2>

          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-lg leading-8 text-slate-300">
            <p>
              Your customers do not need to know another platform exists. Every booking page, confirmation email, reminder, payment screen and customer portal can reflect your own brand, creating an experience that feels completely native to your business.
            </p>

            <p>
              Behind the scenes, AMB Booking continues to power the booking engine, CRM, reporting, memberships, payments and automation, giving you enterprise-grade software under your own identity.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-[4rem] bg-cyan-400/10 blur-[120px]" />

          <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] shadow-[0_70px_240px_rgba(0,0,0,.7)]">
            <div className="border-b border-white/10 px-8 py-6 lg:px-10">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.35)]">
                    <Sparkles size={22} />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-500">
                      Brand transformation
                    </p>
                    <h3 className="text-2xl font-black tracking-[-0.04em]">
                      One platform. Two identities.
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3">
                  <span className="text-sm font-black text-cyan-300">AMB Booking</span>
                  <ArrowRight size={16} className="text-slate-500" />
                  <span className="text-sm font-black text-violet-300">Your Brand</span>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_1fr]">
              {platformStates.map((state, index) => (
                <motion.div
                  key={state.label}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.16, duration: 0.55 }}
                  className={`relative p-8 lg:p-10 ${index === 0 ? 'border-b border-white/10 lg:border-b-0 lg:border-r' : ''}`}
                >
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-bold ${state.text}`}>
                        {state.domain}
                      </p>
                      <h4 className="mt-2 text-4xl font-black tracking-[-0.04em]">
                        {state.label}
                      </h4>
                    </div>

                    <div className={`h-14 w-14 rounded-2xl ${state.colour} shadow-[0_0_70px_rgba(255,255,255,.12)]`} />
                  </div>

                  <div className={`overflow-hidden rounded-[2.25rem] border ${state.border} bg-slate-950`}>
                    <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-2xl ${state.colour}`} />
                        <div>
                          <div className="text-sm font-bold text-slate-500">
                            Customer booking
                          </div>
                          <div className="font-black">{state.label}</div>
                        </div>
                      </div>

                      <div className={`hidden rounded-xl px-4 py-2 text-sm font-black text-slate-950 md:block ${state.colour}`}>
                        Book now
                      </div>
                    </div>

                    <div className="p-6">
                      <p className="mb-5 text-sm font-black uppercase tracking-[0.28em] text-slate-500">
                        Customer journey
                      </p>

                      <div className="space-y-3">
                        {['Choose service', 'Select team member', 'Pick date and time', 'Confirm booking'].map((step) => (
                          <div
                            key={step}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4"
                          >
                            <span className="font-black">{step}</span>
                            <ArrowRight size={17} className="text-slate-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="border-t border-white/10 bg-black/20 p-8 lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                <div>
                  <p className="mb-5 text-sm font-black uppercase tracking-[0.28em] text-cyan-300">
                    Everything your customers see
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {visibleTouchpoints.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 font-black"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-5 text-sm font-black uppercase tracking-[0.28em] text-violet-300">
                    Powered by everything they do not
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {hiddenEngine.map(([label, Icon]: any) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4"
                      >
                        <Icon size={19} className="mb-4 text-cyan-300" />
                        <div className="font-black">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-10 border-t border-white/10 pt-8 text-center">
                <p className="text-2xl font-black tracking-[-0.04em] text-white md:text-4xl">
                  Everything your customers see. Powered by everything they do not.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}