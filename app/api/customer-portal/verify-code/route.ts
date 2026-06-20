import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const businessId = String(body.businessId || '')
    const email = String(body.email || '').trim().toLowerCase()
    const code = String(body.code || '').trim()

    if (!businessId || !email || !code) {
      return NextResponse.json({ error: 'Business, email and code are required.' }, { status: 400 })
    }

    const { data: accessCode, error: accessError } = await supabaseAdmin
      .from('customer_portal_access_codes')
      .select('*')
      .eq('business_id', businessId)
      .ilike('email', email)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (accessError || !accessCode) {
      return NextResponse.json({ error: 'Invalid or expired access code.' }, { status: 401 })
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', accessCode.customer_id)
      .eq('business_id', businessId)
      .maybeSingle()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer record not found.' }, { status: 404 })
    }

    await supabaseAdmin
      .from('customer_portal_access_codes')
      .update({ used: true })
      .eq('id', accessCode.id)

    return NextResponse.json({ ok: true, customer })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not verify access code.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
