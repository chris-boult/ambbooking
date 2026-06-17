import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      customerName,
      customerEmail,
      bookingDate,
      bookingTime,
      serviceName,
      teamMemberName,
    } = body

    const businessEmail = process.env.BUSINESS_NOTIFICATION_EMAIL || 'chris@amb360.co.uk'
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || 'AMB Booking <onboarding@resend.dev>'

    if (!bookingDate || !bookingTime || !serviceName) {
      return NextResponse.json(
        { error: 'Missing booking email details' },
        { status: 400 }
      )
    }

    const safeCustomerName = customerName?.trim() || 'there'
    const safeTeamMemberName = teamMemberName?.trim() || 'Your specialist'
    const safeCustomerEmail = customerEmail?.trim()

    let customerData = null
    let customerError = null
    let businessData = null
    let businessError = null

    if (safeCustomerEmail && safeCustomerEmail.includes('@')) {
      const result = await resend.emails.send({
        from: fromEmail,
        to: safeCustomerEmail,
        subject: 'Your booking is confirmed',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
            <h1>Booking confirmed</h1>

            <p>Hi ${safeCustomerName},</p>

            <p>Your booking has been confirmed.</p>

            <p>
              <strong>Service:</strong> ${serviceName}<br />
              <strong>Team member:</strong> ${safeTeamMemberName}<br />
              <strong>Date:</strong> ${bookingDate}<br />
              <strong>Time:</strong> ${bookingTime}
            </p>
          </div>
        `,
      })

      customerData = result.data
      customerError = result.error

      if (customerError) {
        console.error('Customer email error:', customerError)
      }
    } else {
      console.log('Customer confirmation email skipped: missing customer email')
    }

    if (businessEmail && businessEmail.includes('@')) {
      const result = await resend.emails.send({
        from: fromEmail,
        to: businessEmail,
        subject: 'New booking received',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
            <h1>New booking received</h1>

            <p>A new booking has been made.</p>

            <p>
              <strong>Customer:</strong> ${safeCustomerName}<br />
              <strong>Email:</strong> ${safeCustomerEmail || 'Not provided'}<br />
              <strong>Service:</strong> ${serviceName}<br />
              <strong>Team member:</strong> ${safeTeamMemberName}<br />
              <strong>Date:</strong> ${bookingDate}<br />
              <strong>Time:</strong> ${bookingTime}
            </p>
          </div>
        `,
      })

      businessData = result.data
      businessError = result.error

      if (businessError) {
        console.error('Business email error:', businessError)
      }
    }

    return NextResponse.json({
      success: true,
      customerData,
      customerError,
      businessData,
      businessError,
    })
  } catch (error: any) {
    console.error('Booking confirmation email route error:', error)

    return NextResponse.json(
      { error: error.message || 'Failed to send booking email' },
      { status: 500 }
    )
  }
}