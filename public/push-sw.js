self.addEventListener('push', function (event) {
  let data = {}

  try {
    data = event.data ? event.data.json() : {}
  } catch (error) {
    data = {
      title: 'AMB Booking',
      body: event.data ? event.data.text() : 'You have a new notification.',
    }
  }

  const title = data.title || 'AMB Booking'
  const options = {
    body: data.body || 'You have a new notification.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: {
      url: data.url || '/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  const url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/'

  event.waitUntil(clients.openWindow(url))
})