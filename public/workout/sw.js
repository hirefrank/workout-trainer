/**
 * Service Worker for Workout Trainer PWA
 * Handles caching and push notifications
 */

const CACHE_NAME = 'workout-trainer-v2'; // Bump version to force cache invalidation
const ASSETS_TO_CACHE = [
  '/workout/',
  '/workout/app.js',
  '/workout/styles.css',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Force new SW to activate immediately
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
  self.clients.claim(); // Take control of all pages immediately
});

// Fetch event - network-first for HTML, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle HTTP/HTTPS requests (ignore chrome-extension://, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Network-first strategy for HTML pages (always get fresh content)
  if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Update cache with fresh content
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request);
        })
    );
  } else {
    // Cache-first for CSS, JS, images (faster loading)
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((response) => {
          // Cache new assets
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
  }
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
