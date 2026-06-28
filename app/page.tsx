import Link from 'next/link'

const features = [
  'Online bookings',
  'Payments & deposits',
  'Customer CRM',
  'Calendar',
  'Memberships',
  'Packages',
  'Gift vouchers',
  'Waiting list',
  'Reviews',
  'Marketing tools',
  'Marketplace',
  'White label',
]

const platformCards = [
  {
    title: 'Online bookings',
    text: 'Let customers book services, choose staff, select times and complete the journey without back-and-forth messages.',
  },
  {
    title: 'Payments and deposits',
    text: 'Take deposits, full payments, packages, vouchers and memberships through a connected booking flow.',
  },
  {
    title: 'Customer CRM',
    text: 'Keep customer profiles, booking history, notes, memberships, packages, vouchers and engagement in one place.',
  },
  {
    title: 'Smart calendar',
    text: 'Manage daily schedules, team availability, reschedules, cancellations, time off and service capacity.',
  },
  {
    title: 'Recurring revenue',
    text: 'Sell memberships, packages and vouchers to create stronger customer retention and more predictable income.',
  },
  {
    title: 'Marketplace ready',
    text: 'Give businesses another route to be discovered, collect enquiries and turn interest into bookings.',
  },
]

const plans = [
  {
    name: 'Starter',
    price: '£19',
    description: 'For solo operators getting started.',
    items: ['Online bookings', 'Customer CRM', 'Basic reports', 'Email reminders'],
  },
  {
    name: 'Growth',
    price: '£39',
    description: 'For growing service businesses.',
    items: ['Everything in Starter', 'Memberships', 'Gift vouchers', 'Waiting list', 'Advanced reports'],
    featured: true,
  },
  {
    name: 'Pro',
    price: '£79',
    description: 'For teams and serious operators.',
    items: ['Everything in Growth', 'White label tools', 'Marketplace features', 'Priority support'],
  },
]

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,#06b6d433_0%,transparent_32%),radial-gradient(circle_at_bottom_right,#8b5cf633_0%,transparent_34%)]" />

      <header className="relative z-20 border-b border-white/10 bg-black/30 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="AMB Booking" className="h-10 w-auto" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-400 lg:flex">
            <a href="#platform" className="hover:text-white">Platform</a>
            <a href="#marketplace" className="hover:text-white">Marketplace</a>
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

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-200">
            All-in-one booking and business platform
          </div>

          <h1 className="max-w-5xl text-5xl font-black tracking-tight md:text-7xl">
            Run your business.
            <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              Grow without the chaos.
            </span>
          </h1>

          <p className="mt-8 max-w-2xl text-xl leading-8 text-slate-300">
            AMB Booking brings bookings, payments, CRM, memberships, vouchers,
            reviews, reminders, marketplace tools and white-label branding into
            one platform for service businesses.
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

          <div className="mt-8 flex flex-wrap gap-5 text-sm font-bold text-slate-400">
            <span>✓ No credit card required</span>
            <span>✓ Setup in minutes</span>
            <span>✓ White-label ready</span>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-cyan-500/10">
          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                  Dashboard
                </p>
                <h2 className="mt-1 text-2xl font-black">Today at a glance</h2>
              </div>

              <div className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950">
                Live
              </div>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              {[
                ['Bookings today', '18'],
                ['Revenue', '£642'],
                ['New customers', '7'],
                ['Notifications', '12'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-3 text-3xl font-black">{value}</p>
                </div>
              ))}
            </div>

            <div className="mx-6 mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
              <p className="text-sm font-black text-cyan-200">Smart opportunity</p>
              <p className="mt-2 leading-7 text-slate-300">
                You have a gap tomorrow afternoon. Fill it from your waiting list
                or send a rebooking prompt.
              </p>
            </div>

            <div className="grid gap-3 border-t border-white/10 p-6">
              {[
                'Haircut booked for 10:30',
                'Gift voucher purchased',
                'Membership session used',
                'Review request scheduled',
              ].map((item) => (
                <div key={item} className="rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {features.map((feature) => (
              <div
                key={feature}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4 text-center text-sm font-bold text-slate-300"
              >
                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="platform" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
            Built for service businesses
          </p>
          <h2 className="text-4xl font-black md:text-6xl">
            Everything you need, all in one powerful platform.
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-400">
            Replace disconnected tools with one system that manages bookings,
            customers, payments, teams, marketing and customer retention.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {platformCards.map((card) => (
            <div
              key={card.title}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 transition hover:border-cyan-300/30 hover:bg-white/[0.07]"
            >
              <h3 className="text-2xl font-black">{card.title}</h3>
              <p className="mt-4 leading-7 text-slate-400">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="marketplace" className="relative z-10 mx-auto grid max-w-7xl gap-8 px-6 py-20 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8">
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-black text-cyan-300">Marketplace preview</p>
            <div className="mt-4 grid gap-3">
              {['Barber', 'Beauty salon', 'Fitness coach'].map((item) => (
                <div key={item} className="rounded-xl bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{item}</span>
                    <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-200">
                      Book now
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <p className="mb-4 text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
            Be found. Win more. Grow faster.
          </p>
          <h2 className="text-4xl font-black md:text-6xl">
            Marketplace discovery built into your booking platform.
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-400">
            Give businesses another route to attract new customers, showcase
            reviews, promote services and turn local interest into bookings.
          </p>
        </div>
      </section>

      <section id="white-label" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-300/10 via-white/[0.04] to-violet-500/10 p-10 md:p-14">
          <p className="mb-4 text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
            White-label ready
          </p>
          <h2 className="max-w-4xl text-4xl font-black md:text-6xl">
            Your brand. Your colours. Your customer experience.
          </h2>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Use AMB Booking as your own branded platform with customised booking
            pages, dashboards, emails, notifications, customer portals and future
            mobile app experiences.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {['Custom branding', 'Custom domains', 'Branded customer journey'].map((item) => (
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
            Simple pricing
          </p>
          <h2 className="text-4xl font-black md:text-6xl">
            Choose the plan that fits your business.
          </h2>
          <p className="mt-5 text-slate-400">
            All plans include a 7-day free trial. No credit card required.
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
              <p className="mt-2 text-slate-400">{plan.description}</p>

              <p className="mt-6 text-5xl font-black">
                {plan.price}
                <span className="text-base font-bold text-slate-500">/mo</span>
              </p>

              <ul className="mt-8 space-y-3 text-sm text-slate-300">
                {plan.items.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>

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
            Ready to grow your service business?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Launch a better booking experience, manage customers properly and
            bring your business tools into one place.
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