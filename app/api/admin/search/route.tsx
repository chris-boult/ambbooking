import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json({
        businesses: [],
        customers: [],
        bookings: [],
        vouchers: [],
        waitingList: [],
        tickets: [],
      })
    }

    const [
      businessesRes,
      customersRes,
      bookingsRes,
      vouchersRes,
      waitingListRes,
      ticketsRes,
    ] = await Promise.all([
      supabase
        .from('businesses')
        .select('id,business_name,email,owner_first_name,owner_last_name,slug')
        .or(
          `business_name.ilike.%${q}%,email.ilike.%${q}%,owner_first_name.ilike.%${q}%,owner_last_name.ilike.%${q}%,slug.ilike.%${q}%`
        )
        .limit(20),

      supabase
        .from('customers')
        .select('id,first_name,last_name,email,phone,business_id')
        .or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`
        )
        .limit(20),

      supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          booking_time,
          status,
          business_id,
          customer_id
        `)
        .limit(20),

      supabase
        .from('gift_vouchers')
        .select(`
          id,
          code,
          purchaser_name,
          purchaser_email,
          recipient_name,
          recipient_email,
          amount,
          status
        `)
        .or(
          `code.ilike.%${q}%,purchaser_name.ilike.%${q}%,purchaser_email.ilike.%${q}%,recipient_name.ilike.%${q}%,recipient_email.ilike.%${q}%`
        )
        .limit(20),

      supabase
        .from('waiting_list')
        .select(`
          id,
          business_id,
          preferred_date,
          preferred_time_range,
          status
        `)
        .limit(20),

      supabase
        .from('support_tickets')
        .select(`
          id,
          subject,
          message,
          status,
          priority,
          business_id
        `)
        .or(
          `subject.ilike.%${q}%,message.ilike.%${q}%`
        )
        .limit(20),
    ])

    const bookings =
      bookingsRes.data?.filter((booking) =>
        JSON.stringify(booking)
          .toLowerCase()
          .includes(q.toLowerCase())
      ) || []

    const waitingList =
      waitingListRes.data?.filter((item) =>
        JSON.stringify(item)
          .toLowerCase()
          .includes(q.toLowerCase())
      ) || []

    return NextResponse.json({
      businesses: businessesRes.data || [],
      customers: customersRes.data || [],
      bookings,
      vouchers: vouchersRes.data || [],
      waitingList,
      tickets: ticketsRes.data || [],
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error: 'Search failed',
      },
      {
        status: 500,
      }
    )
  }
}