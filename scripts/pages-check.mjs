#!/usr/bin/env node
/**
 * After Pages deploys the current short hash, open neutron diffusion and
 * compare the formula strip, full assumption, and caveat to the local strip.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
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
  if (process.env.PAGES_SKIP_WAIT === '1') {
    console.log('pages-check: skip wait (PAGES_SKIP_WAIT=1) for', hash);
    return;
  }
  const waitMs = Number(process.env.PAGES_WAIT_MS || 180000);
  const pollMs = Number(process.env.PAGES_POLL_MS || 5000);
  const deadline = Date.now() + waitMs;
  let lastLog = 0;
  console.log(`pages-check: waiting for Pages deploy of ${hash} (timeout ${waitMs}ms)`);
  while (Date.now() < deadline) {
    let runs = [];
    try {
      const out = execSync(
        'gh run list --branch main --workflow pages.yml --limit 8 --json databaseId,headSha,status,conclusion,displayTitle,createdAt',
        { cwd: root, encoding: 'utf8' },
      );
      runs = JSON.parse(out);
      const hit = runs.find((r) => String(r.headSha || '').startsWith(hash));
      if (hit?.status === 'completed' && hit?.conclusion === 'success') {
        console.log(`pages-check: deploy ready ${hit.databaseId} ${hit.headSha?.slice(0, 7)}`);
        return;
      }
      if (hit?.status === 'completed' && hit?.conclusion !== 'success') {
        throw new Error(`Pages deploy failed for ${hash}: ${hit.conclusion}`);
      }
      const now = Date.now();
      if (now - lastLog >= 15000) {
        lastLog = now;
        const recent = runs.slice(0, 3).map((r) => ({
          id: r.databaseId,
          sha: String(r.headSha || '').slice(0, 7),
          status: r.status,
          conclusion: r.conclusion,
          title: r.displayTitle,
        }));
        const match = runs.find((r) => String(r.headSha || '').startsWith(hash));
        console.log('pages-check: still waiting', {
          want: hash,
          match: match
            ? { id: match.databaseId, status: match.status, sha: String(match.headSha || '').slice(0, 7) }
            : null,
          recent,
          remainMs: Math.max(0, deadline - now),
        });
      }
    } catch (err) {
      if (String(err.message || err).includes('Pages deploy failed')) throw err;
      const now = Date.now();
      if (now - lastLog >= 15000) {
        lastLog = now;
        console.warn('pages-check: gh poll error', String(err.message || err).slice(0, 200));
      }
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  let tip = '';
  try {
    const out = execSync(
      'gh run list --branch main --workflow pages.yml --limit 5 --json databaseId,headSha,status,conclusion,displayTitle',
      { cwd: root, encoding: 'utf8' },
    );
    tip = ` recent=${out.trim()}`;
  } catch { /* ignore */ }
  throw new Error(`timed out waiting for Pages deploy of ${hash}.${tip}`);
}

function headerValue(headers, name) {
  const want = name.toLowerCase();
  for (const line of headers) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    if (line.slice(0, idx).trim().toLowerCase() === want) return line.slice(idx + 1).trim();
  }
  return '';
}

function expectedStampCache(rootDir) {
  const text = fs.readFileSync(path.join(rootDir, '_headers'), 'utf8');
  const lines = text.split(/\r?\n/);
  let capture = false;
  const block = [];
  for (const line of lines) {
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      if (capture && block.length) break;
      capture = line.trim() === '/asset-stamp.json';
      continue;
    }
    if (capture) block.push(line.trim());
  }
  return headerValue(block, 'cache-control');
}

async function liveStampCache(baseUrl) {
  const expected = expectedStampCache(root);
  const target = new URL('asset-stamp.json', baseUrl);
  const res = await fetch(target, { cache: 'no-store' });
  const cc = res.headers.get('cache-control') || '';
  const server = `${res.headers.get('server') || ''} ${res.headers.get('x-served-by') || ''}`;
  const githubHost = /github\.io$/i.test(target.hostname) || /github/i.test(server);
  console.log('pages asset-stamp', target.href, 'cache-control', cc || '(none)', 'server', server.trim() || '(none)');
  if (expected && cc.toLowerCase().includes(expected.toLowerCase())) return [];
  if (process.env.PAGES_HONORS_HEADERS === '1' || !githubHost) {
    return [`asset-stamp.json Cache-Control ${cc || '(none)'} does not include ${expected || 'no-cache'}`];
  }
  console.log('pages asset-stamp: GitHub Pages does not apply _headers; skipped hard fail');
  return [];
}

