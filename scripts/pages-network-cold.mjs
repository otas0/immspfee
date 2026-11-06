#!/usr/bin/env node
/**
 * Cold-start Network dump for Pages (or LAB_URL). Sort by waiting time to tell
 * module waterfall vs one fat JSON.
 * Wall-clock advisory uses bootMs p95 across BOOT_SAMPLES (default 3), not a single hit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.PAGES_URL || process.env.LAB_URL || 'https://otas0.github.io/immspfee/';
const outDir = path.join(root, 'artifacts');
const bootSamples = Math.max(1, Number(process.env.BOOT_SAMPLES || 3));
fs.mkdirSync(outDir, { recursive: true });

function pct(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

const browser = await chromium.launch({ headless: true });
const bootMsList = [];
const bootEdgeRegions = [];
let lastRequests = [];
let lastMarks = null;

for (let i = 0; i < bootSamples; i += 1) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  const requests = [];
  let edgeRegion = '';
  page.on('response', async (res) => {
    const req = res.request();
    const timing = req.timing();
    const u = req.url();
    const headers = res.headers();
    if (!edgeRegion && /otas0\.github\.io|immspfee/i.test(u)) {
      edgeRegion = headers['x-github-edge-region']
        || headers['x-served-by']
        || headers['cf-ray']
        || '';
    }
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
      edgeRegion: headers['x-github-edge-region'] || '',
    });
  });

  const bust = `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}&boot=${i}`;
  const t0 = Date.now();
  await page.goto(bust, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 90000 }).catch(() => null);
  const sampleMs = Date.now() - t0;
  bootMsList.push(sampleMs);
  bootEdgeRegions.push(edgeRegion || null);
  lastMarks = await page.evaluate(() => window.__bootMarks || null).catch(() => null);
  lastRequests = requests;
  await context.close();
}

await browser.close();

const bootSorted = [...bootMsList].sort((a, b) => a - b);
const bootMs = bootMsList[bootMsList.length - 1];
const bootMsP50 = pct(bootSorted, 50);
const bootMsP95 = pct(bootSorted, 95);

const requests = lastRequests;
const js = requests.filter((r) => r.type === 'script' || /\.m?js(\?|$)/i.test(r.short));
const json = requests.filter((r) => /\.json(\?|$)/i.test(r.short) || r.type === 'fetch');
const topWaits = [...requests].sort((a, b) => b.wait - a.wait).slice(0, 20);
const jsCount = js.length;
const jsonCount = json.length;
const verdict = jsCount >= 20
  ? 'module-waterfall'
  : (json.some((r) => r.size > 400_000) ? 'large-json' : 'bundled-or-cached');

const maxJs = Number(process.env.PAGES_NETWORK_MAX_JS || 5);
/** Advisory only — compare p95 across BOOT_SAMPLES, not a single cold hit. */
const advisoryBootMs = Number(process.env.PAGES_NETWORK_ADVISORY_BOOT_MS || 12000);
const spikeIdx = bootMsList.findIndex((ms) => ms === bootMsP95 || ms > advisoryBootMs);
const spikeEdge = spikeIdx >= 0 ? (bootEdgeRegions[spikeIdx] || null) : null;

const summary = {
  at: new Date().toISOString(),
  url,
  bootMs,
  bootMsList,
  bootEdgeRegions,
  bootMsP50,
  bootMsP95,
  bootSamples,
  advisoryBootMs,
  spikeEdge: spikeEdge || null,
  marks: lastMarks,
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

const fail = process.env.PAGES_NETWORK_ASSERT === '1' || process.env.CI === 'true';
const coldChunks = js.filter((r) => /chunk-(?!factory)/i.test(r.short) && !/glyphRows/i.test(r.short));
const factoryCold = js.some((r) => /chunk-factory/i.test(r.short));
if ((bootMsP95 || bootMs) > advisoryBootMs) {
  console.warn(
    `pages-network advisory: bootMsP95 ${bootMsP95} (samples=${bootMsList.join(',')}) > ${advisoryBootMs}`
    + (spikeEdge ? ` edge=${spikeEdge}` : '')
    + ' (CDN; not a hard fail)',
  );
}
if (fail) {
  const errors = [];
  if (jsCount > maxJs) errors.push(`jsCount ${jsCount} > ${maxJs}`);
  if (verdict === 'module-waterfall') errors.push('verdict is module-waterfall');
  if (factoryCold) errors.push('cold boot fetched chunk-factory');
  if (coldChunks.some((r) => /chunk-chunk-/i.test(r.short))) {
    errors.push(`cold boot still fetched shared chunk(s): ${coldChunks.map((r) => r.short).join(',')}`);
  }
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
}
