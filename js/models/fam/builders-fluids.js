/** fam fluids builders */
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

export const BUILDERS_FLUIDS = {
  'ideal-fluid': (spec) => algebraic(spec, {
    equation: 'q=½ ρ v², Q=A v, ρ=1000',
    assumptions: 'Water. One section, so the Bernoulli term shown is the dynamic pressure.',
    rows: [['q', 'q', 'Pa'], ['Q', 'Q', 'm³/s']],
    eval: (p) => E.bernoulliEval(p),
  }),
  viscous: (spec) => algebraic(spec, {
    equation: 'Q=π R⁴ ΔP/(8 μ L), ΔP/L=1; τ=μ U/D',
    assumptions: 'Reference pressure gradient 1 Pa/m. Couette gap equals D.',
    rows: [['Q', 'Q', 'm³/s'], ['τ', 'tau', 'Pa']],
    eval: (p) => E.poiseuilleEval(p),
  }),
  'boundary-layer': (spec) => algebraic(spec, {
    equation: 'c_f=0.664/√Re, δ/x=5/√Re',
    assumptions: 'Smooth-plate Blasius. rough is ε/L and enters only Re_ε=Re·rough.',
    rows: [['cf', 'cf'], ['δ/x', 'delta'], ['Re_ε', 'ReEps']],
    eval: (p) => E.blasiusEval(p),
  }),
  turbulence: (spec) => algebraic(spec, {
    equation: 'ν_t=Cμ k²/ε',
    assumptions: 'Cμ and the filter width are the supplied closure parameters. k and ε are not invented.',
    rows: [['Cμ', 'Cmu'], ['Δ', 'Delta']],
    eval: (p) => E.turbEval(p),
  }),
  multiphase: (spec) => algebraic(spec, {
    equation: 'λ_c=√(σ/(Δρ g))',
    assumptions: 'g=9.81. White capillary length.',
    rows: [['λ_c', 'lam', 'm']],
    eval: (p) => E.capillaryEval(p),
  }),
  plasma: (spec) => algebraic(spec, {
    equation: 'ω_p=√(n e²/(ε0 m)), ω_c=eB/m',
    assumptions: 'Electron mass. T is in eV for the Debye length. Chen.',
    rows: [['ω_p', 'wp', 'rad/s'], ['ω_c', 'wc', 'rad/s'], ['λ_D', 'lamD', 'm']],
    eval: (p) => E.plasmaEval(p),
  }),
  supercon: (spec) => algebraic(spec, {
    equation: 'κ=λ/ξ',
    assumptions: 'Ginzburg–Landau. typeII=1 when κ>1/√2. Tinkham.',
    rows: [['κ', 'kappa'], ['II', 'typeII']],
    eval: (p) => E.superconEval(p),
  }),
  magnetism: (spec) => algebraic(spec, {
    equation: 'kT_C=(2/3) z J S(S+1), z=6, S=1/2',
    assumptions: 'k_B=1. Anisotropy K is reported separately and is not folded into T_C.',
    rows: [['T_C', 'Tc'], ['K', 'K']],
    eval: (p) => E.magnetismEval(p),
  }),
  semiconductor: (spec) => algebraic(spec, {
    equation: 'V_bi=(kT/q) ln(Nd²/ni²)',
    assumptions: '300 K, Na=Nd, ni=1e10 cm^{−3}. Nd is in cm^{−3}. dE is the band offset in eV.',
    rows: [['Vbi', 'Vbi', 'V'], ['ΔE', 'dE', 'eV']],
    eval: (p) => E.semiconductorEval(p),
  }),
  topo: (spec) => algebraic(spec, {
    equation: 'σ_xy/(e²/h)=C',
    assumptions: 'Integer quantum Hall. Edge channels equal |C| only when the boundary knob is on.',
    rows: [['σ', 'sigma'], ['edge', 'edge']],
    eval: (p) => E.topoEval(p),
  })
};
