import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const resend = new Resend(process.env.RESEND_API_KEY)

function fromEmail() {
  return process.env.RESEND_FROM_EMAIL || 'AMB Booking <bookings@amb360.co.uk>'
}

function subjectForType(type: string) {
  if (type === 'cancelled') return 'Your booking has been cancelled'
  if (type === 'rescheduled') return 'Your booking has been rescheduled'
  return 'Your booking has been updated'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const bookingId = String(body.bookingId || '')
    const type = String(body.type || 'updated')

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required.' }, { status: 400 })
    }

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        booking_date,
        booking_time,
        status,
        customers(first_name,last_name,email),
        services(name),
        businesses(business_name)
      `)
      .eq('id', bookingId)
      .maybeSingle()

    if (error || !booking) {
      return NextResponse.json({ error: error?.message || 'Booking not found.' }, { status: 404 })
    }

    const customer = Array.isArray((booking as any).customers) ? (booking as any).customers[0] : (booking as any).customers
    const service = Array.isArray((booking as any).services) ? (booking as any).services[0] : (booking as any).services
    const business = Array.isArray((booking as any).businesses) ? (booking as any).businesses[0] : (booking as any).businesses

    if (!customer?.email || !process.env.RESEND_API_KEY) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    await resend.emails.send({
      from: fromEmail(),
      to: customer.email,
      subject: subjectForType(type),
      html: `
        <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:28px;color:#0f172a;">
          <div style="max-width:560px;margin:0 auto;background:#020617;color:white;border-radius:24px;padding:28px;">
            <p style="color:#67e8f9;text-transform:uppercase;letter-spacing:3px;font-size:12px;font-weight:700;">${business?.business_name || 'Booking update'}</p>
            <h1 style="margin:0 0 14px;font-size:28px;">${subjectForType(type)}</h1>
            <p style="color:#cbd5e1;line-height:1.6;">${service?.name || 'Your appointment'} is now marked as ${booking.status || type}.</p>
            <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:18px;padding:16px;margin-top:20px;">
              <p style="margin:0;color:white;font-weight:800;">${booking.booking_date}</p>
              <p style="margin:6px 0 0;color:#67e8f9;font-weight:800;">${String(booking.booking_time).slice(0,5)}</p>
            </div>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send booking email.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
