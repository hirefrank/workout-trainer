/**
 * Service Worker for Workout Trainer PWA
 * Handles caching and push notifications
 */

const CACHE_NAME = 'workout-trainer-v1';
const ASSETS_TO_CACHE = [
  '/workout/',
  '/workout/app.js',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Workout Reminder';
  const options = {
    body: data.body || 'Time to train!',
    icon: '/workout/icon-192.png',
    badge: '/workout/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'workout-notification',
    requireInteraction: false,
    data: {
      url: data.url || '/workout/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/workout/')
  );
});
