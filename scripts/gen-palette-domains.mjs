#!/usr/bin/env node
/**
 * Split data/palettes.json into per-domain (and 物理-per-sub) shards + model map.
 * Map values are "domain" or "domain/sub" keys matching shard files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandDomainIndex } from '../js/boot/domainPack.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pal = JSON.parse(fs.readFileSync(path.join(root, 'data/palettes.json'), 'utf8'));
const raw = JSON.parse(fs.readFileSync(path.join(root, 'data/domain-index.json'), 'utf8'));
const rows = expandDomainIndex(raw);
const idMeta = Object.fromEntries(rows.map((r) => [r.id, { domain: r.domain || '其他', sub: r.sub || '' }]));

const byKey = {};
const idToKey = {};
let skippedOrphans = 0;
for (const [id, colors] of Object.entries(pal.models || {})) {
  // Never invent an 「其他」shard for ids already removed from the catalog.
  if (!idMeta[id]) {
    skippedOrphans += 1;
    continue;
  }
  const meta = idMeta[id];
  const splitSubs = new Set(['物理', '工程', '计算机科学', '计算机工程', '数学', '化学']);
  const key = splitSubs.has(meta.domain) && meta.sub
    ? `${meta.domain}/${meta.sub}`
    : meta.domain;
  idToKey[id] = key;
  (byKey[key] ||= {})[id] = colors;
}

const outDir = path.join(root, 'data/palettes/domains');
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) {
  if (f.endsWith('.json')) fs.unlinkSync(path.join(outDir, f));
}
let max = 0;
for (const [key, models] of Object.entries(byKey)) {
  const file = path.join(outDir, `${key.replace(/\//g, '__')}.json`);
  const body = JSON.stringify({ key, models }, null, 0);
  fs.writeFileSync(file, `${body}\n`);
  max = Math.max(max, Buffer.byteLength(body));
}
fs.writeFileSync(
  path.join(root, 'data/palettes/shared.json'),
  `${JSON.stringify({ neutral: pal.neutral, hc: pal.hc, _note: 'Companion to deprecated data/palettes.json monolith' }, null, 0)}\n`,
);
fs.writeFileSync(
  path.join(root, 'data/palettes/model-domain.json'),
  `${JSON.stringify(idToKey, null, 0)}\n`,
);
// Drop stale color entries from the monolith so the next gen cannot resurrect orphans.
let pruned = 0;
for (const id of Object.keys(pal.models || {})) {
  if (!idMeta[id]) {
    delete pal.models[id];
    pruned += 1;
  }
}
if (pruned) {
  fs.writeFileSync(path.join(root, 'data/palettes.json'), `${JSON.stringify(pal)}\n`);
}
console.log(
  'palette shards',
  Object.keys(byKey).length,
  'maxBytes',
  max,
  'skippedOrphans',
  skippedOrphans,
  'prunedMonolith',
  pruned,
);
