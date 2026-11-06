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

const topicModel = fs.readFileSync(path.join(root, 'js/lab/topicModel.js'), 'utf8');
if (/designCaveatText\s*\(/.test(topicModel)) {
  failures.push('js/lab/topicModel.js must not call designCaveatText (no canvas caveat chrome)');
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

const factoryChunk = fs.readdirSync(path.join(root, 'js/bundle'))
  .find((name) => name.startsWith('chunk-factory-') && name.endsWith('.js'));
if (factoryChunk) {
  const factory = fs.readFileSync(path.join(root, 'js/bundle', factoryChunk), 'utf8');
  // Bundled draw must not fillText caveat strings onto the canvas.
  if (/fillText\(\s*caveat\b/.test(factory) || /designCaveatText\([^)]*\)[\s\S]{0,120}fillText/.test(factory)) {
    failures.push(`${factoryChunk} still paints designCaveatText — rebuild bundle`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('stage strips gate ok (no #shell-assumptions / #shell-caveat / canvas caveat)');
