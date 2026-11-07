#!/usr/bin/env node
/**
 * Pixel-sample the active-objective magenta activity collar via getActivityRing().
 * Chromium by default; MICRO_BROWSER=webkit selects WebKit.
 * VIEWPORT=WxH (default 1280x800). Opens the optical rail before clicking 40×.
 * Requires lab server (LAB_URL) + Playwright.
 */
import { chromium, webkit } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const url = `${base.replace(/\/?$/, '/')}?shell=lab-microscope3d&lang=en&_=${Date.now()}`;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'shots');
fs.mkdirSync(outDir, { recursive: true });
const useWebkit = process.env.MICRO_BROWSER === 'webkit';

function fail(msg) {
  console.error('FAIL', msg);
  process.exit(1);
}

function parseViewport() {
  const raw = process.env.VIEWPORT || '1280x800';
  const m = /^(\d+)x(\d+)$/.exec(raw);
  if (!m) fail(`VIEWPORT must be WxH, got ${raw}`);
  return { width: Number(m[1]), height: Number(m[2]) };
}

function sampleMagenta(png, cx, cy, radius) {
  let magenta = 0;
  let total = 0;
  const r0 = Math.max(6, Math.round(radius));
  for (let y = cy - r0; y <= cy + r0; y += 1) {
    for (let x = cx - r0; x <= cx + r0; x += 1) {
      if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (d > r0 || d < r0 * 0.22) continue;
      const i = (png.width * y + x) << 2;
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];
      total += 1;
      if (r > 120 && b > 70 && g < r * 0.78 && (r - g) > 28 && (b - g) > 8) magenta += 1;
    }
  }
  return { magenta, total, frac: total ? magenta / total : 0 };
}

const viewport = parseViewport();
const browser = await (useWebkit ? webkit : chromium).launch({ headless: true });
const page = await browser.newPage({ viewport });
console.log('micro-magenta browser', useWebkit ? 'webkit' : 'chromium', `${viewport.width}x${viewport.height}`);

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(
    () => window.__labCapture && document.documentElement.dataset.stageMode === 'webgl3d',
    null,
    { timeout: 90000 },
  );
  await page.evaluate(() => {
    window.__labCapture.pause?.();
    const p = window.__labCapture.getParams?.() || {};
    p.showLabels = 1;
    p.lampOn = 1;
    window.__labCapture.paintFrame?.();
    document.getElementById('micro-rail')?.classList.add('is-open');
  });
  await page.waitForTimeout(350);
  await page.click('#micro-obj [data-obj="40x"]', { timeout: 15000 });
  // Rail is only needed to reach the 40× chip. On a phone it covers the barrel.
  // Overview orbit hides the −Z collar face (zero magenta pixels); Turret faces it.
  await page.evaluate(() => {
    document.getElementById('micro-rail')?.classList.remove('is-open');
    const stage = window.__labCapture.getWebglStage?.();
    stage?.setCameraView?.('turret');
    document.querySelector('#micro-views [data-view="turret"]')?.classList.add('is-active');
  });
  await page.waitForTimeout(360);
  const ring = await page.evaluate(() => {
    window.__labCapture.pause?.();
    for (let i = 0; i < 4; i += 1) window.__labCapture.paintFrame?.();
    const stage = window.__labCapture.getWebglStage();
    const canvas = document.getElementById('canvas-webgl');
    const rect = canvas.getBoundingClientRect();
    return {
      ring: stage.getActivityRing?.() || null,
      obj: window.__labCapture.getParams()?.objective,
      view: stage.getCameraState?.()?.view || null,
      canvas: {
        w: canvas.width,
        h: canvas.height,
        cw: canvas.clientWidth,
        ch: canvas.clientHeight,
        left: rect.left,
        top: rect.top,
      },
    };
  });
  if (ring.obj !== '40x') fail(`objective is ${ring.obj}, expected 40x`);
  if (!ring.ring || !Number.isFinite(ring.ring.x) || !Number.isFinite(ring.ring.y)) {
    fail(`getActivityRing missing ${JSON.stringify(ring.ring)}`);
  }
  const shotName = `shell-micro-magenta-roi-${viewport.width}${useWebkit ? '-webkit' : ''}.png`;
  const shotPath = path.join(outDir, shotName);
  await page.locator('#canvas-webgl').screenshot({ path: shotPath });
  const png = PNG.sync.read(fs.readFileSync(shotPath));
  const sx = png.width / Math.max(ring.canvas.cw, 1);
  const sy = png.height / Math.max(ring.canvas.ch, 1);
  const cx = Math.round(ring.ring.x * sx);
  const cy = Math.round(ring.ring.y * sy);
  const baseR = Math.max(6, ring.ring.r * sx);
  let best = { magenta: 0, total: 0, frac: 0, r: baseR };
  for (const scale of [1, 0.72, 1.25]) {
    const sample = sampleMagenta(png, cx, cy, baseR * scale);
    if (sample.magenta > best.magenta || (sample.magenta === best.magenta && sample.total > best.total)) {
      best = { ...sample, r: baseR * scale };
    }
  }
  console.log('magenta-roi', JSON.stringify({
    cx,
    cy,
    ring: ring.ring,
    magenta: best.magenta,
    total: best.total,
    frac: best.frac,
    shot: path.relative(root, shotPath),
  }));
  const narrow = viewport.width <= 480;
  const gate = narrow
    ? { total: 8, frac: 0.008, magenta: 6 }
    : { total: 40, frac: 0.03, magenta: 40 };
  if (!(best.total > gate.total && best.frac > gate.frac && best.magenta >= gate.magenta)) {
    fail(`magenta fraction too low frac=${best.frac.toFixed(4)} total=${best.total} magenta=${best.magenta} gate=${JSON.stringify(gate)}`);
  }
  console.log('test:micro-magenta ok');
} finally {
  await browser.close();
}
