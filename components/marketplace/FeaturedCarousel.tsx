'use client'

import type { MarketplaceListing } from '@/types/marketplace'
import { MarketplaceCard } from './MarketplaceCard'

export function FeaturedCarousel({ listings }: { listings: MarketplaceListing[] }) {
  if (!listings.length) return null

  return (
    <section>
      <h2 className="mb-4 text-2xl font-black text-white">Featured businesses</h2>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {listings.slice(0, 6).map((listing) => (
          <MarketplaceCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  )
}
