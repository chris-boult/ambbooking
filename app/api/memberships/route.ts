import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

function today() { return new Date().toISOString().slice(0, 10) }
function periodEnd() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
}

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json()

    const session = await stripe.checkout.sessions.retrieve(String(sessionId), { expand: ['subscription', 'customer'] })

    const businessId = String(session.metadata?.business_id || '')
    const customerId = String(session.metadata?.customer_id || '')
    const planId = String(session.metadata?.membership_plan_id || '')

    const { data: plan } = await supabaseAdmin.from('membership_plans').select('*').eq('id', planId).eq('business_id', businessId).maybeSingle()
    if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 })

    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null

    const { data: existing } = await supabaseAdmin.from('customer_memberships').select('id').eq('business_id', businessId).eq('customer_id', customerId).eq('stripe_subscription_id', subscriptionId).maybeSingle()
    if (existing?.id) return NextResponse.json({ ok: true, membershipId: existing.id })

    const { data, error } = await supabaseAdmin.from('customer_memberships').insert({
      business_id: businessId,
      customer_id: customerId,
      membership_plan_id: plan.id,
      membership_name: plan.name,
      status: 'active',
      billing_interval: plan.billing_interval,
      monthly_amount: plan.monthly_amount,
      included_sessions: plan.included_sessions,
      sessions_used: 0,
      current_period_start: today(),
      current_period_end: periodEnd(),
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscriptionId,
    }).select('id').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, membershipId: data.id })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not activate membership.' }, { status: 500 })
  }
}
