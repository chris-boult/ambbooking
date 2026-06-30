import { NextResponse } from 'next/server'
import { notifyBookingEvent } from '@/lib/notifications/bookingNotifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { businessId, bookingId, eventType, sendPush = true } = await req.json()

    if (!businessId || !bookingId || !eventType) {
      return NextResponse.json({ error: 'Missing booking notification payload.' }, { status: 400 })
    }

    const notification = await notifyBookingEvent({
      businessId,
      bookingId,
      eventType,
      sendPush,
    })

    return NextResponse.json({ ok: true, notification })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Could not create booking notification.' },
      { status: 500 }
    )
  }
}
