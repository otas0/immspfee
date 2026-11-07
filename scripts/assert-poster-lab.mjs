#!/usr/bin/env node
/**
 * Guard Lab posters against sibling-product / TE sheet markers.
 * Allowed images: IMMSPFEE wordmark + lab-qr.svg only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'poster.html',
  'docs/promo/poster.html',
  'docs/promo/poster-standalone.html',
];

const forbidden = [
  { re: /Space\s+Grotesk/i, label: 'Space Grotesk' },
  { re: /#ff4f00/i, label: '#ff4f00' },
  { re: /\bCH\s*0?1\b/, label: 'CH 01' },
  { re: /\bbuusdo\b/i, label: 'buusdo' },
  { re: /\bTE\s*\/\s*signal\b/i, label: 'TE/signal' },
];

const allowedImg = /immspfee-logo\.svg|lab-qr\.svg/i;

let failed = 0;
for (const rel of files) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error(`assert-poster-lab: missing ${rel}`);
    failed += 1;
    continue;
  }
  const text = fs.readFileSync(abs, 'utf8');
  for (const { re, label } of forbidden) {
    if (re.test(text)) {
      console.error(`assert-poster-lab: ${rel} contains forbidden marker: ${label}`);
      failed += 1;
    }
  }
  if (!/Sora/i.test(text)) {
    console.error(`assert-poster-lab: ${rel} missing Lab font Sora`);
    failed += 1;
  }
  if (!/IBM\s+Plex\s+Mono/i.test(text)) {
    console.error(`assert-poster-lab: ${rel} missing IBM Plex Mono`);
    failed += 1;
  }
  const body = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  const imgs = [...body.matchAll(/<img\b[^>]*>/gi)];
  if (!imgs.some(([tag]) => /immspfee-logo\.svg/i.test(tag))) {
    console.error(`assert-poster-lab: ${rel} missing logo <img>`);
    failed += 1;
  }
  for (const [tag] of imgs) {
    if (!allowedImg.test(tag)) {
      console.error(`assert-poster-lab: ${rel} disallowed image: ${tag.slice(0, 120)}`);
      failed += 1;
    }
  }
  if (/micro-webkit-3d|\.png/i.test(body)) {
    console.error(`assert-poster-lab: ${rel} must not embed stage stills / PNGs`);
    failed += 1;
  }
  if (!/padding:\s*14mm/.test(text)) {
    console.error(`assert-poster-lab: ${rel} missing ≥14mm sheet padding`);
    failed += 1;
  }
}

if (failed) {
  console.error(`assert-poster-lab: ${failed} failure(s)`);
  process.exit(1);
}
console.log('assert-poster-lab: ok', files.join(', '));
