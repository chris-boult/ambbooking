import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  request: Request,
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

  const body = await request.json()

  const { data, error } = await createClient(
    supabaseUrl,
    supabaseServiceRoleKey
  )
    .from('partners')
    .update({
      status: body.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ partner: data })
}