import { formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** Ohm: V = I R, P = I V. Nilsson & Riedel. */
export default {
  id: 'ohms-law',
  name: '欧姆定律',
  equation: 'V = I R，P = I V',
  authority: 'Nilsson & Riedel, Electric Circuits, Ohm’s law',
  assumptions: '集总、线性电阻、直流；忽略温度系数与寄生电感',
  fidelity: 'engineering',
  params: {
    I: 0.5, R: 10, showLoad: 1, sweepI: 0,
  },
  paramSchema: {
    I: { group: 'dynamics', unit: 'A', label: '电流 I', min: 0, max: 5 },
    R: { group: 'dynamics', unit: 'Ω', label: '电阻 R', min: 0.1, max: 100 },
    showLoad: {
      group: 'display', unit: '—', label: '负载线', min: 0, max: 1,
      options: [{ value: 1, label: '显示' }, { value: 0, label: '隐藏' }],
    },
    sweepI: {
      group: 'display', unit: '—', label: '扫描 I', min: 0, max: 1,
      options: [{ value: 0, label: '关' }, { value: 1, label: '开' }],
    },
  },

  init(state) {
    state.t = 0;
    state.hist = [];
    this.refresh(state);
  },

  refresh(state) {
    const I = P(state.params, 'I', 0.5);
    const R = P(state.params, 'R', 10);
    state.V = finiteOr(I * R, 0);
    state.Pwr = finiteOr(I * state.V, 0);
  },

  step(state, dt) {
    if (Math.round(P(state.params, 'sweepI', 0)) === 1) {
      const next = P(state.params, 'I', 0.5) + dt * 0.4;
      state.params.I = next > 5 ? 0 : next;
    }
    state.t += dt;
    this.refresh(state);
    state.hist.push(state.V);
    if (state.hist.length > 200) state.hist.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = { l: 48, r: 28, t: 44, b: 36 };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    ctx.fillStyle = C.muted;
    ctx.font = '600 13px IBM Plex Mono, monospace';
    ctx.fillText('V = I R', 14, 22);

    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + plotH);
    ctx.lineTo(pad.l + plotW, pad.t + plotH);
    ctx.stroke();

    const Imax = 5;
    const Vmax = Math.max(20, P(state.params, 'R', 10) * Imax * 1.05);
    const X = (i) => pad.l + (i / Imax) * plotW;
    const Y = (v) => pad.t + plotH - (v / Vmax) * plotH;
    const R = P(state.params, 'R', 10);

    if (Math.round(P(state.params, 'showLoad', 1)) === 1) {
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      ctx.lineTo(X(Imax), Y(R * Imax));
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(X(P(state.params, 'I', 0.5)), Y(state.V), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText(`V=${formatNum(state.V, 2)} V  P=${formatNum(state.Pwr, 2)} W`, 14, 40);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: 'V', value: `${formatNum(state.V, d)} V` },
      { label: 'P', value: `${formatNum(state.Pwr, d)} W` },
      { label: 'I', value: `${formatNum(P(state.params, 'I', 0.5), d)} A` },
      { label: 'R', value: `${formatNum(P(state.params, 'R', 10), d)} Ω` },
    ];
  },

  getTrajectory(state) {
    return state.hist.map((v, i) => ({ i, V: v }));
  },
};
