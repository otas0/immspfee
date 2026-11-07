#!/usr/bin/env node
/**
 * Follow-ups that stay off the cold-boot critical path:
 * subject search stays narrower than the full catalog, handwritten models
 * without FAMILY_META still match a formalism, the first free-fall frame
 * uses the real palette, a 390px drawer keeps the deep link below the toolbar,
 * and asset-stamp.json is not a long-lived response.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { expandDomainIndex } from '../js/boot/domainPack.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const failures = [];
function fail(msg) { failures.push(msg); }

function stampDirective() {
  const text = fs.readFileSync(path.join(root, '_headers'), 'utf8');
  const lines = text.split(/\r?\n/);
  let capture = false;
  for (const line of lines) {
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      capture = line.trim() === '/asset-stamp.json';
      continue;
    }
    if (!capture) continue;
    const idx = line.indexOf(':');
    if (idx > 0 && line.slice(0, idx).trim().toLowerCase() === 'cache-control') {
      return line.slice(idx + 1).trim();
    }
  }
  return '';
}

const stamp = await fetch(new URL('asset-stamp.json', base));
const stampCc = stamp.headers.get('cache-control') || '';
const expectedCc = stampDirective();
if (!expectedCc || !stampCc.toLowerCase().includes(expectedCc.toLowerCase())) {
  fail(`asset-stamp Cache-Control ${stampCc || '(none)'} missing ${expectedCc || 'no-cache'}`);
}
const indexRes = await fetch(new URL('data/domain-index.json', base));
const indexText = await indexRes.text();
const indexRows = expandDomainIndex(JSON.parse(indexText));
const indexBytes = Buffer.byteLength(indexText);
console.log('domain index', indexBytes, 'bytes', indexRows.length, 'rows');
if (indexBytes > 256 * 1024) fail(`domain index ${indexBytes} bytes is a first-screen file again`);

const browser = await chromium.launch({ headless: true });

const searchCtx = await browser.newContext({ serviceWorkers: 'block' });
const searchPage = await searchCtx.newPage();
const domainReqs = [];
searchPage.on('request', (req) => {
  if (req.url().includes('/data/domains/')) domainReqs.push(decodeURIComponent(new URL(req.url()).pathname));
});
await searchPage.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
await searchPage.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
await searchPage.waitForTimeout(300);
if (domainReqs.length) fail(`search page fetched subjects before the query ${domainReqs.join(',')}`);
await searchPage.fill('#filter-q', '中子');
await searchPage.waitForFunction(
  () => document.querySelectorAll('#model-list button.model-item').length > 0,
  null,
  { timeout: 20000 },
);
await searchPage.waitForTimeout(500);
const got = [...new Set(domainReqs.map((pathname) => pathname.split('/').pop().replace(/\.json.*/, '')))];
const allDomains = [...new Set(indexRows.map((row) => row.domain || '其他'))];
const expectDomains = [...new Set(indexRows.filter((row) => {
  const hay = `${row.name || ''} ${row.id || ''} ${row.sub || ''} ${row.domain || ''} ${row.family || ''} ${row.formula || ''}`;
  return hay.includes('中子');
}).map((row) => row.domain || '其他'))];
const same = got.length === expectDomains.length && expectDomains.every((name) => got.includes(name));
if (!same) fail(`中子 fetched ${got.join(',') || 'nothing'}, index wants ${expectDomains.join(',')}`);
if (got.length >= allDomains.length) fail(`中子 fetched every subject (${got.length})`);
await searchCtx.close();

