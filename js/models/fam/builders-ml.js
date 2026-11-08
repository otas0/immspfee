/** fam ml builders (split from discrete) */
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

export const BUILDERS_ML = {
  'linear-model': (spec) => algebraic(spec, {
    equation: 'β=(Σ x y)/(Σ x²+λ); one GD step β=lr·mean(x y)',
    assumptions: 'Design x=1..8, y=2x. Ridge has no intercept. One gradient step starts at β=0. Not a fitted dataset.',
    rows: [['β_ridge', 'ridge'], ['β_gd', 'gd']],
    eval: (p) => {
      let sxx = 0;
      let sxy = 0;
      for (let i = 1; i <= 8; i += 1) {
        sxx += i * i;
        sxy += i * (2 * i);
      }
      const reg = Math.max(0, P(p, 'reg', 0));
      const lr = P(p, 'lr', 0.1);
      const ridge = sxy / (sxx + reg);
      const gd = lr * (sxy / 8);
      return { val: ridge, ridge, gd };
    },
  }),
  'tree-model': (spec) => algebraic(spec, {
    equation: 'leaves=trees·min(2^{depth}, n_rows)',
    assumptions: 'Capacity of an ensemble, not an accuracy. n_rows=max(2, round(8·sample)). Depth is capped at 8 in the leaf count.',
    rows: [['leaves', 'leaves']],
    eval: (p) => {
      const trees = Math.max(1, Math.round(P(p, 'trees', 1)));
      const depth = Math.max(1, Math.round(P(p, 'depth', 1)));
      const rows = Math.max(2, Math.round(8 * clamp(P(p, 'sample', 1), 0, 1)));
      const leaves = trees * Math.min(2 ** Math.min(depth, 8), rows);
      return { val: leaves, leaves };
    },
  }),
  kernel: (spec) => algebraic(spec, {
    equation: 'k=exp(−γ ‖x−y‖²), ‖x−y‖=1',
    assumptions: 'RBF kernel between two stated points a unit apart. C is the SVM box constraint. Bishop / Schölkopf.',
    rows: [['k', 'k'], ['C', 'C']],
    eval: (p) => {
      const gamma = P(p, 'gamma', 1);
      const Cbox = P(p, 'C', 1);
      const k = Math.exp(-gamma);
      return { val: k, k, C: Cbox };
    },
  }),
  cluster: (spec) => algebraic(spec, {
    equation: 'Lloyd k-means inertia',
    assumptions: 'Eight fixed 1D points. metric 0 is squared distance, metric≥1 is absolute distance with a median update.',
    rows: [['inertia', 'inertia']],
    eval: (p) => {
      const inertia = E.kmeansInertia(P(p, 'k', 2), P(p, 'metric', 0));
      return { val: inertia, inertia };
    },
  }),
  dimred: (spec) => algebraic(spec, {
    equation: 'PCA retained variance',
    assumptions: '2×2 covariance of a stated cloud. k≥2 keeps both components. nn is the sample count. t-SNE is not computed.',
    rows: [['fraction', 'fraction']],
    eval: (p) => {
      const fraction = E.pcaFraction(P(p, 'k', 2), P(p, 'nn', 10));
      return { val: fraction, fraction };
    },
  }),
  nn: (spec) => algebraic(spec, {
    equation: 'a ← act(0.1·width·a), input 1',
    assumptions: 'Identical weights 0.1. act 0 ReLU, 1 tanh, 2 sigmoid, else linear. Not a trained model.',
    rows: [['y', 'y']],
    eval: (p) => {
      const y = E.nnForward(P(p, 'layers', 1), P(p, 'width', 4), P(p, 'act', 0));
      return { val: y, y };
    },
  }),
  attention: (spec) => algebraic(spec, {
    equation: 'softmax(q·k/√d_k)',
    assumptions: 'Vaswani et al. 2017. Two tokens, scores √d_k and 0. Parameter count is heads·d_k.',
    rows: [['w0', 'w0'], ['params', 'params']],
    eval: (p) => {
      const dk = Math.max(1, P(p, 'dk', 1));
      const s0 = Math.sqrt(dk);
      const e0 = Math.exp(s0 - s0);
      const e1 = Math.exp(0 - s0);
      const w0 = e0 / (e0 + e1);
      const params = Math.max(1, Math.round(P(p, 'heads', 1))) * dk;
      return { val: w0, w0, params };
    },
  }),
  rl: (spec) => algebraic(spec, {
    equation: 'V=1/(1−γ)',
    assumptions: 'Sutton & Barto. One-state continuing task with reward 1. One TD step from 0 is the learning rate.',
    rows: [['V', 'V'], ['td', 'td']],
    eval: (p) => {
      const gamma = clamp(P(p, 'gamma', 0.9), 0, 0.999999);
      const V = 1 / (1 - gamma);
      const td = P(p, 'lr', 0);
      return { val: V, V, td };
    },
  }),
  transformer: (spec) => algebraic(spec, {
    equation: 'V2/V1=1/a',
    assumptions: 'Ideal transformer. load is the per-unit secondary current and does not change the voltage ratio.',
    rows: [['V2/V1', 'ratio'], ['I_pu', 'Ipu']],
    eval: (p) => E.transformerEval(p),
  })
};
