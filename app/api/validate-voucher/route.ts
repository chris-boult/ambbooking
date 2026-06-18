import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function POST(req: Request) {
  try {
    const { code, businessId, bookingTotal } = await req.json()

    if (!code || !businessId) {
      return NextResponse.json(
        { valid: false, error: 'Voucher code and business are required.' },
        { status: 400 }
      )
    }

    const cleanCode = String(code).trim().toUpperCase()

    const { data: voucher, error } = await supabase
      .from('gift_vouchers')
      .select('*')
      .eq('business_id', businessId)
      .eq('code', cleanCode)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { valid: false, error: error.message },
        { status: 500 }
      )
    }

    if (!voucher) {
      return NextResponse.json({
        valid: false,
        error: 'Voucher not found.',
      })
    }

    if (voucher.status !== 'active') {
      return NextResponse.json({
        valid: false,
        error: 'This voucher is no longer active.',
      })
    }

    if (voucher.expiry_date) {
      const today = new Date()
      const expiry = new Date(voucher.expiry_date)

      today.setHours(0, 0, 0, 0)
      expiry.setHours(0, 0, 0, 0)

      if (expiry < today) {
        return NextResponse.json({
          valid: false,
          error: 'This voucher has expired.',
        })
      }
    }

    const remainingAmount = Number(voucher.remaining_amount || 0)

    if (remainingAmount <= 0) {
      return NextResponse.json({
        valid: false,
        error: 'This voucher has no remaining balance.',
      })
    }

    const total = Number(bookingTotal || 0)
    const discountAmount = total > 0 ? Math.min(remainingAmount, total) : remainingAmount

    return NextResponse.json({
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        remainingAmount,
        discountAmount,
        status: voucher.status,
        expiryDate: voucher.expiry_date,
      },
    })
  } catch (error: any) {
    console.error('Validate voucher error:', error)

    return NextResponse.json(
      {
        valid: false,
        error: error.message || 'Unable to validate voucher.',
      },
      { status: 500 }
    )
  }
}