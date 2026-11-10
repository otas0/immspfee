#!/usr/bin/env node
/**
 * Refuse catalog models whose runtime formula is a known silent-fallback impostor.
 * - ⌊log₂ n⌋ / binary-search authority only allowed for id binary-search
 * - Nyquist f_s≥2 f_max only for adc / sampling / nyquist ids
 * - Placeholder “条目由主题求解器…” authority forbidden
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { models } = await import(pathToFileURL(path.join(root, 'js/models/index.js')).href);

const bad = [];
for (const m of models) {
  const f = `${m.formula || ''} ${m.equation || ''} ${m.authority || ''}`;
  const idn = `${m.id} ${m.name}`;
  if (/条目由主题求解器/.test(f)) bad.push(`${m.id}: placeholder authority`);
  if ((/⌊log₂ n⌋|比较次数上界/.test(f) || /CLRS, 二分查找/.test(f)) && m.id !== 'binary-search') {
    bad.push(`${m.id}: binary-search formula/authority without id binary-search`);
  }
  if (/f_s ≥ 2 f_max|采样定理/.test(f) && !/adc|采样|nyquist|sample/i.test(idn)) {
    bad.push(`${m.id}: Nyquist formula without adc/sample id`);
  }
}

if (bad.length) {
  console.error(`FAIL assert-no-misbind: ${bad.length}`);
  for (const line of bad.slice(0, 40)) console.error(' -', line);
  process.exit(1);
}
console.log(`PASS assert-no-misbind (${models.length} models)`);
