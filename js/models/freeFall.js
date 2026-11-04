import { velocityVerlet1D } from '../utils/integrator.js';
import { drawArrow, formatNum } from '../utils/draw.js';
import { P, accelExtras, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/**
 * 自由落体：y'' = -g - (k/m)y' + 自定义 a_extra / expr_a
 * 落地：v ← -e·v
 */
export default {
  id: 'free-fall',
  name: '自由落体',
  params: {
    g: 9.81, h: 10, k: 0, m: 1, e: 0.7,
  },
  paramSchema: {
    g: { group: 'dynamics', unit: 'm/s²', label: 'g' },
    h: { group: 'initial', unit: 'm', label: 'h₀' },
    k: { group: 'dynamics', unit: 'kg/s', label: '阻力 k' },
    m: { group: 'dynamics', unit: 'kg', label: 'm' },
    e: { group: 'dynamics', unit: '—', label: '恢复系数 e' },
  },

  init(state) {
    const h = Math.max(P(state.params, 'h', 10), 0);
    state.t = 0;
    state.y = h;
    state.v = 0;
    state.a = -P(state.params, 'g', 9.81);
    state.bounces = 0;
    state.resting = false;
    state.trail = [];
  },

  step(state, dt) {
    if (state.resting) return;
    const g = P(state.params, 'g', 9.81);
    const k = P(state.params, 'k', 0);
    const m = Math.max(P(state.params, 'm', 1), 1e-9);
    const e = P(state.params, 'e', 0);
    const locals = { y: state.y, v: state.v, t: state.t, g, k, m };

    if (k === 0) {
      const aAt = (y) => -g + accelExtras(state.params, { ...locals, y });
      const next = velocityVerlet1D(state.y, state.v, state.a, aAt, dt);
      state.y = finiteOr(next.x, 0);
      state.v = finiteOr(next.v, 0);
      state.a = finiteOr(next.a, -g);
    } else {
      let a = -g - (k / m) * state.v + accelExtras(state.params, locals);
      state.v = finiteOr(state.v + a * dt, 0);
      state.y = finiteOr(state.y + state.v * dt, 0);
      state.a = -g - (k / m) * state.v + accelExtras(state.params, { ...locals, v: state.v, y: state.y });
    }

    state.t += dt;
    if (state.y <= 0 && state.v < 0) {
      state.y = 0;
      state.v = -e * state.v;
      state.bounces += 1;
      state.a = -g;
      if (Math.abs(state.v) < 0.05 || e <= 0) {
        state.v = 0;
        state.a = 0;
        state.resting = true;
      }
    }
    state.trail.push({ t: state.t, y: state.y, v: state.v });
    if (state.trail.length > 600) state.trail.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const h0 = Math.max(P(state.params, 'h', 10), 1e-6);
    const margin = { l: 60, r: 40, t: 40, b: 50 };
    const groundY = H - margin.b;
    const scale = (H - margin.t - margin.b) / (h0 * 1.15);
    const cx = W * 0.45;
    const toY = (y) => groundY - y * scale;

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.l, groundY);
    ctx.lineTo(W - margin.r, groundY);
    ctx.stroke();

    if (view.showAxes !== false) {
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(cx, toY(h0));
      ctx.lineTo(cx, groundY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (view.showTrail !== false) {
      ctx.fillStyle = C.trail;
      for (let i = 0; i < state.trail.length; i += 3) {
        ctx.beginPath();
        ctx.arc(cx, toY(state.trail[i].y), 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const sy = toY(state.y);
    ctx.fillStyle = C.body;
    ctx.beginPath();
    ctx.arc(cx, sy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.vector;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (view.showVectors !== false) {
      drawArrow(ctx, cx, sy, cx, sy - state.v * 8, C.vector, 2);
    }

    ctx.fillStyle = C.muted;
    ctx.font = '12px IBM Plex Mono, monospace';
    ctx.fillText(`h0=${formatNum(h0)}  e=${formatNum(P(state.params, 'e', 0), 2)}`, margin.l, margin.t - 8);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: 't', value: `${formatNum(state.t, d)} s` },
      { label: 'y', value: `${formatNum(state.y, d)} m` },
      { label: 'v', value: `${formatNum(state.v, d)} m/s` },
      { label: '弹跳', value: `${state.bounces}` },
    ];
  },

  getEnergy(state) {
    const m = P(state.params, 'm', 1);
    const g = P(state.params, 'g', 9.81);
    return { kinetic: 0.5 * m * state.v * state.v, potential: m * g * state.y };
  },

  getTrajectory(state) {
    return state.trail;
  },
};
