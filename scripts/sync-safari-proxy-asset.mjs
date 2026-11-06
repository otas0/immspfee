#!/usr/bin/env node
/**
 * Copy shots/shell-projector-1000-safari-proxy.png → docs/assets/ when drifted.
 * Used by the optional WebKit CI job and local [webkit] follow-up.
 * Exit 0 always; prints DRIFTED=1|0 for logs / commit hygiene.
 *
 * WebKit PNG bytes are non-deterministic (AA / font raster). Byte inequality alone
 * must not open issues — compare with pixelmatch and only flag DRIFTED=1 when
 * mismatchRatio ≥ SAFARI_PROXY_DRIFT_RATIO (default 0.002 = 0.2%).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'shots/shell-projector-1000-safari-proxy.png');
const dst = path.join(root, 'docs/assets/shell-projector-1000-safari-proxy.png');
const ratioLimit = Number(process.env.SAFARI_PROXY_DRIFT_RATIO || 0.002);

function sha(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function mismatchRatio(aPath, bPath) {
  const a = PNG.sync.read(fs.readFileSync(aPath));
  const b = PNG.sync.read(fs.readFileSync(bPath));
  if (a.width !== b.width || a.height !== b.height) {
    return 1;
  }
  const diff = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.1 });
  return diff / (a.width * a.height);
}

if (!fs.existsSync(src)) {
  console.warn('sync-safari-proxy: missing', src);
  console.log('DRIFTED=0');
  process.exit(0);
}
fs.mkdirSync(path.dirname(dst), { recursive: true });

if (!fs.existsSync(dst)) {
  fs.copyFileSync(src, dst);
  console.log('sync-safari-proxy: seeded docs/assets (no prior asset)');
  console.log('DRIFTED=1');
  process.exit(0);
}

if (sha(src) === sha(dst)) {
  console.log('sync-safari-proxy: docs/assets already matches shot');
  console.log('DRIFTED=0');
  process.exit(0);
}

let ratio = 1;
try {
  ratio = mismatchRatio(src, dst);
} catch (err) {
  console.warn('sync-safari-proxy: pixel compare failed, treating as drift', err?.message || err);
  ratio = 1;
}

if (ratio < ratioLimit) {
  console.log(
    `sync-safari-proxy: byte-diff but pixel ratio ${ratio.toFixed(5)} < ${ratioLimit} (AA noise; keep docs/assets)`,
  );
  console.log('DRIFTED=0');
  process.exit(0);
}

fs.copyFileSync(src, dst);
console.log(`sync-safari-proxy: updated docs/assets (pixel ratio ${ratio.toFixed(5)} ≥ ${ratioLimit})`);
console.log('DRIFTED=1');
