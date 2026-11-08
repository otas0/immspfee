/** fam eng builders (split from discrete) */
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

export const BUILDERS_ENG = {
  hashtable: (spec) => algebraic(spec, {
    equation: 'E[probes]=1+α/2',
    assumptions: 'CLRS chaining, successful search. α is the load knob. Keys=α·capacity.',
    rows: [['E', 'probes'], ['keys', 'keys']],
    eval: (p) => {
      const cap = Math.max(0, P(p, 'cap', 16));
      const load = Math.max(0, P(p, 'load', 0));
      return { val: 1 + load / 2, probes: 1 + load / 2, keys: load * cap };
    },
  }),
  'sym-enc': (spec) => algebraic(spec, {
    equation: 'AES-128/192/256 rounds = keyBits/32+6',
    assumptions: 'FIPS-197 round count only when the key size is 128, 192, or 256. Other sizes report 0. No ciphertext is produced. mode is ECB/CBC/CTR as an index.',
    rows: [['rounds', 'rounds'], ['mode', 'mode']],
    eval: (p) => {
      const bits = Math.round(P(p, 'keyBits', 128));
      const rounds = bits === 128 || bits === 192 || bits === 256 ? bits / 32 + 6 : 0;
      return { val: rounds, rounds, mode: P(p, 'mode', 0) };
    },
  }),
  pubkey: (spec) => algebraic(spec, {
    equation: 'c=m^e mod n, toy primes',
    assumptions: 'Classroom RSA toy only (not a secure key). Fixed constants: e=65537, plaintext m=42; primes = largest ≤2^k and next lower, k=clamp(bits/4,8,16). No padding, no CRT, no real entropy.',
    rows: [['c', 'c'], ['n', 'n']],
    eval: (p) => {
      const bits = P(p, 'bits', 64);
      const k = clamp(Math.round(bits / 4), 8, 16);
      const hi = primeAtMost(2 ** k);
      const lo = primeAtMost(hi - 1);
      const n = hi * lo;
      const c = modPow(42, 65537, n);
      return { val: c, c, n };
    },
  }),
  hash: (spec) => algebraic(spec, {
    equation: 'FNV-1a 32-bit of len bytes 0x61',
    assumptions: 'Not MD5 or SHA. Public-domain FNV-1a of a repeated letter.',
    rows: [['h', 'h']],
    eval: (p) => {
      const h = fnv1a(P(p, 'len', 16), 0x61);
      return { val: h, h };
    },
  }),
  mac: (spec) => algebraic(spec, {
    equation: 'FNV-1a tag of `msg` bytes set to key mod 256',
    assumptions: 'A teaching tag, not HMAC. Katz & Lindell discuss MAC length; this readout is only the FNV tag.',
    rows: [['tag', 'tag']],
    eval: (p) => {
      const tag = fnv1a(P(p, 'msg', 1), Math.round(P(p, 'key', 0)));
      return { val: tag, tag };
    },
  }),
  sched: (spec) => algebraic(spec, {
    equation: 'FCFS average wait, 4 jobs',
    assumptions: 'Job i arrives at i·arrival and runs for `burst`. Silberschatz.',
    rows: [['wait', 'wait']],
    eval: (p) => {
      const wait = E.fcfsWait(P(p, 'arrival', 0), P(p, 'burst', 1));
      return { val: wait, wait };
    },
  }),
  routing: (spec) => algebraic(spec, {
    equation: 'Dijkstra distance (n−1)·cost',
    assumptions: 'Path graph, every hop weighs `cost`. CLRS.',
    rows: [['dist', 'dist']],
    eval: (p) => {
      const dist = E.dijkstraDist(P(p, 'n', 6), P(p, 'cost', 1));
      return { val: dist, dist };
    },
  }),
  queueing: (spec) => algebraic(spec, {
    equation: 'L=ρ/(1−ρ), ρ=λ/μ',
    assumptions: 'M/M/1, Gross & Harris. L is undefined for ρ≥1 and is reported as 0 with stable=0.',
    rows: [['L', 'L'], ['ρ', 'rho'], ['stable', 'stable']],
    eval: (p) => {
      const lam = Math.max(0, P(p, 'lam', 0));
      const mu = pos(P(p, 'mu', 1), 1e-12);
      const rho = lam / mu;
      const stable = rho < 1 ? 1 : 0;
      const L = stable ? rho / (1 - rho) : 0;
      return { val: L, L, rho, stable };
    },
  }),
  isa: (spec) => algebraic(spec, {
    equation: 'cycles=nInst, CPI=1',
    assumptions: 'Single-cycle RISC. Addressing-mode count is the addr knob and does not add cycles. Hennessy & Patterson.',
    rows: [['cycles', 'cycles'], ['modes', 'modes']],
    eval: (p) => ({
      val: P(p, 'nInst', 0),
      cycles: P(p, 'nInst', 0),
      modes: P(p, 'addr', 0),
    }),
  }),
  pipeline: (spec) => algebraic(spec, {
    equation: 'CPI=1/issue, latency=stages',
    assumptions: 'Ideal pipeline, no hazards. Hennessy & Patterson.',
    rows: [['CPI', 'cpi'], ['latency', 'latency']],
    eval: (p) => {
      const issue = pos(P(p, 'issue', 1), 1e-9);
      const latency = P(p, 'stages', 1);
      return { val: 1 / issue, cpi: 1 / issue, latency };
    },
  }),
  cache: (spec) => algebraic(spec, {
    equation: 'LRU hit rate on a sequential scan',
    assumptions: 'Hennessy & Patterson. Capacity, block, and associativity define the sets. The scan is at most 2048 references.',
    rows: [['hit', 'hit']],
    eval: (p) => {
      const hit = E.cacheHitRate(P(p, 'cap', 16), P(p, 'block', 4), P(p, 'assoc', 1));
      return { val: hit, hit };
    },
  }),
  branch: (spec) => algebraic(spec, {
    equation: '2-bit counter mispredict rate',
    assumptions: 'Smith 2-bit counters on 64 phase-shifted loops. hist is the taken-run length. A table smaller than 64 aliases PCs.',
    rows: [['mis', 'mis']],
    eval: (p) => {
      const mis = E.branchMisrate(P(p, 'hist', 2), P(p, 'table', 64));
      return { val: mis, mis };
    },
  }),
  bus: (spec) => algebraic(spec, {
    equation: 'share=bw/masters',
    assumptions: 'Equal share of a stated bandwidth.',
    rows: [['share', 'share']],
    eval: (p) => {
      const masters = pos(P(p, 'masters', 1), 1e-9);
      const share = P(p, 'bw', 0) / masters;
      return { val: share, share };
    },
  }),
  adc: (spec) => algebraic(spec, {
    equation: 'SQNR=6.0206 N+1.7609 dB',
    assumptions: 'Full-scale sine quantization. Nyquist frequency is fs/2. Oppenheim & Schafer.',
    rows: [['SQNR', 'sqnr', 'dB'], ['f_N', 'fN', 'Hz']],
    eval: (p) => {
      const bits = P(p, 'bits', 8);
      const sqnr = 6.0206 * bits + 1.7609;
      const fN = P(p, 'fs', 0) / 2;
      return { val: sqnr, sqnr, fN };
    },
  }),
  dma: (spec) => algebraic(spec, {
    equation: 'beats=size',
    assumptions: 'One beat per unit of the size knob. prio is the channel priority.',
    rows: [['beats', 'beats'], ['prio', 'prio']],
    eval: (p) => ({
      val: P(p, 'size', 0),
      beats: P(p, 'size', 0),
      prio: P(p, 'prio', 0),
    }),
  }),
  rtsched: (spec) => algebraic(spec, {
    equation: 'U=exec/period',
    assumptions: 'One task. Liu & Layland: the task is schedulable when U≤1. RM and EDF agree for one task.',
    rows: [['U', 'U'], ['ok', 'ok']],
    eval: (p) => {
      const U = P(p, 'exec', 0) / pos(P(p, 'period', 1), 1e-9);
      return { val: U, U, ok: U <= 1 ? 1 : 0 };
    },
  }),
  'irq-nest': (spec) => algebraic(spec, {
    equation: 'depth=levels',
    assumptions: 'Nesting depth is bounded by the priority-level count. rate is the interrupt rate.',
    rows: [['depth', 'depth'], ['rate', 'rate']],
    eval: (p) => ({
      val: P(p, 'levels', 0),
      depth: P(p, 'levels', 0),
      rate: P(p, 'rate', 0),
    }),
  }),
  'sample-quant': (spec) => algebraic(spec, {
    equation: 'SQNR=6.0206 N+1.7609; Nyquist fs≥2 f0',
    assumptions: 'Same sine quantization formula as the ADC. alias=1 when fs<2 f0.',
    rows: [['SQNR', 'sqnr', 'dB'], ['alias', 'alias']],
    eval: (p) => {
      const sqnr = 6.0206 * P(p, 'N', 8) + 1.7609;
      const alias = P(p, 'fs', 0) < 2 * P(p, 'f0', 0) ? 1 : 0;
      return { val: sqnr, sqnr, alias };
    },
  }),
  filter: (spec) => algebraic(spec, {
    equation: '|H(f)|=1/√(1+(f/fc)^{2n})',
    assumptions: 'Analog Butterworth magnitude. Evaluated at f=min(0.45, 2 fc). Oppenheim & Schafer.',
    rows: [['|H|', 'H']],
    eval: (p) => {
      const n = Math.max(1, Math.round(P(p, 'order', 1)));
      const fc = pos(P(p, 'fc', 0.1), 1e-6);
      const f = Math.min(0.45, 2 * fc);
      const H = 1 / Math.sqrt(1 + (f / fc) ** (2 * n));
      return { val: H, H };
    },
  }),
  sync: (spec) => algebraic(spec, {
    equation: 'τ=1/bw',
    assumptions: 'First-order loop time constant. jitter is the supplied rms and is not converted into a variance model.',
    rows: [['τ', 'tau'], ['jitter', 'jitter']],
    eval: (p) => {
      const tau = 1 / pos(P(p, 'bw', 0.01), 1e-9);
      return { val: tau, tau, jitter: P(p, 'jitter', 0) };
    },
  }),
  'pipe-flow': (spec) => algebraic(spec, {
    equation: 'f=64/Re (laminar) or Swamee–Jain',
    assumptions: 'Darcy friction factor. eps is relative roughness ε/D. Laminar below Re=2300.',
    rows: [['f', 'f']],
    eval: (p) => E.darcyEval(p),
  }),
  'pump-fan': (spec) => algebraic(spec, {
    equation: 'Q/Qref=(rpm/1450)·units, H/Href=(rpm/1450)²',
    assumptions: 'Affinity laws about 1450 rpm. Qref=1 per machine.',
    rows: [['Q', 'Q'], ['H', 'H']],
    eval: (p) => E.pumpEval(p),
  }),
  'conv-eng': (spec) => algebraic(spec, {
    equation: 'q=h·1 K; Nu=0.664 Re^{1/2} Pr^{1/3}',
    assumptions: 'Same Newton and Blasius relations as the convection family. Incropera.',
    rows: [['q', 'q', 'W/m²'], ['h_Bl', 'hBl', 'W/(m²K)']],
    eval: (p) => E.convEngEval(p),
  }),
  'rad-eng': (spec) => algebraic(spec, {
    equation: 'q=ε σ T⁴, F12=1',
    assumptions: 'Infinite parallel plates, view factor 1, enclosure at 0 K. Incropera.',
    rows: [['q', 'q', 'W/m²']],
    eval: (p) => E.radEngEval(p),
  }),
  combustion: (spec) => algebraic(spec, {
    equation: 'excess air=1/φ−1',
    assumptions: 'Turns. φ>1 is fuel-rich and the excess-air term is negative. T is the reactant temperature, not an adiabatic flame temperature.',
    rows: [['φ', 'phi'], ['excess', 'excess']],
    eval: (p) => E.combustionEval(p),
  }),
  storage: (spec) => algebraic(spec, {
    equation: 'hours=E/P',
    assumptions: 'E in kWh and P in kW, so the ratio is hours.',
    rows: [['t', 'hours', 'h']],
    eval: (p) => E.storageEval(p),
  }),
  reactor: (spec) => algebraic(spec, {
    equation: 'X=kτ/(1+kτ), τ=V/v',
    assumptions: 'Isothermal irreversible first-order reaction. Fogler. Xp is the PFR conversion.',
    rows: [['X_cstr', 'Xc'], ['X_pfr', 'Xp']],
    eval: (p) => E.cstrEval(p),
  }),
  distill: (spec) => algebraic(spec, {
    equation: 'Nmin=ln[(xD/(1−xD))((1−xB)/xB)]/ln α',
    assumptions: 'Fenske for α=2.5, xD=0.95, xB=0.05. feed/N is the relative feed location.',
    rows: [['feed/N', 'feedFrac'], ['Nmin', 'Nmin']],
    eval: (p) => E.fenskeEval(p),
  }),
  absorb: (spec) => algebraic(spec, {
    equation: 'fraction=A/(1+A), A=L/G',
    assumptions: 'Single equilibrium stage, equilibrium slope m=1. Temperature is recorded and does not change m.',
    rows: [['abs', 'frac'], ['T', 'T', 'K']],
    eval: (p) => E.absorbEval(p),
  }),
  extract: (spec) => algebraic(spec, {
    equation: 'Kremser fraction (S^{N+1}−S)/(S^{N+1}−1)',
    assumptions: 'Extraction factor S, distribution ratio 1. At S=1 the fraction is N/(N+1).',
    rows: [['frac', 'frac']],
    eval: (p) => E.extractEval(p),
  }),
  crystal: (spec) => algebraic(spec, {
    equation: 'ln S',
    assumptions: 'Supersaturation ratio. No nucleation prefactor. Mullin.',
    rows: [['ln S', 'lnS'], ['T', 'T', 'K']],
    eval: (p) => E.crystalEval(p),
  })
};
