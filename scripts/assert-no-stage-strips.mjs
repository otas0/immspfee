#!/usr/bin/env node
/**
 * CI gate: assumption / caveat chrome must stay off the model-shell stage.
 * Formula strip is allowed; #shell-assumptions / #shell-caveat must not ship in index
 * and must not be re-created in updateShellStrip.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (/id=["']shell-assumptions["']/.test(indexHtml)) {
  failures.push('index.html still declares #shell-assumptions');
}
if (/id=["']shell-caveat["']/.test(indexHtml)) {
  failures.push('index.html still declares #shell-caveat');
}

const mainJs = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
if (/ensureLine\(\s*['"]shell-assumptions['"]/.test(mainJs)) {
  failures.push('js/main.js still ensureLine(shell-assumptions)');
}
if (/ensureLine\(\s*['"]shell-caveat['"]/.test(mainJs)) {
  failures.push('js/main.js still ensureLine(shell-caveat)');
}
if (!/getElementById\(\s*['"]shell-assumptions['"]\s*\)\s*\?\.remove\(\)/.test(mainJs)) {
  failures.push('js/main.js must remove #shell-assumptions on strip update');
}
if (!/getElementById\(\s*['"]shell-caveat['"]\s*\)\s*\?\.remove\(\)/.test(mainJs)) {
  failures.push('js/main.js must remove #shell-caveat on strip update');
}

const bundlePath = path.join(root, 'js/bundle/lab.js');
if (fs.existsSync(bundlePath)) {
  const bundle = fs.readFileSync(bundlePath, 'utf8');
  if (/ensureLine\(\s*["']shell-assumptions["']/.test(bundle)) {
    failures.push('js/bundle/lab.js still ensureLine(shell-assumptions) — rebuild bundle');
  }
  if (/id:\\"shell-assumptions\\"/.test(bundle) && !/shell-assumptions.*?remove/.test(bundle)) {
    failures.push('js/bundle/lab.js may still paint assumption chrome — rebuild bundle');
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('stage strips gate ok (no #shell-assumptions / #shell-caveat)');
