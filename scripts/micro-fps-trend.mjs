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
const fps390Path = path.join(outDir, 'micro-fps390.json');
const fps390PrevPath = path.join(outDir, 'micro-fps390.prev.json');

if (!fs.existsSync(curPath) && !fs.existsSync(fps390Path)) {
  console.error('micro-fps-trend: missing advisory and fps390 — run test:micro-fps and/or test:micro-camera');
  process.exit(1);
}
const cur = fs.existsSync(curPath) ? JSON.parse(fs.readFileSync(curPath, 'utf8')) : null;
let prev = null;
if (fs.existsSync(prevPath)) {
  try { prev = JSON.parse(fs.readFileSync(prevPath, 'utf8')); } catch { prev = null; }
}
const fps390 = fs.existsSync(fps390Path) ? JSON.parse(fs.readFileSync(fps390Path, 'utf8')) : null;
let fps390Prev = null;
if (fs.existsSync(fps390PrevPath)) {
  try { fps390Prev = JSON.parse(fs.readFileSync(fps390PrevPath, 'utf8')); } catch { fps390Prev = null; }
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
  fps390: fps390 ? { at: fps390.at || null, fps: fps390.fps ?? null, belowGate: !!fps390.belowGate } : null,
  fps390Previous: fps390Prev
    ? { at: fps390Prev.at || null, fps: fps390Prev.fps ?? null, belowGate: !!fps390Prev.belowGate }
    : null,
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
if (fps390 && fps390Prev && Number.isFinite(Number(fps390.fps)) && Number.isFinite(Number(fps390Prev.fps))) {
  trend.deltas = {
    ...(trend.deltas || {}),
    fps390: Number(fps390.fps) - Number(fps390Prev.fps),
  };
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(trendPath, `${JSON.stringify(trend, null, 2)}\n`);
// Keep a stamped copy for cache restore (prev file holds last advisory + at).
if (cur) fs.writeFileSync(prevPath, `${JSON.stringify({ ...cur, at: trend.at }, null, 2)}\n`);
if (fps390) fs.writeFileSync(fps390PrevPath, `${JSON.stringify({ ...fps390, at: trend.at }, null, 2)}\n`);

const dropWarn = Number(process.env.MICRO_FPS_DROP_WARN || 8);
if (trend.deltas && trend.deltas.microFps < -dropWarn) {
  console.warn(`micro-fps-trend advisory: microFps dropped by ${(-trend.deltas.microFps).toFixed(1)} (≥${dropWarn})`);
}
if (trend.deltas && Number.isFinite(trend.deltas.fps390) && trend.deltas.fps390 < -dropWarn) {
  console.warn(`micro-fps-trend advisory: fps390 dropped by ${(-trend.deltas.fps390).toFixed(1)} (≥${dropWarn})`);
}
const absMin = Number(process.env.MICRO_FPS_TREND_ABS_WARN || 45);
if ((Number(cur?.microFps) || 0) > 0 && (Number(cur?.microFps) || 0) < absMin) {
  console.warn(`micro-fps-trend advisory: microFps ${cur.microFps} < ${absMin} (consider lowering threadN)`);
}
if ((Number(fps390?.fps) || 0) > 0 && (Number(fps390?.fps) || 0) < absMin) {
  console.warn(`micro-fps-trend advisory: fps390 ${fps390.fps} < ${absMin} (consider lowering threadN)`);
}
console.log(JSON.stringify(trend, null, 2));
