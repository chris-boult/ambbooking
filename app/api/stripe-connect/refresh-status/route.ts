import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const businessId = String(body.businessId || '')

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required.' }, { status: 400 })
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id,stripe_connect_account_id')
      .eq('id', businessId)
      .maybeSingle()

    if (businessError || !business) {
      return NextResponse.json({ error: businessError?.message || 'Business not found.' }, { status: 404 })
    }

    if (!business.stripe_connect_account_id) {
      return NextResponse.json({ error: 'No connected Stripe account found.' }, { status: 400 })
    }

    const account = await stripe.accounts.retrieve(business.stripe_connect_account_id)

    const chargesEnabled = Boolean(account.charges_enabled)
    const payoutsEnabled = Boolean(account.payouts_enabled)
    const detailsSubmitted = Boolean(account.details_submitted)
    const complete = chargesEnabled && payoutsEnabled && detailsSubmitted
    const status = complete ? 'enabled' : detailsSubmitted ? 'in_review' : 'onboarding_required'

    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        stripe_connect_charges_enabled: chargesEnabled,
        stripe_connect_payouts_enabled: payoutsEnabled,
        stripe_connect_details_submitted: detailsSubmitted,
        stripe_connect_onboarding_complete: complete,
        stripe_connect_status: status,
        stripe_connect_last_checked_at: new Date().toISOString(),
      })
      .eq('id', business.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      accountId: account.id,
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      complete,
      status,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not refresh Stripe Connect status.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
