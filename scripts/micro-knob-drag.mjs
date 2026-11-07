#!/usr/bin/env node
/**
 * Playwright: drag focusCoarse / focusFine / stageX / stageY / interpupillary
 * on ?shell=lab-microscope3d and assert params + rail outputs track.
 * Drags dispatch PointerEvents on the canvas (narrow-safe; overlays do not eat them).
 * VIEWPORT=WxH (default 1280x800).
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

/**
 * Pointer drag on a pick target. Client coordinates come from getHits(),
 * so a closed rail or a narrow layout cannot steal the event.
 */
async function dragHit(page, kind, dx, dy) {
  const result = await page.evaluate(({ kind, dx, dy }) => {
    window.__labCapture.paintFrame();
    const stage = window.__labCapture.getWebglStage();
    const hits = stage.getHits() || [];
    const hit = hits.find((h) => h.kind === kind && h.index === 0)
      || hits.find((h) => h.kind === kind);
    if (!hit) return { ok: false, reason: `no ${kind} hit` };
    const canvas = document.getElementById('canvas-webgl');
    const rect = canvas.getBoundingClientRect();
    const x0 = rect.left + hit.x;
    const y0 = rect.top + hit.y;
    const opts = (x, y, buttons) => ({
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: x,
      clientY: y,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons,
    });
    canvas.dispatchEvent(new PointerEvent('pointerdown', opts(x0, y0, 1)));
    const steps = 14;
    for (let i = 1; i <= steps; i += 1) {
      const x = x0 + (dx * i) / steps;
      const y = y0 + (dy * i) / steps;
      window.dispatchEvent(new PointerEvent('pointermove', opts(x, y, 1)));
    }
    window.dispatchEvent(new PointerEvent('pointerup', opts(x0 + dx, y0 + dy, 0)));
    window.__labCapture.paintFrame();
    return { ok: true, hit };
  }, { kind, dx, dy });
  if (!result?.ok) fail(result?.reason || `drag ${kind} failed`);
  return result.hit;
}

const viewport = parseViewport();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport });
console.log('micro-knobs viewport', `${viewport.width}x${viewport.height}`);

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
    return {
      focusZ: Number(p.focusZ_mm) || 0,
      WD: Number(p.WD_mm) || 0,
    };
  });
  await dragHit(page, 'focusCoarse', 0, -80);
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
    return { stageX: Number(p.stageX_mm) || 0 };
  });
  await dragHit(page, 'stageX', 90, 0);
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
    return {
      focusZ: Number(p.focusZ_mm) || 0,
      WD: Number(p.WD_mm) || 0,
    };
  });
  await dragHit(page, 'focusFine', 0, -100);
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

  await page.evaluate(() => {
    const p = window.__labCapture.getParams() || {};
    p.focusZ_mm = 2;
    window.__labCapture.paintFrame?.();
  });
  const beforeSat = await page.evaluate(() => {
    window.__labCapture.paintFrame();
    const p = window.__labCapture.getParams() || {};
    return {
      focusZ: Number(p.focusZ_mm) || 0,
      WD: Number(p.WD_mm) || 0,
    };
  });
  if (!(Math.abs(beforeSat.focusZ - 2) < 1e-6)) fail(`focusZ not saturated at 2 (${beforeSat.focusZ})`);
  await dragHit(page, 'focusFine', 0, -80);
  const afterSat = await page.evaluate(() => {
    window.__labCapture.paintFrame();
    const p = window.__labCapture.getParams() || {};
    return {
      focusZ: Number(p.focusZ_mm) || 0,
      WD: Number(p.WD_mm) || 0,
    };
  });
  if (!(Math.abs(afterSat.focusZ - 2) < 1e-6)) {
    fail(`fine at ceiling moved focusZ ${beforeSat.focusZ} → ${afterSat.focusZ}`);
  }
  if (!(Math.abs(afterSat.WD - beforeSat.WD) > 0.01)) {
    fail(`fine at ceiling did not move WD ${beforeSat.WD} → ${afterSat.WD}`);
  }
  console.log('focusFine@ceiling ok', {
    focusZ: afterSat.focusZ,
    WD: [beforeSat.WD, afterSat.WD],
  });

  const beforeY = await page.evaluate(() => {
    window.__labCapture.paintFrame();
    const p = window.__labCapture.getParams() || {};
    return { stageY: Number(p.stageY_mm) || 0 };
  });
  await dragHit(page, 'stageY', 0, 90);
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

  const beforeIpd = await page.evaluate(() => {
    window.__labCapture.paintFrame();
    const p = window.__labCapture.getParams() || {};
    return { ipd: Number(p.interpupillary_mm) || 0 };
  });
  await dragHit(page, 'interpupillary', 80, 0);
  const afterIpd = await page.evaluate(() => {
    window.__labCapture.paintFrame();
    const p = window.__labCapture.getParams() || {};
    return {
      ipd: Number(p.interpupillary_mm) || 0,
      ipdOut: document.getElementById('micro-ipd-out')?.textContent || '',
    };
  });
  if (!(Math.abs(afterIpd.ipd - beforeIpd.ipd) > 0.4)) {
    fail(`IPD unchanged ${beforeIpd.ipd} → ${afterIpd.ipd}`);
  }
  const ipdNum = parseFloat(afterIpd.ipdOut);
  if (!(Number.isFinite(ipdNum) && Math.abs(ipdNum - afterIpd.ipd) < 0.6)) {
    fail(`micro-ipd-out ${afterIpd.ipdOut} does not track IPD ${afterIpd.ipd}`);
  }
  console.log('interpupillary ok', {
    ipd: [beforeIpd.ipd, afterIpd.ipd],
    ipdOut: afterIpd.ipdOut,
  });
  console.log('test:micro-knobs ok');
} finally {
  await browser.close();
}
