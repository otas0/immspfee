#!/usr/bin/env node
/**
 * Phone toolbar must stay hittable and readable at 390×844 (classic).
 * Asserts elementFromPoint on #btn-menu / pause / reset / params and a
 * minimum contrast between button color and background.
 */
import { chromium } from 'playwright';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const minContrast = Number(process.env.TOOLBAR_MIN_CONTRAST || 3);

function contrastRatio(fg, bg) {
  const parse = (c) => {
    const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?/);
    if (!m) return null;
    const a = m[4] == null ? 1 : Number(m[4]);
    if (a < 0.05) return null; // transparent — treat as unknown
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };
  const lin = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const L = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const a = parse(fg);
  const b = parse(bg);
  if (!a || !b) return null;
  const la = L(a) + 0.05;
  const lb = L(b) + 0.05;
  return Math.max(la, lb) / Math.min(la, lb);
}

function fail(msg) {
  console.error('FAIL', msg);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
try {
  await page.goto(`${base.replace(/\/?$/, '/')}?shell=lab-classic&lang=en&_=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 90000 });
  await page.waitForTimeout(400);

  const report = await page.evaluate(() => {
    const ids = ['btn-menu', 'btn-pause', 'btn-reset', 'btn-params'];
    const out = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) {
        out[id] = { ok: false, reason: 'missing' };
        continue;
      }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const x = Math.min(r.right - 2, Math.max(r.left + 2, r.left + r.width * 0.5));
      const y = Math.min(r.bottom - 2, Math.max(r.top + 2, r.top + r.height * 0.5));
      const hit = document.elementFromPoint(x, y);
      const inBtn = !!(hit && (hit === el || el.contains(hit)));
      out[id] = {
        display: cs.display,
        w: Math.round(r.width),
        h: Math.round(r.height),
        color: cs.color,
        bg: cs.backgroundColor,
        inBtn,
        hasSvg: !!el.querySelector('svg'),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        ok: cs.display !== 'none'
          && r.width >= 24
          && r.height >= 24
          && inBtn
          && r.top >= -1
          && r.bottom <= window.innerHeight + 1,
      };
    }
    return out;
  });

  console.log('toolbar-hit', JSON.stringify(report));
  for (const [id, info] of Object.entries(report)) {
    if (!info.ok) fail(`${id} not hittable ${JSON.stringify(info)}`);
    const ratio = contrastRatio(info.color, info.bg);
    if (ratio != null && ratio < minContrast) {
      fail(`${id} contrast ${ratio.toFixed(2)} < ${minContrast} (${info.color} on ${info.bg})`);
    }
    console.log(id, 'contrast', ratio == null ? 'n/a' : Number(ratio.toFixed(2)));
  }
  console.log('toolbar-hit-contrast ok');
} finally {
  await browser.close();
}
