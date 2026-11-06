#!/usr/bin/env node
/**
 * After Pages deploys the current short hash, open neutron diffusion and
 * check the English formula strip. Assumption/caveat stay in catalog metadata
 * (AGENTS: no on-stage assumption/caveat chrome). Also smoke the microscope shell.
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
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch { /* ignore */ }
    localStorage.setItem('physics-lab-locale-v1', 'en');
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
  // Factory must stay lazy until a subject domain opens — check before any switchModel.
  const factoryOnCold = await page.evaluate(() => (
    performance.getEntriesByType('resource').some((r) => /chunk-factory/i.test(r.name || ''))
  ));
  if (factoryOnCold) failures.push('cold boot pulled chunk-factory');
  // Hand model free-fall is primed without loadDomain; wait for EN formula gloss.
  await page.evaluate(() => window.__labCapture.switchModel('free-fall'));
  try {
    await page.waitForFunction(() => {
      const f = document.getElementById('shell-formula')?.textContent || '';
      return f.startsWith('Equation ') && !/[\u4e00-\u9fff]/.test(f);
    }, null, { timeout: 25000 });
  } catch {
    const cold = await page.evaluate(() => document.getElementById('shell-formula')?.textContent || '');
    failures.push(`cold lang=en formula Han/race ${JSON.stringify(cold)}`);
  }

  await page.evaluate(() => window.__labCapture.switchModel('neutron-diffusion'));
  await page.waitForFunction(() => {
    const f = document.getElementById('shell-formula')?.textContent || '';
    return f.startsWith('Equation ') && !/[\u4e00-\u9fff]/.test(f);
  }, null, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => {
    const formula = document.getElementById('shell-formula');
    const asm = document.getElementById('shell-assumptions');
    const caveat = document.getElementById('shell-caveat');
    const shellText = document.getElementById('model-shell')?.innerText || '';
    return {
      formula: formula?.textContent || '',
      hasAsmEl: !!asm,
      hasCaveatEl: !!caveat,
      assumptionText: /Assumptions/.test(shellText),
      formulaHan: /[\u4e00-\u9fff]/.test(formula?.textContent || ''),
    };
  });
  if (!info.formula.startsWith(want.formulaPrefix)) {
    failures.push(`formula ${JSON.stringify(info.formula)}`);
  }
  if (info.formulaHan) failures.push(`formula still has Han (${info.formula})`);
  if (info.hasAsmEl || info.assumptionText) failures.push('assumption strip still on the shell');
  if (info.hasCaveatEl) failures.push('caveat strip still on the shell');
  console.log('pages check', hash, {
    formulaOk: info.formula.startsWith(want.formulaPrefix),
    stripsOff: !info.hasAsmEl && !info.hasCaveatEl && !info.assumptionText,
  });

  // Microscope shell smoke: CSS fingerprint + isolated chrome
  const microUrl = `${base}?shell=lab-microscope3d&lang=en&v=${hash}`;
  await page.goto(microUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 60000 });
  await page.evaluate(() => {
    if (document.documentElement.dataset.shell !== 'lab-microscope3d') {
      window.__labCapture.enterMicroscope3d?.() || window.__labCapture.switchModel('r016-显微镜');
    }
  });
  await page.waitForFunction(() => document.documentElement.dataset.shell === 'lab-microscope3d', null, { timeout: 30000 });
  await page.waitForFunction(() => {
    const chrome = document.getElementById('microscope-chrome');
    const stage = document.getElementById('micro-stage');
    return chrome && !chrome.hidden && stage && !stage.hidden
      && document.documentElement.dataset.stageMode === 'webgl3d';
  }, null, { timeout: 30000 });
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
  const microLambda = await page.evaluate(() => document.getElementById('micro-lambda')?.textContent || '');
  if (!/\d+\s*nm/.test(microLambda)) failures.push(`Pages micro λ ${JSON.stringify(microLambda)}`);
  const microRailOpen = await page.evaluate(() => (
    document.getElementById('micro-rail')?.classList.contains('is-open') || false
  ));
  if (microRailOpen) failures.push('Pages 390 micro rail should start closed');
  console.log('pages microscope smoke', hash, {
    css: micro.css,
    stageMode: micro.stageMode,
    metrics: micro.metrics.join(','),
    lambda: microLambda,
    railOpen: microRailOpen,
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
