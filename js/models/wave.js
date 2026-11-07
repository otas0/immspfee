import { formatNum } from '../utils/draw.js';
import { C } from '../utils/theme.js';

/**
 * Transverse wave on a fixed string (Pain, Vibrations and Waves).
 * ÿᵢ = c² (yᵢ₊₁ − 2yᵢ + yᵢ₋₁)/dx² − d ẏᵢ, dx = L/(N+1).
 * L is live: refresh must recompute dx or the discrete Laplacian stays on the old length.
 */
export default {
  id: 'wave',
  name: '横波 / 弦振动',
  params: {
    N: 48,       // 内部质点数
    L: 1,        // 弦长 m
    c: 2,        // 波速 m/s
    damp: 0.05,  // 阻尼
    A1: 0.12,    // 1 阶驻波振幅
    A2: 0.06,
    A3: 0.03,
  },
  paramSchema: {
    N: { group: 'numerics', unit: '', label: '质点数 N', min: 8, max: 256 },
    L: { group: 'dynamics', unit: 'm', label: '弦长 L', min: 0.1, max: 10 },
    c: { group: 'dynamics', unit: 'm/s', label: '波速 c', min: 0.1, max: 20 },
    damp: { group: 'dynamics', unit: '1/s', label: '阻尼', min: 0, max: 5 },
    A1: { group: 'initial', unit: 'm', label: '一阶振幅', min: 0, max: 2 },
    A2: { group: 'initial', unit: 'm', label: '二阶振幅', min: 0, max: 2 },
    A3: { group: 'initial', unit: 'm', label: '三阶振幅', min: 0, max: 2 },
  },

  init(state) {
    const p = state.params;
    const N = Math.max(8, Math.floor(p.N));
    const dx = p.L / (N + 1);
    state.N = N;
    state.dx = dx;
    state.t = 0;
    state.y = new Float64Array(N + 2); // 含两端边界
    state.v = new Float64Array(N + 2);
    for (let i = 1; i <= N; i += 1) {
      const x = i * dx;
      // 驻波模式叠加
      state.y[i] = p.A1 * Math.sin((1 * Math.PI * x) / p.L)
        + p.A2 * Math.sin((2 * Math.PI * x) / p.L)
        + p.A3 * Math.sin((3 * Math.PI * x) / p.L);
    }
    state.y[0] = 0;
    state.y[N + 1] = 0;
  },

  /** Keep the samples; only the physical spacing follows L. */
  refresh(state) {
    const p = state.params || {};
    const N = state.N || Math.max(8, Math.floor(Number(p.N) || 8));
    const L = Math.max(Number(p.L) || 0.1, 1e-6);
    state.dx = L / (N + 1);
  },

  step(state, dt) {
    const { c, damp } = state.params;
    const { N, dx, y, v } = state;
    const c2 = c * c;
    const inv = 1 / (dx * dx);
    // 半隐式：先加速度再速度再位移；两端固定
    for (let i = 1; i <= N; i += 1) {
      const a = c2 * (y[i + 1] - 2 * y[i] + y[i - 1]) * inv - damp * v[i];
      v[i] += a * dt;
    }
    for (let i = 1; i <= N; i += 1) {
      y[i] += v[i] * dt;
    }
    y[0] = 0;
    y[N + 1] = 0;
    v[0] = 0;
    v[N + 1] = 0;
    state.t += dt;
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const { L, A1, A2, A3 } = state.params;
    const { N, dx, y } = state;
    const margin = { l: 40, r: 40, t: 40, b: 40 };
    const amp = Math.max(0.05, Math.abs(A1) + Math.abs(A2) + Math.abs(A3)) * 1.4;
    const sx = (W - margin.l - margin.r) / L;
    const sy = (H - margin.t - margin.b) / (2 * amp);
    const ox = margin.l;
    const oy = H / 2;
    const X = (x) => ox + x * sx;
    const Y = (yy) => oy - yy * sy;

    // 平衡线
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(W - margin.r, oy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = C.theory;
    ctx.beginPath();
    for (let i = 0; i <= N + 1; i += 1) {
      const x = i * dx;
      const yy = A1 * Math.sin((Math.PI * x) / L)
        + A2 * Math.sin((2 * Math.PI * x) / L)
        + A3 * Math.sin((3 * Math.PI * x) / L);
      const px = X(x);
      const py = Y(yy);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 正位移暖色 / 负位移冷色填充
    const pos = C.pos || 'rgba(251, 113, 133, 0.28)';
    const neg = C.neg || 'rgba(56, 189, 248, 0.28)';
    for (let i = 0; i < N + 1; i += 1) {
      const x0 = X(i * dx);
      const x1 = X((i + 1) * dx);
      const y0 = y[i];
      const y1 = y[i + 1];
      const mid = (y0 + y1) / 2;
      ctx.fillStyle = mid >= 0 ? pos : neg;
      ctx.beginPath();
      ctx.moveTo(x0, oy);
      ctx.lineTo(x0, Y(y0));
      ctx.lineTo(x1, Y(y1));
      ctx.lineTo(x1, oy);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = C.body;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= N + 1; i += 1) {
      const px = X(i * dx);
      const py = Y(y[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    for (let i = 1; i <= N; i += 1) {
      ctx.fillStyle = y[i] >= 0 ? (C.accent || C.vector) : C.vector;
      ctx.beginPath();
      ctx.arc(X(i * dx), Y(y[i]), 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = C.ground;
    ctx.fillRect(X(0) - 6, oy - 18, 12, 36);
    ctx.fillRect(X(L) - 6, oy - 18, 12, 36);

    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText('虚线=初始模态叠加形状', 12, 20);
  },

  getReadouts(state) {
    let eMax = 0;
    for (let i = 1; i <= state.N; i += 1) {
      eMax = Math.max(eMax, Math.abs(state.y[i]));
    }
    return [
      { label: 't', value: `${formatNum(state.t)} s` },
      { label: 'N', value: `${state.N}` },
      { label: '|y|max', value: `${formatNum(eMax)} m` },
      { label: 'c', value: `${formatNum(state.params.c)} m/s` },
    ];
  },

  getEnergy(state) {
    const { c, damp } = state.params;
    const μ = 1; // 线密度归一
    const kEff = μ * (c * c) / (state.dx * state.dx);
    let ke = 0;
    let pe = 0;
    for (let i = 1; i <= state.N; i += 1) {
      ke += 0.5 * μ * state.dx * state.v[i] * state.v[i];
      const dy = state.y[i] - state.y[i - 1];
      pe += 0.5 * kEff * state.dx * dy * dy;
    }
    void damp;
    return { kinetic: ke, potential: pe };
  },

  getTrajectory(state) {
    const rows = [];
    for (let i = 0; i <= state.N + 1; i += 1) {
      rows.push({ i, x: i * state.dx, y: state.y[i], v: state.v[i] });
    }
    return rows;
  },
};
