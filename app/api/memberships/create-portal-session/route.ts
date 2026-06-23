import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  try {
    const { stripeCustomerId, customerId, returnUrl } = await request.json()

    const finalCustomerId = stripeCustomerId || customerId

    if (!finalCustomerId) {
      return NextResponse.json(
        { error: 'Missing Stripe customer ID.' },
        { status: 400 }
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: finalCustomerId,
      return_url:
        returnUrl ||
        `${process.env.NEXT_PUBLIC_APP_URL}/business/dashboard/memberships`,
    })

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}