// Firebase Messaging Service Worker
// Used for FCM token registration and background push (Phase 3).
// Phase 2 uses local setTimeout notifications from the main app.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Background push handler — used when server sends FCM push in Phase 3
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.notification?.title ?? '하긴해야할 시간입니다!';
    const options = {
      body: data.notification?.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.data?.questId,
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    // ignore malformed push data
  }
});
