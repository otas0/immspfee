#!/usr/bin/env node
/**
 * Pages (or LAB_URL) TTI: cold with SW blocked vs second visit with SW allowed.
 * Writes artifacts/pages-tti-sw.json. Does not fail CI on wall-clock (CDN variance).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.PAGES_URL || process.env.LAB_URL || 'https://otas0.github.io/immspfee/';
const outDir = path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });

async function measure(page, label) {
  const bust = `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}&tti=${label}`;
  const t0 = Date.now();
  await page.goto(bust, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(
    () => window.__labCapture && document.documentElement.dataset.boot === 'ready',
    null,
    { timeout: 90000 },
  );
  const readyMs = Date.now() - t0;
  const boot = await page.evaluate(() => window.__bootMarks || {});
  const cache = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { sw: false };
    const reg = await navigator.serviceWorker.getRegistration();
    const keys = await caches.keys().catch(() => []);
    return {
      sw: !!reg?.active,
      cacheKeys: keys,
      controller: !!navigator.serviceWorker.controller,
    };
  });
  const t1 = Date.now();
  await page.evaluate(async () => {
    await window.__labCapture.switchModel('projectile');
  });
  const firstHandMs = Date.now() - t1;
  return { label, readyMs, boot, firstHandMs, cache };
}

const browser = await chromium.launch({ headless: true });

const coldCtx = await browser.newContext({ serviceWorkers: 'block' });
const coldPage = await coldCtx.newPage();
const cold = await measure(coldPage, 'cold-sw-blocked');
await coldCtx.close();

const warmCtx = await browser.newContext({ serviceWorkers: 'allow' });
// entry.js skips SW when navigator.webdriver === true — spoof like sw-cache.mjs.
await warmCtx.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
});
const warmPage = await warmCtx.newPage();
// First load registers SW; second load can hit cache.
await measure(warmPage, 'warm-prime');
await warmPage.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 20000 }).catch(() => {});
await warmPage.waitForTimeout(500);
const warm = await measure(warmPage, 'warm-sw-second');
await warmCtx.close();

await browser.close();

const out = {
  at: new Date().toISOString(),
  url,
  cold,
  warm,
  deltaReadyMs: cold.readyMs - warm.readyMs,
  note: 'Wall-clock is CDN-bound; compare deltaReadyMs / firstHandMs. No hard fail.',
};
fs.writeFileSync(path.join(outDir, 'pages-tti-sw.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
