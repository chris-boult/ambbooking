export default function InsightCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
        <Icon size={20} />
      </div>
      <p className="mb-2 text-sm font-bold text-slate-400">{label}</p>
      <h2 className="text-2xl font-black tracking-[-0.03em]">{value}</h2>
    </div>
  )
}
