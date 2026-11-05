import { STRINGS } from './strings.js';
import { translateCatalogText } from './catalogText.js';

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

export function assumptionPreview(locale, assumption) {
  const text = String(assumption || '').replace(/\s+/g, ' ').trim();
  const body = truncateText(locale, locale === 'zh' ? text : translateCatalogText(locale, text));
  if (!body) return '';
  return `${lookup(locale, 'ui.assumptionPrefix')} ${body}`;
}

export function formulaLine(locale, formula) {
  const text = String(formula || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const body = locale === 'zh' ? text : translateCatalogText(locale, text);
  return `${lookup(locale, 'ui.formulaPrefix')} ${body}`;
}
