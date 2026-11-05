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
    rows: (s) => [[rec.label, s.y, rec.unit || '']],
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
