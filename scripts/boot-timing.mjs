#!/usr/bin/env node
/**
 * Time HTML → __labCapture for a direct load and for the one cache reload.
 * Writes artifacts/boot-timing.json. Ceilings keep the entry from drifting.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const pagesUrl = process.env.PAGES_URL || '';
const DIRECT_MAX = Number(process.env.BOOT_DIRECT_MAX_MS || 20000);
const CACHED_MAX = Number(process.env.BOOT_CACHED_MAX_MS || 35000);

async function elapsed(context, url, init) {
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
  const ms = Date.now() - t0;
  await page.close();
  return ms;
}

const browser = await chromium.launch({ headless: true });
const direct = await elapsed(await browser.newContext({ serviceWorkers: 'block' }), base);
const cached = await elapsed(await browser.newContext({ serviceWorkers: 'block' }), base, () => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  performance.getEntriesByType = (type) => (
    type === 'navigation' ? [{ transferSize: 0, type: 'navigate', entryType: 'navigation' }] : []
  );
});
let pagesDirect = null;
if (pagesUrl) {
  try {
    pagesDirect = await elapsed(await browser.newContext({ serviceWorkers: 'block' }), pagesUrl);
  } catch (err) {
    pagesDirect = `error:${err.message}`;
  }
}
await browser.close();

const report = {
  at: new Date().toISOString(),
  url: base,
  directMs: direct,
  cachedReloadMs: cached,
  pagesDirectMs: pagesDirect,
  ceilings: { directMs: DIRECT_MAX, cachedReloadMs: CACHED_MAX },
};
const outDir = path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'boot-timing.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
if (direct > DIRECT_MAX || cached > CACHED_MAX) {
  console.error(`boot timing over ceiling direct ${direct} cached ${cached}`);
  process.exit(1);
}
