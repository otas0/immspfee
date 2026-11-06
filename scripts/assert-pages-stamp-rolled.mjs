#!/usr/bin/env node
/**
 * Record live Pages asset-stamp.json and optionally assert it rolled / matches build.
 *
 *   # Advisory: record + warn if unchanged vs previous artifact
 *   PREV_STAMP_PATH=artifacts/prev/pages-live-stamp.json node scripts/assert-pages-stamp-rolled.mjs
 *
 *   # Hard: fail when unchanged vs previous
 *   PAGES_STAMP_HARD=1 PREV_STAMP_PATH=... node scripts/assert-pages-stamp-rolled.mjs
 *
 *   # Hard: fail until live matches this deploy's built stamp
 *   EXPECT_STAMP_PATH=_site/asset-stamp.json PAGES_STAMP_EXPECT=1 node scripts/assert-pages-stamp-rolled.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });
const base = (process.env.PAGES_URL || 'https://otas0.github.io/immspfee/').replace(/\/?$/, '/');
const hard = process.env.PAGES_STAMP_HARD === '1' || process.env.CI_STAMP_HARD === '1';
const expectHard = process.env.PAGES_STAMP_EXPECT === '1';
const prevPath = process.env.PREV_STAMP_PATH || path.join(outDir, 'prev-pages-live-stamp.json');
const expectPath = process.env.EXPECT_STAMP_PATH || '';

const res = await fetch(new URL('asset-stamp.json', base), { cache: 'no-store' });
if (!res.ok) {
  console.error(`fetch asset-stamp failed ${res.status}`);
  process.exit(hard || expectHard ? 1 : 0);
}
const live = await res.json();
const out = {
  at: new Date().toISOString(),
  url: base,
  js: live.js || live.immJs || '',
  css: live.css || '',
  docsAssets: live.docsAssets || '',
  microCss: live.microCss || '',
};
fs.writeFileSync(path.join(outDir, 'pages-live-stamp.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log('pages-live-stamp', out.js, out.css);

if (expectPath && fs.existsSync(expectPath)) {
  let expect;
  try {
    expect = JSON.parse(fs.readFileSync(expectPath, 'utf8'));
  } catch (err) {
    console.error('pages-stamp: bad EXPECT_STAMP_PATH', err.message || err);
    process.exit(expectHard ? 1 : 0);
  }
  const wantJs = expect.js || expect.immJs || '';
  const wantCss = expect.css || '';
  const match = out.js === wantJs && (!wantCss || out.css === wantCss);
  if (!match) {
    const msg = `pages-stamp EXPECT mismatch live=${out.js}/${out.css} want=${wantJs}/${wantCss}`;
    if (expectHard) {
      console.error(msg);
      process.exit(1);
    }
    console.warn(`advisory: ${msg}`);
  } else {
    console.log(`pages-stamp matches deploy ${wantJs}/${wantCss}`);
  }
}

if (!fs.existsSync(prevPath)) {
  console.log('pages-stamp: no previous stamp — recorded live only');
  process.exit(0);
}
let prev;
try {
  prev = JSON.parse(fs.readFileSync(prevPath, 'utf8'));
} catch (err) {
  console.warn('pages-stamp: could not parse previous', err.message || err);
  process.exit(0);
}
const same = (prev.js || '') === out.js && (prev.css || '') === out.css;
if (same) {
  const msg = `pages-stamp UNCHANGED js=${out.js} css=${out.css} (vs previous artifact)`;
  if (hard) {
    console.error(msg);
    process.exit(1);
  }
  console.warn(`advisory: ${msg}`);
  process.exit(0);
}
console.log(`pages-stamp rolled ${prev.js}/${prev.css} → ${out.js}/${out.css}`);
