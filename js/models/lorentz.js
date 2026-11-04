import { formatNum, drawArrow } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** 带电粒子：F = q(E + v × B)，二维（B 出屏） */
export default {
  id: 'lorentz',
  name: '洛伦兹力',
  params: {
    q: 1, m: 1, Ex: 0.4, B: 1.2, vx0: 0, vy0: 2.5, x0: -1.5, y0: 0,
  },
  paramSchema: {
    q: { group: 'dynamics', unit: 'C', label: 'q', min: -5, max: 5 },
    m: { group: 'dynamics', unit: 'kg', label: 'm', min: 0.1, max: 10 },
    Ex: { group: 'dynamics', unit: 'V/m', label: 'Ex', min: -5, max: 5 },
    B: { group: 'dynamics', unit: 'T', label: 'B⊥', min: -5, max: 5 },
    x0: { group: 'initial', unit: 'm', label: 'x₀', min: -5, max: 5 },
    y0: { group: 'initial', unit: 'm', label: 'y₀', min: -5, max: 5 },
    vx0: { group: 'initial', unit: 'm/s', label: 'vx₀', min: -8, max: 8 },
    vy0: { group: 'initial', unit: 'm/s', label: 'vy₀', min: -8, max: 8 },
  },

  init(state) {
    const p = state.params;
    state.t = 0;
    state.x = P(p, 'x0', 0);
    state.y = P(p, 'y0', 0);
    state.vx = P(p, 'vx0', 0);
    state.vy = P(p, 'vy0', 2);
    state.trail = [];
  },

  step(state, dt) {
    const q = P(state.params, 'q', 1);
    const m = Math.max(P(state.params, 'm', 1), 1e-9);
    const Ex = P(state.params, 'Ex', 0);
    const B = P(state.params, 'B', 1);
    // v × B（B = Bẑ）：(vx,vy,0)×(0,0,B) = (vy B, -vx B, 0)
    const ax = (q / m) * (Ex + state.vy * B);
    const ay = (q / m) * (-state.vx * B);
    state.vx = finiteOr(state.vx + ax * dt, 0);
    state.vy = finiteOr(state.vy + ay * dt, 0);
    state.x = finiteOr(state.x + state.vx * dt, state.x);
    state.y = finiteOr(state.y + state.vy * dt, state.y);
    state.t += dt;
    state.trail.push({ x: state.x, y: state.y });
    if (state.trail.length > 800) state.trail.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const scale = Math.min(W, H) * 0.14;
    const ox = W / 2;
    const oy = H / 2;
    const X = (x) => ox + x * scale;
    const Y = (y) => oy - y * scale;

    if (view.showTrail !== false && state.trail.length > 1) {
      ctx.strokeStyle = C.trail;
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
      drawArrow(ctx, X(state.x), Y(state.y), X(state.x + state.vx * 0.2), Y(state.y + state.vy * 0.2), C.vector, 2);
    }

    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText('B ⊙ 出屏 · E →', 12, 20);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: 't', value: `${formatNum(state.t, d)} s` },
      { label: 'x', value: `${formatNum(state.x, d)}` },
      { label: 'y', value: `${formatNum(state.y, d)}` },
      { label: '|v|', value: `${formatNum(Math.hypot(state.vx, state.vy), d)}` },
    ];
  },

  getTrajectory(state) {
    return state.trail.map((p, i) => ({ i, x: p.x, y: p.y }));
  },
};
