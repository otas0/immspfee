/** fam waves builders */
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

export const BUILDERS_WAVES = {
  wave1d: (spec) => algebraic(spec, {
    equation: 'y=sin(kx−ωt), ω=2πf, k=ω/c, A=1',
    assumptions: 'Unit amplitude. λ=c/f.',
    rows: [['λ', 'lam'], ['k', 'k'], ['y(1)', 'yProbe']],
    eval: E.wave1dEval,
  }),
  wave2d: (spec) => algebraic(spec, {
    equation: 'c=√(T/ρ), ω_11=π c √2 on the unit square',
    assumptions: 'Linear membrane, mode (1,1). Pain.',
    rows: [['c', 'c'], ['ω', 'omega', 'rad/s'], ['y', 'yMid']],
    eval: E.wave2dEval,
  }),
  interfere: (spec) => algebraic(spec, {
    equation: 'I/I0=cos²(φ/2), β=λ/d',
    assumptions: 'Equal amplitudes. On-axis phase is the phi knob. Screen distance L=1 for the fringe spacing.',
    rows: [['I', 'I'], ['β', 'beta']],
    eval: (p) => E.interfereEval(p),
  }),
  diffract: (spec) => algebraic(spec, {
    equation: 'y_min=λ L/a',
    assumptions: 'Paraxial single-slit first minimum. Same length unit for a, λ, and L.',
    rows: [['y1', 'yMin'], ['β', 'beta']],
    eval: (p) => E.diffractEval(p),
  }),
  doppler: (spec) => algebraic(spec, {
    equation: "f'/f=(1+vo cosθ)/(1−vs cosθ)",
    assumptions: 'vs and vo are fractions of the wave speed. Positive vs is toward the observer. Positive vo is toward the source.',
    rows: [['f\'/f', 'ratio']],
    eval: (p) => E.dopplerEval(p),
  }),
  'geo-optics': (spec) => algebraic(spec, {
    equation: 'n1 sinθ1=n2 sinθ2, n1=1',
    assumptions: 'Snell. tir=1 when the ray is totally reflected. Hecht.',
    rows: [['θ2', 'theta2', '°'], ['TIR', 'tir']],
    eval: (p) => E.snellEval(p),
  }),
  lens: (spec) => algebraic(spec, {
    equation: '1/u+1/v=1/f',
    assumptions: 'Signed distances as stored. Lateral magnification m=−v/u. Canvas is a thin-lens ray sketch (Hecht).',
    drawKind: 'lens',
    rows: [['v', 'v', 'cm'], ['m', 'm'], ['h_i', 'hi', 'cm']],
    eval: (p) => E.lensEval(p),
  }),
  prism: (spec) => algebraic(spec, {
    equation: 'δ≈(n−1)A',
    assumptions: 'Thin-prism limit, A in degrees. deltaMin is the exact symmetric minimum deviation.',
    rows: [['δ', 'delta', '°'], ['δ_min', 'deltaMin', '°']],
    eval: (p) => E.prismEval(p),
  }),
  'opt-interfere': (spec) => algebraic(spec, {
    equation: 'β=λ L/d, L=1 m',
    assumptions: 'Young. d is in mm, λ in nm. Hecht.',
    rows: [['β', 'betaMm', 'mm']],
    eval: (p) => E.optInterfereEval(p),
  }),
  'opt-diffract': (spec) => algebraic(spec, {
    equation: 'y=λ L/a',
    assumptions: 'Fraunhofer slit. a in mm, λ in nm, L in m.',
    rows: [['y', 'yMm', 'mm']],
    eval: (p) => E.optDiffractEval(p),
  }),
  polarization: (spec) => algebraic(spec, {
    equation: 'I=I0 cos²θ',
    assumptions: 'Malus. I0=1. dphi is retarder phase in degrees and does not change this intensity.',
    rows: [['I', 'I'], ['δ', 'dphi', '°']],
    eval: (p) => E.malusEval(p),
  }),
  fiber: (spec) => algebraic(spec, {
    equation: 'NA=√(n_core²−n_clad²)',
    assumptions: 'Step-index acceptance. Hecht.',
    rows: [['NA', 'NA'], ['θ_c', 'thetaC', '°']],
    eval: (p) => E.fiberEval(p),
  }),
  laser: (spec) => algebraic(spec, {
    equation: 'net=g L−loss',
    assumptions: 'g is a gain coefficient (1/m) and loss is a dimensionless single-pass loss. Siegman.',
    rows: [['net', 'net'], ['gL', 'gL']],
    eval: (p) => E.laserEval(p),
  }),
  nlo: (spec) => algebraic(spec, {
    equation: 'η∝χ² sinc²(Δk/2), L=1',
    assumptions: 'Plane-wave second harmonic, Boyd. L=1 in the knob units.',
    rows: [['η', 'eta']],
    eval: (p) => E.nloEval(p),
  }),
  qoptics: (spec) => algebraic(spec, {
    equation: 'V=e^{−2r}, n̄=|α|²+sinh² r',
    assumptions: 'Single-mode squeezed state. Gerry & Knight.',
    rows: [['V', 'V'], ['n', 'nbar']],
    eval: (p) => E.qopticsEval(p),
  })
};
