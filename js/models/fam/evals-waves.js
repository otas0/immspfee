/** fam waves governing evals */
import {
  G, EPS0, KE, MU0, SIGMA, R_GAS, C_LIGHT, LAMBDA_C_PM, HC_KEV_PM, QE, ME, KB,
  PRIMES, clamp, pos, finiteOr, linspace, primeAtMost, modPow, P, formatNum,
} from './common.js';

// --- waves / optics ------------------------------------------------------
// Pain: waves and membranes. Hecht: interference, diffraction, Snell, lenses, Malus, prism.
// Halliday: Doppler.

export function wave1dEval(p, t) {
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

export function wave2dEval(p, t) {
  // Rectangular membrane (1,1) on the unit square. c=sqrt(T/ρ). Pain.
  const tension = pos(P(p, 'T', 1), 1e-12);
  const rho = pos(P(p, 'rho', 1), 1e-12);
  const c = Math.sqrt(tension / rho);
  const omega = Math.PI * c * Math.SQRT2;
  const yMid = Math.cos(omega * t);
  return { val: c, c, omega, yMid };
}

export function interfereEval(p) {
  // Equal double source: I/I0 = cos^2(φ/2), φ = phi + 2π (d sinθ)/λ at θ=0 → phi.
  // Fringe spacing β=λ L/d with L=1. Hecht.
  const d = pos(P(p, 'd', 1), 1e-9);
  const phi = P(p, 'phi', 0);
  const lam = pos(P(p, 'lam', 1), 1e-9);
  const I = Math.cos(phi / 2) ** 2;
  const beta = lam / d;
  return { val: I, I, beta };
}

export function diffractEval(p) {
  // Paraxial single-slit first minimum y = λ L / a. Hecht.
  const a = pos(P(p, 'a', 0.1), 1e-9);
  const lam = pos(P(p, 'lam', 0.4), 1e-12);
  const L = pos(P(p, 'L', 1), 1e-9);
  const yMin = L * lam / a;
  const beta = Math.PI * a / Math.max(lam, 1e-12);
  const I0 = 1;
  return { val: yMin, yMin, beta, I0 };
}

export function dopplerEval(p) {
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

export function snellEval(p) {
  // Air into a medium of index n. Hecht.
  const th = P(p, 'theta', 0) * Math.PI / 180;
  const n = pos(P(p, 'n', 1), 1e-6);
  const s = Math.sin(th) / n;
  const tir = Math.abs(s) > 1 ? 1 : 0;
  const th2 = tir ? 90 : Math.asin(clamp(s, -1, 1)) * 180 / Math.PI;
  return { val: th2, theta2: th2, tir };
}

export function lensEval(p) {
  // School form 1/u+1/v=1/f with the signed catalog distances. Hecht thin lens.
  const f = P(p, 'f', 10);
  const u = P(p, 'u', -20);
  const h = P(p, 'h', 1);
  const den = (Math.abs(f) < 1e-8 ? 0 : 1 / f) - (Math.abs(u) < 1e-8 ? 0 : 1 / u);
  const v = Math.abs(den) < 1e-10 ? 0 : 1 / den;
  const m = Math.abs(u) < 1e-8 ? 0 : -v / u;
  return { val: v, v, m, hi: m * h, f, u, h, drawKind: 'lens' };
}

export function prismEval(p) {
  // Thin-prism δ≈(n−1)A, angles in degrees (the linear approximation preserves the unit). Hecht.
  const A = P(p, 'A', 30);
  const n = P(p, 'nF', 1.5);
  const delta = (n - 1) * A;
  const Ar = A * Math.PI / 180;
  const arg = clamp(n * Math.sin(Ar / 2), -1, 1);
  const deltaMin = (2 * Math.asin(arg) - Ar) * 180 / Math.PI;
  return { val: delta, delta, deltaMin: finiteOr(deltaMin) };
}

export function optInterfereEval(p) {
  // Young's slits. d in mm, λ in nm, L=1 m. β = λ L / d.
  const dMm = pos(P(p, 'd', 0.1), 1e-9);
  const lamNm = pos(P(p, 'lam', 550), 1e-9);
  const betaMm = (lamNm * 1e-6) / dMm;
  return { val: betaMm, betaMm };
}

export function optDiffractEval(p) {
  // Fraunhofer single slit. a in mm, λ in nm, L in m. y = λ L / a.
  const aMm = pos(P(p, 'a', 0.05), 1e-9);
  const lamNm = pos(P(p, 'lam', 500), 1e-9);
  const L = pos(P(p, 'L', 1), 1e-9);
  const yMm = lamNm * L / aMm * 1e-3;
  return { val: yMm, yMm };
}

export function malusEval(p) {
  // Malus: I/I0 = cos^2(θ). dphi is a retarder phase and does not change that intensity. Hecht.
  const th = P(p, 'ang', 0) * Math.PI / 180;
  const I = Math.cos(th) ** 2;
  const dphi = P(p, 'dphi', 0);
  return { val: I, I, dphi };
}

export function fiberEval(p) {
  const n1 = P(p, 'nCore', 1.45);
  const n2 = P(p, 'nClad', 1.4);
  const na2 = n1 * n1 - n2 * n2;
  const NA = na2 > 0 ? Math.sqrt(na2) : 0;
  const crit = n1 > 0 ? Math.asin(clamp(n2 / n1, -1, 1)) * 180 / Math.PI : 0;
  return { val: NA, NA, thetaC: crit };
}

export function laserEval(p) {
  // Siegman / Svelto: one-way threshold when g L exceeds the single-pass loss.
  const L = pos(P(p, 'L', 0.1), 1e-6);
  const g = P(p, 'g', 0);
  const loss = P(p, 'loss', 0);
  const net = g * L - loss;
  return { val: net, net, gL: g * L };
}

export function nloEval(p) {
  // Boyd: plane-wave SHG efficiency ∝ χ^2 sinc^2(Δk L/2), L=1.
  const chi = P(p, 'chi', 0);
  const dk = P(p, 'dk', 0);
  const x = dk / 2;
  const sinc = Math.abs(x) < 1e-8 ? 1 : Math.sin(x) / x;
  const eta = chi * chi * sinc * sinc;
  return { val: eta, eta };
}

export function qopticsEval(p) {
  // Walls & Milburn / Gerry & Knight: squeezed variance e^{-2r}, n̄=|α|^2+sinh^2(r).
  const r = P(p, 'r', 0);
  const alpha = P(p, 'alpha', 0);
  const V = Math.exp(-2 * r);
  const nbar = alpha * alpha + Math.sinh(r) ** 2;
  return { val: V, V, nbar: finiteOr(nbar) };
}

