// LooksOn service worker.
//  1) Makes the app installable (a fetch handler is required; this one is a
//     no-op pass-through, so there is ZERO caching / zero risk of stale content).
//  2) Displays push notifications delivered via FCM.
// It needs no Firebase config: it reads the raw push payload and shows it, so it
// is completely inert until a device actually subscribes (opt-in + keys present).

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {
  // Pass-through — let the browser handle every request normally.
})

// Show a notification when a push arrives (FCM sends { notification, data }).
self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data ? event.data.json() : {} } catch { payload = {} }
  const n = payload.notification || payload.data || {}
  const title = n.title || 'LooksOn'
  const options = {
    body: n.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { link: (payload.data && payload.data.link) || n.link || '/home' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Focus an existing tab or open the target link when the notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = (event.notification.data && event.notification.data.link) || '/home'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) { w.navigate(link); return w.focus() }
      }
      return self.clients.openWindow(link)
    })
  )
})
