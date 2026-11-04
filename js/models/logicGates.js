import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

const GATES = ['AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR', 'BUF', 'NOT'];

function evalGate(mode, a, b) {
  switch (mode) {
    case 0: return a & b;
    case 1: return a | b;
    case 2: return a ^ b;
    case 3: return (a & b) ^ 1;
    case 4: return (a | b) ^ 1;
    case 5: return (a ^ b) ^ 1;
    case 6: return a;
    case 7: return a ^ 1;
    default: return 0;
  }
}

function gateIndex(name) {
  const i = GATES.indexOf(String(name || '').toUpperCase());
  return i >= 0 ? i : 0;
}

/** 解析网表: "AND A B N1; OR N1 C Y" */
function parseNetlist(text) {
  const gates = [];
  const raw = String(text || '').trim();
  if (!raw) return gates;
  for (const part of raw.split(/[;\n]+/)) {
    const toks = part.trim().split(/\s+/).filter(Boolean);
    if (toks.length < 3) continue;
    const op = toks[0];
    if (toks.length === 3) {
      gates.push({ op, in: [toks[1], toks[1]], out: toks[2] });
    } else {
      gates.push({ op, in: [toks[1], toks[2]], out: toks[3] || toks[2] });
    }
  }
  return gates;
}

function evalNet(gates, inputs) {
  const wire = { ...inputs };
  for (const g of gates) {
    const a = wire[g.in[0]] != null ? (wire[g.in[0]] & 1) : 0;
    const b = wire[g.in[1]] != null ? (wire[g.in[1]] & 1) : a;
    wire[g.out] = evalGate(gateIndex(g.op), a, b);
  }
  return wire;
}

