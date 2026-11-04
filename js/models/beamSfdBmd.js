import { formatNum, drawArrow } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

/**
 * 梁弯曲内力：多点载荷 + 简支 / 悬臂 / 固支 切换，实时 SFD / BMD。
 * support: 0 简支  1 悬臂（左固）  2 两端（两端固支近似）
 */
function loadsFromParams(params) {
  const raw = [
    { p: P(params, 'P1', 10), a: P(params, 'a1', 0.35) },
    { p: P(params, 'P2', 0), a: P(params, 'a2', 0.65) },
    { p: P(params, 'P3', 0), a: P(params, 'a3', 0.85) },
  ];
  const L = Math.max(P(params, 'span', 6), 0.5);
  return raw
    .filter((x) => Math.abs(x.p) > 1e-9)
    .map((x) => ({
      P: x.p,
      a: Math.max(0.02, Math.min(0.98, x.a)) * L,
    }));
}

function rebuild(state) {
  const L = Math.max(P(state.params, 'span', 6), 0.5);
  const support = Math.round(P(state.params, 'support', 0));
  const loads = loadsFromParams(state.params);
  const n = 64;
  const xs = Array.from({ length: n + 1 }, (_, i) => (i / n) * L);

  let Ra = 0;
  let Rb = 0;
  let Ma = 0;

  if (support === 1) {
    // 悬臂：左端固支，右端自由。Ra = ΣP，Ma = -Σ P·a
    Ra = loads.reduce((s, ld) => s + ld.P, 0);
    Rb = 0;
    Ma = -loads.reduce((s, ld) => s + ld.P * ld.a, 0);
  } else if (support === 2) {
    // 两端固支：集中力等效反力 / 固端弯矩（叠加）
    Ra = 0;
    Rb = 0;
    Ma = 0;
    let Mb = 0;
    for (const ld of loads) {
      const a = ld.a;
      const b = L - a;
      const Pload = ld.P;
      Ra += (Pload * b * b * (3 * a + b)) / (L ** 3);
      Rb += (Pload * a * a * (a + 3 * b)) / (L ** 3);
      Ma += -(Pload * a * b * b) / (L * L);
      Mb += (Pload * a * a * b) / (L * L);
    }
    state.Mb = Mb;
  } else {
    // 简支
    Ra = 0;
    Rb = 0;
    for (const ld of loads) {
      Ra += (ld.P * (L - ld.a)) / L;
      Rb += (ld.P * ld.a) / L;
    }
    Ma = 0;
  }

  state.sfd = [];
  state.bmd = [];
  for (const x of xs) {
    let V = Ra;
    let M = Ma + Ra * x;
    for (const ld of loads) {
      if (x >= ld.a - 1e-9) {
        V -= ld.P;
        M -= ld.P * (x - ld.a);
      }
    }
    if (support === 1 && x > L - 1e-9) {
      V = 0;
      M = 0;
    }
    state.sfd.push({ x, v: V });
    state.bmd.push({ x, m: M });
  }
  state.Ra = Ra;
  state.Rb = Rb;
  state.Ma = Ma;
  state.loads = loads;
  state.Mmax = Math.max(...state.bmd.map((p) => Math.abs(p.m)), 0);
  state.Vmax = Math.max(...state.sfd.map((p) => Math.abs(p.v)), 0);
}

