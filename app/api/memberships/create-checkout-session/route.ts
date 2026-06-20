import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

function appUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const businessId = String(body.businessId || '')
    const planId = String(body.planId || '')
    const email = String(body.email || '').trim().toLowerCase()
    const firstName = String(body.firstName || '').trim()
    const lastName = String(body.lastName || '').trim()

    const { data: business } = await supabaseAdmin.from('businesses').select('id,business_name,slug').eq('id', businessId).maybeSingle()
    const { data: plan } = await supabaseAdmin.from('membership_plans').select('*').eq('id', planId).eq('business_id', businessId).maybeSingle()

    if (!business || !plan) return NextResponse.json({ error: 'Business or plan not found.' }, { status: 404 })
    if (!plan.stripe_price_id) return NextResponse.json({ error: 'Plan is missing stripe_price_id. Create Stripe price first.' }, { status: 400 })

    let customerId = ''
    const { data: existingCustomer } = await supabaseAdmin.from('customers').select('id').eq('business_id', businessId).ilike('email', email).maybeSingle()

    if (existingCustomer?.id) {
      customerId = existingCustomer.id
    } else {
      const { data: createdCustomer, error: customerError } = await supabaseAdmin.from('customers').insert({
        business_id: businessId,
        first_name: firstName,
        last_name: lastName || null,
        email,
        customer_source: 'membership_checkout',
      }).select('id').single()

      if (customerError || !createdCustomer) return NextResponse.json({ error: customerError?.message || 'Could not create customer.' }, { status: 500 })
      customerId = createdCustomer.id
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      metadata: { business_id: businessId, customer_id: customerId, membership_plan_id: plan.id },
      subscription_data: { metadata: { business_id: businessId, customer_id: customerId, membership_plan_id: plan.id } },
      success_url: `${appUrl()}/membership-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/b/${business.slug}/memberships`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create checkout.' }, { status: 500 })
  }
}
