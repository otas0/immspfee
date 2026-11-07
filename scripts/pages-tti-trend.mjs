#!/usr/bin/env node
/**
 * Compare current artifacts/pages-tti-sw.json to previous snapshot (if any).
 * Writes artifacts/pages-tti-trend.json for CI upload / human glance.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'artifacts');
const curPath = path.join(outDir, 'pages-tti-sw.json');
const prevPath = path.join(outDir, 'pages-tti-sw.prev.json');
const trendPath = path.join(outDir, 'pages-tti-trend.json');

if (!fs.existsSync(curPath)) {
  console.error('pages-tti-trend: missing artifacts/pages-tti-sw.json — run test:pages-tti-sw first');
  process.exit(1);
}
const cur = JSON.parse(fs.readFileSync(curPath, 'utf8'));
let prev = null;
if (fs.existsSync(prevPath)) {
  try { prev = JSON.parse(fs.readFileSync(prevPath, 'utf8')); } catch { prev = null; }
}

function pick(row) {
  if (!row) return null;
  return {
    readyMs: row.readyMs,
    interactiveMs: row.boot?.interactiveMs ?? null,
    firstHandP95: row.firstHandP95,
  };
}

const trend = {
  at: new Date().toISOString(),
  url: cur.url,
  current: { cold: pick(cur.cold), warm: pick(cur.warm) },
  previous: prev ? { at: prev.at, cold: pick(prev.cold), warm: pick(prev.warm) } : null,
  deltas: null,
};
if (prev?.cold && cur?.cold) {
  trend.deltas = {
    coldFirstHandP95: (cur.cold.firstHandP95 ?? 0) - (prev.cold.firstHandP95 ?? 0),
    warmFirstHandP95: (cur.warm.firstHandP95 ?? 0) - (prev.warm.firstHandP95 ?? 0),
    coldReadyMs: (cur.cold.readyMs ?? 0) - (prev.cold.readyMs ?? 0),
    warmReadyMs: (cur.warm.readyMs ?? 0) - (prev.warm.readyMs ?? 0),
  };
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(trendPath, `${JSON.stringify(trend, null, 2)}
`);
fs.copyFileSync(curPath, prevPath);
const warmP95 = cur.warm?.firstHandP95 ?? 0;
const warmWarn = Number(process.env.WARM_FIRST_HAND_P95_WARN_MS || 250);
if (warmP95 > warmWarn) {
  console.warn(`pages-tti-trend advisory: warm firstHandP95 ${warmP95}ms > ${warmWarn}ms`);
}
const warmDeltaWarn = Number(process.env.WARM_FIRST_HAND_P95_DELTA_WARN_MS || 80);
if (trend.deltas && trend.deltas.warmFirstHandP95 > warmDeltaWarn) {
  console.warn(`pages-tti-trend advisory: warm firstHandP95 rose by ${trend.deltas.warmFirstHandP95}ms`);
}
console.log(JSON.stringify(trend, null, 2));
