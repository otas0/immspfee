/** fam quantum builders */
import { algebraic, P, G, EPS0, KE, MU0, SIGMA, R_GAS, C_LIGHT, LAMBDA_C_PM, HC_KEV_PM, QE, ME, KB, PRIMES, clamp, pos, finiteOr, linspace, primeAtMost, modPow, formatNum, fnv1a } from './common.js';
import * as Mech from './evals-mechanics.js';
import * as Waves from './evals-waves.js';
import * as Thermo from './evals-thermo.js';
import * as Em from './evals-em.js';
import * as Quantum from './evals-quantum.js';
import * as Struct from './evals-structures.js';
import * as Fluids from './evals-fluids.js';
import * as Discrete from './evals-discrete.js';
const E = { ...Mech, ...Waves, ...Thermo, ...Em, ...Quantum, ...Struct, ...Fluids, ...Discrete };

export const BUILDERS_QUANTUM = {
  well1d: (spec) => algebraic(spec, {
    equation: 'E1=π²/(2 a²), ℏ=m=1',
    assumptions: 'Infinite square well, n=1. V0 is only a comparison with the finite-well depth.',
    rows: [['E1', 'E1'], ['E1<V0', 'above']],
    eval: (p) => E.wellEval(p),
  }),
  tunnel: (spec) => algebraic(spec, {
    equation: 'T≈exp(−2 κ w), κ=√(2(V0−E))',
    assumptions: 'Thick-barrier estimate, ℏ=m=1. T=1 when E≥V0. Griffiths QM.',
    rows: [['T', 'T'], ['κ', 'kappa']],
    eval: (p) => E.tunnelEval(p),
  }),
  qho: (spec) => algebraic(spec, {
    equation: 'E0=ℏω/2, ω_+=ω√(1+coup)',
    assumptions: 'ℏ=1. The coupling raises one normal frequency of two oscillators.',
    rows: [['E0', 'E0'], ['ω+', 'wPlus']],
    eval: (p) => E.qhoEval(p),
  }),
  hydrogen: (spec) => algebraic(spec, {
    equation: 'E=−13.6 eV/n²',
    assumptions: 'n, l, m are rounded to integers. valid=1 when 0≤l≤n−1 and |m|≤l.',
    rows: [['E', 'E', 'eV'], ['valid', 'valid']],
    eval: (p) => E.hydrogenEval(p),
  }),
  angmom: (spec) => algebraic(spec, {
    equation: 'g_J=1+[j(j+1)+s(s+1)−l(l+1)]/(2j(j+1))',
    assumptions: 's=1/2 and l=j−1/2. Fine-structure shift is coup·L·S.',
    rows: [['g_J', 'gJ'], ['E_fs', 'Efs']],
    eval: (p) => E.angmomEval(p),
  }),
  entangle: (spec) => algebraic(spec, {
    equation: 'S=2√(1+C²)',
    assumptions: 'Two-qubit CHSH maximum for concurrence C. The correlator uses the measurement angle.',
    rows: [['S', 'S'], ['E', 'corr']],
    eval: (p) => E.entangleEval(p),
  }),
  qgate: (spec) => algebraic(spec, {
    equation: 'P(1)=sin²(θ/2)',
    assumptions: 'Ry on |0>. flipped=1 when the control knob is nonzero.',
    rows: [['P1', 'P1'], ['flip', 'flipped']],
    eval: (p) => E.qgateEval(p),
  }),
  qalgo: (spec) => algebraic(spec, {
    equation: 'P=sin²((2k+1)θ), sinθ=1/√N',
    assumptions: 'Grover on N=2^{nBits} with one marked item. Nielsen & Chuang.',
    rows: [['P', 'prob'], ['N', 'N']],
    eval: (p) => E.groverEval(p),
  }),
  wavepacket: (spec) => algebraic(spec, {
    equation: 'E=1/(8σ²)+V, σ(t)=σ√(1+(t/(2σ²))²)',
    assumptions: 'Free Gaussian packet plus a constant potential. ℏ=m=1. Griffiths QM.',
    rows: [['E', 'E'], ['σ(t)', 'sigmaT']],
    eval: E.packetEval,
  }),
  'rel-kin': (spec) => algebraic(spec, {
    equation: 'γ=1/√(1−β²)',
    assumptions: 'Special relativity, French. β is clamped below 1.',
    rows: [['γ', 'gamma'], ['1/γ', 'contract']],
    eval: (p) => E.relKinEval(p),
  }),
  'rel-dyn': (spec) => algebraic(spec, {
    equation: 'm c²=√(E²−p² c²), c=1',
    assumptions: 'Timelike interval. A spacelike pair reports m=0 and timelike=0.',
    rows: [['m', 'm'], ['timelike', 'timelike']],
    eval: (p) => E.relDynEval(p),
  }),
  compton: (spec) => algebraic(spec, {
    equation: 'Δλ=λ_C(1−cosθ)',
    assumptions: 'Electron at rest. Δλ is in pm. E is in keV. λ_C=2.42631023867 pm.',
    rows: [['Δλ', 'dLam', 'pm'], ['E\'', 'Ep', 'keV']],
    eval: (p) => E.comptonEval(p),
  }),
  radioactive: (spec) => algebraic(spec, {
    equation: 'N=N0 e^{−λ t}',
    assumptions: 'Single exponential. Krane. Activity A=λ N.',
    rows: [['N', 'N'], ['A', 'A'], ['t_half', 'half']],
    eval: E.decayEval,
  })
};
