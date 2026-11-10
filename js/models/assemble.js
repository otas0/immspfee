/**
 * Build runnable models from catalog specs. Node tests pass the full catalog.
 * The browser passes one subject at a time.
 *
 * Cold boot only embeds free-fall; other hand models load via ensureHandModels().
 */
import freeFall from './freeFall.js';
import { factoryBuilder } from './factoryLoader.js';
import { HAND_FORMALISM } from '../lab/formalism.js';
import { applyLowInkStrokeBoost } from '../lab/lowInkIds.js';
import { localizeModel } from '../utils/zhLabels.js';
import { buildAllUserModels } from '../lab/userModels.js';

/** @type {import('./freeFall.js').default[]} */
let handcrafted = [freeFall];
/** @type {Record<string, object>} */
let byId = { [freeFall.id]: freeFall };
let handsPending = null;

/** Load the rest of the handwritten catalog (browser: first subject; Node: tests). */
export function ensureHandModels() {
  if (handcrafted.length > 1) return Promise.resolve(handcrafted);
  if (!handsPending) {
    handsPending = import('./handModels.js').then((mod) => {
      const extras = mod.HANDS || [];
      handcrafted = [freeFall, ...extras];
      byId = Object.fromEntries(handcrafted.map((m) => [m.id, m]));
      return handcrafted;
    });
  }
  return handsPending;
}

export function ensureRefresh(model) {
  localizeModel(model);
  if (!model.formalism && !model.capabilities?.formalism && HAND_FORMALISM[model.id]) {
    model.formalism = HAND_FORMALISM[model.id];
    model.capabilities = { ...(model.capabilities || {}), formalism: model.formalism };
  }
  if (typeof model.getEnergyAt !== 'function' && typeof model.getEnergy === 'function') {
    model.getEnergyAt = function getEnergyAt(state, row) {
      if (!row || typeof row !== 'object') return this.getEnergy(state);
      const probe = { params: state.params };
      for (const [k, v] of Object.entries(state)) {
        if (k === 'params' || k === 'trail' || k === 'trails' || k.startsWith('_')) continue;
        probe[k] = v;
      }
      for (const [k, v] of Object.entries(row)) {
        if (k.startsWith('E_') || k === 'note') continue;
        if (typeof v === 'number' && Number.isFinite(v)) probe[k] = v;
      }
      return this.getEnergy(probe);
    };
  }
  if (typeof model.refresh !== 'function') {
    model.refresh = function refresh(state) {
      if (typeof this.recompute === 'function') this.recompute(state);
      else if (typeof this.step === 'function') this.step(state, 0);
    };
  }
  applyLowInkStrokeBoost(model);
  return model;
}

function applyCatalogPolicy(model, spec) {
  if (!spec) return model;
  if (model.topicBound) {
    model.family = spec.family || model.family;
    model.deprecated = false;
    model.deprecatedReason = '';
    if (model.capabilities && model.fidelity) {
      model.capabilities = { ...model.capabilities, fidelity: model.fidelity };
    }
    return model;
  }
  if (spec.family) model.family = spec.family;
  if (spec.authority) model.authority = spec.authority;
  if (spec.assumptions) model.assumptions = spec.assumptions;
  if (spec.fidelity) {
    model.fidelity = spec.fidelity;
    if (model.capabilities) model.capabilities = { ...model.capabilities, fidelity: spec.fidelity };
  }
  if (spec.deprecated) {
    model.deprecated = true;
    model.deprecatedReason = spec.deprecatedReason || '';
  }
  const dispatchKey = String(spec.formula || '').includes('·');
  if (!dispatchKey || !model.formula) model.formula = spec.formula || model.formula || '';
  return model;
}

export function buildFromSpecs(specs, options = {}) {
  const leftovers = options.leftovers !== false;
  const users = options.users !== false;
  const list = [];
  const seen = new Set();
  for (const spec of specs) {
    if (!spec || seen.has(spec.id)) continue;
    seen.add(spec.id);
    if (spec.family === 'hand' && byId[spec.id]) {
      list.push(ensureRefresh(applyCatalogPolicy({
        ...byId[spec.id],
        name: spec.name || byId[spec.id].name,
        tags: [spec.domain, spec.sub].filter(Boolean),
        formula: spec.formula || byId[spec.id].formula || '',
        description: spec.description || byId[spec.id].description || '',
        sub: spec.sub || '',
      }, spec)));
    } else if (byId[spec.id]) {
      list.push(ensureRefresh(applyCatalogPolicy({
        ...byId[spec.id],
        name: spec.name || byId[spec.id].name,
        tags: [spec.domain, spec.sub].filter(Boolean),
        formula: (String(spec.formula || '').includes('·') && byId[spec.id].formula)
          ? byId[spec.id].formula
          : (spec.formula || byId[spec.id].formula || ''),
        description: spec.description || '',
        sub: spec.sub || '',
      }, spec)));
    } else {
      const built = factoryBuilder()(spec);
      if (!built) {
        throw new Error(`catalog reject: no engine for id=${spec.id} family=${spec.family || '?'}`);
      }
      list.push(ensureRefresh(applyCatalogPolicy(built, spec)));
    }
  }
  if (leftovers) {
    for (const impl of handcrafted) {
      if (seen.has(impl.id)) continue;
      seen.add(impl.id);
      list.push(ensureRefresh({
        ...impl,
        tags: impl.tags || [],
        formula: impl.formula || '',
        description: impl.description || '',
        sub: '',
      }));
    }
  }
  if (users) {
    for (const um of buildAllUserModels()) {
      if (seen.has(um.id)) continue;
      seen.add(um.id);
      list.push(ensureRefresh(um));
    }
  }
  return list;
}

export function handcraftedList() {
  return handcrafted;
}
