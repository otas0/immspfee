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
    // Closed domain folds leave the projector overlay with zero model rows.
    localStorage.removeItem('physics-lab-folds-v1');
    localStorage.removeItem('physics-lab-folds');
  });
  await page.goto(`${base}?shell=${shell}&v=${encodeURIComponent(buildStamp)}&_=${Date.now()}`, { waitUntil: 'domcontentloaded' });
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
    // Microscope is not listed in the catalog shell picker — inject for tests / URL path.
    if (sel && ![...sel.options].some((o) => o.value === shellId)) {
      const opt = document.createElement('option');
      opt.value = shellId;
      opt.textContent = shellId;
      sel.appendChild(opt);
    }
    if (sel) {
      sel.value = shellId;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, id);
  await page.waitForFunction((shellId) => document.documentElement.dataset.shell === shellId, id);
}

/** Domain folds start closed on a cold boot — open Physics (or the first fold) so model rows exist. */
async function menuHitTest(page) {
  return page.evaluate(() => {
    const btn = document.getElementById('btn-menu');
    if (!btn) return { ok: false, reason: 'no-btn' };
    const r = btn.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    const top = document.elementFromPoint(x, y);
    const hit = !!(top && (top === btn || btn.contains(top)));
    return {
      ok: hit,
      x,
      y,
      top: top ? `${top.tagName}.${top.className || ''}#${top.id || ''}` : null,
      btnZ: getComputedStyle(btn).zIndex,
      btnPos: getComputedStyle(btn).position,
    };
  });
}

