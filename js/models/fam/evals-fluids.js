/** fam fluids governing evals */
import {
  G, EPS0, KE, MU0, SIGMA, R_GAS, C_LIGHT, LAMBDA_C_PM, HC_KEV_PM, QE, ME, KB,
  PRIMES, clamp, pos, finiteOr, linspace, primeAtMost, modPow, P, formatNum,
} from './common.js';
import { convectionEval, radiationEval } from './evals-thermo.js';

// --- fluids --------------------------------------------------------------
// White; Incropera; Wen & Yu.

export function bernoulliEval(p) {
  // Water ρ=1000 kg/m^3. Dynamic pressure ½ρv^2 and discharge Q=A v. White.
  const v = P(p, 'v', 0);
  const A = Math.max(0, P(p, 'A', 0));
  const q = 0.5 * 1000 * v * v;
  const Q = A * v;
  return { val: q, q, Q };
}

export function poiseuilleEval(p) {
  // Poiseuille with reference ΔP/L=1 Pa/m: Q=π R^4 /(8 μ). Couette τ=μ U/D. White.
  const mu = pos(P(p, 'mu', 0.01), 1e-12);
  const U = P(p, 'U', 0);
  const D = pos(P(p, 'D', 0.01), 1e-9);
  const R = D / 2;
  const Q = Math.PI * R ** 4 / (8 * mu);
  const tau = mu * U / D;
  return { val: Q, Q, tau };
}

export function blasiusEval(p) {
  // Blasius: cf=0.664/√Re_x, δ99/x=5/√Re_x. rough is ε/L and only builds Re_ε. White.
  const Re = pos(P(p, 'Re', 100), 1e-9);
  const rough = Math.max(0, P(p, 'rough', 0));
  const cf = 0.664 / Math.sqrt(Re);
  const delta = 5 / Math.sqrt(Re);
  return { val: cf, cf, delta, ReEps: Re * rough };
}

