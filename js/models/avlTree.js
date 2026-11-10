import { formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/**
 * AVL height upper bound: h < c log₂(n+2) − b with φ≈1.618 → h ≤ 1.44 log₂(n+2) − 0.328.
 * CLRS / Knuth teaching bound (not a live rotator).
 */
export default {
  id: 'avl-tree',
  name: '平衡树 AVL/红黑',
  equation: 'AVL：h ≤ ⌊1.4404 log₂(n+2) − 0.3277⌋',
  authority: 'Cormen et al., Introduction to Algorithms (CLRS), AVL height bound; Knuth Art of Computer Programming §6.2.3',
  assumptions: '只给出最坏高度上界与平衡因子 |bf|≤1 的定义示意；不是旋转动画实现也不是红黑树证明',
  fidelity: 'principle',
  params: {
    n: 31, showBound: 1,
  },
  paramSchema: {
    n: { group: 'dynamics', unit: '—', label: '结点数 n', min: 1, max: 10000 },
    showBound: {
      group: 'display', unit: '—', label: '示意层数', min: 0, max: 1,
      options: [{ value: 1, label: '显示' }, { value: 0, label: '隐藏' }],
    },
  },

  init(state) {
    state.t = 0;
    state.hist = [];
    this.refresh(state);
  },

  refresh(state) {
    const n = Math.max(1, Math.round(P(state.params, 'n', 31)));
    const h = Math.floor(1.4404 * Math.log2(n + 2) - 0.3277);
    state.n = n;
    state.h = finiteOr(Math.max(0, h), 0);
    state.hUnbal = finiteOr(Math.max(0, Math.floor(Math.log2(n))), 0);
  },

  step(state, dt) {
    state.t += dt;
    this.refresh(state);
    state.hist.push(state.h);
    if (state.hist.length > 200) state.hist.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = { l: 40, r: 28, t: 48, b: 28 };
    ctx.fillStyle = C.muted;
    ctx.font = '600 13px IBM Plex Mono, monospace';
    ctx.fillText('AVL height bound', 14, 22);

    const levels = Math.max(1, state.h + 1);
    const plotH = H - pad.t - pad.b;
    for (let L = 0; L < levels; L += 1) {
      const y = pad.t + (L / Math.max(1, levels - 1 || 1)) * plotH * 0.85;
      const count = Math.min(16, 2 ** L);
      const gap = (W - pad.l - pad.r) / (count + 1);
      ctx.fillStyle = C.body;
      for (let i = 0; i < count; i += 1) {
        const x = pad.l + (i + 1) * gap;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = C.accent;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText(`h≤${formatNum(state.h, 0)}  (unbalanced ~${formatNum(state.hUnbal, 0)})`, 14, 40);
  },

  getReadouts(state, opts = {}) {
    return [
      { label: 'h_max', value: formatNum(state.h, 0) },
      { label: 'n', value: formatNum(state.n, 0) },
      { label: 'h_raw', value: formatNum(state.hUnbal, 0) },
    ];
  },

  getTrajectory(state) {
    return state.hist.map((v, i) => ({ i, h: v }));
  },
};
