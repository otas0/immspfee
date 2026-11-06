/**
 * Node and test registry. The browser uses browser.js so the full catalog
 * is not on the first paint.
 */
import catalog from '../../data/catalog.json' with { type: 'json' };
import { createFactoryModel } from './factory.js';
import { setFactoryBuilder } from './factoryLoader.js';
import { buildFromSpecs, ensureHandModels } from './assemble.js';

setFactoryBuilder(createFactoryModel);
await ensureHandModels();

function buildAll() {
  return buildFromSpecs(catalog);
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
      const topicBound = !!m.topicBound;
      const next = {
        ...m,
        name: meta.name ?? m.name,
        tags: meta.tags ?? m.tags ?? [],
        formula: topicBound ? (m.formula || meta.formula || '') : (meta.formula ?? m.formula ?? ''),
        description: meta.description ?? m.description ?? '',
        sub: meta.sub ?? m.sub ?? '',
        authority: topicBound ? (m.authority || meta.authority || '') : (meta.authority ?? m.authority ?? ''),
        assumptions: topicBound ? (m.assumptions || meta.assumptions || '') : (meta.assumptions ?? m.assumptions ?? ''),
        fidelity: topicBound ? (m.fidelity || meta.fidelity) : (meta.fidelity ?? m.fidelity),
        deprecated: topicBound ? false : (meta.deprecated ?? m.deprecated),
        deprecatedReason: topicBound ? '' : (meta.deprecatedReason ?? m.deprecatedReason ?? ''),
      };
      if (next.capabilities && next.fidelity) {
        next.capabilities = { ...next.capabilities, fidelity: next.fidelity };
      }
      return next;
    });
  } catch (err) {
    console.warn('模型元数据加载失败，使用 catalog', err);
    models = buildAll();
  }
  return models;
}

export function rebuildModels() {
  models = buildAll();
  return models;
}
