/**
 * Browser loads the catalog factory only after a subject (or a saved custom
 * model) is opened. Node tests install the builder synchronously.
 */
let builder = null;
let pending = null;

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
      return builder;
    });
  }
  return pending;
}
