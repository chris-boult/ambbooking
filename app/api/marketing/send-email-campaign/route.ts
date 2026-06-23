import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import {
  getEmailBranding,
  resolveEmailBranding,
  buildBrandedEmail,
} from '@/lib/email-branding'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

function personaliseMessage(message: string, customer: { firstName?: string | null; lastName?: string | null }) {
  return message
    .replaceAll('{first_name}', customer.firstName || '')
    .replaceAll('{last_name}', customer.lastName || '')
}

function fromAddress() {
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || 'AMB Booking <onboarding@resend.dev>'

  return fromEmail.includes('<')
    ? fromEmail.split('<')[1].replace('>', '')
    : fromEmail
}

export async function POST(request: Request) {
  try {
    const { businessId, campaignName, audienceType, subject, message, recipients } = await request.json()

    if (!businessId || !subject || !message || !Array.isArray(recipients)) {
      return NextResponse.json(
        { error: 'Missing campaign details.' },
        { status: 400 }
      )
    }

    const branding = await getEmailBranding(businessId)
    const resolvedBranding = resolveEmailBranding(branding)

    let sent = 0
    let failed = 0

    for (const recipient of recipients) {
      if (!recipient.email || !recipient.email.includes('@')) continue

      const personalised = personaliseMessage(message, recipient)
      const personalisedSubject = personaliseMessage(subject, recipient)

      try {
        const result = await resend.emails.send({
          from: `${resolvedBranding.brandName} <${fromAddress()}>`,
          to: recipient.email,
          replyTo: resolvedBranding.replyTo,
          subject: personalisedSubject,
          html: buildBrandedEmail({
            title: personalisedSubject,
            customerName: recipient.firstName || 'there',
            intro: personalised,
            serviceName: campaignName || 'Campaign',
            teamMemberName: resolvedBranding.brandName || 'Our team',
            bookingDate: new Date().toLocaleDateString('en-GB'),
            bookingTime: '',
            buttonText: 'Read more',
            branding,
          }),
        })

        if (result.error) {
          throw new Error(result.error.message || 'Resend failed')
        }

        await supabase.from('email_campaign_logs').insert({
          business_id: businessId,
          customer_id: recipient.customerId || null,
          email: recipient.email,
          subject: personalisedSubject,
          message: personalised,
          audience_type: audienceType || null,
          status: 'sent',
          provider_message_id: result.data?.id || null,
        })

        sent += 1
      } catch (error: any) {
        await supabase.from('email_campaign_logs').insert({
          business_id: businessId,
          customer_id: recipient.customerId || null,
          email: recipient.email,
          subject: personalisedSubject,
          message: personalised,
          audience_type: audienceType || null,
          status: 'failed',
          error_message: `${campaignName || 'Email campaign'} · ${error?.message || 'Send failed'}`,
        })

        failed += 1
      }
    }

    return NextResponse.json({ sent, failed })
  } catch (error: any) {
    console.error('Send email campaign error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not send email campaign.' },
      { status: 500 }
    )
  }
}
