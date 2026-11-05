import { evalExpr, parseParamLine } from './expr.js';
import { ROWS } from './topicRows.js';

const table = new Map();
for (const row of ROWS) {
  const [key, equation, authority, assumptions, params, expr, label, unit, fidelity] = row;
  if (table.has(key)) throw new Error(`duplicate override ${key}`);
  table.set(key, { equation, authority, assumptions, params, expr, label, unit, fidelity: fidelity || 'principle' });
}

function toOptions(rec) {
  const parsed = parseParamLine(rec.params);
  return {
    equation: rec.equation,
    authority: rec.authority,
    assumptions: rec.assumptions,
    fidelity: rec.fidelity,
    params: parsed.params,
    schema: parsed.schema,
    tick(state) {
      state.y = evalExpr(rec.expr, { ...state.params, t: state.t || 0 });
    },
    plot: (s) => s.y,
    rows: (s) => {
      // Primary quantity + dynamics knobs so readouts always track editable params (no-fake-data).
      const out = [[rec.label, s.y, rec.unit || '']];
      for (const [k, meta] of Object.entries(parsed.schema || {})) {
        if (k === 'speed' || meta?.group === 'display') continue;
        if (typeof s.params?.[k] === 'number') {
          out.push([k, s.params[k], meta.unit || '']);
        }
      }
      return out;
    },
  };
}

export function overrideOptions(spec) {
  if (!spec) return null;
  const formula = String(spec.formula || '');
  if (formula.includes('·')) {
    const prefix = formula.split('·')[0].trim();
    const topic = formula.split('·').slice(1).join('·').trim();
    const key = `${prefix}·${topic}`;
    const hit = table.get(key);
    if (hit) return toOptions(hit);
  }
  const byId = table.get(`id:${spec.id}`);
  return byId ? toOptions(byId) : null;
}

export function overrideKeyCount() {
  return table.size;
}

/** Catalog-style "学科 · 主题" key. Empty when the formula is not a topic label. */
export function topicKeyFromFormula(formula) {
  const text = String(formula || '');
  if (!text.includes('·')) return '';
  const prefix = text.split('·')[0].trim();
  const topic = text.split('·').slice(1).join('·').trim();
  if (!prefix || !topic) return '';
  return `${prefix}·${topic}`;
}

export function overrideRecord(key) {
  return table.get(key) || null;
}

/** When a custom formula is a topic label that is not in the table, name that key. */
export function topicMissNote(formula) {
  const key = topicKeyFromFormula(formula);
  if (!key || table.has(key)) return '';
  return `未命中主题键「${key}」`;
}
