export default function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-2xl border border-white/10 bg-slate-950 px-5 py-4">
      <p className="text-sm font-bold text-slate-400">{label}</p>
      <p className="text-lg font-black text-white">{value}</p>
    </div>
  )
}
