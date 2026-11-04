import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** Dijkstra 最短路径（可调节点/边密度/起终点/速度） */
export default {
  id: 'dijkstra',
  name: 'Dijkstra 最短路径',
  params: {
    nodes: 10, seed: 11, start: 0, goal: 7, stepDt: 0.12,
    edgeProb: 0.42, wMin: 1, wMax: 12, algo: 0,
  },
  paramSchema: {
    nodes: { group: 'numerics', unit: '—', label: '节点数', min: 4, max: 24 },
    seed: { group: 'initial', unit: '—', label: 'seed', min: 1, max: 9999 },
    start: { group: 'initial', unit: '—', label: '起点', min: 0, max: 23 },
    goal: { group: 'initial', unit: '—', label: '终点', min: 0, max: 23 },
    stepDt: { group: 'dynamics', unit: 's', label: 'stepDt', min: 0.02, max: 1 },
    edgeProb: { group: 'dynamics', unit: '—', label: '边概率', min: 0.05, max: 1 },
    wMin: { group: 'dynamics', unit: '—', label: '权最小', min: 1, max: 50 },
    wMax: { group: 'dynamics', unit: '—', label: '权最大', min: 1, max: 100 },
    algo: {
      group: 'dynamics', unit: '', label: 'algo', min: 0, max: 1,
      options: [{ value: 0, label: 'Dijkstra' }, { value: 1, label: 'BFS(无权)' }],
    },
  },

  init(state) {
    const n = Math.max(4, Math.floor(P(state.params, 'nodes', 10)));
    let s = Math.floor(P(state.params, 'seed', 11)) || 1;
    const rnd = () => { s = (s * 48271) % 2147483647; return (s - 1) / 2147483646; };
    state.nodes = Array.from({ length: n }, (_, i) => ({
      i, x: 0.12 + rnd() * 0.76, y: 0.14 + rnd() * 0.72,
    }));
    state.edges = [];
    const pEdge = P(state.params, 'edgeProb', 0.42);
    const w0 = P(state.params, 'wMin', 1);
    const w1 = Math.max(w0, P(state.params, 'wMax', 12));
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        if (rnd() < pEdge) {
          const w = w0 + Math.floor(rnd() * (w1 - w0 + 1));
          state.edges.push({ a: i, b: j, w });
        }
      }
    }
    // ensure connected-ish star from start
    const start = Math.min(Math.floor(P(state.params, 'start', 0)), n - 1);
    const goal = Math.min(Math.floor(P(state.params, 'goal', 7)), n - 1);
    state.start = start;
    state.goal = goal;
    for (let i = 0; i < n; i += 1) {
      if (i === start) continue;
      if (!state.edges.some((e) => (e.a === start && e.b === i) || (e.b === start && e.a === i))) {
        state.edges.push({ a: start, b: i, w: w0 + Math.floor(rnd() * (w1 - w0 + 1)) });
      }
    }
    state.dist = Array(n).fill(Infinity);
    state.dist[start] = 0;
    state.parent = Array(n).fill(-1);
    state.visited = new Set();
    state.frontier = new Set([start]);
    state.done = false;
    state.path = [];
    state.t = 0;
    state.acc = 0;
    state.relax = 0;
    state.algo = Math.round(P(state.params, 'algo', 0));
  },

  step(state, dt) {
    const want = Math.round(P(state.params, 'algo', 0));
    if (want !== state.algo) { this.init(state); return; }
    state.t += dt;
    state.acc += dt;
    const period = Math.max(P(state.params, 'stepDt', 0.12), 0.02);
    while (state.acc >= period && !state.done) {
      state.acc -= period;
      if (!state.frontier.size) { state.done = true; break; }
      let u = -1; let best = Infinity;
      for (const i of state.frontier) {
        const d = state.algo === 1 ? (state.visited.has(i) ? Infinity : state.dist[i]) : state.dist[i];
        if (d < best) { best = d; u = i; }
      }
      if (u < 0 || !Number.isFinite(best)) { state.done = true; break; }
      state.frontier.delete(u);
      if (state.visited.has(u)) continue;
      state.visited.add(u);
      if (u === state.goal) {
        state.done = true;
        const path = [];
        for (let cur = u; cur >= 0; cur = state.parent[cur]) path.push(cur);
        state.path = path.reverse();
        break;
      }
      for (const e of state.edges) {
        const v = e.a === u ? e.b : (e.b === u ? e.a : -1);
        if (v < 0 || state.visited.has(v)) continue;
        const w = state.algo === 1 ? 1 : e.w;
        const nd = state.dist[u] + w;
        if (nd < state.dist[v]) {
          state.dist[v] = nd;
          state.parent[v] = u;
          state.frontier.add(v);
          state.relax += 1;
        }
      }
    }
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 36;
    const pt = (i) => ({
      x: pad + state.nodes[i].x * (W - pad * 2),
      y: pad + state.nodes[i].y * (H - pad * 2),
    });
    ctx.font = '11px IBM Plex Mono, monospace';
    for (const e of state.edges) {
      const a = pt(e.a); const b = pt(e.b);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = C.muted;
      ctx.fillText(String(e.w), (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    if (state.path.length > 1) {
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      state.path.forEach((i, k) => {
        const p = pt(i);
        k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      });
      ctx.stroke();
    }
    state.nodes.forEach((n, i) => {
      const p = pt(i);
      let fill = C.muted;
      if (state.frontier.has(i)) fill = C.vector;
      if (state.visited.has(i)) fill = C.body;
      if (i === state.start) fill = C.theory || C.body2;
      if (i === state.goal) fill = C.accent;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.fillText(String(i), p.x - 3, p.y + 3);
    });
    ctx.fillStyle = C.muted;
    ctx.fillText(state.done ? `done · cost=${formatNum(state.dist[state.goal], 2)}` : 'searching', 12, 18);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: 'visited', value: String(state.visited.size) },
      { label: 'frontier', value: String(state.frontier.size) },
      { label: 'relax', value: String(state.relax) },
      { label: 'cost', value: Number.isFinite(state.dist[state.goal]) ? formatNum(state.dist[state.goal], d) : '∞' },
      { label: 'path', value: String(state.path.length) },
    ];
  },

  getTrajectory(state) {
    return state.nodes.map((n, i) => ({ i, dist: state.dist[i], x: n.x, y: n.y }));
  },
};
