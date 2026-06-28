import Link from 'next/link'

const featureGroups = [
  {
    title: 'Booking engine',
    items: [
      'Online bookings',
      'Public booking pages',
      'Multi-service bookings',
      'Staff selection',
      'Date and time picker',
      'Booking confirmations',
      'Reschedule flow',
      'Cancellation flow',
      'Booking success pages',
      'Booking conflict protection',
      'Service durations',
      'Deposits',
      'Full payment',
      'Pay later',
      'Stripe Checkout',
      'Stripe webhooks',
    ],
  },
  {
    title: 'Calendar and operations',
    items: [
      'Drag-and-drop calendar',
      'Day view',
      'Week view',
      'Month view',
      'Staff columns',
      'Calendar zoom levels',
      'Current time indicator',
      'Time off',
      'Availability rules',
      'Staff schedules',
      'Booking movement',
      'Revenue view',
      'Occupancy view',
    ],
  },
  {
    title: 'Customers and CRM',
    items: [
      'Customer records',
      'Customer notes',
      'Booking history',
      'Customer portal',
      'Customer engagement centre',
      'Loyalty tools',
      'Referral tracking',
      'Review history',
      'Customer emails',
      'Customer notifications',
    ],
  },
  {
    title: 'Revenue tools',
    items: [
      'Membership plans',
      'Membership benefits',
      'Membership usage ledger',
      'Membership session tracking',
      'Packages',
      'Package purchases',
      'Package session use',
      'Gift vouchers',
      'Voucher purchases',
      'Voucher redemption',
      'Money dashboard',
      'Revenue reports',
      'Stripe subscription flow',
    ],
  },
  {
    title: 'Marketing and retention',
    items: [
      'Email campaigns',
      'SMS marketing area',
      'Booking reminders',
      'Review requests',
      'Waiting list',
      'Waiting list matching',
      'Notifications',
      'Push notifications',
      'In-app notification centre',
      'Notification preferences',
      'Event-driven notifications',
    ],
  },
  {
    title: 'Marketplace and reputation',
    items: [
      'Marketplace listings',
      'Public business profiles',
      'Featured listings',
      'Marketplace categories',
      'Marketplace search',
      'Competitor protection',
      'Industry relationship rules',
      'Reviews',
      'Review replies',
      'Trust signals',
      'Reputation engine',
    ],
  },
  {
    title: 'White label and SaaS',
    items: [
      'Business branding',
      'Logo support',
      'Brand colours',
      'Brand engine',
      'White-label mode',
      'Hide AMB branding',
      'Custom domains',
      'Domain health checks',
      'Email branding',
      'PWA support',
      'Future native app ready',
    ],
  },
  {
    title: 'Platform admin',
    items: [
      'Master admin centre',
      'Business command centre',
      'Create businesses',
      'Manage businesses',
      'Feature flags',
      'Plan gating',
      'Subscription overrides',
      'Launch readiness',
      'Platform health',
      'Audit logs',
      'Support tickets',
      'Impersonation logging',
    ],
  },
  {
    title: 'Partner and commercial tools',
    items: [
      'Partner portal',
      'Partner sign-up',
      'Partner dashboard',
      'Referral tracking',
      'Commission engine',
      'Adjustable commissions',
      'Payout centre',
      'Partner assets',
      'Agency-ready structure',
      'Commercial SaaS plans',
    ],
  },
]

const highlights = [
  'Bookings',
  'Payments',
  'CRM',
  'Calendar',
  'Memberships',
  'Packages',
  'Gift vouchers',
  'Waiting list',
  'Reviews',
  'Marketplace',
  'Push notifications',
  'White label',
  'Partner centre',
  'Admin centre',
  'Feature gating',
  'PWA',
]

