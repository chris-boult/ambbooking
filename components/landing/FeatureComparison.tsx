import { CheckCircle2 } from 'lucide-react'

const rows = [
  ['Operations', 'Booking engine', 'Calendar', 'Customers', 'Team management'],
  ['Revenue', 'Payments', 'Packages', 'Gift vouchers', 'Memberships'],
  ['Growth', 'Email marketing', 'SMS', 'Push notifications', 'Reviews'],
  ['Platform', 'White-label', 'Custom domains', 'Partner Centre', 'Admin Centre'],
]

export default function FeatureComparison() {
  return (
    <section id="pricing" className="px-6 py-28">
      <div className="mx-auto max-w-7xl">
        <h2 className="max-w-4xl text-5xl font-black leading-[1.03] tracking-[-0.045em] md:text-7xl">
          Everything you need to launch and scale.
        </h2>

        <div className="mt-12 overflow-hidden rounded-[2rem] border border-white/10 bg-[#07111f]">
          {rows.map((row) => (
            <div key={row[0]} className="grid border-b border-white/10 last:border-b-0 md:grid-cols-[220px_repeat(4,1fr)]">
              <div className="bg-slate-950 p-5 font-black text-cyan-300">{row[0]}</div>
              {row.slice(1).map((item) => (
                <div key={item} className="flex items-center gap-3 border-l border-white/10 p-5 font-bold text-slate-300">
                  <CheckCircle2 size={18} className="text-cyan-300" />
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
