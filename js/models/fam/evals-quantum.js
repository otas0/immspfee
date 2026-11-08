/** fam quantum governing evals */
import {
  G, EPS0, KE, MU0, SIGMA, R_GAS, C_LIGHT, LAMBDA_C_PM, HC_KEV_PM, QE, ME, KB,
  PRIMES, clamp, pos, finiteOr, linspace, primeAtMost, modPow, P, formatNum,
} from './common.js';

// --- quantum / modern ----------------------------------------------------

export function wellEval(p) {
  // Infinite well, ℏ=m=1, n=1: E=π^2/(2 a^2). Griffiths QM. V0 is not an infinite-well eigenvalue.
  const a = pos(P(p, 'a', 1), 1e-9);
  const E1 = (Math.PI ** 2) / (2 * a * a);
  const V0 = P(p, 'V0', 0);
  return { val: E1, E1, above: E1 < V0 ? 1 : 0 };
}

export function tunnelEval(p) {
  // Thick rectangular barrier, ℏ=m=1. T≈exp(−2κw), κ=sqrt(2(V0−E)). Griffiths QM.
  const V0 = P(p, 'V0', 1);
  const E = P(p, 'E', 0);
  const w = Math.max(0, P(p, 'w', 0));
  if (E >= V0) return { val: 1, T: 1, kappa: 0 };
  const kappa = Math.sqrt(2 * (V0 - E));
  const T = Math.exp(-2 * kappa * w);
  return { val: T, T, kappa };
}

export function qhoEval(p) {
  // ℏ=1. E0=ω/2. Coupled partner ω_+=ω sqrt(1+coup) for a unit coupling spring. Griffiths QM.
  const w = pos(P(p, 'omega', 1), 1e-9);
  const coup = Math.max(0, P(p, 'coup', 0));
  const E0 = 0.5 * w;
  const wPlus = w * Math.sqrt(1 + coup);
  return { val: E0, E0, wPlus };
}

export function hydrogenEval(p) {
  // Bohr / Schrödinger: E=−13.6 eV/n^2. l and m do not shift this level. Bransden & Joachain.
  const n = Math.max(1, Math.round(P(p, 'n', 1)));
  const l = Math.max(0, Math.round(P(p, 'l', 0)));
  const m = Math.round(P(p, 'm', 0));
  const E = -13.6 / (n * n);
  const valid = l <= n - 1 && Math.abs(m) <= l ? 1 : 0;
  return { val: E, E, valid };
}

export function angmomEval(p) {
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

export function entangleEval(p) {
  // Horodecki: two-qubit CHSH max 2 sqrt(1+C^2). Correlator at angle `basis` is −C cos θ.
  const Cq = clamp(P(p, 'conc', 0), 0, 1);
  const th = P(p, 'basis', 0) * Math.PI / 180;
  const S = 2 * Math.sqrt(1 + Cq * Cq);
  const corr = -Cq * Math.cos(th);
  return { val: S, S, corr };
}

export function qgateEval(p) {
  // Nielsen & Chuang. Ry on |0>: P(|1>)=sin^2(θ/2). ctrl≠0 marks a control-high CNOT.
  const th = P(p, 'theta', 0) * Math.PI / 180;
  const P1 = Math.sin(th / 2) ** 2;
  const flipped = Math.round(P(p, 'ctrl', 0)) !== 0 ? 1 : 0;
  return { val: P1, P1, flipped };
}

export function groverEval(p) {
  // Nielsen & Chuang. sin θ = 1/√N, P=sin^2((2k+1)θ).
  const nBits = Math.max(1, Math.min(12, Math.round(P(p, 'nBits', 2))));
  const k = Math.max(0, Math.round(P(p, 'iters', 1)));
  const N = 2 ** nBits;
  const th = Math.asin(1 / Math.sqrt(N));
  const prob = Math.sin((2 * k + 1) * th) ** 2;
  return { val: prob, prob, N };
}

export function packetEval(p, t) {
  // Griffiths QM free Gaussian. <T>=ℏ^2/(8 m σ^2), ℏ=m=1. Constant V shifts energy only.
  const sigma = pos(P(p, 'sigma', 1), 1e-6);
  const V = P(p, 'V', 0);
  const spread = sigma * Math.sqrt(1 + (t / (2 * sigma * sigma)) ** 2);
  const E = 1 / (8 * sigma * sigma) + V;
  return { val: E, E, sigmaT: finiteOr(spread) };
}

export function relKinEval(p) {
  // French, Special Relativity. γ=(1−β^2)^{−1/2}.
  const beta = clamp(Math.abs(P(p, 'beta', 0)), 0, 0.999999);
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  return { val: gamma, gamma, contract: 1 / gamma };
}

export function relDynEval(p) {
  // French. c=1. Rest energy sqrt(E^2−p^2) when the interval is timelike.
  const E = P(p, 'E', 1);
  const mom = P(p, 'p', 0);
  const disc = E * E - mom * mom;
  const m = disc > 0 ? Math.sqrt(disc) : 0;
  return { val: m, m, timelike: disc > 0 ? 1 : 0 };
}

export function comptonEval(p) {
  // Compton 1923. Δλ=λ_C(1−cosθ). E is the incident photon energy in keV.
  const th = P(p, 'theta', 0) * Math.PI / 180;
  const E = pos(P(p, 'E', 50), 1e-9);
  const dLam = LAMBDA_C_PM * (1 - Math.cos(th));
  const lam = HC_KEV_PM / E;
  const Ep = HC_KEV_PM / (lam + dLam);
  return { val: dLam, dLam, Ep };
}

export function decayEval(p, t) {
  // Krane. N=N0 e^{−λt}. Activity A=λN.
  const lam = Math.max(0, P(p, 'lam', 0));
  const N0 = Math.max(0, P(p, 'N0', 0));
  const N = N0 * Math.exp(-lam * Math.max(0, t));
  const A = lam * N;
  const half = lam > 1e-15 ? Math.LN2 / lam : 0;
  return { val: N, N, A, half };
}

