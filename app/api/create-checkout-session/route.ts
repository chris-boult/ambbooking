import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

type Booking = {
  id: string
  business_id: string
  customer_id: string | null
  service_id: string | null
  booking_date: string
  booking_time: string
  payment_status: string | null
}

type Service = {
  id: string
  name: string
  price: number
  payment_type: string | null
  deposit_amount: number | null
}

type Customer = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
}

function getBaseUrl(request: Request) {
  const origin = request.headers.get('origin')

  if (origin) return origin

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  return 'http://localhost:3000'
}

function moneyToPence(amount: number) {
  return Math.round(Number(amount || 0) * 100)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY

    if (!supabaseUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing NEXT_PUBLIC_SUPABASE_URL' },
        { status: 500 }
      )
    }

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      )
    }

    if (!stripeSecretKey) {
      return NextResponse.json(
        { success: false, error: 'Missing STRIPE_SECRET_KEY' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log(
  "Stripe key prefix:",
  stripeSecretKey.substring(0, 15),
  "length:",
  stripeSecretKey.length
)

const stripe = new Stripe(stripeSecretKey)

    const body = await request.json()
    const bookingId = body.bookingId as string | undefined

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing bookingId',
        },
        { status: 400 }
      )
    }

    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        business_id,
        customer_id,
        service_id,
        booking_date,
        booking_time,
        payment_status
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !bookingData) {
      return NextResponse.json(
        {
          success: false,
          step: 'fetch_booking',
          error: bookingError?.message || 'Booking not found',
        },
        { status: 404 }
      )
    }

    const booking = bookingData as Booking

    if (!booking.service_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Booking has no service_id',
        },
        { status: 400 }
      )
    }

    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .select('id, name, price, payment_type, deposit_amount')
      .eq('id', booking.service_id)
      .single()

    if (serviceError || !serviceData) {
      return NextResponse.json(
        {
          success: false,
          step: 'fetch_service',
          error: serviceError?.message || 'Service not found',
        },
        { status: 404 }
      )
    }

    const service = serviceData as Service

    let customer: Customer | null = null

    if (booking.customer_id) {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email')
        .eq('id', booking.customer_id)
        .single()

      if (customerError) {
        return NextResponse.json(
          {
            success: false,
            step: 'fetch_customer',
            error: customerError.message,
          },
          { status: 500 }
        )
      }

      customer = (customerData as Customer | null) || null
    }

    const paymentType = service.payment_type || 'none'
    const servicePrice = Number(service.price || 0)
    const depositAmount = Number(service.deposit_amount || 0)

    if (paymentType === 'none' || paymentType === 'card_hold') {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          payment_status:
            paymentType === 'card_hold'
              ? 'card_hold_not_yet_enabled'
              : 'not_required',
          amount_paid: 0,
          amount_due: servicePrice,
        })
        .eq('id', booking.id)

      if (updateError) {
        return NextResponse.json(
          {
            success: false,
            step: 'update_no_payment_booking',
            error: updateError.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        requiresPayment: false,
        paymentType,
        message:
          paymentType === 'card_hold'
            ? 'Card hold is not enabled yet. Booking can continue without payment for now.'
            : 'No payment required for this service.',
      })
    }

    let amountToCharge = 0
    let amountDue = 0
    let paymentLabel = ''

    if (paymentType === 'full') {
      amountToCharge = servicePrice
      amountDue = 0
      paymentLabel = `Full payment for ${service.name}`
    } else if (paymentType === 'deposit') {
      amountToCharge = depositAmount
      amountDue = Math.max(servicePrice - depositAmount, 0)
      paymentLabel = `Deposit for ${service.name}`
    } else {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported payment_type: ${paymentType}`,
        },
        { status: 400 }
      )
    }

    if (amountToCharge <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment amount must be greater than zero',
          paymentType,
          servicePrice,
          depositAmount,
        },
        { status: 400 }
      )
    }

    const baseUrl = getBaseUrl(request)

    const customerName = customer
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      : ''

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customer?.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'gbp',
            unit_amount: moneyToPence(amountToCharge),
            product_data: {
              name: paymentLabel,
              description: `${formatDate(booking.booking_date)} at ${booking.booking_time?.slice(0, 5)}`,
            },
          },
        },
      ],
      metadata: {
        booking_id: booking.id,
        business_id: booking.business_id,
        customer_id: booking.customer_id || '',
        service_id: booking.service_id || '',
        payment_type: paymentType,
        service_price: String(servicePrice),
        amount_to_charge: String(amountToCharge),
        amount_due: String(amountDue),
        customer_name: customerName,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/booking-cancelled?booking_id=${booking.id}`,
    })

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'pending',
        amount_paid: 0,
        amount_due: amountDue,
        stripe_checkout_session_id: session.id,
      })
      .eq('id', booking.id)

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          step: 'update_pending_booking',
          error: updateError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      requiresPayment: true,
      paymentType,
      checkoutUrl: session.url,
      checkoutSessionId: session.id,
      amountToCharge,
      amountDue,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown checkout session error'

    return NextResponse.json(
      {
        success: false,
        step: 'unexpected_error',
        error: message,
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST.',
    },
    { status: 405 }
  )
}
