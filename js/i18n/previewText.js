import { STRINGS } from './strings.js';
import { ensureGlyphRows, translateCatalogText } from './catalogText.js';

function lookup(locale, key, vars) {
  const table = STRINGS[locale] || STRINGS.en;
  let s = table[key] ?? STRINGS.en[key] ?? STRINGS.zh[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

export function truncateText(locale, text, limit = 80) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (raw.length <= limit) return raw;
  return lookup(locale, 'ui.truncated', { text: raw.slice(0, limit) });
}

export function fidelityLabel(locale, fidelity) {
  const key = fidelity === 'engineering' ? 'ui.fidelityEngineering' : 'ui.fidelityPrinciple';
  return lookup(locale, key);
}

/** Ensure the lexicon is present before translating non-Chinese catalog text. */
export async function ensureCatalogGloss(locale) {
  if (!locale || locale === 'zh') return;
  await ensureGlyphRows();
}

function assumptionText(locale, assumption) {
  const text = String(assumption || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return locale === 'zh' ? text : translateCatalogText(locale, text);
}

/** Full assumption for the scrolling stage strip. */
export function assumptionBody(locale, assumption) {
  const body = assumptionText(locale, assumption);
  if (!body) return '';
  return `${lookup(locale, 'ui.assumptionPrefix')} ${body}`;
}

/** Short sidebar line. The stage strip keeps the uncut sentence. */
export function assumptionPreview(locale, assumption) {
  const body = truncateText(locale, assumptionText(locale, assumption));
  if (!body) return '';
  return `${lookup(locale, 'ui.assumptionPrefix')} ${body}`;
}

export function formulaLine(locale, formula) {
  const text = String(formula || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const body = locale === 'zh' ? text : translateCatalogText(locale, text);
  return `${lookup(locale, 'ui.formulaPrefix')} ${body}`;
}
