import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

/**
 * PID 交互整定：二阶对象 + 阶跃指标（超调 OS%、调节时间 ts、IAE）。
 */
export default {
  id: 'pid-tune',
  name: 'PID 参数整定（交互）',
  params: {
    K: 1, zeta: 0.35, wn: 2.2,
    Kp: 1.4, Ki: 0.55, Kd: 0.12,
    speed: 1, tol: 0.02,
  },
  paramSchema: {
    K: { group: 'dynamics', unit: '—', label: 'K', min: 0.1, max: 10 },
    zeta: { group: 'dynamics', unit: '—', label: 'ζ', min: 0.05, max: 2 },
    wn: { group: 'dynamics', unit: 'rad/s', label: 'ωₙ', min: 0.2, max: 20 },
    Kp: { group: 'dynamics', unit: '—', label: 'Kp', min: 0, max: 20 },
    Ki: { group: 'dynamics', unit: '—', label: 'Ki', min: 0, max: 20 },
    Kd: { group: 'dynamics', unit: '—', label: 'Kd', min: 0, max: 5 },
    speed: { group: 'dynamics', unit: '—', label: '动画速', min: 0.2, max: 4 },
    tol: { group: 'numerics', unit: '—', label: 'ts 容差带', min: 0.005, max: 0.1 },
  },

  init(state) {
    state.t = 0;
    state.y = 0;
    state.v = 0;
    state.ie = 0;
    state.hist = [];
    state.ref = 1;
    state.peak = 0;
    state.overshoot = 0;
    state.iae = 0;
    state.ts = -1; // -1 = 未进入容差带（避免 NaN 触发全局非有限检测）
    state.settled = false;
    state.lastOut = false;
  },

  step(state, dt) {
    const s = Math.max(0.05, P(state.params, 'speed', 1));
    const h = dt * s;
    const zeta = P(state.params, 'zeta', 0.35);
    const wn = P(state.params, 'wn', 2.2);
    const K = P(state.params, 'K', 1);
    const e = state.ref - state.y;
    state.ie += e * h;
    const u = P(state.params, 'Kp', 1.4) * e
      + P(state.params, 'Ki', 0.55) * state.ie
      - P(state.params, 'Kd', 0.12) * state.v;
    const drive = K * (state.ref + 0.4 * u);
    const a = drive * wn * wn - 2 * zeta * wn * state.v - wn * wn * state.y;
    state.v += a * h;
    state.y += state.v * h;
    state.t += h;
    state.iae += Math.abs(e) * h;
    state.peak = Math.max(state.peak, state.y);
    state.overshoot = Math.max(0, state.peak - state.ref);

    const tol = P(state.params, 'tol', 0.02);
    const inside = Math.abs(e) <= tol * Math.max(Math.abs(state.ref), 1e-6);
    if (!inside) {
      state.lastOut = true;
      state.settled = false;
      state.ts = -1;
    } else if (state.lastOut || !state.settled) {
      // 进入容差带后记 ts（首次持续进入）
      if (!state.settled) {
        state.ts = state.t;
        state.settled = true;
      }
      state.lastOut = false;
    }

    state.hist.push({ t: state.t, y: state.y, e });
    if (state.hist.length > 260) state.hist.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 40;
    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText('PID tune · step metrics OS / ts / IAE', 12, 18);

    const mid = H * 0.55;
    const yScale = 48;
    ctx.strokeStyle = C.axis;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad, mid - state.ref * yScale);
    ctx.lineTo(W - pad, mid - state.ref * yScale);
    ctx.stroke();
    const tol = P(state.params, 'tol', 0.02);
    ctx.beginPath();
    ctx.moveTo(pad, mid - (state.ref * (1 + tol)) * yScale);
    ctx.lineTo(W - pad, mid - (state.ref * (1 + tol)) * yScale);
    ctx.moveTo(pad, mid - (state.ref * (1 - tol)) * yScale);
    ctx.lineTo(W - pad, mid - (state.ref * (1 - tol)) * yScale);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = C.body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    state.hist.forEach((p, i) => {
      const x = pad + (i / 260) * (W - 2 * pad);
      const y = mid - p.y * yScale;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = C.accent;
    ctx.font = '12px IBM Plex Mono, monospace';
    const osPct = (state.overshoot / Math.max(Math.abs(state.ref), 1e-9)) * 100;
    ctx.fillText(
      `OS=${formatNum(osPct, 1)}%  ts=${state.ts >= 0 ? formatNum(state.ts, 2) : '—'}  IAE=${formatNum(state.iae, 2)}`,
      pad,
      H - 18,
    );
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const osPct = (state.overshoot / Math.max(Math.abs(state.ref), 1e-9)) * 100;
    return [
      { label: 'y', value: formatNum(state.y, d) },
      { label: 'OS%', value: formatNum(osPct, d) },
      { label: 'ts', value: state.ts >= 0 ? `${formatNum(state.ts, d)} s` : '—' },
      { label: 'IAE', value: formatNum(state.iae, d) },
      { label: 't', value: `${formatNum(state.t, d)} s` },
    ];
  },

  getTrajectory(state) {
    return state.hist;
  },
};
