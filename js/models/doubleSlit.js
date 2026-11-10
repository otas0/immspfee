import { formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** Young double-slit fringe spacing: Δy = λ L / d. Hecht, Optics. */
export default {
  id: 'double-slit',
  name: '双缝干涉',
  equation: 'Δy = λ L / d（远场小角）',
  authority: 'Hecht, Optics, Young’s double-slit fringe spacing',
  assumptions: '远场、小角、单色、等幅双缝；非完整菲涅耳衍射积分',
  fidelity: 'engineering',
  params: {
    lambda: 550e-9, L: 1, d: 0.2e-3, showEnvelope: 1,
  },
  paramSchema: {
    lambda: { group: 'dynamics', unit: 'm', label: '波长 λ', min: 400e-9, max: 700e-9 },
    L: { group: 'dynamics', unit: 'm', label: '屏距 L', min: 0.2, max: 3 },
    d: { group: 'dynamics', unit: 'm', label: '缝距 d', min: 0.05e-3, max: 1e-3 },
    showEnvelope: {
      group: 'display', unit: '—', label: '示意条纹', min: 0, max: 1,
      options: [{ value: 1, label: '显示' }, { value: 0, label: '隐藏' }],
    },
  },

  init(state) {
    state.t = 0;
    state.hist = [];
    this.refresh(state);
  },

  refresh(state) {
    const lambda = P(state.params, 'lambda', 550e-9);
    const L = P(state.params, 'L', 1);
    const d = Math.max(1e-6, P(state.params, 'd', 2e-4));
    state.dy = finiteOr((lambda * L) / d, 0);
    state.y = state.dy;
  },

  step(state, dt) {
    state.t += dt;
    this.refresh(state);
    state.hist.push(state.dy);
    if (state.hist.length > 200) state.hist.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = { l: 40, r: 28, t: 44, b: 36 };
    ctx.fillStyle = C.muted;
    ctx.font = '600 13px IBM Plex Mono, monospace';
    ctx.fillText('Δy = λ L / d', 14, 22);

    const plotW = W - pad.l - pad.r;
    const mid = pad.t + (H - pad.t - pad.b) * 0.55;
    const dyPx = Math.min(plotW * 0.45, Math.max(8, state.dy * 8000));

    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(pad.l, mid);
    ctx.lineTo(pad.l + plotW, mid);
    ctx.stroke();

    if (Math.round(P(state.params, 'showEnvelope', 1)) === 1) {
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 120; i += 1) {
        const x = pad.l + (i / 120) * plotW;
        const u = (i / 120 - 0.5) * plotW;
        const I = Math.cos((Math.PI * u) / Math.max(1, dyPx)) ** 2;
        const y = mid - I * (H - pad.t - pad.b) * 0.35;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    ctx.fillStyle = C.accent;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText(`Δy=${formatNum(state.dy * 1000, 3)} mm`, 14, 40);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: 'Δy', value: `${formatNum(state.dy * 1000, d)} mm` },
      { label: 'λ', value: `${formatNum(P(state.params, 'lambda', 550e-9) * 1e9, d)} nm` },
      { label: 'L', value: `${formatNum(P(state.params, 'L', 1), d)} m` },
      { label: 'd', value: `${formatNum(P(state.params, 'd', 2e-4) * 1e3, d)} mm` },
    ];
  },

  getTrajectory(state) {
    return state.hist.map((v, i) => ({ i, dy: v }));
  },
};
