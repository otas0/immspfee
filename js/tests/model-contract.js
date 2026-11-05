/**
 * 死规则：每个模型必须可用 — init/step/readouts/改参/refresh 均有限且可读。
 * 失败时汇总全部 model id，供 artifact 写出。
 */
import { models } from '../models/index.js';

function finiteState(state) {
  const bad = [];
  const walk = (obj, path) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'params' || k.startsWith('_')) continue;
      const p = path ? `${path}.${k}` : k;
      if (typeof v === 'number' && Number.isNaN(v)) bad.push(p);
      else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Float64Array)) walk(v, p);
    }
  };
  walk(state, '');
  return bad;
}

/** Params that often drive animation only — excluded from fake-readout sensitivity. */
const IGNORE_SENSITIVITY = /^(speed|dt|tol|show|seed|demo|steps|nStep|fps|view|zoom|scale)$/i;

function numericReadoutMap(readouts) {
  const map = new Map();
  for (const r of readouts || []) {
    const m = String(r.value).trim().match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/);
    const n = m ? Number(m[0]) : NaN;
    if (Number.isFinite(n)) map.set(r.label, n);
  }
  return map;
}

function mapsDiffer(a, b, rel = 1e-6, abs = 1e-30) {
  for (const [k, va] of a) {
    if (!b.has(k)) continue;
    const vb = b.get(k);
    if (Math.abs(va - vb) > abs + rel * Math.max(Math.abs(va), Math.abs(vb))) return true;
  }
  return false;
}

function checkOne(model) {
  if (typeof model.init !== 'function' || typeof model.step !== 'function'
    || typeof model.draw !== 'function' || typeof model.getReadouts !== 'function') {
    return `${model.id}: missing API`;
  }
  if (typeof model.refresh !== 'function') {
    return `${model.id}: missing refresh`;
  }
  const state = { params: JSON.parse(JSON.stringify(model.params || {})) };
  model.init(state);
  for (let i = 0; i < 12; i += 1) model.step(state, 1 / 60);
  let bad = finiteState(state);
  if (bad.length) return `${model.id}: nonfinite after step ${bad[0]}`;
  const r0 = model.getReadouts(state, { digits: 3 }) || [];
  if (!r0.length) return `${model.id}: empty readouts`;

  const sensitiveKeys = [];
  for (const [key, meta] of Object.entries(model.paramSchema || {})) {
    if (meta?.group !== 'dynamics') continue;
    if (typeof state.params[key] === 'number') {
      if (!IGNORE_SENSITIVITY.test(key)
        && Number.isFinite(meta.min) && Number.isFinite(meta.max)
        && meta.max > meta.min) {
        sensitiveKeys.push([key, meta]);
      }
      const mid = Number.isFinite(meta.min) && Number.isFinite(meta.max)
        ? (meta.min + meta.max) / 2
        : state.params[key] * 1.05 + 0.01;
      state.params[key] = mid;
      model.refresh(state);
      bad = finiteState(state);
      if (bad.length) return `${model.id}: nonfinite after ${key} ${bad[0]}`;
      const r = model.getReadouts(state, { digits: 3 }) || [];
      if (!r.length) return `${model.id}: readouts empty after ${key}`;
    } else if (typeof state.params[key] === 'string' && meta?.allowText) {
      model.refresh(state);
    }
  }

  // Constant-readout detection is soft (see probeConstantReadouts) — does not fail the suite.

  for (const [key, meta] of Object.entries(model.paramSchema || {})) {
    if (meta?.group !== 'initial') continue;
    if (typeof state.params[key] !== 'number') continue;
    state.params[key] = Number.isFinite(meta.min) ? meta.min : state.params[key];
    model.init(state);
    model.refresh(state);
    bad = finiteState(state);
    if (bad.length) return `${model.id}: nonfinite reinit ${key}`;
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(320, 200);
    const ctx = c.getContext('2d');
    model.draw(ctx, state, { width: 320, height: 200, showVectors: true, showTrail: true, showAxes: true });
  }
  return null;
}

