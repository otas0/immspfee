import { drawArrow, formatNum } from '../utils/draw.js';
import { P, accelExtras, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** 斜面滑动物块：a = g(sinθ − μ_k sgn(v) cosθ) − 阻尼；可自定义 a_extra / expr_a */
export default {
  id: 'inclined-plane',
  name: '斜面滑动物块',
  capabilities: {
    pointer: true,
    interaction: 'canvas',
    formalism: 'ode',
    viz: 'phet-particle',
    fidelity: 'principle',
    hint: '拖动物块改 s；拖斜面端点改 θ（类 PhET 约束点）',
  },
  params: {
    g: 9.81, theta: 30, mu_s: 0.35, mu_k: 0.22, m: 1.2,
    s0: 0.2, v0: 0, c: 0, length: 8, e: 0.3,
  },
  paramSchema: {
    g: { group: 'dynamics', unit: 'm/s²', label: 'g', min: 0, max: 80 },
    theta: { group: 'dynamics', unit: '°', label: '斜面角 θ', min: 0, max: 89 },
    mu_s: { group: 'dynamics', unit: '—', label: '静摩擦 μ_s', min: 0, max: 2 },
    mu_k: { group: 'dynamics', unit: '—', label: '动摩擦 μ_k', min: 0, max: 2 },
    m: { group: 'dynamics', unit: 'kg', label: 'm', min: 0.001, max: 1e4 },
    c: { group: 'dynamics', unit: 'N·s/m', label: '粘滞 c', min: 0, max: 200 },
    length: { group: 'dynamics', unit: 'm', label: '斜面长', min: 0.5, max: 50 },
    e: { group: 'dynamics', unit: '—', label: '底端 e', min: 0, max: 1 },
    s0: { group: 'initial', unit: 'm', label: 's₀', min: 0, max: 50 },
    v0: { group: 'initial', unit: 'm/s', label: 'v₀', min: -40, max: 40 },
  },

  init(state) {
    const L = Math.max(P(state.params, 'length', 8), 0.1);
    state.t = 0;
    state.s = Math.max(0, Math.min(L, P(state.params, 's0', 0)));
    state.v = P(state.params, 'v0', 0);
    state.a = 0;
    state.stuck = false;
    state.trail = [];
    state.N = 0;
    state.Ff = 0;
  },

  step(state, dt) {
    const g = P(state.params, 'g', 9.81);
    const th = (P(state.params, 'theta', 30) * Math.PI) / 180;
    const muS = P(state.params, 'mu_s', 0.35);
    const muK = P(state.params, 'mu_k', 0.22);
    const m = Math.max(P(state.params, 'm', 1), 1e-9);
    const c = P(state.params, 'c', 0);
    const L = Math.max(P(state.params, 'length', 8), 0.1);
    const e = P(state.params, 'e', 0.3);
    const N = m * g * Math.cos(th);
    state.N = N;
    const drive = m * g * Math.sin(th);
    const locals = { s: state.s, v: state.v, t: state.t, g, m, theta: th };

    if (Math.abs(state.v) < 1e-3) {
      const maxStatic = muS * N;
      if (Math.abs(drive) <= maxStatic + 1e-9) {
        state.v = 0;
        state.a = 0;
        state.Ff = drive;
        state.stuck = true;
        state.t += dt;
        return;
      }
      state.stuck = false;
      state.v = Math.sign(drive) * 1e-4;
    } else {
      state.stuck = false;
    }

    const ff = -Math.sign(state.v) * muK * N;
    state.Ff = ff;
    let a = (drive + ff - c * state.v) / m + accelExtras(state.params, locals);
    state.v = finiteOr(state.v + a * dt, 0);
    state.s = finiteOr(state.s + state.v * dt, state.s);
    state.a = a;
    state.t += dt;

    if (state.s < 0) {
      state.s = 0;
      state.v = -e * state.v;
    }
    if (state.s > L) {
      state.s = L;
      state.v = -e * state.v;
    }
    state.trail.push({ t: state.t, s: state.s, v: state.v });
    if (state.trail.length > 500) state.trail.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const th = (P(state.params, 'theta', 30) * Math.PI) / 180;
    const L = Math.max(P(state.params, 'length', 8), 0.1);
    const margin = 48;
    const x0 = margin;
    const y0 = H - margin;
    const pix = Math.min((W - margin * 2) / (L * Math.cos(th) + 0.01), (H - margin * 2) / (L * Math.sin(th) + 0.01));
    const x1 = x0 + L * Math.cos(th) * pix;
    const y1 = y0 - L * Math.sin(th) * pix;
    state._plane = { x0, y0, x1, y1, pix, L, th, W, H };

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1, y0);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(148,163,184,0.12)';
    ctx.fill();

    const u = state.s / L;
    const bx = x0 + u * (x1 - x0);
    const by = y0 + u * (y1 - y0);
    const nx = -Math.sin(th);
    const ny = -Math.cos(th);
    state._block = { x: bx + nx * 14, y: by + ny * 14, r: 22 };
    // 可拖约束点：斜面顶端（改 θ）
    ctx.fillStyle = C.vector;
    ctx.beginPath();
    ctx.arc(x1, y1, 7, 0, Math.PI * 2);
    ctx.fill();
    state._hinge = { x: x1, y: y1, r: 12 };
    ctx.fillStyle = C.body;
    ctx.save();
    ctx.translate(bx + nx * 14, by + ny * 14);
    ctx.rotate(-th);
    ctx.fillRect(-16, -12, 32, 24);
    if (state._drag === 'block') {
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(-18, -14, 36, 28);
    }
    ctx.restore();

    if (view.showVectors !== false) {
      const scale = 8;
      drawArrow(ctx, bx, by, bx + Math.cos(th) * state.v * scale, by - Math.sin(th) * state.v * scale, C.vector, 2);
      drawArrow(ctx, bx, by, bx + nx * 28, by + ny * 28, C.accent, 2);
      const tx = Math.cos(th);
      const ty = -Math.sin(th);
      drawArrow(ctx, bx, by, bx + tx * (state.Ff / Math.max(P(state.params, 'm', 1), 1e-6)) * 4, by + ty * (state.Ff / Math.max(P(state.params, 'm', 1), 1e-6)) * 4, C.body2 || C.theory, 2);
    }

    if (view.showTrail !== false) {
      ctx.fillStyle = C.trail;
      for (let i = 0; i < state.trail.length; i += 4) {
        const p = state.trail[i];
        const uu = p.s / L;
        ctx.beginPath();
        ctx.arc(x0 + uu * (x1 - x0), y0 + uu * (y1 - y0), 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText(`θ=${formatNum((th * 180) / Math.PI, 1)}°  ${state.stuck ? 'static' : 'sliding'}`, margin, 22);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: 't', value: `${formatNum(state.t, d)} s` },
      { label: 's', value: `${formatNum(state.s, d)} m` },
      { label: 'v', value: `${formatNum(state.v, d)} m/s` },
      { label: 'a', value: `${formatNum(state.a, d)} m/s²` },
      { label: 'N', value: `${formatNum(state.N, d)} N` },
      { label: 'Ff', value: `${formatNum(state.Ff, d)} N` },
    ];
  },

  getEnergy(state) {
    const m = P(state.params, 'm', 1);
    const g = P(state.params, 'g', 9.81);
    const th = (P(state.params, 'theta', 30) * Math.PI) / 180;
    const h = state.s * Math.sin(th);
    return { kinetic: 0.5 * m * state.v * state.v, potential: m * g * h };
  },

  getTrajectory(state) {
    return state.trail;
  },

  onPointer(state, ev) {
    if (!state._plane) return false;
    const { x0, y0, L } = state._plane;
    if (ev.type === 'down') {
      const h = state._hinge;
      if (h && (ev.x - h.x) ** 2 + (ev.y - h.y) ** 2 <= h.r * h.r) {
        state._drag = 'hinge';
        return true;
      }
      const b = state._block;
      if (b && (ev.x - b.x) ** 2 + (ev.y - b.y) ** 2 <= b.r * b.r) {
        state._drag = 'block';
        return true;
      }
      return false;
    }
    if (ev.type === 'move' && state._drag === 'hinge') {
      const dx = ev.x - x0;
      const dy = y0 - ev.y;
      let deg = (Math.atan2(dy, Math.max(dx, 1e-6)) * 180) / Math.PI;
      deg = Math.max(1, Math.min(85, deg));
      state.params.theta = deg;
      state.stuck = false;
      return true;
    }
    if (ev.type === 'move' && state._drag === 'block') {
      const th = (P(state.params, 'theta', 30) * Math.PI) / 180;
      const pix = state._plane.pix;
      const along = (ev.x - x0) * Math.cos(th) + (y0 - ev.y) * Math.sin(th);
      state.s = Math.max(0, Math.min(L, along / Math.max(pix, 1e-6)));
      state.params.s0 = state.s;
      state.v = 0;
      state.stuck = false;
      return true;
    }
    if (ev.type === 'up') {
      state._drag = null;
      return true;
    }
    return false;
  },
};
