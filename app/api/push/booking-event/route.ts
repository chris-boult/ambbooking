import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendBusinessPush } from '@/lib/push/sendBusinessPush'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase environment variables.' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { businessId, bookingId, eventType } = await req.json()

    if (!businessId || !bookingId || !eventType) {
      return NextResponse.json({ error: 'Missing booking event payload.' }, { status: 400 })
    }

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('id,business_id,booking_date,booking_time,status,customers(first_name,last_name,email),services(name,price,duration_minutes),team_members(full_name)')
      .eq('id', bookingId)
      .eq('business_id', businessId)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: error?.message || 'Booking not found.' }, { status: 404 })
    }

    const customer = Array.isArray(booking.customers) ? booking.customers[0] : booking.customers
    const service = Array.isArray(booking.services) ? booking.services[0] : booking.services
    const team = Array.isArray(booking.team_members) ? booking.team_members[0] : booking.team_members

    const customerName = `${customer?.first_name || 'Customer'} ${customer?.last_name || ''}`.trim()
    const serviceName = service?.name || 'appointment'
    const staffName = team?.full_name || 'your team'
    const time = booking.booking_time?.slice(0, 5) || ''
    const date = booking.booking_date || ''

    const copy: Record<string, { title: string; body: string }> = {
      created: { title: 'New booking received', body: `${customerName} booked ${serviceName} with ${staffName} on ${date} at ${time}.` },
      cancelled: { title: 'Booking cancelled', body: `${customerName} cancelled ${serviceName} on ${date} at ${time}.` },
      rescheduled: { title: 'Booking rescheduled', body: `${customerName}'s ${serviceName} is now on ${date} at ${time}.` },
      completed: { title: 'Booking completed', body: `${customerName}'s ${serviceName} has been marked as completed.` },
      no_show: { title: 'No-show recorded', body: `${customerName} was marked as a no-show for ${serviceName}.` },
      updated: { title: 'Booking updated', body: `${customerName}'s booking has been updated.` },
    }

    const selectedCopy = copy[eventType] || copy.updated

    const result = await sendBusinessPush({
      businessId,
      title: selectedCopy.title,
      body: selectedCopy.body,
      url: '/business/dashboard/bookings',
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Booking push event failed.' }, { status: 500 })
  }
}
