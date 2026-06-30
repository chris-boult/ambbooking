import { NextResponse } from 'next/server'
import { sendBusinessPush } from '@/lib/push/sendBusinessPush'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { businessId, title, body, url = '/business/dashboard' } = await req.json()

    if (!businessId || !title || !body) {
      return NextResponse.json({ error: 'Missing push payload.' }, { status: 400 })
    }

    const result = await sendBusinessPush({ businessId, title, body, url })
    return NextResponse.json({ ok: true, ...result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Push send failed.' }, { status: 500 })
  }
}
