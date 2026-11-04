/**
 * 模型注册表
 * 元数据来自 data/models.json；实现来自本目录。
 * 新增：实现接口 → 在此注册 → 写入 models.json + palettes.json
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

const implementations = [
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
];

const byId = Object.fromEntries(implementations.map((m) => [m.id, m]));

/** @type {object[]} */
let models = implementations.map((m) => ({ ...m }));

export { models };

export function getModelById(id) {
  return models.find((m) => m.id === id) || models[0];
}

export function getAllTags() {
  const set = new Set();
  for (const m of models) {
    for (const t of m.tags || []) set.add(t);
  }
  return [...set].sort();
}

export async function loadModelMetadata(url = './data/models.json') {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const metaList = await res.json();
    const merged = [];
    for (const meta of metaList) {
      const impl = byId[meta.id];
      if (!impl) continue;
      merged.push({
        ...impl,
        name: meta.name ?? impl.name,
        tags: meta.tags ?? [],
        formula: meta.formula ?? '',
        description: meta.description ?? '',
      });
    }
    for (const impl of implementations) {
      if (!merged.some((m) => m.id === impl.id)) {
        merged.push({
          ...impl,
          tags: impl.tags || [],
          formula: impl.formula || '',
          description: impl.description || '',
        });
      }
    }
    models = merged;
  } catch (err) {
    console.warn('模型元数据加载失败，使用内置字段', err);
    models = implementations.map((m) => ({
      ...m,
      tags: m.tags || [],
      formula: m.formula || '',
      description: m.description || '',
    }));
  }
  return models;
}
