import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  try {
    const {
      businessSlug,
      amount,
      recipientName,
      recipientEmail,
      fromName,
      message,
    } = await req.json()

    if (!amount || amount < 5) {
      return NextResponse.json(
        { error: 'Invalid voucher amount' },
        { status: 400 }
      )
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',

      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Gift Voucher (£${amount})`,
              description: `Gift voucher for ${recipientName}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],

      metadata: {
        type: 'gift_voucher',
        businessSlug: businessSlug || '',
        recipientName: recipientName || '',
        recipientEmail: recipientEmail || '',
        fromName: fromName || '',
        message: message || '',
        amount: String(amount),
      },

      success_url: `${
        process.env.NEXT_PUBLIC_APP_URL
      }/gift-voucher-success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${
        process.env.NEXT_PUBLIC_APP_URL
      }/book/${businessSlug}/giftvouchers`,
    })

    return NextResponse.json({
      url: session.url,
    })
  } catch (error: any) {
    console.error('Gift voucher checkout error:', error)

    return NextResponse.json(
      {
        error: error.message || 'Failed to create checkout session',
      },
      {
        status: 500,
      }
    )
  }
}