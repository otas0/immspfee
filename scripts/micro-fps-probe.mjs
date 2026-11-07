#!/usr/bin/env node
/**
 * Measure denser microscope WebGL mesh FPS (lab-microscope3d).
 * Also records projector chrome with catalog r016 (2D) and notes the WebGL
 * shell under a projector-sized viewport separately.
 * Requires lab server + Playwright Chromium.
 * Advisory only: writes artifacts/micro-fps-advisory.json and never exits 1.
 * Hard phone gate lives in test:micro-camera (fps390 / tess 0.55).
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

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
  const origin = base.replace(/\/?$/, '/');
  const micro = await measure(
    'microscope3d',
    `${origin}?shell=lab-microscope3d&lang=en&_=${Date.now()}`,
  );
  const projectorR016 = await measure(
    'projector-r016',
    `${origin}?shell=lab-projector&lang=en&m=${encodeURIComponent('r016-显微镜')}&_=${Date.now()}`,
  );
  // Same WebGL mesh under a classroom projector viewport (1920×1080).
  const microProjectorViewport = await measure(
    'microscope3d-projector-viewport',
    `${origin}?shell=lab-microscope3d&lang=en&_=${Date.now()}`,
    { width: 1920, height: 1080 },
  );
  console.log('FPS advisory tess: phone microTess 0.55 / tablet 0.72 (contract: test:micro-camera @390)');
  const advisory = {
    kind: 'advisory',
    note: '1280 denser-mesh FPS is advisory (software-GL CI). Hard gate is test:micro-camera fps390.',
    minFps,
    microFps: Number(micro.fps.toFixed(1)),
    projectorR016Fps: Number(projectorR016.fps.toFixed(1)),
    microProjectorViewportFps: Number(microProjectorViewport.fps.toFixed(1)),
    belowGate: !(micro.fps > minFps) || !(microProjectorViewport.fps > minFps),
  };
  // Always write under repo `artifacts/` (cwd), never under a URL-shaped path.
  const dir = path.join(process.cwd(), 'artifacts');
  mkdirSync(dir, { recursive: true });
  const outFile = path.join(dir, 'micro-fps-advisory.json');
  writeFileSync(outFile, `${JSON.stringify(advisory, null, 2)}\n`);
  console.log('micro-fps-advisory', JSON.stringify(advisory));
  console.log('micro-fps-advisory-path', outFile);
  if (advisory.belowGate) {
    console.warn('ADVISORY microscope 1280 FPS below soft gate (does not fail CI)', {
      fps: micro.fps,
      projectorViewport: microProjectorViewport.fps,
      minFps,
    });
  } else {
    console.log('micro-fps-probe ok', advisory);
  }
} finally {
  await browser.close();
}
