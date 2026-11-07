#!/usr/bin/env node
/**
 * ACTIVITY_RING must stay far from every DIN identification color
 * (red / yellow / light blue / white), including the mesh's brightened RGB.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACTIVITY_RING,
  OBJECTIVE_RING_LEGEND,
  objectiveRingColor,
  OBJECTIVES,
} from '../js/models/microscopeOptics.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(msg) {
  console.error('FAIL', msg);
  process.exit(1);
}

function dist(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.hypot(dr, dg, db);
}

function brighten(rgb) {
  return rgb.map((c) => Math.min(1, c * 1.18 + 0.04));
}

const rgb = ACTIVITY_RING.rgb;
if (!rgb || rgb.length !== 3 || rgb.some((c) => c < 0 || c > 1)) {
  fail(`ACTIVITY_RING.rgb invalid ${JSON.stringify(rgb)}`);
}
if (!(rgb[0] > 0.85 && rgb[2] > 0.55 && rgb[1] < 0.25 && rgb[2] - rgb[1] > 0.4)) {
  fail(`ACTIVITY_RING is not magenta ${JSON.stringify(rgb)}`);
}

const hexBody = ACTIVITY_RING.hex.replace('#', '');
const hexRgb = [
  parseInt(hexBody.slice(0, 2), 16) / 255,
  parseInt(hexBody.slice(2, 4), 16) / 255,
  parseInt(hexBody.slice(4, 6), 16) / 255,
];
if (dist(rgb, hexRgb) > 0.03) {
  fail(`ACTIVITY_RING.hex ${ACTIVITY_RING.hex} does not match rgb`);
}

const MIN_DIST = 0.4;
const rows = [];
for (const ring of OBJECTIVE_RING_LEGEND) {
  const d = dist(rgb, ring.rgb);
  const db = dist(rgb, brighten(ring.rgb));
  rows.push({ id: ring.id, name: ring.name, d: d.toFixed(3), bright: db.toFixed(3) });
  if (!(d >= MIN_DIST && db >= MIN_DIST)) {
    fail(`${ring.id} DIN ${ring.name} too close to ACTIVITY_RING d=${d.toFixed(3)} bright=${db.toFixed(3)}`);
  }
  if (ring.hex.toLowerCase() === String(ACTIVITY_RING.hex).toLowerCase()) {
    fail(`${ring.id} hex collides with ACTIVITY_RING`);
  }
}

for (const obj of OBJECTIVES) {
  const ring = objectiveRingColor(obj.mag);
  const d = dist(rgb, ring.rgb);
  if (d < MIN_DIST) fail(`objectiveRingColor(${obj.mag}) distance ${d.toFixed(3)}`);
}

const mesh = fs.readFileSync(path.join(root, 'js/viz/microscopeMeshBuild.js'), 'utf8');
if (!mesh.includes('ACTIVITY_RING')) fail('mesh does not reference ACTIVITY_RING');

console.log('palette', JSON.stringify({ activity: ACTIVITY_RING, rows }));
console.log('test:micro-palette ok');
