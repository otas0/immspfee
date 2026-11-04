import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** 排序可视化：bubble / insertion / quick（计算机科学） */
export default {
  id: 'sorting',
  name: '排序算法',
  capabilities: {
    interaction: 'knobs',
    formalism: 'discrete',
    viz: 'algo-step',
    fidelity: 'principle',
    hint: '课堂演示可关自动步进，仅用 step；高亮比较位',
    actions: [
      { id: 'step', label: '单步 step' },
      { id: 'toggleDemo', label: '切换课堂模式' },
      { id: 'reset', label: '重置数组' },
    ],
  },
  params: {
    n: 24, stepDt: 0.08, seed: 42, algo: 0, demo: 1, // 默认课堂：仅 step + 暂停时钟
  },
  paramSchema: {
    n: { group: 'numerics', unit: '—', label: '元素数 n', min: 6, max: 64 },
    stepDt: { group: 'dynamics', unit: 's', label: '步进间隔', min: 0.02, max: 0.5 },
    seed: { group: 'initial', unit: '—', label: '随机种子', min: 1, max: 9999 },
    algo: {
      group: 'dynamics', unit: '—', label: '算法', min: 0, max: 2,
      options: [
        { value: 0, label: 'bubble' },
        { value: 1, label: 'insertion' },
        { value: 2, label: 'quick' },
      ],
    },
    demo: {
      group: 'dynamics', unit: '—', label: '课堂演示', min: 0, max: 1,
      options: [
        { value: 0, label: '自动步进' },
        { value: 1, label: '仅手动 step' },
      ],
    },
  },

  /** 主循环：课堂模式请求暂停全局时钟，避免“卡住”错觉 */
  shouldPauseApp(state) {
    return Math.round(P(state?.params, 'demo', 1)) === 1;
  },

  runAction(state, actionId) {
    if (actionId === 'reset') {
      this.init(state);
      return true;
    }
    if (actionId === 'step') {
      if (state.done) return false;
      if (state.algo === 0) stepBubble(state);
      else if (state.algo === 1) stepInsertion(state);
      else stepQuick(state);
      state._flash = 12;
      return true;
    }
    if (actionId === 'toggleDemo') {
      state.params.demo = Math.round(P(state.params, 'demo', 1)) ? 0 : 1;
      return true;
    }
    if (actionId === 'autoDemo') {
      // 恢复自动步进（课堂徽章一键）
      state.params.demo = 0;
      return true;
    }
    return false;
  },

  init(state) {
    const n = Math.max(4, Math.floor(P(state.params, 'n', 20)));
    let s = Math.floor(P(state.params, 'seed', 1)) || 1;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    state.arr = Array.from({ length: n }, () => 0.15 + rnd() * 0.85);
    state.algo = Math.round(clampAlgo(P(state.params, 'algo', 0)));
    state.i = 0;
    state.j = 0;
    state.swaps = 0;
    state.comps = 0;
    state.done = false;
    state.acc = 0;
    state.t = 0;
    state.n = n;
    state.hi = null;
    state.lo = null;
    state.stack = [];
    state.pivot = -1;
    state.phase = 'scan'; // quick: scan | partition
    if (state.algo === 2) {
      state.stack = [{ lo: 0, hi: n - 1 }];
      state.lo = 0;
      state.hi = n - 1;
      state.j = 0;
      state.i = -1;
      state.pivot = n - 1;
      state.phase = 'partition';
    }
  },

  step(state, dt) {
    if (state.done) return;
    const want = Math.round(clampAlgo(P(state.params, 'algo', 0)));
    if (want !== state.algo) {
      this.init(state);
      return;
    }
    state.t += dt;
    // 课堂演示：暂停自动步进，只靠 runAction('step')
    if (Math.round(P(state.params, 'demo', 1)) === 1) return;
    const period = Math.max(P(state.params, 'stepDt', 0.08), 0.01);
    state.acc += dt;
    while (state.acc >= period && !state.done) {
      state.acc -= period;
      if (state.algo === 0) stepBubble(state);
      else if (state.algo === 1) stepInsertion(state);
      else stepQuick(state);
    }
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const n = state.arr.length;
    const pad = 40;
    const bw = (W - pad * 2) / n;
    const maxH = H - pad * 2;
    const names = ['bubble', 'insertion', 'quick'];

    for (let k = 0; k < n; k += 1) {
      const h = state.arr[k] * maxH;
      const x = pad + k * bw;
      const y = H - pad - h;
      let fill = C.body;
      const hot = !state.done && (
        (state.algo === 0 && (k === state.j || k === state.j + 1))
        || (state.algo === 1 && (k === state.j || k === state.i))
        || (state.algo === 2 && (k === state.j || k === state.i || k === state.pivot))
      );
      if (state.done) fill = C.vector;
      else if (hot) fill = C.accent;
      ctx.fillStyle = fill;
      ctx.fillRect(x + 1, y, Math.max(2, bw - 2), h);
      if (hot || state._flash > 0) {
        ctx.strokeStyle = C.vector;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 0.5, y - 1, Math.max(2, bw - 1), h + 2);
      }
    }
    if (state._flash > 0) state._flash -= 1;

    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    const demo = Math.round(P(state.params, 'demo', 0)) === 1;
    ctx.fillText(
      state.done
        ? `${names[state.algo]} · sorted`
        : `${names[state.algo]} · ${demo ? '课堂·仅step' : '自动'} · 高亮比较位`,
      12,
      20,
    );
  },

  getReadouts(state) {
    const names = ['bubble', 'insertion', 'quick'];
    return [
      { label: 'algo', value: names[state.algo] || '?' },
      { label: 'comps', value: String(state.comps) },
      { label: 'swaps', value: String(state.swaps) },
      { label: 't', value: `${formatNum(state.t, 2)} s` },
    ];
  },

  getTrajectory(state) {
    return state.arr.map((v, i) => ({ i, v }));
  },
};

