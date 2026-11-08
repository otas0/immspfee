import { formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** Malus: I = I₀ cos²θ (optional stacked analyzers). Hecht, Optics. */
export default {
  id: 'polarization',
  name: '偏振（Malus）',
  equation: 'I = I₀ cos²θ；n 片理想分析器时 I = I₀ cos²ⁿθ',
  authority: 'Hecht, Optics, Malus’s law',
  assumptions: '入射光已线偏振；理想偏振片；θ 为偏振方向夹角；忽略吸收与双折射',
  fidelity: 'engineering',
  params: {
    I0: 1, theta: 30, plates: 1, showTheory: 1,
  },
  paramSchema: {
    I0: { group: 'dynamics', unit: '—', label: '入射 I₀', min: 0, max: 10 },
    theta: { group: 'dynamics', unit: '°', label: '夹角 θ', min: 0, max: 180 },
    plates: { group: 'dynamics', unit: '—', label: '分析器数 n', min: 1, max: 6 },
    showTheory: {
      group: 'display', unit: '—', label: '示意偏振轴', min: 0, max: 1,
      options: [{ value: 1, label: '显示' }, { value: 0, label: '隐藏' }],
    },
  },

  init(state) {
    state.t = 0;
    state.hist = [];
    this.refresh(state);
  },

  refresh(state) {
    const n = Math.max(1, Math.round(P(state.params, 'plates', 1)));
    const th = (P(state.params, 'theta', 30) * Math.PI) / 180;
    state.I = finiteOr(P(state.params, 'I0', 1) * (Math.cos(th) ** (2 * n)), 0);
    state.n = n;
  },

  step(state, dt) {
    state.t += dt;
    this.refresh(state);
    state.hist.push(state.I);
    if (state.hist.length > 200) state.hist.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const cx = W * 0.5;
    const cy = H * 0.48;
    const R = Math.min(W, H) * 0.22;
    ctx.fillStyle = C.muted;
    ctx.font = '600 13px IBM Plex Mono, monospace';
    ctx.fillText('Malus  I = I₀ cos²θ', 14, 22);

    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    const th = (P(state.params, 'theta', 30) * Math.PI) / 180;
    if (Math.round(P(state.params, 'showTheory', 1)) === 1) {
      ctx.strokeStyle = C.vector || C.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - R * 1.1, cy);
      ctx.lineTo(cx + R * 1.1, cy);
      ctx.stroke();
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      ctx.moveTo(cx - R * Math.cos(th) * 1.1, cy - R * Math.sin(th) * 1.1);
      ctx.lineTo(cx + R * Math.cos(th) * 1.1, cy + R * Math.sin(th) * 1.1);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    const mid = H * 0.82;
    const boxL = 40;
    const boxW = W - 70;
    ctx.strokeStyle = C.body;
    ctx.beginPath();
    state.hist.forEach((v, i) => {
      const x = boxL + (i / Math.max(1, state.hist.length - 1)) * boxW;
      const y = mid - v * 28;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = C.accent;
    ctx.font = '12px IBM Plex Mono, monospace';
    ctx.fillText(`I=${formatNum(state.I, 3)}  n=${state.n}`, 14, 40);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: 'I', value: formatNum(state.I, d) },
      { label: 'θ', value: `${formatNum(P(state.params, 'theta', 30), d)} °` },
      { label: 'I₀', value: formatNum(P(state.params, 'I0', 1), d) },
      { label: 'n', value: formatNum(state.n, 0) },
    ];
  },

  getTrajectory(state) {
    return state.hist.map((v, i) => ({ i, I: v }));
  },
};