export default {
  id: 'beam-sfd-bmd',
  name: '梁的弯曲内力（剪力图/弯矩图）',
  params: {
    span: 6, support: 0,
    P1: 10, a1: 0.35,
    P2: 6, a2: 0.65,
    P3: 0, a3: 0.85,
  },
  paramSchema: {
    span: { group: 'dynamics', unit: 'm', label: '跨度 L', min: 1, max: 40 },
    support: {
      group: 'dynamics', unit: '', label: '支座',
      min: 0, max: 2,
      options: [
        { value: 0, label: '简支' },
        { value: 1, label: '悬臂' },
        { value: 2, label: '固支' },
      ],
    },
    P1: { group: 'dynamics', unit: 'kN', label: 'P₁', min: -80, max: 80 },
    a1: { group: 'dynamics', unit: '—', label: 'a₁/L', min: 0.05, max: 0.95 },
    P2: { group: 'dynamics', unit: 'kN', label: 'P₂', min: -80, max: 80 },
    a2: { group: 'dynamics', unit: '—', label: 'a₂/L', min: 0.05, max: 0.95 },
    P3: { group: 'dynamics', unit: 'kN', label: 'P₃', min: -80, max: 80 },
    a3: { group: 'dynamics', unit: '—', label: 'a₃/L', min: 0.05, max: 0.95 },
  },

  init(state) {
    state.t = 0;
    rebuild(state);
  },

  step(state, dt) {
    state.t += dt;
    rebuild(state);
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const L = Math.max(P(state.params, 'span', 6), 0.5);
    const support = Math.round(P(state.params, 'support', 0));
    const m = 42;
    const box = { l: m, r: W - m, t: m, b: H - m, w: W - 2 * m, h: H - 2 * m };
    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    const names = ['简支', '悬臂', '固支'];
    ctx.fillText(`beam · ${names[support] || '?'} · multi-load SFD/BMD`, 12, 18);

    const midY = box.t + box.h * 0.26;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(box.l, midY);
    ctx.lineTo(box.r, midY);
    ctx.stroke();

    const drawSupport = (x, kind) => {
      ctx.fillStyle = C.muted;
      ctx.strokeStyle = C.muted;
      if (kind === 'pin' || kind === 'roller') {
        ctx.beginPath();
        ctx.moveTo(x, midY);
        ctx.lineTo(x - 9, midY + 14);
        ctx.lineTo(x + 9, midY + 14);
        ctx.closePath();
        ctx.fill();
        if (kind === 'roller') {
          ctx.beginPath();
          ctx.arc(x, midY + 18, 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (kind === 'fixed') {
        ctx.fillRect(x - 4, midY - 16, 8, 32);
        for (let i = 0; i < 5; i += 1) {
          ctx.beginPath();
          ctx.moveTo(x - 4, midY - 14 + i * 7);
          ctx.lineTo(x - 14, midY - 8 + i * 7);
          ctx.stroke();
        }
      }
    };

    if (support === 0) {
      drawSupport(box.l, 'pin');
      drawSupport(box.r, 'roller');
    } else if (support === 1) {
      drawSupport(box.l, 'fixed');
    } else {
      drawSupport(box.l, 'fixed');
      drawSupport(box.r, 'fixed');
    }

    for (const ld of state.loads || []) {
      const px = box.l + (ld.a / L) * box.w;
      const up = ld.P >= 0;
      drawArrow(
        ctx,
        px,
        up ? midY - 42 : midY + 42,
        px,
        up ? midY - 4 : midY + 4,
        C.accent,
        2,
      );
      ctx.fillStyle = C.accent;
      ctx.font = '10px IBM Plex Mono, monospace';
      ctx.fillText(`${formatNum(ld.P, 1)}`, px + 4, up ? midY - 46 : midY + 54);
    }

    const plot = (series, key, y0, h, color, label) => {
      const maxA = Math.max(1e-6, ...series.map((p) => Math.abs(p[key])));
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      series.forEach((p, i) => {
        const x = box.l + (p.x / L) * box.w;
        const y = y0 - (p[key] / maxA) * h;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      ctx.strokeStyle = C.axis;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(box.l, y0);
      ctx.lineTo(box.r, y0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.muted;
      ctx.font = '10px IBM Plex Mono, monospace';
      ctx.fillText(label, box.l, y0 - h - 6);
    };

    plot(state.sfd, 'v', box.t + box.h * 0.55, box.h * 0.12, C.vector, 'SFD');
    plot(state.bmd, 'm', box.t + box.h * 0.82, box.h * 0.12, C.body, 'BMD');
  },

  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const names = ['简支', '悬臂', '固支'];
    return [
      { label: '支座', value: names[Math.round(P(state.params, 'support', 0))] || '?' },
      { label: 'Ra', value: `${formatNum(state.Ra, d)} kN` },
      { label: 'Rb', value: `${formatNum(state.Rb, d)} kN` },
      { label: 'Mmax', value: `${formatNum(state.Mmax, d)}` },
      { label: 'Vmax', value: `${formatNum(state.Vmax, d)}` },
    ];
  },

  getTrajectory(state) {
    return (state.bmd || []).map((p) => ({ x: p.x, M: p.m }));
  },
};
