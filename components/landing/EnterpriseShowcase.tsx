'use client'

import { motion } from 'framer-motion'
import {
  Bell,
  CalendarDays,
  CreditCard,
  Crown,
  FileText,
  Gift,
  Globe2,
  HeartHandshake,
  Layers3,
  Mail,
  MessageSquare,
  Package,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Users,
  Zap,
} from 'lucide-react'

const featureGroups = [
  {
    title: 'Take Bookings',
    intro:
      'Everything you need to let customers book online 24 hours a day while keeping your diary organised. Manage appointments, staff schedules, availability and waiting lists from one connected booking system.',
    features: [
      ['Online Booking', CalendarDays],
      ['Drag & Drop Calendar', RefreshCw],
      ['Multi-Service Bookings', Layers3],
      ['Staff Scheduling', Users],
      ['Availability & Time Off', CalendarDays],
      ['Waiting Lists', Bell],
    ],
  },
  {
    title: 'Know Your Customers',
    intro:
      'Every customer has a complete history from their very first booking. Notes, documents, payments, memberships, communications and previous appointments are all stored in one intelligent customer profile.',
    features: [
      ['Customer CRM', Users],
      ['Customer Notes', FileText],
      ['Documents', FileText],
      ['Booking History', CalendarDays],
      ['Email & Message History', Mail],
      ['Customer Timeline', Star],
    ],
  },
  {
    title: 'Get Paid',
    intro:
      'Improve cash flow and create new revenue opportunities with flexible payment options, memberships, packages and gift vouchers that work seamlessly with every booking.',
    features: [
      ['Deposits', CreditCard],
      ['Full Payments', CreditCard],
      ['Gift Vouchers', Gift],
      ['Packages', Package],
      ['Memberships', Crown],
      ['Stripe Payments', CreditCard],
    ],
  },
  {
    title: 'Grow Your Business',
    intro:
      'AMB Booking continues working after every appointment, helping you reduce no-shows, improve customer communication, generate reviews and encourage repeat bookings automatically.',
    features: [
      ['Email Reminders', Mail],
      ['SMS Reminders', MessageSquare],
      ['Push Notifications', Smartphone],
      ['Review Requests', Star],
      ['Rebooking Automation', RefreshCw],
      ['Marketing Tools', Zap],
    ],
  },
  {
    title: 'Run Your Business',
    intro:
      'Manage the day-to-day running of your business from one place, with clear visibility over staff, bookings, customers, documents, revenue and internal support.',
    features: [
      ['Business Dashboard', ShieldCheck],
      ['Revenue Reporting', Zap],
      ['Team Management', Users],
      ['Internal Support Centre', HeartHandshake],
      ['Business Documents', FileText],
      ['In-System Notifications', Bell],
    ],
  },
  {
    title: 'Brand Your Platform',
    intro:
      'Create a booking experience that feels like your own. Add your logo, colours, custom domain and branded customer communications without building software from scratch.',
    features: [
      ['White-Label Booking Pages', Sparkles],
      ['Custom Domain', Globe2],
      ['Free SSL Certificates', ShieldCheck],
      ['Branded Emails', Mail],
      ['Custom Colours', Sparkles],
      ['Business Logo', FileText],
    ],
  },
  {
    title: 'Stay Connected',
    intro:
      'Keep customers and teams informed with reminders, messages, alerts and notifications that connect directly to the booking and customer record.',
    features: [
      ['Email Communication', Mail],
      ['SMS Communication', MessageSquare],
      ['Push Notifications', Smartphone],
      ['Customer Alerts', Bell],
      ['Review Follow-Ups', Star],
      ['Team Notifications', Users],
    ],
  },
  {
    title: 'Support & Security',
    intro:
      'Give your business a reliable, secure and supported platform with cloud hosting, updates, access controls and help available from inside the system.',
    features: [
      ['In-System Support', HeartHandshake],
      ['Automatic Updates', RefreshCw],
      ['Secure Cloud Hosting', Globe2],
      ['Role-Based Access', ShieldCheck],
      ['Platform Monitoring', Bell],
      ['Mobile App Ready', Smartphone],
    ],
  },
]

export default function EnterpriseShowcase() {
  return (
    <section id="features" className="relative overflow-hidden bg-[#050b14] px-6 py-44 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.13),transparent_34%),radial-gradient(circle_at_85%_70%,rgba(59,130,246,.12),transparent_32%)]" />

      <div className="mx-auto max-w-[1500px]">
        <div className="mx-auto mb-20 max-w-5xl text-center">
          <p className="mb-6 text-xs font-black uppercase tracking-[0.38em] text-cyan-300">
            Complete Platform
          </p>

          <h2 className="text-5xl font-black leading-[1.02] tracking-[-0.045em] md:text-7xl">
            Everything you need
            <br />
            to run and grow.
          </h2>

          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-lg leading-8 text-slate-300">
            <p>
              AMB Booking brings the tools service businesses use every day into one connected platform. Bookings, customers, payments, reminders, memberships, documents, reporting and support all work together.
            </p>

            <p>
              Instead of paying for separate systems that do not talk to each other, your business gets one operating system designed to manage the full customer journey from first booking to repeat revenue.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {featureGroups.map((group, groupIndex) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: groupIndex * 0.05, duration: 0.5 }}
              className="rounded-[2.25rem] border border-white/10 bg-[#07111f] p-7 shadow-[0_40px_140px_rgba(0,0,0,.45)]"
            >
              <h3 className="text-2xl font-black tracking-[-0.04em] text-white">
                {group.title}
              </h3>

              <p className="mt-5 min-h-[132px] leading-7 text-slate-400">
                {group.intro}
              </p>

              <div className="mt-8 space-y-3">
                {group.features.map(([label, Icon]: any) => (
                  <motion.div
                    key={label}
                    whileHover={{ x: 6 }}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4"
                  >
                    <Icon size={19} className="shrink-0 text-cyan-300" />
                    <span className="font-black text-slate-200">{label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}