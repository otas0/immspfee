#!/usr/bin/env node
/**
 * Second visit: index.html is network-first, fingerprinted js/css come from the SW cache.
 */
import { chromium } from 'playwright';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const failures = [];
function fail(msg) { failures.push(msg); }

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
});
const page = await context.newPage();
await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
await page.waitForFunction(async () => {
  const keys = await caches.open('immspfee-hashed-v3').then((cache) => cache.keys()).catch(() => []);
  const urls = keys.map((req) => req.url);
  const need = ['/js/entry.js', '/js/bundle/lab.js', '/css/styles.css', '/css/microscope-shell.css'];
  return need.every((name) => urls.some((url) => url.includes(name) && url.includes('v=')));
}, null, { timeout: 20000 });

const seen = [];
page.on('response', async (res) => {
  const url = res.url();
  if (!url.includes('8765')) return;
  const kind = res.headers()['x-imm-sw'] || '';
  if (!kind) return;
  seen.push({ url, kind });
});
await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
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
if (!hashed.length || hashed.some((row) => row.kind !== 'cache')) {
  fail(`fingerprinted js/css missed the cache (${JSON.stringify(hashed.map((row) => `${row.kind} ${row.url}`))})`);
}

await browser.close();
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('sw cache ok');
