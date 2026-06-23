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
    const customerId = String(body.customerId || '')

    if (!businessId || !customerId) {
      return NextResponse.json({ error: 'Business and customer are required.' }, { status: 400 })
    }

    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('customer_memberships')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (membershipsError) return NextResponse.json({ error: membershipsError.message }, { status: 500 })

    const planIds = Array.from(new Set((memberships || []).map((m: any) => m.membership_plan_id).filter(Boolean)))
    const membershipIds = (memberships || []).map((m: any) => m.id)

    const { data: benefits, error: benefitsError } = planIds.length
      ? await supabaseAdmin.from('membership_plan_benefits').select('*').in('membership_plan_id', planIds).order('display_order', { ascending: true })
      : { data: [], error: null }

    if (benefitsError) return NextResponse.json({ error: benefitsError.message }, { status: 500 })

    const { data: usage, error: usageError } = membershipIds.length
      ? await supabaseAdmin.from('membership_usage').select('*').in('customer_membership_id', membershipIds).order('usage_date', { ascending: false })
      : { data: [], error: null }

    if (usageError) return NextResponse.json({ error: usageError.message }, { status: 500 })

    return NextResponse.json({ ok: true, memberships: memberships || [], benefits: benefits || [], usage: usage || [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load membership wallet.' }, { status: 500 })
  }
}
