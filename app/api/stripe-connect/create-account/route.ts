import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
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

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY is missing.' },
        { status: 500 }
      )
    }

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required.' },
        { status: 400 }
      )
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select(`
        id,
        business_name,
        email,
        stripe_connect_account_id
      `)
      .eq('id', businessId)
      .maybeSingle()

    if (businessError || !business) {
      return NextResponse.json(
        { error: businessError?.message || 'Business not found.' },
        { status: 404 }
      )
    }

    let accountId = business.stripe_connect_account_id as string | null

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        email: business.email || undefined,
        business_profile: {
          name: business.business_name || undefined,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          business_id: business.id,
        },
      })

      accountId = account.id

      const { error: updateError } = await supabaseAdmin
        .from('businesses')
        .update({
          stripe_connect_account_id: accountId,
          stripe_connect_status: 'onboarding_started',
          stripe_connect_charges_enabled: false,
          stripe_connect_payouts_enabled: false,
          stripe_connect_details_submitted: false,
          stripe_connect_onboarding_complete: false,
          stripe_connect_last_checked_at: new Date().toISOString(),
        })
        .eq('id', business.id)

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        )
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl()}/business/dashboard/money?connect_refresh=1`,
      return_url: `${appUrl()}/business/dashboard/money?connect_return=1`,
      type: 'account_onboarding',
    })

    return NextResponse.json({
      ok: true,
      accountId,
      url: accountLink.url,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Could not create Stripe Connect account.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}