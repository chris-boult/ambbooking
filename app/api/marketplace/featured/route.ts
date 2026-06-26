import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*, marketplace_categories(name,slug), businesses(id,business_name,slug,logo_url,industry,marketplace_enabled)')
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .or('featured.eq.true,is_featured.eq.true')
    .order('created_at', { ascending: false })
    .limit(12)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const listings = (data || []).filter((listing: any) => listing.businesses?.marketplace_enabled !== false)

  return NextResponse.json({ listings })
}
