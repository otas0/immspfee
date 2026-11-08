/** Shared helpers for fam-* textbook builders. */
/**
 * Textbook / deterministic builders for generated fam-* variants.
 * Each variantOf maps to a closed form or a standard algorithm.
 * Catalog dims are the knobs; constants that the catalog does not expose
 * are named below and stated in `assumptions`.
 *
 * Decorative amp*sin(t) is not used here.
 */
import { formatNum } from '../../utils/draw.js';
import { P } from '../../utils/params.js';
import { C } from '../../utils/theme.js';
import { perfClassFor } from '../../utils/mobilePerf.js';

export const G = 9.81;
export const EPS0 = 8.854187817e-12;
export const KE = 1 / (4 * Math.PI * EPS0);
export const MU0 = Math.PI * 4e-7;
export const SIGMA = 5.670374419e-8;
export const R_GAS = 8.314462618;
export const C_LIGHT = 299792458;
export const LAMBDA_C_PM = 2.42631023867;
export const HC_KEV_PM = 1239.84193;
export const QE = 1.602176634e-19;
export const ME = 9.1093837e-31;
export const KB = 1.380649e-23;

export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export function pos(x, floor = 1e-9) {
  const v = Number(x);
  if (!Number.isFinite(v) || v < floor) return floor;
  return v;
}

export function finiteOr(v, fallback = 0) {
  return Number.isFinite(v) ? v : fallback;
}

export function schemaNum(label, group, unit, min, max) {
  return { label, group, unit, min, max };
}

export function knobs(spec, initialKeys) {
  const dimList = Array.isArray(spec.dims) ? spec.dims : [];
  const defaults = spec.defaults && typeof spec.defaults === 'object' ? spec.defaults : {};
  const params = { ...defaults };
  const paramSchema = {};
  for (const d of dimList) {
    if (!d?.key) continue;
    if (params[d.key] === undefined) params[d.key] = d.value ?? d.min ?? 1;
    paramSchema[d.key] = schemaNum(
      d.label || d.key,
      'dynamics',
      d.unit || '—',
      Number.isFinite(d.min) ? d.min : 0,
      Number.isFinite(d.max) ? d.max : 100,
    );
  }
  const initSet = new Set(initialKeys || []);
  for (const k of initSet) {
    if (paramSchema[k]) paramSchema[k] = { ...paramSchema[k], group: 'initial' };
  }
  return { params, paramSchema };
}

export function baseMeta(spec) {
  return {
    id: spec.id,
    name: spec.name,
    tags: [spec.domain, spec.sub].filter(Boolean),
    formula: spec.formula || '',
    description: spec.description || '',
    sub: spec.sub || '',
    perfClass: perfClassFor(spec.id),
    governing: true,
  };
}

export function paintFrame(ctx, view) {
  const W = view?.width || 320;
  const H = view?.height || 200;
  const m = 36;
  const top = 46;
  return {
    W,
    H,
    l: m,
    r: W - m,
    t: top,
    b: H - m,
    w: Math.max(1, W - 2 * m),
    h: Math.max(1, H - m - top),
  };
}

export function paintTitle(ctx, name) {
  ctx.fillStyle = C.muted || '#666';
  ctx.font = '600 13px IBM Plex Mono, monospace';
  ctx.fillText(String(name || ''), 14, 26);
}

