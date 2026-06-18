import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/adminSupabase'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}))

  const { data: commissions, error: commissionError } = await adminSupabase
    .from('partner_commissions')
    .select('amount')
    .eq('partner_id', params.id)
    .eq('status', 'pending')

  if (commissionError) {
    return NextResponse.json({ error: commissionError.message }, { status: 500 })
  }

  const pendingAmount = (commissions || []).reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const payoutAmount = Number(body.payout_amount || pendingAmount)

  if (payoutAmount <= 0) {
    return NextResponse.json({ error: 'No pending payout amount available.' }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from('partner_payouts')
    .insert({
      partner_id: params.id,
      payout_amount: payoutAmount,
      status: 'pending',
      notes: body.notes || 'Generated from Admin Partner Centre.',
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ payout: data })
}
