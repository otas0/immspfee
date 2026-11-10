import { formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** Single-slit first minimum: a sinθ = λ. Hecht, Optics. */
export default {
  id: 'single-slit',
  name: '单缝衍射',
  equation: '第一极小：a sinθ = λ',
  authority: 'Hecht, Optics, single-slit Fraunhofer minimum',
  assumptions: '夫琅禾费远场、单色；只报第一极小角，不是完整包络积分',
  fidelity: 'engineering',
  params: {
    a: 0.1e-3, lambda: 550e-9, showPattern: 1,
  },
  paramSchema: {
    a: { group: 'dynamics', unit: 'm', label: '缝宽 a', min: 0.02e-3, max: 0.5e-3 },
    lambda: { group: 'dynamics', unit: 'm', label: '波长 λ', min: 400e-9, max: 700e-9 },
    showPattern: {
      group: 'display', unit: '—', label: '示意包络', min: 0, max: 1,
      options: [{ value: 1, label: '显示' }, { value: 0, label: '隐藏' }],
    },
  },

  init(state) {
    state.t = 0;
    state.hist = [];
    this.refresh(state);
  },

  refresh(state) {
    const a = Math.max(1e-6, P(state.params, 'a', 1e-4));
    const lambda = P(state.params, 'lambda', 550e-9);
    const arg = Math.min(1, lambda / a);
    state.th = finiteOr(Math.asin(arg), 0);
  },

  step(state, dt) {
    state.t += dt;
    this.refresh(state);
    state.hist.push(state.th);
    if (state.hist.length > 200) state.hist.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = { l: 40, r: 28, t: 44, b: 36 };
    ctx.fillStyle = C.muted;
    ctx.font = '600 13px IBM Plex Mono, monospace';
    ctx.fillText('a sinθ = λ', 14, 22);

    const plotW = W - pad.l - pad.r;
    const mid = pad.t + (H - pad.t - pad.b) * 0.55;
    const thDeg = (state.th * 180) / Math.PI;

    if (Math.round(P(state.params, 'showPattern', 1)) === 1) {
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 120; i += 1) {
        const x = pad.l + (i / 120) * plotW;
        const beta = (i / 120 - 0.5) * 8;
        const I = beta === 0 ? 1 : (Math.sin(beta) / beta) ** 2;
        const y = mid - I * (H - pad.t - pad.b) * 0.38;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
      const xMin = pad.l + plotW * 0.5 + (state.th / 0.05) * (plotW * 0.2);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = C.theory || '#7c9cbf';
      ctx.beginPath();
      ctx.moveTo(xMin, pad.t);
      ctx.lineTo(xMin, pad.t + (H - pad.t - pad.b));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = C.accent;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText(`θ₁=${formatNum(thDeg, 3)}°`, 14, 40);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: 'θ', value: `${formatNum((state.th * 180) / Math.PI, d)} °` },
      { label: 'a', value: `${formatNum(P(state.params, 'a', 1e-4) * 1e3, d)} mm` },
      { label: 'λ', value: `${formatNum(P(state.params, 'lambda', 550e-9) * 1e9, d)} nm` },
    ];
  },

  getTrajectory(state) {
    return state.hist.map((v, i) => ({ i, th: v }));
  },
};
