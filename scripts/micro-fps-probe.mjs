#!/usr/bin/env node
/**
 * Measure denser microscope WebGL mesh FPS (lab-microscope3d).
 * Also records projector chrome with catalog r016 (2D) and notes the WebGL
 * shell under a projector-sized viewport separately.
 * Requires lab server + Playwright Chromium.
 * Gate: microscope3d fps must be > MICRO_FPS_MIN (default 25).
 */
import { chromium } from 'playwright';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const seconds = Number(process.env.FPS_SECONDS) || 2.5;
const minFps = Number(process.env.MICRO_FPS_MIN) || 25;

const browser = await chromium.launch({ headless: true });

async function measure(label, url, viewport = { width: 1280, height: 800 }) {
  const page = await browser.newPage({ viewport });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
    await page.waitForTimeout(600);
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
        model: window.__labCapture.getModelId?.() || '',
        asset: window.__LAB_ASSET_V || '',
      };
    }, seconds);
    console.log(label, JSON.stringify(result));
    return result;
  } finally {
    await page.close();
  }
}

try {
  const root = base.replace(/\/?$/, '/');
  const micro = await measure(
    'microscope3d',
    `${root}?shell=lab-microscope3d&lang=en&_=${Date.now()}`,
  );
  const projectorR016 = await measure(
    'projector-r016',
    `${root}?shell=lab-projector&lang=en&m=${encodeURIComponent('r016-显微镜')}&_=${Date.now()}`,
  );
  // Same WebGL mesh under a classroom projector viewport (1920×1080).
  const microProjectorViewport = await measure(
    'microscope3d-projector-viewport',
    `${root}?shell=lab-microscope3d&lang=en&_=${Date.now()}`,
    { width: 1920, height: 1080 },
  );
  if (!(micro.fps > minFps)) {
    console.error('FAIL microscope FPS below gate', { fps: micro.fps, minFps });
    process.exit(1);
  }
  if (!(microProjectorViewport.fps > minFps)) {
    console.error('FAIL microscope projector-viewport FPS below gate', {
      fps: microProjectorViewport.fps,
      minFps,
    });
    process.exit(1);
  }
  console.log('micro-fps-probe ok', {
    microFps: Number(micro.fps.toFixed(1)),
    projectorR016Fps: Number(projectorR016.fps.toFixed(1)),
    microProjectorViewportFps: Number(microProjectorViewport.fps.toFixed(1)),
    minFps,
  });
} finally {
  await browser.close();
}
