// Service Worker pour Gardee v2
// Cache les assets statiques et les réponses API pour offline support

const CACHE_VERSION = 'v1-2026-06-04';
const STATIC_CACHE = `gardee-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `gardee-dynamic-${CACHE_VERSION}`;
const API_CACHE = `gardee-api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/img/logo.png',
  '/img/logo_small.png',
  '/img/tondeuse.png',
  '/favicon.ico',
];

// Installation: cache les assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Graceful degradation si certains assets ne peuvent pas être cachés
      });
    }).then(() => self.skipWaiting())
  );
});

// Activation: nettoie les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              (name.startsWith('gardee-static-') && name !== STATIC_CACHE) ||
              (name.startsWith('gardee-dynamic-') && name !== DYNAMIC_CACHE) ||
              (name.startsWith('gardee-api-') && name !== API_CACHE)
            );
          })
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de fetch:
// - API: Network first, fallback to cache
// - Assets: Cache first, fallback to network
// - Pages: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes externes
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // API: Network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(API_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || new Response('Offline - API not cached', { status: 503 });
          });
        })
    );
  }

  // Assets (images, CSS, JS): Cache first
  if (/\.(png|jpg|jpeg|svg|css|js|woff|woff2)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
    );
  }

  // Pages: Network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match('/'); // Fallback to home
          });
        })
    );
  }
});
