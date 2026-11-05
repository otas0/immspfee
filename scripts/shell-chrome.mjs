#!/usr/bin/env node
/**
 * Shell chrome: DPR cap, projector overlay, microscope WebGL, English names,
 * and the custom-model failure path.
 * Requires the lab server (LAB_URL, default http://127.0.0.1:8765/).
 */
import { chromium } from 'playwright';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const failures = [];

function fail(msg) {
  failures.push(msg);
}

const browser = await chromium.launch({ headless: true });

async function openPage(viewport, dsf, shell) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: dsf });
  await page.addInitScript(() => {
    localStorage.setItem('physics-lab-locale-v1', 'en');
    localStorage.removeItem('physics-lab-auto-open-bench');
  });
  await page.goto(`${base}?shell=${shell}&v=5918f93`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
  await page.evaluate(() => new Promise((resolve) => {
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  return page;
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
      webglRatio: ratio(webgl),
      webglHidden: !!webgl.hidden,
      webglDisplay: getComputedStyle(webgl).display,
      canvasHidden: !!canvas.hidden,
      webglCw: webgl.clientWidth,
      menu: document.getElementById('btn-menu')?.getAttribute('aria-label') || '',
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
  if (Math.abs(m.ratio - 3) > 0.05) fail(`${shell} ${w} deviceDpr ${dsf}: canvas ratio ${m.ratio} (cap must hold at 3)`);
  if (m.dpr > 3 && m.ratio > 3.05) fail(`${shell} followed device DPR ${m.dpr}`);
  await page.close();
}

const desk = await openPage({ width: 1440, height: 900 }, 1, 'lab-classic');
await desk.evaluate((id) => {
  const sel = document.getElementById('shell-select');
  sel.value = id;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
}, 'lab-projector');
await desk.waitForFunction(() => document.documentElement.dataset.shell === 'lab-projector');
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
  };
});
if (!opened.overlay || opened.pe !== 'auto' || opened.vis !== 'visible') {
  fail(`projector overlay open ${JSON.stringify(opened)}`);
}
if (opened.label !== 'Close model list') fail(`menu label when open: ${opened.label}`);
await desk.locator('#model-list button[data-id="free-fall"]').click();
await desk.waitForFunction(() => location.hash.includes('free-fall'));
const afterPick = await desk.evaluate(() => ({
  overlay: document.getElementById('chassis').classList.contains('shell-sidebar-overlay'),
  hash: location.hash,
}));
if (afterPick.overlay) fail('overlay stayed open after selecting a model');
if (!afterPick.hash.includes('free-fall')) fail(`hash ${afterPick.hash}`);
const toggled = await desk.evaluate(() => {
  const menu = document.getElementById('btn-menu');
  const chassis = document.getElementById('chassis');
  menu.click();
  const opened = chassis.classList.contains('shell-sidebar-overlay');
  menu.click();
  const closed = !chassis.classList.contains('shell-sidebar-overlay');
  return { opened, closed };
});
if (!toggled.opened || !toggled.closed) fail(`menu toggle opened=${toggled.opened} closed=${toggled.closed}`);

await desk.evaluate((id) => {
  const sel = document.getElementById('shell-select');
  sel.value = id;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
}, 'lab-microscope3d');
await desk.waitForFunction(() => document.documentElement.dataset.stageMode === 'webgl3d');
await desk.waitForFunction(() => location.hash.includes('r016-'));
const micro = await metrics(desk);
if (micro.cap !== 3) fail(`microscope3d cap ${micro.cap}`);
if (!micro.canvasHidden) fail('2D canvas stayed visible on microscope 3D');
if (micro.webglHidden || micro.webglDisplay === 'none') fail(`webgl hidden=${micro.webglHidden} display=${micro.webglDisplay}`);
if (micro.webglCw < 100) fail(`webgl client width ${micro.webglCw}`);
if (micro.dpr <= 3 && Math.abs(micro.webglRatio - Math.min(micro.dpr, 3)) > 0.05) {
  fail(`microscope webgl ratio ${micro.webglRatio} dpr ${micro.dpr}`);
}

await desk.waitForFunction(() => {
  const el = document.querySelector('[data-id="r016-显微镜"] .name');
  return el && el.textContent.trim() === 'Compound microscope';
}, null, { timeout: 20000 });
const names = await desk.evaluate(async () => {
  const pack = await fetch('./data/locales/models-en.json').then((r) => r.json());
  let leak = 0;
  let checked = 0;
  for (const btn of document.querySelectorAll('#model-list .model-item')) {
    const en = pack[btn.dataset.id]?.name;
    if (!en) continue;
    checked += 1;
    const shown = btn.querySelector('.name')?.textContent.trim();
    if (shown !== en) leak += 1;
  }
  return {
    micro: document.querySelector('[data-id="r016-显微镜"] .name')?.textContent.trim(),
    previews: document.querySelectorAll('#model-list .preview').length,
    leak,
    checked,
  };
});
if (names.micro !== 'Compound microscope') fail(`microscope sidebar name ${names.micro}`);
if (/[\u4e00-\u9fff]/.test(names.micro || '')) fail('Chinese catalog name leaked onto the microscope row');
if (!names.previews) fail('sidebar assumption preview is missing');
if (names.leak) fail(`${names.leak}/${names.checked} English names did not replace the catalog source`);

await desk.evaluate((id) => {
  const sel = document.getElementById('shell-select');
  sel.value = id;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
}, 'lab-classic');
await desk.waitForFunction(() => document.documentElement.dataset.shell === 'lab-classic');
await desk.locator('#btn-user-model').scrollIntoViewIfNeeded();
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
if (dialog.text.includes('Validation passed') || dialog.toast.includes('Validation passed')) {
  fail('failed submit showed dialog.validOk');
}

await desk.close();
await browser.close();
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('shell chrome ok');
