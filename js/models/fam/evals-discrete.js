/** fam discrete governing evals */
import {
  G, EPS0, KE, MU0, SIGMA, R_GAS, C_LIGHT, LAMBDA_C_PM, HC_KEV_PM, QE, ME, KB,
  PRIMES, clamp, pos, finiteOr, linspace, primeAtMost, modPow, P, formatNum,
} from './common.js';

// --- discrete algorithms -------------------------------------------------

export function insertionComps(n, sortedness) {
  const N = Math.max(1, Math.min(256, Math.round(n)));
  const a = [];
  for (let i = 0; i < N; i += 1) a.push(i);
  const rev = clamp(Math.round((1 - clamp(sortedness, 0, 1)) * N), 0, N);
  for (let i = 0, j = rev - 1; i < j; i += 1, j -= 1) {
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  let comps = 0;
  for (let i = 1; i < N; i += 1) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0) {
      comps += 1;
      if (a[j] <= key) break;
      a[j + 1] = a[j];
      j -= 1;
    }
    a[j + 1] = key;
  }
  return comps;
}

export function searchProbes(n, strategy) {
  const N = Math.max(1, Math.round(n));
  const s = Math.round(strategy);
  if (s <= 0) return N;
  if (s === 1) return Math.floor(Math.log2(N)) + 1;
  if (N < 3) return 1;
  return Math.floor(Math.log2(Math.log2(N))) + 1;
}

export function bfsDist(n, pEdge) {
  const N = Math.max(2, Math.min(48, Math.round(n)));
  const extras = clamp(Math.floor(Math.max(0, pEdge) * (N - 2)), 0, N - 2);
  const adj = Array.from({ length: N }, () => []);
  const link = (a, b) => {
    adj[a].push(b);
    adj[b].push(a);
  };
  for (let i = 0; i < N - 1; i += 1) link(i, i + 1);
  for (let i = 0; i < extras; i += 1) link(i, i + 2);
  const dist = new Array(N).fill(-1);
  dist[0] = 0;
  const q = [0];
  for (let qi = 0; qi < q.length; qi += 1) {
    const u = q[qi];
    for (const v of adj[u]) {
      if (dist[v] >= 0) continue;
      dist[v] = dist[u] + 1;
      q.push(v);
    }
  }
  return dist[N - 1];
}

export function dijkstraDist(n, wSpread) {
  const N = Math.max(2, Math.min(48, Math.round(n)));
  const w = Math.max(0, wSpread);
  const dist = new Array(N).fill(Infinity);
  const used = new Array(N).fill(false);
  dist[0] = 0;
  for (let iter = 0; iter < N; iter += 1) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < N; i += 1) {
      if (!used[i] && dist[i] < best) {
        best = dist[i];
        u = i;
      }
    }
    if (u < 0) break;
    used[u] = true;
    if (u + 1 < N) dist[u + 1] = Math.min(dist[u + 1], dist[u] + w);
  }
  return finiteOr(dist[N - 1], 0);
}

export function mstWeight(n, pEdge) {
  const N = Math.max(2, Math.min(40, Math.round(n)));
  const extras = clamp(Math.floor(Math.max(0, pEdge) * (N - 2)), 0, N - 2);
  const edges = [];
  for (let i = 0; i < N - 1; i += 1) edges.push([3, i, i + 1]);
  for (let i = 0; i < extras; i += 1) edges.push([1, i, i + 2]);
  edges.sort((a, b) => a[0] - b[0]);
  const parent = Array.from({ length: N }, (_, i) => i);
  const find = (x) => {
    let r = x;
    while (parent[r] !== r) r = parent[r];
    let y = x;
    while (parent[y] !== r) {
      const nxp = parent[y];
      parent[y] = r;
      y = nxp;
    }
    return r;
  };
  let total = 0;
  let used = 0;
  for (const [w, a, b] of edges) {
    const pa = find(a);
    const pb = find(b);
    if (pa === pb) continue;
    parent[pa] = pb;
    total += w;
    used += 1;
    if (used === N - 1) break;
  }
  return total;
}

