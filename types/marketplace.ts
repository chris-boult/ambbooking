export type MarketplaceCategory = {
  id: string
  name: string
  slug: string
  description?: string | null
}

export type MarketplaceBusiness = {
  id: string
  business_name?: string | null
  slug?: string | null
  logo_url?: string | null
  industry?: string | null
  marketplace_enabled?: boolean | null
}

export type MarketplaceListing = {
  id: string
  business_id: string
  category_id?: string | null
  listing_type: string
  title: string
  slug: string
  profile_slug?: string | null
  short_description?: string | null
  description?: string | null
  image_url?: string | null
  hero_image_url?: string | null
  industry?: string | null
  location_label?: string | null
  location_city?: string | null
  location_postcode?: string | null
  price_from?: number | null
  price_label?: string | null
  booking_url?: string | null
  website_url?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  is_featured?: boolean | null
  featured?: boolean | null
  featured_until?: string | null
  average_rating?: number | null
  review_count?: number | null
  trust_score?: number | null
  approval_status: string
  is_active: boolean
  businesses?: MarketplaceBusiness | null
  marketplace_categories?: MarketplaceCategory | null
}

export type MarketplaceSearchFilters = {
  query?: string
  category?: string
  location?: string
  featuredOnly?: boolean
  bookOnlineOnly?: boolean
  minRating?: number
  page?: number
  pageSize?: number
  contextBusinessId?: string
}
