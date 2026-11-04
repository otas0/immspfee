import { formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** 二维开普勒轨道：ä = -GM r̂ / r² */
export default {
  id: 'orbit',
  name: '开普勒轨道',
  params: {
    GM: 40, x0: 2.2, y0: 0, vx0: 0, vy0: 3.6,
  },
  paramSchema: {
    GM: { group: 'dynamics', unit: 'm³/s²', label: 'GM', min: 1, max: 200 },
    x0: { group: 'initial', unit: 'm', label: 'x₀', min: -8, max: 8 },
    y0: { group: 'initial', unit: 'm', label: 'y₀', min: -8, max: 8 },
    vx0: { group: 'initial', unit: 'm/s', label: 'vx₀', min: -12, max: 12 },
    vy0: { group: 'initial', unit: 'm/s', label: 'vy₀', min: -12, max: 12 },
  },

  init(state) {
    const p = state.params;
    state.t = 0;
    state.x = P(p, 'x0', 2);
    state.y = P(p, 'y0', 0);
    state.vx = P(p, 'vx0', 0);
    state.vy = P(p, 'vy0', 4);
    state.trail = [];
  },

  step(state, dt) {
    const GM = Math.max(P(state.params, 'GM', 1), 1e-9);
    const r2 = state.x ** 2 + state.y ** 2;
    const r = Math.sqrt(Math.max(r2, 1e-9));
    const ax = (-GM * state.x) / (r ** 3);
    const ay = (-GM * state.y) / (r ** 3);
    state.vx = finiteOr(state.vx + ax * dt, 0);
    state.vy = finiteOr(state.vy + ay * dt, 0);
    state.x = finiteOr(state.x + state.vx * dt, state.x);
    state.y = finiteOr(state.y + state.vy * dt, state.y);
    state.t += dt;
    state.trail.push({ x: state.x, y: state.y });
    if (state.trail.length > 900) state.trail.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const scale = Math.min(W, H) * 0.12;
    const ox = W / 2;
    const oy = H / 2;
    const X = (x) => ox + x * scale;
    const Y = (y) => oy - y * scale;

    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(ox, oy, 10, 0, Math.PI * 2);
    ctx.fill();

    if (view.showTrail !== false && state.trail.length > 1) {
      ctx.strokeStyle = C.trail;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      state.trail.forEach((p, i) => {
        if (i === 0) ctx.moveTo(X(p.x), Y(p.y));
        else ctx.lineTo(X(p.x), Y(p.y));
      });
      ctx.stroke();
    }

    ctx.fillStyle = C.body;
    ctx.beginPath();
    ctx.arc(X(state.x), Y(state.y), 8, 0, Math.PI * 2);
    ctx.fill();

    if (view.showVectors !== false) {
      ctx.strokeStyle = C.vector;
      ctx.beginPath();
      ctx.moveTo(X(state.x), Y(state.y));
      ctx.lineTo(X(state.x + state.vx * 0.25), Y(state.y + state.vy * 0.25));
      ctx.stroke();
    }

    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText('中心 = 引力源', 12, 20);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const r = Math.hypot(state.x, state.y);
    const v = Math.hypot(state.vx, state.vy);
    return [
      { label: 't', value: `${formatNum(state.t, d)} s` },
      { label: 'r', value: `${formatNum(r, d)} m` },
      { label: '|v|', value: `${formatNum(v, d)} m/s` },
    ];
  },

  getTrajectory(state) {
    return state.trail.map((p, i) => ({ i, x: p.x, y: p.y }));
  },
};
