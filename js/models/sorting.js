import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** 冒泡排序可视化（计算机科学） */
export default {
  id: 'sorting',
  name: '冒泡排序',
  params: {
    n: 24, stepDt: 0.08, seed: 42,
  },
  paramSchema: {
    n: { group: 'numerics', unit: '', label: 'n', min: 6, max: 64 },
    stepDt: { group: 'dynamics', unit: 's', label: 'stepDt', min: 0.02, max: 0.5 },
    seed: { group: 'initial', unit: '', label: 'seed', min: 1, max: 9999 },
  },

  init(state) {
    const n = Math.max(4, Math.floor(P(state.params, 'n', 20)));
    let s = Math.floor(P(state.params, 'seed', 1)) || 1;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    state.arr = Array.from({ length: n }, () => 0.15 + rnd() * 0.85);
    state.i = 0;
    state.j = 0;
    state.swaps = 0;
    state.comps = 0;
    state.done = false;
    state.acc = 0;
    state.t = 0;
    state.n = n;
  },

  step(state, dt) {
    if (state.done) return;
    const period = Math.max(P(state.params, 'stepDt', 0.08), 0.01);
    state.acc += dt;
    state.t += dt;
    while (state.acc >= period && !state.done) {
      state.acc -= period;
      const n = state.arr.length;
      if (state.i >= n - 1) {
        state.done = true;
        break;
      }
      state.comps += 1;
      if (state.arr[state.j] > state.arr[state.j + 1]) {
        const tmp = state.arr[state.j];
        state.arr[state.j] = state.arr[state.j + 1];
        state.arr[state.j + 1] = tmp;
        state.swaps += 1;
      }
      state.j += 1;
      if (state.j >= n - 1 - state.i) {
        state.j = 0;
        state.i += 1;
      }
    }
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const n = state.arr.length;
    const pad = 40;
    const bw = (W - pad * 2) / n;
    const maxH = H - pad * 2;

    for (let k = 0; k < n; k += 1) {
      const h = state.arr[k] * maxH;
      const x = pad + k * bw;
      const y = H - pad - h;
      let fill = C.body;
      if (!state.done && (k === state.j || k === state.j + 1)) fill = C.accent;
      if (state.done) fill = C.vector;
      ctx.fillStyle = fill;
      ctx.fillRect(x + 1, y, Math.max(2, bw - 2), h);
    }

    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText(state.done ? 'sorted' : `pass ${state.i + 1}`, 12, 20);
  },

  getReadouts(state) {
    return [
      { label: 'comps', value: String(state.comps) },
      { label: 'swaps', value: String(state.swaps) },
      { label: 'pass', value: state.done ? 'done' : String(state.i + 1) },
      { label: 't', value: `${formatNum(state.t, 2)} s` },
    ];
  },

  getTrajectory(state) {
    return state.arr.map((v, i) => ({ i, v }));
  },
};
