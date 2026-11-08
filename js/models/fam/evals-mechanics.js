/** fam mechanics governing evals */
import {
  G, EPS0, KE, MU0, SIGMA, R_GAS, C_LIGHT, LAMBDA_C_PM, HC_KEV_PM, QE, ME, KB,
  PRIMES, clamp, pos, finiteOr, linspace, primeAtMost, modPow, P, formatNum,
} from './common.js';

// --- mechanics -----------------------------------------------------------
// Taylor, Classical Mechanics, Ch. 2: linear drag on a projectile.
// Thornton & Marion / Hibbeler: incline, Atwood, impact.
// Goldstein / Murray & Dermott: central force. French / Taylor: SHO.

export function projectileEval(p, t) {
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
  const tEnd = Math.max(t, 1.2);
  const xy = linspace(64, (u) => {
    const tt = u * tEnd;
    if (k < 1e-10) {
      return { x: vx0 * tt, y: vy0 * tt - 0.5 * g * tt * tt };
    }
    const e = Math.exp(-k * tt);
    return {
      x: (vx0 / k) * (1 - e),
      y: ((vy0 + g / k) / k) * (1 - e) - (g / k) * tt,
    };
  });
  const curve = xy.map((p) => p.y);
  return { val: y, x, y, vx, vy, curve, xy, drawKind: 'xy' };
}

export function inclinedEval(p, t) {
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

export function atwoodEval(p) {
  // Ideal vertical Atwood. m1/m2 = mRatio, m2 = 1 kg. Axle friction μ has no normal force here.
  const m1 = pos(P(p, 'mRatio', 0.5), 1e-9);
  const m2 = 1;
  const a = (m1 - m2) / (m1 + m2) * G;
  return { val: a, a, m1, m2 };
}

export function circularEval(p, t) {
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

export function collisionEval(p) {
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

export function rocketEval(p, t) {
  // Tsiolkovsky, no gravity, m0=1 kg. ṁ>0 is propellant consumption.
  const u = P(p, 'uRel', 50);
  const mdot = Math.max(0, P(p, 'dmdt', 0));
  const m0 = 1;
  const m = Math.max(0.05, m0 - mdot * Math.max(0, t));
  const v = -u * Math.log(m / m0);
  const a0 = u * mdot / m0;
  return { val: a0, v, a0, m };
}

export function noninertialEval(p) {
  // Taylor Ch. 9. Initial velocity (1, 0) m/s so Coriolis −2ω×v is defined.
  const aFrame = P(p, 'aFrame', 0);
  const w = P(p, 'omega', 0);
  const ay = -2 * w * 1;
  const ax = aFrame;
  return { val: ay, ax, ay, aMag: Math.hypot(ax, ay) };
}

export function pendulumReset(state) {
  state.theta = undefined;
  state.omega = undefined;
}

export function pendulumEval(p, t, state, dt) {
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

export function orbitEval(p) {
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
  // Conic with focus at origin, periapsis on +x at r0, eccentricity eReq (Kepler).
  const eDraw = Math.min(eReq, 0.92);
  const pConic = r0 * (1 + eDraw);
  const xy = linspace(96, (u) => {
    const th = u * 2 * Math.PI;
    const r = pConic / (1 + eDraw * Math.cos(th));
    return { x: r * Math.cos(th), y: r * Math.sin(th) };
  });
  return {
    val: ac,
    ac,
    eOsc,
    rA,
    vPeri,
    unbound,
    x: r0,
    y: 0,
    xy,
    drawKind: 'xy',
  };
}

export function shoEval(p, t) {
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

export function dampedEval(p, t) {
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

export function forcedEval(p) {
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

export function coupledEval(p) {
  // Fixed-end chain, on-site spring 1, coupling κ.
  // ω_r^2 = 1 + 4 κ sin^2(q_r/2), q_r = r π/(N+1). Marion / French coupled oscillators.
  const N = Math.max(2, Math.min(12, Math.round(P(p, 'N', 2))));
  const kappa = Math.max(0, P(p, 'kappa', 0));
  const q = N * Math.PI / (N + 1);
  const w2 = 1 + 4 * kappa * Math.sin(q / 2) ** 2;
  const a1 = -(1 + 2 * kappa);
  return { val: Math.sqrt(Math.max(0, w2)), omegaMax: Math.sqrt(Math.max(0, w2)), a1, N };
}

export function duffingReset(state) {
  state.x = undefined;
  state.v = undefined;
}

export function duffingEval(p, t, state, dt) {
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

