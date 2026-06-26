import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { filterMarketplaceListings } from '@/lib/marketplace/search'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const query = searchParams.get('q') || ''
  const category = searchParams.get('category') || 'all'
  const location = searchParams.get('location') || ''
  const featuredOnly = searchParams.get('featured') === 'true'
  const bookOnlineOnly = searchParams.get('bookOnline') === 'true'
  const minRating = Number(searchParams.get('minRating') || 0)
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
    .order('featured', { ascending: false })
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(250)

  if (blockedIndustries.length > 0) {
    dbQuery = dbQuery.not('industry', 'in', `(${blockedIndustries.map((item) => `"${item}"`).join(',')})`)
  }

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

  const from = (page - 1) * pageSize
  const to = from + pageSize
  const paged = filtered.slice(from, to)

  await supabase.from('marketplace_search_events').insert({
  query,
  category_slug: category,
  location_query: location,
  result_count: filtered.length,
  context_business_id: contextBusinessId || null,
})

  return NextResponse.json({
    listings: paged,
    total: filtered.length,
    page,
    pageSize,
    hasMore: to < filtered.length,
  })
}
