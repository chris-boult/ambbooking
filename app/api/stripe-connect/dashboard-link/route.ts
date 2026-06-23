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

    const loginLink = await stripe.accounts.createLoginLink(business.stripe_connect_account_id)

    return NextResponse.json({
      ok: true,
      url: loginLink.url,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create Stripe dashboard link.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
