/**
 * Build runnable models from catalog specs. Node tests pass the full catalog.
 * The browser passes one subject at a time.
 */
import freeFall from './freeFall.js';
import projectile from './projectile.js';
import spring from './spring.js';
import pendulum from './pendulum.js';
import collision from './collision.js';
import doublePendulum from './doublePendulum.js';
import wave from './wave.js';
import heat from './heat.js';
import orbit from './orbit.js';
import lorentz from './lorentz.js';
import sorting from './sorting.js';
import bfsGrid from './bfsGrid.js';
import life from './life.js';
import cacheLru from './cacheLru.js';
import pipeline from './pipeline.js';
import fifo from './fifo.js';
import rcCircuit from './rcCircuit.js';
import rlc from './rlc.js';
import inclinedPlane from './inclinedPlane.js';
import collision2d from './collision2d.js';
import dijkstra from './dijkstra.js';
import logicGates from './logicGates.js';
import beamSfdBmd from './beamSfdBmd.js';
import pidTune from './pidTune.js';
import hodgkinHuxley from './hodgkinHuxley.js';
import compoundMicroscope from './compoundMicroscope.js';
import { createFactoryModel } from './factory.js';
import { applyLowInkStrokeBoost } from '../lab/lowInkIds.js';
import { localizeModel } from '../utils/zhLabels.js';
import { buildAllUserModels } from '../lab/userModels.js';

const handcrafted = [
  freeFall, projectile, spring, pendulum, collision, doublePendulum, wave, heat,
  orbit, lorentz, sorting, bfsGrid, life, cacheLru, pipeline, fifo, rcCircuit, rlc,
  inclinedPlane, collision2d, dijkstra, logicGates, beamSfdBmd, pidTune,
  hodgkinHuxley, compoundMicroscope,
];

const byId = Object.fromEntries(handcrafted.map((m) => [m.id, m]));

export function ensureRefresh(model) {
  localizeModel(model);
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
      list.push(ensureRefresh(applyCatalogPolicy(createFactoryModel(spec), spec)));
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
