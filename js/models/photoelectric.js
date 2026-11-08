import { formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** Einstein photoelectric: K_max = max(0, hf − W); yield ∝ I only above threshold. */
export default {
  id: 'photoelectric',
  name: '光电效应',
  equation: 'K_max = max(0, hf − W)；阈值阈值 R ∝ I（仅当 K_max>0）',
  authority: 'Einstein photoelectric equation (1905); Halliday (K_max independent of intensity)',
  assumptions: 'hf 与 W 同用 eV；无空间电荷；R 为相对产额不是标定电流',
  fidelity: 'engineering',
  params: {
    hf: 3, W: 2, intensity: 1, showCutoff: 1,
  },
  paramSchema: {
    hf: { group: 'dynamics', unit: 'eV', label: '光子能 hf', min: 0, max: 12 },
    W: { group: 'dynamics', unit: 'eV', label: '逸出功 W', min: 0, max: 10 },
    intensity: { group: 'dynamics', unit: '—', label: '光强 I', min: 0, max: 10 },
    showCutoff: {
      group: 'display', unit: '—', label: '阈值线', min: 0, max: 1,
      options: [{ value: 1, label: '显示' }, { value: 0, label: '隐藏' }],
    },
  },

  init(state) {
    state.t = 0;
    state.hist = [];
    this.refresh(state);
  },

  refresh(state) {
    const K = Math.max(0, P(state.params, 'hf', 3) - P(state.params, 'W', 2));
    state.K = finiteOr(K, 0);
    state.rate = state.K > 0 ? Math.max(0, P(state.params, 'intensity', 1)) : 0;
  },

  step(state, dt) {
    state.t += dt;
    this.refresh(state);
    state.hist.push(state.K);
    if (state.hist.length > 200) state.hist.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = { l: 48, r: 28, t: 44, b: 36 };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    ctx.fillStyle = C.muted;
    ctx.font = '600 13px IBM Plex Mono, monospace';
    ctx.fillText('K_max = hf − W', 14, 22);

    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + plotH);
    ctx.lineTo(pad.l + plotW, pad.t + plotH);
    ctx.stroke();

    const hfMax = 12;
    const kMax = 10;
    const X = (hf) => pad.l + (hf / hfMax) * plotW;
    const Y = (k) => pad.t + plotH - (k / kMax) * plotH;
    const W0 = P(state.params, 'W', 2);

    if (Math.round(P(state.params, 'showCutoff', 1)) === 1) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = C.theory || '#7c9cbf';
      ctx.beginPath();
      ctx.moveTo(X(W0), pad.t + plotH);
      ctx.lineTo(X(W0), pad.t);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = C.body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 60; i += 1) {
      const hf = (hfMax * i) / 60;
      const k = Math.max(0, hf - W0);
      const x = X(hf);
      const y = Y(k);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    const hf = P(state.params, 'hf', 3);
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(X(hf), Y(state.K), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText(`K=${formatNum(state.K, 2)} eV  R∝${formatNum(state.rate, 2)}`, 14, 40);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: 'K_max', value: `${formatNum(state.K, d)} eV` },
      { label: 'R', value: formatNum(state.rate, d) },
      { label: 'hf', value: `${formatNum(P(state.params, 'hf', 3), d)} eV` },
      { label: 'W', value: `${formatNum(P(state.params, 'W', 2), d)} eV` },
    ];
  },

  getTrajectory(state) {
    return state.hist.map((v, i) => ({ i, K: v }));
  },
};
