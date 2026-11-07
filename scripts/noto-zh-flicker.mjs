#!/usr/bin/env node
/**
 * zh locale: Noto SC must use font-display swap / load after Latin self-host,
 * and must not leave toolbar title blank for a long FOIT window.
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
  const noto = [...document.querySelectorAll('link[data-imm-noto-sc], link[href*="Noto+Sans+SC"]')];
  const title = document.getElementById('toolbar-title');
  const text = (title?.textContent || '').trim();
  // Sample title opacity / length over ~400ms
  const samples = [];
  for (let i = 0; i < 8; i += 1) {
    samples.push({
      t: performance.now(),
      text: (title?.textContent || '').trim(),
      len: (title?.textContent || '').trim().length,
    });
    await new Promise((r) => setTimeout(r, 50));
  }
  return {
    notoCount: noto.length,
    href: noto[0]?.href || '',
    title: text,
    blankSamples: samples.filter((s) => s.len === 0).length,
    samples,
  };
});

await browser.close();
if (!probe.notoCount) fail(`zh boot did not inject Noto SC link ${JSON.stringify(probe)}`);
if (probe.blankSamples > 4) fail(`zh title blank too long (FOIT?) ${JSON.stringify(probe)}`);
if (!probe.title) fail(`zh toolbar title empty after interactive ${JSON.stringify(probe)}`);
console.log('noto zh flicker ok', { noto: !!probe.notoCount, title: probe.title, blankSamples: probe.blankSamples });
