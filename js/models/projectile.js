import { drawArrow, formatNum } from '../utils/draw.js';
import { P, accelExtras, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

export default {
  id: 'projectile',
  name: '斜抛运动',
  params: {
    v0: 20, theta: 45, g: 9.81, k: 0, m: 1, showTheory: true,
  },
  paramSchema: {
    v0: { group: 'initial', unit: 'm/s', label: 'v₀', min: 0, max: 80 },
    theta: { group: 'initial', unit: '°', label: 'θ', min: 0, max: 90 },
    g: { group: 'dynamics', unit: 'm/s²', label: 'g', min: 0, max: 40 },
    k: { group: 'dynamics', unit: 'kg/s', label: '阻力 k', min: 0, max: 200 },
    m: { group: 'dynamics', unit: 'kg', label: 'm', min: 0.01, max: 100 },
    showTheory: { group: 'display', label: 'showTheory' },
  },

  init(state) {
    const p = state.params;
    const th = (P(p, 'theta', 45) * Math.PI) / 180;
    const v0 = P(p, 'v0', 0);
    state.t = 0;
    state.x = 0;
    state.y = 0;
    state.vx = v0 * Math.cos(th);
    state.vy = v0 * Math.sin(th);
    state.maxY = 0;
    state.range = 0;
    state.landed = false;
    state.trail = [{ t: 0, x: 0, y: 0 }];
  },

  step(state, dt) {
    if (state.landed) return;
    const g = P(state.params, 'g', 9.81);
    const k = P(state.params, 'k', 0);
    const m = Math.max(P(state.params, 'm', 1), 1e-9);
    const locals = { x: state.x, y: state.y, vx: state.vx, vy: state.vy, t: state.t, g, k, m };
    const ax = -(k / m) * state.vx + accelExtras(state.params, { ...locals, axis: 0 });
    const ay = -g - (k / m) * state.vy + accelExtras(state.params, locals);
    state.vx = finiteOr(state.vx + ax * dt, 0);
    state.vy = finiteOr(state.vy + ay * dt, 0);
    state.x = finiteOr(state.x + state.vx * dt, state.x);
    state.y = finiteOr(state.y + state.vy * dt, state.y);
    state.t += dt;
    if (state.y > state.maxY) state.maxY = state.y;
    state.trail.push({ t: state.t, x: state.x, y: state.y });
    if (state.trail.length > 800) state.trail.shift();
    if (state.y < 0 && state.t > 0.05) {
      state.y = 0;
      state.range = state.x;
      state.landed = true;
      state.vx = 0;
      state.vy = 0;
    }
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const p = state.params;
    const th = (P(p, 'theta', 45) * Math.PI) / 180;
    const v0 = P(p, 'v0', 1);
    const g = Math.max(P(p, 'g', 9.81), 1e-9);
    const R = (v0 * v0 * Math.sin(2 * th)) / g || 1;
    const Hmax = (v0 * v0 * Math.sin(th) ** 2) / (2 * g) || 1;
    const worldW = Math.max(R * 1.15, state.x * 1.1, 5);
    const worldH = Math.max(Hmax * 1.25, state.maxY * 1.2, 2);
    const margin = { l: 50, r: 30, t: 30, b: 45 };
    const sx = (W - margin.l - margin.r) / worldW;
    const sy = (H - margin.t - margin.b) / worldH;
    const ox = margin.l;
    const oy = H - margin.b;
    const X = (x) => ox + x * sx;
    const Y = (y) => oy - y * sy;

    if (view.showAxes !== false) {
      ctx.strokeStyle = C.ground;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(W - margin.r, oy);
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox, margin.t);
      ctx.stroke();
    }

    if (p.showTheory) {
      const Tflight = (2 * v0 * Math.sin(th)) / g;
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = C.theory || '#7c9cbf';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i <= 80; i += 1) {
        const t = (Tflight * i) / 80;
        const x = v0 * Math.cos(th) * t;
        const y = v0 * Math.sin(th) * t - 0.5 * g * t * t;
        if (y < 0) break;
        if (i === 0) ctx.moveTo(X(x), Y(y));
        else ctx.lineTo(X(x), Y(y));
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.theory || C.muted;
      ctx.font = '11px IBM Plex Mono, monospace';
      ctx.fillText('虚线=无阻力解析解（灰蓝）', ox + 8, margin.t + 4);
    }

    if (view.showTrail !== false) {
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      state.trail.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(X(pt.x), Y(pt.y));
        else ctx.lineTo(X(pt.x), Y(pt.y));
      });
      ctx.stroke();
    }

    const bx = X(state.x);
    const by = Y(state.y);
    ctx.fillStyle = C.body;
    ctx.beginPath();
    ctx.arc(bx, by, 10, 0, Math.PI * 2);
    ctx.fill();

    if (view.showVectors !== false) {
      const vs = 3;
      drawArrow(ctx, bx, by, bx + state.vx * vs, by, C.vector, 2);
      drawArrow(ctx, bx, by, bx, by - state.vy * vs, C.accent, 2);
      drawArrow(ctx, bx, by, bx + state.vx * vs, by - state.vy * vs, C.body, 2);
    }
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: 't', value: `${formatNum(state.t, d)} s` },
      { label: '(x,y)', value: `(${formatNum(state.x, d)}, ${formatNum(state.y, d)})` },
      { label: 'vx', value: `${formatNum(state.vx, d)}` },
      { label: 'vy', value: `${formatNum(state.vy, d)}` },
      { label: 'Hmax', value: `${formatNum(state.maxY, d)} m` },
      { label: '射程', value: state.landed ? `${formatNum(state.range, d)} m` : '—' },
    ];
  },

  getEnergy(state) {
    const m = P(state.params, 'm', 1);
    const g = P(state.params, 'g', 9.81);
    return {
      kinetic: 0.5 * m * (state.vx ** 2 + state.vy ** 2),
      potential: m * g * Math.max(0, state.y),
    };
  },

  getTrajectory(state) {
    return state.trail;
  },
};
