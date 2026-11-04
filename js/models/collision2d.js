import { drawArrow, formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** 二维圆盘碰撞（恢复系数 + 切向摩擦可选） */
export default {
  id: 'collision-2d',
  name: '二维刚体碰撞',
  params: {
    m1: 2, m2: 1.2, r1: 0.45, r2: 0.35, e: 0.85, mu: 0.05,
    x1: -2.2, y1: 0.15, vx1: 2.4, vy1: 0.1,
    x2: 1.6, y2: -0.1, vx2: -0.8, vy2: 0.2,
    soft: 0.002, trailMax: 400,
  },
  paramSchema: {
    m1: { group: 'dynamics', unit: 'kg', label: 'm₁', min: 0.001, max: 1e4 },
    m2: { group: 'dynamics', unit: 'kg', label: 'm₂', min: 0.001, max: 1e4 },
    r1: { group: 'dynamics', unit: 'm', label: 'r₁', min: 0.05, max: 5 },
    r2: { group: 'dynamics', unit: 'm', label: 'r₂', min: 0.05, max: 5 },
    e: { group: 'dynamics', unit: '—', label: '恢复系数 e', min: 0, max: 1 },
    mu: { group: 'dynamics', unit: '—', label: '切向摩擦 μ', min: 0, max: 1 },
    soft: { group: 'numerics', unit: '—', label: '软化', min: 0, max: 0.05 },
    trailMax: { group: 'numerics', unit: '—', label: '轨迹长', min: 50, max: 2000 },
    x1: { group: 'initial', unit: 'm', label: 'x₁', min: -20, max: 20 },
    y1: { group: 'initial', unit: 'm', label: 'y₁', min: -20, max: 20 },
    vx1: { group: 'initial', unit: 'm/s', label: 'vx₁', min: -50, max: 50 },
    vy1: { group: 'initial', unit: 'm/s', label: 'vy₁', min: -50, max: 50 },
    x2: { group: 'initial', unit: 'm', label: 'x₂', min: -20, max: 20 },
    y2: { group: 'initial', unit: 'm', label: 'y₂', min: -20, max: 20 },
    vx2: { group: 'initial', unit: 'm/s', label: 'vx₂', min: -50, max: 50 },
    vy2: { group: 'initial', unit: 'm/s', label: 'vy₂', min: -50, max: 50 },
  },

  init(state) {
    state.t = 0;
    state.hits = 0;
    state.flash = 0;
    state.a = {
      m: P(state.params, 'm1', 2), r: P(state.params, 'r1', 0.45),
      x: P(state.params, 'x1', -2), y: P(state.params, 'y1', 0),
      vx: P(state.params, 'vx1', 2), vy: P(state.params, 'vy1', 0),
      trail: [],
    };
    state.b = {
      m: P(state.params, 'm2', 1), r: P(state.params, 'r2', 0.35),
      x: P(state.params, 'x2', 1.5), y: P(state.params, 'y2', 0),
      vx: P(state.params, 'vx2', -1), vy: P(state.params, 'vy2', 0),
      trail: [],
    };
    state.nx = 1; state.ny = 0;
  },

  step(state, dt) {
    const bodies = [state.a, state.b];
    for (const p of bodies) {
      p.m = p === state.a ? P(state.params, 'm1', 2) : P(state.params, 'm2', 1);
      p.r = p === state.a ? P(state.params, 'r1', 0.45) : P(state.params, 'r2', 0.35);
      p.x = finiteOr(p.x + p.vx * dt, p.x);
      p.y = finiteOr(p.y + p.vy * dt, p.y);
      // soft walls
      for (const axis of ['x', 'y']) {
        const lim = 4.2;
        if (p[axis] < -lim) { p[axis] = -lim; p[`v${axis}`] *= -0.95; }
        if (p[axis] > lim) { p[axis] = lim; p[`v${axis}`] *= -0.95; }
      }
      p.trail.push({ x: p.x, y: p.y, t: state.t });
      const tmax = Math.floor(P(state.params, 'trailMax', 400));
      if (p.trail.length > tmax) p.trail.shift();
    }

    const a = state.a; const b = state.b;
    const dx = b.x - a.x; const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1e-9;
    const minD = a.r + b.r + P(state.params, 'soft', 0);
    if (dist < minD) {
      const nx = dx / dist; const ny = dy / dist;
      state.nx = nx; state.ny = ny;
      const overlap = minD - dist;
      const inv = 1 / a.m + 1 / b.m;
      a.x -= nx * overlap * (1 / a.m) / inv;
      a.y -= ny * overlap * (1 / a.m) / inv;
      b.x += nx * overlap * (1 / b.m) / inv;
      b.y += ny * overlap * (1 / b.m) / inv;

      const rvx = a.vx - b.vx; const rvy = a.vy - b.vy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        const e = P(state.params, 'e', 0.85);
        const jn = -(1 + e) * vn / inv;
        a.vx += (jn / a.m) * nx; a.vy += (jn / a.m) * ny;
        b.vx -= (jn / b.m) * nx; b.vy -= (jn / b.m) * ny;
        const tx = -ny; const ty = nx;
        const vt = rvx * tx + rvy * ty;
        const mu = P(state.params, 'mu', 0.05);
        const jtMax = Math.abs(jn) * mu;
        let jt = -vt / inv;
        jt = Math.max(-jtMax, Math.min(jtMax, jt));
        a.vx += (jt / a.m) * tx; a.vy += (jt / a.m) * ty;
        b.vx -= (jt / b.m) * tx; b.vy -= (jt / b.m) * ty;
        state.hits += 1;
        state.flash = 0.25;
      }
    }
    if (state.flash > 0) state.flash -= dt;
    state.t += dt;
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const cx = W / 2; const cy = H / 2; const sc = Math.min(W, H) * 0.1;
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(cx - 4.2 * sc, cy - 4.2 * sc, 8.4 * sc, 8.4 * sc);

    const drawBody = (p, color) => {
      if (view.showTrail !== false) {
        ctx.strokeStyle = C.trail;
        ctx.beginPath();
        p.trail.forEach((q, i) => (i ? ctx.lineTo(cx + q.x * sc, cy - q.y * sc) : ctx.moveTo(cx + q.x * sc, cy - q.y * sc)));
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx + p.x * sc, cy - p.y * sc, p.r * sc, 0, Math.PI * 2);
      ctx.fill();
      if (view.showVectors !== false) {
        drawArrow(ctx, cx + p.x * sc, cy - p.y * sc, cx + (p.x + p.vx * 0.35) * sc, cy - (p.y + p.vy * 0.35) * sc, C.vector, 2);
      }
    };
    drawBody(state.a, C.body);
    drawBody(state.b, C.accent);
    if (state.flash > 0) {
      ctx.strokeStyle = C.flash || C.vector;
      ctx.lineWidth = 2;
      const mx = cx + ((state.a.x + state.b.x) / 2) * sc;
      const my = cy - ((state.a.y + state.b.y) / 2) * sc;
      ctx.beginPath();
      ctx.moveTo(mx - state.nx * 30, my + state.ny * 30);
      ctx.lineTo(mx + state.nx * 30, my - state.ny * 30);
      ctx.stroke();
    }
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const ke = 0.5 * state.a.m * (state.a.vx ** 2 + state.a.vy ** 2)
      + 0.5 * state.b.m * (state.b.vx ** 2 + state.b.vy ** 2);
    const px = state.a.m * state.a.vx + state.b.m * state.b.vx;
    const py = state.a.m * state.a.vy + state.b.m * state.b.vy;
    return [
      { label: 't', value: `${formatNum(state.t, d)} s` },
      { label: 'hits', value: String(state.hits) },
      { label: 'KE', value: formatNum(ke, d) },
      { label: 'Px', value: formatNum(px, d) },
      { label: 'Py', value: formatNum(py, d) },
    ];
  },

  getEnergy(state) {
    return {
      kinetic: 0.5 * state.a.m * (state.a.vx ** 2 + state.a.vy ** 2)
        + 0.5 * state.b.m * (state.b.vx ** 2 + state.b.vy ** 2),
      potential: 0,
    };
  },

  getTrajectory(state) {
    return state.a.trail.map((p, i) => ({
      t: p.t, x1: p.x, y1: p.y,
      x2: state.b.trail[i]?.x, y2: state.b.trail[i]?.y,
    }));
  },
};
