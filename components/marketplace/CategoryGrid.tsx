'use client'

import type { MarketplaceCategory } from '@/types/marketplace'

export function CategoryGrid({
  categories,
  selected,
  onSelect,
}: {
  categories: MarketplaceCategory[]
  selected: string
  onSelect: (slug: string) => void
}) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-black text-white">Categories</h2>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect('all')}
          className={`rounded-2xl px-4 py-3 text-sm font-black ${selected === 'all' ? 'bg-white text-slate-950' : 'border border-slate-800 bg-slate-900 text-white'}`}
        >
          All
        </button>

        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.slug)}
            className={`rounded-2xl px-4 py-3 text-sm font-black ${selected === category.slug ? 'bg-white text-slate-950' : 'border border-slate-800 bg-slate-900 text-white'}`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </section>
  )
}
