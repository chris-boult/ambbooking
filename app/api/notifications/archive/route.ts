import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  try {
    const { notificationId, userId } = await req.json()

    if (!notificationId || !userId) {
      return NextResponse.json({ error: 'Missing archive payload.' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Could not archive notification.' },
      { status: 500 }
    )
  }
}
