/**
 * Textbook builders for generated fam-* variants (split by domain).
 */
import { BUILDERS_MECHANICS } from './builders-mechanics.js';
import { BUILDERS_WAVES } from './builders-waves.js';
import { BUILDERS_THERMO } from './builders-thermo.js';
import { BUILDERS_EM } from './builders-em.js';
import { BUILDERS_QUANTUM } from './builders-quantum.js';
import { BUILDERS_STRUCTURES } from './builders-structures.js';
import { BUILDERS_FLUIDS } from './builders-fluids.js';
import { BUILDERS_CS } from './builders-cs.js';
import { BUILDERS_ML } from './builders-ml.js';
import { BUILDERS_ENG } from './builders-eng.js';

const BUILDERS = {
  ...BUILDERS_MECHANICS,
  ...BUILDERS_WAVES,
  ...BUILDERS_THERMO,
  ...BUILDERS_EM,
  ...BUILDERS_QUANTUM,
  ...BUILDERS_STRUCTURES,
  ...BUILDERS_FLUIDS,
  ...BUILDERS_CS,
  ...BUILDERS_ML,
  ...BUILDERS_ENG,
};

const sineWarned = new Set();

export function warnDecorativeSine(spec) {
  let debug = false;
  if (typeof globalThis !== 'undefined' && globalThis.DEBUG) debug = true;
  if (typeof process !== 'undefined' && process.env && process.env.DEBUG) debug = true;
  if (!debug) return;
  const key = String(spec?.variantOf || spec?.id || '');
  if (sineWarned.has(key)) return;
  sineWarned.add(key);
  console.debug(`[fam] decorative sine fallback for ${key}`);
}

export function buildFamPhysics(spec) {
  const of = String(spec?.variantOf || '');
  const build = BUILDERS[of];
  if (!build) return null;
  return build(spec);
}

export function famPhysicsCovered(variantOf) {
  return Object.prototype.hasOwnProperty.call(BUILDERS, String(variantOf || ''));
}

export const FAM_PHYSICS_KEYS = Object.keys(BUILDERS);
