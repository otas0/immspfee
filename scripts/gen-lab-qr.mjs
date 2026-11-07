#!/usr/bin/env node
/**
 * Rewrite docs/promo/lab-qr.svg for the stamped Pages entry URL so scans
 * bust the SW cache (asset-stamp.json → js hash as ?v=).
 *
 *   node scripts/gen-lab-qr.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const stampPath = path.join(root, 'asset-stamp.json');
const outPath = path.join(root, 'docs/promo/lab-qr.svg');

const stamp = JSON.parse(fs.readFileSync(stampPath, 'utf8'));
const v = stamp.js || stamp.docsAssets;
if (!v) {
  console.error('gen-lab-qr: asset-stamp.json missing js/docsAssets');
  process.exit(1);
}
const target = `https://otas0.github.io/immspfee/?v=${encodeURIComponent(v)}`;
const api = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=svg&ecc=M&data=${encodeURIComponent(target)}`;

const res = await fetch(api);
if (!res.ok) {
  console.error(`gen-lab-qr: QR API ${res.status}`);
  process.exit(1);
}
let svg = await res.text();
if (!svg.includes('<svg')) {
  console.error('gen-lab-qr: response was not SVG');
  process.exit(1);
}
// Keep a stable title/desc for audits.
if (!svg.includes('<desc>')) {
  svg = svg.replace(
    /<svg([^>]*)>/,
    `<svg$1>\n\t<title>QR Code</title>\n\t<desc>${target}</desc>`,
  );
} else {
  svg = svg.replace(/<desc>[^<]*<\/desc>/, `<desc>${target}</desc>`);
}
fs.writeFileSync(outPath, svg.endsWith('\n') ? svg : `${svg}\n`);
console.log('gen-lab-qr:', target, '→', path.relative(root, outPath));
