'use client'

import { useEffect, useState } from 'react'
import type { MarketplaceCategory, MarketplaceListing } from '@/types/marketplace'
import { SearchBar } from '@/components/marketplace/SearchBar'
import { CategoryGrid } from '@/components/marketplace/CategoryGrid'
import { MarketplaceCard } from '@/components/marketplace/MarketplaceCard'
import { FeaturedCarousel } from '@/components/marketplace/FeaturedCarousel'
import { AdvancedFilterPanel, type AdvancedMarketplaceFilters } from '@/components/marketplace/AdvancedFilterPanel'
import { MarketplaceMapPanel } from '@/components/marketplace/MarketplaceMapPanel'
import { SortDropdown, type MarketplaceSort } from '@/components/marketplace/SortDropdown'

const defaultFilters: AdvancedMarketplaceFilters = {
  featuredOnly: false,
  bookOnlineOnly: false,
  openNow: false,
  availableToday: false,
  verifiedOnly: false,
  parking: false,
  wheelchairAccess: false,
  minRating: 0,
}

export default function MarketplacePage() {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('all')
  const [filters, setFilters] = useState<AdvancedMarketplaceFilters>(defaultFilters)
  const [sortBy, setSortBy] = useState<MarketplaceSort>('recommended')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [categories, setCategories] = useState<MarketplaceCategory[]>([])
  const [featured, setFeatured] = useState<MarketplaceListing[]>([])
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCategories()
    loadFeatured()
    searchMarketplace()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchMarketplace()
    }, 350)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, location, category, filters, sortBy, viewMode])

  async function loadCategories() {
    const response = await fetch('/api/marketplace/categories')
    const result = await response.json()
    setCategories(result.categories || [])
  }

  async function loadFeatured() {
    const response = await fetch('/api/marketplace/featured')
    const result = await response.json()
    setFeatured(result.listings || [])
  }

  async function searchMarketplace() {
    setLoading(true)

    const params = new URLSearchParams({
      q: query,
      location,
      category,
      featured: String(filters.featuredOnly),
      bookOnline: String(filters.bookOnlineOnly),
      openNow: String(filters.openNow),
      availableToday: String(filters.availableToday),
      verified: String(filters.verifiedOnly),
      parking: String(filters.parking),
      wheelchairAccess: String(filters.wheelchairAccess),
      minRating: String(filters.minRating),
      sortBy,
      viewMode,
      page: '1',
      pageSize: '48',
    })

    if (typeof window !== 'undefined') {
      const contextBusinessId = localStorage.getItem('marketplace_context_business_id')
      if (contextBusinessId) params.set('contextBusinessId', contextBusinessId)
    }

    const response = await fetch(`/api/marketplace/search?${params.toString()}`)
    const result = await response.json()

    setListings(result.listings || [])
    setTotal(result.total || 0)
    setLoading(false)
  }

  const showFeatured =
    !query &&
    category === 'all' &&
    !Object.values(filters).some(Boolean) &&
    sortBy === 'recommended'

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-10">
        <SearchBar
          query={query}
          location={location}
          onQueryChange={setQuery}
          onLocationChange={setLocation}
          onSearch={searchMarketplace}
        />

        <CategoryGrid categories={categories} selected={category} onSelect={setCategory} />

        <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
          <aside className="space-y-5">
            <AdvancedFilterPanel
              filters={filters}
              onChange={setFilters}
              onClear={() => setFilters(defaultFilters)}
            />
          </aside>

          <section className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black">Discover businesses</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {loading ? 'Searching...' : `${total} result${total === 1 ? '' : 's'} found`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`rounded-2xl px-4 py-3 text-sm font-black ${viewMode === 'list' ? 'bg-white text-slate-950' : 'border border-slate-800 bg-slate-900 text-white'}`}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`rounded-2xl px-4 py-3 text-sm font-black ${viewMode === 'map' ? 'bg-white text-slate-950' : 'border border-slate-800 bg-slate-900 text-white'}`}
                >
                  Map
                </button>

                <SortDropdown value={sortBy} onChange={setSortBy} />
              </div>
            </div>

            {showFeatured && <FeaturedCarousel listings={featured} />}

            {viewMode === 'map' ? (
              <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
                <ResultsGrid loading={loading} listings={listings} />
                <MarketplaceMapPanel listings={listings} />
              </div>
            ) : (
              <ResultsGrid loading={loading} listings={listings} />
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function ResultsGrid({
  loading,
  listings,
}: {
  loading: boolean
  listings: MarketplaceListing[]
}) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-500">
        Searching marketplace...
      </div>
    )
  }

  if (!listings.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900 p-10 text-center text-slate-500">
        No marketplace listings found.
      </div>
    )
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {listings.map((listing) => (
        <MarketplaceCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}
