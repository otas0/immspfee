/** fam em builders */
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

export const BUILDERS_EM = {
  electrostatic: (spec) => algebraic(spec, {
    equation: 'E=q/(4 π ε0 r²)',
    assumptions: 'Point charge in SI. r is the geometry knob. Griffiths Ch. 2.',
    rows: [['E', 'E', 'N/C']],
    eval: (p) => E.coulombEval(p),
  }),
  fieldlines: (spec) => algebraic(spec, {
    equation: 'E_axis=(1/(4πε0)) 2p/r³',
    assumptions: 'Ideal dipole on axis. r is the separation knob. Griffiths Ch. 3.',
    rows: [['E', 'E', 'N/C']],
    eval: (p) => E.dipoleEval(p),
  }),
  gauss: (spec) => algebraic(spec, {
    equation: 'E(R)=ρ R/(3 ε0)',
    assumptions: 'Uniform ball, field at the surface. Griffiths Ch. 2.',
    rows: [['E', 'E', 'N/C'], ['Q', 'Q', 'C']],
    eval: (p) => E.gaussEval(p),
  }),
  capacitor: (spec) => algebraic(spec, {
    equation: 'C=ε_r ε0 A/d',
    assumptions: 'Parallel plate. eps is the relative permittivity.',
    rows: [['C', 'C', 'F']],
    eval: (p) => E.capacitorEval(p),
  }),
  'dc-network': (spec) => algebraic(spec, {
    equation: 'I=E/R',
    assumptions: 'Single-loop Ohm law. Nilsson.',
    rows: [['I', 'I', 'A'], ['V', 'V', 'V']],
    eval: (p) => E.dcEval(p),
  }),
  rlc: (spec) => algebraic(spec, {
    equation: 'ω0=1/√(LC), α=R/(2L)',
    assumptions: 'Series RLC. wd=sqrt(ω0²−α²) when underdamped, otherwise 0.',
    rows: [['ω0', 'w0', 'rad/s'], ['α', 'alpha', '1/s'], ['ωd', 'wd', 'rad/s']],
    eval: (p) => E.rlcEval(p),
  }),
  ac: (spec) => algebraic(spec, {
    equation: '|Z|=sec φ for R=1 Ω; L_eq=tanφ / ω',
    assumptions: 'phi is the impedance angle. Frequency enters the inductance that would produce that angle.',
    rows: [['|Z|', 'Z', 'Ω'], ['L_eq', 'Leq', 'H']],
    eval: (p) => E.acEval(p),
  }),
  magnetostat: (spec) => algebraic(spec, {
    equation: 'B=μ0 I/(2 R)',
    assumptions: 'Center of a current loop. Griffiths Ch. 5.',
    rows: [['B', 'B', 'T']],
    eval: (p) => E.biotEval(p),
  }),
  lorentz: (spec) => algebraic(spec, {
    equation: 'F_E=q E, r_c=m v/(|q| B), q=m=1',
    assumptions: 'Normalized charge and mass. Magnetic force magnitude is |q| v B for v perpendicular to B.',
    rows: [['F_E', 'FE', 'N'], ['F_B', 'FB', 'N'], ['r_c', 'rC', 'm']],
    eval: (p) => E.lorentzEval(p),
  }),
  induction: (spec) => algebraic(spec, {
    equation: 'ε=−N dΦ/dt',
    assumptions: 'The dPhi knob is the flux derivative. Griffiths Ch. 7.',
    rows: [['ε', 'emf', 'V']],
    eval: (p) => E.faradayEval(p),
  }),
  inductance: (spec) => algebraic(spec, {
    equation: 'M=k L',
    assumptions: 'L1=L2=L, so M=k sqrt(L1 L2)=k L.',
    rows: [['M', 'M', 'H']],
    eval: (p) => E.mutualEval(p),
  }),
  maxwell: (spec) => algebraic(spec, {
    equation: 'λ=c/f',
    assumptions: 'Vacuum plane wave. The cavity comparison uses a 1 m cube and mode index n: f=(c/2)sqrt(1+n²).',
    rows: [['λ', 'lam', 'm'], ['f_cav', 'fCav', 'Hz']],
    eval: (p) => E.maxwellEval(p),
  }),
  tline: (spec) => algebraic(spec, {
    equation: 'τ=len/c, Z=Z0',
    assumptions: 'Lossless TEM line at vacuum speed. Length is in meters.',
    rows: [['Z0', 'Z0', 'Ω'], ['τ', 'delay', 's']],
    eval: (p) => E.tlineEval(p),
  }),
  antenna: (spec) => algebraic(spec, {
    equation: 'AF=|cos((2π d+δ)/2)| at endfire',
    assumptions: 'Balanis. len and d are in wavelengths. phi is the inter-element phase in degrees. Element factor (1−cos(π len))² at broadside.',
    rows: [['AF', 'AF'], ['F', 'elem']],
    eval: (p) => E.antennaEval(p),
  })
};
