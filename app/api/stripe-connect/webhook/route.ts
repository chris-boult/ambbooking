import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

function getConnectStatus(account: Stripe.Account) {
  if (account.charges_enabled && account.payouts_enabled && account.details_submitted) {
    return 'active'
  }

  if (account.details_submitted) {
    return 'pending_review'
  }

  return 'onboarding_incomplete'
}

async function syncConnectedAccount(account: Stripe.Account) {
  const accountId = account.id

  const chargesEnabled = Boolean(account.charges_enabled)
  const payoutsEnabled = Boolean(account.payouts_enabled)
  const detailsSubmitted = Boolean(account.details_submitted)
  const onboardingComplete = chargesEnabled && payoutsEnabled && detailsSubmitted
  const status = getConnectStatus(account)

  const { data: business, error: businessLookupError } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('stripe_connect_account_id', accountId)
    .maybeSingle()

  if (businessLookupError) {
    throw businessLookupError
  }

  if (!business) {
    console.warn(`Stripe Connect webhook received for unknown account: ${accountId}`)
    return
  }

  const { error: updateError } = await supabaseAdmin
    .from('businesses')
    .update({
      stripe_connect_charges_enabled: chargesEnabled,
      stripe_connect_payouts_enabled: payoutsEnabled,
      stripe_connect_details_submitted: detailsSubmitted,
      stripe_connect_onboarding_complete: onboardingComplete,
      stripe_connect_status: status,
      stripe_connect_last_checked_at: new Date().toISOString(),
    })
    .eq('id', business.id)

  if (updateError) {
    throw updateError
  }
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'STRIPE_CONNECT_WEBHOOK_SECRET is missing.' },
      { status: 500 }
    )
  }

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Stripe signature.' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid Stripe webhook signature.'

    console.error('Stripe Connect webhook signature error:', message)

    return NextResponse.json(
      { error: 'Invalid signature.' },
      { status: 400 }
    )
  }

  try {
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account
      await syncConnectedAccount(account)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Stripe Connect webhook handling failed.'

    console.error('Stripe Connect webhook error:', message)

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}