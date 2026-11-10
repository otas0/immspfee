import { formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/**
 * Teaching Turing-machine step budget: head scans a tape of length n once.
 * Sipser-style definition sketch — not a universal simulator.
 */
export default {
  id: 'turing',
  name: '图灵机',
  equation: '单带扫描：至多 n 步写完长度 n 的输入（教学上界）',
  authority: 'Sipser, Introduction to the Theory of Computation, Turing machine definition',
  assumptions: '单带、单头、确定性；只统计扫描上界与当前头位置，不是通用图灵机模拟器也不是停机判定',
  fidelity: 'principle',
  params: {
    n: 16, head: 0, mode: 1,
  },
  paramSchema: {
    n: { group: 'dynamics', unit: '—', label: '带长 n', min: 4, max: 64 },
    head: { group: 'initial', unit: '—', label: '头位置', min: 0, max: 63 },
    mode: {
      group: 'dynamics', unit: '—', label: '扫描(1)/停(0)', min: 0, max: 1,
      options: [{ value: 1, label: '扫描' }, { value: 0, label: '停止' }],
    },
  },

  init(state) {
    state.t = 0;
    state.pos = Math.max(0, Math.round(P(state.params, 'head', 0)));
    state.steps = 0;
    state.hist = [];
    this.refresh(state);
  },

  refresh(state) {
    const n = Math.max(1, Math.round(P(state.params, 'n', 16)));
    state.n = n;
    state.bound = n;
    state.pos = Math.max(0, Math.min(n - 1, state.pos | 0));
  },

  step(state, dt) {
    const n = Math.max(1, Math.round(P(state.params, 'n', 16)));
    const run = P(state.params, 'mode', 1) >= 0.5;
    if (run) {
      state.pos = (state.pos + 1) % n;
      state.steps += 1;
    }
    state.t += dt;
    this.refresh(state);
    state.hist.push(state.pos);
    if (state.hist.length > 200) state.hist.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const n = state.n || 16;
    const cell = Math.min(26, (W - 48) / n);
    const y = H * 0.45;
    ctx.fillStyle = C.muted;
    ctx.font = '600 13px IBM Plex Mono, monospace';
    ctx.fillText('TM tape (scan bound ≤ n)', 14, 22);

    for (let i = 0; i < n; i += 1) {
      const x = 28 + i * cell;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(x, y, cell * 0.85, 28);
      if (i === state.pos) {
        ctx.fillStyle = C.accent;
        ctx.fillRect(x + 2, y + 2, cell * 0.85 - 4, 24);
      }
    }

    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText(`head=${formatNum(state.pos, 0)}  steps=${formatNum(state.steps, 0)}  bound=${formatNum(state.bound, 0)}`, 14, 40);
  },

  getReadouts(state) {
    return [
      { label: 'head', value: formatNum(state.pos, 0) },
      { label: 'steps', value: formatNum(state.steps, 0) },
      { label: 'bound', value: formatNum(state.bound, 0) },
      { label: 'n', value: formatNum(state.n, 0) },
    ];
  },

  getTrajectory(state) {
    return state.hist.map((v, i) => ({ i, head: v }));
  },
};
