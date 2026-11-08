/** fam thermo governing evals */
import {
  G, EPS0, KE, MU0, SIGMA, R_GAS, C_LIGHT, LAMBDA_C_PM, HC_KEV_PM, QE, ME, KB,
  PRIMES, clamp, pos, finiteOr, linspace, primeAtMost, modPow, P, formatNum,
} from './common.js';

// --- thermo --------------------------------------------------------------
// Çengel & Boles; Incropera; Reif.

export function idealGasEval(p) {
  // Polytropic ideal gas. Probe at V=2 V0. P0 cancels in the ratio.
  const n = P(p, 'n', 1);
  const T0 = P(p, 'T0', 300);
  const pRatio = 2 ** (-n);
  const T2 = T0 * 2 ** (1 - n);
  return { val: pRatio, pRatio, T2: finiteOr(T2) };
}

export function heatEngineEval(p) {
  // Carnot η=1−Tc/Th with TR=Th/Tc. Otto η=1−r^{1−γ}, γ=1.4 air. Çengel & Boles.
  const TR = pos(P(p, 'TR', 2), 1e-6);
  const r = pos(P(p, 'r', 4), 1e-6);
  const etaC = 1 - 1 / TR;
  const etaO = 1 - r ** (1 - 1.4);
  return { val: etaC, etaC, etaO };
}

export function convectionEval(p) {
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

export function radiationEval(p) {
  // Stefan–Boltzmann exitance. Surroundings are not included. Incropera.
  const eps = clamp(P(p, 'eps', 1), 0, 1);
  const T = P(p, 'T', 300);
  const q = eps * SIGMA * T ** 4;
  return { val: q, q };
}

export function kineticEval(p) {
  // v_rms=sqrt(3 R T / M), M in kg/mol, mMol in g/mol. Reif.
  const T = pos(P(p, 'T', 300), 1e-9);
  const M = pos(P(p, 'mMol', 28), 1e-9) * 1e-3;
  const vrms = Math.sqrt(3 * R_GAS * T / M);
  const vp = Math.sqrt(2 * R_GAS * T / M);
  return { val: vrms, vrms, vp };
}

export function brownianEval(p) {
  // Einstein: one-dimensional ensemble <x^2>=2 D τ. τ is the catalog time knob.
  const D = Math.max(0, P(p, 'D', 0));
  const tau = Math.max(0, P(p, 'dt', 0));
  const msd = 2 * D * tau;
  return { val: msd, msd };
}

export function isingEval(p) {
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

export function percolationEval(p) {
  // Stauffer: exact 1D site-percolation mean cluster size S=(1+p)/(1−p) for p<1.
  const prob = clamp(P(p, 'p', 0.5), 0, 0.999999);
  const S = (1 + prob) / (1 - prob);
  return { val: S, S };
}

export function entropyEval(p) {
  // Ideal binary mixing, per mole, Δs/R = −Σ x ln x. Çengel & Boles. T does not enter Δs.
  const x = clamp(P(p, 'xA', 0.5), 1e-12, 1 - 1e-12);
  const sOverR = -x * Math.log(x) - (1 - x) * Math.log(1 - x);
  const gOverR = P(p, 'T', 300) * -sOverR;
  return { val: sOverR, sOverR, gOverR };
}

