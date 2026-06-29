import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

const priceMap: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  growth: process.env.STRIPE_PRICE_GROWTH,
  pro: process.env.STRIPE_PRICE_PRO,
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { plan, businessId } = body

    if (!plan || !businessId) {
      return NextResponse.json(
        { error: 'Missing plan or businessId' },
        { status: 400 }
      )
    }

    const normalisedPlan = String(plan).toLowerCase()
    const priceId = priceMap[normalisedPlan]

    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid plan selected or missing Stripe price ID' },
        { status: 400 }
      )
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'

    if (business.is_internal) {
      return NextResponse.json({
        url: `${appUrl}/business`,
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: business.email || undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          business_id: business.id,
          plan: normalisedPlan,
        },
      },
      metadata: {
        business_id: business.id,
        plan: normalisedPlan,
      },
      success_url: `${appUrl}/business?subscription=success`,
      cancel_url: `${appUrl}/onboarding/plan?subscription=cancelled`,
    })

    await supabase
      .from('businesses')
      .update({
        plan: normalisedPlan,
        subscription_status: 'trial',
      })
      .eq('id', business.id)

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown subscription checkout error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}