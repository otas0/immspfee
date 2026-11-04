/**
 * 自由参数工具：任意数值解析、安全读取、自定义常量进入方程。
 */

export function parseUserNumber(raw) {
  const s = String(raw ?? '').trim().replace(/,/g, '');
  if (s === '') return { ok: false, error: 'empty' };
  // 友好分数：1/240、1/60
  const frac = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (frac) {
    const a = Number(frac[1]);
    const b = Number(frac[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
      return { ok: false, error: 'invalid fraction' };
    }
    const v = a / b;
    if (!Number.isFinite(v)) return { ok: false, error: 'invalid' };
    return { ok: true, value: v };
  }
  const v = Number(s);
  if (!Number.isFinite(v)) return { ok: false, error: 'invalid' };
  return { ok: true, value: v };
}

/** fixedDt 等显示成 1/240 */
export function formatDtFriendly(v, fallbackDigits = 6) {
  if (!Number.isFinite(v) || v === 0) return formatParamNumber(v);
  const inv = 1 / v;
  if (Number.isFinite(inv) && Math.abs(inv - Math.round(inv)) < 1e-9 && Math.abs(inv) >= 2 && Math.abs(inv) <= 10000) {
    const n = Math.round(inv);
    return v < 0 ? `-1/${Math.abs(n)}` : `1/${n}`;
  }
  return formatParamNumber(v);
}

/** 自定义常量 key / 值校验 */
export function validateCustomParam(key, rawValue) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
    return { ok: false, error: 'bad key' };
  }
  if (key.startsWith('__') || key === 'constructor' || key === 'prototype') {
    return { ok: false, error: 'reserved key' };
  }
  if (key === 'expr_a') {
    const s = String(rawValue ?? '').trim();
    if (!s) return { ok: false, error: 'empty expr' };
    if (!/^[0-9a-zA-Z_+\-*/%().\s]+$/.test(s)) return { ok: false, error: 'unsafe expr' };
    return { ok: true, value: s };
  }
  const parsed = parseUserNumber(rawValue);
  if (!parsed.ok) return parsed;
  if (!Number.isFinite(parsed.value)) return { ok: false, error: 'non-finite' };
  if (Math.abs(parsed.value) > 1e12) return { ok: false, error: 'out of range' };
  return { ok: true, value: parsed.value };
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

export function clampNumber(v, min, max) {
  let n = Number(v);
  if (!Number.isFinite(n)) n = Number.isFinite(min) ? min : 0;
  if (Number.isFinite(min)) n = Math.max(min, n);
  if (Number.isFinite(max)) n = Math.min(max, n);
  return n;
}

/** 参数框显示：短、可读，避免 0.004166666666666667 / 1e212 */
export function formatParamNumber(v) {
  if (!Number.isFinite(v)) return '—';
  if (Object.is(v, -0)) return '0';
  const a = Math.abs(v);
  if (a === 0) return '0';
  if (a >= 1e6 || (a > 0 && a < 1e-4)) {
    return v.toExponential(3).replace(/\.?0+e/, 'e').replace(/e\+/, 'e');
  }
  if (Number.isInteger(v) || Math.abs(v - Math.round(v)) < 1e-9) {
    return String(Math.round(v));
  }
  let s;
  if (a >= 100) s = v.toFixed(1);
  else if (a >= 10) s = v.toFixed(2);
  else if (a >= 1) s = v.toFixed(3);
  else if (a >= 0.01) s = v.toFixed(4);
  else s = v.toFixed(6);
  return String(Number(s));
}

/**
 * 推断参数可调范围（固定，不随拖动扩张）。
 * schema.min / schema.max 优先。
 */
export function inferBounds(key, def, schema = {}) {
  if (Number.isFinite(schema.min) && Number.isFinite(schema.max) && schema.max > schema.min) {
    return { min: schema.min, max: schema.max };
  }
  const d = Number.isFinite(def) ? def : 1;
  const known = {
    e: { min: 0, max: 1 },
    g: { min: 0, max: 40 },
    m: { min: 0.01, max: 100 },
    m1: { min: 0.01, max: 100 },
    m2: { min: 0.01, max: 100 },
    k: { min: 0, max: 200 },
    c: { min: 0, max: 50 },
    damp: { min: 0, max: 20 },
    h: { min: 0, max: 100 },
    L: { min: 0.05, max: 10 },
    L1: { min: 0.05, max: 10 },
    L2: { min: 0.05, max: 10 },
    x0: { min: -5, max: 5 },
    v0: { min: -50, max: 50 },
    v1: { min: -50, max: 50 },
    v2: { min: -50, max: 50 },
    theta: { min: -180, max: 180 },
    theta0: { min: -180, max: 180 },
    theta1: { min: -180, max: 180 },
    theta2: { min: -180, max: 180 },
    alpha: { min: 0, max: 2 },
    N: { min: 8, max: 256 },
    A1: { min: 0, max: 2 },
    A2: { min: 0, max: 2 },
    A3: { min: 0, max: 2 },
    Tleft: { min: -50, max: 200 },
    Tright: { min: -50, max: 200 },
    T0: { min: -50, max: 200 },
    hotspot: { min: -50, max: 200 },
  };
  if (known[key]) return known[key];
  if (key.startsWith('a_')) return { min: -50, max: 50 };
  if (key.startsWith('k_')) return { min: 0, max: 200 };

  const mag = Math.abs(d) || 1;
  if (d >= 0) return { min: 0, max: Math.max(mag * 5, mag + 1) };
  return { min: -Math.max(mag * 5, mag + 1), max: Math.max(mag * 5, mag + 1) };
}

function finiteOrDefault(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** ±Infinity 映射到边界，其余非有限 → fallback 再 clamp */
function clampGlobal(v, min, max, fallback) {
  if (v === Infinity) return max;
  if (v === -Infinity) return min;
  return clampNumber(finiteOrDefault(v, fallback), min, max);
}

export function sanitizeGlobals(g) {
  if (!g || typeof g !== 'object') return g;
  g.timeScale = clampGlobal(g.timeScale, 0.05, 8, 1);
  g.fixedDt = clampGlobal(g.fixedDt > 0 ? g.fixedDt : 1 / 240, 1 / 2000, 1 / 30, 1 / 240);
  g.maxSubSteps = Math.round(clampGlobal(g.maxSubSteps, 1, 256, 48));
  g.viewScale = clampGlobal(g.viewScale, 0.25, 4, 1);
  g.readoutDigits = Math.round(clampGlobal(g.readoutDigits, 0, 8, 3));
  return g;
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
