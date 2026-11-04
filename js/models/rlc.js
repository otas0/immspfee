import { formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** 串联 RLC：L I'' + R I' + I/C = 0（计算机工程·物理） */
export default {
  id: 'rlc',
  name: 'RLC 振荡',
  params: {
    R: 2, L: 1, C: 0.25, I0: 0, V0: 4,
  },
  paramSchema: {
    R: { group: 'dynamics', unit: 'Ω', label: 'R', min: 0, max: 40 },
    L: { group: 'dynamics', unit: 'H', label: 'L', min: 0.05, max: 10 },
    C: { group: 'dynamics', unit: 'F', label: 'C', min: 0.02, max: 5 },
    I0: { group: 'initial', unit: 'A', label: 'I₀', min: -10, max: 10 },
    V0: { group: 'initial', unit: 'V', label: 'Vc₀', min: -20, max: 20 },
  },

  init(state) {
    state.t = 0;
    state.I = P(state.params, 'I0', 0);
    state.Vc = P(state.params, 'V0', 4);
    state.trailI = [];
    state.trailV = [];
  },

  step(state, dt) {
    const R = P(state.params, 'R', 1);
    const L = Math.max(P(state.params, 'L', 1), 1e-6);
    const Cap = Math.max(P(state.params, 'C', 0.2), 1e-6);
    // dI/dt = -(R/L)I - Vc/L ; dVc/dt = I/C
    const dI = (-R / L) * state.I - state.Vc / L;
    const dV = state.I / Cap;
    state.I = finiteOr(state.I + dI * dt, 0);
    state.Vc = finiteOr(state.Vc + dV * dt, state.Vc);
    state.t += dt;
    state.trailI.push({ t: state.t, v: state.I });
    state.trailV.push({ t: state.t, v: state.Vc });
    if (state.trailI.length > 700) {
      state.trailI.shift();
      state.trailV.shift();
    }
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = { l: 48, r: 24, t: 36, b: 36 };
    const plotW = W - pad.l - pad.r;
    const plotH = (H - pad.t - pad.b) / 2 - 10;
    const tMax = Math.max(state.t, 0.8);
    const iMax = Math.max(1, ...state.trailI.map((p) => Math.abs(p.v)), Math.abs(state.I));
    const vMax = Math.max(1, ...state.trailV.map((p) => Math.abs(p.v)), Math.abs(state.Vc));

    const drawSeries = (trail, top, maxAbs, color, label) => {
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(pad.l, top);
      ctx.lineTo(pad.l, top + plotH);
      ctx.lineTo(pad.l + plotW, top + plotH);
      ctx.stroke();
      if (trail.length > 1) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        trail.forEach((p, i) => {
          const x = pad.l + (p.t / tMax) * plotW;
          const y = top + plotH / 2 - (p.v / (maxAbs * 1.2)) * (plotH / 2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
      ctx.fillStyle = C.muted;
      ctx.font = '11px IBM Plex Mono, monospace';
      ctx.fillText(label, pad.l + 6, top + 14);
    };

    drawSeries(state.trailI, pad.t, iMax, C.body, 'I(t)');
    drawSeries(state.trailV, pad.t + plotH + 20, vMax, C.vector, 'Vc(t)');
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const L = P(state.params, 'L', 1);
    const Cap = P(state.params, 'C', 0.25);
    const w0 = 1 / Math.sqrt(L * Cap);
    return [
      { label: 't', value: `${formatNum(state.t, d)} s` },
      { label: 'I', value: `${formatNum(state.I, d)} A` },
      { label: 'Vc', value: `${formatNum(state.Vc, d)} V` },
      { label: 'ω₀', value: `${formatNum(w0, d)} rad/s` },
    ];
  },

  getTrajectory(state) {
    return state.trailI.map((p, i) => ({ t: p.t, I: p.v, Vc: state.trailV[i]?.v }));
  },
};
