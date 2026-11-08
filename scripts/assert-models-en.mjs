#!/usr/bin/env node
/**
 * CI gate: data/locales/models-en.json must not carry Han in name/description.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const packPath = path.join(root, 'data/locales/models-en.json');
const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
const han = /[\u4e00-\u9fff]/;
let bad = 0;
const samples = [];
for (const [id, row] of Object.entries(pack)) {
  if (!row || typeof row !== 'object') continue;
  const name = String(row.name || '');
  const description = String(row.description || '');
  if (han.test(name) || han.test(description)) {
    bad += 1;
    if (samples.length < 8) samples.push(`${id}: ${name.slice(0, 40)}`);
  }
}
if (bad) {
  console.error(`models-en Han leakage: ${bad} entries`);
  console.error(samples.join('\n'));
  process.exit(1);
}
const bohr = pack.bohr;
if (!bohr || bohr.name !== 'Bohr Model' || !String(bohr.description || '').trim()) {
  console.error(`models-en Bohr entry missing/empty: ${JSON.stringify(bohr)}`);
  process.exit(1);
}
console.log(`models-en Han gate ok (${Object.keys(pack).length} ids; Bohr=${bohr.name})`);
