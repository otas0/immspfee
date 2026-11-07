#!/usr/bin/env node
/**
 * Compare current artifacts/micro-fps-advisory.json to previous snapshot (if any).
 * Writes artifacts/micro-fps-trend.json for CI upload / human glance.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'artifacts');
const curPath = path.join(outDir, 'micro-fps-advisory.json');
const prevPath = path.join(outDir, 'micro-fps-advisory.prev.json');
const trendPath = path.join(outDir, 'micro-fps-trend.json');

if (!fs.existsSync(curPath)) {
  console.error('micro-fps-trend: missing artifacts/micro-fps-advisory.json — run test:micro-fps first');
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
    microFps: row.microFps ?? null,
    microProjectorViewportFps: row.microProjectorViewportFps ?? null,
    projectorR016Fps: row.projectorR016Fps ?? null,
    belowGate: !!row.belowGate,
    minFps: row.minFps ?? null,
  };
}

const trend = {
  at: new Date().toISOString(),
  kind: 'micro-fps-trend',
  current: pick(cur),
  previous: prev ? { at: prev.at || null, ...pick(prev) } : null,
  deltas: null,
};
if (prev && cur) {
  trend.deltas = {
    microFps: (Number(cur.microFps) || 0) - (Number(prev.microFps) || 0),
    microProjectorViewportFps:
      (Number(cur.microProjectorViewportFps) || 0) - (Number(prev.microProjectorViewportFps) || 0),
    projectorR016Fps:
      (Number(cur.projectorR016Fps) || 0) - (Number(prev.projectorR016Fps) || 0),
  };
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(trendPath, `${JSON.stringify(trend, null, 2)}\n`);
// Keep a stamped copy for cache restore (prev file holds last advisory + at).
fs.writeFileSync(prevPath, `${JSON.stringify({ ...cur, at: trend.at }, null, 2)}\n`);

const dropWarn = Number(process.env.MICRO_FPS_DROP_WARN || 8);
if (trend.deltas && trend.deltas.microFps < -dropWarn) {
  console.warn(`micro-fps-trend advisory: microFps dropped by ${(-trend.deltas.microFps).toFixed(1)} (≥${dropWarn})`);
}
const absMin = Number(process.env.MICRO_FPS_TREND_ABS_WARN || 45);
if ((Number(cur.microFps) || 0) > 0 && (Number(cur.microFps) || 0) < absMin) {
  console.warn(`micro-fps-trend advisory: microFps ${cur.microFps} < ${absMin} (consider lowering threadN)`);
}
console.log(JSON.stringify(trend, null, 2));
