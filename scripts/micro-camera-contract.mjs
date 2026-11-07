#!/usr/bin/env node
/**
 * Microscope camera contracts:
 *  - default showLabels=0, brand B/W chips present
 *  - WASD hold moves yaw; keyup clears heldKeys (no sticky)
 *  - window blur clears heldKeys
 *  - Turret / Lamp / Condenser / Side presets on-canvas
 *  - showLabels=0 + focusCoarse hover → one temporary caption (zh 粗调)
 * VIEWPORT=WxH (default 390x844). MICRO_BROWSER=webkit optional.
 */
import { chromium, webkit } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const url = `${base.replace(/\/?$/, '/')}?shell=lab-microscope3d&lang=zh&_=${Date.now()}`;
const useWebkit = process.env.MICRO_BROWSER === 'webkit';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(msg) {
  console.error('FAIL', msg);
  process.exit(1);
}

function parseViewport() {
  const raw = process.env.VIEWPORT || '390x844';
  const m = /^(\d+)x(\d+)$/.exec(raw);
  if (!m) fail(`VIEWPORT must be WxH, got ${raw}`);
  return { width: Number(m[1]), height: Number(m[2]) };
}

const viewport = parseViewport();
console.log('micro-camera browser', useWebkit ? 'webkit' : 'chromium', `${viewport.width}x${viewport.height}`);
const browser = await (useWebkit ? webkit : chromium).launch({ headless: true });
const page = await browser.newPage({ viewport });

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(
    () => window.__labCapture && document.documentElement.dataset.stageMode === 'webgl3d',
    null,
    { timeout: 90000 },
  );
  await page.waitForFunction(
    () => {
      const s = window.__labCapture?.getWebglStage?.();
      return s && typeof s.handleCameraKey === 'function' && typeof s.getHeldCameraKeys === 'function';
    },
    null,
    { timeout: 30000 },
  );

  const chrome = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const chips = [...document.querySelectorAll('#micro-views [data-view]')].map((el) => el.dataset.view);
    const host = document.getElementById('micro-gl-labels');
    return {
      accent: cs.getPropertyValue('--micro-accent').trim(),
      stage: cs.getPropertyValue('--micro-stage').trim(),
      chips,
      labelsOn: Number(window.__labCapture.getParams()?.showLabels) !== 0,
      standingCaps: host ? host.querySelectorAll('.micro-cap').length : -1,
    };
  });
  console.log('chrome', JSON.stringify(chrome));
  if (!(chrome.accent === '#ffffff' || chrome.accent === '#fff')) fail(`accent ${chrome.accent}`);
  if (!(chrome.stage === '#000000' || chrome.stage === '#000')) fail(`stage ${chrome.stage}`);
  for (const id of ['free', 'turret', 'lamp', 'condenser', 'side']) {
    if (!chrome.chips.includes(id)) fail(`missing chip ${id}`);
  }
  if (chrome.labelsOn) fail('labels should default off');

  const wasd = await page.evaluate(async () => {
    const stage = window.__labCapture.getWebglStage();
    const before = stage.getCameraState();
    stage.handleCameraKey(new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', bubbles: true }));
    const heldDown = stage.getHeldCameraKeys();
    const mid = stage.getCameraState();
    for (let i = 0; i < 10; i += 1) {
      window.__labCapture.paintFrame?.();
      await new Promise((r) => requestAnimationFrame(r));
    }
    const afterHold = stage.getCameraState();
    stage.handleCameraKey(new KeyboardEvent('keyup', { key: 'd', code: 'KeyD', bubbles: true }));
    const heldUp = stage.getHeldCameraKeys();
    const yaw0 = afterHold.yaw;
    for (let i = 0; i < 8; i += 1) {
      window.__labCapture.paintFrame?.();
      await new Promise((r) => requestAnimationFrame(r));
    }
    const afterRelease = stage.getCameraState();
    return {
      heldDown,
      heldUp,
      yawNudge: Math.abs(mid.yaw - before.yaw),
      yawHold: Math.abs(afterHold.yaw - before.yaw),
      yawDrift: Math.abs(afterRelease.yaw - yaw0),
    };
  });
  console.log('wasd', JSON.stringify(wasd));
  if (!wasd.heldDown.includes('yawRight')) fail(`hold ${wasd.heldDown}`);
  if (wasd.heldUp.length) fail(`sticky ${JSON.stringify(wasd.heldUp)}`);
  if (!(wasd.yawNudge > 0.01)) fail(`no yaw ${wasd.yawNudge}`);
  if (!(wasd.yawDrift < 0.005)) fail(`drift ${wasd.yawDrift}`);

  const blur = await page.evaluate(() => {
    const stage = window.__labCapture.getWebglStage();
    stage.handleCameraKey(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', bubbles: true }));
    const before = stage.getHeldCameraKeys();
    window.dispatchEvent(new Event('blur'));
    return { before, after: stage.getHeldCameraKeys() };
  });
  console.log('blur', JSON.stringify(blur));
  if (!blur.before.includes('dollyIn')) fail(`blur setup ${blur.before}`);
  if (blur.after.length) fail(`blur sticky ${JSON.stringify(blur.after)}`);

  const presets = await page.evaluate(() => {
    const stage = window.__labCapture.getWebglStage();
    const canvas = document.getElementById('canvas-webgl');
    const w = canvas?.clientWidth || 1;
    const h = canvas?.clientHeight || 1;
    const inView = (p) => p && p.x > 4 && p.y > 4 && p.x < w - 4 && p.y < h - 4;
    const out = {};
    for (const id of ['turret', 'lamp', 'condenser', 'side']) {
      stage.setCameraView(id);
      for (let i = 0; i < 4; i += 1) window.__labCapture.paintFrame?.();
      const ring = stage.getActivityRing?.();
      const hits = stage.getHits?.() || [];
      const lamp = hits.find((x) => x.kind === 'lamp');
      const cond = hits.find((x) => x.kind === 'condenser');
      const stageHit = hits.find((x) => x.kind === 'stageX' || x.kind === 'immersion');
      out[id] = {
        ringOk: !!(ring && inView(ring)),
        lampOk: !!(lamp && inView(lamp)),
        condOk: !!(cond && inView(cond)),
        stageOk: !!(stageHit && inView(stageHit)),
      };
    }
    return out;
  });
  console.log('presets', JSON.stringify(presets));
  if (!presets.turret?.ringOk) fail(`turret ${JSON.stringify(presets.turret)}`);
  if (!presets.lamp?.lampOk) fail(`lamp ${JSON.stringify(presets.lamp)}`);
  if (!presets.condenser?.condOk) fail(`condenser ${JSON.stringify(presets.condenser)}`);
  if (!(presets.side?.ringOk || presets.side?.stageOk)) fail(`side ${JSON.stringify(presets.side)}`);

  await page.evaluate(() => {
    document.getElementById('micro-rail')?.classList.add('is-open');
    document.querySelector('#micro-labels [data-labels="0"]')?.click();
  });
  const hover = await page.evaluate(() => {
    const stage = window.__labCapture.getWebglStage();
    stage.setCameraView('overview');
    for (let i = 0; i < 4; i += 1) window.__labCapture.paintFrame?.();
    const hit = stage.getHits().find((h) => h.kind === 'focusCoarse');
    const canvas = document.getElementById('canvas-webgl');
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent('pointermove', {
      clientX: rect.left + hit.x,
      clientY: rect.top + hit.y,
      bubbles: true,
    }));
    for (let i = 0; i < 3; i += 1) window.__labCapture.paintFrame?.();
    const labels = stage.getOverlayLabels() || [];
    return { showLabels: window.__labCapture.getParams().showLabels, n: labels.length, texts: labels.map((l) => l.text) };
  });
  console.log('hover', JSON.stringify(hover));
  if (Number(hover.showLabels) !== 0) fail(`labels ${hover.showLabels}`);
  if (hover.n !== 1) fail(`caption n=${hover.n}`);
  if (!hover.texts.some((t) => t.includes('粗调') || t === 'Coarse')) fail(`texts ${hover.texts}`);

  // NA → Abbe irisOpen drives condenser second-lens radii (meshDynamicKey includes irisOpen).
  // Use 40× so NAcap≈0.65; 10× clamps 0.65 → ~0.25 and the delta collapses.
  await page.evaluate(() => {
    document.getElementById('micro-rail')?.classList.add('is-open');
  });
  await page.click('#micro-obj [data-obj="40x"]', { timeout: 15000 }).catch(() => {});
  const naLens = await page.evaluate(() => {
    document.getElementById('micro-rail')?.classList.remove('is-open');
    const stage = window.__labCapture.getWebglStage();
    stage.setCameraView('condenser');
    window.__labCapture.setParam?.('NA', 0.15);
    for (let i = 0; i < 4; i += 1) window.__labCapture.paintFrame?.();
    const keyLow = stage.getMeshDynamicKey?.() || null;
    const naLow = window.__labCapture.getParams()?.NA;
    window.__labCapture.setParam?.('NA', 0.65);
    for (let i = 0; i < 4; i += 1) window.__labCapture.paintFrame?.();
    const keyHigh = stage.getMeshDynamicKey?.() || null;
    const naHigh = window.__labCapture.getParams()?.NA;
    return { keyLow, keyHigh, naLow, naHigh, obj: window.__labCapture.getParams()?.objective };
  });
  console.log('naLens', JSON.stringify(naLens));
  if (naLens.obj !== '40x') fail(`expected 40x got ${naLens.obj}`);
  if (!(Number(naLens.naLow) < 0.25)) fail(`NA low ${naLens.naLow}`);
  if (!(Number(naLens.naHigh) > 0.55)) fail(`NA high ${naLens.naHigh}`);
  if (!naLens.keyLow || !naLens.keyHigh || naLens.keyLow === naLens.keyHigh) {
    fail(`NA did not rebuild condenser mesh ${JSON.stringify(naLens)}`);
  }
  const meshApi = await page.evaluate(() => typeof window.__labCapture.getWebglStage?.()?.getMeshDynamicKey);
  if (meshApi !== 'function') fail(`getMeshDynamicKey runtime ${meshApi}`);

  // Reset optics must restore catalog defaults — not keep-params re-run.
  await page.evaluate(() => {
    window.__labCapture.setParam?.('tubeL_mm', 180);
    window.__labCapture.setParam?.('focusZ_mm', 1.2);
    window.__labCapture.setParam?.('NA', 0.4);
  });
  await page.click('#btn-micro-reset', { timeout: 10000 });
  await page.waitForTimeout(200);
  const resetOptics = await page.evaluate(() => {
    const p = window.__labCapture.getParams?.() || {};
    return {
      tube: p.tubeL_mm,
      focus: p.focusZ_mm,
      obj: p.objective,
      NA: p.NA,
      hasResetOptics: typeof window.__labCapture.resetOptics === 'function',
      hasRestore: typeof window.__labCapture.restoreSafeDefaults === 'function',
    };
  });
  console.log('resetOptics', JSON.stringify(resetOptics));
  if (!resetOptics.hasResetOptics && !resetOptics.hasRestore) fail('resetOptics API missing');
  if (!(Number(resetOptics.tube) === 160)) fail(`tube after reset ${resetOptics.tube}`);
  if (!(Math.abs(Number(resetOptics.focus) || 0) < 1e-9)) fail(`focus after reset ${resetOptics.focus}`);
  // 40× was selected earlier; restore defaults returns catalog 10×.
  if (resetOptics.obj !== '10x') fail(`obj after reset ${resetOptics.obj}`);

  let fps = null;
  if (viewport.width <= 420) {
    fps = await page.evaluate(async () => {
      const start = performance.now();
      let frames = 0;
      const endAt = start + 1500;
      while (performance.now() < endAt) {
        window.__labCapture.paintFrame?.();
        frames += 1;
        await new Promise((r) => requestAnimationFrame(r));
      }
      return frames / ((performance.now() - start) / 1000);
    });
    console.log('fps390', Number(fps.toFixed(1)));
    const minFps = Number(process.env.MICRO_CAMERA_FPS_MIN || 24);
    const hard = process.env.MICRO_CAMERA_FPS_HARD === '1'
      || (process.env.MICRO_CAMERA_FPS_HARD !== '0' && !process.env.CI);
    if (!(fps > minFps)) {
      const msg = `fps390 ${fps} ≤ ${minFps}`;
      if (hard) fail(msg);
      else console.warn(`advisory: ${msg} (set MICRO_CAMERA_FPS_HARD=1 to fail)`);
    }
  }

  const shot = path.join(root, 'shots', `shell-micro-camera-${viewport.width}${useWebkit ? '-webkit' : ''}.png`);
  fs.mkdirSync(path.dirname(shot), { recursive: true });
  await page.screenshot({ path: shot, fullPage: false });
  console.log('wrote', path.relative(root, shot));
  console.log('test:micro-camera ok');
} finally {
  await browser.close();
}
