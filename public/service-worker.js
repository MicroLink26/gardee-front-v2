// Service Worker minimal pour Gardee v2
// Caching basique avec fallback réseau

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Passthrough - pas de caching avancé pour éviter les problèmes
self.addEventListener('fetch', (event) => {
  // Laisser passer toutes les requêtes au réseau
  // (pas d'interception complexe)
});
