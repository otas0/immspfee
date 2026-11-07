#!/usr/bin/env node
/**
 * Capture WebKit promo stills for the microscope shell:
 *  - docs/promo/micro-1280-webkit-binocular.png (labels on, lamp on)
 *  - docs/promo/micro-390-webkit-binocular.png (390×844; binocular if setCameraView)
 *  - docs/assets/shell-micro-1280-lamp-off-webkit.png (lamp off contrast)
 * Requires lab server + Playwright WebKit.
 */
import { chromium, webkit } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = `${base.replace(/\/?$/, '/')}?shell=lab-microscope3d&lang=en&_=${Date.now()}`;
const useWebkit = process.env.MICRO_BROWSER !== 'chromium';

const browser = await (useWebkit ? webkit : chromium).launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
console.log('micro-shots browser', useWebkit ? 'webkit' : 'chromium');

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(
    () => window.__labCapture && document.documentElement.dataset.stageMode === 'webgl3d',
    null,
    { timeout: 90000 },
  );
  await page.evaluate(() => {
    window.__labCapture.pause?.();
    const p = window.__labCapture.getParams() || {};
    p.showLabels = 1;
    p.lampOn = 1;
    p.objective = '10x';
    window.__labCapture.paintFrame?.();
  });
  await page.click('#micro-obj [data-obj="10x"]').catch(() => {});
  await page.evaluate(() => {
    for (let i = 0; i < 6; i += 1) window.__labCapture.paintFrame?.();
  });
  const promo = path.join(root, 'docs/promo/micro-1280-webkit-binocular.png');
  await page.screenshot({ path: promo, fullPage: false });
  console.log('wrote', path.relative(root, promo));

  await page.click('[data-lamp="0"]');
  await page.evaluate(() => {
    for (let i = 0; i < 4; i += 1) window.__labCapture.paintFrame?.();
  });
  const lampOff = path.join(root, 'docs/assets/shell-micro-1280-lamp-off-webkit.png');
  fs.mkdirSync(path.dirname(lampOff), { recursive: true });
  await page.locator('#canvas-webgl').screenshot({ path: lampOff });
  console.log('wrote', path.relative(root, lampOff));

  await page.click('[data-lamp="1"]').catch(() => {});
  await page.setViewportSize({ width: 390, height: 844 });
  // 390 promo: default-hide labels, params closed, binocular + full view-chip row (incl. Lamp/Condenser/Side).
  await page.evaluate(() => {
    document.getElementById('micro-rail')?.classList.remove('is-open');
    document.getElementById('bench')?.classList.remove('is-open');
    document.body.classList.remove('drawer-open', 'params-open');
    document.querySelector('#micro-labels [data-labels="0"]')?.click();
    window.__labCapture.setParam?.('showLabels', 0);
    window.__labCapture.setParam?.('lampOn', 1);
    const stage = window.__labCapture.getWebglStage?.();
    stage?.setCameraView?.('binocular');
    for (const el of document.querySelectorAll('#micro-views .micro-chip')) {
      el.classList.toggle('is-active', el.dataset.view === 'binocular');
    }
    for (let i = 0; i < 6; i += 1) window.__labCapture.paintFrame?.();
  });
  await page.click('#micro-views [data-view="binocular"]').catch(() => {});
  await page.waitForTimeout(200);
  const promo390 = path.join(root, 'docs/promo/micro-390-webkit-binocular.png');
  fs.mkdirSync(path.dirname(promo390), { recursive: true });
  await page.screenshot({ path: promo390, fullPage: false });
  console.log('wrote', path.relative(root, promo390));
  console.log('test:micro-shots ok');
} finally {
  await browser.close();
}
