import { formatNum } from '../utils/draw.js';
import { C, heatTempColor } from '../utils/theme.js';

/**
 * 一维热传导：∂T/∂t = α ∂²T/∂x²
 * 显式有限差分；两端恒温边界；灰度条 + 曲线。
 */
export default {
  id: 'heat',
  name: '热传导',
  params: {
    N: 80,
    L: 1,
    alpha: 0.02,   // 热扩散率 m²/s
    Tleft: 100,    // 左端温度 °C
    Tright: 20,    // 右端温度 °C
    T0: 20,        // 初始内部温度
    hotspot: 80,   // 中心热斑温度
  },
  paramSchema: {
    N: { group: 'numerics', unit: '', label: '网格点数 N', min: 10, max: 256 },
    L: { group: 'dynamics', unit: 'm', label: '杆长 L', min: 0.1, max: 10 },
    alpha: { group: 'dynamics', unit: 'm²/s', label: '热扩散率 α', min: 0, max: 2 },
    Tleft: { group: 'initial', unit: '°C', label: '左端温度', min: -50, max: 200 },
    Tright: { group: 'initial', unit: '°C', label: '右端温度', min: -50, max: 200 },
    T0: { group: 'initial', unit: '°C', label: '初温 T₀', min: -50, max: 200 },
    hotspot: { group: 'initial', unit: '°C', label: '热斑温度', min: -50, max: 200 },
  },

  init(state) {
    const p = state.params;
    const N = Math.max(10, Math.floor(p.N));
    state.N = N;
    state.dx = p.L / (N - 1);
    state.t = 0;
    state.T = new Float64Array(N);
    for (let i = 0; i < N; i += 1) {
      state.T[i] = p.T0;
    }
    // 中心热斑
    const mid = Math.floor(N / 2);
    const w = Math.max(2, Math.floor(N * 0.08));
    for (let i = mid - w; i <= mid + w; i += 1) {
      if (i > 0 && i < N - 1) state.T[i] = p.hotspot;
    }
    state.T[0] = p.Tleft;
    state.T[N - 1] = p.Tright;
  },

  step(state, dt) {
    const { alpha } = state.params;
    const { N, dx, T } = state;
    // 稳定性：dt ≤ dx²/(2α)
    const dtMax = (dx * dx) / (2 * Math.max(alpha, 1e-9));
    const h = Math.min(dt, dtMax * 0.9);
    const r = (alpha * h) / (dx * dx);
    const next = new Float64Array(N);
    next[0] = state.params.Tleft;
    next[N - 1] = state.params.Tright;
    for (let i = 1; i < N - 1; i += 1) {
      next[i] = T[i] + r * (T[i + 1] - 2 * T[i] + T[i - 1]);
    }
    state.T = next;
    state.t += h;
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const { L } = state.params;
    const { N, T } = state;
    const margin = { l: 50, r: 50, t: 50, b: 70 };
    const tMin = Math.min(state.params.Tright, state.params.T0, 0);
    const tMax = Math.max(state.params.Tleft, state.params.hotspot, 1);

    const barY = margin.t;
    const barH = 36;
    const barW = W - margin.l - margin.r;
    const cellW = barW / (N - 1);

    // 温度条：蓝冷 → 红热
    for (let i = 0; i < N - 1; i += 1) {
      ctx.fillStyle = heatTempColor(T[i], tMin, tMax);
      ctx.fillRect(margin.l + i * cellW, barY, cellW + 1, barH);
    }
    ctx.strokeStyle = C.ground;
    ctx.strokeRect(margin.l, barY, barW, barH);

    // T(x) 曲线
    const plotTop = barY + barH + 30;
    const plotH = H - plotTop - margin.b;
    const X = (i) => margin.l + (i / (N - 1)) * barW;
    const Y = (temp) => plotTop + (1 - (temp - tMin) / (tMax - tMin)) * plotH;

    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(margin.l, plotTop);
    ctx.lineTo(margin.l, plotTop + plotH);
    ctx.lineTo(margin.l + barW, plotTop + plotH);
    ctx.stroke();

    ctx.strokeStyle = C.body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < N; i += 1) {
      const px = X(i);
      const py = Y(T[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // 色标
    const legendY = H - 36;
    for (let i = 0; i < 80; i += 1) {
      const u = i / 79;
      const temp = tMin + u * (tMax - tMin);
      ctx.fillStyle = heatTempColor(temp, tMin, tMax);
      ctx.fillRect(margin.l + i * (barW / 80), legendY, barW / 80 + 1, 12);
    }
    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText(`冷 ${formatNum(tMin, 0)}°C`, margin.l, legendY + 26);
    ctx.fillText(`热 ${formatNum(tMax, 0)}°C`, margin.l + barW - 52, legendY + 26);
    ctx.fillText(`L=${formatNum(L)} m`, margin.l, barY - 8);
  },

  getReadouts(state) {
    let sum = 0;
    let tmax = -Infinity;
    let tmin = Infinity;
    for (let i = 0; i < state.N; i += 1) {
      sum += state.T[i];
      tmax = Math.max(tmax, state.T[i]);
      tmin = Math.min(tmin, state.T[i]);
    }
    return [
      { label: 't', value: `${formatNum(state.t)} s` },
      { label: 'T̄', value: `${formatNum(sum / state.N)} °C` },
      { label: 'Tmin', value: `${formatNum(tmin)} °C` },
      { label: 'Tmax', value: `${formatNum(tmax)} °C` },
    ];
  },

  getEnergy() {
    // 热传导不以动能/势能表示
    return null;
  },

  getTrajectory(state) {
    const rows = [];
    for (let i = 0; i < state.N; i += 1) {
      rows.push({ i, x: i * state.dx, T: state.T[i] });
    }
    return rows;
  },
};
