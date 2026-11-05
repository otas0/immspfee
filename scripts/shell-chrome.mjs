#!/usr/bin/env node
/**
 * Shell chrome: DPR cap, projector overlay, microscope WebGL, English names,
 * shell cycle, and the custom-model failure path.
 * Requires the lab server (LAB_URL, default http://127.0.0.1:8765/).
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shotsDir = join(root, 'shots');
mkdirSync(shotsDir, { recursive: true });
const buildStamp = (() => {
  try {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    const meta = html.match(/name=["']imm-js["']\s+content=["']([^"']+)["']/);
    if (meta?.[1]) return meta[1];
    const stamp = JSON.parse(readFileSync(join(root, 'asset-stamp.json'), 'utf8'));
    return stamp.js || stamp.main || 'shell';
  } catch {
    return 'shell';
  }
})();

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const failures = [];
function fail(msg) { failures.push(msg); }

const browser = await chromium.launch({ headless: true });

async function openPage(viewport, dsf, shell) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: dsf });
  await page.addInitScript(() => {
    localStorage.setItem('physics-lab-locale-v1', 'en');
    localStorage.removeItem('physics-lab-auto-open-bench');
  });
  await page.goto(`${base}?shell=${shell}&v=${encodeURIComponent(buildStamp)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
  await page.evaluate(() => new Promise((resolve) => {
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  return page;
}

async function setShell(page, id) {
  await page.evaluate((shellId) => {
    const sel = document.getElementById('shell-select');
    sel.value = shellId;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, id);
  await page.waitForFunction((shellId) => document.documentElement.dataset.shell === shellId, id);
}

async function metrics(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('canvas');
    const webgl = document.getElementById('canvas-webgl');
    const ratio = (el) => (el && el.clientWidth ? el.width / el.clientWidth : 0);
    return {
      shell: document.documentElement.dataset.shell,
      stage: document.documentElement.dataset.stageMode,
      cap: Number(document.documentElement.dataset.dprCap),
      dpr: window.devicePixelRatio,
      ratio: ratio(canvas),
      canvasW: canvas?.width || 0,
      canvasCw: canvas?.clientWidth || 0,
      webglRatio: ratio(webgl),
      webglW: webgl?.width || 0,
      webglCw: webgl?.clientWidth || 0,
      webglHidden: !!webgl.hidden,
      webglDisplay: getComputedStyle(webgl).display,
      canvasHidden: !!canvas.hidden,
      menu: document.getElementById('btn-menu')?.getAttribute('aria-label') || '',
      menuExpanded: document.getElementById('btn-menu')?.getAttribute('aria-expanded') || '',
    };
  });
}

const dprCases = [
  [1920, 1080, 3, 'lab-focus'],
  [1920, 1080, 4, 'lab-focus'],
  [3840, 2160, 3, 'lab-focus'],
  [3840, 2160, 4, 'lab-projector'],
];
for (const [w, h, dsf, shell] of dprCases) {
  const page = await openPage({ width: w, height: h }, dsf, shell);
  const m = await metrics(page);
  if (m.cap !== 3) fail(`${shell} ${w} dpr ${dsf}: cap ${m.cap}`);
  if (Math.abs(m.ratio - 3) > 0.05) {
    fail(`${shell} ${w} deviceDpr ${dsf}: canvas ratio ${m.ratio} (width/clientWidth=${m.canvasW}/${m.canvasCw}; cap must hold at 3)`);
  }
  if (m.dpr > 3 && m.ratio > 3.05) {
    fail(`${shell} followed device DPR ${m.dpr}; ratio=${m.ratio} (${m.canvasW}/${m.canvasCw})`);
  }
  await page.close();
}

const desk = await openPage({ width: 1440, height: 900 }, 1, 'lab-classic');
await setShell(desk, 'lab-projector');
const closedLabel = await desk.locator('#btn-menu').getAttribute('aria-label');
if (closedLabel !== 'Open model list') fail(`menu label when closed: ${closedLabel}`);
await desk.click('#btn-menu');
const opened = await desk.evaluate(() => {
  const side = getComputedStyle(document.querySelector('.sidebar'));
  return {
    overlay: document.getElementById('chassis').classList.contains('shell-sidebar-overlay'),
    pe: side.pointerEvents,
    vis: side.visibility,
    label: document.getElementById('btn-menu').getAttribute('aria-label'),
    expanded: document.getElementById('btn-menu').getAttribute('aria-expanded'),
  };
});
if (!opened.overlay || opened.pe !== 'auto' || opened.vis !== 'visible') fail(`projector overlay open ${JSON.stringify(opened)}`);
if (opened.label !== 'Close model list') fail(`menu label when open: ${opened.label}`);
await desk.locator('#model-list button[data-id="free-fall"]').click();
await desk.waitForFunction(() => location.hash.includes('free-fall'));
const afterPick = await desk.evaluate(() => ({
  overlay: document.getElementById('chassis').classList.contains('shell-sidebar-overlay'),
  hash: location.hash,
  expanded: document.getElementById('btn-menu')?.getAttribute('aria-expanded') || '',
  label: document.getElementById('btn-menu')?.getAttribute('aria-label') || '',
}));
if (afterPick.overlay) fail('overlay stayed open after selecting a model');
if (!afterPick.hash.includes('free-fall')) fail(`hash ${afterPick.hash}`);
if (afterPick.expanded !== 'false') fail(`aria-expanded after pick ${afterPick.expanded}`);
if (afterPick.label !== 'Open model list') fail(`menu label after pick ${afterPick.label}`);
const toggled = await desk.evaluate(() => {
  const menu = document.getElementById('btn-menu');
  const chassis = document.getElementById('chassis');
  menu.click();
  const openedNow = chassis.classList.contains('shell-sidebar-overlay');
  const closeLabel = menu.getAttribute('aria-label');
  menu.click();
  const closed = !chassis.classList.contains('shell-sidebar-overlay');
  return { openedNow, closed, closeLabel };
});
if (!toggled.openedNow || !toggled.closed) fail(`menu toggle opened=${toggled.openedNow} closed=${toggled.closed}`);
if (toggled.closeLabel !== 'Close model list') fail(`projector close label ${toggled.closeLabel}`);

await setShell(desk, 'lab-classic');
await setShell(desk, 'lab-focus');
await setShell(desk, 'lab-projector');
await setShell(desk, 'lab-microscope3d');
await desk.waitForFunction(() => document.documentElement.dataset.stageMode === 'webgl3d');
await desk.waitForFunction(() => location.hash.includes('r016-'));
const micro = await metrics(desk);
if (micro.cap !== 3) fail(`microscope3d cap ${micro.cap}`);
if (!micro.canvasHidden) fail('2D canvas stayed visible on microscope 3D');
if (micro.webglHidden || micro.webglDisplay === 'none') fail(`webgl hidden=${micro.webglHidden} display=${micro.webglDisplay}`);
if (micro.webglCw < 100) fail(`webgl client width ${micro.webglCw}`);
if (micro.dpr <= 3 && Math.abs(micro.webglRatio - Math.min(micro.dpr, 3)) > 0.05) {
  fail(`microscope webgl ratio ${micro.webglRatio} dpr ${micro.dpr} (width/clientWidth=${micro.webglW}/${micro.webglCw})`);
}
const exclusive = await desk.evaluate(() => {
  const chrome = document.getElementById('microscope-chrome');
  const side = document.getElementById('sidebar');
  const toolbar = document.querySelector('.toolbar');
  const shell = document.getElementById('model-shell');
  return {
    chromeHidden: !!chrome?.hidden,
    brand: chrome?.querySelector('.micro-brand')?.textContent?.trim() || '',
    sideDisplay: side ? getComputedStyle(side).display : '',
    toolbarDisplay: toolbar ? getComputedStyle(toolbar).display : '',
    formula: !!(shell && getComputedStyle(shell).display !== 'none'),
  };
});
if (exclusive.chromeHidden) fail('microscope chrome stayed hidden on the dedicated shell');
if (exclusive.brand !== 'IMMSPFEE') fail(`microscope brand ${exclusive.brand}`);
if (exclusive.sideDisplay !== 'none') fail(`catalog sidebar still visible (${exclusive.sideDisplay})`);
if (exclusive.toolbarDisplay !== 'none') fail(`lab toolbar still visible (${exclusive.toolbarDisplay})`);
if (exclusive.formula) fail('ODE model-shell strip still showing on the microscope shell');

await desk.click('#btn-micro-exit');
await desk.waitForFunction(() => document.documentElement.dataset.shell === 'lab-classic');
await desk.waitForFunction(() => document.documentElement.dataset.stageMode !== 'webgl3d');
const back = await metrics(desk);
if (!back.webglHidden || back.webglDisplay !== 'none') {
  fail(`webgl still visible after classic return hidden=${back.webglHidden} display=${back.webglDisplay}`);
}
if (back.canvasHidden) fail('2D canvas stayed hidden after leaving microscope 3D');

await desk.waitForFunction(() => {
  const el = document.querySelector('[data-id="r016-显微镜"] .name');
  return el && el.textContent.trim() === 'Compound microscope';
}, null, { timeout: 20000 });
const names = await desk.evaluate(async () => {
  const pack = await fetch('./data/locales/models-en.json').then((r) => r.json());
  let leak = 0; let checked = 0; let hanInPack = 0;
  for (const btn of document.querySelectorAll('#model-list .model-item')) {
    const en = pack[btn.dataset.id]?.name;
    if (!en) continue;
    checked += 1;
    if (/[\u4e00-\u9fff]/.test(en)) hanInPack += 1;
    const shown = btn.querySelector('.name')?.textContent.trim();
    if (shown !== en) leak += 1;
  }
  return {
    micro: document.querySelector('[data-id="r016-显微镜"] .name')?.textContent.trim(),
    previews: document.querySelectorAll('#model-list .preview').length,
    leak, checked, hanInPack,
  };
});
if (names.micro !== 'Compound microscope') fail(`microscope sidebar name ${names.micro}`);
if (/[\u4e00-\u9fff]/.test(names.micro || '')) fail('Chinese catalog name leaked onto the microscope row');
if (names.previews) fail(`sidebar still has ${names.previews} assumption previews`);
if (names.hanInPack) fail(`models-en still has ${names.hanInPack} Han names`);
if (names.leak) fail(`${names.leak}/${names.checked} English names did not replace the catalog source`);

// Same path as a catalog-row click: switchModel → microUi.onModelChange → enterMicroscopeShell.
await desk.evaluate(() => window.__labCapture.switchModel('r016-显微镜'));
await desk.waitForFunction(() => document.documentElement.dataset.shell === 'lab-microscope3d');
await desk.waitForFunction(() => document.documentElement.dataset.stageMode === 'webgl3d');
const clickedIn = await desk.evaluate(() => ({
  shell: document.documentElement.dataset.shell,
  chrome: !document.getElementById('microscope-chrome')?.hidden,
  side: getComputedStyle(document.getElementById('sidebar')).display,
  inputMode: document.documentElement.dataset.inputMode || 'lab',
}));
if (clickedIn.shell !== 'lab-microscope3d' || !clickedIn.chrome || clickedIn.side !== 'none') {
  fail(`selecting the microscope did not enter the dedicated shell ${JSON.stringify(clickedIn)}`);
}
if (clickedIn.inputMode !== 'microscope') {
  fail(`microscope inputMode ${clickedIn.inputMode}`);
}
await desk.keyboard.press('Meta+z');
await desk.keyboard.press('Control+z');
const afterUndo = await desk.evaluate(() => ({
  toast: document.getElementById('lab-toast')?.textContent || '',
  sideOpen: document.getElementById('sidebar')?.classList.contains('open') || false,
  shell: document.documentElement.dataset.shell,
}));
if (/撤销|重做|undo|redo/i.test(afterUndo.toast) || afterUndo.sideOpen) {
  fail(`catalog shortcut leaked into microscope ${JSON.stringify(afterUndo)}`);
}
await desk.click('#btn-micro-exit');
await desk.waitForFunction(() => document.documentElement.dataset.shell === 'lab-classic');
const leftMode = await desk.evaluate(() => document.documentElement.dataset.inputMode || 'lab');
if (leftMode !== 'lab') fail(`inputMode after exit ${leftMode}`);

await desk.click('#btn-user-model');
await desk.waitForSelector('#user-model-dialog[open]');
await desk.fill('input[name="name"]', 'bad draft');
await desk.fill('input[name="sub"]', 'optics');
await desk.fill('input[name="formula"]', 'M = -L/f');
await desk.fill('input[name="authority"]', 'Hecht Optics chapter 5');
await desk.fill('textarea[name="assumptions"]', 'too short');
await desk.fill('textarea[name="description"]', 'Angular magnification of a finite-tube microscope');
await desk.check('input[name="ethicsOk"]');
await desk.click('#user-model-submit');
await desk.click('#user-model-submit');
const expectErr = 'State assumptions and limits clearly (required for industrial-grade models)';
const dialog = await desk.evaluate(() => {
  const err = document.getElementById('user-model-error');
  const toast = document.getElementById('lab-toast')?.textContent || '';
  return {
    open: document.getElementById('user-model-dialog')?.open === true,
    hidden: !err || err.hidden,
    text: err?.textContent?.trim() || '',
    toast,
  };
});
if (!dialog.open) fail('custom-model dialog closed after a failed submit');
if (dialog.hidden || dialog.text.length < 4) fail(`error text missing (${dialog.text})`);
if (dialog.text !== expectErr) fail(`custom-model error ${JSON.stringify(dialog.text)}`);
if (dialog.text.includes('Validation passed') || dialog.toast.includes('Validation passed')) fail('failed submit showed dialog.validOk');
await desk.close();

async function stageGeom(page) {
  return page.evaluate(() => {
    const chassis = document.getElementById('chassis');
    const stage = chassis?.querySelector(':scope > .stage');
    const bench = document.getElementById('bench');
    const formula = document.getElementById('shell-formula');
    const sr = stage?.getBoundingClientRect();
    const cr = chassis?.getBoundingClientRect();
    const br = bench?.getBoundingClientRect();
    const fr = formula?.getBoundingClientRect();
    const cols = getComputedStyle(chassis).gridTemplateColumns.split(/\s+/).filter(Boolean);
    const stageRightGap = cr && sr ? cr.right - sr.right : 999;
    const benchCoversFormula = !!(fr && br && br.width > 40 && fr.height > 4
      && br.left < fr.right - 1 && br.right > fr.left + 1
      && br.top < fr.bottom - 1 && br.bottom > fr.top + 1);
    return {
      stageW: Math.round(sr?.width || 0),
      stageH: Math.round(sr?.height || 0),
      chassisW: Math.round(cr?.width || 0),
      colCount: cols.length,
      cols: cols.join(' '),
      stageRightGap: Math.round(stageRightGap),
      overlay: chassis?.classList.contains('shell-sidebar-overlay') || false,
      sideOpen: document.getElementById('sidebar')?.classList.contains('open') || false,
      benchOpen: bench?.classList.contains('open') || false,
      benchCollapsed: chassis?.classList.contains('bench-collapsed') || false,
      benchInView: !!(br && br.width > 40 && br.left < (cr?.right || 0) - 8 && br.right > (cr?.left || 0) + 8),
      backdropHidden: !!document.getElementById('drawer-backdrop')?.hidden,
      benchCoversFormula,
      shell: document.documentElement.dataset.shell || '',
    };
  });
}

const compactProj = await openPage({ width: 1000, height: 800 }, 2, 'lab-projector');
const compactGeom = await stageGeom(compactProj);
await compactProj.screenshot({ path: join(shotsDir, 'shell-projector-1000.png') });
if (compactGeom.overlay) fail(`1000 projector left overlay on ${JSON.stringify(compactGeom)}`);
if (compactGeom.colCount !== 1) fail(`1000 projector should be one content column (${compactGeom.cols})`);
if (compactGeom.stageW < 700 || compactGeom.stageH < 360) {
  fail(`1000 projector stage too small ${compactGeom.stageW}×${compactGeom.stageH}`);
}
if (compactGeom.stageRightGap > 48) {
  fail(`1000 projector empty bench strip gap=${compactGeom.stageRightGap}`);
}
if (!compactGeom.benchOpen && compactGeom.benchInView) {
  fail(`1000 projector closed bench still in the stage band ${JSON.stringify(compactGeom)}`);
}
if (compactGeom.benchCollapsed) fail('1000 projector kept bench-collapsed under compact');

await compactProj.click('#btn-menu');
const overlayOpen = await stageGeom(compactProj);
await compactProj.screenshot({ path: join(shotsDir, 'shell-projector-1000-overlay.png') });
if (!overlayOpen.overlay || !overlayOpen.sideOpen) {
  fail(`1000 projector menu did not open overlay ${JSON.stringify(overlayOpen)}`);
}
if (overlayOpen.stageW < 700) fail(`1000 projector stage shrank with overlay (${overlayOpen.stageW})`);
if (overlayOpen.backdropHidden) fail('1000 projector overlay missing backdrop');
await compactProj.click('#drawer-backdrop');
const afterBackdrop = await stageGeom(compactProj);
if (afterBackdrop.overlay || afterBackdrop.sideOpen) {
  fail(`1000 projector backdrop did not close overlay ${JSON.stringify(afterBackdrop)}`);
}

// Auto-open bench must not cover the formula strip.
await compactProj.evaluate(() => localStorage.setItem('physics-lab-auto-open-bench', '1'));
await compactProj.evaluate(() => window.__labCapture.switchModel('free-fall'));
await compactProj.waitForTimeout(400);
await compactProj.evaluate(() => {
  const btn = document.getElementById('btn-params');
  if (btn && !document.getElementById('bench')?.classList.contains('open')) btn.click();
});
await compactProj.waitForTimeout(300);
const benchOpenGeom = await stageGeom(compactProj);
await compactProj.screenshot({ path: join(shotsDir, 'shell-projector-1000-bench.png') });
if (!benchOpenGeom.benchOpen) fail('1000 projector could not open the param drawer');
if (benchOpenGeom.benchCoversFormula) fail('1000 projector open bench covers the formula strip');
if (benchOpenGeom.benchCollapsed) fail('1000 projector open drawer still has bench-collapsed');

// Resize 800→1200→800 must clear overlay residue.
await compactProj.setViewportSize({ width: 800, height: 800 });
await compactProj.click('#btn-menu');
await compactProj.waitForFunction(() => document.getElementById('chassis')?.classList.contains('shell-sidebar-overlay'));
await compactProj.setViewportSize({ width: 1200, height: 800 });
await compactProj.evaluate(() => window.dispatchEvent(new Event('resize')));
await compactProj.waitForTimeout(200);
const atWide = await stageGeom(compactProj);
if (atWide.overlay || atWide.sideOpen) fail(`overlay lingered after grow to 1200 ${JSON.stringify(atWide)}`);
await compactProj.setViewportSize({ width: 800, height: 800 });
await compactProj.evaluate(() => window.dispatchEvent(new Event('resize')));
await compactProj.waitForTimeout(200);
const backCompact = await stageGeom(compactProj);
if (backCompact.overlay || backCompact.sideOpen) fail(`overlay lingered after shrink to 800 ${JSON.stringify(backCompact)}`);
if (backCompact.benchCollapsed) fail('bench-collapsed returned after resize into compact');
await compactProj.close();

const focusCompact = await openPage({ width: 1000, height: 800 }, 2, 'lab-focus');
const focusGeom = await stageGeom(focusCompact);
await focusCompact.screenshot({ path: join(shotsDir, 'shell-focus-1000.png') });
if (focusGeom.colCount !== 2) fail(`1000 focus reserved extra columns (${focusGeom.cols})`);
if (focusGeom.stageRightGap > 48) fail(`1000 focus empty strip gap=${focusGeom.stageRightGap}`);
if (focusGeom.stageW < 500) fail(`1000 focus stage too small ${focusGeom.stageW}`);
await focusCompact.close();

const narrow = await openPage({ width: 390, height: 844 }, 2, 'lab-projector');
const narrowMenu = await narrow.evaluate(() => {
  const btn = document.getElementById('btn-menu');
  const cs = btn ? getComputedStyle(btn) : null;
  return { label: btn?.getAttribute('aria-label') || '', display: cs?.display || '', pe: cs?.pointerEvents || '', w: btn?.getBoundingClientRect().width || 0 };
});
if (narrowMenu.display === 'none' || narrowMenu.pe === 'none' || narrowMenu.w < 8) fail(`390 projector menu not visible ${JSON.stringify(narrowMenu)}`);
if (narrowMenu.label !== 'Open model list') fail(`390 menu label ${narrowMenu.label}`);
await narrow.click('#btn-menu');
const narrowOpen = await narrow.evaluate(() => {
  const side = getComputedStyle(document.querySelector('.sidebar'));
  return {
    overlay: document.getElementById('chassis').classList.contains('shell-sidebar-overlay'),
    pe: side.pointerEvents,
    vis: side.visibility,
    label: document.getElementById('btn-menu').getAttribute('aria-label'),
    expanded: document.getElementById('btn-menu').getAttribute('aria-expanded'),
  };
});
if (!narrowOpen.overlay || narrowOpen.pe !== 'auto' || narrowOpen.vis !== 'visible') fail(`390 projector overlay ${JSON.stringify(narrowOpen)}`);
if (narrowOpen.label !== 'Close model list') fail(`390 close label ${narrowOpen.label}`);
await narrow.locator('#model-list button[data-id="free-fall"]').click();
await narrow.waitForFunction(() => location.hash.includes('free-fall'));
const narrowPick = await narrow.evaluate(() => ({
  overlay: document.getElementById('chassis').classList.contains('shell-sidebar-overlay'),
  hash: location.hash,
  expanded: document.getElementById('btn-menu')?.getAttribute('aria-expanded') || '',
  openClass: document.getElementById('sidebar')?.classList.contains('open') || false,
}));
if (narrowPick.overlay || narrowPick.openClass) fail(`390 drawer stayed open ${JSON.stringify(narrowPick)}`);
if (!narrowPick.hash.includes('free-fall')) fail(`390 hash ${narrowPick.hash}`);
if (narrowPick.expanded !== 'false') fail(`390 aria-expanded ${narrowPick.expanded}`);
await narrow.close();

await browser.close();
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('shell chrome ok');
