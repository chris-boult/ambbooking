import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

function buildOrigin(request: Request) {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { businessId, customerId, membershipId } = body

    if (!businessId || !customerId || !membershipId) {
      return NextResponse.json(
        { error: 'Missing wallet pass details.' },
        { status: 400 }
      )
    }

    const { data: membership, error: membershipError } = await supabase
      .from('customer_memberships')
      .select('id,business_id,customer_id,membership_name,status')
      .eq('id', membershipId)
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .maybeSingle()

    if (membershipError) throw membershipError

    if (!membership) {
      return NextResponse.json(
        { error: 'Membership not found.' },
        { status: 404 }
      )
    }

    const { data: existingPass, error: existingError } = await supabase
      .from('membership_passes')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .eq('membership_id', membershipId)
      .maybeSingle()

    if (existingError) throw existingError

    let pass = existingPass

    if (!pass) {
      const { data: createdPass, error: createError } = await supabase
        .from('membership_passes')
        .insert({
          business_id: businessId,
          customer_id: customerId,
          membership_id: membershipId,
          pass_token: crypto.randomUUID(),
        })
        .select('*')
        .single()

      if (createError) throw createError
      pass = createdPass
    }

    const origin = buildOrigin(request)

    return NextResponse.json({
      success: true,
      pass,
      passUrl: `${origin}/pass/membership/${pass.pass_token}`,
    })
  } catch (error: any) {
    console.error('Create wallet pass error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not create wallet pass.' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Missing pass token.' },
        { status: 400 }
      )
    }

    const { data: pass, error: passError } = await supabase
      .from('membership_passes')
      .select('*')
      .eq('pass_token', token)
      .maybeSingle()

    if (passError) throw passError

    if (!pass) {
      return NextResponse.json(
        { error: 'Membership pass not found.' },
        { status: 404 }
      )
    }

    const [membershipResult, customerResult, businessResult] = await Promise.all([
      supabase
        .from('customer_memberships')
        .select('id,membership_name,status,billing_interval,monthly_amount,included_sessions,sessions_used,current_period_start,current_period_end,created_at')
        .eq('id', pass.membership_id)
        .maybeSingle(),
      supabase
        .from('customers')
        .select('id,first_name,last_name,email,phone')
        .eq('id', pass.customer_id)
        .maybeSingle(),
      supabase
        .from('businesses')
        .select('id,business_name,logo_url,primary_colour,secondary_colour')
        .eq('id', pass.business_id)
        .maybeSingle(),
    ])

    if (membershipResult.error) throw membershipResult.error
    if (customerResult.error) throw customerResult.error
    if (businessResult.error) throw businessResult.error

    if (!membershipResult.data || !customerResult.data || !businessResult.data) {
      return NextResponse.json(
        { error: 'Pass data incomplete.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      pass,
      membership: membershipResult.data,
      customer: customerResult.data,
      business: businessResult.data,
      qrValue: `membership:${pass.membership_id}`,
    })
  } catch (error: any) {
    console.error('Fetch wallet pass error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not load wallet pass.' },
      { status: 500 }
    )
  }
}
