import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function calculateListingScore(listing: any) {
  let score = 20
  if (listing.title) score += 10
  if (listing.short_description) score += 10
  if (listing.description) score += 10
  if (listing.image_url) score += 10
  if (listing.hero_image_url) score += 10
  if (listing.category_id) score += 10
  if (listing.location_city || listing.location_label) score += 10
  if (listing.contact_phone || listing.contact_email || listing.website_url) score += 10
  return Math.min(score, 100)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { businessId, listingId, patch } = body

  if (!businessId) return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })

  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user

  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id,business_name,slug,user_id')
    .eq('id', businessId)
    .maybeSingle()

  if (businessError || !business) {
    return NextResponse.json({ error: businessError?.message || 'Business not found' }, { status: 404 })
  }

  if (business.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const nextPatch = {
    ...patch,
    listing_score: calculateListingScore(patch),
    search_text: [
      patch.title,
      patch.tagline,
      patch.short_description,
      patch.description,
      patch.industry,
      patch.location_city,
      patch.location_county,
      patch.location_postcode,
    ].filter(Boolean).join(' '),
  }

  if (listingId) {
    const { data, error } = await supabase
      .from('marketplace_listings')
      .update(nextPatch)
      .eq('id', listingId)
      .eq('business_id', businessId)
      .select('*, marketplace_categories(name,slug)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ listing: data })
  }

  const slug = slugify(patch.title || business.business_name || business.slug || 'listing')

  const { data, error } = await supabase
    .from('marketplace_listings')
    .insert({
      ...nextPatch,
      business_id: businessId,
      title: patch.title || business.business_name || 'Marketplace listing',
      slug: `${slug}-${Date.now().toString().slice(-5)}`,
      listing_type: 'service',
      approval_status: 'pending',
      is_active: true,
    })
    .select('*, marketplace_categories(name,slug)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ listing: data })
}
