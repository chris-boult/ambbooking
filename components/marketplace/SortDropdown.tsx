'use client'

export type MarketplaceSort = 'recommended' | 'featured' | 'rating' | 'newest' | 'price_low' | 'price_high'

export function SortDropdown({
  value,
  onChange,
}: {
  value: MarketplaceSort
  onChange: (value: MarketplaceSort) => void
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as MarketplaceSort)}
      className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-black text-white outline-none"
    >
      <option value="recommended">Recommended</option>
      <option value="featured">Featured first</option>
      <option value="rating">Highest rated</option>
      <option value="newest">Newest</option>
      <option value="price_low">Price low to high</option>
      <option value="price_high">Price high to low</option>
    </select>
  )
}
