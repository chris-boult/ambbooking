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
    const { businessId, customerId, voucherId } = body

    if (!businessId || !voucherId) {
      return NextResponse.json(
        { error: 'Missing voucher wallet pass details.' },
        { status: 400 }
      )
    }

    const { data: voucher, error: voucherError } = await supabase
      .from('gift_vouchers')
      .select('id,business_id,code,amount,remaining_amount,recipient_email,purchaser_email,status')
      .eq('id', voucherId)
      .eq('business_id', businessId)
      .maybeSingle()

    if (voucherError) throw voucherError

    if (!voucher) {
      return NextResponse.json(
        { error: 'Voucher not found.' },
        { status: 404 }
      )
    }

    const { data: existingPass, error: existingError } = await supabase
      .from('voucher_passes')
      .select('*')
      .eq('business_id', businessId)
      .eq('voucher_id', voucherId)
      .maybeSingle()

    if (existingError) throw existingError

    let pass = existingPass

    if (!pass) {
      const { data: createdPass, error: createError } = await supabase
        .from('voucher_passes')
        .insert({
          business_id: businessId,
          customer_id: customerId || null,
          voucher_id: voucherId,
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
      passUrl: `${buildOrigin(request)}/pass/voucher/${pass.pass_token}`,
    })
  } catch (error: any) {
    console.error('Create voucher wallet pass error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not create voucher wallet pass.' },
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
      .from('voucher_passes')
      .select('*')
      .eq('pass_token', token)
      .maybeSingle()

    if (passError) throw passError

    if (!pass) {
      return NextResponse.json(
        { error: 'Voucher pass not found.' },
        { status: 404 }
      )
    }

    const [voucherResult, customerResult, businessResult] = await Promise.all([
      supabase
        .from('gift_vouchers')
        .select('id,business_id,code,amount,remaining_amount,recipient_name,recipient_email,purchaser_name,purchaser_email,expiry_date,status,redeemed_at,created_at')
        .eq('id', pass.voucher_id)
        .maybeSingle(),
      pass.customer_id
        ? supabase
            .from('customers')
            .select('id,first_name,last_name,email,phone')
            .eq('id', pass.customer_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from('businesses')
        .select('id,business_name,logo_url,primary_colour,secondary_colour')
        .eq('id', pass.business_id)
        .maybeSingle(),
    ])

    if (voucherResult.error) throw voucherResult.error
    if (customerResult.error) throw customerResult.error
    if (businessResult.error) throw businessResult.error

    if (!voucherResult.data || !businessResult.data) {
      return NextResponse.json(
        { error: 'Pass data incomplete.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      pass,
      voucher: voucherResult.data,
      customer: customerResult.data,
      business: businessResult.data,
      qrValue: `voucher:${voucherResult.data.code || pass.voucher_id}`,
    })
  } catch (error: any) {
    console.error('Fetch voucher wallet pass error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not load voucher wallet pass.' },
      { status: 500 }
    )
  }
}
