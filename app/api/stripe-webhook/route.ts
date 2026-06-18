import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

function generateVoucherCode() {
  return `GV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

async function sendGiftVoucherEmail({
  to,
  recipientName,
  purchaserName,
  businessName,
  code,
  amount,
  expiryDate,
  message,
}: {
  to: string
  recipientName: string
  purchaserName: string
  businessName: string
  code: string
  amount: number
  expiryDate: string
  message: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY missing. Gift voucher email not sent.')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'AMB Booking <noreply@ambbooking.co.uk>',
      to,
      subject: `You’ve received a ${businessName} gift voucher`,
      html: `
        <div style="margin:0;padding:0;background:#020617;font-family:Arial,sans-serif;color:#ffffff;">
          <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
            <div style="border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);border-radius:28px;padding:32px;">
              <p style="margin:0 0 12px;color:#94a3b8;font-size:12px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;">
                Gift voucher
              </p>

              <h1 style="margin:0 0 18px;font-size:34px;line-height:1.1;color:#ffffff;">
                You’ve received a gift voucher
              </h1>

              <p style="margin:0 0 26px;color:#cbd5e1;font-size:16px;line-height:1.7;">
                Hi ${recipientName || 'there'}, ${purchaserName || 'someone'} has sent you a gift voucher for <strong>${businessName}</strong>.
              </p>

              ${
                message
                  ? `<div style="border:1px solid rgba(255,255,255,0.12);background:rgba(0,0,0,0.25);border-radius:20px;padding:20px;margin-bottom:24px;">
                      <p style="margin:0;color:#e2e8f0;font-size:15px;line-height:1.7;">“${message}”</p>
                    </div>`
                  : ''
              }

              <div style="border:1px solid rgba(255,255,255,0.12);background:#ffffff;border-radius:24px;padding:28px;text-align:center;color:#020617;margin-bottom:24px;">
                <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;">
                  Voucher code
                </p>

                <div style="font-size:34px;font-weight:900;letter-spacing:3px;margin-bottom:16px;">
                  ${code}
                </div>

                <p style="margin:0;font-size:28px;font-weight:900;">
                  £${amount.toFixed(2)}
                </p>

                <p style="margin:10px 0 0;color:#64748b;font-size:14px;">
                  Expires ${new Date(expiryDate).toLocaleDateString('en-GB')}
                </p>
              </div>

              <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.7;">
                Keep this email safe. You’ll need your voucher code when redeeming it with ${businessName}.
              </p>
            </div>

            <p style="margin:24px 0 0;text-align:center;color:#64748b;font-size:12px;">
              Powered by AMB Booking
            </p>
          </div>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('Gift voucher email failed:', text)
  }
}

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

      const type = session.metadata?.type
      const bookingId = session.metadata?.booking_id
      const businessId = session.metadata?.business_id
      const plan = session.metadata?.plan

      if (type === 'gift_voucher') {
        const businessSlug = session.metadata?.businessSlug || ''
        const amount = Number(session.metadata?.amount || 0)
        const recipientName = session.metadata?.recipientName || ''
        const recipientEmail = session.metadata?.recipientEmail || ''
        const purchaserName = session.metadata?.fromName || ''
        const message = session.metadata?.message || ''

        if (!businessSlug || !amount || !recipientEmail) {
          throw new Error('Missing gift voucher metadata')
        }

        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('id, business_name')
          .eq('slug', businessSlug)
          .single()

        if (businessError || !business) {
          throw new Error('Gift voucher business not found')
        }

        const expiryDate = new Date()
        expiryDate.setFullYear(expiryDate.getFullYear() + 1)

        let code = generateVoucherCode()

        const { data: existingVoucher } = await supabase
          .from('gift_vouchers')
          .select('id')
          .eq('code', code)
          .maybeSingle()

        if (existingVoucher) {
          code = generateVoucherCode()
        }

        const { error: voucherError } = await supabase
          .from('gift_vouchers')
          .insert({
            business_id: business.id,
            code,
            amount,
            remaining_amount: amount,
            recipient_name: recipientName,
            recipient_email: recipientEmail.trim().toLowerCase(),
            purchaser_name: purchaserName,
            purchaser_email:
              session.customer_details?.email ||
              session.customer_email ||
              null,
            expiry_date: expiryDate.toISOString().split('T')[0],
            status: 'active',
          })

        if (voucherError) throw voucherError

        await sendGiftVoucherEmail({
          to: recipientEmail.trim().toLowerCase(),
          recipientName,
          purchaserName,
          businessName: business.business_name || 'this business',
          code,
          amount,
          expiryDate: expiryDate.toISOString(),
          message,
        })

        console.log('Gift voucher created and email attempted:', code)
      }

      if (type === 'package_purchase') {
        const packageId = session.metadata?.package_id
        const customerFirstName = session.metadata?.customer_first_name || ''
        const customerLastName = session.metadata?.customer_last_name || ''
        const customerEmail =
          session.metadata?.customer_email || session.customer_email || ''
        const totalSessions = Number(session.metadata?.total_sessions || 0)

        if (!businessId || !packageId || !customerEmail || !totalSessions) {
          throw new Error('Missing package purchase metadata')
        }

        const cleanEmail = customerEmail.trim().toLowerCase()

        const { data: existingCustomer, error: existingCustomerError } =
          await supabase
            .from('customers')
            .select('id')
            .eq('business_id', businessId)
            .ilike('email', cleanEmail)
            .maybeSingle()

        if (existingCustomerError) throw existingCustomerError

        let customerId = existingCustomer?.id

        if (!customerId) {
          const { data: newCustomer, error: newCustomerError } = await supabase
            .from('customers')
            .insert({
              business_id: businessId,
              first_name: customerFirstName || 'Package',
              last_name: customerLastName || 'Customer',
              email: cleanEmail,
            })
            .select('id')
            .single()

          if (newCustomerError) throw newCustomerError

          customerId = newCustomer.id
        }

        const { data: existingCustomerPackage, error: existingPackageError } =
          await supabase
            .from('customer_packages')
            .select('id')
            .eq('business_id', businessId)
            .eq('customer_id', customerId)
            .eq('package_id', packageId)
            .eq('status', 'active')
            .maybeSingle()

        if (existingPackageError) throw existingPackageError

        if (!existingCustomerPackage) {
          const { error: customerPackageError } = await supabase
            .from('customer_packages')
            .insert({
              business_id: businessId,
              customer_id: customerId,
              package_id: packageId,
              sessions_purchased: totalSessions,
              sessions_used: 0,
              sessions_remaining: totalSessions,
              status: 'active',
            })

          if (customerPackageError) throw customerPackageError
        }
      }

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
  } catch (error: any) {
    console.error('Webhook handling error:', error)

    return NextResponse.json(
      { error: error.message || 'Webhook handling failed' },
      { status: 500 }
    )
  }
}