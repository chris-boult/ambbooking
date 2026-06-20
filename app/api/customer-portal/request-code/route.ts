import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function fromEmail() {
  return 'AMB Booking <onboarding@resend.dev>'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const businessId = String(body.businessId || '')
    const email = String(body.email || '').trim().toLowerCase()

    if (!businessId || !email) {
      return NextResponse.json({ error: 'Business and email are required.' }, { status: 400 })
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id,first_name,last_name,email,business_id')
      .eq('business_id', businessId)
      .ilike('email', email)
      .maybeSingle()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'No customer record found for that email.' }, { status: 404 })
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const { error: insertError } = await supabaseAdmin
      .from('customer_portal_access_codes')
      .insert({
        business_id: businessId,
        customer_id: customer.id,
        email,
        code,
        expires_at: expiresAt,
        used: false,
      })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY is missing in Vercel.' }, { status: 500 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const sendResult = await resend.emails.send({
      from: fromEmail(),
      to: email,
      subject: 'Your customer portal access code',
      html: `
        <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:28px;color:#0f172a;">
          <div style="max-width:560px;margin:0 auto;background:#020617;color:white;border-radius:24px;padding:28px;">
            <p style="color:#67e8f9;text-transform:uppercase;letter-spacing:3px;font-size:12px;font-weight:700;">Customer portal</p>
            <h1 style="margin:0 0 14px;font-size:28px;">Your access code</h1>
            <p style="color:#cbd5e1;line-height:1.6;">Use this code to access your customer portal. It expires in 15 minutes.</p>
            <div style="margin:24px 0;background:white;color:#020617;border-radius:18px;padding:18px;text-align:center;font-size:34px;font-weight:900;letter-spacing:8px;">
              ${code}
            </div>
            <p style="color:#94a3b8;font-size:13px;">If you did not request this, you can ignore this email.</p>
          </div>
        </div>
      `,
    })

    if (sendResult.error) {
      return NextResponse.json(
        {
          error: sendResult.error.message || 'Resend rejected the email.',
          resendError: sendResult.error,
          from: fromEmail(),
          to: email,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      resendId: sendResult.data?.id,
      from: fromEmail(),
      to: email,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send access code.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}