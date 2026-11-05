#!/usr/bin/env node
/**
 * 窄屏 toolbar / 菜单开合 / HC 图标视觉回归截图 → shots/ui-*.png
 * 用法：npm start 后 npm run shots:ui
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(root, 'shots');
fs.mkdirSync(shots, { recursive: true });

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__labCapture);
await page.evaluate(() => {
  window.__labCapture.switchModel('free-fall');
  window.__labCapture.pause();
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('bench')?.classList.remove('open');
  const bd = document.getElementById('drawer-backdrop');
  if (bd) bd.hidden = true;
  document.body.classList.remove('drawer-open');
});
await page.waitForTimeout(180);

await page.evaluate(() => {
  document.getElementById('sidebar')?.classList.add('open');
});
await page.waitForTimeout(280);
await page.locator('.filters').screenshot({ path: path.join(shots, 'ui-mobile-filters.png') });
await page.evaluate(() => {
  document.getElementById('sidebar')?.classList.remove('open');
  const bd = document.getElementById('drawer-backdrop');
  if (bd) bd.hidden = true;
});
await page.waitForTimeout(120);

// 左上角 toolbar（菜单关）
await page.locator('#btn-menu').screenshot({ path: path.join(shots, 'ui-mobile-menu-closed.png') });
await page.locator('.toolbar').screenshot({ path: path.join(shots, 'ui-mobile-toolbar.png') });

const bezelGeom = await page.evaluate(() => {
  const wrap = document.querySelector('.canvas-wrap')?.getBoundingClientRect();
  const bezel = document.querySelector('.display-bezel')?.getBoundingClientRect();
  const vh = window.innerHeight;
  return {
    wrapH: wrap?.height || 0,
    bezelH: bezel?.height || 0,
    vh,
    ok: !!(wrap && bezel && wrap.height >= 160 && bezel.height >= vh * 0.35),
  };
});
fs.writeFileSync(
  path.join(shots, 'ui-mobile-bezel.json'),
  `${JSON.stringify(bezelGeom, null, 2)}\n`,
);
await page.locator('.display-bezel').screenshot({ path: path.join(shots, 'ui-mobile-bezel.png') });
console.log('bezel', bezelGeom);

// 菜单开 → close 图标（JS click，toolbar 已抬到 z-index 32）
await page.evaluate(() => document.getElementById('btn-menu')?.click());
await page.waitForTimeout(320);
await page.locator('#btn-menu').screenshot({ path: path.join(shots, 'ui-mobile-menu-open.png') });
const expanded = await page.getAttribute('#btn-menu', 'aria-expanded');
if (expanded !== 'true') console.warn('WARN aria-expanded expected true, got', expanded);
await page.evaluate(() => document.getElementById('btn-menu')?.click());
await page.waitForTimeout(200);

await page.locator('#btn-params').screenshot({ path: path.join(shots, 'ui-mobile-params.png') });

await page.evaluate(() => document.getElementById('btn-hc')?.click());
await page.waitForTimeout(150);
await page.locator('.toolbar').screenshot({ path: path.join(shots, 'ui-hc-toolbar.png') });
const hcContrast = await page.evaluate(() => {
  const sample = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const parse = (c) => {
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
    };
    const lum = ([r, g, b]) => {
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    let bgStr = cs.backgroundColor;
    if (bgStr === 'rgba(0, 0, 0, 0)' || bgStr === 'transparent') {
      bgStr = getComputedStyle(document.documentElement).backgroundColor
        || getComputedStyle(document.body).backgroundColor;
    }
    const fg = lum(parse(cs.color));
    const bg = lum(parse(bgStr));
    const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    return { color: cs.color, bg: bgStr, ratio: Number(ratio.toFixed(2)) };
  };
  const menu = sample('#btn-menu');
  const params = sample('#btn-params');
  const ok = (menu?.ratio || 0) >= 4.5 && (params?.ratio || 0) >= 4.5;
  return { menu, params, ok };
});
fs.writeFileSync(
  path.join(shots, 'ui-hc-contrast.json'),
  `${JSON.stringify(hcContrast, null, 2)}\n`,
);
console.log('hc contrast', hcContrast);
if (!hcContrast.ok) console.warn('WARN HC icon contrast < 4.5');

await browser.close();
console.log('ui shots →', shots);
if (!bezelGeom.ok) {
  console.error('FAIL mobile bezel height too small');
  process.exit(1);
}
