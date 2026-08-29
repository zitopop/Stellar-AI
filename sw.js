// Stellar AI service worker — network-first, with an explicit update signal.
// Deliberately avoids caching app HTML so each deployment can be fetched fresh.
const SW_VERSION = 'stellar-sw-2026-08-29-1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'STELLAR_SW_UPDATED', version: SW_VERSION });
    }
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request));
});
