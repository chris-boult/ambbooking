import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const businessId = String(body.businessId || '')
    const customerMembershipId = String(body.customerMembershipId || body.membershipId || '')
    const customerId = String(body.customerId || '')
    const bookingId = body.bookingId ? String(body.bookingId) : null
    const sessionsUsed = Number(body.sessionsUsed || 1)
    const notes = String(body.notes || 'Membership session used.')

    if (!businessId || !customerMembershipId || !customerId) {
      return NextResponse.json({ error: 'Business, membership and customer are required.' }, { status: 400 })
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('customer_memberships')
      .select('*')
      .eq('id', customerMembershipId)
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .maybeSingle()

    if (membershipError || !membership) {
      return NextResponse.json({ error: membershipError?.message || 'Membership not found.' }, { status: 404 })
    }

    if (membership.status !== 'active') {
      return NextResponse.json({ error: 'Membership is not active.' }, { status: 400 })
    }

    const includedSessions = Number(membership.included_sessions || 0)
    const existingUsed = Number(membership.sessions_used || 0)
    const remaining = includedSessions - existingUsed

    if (includedSessions > 0 && remaining < sessionsUsed) {
      return NextResponse.json({ error: 'Not enough sessions remaining.' }, { status: 400 })
    }

    const { data: usage, error: usageError } = await supabaseAdmin
      .from('membership_usage')
      .insert({
        business_id: businessId,
        membership_id: customerMembershipId,
        customer_membership_id: customerMembershipId,
        customer_id: customerId,
        booking_id: bookingId,
        sessions_used: sessionsUsed,
        notes,
        usage_date: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (usageError) return NextResponse.json({ error: usageError.message }, { status: 500 })

    const { error: updateError } = await supabaseAdmin
      .from('customer_memberships')
      .update({
        sessions_used: existingUsed + sessionsUsed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerMembershipId)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    if (bookingId) {
      await supabaseAdmin
        .from('bookings')
        .update({
          customer_membership_id: customerMembershipId,
          membership_session_used: true,
          payment_status: 'membership',
          amount_due: 0,
        })
        .eq('id', bookingId)
    }

    return NextResponse.json({ ok: true, usage })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not use membership session.' }, { status: 500 })
  }
}
