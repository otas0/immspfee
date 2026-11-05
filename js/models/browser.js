/**
 * Browser catalog loaded one subject at a time.
 * `models` is the live array the shell already holds.
 */
import { buildFromSpecs, ensureRefresh, handcraftedList } from './assemble.js';
import { buildAllUserModels } from '../lab/userModels.js';
import { domainChunkUrl, domainIndexUrl, loadAssetStamp } from '../boot/catalogStamp.js';

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

function mark(name) {
  try { performance.mark(name); } catch { /* ignore */ }
}

export function loadIndex() {
  if (domainIndex.length) return Promise.resolve(domainIndex);
  if (!indexPromise) {
    mark('boot-loadIndex-start');
    indexPromise = Promise.resolve(window.__preloadedIndex || null)
      .then(async (preloaded) => {
        if (Array.isArray(preloaded) && preloaded.length) return preloaded;
        const stamp = await loadAssetStamp();
        const res = await fetch(endpoint(domainIndexUrl(stamp)));
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((rows) => {
        domainIndex.push(...rows);
        mark('boot-loadIndex-end');
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
  const task = Promise.resolve()
    .then(async () => {
      const warm = window.__preloadedDomain;
      if (warm && warm.domain === domain && warm.promise) {
        const specs = await warm.promise;
        if (Array.isArray(specs)) return specs;
      }
      const stamp = await loadAssetStamp();
      const res = await fetch(endpoint(domainChunkUrl(domain, stamp)));
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
  mark('boot-ensureId-start');
  const index = await loadIndex();
  const row = index.find((entry) => entry.id === id);
  if (!row) {
    mark('boot-ensureId-end');
    return false;
  }
  mark('boot-loadDomain-start');
  await loadDomain(row.domain || '其他');
  mark('boot-loadDomain-end');
  mark('boot-ensureId-end');
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
