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
      action,
    } = body

    const subject =
      action === 'cancelled'
        ? 'Your appointment has been cancelled'
        : 'Your appointment has been rescheduled'

    const heading =
      action === 'cancelled'
        ? 'Booking Cancelled'
        : 'Booking Rescheduled'

    const message =
      action === 'cancelled'
        ? 'Your appointment has been cancelled.'
        : 'Your appointment has been moved to a new date and time.'

    const { data, error } = await resend.emails.send({
      from: 'AMB Booking <onboarding@resend.dev>',
      to: [customerEmail],
      subject,
      html: `
        <h1>${heading}</h1>

        <p>Hi ${customerName},</p>

        <p>${message}</p>

        <ul>
          <li><strong>Date:</strong> ${bookingDate}</li>
          <li><strong>Time:</strong> ${bookingTime}</li>
        </ul>
      `,
    })

    if (error) {
      return NextResponse.json(error, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Email failed' },
      { status: 500 }
    )
  }
}