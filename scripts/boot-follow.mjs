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
const indexRows = JSON.parse(indexText);
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
await formPage.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
await formPage.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
await formPage.selectOption('#filter-formalism', 'ode');
await formPage.waitForSelector('#model-list button.model-item[data-id="pendulum"]', { timeout: 30000 });
await formPage.waitForSelector('#model-list button.model-item[data-id="free-fall"]', { timeout: 10000 });
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
await palettePage.waitForTimeout(250);
const before = await palettePage.evaluate(() => {
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
  return { gold, neutral: window.__neutralPaints || 0 };
});
if (before.gold > 0 || before.neutral > 0) fail(`free-fall painted before palettes ${JSON.stringify(before)}`);
releasePalettes();
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
  fail('free-fall frame never picked up the palette body color');
}
fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
await palettePage.locator('#canvas').screenshot({ path: path.join(root, 'artifacts/palette-free-fall.png') });
await paletteCtx.close();

const narrowCtx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: 'block',
});
const narrowPage = await narrowCtx.newPage();
await narrowPage.goto(`${base}#m=neutron-diffusion`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await narrowPage.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
await narrowPage.waitForSelector('#model-list button.model-item[data-id="neutron-diffusion"]', { timeout: 20000 });
await narrowPage.waitForTimeout(700);
const placed = await narrowPage.evaluate(() => {
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
if (!placed.open) fail(`drawer stayed closed ${JSON.stringify(placed)}`);
if (!placed.inList || placed.overlapsToolbar) fail(`deep link covered at 390px ${JSON.stringify(placed)}`);
await narrowPage.screenshot({ path: path.join(root, 'artifacts/drawer-390-neutron.png') });
await narrowCtx.close();

await browser.close();
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('boot follow ok', { indexBytes, stamp: stampCc, neutron: got.join(',') });
