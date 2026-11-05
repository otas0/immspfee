#!/usr/bin/env node
/**
 * Cached documents reload once. The module v matches the address bar,
 * and lang, shell, and hash survive that replace.
 */
import { chromium } from 'playwright';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const failures = [];
function fail(msg) { failures.push(msg); }

function fakeCache() {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  performance.getEntriesByType = (type) => (
    type === 'navigation' ? [{ transferSize: 0, type: 'navigate', entryType: 'navigation' }] : []
  );
}

const browser = await chromium.launch({ headless: true });

const cached = await browser.newContext({ serviceWorkers: 'block' });
await cached.addInitScript(fakeCache);
const page = await cached.newPage();
let navs = 0;
let lastCached = '';
page.on('framenavigated', (frame) => {
  if (frame !== page.mainFrame()) return;
  const url = frame.url();
  if (!url.includes('8765')) return;
  const key = url.split('#')[0];
  if (key === lastCached) return;
  lastCached = key;
  navs += 1;
});
const start = `${base}?lang=ja&shell=lab-classic#m=free-fall`;
await page.goto(start, { waitUntil: 'commit', timeout: 60000 }).catch((err) => {
  if (!String(err).includes('ERR_ABORTED')) throw err;
});
await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
await page.waitForTimeout(300);
const after = new URL(page.url());
const cachedNavs = navs;
if (after.searchParams.get('lang') !== 'ja') fail(`lang dropped (${after.search})`);
if (after.searchParams.get('shell') !== 'lab-classic') fail(`shell dropped (${after.search})`);
if (!after.hash.includes('m=free-fall') && !after.hash.includes('m%3Dfree-fall')) fail(`hash dropped (${after.hash})`);
const match = await page.evaluate(() => {
  const mod = [...document.scripts].find((s) => s.type === 'module');
  const mv = mod ? new URL(mod.src).searchParams.get('v') : '';
  return { mv, lv: new URL(location.href).searchParams.get('v'), shell: document.documentElement.dataset.boot };
});
if (!match.mv || match.mv !== match.lv) fail(`module v ${match.mv} != address ${match.lv}`);
if (match.shell !== 'ready' && match.shell !== 'shell') fail(`boot marker ${match.shell}`);
await cached.close();

const held = await browser.newContext({ serviceWorkers: 'block' });
await held.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  performance.getEntriesByType = (type) => (
    type === 'navigation' ? [{ transferSize: 0, type: 'navigate', entryType: 'navigation' }] : []
  );
  window.__bootHold = new Promise((resolve) => { window.__releaseBoot = resolve; });
});
const holdPage = await held.newPage();
await holdPage.goto(`${base}?lang=zh`, { waitUntil: 'commit', timeout: 60000 }).catch((err) => {
  if (!String(err).includes('ERR_ABORTED')) throw err;
});
await holdPage.waitForSelector('#boot-status:not([hidden])', { timeout: 10000 });
const banner = (await holdPage.locator('#boot-status [data-i18n]').innerText()).trim();
if (banner !== '正在重新载入') fail(`banner ${banner}`);
await holdPage.locator('#boot-status button').click();
if (!(await holdPage.locator('#boot-status').isHidden())) fail('reload banner did not dismiss');
await holdPage.evaluate(() => window.__releaseBoot());
await holdPage.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
await held.close();

const fresh = await browser.newContext({ serviceWorkers: 'block' });
const freshPage = await fresh.newPage();
let freshNavs = 0;
let lastFresh = '';
freshPage.on('framenavigated', (frame) => {
  if (frame !== freshPage.mainFrame()) return;
  const url = frame.url();
  if (!url.includes('8765')) return;
  const key = url.split('#')[0];
  if (key === lastFresh) return;
  lastFresh = key;
  freshNavs += 1;
});
const domainLoads = [];
freshPage.on('request', (req) => {
  if (req.url().includes('/data/domains/')) domainLoads.push(new URL(req.url()).pathname);
});
await freshPage.goto(base, { waitUntil: 'commit', timeout: 60000 });
await freshPage.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
await freshPage.waitForTimeout(400);
if (cachedNavs !== freshNavs + 1) fail(`cached visit navigations ${cachedNavs}, want ${freshNavs + 1}`);
await freshPage.waitForSelector('details.domain-group', { timeout: 20000 });
const shape = await freshPage.evaluate(() => ({
  domains: document.querySelectorAll('details.domain-group').length,
  buttons: document.querySelectorAll('#model-list .model-item').length,
}));
if (shape.domains < 5) fail(`sidebar subjects ${shape.domains}`);
// Domains stay collapsed on cold boot — no model rows until the user opens a subject.
if (shape.buttons !== 0) fail(`folded cold sidebar should paint 0 rows, got ${shape.buttons}`);
if (domainLoads.length) fail(`default visit fetched subject files ${domainLoads.join(',')}`);
const searchReq = freshPage.waitForRequest((req) => req.url().includes('/data/domains/'), { timeout: 20000 });
await freshPage.fill('#filter-q', 'free-fall');
await searchReq;
await freshPage.waitForFunction(
  () => document.querySelectorAll('#model-list button.model-item[data-id]').length > 0,
  null,
  { timeout: 20000 },
);
const searchLoads = [...new Set(domainLoads)];
if (!searchLoads.some((path) => decodeURIComponent(path).includes('物理'))) {
  fail(`search fetched ${searchLoads.join(',') || 'nothing'}`);
}
const statusHidden = await freshPage.locator('#boot-status').isHidden();
if (!statusHidden) fail('fresh visit showed the reload banner');
await fresh.close();

const blocked = await browser.newContext({ serviceWorkers: 'block' });
await blocked.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('blocked'); } });
});
const blockedPage = await blocked.newPage();
let blockedNavs = 0;
let lastBlocked = '';
blockedPage.on('framenavigated', (frame) => {
  if (frame !== blockedPage.mainFrame()) return;
  const url = frame.url();
  if (!url.includes('8765')) return;
  const key = url.split('#')[0];
  if (key === lastBlocked) return;
  lastBlocked = key;
  blockedNavs += 1;
});
await blockedPage.goto(`${base}?lang=zh`, { waitUntil: 'commit', timeout: 60000 }).catch((err) => {
  if (!String(err).includes('ERR_ABORTED')) throw err;
});
await blockedPage.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
await blockedPage.waitForTimeout(400);
if (blockedNavs !== freshNavs) fail(`storage-blocked navigations ${blockedNavs}, want ${freshNavs}`);
const hint = (await blockedPage.locator('#boot-refresh-hint').innerText()).trim();
const hintHidden = await blockedPage.locator('#boot-refresh-hint').isHidden();
if (hintHidden || !hint.includes('手动重新载入')) fail(`missing manual refresh hint (${hint})`);
await blocked.close();

await browser.close();
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('boot reload ok');
