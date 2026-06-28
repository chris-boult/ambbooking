import Link from 'next/link'

const features = [
  'Bookings',
  'Payments',
  'CRM',
  'Memberships',
  'Gift vouchers',
  'Waiting list',
  'Reviews',
  'Marketplace',
  'Notifications',
  'White label',
]

const cards = [
  {
    title: 'Take bookings online',
    text: 'Let customers book, pay deposits, buy packages and manage appointments without endless messages.',
  },
  {
    title: 'Run your day from one dashboard',
    text: 'Calendar, customers, services, team, reports, money and marketing tools in one place.',
  },
  {
    title: 'Built for recurring revenue',
    text: 'Sell memberships, packages, gift vouchers and premium services directly through your booking flow.',
  },
  {
    title: 'White-labelled for your brand',
    text: 'Use your logo, colours, booking page, emails and customer experience without looking like generic software.',
  },
]

const plans = [
  { name: 'Starter', price: '£19', text: 'For solo operators getting online.' },
  { name: 'Growth', price: '£39', text: 'For growing teams that need more control.' },
  { name: 'Pro', price: '£79', text: 'For serious service businesses scaling up.' },
]

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,#06b6d433_0%,transparent_32%),radial-gradient(circle_at_bottom_right,#8b5cf633_0%,transparent_34%)]" />

      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="AMB Booking" className="h-9 w-auto" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-400 md:flex">
            <a href="#platform" className="hover:text-white">Platform</a>
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

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:py-32">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-200">
            AMB Booking
          </div>

          <h1 className="max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
            Run your service business from one powerful platform.
          </h1>

          <p className="mt-8 max-w-2xl text-xl leading-8 text-slate-300">
            Bookings, payments, CRM, memberships, vouchers, reviews, reminders,
            marketing tools and marketplace discovery — all in one white-label
            system built for growing service businesses.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="rounded-2xl bg-white px-7 py-4 font-black text-slate-950"
            >
              Start free trial
            </Link>

            <Link
              href="/contact"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-7 py-4 font-black text-white hover:bg-white/10"
            >
              Book a demo
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Today</p>
                <h2 className="text-2xl font-black">Business dashboard</h2>
              </div>
              <div className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950">
                Live
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {['Bookings today', 'Revenue', 'New customers', 'Notifications'].map((item, i) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-sm text-slate-500">{item}</p>
                  <p className="mt-3 text-3xl font-black">
                    {['18', '£642', '7', '12'][i]}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-300/10 to-violet-500/10 p-5">
              <p className="text-sm font-bold text-cyan-200">Smart opportunity</p>
              <p className="mt-2 text-slate-300">
                You have a gap tomorrow at 2:30pm. Fill it from your waiting list.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
        <div className="flex flex-wrap gap-3">
          {features.map((feature) => (
            <span
              key={feature}
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-slate-300"
            >
              {feature}
            </span>
          ))}
        </div>
      </section>

      <section id="platform" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
            The platform
          </p>
          <h2 className="text-4xl font-black md:text-6xl">
            More bookings. Less admin. A better customer experience.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-8"
            >
              <h3 className="text-2xl font-black">{card.title}</h3>
              <p className="mt-4 leading-7 text-slate-400">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="white-label" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-300/10 via-white/[0.04] to-violet-500/10 p-10 md:p-14">
          <p className="mb-4 text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
            White label ready
          </p>
          <h2 className="max-w-4xl text-4xl font-black md:text-6xl">
            Your brand. Your colours. Your booking platform.
          </h2>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            AMB Booking can power branded booking pages, customer portals,
            emails, notifications and native app experiences without forcing
            your customers into a generic third-party journey.
          </p>
        </div>
      </section>

      <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 max-w-3xl">
          <p className="mb-4 text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
            Pricing
          </p>
          <h2 className="text-4xl font-black md:text-6xl">
            Start simple. Scale when you are ready.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
              <h3 className="text-2xl font-black">{plan.name}</h3>
              <p className="mt-5 text-5xl font-black">
                {plan.price}
                <span className="text-base font-bold text-slate-500">/mo</span>
              </p>
              <p className="mt-4 text-slate-400">{plan.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center md:p-16">
          <h2 className="text-4xl font-black md:text-6xl">
            Launch your booking platform today.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Give your customers a better way to book, pay, manage and return.
          </p>

          <Link
            href="/signup"
            className="mt-10 inline-block rounded-2xl bg-white px-8 py-4 font-black text-slate-950"
          >
            Start free trial
          </Link>
        </div>
      </section>
    </main>
  )
}