#!/usr/bin/env node
/**
 * Layout probe: fold-bar / heavy chip / custom-model entry share the same left edge.
 * Exit 0 when aligned within 2px; otherwise print deltas and exit 1.
 */
import { chromium } from 'playwright';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`${base}?shell=lab-classic&lang=zh&_=${Date.now()}`, {
  waitUntil: 'domcontentloaded',
  timeout: 90000,
});
await page.waitForSelector('#model-list, .fold-bar, [data-filter="heavy"]', { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(800);

const report = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { sel, left: r.left, top: r.top, w: r.width, text: (el.textContent || '').trim().slice(0, 40) };
  };
  const fold = pick('.fold-bar') || pick('.fold-controls') || pick('[data-role="fold-bar"]');
  const heavy = pick('[data-filter="heavy"]')
    || [...document.querySelectorAll('.filter-chip, button, [role="button"]')]
      .map((el) => ({ el, t: (el.textContent || '').trim() }))
      .find((x) => /重模型|Heavy/i.test(x.t))?.el;
  const heavyBox = heavy ? (() => {
    const r = heavy.getBoundingClientRect();
    return { sel: 'heavy-chip', left: r.left, top: r.top, w: r.width, text: (heavy.textContent || '').trim().slice(0, 40) };
  })() : null;
  const customEl = document.querySelector('#btn-user-model')
    || document.querySelector('[data-action="user-model"]')
    || [...document.querySelectorAll('button, a, .sidebar-item, .sidebar-foot button')]
      .find((el) => /自建|Custom model|\+\s*自建/i.test((el.textContent || '').trim()));
  const customBox = customEl ? (() => {
    const r = customEl.getBoundingClientRect();
    return { sel: 'user-model', left: r.left, top: r.top, w: r.width, text: (customEl.textContent || '').trim().slice(0, 40) };
  })() : null;

  return { fold, heavy: heavyBox, custom: customBox };
});

await browser.close();

const rows = [report.fold, report.heavy, report.custom].filter(Boolean);
if (rows.length < 2) {
  console.error('SIDEBAR_LEFT incomplete', JSON.stringify(report, null, 2));
  process.exit(1);
}
const lefts = rows.map((r) => r.left);
const lo = Math.min(...lefts);
const hi = Math.max(...lefts);
const delta = hi - lo;
console.log(JSON.stringify({ delta, rows }, null, 2));
if (delta > 2.5) {
  console.error(`SIDEBAR_LEFT misaligned by ${delta.toFixed(2)}px`);
  process.exit(1);
}
console.log('SIDEBAR_LEFT ok');
