import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { filterMarketplaceListings } from '@/lib/marketplace/search'
import type { MarketplaceListing } from '@/types/marketplace'

function sortListings(listings: MarketplaceListing[], sortBy: string) {
  const sorted = [...listings]

  if (sortBy === 'featured') {
    return sorted.sort((a, b) => Number(Boolean(b.featured || b.is_featured)) - Number(Boolean(a.featured || a.is_featured)))
  }

  if (sortBy === 'rating') {
    return sorted.sort((a, b) => Number(b.average_rating || 0) - Number(a.average_rating || 0))
  }

  if (sortBy === 'newest') {
    return sorted
  }

  if (sortBy === 'price_low') {
    return sorted.sort((a, b) => Number(a.price_from || 999999) - Number(b.price_from || 999999))
  }

  if (sortBy === 'price_high') {
    return sorted.sort((a, b) => Number(b.price_from || 0) - Number(a.price_from || 0))
  }

  return sorted.sort((a, b) => {
    const scoreA =
      Number(Boolean(a.featured || a.is_featured)) * 100 +
      Number(a.trust_score || 0) +
      Number(a.average_rating || 0) * 10 +
      Number(a.review_count || 0)

    const scoreB =
      Number(Boolean(b.featured || b.is_featured)) * 100 +
      Number(b.trust_score || 0) +
      Number(b.average_rating || 0) * 10 +
      Number(b.review_count || 0)

    return scoreB - scoreA
  })
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const query = searchParams.get('q') || ''
  const category = searchParams.get('category') || 'all'
  const location = searchParams.get('location') || ''
  const featuredOnly = searchParams.get('featured') === 'true'
  const bookOnlineOnly = searchParams.get('bookOnline') === 'true'
  const openNow = searchParams.get('openNow') === 'true'
  const availableToday = searchParams.get('availableToday') === 'true'
  const verifiedOnly = searchParams.get('verified') === 'true'
  const parking = searchParams.get('parking') === 'true'
  const wheelchairAccess = searchParams.get('wheelchairAccess') === 'true'
  const minRating = Number(searchParams.get('minRating') || 0)
  const sortBy = searchParams.get('sortBy') || 'recommended'
  const page = Math.max(Number(searchParams.get('page') || 1), 1)
  const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') || 24), 1), 60)
  const contextBusinessId = searchParams.get('contextBusinessId') || ''

  let blockedIndustries: string[] = []

  if (contextBusinessId) {
    const { data: settings } = await supabase
      .from('platform_marketplace_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    const { data: contextBusiness } = await supabase
      .from('businesses')
      .select('id,industry,competitor_protection')
      .eq('id', contextBusinessId)
      .maybeSingle()

    if (
      settings?.competitor_protection_enabled !== false &&
      settings?.allow_open_marketplace !== true &&
      contextBusiness?.competitor_protection !== false &&
      contextBusiness?.industry
    ) {
      const { data: rules } = await supabase
        .from('marketplace_industry_rules')
        .select('related_industry')
        .eq('primary_industry', contextBusiness.industry)
        .eq('relationship_type', 'competitor')

      blockedIndustries = (rules || []).map((rule: any) => rule.related_industry)
    }
  }

  let dbQuery = supabase
    .from('marketplace_listings')
    .select('*, marketplace_categories(name,slug), businesses(id,business_name,slug,logo_url,industry,marketplace_enabled)')
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .limit(300)

  if (blockedIndustries.length > 0) {
    dbQuery = dbQuery.not('industry', 'in', `(${blockedIndustries.map((item) => `"${item}"`).join(',')})`)
  }

  if (openNow) dbQuery = dbQuery.eq('open_now', true)
  if (availableToday) dbQuery = dbQuery.eq('available_today', true)
  if (verifiedOnly) dbQuery = dbQuery.eq('verified', true)
  if (parking) dbQuery = dbQuery.eq('parking_available', true)
  if (wheelchairAccess) dbQuery = dbQuery.eq('wheelchair_access', true)

  const { data, error } = await dbQuery

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const visibleListings = (data || []).filter((listing: any) => listing.businesses?.marketplace_enabled !== false)

  const filtered = filterMarketplaceListings(visibleListings as any, {
    query,
    category,
    location,
    featuredOnly,
    bookOnlineOnly,
    minRating,
    page,
    pageSize,
    contextBusinessId,
  })

  const sorted = sortListings(filtered, sortBy)
  const from = (page - 1) * pageSize
  const to = from + pageSize
  const paged = sorted.slice(from, to)

  const { data: searchEvent } = await supabase
    .from('marketplace_search_events')
    .insert({
      query,
      category_slug: category,
      location_query: location,
      result_count: sorted.length,
      context_business_id: contextBusinessId || null,
    })
    .select('id')
    .maybeSingle()

  if (searchEvent?.id) {
    await supabase.from('marketplace_search_metadata').insert({
      search_event_id: searchEvent.id,
      filters: {
        featuredOnly,
        bookOnlineOnly,
        openNow,
        availableToday,
        verifiedOnly,
        parking,
        wheelchairAccess,
        minRating,
      },
      sort_by: sortBy,
      view_mode: searchParams.get('viewMode') || 'list',
    })
  }

  return NextResponse.json({
    listings: paged,
    total: sorted.length,
    page,
    pageSize,
    hasMore: to < sorted.length,
    meta: {
      query,
      category,
      location,
      sortBy,
      filtersApplied: [
        featuredOnly,
        bookOnlineOnly,
        openNow,
        availableToday,
        verifiedOnly,
        parking,
        wheelchairAccess,
        minRating > 0,
      ].filter(Boolean).length,
    },
  })
}
