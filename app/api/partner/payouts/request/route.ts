import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ message: 'Payout requests are handled client-side in /partner/payouts for this pack.' })
}
