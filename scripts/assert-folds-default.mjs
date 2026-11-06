#!/usr/bin/env node
/**
 * Lock: sidebar domains must default to collapsed (not domain === '物理').
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
if (/domain\s*===\s*['"]物理['"]/.test(main) && /wantOpen/.test(main)) {
  const block = main.slice(main.indexOf('wantOpen'), main.indexOf('wantOpen') + 160);
  if (/domain\s*===\s*['"]物理['"]/.test(block)) {
    console.error('sidebar domains default-open 物理 again — keep wantOpen default false');
    console.error(block);
    process.exit(1);
  }
}
if (!/folds\[dKey\]\s*!=\s*null\s*\?\s*!!folds\[dKey\]\s*:\s*false/.test(main)) {
  console.error('could not find folds[dKey] ? … : false in paintSidebar');
  process.exit(1);
}
console.log('folds default collapsed ok');
