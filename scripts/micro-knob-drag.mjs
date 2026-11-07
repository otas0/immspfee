#!/usr/bin/env node
/**
 * Playwright: drag focusCoarse / focusFine / stageX / stageY on
 * ?shell=lab-microscope3d and assert params + rail outputs track.
 * Requires lab server (LAB_URL, default http://127.0.0.1:8765/).
 */
import { chromium } from 'playwright';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const url = `${base.replace(/\/?$/, '/')}?shell=lab-microscope3d&lang=en&_=${Date.now()}`;

function fail(msg) {
  console.error('FAIL', msg);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 90000 });
  await page.waitForFunction(
    () => document.documentElement.dataset.stageMode === 'webgl3d'
      && document.documentElement.dataset.shell === 'lab-microscope3d',
    null,
    { timeout: 60000 },
  );
  await page.evaluate(() => {
    window.__labCapture.pause?.();
    window.__labCapture.paintFrame?.();
  });
  await page.waitForFunction(() => {
    const stage = window.__labCapture?.getWebglStage?.();
    return stage && typeof stage.getHits === 'function' && stage.getHits().length > 0;
  }, null, { timeout: 30000 });

  const beforeFocus = await page.evaluate(() => {
    window.__labCapture.paintFrame();
    const p = window.__labCapture.getParams() || {};
    const stage = window.__labCapture.getWebglStage();
    const hit = (stage.getHits() || []).find((h) => h.kind === 'focusCoarse');
    const canvas = document.getElementById('canvas-webgl');
    const rect = canvas.getBoundingClientRect();
    return {
      focusZ: Number(p.focusZ_mm) || 0,
      WD: Number(p.WD_mm) || 0,
      wdOut: document.getElementById('micro-wd-out')?.textContent || '',
      hit,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    };
  });
  if (!beforeFocus.hit) fail('no focusCoarse hit');

  const fx0 = beforeFocus.rect.left + beforeFocus.hit.x;
  const fy0 = beforeFocus.rect.top + beforeFocus.hit.y;
  await page.mouse.move(fx0, fy0);
  await page.mouse.down();
  await page.mouse.move(fx0, fy0 - 80, { steps: 12 });
  await page.mouse.up();

  const afterFocus = await page.evaluate(() => {
    window.__labCapture.paintFrame();
    const p = window.__labCapture.getParams() || {};
    return {
      focusZ: Number(p.focusZ_mm) || 0,
      WD: Number(p.WD_mm) || 0,
      wdOut: document.getElementById('micro-wd-out')?.textContent || '',
      focusOut: document.getElementById('micro-focus-out')?.textContent || '',
    };
  });

  if (!(Math.abs(afterFocus.focusZ - beforeFocus.focusZ) > 0.01)) {
    fail(`focusZ unchanged ${beforeFocus.focusZ} → ${afterFocus.focusZ}`);
  }
  if (!(Math.abs(afterFocus.WD - beforeFocus.WD) > 0.01)) {
    fail(`WD unchanged ${beforeFocus.WD} → ${afterFocus.WD}`);
  }
  const wdNum = parseFloat(afterFocus.wdOut);
  if (!(Number.isFinite(wdNum) && Math.abs(wdNum - afterFocus.WD) < 0.15)) {
    fail(`micro-wd-out ${afterFocus.wdOut} does not track WD ${afterFocus.WD}`);
  }
  const fzNum = parseFloat(afterFocus.focusOut);
  if (!(Number.isFinite(fzNum) && Math.abs(fzNum - afterFocus.focusZ) < 0.15)) {
    fail(`micro-focus-out ${afterFocus.focusOut} does not track focusZ ${afterFocus.focusZ}`);
  }
  console.log('focusCoarse ok', {
    focusZ: [beforeFocus.focusZ, afterFocus.focusZ],
    WD: [beforeFocus.WD, afterFocus.WD],
    wdOut: afterFocus.wdOut,
  });

  const beforeStage = await page.evaluate(() => {
    window.__labCapture.paintFrame();
    const p = window.__labCapture.getParams() || {};
    const stage = window.__labCapture.getWebglStage();
    const hit = (stage.getHits() || []).find((h) => h.kind === 'stageX');
    const canvas = document.getElementById('canvas-webgl');
    const rect = canvas.getBoundingClientRect();
    return {
      stageX: Number(p.stageX_mm) || 0,
      sxOut: document.getElementById('micro-stage-x-out')?.textContent || '',
      hit,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    };
  });
  if (!beforeStage.hit) fail('no stageX hit');

  const sx0 = beforeStage.rect.left + beforeStage.hit.x;
  const sy0 = beforeStage.rect.top + beforeStage.hit.y;
  await page.mouse.move(sx0, sy0);
  await page.mouse.down();
  await page.mouse.move(sx0 + 90, sy0, { steps: 12 });
  await page.mouse.up();

  const afterStage = await page.evaluate(() => {
    window.__labCapture.paintFrame();
    const p = window.__labCapture.getParams() || {};
    return {
      stageX: Number(p.stageX_mm) || 0,
      sxOut: document.getElementById('micro-stage-x-out')?.textContent || '',
    };
  });

  if (!(Math.abs(afterStage.stageX - beforeStage.stageX) > 0.2)) {
    fail(`stageX unchanged ${beforeStage.stageX} → ${afterStage.stageX}`);
  }
  const sxNum = parseFloat(afterStage.sxOut);
  if (!(Number.isFinite(sxNum) && Math.abs(sxNum - afterStage.stageX) < 0.6)) {
    fail(`micro-stage-x-out ${afterStage.sxOut} does not track stageX ${afterStage.stageX}`);
  }
  console.log('stageX ok', {
    stageX: [beforeStage.stageX, afterStage.stageX],
    sxOut: afterStage.sxOut,
  });

  const beforeFine = await page.evaluate(() => {
    window.__labCapture.paintFrame();
    const p = window.__labCapture.getParams() || {};
    const stage = window.__labCapture.getWebglStage();
    const hit = (stage.getHits() || []).find((h) => h.kind === 'focusFine');
    const canvas = document.getElementById('canvas-webgl');
    const rect = canvas.getBoundingClientRect();
    return {
      focusZ: Number(p.focusZ_mm) || 0,
      WD: Number(p.WD_mm) || 0,
      hit,
      rect: { left: rect.left, top: rect.top },
    };
  });
  if (!beforeFine.hit) fail('no focusFine hit');
  {
    const x = beforeFine.rect.left + beforeFine.hit.x;
    const y = beforeFine.rect.top + beforeFine.hit.y;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 100, { steps: 14 });
    await page.mouse.up();
  }
  const afterFine = await page.evaluate(() => {
    window.__labCapture.paintFrame();
    const p = window.__labCapture.getParams() || {};
    return {
      focusZ: Number(p.focusZ_mm) || 0,
      WD: Number(p.WD_mm) || 0,
      focusOut: document.getElementById('micro-focus-out')?.textContent || '',
    };
  });
  if (!(Math.abs(afterFine.focusZ - beforeFine.focusZ) > 0.005
    || Math.abs(afterFine.WD - beforeFine.WD) > 0.01)) {
    fail(`focusFine unchanged z=${beforeFine.focusZ}→${afterFine.focusZ} WD=${beforeFine.WD}→${afterFine.WD}`);
  }
  console.log('focusFine ok', {
    focusZ: [beforeFine.focusZ, afterFine.focusZ],
    WD: [beforeFine.WD, afterFine.WD],
  });

  const beforeY = await page.evaluate(() => {
    window.__labCapture.paintFrame();
    const p = window.__labCapture.getParams() || {};
    const stage = window.__labCapture.getWebglStage();
    const hit = (stage.getHits() || []).find((h) => h.kind === 'stageY');
    const canvas = document.getElementById('canvas-webgl');
    const rect = canvas.getBoundingClientRect();
    return {
      stageY: Number(p.stageY_mm) || 0,
      hit,
      rect: { left: rect.left, top: rect.top },
    };
  });
  if (!beforeY.hit) fail('no stageY hit');
  {
    const x = beforeY.rect.left + beforeY.hit.x;
    const y = beforeY.rect.top + beforeY.hit.y;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 90, { steps: 12 });
    await page.mouse.up();
  }
  const afterY = await page.evaluate(() => {
    window.__labCapture.paintFrame();
    const p = window.__labCapture.getParams() || {};
    return {
      stageY: Number(p.stageY_mm) || 0,
      syOut: document.getElementById('micro-stage-y-out')?.textContent || '',
    };
  });
  if (!(Math.abs(afterY.stageY - beforeY.stageY) > 0.2)) {
    fail(`stageY unchanged ${beforeY.stageY} → ${afterY.stageY}`);
  }
  const syNum = parseFloat(afterY.syOut);
  if (!(Number.isFinite(syNum) && Math.abs(syNum - afterY.stageY) < 0.6)) {
    fail(`micro-stage-y-out ${afterY.syOut} does not track stageY ${afterY.stageY}`);
  }
  console.log('stageY ok', {
    stageY: [beforeY.stageY, afterY.stageY],
    syOut: afterY.syOut,
  });
  console.log('test:micro-knobs ok');
} finally {
  await browser.close();
}
