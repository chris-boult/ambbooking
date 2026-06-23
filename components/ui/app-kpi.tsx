type AppKpiProps = {
  title: string
  value: string
  helper?: string
}

export function AppKpi({ title, value, helper }: AppKpiProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#111111]/80 p-5 shadow-2xl backdrop-blur-2xl">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-stone-500">{title}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
      {helper && <p className="mt-2 text-sm text-stone-400">{helper}</p>}
    </div>
  )
}
