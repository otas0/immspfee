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
  }
}

for (const [id, expect] of caveats) {
  await openModel(id);
  const text = await page.evaluate(() => document.getElementById('shell-caveat')?.textContent || '');
  if (text !== expect) failures.push(`${id}: caveat ${JSON.stringify(text)} wanted ${JSON.stringify(expect)}`);
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
if (q !== '碰撞 · 没有这条') failures.push(`filter-q ${JSON.stringify(q)}`);
if (listed !== 0) failures.push(`sidebar still lists ${listed} models for the missing key`);

await browser.close();
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('narrow regression ok', layout.length + caveats.length);