function clampAlgo(v) {
  return Math.max(0, Math.min(2, Number(v) || 0));
}

function stepBubble(state) {
  const n = state.arr.length;
  if (state.i >= n - 1) {
    state.done = true;
    return;
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

function stepInsertion(state) {
  const n = state.arr.length;
  if (state.i === 0 && state.j === 0) state.i = 1;
  if (state.i >= n) {
    state.done = true;
    return;
  }
  if (state.j < 0) {
    state.i += 1;
    state.j = state.i - 1;
    return;
  }
  state.comps += 1;
  if (state.j >= 0 && state.arr[state.j] > state.arr[state.j + 1]) {
    const tmp = state.arr[state.j];
    state.arr[state.j] = state.arr[state.j + 1];
    state.arr[state.j + 1] = tmp;
    state.swaps += 1;
    state.j -= 1;
  } else {
    state.i += 1;
    state.j = state.i - 1;
  }
}

function stepQuick(state) {
  if (state.phase === 'partition') {
    const { lo, hi } = state;
    if (lo == null || hi == null || lo >= hi) {
      state.phase = 'next';
      return;
    }
    const pivotVal = state.arr[hi];
    state.pivot = hi;
    if (state.j > hi - 1) {
      // finish partition: swap pivot into place
      const p = state.i + 1;
      if (p !== hi) {
        const tmp = state.arr[p];
        state.arr[p] = state.arr[hi];
        state.arr[hi] = tmp;
        state.swaps += 1;
      }
      state.stack.push({ lo, hi: p - 1 });
      state.stack.push({ lo: p + 1, hi });
      state.phase = 'next';
      return;
    }
    state.comps += 1;
    if (state.arr[state.j] < pivotVal) {
      state.i += 1;
      if (state.i !== state.j) {
        const tmp = state.arr[state.i];
        state.arr[state.i] = state.arr[state.j];
        state.arr[state.j] = tmp;
        state.swaps += 1;
      }
    }
    state.j += 1;
    return;
  }
  // next frame from stack
  while (state.stack.length) {
    const frame = state.stack.pop();
    if (frame.lo < frame.hi) {
      state.lo = frame.lo;
      state.hi = frame.hi;
      state.i = frame.lo - 1;
      state.j = frame.lo;
      state.pivot = frame.hi;
      state.phase = 'partition';
      return;
    }
  }
  state.done = true;
}