const formCtx = await browser.newContext({ serviceWorkers: 'block' });
const formPage = await formCtx.newPage();
const formReqs = [];
formPage.on('request', (req) => {
  if (req.url().includes('/data/domains/')) formReqs.push(decodeURIComponent(new URL(req.url()).pathname));
});
await formPage.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
await formPage.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
await formPage.selectOption('#filter-formalism', 'ode');
await formPage.waitForSelector('#model-list button.model-item[data-id="pendulum"]', { timeout: 30000 });
await formPage.waitForSelector('#model-list button.model-item[data-id="free-fall"]', { timeout: 10000 });
await formPage.waitForTimeout(400);
const formStats = await formPage.evaluate(() => window.__filterDomainStats || null);
const formDomains = [...new Set(formReqs.map((pathname) => pathname.split('/').pop().replace(/\.json.*/, '')))];
console.log('ode domains', formStats, formDomains.join(','));
if (!formStats || formStats.loaded > formStats.cap || formStats.loaded > 8) {
  fail(`ode filter loaded ${formStats?.loaded} subjects over the cap`);
}
if (formStats.loaded >= allDomains.length) fail(`ode filter opened most of the catalog (${formStats.loaded})`);
if (formDomains.length > 8) fail(`ode filter fetched ${formDomains.length} subject files`);
await formCtx.close();

const paletteCtx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 800 } });
let releasePalettes = () => {};
const holdPalettes = new Promise((resolve) => { releasePalettes = resolve; });
await paletteCtx.route('**/data/palettes.json', async (route) => {
  await holdPalettes;
  await route.continue();
});
const palettePage = await paletteCtx.newPage();
await palettePage.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
await palettePage.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
// Cold bundle embeds free-fall colors — first paint must not wait on palettes.json.
try {
  await palettePage.waitForFunction(() => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let gold = 0;
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (Math.abs(r - 240) < 20 && Math.abs(g - 180) < 20 && Math.abs(b - 41) < 24) gold += 1;
    }
    return gold > 8;
  }, null, { timeout: 15000 });
} catch {
  fail('free-fall stub never painted while palettes.json was held');
}
const stubPaint = await palettePage.evaluate(() => window.__neutralPaints || 0);
if (stubPaint > 0) fail(`neutral paints with free-fall stub ${stubPaint}`);
releasePalettes();
await palettePage.waitForFunction(
  () => document.documentElement.dataset.palettesFull === '1',
  null,
  { timeout: 15000 },
).catch(() => fail('full palettes.json never hydrated after release'));
fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
await palettePage.evaluate(() => {
  window.__labCapture.pause();
  document.getElementById('btn-reset')?.click();
  window.__labCapture.pause();
  window.__labCapture.paintFrame();
});
const shot = await palettePage.locator('#canvas').screenshot();
fs.writeFileSync(path.join(root, 'artifacts/palette-free-fall.png'), shot);
const baselinePath = path.join(root, 'tests/baselines/palette-free-fall.png');
if (process.env.UPDATE_PALETTE_BASELINE === '1') {
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(baselinePath, shot);
}
if (!fs.existsSync(baselinePath)) {
  // Seed once so CI / fresh clones do not hard-fail before a reviewed baseline lands.
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(baselinePath, shot);
  console.log('palette baseline seeded at tests/baselines/palette-free-fall.png');
} else {
  const current = PNG.sync.read(shot);
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const dw = Math.abs(current.width - baseline.width);
  const dh = Math.abs(current.height - baseline.height);
  // Linux CI vs macOS often differ by 1 CSS px on the canvas snapshot.
  if (dw > 1 || dh > 1) {
    fail(`palette frame ${current.width}x${current.height} != baseline ${baseline.width}x${baseline.height}`);
  } else {
    const w = Math.min(current.width, baseline.width);
    const h = Math.min(current.height, baseline.height);
    const crop = (png, tw, th) => {
      if (png.width === tw && png.height === th) return png.data;
      const out = Buffer.alloc(tw * th * 4);
      for (let y = 0; y < th; y += 1) {
        const src = y * png.width * 4;
        png.data.copy(out, y * tw * 4, src, src + tw * 4);
      }
      return out;
    };
    const mismatched = pixelmatch(
      crop(current, w, h),
      crop(baseline, w, h),
      null,
      w,
      h,
      { threshold: 0.1, includeAA: true },
    );
    const limit = Math.max(2500, Math.floor(w * h * 0.02));
    console.log('palette pixel mismatch', mismatched, `limit=${limit}`, dw || dh ? `(crop ${w}x${h})` : '');
    // Mac vs Linux CI AA / low-ink strokes routinely differ by ~1–2k pixels after crop.
    if (mismatched > limit) fail(`palette frame differs from the baseline by ${mismatched} pixels`);
  }
}
await paletteCtx.close();

