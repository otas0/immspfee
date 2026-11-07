#!/usr/bin/env node
/**
 * Poster print smoke + optional PDF export.
 *
 *   node scripts/poster-print.mjs              # smoke (screenshot + A4 size assert)
 *   node scripts/poster-print.mjs --pdf        # also write docs/promo/immspfee-lab-a4.pdf
 *   POSTER_LANG=zh node scripts/poster-print.mjs
 *
 * Expects the lab dev server on PORT (default 8765), or starts one.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 8765);
const lang = (process.env.POSTER_LANG || 'en').toLowerCase();
const wantPdf = process.argv.includes('--pdf');
const outDir = path.join(root, 'docs/promo');
const shotPath = path.join(outDir, `poster-a4-${lang}.png`);
const pdfPath = path.join(outDir, 'immspfee-lab-a4.pdf');

const MM = 96 / 25.4;
const A4_W = 210 * MM;
const A4_H = 297 * MM;
const TOL = 2; // CSS px

function waitHttp(url, ms = 20000) {
  const deadline = Date.now() + ms;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve();
        else if (Date.now() > deadline) reject(new Error(`HTTP ${res.statusCode}`));
        else setTimeout(tick, 200);
      });
      req.on('error', () => {
        if (Date.now() > deadline) reject(new Error('server not up'));
        else setTimeout(tick, 200);
      });
    };
    tick();
  });
}

let owned = null;
const base = `http://127.0.0.1:${port}`;
try {
  await waitHttp(`${base}/poster.html`, 1500);
} catch {
  owned = spawn(process.execPath, ['scripts/dev-server.mjs'], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
  });
  await waitHttp(`${base}/poster.html`, 30000);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Math.ceil(A4_W) + 80, height: Math.ceil(A4_H) + 120 },
  deviceScaleFactor: 2,
});

const url = `${base}/poster.html?lang=${encodeURIComponent(lang)}`;
await page.goto(url, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });

const box = await page.locator('[data-poster-sheet]').boundingBox();
if (!box) throw new Error('poster sheet not found');

const dw = Math.abs(box.width - A4_W);
const dh = Math.abs(box.height - A4_H);
if (dw > TOL || dh > TOL) {
  console.error('poster-print: size mismatch', {
    got: { w: box.width, h: box.height },
    want: { w: A4_W, h: A4_H },
    delta: { w: dw, h: dh },
  });
  process.exitCode = 1;
} else {
  console.log('poster-print: A4 size ok', {
    w: +box.width.toFixed(2),
    h: +box.height.toFixed(2),
    lang,
  });
}

fs.mkdirSync(outDir, { recursive: true });
await page.locator('[data-poster-sheet]').screenshot({ path: shotPath, type: 'png' });
console.log('poster-print: wrote', path.relative(root, shotPath));

if (wantPdf) {
  await page.pdf({
    path: pdfPath,
    printBackground: true,
    preferCSSPageSize: true,
    width: '210mm',
    height: '297mm',
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  console.log('poster-print: wrote', path.relative(root, pdfPath));
}

await browser.close();
if (owned) {
  owned.kill('SIGTERM');
}
if (process.exitCode) process.exit(process.exitCode);