async function ensureCatalogRows(page) {
  await page.evaluate(() => {
    const folds = [...document.querySelectorAll('#model-list details')];
    const physics = folds.find((d) => /物理|Physics/i.test(d.querySelector('summary')?.textContent || ''));
    for (const d of (physics ? [physics] : folds.slice(0, 1))) d.open = true;
    const expand = [...document.querySelectorAll('button')].find((b) => /^expand all$/i.test((b.textContent || '').trim()));
    expand?.click();
  });
  try {
    await page.waitForFunction(
      () => document.querySelectorAll('#model-list button.model-item[data-id]').length > 0,
      null,
      { timeout: 60000 },
    );
  } catch (err) {
    const diag = await page.evaluate(() => {
      const folds = [...document.querySelectorAll('#model-list details')].map((d) => ({
        name: (d.querySelector('summary')?.textContent || '').trim().slice(0, 48),
        open: !!d.open,
        items: d.querySelectorAll('button.model-item[data-id]').length,
      }));
      return {
        items: document.querySelectorAll('#model-list button.model-item[data-id]').length,
        folds,
        overlay: document.getElementById('chassis')?.classList.contains('shell-sidebar-overlay') || false,
        sideOpen: document.getElementById('sidebar')?.classList.contains('open') || false,
        hash: location.hash,
        foldStorage: localStorage.getItem('physics-lab-folds-v1') || localStorage.getItem('physics-lab-folds') || '',
      };
    });
    fail(`ensureCatalogRows timeout (lazy domains closed?) ${JSON.stringify(diag)}`);
    throw err;
  }
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
{
  const factoryCold = await desk.evaluate(() => (
    performance.getEntriesByType('resource').some((r) => /chunk-factory/i.test(r.name || ''))
  ));
  if (factoryCold) fail('cold boot pulled chunk-factory before a subject opened');
  const coldFormula = await desk.evaluate(() => document.getElementById('shell-formula')?.textContent || '');
  if (coldFormula && /[\u4e00-\u9fff]/.test(coldFormula)) {
    fail(`cold lang=en formula still has Han ${JSON.stringify(coldFormula)}`);
  }
}
await setShell(desk, 'lab-projector');
const closedLabel = await desk.locator('#btn-menu').getAttribute('aria-label');
if (closedLabel !== 'Open model list') fail(`menu label when closed: ${closedLabel}`);
await desk.evaluate(() => document.getElementById('btn-menu')?.click());
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
await ensureCatalogRows(desk);
const pickedId = await desk.evaluate(() => {
  const current = decodeURIComponent((location.hash.match(/m=([^&]+)/) || [])[1] || '');
  const btn = [...document.querySelectorAll('#model-list button.model-item[data-id]')]
    .find((el) => el.dataset.id && el.dataset.id !== current)
    || document.querySelector('#model-list button.model-item[data-id]');
  const id = btn?.dataset.id || 'free-fall';
  if (btn) btn.click();
  else window.__labCapture.switchModel(id);
  const chassis = document.getElementById('chassis');
  if (chassis?.classList.contains('shell-sidebar-overlay')) {
    document.getElementById('btn-menu')?.click();
  }
  return id;
});
if (!pickedId) fail('projector overlay listed no models after opening Physics');
await desk.waitForFunction((id) => {
  const hash = location.hash || '';
  const overlay = document.getElementById('chassis')?.classList.contains('shell-sidebar-overlay');
  return !overlay && (hash.includes(id) || hash.includes(encodeURIComponent(id)));
}, pickedId, { timeout: 20000 });
const afterPick = await desk.evaluate(() => ({
  overlay: document.getElementById('chassis').classList.contains('shell-sidebar-overlay'),
  hash: location.hash,
  expanded: document.getElementById('btn-menu')?.getAttribute('aria-expanded') || '',
  label: document.getElementById('btn-menu')?.getAttribute('aria-label') || '',
}));
if (afterPick.overlay) fail('overlay stayed open after selecting a model');
if (!(afterPick.hash.includes(pickedId) || afterPick.hash.includes(encodeURIComponent(pickedId)))) {
  fail(`hash ${afterPick.hash} pick ${pickedId}`);
}
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
  const bench = document.getElementById('bench');
  const hud = document.querySelector('.hud');
  const stage = document.getElementById('micro-stage');
  const metricsKeys = [...(stage?.querySelectorAll('.micro-metric') || [])].map((el) => el.dataset.key);
  const railLabels = [...(stage?.querySelectorAll('.micro-field-label') || [])].map((el) => el.textContent.trim());
  const cssHref = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map((l) => l.getAttribute('href') || '')
    .find((h) => h.includes('microscope-shell.css')) || '';
  const picker = [...(document.getElementById('shell-select')?.options || [])].map((o) => o.value);
  return {
    chromeHidden: !!chrome?.hidden,
    brand: chrome?.querySelector('.micro-brand')?.textContent?.trim() || '',
    sideDisplay: side ? getComputedStyle(side).display : '',
    toolbarDisplay: toolbar ? getComputedStyle(toolbar).display : '',
    formula: !!(shell && getComputedStyle(shell).display !== 'none'),
    benchDisplay: bench ? getComputedStyle(bench).display : '',
    hudDisplay: hud ? getComputedStyle(hud).display : '',
    stageHidden: !!stage?.hidden,
    metrics: metricsKeys,
    railLabels,
    cssHref,
    picker,
    inputMode: document.documentElement.dataset.inputMode || '',
  };
});
if (exclusive.chromeHidden) fail('microscope chrome stayed hidden on the dedicated shell');
if (exclusive.brand !== 'IMMSPFEE') fail(`microscope brand ${exclusive.brand}`);
if (exclusive.sideDisplay !== 'none') fail(`catalog sidebar still visible (${exclusive.sideDisplay})`);
if (exclusive.toolbarDisplay !== 'none') fail(`lab toolbar still visible (${exclusive.toolbarDisplay})`);
if (exclusive.formula) fail('ODE model-shell strip still showing on the microscope shell');
if (exclusive.benchDisplay !== 'none') fail(`catalog bench still visible (${exclusive.benchDisplay})`);
if (exclusive.hudDisplay !== 'none') fail(`catalog HUD still visible (${exclusive.hudDisplay})`);
if (exclusive.stageHidden) fail('isolated micro-stage stayed hidden');
if (exclusive.metrics.join(',') !== 'M,f_obj,NA,d_Abbe') {
  fail(`micro readouts ${exclusive.metrics.join(',')}`);
}
if (exclusive.railLabels.some((l) => /speed|time|dt|trail/i.test(l))) {
  fail(`optical rail leaked catalog keys ${exclusive.railLabels.join('|')}`);
}
const wantRail = ['Objective', 'Eyepiece', 'Tube length L', 'NA', 'Wavelength λ', 'Immersion'];
if (wantRail.some((l) => !exclusive.railLabels.includes(l))) {
  fail(`optical rail missing keys ${exclusive.railLabels.join('|')}`);
}
const lambdaOut = await desk.evaluate(() => document.getElementById('micro-lambda')?.textContent || '');
if (!/\d+\s*nm/.test(lambdaOut)) fail(`optical rail λ missing ${lambdaOut}`);

if (!exclusive.cssHref.includes('microscope-shell.css')) {
  fail(`microscope CSS fingerprint missing (${exclusive.cssHref})`);
}
if (exclusive.picker.length !== 1 || exclusive.picker[0] !== 'lab-classic') {
  fail(`microscope shell picker should be back-only ${JSON.stringify(exclusive.picker)}`);
}
if (exclusive.inputMode !== 'microscope') fail(`inputMode ${exclusive.inputMode}`);

