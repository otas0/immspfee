#!/usr/bin/env node
/**
 * Narrow-screen regression: drawer stays closed, the formula stays on screen,
 * and the three English “not a design tool” lines are the active locale.
 * Requires the lab server (npm start) and Playwright Chromium.
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
const caveats = [
  ['neutron-diffusion', 'Public definition only. Not a reactor or device design tool.'],
  ['r107-燃料电池', 'Public definition only. Not a process or formulation design tool.'],
  ['hodgkin-huxley', 'Public definition only. Not a clinical or dosing design tool.'],
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.addInitScript(() => {
  localStorage.setItem('physics-lab-locale-v1', 'en');
  localStorage.removeItem('physics-lab-auto-open-bench');
  const orig = CanvasRenderingContext2D.prototype.fillText;
  window.__fillTexts = [];
  CanvasRenderingContext2D.prototype.fillText = function fillTextHook(text, ...rest) {
    window.__fillTexts.push(String(text));
    return orig.call(this, text, ...rest);
  };
});

const failures = [];
async function openModel(id) {
  await page.goto(`${base}?narrow=${encodeURIComponent(id)}#m=${encodeURIComponent(id)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
  await page.evaluate(() => { window.__fillTexts = []; });
  await page.evaluate((mid) => window.__labCapture.switchModel(mid), id);
  await page.waitForTimeout(400);
}

for (const [id, file] of layout) {
  await openModel(id);
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
    };
  });
  const png = path.join(shots, file);
  await page.screenshot({ path: png });
  const bytes = fs.statSync(png).size;
  if (info.open) failures.push(`${id}: drawer opened by default`);
  if (info.covered || info.off) failures.push(`${id}: formula covered or offscreen (${info.formula})`);
  if (!info.formula.startsWith('Equation ')) failures.push(`${id}: formula missing (${info.formula})`);
  if (info.assumptions || info.assumptionText) failures.push(`${id}: assumption strip still on the shell`);
  if (info.formulaHan) failures.push(`${id}: formula still has Han (${info.formula})`);
  if (info.overflowY !== 'auto' || info.maxHeight === 'none') failures.push(`${id}: formula is not a scrolling strip (${info.overflowY} ${info.maxHeight})`);
  if (bytes < 8000) failures.push(`${id}: screenshot too small (${bytes})`);
  if (id === 'r018-玻尔模型') {
    const blob = info.texts.join('\n');
    if (!info.texts.some((s) => s.includes('n=')) || !blob.includes('轨道 r∝n²')) {
      failures.push(`${id}: canvas missing level labels`);
    }
  }
  if (id === 'neutron-diffusion') {
    if (!info.texts.includes('φ = φ₀ cos(πx/a)')) failures.push(`${id}: canvas missing the cosine label`);
    if (info.caveatClipped || !info.caveatOnScreen) failures.push(`${id}: caveat clipped or offscreen`);
    const layout = await page.evaluate(() => {
      const formula = document.getElementById('shell-formula');
      const caveat = document.getElementById('shell-caveat');
      const fr = formula?.getBoundingClientRect();
      const cr = caveat?.getBoundingClientRect();
      const cs = caveat ? getComputedStyle(caveat) : null;
      const lineH = parseFloat(cs?.lineHeight) || 16;
      const lines = cr && lineH ? Math.round(cr.height / lineH) : 0;
      const overlap = !!(fr && cr && cr.height > 8 && fr.bottom > cr.top + 1 && fr.top < cr.bottom - 1);
      const fullVisible = !!(caveat && !caveat.hidden && cr && cr.top >= 0 && cr.bottom <= window.innerHeight + 1 && caveat.scrollHeight <= caveat.clientHeight + 1);
      return {
        overlap,
        lines,
        fullVisible,
        assumptions: !!document.getElementById('shell-assumptions'),
        assumptionText: /Assumptions/.test(document.getElementById('model-shell')?.innerText || ''),
      };
    });
    if (layout.assumptions || layout.assumptionText) failures.push(`${id}: assumption strip still on the shell`);
    if (layout.overlap) failures.push(`${id}: formula bar covers the caveat`);
    if (layout.lines < 1 || !layout.fullVisible) {
      failures.push(`${id}: caveat not fully visible (lines=${layout.lines})`);
    }
    if (layout.lines !== 1) {
      failures.push(`${id}: caveat line count ${layout.lines} (expected 1 at 390px)`);
    }
  }
}

for (const [id, expect] of caveats) {
  await openModel(id);
  const text = await page.evaluate(() => document.getElementById('shell-caveat')?.textContent || '');
  if (text !== expect) failures.push(`${id}: caveat ${JSON.stringify(text)} wanted ${JSON.stringify(expect)}`);
}

await page.setViewportSize({ width: 390, height: 844 });
await openModel('r018-玻尔模型');
await page.click('#btn-menu');
await page.waitForTimeout(300);
const drawer = await page.evaluate(() => {
  const list = document.getElementById('model-list');
  const lr = list?.getBoundingClientRect();
  const names = [...document.querySelectorAll('#model-list .model-item .name')].slice(0, 8).map((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, h: r.height, text: el.textContent || '' };
  });
  const inside = (n) => !!(lr && n && n.h > 8 && n.top >= lr.top - 1 && n.bottom <= lr.bottom + 1);
  const firstThree = names.slice(0, 3);
  return {
    open: document.getElementById('sidebar')?.classList.contains('open') || false,
    listH: lr?.height || 0,
    firstThreeInside: firstThree.length === 3 && firstThree.every(inside),
    firstThree: firstThree.map((n) => n.text),
  };
});
await page.screenshot({ path: path.join(shots, 'narrow-drawer-open.png') });
if (!drawer.open) failures.push('390px drawer did not open');
if (!drawer.firstThreeInside) {
  failures.push(`390px drawer hides one of the first three model names (${drawer.firstThree.join(' | ')})`);
}

await page.click('#btn-menu');
await page.waitForTimeout(200);
await page.click('#btn-params');
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

await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(`${base}?miss=1`, { waitUntil: 'domcontentloaded' });
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

await browser.close();
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('narrow regression ok', layout.length + caveats.length);
