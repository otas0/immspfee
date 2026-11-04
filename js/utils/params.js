/**
 * 自由参数工具：任意数值解析、安全读取、自定义常量进入方程。
 */

export function parseUserNumber(raw) {
  const s = String(raw ?? '').trim().replace(/,/g, '');
  if (s === '') return { ok: false, error: 'empty' };
  const v = Number(s);
  if (!Number.isFinite(v)) return { ok: false, error: 'invalid' };
  return { ok: true, value: v };
}

export function P(params, key, fallback = 0) {
  const v = Number(params?.[key]);
  return Number.isFinite(v) ? v : fallback;
}

export function Pb(params, key, fallback = false) {
  const v = params?.[key];
  if (typeof v === 'boolean') return v;
  if (v === 0 || v === '0' || v === 'false') return false;
  if (v === 1 || v === '1' || v === 'true') return true;
  return fallback;
}

export function accelExtras(params, locals = {}) {
  let sum = 0;
  for (const [k, val] of Object.entries(params || {})) {
    if (k === 'a_extra' || /^a_[a-zA-Z0-9_]+$/.test(k)) {
      const n = Number(val);
      if (Number.isFinite(n)) sum += n;
    }
  }
  if (params?.expr_a) {
    const ev = evalExpr(String(params.expr_a), { ...params, ...locals });
    if (Number.isFinite(ev)) sum += ev;
  }
  return sum;
}

export function springK(params) {
  return P(params, 'k', 0) + P(params, 'k_extra', 0);
}

export function evalExpr(expr, scope) {
  const src = String(expr || '').trim();
  if (!src) return 0;
  if (!/^[0-9a-zA-Z_+\-*/%().\s]+$/.test(src)) return NaN;
  const keys = Object.keys(scope).filter((k) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k));
  const values = keys.map((k) => {
    const n = Number(scope[k]);
    return Number.isFinite(n) ? n : 0;
  });
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `"use strict"; return (${src});`);
    const r = fn(...values);
    return Number.isFinite(r) ? r : NaN;
  } catch {
    return NaN;
  }
}

export function finiteOr(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function inferUnit(key) {
  const map = {
    g: 'm/s²', m: 'kg', m1: 'kg', m2: 'kg',
    k: 'N/m', k_extra: 'N/m', c: 'N·s/m', damp: '1/s',
    h: 'm', L: 'm', L1: 'm', L2: 'm', x0: 'm',
    v0: 'm/s', v1: 'm/s', v2: 'm/s',
    theta: '°', theta0: '°', theta1: '°', theta2: '°',
    e: '—', N: '—', alpha: 'm²/s',
    Tleft: '°C', Tright: '°C', T0: '°C', hotspot: '°C',
    A1: 'm', A2: 'm', A3: 'm',
    a_extra: 'm/s²', expr_a: 'expr',
  };
  if (map[key]) return map[key];
  if (key.startsWith('a_')) return 'm/s²';
  if (key.startsWith('T')) return '°C';
  return '';
}

export function inferGroup(key, value) {
  if (typeof value === 'boolean' || key.startsWith('show')) return 'display';
  if (key === 'expr_a' || key.endsWith('_extra') || key.startsWith('a_')) return 'custom';
  if (/^(v|x0|h|theta|T0|hotspot|A)/i.test(key)) return 'initial';
  if (/^(N|alpha|dt)/i.test(key)) return 'numerics';
  return 'dynamics';
}

/** TE 风短标签 */
export const GROUP_LABELS = {
  dynamics: 'dyn',
  initial: 'init',
  display: 'view',
  numerics: 'num',
  custom: 'custom',
  global: 'sys',
};