export function kmpComparisons(m, n) {
  const M = Math.max(1, Math.min(48, Math.round(m)));
  const N = Math.max(1, Math.min(500, Math.round(n)));
  const pat = new Array(M);
  for (let i = 0; i < M; i += 1) pat[i] = i === M - 1 ? 1 : 0;
  const text = new Array(N).fill(0);
  const pi = new Array(M).fill(0);
  let comps = 0;
  let len = 0;
  for (let i = 1; i < M; i += 1) {
    while (len > 0 && pat[len] !== pat[i]) {
      comps += 1;
      len = pi[len - 1];
    }
    comps += 1;
    if (pat[len] === pat[i]) {
      len += 1;
      pi[i] = len;
    } else pi[i] = 0;
  }
  let q = 0;
  for (let i = 0; i < N; i += 1) {
    while (q > 0 && pat[q] !== text[i]) {
      comps += 1;
      q = pi[q - 1];
    }
    comps += 1;
    if (pat[q] === text[i]) q += 1;
    if (q === M) q = pi[q - 1];
  }
  return comps;
}

export function knapsack(n, cap) {
  const N = Math.max(1, Math.min(32, Math.round(n)));
  const C = Math.max(0, Math.min(80, Math.round(cap)));
  const dp = new Array(C + 1).fill(0);
  for (let i = 0; i < N; i += 1) {
    const w = (i % 5) + 1;
    const v = (i % 3) + 1;
    for (let c = C; c >= w; c -= 1) dp[c] = Math.max(dp[c], dp[c - w] + v);
  }
  return dp[C];
}

export function treeHeights(n, order) {
  const N = Math.max(1, Math.round(n));
  const t = Math.max(2, Math.round(order));
  const hBst = N - 1;
  const hAvl = Math.ceil(Math.log2(N + 1));
  const hB = Math.ceil(Math.log((N + 1) / 2) / Math.log(t));
  return { hBst, hAvl, hB: finiteOr(hB) };
}

export function heapComps(n) {
  const N = Math.max(1, Math.min(300, Math.round(n)));
  const a = [];
  for (let i = 0; i < N; i += 1) a.push(N - i);
  let comps = 0;
  const sift = (start, heapN) => {
    let i = start;
    while (true) {
      const left = 2 * i + 1;
      const right = left + 1;
      let s = i;
      if (left < heapN) {
        comps += 1;
        if (a[left] > a[s]) s = left;
      }
      if (right < heapN) {
        comps += 1;
        if (a[right] > a[s]) s = right;
      }
      if (s === i) break;
      const tmp = a[i];
      a[i] = a[s];
      a[s] = tmp;
      i = s;
    }
  };
  for (let i = Math.floor(N / 2) - 1; i >= 0; i -= 1) sift(i, N);
  return comps;
}

export function ufOps(n) {
  const N = Math.max(1, Math.min(400, Math.round(n)));
  const parent = Array.from({ length: N }, (_, i) => i);
  const rank = new Array(N).fill(0);
  let ops = 0;
  const find = (x) => {
    let r = x;
    while (parent[r] !== r) {
      ops += 1;
      r = parent[r];
    }
    let y = x;
    while (parent[y] !== r) {
      const nxt = parent[y];
      parent[y] = r;
      y = nxt;
      ops += 1;
    }
    return r;
  };
  for (let i = 0; i < N - 1; i += 1) {
    const a = find(i);
    const b = find(i + 1);
    if (a === b) continue;
    if (rank[a] < rank[b]) parent[a] = b;
    else if (rank[a] > rank[b]) parent[b] = a;
    else {
      parent[b] = a;
      rank[a] += 1;
    }
  }
  return ops;
}

