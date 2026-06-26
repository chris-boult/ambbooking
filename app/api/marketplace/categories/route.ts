import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('marketplace_categories')
    .select('id,name,slug,description')
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ categories: data || [] })
}
