import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'Missing businessId.' }, { status: 400 })

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ preferences: data || null })
}

export async function POST(request: NextRequest) {
  const { businessId, preferences } = await request.json()
  if (!businessId) return NextResponse.json({ error: 'Missing businessId.' }, { status: 400 })

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({ business_id: businessId, ...(preferences || {}) }, { onConflict: 'business_id' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ preferences: data })
}
