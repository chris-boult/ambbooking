import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://www.amb-booking.co.uk'
  ).replace(/\/$/, '')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const businessId = String(body.businessId || '')

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required.' }, { status: 400 })
    }

    const { data: business, error } = await supabaseAdmin
      .from('businesses')
      .select('id, stripe_customer_id')
      .eq('id', businessId)
      .maybeSingle()

    if (error || !business) {
      return NextResponse.json({ error: error?.message || 'Business not found.' }, { status: 404 })
    }

    if (!business.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe billing customer found for this business.' },
        { status: 400 }
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: business.stripe_customer_id,
      return_url: `${appUrl()}/business/dashboard/settings`,
    })

    return NextResponse.json({ ok: true, url: session.url })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not open business billing portal.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}