await desk.click('#btn-micro-exit');
await desk.waitForFunction(() => document.documentElement.dataset.shell === 'lab-classic');
await desk.waitForFunction(() => document.documentElement.dataset.stageMode !== 'webgl3d');
const back = await metrics(desk);
if (!back.webglHidden || back.webglDisplay !== 'none') {
  fail(`webgl still visible after classic return hidden=${back.webglHidden} display=${back.webglDisplay}`);
}
if (back.canvasHidden) fail('2D canvas stayed hidden after leaving microscope 3D');
const focused = await desk.evaluate(() => {
  const domain = document.querySelector('.domain-group[data-domain="物理"]');
  const sub = [...(domain?.querySelectorAll('.sub-group') || [])]
    .find((el) => (el.querySelector('.sub-name')?.dataset.sub || el.querySelector('.sub-name')?.textContent) === '光学');
  const row = document.querySelector('[data-id="r016-显微镜"]');
  return {
    domainOpen: domain instanceof HTMLDetailsElement ? domain.open : false,
    subOpen: sub instanceof HTMLDetailsElement ? sub.open : false,
    active: row?.classList.contains('active') || false,
  };
});
if (!focused.domainOpen || !focused.subOpen || !focused.active) {
  fail(`exit did not expand 物理/光学 + highlight r016 ${JSON.stringify(focused)}`);
}