export function cacheHitRate(cap, block, assoc) {
  const B = Math.max(1, Math.round(block));
  const A = Math.max(1, Math.round(assoc));
  const bytes = Math.max(B * A, Math.round(cap));
  const sets = Math.max(1, Math.floor(bytes / (B * A)));
  const lines = sets * A;
  const nRef = Math.min(2048, Math.max(1, lines * B));
  const slots = Array.from({ length: sets }, () => []);
  let hits = 0;
  for (let addr = 0; addr < nRef; addr += 1) {
    const blockId = Math.floor(addr / B);
    const set = blockId % sets;
    const tag = Math.floor(blockId / sets);
    const slot = slots[set];
    const idx = slot.indexOf(tag);
    if (idx >= 0) {
      hits += 1;
      slot.splice(idx, 1);
      slot.push(tag);
    } else {
      if (slot.length >= A) slot.shift();
      slot.push(tag);
    }
  }
  return hits / nRef;
}

export function branchMisrate(hist, table) {
  // Smith 2-bit counter. Hennessy & Patterson.
  // 64 phase-shifted loops of H taken branches and one not-taken.
  // The counter index is the PC modulo the table, so a small table aliases.
  const H = Math.max(1, Math.min(32, Math.round(hist)));
  const T = Math.max(1, Math.min(4096, Math.round(table)));
  const sites = 64;
  const period = H + 1;
  const reps = 4;
  const ctr = new Array(T).fill(1);
  let mis = 0;
  let n = 0;
  for (let rep = 0; rep < reps; rep += 1) {
    for (let step = 0; step < period; step += 1) {
      for (let pc = 0; pc < sites; pc += 1) {
        const taken = ((step + pc) % period) !== H;
        const idx = pc % T;
        const pred = ctr[idx] >= 2;
        if (pred !== taken) mis += 1;
        ctr[idx] = taken ? Math.min(3, ctr[idx] + 1) : Math.max(0, ctr[idx] - 1);
        n += 1;
      }
    }
  }
  return mis / n;
}

export function zipfEntropy(dict) {
  const n = Math.max(1, Math.min(512, Math.round(dict)));
  let z = 0;
  for (let i = 1; i <= n; i += 1) z += 1 / i;
  let H = 0;
  for (let i = 1; i <= n; i += 1) {
    const prob = 1 / (i * z);
    H -= prob * Math.log2(prob);
  }
  return H;
}

export function kmeansInertia(k, metric) {
  const pts = [0, 1, 2, 3, 10, 11, 12, 13];
  const K = Math.max(1, Math.min(pts.length, Math.round(k)));
  const centers = [];
  for (let i = 0; i < K; i += 1) {
    centers.push(pts[Math.floor((i * (pts.length - 1)) / Math.max(1, K - 1))]);
  }
  const assign = new Array(pts.length).fill(0);
  for (let iter = 0; iter < 24; iter += 1) {
    for (let i = 0; i < pts.length; i += 1) {
      let best = 0;
      let bd = Infinity;
      for (let c = 0; c < K; c += 1) {
        const d = Math.abs(pts[i] - centers[c]);
        const cost = metric >= 1 ? d : d * d;
        if (cost < bd) {
          bd = cost;
          best = c;
        }
      }
      assign[i] = best;
    }
    for (let c = 0; c < K; c += 1) {
      const mem = [];
      for (let i = 0; i < pts.length; i += 1) if (assign[i] === c) mem.push(pts[i]);
      if (!mem.length) continue;
      if (metric >= 1) {
        mem.sort((a, b) => a - b);
        centers[c] = mem[Math.floor((mem.length - 1) / 2)];
      } else centers[c] = mem.reduce((s, v) => s + v, 0) / mem.length;
    }
  }
  let inertia = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const d = pts[i] - centers[assign[i]];
    inertia += metric >= 1 ? Math.abs(d) : d * d;
  }
  return inertia;
}

