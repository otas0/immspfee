/**
 * Network-first HTML. Long cache only for fingerprinted js/css.
 * Subject JSON stays on the network so a catalog edit is not stuck.
 */
const CACHE = 'immspfee-hashed-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

function isFingerprintedAsset(url) {
  if (!url.searchParams.get('v')) return false;
  const p = url.pathname;
  return p.endsWith('.js') || p.endsWith('.css');
}

async function liveHashes() {
  const live = new Set();
  try {
    const res = await fetch(new URL('asset-stamp.json', self.registration.scope), { cache: 'no-store' });
    if (!res.ok) return live;
    const stamp = await res.json();
    for (const key of ['js', 'css', 'main', 'microCss']) {
      if (stamp?.[key]) live.add(stamp[key]);
    }
  } catch { /* keep the cache if the stamp is unreachable */ }
  return live;
}

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    const cache = await caches.open(CACHE);
    const live = await liveHashes();
    if (!live.size) return;
    const requests = await cache.keys();
    await Promise.all(requests.map(async (request) => {
      const version = new URL(request.url).searchParams.get('v');
      if (version && !live.has(version)) await cache.delete(request);
    }));
  })());
});

self.addEventListener('message', (event) => {
  const urls = event.data?.urls;
  if (event.data?.type !== 'prime' || !Array.isArray(urls)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(urls.map(async (href) => {
      let url;
      try { url = new URL(href); } catch { return; }
      if (!isFingerprintedAsset(url)) return;
      if (await cache.match(href)) return;
      const res = await fetch(href);
      if (res.ok) await cache.put(href, res);
    }));
  })());
});

function isNavigation(request, url) {
  return request.mode === 'navigate'
    || url.pathname === '/'
    || url.pathname.endsWith('/index.html');
}

function tagged(response, kind) {
  const headers = new Headers(response.headers);
  headers.set('X-Imm-SW', kind);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function networkFirst(request) {
  try {
    return tagged(await fetch(request), 'network');
  } catch {
    const cached = await caches.match(request);
    if (cached) return tagged(cached, 'cache');
    throw new Error('offline');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return tagged(cached, 'cache');
  const fresh = await fetch(request);
  if (fresh.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, fresh.clone());
  }
  return tagged(fresh, 'network');
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