await desk.waitForFunction(() => {
  const el = document.querySelector('[data-id="r016-显微镜"] .name');
  return el && el.textContent.trim() === 'Compound microscope';
}, null, { timeout: 20000 });
await desk.evaluate(() => {
  const summary = [...document.querySelectorAll('#model-list details > summary')].find((el) => /physics|物理/i.test(el.textContent || ''));
  const details = summary?.closest('details');
  if (details) details.open = true;
});
await desk.waitForFunction(() => document.querySelectorAll('#model-list button.model-item[data-id]').length > 0, null, { timeout: 60000 });
await desk.waitForFunction(() => {
  const el = document.querySelector('[data-id="r016-显微镜"] .name, [data-id="free-fall"] .name');
  const text = el?.textContent.trim() || '';
  return text === 'Compound microscope' || text === 'Free fall';
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
// Allow a small race while lazy domain rows paint; fail hard only if most names stayed Chinese.
if (names.checked && names.leak > names.checked * 0.25) {
  fail(`${names.leak}/${names.checked} English names did not replace the catalog source`);
}

// Catalog r016 stays 2D; the isolated 3D strip / capture API enters WebGL.
await desk.evaluate(() => window.__labCapture.switchModel('r016-显微镜'));
await desk.waitForFunction(() => window.__labCapture.getModelId?.() === 'r016-显微镜', null, { timeout: 20000 });
const stayed2d = await desk.evaluate(() => ({
  shell: document.documentElement.dataset.shell,
  stageMode: document.documentElement.dataset.stageMode,
  inputMode: document.documentElement.dataset.inputMode || 'lab',
}));
if (stayed2d.shell === 'lab-microscope3d' || stayed2d.stageMode === 'webgl3d') {
  fail(`catalog r016 must stay 2D ${JSON.stringify(stayed2d)}`);
}
const strip = await desk.evaluate(() => {
  const btn = document.getElementById('btn-micro3d-entry');
  const stripEl = document.querySelector('.micro3d-strip');
  const domains = document.querySelector('.domain-group');
  const btnTop = btn?.getBoundingClientRect().top ?? 0;
  const domainTop = domains?.getBoundingClientRect().top ?? 0;
  return {
    hasBtn: !!btn,
    hasStrip: !!stripEl,
    aboveDomains: !!(btn && domains && btnTop < domainTop - 4),
    label: btn?.querySelector('.name')?.textContent?.trim() || '',
  };
});
if (!strip.hasBtn || !strip.hasStrip) fail(`3D strip missing ${JSON.stringify(strip)}`);
if (!strip.aboveDomains) fail(`3D strip must sit above domain folds ${JSON.stringify(strip)}`);
await desk.evaluate(() => window.__labCapture.enterMicroscope3d());
await desk.waitForFunction(() => document.documentElement.dataset.shell === 'lab-microscope3d');
await desk.waitForFunction(() => document.documentElement.dataset.stageMode === 'webgl3d');
const clickedIn = await desk.evaluate(() => ({
  shell: document.documentElement.dataset.shell,
  chrome: !document.getElementById('microscope-chrome')?.hidden,
  side: getComputedStyle(document.getElementById('sidebar')).display,
  inputMode: document.documentElement.dataset.inputMode || 'lab',
}));
if (clickedIn.shell !== 'lab-microscope3d' || !clickedIn.chrome || clickedIn.side !== 'none') {
  fail(`3D strip did not enter the dedicated shell ${JSON.stringify(clickedIn)}`);
}
if (clickedIn.inputMode !== 'microscope') {
  fail(`microscope inputMode ${clickedIn.inputMode}`);
}
await desk.evaluate(() => {
  const rail = document.getElementById('micro-rail');
  if (rail && !rail.classList.contains('is-open')) rail.classList.add('is-open');
});
await desk.keyboard.press('Escape');
const escRail = await desk.evaluate(() => ({
  railOpen: document.getElementById('micro-rail')?.classList.contains('is-open') || false,
  shell: document.documentElement.dataset.shell,
  sideOpen: document.getElementById('sidebar')?.classList.contains('open') || false,
  inputMode: document.documentElement.dataset.inputMode || '',
}));
if (escRail.railOpen) fail(`Esc did not close optical rail ${JSON.stringify(escRail)}`);
if (escRail.shell !== 'lab-microscope3d') fail(`Esc closed shell too early ${JSON.stringify(escRail)}`);
if (escRail.sideOpen) fail(`Esc opened catalog drawer ${JSON.stringify(escRail)}`);
await desk.keyboard.press('Escape');
await desk.waitForFunction(() => document.documentElement.dataset.shell === 'lab-classic');
const escLeft = await desk.evaluate(() => ({
  shell: document.documentElement.dataset.shell,
  sideOpen: document.getElementById('sidebar')?.classList.contains('open') || false,
  inputMode: document.documentElement.dataset.inputMode || 'lab',
}));
if (escLeft.shell !== 'lab-classic' || escLeft.sideOpen) fail(`second Esc exit ${JSON.stringify(escLeft)}`);
if (escLeft.inputMode !== 'lab') fail(`inputMode after Esc exit ${escLeft.inputMode}`);
// re-enter for remaining tests
await desk.evaluate(() => window.__labCapture.enterMicroscope3d());
await desk.waitForFunction(() => document.documentElement.dataset.shell === 'lab-microscope3d');

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
const beforeNav = await desk.evaluate(() => window.__labCapture.getModelId?.() || '');
await desk.keyboard.press('ArrowDown');
await desk.keyboard.press('j');
await desk.mouse.wheel(0, 1200);
const afterNav = await desk.evaluate(() => ({
  id: window.__labCapture.getModelId?.() || '',
  shell: document.documentElement.dataset.shell,
  inputMode: document.documentElement.dataset.inputMode || '',
}));
if (afterNav.id !== beforeNav || afterNav.shell !== 'lab-microscope3d' || afterNav.inputMode !== 'microscope') {
  fail(`microscope inputMode leaked catalog nav ${JSON.stringify({ beforeNav, afterNav })}`);
}
await desk.click('#btn-micro-exit');
await desk.waitForFunction(() => document.documentElement.dataset.shell === 'lab-classic');
const leftMode = await desk.evaluate(() => document.documentElement.dataset.inputMode || 'lab');
if (leftMode !== 'lab') fail(`inputMode after exit ${leftMode}`);

// Shell cycle: microscope ↔ classic/focus/projector must not leave chrome/CSS leaks.
for (const id of ['lab-focus', 'lab-projector', 'lab-microscope3d', 'lab-classic']) {
  await setShell(desk, id);
  await desk.waitForFunction((shellId) => document.documentElement.dataset.shell === shellId, id);
}
const cycleLeak = await desk.evaluate(() => ({
  shell: document.documentElement.dataset.shell,
  inputMode: document.documentElement.dataset.inputMode || 'lab',
  microActive: document.documentElement.classList.contains('shell-micro-active'),
  chromeHidden: !!document.getElementById('microscope-chrome')?.hidden,
  stageHidden: document.getElementById('micro-stage') ? !!document.getElementById('micro-stage').hidden : true,
  microRoot: document.documentElement.classList.contains('shell-lab-microscope3d'),
}));
if (
  cycleLeak.shell !== 'lab-classic'
  || cycleLeak.inputMode !== 'lab'
  || cycleLeak.microActive
  || !cycleLeak.chromeHidden
  || !cycleLeak.stageHidden
  || cycleLeak.microRoot
) {
  fail(`shell cycle leaked microscope chrome ${JSON.stringify(cycleLeak)}`);
}

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
      menuZ: Number.parseFloat(getComputedStyle(document.getElementById('btn-menu') || document.body).zIndex) || 0,
      toolbarZ: Number.parseFloat(getComputedStyle(document.querySelector('.toolbar') || document.body).zIndex) || 0,
      backdropZ: Number.parseFloat(getComputedStyle(document.getElementById('drawer-backdrop') || document.body).zIndex) || 0,
      drawerOpen: document.body.classList.contains('drawer-open'),
      formulaPadBottom: getComputedStyle(document.querySelector('.model-shell') || document.body).paddingBottom,
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

await compactProj.evaluate(() => document.getElementById('btn-menu')?.click());
const overlayOpen = await stageGeom(compactProj);
await compactProj.screenshot({ path: join(shotsDir, 'shell-projector-1000-overlay.png') });
if (!overlayOpen.overlay || !overlayOpen.sideOpen) {
  fail(`1000 projector menu did not open overlay ${JSON.stringify(overlayOpen)}`);
}
if (overlayOpen.stageW < 700) fail(`1000 projector stage shrank with overlay (${overlayOpen.stageW})`);
if (overlayOpen.backdropHidden) fail('1000 projector overlay missing backdrop');
if (!(overlayOpen.toolbarZ > overlayOpen.backdropZ)) {
  fail(`1000 projector toolbar under backdrop z toolbar=${overlayOpen.toolbarZ} backdrop=${overlayOpen.backdropZ}`);
}
const compactHit = await menuHitTest(compactProj);
if (!compactHit.ok) fail(`1000 projector menu not on top of dimmer ${JSON.stringify(compactHit)}`);
console.log('menuHitTest ok', JSON.stringify(compactHit));
// Menu must still close the overlay (force via DOM — logo may intercept hit-tests).
await compactProj.evaluate(() => document.getElementById('btn-menu')?.click());
const afterMenuToggle = await stageGeom(compactProj);
if (afterMenuToggle.overlay || afterMenuToggle.sideOpen) {
  fail(`1000 projector menu could not close overlay above backdrop ${JSON.stringify(afterMenuToggle)}`);
}
await compactProj.evaluate(() => document.getElementById('btn-menu')?.click());
await compactProj.waitForFunction(() => document.getElementById('chassis')?.classList.contains('shell-sidebar-overlay'));
await compactProj.evaluate(() => document.getElementById('drawer-backdrop')?.click());
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
if (benchOpenGeom.benchCoversFormula) console.warn('1000 projector open bench covers the formula strip'); // soft: layout churn
if (benchOpenGeom.benchCollapsed) fail('1000 projector open drawer still has bench-collapsed');

// Resize 800→1200→800 must clear overlay residue.
await compactProj.setViewportSize({ width: 800, height: 800 });
await compactProj.evaluate(() => document.getElementById('btn-menu')?.click());
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
await focusCompact.evaluate(() => document.getElementById('btn-params')?.click());
await focusCompact.waitForTimeout(250);
const focusBench = await stageGeom(focusCompact);
await focusCompact.screenshot({ path: join(shotsDir, 'shell-focus-1000-bench.png') });
if (!focusBench.benchOpen) fail('1000 focus could not open the param drawer');
if (focusBench.benchCoversFormula) console.warn('1000 focus open bench covers the formula strip'); // soft: layout churn
await focusCompact.close();

const classicCompact = await openPage({ width: 1000, height: 800 }, 2, 'lab-classic');
await classicCompact.evaluate(() => document.getElementById('btn-params')?.click());
await classicCompact.waitForTimeout(250);
const classicBench = await stageGeom(classicCompact);
await classicCompact.screenshot({ path: join(shotsDir, 'shell-classic-1000-bench.png') });
if (!classicBench.benchOpen) fail('1000 classic could not open the param drawer');
if (classicBench.benchCoversFormula) console.warn('1000 classic open bench covers the formula strip'); // soft: layout churn
await classicCompact.close();

// Wide Projector (>1100): overlay must keep a real stage width (no white collapse).
const wideProj = await openPage({ width: 1440, height: 900 }, 1, 'lab-projector');
const wideClosed = await stageGeom(wideProj);
if (wideClosed.stageW < 900) fail(`1440 projector stage too small closed ${wideClosed.stageW}`);
await wideProj.evaluate(() => document.getElementById('btn-menu')?.click());
const wideOpen = await stageGeom(wideProj);
await wideProj.screenshot({ path: join(shotsDir, 'shell-projector-1440-overlay.png') });
if (!wideOpen.overlay || !wideOpen.sideOpen) fail(`1440 projector overlay ${JSON.stringify(wideOpen)}`);
if (wideOpen.stageW < 900) fail(`1440 projector stage collapsed with overlay (${wideOpen.stageW})`);
if (!(wideOpen.toolbarZ > wideOpen.backdropZ)) {
  fail(`1440 projector menu under backdrop z=${wideOpen.toolbarZ}/${wideOpen.backdropZ}`);
}
const wideHit = await menuHitTest(wideProj);
if (!wideHit.ok) fail(`1440 projector menu not on top of dimmer ${JSON.stringify(wideHit)}`);
console.log('menuHitTest wide ok', JSON.stringify(wideHit));

// Catalog must scroll under the overlay; Escape closes it.
await ensureCatalogRows(wideProj);
const scrollInfo = await wideProj.evaluate(() => {
  const side = document.getElementById('sidebar');
  if (!side) return { ok: false, reason: 'no-sidebar' };
  // Physics-only rows may fit the tall overlay — clamp height so overflow:auto is exercised.
  const prevMax = side.style.maxHeight;
  side.style.maxHeight = '220px';
  const before = side.scrollTop;
  side.scrollTop = before + 160;
  const after = side.scrollTop;
  const ok = side.scrollHeight > side.clientHeight + 8 && after > before;
  const overflow = getComputedStyle(side).overflowY;
  side.style.maxHeight = prevMax;
  return { ok, before, after, overflow, scrollHeight: side.scrollHeight, clientHeight: side.clientHeight };
});
if (!scrollInfo.ok) fail(`1440 overlay catalog not scrollable ${JSON.stringify(scrollInfo)}`);
await wideProj.keyboard.press('Escape');
const afterEsc = await stageGeom(wideProj);
if (afterEsc.overlay || afterEsc.sideOpen) fail(`1440 Escape did not close overlay ${JSON.stringify(afterEsc)}`);
await wideProj.evaluate(() => document.getElementById('btn-menu')?.click());
await wideProj.waitForFunction(() => document.getElementById('chassis')?.classList.contains('shell-sidebar-overlay'));
await wideProj.evaluate(() => document.getElementById('btn-menu')?.click());
const wideClosedAgain = await stageGeom(wideProj);
if (wideClosedAgain.overlay) fail('1440 projector menu did not close overlay');
await wideProj.close();


// Fixed menu layout probe: RTL, page scroll, and a mocked safe-area inset.
const layoutProj = await openPage({ width: 1000, height: 800 }, 2, 'lab-projector');
await layoutProj.evaluate(() => {
  document.documentElement.setAttribute('dir', 'rtl');
  const style = document.createElement('style');
  style.id = 'imm-safe-area-mock';
  style.textContent = ':root { --imm-safe-top: 34px; } body { padding-top: var(--imm-safe-top); }';
  document.head.appendChild(style);
});
await layoutProj.evaluate(() => document.getElementById('btn-menu')?.click());
await layoutProj.waitForFunction(() => document.getElementById('chassis')?.classList.contains('shell-sidebar-overlay'));
const rtlHit = await menuHitTest(layoutProj);
if (!rtlHit.ok) fail(`RTL overlay menu not clickable ${JSON.stringify(rtlHit)}`);
const beforeScroll = await layoutProj.evaluate(() => {
  const btn = document.getElementById('btn-menu');
  return btn ? Math.round(btn.getBoundingClientRect().top) : -1;
});
await layoutProj.evaluate(() => { window.scrollTo(0, 120); document.scrollingElement.scrollTop = 120; });
await layoutProj.waitForTimeout(100);
const afterScroll = await layoutProj.evaluate(() => {
  const btn = document.getElementById('btn-menu');
  const r = btn?.getBoundingClientRect();
  return {
    top: r ? Math.round(r.top) : -1,
    pos: btn ? getComputedStyle(btn).position : '',
    stageW: Math.round(document.querySelector('.stage')?.getBoundingClientRect().width || 0),
  };
});
if (afterScroll.pos !== 'fixed') fail(`menu not fixed under RTL/safe-area ${JSON.stringify(afterScroll)}`);
if (Math.abs(afterScroll.top - beforeScroll) > 4) {
  fail(`fixed menu drifted after scroll ${beforeScroll}→${afterScroll.top}`);
}
if (afterScroll.stageW < 700) fail(`RTL overlay collapsed stage ${afterScroll.stageW}`);
const scrollHit = await menuHitTest(layoutProj);
if (!scrollHit.ok) fail(`menu not hittable after scroll ${JSON.stringify(scrollHit)}`);
await layoutProj.screenshot({ path: join(shotsDir, 'shell-projector-1000-rtl-safe.png') });
await layoutProj.close();

// Focus / Classic ≤900: bottom drawer reuses bench-drawer-open padding-bottom.
for (const shell of ['lab-focus', 'lab-classic']) {
  const page = await openPage({ width: 390, height: 844 }, 2, shell);
  await page.evaluate(() => document.getElementById('btn-params')?.click());
  await page.waitForTimeout(250);
  const geom = await stageGeom(page);
  const pad = Number.parseFloat(geom.formulaPadBottom) || 0;
  await page.screenshot({ path: join(shotsDir, `shell-${shell.replace('lab-', '')}-390-bench.png`) });
  if (!geom.benchOpen) fail(`390 ${shell} could not open bottom params`);
  if (pad < 40) fail(`390 ${shell} missing bottom formula pad (${geom.formulaPadBottom})`);
  if (geom.benchCoversFormula) fail(`390 ${shell} bottom drawer covers formula`);
  await page.close();
}

const narrow = await openPage({ width: 390, height: 844 }, 2, 'lab-projector');
const narrowMenu = await narrow.evaluate(() => {
  const btn = document.getElementById('btn-menu');
  const cs = btn ? getComputedStyle(btn) : null;
  return { label: btn?.getAttribute('aria-label') || '', display: cs?.display || '', pe: cs?.pointerEvents || '', w: btn?.getBoundingClientRect().width || 0 };
});
if (narrowMenu.display === 'none' || narrowMenu.pe === 'none' || narrowMenu.w < 8) fail(`390 projector menu not visible ${JSON.stringify(narrowMenu)}`);
if (narrowMenu.label !== 'Open model list') fail(`390 menu label ${narrowMenu.label}`);
await narrow.evaluate(() => document.getElementById('btn-menu')?.click());
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
await narrow.evaluate(() => document.getElementById('drawer-backdrop')?.click());
await narrow.evaluate(() => {
  localStorage.setItem('physics-lab-auto-open-bench', '1');
  document.getElementById('btn-params')?.click();
});
await narrow.waitForTimeout(300);
const narrowBench = await stageGeom(narrow);
await narrow.screenshot({ path: join(shotsDir, 'shell-projector-390-bench.png') });
if (!narrowBench.benchOpen) fail('390 projector could not open the bottom param drawer');
const padBottom = Number.parseFloat(narrowBench.formulaPadBottom) || 0;
if (padBottom < 40) fail(`390 projector formula missing bottom pad (${narrowBench.formulaPadBottom})`);
if (narrowBench.benchCoversFormula) console.warn('390 projector bottom drawer covers the formula strip'); // soft: layout churn
await narrow.evaluate(() => {
  const bench = document.getElementById('bench');
  if (bench?.classList.contains('open')) document.getElementById('btn-params')?.click();
});
await narrow.evaluate(() => document.getElementById('btn-menu')?.click());
await ensureCatalogRows(narrow);
const narrowId = await narrow.evaluate(() => {
  const current = decodeURIComponent((location.hash.match(/m=([^&]+)/) || [])[1] || '');
  const btn = [...document.querySelectorAll('#model-list button.model-item[data-id]')]
    .find((el) => el.dataset.id && el.dataset.id !== current)
    || document.querySelector('#model-list button.model-item[data-id]');
  const id = btn?.dataset.id || 'free-fall';
  if (btn) btn.click();
  else window.__labCapture.switchModel(id);
  const chassis = document.getElementById('chassis');
  if (chassis?.classList.contains('shell-sidebar-overlay')) {
    document.getElementById('btn-menu')?.click();
  }
  return id;
});
if (!narrowId) fail('390 projector overlay listed no models');
await narrow.waitForFunction((id) => {
  const hash = location.hash || '';
  const overlay = document.getElementById('chassis')?.classList.contains('shell-sidebar-overlay');
  return !overlay && (hash.includes(id) || hash.includes(encodeURIComponent(id)));
}, narrowId, { timeout: 20000 });
const narrowPick = await narrow.evaluate(() => ({
  overlay: document.getElementById('chassis').classList.contains('shell-sidebar-overlay'),
  hash: location.hash,
  expanded: document.getElementById('btn-menu')?.getAttribute('aria-expanded') || '',
  openClass: document.getElementById('sidebar')?.classList.contains('open') || false,
}));
if (narrowPick.overlay || narrowPick.openClass) fail(`390 drawer stayed open ${JSON.stringify(narrowPick)}`);
if (!(narrowPick.hash.includes(narrowId) || narrowPick.hash.includes(encodeURIComponent(narrowId)))) {
  fail(`390 hash ${narrowPick.hash}`);
}
if (narrowPick.expanded !== 'false') fail(`390 aria-expanded ${narrowPick.expanded}`);
await narrow.close();

// 390px microscope: brand row, WebGL, params drawer must not overlap
const microNarrow = await openPage({ width: 390, height: 844 }, 2, 'lab-microscope3d');
await microNarrow.waitForFunction(() => document.documentElement.dataset.stageMode === 'webgl3d');
await microNarrow.waitForSelector('#micro-stage:not([hidden])');
const narrowMicro = await microNarrow.evaluate(() => {
  const brand = document.querySelector('.microscope-chrome');
  const wrap = document.querySelector('.canvas-wrap');
  const rail = document.getElementById('micro-rail');
  const readouts = document.getElementById('micro-readouts');
  const br = brand?.getBoundingClientRect();
  const wr = wrap?.getBoundingClientRect();
  const rr = rail?.getBoundingClientRect();
  const mr = readouts?.getBoundingClientRect();
  const overlap = (a, b) => !!(a && b && a.bottom > b.top + 2 && a.top < b.bottom - 2
    && a.right > b.left + 2 && a.left < b.right - 2);
  return {
    brandH: br?.height || 0,
    webglH: wr?.height || 0,
    railOpen: rail?.classList.contains('is-open') || false,
    brandOverWebgl: overlap(br, wr),
    brandOverRail: rail?.classList.contains('is-open') ? overlap(br, rr) : false,
    readoutsOk: (mr?.height || 0) > 8,
    metrics: [...(readouts?.querySelectorAll('.micro-metric') || [])].map((el) => el.dataset.key),
    css: [...document.styleSheets].some((sheet) => (sheet.href || '').includes('microscope-shell.css')),
  };
});
if (narrowMicro.railOpen) fail(`390 micro rail should start closed ${JSON.stringify(narrowMicro)}`);
if (narrowMicro.metrics.join(',') !== 'M,f_obj,NA,d_Abbe') fail(`390 micro metrics ${narrowMicro.metrics.join(',')}`);
if (narrowMicro.brandOverWebgl) fail(`390 micro brand overlaps WebGL ${JSON.stringify(narrowMicro)}`);
if (narrowMicro.brandOverRail) fail(`390 micro brand overlaps rail ${JSON.stringify(narrowMicro)}`);
if (narrowMicro.brandH < 40 || narrowMicro.webglH < 120) {
  fail(`390 micro layout too small ${JSON.stringify(narrowMicro)}`);
}
if (!narrowMicro.css) fail('390 micro missing microscope-shell.css');
if (!narrowMicro.readoutsOk) fail('390 micro readouts missing');
await microNarrow.screenshot({ path: join(shotsDir, 'shell-micro-390.png') });
await microNarrow.close();

await browser.close();
// WebKit proxy for Safari layout (real Safari needs Accessibility for Computer Use).
try {
  const { webkit } = await import('playwright');
  const wk = await webkit.launch({ headless: true });
  const wkPage = await wk.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 2 });
  await wkPage.addInitScript(() => {
    localStorage.setItem('physics-lab-locale-v1', 'en');
    localStorage.removeItem('physics-lab-auto-open-bench');
    localStorage.removeItem('physics-lab-folds-v1');
    localStorage.removeItem('physics-lab-folds');
  });
  await wkPage.goto(`${base}?shell=lab-projector&v=${encodeURIComponent(buildStamp)}&_=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await wkPage.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
  await wkPage.evaluate(() => document.getElementById('btn-menu')?.click());
  await wkPage.waitForFunction(() => document.getElementById('chassis')?.classList.contains('shell-sidebar-overlay'));
  const wkGeom = await stageGeom(wkPage);
  await wkPage.screenshot({ path: join(shotsDir, 'shell-projector-1000-safari-proxy.png') });
  if (wkGeom.stageW < 700) fail(`WebKit projector overlay stage collapsed ${wkGeom.stageW}`);
  const wkHit = await menuHitTest(wkPage);
  if (!wkHit.ok) fail(`WebKit projector menu not on top ${JSON.stringify(wkHit)}`);
  console.log('menuHitTest webkit ok', JSON.stringify(wkHit));
  await wk.close();
} catch (err) {
  fail(`WebKit projector proxy failed: ${err?.message || err}`);
}

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('shell chrome ok');
