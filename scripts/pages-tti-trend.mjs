#!/usr/bin/env node
/**
 * Compare current artifacts/pages-tti-sw.json to previous snapshot (if any).
 * Writes artifacts/pages-tti-trend.json for CI upload / human glance.
 * Warm firstHandP95: advisory by default; soft-fail after N consecutive over-threshold runs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'artifacts');
const curPath = path.join(outDir, 'pages-tti-sw.json');
const prevPath = path.join(outDir, 'pages-tti-sw.prev.json');
const trendPath = path.join(outDir, 'pages-tti-trend.json');
const streakPath = path.join(outDir, 'pages-tti-warm-streak.json');
const cacheStreakPath = path.join(outDir, 'pages-tti-cache', 'pages-tti-warm-streak.json');

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

const warmP95 = cur.warm?.firstHandP95 ?? 0;
const warmWarn = Number(process.env.WARM_FIRST_HAND_P95_WARN_MS || 250);
const warmDeltaWarn = Number(process.env.WARM_FIRST_HAND_P95_DELTA_WARN_MS || 80);
const streakLimit = Math.max(2, Number(process.env.WARM_FIRST_HAND_STREAK_SOFT_FAIL || 2));
const softFail = process.env.WARM_FIRST_HAND_SOFT_FAIL === '1'
  || (process.env.WARM_FIRST_HAND_SOFT_FAIL !== '0' && process.env.CI === 'true');

let streak = { over: 0, lastAt: null, lastP95: null };
for (const p of [cacheStreakPath, streakPath]) {
  if (!fs.existsSync(p)) continue;
  try {
    streak = { ...streak, ...JSON.parse(fs.readFileSync(p, 'utf8')) };
    break;
  } catch { /* ignore */ }
}
if (warmP95 > warmWarn) {
  streak.over = (streak.over || 0) + 1;
  streak.lastAt = trend.at;
  streak.lastP95 = warmP95;
  console.warn(`pages-tti-trend advisory: warm firstHandP95 ${warmP95}ms > ${warmWarn}ms (streak ${streak.over}/${streakLimit})`);
} else {
  streak.over = 0;
  streak.lastAt = trend.at;
  streak.lastP95 = warmP95;
}
if (trend.deltas && trend.deltas.warmFirstHandP95 > warmDeltaWarn) {
  console.warn(`pages-tti-trend advisory: warm firstHandP95 rose by ${trend.deltas.warmFirstHandP95}ms`);
}
trend.warmStreak = streak;

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.dirname(cacheStreakPath), { recursive: true });
fs.writeFileSync(trendPath, `${JSON.stringify(trend, null, 2)}\n`);
fs.writeFileSync(streakPath, `${JSON.stringify(streak, null, 2)}\n`);
fs.writeFileSync(cacheStreakPath, `${JSON.stringify(streak, null, 2)}\n`);
fs.copyFileSync(curPath, prevPath);
console.log(JSON.stringify(trend, null, 2));

if (softFail && streak.over >= streakLimit) {
  console.error(`pages-tti-trend soft-fail: warm firstHandP95 over ${warmWarn}ms for ${streak.over} consecutive runs`);
  process.exit(1);
}
