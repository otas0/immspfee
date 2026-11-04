import { formatNum } from '../utils/draw.js';
import { C } from '../utils/theme.js';

/** 相空间 → 灰度（θ/ω 映射亮度；纯黑白） */
function phaseColor(theta, omega, alpha = 0.85) {
  const u = (Math.sin(theta) * 0.5 + 0.5 + Math.tanh(omega * 0.35) * 0.5) / 1.5;
  const g = Math.round(40 + 200 * Math.max(0, Math.min(1, u)));
  return `rgba(${g},${g},${g},${alpha})`;
}

/**
 * 双摆：拉格朗日方程数值积分（半隐式欧拉）
 * 末端轨迹按 (θ₁, ω₁) 相空间灰度，展示混沌敏感依赖。
 */
export default {
  id: 'double-pendulum',
  name: '双摆',
  params: {
    L1: 1, L2: 1, m1: 1, m2: 1, g: 9.81,
    theta1: 120, // deg
    theta2: -10,
  },
  paramSchema: {
    L1: { group: 'dynamics', unit: 'm', label: 'L1', min: 0.05, max: 10 },
    L2: { group: 'dynamics', unit: 'm', label: 'L2', min: 0.05, max: 10 },
    m1: { group: 'dynamics', unit: 'kg', label: 'm1', min: 0.01, max: 100 },
    m2: { group: 'dynamics', unit: 'kg', label: 'm2', min: 0.01, max: 100 },
    g: { group: 'dynamics', unit: 'm/s²', label: 'g', min: 0, max: 40 },
    theta1: { group: 'initial', unit: '°', label: 'θ1', min: -180, max: 180 },
    theta2: { group: 'initial', unit: '°', label: 'θ2', min: -180, max: 180 },
  },

  init(state) {
    const p = state.params;
    state.t = 0;
    state.th1 = (p.theta1 * Math.PI) / 180;
    state.th2 = (p.theta2 * Math.PI) / 180;
    state.w1 = 0;
    state.w2 = 0;
    state.trail = [];
  },

  step(state, dt) {
    const { L1, L2, m1, m2, g } = state.params;
    let { th1, th2, w1, w2 } = state;

    // 标准双摆角加速度（见经典推导）
    const accel = (th1, th2, w1, w2) => {
      const d = th1 - th2;
      const den = 2 * m1 + m2 - m2 * Math.cos(2 * d);
      const a1 = (
        -g * (2 * m1 + m2) * Math.sin(th1)
        - m2 * g * Math.sin(th1 - 2 * th2)
        - 2 * Math.sin(d) * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(d))
      ) / (L1 * den);
      const a2 = (
        2 * Math.sin(d) * (
          w1 * w1 * L1 * (m1 + m2)
          + g * (m1 + m2) * Math.cos(th1)
          + w2 * w2 * L2 * m2 * Math.cos(d)
        )
      ) / (L2 * den);
      return { a1, a2 };
    };

    const { a1, a2 } = accel(th1, th2, w1, w2);
    w1 += a1 * dt;
    w2 += a2 * dt;
    th1 += w1 * dt;
    th2 += w2 * dt;

    state.th1 = th1;
    state.th2 = th2;
    state.w1 = w1;
    state.w2 = w2;
    state.t += dt;

    const x2 = L1 * Math.sin(th1) + L2 * Math.sin(th2);
    const y2 = -L1 * Math.cos(th1) - L2 * Math.cos(th2);
    state.trail.push({ x: x2, y: y2, th1, w1 });
    if (state.trail.length > 1200) state.trail.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const { L1, L2 } = state.params;
    const pivot = { x: W * 0.5, y: H * 0.2 };
    const scale = Math.min(W, H) * 0.28 / Math.max(L1 + L2, 0.5);
    const toS = (x, y) => ({ x: pivot.x + x * scale, y: pivot.y - y * scale });

    // 相空间灰度轨迹
    for (let i = 1; i < state.trail.length; i += 1) {
      const a = state.trail[i - 1];
      const b = state.trail[i];
      const sa = toS(a.x, a.y);
      const sb = toS(b.x, b.y);
      ctx.strokeStyle = phaseColor(b.th1, b.w1, 0.55);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.stroke();
    }

    const x1 = L1 * Math.sin(state.th1);
    const y1 = -L1 * Math.cos(state.th1);
    const x2 = x1 + L2 * Math.sin(state.th2);
    const y2 = y1 - L2 * Math.cos(state.th2);
    const p1 = toS(x1, y1);
    const p2 = toS(x2, y2);

    ctx.strokeStyle = C.vector;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pivot.x, pivot.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    ctx.fillStyle = C.muted;
    ctx.beginPath();
    ctx.arc(pivot.x, pivot.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.body;
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText('轨迹灰度∝θ₁,ω₁', 12, H - 14);
  },

  getReadouts(state) {
    return [
      { label: 't', value: `${formatNum(state.t)} s` },
      { label: 'θ₁', value: `${formatNum((state.th1 * 180) / Math.PI)}°` },
      { label: 'θ₂', value: `${formatNum((state.th2 * 180) / Math.PI)}°` },
      { label: 'ω₁', value: `${formatNum(state.w1)} rad/s` },
    ];
  },

  getEnergy(state) {
    const { L1, L2, m1, m2, g } = state.params;
    const { th1, th2, w1, w2 } = state;
    const v1sq = (L1 * w1) ** 2;
    const v2sq = (L1 * w1) ** 2 + (L2 * w2) ** 2
      + 2 * L1 * L2 * w1 * w2 * Math.cos(th1 - th2);
    const ke = 0.5 * m1 * v1sq + 0.5 * m2 * v2sq;
    const pe = -(m1 + m2) * g * L1 * Math.cos(th1) - m2 * g * L2 * Math.cos(th2);
    // 平移势能使最低附近为正，便于能量条显示
    const peShift = (m1 + m2) * g * L1 + m2 * g * L2;
    return { kinetic: ke, potential: pe + peShift };
  },

  getTrajectory(state) {
    return state.trail.map((p, i) => ({
      i, t: i, x: p.x, y: p.y, theta1: p.th1, omega1: p.w1,
    }));
  },
};
