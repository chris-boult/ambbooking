import { registerEventHandler } from './registry'
import type { EventHandler, PlatformEventType } from './types'

export function subscribe(
  event: PlatformEventType,
  handler: EventHandler
) {
  registerEventHandler(event, handler)
}