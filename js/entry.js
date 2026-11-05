/**
 * First module. Paint the shell, preload the wanted subject, then load the lab bundle.
 * PERF: Pages must load ./bundle/lab.js — never ./main.js.
 */
const canvas = document.getElementById('canvas');
const wrap = document.querySelector('.canvas-wrap');
if (canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(320, wrap?.clientWidth || 640);
  const h = Math.max(180, wrap?.clientHeight || 360);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#12141a';
    ctx.fillRect(0, 0, w, h);
  }
}
document.documentElement.dataset.boot = 'shell';
mark('boot-shell');
try {
  const shell = performance.getEntriesByName('boot-shell').at(-1);
  window.__bootMarks = { ...(window.__bootMarks || {}), entryMs: shell ? shell.startTime : null };
} catch { /* ignore */ }
const status = document.getElementById('boot-status');
if (status) status.hidden = true;

function mark(name) {
  try { performance.mark(name); } catch { /* ignore */ }
}

function wantedModelId() {
  try {
    const q = new URLSearchParams(location.search);
    const shot = q.get('shot') || q.get('narrow') || q.get('m');
    if (shot) return shot;
    const hash = String(location.hash || '');
    const hit = hash.match(/(?:^|#|&)m=([^&]+)/);
    if (hit) return decodeURIComponent(hit[1]);
  } catch { /* ignore */ }
  return null;
}

function preloadLink(href) {
  if (!href) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'fetch';
  link.crossOrigin = 'anonymous';
  link.href = href;
  document.head.appendChild(link);
}

async function preloadCatalog() {
  let stamp = {};
  try {
    stamp = await fetch('./asset-stamp.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {}));
  } catch { /* ignore */ }
  const indexHref = stamp.domainIndex
    ? `./data/domain-index.json?v=${encodeURIComponent(stamp.domainIndex)}`
    : './data/domain-index.json';
  preloadLink(indexHref);
  const indexPromise = fetch(indexHref).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }).catch(() => null);
  window.__preloadedIndex = indexPromise;
  const id = wantedModelId();
  if (!id) return indexPromise;
  const rows = await indexPromise;
  const row = Array.isArray(rows) ? rows.find((entry) => entry.id === id) : null;
  if (!row?.domain) return indexPromise;
  const domainHref = stamp.domains?.[row.domain]
    ? `./data/domains/${encodeURIComponent(row.domain)}.json?v=${encodeURIComponent(stamp.domains[row.domain])}`
    : `./data/domains/${encodeURIComponent(row.domain)}.json`;
  preloadLink(domainHref);
  window.__preloadedDomain = {
    domain: row.domain,
    promise: fetch(domainHref).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    }).catch(() => null),
  };
  return indexPromise;
}

const stamp = new URL(import.meta.url).searchParams.get('v');
const labUrl = stamp
  ? `./bundle/lab.js?v=${encodeURIComponent(stamp)}`
  : './bundle/lab.js';

mark('boot-main-start');
await Promise.all([
  preloadCatalog(),
  import(labUrl),
]);
mark('boot-main-end');
try {
  const mainMs = performance.measure('boot-main', 'boot-main-start', 'boot-main-end').duration;
  window.__bootMarks = { ...(window.__bootMarks || {}), mainMs };
} catch { /* ignore */ }
document.documentElement.dataset.boot = 'ready';

if ('serviceWorker' in navigator && navigator.webdriver !== true) {
  // Default scope is the SW directory (…/immspfee/), not origin root — required on project Pages.
  const worker = new URL('../sw.js', import.meta.url);
  navigator.serviceWorker.register(worker.href).then(() => navigator.serviceWorker.ready).then((reg) => {
    const urls = [...document.querySelectorAll('script[src], link[rel="stylesheet"][href]')]
      .map((el) => el.src || el.href);
    urls.push(new URL(labUrl, import.meta.url).href);
    const hashed = urls.filter((href) => {
      try { return !!new URL(href, location.href).searchParams.get('v'); } catch { return false; }
    });
    reg.active?.postMessage({ type: 'prime', urls: hashed });
  }).catch(() => {});
}
