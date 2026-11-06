#!/usr/bin/env node
/**
 * Time HTML → __labCapture, plus main / loadIndex / ensureId marks.
 * Local ceilings are tight; Pages uses a separate bucket.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const pagesUrl = process.env.PAGES_URL || '';
const DIRECT_MAX = Number(process.env.BOOT_DIRECT_MAX_MS || 4000);
const CACHED_MAX = Number(process.env.BOOT_CACHED_MAX_MS || 4000);
const PAGES_DIRECT_MAX = Number(process.env.BOOT_PAGES_DIRECT_MAX_MS || 20000);
const PAGES_CACHED_MAX = Number(process.env.BOOT_PAGES_CACHED_MAX_MS || 35000);
const MAIN_MAX_BYTES = Number(process.env.BOOT_MAIN_MAX_BYTES || Math.floor(1.1 * 1024 * 1024));

function initialBundleBytes() {
  const dir = path.join(root, 'js/bundle');
  const labPath = path.join(dir, 'lab.js');
  if (!fs.existsSync(labPath)) return null;
  const lab = fs.readFileSync(labPath, 'utf8');
  let total = fs.statSync(labPath).size;
  for (const match of lab.matchAll(/from\s+"\.\/([^"]+\.js)"/g)) {
    if (match[1].includes('chunk-factory')) continue;
    const file = path.join(dir, match[1]);
    if (fs.existsSync(file)) total += fs.statSync(file).size;
  }
  return total;
}

function median(values) {
  const nums = values.filter((n) => typeof n === 'number').slice().sort((a, b) => a - b);
  if (!nums.length) return null;
  return nums[Math.floor(nums.length / 2)];
}

async function elapsed(context, url, init) {
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((err) => {
    if (!String(err).includes('ERR_ABORTED')) throw err;
  });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
  const ms = Date.now() - t0;
  const marks = await page.evaluate(() => {
    const boot = window.__bootMarks || {};
    const resources = performance.getEntriesByType('resource');
    const sizeOf = (pred) => resources.filter(pred).reduce((sum, row) => sum + (row.decodedBodySize || row.encodedBodySize || row.transferSize || 0), 0);
    return {
      ...boot,
      entryBytes: sizeOf((row) => row.name.includes('/js/entry.js')),
      mainBytes: sizeOf((row) => (
        (row.name.includes('/js/bundle/') || row.name.includes('/js/main.js'))
        && !row.name.includes('chunk-factory')
      )),
      factoryBytes: sizeOf((row) => row.name.includes('chunk-factory')),
      domainBytes: sizeOf((row) => row.name.includes('/data/domains/')),
      indexBytes: sizeOf((row) => row.name.includes('/data/domain-index.json')),
    };
  });
  await page.close();
  await context.close();
  return { ms, marks };
}

async function sampleMedian(browser, url, init, runs) {
  const samples = [];
  for (let i = 0; i < runs; i += 1) {
    samples.push(await elapsed(await browser.newContext({ serviceWorkers: 'block' }), url, init));
  }
  const ms = median(samples.map((row) => row.ms));
  const pick = samples.find((row) => row.ms === ms) || samples[0];
  return {
    ms,
    marks: pick?.marks || null,
    samples: samples.map((row) => row.ms),
    factorySamples: samples.map((row) => row.marks?.factoryBytes ?? null),
  };
}

function medianNumber(values) {
  const nums = values.filter((value) => typeof value === 'number').sort((a, b) => a - b);
  if (!nums.length) return null;
  return nums[Math.floor(nums.length / 2)];
}

const browser = await chromium.launch({ headless: true });
const fakeCache = () => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  performance.getEntriesByType = (type) => (
    type === 'navigation' ? [{ transferSize: 0, type: 'navigate', entryType: 'navigation' }] : []
  );
};
const direct = await elapsed(await browser.newContext({ serviceWorkers: 'block' }), base);
const cached = await elapsed(await browser.newContext({ serviceWorkers: 'block' }), base, fakeCache);
let pagesDirect = null;
let pagesCached = null;
if (pagesUrl) {
  try {
    pagesDirect = await sampleMedian(browser, pagesUrl, null, 3);
  } catch (err) {
    pagesDirect = { ms: `error:${err.message}`, marks: null, samples: [] };
  }
  try {
    pagesCached = await sampleMedian(browser, pagesUrl, fakeCache, 3);
  } catch (err) {
    pagesCached = { ms: `error:${err.message}`, marks: null, samples: [] };
  }
}
await browser.close();

const report = {
  at: new Date().toISOString(),
  url: base,
  directMs: direct.ms,
  directMarks: direct.marks,
  bundleBytes: initialBundleBytes(),
  segments: {
    entryMs: direct.marks?.entryMs ?? null,
    entryBytes: direct.marks?.entryBytes ?? null,
    mainMs: direct.marks?.mainMs ?? null,
    mainBytes: direct.marks?.mainBytes ?? null,
    domainMs: direct.marks?.loadDomainMs ?? null,
    domainBytes: direct.marks?.domainBytes ?? null,
  },
  indexBytes: direct.marks?.indexBytes ?? null,
  cachedReloadMs: cached.ms,
  cachedMarks: cached.marks,
  pagesDirectMs: pagesDirect?.ms ?? null,
  pagesDirectSamples: pagesDirect?.samples ?? null,
  pagesFactoryBytes: pagesDirect ? medianNumber(pagesDirect.factorySamples || []) : null,
  pagesFactorySamples: pagesDirect?.factorySamples ?? null,
  pagesMarks: pagesDirect?.marks ?? null,
  pagesCachedMs: pagesCached?.ms ?? null,
  pagesCachedSamples: pagesCached?.samples ?? null,
  pagesCachedMarks: pagesCached?.marks ?? null,
  ceilings: {
    directMs: DIRECT_MAX,
    cachedReloadMs: CACHED_MAX,
    pagesDirectMs: PAGES_DIRECT_MAX,
    pagesCachedMs: PAGES_CACHED_MAX,
    mainBytes: MAIN_MAX_BYTES,
  },
};
const outDir = path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'boot-timing.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
const pagesMs = typeof pagesDirect?.ms === 'number' ? pagesDirect.ms : null;
const pagesCachedMs = typeof pagesCached?.ms === 'number' ? pagesCached.ms : null;
const bundleBytes = report.bundleBytes;
const mainBytes = direct.marks?.mainBytes;
const factoryBytes = direct.marks?.factoryBytes;
const pagesFactoryBytes = report.pagesFactoryBytes;
if (
  direct.ms > DIRECT_MAX
  || cached.ms > CACHED_MAX
  || (pagesMs != null && pagesMs > PAGES_DIRECT_MAX)
  || (pagesCachedMs != null && pagesCachedMs > PAGES_CACHED_MAX)
  || (typeof bundleBytes === 'number' && bundleBytes > MAIN_MAX_BYTES)
  || (typeof mainBytes === 'number' && mainBytes > MAIN_MAX_BYTES)
  || (typeof factoryBytes === 'number' && factoryBytes > 0)
  || (typeof pagesFactoryBytes === 'number' && pagesFactoryBytes > 0)
) {
  console.error(`boot timing over ceiling direct ${direct.ms} cached ${cached.ms} pages ${pagesMs} pagesCached ${pagesCachedMs} bundle ${bundleBytes} main ${mainBytes} factory ${factoryBytes} pagesFactory ${pagesFactoryBytes}`);
  process.exit(1);
}
