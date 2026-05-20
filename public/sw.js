const CACHE = 'gardee-v1';

const PRECACHE = [
  '/',
  '/classement/',
  '/carte/',
  '/postuler/',
  '/contact/',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Ne pas intercepter les appels API
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    // Network-first pour les pages HTML → toujours du contenu frais
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
  } else if (url.pathname.startsWith('/_astro/')) {
    // Cache-first pour les assets hashés (immutables)
    e.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          caches.open(CACHE).then((c) => c.put(request, res.clone()));
          return res;
        })
      )
    );
  }
});