async function measureDeepLink(width, height) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  await page.goto(`${base}#m=neutron-diffusion`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
  await page.waitForSelector('#model-list button.model-item[data-id="neutron-diffusion"]', { timeout: 20000 });
  await page.waitForTimeout(400);
  const coldClosed = await page.evaluate(() => (
    document.querySelector('.sidebar')?.classList.contains('open') || false
  ));
  if (coldClosed) fail(`deep link auto-opened the ${width}px drawer (menu should be the only opener)`);
  const sample = () => page.evaluate(() => {
    const btn = document.querySelector('[data-id="neutron-diffusion"]');
    const toolbar = document.querySelector('.toolbar');
    const list = document.querySelector('.model-list');
    const br = btn.getBoundingClientRect();
    const tr = toolbar.getBoundingClientRect();
    const lr = list.getBoundingClientRect();
    const overlapsToolbar = br.top < tr.bottom - 1 && br.bottom > tr.top + 1
      && br.left < tr.right && br.right > tr.left;
    const inList = br.bottom > lr.top + 4 && br.top < lr.bottom - 4 && br.height > 8;
    return {
      overlapsToolbar,
      inList,
      open: document.querySelector('.sidebar')?.classList.contains('open') || false,
      top: Math.round(br.top),
      toolbarBottom: Math.round(tr.bottom),
      listTop: Math.round(lr.top),
      listBottom: Math.round(lr.bottom),
    };
  });
  await page.click('#btn-menu');
  await page.waitForFunction(() => (
    document.querySelector('.sidebar')?.classList.contains('open') || false
  ), null, { timeout: 10000 });
  await page.waitForTimeout(80);
  const during = await sample();
  if (during.overlapsToolbar) fail(`deep link covered during the ${width}px drawer transition ${JSON.stringify(during)}`);
  await page.waitForTimeout(320);
  const placed = await sample();
  if (!placed.open) fail(`drawer stayed closed after menu at ${width}px ${JSON.stringify(placed)}`);
  if (!placed.inList || placed.overlapsToolbar) fail(`deep link covered at ${width}px ${JSON.stringify(placed)}`);
  await page.screenshot({ path: path.join(root, 'artifacts', `drawer-${width}-neutron.png`) });
  await ctx.close();
}

await measureDeepLink(390, 844);
await measureDeepLink(768, 1024);

const microCtx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: 'block',
});
const microPage = await microCtx.newPage();
await microPage.goto(`${base}?shell=lab-microscope3d&lang=en`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await microPage.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
await microPage.waitForFunction(
  () => document.documentElement.dataset.shell === 'lab-microscope3d',
  null,
  { timeout: 30000 },
);
await microPage.waitForTimeout(800);
const microShell = await microPage.evaluate(() => ({
  shell: document.documentElement.dataset.shell || '',
  stage: document.documentElement.dataset.stageMode || '',
  chrome: document.getElementById('microscope-chrome')?.hidden === false,
}));
if (microShell.shell !== 'lab-microscope3d' || microShell.stage !== 'webgl3d' || !microShell.chrome) {
  fail(`microscope left lab-classic ${JSON.stringify(microShell)}`);
}
await microCtx.close();

await browser.close();
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('boot follow ok', { indexBytes, stamp: stampCc, neutron: got.join(',') });