/** 基本逻辑门 + 组合电路网表 */
export default {
  id: 'logic-gates',
  name: '基本逻辑门',
  params: {
    a: 1, b: 0, c: 0, mode: 0, scan: 0, stepDt: 0.4, bits: 2,
    netlist: '',
    useNet: 0,
  },
  paramSchema: {
    a: { group: 'dynamics', unit: '—', label: '输入 A', min: 0, max: 1 },
    b: { group: 'dynamics', unit: '—', label: '输入 B', min: 0, max: 1 },
    c: { group: 'dynamics', unit: '—', label: '输入 C', min: 0, max: 1 },
    bits: { group: 'dynamics', unit: '—', label: '有效输入数', min: 1, max: 3 },
    scan: {
      group: 'dynamics', unit: '', label: '真值表扫描', min: 0, max: 1,
      options: [{ value: 0, label: '手动' }, { value: 1, label: '自动扫描' }],
    },
    stepDt: { group: 'dynamics', unit: 's', label: '扫描间隔', min: 0.05, max: 2 },
    mode: {
      group: 'dynamics', unit: '', label: '门类型', min: 0, max: 7,
      options: GATES.map((g, i) => ({ value: i, label: g })),
    },
    useNet: {
      group: 'dynamics', unit: '', label: '网表模式', min: 0, max: 1,
      options: [{ value: 0, label: '单门' }, { value: 1, label: '组合网表' }],
    },
    netlist: {
      group: 'initial', unit: '', label: '网表 AND A B N1; OR N1 C Y', allowText: true,
    },
  },

  init(state) {
    state.t = 0;
    state.acc = 0;
    state.scanIdx = 0;
    state.y = 0;
    state.wave = [];
    state.table = [];
    state.wires = {};
    state.gates = parseNetlist(state.params.netlist || 'AND A B N1; OR N1 C Y');
    this.recompute(state);
  },

  recompute(state) {
    state.gates = parseNetlist(state.params.netlist || 'AND A B N1; OR N1 C Y');
    const bits = Math.max(1, Math.min(3, Math.round(P(state.params, 'bits', 2))));
    const mode = Math.round(P(state.params, 'mode', 0));
    let a = Math.round(P(state.params, 'a', 1)) & 1;
    let b = Math.round(P(state.params, 'b', 0)) & 1;
    let c = Math.round(P(state.params, 'c', 0)) & 1;
    if (Math.round(P(state.params, 'scan', 0)) === 1) {
      a = (state.scanIdx >> 0) & 1;
      b = bits >= 2 ? (state.scanIdx >> 1) & 1 : 0;
      c = bits >= 3 ? (state.scanIdx >> 2) & 1 : 0;
    }
    state._a = a; state._b = b; state._c = c;

    if (Math.round(P(state.params, 'useNet', 0)) === 1) {
      state.wires = evalNet(state.gates, { A: a, B: b, C: c, a, b, c });
      const outs = state.gates.map((g) => g.out);
      const last = outs[outs.length - 1] || 'Y';
      state.y = state.wires[last] != null ? state.wires[last] & 1 : 0;
      state._outName = last;
    } else {
      state.y = bits === 1
        ? evalGate(mode, a, a)
        : bits === 2
          ? evalGate(mode, a, b)
          : evalGate(mode, evalGate(mode === 7 ? 6 : mode, a, b), c) & 1;
      state._outName = 'Y';
    }

    state.table = [];
    for (let i = 0; i < 2 ** bits; i += 1) {
      const aa = (i >> 0) & 1;
      const bb = bits >= 2 ? (i >> 1) & 1 : 0;
      const cc = bits >= 3 ? (i >> 2) & 1 : 0;
      let yy;
      if (Math.round(P(state.params, 'useNet', 0)) === 1) {
        const w = evalNet(state.gates, { A: aa, B: bb, C: cc, a: aa, b: bb, c: cc });
        const outs = state.gates.map((g) => g.out);
        yy = w[outs[outs.length - 1]] & 1;
      } else {
        yy = bits === 1
          ? evalGate(mode, aa, aa)
          : bits === 2
            ? evalGate(mode, aa, bb)
            : evalGate(mode, evalGate(mode === 7 ? 6 : mode, aa, bb), cc) & 1;
      }
      state.table.push({ a: aa, b: bb, c: cc, y: yy });
    }
  },

  refresh(state) { this.recompute(state); },

  step(state, dt) {
    state.t += dt;
    if (Math.round(P(state.params, 'scan', 0)) === 1) {
      state.acc += dt;
      if (state.acc >= Math.max(P(state.params, 'stepDt', 0.4), 0.05)) {
        state.acc = 0;
        const bits = Math.max(1, Math.min(3, Math.round(P(state.params, 'bits', 2))));
        state.scanIdx = (state.scanIdx + 1) % (2 ** bits);
      }
    }
    this.recompute(state);
    state.wave.push(state.y);
    if (state.wave.length > 160) state.wave.shift();
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const mode = Math.round(P(state.params, 'mode', 0));
    const net = Math.round(P(state.params, 'useNet', 0)) === 1;
    ctx.fillStyle = C.muted;
    ctx.font = '12px IBM Plex Mono, monospace';
    ctx.fillText(
      net
        ? `NET → ${state._outName}=${state.y}  A${state._a}B${state._b}C${state._c}`
        : `${GATES[mode] || '?'}  A=${state._a} B=${state._b} C=${state._c} → Y=${state.y}`,
      16,
      22,
    );

    if (net) {
      state.gates.forEach((g, i) => {
        const x = 40 + (i % 3) * 140;
        const y = 70 + Math.floor(i / 3) * 70;
        ctx.strokeStyle = C.body;
        ctx.strokeRect(x, y, 110, 44);
        ctx.fillStyle = C.body;
        ctx.font = '12px IBM Plex Mono, monospace';
        ctx.fillText(`${g.op}`, x + 8, y + 18);
        ctx.fillStyle = C.muted;
        ctx.fillText(`${g.in.join(',')}→${g.out}=${state.wires[g.out] ?? '?'}`, x + 8, y + 36);
      });
    } else {
      const gx = W * 0.22; const gy = H * 0.38;
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2;
      ctx.strokeRect(gx, gy - 36, 110, 72);
      ctx.fillStyle = C.body;
      ctx.font = '16px IBM Plex Mono, monospace';
      ctx.fillText(GATES[mode], gx + 30, gy + 6);
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(gx - 40, gy - 18); ctx.lineTo(gx, gy - 18);
      ctx.moveTo(gx - 40, gy + 18); ctx.lineTo(gx, gy + 18);
      ctx.moveTo(gx + 110, gy); ctx.lineTo(gx + 150, gy);
      ctx.stroke();
      ctx.fillStyle = state._a ? C.accent : C.muted;
      ctx.beginPath(); ctx.arc(gx - 46, gy - 18, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = state._b ? C.accent : C.muted;
      ctx.beginPath(); ctx.arc(gx - 46, gy + 18, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = state.y ? C.vector : C.muted;
      ctx.beginPath(); ctx.arc(gx + 158, gy, 7, 0, Math.PI * 2); ctx.fill();
    }

    const tx = W * 0.55; const ty = 48;
    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText('A B C | Y', tx, ty);
    state.table.forEach((row, i) => {
      const active = row.a === state._a && row.b === state._b && row.c === state._c;
      ctx.fillStyle = active ? C.accent : C.body;
      ctx.fillText(`${row.a} ${row.b} ${row.c} | ${row.y}`, tx, ty + 18 + i * 16);
    });

    const mid = H * 0.78;
    ctx.strokeStyle = C.vector;
    ctx.beginPath();
    state.wave.forEach((v, i) => {
      const x = 20 + (i / 160) * (W - 40);
      const y = mid - v * 28;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  },

  getReadouts(state) {
    const mode = Math.round(P(state.params, 'mode', 0));
    const net = Math.round(P(state.params, 'useNet', 0)) === 1;
    return [
      { label: 'mode', value: net ? 'NET' : (GATES[mode] || '?') },
      { label: 'A', value: String(state._a) },
      { label: 'B', value: String(state._b) },
      { label: state._outName || 'Y', value: String(state.y) },
      { label: 'gates', value: String(state.gates?.length || 0) },
      { label: 't', value: `${formatNum(state.t, 2)} s` },
    ];
  },

  getTrajectory(state) {
    return state.table.map((r, i) => ({ i, ...r }));
  },
};
