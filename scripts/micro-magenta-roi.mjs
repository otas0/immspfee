#!/usr/bin/env node
/**
 * WebKit: pixel-sample the active-objective magenta activity ring (ROI around
 * the obj hit). Avoids relying only on overlay labels / getHits metadata.
 * Requires lab server (LAB_URL) + Playwright WebKit.
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

function sampleMagenta(png, cx, cy, radius) {
  let magenta = 0;
  let total = 0;
  const r0 = Math.max(8, Math.round(radius));
  for (let y = cy - r0; y <= cy + r0; y += 1) {
    for (let x = cx - r0; x <= cx + r0; x += 1) {
      if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (d > r0 || d < r0 * 0.22) continue; // activity-collar annulus
      const i = (png.width * y + x) << 2;
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];
      total += 1;
      // Magenta / hot-pink activity collar (distinct from yellow/blue DIN bands).
      if (r > 120 && b > 70 && g < r * 0.78 && (r - g) > 28 && (b - g) > 8) magenta += 1;
    }
  }
  return { magenta, total, frac: total ? magenta / total : 0 };
}

const browser = await (useWebkit ? webkit : chromium).launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
console.log('micro-magenta browser', useWebkit ? 'webkit' : 'chromium');

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
  });
  await page.waitForTimeout(150);
  await page.click('#micro-obj [data-obj="40x"]');
  await page.evaluate(() => {
    window.__labCapture.pause?.();
    for (let i = 0; i < 4; i += 1) window.__labCapture.paintFrame?.();
  });
  const hit = await page.evaluate(() => {
    const stage = window.__labCapture.getWebglStage();
    const canvas = document.getElementById('canvas-webgl');
    const rect = canvas.getBoundingClientRect();
    const h = (stage.getHits() || []).find((row) => row.kind === 'obj' && row.index === 2); // 40x
    const active = (stage.getOverlayLabels?.() || []).find((l) => l.role === 'obj' && l.active);
    return {
      hit: h,
      active: active?.text || '',
      canvas: {
        left: rect.left,
        top: rect.top,
        w: canvas.width,
        h: canvas.height,
        cw: canvas.clientWidth,
        ch: canvas.clientHeight,
      },
    };
  });
  if (!hit.hit) fail('no 40× obj hit');
  const shotPath = path.join(outDir, 'shell-micro-magenta-roi-webkit.png');
  await page.locator('#canvas-webgl').screenshot({ path: shotPath });
  const png = PNG.sync.read(fs.readFileSync(shotPath));
  // Map CSS hit → buffer pixels.
  const sx = png.width / Math.max(hit.canvas.cw, 1);
  const sy = png.height / Math.max(hit.canvas.ch, 1);
  const cx = Math.round(hit.hit.x * sx);
  // Magenta collar sits above the objective body — try a few vertical offsets.
  let best = { magenta: 0, total: 0, frac: 0, cy: 0 };
  for (const lift of [8, 16, 24, 32, 40]) {
    const cy = Math.round((hit.hit.y - lift) * sy);
    const sample = sampleMagenta(png, cx, cy, Math.round(hit.hit.r * sx * 1.05));
    if (sample.frac > best.frac) best = { ...sample, cy };
  }
  console.log('magenta-roi', JSON.stringify({
    active: hit.active,
    cx,
    cy: best.cy,
    magenta: best.magenta,
    total: best.total,
    frac: best.frac,
    shot: path.relative(root, shotPath),
  }));
  if (!(best.total > 40 && best.frac > 0.03 && best.magenta >= 40)) {
    fail(`magenta fraction too low frac=${best.frac.toFixed(4)} total=${best.total} magenta=${best.magenta}`);
  }
  console.log('test:micro-magenta ok');
} finally {
  await browser.close();
}