export function paintXy(ctx, state, view, name) {
  const box = paintFrame(ctx, view);
  paintTitle(ctx, name);
  ctx.strokeStyle = C.axis || '#888';
  ctx.strokeRect(box.l, box.t, box.w, box.h);
  const pts = Array.isArray(state.xy) ? state.xy : [];
  if (pts.length < 2) {
    ctx.fillStyle = C.accent || '#c45';
    ctx.font = '13px IBM Plex Mono, monospace';
    ctx.fillText(formatNum(state.val, 3), box.l + 8, box.t + 18);
    return;
  }
  let xLo = Infinity;
  let xHi = -Infinity;
  let yLo = Infinity;
  let yHi = -Infinity;
  for (const p of pts) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (p.x < xLo) xLo = p.x;
    if (p.x > xHi) xHi = p.x;
    if (p.y < yLo) yLo = p.y;
    if (p.y > yHi) yHi = p.y;
  }
  if (!Number.isFinite(xLo) || !Number.isFinite(yLo)) return;
  // Keep ground / axes in view for projectile-like paths.
  if (yLo > 0) yLo = 0;
  if (xLo > 0) xLo = 0;
  const xSpan = Math.max(1e-9, xHi - xLo);
  const ySpan = Math.max(1e-9, yHi - yLo);
  const sx = (x) => box.l + ((x - xLo) / xSpan) * box.w;
  const sy = (y) => box.t + (1 - (y - yLo) / ySpan) * box.h;
  // Axes
  ctx.strokeStyle = C.muted || '#aaa';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(box.l, sy(0));
  ctx.lineTo(box.r, sy(0));
  ctx.moveTo(sx(0), box.t);
  ctx.lineTo(sx(0), box.b);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.strokeStyle = C.body || '#222';
  ctx.lineWidth = 1.6;
  let started = false;
  for (const p of pts) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const X = sx(p.x);
    const Y = sy(p.y);
    if (!started) {
      ctx.moveTo(X, Y);
      started = true;
    } else ctx.lineTo(X, Y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  const last = pts[pts.length - 1];
  if (last && Number.isFinite(last.x) && Number.isFinite(last.y)) {
    ctx.fillStyle = C.accent || '#c45';
    ctx.beginPath();
    ctx.arc(sx(last.x), sy(last.y), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = C.accent || '#c45';
  ctx.font = '13px IBM Plex Mono, monospace';
  ctx.fillText(formatNum(state.val, 3), box.l + 8, box.t + 18);
}

export function paintLens(ctx, state, view, name) {
  const box = paintFrame(ctx, view);
  paintTitle(ctx, name);
  ctx.strokeStyle = C.axis || '#888';
  ctx.strokeRect(box.l, box.t, box.w, box.h);
  const u = Number(state.u);
  const v = Number(state.v);
  const f = Number(state.f);
  const h = Number(state.h) || 1;
  const hi = Number(state.hi);
  const absU = Math.abs(u) || 1;
  const absV = Math.abs(v) || absU;
  const span = Math.max(absU, absV, Math.abs(f) || 0) * 1.25;
  const ox = box.l + box.w * 0.45;
  const oy = box.t + box.h * 0.5;
  const sx = (x) => ox + (x / span) * (box.w * 0.42);
  const sy = (y) => oy - (y / span) * (box.h * 0.38);
  // Optical axis + thin lens
  ctx.strokeStyle = C.muted || '#aaa';
  ctx.beginPath();
  ctx.moveTo(box.l + 8, oy);
  ctx.lineTo(box.r - 8, oy);
  ctx.stroke();
  ctx.strokeStyle = C.body || '#222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ox, box.t + 10);
  ctx.lineTo(ox, box.b - 10);
  ctx.stroke();
  ctx.lineWidth = 1;
  // Object / image
  const ou = -Math.abs(u);
  const iv = Number.isFinite(v) ? v : 0;
  ctx.strokeStyle = C.accent || '#c45';
  ctx.beginPath();
  ctx.moveTo(sx(ou), oy);
  ctx.lineTo(sx(ou), sy(h));
  ctx.stroke();
  if (Number.isFinite(hi)) {
    ctx.strokeStyle = C.theory || '#2a6';
    ctx.beginPath();
    ctx.moveTo(sx(iv), oy);
    ctx.lineTo(sx(iv), sy(hi));
    ctx.stroke();
  }
  // Paraxial rays: through center; parallel → focal
  ctx.strokeStyle = C.body || '#222';
  ctx.beginPath();
  ctx.moveTo(sx(ou), sy(h));
  ctx.lineTo(sx(iv), sy(hi));
  ctx.moveTo(sx(ou), sy(h));
  ctx.lineTo(ox, sy(h));
  if (Number.isFinite(f) && Math.abs(f) > 1e-9) {
    ctx.lineTo(sx(iv), sy(hi));
  }
  ctx.stroke();
  ctx.fillStyle = C.accent || '#c45';
  ctx.font = '13px IBM Plex Mono, monospace';
  ctx.fillText(`v=${formatNum(v, 3)}`, box.l + 8, box.t + 18);
}

export function paint(ctx, state, view, name) {
  if (state.drawKind === 'xy') {
    paintXy(ctx, state, view, name);
    return;
  }
  if (state.drawKind === 'lens') {
    paintLens(ctx, state, view, name);
    return;
  }
  const box = paintFrame(ctx, view);
  paintTitle(ctx, name);
  ctx.strokeStyle = C.axis || '#888';
  ctx.strokeRect(box.l, box.t, box.w, box.h);
  const series = Array.isArray(state.curve) && state.curve.length > 1 ? state.curve : state.hist;
  if (!Array.isArray(series) || series.length < 2) {
    ctx.fillStyle = C.accent || '#c45';
    ctx.font = '13px IBM Plex Mono, monospace';
    ctx.fillText(formatNum(state.val, 3), box.l + 8, box.t + 18);
    return;
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of series) {
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return;
  const span = Math.max(1e-9, hi - lo);
  ctx.beginPath();
  ctx.strokeStyle = C.body || '#222';
  ctx.lineWidth = 1.5;
  let started = false;
  for (let i = 0; i < series.length; i += 1) {
    const v = series[i];
    if (!Number.isFinite(v)) continue;
    const x = box.l + (i / Math.max(1, series.length - 1)) * box.w;
    const y = box.t + (1 - (v - lo) / span) * box.h;
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = C.accent || '#c45';
  ctx.font = '13px IBM Plex Mono, monospace';
  ctx.fillText(formatNum(state.val, 3), box.l + 8, box.t + 18);
}

export function algebraic(spec, def) {
  const { params, paramSchema } = knobs(spec, def.initial);
  const readRows = def.rows || [['val', 'val']];
  return {
    ...baseMeta(spec),
    equation: def.equation,
    authority: def.authority || '',
    assumptions: def.assumptions || '',
    params,
    paramSchema,
    init(state) {
      state.t = 0;
      state.hist = [];
      state.curve = null;
      state.xy = null;
      state.drawKind = def.drawKind || null;
      if (def.reset) def.reset(state);
      this.step(state, 0);
    },
    /** Live dynamics knobs must recompute closed forms (main skips step unless refresh exists). */
    refresh(state) {
      this.step(state, 0);
    },
    step(state, dt) {
      const frame = Number(dt);
      const advance = Number.isFinite(frame) && frame > 0 ? frame : 0;
      const p = state.params || {};
      // Closed forms are evaluated at the end of the step. Integrators advance
      // their own state over `advance` and keep the pre-step time as the phase.
      let out;
      if (def.integrate) {
        out = def.eval(p, state.t || 0, state, advance) || {};
        if (advance > 0) state.t = (state.t || 0) + advance;
      } else {
        if (advance > 0) state.t = (state.t || 0) + advance;
        out = def.eval(p, state.t || 0, state, 0) || {};
      }
      for (const [k, v] of Object.entries(out)) {
        if (k === 'params' || k === 'hist' || k === 't') continue;
        if (typeof v === 'number' && Number.isNaN(v)) state[k] = 0;
        else state[k] = v;
      }
      state.val = finiteOr(out.val, 0);
      if (out.drawKind) state.drawKind = out.drawKind;
      else if (def.drawKind) state.drawKind = def.drawKind;
      if (advance > 0) {
        if (!state.hist) state.hist = [];
        state.hist.push(state.val);
        if (state.hist.length > 160) state.hist.shift();
        if (state.drawKind === 'xy' && Number.isFinite(state.x) && Number.isFinite(state.y)) {
          if (!Array.isArray(state.trail)) state.trail = [];
          state.trail.push({ x: state.x, y: state.y });
          if (state.trail.length > 240) state.trail.shift();
        }
      }
      if (state.drawKind === 'xy') {
        if (Array.isArray(out.xy) && out.xy.length > 1) state.xy = out.xy;
        else if (Array.isArray(state.trail) && state.trail.length > 1) state.xy = state.trail;
      }
    },
    draw(ctx, state, view) {
      paint(ctx, state, view, spec.name);
    },
    getTrajectory(state) {
      if (Array.isArray(state?.xy) && state.xy.length) return state.xy;
      return state?.trail || [];
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return readRows.map(([label, key, unit]) => ({
        label,
        value: unit ? `${formatNum(state[key], d)} ${unit}` : formatNum(state[key], d),
      }));
    },
  };
}

export function linspace(n, fn) {
  const out = new Array(n);
  for (let i = 0; i < n; i += 1) out[i] = fn(i / Math.max(1, n - 1));
  return out;
}

/** Primes up to 65536 for the classroom RSA modulus. */
export const PRIMES = (() => {
  const n = 65536;
  const c = new Uint8Array(n + 1);
  const p = [];
  for (let i = 2; i <= n; i += 1) {
    if (c[i]) continue;
    p.push(i);
    if (i <= 256) {
      for (let j = i * i; j <= n; j += i) c[j] = 1;
    } else {
      for (let j = i * i; j <= n; j += i) c[j] = 1;
    }
  }
  return p;
})();

export function primeAtMost(x) {
  let lo = 0;
  let hi = PRIMES.length - 1;
  let ans = 2;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (PRIMES[mid] <= x) {
      ans = PRIMES[mid];
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

export function modPow(base, exp, mod) {
  let b = BigInt(base) % BigInt(mod);
  let e = BigInt(exp);
  const m = BigInt(mod);
  let r = 1n;
  while (e > 0n) {
    if (e & 1n) r = (r * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return Number(r);
}

export function fnv1a(len, byte) {
  let h = 0x811c9dc5;
  const n = Math.max(0, Math.min(10000, Math.round(len)));
  const b = byte & 255;
  for (let i = 0; i < n; i += 1) {
    h ^= b;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export { P, formatNum };
