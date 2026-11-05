/**
 * Network-first HTML; cache-first for fingerprinted js/css/domain JSON.
 */
const CACHE = 'immspfee-hashed-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isNavigation(request, url) {
  return request.mode === 'navigate'
    || url.pathname === '/'
    || url.pathname.endsWith('/index.html');
}

function isFingerprintedAsset(url) {
  if (!url.searchParams.get('v')) return false;
  const p = url.pathname;
  return p.endsWith('.js')
    || p.endsWith('.css')
    || p.endsWith('/domain-index.json')
    || /\/data\/domains\/.+\.json$/.test(p);
}

async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error('offline');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) {
    const cache = await caches.open(CACHE);
    cache.put(request, fresh.clone());
  }
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isNavigation(request, url) || url.pathname.endsWith('.html') || url.pathname.endsWith('/asset-stamp.json')) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (isFingerprintedAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});
