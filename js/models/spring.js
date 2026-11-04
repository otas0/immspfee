import { velocityVerlet1D } from '../utils/integrator.js';
import { drawZigZagSpring, formatNum } from '../utils/draw.js';
import { P, springK, accelExtras, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** 弹簧：m x'' = -(k+k_extra)x - c x' + a_extra/expr_a */
export default {
  id: 'spring',
  name: '弹簧振子',
  params: {
    m: 1, k: 20, c: 0.3, x0: 0.8,
  },
  paramSchema: {
    m: { group: 'dynamics', unit: 'kg', label: 'm', min: 0.01, max: 100 },
    k: { group: 'dynamics', unit: 'N/m', label: 'k', min: 0.1, max: 200 },
    c: { group: 'dynamics', unit: 'N·s/m', label: '阻尼 c', min: 0, max: 50 },
    x0: { group: 'initial', unit: 'm', label: 'x₀', min: -5, max: 5 },
  },

  init(state) {
    const p = state.params;
    state.t = 0;
    state.x = P(p, 'x0', 0);
    state.v = 0;
    const m = Math.max(P(p, 'm', 1), 1e-9);
    state.a = (-springK(p) * state.x - P(p, 'c', 0) * state.v) / m;
    state.trail = [];
    state.crossings = [];
    state.lastXSign = Math.sign(state.x) || 1;
  },

  step(state, dt) {
    const p = state.params;
    const m = Math.max(P(p, 'm', 1), 1e-9);
    const k = springK(p);
    const c = P(p, 'c', 0);
    const locals = { x: state.x, v: state.v, t: state.t, m, k, c };

    if (c === 0) {
      const aAt = (x) => (-k * x) / m + accelExtras(p, { ...locals, x });
      const next = velocityVerlet1D(state.x, state.v, state.a, aAt, dt);
      state.x = finiteOr(next.x, 0);
      state.v = finiteOr(next.v, 0);
      state.a = finiteOr(next.a, 0);
    } else {
      state.a = (-k * state.x - c * state.v) / m + accelExtras(p, locals);
      state.v = finiteOr(state.v + state.a * dt, 0);
      state.x = finiteOr(state.x + state.v * dt, 0);
      state.a = (-k * state.x - c * state.v) / m + accelExtras(p, { ...locals, x: state.x, v: state.v });
    }

    state.t += dt;
    const sign = Math.sign(state.x) || state.lastXSign;
    if (sign !== state.lastXSign && state.v > 0) {
      state.crossings.push(state.t);
      if (state.crossings.length > 6) state.crossings.shift();
    }
    state.lastXSign = sign;

    state.trail.push({ t: state.t, x: state.x, v: state.v });
    if (state.trail.length > 600) state.trail.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const wallX = 80;
    const eqX = W * 0.45;
    const y = H * 0.5;
    const scale = Math.min(120, (W - wallX - 80) / 2);
    const massX = eqX + state.x * scale;

    ctx.fillStyle = C.ground;
    ctx.fillRect(wallX - 16, y - 50, 16, 100);

    if (view.showAxes !== false) {
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(eqX, y - 70);
      ctx.lineTo(eqX, y + 70);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.muted;
      ctx.font = '12px IBM Plex Mono, monospace';
      ctx.fillText('eq', eqX + 6, y - 55);
    }

    ctx.strokeStyle = C.body2;
    ctx.lineWidth = 2;
    drawZigZagSpring(ctx, wallX, y, massX - 22, 14, 12);

    ctx.fillStyle = C.body;
    ctx.strokeStyle = C.vector;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(massX - 22, y - 22, 44, 44, 4);
    else ctx.rect(massX - 22, y - 22, 44, 44);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.vector;
    ctx.fillText(`x=${formatNum(state.x)}`, massX - 28, y + 48);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const m = P(state.params, 'm', 1);
    const k = springK(state.params);
    const Tth = 2 * Math.PI * Math.sqrt(Math.max(m, 1e-9) / Math.max(k, 1e-9));
    let Tmeas = null;
    if (state.crossings.length >= 2) {
      const a = state.crossings;
      Tmeas = (a[a.length - 1] - a[0]) / (a.length - 1);
    }
    return [
      { label: 't', value: `${formatNum(state.t, d)} s` },
      { label: 'x', value: `${formatNum(state.x, d)} m` },
      { label: 'v', value: `${formatNum(state.v, d)} m/s` },
      { label: 'T理论', value: `${formatNum(Tth, d)} s` },
      { label: 'T测量', value: Tmeas != null ? `${formatNum(Tmeas, d)} s` : '—' },
    ];
  },

  getEnergy(state) {
    const m = P(state.params, 'm', 1);
    const k = springK(state.params);
    return { kinetic: 0.5 * m * state.v ** 2, potential: 0.5 * k * state.x ** 2 };
  },

  getTrajectory(state) {
    return state.trail;
  },
};
