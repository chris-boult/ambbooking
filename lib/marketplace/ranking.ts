import type { MarketplaceListing } from '@/types/marketplace'

export function marketplaceRankScore(listing: MarketplaceListing) {
  let score = 0

  if (listing.featured || listing.is_featured) score += 100
  if (listing.average_rating) score += Number(listing.average_rating) * 10
  if (listing.review_count) score += Math.min(Number(listing.review_count), 50)
  if (listing.trust_score) score += Number(listing.trust_score)
  if (listing.image_url || listing.hero_image_url) score += 10
  if (listing.booking_url) score += 10

  return score
}

export function sortMarketplaceListings(listings: MarketplaceListing[]) {
  return [...listings].sort((a, b) => marketplaceRankScore(b) - marketplaceRankScore(a))
}
