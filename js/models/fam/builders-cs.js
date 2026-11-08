/** fam cs builders (split from discrete) */
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

export const BUILDERS_CS = {
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
  vmem: (spec) => algebraic(spec, {
    equation: 'TLB reach=entries·page',
    assumptions: 'Hennessy & Patterson. page and tlb use the catalog units.',
    rows: [['reach', 'reach']],
    eval: (p) => {
      const reach = P(p, 'tlb', 0) * P(p, 'page', 0);
      return { val: reach, reach };
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
  hx: (spec) => algebraic(spec, {
    equation: 'UA=U A',
    assumptions: 'Terminal temperatures are not in the catalog, so LMTD is not invented. The conductance is UA.',
    rows: [['UA', 'UA', 'W/K']],
    eval: (p) => E.hxEval(p),
  }),
  'thermo-cycle': (spec) => algebraic(spec, {
    equation: 'η=1−rp^{(1−γ)/γ}, rp=P/(1 bar), γ=1.4',
    assumptions: 'Ideal-gas Brayton. Fixed γ=1.4 (cold air); rp=P/(1 bar) with P_low=1 bar. γ is not a live knob (Çengel & Boles).',
    rows: [['η_B', 'etaB'], ['η_C', 'etaC']],
    eval: (p) => E.thermoCycleEval(p),
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
  })
};
