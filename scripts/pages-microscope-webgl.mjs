#!/usr/bin/env node
/**
 * Pages cold-start: ?shell=lab-microscope3d must reach dataset.stageMode=webgl3d.
 * Writes fail screenshots under shots/ for CI artifacts.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = join(root, 'shots');
const artifacts = join(root, 'artifacts');
mkdirSync(shots, { recursive: true });
mkdirSync(artifacts, { recursive: true });

const hash = (process.env.PAGES_SHA || 'local').slice(0, 7);
const base = (process.env.PAGES_URL || 'https://otas0.github.io/immspfee/').replace(/\/?$/, '/');
const url = `${base}?shell=lab-microscope3d&lang=en&v=${encodeURIComponent(hash)}&_=${Date.now()}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const failures = [];

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 90000 });
  await page.evaluate(() => {
    if (document.documentElement.dataset.shell !== 'lab-microscope3d') {
      window.__labCapture.enterMicroscope3d?.() || window.__labCapture.switchModel('r016-显微镜');
    }
  });
  await page.waitForFunction(() => document.documentElement.dataset.shell === 'lab-microscope3d', null, { timeout: 30000 });
  try {
    await page.waitForFunction(() => {
      const chrome = document.getElementById('microscope-chrome');
      const stage = document.getElementById('micro-stage');
      return chrome && !chrome.hidden && stage && !stage.hidden
        && document.documentElement.dataset.stageMode === 'webgl3d';
    }, null, { timeout: 45000 });
  } catch {
    failures.push('webgl3d not reached within 45s');
  }
  const info = await page.evaluate(() => ({
    shell: document.documentElement.dataset.shell || '',
    stageMode: document.documentElement.dataset.stageMode || '',
    inputMode: document.documentElement.dataset.inputMode || '',
    chromeHidden: !!document.getElementById('microscope-chrome')?.hidden,
    stageHidden: !!document.getElementById('micro-stage')?.hidden,
    hasWebgl: !!document.getElementById('canvas-webgl') && !document.getElementById('canvas-webgl').hidden,
  }));
  writeFileSync(join(artifacts, `pages-micro-${hash}.json`), JSON.stringify({ url, info, failures }, null, 2));
  await page.screenshot({ path: join(shots, `pages-micro-${hash}.png`), fullPage: true });
  if (info.stageMode !== 'webgl3d') failures.push(`stageMode=${info.stageMode}`);
  if (info.shell !== 'lab-microscope3d') failures.push(`shell=${info.shell}`);
  if (info.chromeHidden || info.stageHidden) failures.push('chrome/stage hidden');
  console.log('pages-microscope-webgl', JSON.stringify(info));
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
  }
  console.log('pages-microscope-webgl ok');
} finally {
  await browser.close();
}
