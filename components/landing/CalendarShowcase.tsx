'use client'

import { motion } from 'framer-motion'
import { CalendarDays, Clock, Move, Users } from 'lucide-react'

const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']
const staff = ['Sarah', 'James', 'Emma', 'Alex', 'Mia']

const bookings = [
  { row: 1, col: 0, label: 'Cut & finish', status: 'Confirmed', colour: 'bg-cyan-500' },
  { row: 2, col: 2, label: 'Colour appointment', status: 'Paid', colour: 'bg-blue-600' },
  { row: 3, col: 1, label: 'Membership visit', status: 'Active', colour: 'bg-violet-600' },
  { row: 5, col: 3, label: 'Package session', status: 'Booked', colour: 'bg-emerald-500' },
]

export default function CalendarShowcase() {
  return (
    <section id="calendar" className="relative overflow-hidden bg-[#050b14] px-6 py-44 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.14),transparent_34%),radial-gradient(circle_at_85%_65%,rgba(59,130,246,.12),transparent_32%)]" />

      <div className="mx-auto max-w-[1500px]">
        <div className="mx-auto mb-20 max-w-5xl text-center">
          <p className="mb-6 text-xs font-black uppercase tracking-[0.38em] text-cyan-300">
            Smart Calendar
          </p>

          <h2 className="text-5xl font-black leading-[1.02] tracking-[-0.045em] md:text-7xl">
            See your entire business
            <br />
            at a glance.
          </h2>

          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-lg leading-8 text-slate-300">
            <p>
              The AMB Booking calendar gives service businesses complete control over their day, whether they are running one diary or coordinating a full team.
            </p>

            <p>
              Appointments, staff columns, availability, time off, payments, reminders and customer records stay connected in one fast workspace.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-[4rem] bg-cyan-400/10 blur-[110px]" />

          <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#07111f] shadow-[0_70px_240px_rgba(0,0,0,.7)]">
            <div className="flex items-center justify-between border-b border-white/10 px-7 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-[0_0_70px_rgba(34,211,238,.35)]">
                  <CalendarDays size={22} />
                </div>

                <div>
                  <div className="text-sm font-bold text-cyan-300">Today</div>
                  <div className="text-2xl font-black text-white">Team calendar</div>
                </div>
              </div>

              <div className="hidden items-center gap-3 md:flex">
                <span className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-300">
                  Day view
                </span>
                <span className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950">
                  New booking
                </span>
              </div>
            </div>

            <div className="grid grid-cols-[82px_repeat(5,1fr)]">
              <div className="border-b border-white/10 bg-slate-950 p-5" />

              {staff.map((name) => (
                <div
                  key={name}
                  className="border-b border-l border-white/10 bg-slate-950 p-5 text-sm font-black text-slate-300"
                >
                  {name}
                </div>
              ))}

              {times.map((time, row) => (
                <div key={time} className="contents">
                  <div className="border-b border-white/10 bg-slate-950 px-5 py-8 text-xs font-bold text-slate-500">
                    {time}
                  </div>

                  {staff.map((_, col) => {
                    const booking = bookings.find((item) => item.row === row && item.col === col)

                    return (
                      <div
                        key={`${time}-${col}`}
                        className="min-h-[108px] border-b border-l border-white/10 bg-slate-950 p-3"
                      >
                        {booking && (
                          <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.45, delay: row * 0.08 }}
                            whileHover={{ y: -4 }}
                            className={`rounded-2xl ${booking.colour} p-4 text-sm font-black text-white shadow-[0_0_60px_rgba(34,211,238,.18)]`}
                          >
                            {booking.label}
                            <div className="mt-1 text-xs font-semibold text-white/75">
                              {booking.status}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ['Drag to reschedule', Move],
            ['Staff columns', Users],
            ['Time off & availability', Clock],
          ].map(([label, Icon]: any) => (
            <motion.div
              key={label}
              whileHover={{ y: -4 }}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5"
            >
              <Icon className="text-cyan-300" />
              <span className="font-black text-white">{label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}