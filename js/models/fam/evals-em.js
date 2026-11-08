/** fam em governing evals */
import {
  G, EPS0, KE, MU0, SIGMA, R_GAS, C_LIGHT, LAMBDA_C_PM, HC_KEV_PM, QE, ME, KB,
  PRIMES, clamp, pos, finiteOr, linspace, primeAtMost, modPow, P, formatNum,
} from './common.js';

// --- electromagnetism ----------------------------------------------------
// Griffiths; Nilsson for circuits.

export function coulombEval(p) {
  const q = P(p, 'q', 1);
  const r = pos(P(p, 'geom', 1), 1e-6);
  const E = KE * q / (r * r);
  return { val: E, E };
}

export function dipoleEval(p) {
  // On-axis dipole field E=(1/(4πε0)) 2p/r^3. r = separation knob. Griffiths Ch. 3.
  const moment = P(p, 'p', 1);
  const r = pos(P(p, 'sep', 1), 1e-4);
  const E = KE * 2 * moment / (r ** 3);
  return { val: E, E };
}

export function gaussEval(p) {
  // Uniform sphere, surface r=R: E=ρ R/(3 ε0). Griffiths Ch. 2.
  const rho = P(p, 'rho', 1);
  const R = pos(P(p, 'R', 1), 1e-9);
  const E = rho * R / (3 * EPS0);
  const Q = rho * (4 / 3) * Math.PI * R ** 3;
  return { val: E, E, Q };
}

export function capacitorEval(p) {
  // C=ε_r ε0 A/d. eps is relative permittivity.
  const er = P(p, 'eps', 1);
  const d = pos(P(p, 'd', 0.1), 1e-9);
  const A = pos(P(p, 'A', 0.1), 1e-12);
  const C = er * EPS0 * A / d;
  return { val: C, C };
}

export function dcEval(p) {
  // Single loop, Ohm and Kirchhoff: I=E/R.
  const R = pos(P(p, 'R', 1), 1e-9);
  const E = P(p, 'E', 0);
  const I = E / R;
  return { val: I, I, V: E };
}

export function rlcEval(p) {
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

export function acEval(p) {
  // Reference R=1 Ω. phi is the impedance angle, so |Z|=sec(phi).
  // f sets ω. A series reactance that realizes phi at this f is X=tan(phi)=ω L_eq.
  const f = pos(P(p, 'f', 50), 1e-6);
  const phi = clamp(P(p, 'phi', 0), -89.9, 89.9) * Math.PI / 180;
  const Z = 1 / Math.cos(phi);
  const X = Math.tan(phi);
  const Leq = X / (2 * Math.PI * f);
  return { val: Math.abs(Z), Z: Math.abs(Z), Leq };
}

export function biotEval(p) {
  // Loop center, B=μ0 I /(2 R). Griffiths Ch. 5.
  const I = P(p, 'I', 1);
  const R = pos(P(p, 'geom', 1), 1e-6);
  const B = MU0 * I / (2 * R);
  return { val: B, B };
}

export function lorentzEval(p) {
  // Normalized particle q=1 C, m=1 kg. F_E=qE, cyclotron r=m v/(|q|B). Griffiths Ch. 5.
  const E = P(p, 'E', 0);
  const B = P(p, 'B', 0);
  const v = P(p, 'v', 0);
  const FE = E;
  const FB = Math.abs(v * B);
  const rC = Math.abs(B) > 1e-12 ? Math.abs(v / B) : 0;
  return { val: FE, FE, FB, rC };
}

export function faradayEval(p) {
  // dPhi is dΦ/dt as labeled. ε=−N dΦ/dt. Griffiths Ch. 7.
  const dPhi = P(p, 'dPhi', 0);
  const N = P(p, 'N', 1);
  const emf = -N * dPhi;
  return { val: emf, emf };
}

export function mutualEval(p) {
  // M=k √(L1 L2) with L1=L2=L. Nilsson.
  const L = Math.max(0, P(p, 'L', 0));
  const k = clamp(P(p, 'k', 0), 0, 1);
  const M = k * L;
  return { val: M, M };
}

export function maxwellEval(p) {
  // TEM wavelength λ=c/f. Griffiths Ch. 9.
  const f = pos(P(p, 'f', 1e9), 1);
  const mode = Math.max(1, P(p, 'mode', 1));
  const lam = C_LIGHT / f;
  // Cubic cavity side 1 m, TE10n-like cutoff (c/2) sqrt(1+mode^2). Teaching comparison only.
  const fCav = (C_LIGHT / 2) * Math.sqrt(1 + mode * mode);
  return { val: lam, lam, fCav };
}

export function tlineEval(p) {
  // Lossless TEM line in vacuum: one-way delay len/c. Z0 is the characteristic impedance. Cheng / Pozar.
  const Z0 = P(p, 'Z0', 50);
  const len = Math.max(0, P(p, 'len', 1));
  const delay = len / C_LIGHT;
  return { val: Z0, Z0, delay };
}

export function antennaEval(p) {
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

