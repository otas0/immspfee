#!/usr/bin/env node
/**
 * 8 模型视觉基线：SHA-256 + 像素 diff PNG（失败写入 shots/diff/）
 * 更新基线：npm run baseline:update
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const shotsDir = path.join(root, 'shots');
const baseDir = path.join(shotsDir, 'baseline');
const diffDir = path.join(shotsDir, 'diff');
const manifestPath = path.join(baseDir, 'manifest.json');

const FILES = [
  '01-free-fall.png',
  '02-projectile.png',
  '03-spring.png',
  '04-pendulum.png',
  '05-collision.png',
  '06-double-pendulum.png',
  '07-wave.png',
  '08-heat.png',
  '09-pid-tune.png',
  '10-root-locus.png',
];

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function loadPng(file, dir = shotsDir) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) throw new Error(`missing: ${p}`);
  return fs.readFileSync(p);
}

function writePixelDiff(name, curBuf, baseBuf) {
  fs.mkdirSync(diffDir, { recursive: true });
  const imgA = PNG.sync.read(curBuf);
  const imgB = PNG.sync.read(baseBuf);
  const w = Math.min(imgA.width, imgB.width);
  const h = Math.min(imgA.height, imgB.height);
  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    const note = path.join(diffDir, name.replace(/\.png$/, '.size.txt'));
    fs.writeFileSync(note, `size mismatch current=${imgA.width}x${imgA.height} baseline=${imgB.width}x${imgB.height}\n`);
  }
  const diff = new PNG({ width: w, height: h });
  const mismatched = pixelmatch(
    imgA.data, imgB.data, diff.data, w, h,
    { threshold: 0.1, includeAA: true },
  );
  const out = path.join(diffDir, name);
  fs.writeFileSync(out, PNG.sync.write(diff));
  return { mismatched, out };
}

const mode = process.argv[2] || 'check';

if (mode === 'update') {
  fs.mkdirSync(baseDir, { recursive: true });
  const manifest = {};
  for (const f of FILES) {
    const buf = loadPng(f);
    fs.writeFileSync(path.join(baseDir, f), buf);
    manifest[f] = { sha256: sha256(buf), bytes: buf.length };
    console.log(`baseline ← ${f}  ${manifest[f].sha256.slice(0, 12)}…`);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`wrote ${manifestPath}`);
  process.exit(0);
}

if (!fs.existsSync(manifestPath)) {
  console.error('No baseline yet. Run: npm run baseline:update');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
let failed = 0;
for (const f of FILES) {
  const buf = loadPng(f);
  const hash = sha256(buf);
  const expect = manifest[f];
  if (!expect) {
    console.log(`FAIL  ${f}  (not in manifest)`);
    failed += 1;
    continue;
  }
  if (hash !== expect.sha256) {
    const baseBuf = loadPng(f, baseDir);
    try {
      const { mismatched, out } = writePixelDiff(f, buf, baseBuf);
      console.log(`FAIL  ${f}  hash ${hash.slice(0, 12)} ≠ ${expect.sha256.slice(0, 12)}  diff=${mismatched}px → ${out}`);
    } catch (err) {
      console.log(`FAIL  ${f}  hash mismatch; diff error: ${err.message}`);
    }
    failed += 1;
  } else {
    console.log(`PASS  ${f}  ${hash.slice(0, 12)}…`);
  }
}
console.log(failed ? `\n${failed} visual diffs` : '\nvisual baseline OK');
process.exit(failed ? 1 : 0);
