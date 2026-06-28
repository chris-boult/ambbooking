'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Rocket,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

const baseUrl = 'https://amb-booking.co.uk'

const plans = [
  {
    name: 'Starter',
    badge: 'Perfect for startups',
    price: '£19',
    description:
      'For small service businesses that want online booking, customer records, a cleaner calendar and a better way to manage appointments.',
    icon: Rocket,
    highlight: false,
    included: [
      'Online booking page',
      'Calendar management',
      'Customer CRM',
      'Money Centre',
    ],
    also: [
      'Team members',
      'Email confirmations',
      'Customer notes',
      'Basic reporting',
      'In-system support',
    ],
  },
  {
    name: 'Growth',
    badge: 'Most popular',
    price: '£49',
    description:
      'For growing businesses that want to reduce admin, take payments, improve communication and turn more bookings into repeat customers.',
    icon: Sparkles,
    highlight: true,
    included: [
      'Everything in Starter',
      'Deposits and online payments',
      'Gift vouchers',
      'Packages',
    ],
    also: [
      'Waiting list',
      'Review requests',
      'SMS reminders',
      'Push notifications',
    ],
  },
  {
    name: 'Pro',
    badge: 'Everything unlocked',
    price: '£89',
    description:
      'For serious operators that want memberships, white-label branding, custom domains, apps and deeper control over the customer experience.',
    icon: Crown,
    highlight: false,
    included: [
      'Everything in Growth',
      'Memberships',
      'White-label branding',
      'Custom domain',
    ],
    also: [
      'Free SSL',
      'Advanced reporting',
      'PWA included',
      'Mobile app ready',
      'Priority support',
    ],
  },
]

export default function PricingSection() {
  return (
    <section id="pricing" className="relative overflow-hidden bg-[#020617] px-6 py-44 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.13),transparent_34%),radial-gradient(circle_at_85%_70%,rgba(124,58,237,.13),transparent_32%)]" />

      <div className="mx-auto max-w-[1500px]">
        <div className="mx-auto mb-20 max-w-5xl text-center">
          <p className="mb-6 text-xs font-black uppercase tracking-[0.38em] text-cyan-300">
            Simple pricing
          </p>

          <h2 className="text-5xl font-black leading-[1.02] tracking-[-0.045em] md:text-7xl">
            No hidden costs.
            <br />
            No surprises.
          </h2>

          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-lg leading-8 text-slate-300">
            <p>
              Every plan gives service businesses access to the core AMB Booking platform, including online booking, customer management, calendar tools and the Money Centre.
            </p>

            <p>
              Start with the plan that fits your business today, then upgrade when you are ready to unlock payments, packages, memberships, white-label branding and app-ready experiences.
            </p>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const Icon = plan.icon

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
                className={`relative rounded-[2.5rem] border p-8 shadow-[0_50px_180px_rgba(0,0,0,.5)] ${
                  plan.highlight
                    ? '-translate-y-4 border-cyan-300/50 bg-cyan-400 text-slate-950 shadow-[0_0_120px_rgba(34,211,238,.28)]'
                    : 'border-white/10 bg-[#07111f] text-white'
                }`}
              >
                <div
                  className={`mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                    plan.highlight
                      ? 'bg-slate-950 text-cyan-300'
                      : 'border border-white/10 bg-white/[0.04] text-cyan-300'
                  }`}
                >
                  {plan.badge}
                </div>

                <div
                  className={`mb-8 flex h-16 w-16 items-center justify-center rounded-3xl ${
                    plan.highlight
                      ? 'bg-slate-950 text-cyan-300'
                      : 'bg-cyan-400 text-slate-950'
                  }`}
                >
                  <Icon size={28} />
                </div>

                <h3 className="text-3xl font-black tracking-[-0.04em]">
                  {plan.name}
                </h3>

                <div className="mt-7">
                  <div className="flex items-start gap-3">
                    <span className="text-7xl font-black leading-none tracking-[-0.07em]">
                      {plan.price}
                    </span>

                    <div className={`pt-3 text-left text-sm font-black leading-5 ${plan.highlight ? 'text-slate-700' : 'text-slate-400'}`}>
                      <div>/ month</div>
                      <div>+ VAT</div>
                    </div>
                  </div>
                </div>

                <p className={`mt-7 min-h-[112px] leading-7 ${plan.highlight ? 'text-slate-800' : 'text-slate-400'}`}>
                  {plan.description}
                </p>

                <Link
                  href={`${baseUrl}/signup`}
                  className={`mt-8 inline-flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-black transition hover:-translate-y-1 ${
                    plan.highlight
                      ? 'bg-slate-950 text-white hover:bg-slate-900'
                      : 'bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-950 hover:from-cyan-300 hover:to-blue-300'
                  }`}
                >
                  Start your free trial
                  <ArrowRight size={17} />
                </Link>

                <p className={`mt-4 text-center text-sm font-bold ${plan.highlight ? 'text-slate-700' : 'text-slate-500'}`}>
                  7-day free trial.
                </p>

                <div className={`mt-8 border-t pt-8 ${plan.highlight ? 'border-slate-950/15' : 'border-white/10'}`}>
                  <p className={`mb-4 text-xs font-black uppercase tracking-[0.22em] ${plan.highlight ? 'text-slate-700' : 'text-cyan-300'}`}>
                    Included
                  </p>

                  <div className="space-y-4">
                    {plan.included.map((feature) => (
                      <div key={feature} className="flex gap-3">
                        <CheckCircle2
                          size={19}
                          className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-slate-950' : 'text-cyan-300'}`}
                        />
                        <span className="font-bold">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`mt-8 border-t pt-8 ${plan.highlight ? 'border-slate-950/15' : 'border-white/10'}`}>
                  <p className={`mb-4 text-xs font-black uppercase tracking-[0.22em] ${plan.highlight ? 'text-slate-700' : 'text-cyan-300'}`}>
                    Also includes
                  </p>

                  <div className="space-y-4">
                    {plan.also.map((feature) => (
                      <div key={feature} className="flex gap-3">
                        <CheckCircle2
                          size={19}
                          className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-slate-950' : 'text-cyan-300'}`}
                        />
                        <span className="font-bold">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-4">
          {[
            ['Free updates', Sparkles],
            ['Secure hosting', ShieldCheck],
            ['Free SSL', ShieldCheck],
            ['In-system support', CheckCircle2],
          ].map(([label, Icon]: any) => (
            <div
              key={label}
              className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5"
            >
              <Icon size={19} className="text-cyan-300" />
              <span className="font-black text-white">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}