export function pcaFraction(k, nn) {
  const n = Math.max(2, Math.min(40, Math.round(nn)));
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  let mx = 0;
  let my = 0;
  const xs = [];
  const ys = [];
  for (let i = 1; i <= n; i += 1) {
    xs.push(i);
    ys.push(0.2 * i + ((i % 3) - 1));
    mx += i;
    my += ys[ys.length - 1];
  }
  mx /= n;
  my /= n;
  for (let i = 0; i < n; i += 1) {
    const x = xs[i] - mx;
    const y = ys[i] - my;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  sxx /= n;
  syy /= n;
  sxy /= n;
  const tr = sxx + syy;
  const disc = Math.sqrt(Math.max(0, (sxx - syy) ** 2 + 4 * sxy * sxy));
  const l1 = (tr + disc) / 2;
  const kk = Math.max(1, Math.min(2, Math.round(k)));
  const kept = kk >= 2 ? tr : l1;
  return tr > 0 ? kept / tr : 0;
}

export function nnForward(layers, width, act) {
  // Fixed init 0.1, input 1. Not a trained network and not a dataset.
  const L = Math.max(1, Math.min(8, Math.round(layers)));
  const W = Math.max(1, Math.min(48, Math.round(width)));
  let a = 1;
  for (let i = 0; i < L; i += 1) {
    const z = clamp(0.1 * W * a, -40, 40);
    if (act < 0.5) a = Math.max(0, z);
    else if (act < 1.5) a = Math.tanh(z);
    else if (act < 2.5) a = 1 / (1 + Math.exp(-z));
    else a = z;
  }
  return a;
}

export function caPopulation(rule, seed) {
  // Wolfram elementary CA, width 24, 8 steps, periodic.
  const W = 24;
  let cur = new Array(W).fill(0);
  const s = Math.round(Math.abs(seed)) || 1;
  for (let i = 0; i < 8; i += 1) cur[8 + i] = (s >> i) & 1;
  const r = Math.round(rule) & 255;
  for (let step = 0; step < 8; step += 1) {
    const nxt = new Array(W).fill(0);
    for (let i = 0; i < W; i += 1) {
      const left = cur[(i + W - 1) % W];
      const mid = cur[i];
      const right = cur[(i + 1) % W];
      const idx = (left << 2) | (mid << 1) | right;
      nxt[i] = (r >> idx) & 1;
    }
    cur = nxt;
  }
  return cur.reduce((s0, v) => s0 + v, 0);
}

export function sandTopples(prob, thresh) {
  // 1D abelian sandpile. Height > threshold sends one grain to each neighbor.
  const n = 16;
  const h = new Array(n).fill(0);
  const T = Math.max(1, Math.round(thresh));
  const openN = clamp(Math.floor(clamp(prob, 0, 1) * n), 0, n);
  for (let i = 0; i < openN; i += 1) h[i] = T;
  h[0] += 1;
  let topples = 0;
  for (let guard = 0; guard < 400; guard += 1) {
    let moved = false;
    for (let i = 0; i < n; i += 1) {
      if (h[i] > T) {
        h[i] -= 2;
        if (i > 0) h[i - 1] += 1;
        if (i < n - 1) h[i + 1] += 1;
        topples += 1;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return topples;
}

export function binaryEntropy(prob) {
  const p0 = clamp(prob, 0, 1);
  if (p0 <= 0 || p0 >= 1) return 0;
  return -p0 * Math.log2(p0) - (1 - p0) * Math.log2(1 - p0);
}

export function fcfsWait(arrival, burst) {
  // Silberschatz. Four jobs, arrival i*arrival, common burst.
  const n = 4;
  const b = Math.max(0, burst);
  const gap = Math.max(0, arrival);
  let time = 0;
  let wait = 0;
  for (let i = 0; i < n; i += 1) {
    const arr = i * gap;
    if (time < arr) time = arr;
    wait += time - arr;
    time += b;
  }
  return wait / n;
}

export function tcpMbps(bw, rttMs, loss) {
  // Mathis et al., CCR 1997: rate ≈ (MSS/RTT) sqrt(3/(2p)), MSS=1460 bytes.
  // bw is compared in Mbps. loss≤0 returns the bandwidth cap (no loss term).
  if (!(loss > 0)) return bw;
  const rtt = Math.max(rttMs, 0.1) / 1000;
  const mssBits = 1460 * 8;
  const mathis = (mssBits / rtt) * Math.sqrt(1.5 / loss) / 1e6;
  return Math.min(bw, mathis);
}

