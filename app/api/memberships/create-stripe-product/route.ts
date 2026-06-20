import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

function stripeInterval(value: string | null) {
  if (value === 'weekly') return 'week'
  if (value === 'yearly') return 'year'
  return 'month'
}

export async function POST(request: Request) {
  try {
    const { planId } = await request.json()

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY is missing.' }, { status: 500 })
    }

    const { data: plan, error } = await supabaseAdmin.from('membership_plans').select('*').eq('id', planId).maybeSingle()

    if (error || !plan) {
      return NextResponse.json({ error: error?.message || 'Plan not found.' }, { status: 404 })
    }

    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description || undefined,
      metadata: { business_id: plan.business_id, membership_plan_id: plan.id },
    })

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(Number(plan.monthly_amount || 0) * 100),
      currency: 'gbp',
      recurring: { interval: stripeInterval(plan.billing_interval) as any },
      metadata: { business_id: plan.business_id, membership_plan_id: plan.id },
    })

    const { error: updateError } = await supabaseAdmin.from('membership_plans').update({
      stripe_product_id: product.id,
      stripe_price_id: price.id,
      updated_at: new Date().toISOString(),
    }).eq('id', plan.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, stripe_product_id: product.id, stripe_price_id: price.id })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create Stripe product.' }, { status: 500 })
  }
}
