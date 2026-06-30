import { NextResponse } from 'next/server'
import { createNotification } from '@/lib/notifications/createNotification'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.businessId || !body.type || !body.title || !body.message) {
      return NextResponse.json({ error: 'Missing notification payload.' }, { status: 400 })
    }

    const notification = await createNotification({
      businessId: body.businessId,
      userId: body.userId || null,
      type: body.type,
      priority: body.priority || 'info',
      title: body.title,
      message: body.message,
      link: body.link || null,
      icon: body.icon || null,
      colour: body.colour || null,
      metadata: body.metadata || {},
      sendPush: body.sendPush !== false,
    })

    return NextResponse.json({ ok: true, notification })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Could not create notification.' },
      { status: 500 }
    )
  }
}
