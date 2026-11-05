import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';
import { forceGraphStep, mapNormToScreen, paintGraph } from '../utils/graphLayout.js';

function parseAdj(text, n) {
  const edges = [];
  const raw = String(text || '').trim();
  if (!raw) return edges;
  for (const part of raw.split(/[,;\n]+/)) {
    const m = part.trim().match(/^(\d+)\s*[-:]\s*(\d+)(?:\s*[:=]\s*(\d+(?:\.\d+)?))?$/);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    const w = m[3] != null ? Number(m[3]) : 1;
    if (a >= 0 && b >= 0 && a < n && b < n && a !== b && Number.isFinite(w)) {
      edges.push({ a, b, w: Math.max(0.01, w) });
    }
  }
  return edges;
}

/** Dijkstra：邻接表导入 + 手动画边 + 随机图 */
export default {
  id: 'dijkstra',
  name: 'Dijkstra 最短路径',
  params: {
    nodes: 10, seed: 11, start: 0, goal: 7, stepDt: 0.12,
    edgeProb: 0.42, wMin: 1, wMax: 12, algo: 0,
    layoutSteps: 40,
    adjText: '',
    edgeA: 0, edgeB: 1, edgeW: 3, commitEdge: 0,
  },
  paramSchema: {
    nodes: { group: 'numerics', unit: '—', label: '节点数', min: 4, max: 24 },
    layoutSteps: { group: 'numerics', unit: '—', label: '力导向步数', min: 0, max: 120 },
    seed: { group: 'initial', unit: '—', label: '随机种子', min: 1, max: 9999 },
    start: { group: 'initial', unit: '—', label: '起点', min: 0, max: 23 },
    goal: { group: 'initial', unit: '—', label: '终点', min: 0, max: 23 },
    adjText: {
      group: 'initial', unit: '', label: '邻接表 0-1:2,1-2:5', allowText: true,
    },
    stepDt: { group: 'dynamics', unit: 's', label: '步进间隔', min: 0.02, max: 1 },
    edgeProb: { group: 'dynamics', unit: '—', label: '边概率', min: 0.05, max: 1 },
    wMin: { group: 'dynamics', unit: '—', label: '权最小', min: 1, max: 50 },
    wMax: { group: 'dynamics', unit: '—', label: '权最大', min: 1, max: 100 },
    edgeA: { group: 'dynamics', unit: '—', label: '手动画边 A', min: 0, max: 23 },
    edgeB: { group: 'dynamics', unit: '—', label: '手动画边 B', min: 0, max: 23 },
    edgeW: { group: 'dynamics', unit: '—', label: '手动画边权', min: 0.1, max: 100 },
    commitEdge: { group: 'dynamics', unit: '—', label: '提交画边(+1)', min: 0, max: 9999 },
    algo: {
      group: 'dynamics', unit: '', label: '算法', min: 0, max: 1,
      options: [{ value: 0, label: 'Dijkstra' }, { value: 1, label: 'BFS(无权)' }],
    },
  },

  runAction(state, actionId) {
    if (actionId === 'undoEdge') {
      if (state.edges?.length) {
        state.edges.pop();
        this.resetSearch(state);
        return true;
      }
      return false;
    }
    if (actionId === 'clearGraph') {
      state.edges = [];
      state._pick = null;
      this.resetSearch(state);
      return true;
    }
    return false;
  },

  init(state) {
    const n = Math.max(4, Math.floor(P(state.params, 'nodes', 10)));
    let s = Math.floor(P(state.params, 'seed', 11)) || 1;
    const rnd = () => { s = (s * 48271) % 2147483647; return (s - 1) / 2147483646; };
    state.nodes = Array.from({ length: n }, (_, i) => ({
      i, x: 0.12 + rnd() * 0.76, y: 0.14 + rnd() * 0.72,
    }));
    const imported = parseAdj(state.params.adjText, n);
    state.edges = imported.length ? imported : [];
    if (!state.edges.length) {
      const pEdge = P(state.params, 'edgeProb', 0.42);
      const w0 = P(state.params, 'wMin', 1);
      const w1 = Math.max(w0, P(state.params, 'wMax', 12));
      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          if (rnd() < pEdge) {
            state.edges.push({ a: i, b: j, w: w0 + Math.floor(rnd() * (w1 - w0 + 1)) });
          }
        }
      }
    }
    const start = Math.min(Math.floor(P(state.params, 'start', 0)), n - 1);
    const goal = Math.min(Math.floor(P(state.params, 'goal', 7)), n - 1);
    state.start = start;
    state.goal = goal;
    if (!state.edges.length) {
      for (let i = 0; i < n - 1; i += 1) state.edges.push({ a: i, b: i + 1, w: 1 });
    }
    const W = 400;
    const H = 300;
    const steps = Math.max(0, Math.floor(P(state.params, 'layoutSteps', 40)));
    const px = state.nodes.map((node) => ({ x: node.x * W, y: node.y * H }));
    for (let k = 0; k < steps; k += 1) forceGraphStep(px, state.edges, { W, H, pad: 24 });
    state.nodes = px.map((p, i) => ({
      i,
      x: Math.max(0.05, Math.min(0.95, p.x / W)),
      y: Math.max(0.05, Math.min(0.95, p.y / H)),
    }));
    this.resetSearch(state);
    state._commit = Math.round(P(state.params, 'commitEdge', 0));
    state._adj = String(state.params.adjText || '');
    state._layoutSteps = steps;
    state._edgeHist = state.edges.map((e) => ({ ...e }));
  },

  resetSearch(state) {
    const n = state.nodes.length;
    state.dist = Array(n).fill(Infinity);
    state.dist[state.start] = 0;
    state.parent = Array(n).fill(-1);
    state.visited = new Set();
    state.frontier = new Set([state.start]);
    state.done = false;
    state.path = [];
    state.t = 0;
    state.acc = 0;
    state.relax = 0;
    state.algo = Math.round(P(state.params, 'algo', 0));
  },

  refresh(state) {
    const adj = String(state.params.adjText || '');
    if (adj !== state._adj) {
      state._adj = adj;
      this.init(state);
      return;
    }
    const commit = Math.round(P(state.params, 'commitEdge', 0));
    if (commit !== state._commit) {
      state._commit = commit;
      const n = state.nodes.length;
      const a = Math.min(Math.max(0, Math.round(P(state.params, 'edgeA', 0))), n - 1);
      const b = Math.min(Math.max(0, Math.round(P(state.params, 'edgeB', 1))), n - 1);
      const w = Math.max(0.01, P(state.params, 'edgeW', 3));
      if (a !== b) {
        state.edges.push({ a, b, w });
        this.resetSearch(state);
      }
    }
  },

  step(state, dt) {
    this.refresh(state);
    const want = Math.round(P(state.params, 'algo', 0));
    if (want !== state.algo) { this.resetSearch(state); }
    state.t += dt;
    state.acc += dt;
    const period = Math.max(P(state.params, 'stepDt', 0.12), 0.02);
    while (state.acc >= period && !state.done) {
      state.acc -= period;
      if (!state.frontier.size) { state.done = true; break; }
      let u = -1; let best = Infinity;
      for (const i of state.frontier) {
        const d = state.dist[i];
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

  capabilities: {
    pointer: true,
    interaction: 'canvas',
    formalism: 'network',
    viz: 'algo-graph',
    fidelity: 'principle',
    hint: '点击两节点连边（类 Algorithm Visualizer）；工具条可撤销/清空',
    actions: [
      { id: 'undoEdge', label: '撤销上一边' },
      { id: 'clearGraph', label: '清空边' },
    ],
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 36;
    state._pad = pad;
    state._view = { W, H };
    const screen = mapNormToScreen(state.nodes, W, H, pad);
    state._screen = screen.map((p) => ({ x: p.sx, y: p.sy }));
    const hi = new Set([...state.frontier, ...state.visited]);
    if (state.start != null) hi.add(state.start);
    if (state.goal != null) hi.add(state.goal);
    paintGraph(ctx, screen, state.edges, {
      highlight: hi,
      path: state.path || [],
      edgeColor: C.axis,
      nodeColor: C.muted,
      accent: C.accent,
      r: 10,
    });
    ctx.font = '11px IBM Plex Mono, monospace';
    for (const e of state.edges) {
      const a = state._screen[e.a]; const b = state._screen[e.b];
      if (!a || !b) continue;
      ctx.fillStyle = C.muted;
      ctx.fillText(String(e.w), (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    // 覆盖起终点/前沿颜色
    state.nodes.forEach((_n, i) => {
      const p = state._screen[i];
      let fill = null;
      if (state.frontier.has(i)) fill = C.vector;
      if (state.visited.has(i)) fill = C.body;
      if (i === state.start) fill = C.theory || C.body2;
      if (i === state.goal) fill = C.accent;
      if (!fill) return;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.fillText(String(i), p.x - 3, p.y + 3);
    });
    if (state._pick != null && state._screen[state._pick]) {
      const p = state._screen[state._pick];
      ctx.strokeStyle = C.vector;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = C.muted;
    ctx.fillText(
      state.done
        ? `done · cost=${formatNum(state.dist[state.goal], 2)} · edges=${state.edges.length}`
        : `searching · edges=${state.edges.length} · 点选连边`,
      12,
      18,
    );
  },

  onPointer(state, ev) {
    if (ev.type !== 'down' || !state._screen) return false;
    let hit = -1;
    let best = 16 * 16;
    state._screen.forEach((p, i) => {
      const d = (p.x - ev.x) ** 2 + (p.y - ev.y) ** 2;
      if (d < best) { best = d; hit = i; }
    });
    if (hit < 0) {
      state._pick = null;
      return true;
    }
    if (state._pick == null) {
      state._pick = hit;
      return true;
    }
    if (state._pick === hit) {
      state._pick = null;
      return true;
    }
    const a = state._pick;
    const b = hit;
    const w = Math.max(0.01, P(state.params, 'edgeW', 3));
    if (!state.edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))) {
      state.edges.push({ a, b, w });
    }
    state._pick = null;
    this.resetSearch(state);
    return true;
  },


  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: 'visited', value: String(state.visited.size) },
      { label: 'frontier', value: String(state.frontier.size) },
      { label: 'relax', value: String(state.relax) },
      { label: 'cost', value: Number.isFinite(state.dist[state.goal]) ? formatNum(state.dist[state.goal], d) : '∞' },
      { label: 'edges', value: String(state.edges.length) },
    ];
  },

  getTrajectory(state) {
    return state.nodes.map((n, i) => ({ i, dist: state.dist[i], x: n.x, y: n.y }));
  },
};
