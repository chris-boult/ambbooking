import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { code, booking_id, business_id, amount_due } = body

    if (!code || !business_id || !amount_due) {
      return NextResponse.json(
        { error: 'Missing voucher redemption details' },
        { status: 400 }
      )
    }

    const cleanCode = String(code).trim().toUpperCase()
    const bookingAmount = Number(amount_due)

    if (!bookingAmount || bookingAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid booking amount' },
        { status: 400 }
      )
    }

   const { data: voucher, error: voucherError } = await supabase
  .from('gift_vouchers')
  .select('*')
  .eq('code', cleanCode)
  .maybeSingle()

    if (voucherError) {
      return NextResponse.json(
        { error: voucherError.message },
        { status: 500 }
      )
    }

    if (!voucher) {
      return NextResponse.json(
        { error: 'Voucher not found' },
        { status: 404 }
      )
    }

    if (voucher.status !== 'active') {
      return NextResponse.json(
        { error: 'Voucher is not active' },
        { status: 400 }
      )
    }

    if (voucher.expiry_date) {
      const today = new Date().toISOString().split('T')[0]

      if (voucher.expiry_date < today) {
        await supabase
          .from('gift_vouchers')
          .update({ status: 'expired' })
          .eq('id', voucher.id)

        return NextResponse.json(
          { error: 'Voucher has expired' },
          { status: 400 }
        )
      }
    }

    const remainingAmount = Number(voucher.remaining_amount || 0)

    if (remainingAmount <= 0) {
      await supabase
        .from('gift_vouchers')
        .update({ status: 'redeemed' })
        .eq('id', voucher.id)

      return NextResponse.json(
        { error: 'Voucher has no remaining balance' },
        { status: 400 }
      )
    }

    const amountUsed = Math.min(remainingAmount, bookingAmount)
    const newRemainingAmount = remainingAmount - amountUsed
    const newStatus = newRemainingAmount <= 0 ? 'redeemed' : 'active'

    const { error: updateVoucherError } = await supabase
      .from('gift_vouchers')
      .update({
        remaining_amount: newRemainingAmount,
        status: newStatus,
        redeemed_at: newStatus === 'redeemed' ? new Date().toISOString() : null,
        redeemed_booking_id: booking_id || null,
      })
      .eq('id', voucher.id)

    if (updateVoucherError) {
      return NextResponse.json(
        { error: updateVoucherError.message },
        { status: 500 }
      )
    }

    if (booking_id) {
      const { error: updateBookingError } = await supabase
        .from('bookings')
        .update({
          voucher_id: voucher.id,
          voucher_amount_used: amountUsed,
        })
        .eq('id', booking_id)

      if (updateBookingError) {
        return NextResponse.json(
          { error: updateBookingError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      voucher_id: voucher.id,
      code: voucher.code,
      original_amount: Number(voucher.amount),
      previous_remaining_amount: remainingAmount,
      amount_used: amountUsed,
      new_remaining_amount: newRemainingAmount,
      status: newStatus,
      amount_due_after_voucher: Math.max(bookingAmount - amountUsed, 0),
    })
  } catch (error: any) {
    console.error('Voucher redemption error:', error)

    return NextResponse.json(
      { error: error.message || 'Voucher redemption failed' },
      { status: 500 }
    )
  }
}