type AppStatusPillProps = {
  value: string
}

export function AppStatusPill({ value }: AppStatusPillProps) {
  const normalised = value.toLowerCase()
  const good = ['active', 'confirmed', 'completed', 'paid', 'success'].includes(normalised)
  const warning = ['pending', 'paused', 'draft', 'processing'].includes(normalised)
  const bad = ['cancelled', 'inactive', 'failed', 'no_show', 'overdue'].includes(normalised)

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${
        good
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
          : warning
            ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
            : bad
              ? 'border-red-500/20 bg-red-500/10 text-red-300'
              : 'border-white/10 bg-white/[0.04] text-stone-300'
      }`}
    >
      {value.replaceAll('_', ' ')}
    </span>
  )
}
