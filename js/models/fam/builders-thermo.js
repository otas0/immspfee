/** fam thermo builders */
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

export const BUILDERS_THERMO = {
  'ideal-gas': (spec) => algebraic(spec, {
    equation: 'P2/P0=2^{−n}, T2=T0·2^{1−n}',
    assumptions: 'Polytropic ideal gas probed at V/V0=2. Çengel & Boles.',
    rows: [['P2/P0', 'pRatio'], ['T2', 'T2', 'K']],
    eval: (p) => E.idealGasEval(p),
  }),
  'heat-engine': (spec) => algebraic(spec, {
    equation: 'η_C=1−1/TR, η_Otto=1−r^{1−γ}, γ=1.4',
    assumptions: 'TR=Th/Tc (Carnot). Otto η=1−r^{1−γ} with fixed cold-air γ=1.4 (Çengel & Boles); γ is not a live knob.',
    rows: [['η_C', 'etaC'], ['η_Otto', 'etaO']],
    eval: (p) => E.heatEngineEval(p),
  }),
  convection: (spec) => algebraic(spec, {
    equation: 'q=h·1 K; Nu=0.664 Re^{1/2} Pr^{1/3}',
    assumptions: 'Newton cooling per kelvin. Blasius flat plate, L=1 m, air ν=1.5e−5, Pr=0.7, k=0.026.',
    rows: [['q', 'q', 'W/m²'], ['h_Bl', 'hBl', 'W/(m²K)']],
    eval: (p) => E.convectionEval(p),
  }),
  radiation: (spec) => algebraic(spec, {
    equation: 'q=ε σ T⁴',
    assumptions: 'Surface exitance. σ=5.670374419e−8. No incoming irradiation.',
    rows: [['q', 'q', 'W/m²']],
    eval: (p) => E.radiationEval(p),
  }),
  'kinetic-gas': (spec) => algebraic(spec, {
    equation: 'v_rms=√(3 R T / M)',
    assumptions: 'Ideal gas. mMol is the molar mass in g/mol. R=8.314 J/(mol·K).',
    rows: [['v_rms', 'vrms', 'm/s'], ['v_p', 'vp', 'm/s']],
    eval: (p) => E.kineticEval(p),
  }),
  brownian: (spec) => algebraic(spec, {
    equation: '<x²>=2 D τ',
    assumptions: 'Ensemble mean-square displacement in one dimension. τ is the time knob. No random path is drawn.',
    rows: [['<x²>', 'msd']],
    eval: (p) => E.brownianEval(p),
  }),
  ising: (spec) => algebraic(spec, {
    equation: 'm=tanh((4 J m+H)/T)',
    assumptions: 'Mean-field Ising, coordination 4. Negative J is not a staggered antiferromagnet in this scalar equation.',
    rows: [['m', 'm']],
    eval: (p) => E.isingEval(p),
  }),
  percolation: (spec) => algebraic(spec, {
    equation: 'S=(1+p)/(1−p)',
    assumptions: 'Exact one-dimensional site percolation. Not a 2D random lattice.',
    rows: [['S', 'S']],
    eval: (p) => E.percolationEval(p),
  }),
  'entropy-mix': (spec) => algebraic(spec, {
    equation: 'Δs/R=−x ln x−(1−x) ln(1−x)',
    assumptions: 'Ideal binary mixture, one mole. Temperature cancels in Δs and remains in Δg=−T Δs.',
    rows: [['Δs/R', 'sOverR'], ['Δg/R', 'gOverR', 'K']],
    eval: (p) => E.entropyEval(p),
  })
};
