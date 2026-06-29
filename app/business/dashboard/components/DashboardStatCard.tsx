export default function DashboardStatCard({
  label,
  value,
  icon: Icon,
  detail,
  featured = false,
}: {
  label: string
  value: number | string
  icon: any
  detail: string
  featured?: boolean
}) {
  return (
    <div className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_40px_140px_rgba(0,0,0,.35)] ${featured ? 'border-cyan-300/40 bg-cyan-400 text-slate-950' : 'border-white/10 bg-[#07111f] text-white'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`mb-3 text-sm font-black ${featured ? 'text-slate-700' : 'text-slate-400'}`}>{label}</p>
          <h2 className="text-4xl font-black tracking-[-0.05em]">{value}</h2>
          <p className={`mt-3 text-sm font-bold ${featured ? 'text-slate-700' : 'text-slate-500'}`}>{detail}</p>
        </div>

        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${featured ? 'bg-slate-950 text-cyan-300' : 'bg-cyan-400 text-slate-950'}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  )
}
