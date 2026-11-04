#!/usr/bin/env node
/**
 * catalog 校验：id 唯一、family 均有 builder（hand 除外）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json'), 'utf8'));
const factorySrc = fs.readFileSync(path.join(root, 'js/models/factory.js'), 'utf8');

const builderMatch = factorySrc.match(/const builders = \{([\s\S]*?)\};/);
if (!builderMatch) {
  console.error('FAIL: cannot find builders map in factory.js');
  process.exit(1);
}
const families = new Set(
  [...builderMatch[1].matchAll(/^\s*([a-zA-Z0-9_]+)\s*:/gm)].map((m) => m[1]),
);
families.add('hand');

const ids = new Set();
const errors = [];
for (const m of catalog) {
  if (!m.id) errors.push('missing id');
  else if (ids.has(m.id)) errors.push(`duplicate id: ${m.id}`);
  else ids.add(m.id);
  if (!m.family) errors.push(`${m.id}: missing family`);
  else if (!families.has(m.family)) errors.push(`${m.id}: unknown family "${m.family}"`);
  if (!m.domain) errors.push(`${m.id}: missing domain`);
  if (!m.name) errors.push(`${m.id}: missing name`);
}

console.log(`catalog=${catalog.length} uniqueIds=${ids.size} families=${[...families].sort().join(',')}`);
if (errors.length) {
  console.error(`FAIL ${errors.length} issues:`);
  for (const e of errors.slice(0, 40)) console.error(' -', e);
  if (errors.length > 40) console.error(` ... +${errors.length - 40} more`);
  process.exit(1);
}
console.log('PASS catalog validation');