export function darcyEval(p) {
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

export function manningEval(p) {
  // SI Manning, wide unit-width channel, R≈y. Q=(1/n) y^{5/3} S^{1/2}. Chow / White.
  const n = pos(P(p, 'n', 0.013), 1e-9);
  const S = pos(P(p, 'S', 0.001), 1e-15);
  const Q = Math.max(0, P(p, 'Q', 0));
  const y = (Q * n / Math.sqrt(S)) ** (3 / 5);
  return { val: finiteOr(y), y: finiteOr(y) };
}

export function weirEval(p) {
  // Ideal rectangular weir, Cd=1: Q=(2/3) b √(2g) H^{3/2}. b=`a`. White.
  const H = Math.max(0, P(p, 'H', 0));
  const b = Math.max(0, P(p, 'a', 0));
  const Q = (2 / 3) * b * Math.sqrt(2 * G) * H ** 1.5;
  return { val: Q, Q };
}

export function pumpEval(p) {
  // Affinity laws about the catalog reference 1450 rpm. Q∝rpm·units, H∝rpm^2. White.
  const rpm = P(p, 'rpm', 1450);
  const units = Math.max(0, P(p, 'units', 1));
  const speed = rpm / 1450;
  const Q = units * speed;
  const H = speed * speed;
  return { val: Q, Q, H };
}

export function hxEval(p) {
  // LMTD method needs terminal temperatures the catalog does not give. Conductance UA=U A.
  const U = P(p, 'U', 0);
  const A = P(p, 'A', 0);
  return { val: U * A, UA: U * A };
}

export function turbEval(p) {
  // The knobs are the standard k–ε coefficient Cμ and a filter width. No k or ε is invented.
  const Cmu = P(p, 'Cmu', 0.09);
  const grid = P(p, 'grid', 0);
  return { val: Cmu, Cmu, Delta: grid };
}

export function capillaryEval(p) {
  // White: capillary length λ_c=sqrt(σ/(Δρ g)).
  const sigma = Math.max(0, P(p, 'sigma', 0));
  const drho = pos(P(p, 'drho', 1), 1e-9);
  const lam = Math.sqrt(sigma / (drho * G));
  return { val: lam, lam };
}

export function plasmaEval(p) {
  // Chen. T is in eV. ω_p=sqrt(n e^2/(ε0 m_e)), ω_c=eB/m_e.
  const B = P(p, 'B', 0);
  const n = pos(P(p, 'n', 1e14), 1);
  const TeV = Math.max(0, P(p, 'T', 1));
  const wp = Math.sqrt(n * QE * QE / (EPS0 * ME));
  const wc = QE * Math.abs(B) / ME;
  const lamD = Math.sqrt(EPS0 * TeV * QE / (n * QE * QE));
  return { val: wp, wp, wc, lamD };
}

export function superconEval(p) {
  // Tinkham. κ=λ/ξ. Type II when κ>1/√2.
  const lam = P(p, 'lam', 1);
  const xi = pos(P(p, 'xi', 1), 1e-9);
  const kappa = lam / xi;
  return { val: kappa, kappa, typeII: kappa > 1 / Math.SQRT2 ? 1 : 0 };
}

export function magnetismEval(p) {
  // Kittel mean field: kT_C=(2/3) z J S(S+1), z=6, S=1/2, k_B=1.
  const J = P(p, 'J', 1);
  const K = P(p, 'K', 0);
  const Tc = (2 / 3) * 6 * J * 0.5 * 1.5;
  return { val: Tc, Tc, K };
}

export function semiconductorEval(p) {
  // Sze. 300 K, Na=Nd, ni(Si)=1e10 cm^{−3}. Nd is in cm^{−3}.
  const Nd = pos(P(p, 'Nd', 1e15), 1);
  const dE = P(p, 'dE', 0);
  const ni = 1e10;
  const VT = 0.025851;
  const Vbi = VT * Math.log((Nd * Nd) / (ni * ni));
  return { val: Vbi, Vbi, dE };
}

export function topoEval(p) {
  // TKNN: σ_xy / (e^2/h) = Chern. Edge-mode count |C| when a boundary is enabled.
  const Cq = P(p, 'Chern', 0);
  const bc = P(p, 'bc', 0) > 0 ? 1 : 0;
  const edge = bc ? Math.abs(Cq) : 0;
  return { val: Cq, sigma: Cq, edge };
}

export function convEngEval(p) {
  return convectionEval(p);
}

export function radEngEval(p) {
  // Infinite parallel plates have view factor 1. q=ε σ T^4 into a 0 K enclosure. Incropera.
  return radiationEval(p);
}

export function thermoCycleEval(p) {
  // Ideal-gas Brayton, P_low=1 bar, rp=P/(1 bar), γ=1.4. Çengel & Boles.
  // Also the Carnot bound with Tc=298.15 K.
  const Pbar = pos(P(p, 'P', 1), 1e-9);
  const T = pos(P(p, 'T', 300), 1e-9);
  const rp = Pbar;
  const etaB = 1 - rp ** ((1 - 1.4) / 1.4);
  const etaC = 1 - 298.15 / T;
  return { val: etaB, etaB, etaC };
}

export function combustionEval(p) {
  // Turns. φ is the equivalence ratio. Excess air (1/φ−1) when φ>0. T is the reactant temperature.
  const phi = pos(P(p, 'phi', 1), 1e-6);
  const excess = 1 / phi - 1;
  return { val: phi, phi, excess, T: P(p, 'T', 300) };
}

export function motorDcEval(p) {
  // Steady separately excited machine, normalized Ra=1 Ω, K=1. Chapman.
  // T=K Ia, Ea=K ω, V=Ea+Ia Ra.
  const V = P(p, 'V', 0);
  const TL = P(p, 'TL', 0);
  const omega = V - TL;
  return { val: omega, omega, I: TL };
}

export function motorIndEval(p) {
  // 4-pole synchronous speed n_s=120 f / 4. Chapman. Slip is not a catalog knob.
  const f = P(p, 'f', 50);
  const V = P(p, 'V', 0);
  const ns = 120 * f / 4;
  return { val: ns, ns, V };
}

export function motorSyncEval(p) {
  // P ∝ Ea sinδ with Ea∝If, Xs=V=1 in per-unit. Chapman.
  const If = P(p, 'If', 1);
  const delta = P(p, 'delta', 0) * Math.PI / 180;
  const Ppu = If * Math.sin(delta);
  return { val: Ppu, Ppu };
}

export function transformerEval(p) {
  // Ideal transformer V2/V1=1/a, I2/I1=a. load is per-unit secondary current. Chapman.
  const a = P(p, 'a', 1);
  const load = P(p, 'load', 0);
  const ratio = Math.abs(a) < 1e-9 ? 0 : 1 / a;
  return { val: ratio, ratio, Ipu: load };
}

export function buckEval(p) {
  // Erickson: ideal buck Vout/Vin=D. Ripple factor D(1−D)/fs with L=1 H.
  const fs = pos(P(p, 'fs', 1000), 1e-9);
  const D = clamp(P(p, 'duty', 0.5), 0, 1);
  const ripple = D * (1 - D) / fs;
  return { val: D, duty: D, ripple };
}

export function powerflowEval(p) {
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

export function swingEval(p) {
  // Classical swing during a bolted fault: Pe=0, Pm=0.8, M=1, δ(0)=asin(Pm).
  // Glover, Power System Analysis. fault=0 leaves δ at the pre-fault angle.
  const fault = P(p, 'fault', 0);
  const clear = Math.max(0, P(p, 'clear', 0));
  const d0 = Math.asin(0.8);
  const delta = fault > 0 ? d0 + 0.4 * clear * clear : d0;
  return { val: delta, delta };
}

export function renewableEval(p) {
  // Stated coefficients, not a measured plant: η_pv=0.2 on 1 m^2; wind Cp=0.4, A=1, ρ=1.225.
  // Betz limit is 16/27≈0.593; Cp is below it. Manwell / Duffie.
  const irr = Math.max(0, P(p, 'irr', 0));
  const wind = Math.max(0, P(p, 'wind', 0));
  const Ppv = irr * 0.2;
  const Pwind = 0.5 * 1.225 * 1 * wind ** 3 * 0.4;
  return { val: Ppv, Ppv, Pwind };
}

export function storageEval(p) {
  const E = P(p, 'E', 0);
  const power = pos(P(p, 'P', 1), 1e-9);
  const hours = E / power;
  return { val: hours, hours };
}

export function cstrEval(p) {
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

export function fenskeEval(p) {
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

export function absorbEval(p) {
  // One equilibrium stage, m=1, so A=L/G and the absorbed fraction is A/(A+1). King / McCabe.
  const A = Math.max(0, P(p, 'LGq', 0));
  const frac = A / (1 + A);
  return { val: frac, frac, T: P(p, 'T', 300) };
}

export function extractEval(p) {
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

export function pinchEval(p) {
  // Linnhoff pinch: UA scale Q/ΔT_min when ΔT_min is the approach.
  const Q = P(p, 'Q', 0);
  const dT = pos(P(p, 'dT', 1), 1e-9);
  return { val: Q / dT, UA: Q / dT };
}

export function dryingEval(p) {
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

export function fluidbedEval(p) {
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

export function crystalEval(p) {
  // Mullin: thermodynamic driving force ln(S). No kinetic prefactor is supplied.
  const S = pos(P(p, 'S', 1), 1e-9);
  return { val: Math.log(S), lnS: Math.log(S), T: P(p, 'T', 300) };
}

