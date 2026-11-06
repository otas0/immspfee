#!/usr/bin/env node
/**
 * Pages mobile smoke (Chromium device emulation — stand-in for iPhone/iPad Safari).
 * Confirms heavy pause/play, canvas ≥120px with Params, tablet dismiss, microscope DPR.
 *
 *   PAGES_URL=https://otas0.github.io/immspfee/ npm run test:pages-mobile
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.env.PAGES_URL || 'https://otas0.github.io/immspfee/').replace(/\/?$/, '/');
const outDir = path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });

const failures = [];
const browser = await chromium.launch({ headless: true });

async function withPage(viewport, fn) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: viewport.width <= 500,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await fn(page);
  } finally {
    await context.close();
  }
}

await withPage({ width: 390, height: 844 }, async (page) => {
  await page.goto(`${base}?lang=en&shell=lab-classic`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__labCapture?.switchModel, null, { timeout: 90000 });

  const stamp = await page.evaluate(async () => {
    const r = await fetch('./asset-stamp.json', { cache: 'no-store' });
    const j = await r.json();
    return {
      js: j.js || j.immJs || '',
      css: j.css || '',
      sw: window.navigator?.serviceWorker?.controller?.scriptURL || '',
      cacheKeys: typeof caches !== 'undefined' ? (await caches.keys()).filter((k) => /immspfee/i.test(k)) : [],
    };
  });
  fs.writeFileSync(path.join(outDir, 'pages-mobile-stamp.json'), `${JSON.stringify(stamp, null, 2)}\n`);
  if (!stamp.js) failures.push('asset-stamp missing js hash');
  console.log('pages-mobile stamp', stamp.js, 'swCaches', stamp.cacheKeys.join(',') || '(none)');

  for (const id of ['mandelbrot-julia', 'heat-2d', 'collision-2d']) {
    await page.evaluate(async (mid) => {
      await window.__labCapture.switchModel(mid);
    }, id);
    await page.waitForFunction((mid) => window.__labCapture.getModelId?.() === mid, id, { timeout: 60000 });
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => {
      const toast = document.getElementById('lab-toast');
      return {
        id: window.__labCapture.getModelId?.(),
        paused: !!window.__labCapture.isPaused?.(),
        tier: window.__labCapture.getViewportTier?.(),
        steps: window.__labCapture.getEffectiveMaxSubSteps?.(),
        toast: toast?.textContent || '',
        toastShow: !!toast?.classList.contains('show'),
        benchOpen: !!document.getElementById('bench')?.classList.contains('open'),
      };
    });
    if (info.id !== id) failures.push(`switch ${id} → ${info.id}`);
    if (!info.paused) failures.push(`${id}: expected auto-pause`);
    if (info.benchOpen) failures.push(`${id}: heavy should not auto-open bench`);
    if (!(info.steps <= 8)) failures.push(`${id}: steps ${info.steps}`);

    await page.evaluate(() => window.__labCapture.play?.());
    await page.waitForTimeout(300);
    const playing = await page.evaluate(() => !window.__labCapture.isPaused?.());
    if (!playing) failures.push(`${id}: play did not unpause`);
    await page.evaluate(() => window.__labCapture.pause?.());

    await page.click('#btn-params');
    await page.waitForTimeout(250);
    const canvas = await page.evaluate(() => {
      const wrap = document.querySelector('.canvas-wrap');
      const r = wrap?.getBoundingClientRect();
      return { h: r?.height || 0, open: !!document.getElementById('bench')?.classList.contains('open') };
    });
    if (!canvas.open || canvas.h < 120) failures.push(`${id}: canvas floor ${JSON.stringify(canvas)}`);
    await page.evaluate(() => {
      document.querySelector('.stage')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(200);
  }
});

await withPage({ width: 1000, height: 700 }, async (page) => {
  await page.goto(`${base}?lang=en&shell=lab-classic#m=free-fall`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__labCapture?.switchModel, null, { timeout: 90000 });
  await page.evaluate(async () => { await window.__labCapture.switchModel('free-fall'); });
  await page.click('#btn-params');
  await page.waitForTimeout(250);
  const before = await page.evaluate(() => ({
    open: !!document.getElementById('bench')?.classList.contains('open'),
    tier: window.__labCapture.getViewportTier?.(),
  }));
  await page.evaluate(() => {
    document.querySelector('.stage')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => !!document.getElementById('bench')?.classList.contains('open'));
  if (before.tier !== 'tablet') failures.push(`tablet tier ${before.tier}`);
  if (!before.open) failures.push('tablet bench did not open');
  if (after) failures.push('tablet stage click did not close bench');
});

await withPage({ width: 390, height: 844 }, async (page) => {
  await page.goto(`${base}?lang=en&shell=lab-microscope3d`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => document.documentElement.dataset.stageMode === 'webgl3d', null, { timeout: 90000 });
  await page.waitForTimeout(800);
  const micro = await page.evaluate(() => {
    const gl = document.getElementById('canvas-webgl');
    const dprCap = Number(document.documentElement.dataset.dprCap) || 0;
    return {
      dprCap,
      w: gl?.width || 0,
      h: gl?.height || 0,
      cw: gl?.clientWidth || 0,
      hidden: !!gl?.hidden,
      shell: document.documentElement.dataset.shell,
    };
  });
  if (micro.shell !== 'lab-microscope3d') failures.push(`micro shell ${micro.shell}`);
  if (micro.hidden || micro.cw < 100) failures.push(`micro webgl ${JSON.stringify(micro)}`);
  if (!(micro.dprCap > 0 && micro.dprCap <= 1.75 + 1e-6)) {
    failures.push(`micro dprCap ${micro.dprCap} (want ≤1.75 on phone)`);
  }
  // Drag orbit should not throw / crash.
  const box = await page.locator('#canvas-webgl').boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.45, { steps: 8 });
    await page.mouse.up();
  }
  await page.waitForTimeout(300);
  const alive = await page.evaluate(() => document.documentElement.dataset.stageMode === 'webgl3d');
  if (!alive) failures.push('micro stage died after drag');
});

// Capture 390 Params open/closed (shots/; copy to docs/assets when CAPTURE_DOCS=1).
await withPage({ width: 390, height: 844 }, async (page) => {
  await page.goto(`${base}?lang=en&shell=lab-classic#m=free-fall`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__labCapture?.switchModel, null, { timeout: 90000 });
  await page.evaluate(async () => { await window.__labCapture.switchModel('free-fall'); });
  await page.waitForTimeout(400);
  const shots = path.join(root, 'shots');
  fs.mkdirSync(shots, { recursive: true });
  const closedPath = path.join(shots, 'narrow-params-closed-390.png');
  const openPath = path.join(shots, 'narrow-params-open-390.png');
  await page.screenshot({ path: closedPath });
  await page.click('#btn-params');
  await page.waitForTimeout(300);
  await page.screenshot({ path: openPath });
  const floor = await page.evaluate(() => {
    const wrap = document.querySelector('.canvas-wrap');
    return wrap?.getBoundingClientRect()?.height || 0;
  });
  if (floor < 120) failures.push(`docs shot canvas floor ${floor}`);
  if (process.env.CAPTURE_DOCS === '1') {
    const docs = path.join(root, 'docs', 'assets');
    fs.mkdirSync(docs, { recursive: true });
    fs.copyFileSync(closedPath, path.join(docs, 'narrow-params-closed-390.png'));
    fs.copyFileSync(openPath, path.join(docs, 'narrow-params-open-390.png'));
    console.log('CAPTURE_DOCS: wrote docs/assets/narrow-params-*-390.png');
  }
});

await browser.close();

/** Attach TTI / network advisory lines (edge=) when prior CI steps wrote artifacts. */
function readJson(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(outDir, name), 'utf8'));
  } catch {
    return null;
  }
}
const tti = readJson('pages-tti-sw.json');
const net = readJson('pages-network-summary.json');
const stampLive = readJson('pages-live-stamp.json') || readJson('pages-mobile-stamp.json');
const advisory = [];
if (tti?.cold?.firstHandP95 != null) {
  advisory.push(`tti firstHandP95=${tti.cold.firstHandP95}ms cdnJitter=${!!tti.cdnJitter}`);
}
if (net?.bootMsP95 != null) {
  const edge = Array.isArray(net.bootEdgeRegions)
    ? (net.bootEdgeRegions.find(Boolean) || '')
    : (net.spikeEdge || '');
  advisory.push(
    `network bootMsP95=${net.bootMsP95}`
    + (edge ? ` edge=${edge}` : ' edge=(none)'),
  );
}
if (stampLive?.js) advisory.push(`stamp js=${stampLive.js} css=${stampLive.css || ''}`);

const report = { base, failures, advisory, tti: tti?.cold || null, network: net || null, stamp: stampLive };
fs.writeFileSync(path.join(outDir, 'pages-mobile-smoke.json'), `${JSON.stringify(report, null, 2)}\n`);
if (advisory.length) console.log('pages-mobile advisory:', advisory.join(' · '));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('pages-mobile smoke ok');
