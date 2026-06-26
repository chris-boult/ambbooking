import { dispatchEvent } from './dispatcher'
import type { PlatformEvent } from './types'

export async function publishEvent(event: PlatformEvent) {
  await dispatchEvent(event)
}