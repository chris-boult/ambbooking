import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function getEmailBranding(businessId?: string) {
  if (!businessId) return null

  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('id,business_name,logo_url,primary_colour,secondary_colour,hide_amb_branding,white_label_mode,sender_name,sender_email,reply_to_email')
    .eq('id', businessId)
    .maybeSingle()

  const { data: emailBranding } = await supabaseAdmin
    .from('email_branding')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle()

  return {
    business,
    emailBranding,
  }
}

function escapeHtml(value: string) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function resolveEmailBranding(brandingData: any) {
  const business = brandingData?.business
  const emailBranding = brandingData?.emailBranding

  const brandName =
    emailBranding?.sender_name ||
    business?.sender_name ||
    business?.business_name ||
    'AMB Booking'

  return {
    brandName,
    replyTo:
      emailBranding?.reply_to_email ||
      business?.reply_to_email ||
      emailBranding?.sender_email ||
      business?.sender_email ||
      undefined,

    logoUrl:
      emailBranding?.header_logo_url ||
      business?.logo_url ||
      '',

    primaryColour:
      emailBranding?.primary_colour ||
      business?.primary_colour ||
      '#111827',

    secondaryColour:
      emailBranding?.secondary_colour ||
      business?.secondary_colour ||
      '#6366f1',

    footerText:
      emailBranding?.footer_text ||
      `Thank you for booking with ${brandName}.`,

    showAmbBranding:
      !(business?.hide_amb_branding || business?.white_label_mode === 'fully_white_label'),
  }
}

export function buildBrandedEmail({
  title,
  customerName,
  intro,
  serviceName,
  teamMemberName,
  bookingDate,
  bookingTime,
  buttonText = 'View booking',
  branding,
}: {
  title: string
  customerName: string
  intro: string
  serviceName: string
  teamMemberName: string
  bookingDate: string
  bookingTime: string
  buttonText?: string
  branding: any
}) {
  const resolved = resolveEmailBranding(branding)

  return `
    <div style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:620px;margin:0 auto;padding:28px 16px;">
        <div style="background:${resolved.primaryColour};border-radius:22px 22px 0 0;padding:28px;">
          ${
            resolved.logoUrl
              ? `<img src="${escapeHtml(resolved.logoUrl)}" alt="${escapeHtml(resolved.brandName)}" style="max-height:58px;max-width:220px;background:#fff;border-radius:12px;padding:8px;" />`
              : `<h1 style="margin:0;color:#fff;font-size:24px;">${escapeHtml(resolved.brandName)}</h1>`
          }
        </div>

        <div style="background:#ffffff;border-radius:0 0 22px 22px;padding:32px;">
          <h2 style="margin:0 0 18px;font-size:28px;line-height:1.2;color:#111827;">${escapeHtml(title)}</h2>

          <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi ${escapeHtml(customerName)},</p>

          <p style="font-size:16px;line-height:1.6;margin:0 0 22px;">${escapeHtml(intro)}</p>

          <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin:24px 0;">
            <p style="margin:0 0 8px;"><strong>Service:</strong> ${escapeHtml(serviceName)}</p>
            <p style="margin:0 0 8px;"><strong>Team member:</strong> ${escapeHtml(teamMemberName)}</p>
            <p style="margin:0 0 8px;"><strong>Date:</strong> ${escapeHtml(bookingDate)}</p>
            <p style="margin:0;"><strong>Time:</strong> ${escapeHtml(bookingTime)}</p>
          </div>

          <div style="margin-top:24px;">
            <span style="display:inline-block;background:${resolved.secondaryColour};color:#fff;padding:13px 18px;border-radius:14px;font-weight:bold;">
              ${escapeHtml(buttonText)}
            </span>
          </div>

          <p style="margin:30px 0 0;font-size:14px;line-height:1.6;color:#64748b;">
            ${escapeHtml(resolved.footerText)}
          </p>

          ${
            resolved.showAmbBranding
              ? `<p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">Powered by AMB Booking</p>`
              : ''
          }
        </div>
      </div>
    </div>
  `
}