import { formatNum } from '../utils/draw.js';
import { P, finiteOr } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** Standing wave: y = 2A sin(kx) cos(ωt). Halliday / French. */
export default {
  id: 'standing-wave',
  name: '驻波/共振',
  equation: 'y = 2A sin(kx) cos(ωt)',
  authority: 'Halliday / French, standing wave on a string',
  assumptions: '等幅相向行波、理想边界；一维示意，非三维声场',
  fidelity: 'engineering',
  params: {
    A: 0.01, k: Math.PI, w: 6, showNodes: 1,
  },
  paramSchema: {
    A: { group: 'dynamics', unit: 'm', label: '振幅 A', min: 0, max: 0.05 },
    k: { group: 'dynamics', unit: '1/m', label: '波数 k', min: 0.5, max: 12 },
    w: { group: 'dynamics', unit: 'rad/s', label: '角频 ω', min: 0.5, max: 20 },
    showNodes: {
      group: 'display', unit: '—', label: '节点标记', min: 0, max: 1,
      options: [{ value: 1, label: '显示' }, { value: 0, label: '隐藏' }],
    },
  },

  init(state) {
    state.t = 0;
    state.hist = [];
    this.refresh(state);
  },

  refresh(state) {
    const A = P(state.params, 'A', 0.01);
    const k = P(state.params, 'k', Math.PI);
    const w = P(state.params, 'w', 6);
    // Sample mid-string x=0.5 for readout envelope
    state.y = finiteOr(2 * A * Math.sin(k * 0.5) * Math.cos(w * state.t), 0);
    state.nodes = Math.max(0, Math.floor(k / Math.PI));
  },

  step(state, dt) {
    state.t += dt;
    this.refresh(state);
    state.hist.push(state.y);
    if (state.hist.length > 200) state.hist.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = { l: 36, r: 24, t: 44, b: 28 };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const mid = pad.t + plotH * 0.5;
    const A = P(state.params, 'A', 0.01);
    const k = P(state.params, 'k', Math.PI);
    const w = P(state.params, 'w', 6);
    const amp = Math.max(1e-6, 2 * A);

    ctx.fillStyle = C.muted;
    ctx.font = '600 13px IBM Plex Mono, monospace';
    ctx.fillText('y = 2A sin(kx) cos(ωt)', 14, 22);

    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(pad.l, mid);
    ctx.lineTo(pad.l + plotW, mid);
    ctx.stroke();

    ctx.strokeStyle = C.body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 100; i += 1) {
      const x = i / 100;
      const y = 2 * A * Math.sin(k * x) * Math.cos(w * state.t);
      const X = pad.l + x * plotW;
      const Y = mid - (y / amp) * plotH * 0.4;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    if (Math.round(P(state.params, 'showNodes', 1)) === 1) {
      ctx.fillStyle = C.accent;
      for (let n = 0; n <= Math.ceil(k / Math.PI); n += 1) {
        const x = (n * Math.PI) / Math.max(1e-6, k);
        if (x < 0 || x > 1) continue;
        const X = pad.l + x * plotW;
        ctx.beginPath();
        ctx.arc(X, mid, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText(`y(0.5)=${formatNum(state.y, 3)} m`, 14, 40);
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: 'y', value: `${formatNum(state.y, d)} m` },
      { label: 'A', value: `${formatNum(P(state.params, 'A', 0.01), d)} m` },
      { label: 'k', value: `${formatNum(P(state.params, 'k', Math.PI), d)} 1/m` },
      { label: 'ω', value: `${formatNum(P(state.params, 'w', 6), d)} rad/s` },
    ];
  },

  getTrajectory(state) {
    return state.hist.map((v, i) => ({ i, y: v }));
  },
};
