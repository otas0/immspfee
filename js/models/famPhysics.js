/**
 * Textbook / deterministic builders for generated fam-* variants.
 * Each variantOf maps to a closed form or a standard algorithm.
 * Catalog dims are the knobs; constants that the catalog does not expose
 * are named below and stated in `assumptions`.
 *
 * Decorative amp*sin(t) is not used here.
 */
import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';
import { perfClassFor } from '../utils/mobilePerf.js';

const G = 9.81;
const EPS0 = 8.854187817e-12;
const KE = 1 / (4 * Math.PI * EPS0);
const MU0 = Math.PI * 4e-7;
const SIGMA = 5.670374419e-8;
const R_GAS = 8.314462618;
const C_LIGHT = 299792458;
const LAMBDA_C_PM = 2.42631023867;
const HC_KEV_PM = 1239.84193;
const QE = 1.602176634e-19;
const ME = 9.1093837e-31;
const KB = 1.380649e-23;

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function pos(x, floor = 1e-9) {
  const v = Number(x);
  if (!Number.isFinite(v) || v < floor) return floor;
  return v;
}

function finiteOr(v, fallback = 0) {
  return Number.isFinite(v) ? v : fallback;
}

function schemaNum(label, group, unit, min, max) {
  return { label, group, unit, min, max };
}

