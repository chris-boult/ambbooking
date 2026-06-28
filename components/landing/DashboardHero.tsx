'use client'

import { motion } from 'framer-motion'
import {
  Calendar,
  CreditCard,
  Users,
  TrendingUp,
  Bell,
  Star,
  Crown,
  ArrowUpRight,
} from 'lucide-react'

import BrowserFrame from './BrowserFrame'

const bookings = [
  {
    time: '09:00',
    customer: 'Sarah Williams',
    service: 'Cut & Finish',
    colour: 'bg-cyan-500',
  },
  {
    time: '10:15',
    customer: 'James Carter',
    service: 'Beard Trim',
    colour: 'bg-violet-500',
  },
  {
    time: '11:30',
    customer: 'Emma Lewis',
    service: 'Colour',
    colour: 'bg-emerald-500',
  },
]

export default function DashboardHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .8 }}
      className="relative w-full max-w-3xl xl:max-w-4xl"
    >
      <BrowserFrame>

        <div className="grid gap-4 bg-slate-950 p-6 lg:grid-cols-12">

          {/* KPI Row */}

          <DashboardCard
            className="lg:col-span-3"
            title="Revenue"
            icon={<TrendingUp size={18} />}
          >
            <div className="text-3xl font-black text-white">
              £8,420
            </div>

            <div className="mt-2 flex items-center gap-2 text-sm text-emerald-400">
              <ArrowUpRight size={16} />
              +18.4%
            </div>
          </DashboardCard>

          <DashboardCard
            className="lg:col-span-3"
            title="Bookings"
            icon={<Calendar size={18} />}
          >
            <div className="text-3xl font-black text-white">
              18
            </div>

            <p className="mt-2 text-sm text-slate-400">
              Today
            </p>
          </DashboardCard>

          <DashboardCard
            className="lg:col-span-3"
            title="Customers"
            icon={<Users size={18} />}
          >
            <div className="text-3xl font-black text-white">
              2,842
            </div>

            <p className="mt-2 text-sm text-slate-400">
              Active
            </p>
          </DashboardCard>

          <DashboardCard
            className="lg:col-span-3"
            title="Stripe"
            icon={<CreditCard size={18} />}
          >
            <div className="text-lg font-semibold text-emerald-400">
              Connected
            </div>

            <p className="mt-2 text-sm text-slate-400">
              Payments live
            </p>
          </DashboardCard>

          {/* Revenue Chart */}

          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 lg:col-span-7"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-semibold text-white">
                Revenue
              </h3>

              <span className="text-sm text-slate-500">
                Last 30 days
              </span>
            </div>

            <div className="flex h-44 items-end gap-2">
              {[20, 30, 42, 36, 58, 62, 70, 64, 82, 94, 88, 110].map(
                (h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{
                      delay: i * .05,
                      duration: .5,
                    }}
                    className="flex-1 rounded-t-full bg-gradient-to-t from-cyan-500 to-violet-500"
                  />
                )
              )}
            </div>
          </motion.div>
                    {/* Today's bookings */}

          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 lg:col-span-5"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-semibold text-white">
                Today's bookings
              </h3>

              <Bell size={18} className="text-cyan-400" />
            </div>

            <div className="space-y-4">
              {bookings.map((booking) => (
                <motion.div
                  key={booking.time}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-4 rounded-2xl bg-white/5 p-4"
                >
                  <div
                    className={`h-3 w-3 rounded-full ${booking.colour}`}
                  />

                  <div className="flex-1">
                    <div className="font-medium text-white">
                      {booking.customer}
                    </div>

                    <div className="text-sm text-slate-400">
                      {booking.service}
                    </div>
                  </div>

                  <div className="text-sm text-slate-400">
                    {booking.time}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Notifications */}

          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 lg:col-span-4"
          >
            <div className="mb-5 flex items-center justify-between">

              <h3 className="font-semibold text-white">
                Live activity
              </h3>

              <Bell
                size={18}
                className="text-violet-400"
              />

            </div>

            <div className="space-y-4">

              <Notification
                icon={<CreditCard size={16} />}
                title="Payment received"
                subtitle="£95 • Stripe"
              />

              <Notification
                icon={<Crown size={16} />}
                title="Membership renewed"
                subtitle="Gold Member"
              />

              <Notification
                icon={<Star size={16} />}
                title="New review"
                subtitle="★★★★★"
              />

            </div>

          </motion.div>

          {/* Mini Calendar */}

          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 lg:col-span-8"
          >
            <div className="mb-5 flex items-center justify-between">

              <h3 className="font-semibold text-white">
                Calendar
              </h3>

              <Calendar
                size={18}
                className="text-cyan-400"
              />

            </div>

            <div className="grid grid-cols-7 gap-2">

              {Array.from({ length: 35 }).map((_, i) => (

                <div
                  key={i}
                  className={`aspect-square rounded-xl ${
                    [8,9,15,18,23].includes(i)
                      ? 'bg-gradient-to-br from-cyan-500 to-violet-500'
                      : 'bg-white/5'
                  }`}
                />

              ))}

            </div>

          </motion.div>

        </div>

      </BrowserFrame>

    </motion.div>
  )
}

type DashboardCardProps = {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}

function DashboardCard({
  title,
  icon,
  children,
  className,
}: DashboardCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`rounded-3xl border border-white/10 bg-white/[0.04] p-5 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">

        <span className="text-sm text-slate-400">
          {title}
        </span>

        <div className="text-cyan-400">
          {icon}
        </div>

      </div>

      {children}

    </motion.div>
  )
}

function Notification({
  icon,
  title,
  subtitle,
}:{
  icon:React.ReactNode
  title:string
  subtitle:string
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/5 p-4">

      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
        {icon}
      </div>

      <div>

        <div className="font-medium text-white">
          {title}
        </div>

        <div className="text-sm text-slate-400">
          {subtitle}
        </div>

      </div>

    </div>
  )
}