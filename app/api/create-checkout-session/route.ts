import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { publishEvent } from '@/lib/events'

export const dynamic = 'force-dynamic'

type Booking = {
  id: string
  business_id: string
  customer_id: string | null
  service_id: string | null
  booking_date: string
  booking_time: string
  payment_status: string | null
  total_price: number | null
  total_duration_minutes: number | null
}

type BookingService = {
  service_id: string
  service_name: string
  price: number
  duration_minutes: number
  services: {
    payment_type: string | null
    deposit_amount: number | null
  } | null
}

type Customer = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
}

type Business = {
  id: string
  stripe_connect_account_id: string | null
  stripe_connect_charges_enabled: boolean | null
}

function getBaseUrl(request: Request) {
  const origin = request.headers.get('origin')
  if (origin) return origin
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
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

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required server environment variables',
        },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const stripe = new Stripe(stripeSecretKey)

    const body = await request.json()
    const bookingId = body.bookingId as string | undefined

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Missing bookingId' },
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
        payment_status,
        total_price,
        total_duration_minutes
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

    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select(`
        id,
        stripe_connect_account_id,
        stripe_connect_charges_enabled
      `)
      .eq('id', booking.business_id)
      .single()

    if (businessError || !businessData) {
      return NextResponse.json(
        {
          success: false,
          step: 'fetch_business',
          error: businessError?.message || 'Business not found',
        },
        { status: 404 }
      )
    }

    const business = businessData as Business

    if (!business.stripe_connect_account_id || !business.stripe_connect_charges_enabled) {
      return NextResponse.json(
        {
          success: false,
          step: 'stripe_connect_not_ready',
          error: 'This business has not completed Stripe Connect setup yet.',
        },
        { status: 400 }
      )
    }

    const { data: bookingServicesData, error: bookingServicesError } =
      await supabase
        .from('booking_services')
        .select(`
          service_id,
          service_name,
          price,
          duration_minutes,
          services (
            payment_type,
            deposit_amount
          )
        `)
        .eq('booking_id', booking.id)

    if (bookingServicesError) {
      return NextResponse.json(
        {
          success: false,
          step: 'fetch_booking_services',
          error: bookingServicesError.message,
        },
        { status: 500 }
      )
    }

    const bookingServices = (bookingServicesData || []).map((item: any) => ({
      service_id: item.service_id,
      service_name: item.service_name,
      price: Number(item.price || 0),
      duration_minutes: Number(item.duration_minutes || 0),
      services: Array.isArray(item.services) ? item.services[0] : item.services,
    })) as BookingService[]

    if (bookingServices.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Booking has no booking_services rows',
        },
        { status: 400 }
      )
    }

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

    const totalPrice =
      Number(booking.total_price || 0) ||
      bookingServices.reduce((sum, item) => sum + Number(item.price || 0), 0)

    let amountToCharge = 0
    let paymentLabel = ''
    let paymentType = 'pay_later'

    const fullPaymentServices = bookingServices.filter(
      (item) => item.services?.payment_type === 'full_payment'
    )

    const depositServices = bookingServices.filter(
      (item) => item.services?.payment_type === 'deposit'
    )

    if (fullPaymentServices.length > 0) {
      paymentType = 'full_payment'
      amountToCharge = totalPrice
      paymentLabel =
        bookingServices.length === 1
          ? `Full payment for ${bookingServices[0].service_name}`
          : `Full payment for ${bookingServices.length} services`
    } else if (depositServices.length > 0) {
      paymentType = 'deposit'
      amountToCharge = depositServices.reduce(
        (sum, item) => sum + Number(item.services?.deposit_amount || 0),
        0
      )
      paymentLabel =
        bookingServices.length === 1
          ? `Deposit for ${bookingServices[0].service_name}`
          : `Deposit for ${bookingServices.length} services`
    } else {
      paymentType = 'pay_later'
    }

    const amountDue = Math.max(totalPrice - amountToCharge, 0)

    if (paymentType === 'pay_later') {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'not_required',
          amount_paid: 0,
          amount_due: totalPrice,
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

      await publishEvent({
        id: crypto.randomUUID(),
        type: 'booking.created',
        businessId: booking.business_id,
        customerId: booking.customer_id || undefined,
        createdAt: new Date().toISOString(),
        payload: {
          bookingId: booking.id,
          serviceId: booking.service_id,
          bookingDate: booking.booking_date,
          bookingTime: booking.booking_time,
          paymentStatus: 'not_required',
          paymentType,
          amountDue: totalPrice,
          totalPrice,
        },
      })

      return NextResponse.json({
        success: true,
        requiresPayment: false,
        paymentType,
        amountToCharge: 0,
        amountDue: totalPrice,
        message: 'No payment required for this booking.',
      })
    }

    if (amountToCharge <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment amount must be greater than zero',
          paymentType,
          totalPrice,
          amountToCharge,
        },
        { status: 400 }
      )
    }

    const baseUrl = getBaseUrl(request)

    const customerName = customer
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      : ''

    const amountToChargeInPence = moneyToPence(amountToCharge)

    // AMB Booking platform fee: 5%
    const platformFeeInPence = Math.round(amountToChargeInPence * 0.05)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customer?.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'gbp',
            unit_amount: amountToChargeInPence,
            product_data: {
              name: paymentLabel,
              description: `${formatDate(booking.booking_date)} at ${booking.booking_time?.slice(
                0,
                5
              )}`,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFeeInPence,
        transfer_data: {
          destination: business.stripe_connect_account_id,
        },
      },
      metadata: {
        booking_id: booking.id,
        business_id: booking.business_id,
        customer_id: booking.customer_id || '',
        service_id: booking.service_id || '',
        payment_type: paymentType,
        service_price: String(totalPrice),
        amount_to_charge: String(amountToCharge),
        amount_due: String(amountDue),
        customer_name: customerName,
        platform_fee: String(platformFeeInPence),
      },
      success_url: `${baseUrl}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
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
      platformFeeInPence,
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