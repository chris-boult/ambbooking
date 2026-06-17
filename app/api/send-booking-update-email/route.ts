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
      action,
    } = body

    if (!customerEmail || !customerEmail.includes('@')) {
      console.log('Booking update email skipped: missing customer email')

      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Missing customer email',
      })
    }

    if (!bookingDate || !bookingTime || !action) {
      return NextResponse.json(
        { error: 'Missing booking email details' },
        { status: 400 }
      )
    }

    const safeCustomerName = customerName?.trim() || 'there'

    const subject =
      action === 'cancelled'
        ? 'Your appointment has been cancelled'
        : 'Your appointment has been rescheduled'

    const heading =
      action === 'cancelled'
        ? 'Booking cancelled'
        : 'Booking rescheduled'

    const message =
      action === 'cancelled'
        ? 'Your appointment has been cancelled.'
        : 'Your appointment has been moved to a new date and time.'

    const { data, error } = await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL ||
        'AMB Booking <onboarding@resend.dev>',
      to: customerEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
          <h1>${heading}</h1>

          <p>Hi ${safeCustomerName},</p>

          <p>${message}</p>

          <p>
            <strong>Date:</strong> ${bookingDate}<br />
            <strong>Time:</strong> ${bookingTime}
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Resend booking update email error:', error)

      return NextResponse.json(
        { error: error.message || 'Resend email failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('Booking update email failed:', error)

    return NextResponse.json(
      { error: error.message || 'Email failed' },
      { status: 500 }
    )
  }
}