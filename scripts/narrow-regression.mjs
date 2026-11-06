#!/usr/bin/env node
/**
 * Narrow-screen regression: drawer stays closed, the formula stays on screen,
 * assumption/caveat chrome stay off the stage, and Bohr canvas labels stay painted.
 * Requires the lab server (npm start) and Playwright Chromium.
 *
 * fillText hook installs only after ensureId/getModelId settles, so boot paint
 * races cannot couple with the hook. PAGE CRASH is a hard failure with model id.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(root, 'shots');
fs.mkdirSync(shots, { recursive: true });
const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';

const layout = [
  ['r018-玻尔模型', 'narrow-bohr-closed.png'],
  ['r003-爆炸反冲', 'narrow-recoil-closed.png'],
  ['neutron-diffusion', 'narrow-neutron-closed.png'],
];

const browser = await chromium.launch({ headless: true });
// dsf 1 avoids agent/CI OOM (dsf 2 previously SIGKILL'd / PAGE CRASH'd under load).
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });

let currentModelId = '';
page.on('crash', () => {
  const id = currentModelId || '(unknown)';
  console.error(`PAGE CRASH during narrow regression model=${id}`);
  process.exitCode = 1;
  throw new Error(`PAGE CRASH model=${id}`);
});
page.on('pageerror', (err) => {
  console.error(`pageerror model=${currentModelId || '(unknown)'}:`, err.message);
});

await page.addInitScript(() => {
  localStorage.setItem('physics-lab-locale-v1', 'en');
  localStorage.removeItem('physics-lab-auto-open-bench');
  localStorage.removeItem('physics-lab-folds-v1');
  localStorage.removeItem('physics-lab-folds');
  window.__installFillHook = () => {
    if (window.__fillHooked) return;
    window.__fillHooked = true;
    const orig = CanvasRenderingContext2D.prototype.fillText;
    window.__fillTexts = [];
    CanvasRenderingContext2D.prototype.fillText = function fillTextHook(text, ...rest) {
      if (window.__fillTexts.length < 400) window.__fillTexts.push(String(text));
      return orig.call(this, text, ...rest);
    };
  };
});

const failures = [];
async function openModel(id) {
  currentModelId = id;
  // Bohr EN packs + factory chunk can stall on slow CI / cold SW; give them headroom.
  // Override: NARROW_BOHR_MS=180000 npm run test:narrow
  const slowEn = id === 'r018-玻尔模型';
  const bohrMs = Number(process.env.NARROW_BOHR_MS || 120000);
  const bootMs = slowEn ? Math.max(90000, Math.floor(bohrMs * 0.75)) : 60000;
  const modelMs = slowEn ? bohrMs : 60000;
  await page.goto(`${base}?lang=en&narrow=${encodeURIComponent(id)}#m=${encodeURIComponent(id)}`, {
    waitUntil: 'domcontentloaded',
    timeout: bootMs,
  });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: bootMs });
  if (slowEn) {
    // Wait for EN locale pack / title so formula + toolbar do not race Han defaults.
    await page.waitForFunction(() => {
      const title = document.getElementById('toolbar-title')?.textContent || '';
      return title === 'Bohr Model' || title.includes('Bohr');
    }, null, { timeout: modelMs }).catch(() => {});
  }
  // Wait for ensureId + first switchModel before instrumenting canvas text.
  await page.waitForFunction((mid) => window.__labCapture.getModelId?.() === mid, id, { timeout: modelMs });
  await page.evaluate(() => window.__installFillHook?.());
  await page.evaluate(() => { window.__fillTexts = []; });
  await page.evaluate(async (mid) => {
    await window.__labCapture.switchModel(mid);
    window.__labCapture.paintFrame?.();
  }, id);
  await page.waitForTimeout(slowEn ? 800 : 400);
  await page.evaluate(() => window.__labCapture.paintFrame?.());
  await page.waitForTimeout(slowEn ? 200 : 100);
  await page.evaluate(() => {
    const side = document.getElementById('sidebar');
    if (side?.classList.contains('open')) document.getElementById('btn-menu')?.click();
  });
}

for (const [id, file] of layout) {
  await openModel(id);
  if (id === 'neutron-diffusion') {
    const formula = await page.evaluate(() => document.getElementById('shell-formula')?.textContent || '');
    if (!formula.startsWith('Equation ') || /[\u4e00-\u9fff]/.test(formula)) {
      failures.push(`lang=en formula Han/race on ${id}: ${JSON.stringify(formula)}`);
    }
  }
  if (id === 'r018-玻尔模型') {
    const title = await page.evaluate(() => document.getElementById('toolbar-title')?.textContent || '');
    if (title !== 'Bohr Model') {
      failures.push(`${id}: EN title race ${JSON.stringify(title)}`);
    }
  }
  const info = await page.evaluate(() => {
    const bench = document.getElementById('bench');
    const formula = document.getElementById('shell-formula');
    const fr = formula?.getBoundingClientRect();
    const br = bench?.getBoundingClientRect();
    const open = !!bench?.classList.contains('open');
    const covered = !!(open && fr && br && br.top < fr.bottom && br.bottom > fr.top && br.left < fr.right && br.right > fr.left);
    const off = !fr || fr.bottom < 0 || fr.top > window.innerHeight || fr.height < 8;
    const caveat = document.getElementById('shell-caveat');
    const fs = formula ? getComputedStyle(formula) : null;
    const cr = caveat?.getBoundingClientRect();
    return {
      open,
      covered,
      off,
      formula: formula?.textContent || '',
      assumptions: !!document.getElementById('shell-assumptions'),
      assumptionText: /Assumptions/.test(document.getElementById('model-shell')?.innerText || ''),
      formulaHan: /[\u4e00-\u9fff]/.test(formula?.textContent || ''),
      overflowY: fs?.overflowY || '',
      maxHeight: fs?.maxHeight || '',
      caveatClipped: !!(caveat && !caveat.hidden && caveat.scrollHeight > caveat.clientHeight + 1),
      caveatOnScreen: !!(cr && cr.height > 8 && cr.top >= 0 && cr.bottom <= window.innerHeight + 1),
      texts: window.__fillTexts || [],
      switchErr: window.__labLastSwitchError || null,
      canvas: (() => {
        const c = document.getElementById('canvas') || document.querySelector('canvas');
        return c ? { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight } : null;
      })(),
    };
  });
  const png = path.join(shots, file);
  await page.screenshot({ path: png });
  const bytes = fs.statSync(png).size;
  if (info.switchErr) failures.push(`${id}: switchModel error ${info.switchErr.message}`);
  if (info.open) failures.push(`${id}: drawer opened by default`);
  if (info.covered || info.off) failures.push(`${id}: formula covered or offscreen (${info.formula})`);
  if (!info.formula.startsWith('Equation ')) failures.push(`${id}: formula missing (${info.formula})`);
  if (info.assumptions || info.assumptionText) failures.push(`${id}: assumption strip still on the shell`);
  if (info.formulaHan) failures.push(`${id}: formula still has Han (${info.formula})`);
  if (info.overflowY !== 'auto' || info.maxHeight === 'none') failures.push(`${id}: formula is not a scrolling strip (${info.overflowY} ${info.maxHeight})`);
  if (bytes < 8000) failures.push(`${id}: screenshot too small (${bytes})`);
  if (info.canvas && (info.canvas.w > 2400 || info.canvas.h > 3200)) {
    failures.push(`${id}: canvas oversized ${JSON.stringify(info.canvas)}`);
  }
  if (id === 'r018-玻尔模型') {
    const blob = info.texts.join('\n');
    if (!info.texts.some((s) => s.includes('n=')) || !blob.includes('轨道 r∝n²')) {
      failures.push(`${id}: canvas missing level labels (n=${info.texts.length} sample=${info.texts.slice(0, 12).join(' | ')})`);
    }
  }
  if (id === 'neutron-diffusion') {
    if (!info.texts.some((t) => /φ.*cos\(πx\/a\)/.test(t) || t.includes('φ = φ₀ cos(πx/a)'))) {
      failures.push(`${id}: canvas missing the cosine label (${info.texts.slice(0, 8).join(' | ')})`);
    }
    const layoutN = await page.evaluate(() => ({
      assumptions: !!document.getElementById('shell-assumptions'),
      assumptionText: /Assumptions/.test(document.getElementById('model-shell')?.innerText || ''),
      caveat: !!document.getElementById('shell-caveat'),
    }));
    if (layoutN.assumptions || layoutN.assumptionText) failures.push(`${id}: assumption strip still on the shell`);
    if (layoutN.caveat) failures.push(`${id}: caveat strip still on the shell`);
  }
}

// Caveats stay in catalog metadata only — not asserted on the model-shell stage.

await page.setViewportSize({ width: 390, height: 844 });
await openModel('r018-玻尔模型');
// Boot may already open the mobile drawer when focusing the active row — only open if closed.
await page.evaluate(() => document.getElementById('btn-menu')?.click());
await page.waitForFunction(() => {
  const side = document.getElementById('sidebar');
  return !!(side?.classList.contains('open') || document.body.classList.contains('drawer-open'));
}, null, { timeout: 10000 });
await page.evaluate(async () => {
  const folds = [...document.querySelectorAll('#model-list details.domain-group')];
  const physics = folds.find((d) => d.dataset.domain === '物理') || folds[0];
  if (typeof window.__labCapture?.loadDomain === 'function') {
    await window.__labCapture.loadDomain(physics?.dataset.domain || '物理');
  }
  if (physics instanceof HTMLDetailsElement) {
    physics.open = true;
    physics.dispatchEvent(new Event('toggle'));
  }
  for (const el of document.querySelectorAll('#model-list details.sub-group')) {
    if (el instanceof HTMLDetailsElement) el.open = true;
  }
  const list = document.getElementById('model-list');
  if (list) list.scrollTop = 0;
});
await page.waitForFunction(() => document.querySelectorAll('#model-list .model-item .name').length >= 3, null, { timeout: 60000 });
await page.waitForTimeout(300);
const drawer = await page.evaluate(() => {
  const list = document.getElementById('model-list');
  // Active-row focus may have scrolled deep into a domain — pin to top for the first-screen check.
  if (list) list.scrollTop = 0;
  const lr = list?.getBoundingClientRect();
  const names = [...document.querySelectorAll('#model-list .model-item .name')].slice(0, 8).map((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, h: r.height, text: el.textContent || '' };
  });
  const inside = (n) => !!(lr && n && n.h > 8 && n.bottom > lr.top + 4 && n.top < lr.bottom - 4);
  const visible = names.filter(inside);
  return {
    open: !!(document.getElementById('sidebar')?.classList.contains('open') || document.body.classList.contains('drawer-open')),
    listH: lr?.height || 0,
    firstThreeInside: visible.length >= 3,
    firstThree: visible.slice(0, 3).map((n) => n.text),
  };
});
await page.screenshot({ path: path.join(shots, 'narrow-drawer-open.png') });
if (!drawer.open) failures.push('390px drawer did not open');
if (!drawer.firstThreeInside) {
  failures.push(`390px drawer hides one of the first three model names (${drawer.firstThree.join(' | ')})`);
}

await page.evaluate(() => document.getElementById('btn-menu')?.click());
await page.waitForTimeout(200);
await page.evaluate(() => document.getElementById('btn-params')?.click());
await page.waitForTimeout(300);
const benchCover = await page.evaluate(() => {
  const bench = document.getElementById('bench');
  const formula = document.getElementById('shell-formula');
  const fr = formula?.getBoundingClientRect();
  const br = bench?.getBoundingClientRect();
  const open = !!bench?.classList.contains('open');
  const covered = !!(open && fr && br && br.top < fr.bottom && br.bottom > fr.top
    && br.left < fr.right && br.right > fr.left);
  const off = !fr || fr.bottom < 0 || fr.top > window.innerHeight || fr.height < 8;
  return { open, covered, off, formula: formula?.textContent || '' };
});
await page.screenshot({ path: path.join(shots, 'narrow-bench-open.png') });
if (!benchCover.open) failures.push('390px bench did not open');
if (benchCover.covered || benchCover.off) {
  failures.push(`390px open bench covers or hides the formula (${benchCover.formula})`);
}
if (!benchCover.formula.startsWith('Equation ')) {
  failures.push(`390px open bench formula missing (${benchCover.formula})`);
}

// P0: open Params must leave ≥120px of canvas (bench no longer uses 58dvh crush).
const canvasFloor = await page.evaluate(() => {
  const wrap = document.querySelector('.canvas-wrap');
  const r = wrap?.getBoundingClientRect();
  return { h: r?.height || 0, open: !!document.getElementById('bench')?.classList.contains('open') };
});
if (!canvasFloor.open || canvasFloor.h < 120) {
  failures.push(`390px bench open canvas too short ${JSON.stringify(canvasFloor)}`);
}

// Heavy models: auto-pause + budget clamp on phone.
for (const heavyId of ['mandelbrot-julia', 'heat-2d', 'collision-2d']) {
  await openModel(heavyId);
  const heavy = await page.evaluate((id) => {
    const st = window.__labCapture.getState?.() || {};
    return {
      id: window.__labCapture.getModelId?.(),
      paused: !!window.__labCapture.isPaused?.(),
      heavy: !!window.__labCapture.isHeavyModel?.(id),
      tier: window.__labCapture.getViewportTier?.(),
      steps: window.__labCapture.getEffectiveMaxSubSteps?.(),
      N: st.params?.N ?? st.params?.n ?? null,
      parts: Array.isArray(st.parts) ? st.parts.length : null,
      fieldN: st.n ?? null,
    };
  }, heavyId);
  await page.screenshot({ path: path.join(shots, `narrow-heavy-${heavyId}.png`) });
  if (heavy.id !== heavyId) failures.push(`heavy switch ${heavyId} → ${heavy.id}`);
  if (!heavy.paused) failures.push(`${heavyId}: expected auto-pause on phone (${JSON.stringify(heavy)})`);
  if (heavy.tier !== 'phone') failures.push(`${heavyId}: tier ${heavy.tier}`);
  if (!(heavy.steps <= 8)) failures.push(`${heavyId}: maxSubSteps ${heavy.steps} > 8`);
  if (heavyId === 'collision-2d' && heavy.parts != null && heavy.parts > 64) {
    failures.push(`${heavyId}: particle cap exceeded (${heavy.parts})`);
  }
  if (heavyId === 'heat-2d' && heavy.fieldN != null && heavy.fieldN > 24) {
    failures.push(`${heavyId}: field n cap exceeded (${heavy.fieldN})`);
  }
  // Frame watchdog: after Play, rAF should keep ticking for ~2s (not a hard freeze).
  const watchdog = await page.evaluate(async () => {
    window.__labCapture.play?.();
    let frames = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < 2000) {
      await new Promise((r) => requestAnimationFrame(r));
      frames += 1;
      if (frames > 400) break;
    }
    window.__labCapture.pause?.();
    return {
      frames,
      steps: window.__labCapture.getEffectiveMaxSubSteps?.(),
      paused: !!window.__labCapture.isPaused?.(),
    };
  });
  if (watchdog.frames < 40) {
    failures.push(`${heavyId}: frame watchdog starved frames=${watchdog.frames}`);
  }
  if (!(watchdog.steps <= 8)) {
    failures.push(`${heavyId}: watchdog steps ${watchdog.steps} > 8`);
  }
}

// Tablet mid-compact: stage tap closes bench (901–1100 unified dismiss).
await page.setViewportSize({ width: 1000, height: 700 });
await openModel('free-fall');
await page.evaluate(() => {
  window.__labCapture?.setBenchOpen?.(true)
    || document.getElementById('btn-params')?.click();
});
await page.waitForTimeout(200);
const tabletBefore = await page.evaluate(() => ({
  open: !!document.getElementById('bench')?.classList.contains('open'),
  tier: window.__labCapture.getViewportTier?.(),
  steps: window.__labCapture.getEffectiveMaxSubSteps?.(),
}));
await page.evaluate(() => {
  document.querySelector('.stage')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await page.waitForTimeout(200);
const tabletAfter = await page.evaluate(() => ({
  open: !!document.getElementById('bench')?.classList.contains('open'),
}));
await page.screenshot({ path: path.join(shots, 'tablet-1000-dismiss.png') });
if (tabletBefore.tier !== 'tablet') failures.push(`1000×700 tier ${tabletBefore.tier}`);
if (!(tabletBefore.steps <= 16)) failures.push(`tablet maxSubSteps ${tabletBefore.steps}`);
if (!tabletBefore.open) failures.push('tablet bench did not open');
if (tabletAfter.open) failures.push('tablet stage click did not close bench');

// Landscape short-height fixture: canvas floor with Params open.
await page.setViewportSize({ width: 844, height: 390 });
await openModel('free-fall');
await page.evaluate(() => document.getElementById('btn-params')?.click());
await page.waitForTimeout(250);
const landscape = await page.evaluate(() => {
  const wrap = document.querySelector('.canvas-wrap');
  const r = wrap?.getBoundingClientRect();
  return {
    h: r?.height || 0,
    open: !!document.getElementById('bench')?.classList.contains('open'),
    tier: window.__labCapture.getViewportTier?.(),
  };
});
await page.screenshot({ path: path.join(shots, 'narrow-landscape-844x390.png') });
if (landscape.tier !== 'phone') failures.push(`landscape tier ${landscape.tier}`);
if (!landscape.open || landscape.h < 120) {
  failures.push(`landscape bench canvas too short ${JSON.stringify(landscape)}`);
}

await page.setViewportSize({ width: 1280, height: 800 });
currentModelId = 'user-model-miss';
await page.goto(`${base}?miss=1&lang=en`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
await page.click('#btn-user-model');
await page.waitForSelector('#user-model-dialog[open]');
await page.fill('input[name="name"]', '斜碰对照');
await page.fill('input[name="sub"]', '力学');
const family = await page.locator('#user-model-family option').first().getAttribute('value');
await page.selectOption('#user-model-family', family);
await page.fill('input[name="formula"]', '碰撞·没有这条');
await page.fill('input[name="authority"]', 'Hibbeler Dynamics chapter 15');
await page.fill('textarea[name="assumptions"]', '太短');
await page.fill('textarea[name="description"]', '状态量是法向相对速度');
await page.check('input[name="ethicsOk"]');
await page.click('#user-model-submit');
const missBtn = page.locator('.topic-miss-search');
await missBtn.waitFor({ timeout: 5000 });
const missLabel = (await missBtn.textContent())?.trim();
if (missLabel !== '碰撞 · 没有这条') failures.push(`miss button text ${JSON.stringify(missLabel)}`);
await missBtn.click();
const q = await page.locator('#filter-q').inputValue();
const listed = await page.locator('#model-list .model-item').count();
if (q !== missLabel) failures.push(`filter-q ${JSON.stringify(q)} !== button ${JSON.stringify(missLabel)}`);
if (q !== '碰撞 · 没有这条') failures.push(`filter-q ${JSON.stringify(q)}`);
const dialogOpen = await page.locator('#user-model-dialog[open]').count();
if (!dialogOpen || listed !== 0) {
  failures.push(`missing-key search must keep the dialog open and clear the sidebar (open=${dialogOpen} listed=${listed})`);
}
const errBlob = await page.evaluate(() => {
  const toast = document.getElementById('toast')?.textContent || '';
  const err = document.getElementById('user-model-error')?.innerText || '';
  const dialog = document.getElementById('user-model-dialog')?.innerText || '';
  return `${toast}\n${err}\n${dialog}`;
});
if (!/碰撞\s*·\s*没有这条/.test(errBlob)) {
  failures.push(`lang=en miss-key toast/error missing spaced Han key (${errBlob.slice(0, 240)})`);
}

await browser.close();
if (failures.length || process.exitCode) {
  console.error(failures.join('\n') || 'PAGE CRASH');
  process.exit(1);
}
console.log('narrow regression ok', layout.length);
