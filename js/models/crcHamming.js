import { formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/**
 * Hamming distance + single-error parity-bit count for length-m binary words.
 * Cover & Thomas / Lin & Costello teaching definitions (not a codec).
 */
export default {
  id: 'crc-hamming',
  name: '差错检测 CRC/汉明码',
  equation: 'd_H(u,v)=Σ|u_i−v_i|；纠 1 错需校验位数 r，2^r ≥ m+r+1',
  authority: 'Lin & Costello, Error Control Coding, Hamming distance / parity-bit bound',
  assumptions: '二元码字；只计算汉明距离与单错校验位数下界，不是 CRC 多项式实现也不是编解码器',
  fidelity: 'principle',
  params: {
    m: 7, flips: 1, showBound: 1,
  },
  paramSchema: {
    m: { group: 'dynamics', unit: '—', label: '码长 m', min: 3, max: 31 },
    flips: { group: 'dynamics', unit: '—', label: '翻转位数', min: 0, max: 8 },
    showBound: {
      group: 'display', unit: '—', label: '示意校验位', min: 0, max: 1,
      options: [{ value: 1, label: '显示' }, { value: 0, label: '隐藏' }],
    },
  },

  init(state) {
    state.t = 0;
    state.hist = [];
    this.refresh(state);
  },

  refresh(state) {
    const m = Math.max(1, Math.round(P(state.params, 'm', 7)));
    const flips = Math.max(0, Math.min(m, Math.round(P(state.params, 'flips', 1))));
    state.dH = flips;
    let r = 0;
    while ((2 ** r) < m + r + 1) r += 1;
    state.r = r;
    state.m = m;
  },

  step(state, dt) {
    state.t += dt;
    this.refresh(state);
    state.hist.push(state.dH);
    if (state.hist.length > 200) state.hist.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    ctx.fillStyle = C.muted;
    ctx.font = '600 13px IBM Plex Mono, monospace';
    ctx.fillText('d_H · Hamming parity bound', 14, 22);

    const m = state.m || 7;
    const flips = state.dH || 0;
    const cell = Math.min(28, (W - 48) / m);
    const y0 = H * 0.42;
    for (let i = 0; i < m; i += 1) {
      const x = 28 + i * cell;
      const flipped = i < flips;
      ctx.fillStyle = flipped ? C.accent : C.body;
      ctx.fillRect(x, y0, cell * 0.75, 22);
      ctx.fillStyle = C.muted;
      ctx.font = '10px IBM Plex Mono, monospace';
      ctx.fillText(flipped ? '1' : '0', x + 4, y0 + 38);
    }

    if (Math.round(P(state.params, 'showBound', 1)) === 1) {
      ctx.fillStyle = C.theory || '#7c9cbf';
      ctx.font = '12px IBM Plex Mono, monospace';
      ctx.fillText(`r ≥ ${state.r}  so  2^r ≥ m+r+1`, 28, y0 + 70);
    }

    ctx.fillStyle = C.accent;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText(`d_H=${formatNum(state.dH, 0)}  r=${formatNum(state.r, 0)}`, 14, 40);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: 'd_H', value: formatNum(state.dH, 0) },
      { label: 'r', value: formatNum(state.r, 0) },
      { label: 'm', value: formatNum(state.m, 0) },
    ];
  },

  getTrajectory(state) {
    return state.hist.map((v, i) => ({ i, dH: v }));
  },
};
