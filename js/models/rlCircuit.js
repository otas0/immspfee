import { formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** First-order RL step: i' = (V − R i)/L → i=(V/R)(1−e^{−(R/L)t}). */
export default {
  id: 'rl-circuit',
  name: 'RL 电路',
  equation: 'L i′ + R i = V；i(t)=(V/R)(1−e^{−(R/L)t})（零状态）',
  authority: 'Nilsson & Riedel, Electric Circuits, first-order RL',
  assumptions: '集总串联 RL、直流阶跃、零初始电流；忽略铁芯饱和',
  fidelity: 'engineering',
  params: {
    V: 10, R: 5, L: 0.2, i0: 0, mode: 1,
  },
  paramSchema: {
    V: { group: 'dynamics', unit: 'V', label: '电源 V', min: 0, max: 48 },
    R: { group: 'dynamics', unit: 'Ω', label: '电阻 R', min: 0.2, max: 50 },
    L: { group: 'dynamics', unit: 'H', label: '电感 L', min: 0.01, max: 2 },
    i0: { group: 'initial', unit: 'A', label: 'i₀', min: -5, max: 5 },
    mode: {
      group: 'dynamics', unit: '—', label: '接通(1)/短路(0)', min: 0, max: 1,
      options: [{ value: 1, label: '接通电源' }, { value: 0, label: '短路衰减' }],
    },
  },

  init(state) {
    state.t = 0;
    state.i = P(state.params, 'i0', 0);
    state.trail = [];
  },

  step(state, dt) {
    const R = Math.max(P(state.params, 'R', 5), 1e-6);
    const L = Math.max(P(state.params, 'L', 0.2), 1e-6);
    const mode = P(state.params, 'mode', 1) >= 0.5 ? 1 : 0;
    const V = mode ? P(state.params, 'V', 10) : 0;
    const tau = L / R;
    state.i = finiteOr(state.i + ((V - R * state.i) / L) * dt, state.i);
    state.t += dt;
    state.tau = tau;
    state.trail.push({ t: state.t, i: state.i });
    if (state.trail.length > 600) state.trail.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = { l: 50, r: 30, t: 40, b: 40 };
    const R = Math.max(P(state.params, 'R', 5), 1e-6);
    const L = Math.max(P(state.params, 'L', 0.2), 1e-6);
    const mode = P(state.params, 'mode', 1) >= 0.5 ? 1 : 0;
    const V = mode ? P(state.params, 'V', 10) : 0;
    const iInf = V / R;
    const iScale = Math.max(Math.abs(iInf), Math.abs(P(state.params, 'i0', 0)), 0.5) * 1.3;
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const tMax = Math.max(state.t, 0.5);
    const X = (t) => pad.l + (t / tMax) * plotW;
    const Y = (i) => pad.t + (1 - (i / iScale + 0.1) / 1.2) * plotH;

    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + plotH);
    ctx.lineTo(pad.l + plotW, pad.t + plotH);
    ctx.stroke();

    const tau = L / R;
    const i0 = P(state.params, 'i0', 0);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = C.theory || '#7c9cbf';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 80; i += 1) {
      const t = (tMax * i) / 80;
      const ii = iInf + (i0 - iInf) * Math.exp(-t / tau);
      const x = X(t);
      const y = Y(ii);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    if (state.trail.length > 1) {
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      state.trail.forEach((p, i) => {
        const x = X(p.t);
        const y = Y(p.i);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText(`i=${formatNum(state.i, 2)} A · τ=${formatNum(tau, 3)} s · 虚线=解析`, 12, 22);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const R = P(state.params, 'R', 5);
    const L = P(state.params, 'L', 0.2);
    return [
      { label: 't', value: `${formatNum(state.t, d)} s` },
      { label: 'i', value: `${formatNum(state.i, d)} A` },
      { label: 'τ', value: `${formatNum(L / Math.max(R, 1e-9), d)} s` },
    ];
  },

  getTrajectory(state) {
    return state.trail.map((p) => ({ t: p.t, i: p.i }));
  },
};
