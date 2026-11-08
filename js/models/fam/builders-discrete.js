/** fam discrete builders */
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

export const BUILDERS_DISCRETE = {
  sort: (spec) => algebraic(spec, {
    equation: 'insertion-sort comparisons',
    assumptions: 'CLRS insertion sort. The array is 0..n−1 with a reversed prefix of length (1−sortedness)·n. n is capped at 256.',
    rows: [['comps', 'comps']],
    eval: (p) => {
      const comps = E.insertionComps(P(p, 'n', 16), P(p, 'sortedness', 0));
      return { val: comps, comps };
    },
  }),
  search: (spec) => algebraic(spec, {
    equation: 'probes: linear n, binary ⌊log2 n⌋+1, interpolation ⌊log2 log2 n⌋+1',
    assumptions: 'collide selects the strategy: 0 linear worst case, 1 binary worst case, 2 interpolation average for uniform keys (CLRS).',
    rows: [['probes', 'probes']],
    eval: (p) => {
      const probes = E.searchProbes(P(p, 'n', 32), P(p, 'collide', 0));
      return { val: probes, probes };
    },
  }),
  'graph-trav': (spec) => algebraic(spec, {
    equation: 'BFS distance on a path plus p-controlled chords',
    assumptions: 'CLRS BFS. Nodes are capped at 48. Chord i—i+2 exists for the first floor(p(n−2)) vertices.',
    rows: [['dist', 'dist']],
    eval: (p) => {
      const dist = E.bfsDist(P(p, 'n', 10), P(p, 'p', 0));
      return { val: dist, dist };
    },
  }),
  shortest: (spec) => algebraic(spec, {
    equation: 'Dijkstra on a path of weight wSpread',
    assumptions: 'CLRS Dijkstra. Nonnegative weights. Distance to the last node is (n−1)·w, computed by the algorithm.',
    rows: [['dist', 'dist']],
    eval: (p) => {
      const dist = E.dijkstraDist(P(p, 'n', 10), P(p, 'wSpread', 1));
      return { val: dist, dist };
    },
  }),
  mst: (spec) => algebraic(spec, {
    equation: 'Kruskal weight',
    assumptions: 'CLRS Kruskal. Path edges weigh 3. Chords i—i+2 weigh 1 for the first floor(p(n−2)) indices. n≤40.',
    rows: [['weight', 'weight']],
    eval: (p) => {
      const weight = E.mstWeight(P(p, 'n', 12), P(p, 'p', 0));
      return { val: weight, weight };
    },
  }),
  'string-match': (spec) => algebraic(spec, {
    equation: 'KMP comparison count',
    assumptions: 'CLRS KMP. Pattern is a…ab of length m. Text is a…a of length n. Lengths are capped.',
    rows: [['comps', 'comps']],
    eval: (p) => {
      const comps = E.kmpComparisons(P(p, 'm', 4), P(p, 'n', 50));
      return { val: comps, comps };
    },
  }),
  dp: (spec) => algebraic(spec, {
    equation: '0/1 knapsack',
    assumptions: 'CLRS. Item i has weight (i mod 5)+1 and value (i mod 3)+1. n≤32, capacity≤80.',
    rows: [['value', 'value']],
    eval: (p) => {
      const value = E.knapsack(P(p, 'n', 8), P(p, 'cap', 10));
      return { val: value, value };
    },
  }),
  'tree-ds': (spec) => algebraic(spec, {
    equation: 'h_BST=n−1, h_AVL=⌈log2(n+1)⌉',
    assumptions: 'Sequential insertion degenerates a BST. AVL height is the balanced bound. B-tree minimum degree is `order` (CLRS).',
    rows: [['h_BST', 'hBst'], ['h_AVL', 'hAvl'], ['h_B', 'hB']],
    eval: (p) => {
      const h = E.treeHeights(P(p, 'n', 20), P(p, 'order', 2));
      return { val: h.hAvl, ...h };
    },
  }),
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
  uf: (spec) => algebraic(spec, {
    equation: 'union-by-rank with path compression',
    assumptions: 'CLRS. Unions join i with i+1. The readout is the parent-access count.',
    rows: [['ops', 'ops']],
    eval: (p) => {
      const ops = E.ufOps(P(p, 'n', 32));
      return { val: ops, ops };
    },
  }),
  heap: (spec) => algebraic(spec, {
    equation: 'build-heap comparisons',
    assumptions: 'CLRS sift-down heapify of n, n−1, …, 1. n≤300.',
    rows: [['comps', 'comps']],
    eval: (p) => {
      const comps = E.heapComps(P(p, 'n', 20));
      return { val: comps, comps };
    },
  }),
  segtree: (spec) => algebraic(spec, {
    equation: 'point-query depth = ⌈log2 n⌉',
    assumptions: 'CLRS segment tree. A point query walks one root-to-leaf path.',
    rows: [['depth', 'depth']],
    eval: (p) => {
      const n = Math.max(1, P(p, 'n', 2));
      const depth = Math.ceil(Math.log2(n));
      return { val: depth, depth };
    },
  }),
  fa: (spec) => algebraic(spec, {
    equation: '|δ|=|Q|·|Σ|',
    assumptions: 'Complete DFA. Hopcroft, Motwani, Ullman.',
    rows: [['transitions', 'transitions']],
    eval: (p) => {
      const transitions = Math.round(P(p, 'states', 1)) * Math.round(P(p, 'alpha', 1));
      return { val: transitions, transitions };
    },
  }),
  pda: (spec) => algebraic(spec, {
    equation: '|δ| bound = |Q|·|Γ|·|Σ|, |Σ|=2',
    assumptions: 'Upper bound on a complete PDA transition relation. Not a particular grammar.',
    rows: [['bound', 'bound']],
    eval: (p) => {
      const bound = Math.round(P(p, 'states', 1)) * Math.round(P(p, 'stackA', 1)) * 2;
      return { val: bound, bound };
    },
  }),
  tm: (spec) => algebraic(spec, {
    equation: '|Q|·|Γ|',
    assumptions: 'Sipser. Count of state/symbol pairs, not a universal simulator.',
    rows: [['pairs', 'pairs']],
    eval: (p) => {
      const pairs = Math.round(P(p, 'states', 1)) * Math.round(P(p, 'alpha', 1));
      return { val: pairs, pairs };
    },
  }),
  regex: (spec) => algebraic(spec, {
    equation: 'Thompson NFA states ≈ 2·len+2·complexity',
    assumptions: 'Size of a Thompson NFA for `complexity` alternations plus a literal of length `len`. Hopcroft.',
    rows: [['states', 'states']],
    eval: (p) => {
      const states = 2 * Math.round(P(p, 'len', 1)) + 2 * Math.round(P(p, 'complexity', 1));
      return { val: states, states };
    },
  }),
  grammar: (spec) => algebraic(spec, {
    equation: 'yield=min(steps, size)',
    assumptions: 'A grammar whose productions are each used at most once. The yield grows by one terminal per used production.',
    rows: [['yield', 'yield']],
    eval: (p) => {
      const yieldLen = Math.min(Math.max(0, P(p, 'steps', 0)), Math.max(0, P(p, 'size', 0)));
      return { val: yieldLen, yield: yieldLen };
    },
  }),
  computability: (spec) => algebraic(spec, {
    equation: 'counter halts in `input` steps',
    assumptions: 'Sipser. This is a total counter machine. It does not decide the halting problem. encoding selects a Gödel convention index and is reported as that index.',
    rows: [['steps', 'steps'], ['encoding', 'encoding']],
    eval: (p) => ({
      val: P(p, 'input', 0),
      steps: P(p, 'input', 0),
      encoding: P(p, 'encoding', 0),
    }),
  }),
  complexity: (spec) => algebraic(spec, {
    equation: 'log2(n!) via Stirling',
    assumptions: 'CLRS comparison-sort decision-tree lower bound. Stirling series through the ½ log term.',
    rows: [['bound', 'bound']],
    eval: (p) => {
      const n = Math.max(1, P(p, 'n', 2));
      const bound = n < 2
        ? 0
        : (n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n)) / Math.LN2;
      return { val: bound, bound };
    },
  }),
  ca: (spec) => algebraic(spec, {
    equation: 'elementary CA rule',
    assumptions: 'Wolfram. Width 24, eight steps, periodic boundaries. seed sets the initial bits.',
    initial: ['seed'],
    rows: [['pop', 'pop']],
    eval: (p) => {
      const pop = E.caPopulation(P(p, 'rule', 0), P(p, 'seed', 1));
      return { val: pop, pop };
    },
  }),
  'ca-app': (spec) => algebraic(spec, {
    equation: '1D sandpile topples',
    assumptions: 'Height above thresh sends one grain to each neighbor. The first floor(p·16) sites start at threshold.',
    rows: [['topples', 'topples']],
    eval: (p) => {
      const topples = E.sandTopples(P(p, 'p', 0), P(p, 'thresh', 2));
      return { val: topples, topples };
    },
  }),
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
  conv: (spec) => algebraic(spec, {
    equation: 'MACs=L_out·k·channels, L_out=⌊(8−k)/stride⌋+1',
    assumptions: 'Valid convolution of a length-8 input. No feature values are invented.',
    rows: [['MACs', 'macs']],
    eval: (p) => {
      const k = Math.max(1, Math.round(P(p, 'k', 1)));
      const stride = Math.max(1, Math.round(P(p, 'stride', 1)));
      const ch = Math.max(1, Math.round(P(p, 'ch', 1)));
      const out = Math.max(0, Math.floor((8 - k) / stride) + 1);
      const macs = out * k * ch;
      return { val: macs, macs };
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
  'opt-algo': (spec) => algebraic(spec, {
    equation: 'GD on f=x²/2 with momentum',
    assumptions: 'Eight steps from x=1. Velocity update v←mom·v+∇f, x←x−lr·v.',
    rows: [['x', 'x']],
    eval: (p) => {
      let x = 1;
      let v = 0;
      const lr = P(p, 'lr', 0.1);
      const mom = clamp(P(p, 'mom', 0), 0, 0.999);
      for (let i = 0; i < 8; i += 1) {
        v = mom * v + x;
        x -= lr * v;
        if (!Number.isFinite(x)) {
          x = 0;
          break;
        }
        x = clamp(x, -1e6, 1e6);
      }
      return { val: x, x };
    },
  }),
  evo: (spec) => algebraic(spec, {
    equation: 'deterministic ±mut/i trials on x²',
    assumptions: 'Not a random GA. Offspring are accepted only when the square decreases. Trial count is pop/5, at most 40.',
    rows: [['f', 'f']],
    eval: (p) => {
      let x = 1;
      let f = 1;
      const mut = Math.max(0, P(p, 'mut', 0));
      const trials = Math.max(1, Math.min(40, Math.round(P(p, 'pop', 20) / 5)));
      for (let i = 1; i <= trials; i += 1) {
        const step = mut / i;
        for (const cand of [x + step, x - step]) {
          const fc = cand * cand;
          if (fc < f) {
            f = fc;
            x = cand;
          }
        }
      }
      return { val: f, f };
    },
  }),
  pgm: (spec) => algebraic(spec, {
    equation: 'P=c^{n−1}, c=λ/(1+|λ|)',
    assumptions: 'Koller & Friedman chain rule for a chain that copies its parent with probability c. λ is the params knob.',
    rows: [['P', 'prob']],
    eval: (p) => {
      const nodes = Math.max(1, Math.round(P(p, 'nodes', 2)));
      const lam = P(p, 'params', 0.5);
      const c = Math.abs(lam) / (1 + Math.abs(lam));
      const prob = c ** Math.max(0, nodes - 1);
      return { val: prob, prob };
    },
  }),
  'classical-cipher': (spec) => algebraic(spec, {
    equation: 'shift=keyspace mod 26; bits=log2(keyspace)',
    assumptions: 'Caesar shift on a 26-letter alphabet. The bit count is the key-space logarithm, not an attack.',
    rows: [['shift', 'shift'], ['bits', 'bits']],
    eval: (p) => {
      const keyspace = Math.max(1, P(p, 'keyspace', 26));
      return { val: Math.log2(keyspace), shift: Math.round(keyspace) % 26, bits: Math.log2(keyspace) };
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
  'ecc-code': (spec) => algebraic(spec, {
    equation: 'Hamming n=2^m−1, m=K',
    assumptions: 'Binary Hamming code with m parity bits. The rate knob is compared with k/n, k=n−m.',
    rows: [['n', 'n'], ['gap', 'gap']],
    eval: (p) => {
      const m = clamp(Math.round(P(p, 'K', 3)), 2, 12);
      const n = 2 ** m - 1;
      const k = n - m;
      const rateH = k / n;
      const gap = Math.abs(P(p, 'rate', 0) - rateH);
      return { val: n, n, gap };
    },
  }),
  infotheory: (spec) => algebraic(spec, {
    equation: 'H=−p log2 p−(1−p) log2(1−p); C=½ log2(1+snr)',
    assumptions: 'Cover & Thomas. Binary entropy. Real AWGN spectral efficiency at the stated SNR in dB, bandwidth 1 Hz.',
    rows: [['H', 'H', 'bit'], ['C', 'C', 'bit']],
    eval: (p) => {
      const H = E.binaryEntropy(P(p, 'p', 0.5));
      const snr = 10 ** (P(p, 'snr', 0) / 10);
      const cap = 0.5 * Math.log2(1 + snr);
      return { val: H, H, C: cap };
    },
  }),
  compress: (spec) => algebraic(spec, {
    equation: 'H ≤ L < H+1',
    assumptions: 'Zipf masses ∝1/i. Huffman redundancy is less than 1 bit (Cover & Thomas). n=min(dict,512).',
    rows: [['H', 'H', 'bit'], ['L_hi', 'Lhi', 'bit']],
    eval: (p) => {
      const H = E.zipfEntropy(P(p, 'dict', 16));
      return { val: H, H, Lhi: H + 1 };
    },
  }),
  zkp: (spec) => algebraic(spec, {
    equation: 'soundness error = 2^{−rounds}',
    assumptions: 'Honest completeness 1 and a public one-bit challenge. Not a production proof system. Goldwasser, Micali, Rackoff.',
    rows: [['ε', 'eps']],
    eval: (p) => {
      const rounds = Math.max(0, Math.round(P(p, 'rounds', 1)));
      const eps = 2 ** (-rounds);
      return { val: eps, eps };
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
  mem: (spec) => algebraic(spec, {
    equation: 'compulsory faults = ⌈refs / page⌉',
    assumptions: 'One sequential pass. Each new page faults once. page is the page size in address units.',
    rows: [['faults', 'faults']],
    eval: (p) => {
      const page = pos(P(p, 'page', 1), 1e-9);
      const refs = Math.max(0, P(p, 'refs', 0));
      const faults = Math.ceil(refs / page);
      return { val: faults, faults };
    },
  }),
  deadlock: (spec) => algebraic(spec, {
    equation: "Banker's algorithm, need_i=nProc, available=nRes",
    assumptions: 'Allocation is zero. Each process still needs nProc units of one resource type. Safe when nRes≥nProc.',
    rows: [['safe', 'safe']],
    eval: (p) => {
      const nProc = Math.max(1, Math.round(P(p, 'nProc', 1)));
      const nRes = Math.max(0, Math.round(P(p, 'nRes', 0)));
      const safe = nRes >= nProc ? 1 : 0;
      return { val: safe, safe };
    },
  }),
  fs: (spec) => algebraic(spec, {
    equation: 'blocks=⌈fsize/block⌉',
    assumptions: 'inode direct block count is 12. indirect=1 when more blocks are required. Silberschatz.',
    rows: [['blocks', 'blocks'], ['indirect', 'indirect']],
    eval: (p) => {
      const block = pos(P(p, 'block', 1), 1e-9);
      const blocks = Math.ceil(Math.max(0, P(p, 'fsize', 0)) / block);
      return { val: blocks, blocks, indirect: blocks > 12 ? 1 : 0 };
    },
  }),
  netproto: (spec) => algebraic(spec, {
    equation: 'min(bw, (MSS/RTT) √(3/(2p)))',
    assumptions: 'Mathis et al. 1997, MSS=1460 bytes, bw in Mbps, rtt in ms. Zero loss returns bw.',
    rows: [['rate', 'rate', 'Mbps']],
    eval: (p) => {
      const rate = E.tcpMbps(P(p, 'bw', 1), P(p, 'rtt', 20), P(p, 'loss', 0));
      return { val: rate, rate };
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
  consensus: (spec) => algebraic(spec, {
    equation: 'quorum=⌊n/2⌋+1; Byzantine f=⌊(n−1)/3⌋',
    assumptions: 'fault 0 or 1 uses crash tolerance ⌊(n−1)/2⌋ (Raft majority). fault≥2 uses Byzantine ⌊(n−1)/3⌋ (Lamport).',
    rows: [['quorum', 'quorum'], ['f_max', 'fMax']],
    eval: (p) => {
      const n = Math.max(1, Math.round(P(p, 'n', 3)));
      const fault = P(p, 'fault', 0);
      const quorum = Math.floor(n / 2) + 1;
      const fMax = fault >= 2 ? Math.floor((n - 1) / 3) : Math.floor((n - 1) / 2);
      return { val: quorum, quorum, fMax };
    },
  }),
  gates: (spec) => algebraic(spec, {
    equation: 'AND, OR, XOR of the low bits of combo',
    assumptions: 'Mano. combo is a bit field. The readout is the XOR of bits 0 and 1.',
    rows: [['xor', 'xor'], ['and', 'andv'], ['or', 'orv']],
    eval: (p) => {
      const combo = Math.round(P(p, 'combo', 0));
      const a = combo & 1;
      const b = (combo >> 1) & 1;
      return { val: a ^ b, xor: a ^ b, andv: a & b, orv: a | b };
    },
  }),
  combo: (spec) => algebraic(spec, {
    equation: '(5+3) mod 2^{width}; select bits=⌈log2(inputs)⌉',
    assumptions: 'Width-masked sum of the constants 5 and 3. MUX select width is the ceiling log of the input count.',
    rows: [['sum', 'sum'], ['sel', 'sel']],
    eval: (p) => {
      const width = clamp(Math.round(P(p, 'width', 4)), 1, 30);
      const inputs = Math.max(1, Math.round(P(p, 'inputs', 2)));
      const sum = (5 + 3) % (2 ** width);
      const sel = Math.ceil(Math.log2(inputs));
      return { val: sum, sum, sel };
    },
  }),
  seq: (spec) => algebraic(spec, {
    equation: 'Q=init',
    assumptions: 'D flip-flop holding the initial bit. Mano.',
    initial: ['init'],
    rows: [['Q', 'Q']],
    eval: (p) => {
      const Q = Math.round(P(p, 'init', 0)) ? 1 : 0;
      return { val: Q, Q };
    },
  }),
  reg: (spec) => algebraic(spec, {
    equation: 'states=2^{width}',
    assumptions: 'Width is capped at 40 so the integer stays inside the mantissa.',
    rows: [['states', 'states']],
    eval: (p) => {
      const width = clamp(Math.round(P(p, 'width', 8)), 0, 40);
      const states = 2 ** width;
      return { val: states, states };
    },
  }),
  counter: (spec) => algebraic(spec, {
    equation: 'step ≡ dir (mod modulus)',
    assumptions: 'One count step. dir is the direction knob. The modulus is the design parameter.',
    rows: [['mod', 'mod'], ['step', 'step']],
    eval: (p) => {
      const mod = Math.max(1, Math.round(P(p, 'mod', 2)));
      const dir = Math.round(P(p, 'dir', 1));
      const step = ((dir % mod) + mod) % mod;
      return { val: mod, mod, step };
    },
  }),
  'fsm-ce': (spec) => algebraic(spec, {
    equation: 'transitions=states·alphabet',
    assumptions: 'Complete Moore machine. Hopcroft.',
    rows: [['transitions', 'transitions']],
    eval: (p) => {
      const transitions = Math.round(P(p, 'states', 1)) * Math.round(P(p, 'alpha', 1));
      return { val: transitions, transitions };
    },
  }),
  minimize: (spec) => algebraic(spec, {
    equation: 'onset=min(minterms, 2^{vars})',
    assumptions: 'The onset is the first minterms of a vars-bit space, clipped to the cube. Quine–McCluskey is not run above that count.',
    rows: [['onset', 'onset']],
    eval: (p) => {
      const vars = clamp(Math.round(P(p, 'vars', 2)), 0, 12);
      const onset = Math.min(Math.max(0, Math.round(P(p, 'minterms', 0))), 2 ** vars);
      return { val: onset, onset };
    },
  }),
  pld: (spec) => algebraic(spec, {
    equation: 'connections=inputs·products',
    assumptions: 'PLA crosspoint count. Mano.',
    rows: [['connections', 'connections']],
    eval: (p) => {
      const connections = Math.round(P(p, 'inputs', 1)) * Math.round(P(p, 'products', 1));
      return { val: connections, connections };
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
  datapath: (spec) => algebraic(spec, {
    equation: 'bits=width, controls=ctrl',
    assumptions: 'The datapath width and the control-signal count are the catalog inputs.',
    rows: [['bits', 'bits'], ['ctrl', 'ctrl']],
    eval: (p) => ({
      val: P(p, 'width', 0),
      bits: P(p, 'width', 0),
      ctrl: P(p, 'ctrl', 0),
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
  vmem: (spec) => algebraic(spec, {
    equation: 'TLB reach=entries·page',
    assumptions: 'Hennessy & Patterson. page and tlb use the catalog units.',
    rows: [['reach', 'reach']],
    eval: (p) => {
      const reach = P(p, 'tlb', 0) * P(p, 'page', 0);
      return { val: reach, reach };
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
  memhier: (spec) => algebraic(spec, {
    equation: 't_stream=capacity/bandwidth, t_rand=latency',
    assumptions: 'Streaming time is size/bandwidth. Random latency is the lat knob.',
    rows: [['t_stream', 'tStream'], ['t_rand', 'tRand']],
    eval: (p) => {
      const tStream = P(p, 'cap', 0) / pos(P(p, 'bw', 1), 1e-9);
      const tRand = P(p, 'lat', 0);
      return { val: tRand, tStream, tRand };
    },
  }),
  multicore: (spec) => algebraic(spec, {
    equation: 'Amdahl S=1/(0.05+0.95/cores); protocol state count',
    assumptions: 'Stated parallel fraction 0.95, not a measured workload. proto 0 MSI (3), 1 MESI (4), 2 MOESI (5), else MESIF (5).',
    rows: [['S', 'S'], ['states', 'states']],
    eval: (p) => {
      const cores = pos(P(p, 'cores', 1), 1e-9);
      const proto = Math.round(P(p, 'proto', 0));
      const table = [3, 4, 5, 5];
      const states = table[clamp(proto, 0, 3)];
      const S = 1 / (0.05 + 0.95 / cores);
      return { val: S, S, states };
    },
  }),
  gpio: (spec) => algebraic(spec, {
    equation: 'mask=1<<priority, sense=trigger',
    assumptions: 'Priority is clamped to 0..15. trig 0 is level, 1 is edge.',
    rows: [['mask', 'mask'], ['sense', 'sense']],
    eval: (p) => {
      const prio = clamp(Math.round(P(p, 'prio', 0)), 0, 15);
      return { val: 1 << prio, mask: 1 << prio, sense: Math.round(P(p, 'trig', 0)) };
    },
  }),
  pwm: (spec) => algebraic(spec, {
    equation: 'f=f_clk/(prescale·period), f_clk=1 MHz',
    assumptions: 'Stated timer clock of 1 MHz. The period knob is the timer period register.',
    rows: [['f', 'f', 'Hz']],
    eval: (p) => {
      const prescale = pos(P(p, 'prescale', 1), 1e-9);
      const period = pos(P(p, 'period', 1), 1e-9);
      const f = 1e6 / (prescale * period);
      return { val: f, f };
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
  serial: (spec) => algebraic(spec, {
    equation: 'byte rate=baud/frame bits',
    assumptions: 'Frame 0 is 8N1 (10 bits), 1 is 8E1 (11), 2 is 8N2 (11), else 8E2 (12).',
    rows: [['Bps', 'bps'], ['bits', 'bits']],
    eval: (p) => {
      const frame = clamp(Math.round(P(p, 'frame', 0)), 0, 3);
      const bits = [10, 11, 11, 12][frame];
      const bps = P(p, 'baud', 0) / bits;
      return { val: bps, bps, bits };
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
  wdt: (spec) => algebraic(spec, {
    equation: 'timeout',
    assumptions: 'The timeout knob is the watchdog period. wake is the wake-source index.',
    rows: [['t', 'timeout', 's'], ['wake', 'wake']],
    eval: (p) => ({
      val: P(p, 'timeout', 0),
      timeout: P(p, 'timeout', 0),
      wake: P(p, 'wake', 0),
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
  fft: (spec) => algebraic(spec, {
    equation: '|X[k0]|=(N/2)·cg, cg=1, 0.5, 0.54',
    assumptions: 'Bin-centered cosine. Window 0 rectangular, 1 Hann (coherent gain 0.5), else Hamming (0.54). Oppenheim & Schafer.',
    rows: [['|X|', 'mag']],
    eval: (p) => {
      const N = Math.max(1, P(p, 'N', 64));
      const win = Math.round(P(p, 'win', 0));
      const cg = win <= 0 ? 1 : win === 1 ? 0.5 : 0.54;
      const mag = (N / 2) * cg;
      return { val: mag, mag };
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
  mod: (spec) => algebraic(spec, {
    equation: 'P/P_c=1+m²/2',
    assumptions: 'Conventional AM tone. The carrier frequency is reported separately. Stremler / Proakis.',
    rows: [['P/Pc', 'Pr'], ['fc', 'fc', 'Hz']],
    eval: (p) => {
      const m = P(p, 'm', 0);
      const Pr = 1 + (m * m) / 2;
      return { val: Pr, Pr, fc: P(p, 'fc', 0) };
    },
  }),
  linecode: (spec) => algebraic(spec, {
    equation: 'line rate=rate/efficiency',
    assumptions: 'Efficiency: NRZ 1, Manchester 1/2, 4B5B 4/5, 8B10B 4/5. code selects the index.',
    rows: [['line', 'line']],
    eval: (p) => {
      const code = clamp(Math.round(P(p, 'code', 0)), 0, 3);
      const eff = [1, 0.5, 0.8, 0.8][code];
      const line = P(p, 'rate', 0) / eff;
      return { val: line, line };
    },
  }),
  chancode: (spec) => algebraic(spec, {
    equation: 'states=2^{K−1}',
    assumptions: 'Binary convolutional encoder. Lin & Costello. rate is the code rate.',
    rows: [['states', 'states'], ['rate', 'rate']],
    eval: (p) => {
      const K = Math.max(1, Math.round(P(p, 'K', 3)));
      const states = 2 ** Math.max(0, K - 1);
      return { val: states, states, rate: P(p, 'rate', 0) };
    },
  }),
  equalize: (spec) => algebraic(spec, {
    equation: 'misadjustment≈μ·taps/2',
    assumptions: 'Widrow. Unit-power regressor. The factor 1/2 is the standard LMS excess-MSE approximation.',
    rows: [['M', 'M']],
    eval: (p) => {
      const M = P(p, 'mu', 0) * Math.max(0, P(p, 'taps', 0)) / 2;
      return { val: M, M };
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
  'struct-dyn': (spec) => algebraic(spec, {
    equation: 'ωn=√(k/m), ζ=c/(2√(km))',
    assumptions: 'Viscously damped SDOF. Chopra / Hibbeler.',
    rows: [['ωn', 'wn', 'rad/s'], ['ζ', 'zeta']],
    eval: (p) => E.sdofEval(p),
  }),
  seismic: (spec) => algebraic(spec, {
    equation: 'u_amp=pga/(2ζ)',
    assumptions: 'Harmonic base acceleration at resonance. Not a design spectrum. Chopra.',
    rows: [['amp', 'amp']],
    eval: (p) => E.seismicEval(p),
  }),
  'pipe-flow': (spec) => algebraic(spec, {
    equation: 'f=64/Re (laminar) or Swamee–Jain',
    assumptions: 'Darcy friction factor. eps is relative roughness ε/D. Laminar below Re=2300.',
    rows: [['f', 'f']],
    eval: (p) => E.darcyEval(p),
  }),
  'open-channel': (spec) => algebraic(spec, {
    equation: 'y=(Q n / √S)^{3/5}',
    assumptions: 'SI Manning, unit width, hydraulic radius equal to depth.',
    rows: [['y', 'y', 'm']],
    eval: (p) => E.manningEval(p),
  }),
  weir: (spec) => algebraic(spec, {
    equation: 'Q=(2/3) b √(2g) H^{3/2}',
    assumptions: 'Ideal sharp-crested weir, Cd=1. b is the opening knob. g=9.81.',
    rows: [['Q', 'Q', 'm³/s']],
    eval: (p) => E.weirEval(p),
  }),
  'pump-fan': (spec) => algebraic(spec, {
    equation: 'Q/Qref=(rpm/1450)·units, H/Href=(rpm/1450)²',
    assumptions: 'Affinity laws about 1450 rpm. Qref=1 per machine.',
    rows: [['Q', 'Q'], ['H', 'H']],
    eval: (p) => E.pumpEval(p),
  }),
  hx: (spec) => algebraic(spec, {
    equation: 'UA=U A',
    assumptions: 'Terminal temperatures are not in the catalog, so LMTD is not invented. The conductance is UA.',
    rows: [['UA', 'UA', 'W/K']],
    eval: (p) => E.hxEval(p),
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
  'thermo-cycle': (spec) => algebraic(spec, {
    equation: 'η=1−rp^{(1−γ)/γ}, rp=P/(1 bar), γ=1.4',
    assumptions: 'Ideal-gas Brayton. Fixed γ=1.4 (cold air); rp=P/(1 bar) with P_low=1 bar. γ is not a live knob (Çengel & Boles).',
    rows: [['η_B', 'etaB'], ['η_C', 'etaC']],
    eval: (p) => E.thermoCycleEval(p),
  }),
  combustion: (spec) => algebraic(spec, {
    equation: 'excess air=1/φ−1',
    assumptions: 'Turns. φ>1 is fuel-rich and the excess-air term is negative. T is the reactant temperature, not an adiabatic flame temperature.',
    rows: [['φ', 'phi'], ['excess', 'excess']],
    eval: (p) => E.combustionEval(p),
  }),
  'dc-motor': (spec) => algebraic(spec, {
    equation: 'ω=(V−TL Ra)/K, Ra=K=1',
    assumptions: 'Steady separately excited machine in normalized units. Chapman.',
    rows: [['ω', 'omega', 'rad/s'], ['I', 'I', 'A']],
    eval: (p) => E.motorDcEval(p),
  }),
  'ind-motor': (spec) => algebraic(spec, {
    equation: 'n_s=120 f/4',
    assumptions: 'Four poles. Voltage is reported and does not set the synchronous speed. Chapman.',
    rows: [['n_s', 'ns', 'rpm'], ['V', 'V', 'V']],
    eval: (p) => E.motorIndEval(p),
  }),
  'sync-motor': (spec) => algebraic(spec, {
    equation: 'P_pu=If·sin δ',
    assumptions: 'Per-unit V=Xs=1 and Ea proportional to field current. Chapman.',
    rows: [['P', 'Ppu']],
    eval: (p) => E.motorSyncEval(p),
  }),
  transformer: (spec) => algebraic(spec, {
    equation: 'V2/V1=1/a',
    assumptions: 'Ideal transformer. load is the per-unit secondary current and does not change the voltage ratio.',
    rows: [['V2/V1', 'ratio'], ['I_pu', 'Ipu']],
    eval: (p) => E.transformerEval(p),
  }),
  pe: (spec) => algebraic(spec, {
    equation: 'Vout/Vin=D, Δi∝D(1−D)/fs',
    assumptions: 'Ideal buck converter. Erickson. Inductance in the ripple factor is 1 H.',
    rows: [['D', 'duty'], ['ripple', 'ripple']],
    eval: (p) => E.buckEval(p),
  }),
  powerflow: (spec) => algebraic(spec, {
    equation: 'DC power flow, X=0.1 pu',
    assumptions: 'Radial feeder, equal bus injections. Angle is in radians.',
    rows: [['θ', 'theta', 'rad'], ['P', 'Ptot']],
    eval: (p) => E.powerflowEval(p),
  }),
  stability: (spec) => algebraic(spec, {
    equation: "δ=asin(0.8)+½·0.8·t_clear² during a fault",
    assumptions: 'Classical machine, Pm=0.8, Pe=0 while the fault knob is positive, M=1. fault=0 keeps the pre-fault angle.',
    rows: [['δ', 'delta', 'rad']],
    eval: (p) => E.swingEval(p),
  }),
  renewable: (spec) => algebraic(spec, {
    equation: 'P_pv=0.2·irr·1 m²; P_wind=½·1.225·v³·0.4',
    assumptions: 'Stated efficiency 0.2 and Cp=0.4. Cp is below the Betz limit 16/27. Not a measured turbine curve.',
    rows: [['P_pv', 'Ppv', 'W'], ['P_wind', 'Pwind', 'W']],
    eval: (p) => E.renewableEval(p),
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
  hen: (spec) => algebraic(spec, {
    equation: 'UA=Q/ΔT_min',
    assumptions: 'Pinch conductance scale. Linnhoff. No stream set is invented.',
    rows: [['UA', 'UA']],
    eval: (p) => E.pinchEval(p),
  }),
  drying: (spec) => algebraic(spec, {
    equation: 'Δp=p_sat(T)(1−RH)',
    assumptions: 'Antoine water constants A=8.07131, B=1730.63, C=233.426, P in mmHg. The fit is for about 1–100 °C.',
    rows: [['Δp', 'drive', 'mmHg']],
    eval: (p) => E.dryingEval(p),
  }),
  fluidbed: (spec) => algebraic(spec, {
    equation: 'Re_mf=√(33.7²+0.0408 Ar)−33.7',
    assumptions: 'Wen & Yu 1966. Air and sand ρs=2500 kg/m³. dp is in μm.',
    rows: [['Umf', 'Umf', 'm/s'], ['above', 'above']],
    eval: (p) => E.fluidbedEval(p),
  }),
  crystal: (spec) => algebraic(spec, {
    equation: 'ln S',
    assumptions: 'Supersaturation ratio. No nucleation prefactor. Mullin.',
    rows: [['ln S', 'lnS'], ['T', 'T', 'K']],
    eval: (p) => E.crystalEval(p),
  })
};
