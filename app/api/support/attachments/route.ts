import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'support-attachments'

export async function GET(req: NextRequest) {
  try {
    const ticketId = req.nextUrl.searchParams.get('ticketId')

    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('support_ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const signed = await Promise.all(
      (data || []).map(async (item) => {
        const { data: signedData } = await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUrl(item.storage_path, 60 * 60)

        return {
          ...item,
          signed_url: signedData?.signedUrl || null,
        }
      })
    )

    return NextResponse.json({ attachments: signed })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load attachments' },
      { status: 500 }
    )
  }
}