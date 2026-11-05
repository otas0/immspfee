#!/usr/bin/env node
/**
 * After Pages deploys the current short hash, open neutron diffusion and
 * compare the formula strip, full assumption, and caveat to the local strip.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = (process.env.PAGES_SHA
  || execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim());
const base = process.env.PAGES_URL || 'https://otas0.github.io/immspfee/';
const url = `${base}?v=${hash}&lang=en`;
const want = {
  formulaPrefix: 'Equation ',
  assumptionNeedle: 'not a design',
  caveat: 'Public definition only. Not a reactor or device design tool.',
};

async function waitForDeploy() {
  if (process.env.PAGES_SKIP_WAIT === '1') return;
  const deadline = Date.now() + Number(process.env.PAGES_WAIT_MS || 180000);
  while (Date.now() < deadline) {
    try {
      const out = execSync(
        'gh run list --branch main --workflow pages.yml --limit 5 --json databaseId,headSha,status,conclusion,displayTitle',
        { cwd: root, encoding: 'utf8' },
      );
      const runs = JSON.parse(out);
      const hit = runs.find((r) => String(r.headSha || '').startsWith(hash));
      if (hit?.status === 'completed' && hit?.conclusion === 'success') return;
      if (hit?.status === 'completed' && hit?.conclusion !== 'success') {
        throw new Error(`Pages deploy failed for ${hash}: ${hit.conclusion}`);
      }
    } catch (err) {
      if (String(err.message || err).includes('Pages deploy failed')) throw err;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`timed out waiting for Pages deploy of ${hash}`);
}

await waitForDeploy();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const failures = [];
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
  await page.evaluate(() => window.__labCapture.switchModel('neutron-diffusion'));
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const asm = document.getElementById('shell-assumptions');
    if (asm) asm.scrollTop = asm.scrollHeight;
    const formula = document.getElementById('shell-formula');
    const caveat = document.getElementById('shell-caveat');
    const fr = formula?.getBoundingClientRect();
    const cr = caveat?.getBoundingClientRect();
    const cs = caveat ? getComputedStyle(caveat) : null;
    const lineH = parseFloat(cs?.lineHeight) || 16;
    const lines = cr && lineH ? Math.round(cr.height / lineH) : 0;
    const overlap = !!(fr && cr && cr.height > 8 && fr.bottom > cr.top + 1 && fr.top < cr.bottom - 1);
    const endInBox = !!(asm && asm.scrollTop + asm.clientHeight >= asm.scrollHeight - 2);
    return {
      formula: formula?.textContent || '',
      assumption: asm?.textContent || '',
      caveat: caveat?.textContent || '',
      endInBox,
      overlap,
      lines,
    };
  });
  if (!info.formula.startsWith(want.formulaPrefix)) {
    failures.push(`formula ${JSON.stringify(info.formula)}`);
  }
  if (!info.assumption.includes(want.assumptionNeedle) || !info.endInBox) {
    failures.push(`assumption ${JSON.stringify(info.assumption)}`);
  }
  if (info.caveat !== want.caveat) failures.push(`caveat ${JSON.stringify(info.caveat)}`);
  if (info.overlap) failures.push('formula covers caveat');
  if (info.lines < 1) failures.push(`caveat lines ${info.lines}`);
  console.log('pages check', hash, {
    formulaOk: info.formula.startsWith(want.formulaPrefix),
    assumptionOk: info.assumption.includes(want.assumptionNeedle),
    caveat: info.caveat,
    lines: info.lines,
  });
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('pages check ok', hash, url);
