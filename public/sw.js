// Bumper ce nom à chaque deploy majeur pour purger l'ancien cache
const CACHE = 'gardee-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Supprime tous les anciens caches (gardee-v1, etc.)
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Ne pas intercepter les appels API ni les navigations HTML
  // Les HTML ont Cache-Control: no-store dans .htaccess — le navigateur gère seul
  if (url.pathname.startsWith('/api/') || request.mode === 'navigate') return;

  // Cache-first uniquement pour les assets hashés /_astro/ (immutables)
  if (url.pathname.startsWith('/_astro/')) {
    e.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        })
      )
    );
  }
});
