// Stellar AI service worker — offline shell, safe static caching, and update signalling.
const SW_VERSION = 'stellar-sw-2026-09-07-settings-desktop-v2';
const SHELL_CACHE = `stellar-shell-${SW_VERSION}`;
const STATIC_CACHE = `stellar-static-${SW_VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = [
  OFFLINE_URL,
  '/manifest.json',
  '/lib/assets/pwa/icon-192.png',
  '/lib/assets/pwa/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(PRECACHE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, STATIC_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('stellar-') && !keep.has(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) client.postMessage({ type: 'STELLAR_SW_UPDATED', version: SW_VERSION });
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        return (await caches.match(OFFLINE_URL)) || new Response('Stellar AI is offline. Please try again when you reconnect.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })());
    return;
  }

  const destination = request.destination;
  if (!['style', 'script', 'image', 'font', 'manifest'].includes(destination)) return;

  // UI code and styles are network-first. A bad or stale interface bundle must not
  // remain pinned after a production fix. Cached copies are offline fallbacks only.
  if (destination === 'script' || destination === 'style') {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return cached || Response.error();
      }
    })());
    return;
  }

  // Images, fonts and the manifest are stable assets, so cache-first is appropriate.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return cached || Response.error();
    }
  })());
});
