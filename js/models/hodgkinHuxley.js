import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

/**
 * Hodgkin–Huxley 动作电位（简化经典参数，示教用）。
 */
const GNa = 120;
const GK = 36;
const GL = 0.3;
const ENa = 50;
const EK = -77;
const EL = -54.387;

function alphaN(V) { return (0.01 * (V + 55)) / (1 - Math.exp(-(V + 55) / 10)); }
function betaN(V) { return 0.125 * Math.exp(-(V + 65) / 80); }
function alphaM(V) { return (0.1 * (V + 40)) / (1 - Math.exp(-(V + 40) / 10)); }
function betaM(V) { return 4 * Math.exp(-(V + 65) / 18); }
function alphaH(V) { return 0.07 * Math.exp(-(V + 65) / 20); }
function betaH(V) { return 1 / (1 + Math.exp(-(V + 35) / 10)); }

function safeGate(a, b, x, dt) {
  const inf = a / (a + b);
  const tau = 1 / (a + b);
  return inf + (x - inf) * Math.exp(-dt / Math.max(tau, 1e-6));
}

export default {
  id: 'hodgkin-huxley',
  name: '神经动作电位（Hodgkin-Huxley）',
  params: {
    Istim: 10, stimStart: 5, stimDur: 2, C: 1, speed: 1,
  },
  paramSchema: {
    Istim: { group: 'dynamics', unit: 'μA/cm²', label: '刺激电流', min: 0, max: 40 },
    stimStart: { group: 'initial', unit: 'ms', label: '刺激起点', min: 0, max: 40 },
    stimDur: { group: 'dynamics', unit: 'ms', label: '刺激时长', min: 0.2, max: 20 },
    C: { group: 'dynamics', unit: 'μF/cm²', label: '膜电容 C', min: 0.5, max: 2 },
    speed: { group: 'dynamics', unit: '—', label: '动画速', min: 0.2, max: 4 },
  },

  init(state) {
    state.t = 0;
    state.V = -65;
    const aN = alphaN(state.V); const bN = betaN(state.V);
    const aM = alphaM(state.V); const bM = betaM(state.V);
    const aH = alphaH(state.V); const bH = betaH(state.V);
    state.n = aN / (aN + bN);
    state.m = aM / (aM + bM);
    state.h = aH / (aH + bH);
    state.hist = [];
    state.gNa = 0;
    state.gK = 0;
    state.Iion = 0;
  },

  step(state, dt) {
    const s = Math.max(0.05, P(state.params, 'speed', 1));
    // HH 时间单位 ms；动画加速
    const h = Math.min(0.05, dt * s * 8);
    const steps = Math.max(1, Math.ceil((dt * s * 8) / h));
    for (let k = 0; k < steps; k += 1) {
      const V = state.V;
      const Iapp = (state.t >= P(state.params, 'stimStart', 5)
        && state.t < P(state.params, 'stimStart', 5) + P(state.params, 'stimDur', 2))
        ? P(state.params, 'Istim', 10) : 0;
      state.n = safeGate(alphaN(V), betaN(V), state.n, h);
      state.m = safeGate(alphaM(V), betaM(V), state.m, h);
      state.h = safeGate(alphaH(V), betaH(V), state.h, h);
      state.gNa = GNa * (state.m ** 3) * state.h;
      state.gK = GK * (state.n ** 4);
      const INa = state.gNa * (V - ENa);
      const IK = state.gK * (V - EK);
      const IL = GL * (V - EL);
      state.Iion = INa + IK + IL;
      const C = Math.max(P(state.params, 'C', 1), 0.2);
      state.V += ((Iapp - state.Iion) / C) * h;
      state.t += h;
    }
    state.hist.push({ t: state.t, V: state.V });
    if (state.hist.length > 320) state.hist.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 44;
    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText('Hodgkin–Huxley · membrane potential', 12, 18);

    const vMin = -90;
    const vMax = 50;
    const toY = (V) => pad + ((vMax - V) / (vMax - vMin)) * (H - 2 * pad);

    ctx.strokeStyle = C.axis;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pad, toY(-65));
    ctx.lineTo(W - pad, toY(-65));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = C.body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    state.hist.forEach((p, i) => {
      const x = pad + (i / 320) * (W - 2 * pad);
      const y = toY(p.V);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();

    // 通道电导条
    const barY = H - 28;
    const gMax = 40;
    ctx.fillStyle = C.vector;
    ctx.fillRect(pad, barY, Math.min(120, (state.gNa / gMax) * 120), 8);
    ctx.fillStyle = C.accent;
    ctx.fillRect(pad + 140, barY, Math.min(120, (state.gK / gMax) * 120), 8);
    ctx.fillStyle = C.muted;
    ctx.font = '10px IBM Plex Mono, monospace';
    ctx.fillText('gNa', pad, barY - 4);
    ctx.fillText('gK', pad + 140, barY - 4);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: 'V', value: `${formatNum(state.V, d)} mV` },
      { label: 't', value: `${formatNum(state.t, d)} ms` },
      { label: 'gNa', value: formatNum(state.gNa, d) },
      { label: 'gK', value: formatNum(state.gK, d) },
      { label: 'n', value: formatNum(state.n, d) },
    ];
  },

  getTrajectory(state) {
    return state.hist;
  },
};
