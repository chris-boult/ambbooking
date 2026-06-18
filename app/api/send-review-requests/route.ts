import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import {
  getEmailBranding,
  resolveEmailBranding,
  buildBrandedEmail,
} from '@/lib/email-branding'

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

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

function fromAddress() {
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || 'AMB Booking <onboarding@resend.dev>'

  return fromEmail.includes('<')
    ? fromEmail.split('<')[1].replace('>', '')
    : fromEmail
}

async function sendReviewRequest({
  booking,
  customer,
  service,
}: {
  booking: Booking
  customer: Customer | undefined
  service: Service | undefined
}) {
  if (!customer?.email || !customer.email.includes('@')) {
    return {
      sent: false,
      reason: 'Missing customer email',
    }
  }

  const customerName = `${customer.first_name || ''} ${
    customer.last_name || ''
  }`.trim()

  const serviceName = service?.name || 'appointment'
  const reviewUrl = process.env.REVIEW_URL || '#'

  const branding = await getEmailBranding(booking.business_id)
  const resolvedBranding = resolveEmailBranding(branding)

  const { data, error } = await resend.emails.send({
    from: `${resolvedBranding.brandName} <${fromAddress()}>`,
    to: customer.email,
    replyTo: resolvedBranding.replyTo,
    subject: 'How was your appointment?',
    html: buildBrandedEmail({
      title: 'How did we do?',
      customerName: customerName || 'there',
      intro: `Thanks for visiting us for your ${serviceName}. We would really appreciate it if you could leave a quick review.`,
      serviceName,
      teamMemberName: 'Your specialist',
      bookingDate: booking.booking_date,
      bookingTime: booking.booking_time,
      buttonText: 'Leave a review',
      branding,
    }).replace('Leave a review</span>', `<a href="${reviewUrl}" style="color:#fff;text-decoration:none;">Leave a review</a></span>`),
  })

  if (error) {
    console.error('Review request email error:', error)

    return {
      sent: false,
      reason: error.message || 'Resend failed',
    }
  }

  await supabase
    .from('bookings')
    .update({ review_request_sent: true })
    .eq('id', booking.id)

  return {
    sent: true,
    reason: null,
    data,
  }
}

export async function GET() {
  try {
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
        { success: false, step: 'fetch_bookings', error: bookingsError.message },
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

    const customerIds = uniqueValues(
      bookings.map((booking) => booking.customer_id)
    )
    const serviceIds = uniqueValues(bookings.map((booking) => booking.service_id))

    let customers: Customer[] = []
    let services: Service[] = []

    if (customerIds.length > 0) {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email')
        .in('id', customerIds)

      if (error) {
        return NextResponse.json(
          { success: false, step: 'fetch_customers', error: error.message },
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
          { success: false, step: 'fetch_services', error: error.message },
          { status: 500 }
        )
      }

      services = (data as Service[]) || []
    }

    const results = []

    for (const booking of bookings) {
      const result = await sendReviewRequest({
        booking,
        customer: customers.find(
          (customer) => customer.id === booking.customer_id
        ),
        service: services.find((service) => service.id === booking.service_id),
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Review request route failed'

    console.error('Review request route error:', error)

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}