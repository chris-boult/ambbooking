'use client'

export type AdvancedMarketplaceFilters = {
  featuredOnly: boolean
  bookOnlineOnly: boolean
  openNow: boolean
  availableToday: boolean
  verifiedOnly: boolean
  parking: boolean
  wheelchairAccess: boolean
  minRating: number
}

export function AdvancedFilterPanel({
  filters,
  onChange,
  onClear,
}: {
  filters: AdvancedMarketplaceFilters
  onChange: (filters: AdvancedMarketplaceFilters) => void
  onClear: () => void
}) {
  function update(key: keyof AdvancedMarketplaceFilters, value: any) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-black text-white">Filters</h2>
        <button type="button" onClick={onClear} className="text-sm font-bold text-slate-400 hover:text-white">
          Clear
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
        <Toggle label="Featured only" value={filters.featuredOnly} onChange={(value) => update('featuredOnly', value)} />
        <Toggle label="Book online" value={filters.bookOnlineOnly} onChange={(value) => update('bookOnlineOnly', value)} />
        <Toggle label="Open now" value={filters.openNow} onChange={(value) => update('openNow', value)} />
        <Toggle label="Available today" value={filters.availableToday} onChange={(value) => update('availableToday', value)} />
        <Toggle label="Verified only" value={filters.verifiedOnly} onChange={(value) => update('verifiedOnly', value)} />
        <Toggle label="Parking" value={filters.parking} onChange={(value) => update('parking', value)} />
        <Toggle label="Wheelchair access" value={filters.wheelchairAccess} onChange={(value) => update('wheelchairAccess', value)} />

        <label className="block rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <span className="mb-2 block text-sm font-bold text-slate-500">Minimum rating</span>
          <select
            value={filters.minRating}
            onChange={(event) => update('minRating', Number(event.target.value))}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-white outline-none"
          >
            <option value={0}>Any rating</option>
            <option value={3}>3★+</option>
            <option value={4}>4★+</option>
            <option value={4.5}>4.5★+</option>
          </select>
        </label>
      </div>
    </section>
  )
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`rounded-2xl border px-4 py-3 text-left text-sm font-black ${
        value
          ? 'border-white bg-white text-slate-950'
          : 'border-slate-800 bg-slate-950 text-white hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  )
}
