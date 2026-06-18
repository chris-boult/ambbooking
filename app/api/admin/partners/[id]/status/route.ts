import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/adminSupabase'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const status = body.status === 'suspended' ? 'suspended' : 'active'

  const { data, error } = await adminSupabase
    .from('partners')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ partner: data })
}
