/*
 * Typescribe service worker.
 *
 * Strategy (deliberately conservative — never break the Next.js app router):
 *  - GET requests only; same-origin only; /api/ always passes through untouched.
 *  - Immutable build assets (/_next/static/, /icons/) → cache-first.
 *    These are content-hashed, so stale entries can never diverge from HTML.
 *  - Document navigations → network-first with cache + offline fallback,
 *    so flaky connections still get a branded screen instead of a browser error.
 *  - Everything else (RSC flights, prefetches, fonts, images) passes through.
 *
 * Bump VERSION to invalidate all caches after a deployment.
 */
const VERSION = 'v1';
const STATIC_CACHE = `ts-static-${VERSION}`;
const PAGE_CACHE = `ts-pages-${VERSION}`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // CDN / TMDB images / forms
  if (url.pathname.startsWith('/api/')) return; // never cache API responses

  // Immutable, content-hashed build assets → cache-first.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Full page navigations → network-first, fall back to cache, then offline page.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstPage(req));
    return;
  }

  // Everything else (RSC flights, prefetch chunks, images): pass through.
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(req, res.clone());
  }
  return res;
}

async function networkFirstPage(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    throw err;
  }
}
