// Service Worker pour Gardee v2
// Caching minimal + offline fallback

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer requêtes non-GET et externes
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Pages: Network first, fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          return response;
        })
        .catch(() => {
          return caches.match('/offline.html')
            .then((cached) => cached || new Response('Offline', { status: 503 }));
        })
    );
  }
});
