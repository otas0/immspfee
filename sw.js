/**
 * Network-first HTML, long-lived cache for fingerprinted js/css.
 * Unhashed catalog slices stay network-first so a subject update is not stuck.
 */
const CACHE = 'immspfee-hashed-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', () => {});

function isNavigation(request, url) {
  return request.mode === 'navigate'
    || url.pathname === '/'
    || url.pathname.endsWith('/index.html');
}

function isHashedAsset(url) {
  if (!url.searchParams.get('v')) return false;
  return url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
}

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    return fresh;
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
  if (isHashedAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});
