import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: Request) {
  console.log('WAITING LIST API HIT')

  try {
    const body = await req.json()

    const {
      business_id,
      service_id,
      team_member_id,
      booking_date,
      booking_time,
    } = body

    if (!business_id || !service_id || !booking_date || !booking_time) {
      return NextResponse.json(
        { error: 'Missing required waiting list details' },
        { status: 400 }
      )
    }

    const batchSize = 5
    const expiryMinutes = 30
    const businessName = 'your booking provider'

    let query = supabase
      .from('waiting_list')
      .select(`
        id,
        business_id,
        customer_id,
        service_id,
        team_member_id,
        preferred_date,
        preferred_time_range,
        status,
        notification_batch,
        customers (
          first_name,
          last_name,
          email
        ),
        services (
          name
        ),
        team_members (
          full_name
        )
      `)
      .eq('business_id', business_id)
      .eq('service_id', service_id)
      .eq('preferred_date', booking_date)
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
      .limit(batchSize)

    if (team_member_id) {
      query = query.or(`team_member_id.eq.${team_member_id},team_member_id.is.null`)
    }

    const { data: waitingList, error: fetchError } = await query

    if (fetchError) {
      console.error(fetchError)

      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      )
    }

    if (!waitingList || waitingList.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No matching waiting list customers found',
        notified: 0,
      })
    }

    const expiresAt = new Date(
      Date.now() + expiryMinutes * 60 * 1000
    ).toISOString()

    let notified = 0

    for (const entry of waitingList as any[]) {
      const customer = Array.isArray(entry.customers)
        ? entry.customers[0]
        : entry.customers

      const service = Array.isArray(entry.services)
        ? entry.services[0]
        : entry.services

      const teamMember = Array.isArray(entry.team_members)
        ? entry.team_members[0]
        : entry.team_members

      if (!customer?.email) continue

      await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          'AMB Booking <onboarding@resend.dev>',
        to: customer.email,
        subject: `Appointment now available at ${businessName}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
            <h2>Good news, ${customer.first_name || 'there'}.</h2>

            <p>An appointment has just become available.</p>

            <p>
              <strong>Service:</strong> ${service?.name || 'Selected service'}<br />
              ${
                teamMember?.full_name
                  ? `<strong>Team member:</strong> ${teamMember.full_name}<br />`
                  : ''
              }
              <strong>Date:</strong> ${booking_date}<br />
              <strong>Time:</strong> ${booking_time?.slice(0, 5)}
            </p>

            <p>This slot has been offered to a small group of customers and will be held for around ${expiryMinutes} minutes.</p>

            <p>Please visit the booking page to secure it before someone else does.</p>

            <p>Thanks,<br />${businessName}</p>
          </div>
        `,
      })

      await supabase
        .from('waiting_list')
        .update({
          status: 'notified',
          notified_at: new Date().toISOString(),
          expires_at: expiresAt,
          notification_batch: (entry.notification_batch || 0) + 1,
        })
        .eq('id', entry.id)

      notified++
    }

    return NextResponse.json({
      success: true,
      notified,
      expires_at: expiresAt,
    })
  } catch (error: any) {
    console.error(error)

    return NextResponse.json(
      { error: error.message || 'Waiting list processing failed' },
      { status: 500 }
    )
  }
}