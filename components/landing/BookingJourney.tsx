'use client'

import { motion } from 'framer-motion'

const steps = [
  {
    title: 'Book',
    text: 'Customers choose the service they want, select the right team member and pick a time that works for them.',
  },
  {
    title: 'Checkout',
    text: 'Take an optional deposit, full payment or allow customers to pay later depending on how your business operates.',
  },
  {
    title: 'Confirm',
    text: 'Confirmation messages are sent automatically, so the customer knows exactly when and where their appointment is.',
  },
  {
    title: 'Remind',
    text: 'Email, SMS and push reminders help reduce no-shows and keep appointments front of mind before the visit.',
  },
  {
    title: 'Attend',
    text: 'When the appointment happens, the customer record, booking history and connected services stay updated.',
  },
  {
    title: 'Review',
    text: 'After the appointment, AMB Booking can trigger review requests to help businesses build reputation and trust.',
  },
  {
    title: 'Return',
    text: 'Customers can rebook, buy packages, redeem vouchers or join memberships, turning one appointment into repeat revenue.',
  },
]

export default function BookingJourney() {
  return (
    <section id="bookings" className="relative overflow-hidden bg-[#020617] px-6 py-44 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.12),transparent_34%),radial-gradient(circle_at_85%_65%,rgba(59,130,246,.12),transparent_32%)]" />

      <div className="mx-auto max-w-[1500px]">
        <div className="mx-auto mb-20 max-w-5xl text-center">
          <p className="mb-6 text-xs font-black uppercase tracking-[0.38em] text-cyan-300">
            Booking journey
          </p>

          <h2 className="text-5xl font-black leading-[1.02] tracking-[-0.045em] md:text-7xl">
            From first booking
            <br />
            to repeat customer.
          </h2>

          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-lg leading-8 text-slate-300">
            <p>
              AMB Booking is built around the full customer journey, not just the moment someone makes an appointment. From online booking and optional payments through to reminders, attendance, reviews and repeat visits, every stage stays connected.
            </p>

            <p>
              This gives service businesses a smoother way to manage bookings, reduce admin, improve customer communication and create more opportunities for repeat revenue through packages, vouchers and memberships.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-[4rem] bg-cyan-400/10 blur-[110px]" />

          <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] p-8 shadow-[0_70px_240px_rgba(0,0,0,.7)] lg:p-12">
            <div className="hidden lg:block">
              <div className="relative h-2 rounded-full bg-white/10">
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="h-full origin-left rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-500"
                />
              </div>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-7">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08, duration: 0.55 }}
                  className="rounded-[1.75rem] border border-white/10 bg-slate-950 p-6"
                >
                  <div className="mb-8 flex h-4 w-4 rounded-full bg-cyan-300 shadow-[0_0_40px_rgba(34,211,238,.65)]" />

                  <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-600">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-white">
                    {step.title}
                  </h3>

                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    {step.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}