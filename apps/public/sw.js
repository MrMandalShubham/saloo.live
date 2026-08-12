// Minimal service worker — its only job is to make LooksOn installable as a PWA.
// Deliberately does NOT cache anything: every request goes straight to the network,
// so there is zero risk of serving stale content on this live app.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {
  // No-op fetch handler. Its presence satisfies Chrome's installability criteria;
  // by not calling event.respondWith(), the browser handles the request normally.
})
