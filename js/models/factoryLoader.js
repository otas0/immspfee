/**
 * Browser loads the catalog factory only after a subject (or a saved custom
 * model) is opened. Node tests install the builder synchronously.
 */
let builder = null;
let pending = null;

function stampedChunk(rel) {
  const url = new URL(rel, import.meta.url);
  const version = globalThis.__LAB_ASSET_V || '';
  if (version && !url.searchParams.has('v')) url.searchParams.set('v', version);
  return url.href;
}
globalThis.__stampedChunk = stampedChunk;

export function setFactoryBuilder(fn) {
  builder = fn;
}

export function factoryBuilder() {
  if (!builder) throw new Error('factory builder is not loaded');
  return builder;
}

export function ensureFactory() {
  if (builder) return Promise.resolve(builder);
  if (!pending) {
    pending = import('./factory.js').then((mod) => {
      builder = mod.createFactoryModel;
      const href = globalThis.__FACTORY_CHUNK;
      const sw = globalThis.navigator?.serviceWorker?.controller;
      if (href) {
        try { sessionStorage.setItem('immspfee-factory-chunk', href); } catch { /* storage blocked */ }
        if (sw) sw.postMessage({ type: 'prime', urls: [href] });
      }
      return builder;
    });
  }
  return pending;
}
