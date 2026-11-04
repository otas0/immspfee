import { drawArrow, formatNum } from '../utils/draw.js';
import { P, accelExtras, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

export default {
  id: 'pendulum',
  name: '单摆',
  params: {
    L: 1.2, g: 9.81, c: 0.05, theta0: 40, m: 1,
  },
  paramSchema: {
    L: { group: 'dynamics', unit: 'm', label: 'L', min: 0.05, max: 10 },
    g: { group: 'dynamics', unit: 'm/s²', label: 'g', min: 0, max: 40 },
    c: { group: 'dynamics', unit: '1/s', label: '阻尼 c', min: 0, max: 20 },
    theta0: { group: 'initial', unit: '°', label: 'θ₀', min: -180, max: 180 },
    m: { group: 'dynamics', unit: 'kg', label: 'm', min: 0.01, max: 100 },
  },

  init(state) {
    state.t = 0;
    state.theta = (P(state.params, 'theta0', 0) * Math.PI) / 180;
    state.omega = 0;
    state.trail = [];
    state.crossings = [];
    state.lastSign = Math.sign(state.theta) || 1;
  },

  step(state, dt) {
    const L = Math.max(P(state.params, 'L', 1), 1e-9);
    const g = P(state.params, 'g', 9.81);
    const c = P(state.params, 'c', 0);
    const locals = { theta: state.theta, omega: state.omega, t: state.t, L, g, c };
    // α 额外项：把 a_extra 解释为角加速度增量
    const alpha = -(g / L) * Math.sin(state.theta) - c * state.omega
      + accelExtras(state.params, locals);
    state.omega = finiteOr(state.omega + alpha * dt, 0);
    state.theta = finiteOr(state.theta + state.omega * dt, state.theta);
    state.t += dt;

    const sign = Math.sign(state.theta) || state.lastSign;
    if (sign !== state.lastSign && state.omega > 0) {
      state.crossings.push(state.t);
      if (state.crossings.length > 6) state.crossings.shift();
    }
    state.lastSign = sign;

    state.trail.push({
      t: state.t,
      x: L * Math.sin(state.theta),
      y: -L * Math.cos(state.theta),
      theta: state.theta,
      omega: state.omega,
    });
    if (state.trail.length > 400) state.trail.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const L = Math.max(P(state.params, 'L', 1), 1e-6);
    const pivot = { x: W * 0.5, y: H * 0.18 };
    const scale = (Math.min(W, H) * 0.38) / Math.max(L, 0.5);
    const toScreen = (x, y) => ({ x: pivot.x + x * scale, y: pivot.y - y * scale });

    if (view.showTrail !== false && state.trail.length > 1) {
      ctx.beginPath();
      state.trail.forEach((p, i) => {
        const s = toScreen(p.x, p.y);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.strokeStyle = C.trail;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = C.muted;
    ctx.beginPath();
    ctx.arc(pivot.x, pivot.y, 6, 0, Math.PI * 2);
    ctx.fill();

    const bob = toScreen(L * Math.sin(state.theta), -L * Math.cos(state.theta));
    ctx.strokeStyle = C.vector;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivot.x, pivot.y);
    ctx.lineTo(bob.x, bob.y);
    ctx.stroke();

    ctx.fillStyle = C.body;
    ctx.beginPath();
    ctx.arc(bob.x, bob.y, 14, 0, Math.PI * 2);
    ctx.fill();

    if (view.showVectors !== false) {
      const v = L * state.omega;
      drawArrow(
        ctx, bob.x, bob.y,
        bob.x + Math.cos(state.theta) * v * 8,
        bob.y + Math.sin(state.theta) * v * 8,
        C.accent, 2,
      );
    }
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const L = P(state.params, 'L', 1);
    const g = Math.max(P(state.params, 'g', 9.81), 1e-9);
    const Tth = 2 * Math.PI * Math.sqrt(Math.max(L, 1e-9) / g);
    let Tmeas = null;
    if (state.crossings.length >= 2) {
      const a = state.crossings;
      Tmeas = (a[a.length - 1] - a[0]) / (a.length - 1);
    }
    return [
      { label: 't', value: `${formatNum(state.t, d)} s` },
      { label: 'θ', value: `${formatNum((state.theta * 180) / Math.PI, d)}°` },
      { label: 'ω', value: `${formatNum(state.omega, d)}` },
      { label: 'T理论', value: `${formatNum(Tth, d)} s` },
      { label: 'T测量', value: Tmeas != null ? `${formatNum(Tmeas, d)} s` : '—' },
    ];
  },

  getEnergy(state) {
    const m = P(state.params, 'm', 1);
    const L = P(state.params, 'L', 1);
    const g = P(state.params, 'g', 9.81);
    return {
      kinetic: 0.5 * m * (L * state.omega) ** 2,
      potential: m * g * L * (1 - Math.cos(state.theta)),
    };
  },

  getTrajectory(state) {
    return state.trail.map((p) => ({
      t: p.t, x: p.x, y: p.y, theta: p.theta, omega: p.omega,
    }));
  },
};
