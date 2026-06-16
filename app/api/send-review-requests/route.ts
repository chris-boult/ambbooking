import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

type Booking = {
  id: string
  business_id: string
  customer_id: string | null
  service_id: string | null
  team_member_id: string | null
  booking_date: string
  booking_time: string
  status: string | null
  review_request_sent: boolean | null
}

type Customer = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
}

type Service = {
  id: string
  name: string
}

type Business = {
  id: string
  business_name: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const resendApiKey = process.env.RESEND_API_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
}

if (!resendApiKey) {
  throw new Error('Missing RESEND_API_KEY')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const resend = new Resend(resendApiKey)

function uniqueValues(values: (string | null)[]) {
  return Array.from(new Set(values.filter(Boolean))) as string[]
}

function addHours(date: Date, hours: number) {
  const next = new Date(date)
  next.setHours(next.getHours() + hours)
  return next
}

function getDateTime(bookingDate: string, bookingTime: string) {
  return new Date(`${bookingDate}T${bookingTime}`)
}

function reviewEmailHtml({
  customerName,
  businessName,
  serviceName,
}: {
  customerName: string
  businessName: string
  serviceName: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px; color: #111827;">
      <h1 style="font-size: 28px; margin-bottom: 12px;">How did we do?</h1>

      <p style="font-size: 16px; line-height: 1.6;">
        Hi ${customerName},
      </p>

      <p style="font-size: 16px; line-height: 1.6;">
        Thanks for visiting ${businessName} for your ${serviceName}.
      </p>

      <p style="font-size: 16px; line-height: 1.6;">
        We'd really appreciate it if you could leave us a quick review.
      </p>

      <div style="margin: 28px 0;">
        <a href="#" style="background: #111827; color: #ffffff; padding: 14px 22px; border-radius: 10px; text-decoration: none; font-weight: bold;">
          Leave a review
        </a>
      </div>

      <p style="font-size: 16px; line-height: 1.6;">
        Thank you,
      </p>

      <p style="font-size: 16px; line-height: 1.6;">
        ${businessName}
      </p>
    </div>
  `
}

async function sendReviewRequest({
  booking,
  customer,
  service,
  business,
}: {
  booking: Booking
  customer: Customer | undefined
  service: Service | undefined
  business: Business | undefined
}) {
  if (!customer?.email) {
    return {
      sent: false,
      reason: 'Missing customer email',
    }
  }

  const customerName = `${customer.first_name || ''} ${
    customer.last_name || ''
  }`.trim()

  const businessName = business?.business_name || 'AMB Booking'
  const serviceName = service?.name || 'appointment'

  await resend.emails.send({
    from: `${businessName} <onboarding@resend.dev>`,
    to: customer.email,
    subject: `How was your appointment?`,
    html: reviewEmailHtml({
      customerName: customerName || 'there',
      businessName,
      serviceName,
    }),
  })

  await supabase
    .from('bookings')
    .update({ review_request_sent: true })
    .eq('id', booking.id)

  return {
    sent: true,
    reason: null,
  }
}

export async function GET() {
  const now = new Date()
  const fourHoursAgo = addHours(now, -4)

  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      business_id,
      customer_id,
      service_id,
      team_member_id,
      booking_date,
      booking_time,
      status,
      review_request_sent
    `)
    .eq('status', 'completed')
    .eq('review_request_sent', false)

  if (bookingsError) {
    return NextResponse.json(
      {
        success: false,
        step: 'fetch_bookings',
        error: bookingsError.message,
      },
      { status: 500 }
    )
  }

  const bookings = ((bookingsData as Booking[]) || []).filter((booking) => {
    const appointmentDateTime = getDateTime(
      booking.booking_date,
      booking.booking_time
    )

    return appointmentDateTime <= fourHoursAgo
  })

  const customerIds = uniqueValues(bookings.map((booking) => booking.customer_id))
  const serviceIds = uniqueValues(bookings.map((booking) => booking.service_id))
  const businessIds = uniqueValues(bookings.map((booking) => booking.business_id))

  let customers: Customer[] = []
  let services: Service[] = []
  let businesses: Business[] = []

  if (customerIds.length > 0) {
    const { data, error } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email')
      .in('id', customerIds)

    if (error) {
      return NextResponse.json(
        {
          success: false,
          step: 'fetch_customers',
          error: error.message,
        },
        { status: 500 }
      )
    }

    customers = (data as Customer[]) || []
  }

  if (serviceIds.length > 0) {
    const { data, error } = await supabase
      .from('services')
      .select('id, name')
      .in('id', serviceIds)

    if (error) {
      return NextResponse.json(
        {
          success: false,
          step: 'fetch_services',
          error: error.message,
        },
        { status: 500 }
      )
    }

    services = (data as Service[]) || []
  }

  if (businessIds.length > 0) {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, business_name')
      .in('id', businessIds)

    if (error) {
      return NextResponse.json(
        {
          success: false,
          step: 'fetch_businesses',
          error: error.message,
        },
        { status: 500 }
      )
    }

    businesses = (data as Business[]) || []
  }

  const results = []

  for (const booking of bookings) {
    const result = await sendReviewRequest({
      booking,
      customer: customers.find((customer) => customer.id === booking.customer_id),
      service: services.find((service) => service.id === booking.service_id),
      business: businesses.find((business) => business.id === booking.business_id),
    })

    results.push({
      bookingId: booking.id,
      ...result,
    })
  }

  return NextResponse.json({
    success: true,
    checkedAt: now.toISOString(),
    reviewRequestsFound: bookings.length,
    sent: results.filter((item) => item.sent).length,
    results,
  })
}