function knobs(spec, initialKeys) {
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

function baseMeta(spec) {
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

function paint(ctx, state, view, name) {
  const W = view?.width || 320;
  const H = view?.height || 200;
  const m = 36;
  const top = 46;
  const l = m;
  const r = W - m;
  const t = top;
  const b = H - m;
  const w = Math.max(1, r - l);
  const h = Math.max(1, b - t);
  ctx.fillStyle = C.muted || '#666';
  ctx.font = '600 13px IBM Plex Mono, monospace';
  ctx.fillText(String(name || ''), 14, 26);
  ctx.strokeStyle = C.axis || '#888';
  ctx.strokeRect(l, t, w, h);
  const series = Array.isArray(state.curve) && state.curve.length > 1 ? state.curve : state.hist;
  if (!Array.isArray(series) || series.length < 2) {
    ctx.fillStyle = C.accent || '#c45';
    ctx.font = '13px IBM Plex Mono, monospace';
    ctx.fillText(formatNum(state.val, 3), l + 8, t + 18);
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
    const x = l + (i / Math.max(1, series.length - 1)) * w;
    const y = t + (1 - (v - lo) / span) * h;
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = C.accent || '#c45';
  ctx.font = '13px IBM Plex Mono, monospace';
  ctx.fillText(formatNum(state.val, 3), l + 8, t + 18);
}

function algebraic(spec, def) {
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
      if (def.reset) def.reset(state);
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
      if (advance > 0) {
        if (!state.hist) state.hist = [];
        state.hist.push(state.val);
        if (state.hist.length > 160) state.hist.shift();
      }
    },
    draw(ctx, state, view) {
      paint(ctx, state, view, spec.name);
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

function linspace(n, fn) {
  const out = new Array(n);
  for (let i = 0; i < n; i += 1) out[i] = fn(i / Math.max(1, n - 1));
  return out;
}

/** Primes up to 65536 for the classroom RSA modulus. */
const PRIMES = (() => {
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

function primeAtMost(x) {
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

function modPow(base, exp, mod) {
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

function fnv1a(len, byte) {
  let h = 0x811c9dc5;
  const n = Math.max(0, Math.min(10000, Math.round(len)));
  const b = byte & 255;
  for (let i = 0; i < n; i += 1) {
    h ^= b;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// --- mechanics -----------------------------------------------------------
// Taylor, Classical Mechanics, Ch. 2: linear drag on a projectile.
// Thornton & Marion / Hibbeler: incline, Atwood, impact.
// Goldstein / Murray & Dermott: central force. French / Taylor: SHO.

function projectileEval(p, t) {
  const g = pos(P(p, 'g', G), 1e-6);
  const v0 = P(p, 'v0', 0);
  const th = P(p, 'theta', 0) * Math.PI / 180;
  const k = Math.max(0, P(p, 'k', 0));
  const c = Math.cos(th);
  const s = Math.sin(th);
  const vx0 = v0 * c;
  const vy0 = v0 * s;
  let x;
  let y;
  let vx;
  let vy;
  if (k < 1e-10) {
    vx = vx0;
    vy = vy0 - g * t;
    x = vx0 * t;
    y = vy0 * t - 0.5 * g * t * t;
  } else {
    const e = Math.exp(-k * t);
    vx = vx0 * e;
    vy = (vy0 + g / k) * e - g / k;
    x = (vx0 / k) * (1 - e);
    y = ((vy0 + g / k) / k) * (1 - e) - (g / k) * t;
  }
  const curve = linspace(48, (u) => {
    const tt = u * Math.max(t, 0.8);
    if (k < 1e-10) return vy0 * tt - 0.5 * g * tt * tt;
    const e = Math.exp(-k * tt);
    return ((vy0 + g / k) / k) * (1 - e) - (g / k) * tt;
  });
  return { val: y, x, y, vx, vy, curve };
}

function inclinedEval(p, t) {
  const th = P(p, 'theta', 15) * Math.PI / 180;
  const mu = Math.max(0, P(p, 'mu', 0));
  const m = pos(P(p, 'm', 1), 1e-9);
  // +s is down the plane. Catalog formula a=g(sinθ−μ cosθ) assumes friction up the plane.
  const a = G * (Math.sin(th) - mu * Math.cos(th));
  const v0 = P(p, 'v0', 0);
  const v = v0 + a * t;
  const s = v0 * t + 0.5 * a * t * t;
  const N = m * G * Math.cos(th);
  return { val: a, a, v, s, N };
}

function atwoodEval(p) {
  // Ideal vertical Atwood. m1/m2 = mRatio, m2 = 1 kg. Axle friction μ has no normal force here.
  const m1 = pos(P(p, 'mRatio', 0.5), 1e-9);
  const m2 = 1;
  const a = (m1 - m2) / (m1 + m2) * G;
  return { val: a, a, m1, m2 };
}

function circularEval(p, t) {
  const r = pos(P(p, 'r', 1), 1e-9);
  const w = P(p, 'omega', 1);
  const ac = w * w * r;
  return {
    val: ac,
    ac,
    x: r * Math.cos(w * t),
    y: r * Math.sin(w * t),
    curve: linspace(64, (u) => r * Math.sin(2 * Math.PI * u)),
  };
}

function collisionEval(p) {
  // Thornton & Marion: 1D restitution. u1=1, u2=0. Angle rotates the line of impact.
  const e = clamp(P(p, 'e', 0), 0, 1);
  const m1 = pos(P(p, 'mRatio', 0.5), 1e-9);
  const m2 = 1;
  const ang = P(p, 'angle', 0) * Math.PI / 180;
  const u1n = Math.cos(ang);
  const u1t = Math.sin(ang);
  const v1n = (m1 - e * m2) / (m1 + m2) * u1n;
  const v2n = (m1 * (1 + e)) / (m1 + m2) * u1n;
  const v1 = Math.hypot(v1n, u1t);
  const v2 = Math.abs(v2n);
  return { val: v2, e, v1, v2, v1n, v2n };
}

function rocketEval(p, t) {
  // Tsiolkovsky, no gravity, m0=1 kg. ṁ>0 is propellant consumption.
  const u = P(p, 'uRel', 50);
  const mdot = Math.max(0, P(p, 'dmdt', 0));
  const m0 = 1;
  const m = Math.max(0.05, m0 - mdot * Math.max(0, t));
  const v = -u * Math.log(m / m0);
  const a0 = u * mdot / m0;
  return { val: a0, v, a0, m };
}

function noninertialEval(p) {
  // Taylor Ch. 9. Initial velocity (1, 0) m/s so Coriolis −2ω×v is defined.
  const aFrame = P(p, 'aFrame', 0);
  const w = P(p, 'omega', 0);
  const ay = -2 * w * 1;
  const ax = aFrame;
  return { val: ay, ax, ay, aMag: Math.hypot(ax, ay) };
}

function pendulumReset(state) {
  state.theta = undefined;
  state.omega = undefined;
}

function pendulumEval(p, t, state, dt) {
  const L = pos(P(p, 'L', 1), 1e-6);
  const m = pos(P(p, 'm', 1), 1e-9);
  const th0 = P(p, 'theta0', 15) * Math.PI / 180;
  if (!Number.isFinite(state.theta)) {
    state.theta = th0;
    state.omega = 0;
  }
  const accel = (th) => -(G / L) * Math.sin(th);
  if (dt > 0) {
    let left = Math.min(dt, 0.5);
    while (left > 1e-8) {
      const h = Math.min(0.02, left);
      const a1 = accel(state.theta);
      state.theta += state.omega * h + 0.5 * a1 * h * h;
      const a2 = accel(state.theta);
      state.omega += 0.5 * (a1 + a2) * h;
      left -= h;
    }
  }
  const alpha = accel(state.theta);
  const E = m * G * L * (1 - Math.cos(state.theta)) + 0.5 * m * (L * state.omega) ** 2;
  return {
    val: alpha,
    alpha,
    thetaDeg: state.theta * 180 / Math.PI,
    E,
  };
}

function orbitEval(p) {
  // G=1 units (Murray & Dermott style; catalog M is O(1)).
  // Launch is perpendicular at r0 with speed v0. e is the requested conic eccentricity.
  const M = pos(P(p, 'M', 1), 1e-9);
  const r0 = pos(P(p, 'r0', 1), 1e-6);
  const v0 = P(p, 'v0', 0);
  const eReq = Math.max(0, P(p, 'e', 0));
  const h = r0 * v0;
  const eps = 0.5 * v0 * v0 - M / r0;
  const disc = 1 + (2 * eps * h * h) / (M * M);
  const eOsc = Math.sqrt(Math.max(0, disc));
  const ac = M / (r0 * r0);
  const unbound = eReq >= 1 ? 1 : 0;
  const rA = eReq < 0.999 ? r0 * (1 + eReq) / (1 - eReq) : r0;
  const vPeri = Math.sqrt(M * (1 + Math.min(eReq, 10)) / r0);
  return { val: ac, ac, eOsc, rA, vPeri, unbound };
}

function shoEval(p, t) {
  const k = pos(P(p, 'k', 1), 1e-12);
  const m = pos(P(p, 'm', 1), 1e-12);
  const x0 = P(p, 'x0', 1);
  const w = Math.sqrt(k / m);
  const x = x0 * Math.cos(w * t);
  const v = -x0 * w * Math.sin(w * t);
  const a = -(k / m) * x;
  return {
    val: a,
    x,
    v,
    a,
    omega: w,
    curve: linspace(64, (u) => x0 * Math.cos(2 * Math.PI * u)),
  };
}

function dampedEval(p, t) {
  // m=1, x(0)=1, v(0)=0. Thornton & Marion under/critical/over-damped closed form.
  const k = pos(P(p, 'k', 1), 1e-12);
  const c = Math.max(0, P(p, 'c', 0));
  const w0 = Math.sqrt(k);
  const alpha = c / 2;
  const zeta = c / (2 * w0);
  let x;
  if (Math.abs(zeta - 1) < 1e-6) {
    x = Math.exp(-alpha * t) * (1 + alpha * t);
  } else if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    x = Math.exp(-alpha * t) * (Math.cos(wd * t) + (alpha / wd) * Math.sin(wd * t));
  } else {
    const beta = w0 * Math.sqrt(zeta * zeta - 1);
    x = Math.exp(-alpha * t) * (Math.cosh(beta * t) + (alpha / beta) * Math.sinh(beta * t));
  }
  return { val: zeta, x: finiteOr(x), zeta, omega0: w0 };
}

function forcedEval(p) {
  // m=1, k=1 so ω0=1. Steady state of x'' + c x' + x = F0 cos(2π f t).
  const F0 = P(p, 'F0', 0);
  const f = P(p, 'fDrive', 0.5);
  const c = Math.max(0, P(p, 'c', 0));
  const w = 2 * Math.PI * f;
  const re = 1 - w * w;
  const im = c * w;
  const A = F0 / Math.sqrt(re * re + im * im);
  const phi = Math.atan2(im, re);
  return { val: A, A, phi };
}

function coupledEval(p) {
  // Fixed-end chain, on-site spring 1, coupling κ.
  // ω_r^2 = 1 + 4 κ sin^2(q_r/2), q_r = r π/(N+1). Marion / French coupled oscillators.
  const N = Math.max(2, Math.min(12, Math.round(P(p, 'N', 2))));
  const kappa = Math.max(0, P(p, 'kappa', 0));
  const q = N * Math.PI / (N + 1);
  const w2 = 1 + 4 * kappa * Math.sin(q / 2) ** 2;
  const a1 = -(1 + 2 * kappa);
  return { val: Math.sqrt(Math.max(0, w2)), omegaMax: Math.sqrt(Math.max(0, w2)), a1, N };
}

function duffingReset(state) {
  state.x = undefined;
  state.v = undefined;
}

function duffingEval(p, t, state, dt) {
  // Undamped driven Duffing: x'' + ω^2 x + β x^3 = F cos(ω t), ω=1.
  // Strogatz writes a damped form; this is the Hamiltonian drive the catalog knobs support.
  const beta = P(p, 'beta', 0);
  const drive = P(p, 'drive', 0);
  if (!Number.isFinite(state.x)) {
    state.x = 1;
    state.v = 0;
  }
  const accel = (x, time) => -x - beta * x * x * x + drive * Math.cos(time);
  if (dt > 0) {
    let left = Math.min(dt, 0.5);
    let time = t;
    while (left > 1e-8) {
      const h = Math.min(0.02, left);
      const a1 = accel(state.x, time);
      state.x += state.v * h + 0.5 * a1 * h * h;
      const a2 = accel(state.x, time + h);
      state.v += 0.5 * (a1 + a2) * h;
      if (!Number.isFinite(state.x) || Math.abs(state.x) > 1e3) {
        state.x = clamp(state.x || 0, -1e3, 1e3);
        state.v = 0;
        break;
      }
      time += h;
      left -= h;
    }
  }
  const a = accel(state.x, t + (dt || 0));
  return { val: a, a, x: state.x, v: state.v };
}

// --- waves / optics ------------------------------------------------------
// Pain: waves and membranes. Hecht: interference, diffraction, Snell, lenses, Malus, prism.
// Halliday: Doppler.

function wave1dEval(p, t) {
  // y = sin(kx − ωt), A=1. k=ω/c, ω=2πf. Pain / Kinsler.
  const c = pos(P(p, 'c', 1), 1e-9);
  const f = pos(P(p, 'f', 1), 1e-9);
  const w = 2 * Math.PI * f;
  const k = w / c;
  const lam = c / f;
  const yProbe = Math.sin(k * 1 - w * t);
  return {
    val: lam,
    lam,
    k,
    yProbe,
    curve: linspace(64, (u) => Math.sin(k * u * 4 - w * t)),
  };
}

function wave2dEval(p, t) {
  // Rectangular membrane (1,1) on the unit square. c=sqrt(T/ρ). Pain.
  const tension = pos(P(p, 'T', 1), 1e-12);
  const rho = pos(P(p, 'rho', 1), 1e-12);
  const c = Math.sqrt(tension / rho);
  const omega = Math.PI * c * Math.SQRT2;
  const yMid = Math.cos(omega * t);
  return { val: c, c, omega, yMid };
}

function interfereEval(p) {
  // Equal double source: I/I0 = cos^2(φ/2), φ = phi + 2π (d sinθ)/λ at θ=0 → phi.
  // Fringe spacing β=λ L/d with L=1. Hecht.
  const d = pos(P(p, 'd', 1), 1e-9);
  const phi = P(p, 'phi', 0);
  const lam = pos(P(p, 'lam', 1), 1e-9);
  const I = Math.cos(phi / 2) ** 2;
  const beta = lam / d;
  return { val: I, I, beta };
}

function diffractEval(p) {
  // Paraxial single-slit first minimum y = λ L / a. Hecht.
  const a = pos(P(p, 'a', 0.1), 1e-9);
  const lam = pos(P(p, 'lam', 0.4), 1e-12);
  const L = pos(P(p, 'L', 1), 1e-9);
  const yMin = L * lam / a;
  const beta = Math.PI * a / Math.max(lam, 1e-12);
  const I0 = 1;
  return { val: yMin, yMin, beta, I0 };
}

function dopplerEval(p) {
  // Speeds are fractions of the wave speed (catalog: 源速比).
  // Positive vs toward the observer, positive vo toward the source. Halliday.
  const vs = clamp(P(p, 'vs', 0), -0.95, 0.95);
  const vo = clamp(P(p, 'vo', 0), -0.95, 0.95);
  const ang = P(p, 'ang', 0) * Math.PI / 180;
  const cs = Math.cos(ang);
  const den = 1 - vs * cs;
  const num = 1 + vo * cs;
  const ratio = Math.abs(den) < 1e-3 ? num / (den < 0 ? -1e-3 : 1e-3) : num / den;
  return { val: ratio, ratio };
}

function snellEval(p) {
  // Air into a medium of index n. Hecht.
  const th = P(p, 'theta', 0) * Math.PI / 180;
  const n = pos(P(p, 'n', 1), 1e-6);
  const s = Math.sin(th) / n;
  const tir = Math.abs(s) > 1 ? 1 : 0;
  const th2 = tir ? 90 : Math.asin(clamp(s, -1, 1)) * 180 / Math.PI;
  return { val: th2, theta2: th2, tir };
}

function lensEval(p) {
  // School form 1/u+1/v=1/f with the signed catalog distances. Hecht thin lens.
  const f = P(p, 'f', 10);
  const u = P(p, 'u', -20);
  const h = P(p, 'h', 1);
  const den = (Math.abs(f) < 1e-8 ? 0 : 1 / f) - (Math.abs(u) < 1e-8 ? 0 : 1 / u);
  const v = Math.abs(den) < 1e-10 ? 0 : 1 / den;
  const m = Math.abs(u) < 1e-8 ? 0 : -v / u;
  return { val: v, v, m, hi: m * h };
}

function prismEval(p) {
  // Thin-prism δ≈(n−1)A, angles in degrees (the linear approximation preserves the unit). Hecht.
  const A = P(p, 'A', 30);
  const n = P(p, 'nF', 1.5);
  const delta = (n - 1) * A;
  const Ar = A * Math.PI / 180;
  const arg = clamp(n * Math.sin(Ar / 2), -1, 1);
  const deltaMin = (2 * Math.asin(arg) - Ar) * 180 / Math.PI;
  return { val: delta, delta, deltaMin: finiteOr(deltaMin) };
}

function optInterfereEval(p) {
  // Young's slits. d in mm, λ in nm, L=1 m. β = λ L / d.
  const dMm = pos(P(p, 'd', 0.1), 1e-9);
  const lamNm = pos(P(p, 'lam', 550), 1e-9);
  const betaMm = (lamNm * 1e-6) / dMm;
  return { val: betaMm, betaMm };
}

function optDiffractEval(p) {
  // Fraunhofer single slit. a in mm, λ in nm, L in m. y = λ L / a.
  const aMm = pos(P(p, 'a', 0.05), 1e-9);
  const lamNm = pos(P(p, 'lam', 500), 1e-9);
  const L = pos(P(p, 'L', 1), 1e-9);
  const yMm = lamNm * L / aMm * 1e-3;
  return { val: yMm, yMm };
}

function malusEval(p) {
  // Malus: I/I0 = cos^2(θ). dphi is a retarder phase and does not change that intensity. Hecht.
  const th = P(p, 'ang', 0) * Math.PI / 180;
  const I = Math.cos(th) ** 2;
  const dphi = P(p, 'dphi', 0);
  return { val: I, I, dphi };
}

function fiberEval(p) {
  const n1 = P(p, 'nCore', 1.45);
  const n2 = P(p, 'nClad', 1.4);
  const na2 = n1 * n1 - n2 * n2;
  const NA = na2 > 0 ? Math.sqrt(na2) : 0;
  const crit = n1 > 0 ? Math.asin(clamp(n2 / n1, -1, 1)) * 180 / Math.PI : 0;
  return { val: NA, NA, thetaC: crit };
}

function laserEval(p) {
  // Siegman / Svelto: one-way threshold when g L exceeds the single-pass loss.
  const L = pos(P(p, 'L', 0.1), 1e-6);
  const g = P(p, 'g', 0);
  const loss = P(p, 'loss', 0);
  const net = g * L - loss;
  return { val: net, net, gL: g * L };
}

function nloEval(p) {
  // Boyd: plane-wave SHG efficiency ∝ χ^2 sinc^2(Δk L/2), L=1.
  const chi = P(p, 'chi', 0);
  const dk = P(p, 'dk', 0);
  const x = dk / 2;
  const sinc = Math.abs(x) < 1e-8 ? 1 : Math.sin(x) / x;
  const eta = chi * chi * sinc * sinc;
  return { val: eta, eta };
}

function qopticsEval(p) {
  // Walls & Milburn / Gerry & Knight: squeezed variance e^{-2r}, n̄=|α|^2+sinh^2(r).
  const r = P(p, 'r', 0);
  const alpha = P(p, 'alpha', 0);
  const V = Math.exp(-2 * r);
  const nbar = alpha * alpha + Math.sinh(r) ** 2;
  return { val: V, V, nbar: finiteOr(nbar) };
}

// --- thermo --------------------------------------------------------------
// Çengel & Boles; Incropera; Reif.

function idealGasEval(p) {
  // Polytropic ideal gas. Probe at V=2 V0. P0 cancels in the ratio.
  const n = P(p, 'n', 1);
  const T0 = P(p, 'T0', 300);
  const pRatio = 2 ** (-n);
  const T2 = T0 * 2 ** (1 - n);
  return { val: pRatio, pRatio, T2: finiteOr(T2) };
}

function heatEngineEval(p) {
  // Carnot η=1−Tc/Th with TR=Th/Tc. Otto η=1−r^{1−γ}, γ=1.4 air. Çengel & Boles.
  const TR = pos(P(p, 'TR', 2), 1e-6);
  const r = pos(P(p, 'r', 4), 1e-6);
  const etaC = 1 - 1 / TR;
  const etaO = 1 - r ** (1 - 1.4);
  return { val: etaC, etaC, etaO };
}

function convectionEval(p) {
  // Newton q=h ΔT with a 1 K difference, so q=h.
  // Laminar flat plate (Incropera): Nu=0.664 Re^{1/2} Pr^{1/3}, L=1 m, air.
  const h = P(p, 'h', 10);
  const U = Math.max(0, P(p, 'U', 0));
  const q = h * 1;
  const Re = U * 1 / 1.5e-5;
  const Nu = 0.664 * Math.sqrt(Re) * (0.7 ** (1 / 3));
  const hBl = Nu * 0.026 / 1;
  return { val: q, q, hBl };
}

function radiationEval(p) {
  // Stefan–Boltzmann exitance. Surroundings are not included. Incropera.
  const eps = clamp(P(p, 'eps', 1), 0, 1);
  const T = P(p, 'T', 300);
  const q = eps * SIGMA * T ** 4;
  return { val: q, q };
}

function kineticEval(p) {
  // v_rms=sqrt(3 R T / M), M in kg/mol, mMol in g/mol. Reif.
  const T = pos(P(p, 'T', 300), 1e-9);
  const M = pos(P(p, 'mMol', 28), 1e-9) * 1e-3;
  const vrms = Math.sqrt(3 * R_GAS * T / M);
  const vp = Math.sqrt(2 * R_GAS * T / M);
  return { val: vrms, vrms, vp };
}

function brownianEval(p) {
  // Einstein: one-dimensional ensemble <x^2>=2 D τ. τ is the catalog time knob.
  const D = Math.max(0, P(p, 'D', 0));
  const tau = Math.max(0, P(p, 'dt', 0));
  const msd = 2 * D * tau;
  return { val: msd, msd };
}

function isingEval(p) {
  // Pathria mean-field Ising, z=4, m=tanh((z J m+H)/T). Not the Onsager solution.
  const J = P(p, 'J', 1);
  const T = pos(P(p, 'T', 1), 1e-6);
  const H = P(p, 'H', 0);
  let m = 0.5;
  const z = 4;
  for (let i = 0; i < 80; i += 1) {
    const m2 = Math.tanh((z * J * m + H) / T);
    if (Math.abs(m2 - m) < 1e-12) {
      m = m2;
      break;
    }
    m = m2;
  }
  return { val: finiteOr(m), m: finiteOr(m) };
}

function percolationEval(p) {
  // Stauffer: exact 1D site-percolation mean cluster size S=(1+p)/(1−p) for p<1.
  const prob = clamp(P(p, 'p', 0.5), 0, 0.999999);
  const S = (1 + prob) / (1 - prob);
  return { val: S, S };
}

function entropyEval(p) {
  // Ideal binary mixing, per mole, Δs/R = −Σ x ln x. Çengel & Boles. T does not enter Δs.
  const x = clamp(P(p, 'xA', 0.5), 1e-12, 1 - 1e-12);
  const sOverR = -x * Math.log(x) - (1 - x) * Math.log(1 - x);
  const gOverR = P(p, 'T', 300) * -sOverR;
  return { val: sOverR, sOverR, gOverR };
}

// --- electromagnetism ----------------------------------------------------
// Griffiths; Nilsson for circuits.

function coulombEval(p) {
  const q = P(p, 'q', 1);
  const r = pos(P(p, 'geom', 1), 1e-6);
  const E = KE * q / (r * r);
  return { val: E, E };
}

function dipoleEval(p) {
  // On-axis dipole field E=(1/(4πε0)) 2p/r^3. r = separation knob. Griffiths Ch. 3.
  const moment = P(p, 'p', 1);
  const r = pos(P(p, 'sep', 1), 1e-4);
  const E = KE * 2 * moment / (r ** 3);
  return { val: E, E };
}

function gaussEval(p) {
  // Uniform sphere, surface r=R: E=ρ R/(3 ε0). Griffiths Ch. 2.
  const rho = P(p, 'rho', 1);
  const R = pos(P(p, 'R', 1), 1e-9);
  const E = rho * R / (3 * EPS0);
  const Q = rho * (4 / 3) * Math.PI * R ** 3;
  return { val: E, E, Q };
}

function capacitorEval(p) {
  // C=ε_r ε0 A/d. eps is relative permittivity.
  const er = P(p, 'eps', 1);
  const d = pos(P(p, 'd', 0.1), 1e-9);
  const A = pos(P(p, 'A', 0.1), 1e-12);
  const C = er * EPS0 * A / d;
  return { val: C, C };
}

function dcEval(p) {
  // Single loop, Ohm and Kirchhoff: I=E/R.
  const R = pos(P(p, 'R', 1), 1e-9);
  const E = P(p, 'E', 0);
  const I = E / R;
  return { val: I, I, V: E };
}

function rlcEval(p) {
  // Series RLC. ω0=1/√(LC), α=R/(2L). Nilsson.
  const R = Math.max(0, P(p, 'R', 1));
  const L = pos(P(p, 'L', 1e-3), 1e-12);
  const C = pos(P(p, 'C', 1e-6), 1e-18);
  const w0 = 1 / Math.sqrt(L * C);
  const alpha = R / (2 * L);
  const disc = w0 * w0 - alpha * alpha;
  const wd = disc > 0 ? Math.sqrt(disc) : 0;
  return { val: w0, w0, alpha, wd };
}

function acEval(p) {
  // Reference R=1 Ω. phi is the impedance angle, so |Z|=sec(phi).
  // f sets ω. A series reactance that realizes phi at this f is X=tan(phi)=ω L_eq.
  const f = pos(P(p, 'f', 50), 1e-6);
  const phi = clamp(P(p, 'phi', 0), -89.9, 89.9) * Math.PI / 180;
  const Z = 1 / Math.cos(phi);
  const X = Math.tan(phi);
  const Leq = X / (2 * Math.PI * f);
  return { val: Math.abs(Z), Z: Math.abs(Z), Leq };
}

function biotEval(p) {
  // Loop center, B=μ0 I /(2 R). Griffiths Ch. 5.
  const I = P(p, 'I', 1);
  const R = pos(P(p, 'geom', 1), 1e-6);
  const B = MU0 * I / (2 * R);
  return { val: B, B };
}

function lorentzEval(p) {
  // Normalized particle q=1 C, m=1 kg. F_E=qE, cyclotron r=m v/(|q|B). Griffiths Ch. 5.
  const E = P(p, 'E', 0);
  const B = P(p, 'B', 0);
  const v = P(p, 'v', 0);
  const FE = E;
  const FB = Math.abs(v * B);
  const rC = Math.abs(B) > 1e-12 ? Math.abs(v / B) : 0;
  return { val: FE, FE, FB, rC };
}

function faradayEval(p) {
  // dPhi is dΦ/dt as labeled. ε=−N dΦ/dt. Griffiths Ch. 7.
  const dPhi = P(p, 'dPhi', 0);
  const N = P(p, 'N', 1);
  const emf = -N * dPhi;
  return { val: emf, emf };
}

function mutualEval(p) {
  // M=k √(L1 L2) with L1=L2=L. Nilsson.
  const L = Math.max(0, P(p, 'L', 0));
  const k = clamp(P(p, 'k', 0), 0, 1);
  const M = k * L;
  return { val: M, M };
}

function maxwellEval(p) {
  // TEM wavelength λ=c/f. Griffiths Ch. 9.
  const f = pos(P(p, 'f', 1e9), 1);
  const mode = Math.max(1, P(p, 'mode', 1));
  const lam = C_LIGHT / f;
  // Cubic cavity side 1 m, TE10n-like cutoff (c/2) sqrt(1+mode^2). Teaching comparison only.
  const fCav = (C_LIGHT / 2) * Math.sqrt(1 + mode * mode);
  return { val: lam, lam, fCav };
}

function tlineEval(p) {
  // Lossless TEM line in vacuum: one-way delay len/c. Z0 is the characteristic impedance. Cheng / Pozar.
  const Z0 = P(p, 'Z0', 50);
  const len = Math.max(0, P(p, 'len', 1));
  const delay = len / C_LIGHT;
  return { val: Z0, Z0, delay };
}

function antennaEval(p) {
  // Balanis finite dipole at broadside, and two-element endfire array factor.
  // len and d are in wavelengths. phi is the phase difference in degrees.
  const len = P(p, 'len', 0.5);
  const d = P(p, 'd', 0.5);
  const delta = P(p, 'phi', 0) * Math.PI / 180;
  const elem = 1 - Math.cos(Math.PI * len);
  const psi = 2 * Math.PI * d + delta;
  const AF = Math.abs(Math.cos(psi / 2));
  return { val: AF, AF, elem: elem * elem };
}

// --- quantum / modern ----------------------------------------------------

function wellEval(p) {
  // Infinite well, ℏ=m=1, n=1: E=π^2/(2 a^2). Griffiths QM. V0 is not an infinite-well eigenvalue.
  const a = pos(P(p, 'a', 1), 1e-9);
  const E1 = (Math.PI ** 2) / (2 * a * a);
  const V0 = P(p, 'V0', 0);
  return { val: E1, E1, above: E1 < V0 ? 1 : 0 };
}

function tunnelEval(p) {
  // Thick rectangular barrier, ℏ=m=1. T≈exp(−2κw), κ=sqrt(2(V0−E)). Griffiths QM.
  const V0 = P(p, 'V0', 1);
  const E = P(p, 'E', 0);
  const w = Math.max(0, P(p, 'w', 0));
  if (E >= V0) return { val: 1, T: 1, kappa: 0 };
  const kappa = Math.sqrt(2 * (V0 - E));
  const T = Math.exp(-2 * kappa * w);
  return { val: T, T, kappa };
}

function qhoEval(p) {
  // ℏ=1. E0=ω/2. Coupled partner ω_+=ω sqrt(1+coup) for a unit coupling spring. Griffiths QM.
  const w = pos(P(p, 'omega', 1), 1e-9);
  const coup = Math.max(0, P(p, 'coup', 0));
  const E0 = 0.5 * w;
  const wPlus = w * Math.sqrt(1 + coup);
  return { val: E0, E0, wPlus };
}

function hydrogenEval(p) {
  // Bohr / Schrödinger: E=−13.6 eV/n^2. l and m do not shift this level. Bransden & Joachain.
  const n = Math.max(1, Math.round(P(p, 'n', 1)));
  const l = Math.max(0, Math.round(P(p, 'l', 0)));
  const m = Math.round(P(p, 'm', 0));
  const E = -13.6 / (n * n);
  const valid = l <= n - 1 && Math.abs(m) <= l ? 1 : 0;
  return { val: E, E, valid };
}

function angmomEval(p) {
  // Landé g for s=1/2, l=j−1/2. Fine structure uses L·S=½[j(j+1)−l(l+1)−s(s+1)]. Bransden.
  const j = pos(P(p, 'j', 0.5), 1e-6);
  const coup = P(p, 'coup', 0);
  const l = Math.max(0, j - 0.5);
  const s = 0.5;
  const jj = j * (j + 1);
  const gJ = 1 + (jj + s * (s + 1) - l * (l + 1)) / (2 * jj);
  const LS = 0.5 * (jj - l * (l + 1) - s * (s + 1));
  return { val: gJ, gJ: finiteOr(gJ), Efs: coup * LS };
}

function entangleEval(p) {
  // Horodecki: two-qubit CHSH max 2 sqrt(1+C^2). Correlator at angle `basis` is −C cos θ.
  const Cq = clamp(P(p, 'conc', 0), 0, 1);
  const th = P(p, 'basis', 0) * Math.PI / 180;
  const S = 2 * Math.sqrt(1 + Cq * Cq);
  const corr = -Cq * Math.cos(th);
  return { val: S, S, corr };
}

function qgateEval(p) {
  // Nielsen & Chuang. Ry on |0>: P(|1>)=sin^2(θ/2). ctrl≠0 marks a control-high CNOT.
  const th = P(p, 'theta', 0) * Math.PI / 180;
  const P1 = Math.sin(th / 2) ** 2;
  const flipped = Math.round(P(p, 'ctrl', 0)) !== 0 ? 1 : 0;
  return { val: P1, P1, flipped };
}

function groverEval(p) {
  // Nielsen & Chuang. sin θ = 1/√N, P=sin^2((2k+1)θ).
  const nBits = Math.max(1, Math.min(12, Math.round(P(p, 'nBits', 2))));
  const k = Math.max(0, Math.round(P(p, 'iters', 1)));
  const N = 2 ** nBits;
  const th = Math.asin(1 / Math.sqrt(N));
  const prob = Math.sin((2 * k + 1) * th) ** 2;
  return { val: prob, prob, N };
}

function packetEval(p, t) {
  // Griffiths QM free Gaussian. <T>=ℏ^2/(8 m σ^2), ℏ=m=1. Constant V shifts energy only.
  const sigma = pos(P(p, 'sigma', 1), 1e-6);
  const V = P(p, 'V', 0);
  const spread = sigma * Math.sqrt(1 + (t / (2 * sigma * sigma)) ** 2);
  const E = 1 / (8 * sigma * sigma) + V;
  return { val: E, E, sigmaT: finiteOr(spread) };
}

function relKinEval(p) {
  // French, Special Relativity. γ=(1−β^2)^{−1/2}.
  const beta = clamp(Math.abs(P(p, 'beta', 0)), 0, 0.999999);
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  return { val: gamma, gamma, contract: 1 / gamma };
}

function relDynEval(p) {
  // French. c=1. Rest energy sqrt(E^2−p^2) when the interval is timelike.
  const E = P(p, 'E', 1);
  const mom = P(p, 'p', 0);
  const disc = E * E - mom * mom;
  const m = disc > 0 ? Math.sqrt(disc) : 0;
  return { val: m, m, timelike: disc > 0 ? 1 : 0 };
}

function comptonEval(p) {
  // Compton 1923. Δλ=λ_C(1−cosθ). E is the incident photon energy in keV.
  const th = P(p, 'theta', 0) * Math.PI / 180;
  const E = pos(P(p, 'E', 50), 1e-9);
  const dLam = LAMBDA_C_PM * (1 - Math.cos(th));
  const lam = HC_KEV_PM / E;
  const Ep = HC_KEV_PM / (lam + dLam);
  return { val: dLam, dLam, Ep };
}

function decayEval(p, t) {
  // Krane. N=N0 e^{−λt}. Activity A=λN.
  const lam = Math.max(0, P(p, 'lam', 0));
  const N0 = Math.max(0, P(p, 'N0', 0));
  const N = N0 * Math.exp(-lam * Math.max(0, t));
  const A = lam * N;
  const half = lam > 1e-15 ? Math.LN2 / lam : 0;
  return { val: N, N, A, half };
}

// --- structures ----------------------------------------------------------
// Hibbeler, Mechanics of Materials.

function axialEval(p) {
  const A = pos(P(p, 'A', 1), 1e-15);
  const F = P(p, 'F', 0);
  const sigma = F / A;
  return { val: sigma, sigma };
}

function beamBendEval(p) {
  // Simply supported beam, center point load. M_max=PL/4, δ=PL^3/(48 EI). Hibbeler.
  const L = pos(P(p, 'L', 1), 1e-9);
  const EI = pos(P(p, 'EI', 1), 1e-9);
  const load = P(p, 'P', 0);
  const M = load * L / 4;
  const delta = load * L ** 3 / (48 * EI);
  return { val: M, M, delta, curvature: M / EI };
}

function beamDeflEval(p) {
  // Unit length, pure end moment: Euler–Bernoulli requires δ=θ L/2. Residual of the supplied pair.
  const delta = P(p, 'delta', 0);
  const theta = P(p, 'theta', 0);
  const residual = delta - theta / 2;
  return { val: residual, residual, delta, theta };
}

function bucklingEval(p) {
  // Pinned–pinned Euler load Pcr=π^2 EI/L^2. Hibbeler.
  const L = pos(P(p, 'L', 1), 1e-9);
  const EI = pos(P(p, 'EI', 1), 1e-9);
  const Pcr = (Math.PI ** 2) * EI / (L * L);
  return { val: Pcr, Pcr };
}

function torsionEval(p) {
  // Round shaft τ=16 T /(π d^3). Hibbeler.
  const d = pos(P(p, 'd', 0.05), 1e-9);
  const T = P(p, 'T', 0);
  const tau = 16 * T / (Math.PI * d ** 3);
  return { val: tau, tau };
}

function combinedEval(p) {
  // Section moduli normalized to 1: σx=N+M, τ=T. Plane-stress principal value. Hibbeler.
  const N = P(p, 'N', 0);
  const M = P(p, 'M', 0);
  const T = P(p, 'T', 0);
  const sx = N + M;
  const s1 = sx / 2 + Math.sqrt((sx / 2) ** 2 + T * T);
  return { val: s1, s1, sx };
}

function trussEval(p) {
  // Maxwell count for a plane truss: i=b−(2j−3). Hibbeler.
  const j = Math.round(P(p, 'nodes', 3));
  const b = Math.round(P(p, 'bars', 3));
  const indeterminacy = b - (2 * j - 3);
  return { val: indeterminacy, indeterminacy };
}

function frameEval(p) {
  // Unit lateral load on a stated stiffness k. Drift=1/k. Aspect=span/story.
  const k = pos(P(p, 'k', 1), 1e-9);
  const span = P(p, 'span', 1);
  const story = pos(P(p, 'story', 1), 1e-9);
  return { val: 1 / k, drift: 1 / k, aspect: span / story };
}

function sdofEval(p) {
  const m = pos(P(p, 'm', 1), 1e-12);
  const k = pos(P(p, 'k', 1), 1e-12);
  const c = Math.max(0, P(p, 'c', 0));
  const wn = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  return { val: wn, wn, zeta };
}

function seismicEval(p) {
  // Chopra: resonant displacement amplification of a harmonic base acceleration is 1/(2ζ).
  // This is not a code design spectrum.
  const pga = P(p, 'pga', 0);
  const zeta = pos(P(p, 'zeta', 0.05), 1e-6);
  const amp = pga / (2 * zeta);
  return { val: amp, amp };
}

// --- fluids --------------------------------------------------------------
// White; Incropera; Wen & Yu.

function bernoulliEval(p) {
  // Water ρ=1000 kg/m^3. Dynamic pressure ½ρv^2 and discharge Q=A v. White.
  const v = P(p, 'v', 0);
  const A = Math.max(0, P(p, 'A', 0));
  const q = 0.5 * 1000 * v * v;
  const Q = A * v;
  return { val: q, q, Q };
}

function poiseuilleEval(p) {
  // Poiseuille with reference ΔP/L=1 Pa/m: Q=π R^4 /(8 μ). Couette τ=μ U/D. White.
  const mu = pos(P(p, 'mu', 0.01), 1e-12);
  const U = P(p, 'U', 0);
  const D = pos(P(p, 'D', 0.01), 1e-9);
  const R = D / 2;
  const Q = Math.PI * R ** 4 / (8 * mu);
  const tau = mu * U / D;
  return { val: Q, Q, tau };
}

function blasiusEval(p) {
  // Blasius: cf=0.664/√Re_x, δ99/x=5/√Re_x. rough is ε/L and only builds Re_ε. White.
  const Re = pos(P(p, 'Re', 100), 1e-9);
  const rough = Math.max(0, P(p, 'rough', 0));
  const cf = 0.664 / Math.sqrt(Re);
  const delta = 5 / Math.sqrt(Re);
  return { val: cf, cf, delta, ReEps: Re * rough };
}

function darcyEval(p) {
  // Laminar f=64/Re. Turbulent: Swamee–Jain. eps is ε/D. White.
  const Re = pos(P(p, 'Re', 1000), 1e-9);
  const eps = Math.max(0, P(p, 'eps', 0));
  let f;
  if (Re < 2300) f = 64 / Re;
  else {
    const arg = eps / 3.7 + 5.74 / Re ** 0.9;
    const log = Math.log10(Math.max(arg, 1e-15));
    f = 0.25 / (log * log);
  }
  return { val: f, f };
}

function manningEval(p) {
  // SI Manning, wide unit-width channel, R≈y. Q=(1/n) y^{5/3} S^{1/2}. Chow / White.
  const n = pos(P(p, 'n', 0.013), 1e-9);
  const S = pos(P(p, 'S', 0.001), 1e-15);
  const Q = Math.max(0, P(p, 'Q', 0));
  const y = (Q * n / Math.sqrt(S)) ** (3 / 5);
  return { val: finiteOr(y), y: finiteOr(y) };
}

function weirEval(p) {
  // Ideal rectangular weir, Cd=1: Q=(2/3) b √(2g) H^{3/2}. b=`a`. White.
  const H = Math.max(0, P(p, 'H', 0));
  const b = Math.max(0, P(p, 'a', 0));
  const Q = (2 / 3) * b * Math.sqrt(2 * G) * H ** 1.5;
  return { val: Q, Q };
}

function pumpEval(p) {
  // Affinity laws about the catalog reference 1450 rpm. Q∝rpm·units, H∝rpm^2. White.
  const rpm = P(p, 'rpm', 1450);
  const units = Math.max(0, P(p, 'units', 1));
  const speed = rpm / 1450;
  const Q = units * speed;
  const H = speed * speed;
  return { val: Q, Q, H };
}

function hxEval(p) {
  // LMTD method needs terminal temperatures the catalog does not give. Conductance UA=U A.
  const U = P(p, 'U', 0);
  const A = P(p, 'A', 0);
  return { val: U * A, UA: U * A };
}

function turbEval(p) {
  // The knobs are the standard k–ε coefficient Cμ and a filter width. No k or ε is invented.
  const Cmu = P(p, 'Cmu', 0.09);
  const grid = P(p, 'grid', 0);
  return { val: Cmu, Cmu, Delta: grid };
}

function capillaryEval(p) {
  // White: capillary length λ_c=sqrt(σ/(Δρ g)).
  const sigma = Math.max(0, P(p, 'sigma', 0));
  const drho = pos(P(p, 'drho', 1), 1e-9);
  const lam = Math.sqrt(sigma / (drho * G));
  return { val: lam, lam };
}

function plasmaEval(p) {
  // Chen. T is in eV. ω_p=sqrt(n e^2/(ε0 m_e)), ω_c=eB/m_e.
  const B = P(p, 'B', 0);
  const n = pos(P(p, 'n', 1e14), 1);
  const TeV = Math.max(0, P(p, 'T', 1));
  const wp = Math.sqrt(n * QE * QE / (EPS0 * ME));
  const wc = QE * Math.abs(B) / ME;
  const lamD = Math.sqrt(EPS0 * TeV * QE / (n * QE * QE));
  return { val: wp, wp, wc, lamD };
}

function superconEval(p) {
  // Tinkham. κ=λ/ξ. Type II when κ>1/√2.
  const lam = P(p, 'lam', 1);
  const xi = pos(P(p, 'xi', 1), 1e-9);
  const kappa = lam / xi;
  return { val: kappa, kappa, typeII: kappa > 1 / Math.SQRT2 ? 1 : 0 };
}

function magnetismEval(p) {
  // Kittel mean field: kT_C=(2/3) z J S(S+1), z=6, S=1/2, k_B=1.
  const J = P(p, 'J', 1);
  const K = P(p, 'K', 0);
  const Tc = (2 / 3) * 6 * J * 0.5 * 1.5;
  return { val: Tc, Tc, K };
}

function semiconductorEval(p) {
  // Sze. 300 K, Na=Nd, ni(Si)=1e10 cm^{−3}. Nd is in cm^{−3}.
  const Nd = pos(P(p, 'Nd', 1e15), 1);
  const dE = P(p, 'dE', 0);
  const ni = 1e10;
  const VT = 0.025851;
  const Vbi = VT * Math.log((Nd * Nd) / (ni * ni));
  return { val: Vbi, Vbi, dE };
}

function topoEval(p) {
  // TKNN: σ_xy / (e^2/h) = Chern. Edge-mode count |C| when a boundary is enabled.
  const Cq = P(p, 'Chern', 0);
  const bc = P(p, 'bc', 0) > 0 ? 1 : 0;
  const edge = bc ? Math.abs(Cq) : 0;
  return { val: Cq, sigma: Cq, edge };
}

function convEngEval(p) {
  return convectionEval(p);
}

function radEngEval(p) {
  // Infinite parallel plates have view factor 1. q=ε σ T^4 into a 0 K enclosure. Incropera.
  return radiationEval(p);
}

function thermoCycleEval(p) {
  // Ideal-gas Brayton, P_low=1 bar, rp=P/(1 bar), γ=1.4. Çengel & Boles.
  // Also the Carnot bound with Tc=298.15 K.
  const Pbar = pos(P(p, 'P', 1), 1e-9);
  const T = pos(P(p, 'T', 300), 1e-9);
  const rp = Pbar;
  const etaB = 1 - rp ** ((1 - 1.4) / 1.4);
  const etaC = 1 - 298.15 / T;
  return { val: etaB, etaB, etaC };
}

function combustionEval(p) {
  // Turns. φ is the equivalence ratio. Excess air (1/φ−1) when φ>0. T is the reactant temperature.
  const phi = pos(P(p, 'phi', 1), 1e-6);
  const excess = 1 / phi - 1;
  return { val: phi, phi, excess, T: P(p, 'T', 300) };
}

function motorDcEval(p) {
  // Steady separately excited machine, normalized Ra=1 Ω, K=1. Chapman.
  // T=K Ia, Ea=K ω, V=Ea+Ia Ra.
  const V = P(p, 'V', 0);
  const TL = P(p, 'TL', 0);
  const omega = V - TL;
  return { val: omega, omega, I: TL };
}

function motorIndEval(p) {
  // 4-pole synchronous speed n_s=120 f / 4. Chapman. Slip is not a catalog knob.
  const f = P(p, 'f', 50);
  const V = P(p, 'V', 0);
  const ns = 120 * f / 4;
  return { val: ns, ns, V };
}

function motorSyncEval(p) {
  // P ∝ Ea sinδ with Ea∝If, Xs=V=1 in per-unit. Chapman.
  const If = P(p, 'If', 1);
  const delta = P(p, 'delta', 0) * Math.PI / 180;
  const Ppu = If * Math.sin(delta);
  return { val: Ppu, Ppu };
}

function transformerEval(p) {
  // Ideal transformer V2/V1=1/a, I2/I1=a. load is per-unit secondary current. Chapman.
  const a = P(p, 'a', 1);
  const load = P(p, 'load', 0);
  const ratio = Math.abs(a) < 1e-9 ? 0 : 1 / a;
  return { val: ratio, ratio, Ipu: load };
}

function buckEval(p) {
  // Erickson: ideal buck Vout/Vin=D. Ripple factor D(1−D)/fs with L=1 H.
  const fs = pos(P(p, 'fs', 1000), 1e-9);
  const D = clamp(P(p, 'duty', 0.5), 0, 1);
  const ripple = D * (1 - D) / fs;
  return { val: D, duty: D, ripple };
}

function powerflowEval(p) {
  // DC power flow on a radial feeder, X=0.1 pu per branch, equal bus loads. Glover / Bergen.
  const n = Math.max(2, Math.min(40, Math.round(P(p, 'n', 3))));
  const load = P(p, 'load', 0);
  let theta = 0;
  for (let k = 1; k < n; k += 1) {
    const flow = (n - k) * load;
    theta += flow * 0.1;
  }
  return { val: theta, theta, Ptot: n * load };
}

function swingEval(p) {
  // Classical swing during a bolted fault: Pe=0, Pm=0.8, M=1, δ(0)=asin(Pm).
  // Glover, Power System Analysis. fault=0 leaves δ at the pre-fault angle.
  const fault = P(p, 'fault', 0);
  const clear = Math.max(0, P(p, 'clear', 0));
  const d0 = Math.asin(0.8);
  const delta = fault > 0 ? d0 + 0.4 * clear * clear : d0;
  return { val: delta, delta };
}

function renewableEval(p) {
  // Stated coefficients, not a measured plant: η_pv=0.2 on 1 m^2; wind Cp=0.4, A=1, ρ=1.225.
  // Betz limit is 16/27≈0.593; Cp is below it. Manwell / Duffie.
  const irr = Math.max(0, P(p, 'irr', 0));
  const wind = Math.max(0, P(p, 'wind', 0));
  const Ppv = irr * 0.2;
  const Pwind = 0.5 * 1.225 * 1 * wind ** 3 * 0.4;
  return { val: Ppv, Ppv, Pwind };
}

function storageEval(p) {
  const E = P(p, 'E', 0);
  const power = pos(P(p, 'P', 1), 1e-9);
  const hours = E / power;
  return { val: hours, hours };
}

function cstrEval(p) {
  // Fogler. Isothermal first-order. τ=V/v. X_cstr=kτ/(1+kτ), X_pfr=1−e^{−kτ}.
  const V = Math.max(0, P(p, 'V', 0));
  const v = pos(P(p, 'v', 1), 1e-12);
  const k = Math.max(0, P(p, 'k', 0));
  const tau = V / v;
  const kt = k * tau;
  const Xc = kt / (1 + kt);
  const Xp = 1 - Math.exp(-kt);
  return { val: Xc, Xc, Xp };
}

function fenskeEval(p) {
  // Fenske Nmin for a stated binary pair α=2.5, xD=0.95, xB=0.05. McCabe, Smith & Harriott.
  // feed/N is the relative feed stage.
  const N = pos(P(p, 'N', 1), 1e-9);
  const feed = P(p, 'feed', 1);
  const xD = 0.95;
  const xB = 0.05;
  const alpha = 2.5;
  const Nmin = Math.log((xD / (1 - xD)) * ((1 - xB) / xB)) / Math.log(alpha);
  return { val: feed / N, feedFrac: feed / N, Nmin };
}

function absorbEval(p) {
  // One equilibrium stage, m=1, so A=L/G and the absorbed fraction is A/(A+1). King / McCabe.
  const A = Math.max(0, P(p, 'LGq', 0));
  const frac = A / (1 + A);
  return { val: frac, frac, T: P(p, 'T', 300) };
}

function extractEval(p) {
  // Kremser, extraction factor S, K=1. McCabe, Smith & Harriott.
  const N = Math.max(0, Math.round(P(p, 'stages', 1)));
  const S = pos(P(p, 'S', 1), 1e-9);
  let frac;
  if (Math.abs(S - 1) < 1e-8) frac = N / (N + 1);
  else {
    const Sp = S ** (N + 1);
    frac = (Sp - S) / (Sp - 1);
  }
  return { val: finiteOr(frac), frac: finiteOr(frac) };
}

function pinchEval(p) {
  // Linnhoff pinch: UA scale Q/ΔT_min when ΔT_min is the approach.
  const Q = P(p, 'Q', 0);
  const dT = pos(P(p, 'dT', 1), 1e-9);
  return { val: Q / dT, UA: Q / dT };
}

function dryingEval(p) {
  // Antoine for water, P in mmHg, T in °C: A=8.07131, B=1730.63, C=233.426 (1–100 °C set).
  // Driving force p_sat(1−RH). Outside 1–100 °C this is the same fit continued, not a new correlation.
  const TK = P(p, 'T', 330);
  const RH = clamp(P(p, 'RH', 0), 0, 1);
  const TC = TK - 273.15;
  const logP = 8.07131 - 1730.63 / (TC + 233.426);
  const psat = 10 ** logP;
  const drive = psat * (1 - RH);
  return { val: finiteOr(drive), drive: finiteOr(drive) };
}

function fluidbedEval(p) {
  // Wen & Yu, AIChE J. 12:610 (1966). Air, ρs=2500 kg/m^3 sand, dp in μm.
  const dp = pos(P(p, 'dp', 50), 1e-6) * 1e-6;
  const Ug = P(p, 'Ug', 0);
  const rhoG = 1.2;
  const mu = 1.81e-5;
  const rhoS = 2500;
  const Ar = (dp ** 3) * rhoG * (rhoS - rhoG) * G / (mu * mu);
  const ReMf = Math.sqrt(33.7 ** 2 + 0.0408 * Ar) - 33.7;
  const Umf = ReMf * mu / (rhoG * dp);
  return { val: Umf, Umf, above: Ug > Umf ? 1 : 0 };
}

function crystalEval(p) {
  // Mullin: thermodynamic driving force ln(S). No kinetic prefactor is supplied.
  const S = pos(P(p, 'S', 1), 1e-9);
  return { val: Math.log(S), lnS: Math.log(S), T: P(p, 'T', 300) };
}

// --- discrete algorithms -------------------------------------------------

function insertionComps(n, sortedness) {
  const N = Math.max(1, Math.min(256, Math.round(n)));
  const a = [];
  for (let i = 0; i < N; i += 1) a.push(i);
  const rev = clamp(Math.round((1 - clamp(sortedness, 0, 1)) * N), 0, N);
  for (let i = 0, j = rev - 1; i < j; i += 1, j -= 1) {
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  let comps = 0;
  for (let i = 1; i < N; i += 1) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0) {
      comps += 1;
      if (a[j] <= key) break;
      a[j + 1] = a[j];
      j -= 1;
    }
    a[j + 1] = key;
  }
  return comps;
}

function searchProbes(n, strategy) {
  const N = Math.max(1, Math.round(n));
  const s = Math.round(strategy);
  if (s <= 0) return N;
  if (s === 1) return Math.floor(Math.log2(N)) + 1;
  if (N < 3) return 1;
  return Math.floor(Math.log2(Math.log2(N))) + 1;
}

function bfsDist(n, pEdge) {
  const N = Math.max(2, Math.min(48, Math.round(n)));
  const extras = clamp(Math.floor(Math.max(0, pEdge) * (N - 2)), 0, N - 2);
  const adj = Array.from({ length: N }, () => []);
  const link = (a, b) => {
    adj[a].push(b);
    adj[b].push(a);
  };
  for (let i = 0; i < N - 1; i += 1) link(i, i + 1);
  for (let i = 0; i < extras; i += 1) link(i, i + 2);
  const dist = new Array(N).fill(-1);
  dist[0] = 0;
  const q = [0];
  for (let qi = 0; qi < q.length; qi += 1) {
    const u = q[qi];
    for (const v of adj[u]) {
      if (dist[v] >= 0) continue;
      dist[v] = dist[u] + 1;
      q.push(v);
    }
  }
  return dist[N - 1];
}

function dijkstraDist(n, wSpread) {
  const N = Math.max(2, Math.min(48, Math.round(n)));
  const w = Math.max(0, wSpread);
  const dist = new Array(N).fill(Infinity);
  const used = new Array(N).fill(false);
  dist[0] = 0;
  for (let iter = 0; iter < N; iter += 1) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < N; i += 1) {
      if (!used[i] && dist[i] < best) {
        best = dist[i];
        u = i;
      }
    }
    if (u < 0) break;
    used[u] = true;
    if (u + 1 < N) dist[u + 1] = Math.min(dist[u + 1], dist[u] + w);
  }
  return finiteOr(dist[N - 1], 0);
}

function mstWeight(n, pEdge) {
  const N = Math.max(2, Math.min(40, Math.round(n)));
  const extras = clamp(Math.floor(Math.max(0, pEdge) * (N - 2)), 0, N - 2);
  const edges = [];
  for (let i = 0; i < N - 1; i += 1) edges.push([3, i, i + 1]);
  for (let i = 0; i < extras; i += 1) edges.push([1, i, i + 2]);
  edges.sort((a, b) => a[0] - b[0]);
  const parent = Array.from({ length: N }, (_, i) => i);
  const find = (x) => {
    let r = x;
    while (parent[r] !== r) r = parent[r];
    let y = x;
    while (parent[y] !== r) {
      const nxp = parent[y];
      parent[y] = r;
      y = nxp;
    }
    return r;
  };
  let total = 0;
  let used = 0;
  for (const [w, a, b] of edges) {
    const pa = find(a);
    const pb = find(b);
    if (pa === pb) continue;
    parent[pa] = pb;
    total += w;
    used += 1;
    if (used === N - 1) break;
  }
  return total;
}

function kmpComparisons(m, n) {
  const M = Math.max(1, Math.min(48, Math.round(m)));
  const N = Math.max(1, Math.min(500, Math.round(n)));
  const pat = new Array(M);
  for (let i = 0; i < M; i += 1) pat[i] = i === M - 1 ? 1 : 0;
  const text = new Array(N).fill(0);
  const pi = new Array(M).fill(0);
  let comps = 0;
  let len = 0;
  for (let i = 1; i < M; i += 1) {
    while (len > 0 && pat[len] !== pat[i]) {
      comps += 1;
      len = pi[len - 1];
    }
    comps += 1;
    if (pat[len] === pat[i]) {
      len += 1;
      pi[i] = len;
    } else pi[i] = 0;
  }
  let q = 0;
  for (let i = 0; i < N; i += 1) {
    while (q > 0 && pat[q] !== text[i]) {
      comps += 1;
      q = pi[q - 1];
    }
    comps += 1;
    if (pat[q] === text[i]) q += 1;
    if (q === M) q = pi[q - 1];
  }
  return comps;
}

function knapsack(n, cap) {
  const N = Math.max(1, Math.min(32, Math.round(n)));
  const C = Math.max(0, Math.min(80, Math.round(cap)));
  const dp = new Array(C + 1).fill(0);
  for (let i = 0; i < N; i += 1) {
    const w = (i % 5) + 1;
    const v = (i % 3) + 1;
    for (let c = C; c >= w; c -= 1) dp[c] = Math.max(dp[c], dp[c - w] + v);
  }
  return dp[C];
}

function treeHeights(n, order) {
  const N = Math.max(1, Math.round(n));
  const t = Math.max(2, Math.round(order));
  const hBst = N - 1;
  const hAvl = Math.ceil(Math.log2(N + 1));
  const hB = Math.ceil(Math.log((N + 1) / 2) / Math.log(t));
  return { hBst, hAvl, hB: finiteOr(hB) };
}

function heapComps(n) {
  const N = Math.max(1, Math.min(300, Math.round(n)));
  const a = [];
  for (let i = 0; i < N; i += 1) a.push(N - i);
  let comps = 0;
  const sift = (start, heapN) => {
    let i = start;
    while (true) {
      const left = 2 * i + 1;
      const right = left + 1;
      let s = i;
      if (left < heapN) {
        comps += 1;
        if (a[left] > a[s]) s = left;
      }
      if (right < heapN) {
        comps += 1;
        if (a[right] > a[s]) s = right;
      }
      if (s === i) break;
      const tmp = a[i];
      a[i] = a[s];
      a[s] = tmp;
      i = s;
    }
  };
  for (let i = Math.floor(N / 2) - 1; i >= 0; i -= 1) sift(i, N);
  return comps;
}

function ufOps(n) {
  const N = Math.max(1, Math.min(400, Math.round(n)));
  const parent = Array.from({ length: N }, (_, i) => i);
  const rank = new Array(N).fill(0);
  let ops = 0;
  const find = (x) => {
    let r = x;
    while (parent[r] !== r) {
      ops += 1;
      r = parent[r];
    }
    let y = x;
    while (parent[y] !== r) {
      const nxt = parent[y];
      parent[y] = r;
      y = nxt;
      ops += 1;
    }
    return r;
  };
  for (let i = 0; i < N - 1; i += 1) {
    const a = find(i);
    const b = find(i + 1);
    if (a === b) continue;
    if (rank[a] < rank[b]) parent[a] = b;
    else if (rank[a] > rank[b]) parent[b] = a;
    else {
      parent[b] = a;
      rank[a] += 1;
    }
  }
  return ops;
}

function cacheHitRate(cap, block, assoc) {
  const B = Math.max(1, Math.round(block));
  const A = Math.max(1, Math.round(assoc));
  const bytes = Math.max(B * A, Math.round(cap));
  const sets = Math.max(1, Math.floor(bytes / (B * A)));
  const lines = sets * A;
  const nRef = Math.min(2048, Math.max(1, lines * B));
  const slots = Array.from({ length: sets }, () => []);
  let hits = 0;
  for (let addr = 0; addr < nRef; addr += 1) {
    const blockId = Math.floor(addr / B);
    const set = blockId % sets;
    const tag = Math.floor(blockId / sets);
    const slot = slots[set];
    const idx = slot.indexOf(tag);
    if (idx >= 0) {
      hits += 1;
      slot.splice(idx, 1);
      slot.push(tag);
    } else {
      if (slot.length >= A) slot.shift();
      slot.push(tag);
    }
  }
  return hits / nRef;
}

function branchMisrate(hist, table) {
  // Smith 2-bit counter. Hennessy & Patterson.
  // 64 phase-shifted loops of H taken branches and one not-taken.
  // The counter index is the PC modulo the table, so a small table aliases.
  const H = Math.max(1, Math.min(32, Math.round(hist)));
  const T = Math.max(1, Math.min(4096, Math.round(table)));
  const sites = 64;
  const period = H + 1;
  const reps = 4;
  const ctr = new Array(T).fill(1);
  let mis = 0;
  let n = 0;
  for (let rep = 0; rep < reps; rep += 1) {
    for (let step = 0; step < period; step += 1) {
      for (let pc = 0; pc < sites; pc += 1) {
        const taken = ((step + pc) % period) !== H;
        const idx = pc % T;
        const pred = ctr[idx] >= 2;
        if (pred !== taken) mis += 1;
        ctr[idx] = taken ? Math.min(3, ctr[idx] + 1) : Math.max(0, ctr[idx] - 1);
        n += 1;
      }
    }
  }
  return mis / n;
}

function zipfEntropy(dict) {
  const n = Math.max(1, Math.min(512, Math.round(dict)));
  let z = 0;
  for (let i = 1; i <= n; i += 1) z += 1 / i;
  let H = 0;
  for (let i = 1; i <= n; i += 1) {
    const prob = 1 / (i * z);
    H -= prob * Math.log2(prob);
  }
  return H;
}

function kmeansInertia(k, metric) {
  const pts = [0, 1, 2, 3, 10, 11, 12, 13];
  const K = Math.max(1, Math.min(pts.length, Math.round(k)));
  const centers = [];
  for (let i = 0; i < K; i += 1) {
    centers.push(pts[Math.floor((i * (pts.length - 1)) / Math.max(1, K - 1))]);
  }
  const assign = new Array(pts.length).fill(0);
  for (let iter = 0; iter < 24; iter += 1) {
    for (let i = 0; i < pts.length; i += 1) {
      let best = 0;
      let bd = Infinity;
      for (let c = 0; c < K; c += 1) {
        const d = Math.abs(pts[i] - centers[c]);
        const cost = metric >= 1 ? d : d * d;
        if (cost < bd) {
          bd = cost;
          best = c;
        }
      }
      assign[i] = best;
    }
    for (let c = 0; c < K; c += 1) {
      const mem = [];
      for (let i = 0; i < pts.length; i += 1) if (assign[i] === c) mem.push(pts[i]);
      if (!mem.length) continue;
      if (metric >= 1) {
        mem.sort((a, b) => a - b);
        centers[c] = mem[Math.floor((mem.length - 1) / 2)];
      } else centers[c] = mem.reduce((s, v) => s + v, 0) / mem.length;
    }
  }
  let inertia = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const d = pts[i] - centers[assign[i]];
    inertia += metric >= 1 ? Math.abs(d) : d * d;
  }
  return inertia;
}

function pcaFraction(k, nn) {
  const n = Math.max(2, Math.min(40, Math.round(nn)));
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  let mx = 0;
  let my = 0;
  const xs = [];
  const ys = [];
  for (let i = 1; i <= n; i += 1) {
    xs.push(i);
    ys.push(0.2 * i + ((i % 3) - 1));
    mx += i;
    my += ys[ys.length - 1];
  }
  mx /= n;
  my /= n;
  for (let i = 0; i < n; i += 1) {
    const x = xs[i] - mx;
    const y = ys[i] - my;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  sxx /= n;
  syy /= n;
  sxy /= n;
  const tr = sxx + syy;
  const disc = Math.sqrt(Math.max(0, (sxx - syy) ** 2 + 4 * sxy * sxy));
  const l1 = (tr + disc) / 2;
  const kk = Math.max(1, Math.min(2, Math.round(k)));
  const kept = kk >= 2 ? tr : l1;
  return tr > 0 ? kept / tr : 0;
}

function nnForward(layers, width, act) {
  // Fixed init 0.1, input 1. Not a trained network and not a dataset.
  const L = Math.max(1, Math.min(8, Math.round(layers)));
  const W = Math.max(1, Math.min(48, Math.round(width)));
  let a = 1;
  for (let i = 0; i < L; i += 1) {
    const z = clamp(0.1 * W * a, -40, 40);
    if (act < 0.5) a = Math.max(0, z);
    else if (act < 1.5) a = Math.tanh(z);
    else if (act < 2.5) a = 1 / (1 + Math.exp(-z));
    else a = z;
  }
  return a;
}

function caPopulation(rule, seed) {
  // Wolfram elementary CA, width 24, 8 steps, periodic.
  const W = 24;
  let cur = new Array(W).fill(0);
  const s = Math.round(Math.abs(seed)) || 1;
  for (let i = 0; i < 8; i += 1) cur[8 + i] = (s >> i) & 1;
  const r = Math.round(rule) & 255;
  for (let step = 0; step < 8; step += 1) {
    const nxt = new Array(W).fill(0);
    for (let i = 0; i < W; i += 1) {
      const left = cur[(i + W - 1) % W];
      const mid = cur[i];
      const right = cur[(i + 1) % W];
      const idx = (left << 2) | (mid << 1) | right;
      nxt[i] = (r >> idx) & 1;
    }
    cur = nxt;
  }
  return cur.reduce((s0, v) => s0 + v, 0);
}

function sandTopples(prob, thresh) {
  // 1D abelian sandpile. Height > threshold sends one grain to each neighbor.
  const n = 16;
  const h = new Array(n).fill(0);
  const T = Math.max(1, Math.round(thresh));
  const openN = clamp(Math.floor(clamp(prob, 0, 1) * n), 0, n);
  for (let i = 0; i < openN; i += 1) h[i] = T;
  h[0] += 1;
  let topples = 0;
  for (let guard = 0; guard < 400; guard += 1) {
    let moved = false;
    for (let i = 0; i < n; i += 1) {
      if (h[i] > T) {
        h[i] -= 2;
        if (i > 0) h[i - 1] += 1;
        if (i < n - 1) h[i + 1] += 1;
        topples += 1;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return topples;
}

function binaryEntropy(prob) {
  const p0 = clamp(prob, 0, 1);
  if (p0 <= 0 || p0 >= 1) return 0;
  return -p0 * Math.log2(p0) - (1 - p0) * Math.log2(1 - p0);
}

function fcfsWait(arrival, burst) {
  // Silberschatz. Four jobs, arrival i*arrival, common burst.
  const n = 4;
  const b = Math.max(0, burst);
  const gap = Math.max(0, arrival);
  let time = 0;
  let wait = 0;
  for (let i = 0; i < n; i += 1) {
    const arr = i * gap;
    if (time < arr) time = arr;
    wait += time - arr;
    time += b;
  }
  return wait / n;
}

function tcpMbps(bw, rttMs, loss) {
  // Mathis et al., CCR 1997: rate ≈ (MSS/RTT) sqrt(3/(2p)), MSS=1460 bytes.
  // bw is compared in Mbps. loss≤0 returns the bandwidth cap (no loss term).
  if (!(loss > 0)) return bw;
  const rtt = Math.max(rttMs, 0.1) / 1000;
  const mssBits = 1460 * 8;
  const mathis = (mssBits / rtt) * Math.sqrt(1.5 / loss) / 1e6;
  return Math.min(bw, mathis);
}

const BUILDERS = {
  projectile: (spec) => algebraic(spec, {
    equation: 'x=v0 cosθ t, y=v0 sinθ t−½ g t²; linear drag k=b/m',
    assumptions: 'Plane motion. k=0 is the vacuum parabola. k>0 is linear drag with k=b/m. The curve is not stopped at y=0.',
    initial: ['v0', 'theta'],
    rows: [['y', 'y', 'm'], ['x', 'x', 'm'], ['vx', 'vx', 'm/s'], ['vy', 'vy', 'm/s']],
    eval: projectileEval,
  }),
  inclined: (spec) => algebraic(spec, {
    equation: 'a=g(sinθ−μ cosθ), g=9.81',
    assumptions: 'Constant g=9.81 m/s². +s is down the plane. Friction points up the plane, which is the catalog formula. N=m g cosθ.',
    initial: ['v0'],
    rows: [['a', 'a', 'm/s²'], ['v', 'v', 'm/s'], ['s', 's', 'm'], ['N', 'N', 'N']],
    eval: inclinedEval,
  }),
  atwood: (spec) => algebraic(spec, {
    equation: 'a=(m1−m2)/(m1+m2)·g, m1=mRatio, m2=1 kg',
    assumptions: 'Ideal vertical Atwood machine, g=9.81. μ does not enter: a vertical string has no surface for Coulomb friction.',
    rows: [['a', 'a', 'm/s²'], ['m1', 'm1', 'kg'], ['m2', 'm2', 'kg']],
    eval: (p) => atwoodEval(p),
  }),
  circular: (spec) => algebraic(spec, {
    equation: 'a=ω² r',
    assumptions: 'Uniform circular motion.',
    rows: [['a', 'ac', 'm/s²'], ['x', 'x', 'm'], ['y', 'y', 'm']],
    eval: circularEval,
  }),
  'rigid-plane': (spec) => algebraic(spec, {
    equation: 'I α = torque; rolling a=g sinθ/(1+I/(m r²)) with m=r=1',
    assumptions: 'Goldstein rigid body. Slope is in degrees. I is about the center. No slip: a=g sinθ / (1+I).',
    rows: [['a', 'a', 'm/s²']],
    eval: (p) => {
      const I = Math.max(0, P(p, 'I', 0.5));
      const slope = P(p, 'slope', 0) * Math.PI / 180;
      const a = G * Math.sin(slope) / (1 + I);
      return { val: a, a };
    },
  }),
  collision: (spec) => algebraic(spec, {
    equation: 'v1n=(m1−e m2)/(m1+m2)·u1n, v2n=m1(1+e)/(m1+m2)·u1n',
    assumptions: 'm2=1, u1=1, u2=0. e is the normal restitution. Tangential velocity is unchanged. angle is the impact normal.',
    rows: [['v1', 'v1', 'm/s'], ['v2', 'v2', 'm/s'], ['e', 'e']],
    eval: (p) => collisionEval(p),
  }),
  'variable-mass': (spec) => algebraic(spec, {
    equation: 'v=−u ln(m/m0), m0=1 kg, a(0)=u ṁ/m0',
    assumptions: 'Tsiolkovsky, no gravity, no external force. ṁ is the propellant mass-loss rate. m is held at or above 0.05 kg.',
    rows: [['a0', 'a0', 'm/s²'], ['v', 'v', 'm/s'], ['m', 'm', 'kg']],
    eval: rocketEval,
  }),
  noninertial: (spec) => algebraic(spec, {
    equation: 'a=a_frame−2 ω×v, v0=(1,0) m/s',
    assumptions: 'Horizontal frame. ω is vertical. The initial velocity is 1 m/s along x so the Coriolis term is defined.',
    rows: [['ay', 'ay', 'm/s²'], ['ax', 'ax', 'm/s²'], ['|a|', 'aMag', 'm/s²']],
    eval: (p) => noninertialEval(p),
  }),
  'pendulum-chain': (spec) => algebraic(spec, {
    equation: "θ''=−(g/L) sinθ",
    assumptions: 'Simple pendulum. Mass cancels in the acceleration and remains in the energy. g=9.81.',
    initial: ['theta0'],
    rows: [['α', 'alpha', 'rad/s²'], ['θ', 'thetaDeg', '°'], ['E', 'E', 'J']],
    reset: pendulumReset,
    integrate: true,
    eval: pendulumEval,
  }),
  orbit: (spec) => algebraic(spec, {
    equation: 'a=M/r² (G=1); r_a=r_p(1+e)/(1−e) for e<1',
    assumptions: 'G=1. a_c uses r0. e_osc is the osculating eccentricity of a perpendicular launch at speed v0. r_a uses the eccentricity knob with periapsis r0.',
    initial: ['v0', 'r0'],
    rows: [['a', 'ac'], ['e_osc', 'eOsc'], ['r_a', 'rA'], ['v_peri', 'vPeri']],
    eval: (p) => orbitEval(p),
  }),
  sho: (spec) => algebraic(spec, {
    equation: "x''=−(k/m) x",
    assumptions: 'Closed form x=x0 cos(ω t), ω=sqrt(k/m), from t=0.',
    initial: ['x0'],
    rows: [['a', 'a', 'm/s²'], ['x', 'x', 'm'], ['ω', 'omega', 'rad/s']],
    eval: shoEval,
  }),
  damped: (spec) => algebraic(spec, {
    equation: 'm x\'\'+c x\'+k x=0, m=1, x(0)=1, v(0)=0',
    assumptions: 'Mass is 1 kg. ζ=c/(2√k). The closed form covers under-, critical, and over-damping.',
    rows: [['ζ', 'zeta'], ['x', 'x', 'm'], ['ω0', 'omega0', 'rad/s']],
    eval: dampedEval,
  }),
  forced: (spec) => algebraic(spec, {
    equation: 'x\'\'+c x\'+x=F0 cos(2π f t), m=k=1',
    assumptions: 'Steady-state amplitude. ω0=1 because k=m=1. fDrive is in hertz.',
    rows: [['A', 'A', 'm'], ['φ', 'phi', 'rad']],
    eval: (p) => forcedEval(p),
  }),
  coupled: (spec) => algebraic(spec, {
    equation: 'x_i\'\'=−x_i+κ(x_{i−1}−2x_i+x_{i+1}), fixed ends',
    assumptions: 'Unit on-site springs. Highest-mode ω^2=1+4κ sin^2(q/2), q=Nπ/(N+1).',
    rows: [['ω_max', 'omegaMax', 'rad/s'], ['a1', 'a1', 'm/s²'], ['N', 'N']],
    eval: (p) => coupledEval(p),
  }),
  'nonlinear-osc': (spec) => algebraic(spec, {
    equation: "x''+x+β x³=F cos(t), x(0)=1, v(0)=0",
    assumptions: 'Undamped driven Duffing with ω=1. No van der Pol term: the knobs are β and the drive.',
    rows: [['a', 'a'], ['x', 'x'], ['v', 'v']],
    reset: duffingReset,
    integrate: true,
    eval: duffingEval,
  }),
  wave1d: (spec) => algebraic(spec, {
    equation: 'y=sin(kx−ωt), ω=2πf, k=ω/c, A=1',
    assumptions: 'Unit amplitude. λ=c/f.',
    rows: [['λ', 'lam'], ['k', 'k'], ['y(1)', 'yProbe']],
    eval: wave1dEval,
  }),
  wave2d: (spec) => algebraic(spec, {
    equation: 'c=√(T/ρ), ω_11=π c √2 on the unit square',
    assumptions: 'Linear membrane, mode (1,1). Pain.',
    rows: [['c', 'c'], ['ω', 'omega', 'rad/s'], ['y', 'yMid']],
    eval: wave2dEval,
  }),
  interfere: (spec) => algebraic(spec, {
    equation: 'I/I0=cos²(φ/2), β=λ/d',
    assumptions: 'Equal amplitudes. On-axis phase is the phi knob. Screen distance L=1 for the fringe spacing.',
    rows: [['I', 'I'], ['β', 'beta']],
    eval: (p) => interfereEval(p),
  }),
  diffract: (spec) => algebraic(spec, {
    equation: 'y_min=λ L/a',
    assumptions: 'Paraxial single-slit first minimum. Same length unit for a, λ, and L.',
    rows: [['y1', 'yMin'], ['β', 'beta']],
    eval: (p) => diffractEval(p),
  }),
  doppler: (spec) => algebraic(spec, {
    equation: "f'/f=(1+vo cosθ)/(1−vs cosθ)",
    assumptions: 'vs and vo are fractions of the wave speed. Positive vs is toward the observer. Positive vo is toward the source.',
    rows: [['f\'/f', 'ratio']],
    eval: (p) => dopplerEval(p),
  }),
  'ideal-gas': (spec) => algebraic(spec, {
    equation: 'P2/P0=2^{−n}, T2=T0·2^{1−n}',
    assumptions: 'Polytropic ideal gas probed at V/V0=2. Çengel & Boles.',
    rows: [['P2/P0', 'pRatio'], ['T2', 'T2', 'K']],
    eval: (p) => idealGasEval(p),
  }),
  'heat-engine': (spec) => algebraic(spec, {
    equation: 'η_C=1−1/TR, η_Otto=1−r^{1−γ}, γ=1.4',
    assumptions: 'TR=Th/Tc. Otto uses cold air γ=1.4.',
    rows: [['η_C', 'etaC'], ['η_Otto', 'etaO']],
    eval: (p) => heatEngineEval(p),
  }),
  convection: (spec) => algebraic(spec, {
    equation: 'q=h·1 K; Nu=0.664 Re^{1/2} Pr^{1/3}',
    assumptions: 'Newton cooling per kelvin. Blasius flat plate, L=1 m, air ν=1.5e−5, Pr=0.7, k=0.026.',
    rows: [['q', 'q', 'W/m²'], ['h_Bl', 'hBl', 'W/(m²K)']],
    eval: (p) => convectionEval(p),
  }),
  radiation: (spec) => algebraic(spec, {
    equation: 'q=ε σ T⁴',
    assumptions: 'Surface exitance. σ=5.670374419e−8. No incoming irradiation.',
    rows: [['q', 'q', 'W/m²']],
    eval: (p) => radiationEval(p),
  }),
  'kinetic-gas': (spec) => algebraic(spec, {
    equation: 'v_rms=√(3 R T / M)',
    assumptions: 'Ideal gas. mMol is the molar mass in g/mol. R=8.314 J/(mol·K).',
    rows: [['v_rms', 'vrms', 'm/s'], ['v_p', 'vp', 'm/s']],
    eval: (p) => kineticEval(p),
  }),
  brownian: (spec) => algebraic(spec, {
    equation: '<x²>=2 D τ',
    assumptions: 'Ensemble mean-square displacement in one dimension. τ is the time knob. No random path is drawn.',
    rows: [['<x²>', 'msd']],
    eval: (p) => brownianEval(p),
  }),
  ising: (spec) => algebraic(spec, {
    equation: 'm=tanh((4 J m+H)/T)',
    assumptions: 'Mean-field Ising, coordination 4. Negative J is not a staggered antiferromagnet in this scalar equation.',
    rows: [['m', 'm']],
    eval: (p) => isingEval(p),
  }),
  percolation: (spec) => algebraic(spec, {
    equation: 'S=(1+p)/(1−p)',
    assumptions: 'Exact one-dimensional site percolation. Not a 2D random lattice.',
    rows: [['S', 'S']],
    eval: (p) => percolationEval(p),
  }),
  'entropy-mix': (spec) => algebraic(spec, {
    equation: 'Δs/R=−x ln x−(1−x) ln(1−x)',
    assumptions: 'Ideal binary mixture, one mole. Temperature cancels in Δs and remains in Δg=−T Δs.',
    rows: [['Δs/R', 'sOverR'], ['Δg/R', 'gOverR', 'K']],
    eval: (p) => entropyEval(p),
  }),
  electrostatic: (spec) => algebraic(spec, {
    equation: 'E=q/(4 π ε0 r²)',
    assumptions: 'Point charge in SI. r is the geometry knob. Griffiths Ch. 2.',
    rows: [['E', 'E', 'N/C']],
    eval: (p) => coulombEval(p),
  }),
  fieldlines: (spec) => algebraic(spec, {
    equation: 'E_axis=(1/(4πε0)) 2p/r³',
    assumptions: 'Ideal dipole on axis. r is the separation knob. Griffiths Ch. 3.',
    rows: [['E', 'E', 'N/C']],
    eval: (p) => dipoleEval(p),
  }),
  gauss: (spec) => algebraic(spec, {
    equation: 'E(R)=ρ R/(3 ε0)',
    assumptions: 'Uniform ball, field at the surface. Griffiths Ch. 2.',
    rows: [['E', 'E', 'N/C'], ['Q', 'Q', 'C']],
    eval: (p) => gaussEval(p),
  }),
  capacitor: (spec) => algebraic(spec, {
    equation: 'C=ε_r ε0 A/d',
    assumptions: 'Parallel plate. eps is the relative permittivity.',
    rows: [['C', 'C', 'F']],
    eval: (p) => capacitorEval(p),
  }),
  'dc-network': (spec) => algebraic(spec, {
    equation: 'I=E/R',
    assumptions: 'Single-loop Ohm law. Nilsson.',
    rows: [['I', 'I', 'A'], ['V', 'V', 'V']],
    eval: (p) => dcEval(p),
  }),
  rlc: (spec) => algebraic(spec, {
    equation: 'ω0=1/√(LC), α=R/(2L)',
    assumptions: 'Series RLC. wd=sqrt(ω0²−α²) when underdamped, otherwise 0.',
    rows: [['ω0', 'w0', 'rad/s'], ['α', 'alpha', '1/s'], ['ωd', 'wd', 'rad/s']],
    eval: (p) => rlcEval(p),
  }),
  ac: (spec) => algebraic(spec, {
    equation: '|Z|=sec φ for R=1 Ω; L_eq=tanφ / ω',
    assumptions: 'phi is the impedance angle. Frequency enters the inductance that would produce that angle.',
    rows: [['|Z|', 'Z', 'Ω'], ['L_eq', 'Leq', 'H']],
    eval: (p) => acEval(p),
  }),
  magnetostat: (spec) => algebraic(spec, {
    equation: 'B=μ0 I/(2 R)',
    assumptions: 'Center of a current loop. Griffiths Ch. 5.',
    rows: [['B', 'B', 'T']],
    eval: (p) => biotEval(p),
  }),
  lorentz: (spec) => algebraic(spec, {
    equation: 'F_E=q E, r_c=m v/(|q| B), q=m=1',
    assumptions: 'Normalized charge and mass. Magnetic force magnitude is |q| v B for v perpendicular to B.',
    rows: [['F_E', 'FE', 'N'], ['F_B', 'FB', 'N'], ['r_c', 'rC', 'm']],
    eval: (p) => lorentzEval(p),
  }),
  induction: (spec) => algebraic(spec, {
    equation: 'ε=−N dΦ/dt',
    assumptions: 'The dPhi knob is the flux derivative. Griffiths Ch. 7.',
    rows: [['ε', 'emf', 'V']],
    eval: (p) => faradayEval(p),
  }),
  inductance: (spec) => algebraic(spec, {
    equation: 'M=k L',
    assumptions: 'L1=L2=L, so M=k sqrt(L1 L2)=k L.',
    rows: [['M', 'M', 'H']],
    eval: (p) => mutualEval(p),
  }),
  maxwell: (spec) => algebraic(spec, {
    equation: 'λ=c/f',
    assumptions: 'Vacuum plane wave. The cavity comparison uses a 1 m cube and mode index n: f=(c/2)sqrt(1+n²).',
    rows: [['λ', 'lam', 'm'], ['f_cav', 'fCav', 'Hz']],
    eval: (p) => maxwellEval(p),
  }),
  tline: (spec) => algebraic(spec, {
    equation: 'τ=len/c, Z=Z0',
    assumptions: 'Lossless TEM line at vacuum speed. Length is in meters.',
    rows: [['Z0', 'Z0', 'Ω'], ['τ', 'delay', 's']],
    eval: (p) => tlineEval(p),
  }),
  antenna: (spec) => algebraic(spec, {
    equation: 'AF=|cos((2π d+δ)/2)| at endfire',
    assumptions: 'Balanis. len and d are in wavelengths. phi is the inter-element phase in degrees. Element factor (1−cos(π len))² at broadside.',
    rows: [['AF', 'AF'], ['F', 'elem']],
    eval: (p) => antennaEval(p),
  }),
  'geo-optics': (spec) => algebraic(spec, {
    equation: 'n1 sinθ1=n2 sinθ2, n1=1',
    assumptions: 'Snell. tir=1 when the ray is totally reflected. Hecht.',
    rows: [['θ2', 'theta2', '°'], ['TIR', 'tir']],
    eval: (p) => snellEval(p),
  }),
  lens: (spec) => algebraic(spec, {
    equation: '1/u+1/v=1/f',
    assumptions: 'Signed distances as stored. Lateral magnification m=−v/u.',
    rows: [['v', 'v', 'cm'], ['m', 'm'], ['h_i', 'hi', 'cm']],
    eval: (p) => lensEval(p),
  }),
  prism: (spec) => algebraic(spec, {
    equation: 'δ≈(n−1)A',
    assumptions: 'Thin-prism limit, A in degrees. deltaMin is the exact symmetric minimum deviation.',
    rows: [['δ', 'delta', '°'], ['δ_min', 'deltaMin', '°']],
    eval: (p) => prismEval(p),
  }),
  'opt-interfere': (spec) => algebraic(spec, {
    equation: 'β=λ L/d, L=1 m',
    assumptions: 'Young. d is in mm, λ in nm. Hecht.',
    rows: [['β', 'betaMm', 'mm']],
    eval: (p) => optInterfereEval(p),
  }),
  'opt-diffract': (spec) => algebraic(spec, {
    equation: 'y=λ L/a',
    assumptions: 'Fraunhofer slit. a in mm, λ in nm, L in m.',
    rows: [['y', 'yMm', 'mm']],
    eval: (p) => optDiffractEval(p),
  }),
  polarization: (spec) => algebraic(spec, {
    equation: 'I=I0 cos²θ',
    assumptions: 'Malus. I0=1. dphi is retarder phase in degrees and does not change this intensity.',
    rows: [['I', 'I'], ['δ', 'dphi', '°']],
    eval: (p) => malusEval(p),
  }),
  fiber: (spec) => algebraic(spec, {
    equation: 'NA=√(n_core²−n_clad²)',
    assumptions: 'Step-index acceptance. Hecht.',
    rows: [['NA', 'NA'], ['θ_c', 'thetaC', '°']],
    eval: (p) => fiberEval(p),
  }),
  laser: (spec) => algebraic(spec, {
    equation: 'net=g L−loss',
    assumptions: 'g is a gain coefficient (1/m) and loss is a dimensionless single-pass loss. Siegman.',
    rows: [['net', 'net'], ['gL', 'gL']],
    eval: (p) => laserEval(p),
  }),
  nlo: (spec) => algebraic(spec, {
    equation: 'η∝χ² sinc²(Δk/2), L=1',
    assumptions: 'Plane-wave second harmonic, Boyd. L=1 in the knob units.',
    rows: [['η', 'eta']],
    eval: (p) => nloEval(p),
  }),
  qoptics: (spec) => algebraic(spec, {
    equation: 'V=e^{−2r}, n̄=|α|²+sinh² r',
    assumptions: 'Single-mode squeezed state. Gerry & Knight.',
    rows: [['V', 'V'], ['n', 'nbar']],
    eval: (p) => qopticsEval(p),
  }),
  well1d: (spec) => algebraic(spec, {
    equation: 'E1=π²/(2 a²), ℏ=m=1',
    assumptions: 'Infinite square well, n=1. V0 is only a comparison with the finite-well depth.',
    rows: [['E1', 'E1'], ['E1<V0', 'above']],
    eval: (p) => wellEval(p),
  }),
  tunnel: (spec) => algebraic(spec, {
    equation: 'T≈exp(−2 κ w), κ=√(2(V0−E))',
    assumptions: 'Thick-barrier estimate, ℏ=m=1. T=1 when E≥V0. Griffiths QM.',
    rows: [['T', 'T'], ['κ', 'kappa']],
    eval: (p) => tunnelEval(p),
  }),
  qho: (spec) => algebraic(spec, {
    equation: 'E0=ℏω/2, ω_+=ω√(1+coup)',
    assumptions: 'ℏ=1. The coupling raises one normal frequency of two oscillators.',
    rows: [['E0', 'E0'], ['ω+', 'wPlus']],
    eval: (p) => qhoEval(p),
  }),
  hydrogen: (spec) => algebraic(spec, {
    equation: 'E=−13.6 eV/n²',
    assumptions: 'n, l, m are rounded to integers. valid=1 when 0≤l≤n−1 and |m|≤l.',
    rows: [['E', 'E', 'eV'], ['valid', 'valid']],
    eval: (p) => hydrogenEval(p),
  }),
  angmom: (spec) => algebraic(spec, {
    equation: 'g_J=1+[j(j+1)+s(s+1)−l(l+1)]/(2j(j+1))',
    assumptions: 's=1/2 and l=j−1/2. Fine-structure shift is coup·L·S.',
    rows: [['g_J', 'gJ'], ['E_fs', 'Efs']],
    eval: (p) => angmomEval(p),
  }),
  entangle: (spec) => algebraic(spec, {
    equation: 'S=2√(1+C²)',
    assumptions: 'Two-qubit CHSH maximum for concurrence C. The correlator uses the measurement angle.',
    rows: [['S', 'S'], ['E', 'corr']],
    eval: (p) => entangleEval(p),
  }),
  qgate: (spec) => algebraic(spec, {
    equation: 'P(1)=sin²(θ/2)',
    assumptions: 'Ry on |0>. flipped=1 when the control knob is nonzero.',
    rows: [['P1', 'P1'], ['flip', 'flipped']],
    eval: (p) => qgateEval(p),
  }),
  qalgo: (spec) => algebraic(spec, {
    equation: 'P=sin²((2k+1)θ), sinθ=1/√N',
    assumptions: 'Grover on N=2^{nBits} with one marked item. Nielsen & Chuang.',
    rows: [['P', 'prob'], ['N', 'N']],
    eval: (p) => groverEval(p),
  }),
  wavepacket: (spec) => algebraic(spec, {
    equation: 'E=1/(8σ²)+V, σ(t)=σ√(1+(t/(2σ²))²)',
    assumptions: 'Free Gaussian packet plus a constant potential. ℏ=m=1. Griffiths QM.',
    rows: [['E', 'E'], ['σ(t)', 'sigmaT']],
    eval: packetEval,
  }),
  'rel-kin': (spec) => algebraic(spec, {
    equation: 'γ=1/√(1−β²)',
    assumptions: 'Special relativity, French. β is clamped below 1.',
    rows: [['γ', 'gamma'], ['1/γ', 'contract']],
    eval: (p) => relKinEval(p),
  }),
  'rel-dyn': (spec) => algebraic(spec, {
    equation: 'm c²=√(E²−p² c²), c=1',
    assumptions: 'Timelike interval. A spacelike pair reports m=0 and timelike=0.',
    rows: [['m', 'm'], ['timelike', 'timelike']],
    eval: (p) => relDynEval(p),
  }),
  compton: (spec) => algebraic(spec, {
    equation: 'Δλ=λ_C(1−cosθ)',
    assumptions: 'Electron at rest. Δλ is in pm. E is in keV. λ_C=2.42631023867 pm.',
    rows: [['Δλ', 'dLam', 'pm'], ['E\'', 'Ep', 'keV']],
    eval: (p) => comptonEval(p),
  }),
  radioactive: (spec) => algebraic(spec, {
    equation: 'N=N0 e^{−λ t}',
    assumptions: 'Single exponential. Krane. Activity A=λ N.',
    rows: [['N', 'N'], ['A', 'A'], ['t_half', 'half']],
    eval: decayEval,
  }),
  'ideal-fluid': (spec) => algebraic(spec, {
    equation: 'q=½ ρ v², Q=A v, ρ=1000',
    assumptions: 'Water. One section, so the Bernoulli term shown is the dynamic pressure.',
    rows: [['q', 'q', 'Pa'], ['Q', 'Q', 'm³/s']],
    eval: (p) => bernoulliEval(p),
  }),
  viscous: (spec) => algebraic(spec, {
    equation: 'Q=π R⁴ ΔP/(8 μ L), ΔP/L=1; τ=μ U/D',
    assumptions: 'Reference pressure gradient 1 Pa/m. Couette gap equals D.',
    rows: [['Q', 'Q', 'm³/s'], ['τ', 'tau', 'Pa']],
    eval: (p) => poiseuilleEval(p),
  }),
  'boundary-layer': (spec) => algebraic(spec, {
    equation: 'c_f=0.664/√Re, δ/x=5/√Re',
    assumptions: 'Smooth-plate Blasius. rough is ε/L and enters only Re_ε=Re·rough.',
    rows: [['cf', 'cf'], ['δ/x', 'delta'], ['Re_ε', 'ReEps']],
    eval: (p) => blasiusEval(p),
  }),
  turbulence: (spec) => algebraic(spec, {
    equation: 'ν_t=Cμ k²/ε',
    assumptions: 'Cμ and the filter width are the supplied closure parameters. k and ε are not invented.',
    rows: [['Cμ', 'Cmu'], ['Δ', 'Delta']],
    eval: (p) => turbEval(p),
  }),
  multiphase: (spec) => algebraic(spec, {
    equation: 'λ_c=√(σ/(Δρ g))',
    assumptions: 'g=9.81. White capillary length.',
    rows: [['λ_c', 'lam', 'm']],
    eval: (p) => capillaryEval(p),
  }),
  plasma: (spec) => algebraic(spec, {
    equation: 'ω_p=√(n e²/(ε0 m)), ω_c=eB/m',
    assumptions: 'Electron mass. T is in eV for the Debye length. Chen.',
    rows: [['ω_p', 'wp', 'rad/s'], ['ω_c', 'wc', 'rad/s'], ['λ_D', 'lamD', 'm']],
    eval: (p) => plasmaEval(p),
  }),
  supercon: (spec) => algebraic(spec, {
    equation: 'κ=λ/ξ',
    assumptions: 'Ginzburg–Landau. typeII=1 when κ>1/√2. Tinkham.',
    rows: [['κ', 'kappa'], ['II', 'typeII']],
    eval: (p) => superconEval(p),
  }),
  magnetism: (spec) => algebraic(spec, {
    equation: 'kT_C=(2/3) z J S(S+1), z=6, S=1/2',
    assumptions: 'k_B=1. Anisotropy K is reported separately and is not folded into T_C.',
    rows: [['T_C', 'Tc'], ['K', 'K']],
    eval: (p) => magnetismEval(p),
  }),
  semiconductor: (spec) => algebraic(spec, {
    equation: 'V_bi=(kT/q) ln(Nd²/ni²)',
    assumptions: '300 K, Na=Nd, ni=1e10 cm^{−3}. Nd is in cm^{−3}. dE is the band offset in eV.',
    rows: [['Vbi', 'Vbi', 'V'], ['ΔE', 'dE', 'eV']],
    eval: (p) => semiconductorEval(p),
  }),
  topo: (spec) => algebraic(spec, {
    equation: 'σ_xy/(e²/h)=C',
    assumptions: 'Integer quantum Hall. Edge channels equal |C| only when the boundary knob is on.',
    rows: [['σ', 'sigma'], ['edge', 'edge']],
    eval: (p) => topoEval(p),
  }),
  sort: (spec) => algebraic(spec, {
    equation: 'insertion-sort comparisons',
    assumptions: 'CLRS insertion sort. The array is 0..n−1 with a reversed prefix of length (1−sortedness)·n. n is capped at 256.',
    rows: [['comps', 'comps']],
    eval: (p) => {
      const comps = insertionComps(P(p, 'n', 16), P(p, 'sortedness', 0));
      return { val: comps, comps };
    },
  }),
  search: (spec) => algebraic(spec, {
    equation: 'probes: linear n, binary ⌊log2 n⌋+1, interpolation ⌊log2 log2 n⌋+1',
    assumptions: 'collide selects the strategy: 0 linear worst case, 1 binary worst case, 2 interpolation average for uniform keys (CLRS).',
    rows: [['probes', 'probes']],
    eval: (p) => {
      const probes = searchProbes(P(p, 'n', 32), P(p, 'collide', 0));
      return { val: probes, probes };
    },
  }),
  'graph-trav': (spec) => algebraic(spec, {
    equation: 'BFS distance on a path plus p-controlled chords',
    assumptions: 'CLRS BFS. Nodes are capped at 48. Chord i—i+2 exists for the first floor(p(n−2)) vertices.',
    rows: [['dist', 'dist']],
    eval: (p) => {
      const dist = bfsDist(P(p, 'n', 10), P(p, 'p', 0));
      return { val: dist, dist };
    },
  }),
  shortest: (spec) => algebraic(spec, {
    equation: 'Dijkstra on a path of weight wSpread',
    assumptions: 'CLRS Dijkstra. Nonnegative weights. Distance to the last node is (n−1)·w, computed by the algorithm.',
    rows: [['dist', 'dist']],
    eval: (p) => {
      const dist = dijkstraDist(P(p, 'n', 10), P(p, 'wSpread', 1));
      return { val: dist, dist };
    },
  }),
  mst: (spec) => algebraic(spec, {
    equation: 'Kruskal weight',
    assumptions: 'CLRS Kruskal. Path edges weigh 3. Chords i—i+2 weigh 1 for the first floor(p(n−2)) indices. n≤40.',
    rows: [['weight', 'weight']],
    eval: (p) => {
      const weight = mstWeight(P(p, 'n', 12), P(p, 'p', 0));
      return { val: weight, weight };
    },
  }),
  'string-match': (spec) => algebraic(spec, {
    equation: 'KMP comparison count',
    assumptions: 'CLRS KMP. Pattern is a…ab of length m. Text is a…a of length n. Lengths are capped.',
    rows: [['comps', 'comps']],
    eval: (p) => {
      const comps = kmpComparisons(P(p, 'm', 4), P(p, 'n', 50));
      return { val: comps, comps };
    },
  }),
  dp: (spec) => algebraic(spec, {
    equation: '0/1 knapsack',
    assumptions: 'CLRS. Item i has weight (i mod 5)+1 and value (i mod 3)+1. n≤32, capacity≤80.',
    rows: [['value', 'value']],
    eval: (p) => {
      const value = knapsack(P(p, 'n', 8), P(p, 'cap', 10));
      return { val: value, value };
    },
  }),
  'tree-ds': (spec) => algebraic(spec, {
    equation: 'h_BST=n−1, h_AVL=⌈log2(n+1)⌉',
    assumptions: 'Sequential insertion degenerates a BST. AVL height is the balanced bound. B-tree minimum degree is `order` (CLRS).',
    rows: [['h_BST', 'hBst'], ['h_AVL', 'hAvl'], ['h_B', 'hB']],
    eval: (p) => {
      const h = treeHeights(P(p, 'n', 20), P(p, 'order', 2));
      return { val: h.hAvl, ...h };
    },
  }),
  hashtable: (spec) => algebraic(spec, {
    equation: 'E[probes]=1+α/2',
    assumptions: 'CLRS chaining, successful search. α is the load knob. Keys=α·capacity.',
    rows: [['E', 'probes'], ['keys', 'keys']],
    eval: (p) => {
      const cap = Math.max(0, P(p, 'cap', 16));
      const load = Math.max(0, P(p, 'load', 0));
      return { val: 1 + load / 2, probes: 1 + load / 2, keys: load * cap };
    },
  }),
  uf: (spec) => algebraic(spec, {
    equation: 'union-by-rank with path compression',
    assumptions: 'CLRS. Unions join i with i+1. The readout is the parent-access count.',
    rows: [['ops', 'ops']],
    eval: (p) => {
      const ops = ufOps(P(p, 'n', 32));
      return { val: ops, ops };
    },
  }),
  heap: (spec) => algebraic(spec, {
    equation: 'build-heap comparisons',
    assumptions: 'CLRS sift-down heapify of n, n−1, …, 1. n≤300.',
    rows: [['comps', 'comps']],
    eval: (p) => {
      const comps = heapComps(P(p, 'n', 20));
      return { val: comps, comps };
    },
  }),
  segtree: (spec) => algebraic(spec, {
    equation: 'point-query depth = ⌈log2 n⌉',
    assumptions: 'CLRS segment tree. A point query walks one root-to-leaf path.',
    rows: [['depth', 'depth']],
    eval: (p) => {
      const n = Math.max(1, P(p, 'n', 2));
      const depth = Math.ceil(Math.log2(n));
      return { val: depth, depth };
    },
  }),
  fa: (spec) => algebraic(spec, {
    equation: '|δ|=|Q|·|Σ|',
    assumptions: 'Complete DFA. Hopcroft, Motwani, Ullman.',
    rows: [['transitions', 'transitions']],
    eval: (p) => {
      const transitions = Math.round(P(p, 'states', 1)) * Math.round(P(p, 'alpha', 1));
      return { val: transitions, transitions };
    },
  }),
  pda: (spec) => algebraic(spec, {
    equation: '|δ| bound = |Q|·|Γ|·|Σ|, |Σ|=2',
    assumptions: 'Upper bound on a complete PDA transition relation. Not a particular grammar.',
    rows: [['bound', 'bound']],
    eval: (p) => {
      const bound = Math.round(P(p, 'states', 1)) * Math.round(P(p, 'stackA', 1)) * 2;
      return { val: bound, bound };
    },
  }),
  tm: (spec) => algebraic(spec, {
    equation: '|Q|·|Γ|',
    assumptions: 'Sipser. Count of state/symbol pairs, not a universal simulator.',
    rows: [['pairs', 'pairs']],
    eval: (p) => {
      const pairs = Math.round(P(p, 'states', 1)) * Math.round(P(p, 'alpha', 1));
      return { val: pairs, pairs };
    },
  }),
  regex: (spec) => algebraic(spec, {
    equation: 'Thompson NFA states ≈ 2·len+2·complexity',
    assumptions: 'Size of a Thompson NFA for `complexity` alternations plus a literal of length `len`. Hopcroft.',
    rows: [['states', 'states']],
    eval: (p) => {
      const states = 2 * Math.round(P(p, 'len', 1)) + 2 * Math.round(P(p, 'complexity', 1));
      return { val: states, states };
    },
  }),
  grammar: (spec) => algebraic(spec, {
    equation: 'yield=min(steps, size)',
    assumptions: 'A grammar whose productions are each used at most once. The yield grows by one terminal per used production.',
    rows: [['yield', 'yield']],
    eval: (p) => {
      const yieldLen = Math.min(Math.max(0, P(p, 'steps', 0)), Math.max(0, P(p, 'size', 0)));
      return { val: yieldLen, yield: yieldLen };
    },
  }),
  computability: (spec) => algebraic(spec, {
    equation: 'counter halts in `input` steps',
    assumptions: 'Sipser. This is a total counter machine. It does not decide the halting problem. encoding selects a Gödel convention index and is reported as that index.',
    rows: [['steps', 'steps'], ['encoding', 'encoding']],
    eval: (p) => ({
      val: P(p, 'input', 0),
      steps: P(p, 'input', 0),
      encoding: P(p, 'encoding', 0),
    }),
  }),
  complexity: (spec) => algebraic(spec, {
    equation: 'log2(n!) via Stirling',
    assumptions: 'CLRS comparison-sort decision-tree lower bound. Stirling series through the ½ log term.',
    rows: [['bound', 'bound']],
    eval: (p) => {
      const n = Math.max(1, P(p, 'n', 2));
      const bound = n < 2
        ? 0
        : (n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n)) / Math.LN2;
      return { val: bound, bound };
    },
  }),
  ca: (spec) => algebraic(spec, {
    equation: 'elementary CA rule',
    assumptions: 'Wolfram. Width 24, eight steps, periodic boundaries. seed sets the initial bits.',
    initial: ['seed'],
    rows: [['pop', 'pop']],
    eval: (p) => {
      const pop = caPopulation(P(p, 'rule', 0), P(p, 'seed', 1));
      return { val: pop, pop };
    },
  }),
  'ca-app': (spec) => algebraic(spec, {
    equation: '1D sandpile topples',
    assumptions: 'Height above thresh sends one grain to each neighbor. The first floor(p·16) sites start at threshold.',
    rows: [['topples', 'topples']],
    eval: (p) => {
      const topples = sandTopples(P(p, 'p', 0), P(p, 'thresh', 2));
      return { val: topples, topples };
    },
  }),
  'linear-model': (spec) => algebraic(spec, {
    equation: 'β=(Σ x y)/(Σ x²+λ); one GD step β=lr·mean(x y)',
    assumptions: 'Design x=1..8, y=2x. Ridge has no intercept. One gradient step starts at β=0. Not a fitted dataset.',
    rows: [['β_ridge', 'ridge'], ['β_gd', 'gd']],
    eval: (p) => {
      let sxx = 0;
      let sxy = 0;
      for (let i = 1; i <= 8; i += 1) {
        sxx += i * i;
        sxy += i * (2 * i);
      }
      const reg = Math.max(0, P(p, 'reg', 0));
      const lr = P(p, 'lr', 0.1);
      const ridge = sxy / (sxx + reg);
      const gd = lr * (sxy / 8);
      return { val: ridge, ridge, gd };
    },
  }),
  'tree-model': (spec) => algebraic(spec, {
    equation: 'leaves=trees·min(2^{depth}, n_rows)',
    assumptions: 'Capacity of an ensemble, not an accuracy. n_rows=max(2, round(8·sample)). Depth is capped at 8 in the leaf count.',
    rows: [['leaves', 'leaves']],
    eval: (p) => {
      const trees = Math.max(1, Math.round(P(p, 'trees', 1)));
      const depth = Math.max(1, Math.round(P(p, 'depth', 1)));
      const rows = Math.max(2, Math.round(8 * clamp(P(p, 'sample', 1), 0, 1)));
      const leaves = trees * Math.min(2 ** Math.min(depth, 8), rows);
      return { val: leaves, leaves };
    },
  }),
  kernel: (spec) => algebraic(spec, {
    equation: 'k=exp(−γ ‖x−y‖²), ‖x−y‖=1',
    assumptions: 'RBF kernel between two stated points a unit apart. C is the SVM box constraint. Bishop / Schölkopf.',
    rows: [['k', 'k'], ['C', 'C']],
    eval: (p) => {
      const gamma = P(p, 'gamma', 1);
      const Cbox = P(p, 'C', 1);
      const k = Math.exp(-gamma);
      return { val: k, k, C: Cbox };
    },
  }),
  cluster: (spec) => algebraic(spec, {
    equation: 'Lloyd k-means inertia',
    assumptions: 'Eight fixed 1D points. metric 0 is squared distance, metric≥1 is absolute distance with a median update.',
    rows: [['inertia', 'inertia']],
    eval: (p) => {
      const inertia = kmeansInertia(P(p, 'k', 2), P(p, 'metric', 0));
      return { val: inertia, inertia };
    },
  }),
  dimred: (spec) => algebraic(spec, {
    equation: 'PCA retained variance',
    assumptions: '2×2 covariance of a stated cloud. k≥2 keeps both components. nn is the sample count. t-SNE is not computed.',
    rows: [['fraction', 'fraction']],
    eval: (p) => {
      const fraction = pcaFraction(P(p, 'k', 2), P(p, 'nn', 10));
      return { val: fraction, fraction };
    },
  }),
  nn: (spec) => algebraic(spec, {
    equation: 'a ← act(0.1·width·a), input 1',
    assumptions: 'Identical weights 0.1. act 0 ReLU, 1 tanh, 2 sigmoid, else linear. Not a trained model.',
    rows: [['y', 'y']],
    eval: (p) => {
      const y = nnForward(P(p, 'layers', 1), P(p, 'width', 4), P(p, 'act', 0));
      return { val: y, y };
    },
  }),
  conv: (spec) => algebraic(spec, {
    equation: 'MACs=L_out·k·channels, L_out=⌊(8−k)/stride⌋+1',
    assumptions: 'Valid convolution of a length-8 input. No feature values are invented.',
    rows: [['MACs', 'macs']],
    eval: (p) => {
      const k = Math.max(1, Math.round(P(p, 'k', 1)));
      const stride = Math.max(1, Math.round(P(p, 'stride', 1)));
      const ch = Math.max(1, Math.round(P(p, 'ch', 1)));
      const out = Math.max(0, Math.floor((8 - k) / stride) + 1);
      const macs = out * k * ch;
      return { val: macs, macs };
    },
  }),
  attention: (spec) => algebraic(spec, {
    equation: 'softmax(q·k/√d_k)',
    assumptions: 'Vaswani et al. 2017. Two tokens, scores √d_k and 0. Parameter count is heads·d_k.',
    rows: [['w0', 'w0'], ['params', 'params']],
    eval: (p) => {
      const dk = Math.max(1, P(p, 'dk', 1));
      const s0 = Math.sqrt(dk);
      const e0 = Math.exp(s0 - s0);
      const e1 = Math.exp(0 - s0);
      const w0 = e0 / (e0 + e1);
      const params = Math.max(1, Math.round(P(p, 'heads', 1))) * dk;
      return { val: w0, w0, params };
    },
  }),
  rl: (spec) => algebraic(spec, {
    equation: 'V=1/(1−γ)',
    assumptions: 'Sutton & Barto. One-state continuing task with reward 1. One TD step from 0 is the learning rate.',
    rows: [['V', 'V'], ['td', 'td']],
    eval: (p) => {
      const gamma = clamp(P(p, 'gamma', 0.9), 0, 0.999999);
      const V = 1 / (1 - gamma);
      const td = P(p, 'lr', 0);
      return { val: V, V, td };
    },
  }),
  'opt-algo': (spec) => algebraic(spec, {
    equation: 'GD on f=x²/2 with momentum',
    assumptions: 'Eight steps from x=1. Velocity update v←mom·v+∇f, x←x−lr·v.',
    rows: [['x', 'x']],
    eval: (p) => {
      let x = 1;
      let v = 0;
      const lr = P(p, 'lr', 0.1);
      const mom = clamp(P(p, 'mom', 0), 0, 0.999);
      for (let i = 0; i < 8; i += 1) {
        v = mom * v + x;
        x -= lr * v;
        if (!Number.isFinite(x)) {
          x = 0;
          break;
        }
        x = clamp(x, -1e6, 1e6);
      }
      return { val: x, x };
    },
  }),
  evo: (spec) => algebraic(spec, {
    equation: 'deterministic ±mut/i trials on x²',
    assumptions: 'Not a random GA. Offspring are accepted only when the square decreases. Trial count is pop/5, at most 40.',
    rows: [['f', 'f']],
    eval: (p) => {
      let x = 1;
      let f = 1;
      const mut = Math.max(0, P(p, 'mut', 0));
      const trials = Math.max(1, Math.min(40, Math.round(P(p, 'pop', 20) / 5)));
      for (let i = 1; i <= trials; i += 1) {
        const step = mut / i;
        for (const cand of [x + step, x - step]) {
          const fc = cand * cand;
          if (fc < f) {
            f = fc;
            x = cand;
          }
        }
      }
      return { val: f, f };
    },
  }),
  pgm: (spec) => algebraic(spec, {
    equation: 'P=c^{n−1}, c=λ/(1+|λ|)',
    assumptions: 'Koller & Friedman chain rule for a chain that copies its parent with probability c. λ is the params knob.',
    rows: [['P', 'prob']],
    eval: (p) => {
      const nodes = Math.max(1, Math.round(P(p, 'nodes', 2)));
      const lam = P(p, 'params', 0.5);
      const c = Math.abs(lam) / (1 + Math.abs(lam));
      const prob = c ** Math.max(0, nodes - 1);
      return { val: prob, prob };
    },
  }),
  'classical-cipher': (spec) => algebraic(spec, {
    equation: 'shift=keyspace mod 26; bits=log2(keyspace)',
    assumptions: 'Caesar shift on a 26-letter alphabet. The bit count is the key-space logarithm, not an attack.',
    rows: [['shift', 'shift'], ['bits', 'bits']],
    eval: (p) => {
      const keyspace = Math.max(1, P(p, 'keyspace', 26));
      return { val: Math.log2(keyspace), shift: Math.round(keyspace) % 26, bits: Math.log2(keyspace) };
    },
  }),
  'sym-enc': (spec) => algebraic(spec, {
    equation: 'AES-128/192/256 rounds = keyBits/32+6',
    assumptions: 'FIPS-197 round count only when the key size is 128, 192, or 256. Other sizes report 0. No ciphertext is produced. mode is ECB/CBC/CTR as an index.',
    rows: [['rounds', 'rounds'], ['mode', 'mode']],
    eval: (p) => {
      const bits = Math.round(P(p, 'keyBits', 128));
      const rounds = bits === 128 || bits === 192 || bits === 256 ? bits / 32 + 6 : 0;
      return { val: rounds, rounds, mode: P(p, 'mode', 0) };
    },
  }),
  pubkey: (spec) => algebraic(spec, {
    equation: 'c=m^e mod n, toy primes',
    assumptions: 'Classroom RSA. Primes are the largest primes at most 2^{k} and the next lower prime, k=clamp(bits/4,8,16). e=65537, m=42. Not a secure key.',
    rows: [['c', 'c'], ['n', 'n']],
    eval: (p) => {
      const bits = P(p, 'bits', 64);
      const k = clamp(Math.round(bits / 4), 8, 16);
      const hi = primeAtMost(2 ** k);
      const lo = primeAtMost(hi - 1);
      const n = hi * lo;
      const c = modPow(42, 65537, n);
      return { val: c, c, n };
    },
  }),
  hash: (spec) => algebraic(spec, {
    equation: 'FNV-1a 32-bit of len bytes 0x61',
    assumptions: 'Not MD5 or SHA. Public-domain FNV-1a of a repeated letter.',
    rows: [['h', 'h']],
    eval: (p) => {
      const h = fnv1a(P(p, 'len', 16), 0x61);
      return { val: h, h };
    },
  }),
  mac: (spec) => algebraic(spec, {
    equation: 'FNV-1a tag of `msg` bytes set to key mod 256',
    assumptions: 'A teaching tag, not HMAC. Katz & Lindell discuss MAC length; this readout is only the FNV tag.',
    rows: [['tag', 'tag']],
    eval: (p) => {
      const tag = fnv1a(P(p, 'msg', 1), Math.round(P(p, 'key', 0)));
      return { val: tag, tag };
    },
  }),
  'ecc-code': (spec) => algebraic(spec, {
    equation: 'Hamming n=2^m−1, m=K',
    assumptions: 'Binary Hamming code with m parity bits. The rate knob is compared with k/n, k=n−m.',
    rows: [['n', 'n'], ['gap', 'gap']],
    eval: (p) => {
      const m = clamp(Math.round(P(p, 'K', 3)), 2, 12);
      const n = 2 ** m - 1;
      const k = n - m;
      const rateH = k / n;
      const gap = Math.abs(P(p, 'rate', 0) - rateH);
      return { val: n, n, gap };
    },
  }),
  infotheory: (spec) => algebraic(spec, {
    equation: 'H=−p log2 p−(1−p) log2(1−p); C=½ log2(1+snr)',
    assumptions: 'Cover & Thomas. Binary entropy. Real AWGN spectral efficiency at the stated SNR in dB, bandwidth 1 Hz.',
    rows: [['H', 'H', 'bit'], ['C', 'C', 'bit']],
    eval: (p) => {
      const H = binaryEntropy(P(p, 'p', 0.5));
      const snr = 10 ** (P(p, 'snr', 0) / 10);
      const cap = 0.5 * Math.log2(1 + snr);
      return { val: H, H, C: cap };
    },
  }),
  compress: (spec) => algebraic(spec, {
    equation: 'H ≤ L < H+1',
    assumptions: 'Zipf masses ∝1/i. Huffman redundancy is less than 1 bit (Cover & Thomas). n=min(dict,512).',
    rows: [['H', 'H', 'bit'], ['L_hi', 'Lhi', 'bit']],
    eval: (p) => {
      const H = zipfEntropy(P(p, 'dict', 16));
      return { val: H, H, Lhi: H + 1 };
    },
  }),
  zkp: (spec) => algebraic(spec, {
    equation: 'soundness error = 2^{−rounds}',
    assumptions: 'Honest completeness 1 and a public one-bit challenge. Not a production proof system. Goldwasser, Micali, Rackoff.',
    rows: [['ε', 'eps']],
    eval: (p) => {
      const rounds = Math.max(0, Math.round(P(p, 'rounds', 1)));
      const eps = 2 ** (-rounds);
      return { val: eps, eps };
    },
  }),
  sched: (spec) => algebraic(spec, {
    equation: 'FCFS average wait, 4 jobs',
    assumptions: 'Job i arrives at i·arrival and runs for `burst`. Silberschatz.',
    rows: [['wait', 'wait']],
    eval: (p) => {
      const wait = fcfsWait(P(p, 'arrival', 0), P(p, 'burst', 1));
      return { val: wait, wait };
    },
  }),
  mem: (spec) => algebraic(spec, {
    equation: 'compulsory faults = ⌈refs / page⌉',
    assumptions: 'One sequential pass. Each new page faults once. page is the page size in address units.',
    rows: [['faults', 'faults']],
    eval: (p) => {
      const page = pos(P(p, 'page', 1), 1e-9);
      const refs = Math.max(0, P(p, 'refs', 0));
      const faults = Math.ceil(refs / page);
      return { val: faults, faults };
    },
  }),
  deadlock: (spec) => algebraic(spec, {
    equation: "Banker's algorithm, need_i=nProc, available=nRes",
    assumptions: 'Allocation is zero. Each process still needs nProc units of one resource type. Safe when nRes≥nProc.',
    rows: [['safe', 'safe']],
    eval: (p) => {
      const nProc = Math.max(1, Math.round(P(p, 'nProc', 1)));
      const nRes = Math.max(0, Math.round(P(p, 'nRes', 0)));
      const safe = nRes >= nProc ? 1 : 0;
      return { val: safe, safe };
    },
  }),
  fs: (spec) => algebraic(spec, {
    equation: 'blocks=⌈fsize/block⌉',
    assumptions: 'inode direct block count is 12. indirect=1 when more blocks are required. Silberschatz.',
    rows: [['blocks', 'blocks'], ['indirect', 'indirect']],
    eval: (p) => {
      const block = pos(P(p, 'block', 1), 1e-9);
      const blocks = Math.ceil(Math.max(0, P(p, 'fsize', 0)) / block);
      return { val: blocks, blocks, indirect: blocks > 12 ? 1 : 0 };
    },
  }),
  netproto: (spec) => algebraic(spec, {
    equation: 'min(bw, (MSS/RTT) √(3/(2p)))',
    assumptions: 'Mathis et al. 1997, MSS=1460 bytes, bw in Mbps, rtt in ms. Zero loss returns bw.',
    rows: [['rate', 'rate', 'Mbps']],
    eval: (p) => {
      const rate = tcpMbps(P(p, 'bw', 1), P(p, 'rtt', 20), P(p, 'loss', 0));
      return { val: rate, rate };
    },
  }),
  routing: (spec) => algebraic(spec, {
    equation: 'Dijkstra distance (n−1)·cost',
    assumptions: 'Path graph, every hop weighs `cost`. CLRS.',
    rows: [['dist', 'dist']],
    eval: (p) => {
      const dist = dijkstraDist(P(p, 'n', 6), P(p, 'cost', 1));
      return { val: dist, dist };
    },
  }),
  queueing: (spec) => algebraic(spec, {
    equation: 'L=ρ/(1−ρ), ρ=λ/μ',
    assumptions: 'M/M/1, Gross & Harris. L is undefined for ρ≥1 and is reported as 0 with stable=0.',
    rows: [['L', 'L'], ['ρ', 'rho'], ['stable', 'stable']],
    eval: (p) => {
      const lam = Math.max(0, P(p, 'lam', 0));
      const mu = pos(P(p, 'mu', 1), 1e-12);
      const rho = lam / mu;
      const stable = rho < 1 ? 1 : 0;
      const L = stable ? rho / (1 - rho) : 0;
      return { val: L, L, rho, stable };
    },
  }),
  consensus: (spec) => algebraic(spec, {
    equation: 'quorum=⌊n/2⌋+1; Byzantine f=⌊(n−1)/3⌋',
    assumptions: 'fault 0 or 1 uses crash tolerance ⌊(n−1)/2⌋ (Raft majority). fault≥2 uses Byzantine ⌊(n−1)/3⌋ (Lamport).',
    rows: [['quorum', 'quorum'], ['f_max', 'fMax']],
    eval: (p) => {
      const n = Math.max(1, Math.round(P(p, 'n', 3)));
      const fault = P(p, 'fault', 0);
      const quorum = Math.floor(n / 2) + 1;
      const fMax = fault >= 2 ? Math.floor((n - 1) / 3) : Math.floor((n - 1) / 2);
      return { val: quorum, quorum, fMax };
    },
  }),
  gates: (spec) => algebraic(spec, {
    equation: 'AND, OR, XOR of the low bits of combo',
    assumptions: 'Mano. combo is a bit field. The readout is the XOR of bits 0 and 1.',
    rows: [['xor', 'xor'], ['and', 'andv'], ['or', 'orv']],
    eval: (p) => {
      const combo = Math.round(P(p, 'combo', 0));
      const a = combo & 1;
      const b = (combo >> 1) & 1;
      return { val: a ^ b, xor: a ^ b, andv: a & b, orv: a | b };
    },
  }),
  combo: (spec) => algebraic(spec, {
    equation: '(5+3) mod 2^{width}; select bits=⌈log2(inputs)⌉',
    assumptions: 'Width-masked sum of the constants 5 and 3. MUX select width is the ceiling log of the input count.',
    rows: [['sum', 'sum'], ['sel', 'sel']],
    eval: (p) => {
      const width = clamp(Math.round(P(p, 'width', 4)), 1, 30);
      const inputs = Math.max(1, Math.round(P(p, 'inputs', 2)));
      const sum = (5 + 3) % (2 ** width);
      const sel = Math.ceil(Math.log2(inputs));
      return { val: sum, sum, sel };
    },
  }),
  seq: (spec) => algebraic(spec, {
    equation: 'Q=init',
    assumptions: 'D flip-flop holding the initial bit. Mano.',
    initial: ['init'],
    rows: [['Q', 'Q']],
    eval: (p) => {
      const Q = Math.round(P(p, 'init', 0)) ? 1 : 0;
      return { val: Q, Q };
    },
  }),
  reg: (spec) => algebraic(spec, {
    equation: 'states=2^{width}',
    assumptions: 'Width is capped at 40 so the integer stays inside the mantissa.',
    rows: [['states', 'states']],
    eval: (p) => {
      const width = clamp(Math.round(P(p, 'width', 8)), 0, 40);
      const states = 2 ** width;
      return { val: states, states };
    },
  }),
  counter: (spec) => algebraic(spec, {
    equation: 'step ≡ dir (mod modulus)',
    assumptions: 'One count step. dir is the direction knob. The modulus is the design parameter.',
    rows: [['mod', 'mod'], ['step', 'step']],
    eval: (p) => {
      const mod = Math.max(1, Math.round(P(p, 'mod', 2)));
      const dir = Math.round(P(p, 'dir', 1));
      const step = ((dir % mod) + mod) % mod;
      return { val: mod, mod, step };
    },
  }),
  'fsm-ce': (spec) => algebraic(spec, {
    equation: 'transitions=states·alphabet',
    assumptions: 'Complete Moore machine. Hopcroft.',
    rows: [['transitions', 'transitions']],
    eval: (p) => {
      const transitions = Math.round(P(p, 'states', 1)) * Math.round(P(p, 'alpha', 1));
      return { val: transitions, transitions };
    },
  }),
  minimize: (spec) => algebraic(spec, {
    equation: 'onset=min(minterms, 2^{vars})',
    assumptions: 'The onset is the first minterms of a vars-bit space, clipped to the cube. Quine–McCluskey is not run above that count.',
    rows: [['onset', 'onset']],
    eval: (p) => {
      const vars = clamp(Math.round(P(p, 'vars', 2)), 0, 12);
      const onset = Math.min(Math.max(0, Math.round(P(p, 'minterms', 0))), 2 ** vars);
      return { val: onset, onset };
    },
  }),
  pld: (spec) => algebraic(spec, {
    equation: 'connections=inputs·products',
    assumptions: 'PLA crosspoint count. Mano.',
    rows: [['connections', 'connections']],
    eval: (p) => {
      const connections = Math.round(P(p, 'inputs', 1)) * Math.round(P(p, 'products', 1));
      return { val: connections, connections };
    },
  }),
  isa: (spec) => algebraic(spec, {
    equation: 'cycles=nInst, CPI=1',
    assumptions: 'Single-cycle RISC. Addressing-mode count is the addr knob and does not add cycles. Hennessy & Patterson.',
    rows: [['cycles', 'cycles'], ['modes', 'modes']],
    eval: (p) => ({
      val: P(p, 'nInst', 0),
      cycles: P(p, 'nInst', 0),
      modes: P(p, 'addr', 0),
    }),
  }),
  datapath: (spec) => algebraic(spec, {
    equation: 'bits=width, controls=ctrl',
    assumptions: 'The datapath width and the control-signal count are the catalog inputs.',
    rows: [['bits', 'bits'], ['ctrl', 'ctrl']],
    eval: (p) => ({
      val: P(p, 'width', 0),
      bits: P(p, 'width', 0),
      ctrl: P(p, 'ctrl', 0),
    }),
  }),
  pipeline: (spec) => algebraic(spec, {
    equation: 'CPI=1/issue, latency=stages',
    assumptions: 'Ideal pipeline, no hazards. Hennessy & Patterson.',
    rows: [['CPI', 'cpi'], ['latency', 'latency']],
    eval: (p) => {
      const issue = pos(P(p, 'issue', 1), 1e-9);
      const latency = P(p, 'stages', 1);
      return { val: 1 / issue, cpi: 1 / issue, latency };
    },
  }),
  cache: (spec) => algebraic(spec, {
    equation: 'LRU hit rate on a sequential scan',
    assumptions: 'Hennessy & Patterson. Capacity, block, and associativity define the sets. The scan is at most 2048 references.',
    rows: [['hit', 'hit']],
    eval: (p) => {
      const hit = cacheHitRate(P(p, 'cap', 16), P(p, 'block', 4), P(p, 'assoc', 1));
      return { val: hit, hit };
    },
  }),
  vmem: (spec) => algebraic(spec, {
    equation: 'TLB reach=entries·page',
    assumptions: 'Hennessy & Patterson. page and tlb use the catalog units.',
    rows: [['reach', 'reach']],
    eval: (p) => {
      const reach = P(p, 'tlb', 0) * P(p, 'page', 0);
      return { val: reach, reach };
    },
  }),
  branch: (spec) => algebraic(spec, {
    equation: '2-bit counter mispredict rate',
    assumptions: 'Smith 2-bit counters on 64 phase-shifted loops. hist is the taken-run length. A table smaller than 64 aliases PCs.',
    rows: [['mis', 'mis']],
    eval: (p) => {
      const mis = branchMisrate(P(p, 'hist', 2), P(p, 'table', 64));
      return { val: mis, mis };
    },
  }),
  bus: (spec) => algebraic(spec, {
    equation: 'share=bw/masters',
    assumptions: 'Equal share of a stated bandwidth.',
    rows: [['share', 'share']],
    eval: (p) => {
      const masters = pos(P(p, 'masters', 1), 1e-9);
      const share = P(p, 'bw', 0) / masters;
      return { val: share, share };
    },
  }),
  memhier: (spec) => algebraic(spec, {
    equation: 't_stream=capacity/bandwidth, t_rand=latency',
    assumptions: 'Streaming time is size/bandwidth. Random latency is the lat knob.',
    rows: [['t_stream', 'tStream'], ['t_rand', 'tRand']],
    eval: (p) => {
      const tStream = P(p, 'cap', 0) / pos(P(p, 'bw', 1), 1e-9);
      const tRand = P(p, 'lat', 0);
      return { val: tRand, tStream, tRand };
    },
  }),
  multicore: (spec) => algebraic(spec, {
    equation: 'Amdahl S=1/(0.05+0.95/cores); protocol state count',
    assumptions: 'Stated parallel fraction 0.95, not a measured workload. proto 0 MSI (3), 1 MESI (4), 2 MOESI (5), else MESIF (5).',
    rows: [['S', 'S'], ['states', 'states']],
    eval: (p) => {
      const cores = pos(P(p, 'cores', 1), 1e-9);
      const proto = Math.round(P(p, 'proto', 0));
      const table = [3, 4, 5, 5];
      const states = table[clamp(proto, 0, 3)];
      const S = 1 / (0.05 + 0.95 / cores);
      return { val: S, S, states };
    },
  }),
  gpio: (spec) => algebraic(spec, {
    equation: 'mask=1<<priority, sense=trigger',
    assumptions: 'Priority is clamped to 0..15. trig 0 is level, 1 is edge.',
    rows: [['mask', 'mask'], ['sense', 'sense']],
    eval: (p) => {
      const prio = clamp(Math.round(P(p, 'prio', 0)), 0, 15);
      return { val: 1 << prio, mask: 1 << prio, sense: Math.round(P(p, 'trig', 0)) };
    },
  }),
  pwm: (spec) => algebraic(spec, {
    equation: 'f=f_clk/(prescale·period), f_clk=1 MHz',
    assumptions: 'Stated timer clock of 1 MHz. The period knob is the timer period register.',
    rows: [['f', 'f', 'Hz']],
    eval: (p) => {
      const prescale = pos(P(p, 'prescale', 1), 1e-9);
      const period = pos(P(p, 'period', 1), 1e-9);
      const f = 1e6 / (prescale * period);
      return { val: f, f };
    },
  }),
  adc: (spec) => algebraic(spec, {
    equation: 'SQNR=6.0206 N+1.7609 dB',
    assumptions: 'Full-scale sine quantization. Nyquist frequency is fs/2. Oppenheim & Schafer.',
    rows: [['SQNR', 'sqnr', 'dB'], ['f_N', 'fN', 'Hz']],
    eval: (p) => {
      const bits = P(p, 'bits', 8);
      const sqnr = 6.0206 * bits + 1.7609;
      const fN = P(p, 'fs', 0) / 2;
      return { val: sqnr, sqnr, fN };
    },
  }),
  serial: (spec) => algebraic(spec, {
    equation: 'byte rate=baud/frame bits',
    assumptions: 'Frame 0 is 8N1 (10 bits), 1 is 8E1 (11), 2 is 8N2 (11), else 8E2 (12).',
    rows: [['Bps', 'bps'], ['bits', 'bits']],
    eval: (p) => {
      const frame = clamp(Math.round(P(p, 'frame', 0)), 0, 3);
      const bits = [10, 11, 11, 12][frame];
      const bps = P(p, 'baud', 0) / bits;
      return { val: bps, bps, bits };
    },
  }),
  dma: (spec) => algebraic(spec, {
    equation: 'beats=size',
    assumptions: 'One beat per unit of the size knob. prio is the channel priority.',
    rows: [['beats', 'beats'], ['prio', 'prio']],
    eval: (p) => ({
      val: P(p, 'size', 0),
      beats: P(p, 'size', 0),
      prio: P(p, 'prio', 0),
    }),
  }),
  wdt: (spec) => algebraic(spec, {
    equation: 'timeout',
    assumptions: 'The timeout knob is the watchdog period. wake is the wake-source index.',
    rows: [['t', 'timeout', 's'], ['wake', 'wake']],
    eval: (p) => ({
      val: P(p, 'timeout', 0),
      timeout: P(p, 'timeout', 0),
      wake: P(p, 'wake', 0),
    }),
  }),
  rtsched: (spec) => algebraic(spec, {
    equation: 'U=exec/period',
    assumptions: 'One task. Liu & Layland: the task is schedulable when U≤1. RM and EDF agree for one task.',
    rows: [['U', 'U'], ['ok', 'ok']],
    eval: (p) => {
      const U = P(p, 'exec', 0) / pos(P(p, 'period', 1), 1e-9);
      return { val: U, U, ok: U <= 1 ? 1 : 0 };
    },
  }),
  'irq-nest': (spec) => algebraic(spec, {
    equation: 'depth=levels',
    assumptions: 'Nesting depth is bounded by the priority-level count. rate is the interrupt rate.',
    rows: [['depth', 'depth'], ['rate', 'rate']],
    eval: (p) => ({
      val: P(p, 'levels', 0),
      depth: P(p, 'levels', 0),
      rate: P(p, 'rate', 0),
    }),
  }),
  'sample-quant': (spec) => algebraic(spec, {
    equation: 'SQNR=6.0206 N+1.7609; Nyquist fs≥2 f0',
    assumptions: 'Same sine quantization formula as the ADC. alias=1 when fs<2 f0.',
    rows: [['SQNR', 'sqnr', 'dB'], ['alias', 'alias']],
    eval: (p) => {
      const sqnr = 6.0206 * P(p, 'N', 8) + 1.7609;
      const alias = P(p, 'fs', 0) < 2 * P(p, 'f0', 0) ? 1 : 0;
      return { val: sqnr, sqnr, alias };
    },
  }),
  fft: (spec) => algebraic(spec, {
    equation: '|X[k0]|=(N/2)·cg, cg=1, 0.5, 0.54',
    assumptions: 'Bin-centered cosine. Window 0 rectangular, 1 Hann (coherent gain 0.5), else Hamming (0.54). Oppenheim & Schafer.',
    rows: [['|X|', 'mag']],
    eval: (p) => {
      const N = Math.max(1, P(p, 'N', 64));
      const win = Math.round(P(p, 'win', 0));
      const cg = win <= 0 ? 1 : win === 1 ? 0.5 : 0.54;
      const mag = (N / 2) * cg;
      return { val: mag, mag };
    },
  }),
  filter: (spec) => algebraic(spec, {
    equation: '|H(f)|=1/√(1+(f/fc)^{2n})',
    assumptions: 'Analog Butterworth magnitude. Evaluated at f=min(0.45, 2 fc). Oppenheim & Schafer.',
    rows: [['|H|', 'H']],
    eval: (p) => {
      const n = Math.max(1, Math.round(P(p, 'order', 1)));
      const fc = pos(P(p, 'fc', 0.1), 1e-6);
      const f = Math.min(0.45, 2 * fc);
      const H = 1 / Math.sqrt(1 + (f / fc) ** (2 * n));
      return { val: H, H };
    },
  }),
  mod: (spec) => algebraic(spec, {
    equation: 'P/P_c=1+m²/2',
    assumptions: 'Conventional AM tone. The carrier frequency is reported separately. Stremler / Proakis.',
    rows: [['P/Pc', 'Pr'], ['fc', 'fc', 'Hz']],
    eval: (p) => {
      const m = P(p, 'm', 0);
      const Pr = 1 + (m * m) / 2;
      return { val: Pr, Pr, fc: P(p, 'fc', 0) };
    },
  }),
  linecode: (spec) => algebraic(spec, {
    equation: 'line rate=rate/efficiency',
    assumptions: 'Efficiency: NRZ 1, Manchester 1/2, 4B5B 4/5, 8B10B 4/5. code selects the index.',
    rows: [['line', 'line']],
    eval: (p) => {
      const code = clamp(Math.round(P(p, 'code', 0)), 0, 3);
      const eff = [1, 0.5, 0.8, 0.8][code];
      const line = P(p, 'rate', 0) / eff;
      return { val: line, line };
    },
  }),
  chancode: (spec) => algebraic(spec, {
    equation: 'states=2^{K−1}',
    assumptions: 'Binary convolutional encoder. Lin & Costello. rate is the code rate.',
    rows: [['states', 'states'], ['rate', 'rate']],
    eval: (p) => {
      const K = Math.max(1, Math.round(P(p, 'K', 3)));
      const states = 2 ** Math.max(0, K - 1);
      return { val: states, states, rate: P(p, 'rate', 0) };
    },
  }),
  equalize: (spec) => algebraic(spec, {
    equation: 'misadjustment≈μ·taps/2',
    assumptions: 'Widrow. Unit-power regressor. The factor 1/2 is the standard LMS excess-MSE approximation.',
    rows: [['M', 'M']],
    eval: (p) => {
      const M = P(p, 'mu', 0) * Math.max(0, P(p, 'taps', 0)) / 2;
      return { val: M, M };
    },
  }),
  sync: (spec) => algebraic(spec, {
    equation: 'τ=1/bw',
    assumptions: 'First-order loop time constant. jitter is the supplied rms and is not converted into a variance model.',
    rows: [['τ', 'tau'], ['jitter', 'jitter']],
    eval: (p) => {
      const tau = 1 / pos(P(p, 'bw', 0.01), 1e-9);
      return { val: tau, tau, jitter: P(p, 'jitter', 0) };
    },
  }),
  axial: (spec) => algebraic(spec, {
    equation: 'σ=F/A',
    assumptions: 'Uniform uniaxial stress. Hibbeler.',
    rows: [['σ', 'sigma', 'Pa']],
    eval: (p) => axialEval(p),
  }),
  'beam-bend': (spec) => algebraic(spec, {
    equation: 'M=P L/4, δ=P L³/(48 EI)',
    assumptions: 'Simply supported, center point load, Euler–Bernoulli.',
    rows: [['M', 'M', 'N·m'], ['δ', 'delta', 'm'], ['M/EI', 'curvature', '1/m']],
    eval: (p) => beamBendEval(p),
  }),
  'beam-defl': (spec) => algebraic(spec, {
    equation: 'residual=δ−θ/2 on a unit length',
    assumptions: 'Pure end moment on a beam of length 1: the tip values satisfy δ=θ L/2. The residual is that check.',
    rows: [['resid', 'residual'], ['δ', 'delta'], ['θ', 'theta']],
    eval: (p) => beamDeflEval(p),
  }),
  buckling: (spec) => algebraic(spec, {
    equation: 'Pcr=π² EI/L²',
    assumptions: 'Pinned–pinned Euler column. Hibbeler.',
    rows: [['Pcr', 'Pcr', 'N']],
    eval: (p) => bucklingEval(p),
  }),
  torsion: (spec) => algebraic(spec, {
    equation: 'τ=16 T/(π d³)',
    assumptions: 'Solid circular shaft. Hibbeler.',
    rows: [['τ', 'tau', 'Pa']],
    eval: (p) => torsionEval(p),
  }),
  combined: (spec) => algebraic(spec, {
    equation: 'σ1=σx/2+√((σx/2)²+τ²), σx=N+M, τ=T',
    assumptions: 'Section moduli normalized to 1 in the catalog units.',
    rows: [['σ1', 's1'], ['σx', 'sx']],
    eval: (p) => combinedEval(p),
  }),
  truss: (spec) => algebraic(spec, {
    equation: 'i=b−(2j−3)',
    assumptions: 'Plane-truss Maxwell count. Positive i is indeterminate; negative i is a mechanism.',
    rows: [['i', 'indeterminacy']],
    eval: (p) => trussEval(p),
  }),
  frame: (spec) => algebraic(spec, {
    equation: 'drift=1/k under a unit load',
    assumptions: 'Stated story stiffness. Aspect ratio is span/story.',
    rows: [['drift', 'drift'], ['aspect', 'aspect']],
    eval: (p) => frameEval(p),
  }),
  'struct-dyn': (spec) => algebraic(spec, {
    equation: 'ωn=√(k/m), ζ=c/(2√(km))',
    assumptions: 'Viscously damped SDOF. Chopra / Hibbeler.',
    rows: [['ωn', 'wn', 'rad/s'], ['ζ', 'zeta']],
    eval: (p) => sdofEval(p),
  }),
  seismic: (spec) => algebraic(spec, {
    equation: 'u_amp=pga/(2ζ)',
    assumptions: 'Harmonic base acceleration at resonance. Not a design spectrum. Chopra.',
    rows: [['amp', 'amp']],
    eval: (p) => seismicEval(p),
  }),
  'pipe-flow': (spec) => algebraic(spec, {
    equation: 'f=64/Re (laminar) or Swamee–Jain',
    assumptions: 'Darcy friction factor. eps is relative roughness ε/D. Laminar below Re=2300.',
    rows: [['f', 'f']],
    eval: (p) => darcyEval(p),
  }),
  'open-channel': (spec) => algebraic(spec, {
    equation: 'y=(Q n / √S)^{3/5}',
    assumptions: 'SI Manning, unit width, hydraulic radius equal to depth.',
    rows: [['y', 'y', 'm']],
    eval: (p) => manningEval(p),
  }),
  weir: (spec) => algebraic(spec, {
    equation: 'Q=(2/3) b √(2g) H^{3/2}',
    assumptions: 'Ideal sharp-crested weir, Cd=1. b is the opening knob. g=9.81.',
    rows: [['Q', 'Q', 'm³/s']],
    eval: (p) => weirEval(p),
  }),
  'pump-fan': (spec) => algebraic(spec, {
    equation: 'Q/Qref=(rpm/1450)·units, H/Href=(rpm/1450)²',
    assumptions: 'Affinity laws about 1450 rpm. Qref=1 per machine.',
    rows: [['Q', 'Q'], ['H', 'H']],
    eval: (p) => pumpEval(p),
  }),
  hx: (spec) => algebraic(spec, {
    equation: 'UA=U A',
    assumptions: 'Terminal temperatures are not in the catalog, so LMTD is not invented. The conductance is UA.',
    rows: [['UA', 'UA', 'W/K']],
    eval: (p) => hxEval(p),
  }),
  'conv-eng': (spec) => algebraic(spec, {
    equation: 'q=h·1 K; Nu=0.664 Re^{1/2} Pr^{1/3}',
    assumptions: 'Same Newton and Blasius relations as the convection family. Incropera.',
    rows: [['q', 'q', 'W/m²'], ['h_Bl', 'hBl', 'W/(m²K)']],
    eval: (p) => convEngEval(p),
  }),
  'rad-eng': (spec) => algebraic(spec, {
    equation: 'q=ε σ T⁴, F12=1',
    assumptions: 'Infinite parallel plates, view factor 1, enclosure at 0 K. Incropera.',
    rows: [['q', 'q', 'W/m²']],
    eval: (p) => radEngEval(p),
  }),
  'thermo-cycle': (spec) => algebraic(spec, {
    equation: 'η=1−rp^{(1−γ)/γ}, rp=P/(1 bar), γ=1.4',
    assumptions: 'Ideal-gas Brayton with the low side at 1 bar. Carnot uses Tc=298.15 K. Not a steam table.',
    rows: [['η_B', 'etaB'], ['η_C', 'etaC']],
    eval: (p) => thermoCycleEval(p),
  }),
  combustion: (spec) => algebraic(spec, {
    equation: 'excess air=1/φ−1',
    assumptions: 'Turns. φ>1 is fuel-rich and the excess-air term is negative. T is the reactant temperature, not an adiabatic flame temperature.',
    rows: [['φ', 'phi'], ['excess', 'excess']],
    eval: (p) => combustionEval(p),
  }),
  'dc-motor': (spec) => algebraic(spec, {
    equation: 'ω=(V−TL Ra)/K, Ra=K=1',
    assumptions: 'Steady separately excited machine in normalized units. Chapman.',
    rows: [['ω', 'omega', 'rad/s'], ['I', 'I', 'A']],
    eval: (p) => motorDcEval(p),
  }),
  'ind-motor': (spec) => algebraic(spec, {
    equation: 'n_s=120 f/4',
    assumptions: 'Four poles. Voltage is reported and does not set the synchronous speed. Chapman.',
    rows: [['n_s', 'ns', 'rpm'], ['V', 'V', 'V']],
    eval: (p) => motorIndEval(p),
  }),
  'sync-motor': (spec) => algebraic(spec, {
    equation: 'P_pu=If·sin δ',
    assumptions: 'Per-unit V=Xs=1 and Ea proportional to field current. Chapman.',
    rows: [['P', 'Ppu']],
    eval: (p) => motorSyncEval(p),
  }),
  transformer: (spec) => algebraic(spec, {
    equation: 'V2/V1=1/a',
    assumptions: 'Ideal transformer. load is the per-unit secondary current and does not change the voltage ratio.',
    rows: [['V2/V1', 'ratio'], ['I_pu', 'Ipu']],
    eval: (p) => transformerEval(p),
  }),
  pe: (spec) => algebraic(spec, {
    equation: 'Vout/Vin=D, Δi∝D(1−D)/fs',
    assumptions: 'Ideal buck converter. Erickson. Inductance in the ripple factor is 1 H.',
    rows: [['D', 'duty'], ['ripple', 'ripple']],
    eval: (p) => buckEval(p),
  }),
  powerflow: (spec) => algebraic(spec, {
    equation: 'DC power flow, X=0.1 pu',
    assumptions: 'Radial feeder, equal bus injections. Angle is in radians.',
    rows: [['θ', 'theta', 'rad'], ['P', 'Ptot']],
    eval: (p) => powerflowEval(p),
  }),
  stability: (spec) => algebraic(spec, {
    equation: "δ=asin(0.8)+½·0.8·t_clear² during a fault",
    assumptions: 'Classical machine, Pm=0.8, Pe=0 while the fault knob is positive, M=1. fault=0 keeps the pre-fault angle.',
    rows: [['δ', 'delta', 'rad']],
    eval: (p) => swingEval(p),
  }),
  renewable: (spec) => algebraic(spec, {
    equation: 'P_pv=0.2·irr·1 m²; P_wind=½·1.225·v³·0.4',
    assumptions: 'Stated efficiency 0.2 and Cp=0.4. Cp is below the Betz limit 16/27. Not a measured turbine curve.',
    rows: [['P_pv', 'Ppv', 'W'], ['P_wind', 'Pwind', 'W']],
    eval: (p) => renewableEval(p),
  }),
  storage: (spec) => algebraic(spec, {
    equation: 'hours=E/P',
    assumptions: 'E in kWh and P in kW, so the ratio is hours.',
    rows: [['t', 'hours', 'h']],
    eval: (p) => storageEval(p),
  }),
  reactor: (spec) => algebraic(spec, {
    equation: 'X=kτ/(1+kτ), τ=V/v',
    assumptions: 'Isothermal irreversible first-order reaction. Fogler. Xp is the PFR conversion.',
    rows: [['X_cstr', 'Xc'], ['X_pfr', 'Xp']],
    eval: (p) => cstrEval(p),
  }),
  distill: (spec) => algebraic(spec, {
    equation: 'Nmin=ln[(xD/(1−xD))((1−xB)/xB)]/ln α',
    assumptions: 'Fenske for α=2.5, xD=0.95, xB=0.05. feed/N is the relative feed location.',
    rows: [['feed/N', 'feedFrac'], ['Nmin', 'Nmin']],
    eval: (p) => fenskeEval(p),
  }),
  absorb: (spec) => algebraic(spec, {
    equation: 'fraction=A/(1+A), A=L/G',
    assumptions: 'Single equilibrium stage, equilibrium slope m=1. Temperature is recorded and does not change m.',
    rows: [['abs', 'frac'], ['T', 'T', 'K']],
    eval: (p) => absorbEval(p),
  }),
  extract: (spec) => algebraic(spec, {
    equation: 'Kremser fraction (S^{N+1}−S)/(S^{N+1}−1)',
    assumptions: 'Extraction factor S, distribution ratio 1. At S=1 the fraction is N/(N+1).',
    rows: [['frac', 'frac']],
    eval: (p) => extractEval(p),
  }),
  hen: (spec) => algebraic(spec, {
    equation: 'UA=Q/ΔT_min',
    assumptions: 'Pinch conductance scale. Linnhoff. No stream set is invented.',
    rows: [['UA', 'UA']],
    eval: (p) => pinchEval(p),
  }),
  drying: (spec) => algebraic(spec, {
    equation: 'Δp=p_sat(T)(1−RH)',
    assumptions: 'Antoine water constants A=8.07131, B=1730.63, C=233.426, P in mmHg. The fit is for about 1–100 °C.',
    rows: [['Δp', 'drive', 'mmHg']],
    eval: (p) => dryingEval(p),
  }),
  fluidbed: (spec) => algebraic(spec, {
    equation: 'Re_mf=√(33.7²+0.0408 Ar)−33.7',
    assumptions: 'Wen & Yu 1966. Air and sand ρs=2500 kg/m³. dp is in μm.',
    rows: [['Umf', 'Umf', 'm/s'], ['above', 'above']],
    eval: (p) => fluidbedEval(p),
  }),
  crystal: (spec) => algebraic(spec, {
    equation: 'ln S',
    assumptions: 'Supersaturation ratio. No nucleation prefactor. Mullin.',
    rows: [['ln S', 'lnS'], ['T', 'T', 'K']],
    eval: (p) => crystalEval(p),
  }),
};

const sineWarned = new Set();

function warnDecorativeSine(spec) {
  let debug = false;
  if (typeof globalThis !== 'undefined' && globalThis.DEBUG) debug = true;
  if (typeof process !== 'undefined' && process.env && process.env.DEBUG) debug = true;
  if (!debug) return;
  const key = String(spec?.variantOf || spec?.id || '');
  if (sineWarned.has(key)) return;
  sineWarned.add(key);
  console.debug(`[fam] decorative sine fallback for ${key}`);
}

/**
 * @param {object} spec catalog entry
 * @returns {object|null} model, or null if this variantOf has no governing builder
 */
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

export { warnDecorativeSine };
