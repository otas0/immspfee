#!/usr/bin/env node
/**
 * Closing an open sub-group must release its model-item DOM (lazy unmount).
 */
import { chromium } from 'playwright';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`${base.replace(/\/?$/, '/')}?shell=lab-classic&lang=zh&m=fam-projectile-v01&_=${Date.now()}`, {
  waitUntil: 'domcontentloaded',
  timeout: 90000,
});
await page.waitForFunction(() => window.__labCapture?.getModelId, { timeout: 90000 });
await page.waitForFunction(() => document.querySelectorAll('#model-list .model-item').length >= 2, { timeout: 30000 });

const report = await page.evaluate(async () => {
  const openSubs = () => [...document.querySelectorAll('#model-list details.sub-group[open]')];
  const countItems = () => document.querySelectorAll('#model-list .model-item').length;
  const before = countItems();
  const open = openSubs();
  if (!open.length) return { ok: false, reason: 'no open sub', before };
  // Open a second sub under 物理 if available.
  const domain = document.querySelector('#model-list details.domain-group[data-domain="物理"]');
  const closed = domain
    ? [...domain.querySelectorAll('details.sub-group')].filter((el) => !el.open)
    : [];
  if (closed[0]) {
    closed[0].open = true;
    await new Promise((r) => setTimeout(r, 50));
  }
  const mid = countItems();
  // Close every open sub except keep one summary interaction.
  for (const el of openSubs()) el.open = false;
  await new Promise((r) => setTimeout(r, 50));
  const after = countItems();
  return {
    ok: after < mid && after <= 2,
    before,
    mid,
    after,
    openAfter: openSubs().length,
  };
});

await browser.close();
console.log(JSON.stringify(report, null, 2));
if (!report.ok) {
  console.error('sidebar-sub-dom FAIL');
  process.exit(1);
}
console.log('sidebar-sub-dom ok');