await waitForDeploy();

const headerFailures = await liveStampCache(base);
if (headerFailures.length) {
  console.error(headerFailures.join('\n'));
  process.exit(1);
}

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
  if (info.lines < 1 || info.lines > 2) failures.push(`caveat lines ${info.lines} (want 1..2)`);
  console.log('pages check', hash, {
    formulaOk: info.formula.startsWith(want.formulaPrefix),
    assumptionOk: info.assumption.includes(want.assumptionNeedle),
    caveat: info.caveat,
    lines: info.lines,
  });

  // Microscope shell smoke: CSS fingerprint + isolated chrome
  const microUrl = `${base}?shell=lab-microscope3d&lang=en&v=${hash}`;
  await page.goto(microUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
  await page.waitForFunction(() => document.documentElement.dataset.shell === 'lab-microscope3d', null, { timeout: 30000 });
  const micro = await page.evaluate(() => {
    const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href') || '');
    const css = links.find((h) => h.includes('microscope-shell.css')) || '';
    const chrome = document.getElementById('microscope-chrome');
    const stage = document.getElementById('micro-stage');
    const bench = document.getElementById('bench');
    const hud = document.querySelector('.hud');
    return {
      shell: document.documentElement.dataset.shell,
      css,
      chromeHidden: !!chrome?.hidden,
      brand: chrome?.querySelector('.micro-brand')?.textContent?.trim() || '',
      stageHidden: stage ? !!stage.hidden : true,
      metrics: [...(stage?.querySelectorAll('.micro-metric') || [])].map((el) => el.dataset.key),
      benchDisplay: bench ? getComputedStyle(bench).display : '',
      hudDisplay: hud ? getComputedStyle(hud).display : '',
      stageMode: document.documentElement.dataset.stageMode,
    };
  });
  if (micro.shell !== 'lab-microscope3d') failures.push(`micro shell ${micro.shell}`);
  if (!micro.css.includes('microscope-shell.css')) failures.push(`micro css fingerprint ${micro.css}`);
  if (micro.chromeHidden) failures.push('micro chrome hidden on Pages');
  if (micro.brand !== 'IMMSPFEE') failures.push(`micro brand ${micro.brand}`);
  if (micro.stageHidden) failures.push('micro-stage hidden on Pages');
  if (micro.metrics.join(',') !== 'M,f_obj,NA,d_Abbe') failures.push(`micro metrics ${micro.metrics.join(',')}`);
  if (micro.benchDisplay !== 'none') failures.push(`Pages micro bench ${micro.benchDisplay}`);
  if (micro.hudDisplay !== 'none') failures.push(`Pages micro HUD ${micro.hudDisplay}`);
  console.log('pages microscope smoke', hash, {
    css: micro.css,
    stageMode: micro.stageMode,
    metrics: micro.metrics.join(','),
  });
  try {
    const { mkdirSync, appendFileSync, writeFileSync, readFileSync, existsSync } = await import('node:fs');
    mkdirSync('artifacts', { recursive: true });
    const line = `microscope-shell.css fingerprint ${micro.css}\n`;
    appendFileSync('artifacts/ci-summary.txt', line);
    // Also mirror stamp for local alignment checks
    let stampLine = '';
    try {
      const stamp = JSON.parse(readFileSync('asset-stamp.json', 'utf8'));
      stampLine = `local microCss stamp ${stamp.microCss || stamp.css || '?'}\n`;
      appendFileSync('artifacts/ci-summary.txt', stampLine);
    } catch { /* ignore */ }
    console.log('pages ci-summary', line.trim(), stampLine.trim());
  } catch (err) {
    console.warn('ci-summary write failed', err.message || err);
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('pages check ok', hash, url);
