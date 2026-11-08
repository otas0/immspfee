/** fam mechanics builders */
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

export const BUILDERS_MECHANICS = {
  projectile: (spec) => algebraic(spec, {
    equation: 'x=v0 cosθ t, y=v0 sinθ t−½ g t²; linear drag k=b/m',
    assumptions: 'Plane motion. k=0 is the vacuum parabola. k>0 is linear drag with k=b/m. The canvas draws the (x,y) trajectory, not a scalar hist.',
    initial: ['v0', 'theta'],
    drawKind: 'xy',
    rows: [['y', 'y', 'm'], ['x', 'x', 'm'], ['vx', 'vx', 'm/s'], ['vy', 'vy', 'm/s']],
    eval: E.projectileEval,
  }),
  inclined: (spec) => algebraic(spec, {
    equation: 'a=g(sinθ−μ cosθ), g=9.81',
    assumptions: 'Constant g=9.81 m/s². +s is down the plane. Friction points up the plane, which is the catalog formula. N=m g cosθ.',
    initial: ['v0'],
    rows: [['a', 'a', 'm/s²'], ['v', 'v', 'm/s'], ['s', 's', 'm'], ['N', 'N', 'N']],
    eval: E.inclinedEval,
  }),
  atwood: (spec) => algebraic(spec, {
    equation: 'a=(m1−m2)/(m1+m2)·g, m1=mRatio, m2=1 kg',
    assumptions: 'Ideal vertical Atwood machine, g=9.81. μ does not enter: a vertical string has no surface for Coulomb friction.',
    rows: [['a', 'a', 'm/s²'], ['m1', 'm1', 'kg'], ['m2', 'm2', 'kg']],
    eval: (p) => E.atwoodEval(p),
  }),
  circular: (spec) => algebraic(spec, {
    equation: 'a=ω² r',
    assumptions: 'Uniform circular motion. Canvas draws the circular path in the plane.',
    drawKind: 'xy',
    rows: [['a', 'ac', 'm/s²'], ['x', 'x', 'm'], ['y', 'y', 'm']],
    eval: E.circularEval,
  }),
  'rigid-plane': (spec) => algebraic(spec, {
    equation: 'I α = torque; rolling a=g sinθ/(1+I/(m r²)) with m=r=1',
    assumptions: 'Goldstein rigid body. Slope is in degrees. I is about the center. No slip: a=g sinθ / (1+I).',
    rows: [['a', 'a', 'm/s²']],
    eval: (p) => {
      const I = Math.max(0, P(p, 'I', 0.5));
      const slope = P(p, 'slope', 0) * Math.PI / 180;
      const a = G * Math.sin(slope) / (1 + I);
      return { val: a, a };
    },
  }),
  collision: (spec) => algebraic(spec, {
    equation: 'v1n=(m1−e m2)/(m1+m2)·u1n, v2n=m1(1+e)/(m1+m2)·u1n',
    assumptions: 'm2=1, u1=1, u2=0. e is the normal restitution. Tangential velocity is unchanged. angle is the impact normal. Canvas sketches the impact-normal path.',
    drawKind: 'xy',
    rows: [['v1', 'v1', 'm/s'], ['v2', 'v2', 'm/s'], ['e', 'e']],
    eval: (p) => E.collisionEval(p),
  }),
  'variable-mass': (spec) => algebraic(spec, {
    equation: 'v=−u ln(m/m0), m0=1 kg, a(0)=u ṁ/m0',
    assumptions: 'Tsiolkovsky, no gravity, no external force. ṁ is the propellant mass-loss rate. m is held at or above 0.05 kg.',
    rows: [['a0', 'a0', 'm/s²'], ['v', 'v', 'm/s'], ['m', 'm', 'kg']],
    eval: E.rocketEval,
  }),
  noninertial: (spec) => algebraic(spec, {
    equation: 'a=a_frame−2 ω×v, v0=(1,0) m/s',
    assumptions: 'Horizontal frame. ω is vertical. The initial velocity is 1 m/s along x so the Coriolis term is defined.',
    rows: [['ay', 'ay', 'm/s²'], ['ax', 'ax', 'm/s²'], ['|a|', 'aMag', 'm/s²']],
    eval: (p) => E.noninertialEval(p),
  }),
  'pendulum-chain': (spec) => algebraic(spec, {
    equation: "θ''=−(g/L) sinθ",
    assumptions: 'Simple pendulum. Mass cancels in the acceleration and remains in the energy. g=9.81.',
    initial: ['theta0'],
    rows: [['α', 'alpha', 'rad/s²'], ['θ', 'thetaDeg', '°'], ['E', 'E', 'J']],
    reset: E.pendulumReset,
    integrate: true,
    eval: E.pendulumEval,
  }),
  orbit: (spec) => algebraic(spec, {
    equation: 'a=M/r² (G=1); r_a=r_p(1+e)/(1−e) for e<1',
    assumptions: 'G=1. a_c uses r0. e_osc is the osculating eccentricity of a perpendicular launch at speed v0. r_a uses the eccentricity knob with periapsis r0. Canvas draws the focus-origin conic for the e knob.',
    initial: ['v0', 'r0'],
    drawKind: 'xy',
    rows: [['a', 'ac'], ['e_osc', 'eOsc'], ['r_a', 'rA'], ['v_peri', 'vPeri']],
    eval: (p) => E.orbitEval(p),
  }),
  sho: (spec) => algebraic(spec, {
    equation: "x''=−(k/m) x",
    assumptions: 'Closed form x=x0 cos(ω t), ω=sqrt(k/m), from t=0.',
    initial: ['x0'],
    rows: [['a', 'a', 'm/s²'], ['x', 'x', 'm'], ['ω', 'omega', 'rad/s']],
    eval: E.shoEval,
  }),
  damped: (spec) => algebraic(spec, {
    equation: 'm x\'\'+c x\'+k x=0, m=1, x(0)=1, v(0)=0',
    assumptions: 'Mass is 1 kg. ζ=c/(2√k). The closed form covers under-, critical, and over-damping.',
    rows: [['ζ', 'zeta'], ['x', 'x', 'm'], ['ω0', 'omega0', 'rad/s']],
    eval: E.dampedEval,
  }),
  forced: (spec) => algebraic(spec, {
    equation: 'x\'\'+c x\'+x=F0 cos(2π f t), m=k=1',
    assumptions: 'Steady-state amplitude. ω0=1 because k=m=1. fDrive is in hertz.',
    rows: [['A', 'A', 'm'], ['φ', 'phi', 'rad']],
    eval: (p) => E.forcedEval(p),
  }),
  coupled: (spec) => algebraic(spec, {
    equation: 'x_i\'\'=−x_i+κ(x_{i−1}−2x_i+x_{i+1}), fixed ends',
    assumptions: 'Unit on-site springs. Highest-mode ω^2=1+4κ sin^2(q/2), q=Nπ/(N+1).',
    rows: [['ω_max', 'omegaMax', 'rad/s'], ['a1', 'a1', 'm/s²'], ['N', 'N']],
    eval: (p) => E.coupledEval(p),
  }),
  'nonlinear-osc': (spec) => algebraic(spec, {
    equation: "x''+x+β x³=F cos(t), x(0)=1, v(0)=0",
    assumptions: 'Undamped driven Duffing with ω=1. No van der Pol term: the knobs are β and the drive.',
    rows: [['a', 'a'], ['x', 'x'], ['v', 'v']],
    reset: E.duffingReset,
    integrate: true,
    eval: E.duffingEval,
  })
};
