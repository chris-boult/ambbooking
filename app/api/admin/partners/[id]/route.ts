import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: 'Missing Supabase environment variables.' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const [
    partnerResult,
    referralsResult,
    commissionsResult,
    payoutsResult,
  ] = await Promise.all([
    supabase.from('partners').select('*').eq('id', id).maybeSingle(),
    supabase.from('partner_referrals').select('*').eq('partner_id', id),
    supabase.from('partner_commissions').select('*').eq('partner_id', id),
    supabase.from('partner_payouts').select('*').eq('partner_id', id),
  ])

  if (partnerResult.error) {
    return NextResponse.json({ error: partnerResult.error.message }, { status: 500 })
  }

  return NextResponse.json({
    partner: partnerResult.data,
    referrals: referralsResult.data || [],
    commissions: commissionsResult.data || [],
    payouts: payoutsResult.data || [],
  })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: 'Missing Supabase environment variables.' },
      { status: 500 }
    )
  }

  const body = await request.json()

  const { data, error } = await createClient(
    supabaseUrl,
    supabaseServiceRoleKey
  )
    .from('partners')
    .update({
      email: body.email,
      full_name: body.full_name,
      company_name: body.company_name,
      referral_code: body.referral_code,
      commission_type: body.commission_type,
      commission_value: Number(body.commission_value || 0),
      fixed_bounty: Number(body.fixed_bounty || 0),
      lifetime_commission: Boolean(body.lifetime_commission),
      status: body.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ partner: data })
}