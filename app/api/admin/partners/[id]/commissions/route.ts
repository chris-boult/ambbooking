import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(
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
    .from('partner_commissions')
    .insert({
      partner_id: id,
      business_id: body.business_id || null,
      referral_id: body.referral_id || null,
      commission_type: body.commission_type || 'manual',
      commission_month: body.commission_month || null,
      amount: Number(body.amount || 0),
      status: body.status || 'pending',
      notes: body.notes || 'Manual commission created by admin.',
    })
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ commission: data })
}