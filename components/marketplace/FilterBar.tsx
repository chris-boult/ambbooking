'use client'

export function FilterBar({
  featuredOnly,
  bookOnlineOnly,
  minRating,
  onFeaturedOnlyChange,
  onBookOnlineOnlyChange,
  onMinRatingChange,
}: {
  featuredOnly: boolean
  bookOnlineOnly: boolean
  minRating: number
  onFeaturedOnlyChange: (value: boolean) => void
  onBookOnlineOnlyChange: (value: boolean) => void
  onMinRatingChange: (value: number) => void
}) {
  return (
    <section className="flex flex-wrap items-center gap-2">
      <Toggle label="Featured" enabled={featuredOnly} onChange={onFeaturedOnlyChange} />
      <Toggle label="Book online" enabled={bookOnlineOnly} onChange={onBookOnlineOnlyChange} />

      <select
        value={minRating}
        onChange={(event) => onMinRatingChange(Number(event.target.value))}
        className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-black text-white outline-none"
      >
        <option value={0}>Any rating</option>
        <option value={3}>3★+</option>
        <option value={4}>4★+</option>
        <option value={4.5}>4.5★+</option>
      </select>
    </section>
  )
}

function Toggle({
  label,
  enabled,
  onChange,
}: {
  label: string
  enabled: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`rounded-2xl px-4 py-3 text-sm font-black ${
        enabled ? 'bg-white text-slate-950' : 'border border-slate-800 bg-slate-900 text-white'
      }`}
    >
      {label}
    </button>
  )
}
