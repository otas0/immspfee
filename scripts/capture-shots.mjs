#!/usr/bin/env node
/**
 * 纯画布 8 模型截图 → shots/0N-*.png（固定 2× DPR）
 * collision：等到 hits≥1；double-pendulum：先跑 ~1.2s 再截
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(root, 'shots');
fs.mkdirSync(shots, { recursive: true });

const MODELS = [
  ['free-fall', '01-free-fall.png'],
  ['projectile', '02-projectile.png'],
  ['spring', '03-spring.png'],
  ['pendulum', '04-pendulum.png'],
  ['collision', '05-collision.png'],
  ['double-pendulum', '06-double-pendulum.png'],
  ['wave', '07-wave.png'],
  ['heat', '08-heat.png'],
  ['pid-tune', '09-pid-tune.png'],
  ['root-locus', '10-root-locus.png'],
  ['logic-gates', '11-logic-gates.png'],
];

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';

async function dataUrlToFile(dataUrl, file) {
  const b64 = dataUrl.split(',', 2)[1];
  fs.writeFileSync(path.join(shots, file), Buffer.from(b64, 'base64'));
  console.log('wrote', file);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__labCapture);

for (const [id, file] of MODELS) {
  await page.evaluate(async (modelId) => {
    const cap = window.__labCapture;
    cap.switchModel(modelId);
    cap.play();
    if (modelId === 'collision') {
      const t0 = performance.now();
      while (performance.now() - t0 < 8000) {
        const hits = cap.getState()?.collisionCount || 0;
        if (hits >= 1) break;
        await new Promise((r) => setTimeout(r, 50));
      }
    } else if (modelId === 'double-pendulum') {
      await new Promise((r) => setTimeout(r, 2000));
    } else {
      await new Promise((r) => setTimeout(r, 550));
    }
    cap.pause();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, id);
  const png = await page.evaluate(() => window.__labCapture.canvasPng());
  await dataUrlToFile(png, file);
}

await page.evaluate(async () => {
  window.__labCapture.switchModel('free-fall');
  await new Promise((r) => setTimeout(r, 400));
  window.__labCapture.pause();
});
const composed = await page.evaluate(() => window.__labCapture.composedPng(true, true));
await dataUrlToFile(composed, 'export-framed-readouts.png');

const check = await page.evaluate(() => ({
  canvasW: document.getElementById('canvas').width,
  canvasH: document.getElementById('canvas').height,
  composedLen: window.__labCapture.composedPng(true, true).length,
  readouts: window.__labCapture.getReadouts()?.length || 0,
}));
console.log('export check', check);
if (check.canvasW % 2 !== 0 && check.canvasW < 100) {
  console.warn('unexpected canvas size', check);
}
if (!check.composedLen || check.composedLen < 1000 || check.readouts < 1) {
  console.error('export validation failed');
  process.exit(1);
}

await browser.close();
console.log('capture done');
