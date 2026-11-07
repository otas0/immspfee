#!/usr/bin/env node
/**
 * Sync shell menu / micro-menu shots into docs/assets when pixel-drifted.
 * Complements sync:safari-proxy (projector Safari proxy only).
 *
 *   npm run sync:shell-docs
 *
 * Sources (first hit wins):
 *   shots/pages-tablet-1000-projector-menu.png | shots/shell-projector-1000-menu.png
 *     → docs/assets/shell-projector-1000-menu.png
 *   shots/shell-micro-menu-390-webkit.png
 *     → docs/assets/shell-micro-menu-390-webkit.png
 *
 * Prints DRIFTED=1|0. Exit 0 always.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ratioLimit = Number(process.env.SHELL_DOCS_DRIFT_RATIO || 0.02);
let anyDrift = false;

function sha(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function mismatchRatio(aPath, bPath) {
  const a = PNG.sync.read(fs.readFileSync(aPath));
  const b = PNG.sync.read(fs.readFileSync(bPath));
  if (a.width !== b.width || a.height !== b.height) return 1;
  const diff = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.1 });
  return diff / (a.width * a.height);
}

function syncOne(label, sources, dstRel) {
  const dst = path.join(root, dstRel);
  const src = sources.map((s) => path.join(root, s)).find((p) => fs.existsSync(p));
  if (!src) {
    console.log(`sync-shell-docs[${label}]: no source (skip)`);
    return;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (!fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
    console.log(`sync-shell-docs[${label}]: seeded ${dstRel}`);
    anyDrift = true;
    return;
  }
  if (sha(src) === sha(dst)) {
    console.log(`sync-shell-docs[${label}]: already matches`);
    return;
  }
  let ratio = 1;
  try {
    ratio = mismatchRatio(src, dst);
  } catch (err) {
    console.warn(`sync-shell-docs[${label}]: pixel compare failed`, err?.message || err);
    ratio = 1;
  }
  if (ratio < ratioLimit) {
    console.log(`sync-shell-docs[${label}]: AA noise ratio=${ratio.toFixed(5)} < ${ratioLimit}`);
    return;
  }
  fs.copyFileSync(src, dst);
  console.log(`sync-shell-docs[${label}]: updated (ratio ${ratio.toFixed(5)})`);
  anyDrift = true;
}

syncOne(
  'projector-menu',
  ['shots/pages-tablet-1000-projector-menu.png', 'shots/shell-projector-1000-menu.png'],
  'docs/assets/shell-projector-1000-menu.png',
);
syncOne(
  'micro-menu',
  ['shots/shell-micro-menu-390-webkit.png'],
  'docs/assets/shell-micro-menu-390-webkit.png',
);

console.log(anyDrift ? 'DRIFTED=1' : 'DRIFTED=0');
