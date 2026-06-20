import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const businessId = String(body.businessId || '')
    const bookingId = String(body.bookingId || '')
    const customerMembershipId = String(body.customerMembershipId || '')
    const customerId = String(body.customerId || '')
    const sessionsUsed = Number(body.sessionsUsed || 1)

    const { data: membership } = await supabaseAdmin.from('customer_memberships').select('*').eq('id', customerMembershipId).eq('business_id', businessId).eq('customer_id', customerId).maybeSingle()

    if (!membership) return NextResponse.json({ error: 'Membership not found.' }, { status: 404 })
    if (membership.status !== 'active') return NextResponse.json({ error: 'Membership is not active.' }, { status: 400 })

    const included = Number(membership.included_sessions || 0)
    const alreadyUsed = Number(membership.sessions_used || 0)
    if (included > 0 && included - alreadyUsed < sessionsUsed) return NextResponse.json({ error: 'Not enough sessions remaining.' }, { status: 400 })

    await supabaseAdmin.from('membership_usage').insert({
      business_id: businessId,
      customer_membership_id: customerMembershipId,
      customer_id: customerId,
      booking_id: bookingId,
      sessions_used: sessionsUsed,
      notes: 'Session used against booking.',
    })

    await supabaseAdmin.from('customer_memberships').update({
      sessions_used: alreadyUsed + sessionsUsed,
      updated_at: new Date().toISOString(),
    }).eq('id', customerMembershipId)

    await supabaseAdmin.from('bookings').update({
      customer_membership_id: customerMembershipId,
      membership_session_used: true,
      payment_status: 'membership',
      amount_due: 0,
    }).eq('id', bookingId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not use membership session.' }, { status: 500 })
  }
}
