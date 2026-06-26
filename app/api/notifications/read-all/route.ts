import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { businessId } = await request.json()
  if (!businessId) return NextResponse.json({ error: 'Missing businessId.' }, { status: 400 })

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('business_id', businessId)
    .eq('is_read', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
