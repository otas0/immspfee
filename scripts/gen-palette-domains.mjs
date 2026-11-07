#!/usr/bin/env node
/** Split data/palettes.json into per-domain shards + model-domain map. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandDomainIndex } from '../js/boot/domainPack.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pal = JSON.parse(fs.readFileSync(path.join(root, 'data/palettes.json'), 'utf8'));
const raw = JSON.parse(fs.readFileSync(path.join(root, 'data/domain-index.json'), 'utf8'));
const rows = expandDomainIndex(raw);
const idToDomain = Object.fromEntries(rows.map((r) => [r.id, r.domain || '其他']));
const byDomain = {};
for (const [id, colors] of Object.entries(pal.models || {})) {
  const dom = idToDomain[id] || '其他';
  (byDomain[dom] ||= {})[id] = colors;
}
const outDir = path.join(root, 'data/palettes/domains');
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) {
  if (f.endsWith('.json')) fs.unlinkSync(path.join(outDir, f));
}
for (const [dom, models] of Object.entries(byDomain)) {
  const file = path.join(outDir, `${dom.replace(/\//g, '_')}.json`);
  fs.writeFileSync(file, `${JSON.stringify({ domain: dom, models }, null, 0)}\n`);
}
fs.writeFileSync(
  path.join(root, 'data/palettes/shared.json'),
  `${JSON.stringify({ neutral: pal.neutral, hc: pal.hc }, null, 0)}\n`,
);
fs.writeFileSync(
  path.join(root, 'data/palettes/model-domain.json'),
  `${JSON.stringify(idToDomain, null, 0)}\n`,
);
console.log('palette domains', Object.keys(byDomain).length);