const plans = [
  {
    name: 'Starter',
    price: '£19',
    text: 'For solo operators who need online bookings, CRM and simple payments.',
  },
  {
    name: 'Growth',
    price: '£39',
    text: 'For growing businesses that need memberships, vouchers, waiting list and reporting.',
    featured: true,
  },
  {
    name: 'Pro',
    price: '£79',
    text: 'For serious operators that need white-label tools, marketplace features and advanced control.',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,#06b6d433_0%,transparent_30%),radial-gradient(circle_at_bottom_right,#8b5cf633_0%,transparent_34%)]" />

      <header className="relative z-20 border-b border-white/10 bg-black/30 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="AMB Booking" className="h-10 w-auto" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-400 lg:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#white-label" className="hover:text-white">White label</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <Link href="/login" className="hover:text-white">Login</Link>
          </nav>

          <Link
            href="/signup"
            className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950"
          >
            Start free trial
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <div className="max-w-5xl">
          <div className="mb-6 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-200">
            Built for service businesses
          </div>

          <h1 className="text-5xl font-black tracking-tight md:text-7xl">
            The complete operating system for modern service businesses.
          </h1>

          <p className="mt-8 max-w-3xl text-xl leading-8 text-slate-300">
            AMB Booking brings bookings, payments, calendar management, CRM,
            memberships, vouchers, waiting lists, reviews, marketing, marketplace
            discovery, notifications, reporting and white-label tools into one
            connected platform.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 px-7 py-4 font-black text-white shadow-lg shadow-cyan-500/20"
            >
              Start 7-day free trial
            </Link>

            <Link
              href="/contact"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-7 py-4 font-black text-white hover:bg-white/10"
            >
              Book a demo
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 md:grid-cols-4">
          {highlights.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm font-bold text-slate-300"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-cyan-500/10">
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <aside className="rounded-[1.5rem] border border-white/10 bg-black/40 p-5">
              <div className="mb-8">
                <div className="text-xl font-black">AMB Booking</div>
                <div className="mt-2 text-xs uppercase tracking-[0.35em] text-slate-600">
                  Platform
                </div>
              </div>

              {['Dashboard', 'Calendar', 'Bookings', 'Customers', 'Memberships', 'Marketplace', 'Reports'].map((item, index) => (
                <div
                  key={item}
                  className={`mb-2 rounded-xl px-4 py-3 text-sm font-bold ${
                    index === 0
                      ? 'bg-cyan-300/10 text-cyan-200'
                      : 'text-slate-500'
                  }`}
                >
                  {item}
                </div>
              ))}
            </aside>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm text-slate-500">Today</div>
                  <h2 className="text-3xl font-black">Business dashboard</h2>
                </div>

                <div className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950">
                  Live platform
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-4">
                {[
                  ['Bookings', '18'],
                  ['Revenue', '£642'],
                  ['Customers', '7'],
                  ['Alerts', '12'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-slate-950 p-5">
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-3 text-3xl font-black">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
                  <p className="font-black text-cyan-200">Notification centre</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    New booking confirmed, membership session used, review
                    request scheduled and waiting list opportunity detected.
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-300/20 bg-violet-300/10 p-5">
                  <p className="font-black text-violet-200">White-label ready</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Logos, colours, custom domains, branded emails and future
                    native app experiences can all be powered by tenant branding.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-4xl">
          <p className="mb-4 text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
            Full platform features
          </p>

          <h2 className="text-4xl font-black md:text-6xl">
            Everything we have built, in one connected system.
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-400">
            AMB Booking is more than a calendar. It is a multi-tenant SaaS
            platform for businesses that want bookings, customer management,
            payments, retention and growth tools in one place.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {featureGroups.map((group) => (
            <div
              key={group.title}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
            >
              <h3 className="text-2xl font-black">{group.title}</h3>

              <div className="mt-5 grid gap-2">
                {group.items.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-bold text-slate-300"
                  >
                    ✓ {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="white-label" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-300/10 via-white/[0.04] to-violet-500/10 p-10 md:p-14">
          <p className="mb-4 text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
            White-label and agency ready
          </p>

          <h2 className="max-w-4xl text-4xl font-black md:text-6xl">
            One platform. Multiple brands. Endless verticals.
          </h2>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            AMB Booking is built with multi-tenant architecture, business
            branding, custom domains, feature gating, partner management and
            white-label tools so it can support individual businesses, agencies
            and future branded mobile app experiences.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {['Business branding', 'Custom domains', 'Email branding', 'Partner-ready'].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-black/30 p-5 font-bold">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="mb-4 text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
            Pricing
          </p>
          <h2 className="text-4xl font-black md:text-6xl">
            Simple plans for different stages of growth.
          </h2>
          <p className="mt-5 text-slate-400">
            All plans include a 7-day free trial.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl border p-8 ${
                plan.featured
                  ? 'border-cyan-300/40 bg-cyan-300/10 shadow-xl shadow-cyan-500/10'
                  : 'border-white/10 bg-white/[0.04]'
              }`}
            >
              {plan.featured && (
                <div className="mb-4 inline-flex rounded-full bg-cyan-300 px-3 py-1 text-xs font-black text-slate-950">
                  Most popular
                </div>
              )}

              <h3 className="text-2xl font-black">{plan.name}</h3>
              <p className="mt-5 text-5xl font-black">
                {plan.price}
                <span className="text-base font-bold text-slate-500">/mo</span>
              </p>
              <p className="mt-5 leading-7 text-slate-400">{plan.text}</p>

              <Link
                href="/signup"
                className={`mt-8 block rounded-2xl px-5 py-4 text-center font-black ${
                  plan.featured
                    ? 'bg-gradient-to-r from-violet-500 to-cyan-400 text-white'
                    : 'border border-white/10 text-white hover:bg-white/10'
                }`}
              >
                Start free trial
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center md:p-16">
          <h2 className="text-4xl font-black md:text-6xl">
            Ready to launch your service business platform?
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Give customers a better way to book, pay, return, review and stay
            connected with your business.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 px-8 py-4 font-black text-white"
            >
              Start 7-day free trial
            </Link>

            <Link
              href="/contact"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-4 font-black text-white hover:bg-white/10"
            >
              Book a demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 bg-black/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-4">
          <div>
            <img src="/logo.png" alt="AMB Booking" className="h-10 w-auto" />
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Booking, CRM and business management software for service
              professionals.
            </p>
          </div>

          {[
            ['Product', 'Features', 'Pricing', 'Marketplace'],
            ['Company', 'About', 'Contact', 'Partners'],
            ['Legal', 'Terms', 'Privacy', 'Cookies'],
          ].map(([title, ...links]) => (
            <div key={title}>
              <h3 className="font-black">{title}</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-500">
                {links.map((link) => (
                  <p key={link}>{link}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </footer>
    </main>
  )
}