/** fam structures governing evals */
import {
  G, EPS0, KE, MU0, SIGMA, R_GAS, C_LIGHT, LAMBDA_C_PM, HC_KEV_PM, QE, ME, KB,
  PRIMES, clamp, pos, finiteOr, linspace, primeAtMost, modPow, P, formatNum,
} from './common.js';

// --- structures ----------------------------------------------------------
// Hibbeler, Mechanics of Materials.

export function axialEval(p) {
  const A = pos(P(p, 'A', 1), 1e-15);
  const F = P(p, 'F', 0);
  const sigma = F / A;
  return { val: sigma, sigma };
}

export function beamBendEval(p) {
  // Simply supported beam, center point load. M_max=PL/4, δ=PL^3/(48 EI). Hibbeler.
  const L = pos(P(p, 'L', 1), 1e-9);
  const EI = pos(P(p, 'EI', 1), 1e-9);
  const load = P(p, 'P', 0);
  const M = load * L / 4;
  const delta = load * L ** 3 / (48 * EI);
  return { val: M, M, delta, curvature: M / EI };
}

export function beamDeflEval(p) {
  // Unit length, pure end moment: Euler–Bernoulli requires δ=θ L/2. Residual of the supplied pair.
  const delta = P(p, 'delta', 0);
  const theta = P(p, 'theta', 0);
  const residual = delta - theta / 2;
  return { val: residual, residual, delta, theta };
}

export function bucklingEval(p) {
  // Pinned–pinned Euler load Pcr=π^2 EI/L^2. Hibbeler.
  const L = pos(P(p, 'L', 1), 1e-9);
  const EI = pos(P(p, 'EI', 1), 1e-9);
  const Pcr = (Math.PI ** 2) * EI / (L * L);
  return { val: Pcr, Pcr };
}

export function torsionEval(p) {
  // Round shaft τ=16 T /(π d^3). Hibbeler.
  const d = pos(P(p, 'd', 0.05), 1e-9);
  const T = P(p, 'T', 0);
  const tau = 16 * T / (Math.PI * d ** 3);
  return { val: tau, tau };
}

export function combinedEval(p) {
  // Section moduli normalized to 1: σx=N+M, τ=T. Plane-stress principal value. Hibbeler.
  const N = P(p, 'N', 0);
  const M = P(p, 'M', 0);
  const T = P(p, 'T', 0);
  const sx = N + M;
  const s1 = sx / 2 + Math.sqrt((sx / 2) ** 2 + T * T);
  return { val: s1, s1, sx };
}

export function trussEval(p) {
  // Maxwell count for a plane truss: i=b−(2j−3). Hibbeler.
  const j = Math.round(P(p, 'nodes', 3));
  const b = Math.round(P(p, 'bars', 3));
  const indeterminacy = b - (2 * j - 3);
  return { val: indeterminacy, indeterminacy };
}

export function frameEval(p) {
  // Unit lateral load on a stated stiffness k. Drift=1/k. Aspect=span/story.
  const k = pos(P(p, 'k', 1), 1e-9);
  const span = P(p, 'span', 1);
  const story = pos(P(p, 'story', 1), 1e-9);
  return { val: 1 / k, drift: 1 / k, aspect: span / story };
}

export function sdofEval(p) {
  const m = pos(P(p, 'm', 1), 1e-12);
  const k = pos(P(p, 'k', 1), 1e-12);
  const c = Math.max(0, P(p, 'c', 0));
  const wn = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  return { val: wn, wn, zeta };
}

export function seismicEval(p) {
  // Chopra: resonant displacement amplification of a harmonic base acceleration is 1/(2ζ).
  // This is not a code design spectrum.
  const pga = P(p, 'pga', 0);
  const zeta = pos(P(p, 'zeta', 0.05), 1e-6);
  const amp = pga / (2 * zeta);
  return { val: amp, amp };
}

