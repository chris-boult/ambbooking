import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'support-attachments'
const MAX_FILE_SIZE = 10 * 1024 * 1024

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
]

function cleanFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120)
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(token)

    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Invalid user session' }, { status: 401 })
    }

    const formData = await req.formData()
    const ticketId = String(formData.get('ticketId') || '')
    const messageIdRaw = formData.get('messageId')
    const messageId = messageIdRaw ? String(messageIdRaw) : null
    const file = formData.get('file') as File | null

    if (!ticketId || !file) {
      return NextResponse.json({ error: 'Missing ticket or file' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File is larger than 10MB' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('id,business_id,user_id')
      .eq('id', ticketId)
      .maybeSingle()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 })
    }

    if (messageId) {
      const { data: msg } = await supabaseAdmin
        .from('support_ticket_messages')
        .select('id,ticket_id')
        .eq('id', messageId)
        .eq('ticket_id', ticketId)
        .maybeSingle()

      if (!msg) {
        return NextResponse.json({ error: 'Support message not found' }, { status: 404 })
      }
    }

    const safeName = cleanFilename(file.name)
    const storagePath = `${ticket.business_id}/${ticketId}/${crypto.randomUUID()}-${safeName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: attachment, error: attachmentError } = await supabaseAdmin
      .from('support_ticket_attachments')
      .insert({
        ticket_id: ticketId,
        message_id: messageId,
        uploaded_by: userData.user.id,
        original_filename: file.name,
        storage_path: storagePath,
        public_url: `private:${BUCKET}/${storagePath}`,
        mime_type: file.type,
        file_size: file.size,
      })
      .select('*')
      .single()

    if (attachmentError) {
      await supabaseAdmin.storage.from(BUCKET).remove([storagePath])
      return NextResponse.json({ error: attachmentError.message }, { status: 500 })
    }

    return NextResponse.json({ attachment })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Upload failed' },
      { status: 500 }
    )
  }
}