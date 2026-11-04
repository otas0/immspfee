import { formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** RC 充电：Vc' = (Vin - Vc)/(RC)（计算机工程） */
export default {
  id: 'rc-circuit',
  name: 'RC 电路',
  params: {
    R: 1000, C: 0.001, Vin: 5, V0: 0, mode: 1,
  },
  paramSchema: {
    R: { group: 'dynamics', unit: 'Ω', label: 'R', min: 10, max: 20000 },
    C: { group: 'dynamics', unit: 'F', label: 'C', min: 0.0001, max: 0.05 },
    Vin: { group: 'dynamics', unit: 'V', label: 'Vin', min: -12, max: 12 },
    V0: { group: 'initial', unit: 'V', label: 'Vc₀', min: -12, max: 12 },
    mode: { group: 'dynamics', unit: '', label: 'charge(1)/dis(0)', min: 0, max: 1 },
  },

  init(state) {
    state.t = 0;
    state.Vc = P(state.params, 'V0', 0);
    state.trail = [];
  },

  step(state, dt) {
    const R = Math.max(P(state.params, 'R', 1000), 1e-6);
    const Cap = Math.max(P(state.params, 'C', 0.001), 1e-9);
    const mode = P(state.params, 'mode', 1) >= 0.5 ? 1 : 0;
    const Vin = mode ? P(state.params, 'Vin', 5) : 0;
    const tau = R * Cap;
    state.Vc = finiteOr(state.Vc + ((Vin - state.Vc) / tau) * dt, state.Vc);
    state.t += dt;
    state.trail.push({ t: state.t, Vc: state.Vc });
    if (state.trail.length > 600) state.trail.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = { l: 50, r: 30, t: 40, b: 40 };
    const VinAbs = Math.abs(P(state.params, 'Vin', 5)) || 5;
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const tMax = Math.max(state.t, 0.5);
    const X = (t) => pad.l + (t / tMax) * plotW;
    const Y = (v) => pad.t + (1 - (v / (VinAbs * 1.2) + 0.1) / 1.2) * plotH;

    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + plotH);
    ctx.lineTo(pad.l + plotW, pad.t + plotH);
    ctx.stroke();

    // 解析解虚线：Vc(t)=Vin+(V0-Vin)e^{-t/τ}（充电）或 V0 e^{-t/τ}（放电）
    const R = Math.max(P(state.params, 'R', 1000), 1e-6);
    const Cap = Math.max(P(state.params, 'C', 0.001), 1e-9);
    const tau = R * Cap;
    const mode = P(state.params, 'mode', 1) >= 0.5 ? 1 : 0;
    const Vin = mode ? P(state.params, 'Vin', 5) : 0;
    const V0 = P(state.params, 'V0', 0);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = C.theory || '#7c9cbf';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 80; i += 1) {
      const t = (tMax * i) / 80;
      const v = Vin + (V0 - Vin) * Math.exp(-t / tau);
      const x = X(t);
      const y = Y(v);
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
        const y = Y(p.Vc);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    const cx = W * 0.78;
    const cy = H * 0.28;
    ctx.strokeStyle = C.vector;
    ctx.strokeRect(cx, cy, 40, 24);
    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText('C', cx + 14, cy + 16);
    ctx.fillText(`Vc=${formatNum(state.Vc, 2)}V · 虚线=解析`, 12, 22);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const R = P(state.params, 'R', 1000);
    const Cap = P(state.params, 'C', 0.001);
    return [
      { label: 't', value: `${formatNum(state.t, d)} s` },
      { label: 'Vc', value: `${formatNum(state.Vc, d)} V` },
      { label: 'τ', value: `${formatNum(R * Cap, d)} s` },
    ];
  },

  getTrajectory(state) {
    return state.trail.map((p) => ({ t: p.t, Vc: p.Vc }));
  },
};
