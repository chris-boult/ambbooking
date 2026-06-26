'use client'

export function SearchBar({
  query,
  location,
  onQueryChange,
  onLocationChange,
  onSearch,
}: {
  query: string
  location: string
  onQueryChange: (value: string) => void
  onLocationChange: (value: string) => void
  onSearch: () => void
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
      <h1 className="text-4xl font-black text-white">Find trusted businesses</h1>
      <p className="mt-3 max-w-3xl text-slate-400">
        Search approved businesses, services, offers and products across the AMB Booking marketplace.
      </p>

      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_280px_auto]">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="What are you looking for?"
          className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600"
        />

        <input
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          placeholder="Town, city or postcode"
          className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-600"
        />

        <button
          type="button"
          onClick={onSearch}
          className="rounded-2xl bg-white px-7 py-4 font-black text-slate-950"
        >
          Search
        </button>
      </div>
    </section>
  )
}
