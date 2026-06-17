import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    )
  } catch (err: any) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      const bookingId = session.metadata?.booking_id
      const businessId = session.metadata?.business_id
      const plan = session.metadata?.plan

      if (bookingId) {
        const { error } = await supabase
          .from('bookings')
          .update({
            payment_status: 'paid',
            stripe_session_id: session.id,
          })
          .eq('id', bookingId)

        if (error) throw error
      }

      if (businessId && plan) {
        const { error } = await supabase
          .from('businesses')
          .update({
            plan,
            subscription_status: 'trial',
            stripe_customer_id:
              typeof session.customer === 'string'
                ? session.customer
                : null,
            stripe_subscription_id:
              typeof session.subscription === 'string'
                ? session.subscription
                : null,
          })
          .eq('id', businessId)

        if (error) throw error
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription
      const businessId = subscription.metadata?.business_id
      const plan = subscription.metadata?.plan

      if (businessId) {
        const { error } = await supabase
          .from('businesses')
          .update({
            plan: plan || undefined,
            subscription_status: subscription.status,
            stripe_customer_id:
              typeof subscription.customer === 'string'
                ? subscription.customer
                : null,
            stripe_subscription_id: subscription.id,
          })
          .eq('id', businessId)

        if (error) throw error
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const businessId = subscription.metadata?.business_id

      if (businessId) {
        const { error } = await supabase
          .from('businesses')
          .update({
            subscription_status: 'cancelled',
            stripe_subscription_id: subscription.id,
          })
          .eq('id', businessId)

        if (error) throw error
      }
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = (invoice as any).subscription as string | null

      if (subscriptionId) {
        const { error } = await supabase
          .from('businesses')
          .update({
            subscription_status: 'active',
          })
          .eq('stripe_subscription_id', subscriptionId)

        if (error) throw error
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = (invoice as any).subscription as string | null

      if (subscriptionId) {
        const { error } = await supabase
          .from('businesses')
          .update({
            subscription_status: 'past_due',
          })
          .eq('stripe_subscription_id', subscriptionId)

        if (error) throw error
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handling error:', error)

    return NextResponse.json(
      { error: 'Webhook handling failed' },
      { status: 500 }
    )
  }
}