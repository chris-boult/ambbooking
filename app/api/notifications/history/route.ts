import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const businessId = params.get('businessId')
  const unreadOnly = params.get('unreadOnly') === 'true'
  const limit = Math.min(Number(params.get('limit') || 50), 100)

  if (!businessId) return NextResponse.json({ error: 'Missing businessId.' }, { status: 400 })

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('business_id', businessId)
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) query = query.eq('is_read', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ notifications: data || [] })
}
