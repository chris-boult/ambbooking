import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/adminSupabase'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()

  if (!body.amount) {
    return NextResponse.json({ error: 'Amount is required.' }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from('partner_commissions')
    .insert({
      partner_id: params.id,
      referral_id: body.referral_id || null,
      business_id: body.business_id || null,
      commission_type: body.commission_type || 'manual',
      commission_month: body.commission_month || new Date().toISOString().slice(0, 10),
      amount: Number(body.amount),
      status: body.status || 'pending',
      notes: body.notes || 'Manual commission created by master admin.',
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ commission: data })
}
