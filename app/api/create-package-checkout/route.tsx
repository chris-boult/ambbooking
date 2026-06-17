import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      package_id,
      customer_first_name,
      customer_last_name,
      customer_email,
      business_id,
      success_url,
      cancel_url,
    } = body

    if (!package_id || !customer_email || !business_id) {
      return NextResponse.json(
        { error: 'Missing package checkout details' },
        { status: 400 }
      )
    }

    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', package_id)
      .eq('business_id', business_id)
      .eq('active', true)
      .maybeSingle()

    if (packageError) {
      return NextResponse.json({ error: packageError.message }, { status: 500 })
    }

    if (!packageData) {
      return NextResponse.json(
        { error: 'Package not found or inactive' },
        { status: 404 }
      )
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: packageData.name,
              description:
                packageData.description ||
                `${packageData.total_sessions} prepaid sessions`,
            },
            unit_amount: Math.round(Number(packageData.price) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'package_purchase',
        business_id,
        package_id,
        customer_first_name: customer_first_name || '',
        customer_last_name: customer_last_name || '',
        customer_email,
        package_name: packageData.name,
        total_sessions: String(packageData.total_sessions),
      },
      success_url:
        success_url ||
        `${process.env.NEXT_PUBLIC_APP_URL}/booking-success?package=success`,
      cancel_url:
        cancel_url ||
        `${process.env.NEXT_PUBLIC_APP_URL}/booking-cancelled?package=cancelled`,
    })

    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
    })
  } catch (error: any) {
    console.error('Create package checkout error:', error)

    return NextResponse.json(
      { error: error.message || 'Could not create package checkout' },
      { status: 500 }
    )
  }
}