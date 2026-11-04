import { drawArrow, formatNum } from '../utils/draw.js';
import { P, accelExtras, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

export default {
  id: 'projectile',
  name: '斜抛运动',
  capabilities: {
    pointer: true,
    interaction: 'canvas',
    formalism: 'ode',
    viz: 'phet-particle',
    fidelity: 'principle',
    hint: '拖球放置；拖尖端改 v₀/θ；工具条「再发射」',
    actions: [
      { id: 'launch', label: '再发射', resume: true },
    ],
  },
  params: {
    v0: 20, theta: 45, g: 9.81, k: 0, m: 1, dragExp: 1,
    windX: 0, windY: 0, showTheory: true, resumeOnLaunch: 1, pauseOnLand: 1,
  },
  paramSchema: {
    v0: { group: 'initial', unit: 'm/s', label: 'v₀', min: 0, max: 500 },
    theta: { group: 'initial', unit: '°', label: 'θ', min: 0, max: 90 },
    g: { group: 'dynamics', unit: 'm/s²', label: 'g', min: 0, max: 200 },
    k: { group: 'dynamics', unit: 'kg/s', label: '阻力 k', min: 0, max: 5000 },
    m: { group: 'dynamics', unit: 'kg', label: 'm', min: 1e-6, max: 1e6 },
    dragExp: { group: 'dynamics', unit: '—', label: '阻力指数', min: 0.5, max: 3 },
    windX: { group: 'dynamics', unit: 'm/s²', label: '风场 ax', min: -50, max: 50 },
    windY: { group: 'dynamics', unit: 'm/s²', label: '风场 ay', min: -50, max: 50 },
    showTheory: { group: 'display', label: '理论抛物线' },
    resumeOnLaunch: {
      group: 'display', unit: '—', label: '再发射后继续', min: 0, max: 1,
      options: [
        { value: 1, label: '取消暂停' },
        { value: 0, label: '保持暂停' },
      ],
    },
    pauseOnLand: {
      group: 'display', unit: '—', label: '落地后暂停', min: 0, max: 1,
      options: [
        { value: 1, label: '自动暂停' },
        { value: 0, label: '继续走表' },
      ],
    },
  },

  runAction(state, actionId) {
    if (actionId !== 'launch') return false;
    const th = (P(state.params, 'theta', 45) * Math.PI) / 180;
    const v0 = P(state.params, 'v0', 20);
    // 从当前放置点按 v₀/θ 再发射
    state.vx = v0 * Math.cos(th);
    state.vy = v0 * Math.sin(th);
    state.t = 0;
    state.landed = false;
    state.range = 0;
    state.maxY = Math.max(0, state.y);
    state.trail = [{ t: 0, x: state.x, y: state.y }];
    state._resumeApp = Math.round(P(state.params, 'resumeOnLaunch', 1)) === 1;
    return true;
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
    const exp = Math.max(P(state.params, 'dragExp', 1), 0.5);
    const windX = P(state.params, 'windX', 0);
    const windY = P(state.params, 'windY', 0);
    const locals = { x: state.x, y: state.y, vx: state.vx, vy: state.vy, t: state.t, g, k, m };
    const speed = Math.hypot(state.vx, state.vy);
    const dragMag = k === 0 ? 0 : (k / m) * (speed ** (exp - 1));
    const ax = -dragMag * state.vx + windX + accelExtras(state.params, { ...locals, axis: 0 });
    const ay = -g - dragMag * state.vy + windY + accelExtras(state.params, locals);
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
      // 与 resumeOnLaunch 成对：落地可选请求暂停全局时钟
      if (Math.round(P(state.params, 'pauseOnLand', 1)) === 1) {
        state._pauseApp = true;
      }
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
    const tipScale = 2.2;
    const tipX = X(0) + (state.landed || state.t < 0.02
      ? v0 * Math.cos(th) * tipScale * sx
      : state.vx * tipScale * sx);
    const tipY = Y(0) - (state.landed || state.t < 0.02
      ? v0 * Math.sin(th) * tipScale * sy
      : state.vy * tipScale * sy);
    // 发射端速度尖端（可拖）
    const originX = X(state.t < 0.05 ? 0 : state.x);
    const originY = Y(state.t < 0.05 ? 0 : state.y);
    const launchTipX = state.t < 0.05 ? tipX : bx + state.vx * tipScale * sx;
    const launchTipY = state.t < 0.05 ? tipY : by - state.vy * tipScale * sy;
    state._proj = {
      X, Y, sx, sy, ox, oy, tipScale,
      ball: { x: bx, y: by, r: 14 },
      tip: { x: launchTipX, y: launchTipY, r: 12 },
      origin: { x: state.t < 0.05 ? ox : bx, y: state.t < 0.05 ? oy : by },
    };
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(state._proj.origin.x, state._proj.origin.y);
    ctx.lineTo(launchTipX, launchTipY);
    ctx.stroke();
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(launchTipX, launchTipY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = C.body;
    ctx.beginPath();
    ctx.arc(bx, by, 10, 0, Math.PI * 2);
    ctx.fill();
    if (state._drag === 'ball' || state._drag === 'tip') {
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (view.showVectors !== false) {
      const vs = 3;
      drawArrow(ctx, bx, by, bx + state.vx * vs, by, C.vector, 2);
      drawArrow(ctx, bx, by, bx, by - state.vy * vs, C.accent, 2);
      drawArrow(ctx, bx, by, bx + state.vx * vs, by - state.vy * vs, C.body, 2);
    }
  },

  onPointer(state, ev) {
    const g = state._proj;
    if (!g) return false;
    if (ev.type === 'down') {
      const tip = g.tip;
      if ((ev.x - tip.x) ** 2 + (ev.y - tip.y) ** 2 <= tip.r * tip.r) {
        state._drag = 'tip';
        return true;
      }
      const b = g.ball;
      if ((ev.x - b.x) ** 2 + (ev.y - b.y) ** 2 <= b.r * b.r) {
        state._drag = 'ball';
        return true;
      }
      return false;
    }
    if (ev.type === 'move' && state._drag === 'tip') {
      const ox = g.origin.x;
      const oy = g.origin.y;
      const dx = (ev.x - ox) / Math.max(g.sx * g.tipScale, 1e-6);
      const dy = (oy - ev.y) / Math.max(g.sy * g.tipScale, 1e-6);
      const speed = Math.hypot(dx, dy);
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      state.params.v0 = Math.max(0.5, Math.min(200, speed));
      state.params.theta = Math.max(0, Math.min(89, ang));
      if (state.t < 0.05 || state.landed) {
        const th = (state.params.theta * Math.PI) / 180;
        state.vx = state.params.v0 * Math.cos(th);
        state.vy = state.params.v0 * Math.sin(th);
        if (state.landed) {
          state.x = 0; state.y = 0; state.t = 0; state.landed = false;
          state.trail = [{ t: 0, x: 0, y: 0 }];
          state.maxY = 0;
        }
      }
      return true;
    }
    if (ev.type === 'move' && state._drag === 'ball') {
      const x = Math.max(0, (ev.x - g.ox) / Math.max(g.sx, 1e-6));
      const y = Math.max(0, (g.oy - ev.y) / Math.max(g.sy, 1e-6));
      state.x = x;
      state.y = y;
      state.vx = 0;
      state.vy = 0;
      state.landed = false;
      state.t = 0;
      state.trail = [{ t: 0, x, y }];
      state.maxY = y;
      return true;
    }
    if (ev.type === 'up') {
      state._drag = null;
      return true;
    }
    return false;
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
