import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/adminSupabase'

export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  const { data: payout, error: readError } = await adminSupabase
    .from('partner_payouts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 404 })
  }

  const { data, error } = await adminSupabase
    .from('partner_payouts')
    .update({ status: 'paid', payout_date: new Date().toISOString() })
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await adminSupabase
    .from('partner_commissions')
    .update({ status: 'paid' })
    .eq('partner_id', payout.partner_id)
    .eq('status', 'pending')

  return NextResponse.json({ payout: data })
}
