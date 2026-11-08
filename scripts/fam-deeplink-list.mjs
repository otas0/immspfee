#!/usr/bin/env node
/**
 * Deep-link fam models must boot with governing equations, show the 方程/eq
 * tag in the open sub list, and keep sibling rows without mounting all of 物理.
 *
 * FAM_IDS=fam-projectile-v01,fam-lens-v01,fam-axial-v01 (comma-separated)
 */
import { chromium } from 'playwright';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';
const ids = String(process.env.FAM_IDS || 'fam-projectile-v01,fam-lens-v01,fam-axial-v01')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const scrubFor = {
  'fam-projectile-v01': { key: 'k', value: 0.45 },
  'fam-lens-v01': { key: 'f', value: -5 },
  'fam-axial-v01': { key: 'F', value: 2500 },
  'fam-circular-v01': { key: 'omega', value: 2 },
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const fail = (msg) => {
  console.error(`fam-deeplink FAIL: ${msg}`);
  process.exit(1);
};

for (const id of ids) {
  const url = `${base.replace(/\/?$/, '/')}?shell=lab-classic&lang=zh&m=${encodeURIComponent(id)}&_=${Date.now()}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__labCapture?.getModelId, { timeout: 90000 });
  await page.evaluate(async (mid) => {
    await window.__labCapture.switchModel?.(mid);
  }, id);
  await page.waitForTimeout(800);
  await page.waitForFunction((mid) => {
    const btn = document.querySelector(`#model-list .model-item[data-id="${mid}"]`);
    return !!btn && btn.classList.contains('active');
  }, id, { timeout: 30000 });

  const scrub = scrubFor[id] || { key: null, value: null };
  const report = await page.evaluate(async ({ mid, scrub }) => {
    const c = window.__labCapture;
    const btn = document.querySelector(`#model-list .model-item[data-id="${mid}"]`);
    const tags = btn ? [...btn.querySelectorAll('.tag')].map((t) => t.textContent.trim()) : [];
    const itemsInOpenSubs = [...document.querySelectorAll('#model-list details.sub-group[open] .model-item')].length;
    const allItems = document.querySelectorAll('#model-list .model-item').length;
    const model = c.getModel?.();
    const r0 = c.getReadouts?.() || [];
    let readoutChanged = false;
    if (scrub?.key != null) {
      c.setParam?.(scrub.key, scrub.value);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 40));
      c.paintFrame?.();
      const r1 = c.getReadouts?.() || [];
      readoutChanged = JSON.stringify(r0) !== JSON.stringify(r1);
    }
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
      readoutChanged,
      shellEq: document.getElementById('shell-formula')?.textContent || '',
    };
  }, { mid: id, scrub });

  console.log(id, JSON.stringify(report));
  if (report.modelId !== id) fail(`${id} modelId=${report.modelId}`);
  if (!report.governing || !report.hasRefresh) fail(`${id} not governing/refresh`);
  if (!report.hasBtn || !report.active) fail(`${id} list button missing/inactive`);
  if (!report.tags.some((t) => /方程|eq|方程式|방정식/i.test(t))) fail(`${id} no eq tag ${report.tags}`);
  if (scrub.key != null && !report.readoutChanged) fail(`${id} scrub did not move readouts`);
  if (!(report.itemsInOpenSubs >= 1)) fail(`${id} open-sub items ${report.itemsInOpenSubs}`);
  if (report.allItems > 120) fail(`${id} too many mounted items ${report.allItems}`);
}

await browser.close();
console.log('fam-deeplink ok', ids.join(','));
