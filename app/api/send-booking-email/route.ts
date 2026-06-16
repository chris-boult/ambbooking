import { NextResponse } from 'next/server'
import { Resend } from 'resend'

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

    const businessEmail = 'chris@amb360.co.uk'

    const { data: customerData, error: customerError } =
      await resend.emails.send({
        from: 'AMB Booking <onboarding@resend.dev>',
        to: [customerEmail],
        subject: 'Your booking is confirmed',
        html: `
          <h1>Booking Confirmed</h1>
          <p>Hi ${customerName},</p>
          <p>Your booking has been confirmed.</p>
          <ul>
            <li><strong>Service:</strong> ${serviceName}</li>
            <li><strong>Team Member:</strong> ${teamMemberName}</li>
            <li><strong>Date:</strong> ${bookingDate}</li>
            <li><strong>Time:</strong> ${bookingTime}</li>
          </ul>
        `,
      })

    if (customerError) {
      console.error('Customer email error:', customerError)
    }

    const { data: businessData, error: businessError } =
      await resend.emails.send({
        from: 'AMB Booking <onboarding@resend.dev>',
        to: [businessEmail],
        subject: 'New booking received',
        html: `
          <h1>New Booking Received</h1>
          <p>A new booking has been made.</p>
          <ul>
            <li><strong>Customer:</strong> ${customerName}</li>
            <li><strong>Email:</strong> ${customerEmail}</li>
            <li><strong>Service:</strong> ${serviceName}</li>
            <li><strong>Team Member:</strong> ${teamMemberName}</li>
            <li><strong>Date:</strong> ${bookingDate}</li>
            <li><strong>Time:</strong> ${bookingTime}</li>
          </ul>
        `,
      })

    if (businessError) {
      console.error('Business email error:', businessError)
    }

    return NextResponse.json({
      customerData,
      customerError,
      businessData,
      businessError,
    })
  } catch (error) {
    console.error('Route error:', error)

    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}