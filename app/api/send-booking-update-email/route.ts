import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import {
  getEmailBranding,
  resolveEmailBranding,
  buildBrandedEmail,
} from '@/lib/email-branding'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      businessId,
      customerName,
      customerEmail,
      bookingDate,
      bookingTime,
      serviceName,
      teamMemberName,
      action,
    } = body

    if (!customerEmail || !customerEmail.includes('@')) {
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
    const safeServiceName = serviceName?.trim() || 'Your appointment'
    const safeTeamMemberName = teamMemberName?.trim() || 'Your specialist'

    const branding = await getEmailBranding(businessId)
    const resolvedBranding = resolveEmailBranding(branding)

    const subject =
      action === 'cancelled'
        ? 'Your appointment has been cancelled'
        : 'Your appointment has been rescheduled'

    const title =
      action === 'cancelled'
        ? 'Booking cancelled'
        : 'Booking rescheduled'

    const intro =
      action === 'cancelled'
        ? 'Your appointment has been cancelled.'
        : 'Your appointment has been moved to a new date and time.'

    const buttonText =
      action === 'cancelled'
        ? 'Booking cancelled'
        : 'View updated booking'

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      'AMB Booking <onboarding@resend.dev>'

    const fromAddress = fromEmail.includes('<')
      ? fromEmail.split('<')[1].replace('>', '')
      : fromEmail

    const { data, error } = await resend.emails.send({
      from: `${resolvedBranding.brandName} <${fromAddress}>`,
      to: customerEmail,
      replyTo: resolvedBranding.replyTo,
      subject,
      html: buildBrandedEmail({
        title,
        customerName: safeCustomerName,
        intro,
        serviceName: safeServiceName,
        teamMemberName: safeTeamMemberName,
        bookingDate,
        bookingTime,
        buttonText,
        branding,
      }),
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email failed'

    console.error('Booking update email failed:', error)

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}