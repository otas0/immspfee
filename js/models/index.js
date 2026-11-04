/**
 * 模型注册表
 * 元数据来自 data/models.json / catalog.json；手写实现优先，其余由 factory 生成。
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
import { createFactoryModel } from './factory.js';
import catalog from '../../data/catalog.json' with { type: 'json' };

const handcrafted = [
  freeFall,
  projectile,
  spring,
  pendulum,
  collision,
  doublePendulum,
  wave,
  heat,
  orbit,
  lorentz,
  sorting,
  bfsGrid,
  life,
  cacheLru,
  pipeline,
  fifo,
  rcCircuit,
  rlc,
  inclinedPlane,
  collision2d,
  dijkstra,
  logicGates,
];

const byId = Object.fromEntries(handcrafted.map((m) => [m.id, m]));

/** 死规则：每个模型必须有 refresh，改参后 HUD/图立刻可用 */
function ensureRefresh(model) {
  if (typeof model.refresh === 'function') return model;
  model.refresh = function refresh(state) {
    if (typeof this.recompute === 'function') this.recompute(state);
    else if (typeof this.step === 'function') this.step(state, 0);
  };
  return model;
}

for (const m of handcrafted) ensureRefresh(m);

function buildAll() {
  const list = [];
  const seen = new Set();
  for (const spec of catalog) {
    if (seen.has(spec.id)) continue;
    seen.add(spec.id);
    if (spec.family === 'hand' && byId[spec.id]) {
      list.push(ensureRefresh({
        ...byId[spec.id],
        name: spec.name || byId[spec.id].name,
        tags: [spec.domain, spec.sub].filter(Boolean),
        formula: spec.formula || byId[spec.id].formula || '',
        description: spec.description || byId[spec.id].description || '',
        sub: spec.sub || '',
      }));
    } else if (byId[spec.id]) {
      list.push(ensureRefresh({
        ...byId[spec.id],
        name: spec.name || byId[spec.id].name,
        tags: [spec.domain, spec.sub].filter(Boolean),
        formula: spec.formula || '',
        description: spec.description || '',
        sub: spec.sub || '',
      }));
    } else {
      list.push(ensureRefresh(createFactoryModel(spec)));
    }
  }
  for (const impl of handcrafted) {
    if (!seen.has(impl.id)) {
      list.push(ensureRefresh({
        ...impl,
        tags: impl.tags || [],
        formula: impl.formula || '',
        description: impl.description || '',
        sub: '',
      }));
    }
  }
  return list;
}

/** @type {object[]} */
let models = buildAll();

export { models };

export function getModelById(id) {
  return models.find((m) => m.id === id) || models[0];
}

export function getAllTags() {
  const set = new Set();
  for (const m of models) {
    for (const t of m.tags || []) set.add(t);
    if (m.sub) set.add(m.sub);
  }
  return [...set].sort();
}

export async function loadModelMetadata(url = './data/models.json') {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const metaList = await res.json();
    const metaById = Object.fromEntries(metaList.map((m) => [m.id, m]));
    models = buildAll().map((m) => {
      const meta = metaById[m.id];
      if (!meta) return m;
      return {
        ...m,
        name: meta.name ?? m.name,
        tags: meta.tags ?? m.tags ?? [],
        formula: meta.formula ?? m.formula ?? '',
        description: meta.description ?? m.description ?? '',
        sub: meta.sub ?? m.sub ?? '',
      };
    });
  } catch (err) {
    console.warn('模型元数据加载失败，使用 catalog', err);
    models = buildAll();
  }
  return models;
}
