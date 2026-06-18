import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/adminSupabase'

function cleanReferralCode(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

function makeReferralCode(name: string, email: string) {
  const base = cleanReferralCode(name || email.split('@')[0] || 'PARTNER').slice(0, 8)
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${base}${suffix}`
}

export async function GET() {
  const { data, error } = await adminSupabase
    .from('partner_performance')
    .select('*')
    .order('company_name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ partners: data || [] })
}

export async function POST(request: Request) {
  const body = await request.json()

  if (!body.email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const referralCode = body.referral_code
    ? cleanReferralCode(body.referral_code)
    : makeReferralCode(body.company_name || body.full_name || '', body.email)

  const { data, error } = await adminSupabase
    .from('partners')
    .insert({
      email: String(body.email).trim().toLowerCase(),
      full_name: body.full_name || null,
      company_name: body.company_name || null,
      referral_code: referralCode,
      commission_type: body.commission_type || 'percentage',
      commission_value: Number(body.commission_value || 10),
      fixed_bounty: Number(body.fixed_bounty || 0),
      lifetime_commission: body.lifetime_commission ?? true,
      status: body.status || 'active',
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ partner: data })
}
