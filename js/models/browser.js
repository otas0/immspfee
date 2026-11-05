/**
 * Browser catalog loaded one subject at a time.
 * `models` is the live array the shell already holds.
 */
import { buildFromSpecs, ensureRefresh, handcraftedList } from './assemble.js';
import { buildAllUserModels } from '../lab/userModels.js';

export const models = [];
export const domainIndex = [];

const loaded = new Set();
const inflight = new Map();
/** @type {Map<string, object[]>} */
const specCache = new Map();
let indexPromise = null;

function endpoint(path) {
  return new URL(path, document.baseURI).href;
}

export function loadIndex() {
  if (domainIndex.length) return Promise.resolve(domainIndex);
  if (!indexPromise) {
    indexPromise = fetch(endpoint('./data/domain-index.json'), { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((rows) => {
        domainIndex.push(...rows);
        return domainIndex;
      });
  }
  return indexPromise;
}

function appendUsers() {
  const seen = new Set(models.map((m) => m.id));
  for (const um of buildAllUserModels()) {
    if (seen.has(um.id)) continue;
    models.push(ensureRefresh(um));
  }
}

function appendOrphans() {
  const known = new Set(domainIndex.map((row) => row.id));
  const seen = new Set(models.map((m) => m.id));
  for (const impl of handcraftedList()) {
    if (known.has(impl.id) || seen.has(impl.id)) continue;
    models.push(ensureRefresh({
      ...impl,
      tags: impl.tags || [],
      formula: impl.formula || '',
      description: impl.description || '',
      sub: '',
    }));
  }
}

function mergeSpecs(domain, specs) {
  specCache.set(domain, specs);
  const seen = new Set(models.map((m) => m.id));
  for (const model of buildFromSpecs(specs, { leftovers: false, users: false })) {
    if (seen.has(model.id)) continue;
    seen.add(model.id);
    models.push(model);
  }
  appendOrphans();
  appendUsers();
}

export function loadDomain(domain) {
  if (!domain) return Promise.resolve(models);
  if (loaded.has(domain)) return Promise.resolve(models);
  if (inflight.has(domain)) return inflight.get(domain);
  const path = `./data/domains/${encodeURIComponent(domain)}.json`;
  const task = fetch(endpoint(path), { cache: 'no-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`${domain} ${res.status}`);
      return res.json();
    })
    .then((specs) => {
      loaded.add(domain);
      mergeSpecs(domain, specs);
      inflight.delete(domain);
      return models;
    })
    .catch((err) => {
      inflight.delete(domain);
      throw err;
    });
  inflight.set(domain, task);
  return task;
}

export async function ensureId(id) {
  const index = await loadIndex();
  const row = index.find((entry) => entry.id === id);
  if (!row) return false;
  await loadDomain(row.domain || '其他');
  return models.some((m) => m.id === id);
}

export async function loadAllDomains() {
  const index = await loadIndex();
  const names = [...new Set(index.map((row) => row.domain || '其他'))];
  await Promise.all(names.map((name) => loadDomain(name)));
  return models;
}

export function getModelById(id) {
  return models.find((m) => m.id === id) || null;
}

export function getAllTags() {
  const set = new Set();
  for (const row of domainIndex) {
    if (row.domain) set.add(row.domain);
    if (row.sub) set.add(row.sub);
  }
  for (const m of models) {
    for (const t of m.tags || []) set.add(t);
    if (m.sub) set.add(m.sub);
  }
  return [...set].sort();
}

export function rebuildModels() {
  const seen = new Set();
  const next = [];
  for (const specs of specCache.values()) {
    for (const model of buildFromSpecs(specs, { leftovers: false, users: false })) {
      if (seen.has(model.id)) continue;
      seen.add(model.id);
      next.push(model);
    }
  }
  models.length = 0;
  models.push(...next);
  appendOrphans();
  appendUsers();
  return models;
}
