import type { CreateNotificationInput } from './types'

export async function createNotificationClient(input: CreateNotificationInput) {
  const response = await fetch('/api/notifications/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Could not create notification.')
  }

  return data.notification
}