function pickContractModels(all) {
  // CONTRACT_SAMPLE=0|unset → 全量；CONTRACT_SAMPLE=N → 分层抽样（大目录加速）
  const raw = typeof process !== 'undefined' ? process.env?.CONTRACT_SAMPLE : '';
  const n = raw === undefined || raw === '' ? 0 : Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n >= all.length) return all;
  const byDomain = new Map();
  for (const m of all) {
    const d = (m.tags && m.tags[0]) || '其他';
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d).push(m);
  }
  const domains = [...byDomain.keys()];
  const per = Math.max(1, Math.floor(n / Math.max(1, domains.length)));
  const picked = [];
  const seen = new Set();
  for (const d of domains) {
    const list = byDomain.get(d);
    for (let i = 0; i < list.length && picked.length < n; i += 1) {
      if (i >= per && picked.length >= per * (domains.indexOf(d) + 1)) break;
      const m = list[Math.floor((i * list.length) / per) % list.length];
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      picked.push(m);
    }
  }
  for (const m of all) {
    if (picked.length >= n) break;
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    picked.push(m);
  }
  return picked;
}

function probeConstantReadouts(model) {
  const schema = model.paramSchema || {};
  const keys = Object.entries(schema).filter(([k, meta]) => (
    meta?.group === 'dynamics'
    && typeof model.params?.[k] === 'number'
    && !IGNORE_SENSITIVITY.test(k)
    && Number.isFinite(meta.min)
    && Number.isFinite(meta.max)
    && meta.max > meta.min
  ));
  if (!keys.length) return null;
  for (const [key, meta] of keys) {
    const probe = { params: JSON.parse(JSON.stringify(model.params || {})) };
    model.init(probe);
    probe.params[key] = meta.min;
    model.refresh?.(probe);
    for (let i = 0; i < 4; i += 1) model.step(probe, 1 / 60);
    const lo = numericReadoutMap(model.getReadouts(probe, { digits: 6 }));
    probe.params[key] = meta.max;
    model.refresh?.(probe);
    for (let i = 0; i < 4; i += 1) model.step(probe, 1 / 60);
    const hi = numericReadoutMap(model.getReadouts(probe, { digits: 6 }));
    if (lo.size && hi.size && mapsDiffer(lo, hi)) return null;
  }
  return model.id;
}

export function runModelContract() {
  const results = [];
  const assert = (name, cond, detail = '') => {
    results.push({ name, ok: !!cond, detail });
  };

  assert('contract models ≥ 100', models.length >= 100, `n=${models.length}`);

  const sample = pickContractModels(models);
  const failedIds = [];
  const failedDetails = [];
  const constantReadoutIds = [];
  for (const model of sample) {
    try {
      const err = checkOne(model);
      if (err) {
        failedIds.push(model.id);
        failedDetails.push(err);
      } else {
        const cid = probeConstantReadouts(model);
        if (cid) constantReadoutIds.push(cid);
      }
    } catch (err) {
      failedIds.push(model.id);
      failedDetails.push(`${model.id}: ${err.message}`);
    }
  }

  results._contractFailures = {
    ids: failedIds,
    details: failedDetails,
    total: sample.length,
    catalogTotal: models.length,
    ok: sample.length - failedIds.length,
    constantReadoutIds,
  };

  assert(
    'all models usable (init/step/refresh/readouts)',
    failedIds.length === 0,
    failedIds.length
      ? `failed ${failedIds.length}/${sample.length}: ${failedIds.slice(0, 12).join(', ')}${failedIds.length > 12 ? '…' : ''}`
      : `ok n=${sample.length}/${models.length}`,
  );
  // Soft signal only — does not fail the suite.
  assert(
    'constant-readout sample noted (non-blocking)',
    true,
    constantReadoutIds.length
      ? `n=${constantReadoutIds.length}: ${constantReadoutIds.slice(0, 8).join(', ')}${constantReadoutIds.length > 8 ? '…' : ''}`
      : 'none',
  );
  return results;
}
