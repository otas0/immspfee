import { drawArrow, formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

export default {
  id: 'collision',
  name: '一维碰撞',
  params: {
    m1: 2, m2: 1, v1: 3, v2: -1, e: 1,
  },
  paramSchema: {
    m1: { group: 'dynamics', unit: 'kg', label: 'm1', min: 0.01, max: 100 },
    m2: { group: 'dynamics', unit: 'kg', label: 'm2', min: 0.01, max: 100 },
    v1: { group: 'initial', unit: 'm/s', label: 'v1', min: -50, max: 50 },
    v2: { group: 'initial', unit: 'm/s', label: 'v2', min: -50, max: 50 },
    e: { group: 'dynamics', unit: '—', label: 'e', min: 0, max: 1 },
  },

  init(state) {
    const p = state.params;
    state.t = 0;
    state.x1 = -2;
    state.x2 = 2;
    state.v1 = P(p, 'v1', 0);
    state.v2 = P(p, 'v2', 0);
    state.contact = false;
    state.flash = 0;
    state.collisionCount = 0;
    state.keBefore = null;
    state.keAfter = null;
    state.collisionLog = [];
  },

  step(state, dt) {
    const m1 = Math.max(P(state.params, 'm1', 1), 1e-9);
    const m2 = Math.max(P(state.params, 'm2', 1), 1e-9);
    const e = P(state.params, 'e', 1);
    const r1 = 0.35;
    const r2 = 0.28;

    state.x1 = finiteOr(state.x1 + state.v1 * dt, state.x1);
    state.x2 = finiteOr(state.x2 + state.v2 * dt, state.x2);
    state.t += dt;

    const dist = state.x2 - state.x1;
    const minDist = r1 + r2;
    if (!state.contact && dist <= minDist && state.v1 > state.v2) {
      const ke0 = 0.5 * m1 * state.v1 ** 2 + 0.5 * m2 * state.v2 ** 2;
      const u1 = state.v1;
      const u2 = state.v2;
      state.v1 = ((m1 - e * m2) * u1 + (1 + e) * m2 * u2) / (m1 + m2);
      state.v2 = ((m2 - e * m1) * u2 + (1 + e) * m1 * u1) / (m1 + m2);
      state.v1 = finiteOr(state.v1, 0);
      state.v2 = finiteOr(state.v2, 0);
      const overlap = minDist - dist;
      state.x1 -= overlap / 2;
      state.x2 += overlap / 2;
      const ke1 = 0.5 * m1 * state.v1 ** 2 + 0.5 * m2 * state.v2 ** 2;
      state.keBefore = ke0;
      state.keAfter = ke1;
      state.contact = true;
      state.flash = 0.3;
      state.collisionCount += 1;
      state.collisionLog.push({
        n: state.collisionCount, t: state.t, keBefore: ke0, keAfter: ke1, v1: state.v1, v2: state.v2,
      });
    } else if (dist > minDist + 0.02) {
      state.contact = false;
    }

    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);

    const bound = 6;
    if (state.x1 < -bound) { state.x1 = -bound; state.v1 = Math.abs(state.v1); state.contact = false; }
    if (state.x1 > bound) { state.x1 = bound; state.v1 = -Math.abs(state.v1); state.contact = false; }
    if (state.x2 < -bound) { state.x2 = -bound; state.v2 = Math.abs(state.v2); state.contact = false; }
    if (state.x2 > bound) { state.x2 = bound; state.v2 = -Math.abs(state.v2); state.contact = false; }

  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const y = H * 0.55;
    const scale = Math.min(W * 0.08, 55);
    const ox = W / 2;
    const X = (x) => ox + x * scale;
    const r1 = 0.35 * scale;
    const r2 = 0.28 * scale;

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, y + Math.max(r1, r2) + 4);
    ctx.lineTo(W - 40, y + Math.max(r1, r2) + 4);
    ctx.stroke();

    if (state.flash > 0) {
      const alpha = state.flash / 0.3;
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.35})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(X((state.x1 + state.x2) / 2), y, 18 + (1 - alpha) * 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    // m1：实心亮；m2：深灰填充 + 白线框，避免两球糊成一团
    ctx.fillStyle = C.vector;
    ctx.beginPath();
    ctx.arc(X(state.x1), y, r1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.body2;
    ctx.beginPath();
    ctx.arc(X(state.x2), y, r2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(state.x2), y, r2, 0, Math.PI * 2);
    ctx.stroke();

    if (view.showVectors !== false) {
      drawArrow(ctx, X(state.x1), y, X(state.x1) + state.v1 * 18, y, C.vector, 2);
      drawArrow(ctx, X(state.x2), y, X(state.x2) + state.v2 * 18, y, C.body2, 2);
    }

    ctx.fillStyle = C.muted;
    ctx.font = '12px IBM Plex Mono, monospace';
    ctx.fillText(`hits ${state.collisionCount}`, 16, 24);
    if (state.keBefore != null) {
      ctx.fillText(`KE ${formatNum(state.keBefore)} → ${formatNum(state.keAfter)}`, 16, 42);
    }
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const m1 = P(state.params, 'm1', 1);
    const m2 = P(state.params, 'm2', 1);
    const mom = m1 * state.v1 + m2 * state.v2;
    const ke = 0.5 * m1 * state.v1 ** 2 + 0.5 * m2 * state.v2 ** 2;
    return [
      { label: 'v1', value: `${formatNum(state.v1, d)} m/s` },
      { label: 'v2', value: `${formatNum(state.v2, d)} m/s` },
      { label: '动量', value: `${formatNum(mom, d)}` },
      { label: '动能', value: `${formatNum(ke, d)} J` },
      { label: '碰撞', value: `${state.collisionCount}` },
    ];
  },

  getEnergy(state) {
    const m1 = P(state.params, 'm1', 1);
    const m2 = P(state.params, 'm2', 1);
    return { kinetic: 0.5 * m1 * state.v1 ** 2 + 0.5 * m2 * state.v2 ** 2, potential: 0 };
  },

  getTrajectory(state) {
    return state.collisionLog.length ? state.collisionLog : [{ t: state.t, v1: state.v1, v2: state.v2 }];
  },
};
