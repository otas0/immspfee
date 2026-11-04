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

  for (const [key, meta] of Object.entries(model.paramSchema || {})) {
    if (meta?.group !== 'dynamics') continue;
    if (typeof state.params[key] === 'number') {
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

export function runModelContract() {
  const results = [];
  const assert = (name, cond, detail = '') => {
    results.push({ name, ok: !!cond, detail });
  };

  assert('contract models ≥ 100', models.length >= 100, `n=${models.length}`);

  const failedIds = [];
  const failedDetails = [];
  for (const model of models) {
    try {
      const err = checkOne(model);
      if (err) {
        failedIds.push(model.id);
        failedDetails.push(err);
      }
    } catch (err) {
      failedIds.push(model.id);
      failedDetails.push(`${model.id}: ${err.message}`);
    }
  }

  results._contractFailures = {
    ids: failedIds,
    details: failedDetails,
    total: models.length,
    ok: models.length - failedIds.length,
  };

  assert(
    'all models usable (init/step/refresh/readouts)',
    failedIds.length === 0,
    failedIds.length
      ? `failed ${failedIds.length}: ${failedIds.slice(0, 12).join(', ')}${failedIds.length > 12 ? '…' : ''}`
      : `ok n=${models.length}`,
  );
  return results;
}
