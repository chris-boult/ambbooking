import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Partner assets are loaded client-side from partner_assets.' })
}
