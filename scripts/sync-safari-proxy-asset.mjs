#!/usr/bin/env node
/**
 * Copy shots/shell-projector-1000-safari-proxy.png → docs/assets/ when drifted.
 * Used by the optional WebKit CI job and local [webkit] follow-up.
 * Exit 0 always; prints DRIFTED=1|0 for logs / commit hygiene.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'shots/shell-projector-1000-safari-proxy.png');
const dst = path.join(root, 'docs/assets/shell-projector-1000-safari-proxy.png');

function sha(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

if (!fs.existsSync(src)) {
  console.warn('sync-safari-proxy: missing', src);
  console.log('DRIFTED=0');
  process.exit(0);
}
fs.mkdirSync(path.dirname(dst), { recursive: true });
let drifted = true;
if (fs.existsSync(dst)) {
  drifted = sha(src) !== sha(dst);
}
if (drifted) {
  fs.copyFileSync(src, dst);
  console.log('sync-safari-proxy: updated docs/assets (drifted)');
  console.log('DRIFTED=1');
} else {
  console.log('sync-safari-proxy: docs/assets already matches shot');
  console.log('DRIFTED=0');
}
