export async function sendPushNotification({
  businessId,
  title,
  message,
  url,
}: {
  businessId: string
  title: string
  message: string
  url?: string
}) {
  try {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId,
        title,
        message,
        url,
      }),
    })
  } catch (err) {
    console.error('[Push]', err)
  }
}