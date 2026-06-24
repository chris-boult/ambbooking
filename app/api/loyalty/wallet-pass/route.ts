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
    const { businessId, customerId, loyaltyId } = body

    if (!businessId || !customerId || !loyaltyId) {
      return NextResponse.json({ error: 'Missing loyalty wallet pass details.' }, { status: 400 })
    }

    const { data: loyalty, error: loyaltyError } = await supabase
      .from('customer_loyalty')
      .select('id,business_id,customer_id,reward_label,status')
      .eq('id', loyaltyId)
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .maybeSingle()

    if (loyaltyError) throw loyaltyError
    if (!loyalty) return NextResponse.json({ error: 'Loyalty wallet not found.' }, { status: 404 })

    const { data: existingPass, error: existingError } = await supabase
      .from('loyalty_passes')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .eq('loyalty_id', loyaltyId)
      .maybeSingle()

    if (existingError) throw existingError

    let pass = existingPass

    if (!pass) {
      const { data: createdPass, error: createError } = await supabase
        .from('loyalty_passes')
        .insert({
          business_id: businessId,
          customer_id: customerId,
          loyalty_id: loyaltyId,
          pass_token: crypto.randomUUID(),
        })
        .select('*')
        .single()

      if (createError) throw createError
      pass = createdPass
    }

    return NextResponse.json({
      success: true,
      pass,
      passUrl: `${buildOrigin(request)}/pass/loyalty/${pass.pass_token}`,
    })
  } catch (error: any) {
    console.error('Create loyalty wallet pass error:', error)
    return NextResponse.json({ error: error?.message || 'Could not create loyalty wallet pass.' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Missing pass token.' }, { status: 400 })
    }

    const { data: pass, error: passError } = await supabase
      .from('loyalty_passes')
      .select('*')
      .eq('pass_token', token)
      .maybeSingle()

    if (passError) throw passError
    if (!pass) return NextResponse.json({ error: 'Loyalty pass not found.' }, { status: 404 })

    const [loyaltyResult, customerResult, businessResult] = await Promise.all([
      supabase.from('customer_loyalty').select('id,reward_label,status,visits_required,visits_completed,created_at').eq('id', pass.loyalty_id).maybeSingle(),
      supabase.from('customers').select('id,first_name,last_name,email,phone').eq('id', pass.customer_id).maybeSingle(),
      supabase.from('businesses').select('id,business_name,logo_url,primary_colour,secondary_colour').eq('id', pass.business_id).maybeSingle(),
    ])

    if (loyaltyResult.error) throw loyaltyResult.error
    if (customerResult.error) throw customerResult.error
    if (businessResult.error) throw businessResult.error

    if (!loyaltyResult.data || !customerResult.data || !businessResult.data) {
      return NextResponse.json({ error: 'Pass data incomplete.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      pass,
      loyalty: loyaltyResult.data,
      customer: customerResult.data,
      business: businessResult.data,
      qrValue: `loyalty:${pass.loyalty_id}`,
    })
  } catch (error: any) {
    console.error('Fetch loyalty wallet pass error:', error)
    return NextResponse.json({ error: error?.message || 'Could not load loyalty wallet pass.' }, { status: 500 })
  }
}
