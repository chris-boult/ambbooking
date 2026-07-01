import { NextRequest, NextResponse } from 'next/server'
import { publishEvent } from '@/lib/events'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    await publishEvent({
      id: crypto.randomUUID(),
      type: body.type,
      businessId: body.businessId,
      userId: body.userId,
      customerId: body.customerId,
      createdAt: new Date().toISOString(),
      payload: body.payload || {},
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to publish support event' },
      { status: 500 }
    )
  }
}