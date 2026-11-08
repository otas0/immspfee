/** fam structures builders */
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

export const BUILDERS_STRUCTURES = {
  axial: (spec) => algebraic(spec, {
    equation: 'σ=F/A',
    assumptions: 'Uniform uniaxial stress. Hibbeler.',
    rows: [['σ', 'sigma', 'Pa']],
    eval: (p) => E.axialEval(p),
  }),
  'beam-bend': (spec) => algebraic(spec, {
    equation: 'M=P L/4, δ=P L³/(48 EI)',
    assumptions: 'Simply supported, center point load, Euler–Bernoulli.',
    rows: [['M', 'M', 'N·m'], ['δ', 'delta', 'm'], ['M/EI', 'curvature', '1/m']],
    eval: (p) => E.beamBendEval(p),
  }),
  'beam-defl': (spec) => algebraic(spec, {
    equation: 'residual=δ−θ/2 on a unit length',
    assumptions: 'Pure end moment on a beam of length 1: the tip values satisfy δ=θ L/2. The residual is that check.',
    rows: [['resid', 'residual'], ['δ', 'delta'], ['θ', 'theta']],
    eval: (p) => E.beamDeflEval(p),
  }),
  buckling: (spec) => algebraic(spec, {
    equation: 'Pcr=π² EI/L²',
    assumptions: 'Pinned–pinned Euler column. Hibbeler.',
    rows: [['Pcr', 'Pcr', 'N']],
    eval: (p) => E.bucklingEval(p),
  }),
  torsion: (spec) => algebraic(spec, {
    equation: 'τ=16 T/(π d³)',
    assumptions: 'Solid circular shaft. Hibbeler.',
    rows: [['τ', 'tau', 'Pa']],
    eval: (p) => E.torsionEval(p),
  }),
  combined: (spec) => algebraic(spec, {
    equation: 'σ1=σx/2+√((σx/2)²+τ²), σx=N+M, τ=T',
    assumptions: 'Section moduli normalized to 1 in the catalog units.',
    rows: [['σ1', 's1'], ['σx', 'sx']],
    eval: (p) => E.combinedEval(p),
  }),
  truss: (spec) => algebraic(spec, {
    equation: 'i=b−(2j−3)',
    assumptions: 'Plane-truss Maxwell count. Positive i is indeterminate; negative i is a mechanism.',
    rows: [['i', 'indeterminacy']],
    eval: (p) => E.trussEval(p),
  }),
  frame: (spec) => algebraic(spec, {
    equation: 'drift=1/k under a unit load',
    assumptions: 'Stated story stiffness. Aspect ratio is span/story.',
    rows: [['drift', 'drift'], ['aspect', 'aspect']],
    eval: (p) => E.frameEval(p),
  })
};
