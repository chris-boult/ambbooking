import { supabase } from '@/lib/supabase'
import type { PlatformEvent } from './types'
import { getEventHandlers } from './registry'

export async function dispatchEvent(event: PlatformEvent) {
  // Persist the event
  const { error } = await supabase
    .from('event_log')
    .insert({
      event_type: event.type,
      business_id: event.businessId,
      user_id: event.userId ?? null,
      customer_id: event.customerId ?? null,
      payload: event.payload,
    })

  if (error) {
    console.error('[EventBus] Failed to persist event', error)
  }

  // Execute subscribers
  const handlers = getEventHandlers(event.type)

  await Promise.all(
    handlers.map(async (handler) => {
      try {
        await handler(event)
      } catch (err) {
        console.error(
          `[EventBus] Subscriber failed for ${event.type}`,
          err
        )
      }
    })
  )
}