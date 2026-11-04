#!/usr/bin/env node
/**
 * Playwright：拖电位器 / 滑条不会把 timeScale 指数爆表
 */
import { chromium } from 'playwright';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__labCapture);

// 注入一个离谱初值，确认 sanitize 立刻钳住
await page.evaluate(() => {
  window.__labCapture.setGlobals({ timeScale: 1e50 });
});
const afterSanitize = await page.evaluate(() => window.__labCapture.getGlobals().timeScale);
if (!(afterSanitize <= 8)) {
  console.error('FAIL sanitize after setGlobals', afterSanitize);
  process.exit(1);
}
console.log('PASS sanitize setGlobals →', afterSanitize);

// 展开 sys，狂拖 timeScale 滑条到最大多次
await page.evaluate(() => {
  const sys = document.querySelector('.param-section.is-sys details');
  if (sys) sys.open = true;
});

const range = page.locator('.param-section.is-sys .param-row', { hasText: 'timeScale' }).locator('input.pot-range');
await range.waitFor({ state: 'visible', timeout: 5000 });

await page.evaluate(() => window.__labCapture.play());
const wasPlaying = await page.evaluate(() => !window.__labCapture.isPaused());

for (let i = 0; i < 12; i += 1) {
  await range.fill('8');
  await range.evaluate((el) => {
    el.value = el.max;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

// 再拖 dial 到极限角
await page.evaluate(() => {
  const dial = document.querySelector('.param-section.is-sys .param-row .pot-dial');
  if (!dial) return;
  const r = dial.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  for (let i = 0; i < 30; i += 1) {
    dial.dispatchEvent(new MouseEvent('mousedown', { clientX: cx + 30, clientY: cy - 10, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: cx + 40, clientY: cy - 20, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  }
});

const g = await page.evaluate(() => window.__labCapture.getGlobals());
const pausedDuring = await page.evaluate(() => {
  // 再 pointerdown 一次看是否暂停
  const rangeEl = document.querySelector('.param-section.is-sys .param-row input.pot-range');
  rangeEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  const mid = window.__labCapture.isPaused();
  rangeEl.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  return mid;
});

if (!(g.timeScale <= 8 && g.timeScale >= 0.05 && Number.isFinite(g.timeScale))) {
  console.error('FAIL timeScale exploded', g.timeScale);
  process.exit(1);
}
if (g.timeScale > 1e6) {
  console.error('FAIL timeScale still huge', g.timeScale);
  process.exit(1);
}
console.log('PASS pot drag bounded →', g.timeScale);

if (wasPlaying && !pausedDuring) {
  console.error('FAIL scrub did not pause sim');
  process.exit(1);
}
console.log('PASS scrub pauses sim');

// 输入爆炸值应钳制
await page.evaluate(() => {
  const input = [...document.querySelectorAll('.param-section.is-sys .param-row')]
    .find((r) => r.querySelector('.key')?.textContent === 'timeScale')
    ?.querySelector('input[type=text]');
  input.value = '1e99';
  input.dispatchEvent(new Event('change', { bubbles: true }));
});
const typed = await page.evaluate(() => window.__labCapture.getGlobals().timeScale);
if (typed !== 8) {
  console.error('FAIL typed clamp', typed);
  process.exit(1);
}
console.log('PASS typed 1e99 →', typed);

await browser.close();
console.log('pot regression ok');
