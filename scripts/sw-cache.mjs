#!/usr/bin/env node
/**
 * Second visit: index.html is network-first, fingerprinted js/css come from the SW cache.
 * After the stamp no longer lists a hash, activate drops that lab.js?v= entry.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const swSrc = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const cacheName = swSrc.match(/const CACHE = '([^']+)'/)?.[1] || 'immspfee-hashed-v3';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const failures = [];
function fail(msg) { failures.push(msg); }

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
});
let swRev = 1;
let dropHashes = false;
await context.route('**/sw.js*', async (route) => {
  const body = `${fs.readFileSync(path.join(root, 'sw.js'), 'utf8')}\n// purge-rev ${swRev}\n`;
  await route.fulfill({
    status: 200,
    headers: { 'content-type': 'application/javascript', 'cache-control': 'no-cache' },
    body,
  });
});
await context.route('**/asset-stamp.json', async (route) => {
  if (!dropHashes) return route.continue();
  await route.fulfill({
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify({
      js: '111111111111',
      css: '222222222222',
      main: '333333333333',
      microCss: '444444444444',
    }),
  });
});
const page = await context.newPage();
await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 20000 });
await page.waitForFunction(async (name) => {
  const keys = await caches.open(name).then((cache) => cache.keys()).catch(() => []);
  const urls = keys.map((req) => req.url);
  const need = ['/js/entry.js', '/js/bundle/lab.js', '/css/styles.css'];
  return need.every((part) => urls.some((url) => url.includes(part) && url.includes('v=')));
}, cacheName, { timeout: 20000 });

const seen = [];
page.on('response', async (res) => {
  const url = res.url();
  if (!url.includes('8765')) return;
  const kind = res.headers()['x-imm-sw'] || '';
  if (!kind) return;
  seen.push({ url, kind });
});
// Second navigation under an active controller — first paint already registered the SW.
await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
await page.waitForTimeout(300);

const html = seen.filter((row) => row.url.endsWith('/') || row.url.includes('index.html'));
const hashed = seen.filter((row) => {
  try {
    const url = new URL(row.url);
    return url.searchParams.get('v') && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'));
  } catch { return false; }
});
if (!html.length || html.some((row) => row.kind !== 'network')) {
  fail(`index.html was not network-first (${JSON.stringify(html)})`);
}
// Last-wins per pathname: early network races (pre-controller / double fetch) are ok
// as long as the controlling SW finally serves cache for each fingerprinted asset.
const lastByPath = new Map();
for (const row of hashed) {
  try { lastByPath.set(new URL(row.url).pathname, row); } catch { /* ignore */ }
}
const missed = [...lastByPath.values()].filter((row) => row.kind !== 'cache');
if (!lastByPath.size || missed.length) {
  fail(`fingerprinted js/css missed the cache (${JSON.stringify([...lastByPath.values()].map((row) => `${row.kind} ${row.url}`))})`);
}

await page.evaluate(() => window.__labCapture.loadDomain('核工程'));
await page.waitForFunction(async (name) => {
  const keys = await caches.open(name).then((cache) => cache.keys()).catch(() => []);
  return keys.some((req) => req.url.includes('chunk-factory') && req.url.includes('v='));
}, cacheName, { timeout: 20000 });
const subjectPage = await context.newPage();
const factoryHits = [];
subjectPage.on('response', (res) => {
  if (res.url().includes('chunk-factory')) factoryHits.push(res.headers()['x-imm-sw'] || 'miss');
});
await subjectPage.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
await subjectPage.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
await subjectPage.evaluate(() => window.__labCapture.loadDomain('核工程'));
await subjectPage.waitForTimeout(500);
if (!factoryHits.length || factoryHits.some((kind) => kind !== 'cache')) {
  fail(`second subject open missed the factory cache (${JSON.stringify(factoryHits)})`);
}

const cachedUrls = await page.evaluate(async (name) => {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  return keys.map((req) => req.url);
}, cacheName);
const staleLab = cachedUrls.filter((url) => url.includes('/js/bundle/lab.js') && url.includes('v='));
if (!staleLab.length) {
  fail(`lab.js was not cached before the hash change (${cachedUrls.filter((url) => url.includes('lab.js') || url.includes('chunk-factory')).join(' | ') || 'no lab or factory keys'})`);
}
swRev = 2;
dropHashes = true;
await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg) await reg.update();
});
try {
  await page.waitForFunction(async ({ name, oldUrl }) => {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    return !keys.some((req) => req.url === oldUrl);
  }, { name: cacheName, oldUrl: staleLab[0] }, { timeout: 15000 });
} catch {
  fail(`stale lab.js stayed in Cache Storage (${staleLab[0]})`);
}

await browser.close();
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('sw cache ok');
