#!/usr/bin/env node
/**
 * model-contract → Playwright 画布抽检：对代表性模型 draw 后采样非空像素。
 * 需先 npm start（或 LAB_URL）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });

const SAMPLE = [
  'free-fall', 'projectile', 'spring', 'lens', 'reflection-refraction',
  'dijkstra', 'logic-gates', 'sorting', 'bfs-grid', 'rc-circuit',
  'inclined-plane', 'collision', 'wave', 'heat', 'pendulum',
];

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__labCapture);

const failed = [];
const report = [];

for (const id of SAMPLE) {
  const row = await page.evaluate(async (modelId) => {
    const cap = window.__labCapture;
    try {
      cap.switchModel(modelId);
      cap.pause();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const canvas = document.getElementById('canvas');
      if (!canvas) return { id: modelId, ok: false, detail: 'no canvas' };
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      if (!w || !h) return { id: modelId, ok: false, detail: 'empty size' };
      const img = ctx.getImageData(0, 0, w, h).data;
      let painted = 0;
      const step = 16;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          if (img[i + 3] > 8 && (img[i] + img[i + 1] + img[i + 2]) > 12) painted += 1;
        }
      }
      const readouts = (cap.getReadouts() || []).length;
      const ok = painted >= 3 && readouts >= 1;
      return { id: modelId, ok, painted, readouts, detail: ok ? '' : `painted=${painted} readouts=${readouts}` };
    } catch (err) {
      return { id: modelId, ok: false, detail: err.message };
    }
  }, id);
  report.push(row);
  if (!row.ok) failed.push(row.id);
  console.log(`${row.ok ? 'PASS' : 'FAIL'}  draw-sample ${row.id}${row.detail ? `  (${row.detail})` : ''}`);
}

await browser.close();

const payload = {
  generatedAt: new Date().toISOString(),
  sample: SAMPLE,
  failedModelIds: failed,
  report,
};
fs.writeFileSync(path.join(outDir, 'contract-browser.json'), `${JSON.stringify(payload, null, 2)}\n`);
if (failed.length) {
  fs.writeFileSync(path.join(outDir, 'contract-failed-ids.txt'), `${failed.join('\n')}\n`);
  console.error(`failed ${failed.length}: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`\n${SAMPLE.length - failed.length}/${SAMPLE.length} draw samples ok`);
