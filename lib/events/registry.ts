import type { EventHandler, PlatformEventType } from './types'

const registry = new Map<PlatformEventType, EventHandler[]>()

export function registerEventHandler(
  type: PlatformEventType,
  handler: EventHandler
) {
  const handlers = registry.get(type) ?? []
  handlers.push(handler)
  registry.set(type, handlers)
}

export function getEventHandlers(type: PlatformEventType) {
  return registry.get(type) ?? []
}