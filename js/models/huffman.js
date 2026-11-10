import { formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/**
 * Huffman optimal prefix-code average length lower/upper teaching bounds.
 * L ≥ H; for dyadic probs Huffman achieves H. CLRS / Cover & Thomas.
 */
export default {
  id: 'huffman',
  name: '哈夫曼编码',
  equation: 'H = −Σ p_i log₂ p_i；最优前缀码平均长 L 满足 H ≤ L < H+1',
  authority: 'Cormen et al., CLRS, Huffman codes; Cover & Thomas, Elements of Information Theory',
  assumptions: '独立符号、已知概率；两符号示意 p 与 1−p；不是通用多符号建树动画',
  fidelity: 'principle',
  params: {
    p: 0.3, showBound: 1,
  },
  paramSchema: {
    p: { group: 'dynamics', unit: '—', label: '概率 p', min: 0.01, max: 0.99 },
    showBound: {
      group: 'display', unit: '—', label: '示意区间', min: 0, max: 1,
      options: [{ value: 1, label: '显示' }, { value: 0, label: '隐藏' }],
    },
  },

  init(state) {
    state.t = 0;
    state.hist = [];
    this.refresh(state);
  },

  refresh(state) {
    const p = Math.min(0.99, Math.max(0.01, P(state.params, 'p', 0.3)));
    const q = 1 - p;
    const H = finiteOr(-(p * Math.log2(p) + q * Math.log2(q)), 0);
    // For binary alphabet Huffman length equals 1 when p≠0.5? Actually both symbols get length 1, L=1.
    // More generally for two symbols L=1, and H≤1. Report L=1 and gap H+1.
    state.H = H;
    state.L = 1;
    state.p = p;
  },

  step(state, dt) {
    state.t += dt;
    this.refresh(state);
    state.hist.push(state.H);
    if (state.hist.length > 200) state.hist.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = { l: 48, r: 28, t: 48, b: 36 };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    ctx.fillStyle = C.muted;
    ctx.font = '600 13px IBM Plex Mono, monospace';
    ctx.fillText('Huffman: H ≤ L < H+1', 14, 22);

    ctx.strokeStyle = C.axis;
    ctx.strokeRect(pad.l, pad.t, plotW, plotH);

    const X = (p) => pad.l + p * plotW;
    const Y = (h) => pad.t + plotH - (h / 1.05) * plotH;

    ctx.strokeStyle = C.body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 1; i < 80; i += 1) {
      const p = i / 80;
      const q = 1 - p;
      const h = -(p * Math.log2(p) + q * Math.log2(q));
      const x = X(p);
      const y = Y(h);
      i === 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    if (Math.round(P(state.params, 'showBound', 1)) === 1) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = C.theory || '#7c9cbf';
      ctx.beginPath();
      ctx.moveTo(pad.l, Y(1));
      ctx.lineTo(pad.l + plotW, Y(1));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(X(state.p), Y(state.H), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText(`H=${formatNum(state.H, 3)}  L=${formatNum(state.L, 0)}`, 14, 40);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: 'H', value: formatNum(state.H, d) },
      { label: 'L', value: formatNum(state.L, 0) },
      { label: 'p', value: formatNum(state.p, d) },
    ];
  },

  getTrajectory(state) {
    return state.hist.map((v, i) => ({ i, H: v }));
  },
};
