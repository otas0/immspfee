#!/usr/bin/env node
/** Sync root poster.html → docs/promo/poster.html + poster-standalone.html with relative paths. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let html = fs.readFileSync(path.join(root, 'poster.html'), 'utf8');
html = html
  .replaceAll('src="./assets/immspfee-logo.svg"', 'src="../../assets/immspfee-logo.svg"')
  .replaceAll('src="./docs/promo/micro-webkit-3d.png"', 'src="./micro-webkit-3d.png"')
  .replaceAll('src="./docs/promo/lab-qr.svg"', 'src="./lab-qr.svg"')
  .replaceAll("fetch(new URL('./asset-stamp.json', import.meta.url)", "fetch(new URL('../../asset-stamp.json', import.meta.url)");

const promo = path.join(root, 'docs/promo');
fs.writeFileSync(path.join(promo, 'poster.html'), html);
fs.writeFileSync(path.join(promo, 'poster-standalone.html'), html);
console.log('sync-poster-promo: docs/promo/poster.html + poster-standalone.html');
