import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type NotificationRecord = {
  id: string
  waitlist_id: string | null
  booking_id: string | null
  expires_at: string | null
  waiting_list?: {
    id: string
    preferred_date: string | null
    preferred_time_range: string | null
    customers?: {
      first_name: string | null
      last_name: string | null
      email: string | null
    } | null
    services?: {
      name: string | null
    } | null
  } | null
  bookings?: {
    booking_date: string | null
    booking_time: string | null
  } | null
}

function appUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

function fromEmail() {
  return process.env.RESEND_FROM_EMAIL || 'AMB Booking <bookings@amb360.co.uk>'
}

function formatDate(value?: string | null) {
  if (!value) return 'your requested date'

  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function customerName(record: NotificationRecord) {
  const customer = record.waiting_list?.customers
  const name = `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim()
  return name || 'there'
}

function emailHtml(record: NotificationRecord, claimUrl: string) {
  const serviceName = record.waiting_list?.services?.name || 'your requested service'
  const date = formatDate(record.bookings?.booking_date || record.waiting_list?.preferred_date)
  const time = String(record.bookings?.booking_time || record.waiting_list?.preferred_time_range || '').slice(0, 5) || 'the available time'

  return `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:620px;margin:0 auto;padding:32px 18px;">
        <div style="background:#020617;color:#ffffff;border-radius:28px;padding:28px;">
          <p style="margin:0 0 12px;color:#67e8f9;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Waitlist update</p>
          <h1 style="margin:0 0 14px;font-size:30px;line-height:1.15;">Good news, ${customerName(record)}</h1>
          <p style="margin:0 0 22px;color:#cbd5e1;font-size:16px;line-height:1.6;">
            A slot has become available for <strong style="color:#ffffff;">${serviceName}</strong>.
          </p>

          <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:18px;margin-bottom:22px;">
            <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:2px;font-weight:700;">Available slot</p>
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:800;">${date}</p>
            <p style="margin:6px 0 0;color:#67e8f9;font-size:18px;font-weight:800;">${time}</p>
          </div>

          <a href="${claimUrl}" style="display:block;text-align:center;background:#22d3ee;color:#020617;text-decoration:none;border-radius:18px;padding:16px 20px;font-size:16px;font-weight:900;">
            Claim this slot
          </a>

          <p style="margin:18px 0 0;color:#94a3b8;font-size:13px;line-height:1.5;">
            This link is time limited and the slot may no longer be available if someone else claims it first.
          </p>
        </div>
      </div>
    </div>
  `
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const notificationIds = Array.isArray(body.notificationIds) ? body.notificationIds : []

    if (notificationIds.length === 0) {
      return NextResponse.json({ error: 'No notification IDs supplied.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('waitlist_notifications')
      .select(`
        id,
        waitlist_id,
        booking_id,
        expires_at,
        waiting_list(
          id,
          preferred_date,
          preferred_time_range,
          customers(first_name,last_name,email),
          services(name)
        ),
        bookings(booking_date,booking_time)
      `)
      .in('id', notificationIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const records = (data as unknown as NotificationRecord[]) || []
    const sentIds: string[] = []
    const skipped: string[] = []

    for (const record of records) {
      const email = record.waiting_list?.customers?.email

      if (!email) {
        skipped.push(record.id)
        continue
      }

      const claimUrl = `${appUrl()}/waitlist/claim/${record.id}`

      await resend.emails.send({
        from: fromEmail(),
        to: email,
        subject: 'A booking slot has become available',
        html: emailHtml(record, claimUrl),
      })

      sentIds.push(record.id)
    }

    if (sentIds.length > 0) {
      await supabaseAdmin
        .from('waitlist_notifications')
        .update({ notification_sent: true })
        .in('id', sentIds)
    }

    return NextResponse.json({
  ok: true,
  sent: sentIds.length,
  skippedCount: skipped.length,
  sentIds,
  skippedIds: skipped,
})
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send waitlist emails.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
