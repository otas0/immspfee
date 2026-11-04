#!/usr/bin/env node
/**
 * 轻量扩展模型截图（可选，不进视觉基线）
 * 用法：npm start 后 npm run shots:extra
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'shots', 'extra');
fs.mkdirSync(outDir, { recursive: true });

const MODELS = [
  ['orbit', 'orbit.png'],
  ['lorentz', 'lorentz.png'],
  ['sorting', 'sorting.png'],
  ['bfs-grid', 'bfs-grid.png'],
  ['life', 'life.png'],
  ['cache-lru', 'cache-lru.png'],
  ['pipeline', 'pipeline.png'],
  ['fifo', 'fifo.png'],
  ['rc-circuit', 'rc-circuit.png'],
  ['rlc', 'rlc.png'],
];

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__labCapture);

for (const [id, file] of MODELS) {
  await page.evaluate(async (modelId) => {
    const cap = window.__labCapture;
    cap.switchModel(modelId);
    cap.play();
    await new Promise((r) => setTimeout(r, modelId === 'life' || modelId === 'bfs-grid' ? 900 : 550));
    cap.pause();
  }, id);
  const png = await page.evaluate(() => window.__labCapture.canvasPng());
  const b64 = png.split(',', 2)[1];
  fs.writeFileSync(path.join(outDir, file), Buffer.from(b64, 'base64'));
  console.log('wrote extra/', file);
}

await browser.close();
console.log('extra shots done →', outDir);
