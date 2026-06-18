import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Use the client helper in lib/partnerPortal.ts for partner auth state.' })
}
