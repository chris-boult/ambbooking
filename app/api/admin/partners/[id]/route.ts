import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/adminSupabase'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const [partner, referrals, commissions, payouts] = await Promise.all([
    adminSupabase.from('partners').select('*').eq('id', params.id).single(),
    adminSupabase.from('partner_referrals').select('*, businesses(business_name,email,status,monthly_amount,plan)').eq('partner_id', params.id).order('created_at', { ascending: false }),
    adminSupabase.from('partner_commissions').select('*').eq('partner_id', params.id).order('created_at', { ascending: false }),
    adminSupabase.from('partner_payouts').select('*').eq('partner_id', params.id).order('created_at', { ascending: false }),
  ])

  if (partner.error) {
    return NextResponse.json({ error: partner.error.message }, { status: 404 })
  }

  return NextResponse.json({
    partner: partner.data,
    referrals: referrals.data || [],
    commissions: commissions.data || [],
    payouts: payouts.data || [],
  })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()

  const { data, error } = await adminSupabase
    .from('partners')
    .update({
      email: body.email ? String(body.email).trim().toLowerCase() : undefined,
      full_name: body.full_name,
      company_name: body.company_name,
      referral_code: body.referral_code ? String(body.referral_code).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : undefined,
      commission_type: body.commission_type,
      commission_value: body.commission_value === undefined ? undefined : Number(body.commission_value),
      fixed_bounty: body.fixed_bounty === undefined ? undefined : Number(body.fixed_bounty),
      lifetime_commission: body.lifetime_commission,
      status: body.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ partner: data })
}
