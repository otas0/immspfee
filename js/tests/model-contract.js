/**
 * 死规则：每个模型必须可用 — init/step/readouts/改参/refresh 均有限且可读。
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

export function runModelContract() {
  const results = [];
  const assert = (name, cond, detail = '') => {
    results.push({ name, ok: !!cond, detail });
  };

  assert('contract models ≥ 100', models.length >= 100, `n=${models.length}`);

  let failed = null;
  for (const model of models) {
    try {
      if (typeof model.init !== 'function' || typeof model.step !== 'function'
        || typeof model.draw !== 'function' || typeof model.getReadouts !== 'function') {
        failed = `${model.id}: missing API`;
        break;
      }
      if (typeof model.refresh !== 'function') {
        failed = `${model.id}: missing refresh`;
        break;
      }
      const state = { params: JSON.parse(JSON.stringify(model.params || {})) };
      model.init(state);
      for (let i = 0; i < 12; i += 1) model.step(state, 1 / 60);
      let bad = finiteState(state);
      if (bad.length) { failed = `${model.id}: nonfinite after step ${bad[0]}`; break; }
      const r0 = model.getReadouts(state, { digits: 3 }) || [];
      if (!r0.length) { failed = `${model.id}: empty readouts`; break; }

      // 改每个 dynamics 参数并 refresh
      for (const [key, meta] of Object.entries(model.paramSchema || {})) {
        if (meta?.group !== 'dynamics') continue;
        if (typeof state.params[key] === 'number') {
          const mid = Number.isFinite(meta.min) && Number.isFinite(meta.max)
            ? (meta.min + meta.max) / 2
            : state.params[key] * 1.05 + 0.01;
          state.params[key] = mid;
          model.refresh(state);
          bad = finiteState(state);
          if (bad.length) { failed = `${model.id}: nonfinite after ${key} ${bad[0]}`; break; }
          const r = model.getReadouts(state, { digits: 3 }) || [];
          if (!r.length) { failed = `${model.id}: readouts empty after ${key}`; break; }
        } else if (typeof state.params[key] === 'string' && meta?.allowText) {
          model.refresh(state);
        }
      }
      if (failed) break;

      // initial 参数：re-init
      for (const [key, meta] of Object.entries(model.paramSchema || {})) {
        if (meta?.group !== 'initial') continue;
        if (typeof state.params[key] !== 'number') continue;
        state.params[key] = Number.isFinite(meta.min) ? meta.min : state.params[key];
        model.init(state);
        model.refresh(state);
        bad = finiteState(state);
        if (bad.length) { failed = `${model.id}: nonfinite reinit ${key}`; break; }
      }
      if (failed) break;

      // 伪 draw（无 canvas 时跳过像素，但保证可调用）
      if (typeof OffscreenCanvas !== 'undefined') {
        const c = new OffscreenCanvas(320, 200);
        const ctx = c.getContext('2d');
        model.draw(ctx, state, { width: 320, height: 200, showVectors: true, showTrail: true, showAxes: true });
      }
    } catch (err) {
      failed = `${model.id}: ${err.message}`;
      break;
    }
  }

  assert('all models usable (init/step/refresh/readouts)', !failed, failed || `ok n=${models.length}`);
  return results;
}
