#!/usr/bin/env node
/**
 * Deep-link ?m=fam-projectile-v01 must:
 *  - boot that model (governing equation + refresh)
 *  - show the item in the classic-mechanics list with the 方程/eq tag
 *  - keep sibling fam rows available without painting every 物理 model
 */
import { chromium } from 'playwright';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const id = process.env.FAM_ID || 'fam-projectile-v01';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const url = `${base.replace(/\/?$/, '/')}?shell=lab-classic&lang=zh&m=${encodeURIComponent(id)}&_=${Date.now()}`;
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => window.__labCapture?.getModelId, { timeout: 90000 });
await page.evaluate(async (mid) => {
  await window.__labCapture.switchModel?.(mid);
}, id);
await page.waitForTimeout(900);
await page.waitForFunction((mid) => {
  const btn = document.querySelector(`#model-list .model-item[data-id="${mid}"]`);
  return !!btn && btn.classList.contains('active');
}, id, { timeout: 30000 });

const report = await page.evaluate(async (mid) => {
  const c = window.__labCapture;
  const btn = document.querySelector(`#model-list .model-item[data-id="${mid}"]`);
  const tags = btn ? [...btn.querySelectorAll('.tag')].map((t) => t.textContent.trim()) : [];
  const itemsInOpenSubs = [...document.querySelectorAll('#model-list details.sub-group[open] .model-item')].length;
  const allItems = document.querySelectorAll('#model-list .model-item').length;
  const model = c.getModel?.();
  const r0 = c.getReadouts?.() || [];
  c.setParam?.('k', 0.45);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 40));
  c.paintFrame?.();
  const r1 = c.getReadouts?.() || [];
  return {
    stamp: window.__LAB_ASSET_V,
    modelId: c.getModelId?.(),
    equation: model?.equation || '',
    governing: !!model?.governing,
    hasRefresh: typeof model?.refresh === 'function',
    drawKind: c.getState?.()?.drawKind || null,
    hasBtn: !!btn,
    active: !!btn?.classList.contains('active'),
    tags,
    itemsInOpenSubs,
    allItems,
    readoutChanged: JSON.stringify(r0) !== JSON.stringify(r1),
    shellEq: document.getElementById('shell-formula')?.textContent || '',
  };
}, id);

await browser.close();
console.log(JSON.stringify(report, null, 2));

const fail = (msg) => {
  console.error(`fam-deeplink FAIL: ${msg}`);
  process.exit(1);
};
if (report.modelId !== id) fail(`modelId=${report.modelId}`);
if (!report.governing || !report.hasRefresh) fail('not governing/refresh');
if (!report.hasBtn || !report.active) fail('list button missing/inactive');
if (!report.tags.some((t) => /方程|eq|方程式|방정식/i.test(t))) fail(`no eq tag ${report.tags}`);
if (!report.readoutChanged) fail('k scrub did not move readouts');
if (!(report.itemsInOpenSubs >= 2)) fail(`open-sub items ${report.itemsInOpenSubs}`);
// Lazy fill: must not mount the entire 物理 catalog (~430) just for one deep link.
if (report.allItems > 120) fail(`too many mounted items ${report.allItems} (expected lazy subs)`);
console.log('fam-deeplink ok');
