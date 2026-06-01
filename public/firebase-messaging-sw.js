// Firebase Messaging Service Worker
// Phase 3: handles FCM background push + notification click navigation

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Background push handler
// Always calls showNotification() explicitly — required for iOS PWA (16.4+)
// Uses tag to deduplicate if browser also auto-displays notification messages
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const title = payload.notification?.title ?? payload.data?.title ?? '하긴해야할 시간입니다!';
    const body  = payload.notification?.body  ?? payload.data?.body  ?? '';
    const tag   = payload.data?.questId ?? payload.data?.type ?? 'haginhal';

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon:     '/icon-192.png',
        badge:    '/icon-192.png',
        tag,
        data:     payload.data ?? {},
        vibrate:  [200, 100, 200],
        silent:   false,
      })
    );
  } catch {
    // ignore malformed payload
  }
});

// Notification click: focus existing tab or open new one
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find(
          (c) => c.url.startsWith(self.location.origin) && 'focus' in c
        );
        if (existing) return existing.focus();
        return self.clients.openWindow('/');
      })
  );
});
