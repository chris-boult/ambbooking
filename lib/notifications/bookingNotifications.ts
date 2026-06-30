import { createClient } from '@supabase/supabase-js'
import { notify } from './notify'
import type { NotificationPriority, NotificationType } from './types'

type BookingEvent =
  | 'created'
  | 'cancelled'
  | 'rescheduled'
  | 'completed'
  | 'no_show'
  | 'updated'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables.')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] || null
  return value
}

function formatCustomerName(customer: any) {
  return `${customer?.first_name || 'Customer'} ${customer?.last_name || ''}`.trim()
}

function notificationTypeForEvent(eventType: BookingEvent): NotificationType {
  if (eventType === 'created') return 'booking_created'
  if (eventType === 'cancelled') return 'booking_cancelled'
  if (eventType === 'rescheduled') return 'booking_rescheduled'
  if (eventType === 'completed') return 'booking_completed'
  if (eventType === 'no_show') return 'booking_no_show'
  return 'general'
}

function priorityForEvent(eventType: BookingEvent): NotificationPriority {
  if (eventType === 'created') return 'success'
  if (eventType === 'cancelled') return 'warning'
  if (eventType === 'no_show') return 'warning'
  if (eventType === 'completed') return 'success'
  return 'info'
}

function iconForEvent(eventType: BookingEvent) {
  if (eventType === 'created') return '📅'
  if (eventType === 'cancelled') return '❌'
  if (eventType === 'rescheduled') return '🔄'
  if (eventType === 'completed') return '✅'
  if (eventType === 'no_show') return '⚠️'
  return '🔔'
}

function copyForBookingEvent(eventType: BookingEvent, booking: any) {
  const customer = firstRow(booking.customers)
  const service = firstRow(booking.services)
  const team = firstRow(booking.team_members)

  const customerName = formatCustomerName(customer)
  const serviceName = service?.name || 'appointment'
  const staffName = team?.full_name || 'your team'
  const time = booking.booking_time?.slice(0, 5) || ''
  const date = booking.booking_date || ''

  if (eventType === 'created') {
    return {
      title: 'New booking received',
      message: `${customerName} booked ${serviceName} with ${staffName} on ${date} at ${time}.`,
    }
  }

  if (eventType === 'cancelled') {
    return {
      title: 'Booking cancelled',
      message: `${customerName} cancelled ${serviceName} on ${date} at ${time}.`,
    }
  }

  if (eventType === 'rescheduled') {
    return {
      title: 'Booking rescheduled',
      message: `${customerName}'s ${serviceName} is now on ${date} at ${time}.`,
    }
  }

  if (eventType === 'completed') {
    return {
      title: 'Booking completed',
      message: `${customerName}'s ${serviceName} has been marked as completed.`,
    }
  }

  if (eventType === 'no_show') {
    return {
      title: 'No-show recorded',
      message: `${customerName} was marked as a no-show for ${serviceName}.`,
    }
  }

  return {
    title: 'Booking updated',
    message: `${customerName}'s booking has been updated.`,
  }
}

export async function notifyBookingEvent({
  businessId,
  bookingId,
  eventType,
  sendPush = true,
}: {
  businessId: string
  bookingId: string
  eventType: BookingEvent
  sendPush?: boolean
}) {
  const supabaseAdmin = getSupabaseAdmin()

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      id,
      business_id,
      booking_date,
      booking_time,
      status,
      total_price,
      customer_id,
      service_id,
      team_member_id,
      customers(first_name,last_name,email),
      services(name,price,duration_minutes),
      team_members(full_name)
    `)
    .eq('id', bookingId)
    .eq('business_id', businessId)
    .single()

  if (error || !booking) {
    throw new Error(error?.message || 'Booking not found.')
  }

  const copy = copyForBookingEvent(eventType, booking)

  return notify({
    businessId,
    type: notificationTypeForEvent(eventType),
    priority: priorityForEvent(eventType),
    title: copy.title,
    message: copy.message,
    link: '/business/dashboard/bookings',
    icon: iconForEvent(eventType),
    metadata: {
      booking_id: bookingId,
      customer_id: booking.customer_id,
      service_id: booking.service_id,
      team_member_id: booking.team_member_id,
      event_type: eventType,
    },
    sendPush,
  })
}
