#!/usr/bin/env node
/**
 * Pages (or LAB_URL) TTI: cold with SW blocked vs second visit with SW allowed.
 * Writes artifacts/pages-tti-sw.json.
 *
 * Hard gate (CI): warm visit must control a service worker (requires spoofing
 * navigator.webdriver — entry.js skips SW when webdriver===true).
 * Wall-clock / firstHandMs stay advisory (CDN variance); percentiles logged.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.PAGES_URL || process.env.LAB_URL || 'https://otas0.github.io/immspfee/';
const outDir = path.join(root, 'artifacts');
const handSamples = Math.max(1, Number(process.env.FIRST_HAND_SAMPLES || 5));
fs.mkdirSync(outDir, { recursive: true });

function pct(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

async function measure(page, label, { sampleHands = 1 } = {}) {
  const bust = `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}&tti=${label}`;
  const t0 = Date.now();
  await page.goto(bust, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(
    () => window.__labCapture && document.documentElement.dataset.boot === 'ready',
    null,
    { timeout: 90000 },
  );
  const readyMs = Date.now() - t0;
  // True interactivity: first free-fall frame after boot-interactive (not merely module eval).
  await page.waitForFunction(
    () => typeof window.__bootMarks?.interactiveMs === 'number',
    null,
    { timeout: 90000 },
  );
  const interactiveWallMs = Date.now() - t0;
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
  const hands = [];
  for (let i = 0; i < sampleHands; i += 1) {
    const id = i % 2 === 0 ? 'projectile' : 'free-fall';
    const t1 = Date.now();
    await page.evaluate(async (mid) => {
      await window.__labCapture.switchModel(mid);
    }, id);
    hands.push(Date.now() - t1);
  }
  const sorted = [...hands].sort((a, b) => a - b);
  return {
    label,
    readyMs,
    interactiveWallMs,
    boot,
    firstHandMs: hands[0],
    firstHandSamples: hands,
    firstHandP50: pct(sorted, 50),
    firstHandP95: pct(sorted, 95),
    cache,
  };
}

const browser = await chromium.launch({ headless: true });

const coldCtx = await browser.newContext({ serviceWorkers: 'block' });
const coldPage = await coldCtx.newPage();
const cold = await measure(coldPage, 'cold-sw-blocked', { sampleHands: handSamples });
await coldCtx.close();

const warmCtx = await browser.newContext({ serviceWorkers: 'allow' });
// entry.js skips SW when navigator.webdriver === true — must spoof (see docs/commit-notes.md).
await warmCtx.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
});
const warmPage = await warmCtx.newPage();
await measure(warmPage, 'warm-prime', { sampleHands: 1 });
await warmPage.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 20000 }).catch(() => {});
await warmPage.waitForTimeout(500);
const warm = await measure(warmPage, 'warm-sw-second', { sampleHands: handSamples });
await warmCtx.close();

await browser.close();

const handP95WarnMs = Number(process.env.FIRST_HAND_P95_WARN_MS || 10000);
const cdnJitter = warm.readyMs > cold.readyMs;
const out = {
  at: new Date().toISOString(),
  url,
  cold,
  warm,
  deltaReadyMs: cold.readyMs - warm.readyMs,
  cdnJitter,
  cdnJitterNote: cdnJitter
    ? 'warm.readyMs > cold.readyMs — treat as CDN / edge jitter, not a SW regression'
    : '',
  note: 'Hard-fail: warm SW controller + boot-interactive present. firstHandP95 fails when FIRST_HAND_P95_HARD=1 (default on PAGES_TTI_HARD).',
};
if (cdnJitter) {
  console.warn(`pages-tti-sw advisory: CDN jitter (warm ${warm.readyMs}ms > cold ${cold.readyMs}ms)`);
}
for (const row of [cold, warm]) {
  if ((row.firstHandP95 || 0) > handP95WarnMs) {
    console.warn(
      `pages-tti-sw advisory: ${row.label} firstHandP95 ${row.firstHandP95}ms > ${handP95WarnMs}ms (CDN spike)`,
    );
  }
}
fs.writeFileSync(path.join(outDir, 'pages-tti-sw.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));

const hard = process.env.PAGES_TTI_HARD !== '0' && (process.env.CI === 'true' || process.env.PAGES_TTI_HARD === '1');
const handHard = process.env.FIRST_HAND_P95_HARD === '1'
  || (hard && process.env.FIRST_HAND_P95_HARD !== '0');
if (hard) {
  const ok = warm.cache?.controller && Array.isArray(warm.cache?.cacheKeys) && warm.cache.cacheKeys.some((k) => /immspfee-hashed/i.test(k));
  if (!ok) {
    console.error('pages-tti-sw hard fail: warm visit missing SW controller / hashed cache', warm.cache);
    process.exit(1);
  }
  if (typeof warm.boot?.interactiveMs !== 'number' && typeof cold.boot?.interactiveMs !== 'number') {
    console.error('pages-tti-sw hard fail: boot-interactive mark missing (ready ≠ interactive)');
    process.exit(1);
  }
}
if (handHard) {
  for (const row of [cold, warm]) {
    if ((row.firstHandP95 || 0) > handP95WarnMs) {
      console.error(
        `pages-tti-sw hard fail: ${row.label} firstHandP95 ${row.firstHandP95}ms > ${handP95WarnMs}ms`,
      );
      process.exit(1);
    }
  }
}
