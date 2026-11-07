/**
 * Browser catalog loaded one subject at a time.
 * `models` is the live array the shell already holds.
 */
import { buildFromSpecs, ensureHandModels, ensureRefresh, handcraftedList } from './assemble.js';
import { ensureFactory } from './factoryLoader.js';
import { buildAllUserModels, loadUserSpecs } from '../lab/userModels.js';
import { domainChunkUrl, domainIndexUrl, loadAssetStamp } from '../boot/catalogStamp.js';
import { expandDomainIndex } from '../boot/domainPack.js';

export const models = [];
export const domainIndex = [];

const loaded = new Set();
const inflight = new Map();
/** @type {Map<string, object[]>} */
const specCache = new Map();
let indexPromise = null;
/** @type {string[]|null} */
let domainNames = null;
/** @type {Promise<string[]>|null} */
let namesPromise = null;

function endpoint(path) {
  return new URL(path, document.baseURI).href;
}

function mark(name) {
  try { performance.mark(name); } catch { /* ignore */ }
}

function abortError() {
  const err = new Error('Aborted');
  err.name = 'AbortError';
  return err;
}

/**
 * Cold catalog index. Shared `indexPromise` is not aborted (other callers need it);
 * optional signal only rejects waiters that were superseded after the fetch settles.
 */
export function loadIndex(signal) {
  if (domainIndex.length) return Promise.resolve(domainIndex);
  if (signal?.aborted) return Promise.reject(abortError());
  if (!indexPromise) {
    mark('boot-loadIndex-start');
    indexPromise = Promise.resolve(window.__preloadedIndex || null)
      .then(async (preloaded) => {
        if (Array.isArray(preloaded) && preloaded.length) return preloaded;
        if (preloaded && Array.isArray(preloaded.rows)) return preloaded;
        const stamp = await loadAssetStamp();
        const res = await fetch(endpoint(domainIndexUrl(stamp)));
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((rows) => {
        domainIndex.push(...expandDomainIndex(rows, domainNames));
        mark('boot-loadIndex-end');
        return domainIndex;
      });
  }
  if (!signal) return indexPromise;
  return indexPromise.then((rows) => {
    if (signal.aborted) throw abortError();
    return rows;
  });
}

/** Lazy name pack for search / sidebar labels (not on cold index). */
export function ensureDomainNames(signal) {
  if (domainNames) {
    applyNames(domainNames);
    return Promise.resolve(domainNames);
  }
  if (signal?.aborted) {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    return Promise.reject(err);
  }
  if (!namesPromise) {
    namesPromise = fetch(endpoint('data/domain-names.json'), signal ? { signal } : undefined)
      .then((res) => (res.ok ? res.json() : []))
      .then((names) => {
        domainNames = Array.isArray(names) ? names : [];
        applyNames(domainNames);
        return domainNames;
      })
      .catch((err) => {
        namesPromise = null;
        if (err?.name === 'AbortError') throw err;
        domainNames = domainNames || [];
        return domainNames;
      });
  }
  return namesPromise;
}

function applyNames(names) {
  if (!Array.isArray(names) || !domainIndex.length) return;
  for (let i = 0; i < domainIndex.length; i += 1) {
    const row = domainIndex[i];
    if (!row) continue;
    const n = names[i];
    if (n && (row.name === row.id || !row.name)) row.name = n;
    else if (n) row.name = n;
  }
}


async function appendUsers() {
  if (!loadUserSpecs().length) return;
  await ensureFactory();
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

async function mergeSpecs(domain, specs) {
  await ensureFactory();
  specCache.set(domain, specs);
  const seen = new Set(models.map((m) => m.id));
  for (const model of buildFromSpecs(specs, { leftovers: false, users: false })) {
    if (seen.has(model.id)) continue;
    seen.add(model.id);
    models.push(model);
  }
  appendOrphans();
  await appendUsers();
}

/** Load one subject domain; optional AbortSignal cancels an in-flight fetch (search debounce). */
export function loadDomain(domain, signal) {
  if (!domain) return Promise.resolve(models);
  if (loaded.has(domain)) return Promise.resolve(models);
  if (signal?.aborted) return Promise.reject(abortError());
  if (inflight.has(domain)) {
    return inflight.get(domain).then((rows) => {
      if (signal?.aborted) throw abortError();
      return rows;
    });
  }
  const task = Promise.resolve()
    .then(() => ensureHandModels())
    .then(async () => {
      if (signal?.aborted) throw abortError();
      const warm = window.__preloadedDomain;
      if (warm && warm.domain === domain && warm.promise) {
        const specs = await warm.promise;
        if (Array.isArray(specs)) return specs;
      }
      const stamp = await loadAssetStamp();
      if (signal?.aborted) throw abortError();
      const res = await fetch(endpoint(domainChunkUrl(domain, stamp)), signal ? { signal } : undefined);
      if (!res.ok) throw new Error(`${domain} ${res.status}`);
      return res.json();
    })
    .then(async (specs) => {
      if (signal?.aborted) throw abortError();
      loaded.add(domain);
      await mergeSpecs(domain, specs);
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

/** In-bundle hand model, without fetching its subject file. */
export async function primeHandModel(id) {
  if (id !== 'free-fall') await ensureHandModels();
  const impl = handcraftedList().find((model) => model.id === id);
  if (!impl) return false;
  if (!models.some((model) => model.id === id)) {
    models.push(ensureRefresh({
      ...impl,
      tags: impl.tags || [],
      formula: impl.formula || '',
      description: impl.description || '',
      sub: impl.sub || '',
    }));
  }
  await appendUsers();
  return true;
}

export async function ensureId(id) {
  mark('boot-ensureId-start');
  const hand = handcraftedList().find((model) => model.id === id);
  if (hand) {
    const ok = await primeHandModel(id);
    mark('boot-ensureId-end');
    return ok;
  }
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

export async function rebuildModels() {
  if (specCache.size || loadUserSpecs().length) await ensureFactory();
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
  await appendUsers();
  return models;
}
