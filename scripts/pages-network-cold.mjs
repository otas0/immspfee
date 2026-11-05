#!/usr/bin/env node
/**
 * Cold-start Network dump for Pages (or LAB_URL). Sort by waiting time to tell
 * module waterfall vs one fat JSON.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.PAGES_URL || process.env.LAB_URL || 'https://otas0.github.io/immspfee/';
const outDir = path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ serviceWorkers: 'block' });
const page = await context.newPage();
const requests = [];
page.on('response', async (res) => {
  const req = res.request();
  const timing = req.timing();
  const u = req.url();
  let size = 0;
  try {
    const buf = await res.body();
    size = buf.length;
  } catch { /* ignore */ }
  const wait = (timing.responseStart >= 0 && timing.requestStart >= 0)
    ? timing.responseStart - timing.requestStart
    : -1;
  const total = timing.responseEnd >= 0 ? timing.responseEnd : -1;
  let short = u;
  try {
    const parsed = new URL(u);
    short = parsed.pathname.replace(/.*\/immspfee\//, '') + parsed.search;
    if (short.startsWith('/')) short = short.slice(1);
  } catch { /* keep */ }
  requests.push({
    url: u,
    short,
    wait: Math.round(wait),
    total: Math.round(total),
    size,
    status: res.status(),
    type: req.resourceType(),
  });
});

const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => window.__labCapture, null, { timeout: 90000 }).catch(() => null);
const bootMs = Date.now() - t0;
const marks = await page.evaluate(() => window.__bootMarks || null).catch(() => null);
await browser.close();

const js = requests.filter((r) => r.type === 'script' || /\.m?js(\?|$)/i.test(r.short));
const json = requests.filter((r) => /\.json(\?|$)/i.test(r.short) || r.type === 'fetch');
const topWaits = [...requests].sort((a, b) => b.wait - a.wait).slice(0, 20);
const jsCount = js.length;
const jsonCount = json.length;
const verdict = jsCount >= 20
  ? 'module-waterfall'
  : (json.some((r) => r.size > 400_000) ? 'large-json' : 'bundled-or-cached');

const summary = {
  at: new Date().toISOString(),
  url,
  bootMs,
  marks,
  requestCount: requests.length,
  jsCount,
  jsonCount,
  verdict,
  topWaits: topWaits.map(({ short, wait, total, size, status, type }) => ({
    short, wait, total, size, status, type,
  })),
};

fs.writeFileSync(path.join(outDir, 'pages-network-cold.json'), `${JSON.stringify({ summary, requests }, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'pages-network-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
