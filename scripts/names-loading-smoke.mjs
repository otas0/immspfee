#!/usr/bin/env node
/**
 * Sidebar name-hydration chrome: filters stay hittable while
 * .is-names-loading is on, and clearing/aborting the search drops the class.
 *
 *   LAB_URL=http://127.0.0.1:8765/ node scripts/names-loading-smoke.mjs
 */
import { chromium } from 'playwright';

const base = process.env.LAB_URL || 'http://127.0.0.1:8765/';

function fail(msg) {
  console.error('FAIL', msg);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
let holdNames = false;
await page.route('**/data/domain-names.json', async (route) => {
  if (holdNames) await new Promise((resolve) => setTimeout(resolve, 2500));
  await route.continue();
});
try {
  await page.goto(`${base.replace(/\/?$/, '/')}?shell=lab-classic&lang=en&_=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForFunction(() => window.__labCapture, null, { timeout: 90000 });
  await page.waitForSelector('#filter-q');

  const probe = await page.evaluate(async () => {
    const sidebar = document.querySelector('.sidebar');
    const filters = sidebar?.querySelector('.filters');
    const list = document.getElementById('model-list');
    const input = document.getElementById('filter-q');
    const chip = document.getElementById('filter-heavy');
    const user = document.getElementById('btn-user-model');
    if (!sidebar || !filters || !list || !input || !chip) return { ok: false, reason: 'missing nodes' };

    const hit = (el) => {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const x = Math.min(window.innerWidth - 2, Math.max(2, r.left + Math.min(r.width / 2, 18)));
      const y = Math.min(window.innerHeight - 2, Math.max(2, r.top + r.height / 2));
      const node = document.elementFromPoint(x, y);
      return !!(node && (node === el || el.contains(node)));
    };
    const loading = () => sidebar.classList.contains('is-names-loading');

    input.value = 'boltzmann';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (!loading()) return { ok: false, reason: 'search did not set is-names-loading' };

    const during = {
      filtersPe: getComputedStyle(filters).pointerEvents,
      listPe: getComputedStyle(list).pointerEvents,
      inputHit: hit(input),
      chipHit: hit(chip),
      userHit: user ? hit(user) : true,
      chipDisabled: chip.disabled,
      inputDisabled: input.disabled,
    };

    // Clear aborts the debounced fetch and must drop the chrome immediately.
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const clearedNow = !loading();

    return {
      ok: during.filtersPe !== 'none'
        && during.listPe === 'none'
        && during.inputHit
        && during.chipHit
        && during.userHit
        && !during.chipDisabled
        && !during.inputDisabled
        && clearedNow
        && !loading(),
      during,
      clearedNow,
      stuck: loading(),
    };
  });

  if (!probe?.ok) fail(JSON.stringify(probe));

  holdNames = true;
  const abort = await page.evaluate(async () => {
    const sidebar = document.querySelector('.sidebar');
    const input = document.getElementById('filter-q');
    const loading = () => sidebar.classList.contains('is-names-loading');
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    input.value = 'kepler';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const immediate = loading();
    await wait(280);
    const inFlight = loading();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const cleared = !loading();
    await wait(600);
    return { immediate, inFlight, cleared, stuck: loading() };
  });
  if (!abort.immediate || !abort.inFlight || !abort.cleared || abort.stuck) {
    fail(`abort ${JSON.stringify(abort)}`);
  }
  console.log('names-loading smoke ok', JSON.stringify(probe.during), JSON.stringify(abort));
} finally {
  await browser.close();
}
