#!/usr/bin/env node
/**
 * Measure denser microscope WebGL mesh FPS (lab-microscope3d).
 * Optional: also open projector shell briefly for chrome overhead baseline.
 * Requires lab server + Playwright Chromium.
 */
import { chromium } from 'playwright';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const seconds = Number(process.env.FPS_SECONDS) || 2.5;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

async function measure(label, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
  await page.waitForTimeout(800);
  const result = await page.evaluate(async (sec) => {
    const start = performance.now();
    let frames = 0;
    const endAt = start + sec * 1000;
    while (performance.now() < endAt) {
      window.__labCapture.paintFrame?.();
      frames += 1;
      await new Promise((r) => requestAnimationFrame(r));
    }
    const ms = performance.now() - start;
    return {
      frames,
      ms,
      fps: frames / (ms / 1000),
      shell: document.documentElement.dataset.shell,
      stageMode: document.documentElement.dataset.stageMode,
      asset: window.__LAB_ASSET_V || '',
    };
  }, seconds);
  console.log(label, JSON.stringify(result));
  return result;
}

try {
  const micro = await measure(
    'microscope3d',
    `${base.replace(/\/?$/, '/')}?shell=lab-microscope3d&lang=en&_=${Date.now()}`,
  );
  const projector = await measure(
    'projector-classic',
    `${base.replace(/\/?$/, '/')}?shell=lab-projector&lang=en&_=${Date.now()}`,
  );
  if (!(micro.fps > 20)) {
    console.error('FAIL microscope FPS too low', micro.fps);
    process.exit(1);
  }
  console.log('micro-fps-probe ok', {
    microFps: Number(micro.fps.toFixed(1)),
    projectorFps: Number(projector.fps.toFixed(1)),
  });
} finally {
  await browser.close();
}
