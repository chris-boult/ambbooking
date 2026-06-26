import { getEventHandlers } from './registry'
import type { PlatformEvent } from './types'

export async function publishEvent(event: PlatformEvent) {
  const handlers = getEventHandlers(event.type)

  await Promise.all(
    handlers.map(async (handler) => {
      try {
        await handler(event)
      } catch (err) {
        console.error(
          `[EventBus] Handler failed for ${event.type}`,
          err
        )
      }
    })
  )
}