import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase environment variables.' },
        { status: 500 }
      )
    }

    const body = await request.json()

    const bookingId = String(body.bookingId || '')
    const bookingDate = String(body.bookingDate || '')
    const bookingTime = String(body.bookingTime || '')
    const teamMemberId = body.teamMemberId ? String(body.teamMemberId) : null

    if (!bookingId || !bookingDate || !bookingTime) {
      return NextResponse.json(
        { error: 'Missing bookingId, bookingDate or bookingTime.' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: existingBooking, error: existingError } = await supabase
      .from('bookings')
      .select('id, business_id, total_duration_minutes, service_id, services(duration_minutes)')
      .eq('id', bookingId)
      .single()

    if (existingError || !existingBooking) {
      return NextResponse.json(
        { error: existingError?.message || 'Booking not found.' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('bookings')
      .update({
        booking_date: bookingDate,
        booking_time: bookingTime,
        team_member_id: teamMemberId,
      })
      .eq('id', bookingId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      bookingId,
      bookingDate,
      bookingTime,
      teamMemberId,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error.' },
      { status: 500 }
    )
  }
}
