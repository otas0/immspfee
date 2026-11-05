#!/usr/bin/env node
/**
 * Audit models for constant / decorative readouts (no-fake-data hard rule).
 * Sweeps dynamics params min→max and flags models whose numeric readouts never move.
 *
 * Usage: npm run report:fake-data
 * Writes artifacts/fake-data-suspects.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelsUrl = pathToFileURL(path.join(root, 'js/models/index.js')).href;
const { models } = await import(modelsUrl);

const IGNORE = /^(speed|dt|tol|show|seed|demo|steps|nStep|fps|view|zoom|scale)$/i;

function numericMap(readouts) {
  const map = new Map();
  for (const r of readouts || []) {
    const m = String(r.value).trim().match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/);
    const n = m ? Number(m[0]) : NaN;
    if (Number.isFinite(n)) map.set(r.label, n);
  }
  return map;
}

function differs(a, b) {
  for (const [k, va] of a) {
    if (!b.has(k)) continue;
    const vb = b.get(k);
    if (Math.abs(va - vb) > 1e-30 + 1e-6 * Math.max(Math.abs(va), Math.abs(vb), 1e-30)) return true;
  }
  return false;
}

function auditOne(model) {
  const schema = model.paramSchema || {};
  const keys = Object.entries(schema).filter(([k, meta]) => (
    meta?.group === 'dynamics'
    && typeof model.params?.[k] === 'number'
    && !IGNORE.test(k)
    && Number.isFinite(meta.min)
    && Number.isFinite(meta.max)
    && meta.max > meta.min
  ));
  if (!keys.length) {
    return { id: model.id, status: 'skip', reason: 'no sweepable dynamics params' };
  }
  let moved = false;
  const tried = [];
  for (const [key, meta] of keys) {
    const state = { params: JSON.parse(JSON.stringify(model.params || {})) };
    model.init(state);
    state.params[key] = meta.min;
    model.refresh?.(state);
    for (let i = 0; i < 4; i += 1) model.step(state, 1 / 60);
    const lo = numericMap(model.getReadouts(state, { digits: 6 }));
    state.params[key] = meta.max;
    model.refresh?.(state);
    for (let i = 0; i < 4; i += 1) model.step(state, 1 / 60);
    const hi = numericMap(model.getReadouts(state, { digits: 6 }));
    tried.push(key);
    if (lo.size && hi.size && differs(lo, hi)) {
      moved = true;
      break;
    }
  }
  if (moved) return { id: model.id, status: 'ok', tried };
  return {
    id: model.id,
    status: 'suspect',
    reason: 'constant numeric readouts across dynamics sweeps',
    tried,
  };
}

const results = [];
const suspects = [];
for (const m of models) {
  try {
    const r = auditOne(m);
    results.push(r);
    if (r.status === 'suspect') suspects.push(r);
  } catch (err) {
    const r = { id: m.id, status: 'error', reason: err.message };
    results.push(r);
    suspects.push(r);
  }
}

const outDir = path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });
const payload = {
  generatedAt: new Date().toString(),
  total: models.length,
  suspects: suspects.length,
  ok: results.filter((r) => r.status === 'ok').length,
  skipped: results.filter((r) => r.status === 'skip').length,
  failedModelIds: suspects.map((s) => s.id),
  details: suspects,
};
const jsonPath = path.join(outDir, 'fake-data-suspects.json');
const txtPath = path.join(outDir, 'fake-data-suspect-ids.txt');
fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(txtPath, `${payload.failedModelIds.join('\n')}${payload.failedModelIds.length ? '\n' : ''}`);

console.log(`fake-data audit: ${payload.suspects} suspects / ${payload.total} models`);
console.log(`→ ${jsonPath}`);
if (suspects.length) {
  console.log(payload.failedModelIds.slice(0, 40).join('\n') + (suspects.length > 40 ? '\n…' : ''));
  process.exitCode = 1;
}
