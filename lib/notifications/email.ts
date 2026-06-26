export interface EmailNotificationOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmailNotification(
  options: EmailNotificationOptions
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY missing.')
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:
        process.env.RESEND_FROM_EMAIL ??
        'AMB Booking <noreply@ambbooking.co.uk>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[Email]', text)
  }
}