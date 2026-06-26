import type { MarketplaceListing, MarketplaceSearchFilters } from '@/types/marketplace'
import { sortMarketplaceListings } from './ranking'

export function filterMarketplaceListings(
  listings: MarketplaceListing[],
  filters: MarketplaceSearchFilters
) {
  const q = String(filters.query || '').toLowerCase().trim()
  const location = String(filters.location || '').toLowerCase().trim()

  const filtered = listings.filter((listing) => {
    const categorySlug = listing.marketplace_categories?.slug
    const matchesCategory = !filters.category || filters.category === 'all' || categorySlug === filters.category

    const text = [
      listing.title,
      listing.short_description,
      listing.description,
      listing.industry,
      listing.location_label,
      listing.location_city,
      listing.businesses?.business_name,
      listing.marketplace_categories?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const matchesQuery = !q || text.includes(q)

    const locationText = [
      listing.location_label,
      listing.location_city,
      listing.location_postcode,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const matchesLocation = !location || locationText.includes(location)
    const matchesFeatured = !filters.featuredOnly || listing.featured || listing.is_featured
    const matchesBookOnline = !filters.bookOnlineOnly || Boolean(listing.booking_url)
    const matchesRating = !filters.minRating || Number(listing.average_rating || 0) >= filters.minRating

    return matchesCategory && matchesQuery && matchesLocation && matchesFeatured && matchesBookOnline && matchesRating
  })

  return sortMarketplaceListings(filtered)
}
