#!/usr/bin/env node
/**
 * 100× immersion: oilBlend reaches ≥0.95 with getOilRiseElapsed in 0.3–0.6 s.
 * Rise is linear (~0.45 s), not an exponential approach.
 * Requires lab server (LAB_URL, default http://127.0.0.1:8765/).
 */
import { chromium } from 'playwright';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const url = `${base.replace(/\/?$/, '/')}?shell=lab-microscope3d&lang=en&_=${Date.now()}`;

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

const viewport = parseViewport();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport });

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(
    () => window.__labCapture && document.documentElement.dataset.stageMode === 'webgl3d',
    null,
    { timeout: 90000 },
  );
  await page.evaluate(() => {
    document.getElementById('micro-rail')?.classList.add('is-open');
  });
  await page.waitForTimeout(350);
  const before = await page.evaluate(() => {
    window.__labCapture.paintFrame?.();
    const stage = window.__labCapture.getWebglStage();
    return {
      obj: window.__labCapture.getParams()?.objective,
      blend: stage.getOilBlend(),
      rise: stage.getOilRiseSec(),
    };
  });
  if (!(Math.abs(before.rise - 0.45) < 1e-6)) fail(`getOilRiseSec ${before.rise} expected 0.45`);
  await page.click('#micro-obj [data-obj="100x"]', { timeout: 15000 });

  let sample = null;
  const deadline = Date.now() + 2500;
  while (Date.now() < deadline) {
    sample = await page.evaluate(() => {
      window.__labCapture.paintFrame?.();
      const stage = window.__labCapture.getWebglStage();
      const p = window.__labCapture.getParams() || {};
      return {
        obj: p.objective,
        blend: stage.getOilBlend(),
        elapsed: stage.getOilRiseElapsed(),
        rise: stage.getOilRiseSec(),
      };
    });
    if (sample.blend >= 0.95) break;
    await page.waitForTimeout(16);
  }
  console.log('oil-blend', JSON.stringify({ before, sample }));
  if (!sample || sample.obj !== '100x') fail(`objective did not stick at 100x (${sample?.obj})`);
  if (!(sample.blend >= 0.95)) fail(`oilBlend ${sample.blend} never reached 0.95`);
  if (!(sample.elapsed >= 0.3 && sample.elapsed <= 0.6)) {
    fail(`oil rise elapsed ${sample.elapsed}s outside 0.3–0.6 (blend ${sample.blend})`);
  }
  console.log('test:micro-oil ok');
} finally {
  await browser.close();
}
