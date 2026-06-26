import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing notification id.' }, { status: 400 })

  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
