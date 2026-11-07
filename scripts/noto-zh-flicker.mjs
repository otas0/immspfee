#!/usr/bin/env node
/**
 * zh locale: no Google Fonts; system CJK stack; title must not FOIT blank.
 *
 *   LAB_URL=http://127.0.0.1:8765/ npm run test:noto-zh
 */
import { chromium } from 'playwright';

const base = (process.env.LAB_URL || process.env.PAGES_URL || 'http://127.0.0.1:8765/').replace(/\/?$/, '/');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`${base}?lang=zh`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.__labCapture && window.__bootMarks?.interactiveMs != null, null, { timeout: 60000 });

const probe = await page.evaluate(async () => {
  const google = [...document.querySelectorAll('link[href*="fonts.googleapis"], link[href*="fonts.gstatic"]')];
  const title = document.getElementById('toolbar-title');
  const samples = [];
  for (let i = 0; i < 8; i += 1) {
    samples.push((title?.textContent || '').trim().length);
    await new Promise((r) => setTimeout(r, 50));
  }
  return {
    google: google.length,
    cjk: document.documentElement.dataset.immCjk || '',
    title: (title?.textContent || '').trim(),
    blankSamples: samples.filter((n) => n === 0).length,
  };
});

await browser.close();
if (probe.google) fail(`zh boot still hits Google Fonts ${JSON.stringify(probe)}`);
if (probe.cjk !== '1') fail(`zh missing dataset.immCjk ${JSON.stringify(probe)}`);
if (probe.blankSamples > 4) fail(`zh title blank too long ${JSON.stringify(probe)}`);
if (!probe.title) fail(`zh toolbar title empty ${JSON.stringify(probe)}`);
console.log('noto zh flicker ok', probe);
