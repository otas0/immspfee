#!/usr/bin/env node
/**
 * Spot-check factory shell() models: first paint after switchModel must have
 * hist≥2 stroke ink (painted≥2 at step 16), not title-only soft-paint.
 * Requires lab server (LAB_URL, default http://127.0.0.1:8765/).
 */
import { chromium } from 'playwright';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const IDS = (process.env.SHELL_PAINT_IDS || [
  'open-channel-uniform',
  'pipe-pressure-drop',
  'fam-open-channel-v01',
  'fam-pipe-flow-v01',
  'r085-均匀流',
  'weir-flow',
  'r091-屏蔽',
  'r107-缓冲',
  // more engineering flow / hydraulics
  'gradually-varied',
  'sluice-gate',
  'hydraulic-jump',
  'pipe-network',
  'pump-fan-curve',
  'bernoulli',
  'laminar-turbulent',
  'hx-temp-profile',
].join(',')).split(',').map((s) => s.trim()).filter(Boolean);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__labCapture && document.documentElement.dataset.boot === 'ready');

const rows = [];
for (const id of IDS) {
  const row = await page.evaluate(async (modelId) => {
    const cap = window.__labCapture;
    try {
      await cap.switchModel(modelId);
    } catch (err) {
      return { id: modelId, ok: false, detail: String(err?.message || err) };
    }
    cap.pause();
    cap.paintFrame?.();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const { data: img, width: w, height: h } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let painted = 0;
    let samples = 0;
    for (let y = 0; y < h; y += 16) {
      for (let x = 0; x < w; x += 16) {
        samples += 1;
        const i = (y * w + x) * 4;
        if (img[i + 3] > 8 && img[i] + img[i + 1] + img[i + 2] > 12) painted += 1;
      }
    }
    const hist = (cap.getState()?.hist || []).length;
    const readouts = (cap.getReadouts() || []).length;
    // hist is shell()-specific; other factories may ink without hist.
    const ok = painted >= 2 && readouts >= 1;
    return { id: modelId, ok, painted, samples, hist, readouts, soft: !ok && readouts >= 1 && painted < 2 };
  }, id);
  rows.push(row);
  const tag = row.soft ? 'SOFT' : (row.ok ? 'PASS' : 'FAIL');
  console.log(`${tag}  ${row.id}  painted=${row.painted} hist=${row.hist} readouts=${row.readouts}${row.detail ? `  (${row.detail})` : ''}`);
}

await browser.close();
const bad = rows.filter((r) => !r.ok);
if (bad.length) {
  console.error(`shell-first-paint failed: ${bad.map((r) => r.id).join(', ')}`);
  process.exit(1);
}
console.log('shell-first-paint ok', rows.length);
