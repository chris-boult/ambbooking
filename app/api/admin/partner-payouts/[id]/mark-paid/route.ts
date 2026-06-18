import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: 'Missing Supabase environment variables.' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { data, error } = await supabase
    .from('partner_payouts')
    .update({
      status: 'paid',
      payout_date: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ payout: data })
}