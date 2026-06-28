'use client'

const items = [
  ['Bookings', '#bookings'],
  ['Calendar', '#calendar'],
  ['CRM', '#crm'],
  ['Money Centre', '#money'],
  ['Growth', '#growth'],
  ['White-label', '#white-label'],
  ['Enterprise', '#enterprise'],
]

export default function AnchorMenu() {
  return (
    <div className="sticky top-0 z-40 border-y border-white/10 bg-[#020617]/85 px-6 py-4 backdrop-blur-2xl">
      <nav className="mx-auto flex max-w-7xl gap-3 overflow-x-auto">
        {items.map(([label, href]) => (
          <a key={href} href={href} className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-bold text-slate-300 transition hover:bg-cyan-400 hover:text-slate-950">
            {label}
          </a>
        ))}
      </nav>
    </div>
  )
}
