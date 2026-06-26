'use client'

import { useEffect, useState } from 'react'
import type { MarketplaceCategory, MarketplaceListing } from '@/types/marketplace'
import { SearchBar } from '@/components/marketplace/SearchBar'
import { CategoryGrid } from '@/components/marketplace/CategoryGrid'
import { FilterBar } from '@/components/marketplace/FilterBar'
import { MarketplaceCard } from '@/components/marketplace/MarketplaceCard'
import { FeaturedCarousel } from '@/components/marketplace/FeaturedCarousel'

export default function MarketplacePage() {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('all')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [bookOnlineOnly, setBookOnlineOnly] = useState(false)
  const [minRating, setMinRating] = useState(0)
  const [categories, setCategories] = useState<MarketplaceCategory[]>([])
  const [featured, setFeatured] = useState<MarketplaceListing[]>([])
  const [listings, setListings] = useState<MarketplaceListing[]>([])
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
  }, [query, location, category, featuredOnly, bookOnlineOnly, minRating])

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
      featured: String(featuredOnly),
      bookOnline: String(bookOnlineOnly),
      minRating: String(minRating),
      page: '1',
      pageSize: '36',
    })

    if (typeof window !== 'undefined') {
      const contextBusinessId = localStorage.getItem('marketplace_context_business_id')
      if (contextBusinessId) params.set('contextBusinessId', contextBusinessId)
    }

    const response = await fetch(`/api/marketplace/search?${params.toString()}`)
    const result = await response.json()

    setListings(result.listings || [])
    setLoading(false)
  }

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

        <FilterBar
          featuredOnly={featuredOnly}
          bookOnlineOnly={bookOnlineOnly}
          minRating={minRating}
          onFeaturedOnlyChange={setFeaturedOnly}
          onBookOnlineOnlyChange={setBookOnlineOnly}
          onMinRatingChange={setMinRating}
        />

        {!query && category === 'all' && !featuredOnly && <FeaturedCarousel listings={featured} />}

        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black">Search results</h2>
            <p className="text-sm text-slate-500">{loading ? 'Searching...' : `${listings.length} result${listings.length === 1 ? '' : 's'}`}</p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-500">
              Searching marketplace...
            </div>
          ) : listings.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <MarketplaceCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900 p-10 text-center text-slate-500">
              No marketplace listings found.
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
