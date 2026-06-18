import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ message: 'Partner signup is handled client-side in /partner/signup for this pack.' })
}
