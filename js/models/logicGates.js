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

/** 基本逻辑门：多输入组合、真值表扫描、波形 */
export default {
  id: 'logic-gates',
  name: '基本逻辑门',
  params: {
    a: 1, b: 0, c: 0, mode: 0, scan: 0, stepDt: 0.4, bits: 2,
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
  },

  init(state) {
    state.t = 0;
    state.acc = 0;
    state.scanIdx = 0;
    state.y = 0;
    state.wave = [];
    state.table = [];
  },

  step(state, dt) {
    state.t += dt;
    const bits = Math.max(1, Math.min(3, Math.round(P(state.params, 'bits', 2))));
    const mode = Math.round(P(state.params, 'mode', 0));
    let a = Math.round(P(state.params, 'a', 1)) & 1;
    let b = Math.round(P(state.params, 'b', 0)) & 1;
    const c = Math.round(P(state.params, 'c', 0)) & 1;

    if (Math.round(P(state.params, 'scan', 0)) === 1) {
      state.acc += dt;
      if (state.acc >= Math.max(P(state.params, 'stepDt', 0.4), 0.05)) {
        state.acc = 0;
        state.scanIdx = (state.scanIdx + 1) % (2 ** bits);
      }
      a = (state.scanIdx >> 0) & 1;
      b = bits >= 2 ? (state.scanIdx >> 1) & 1 : 0;
      const cc = bits >= 3 ? (state.scanIdx >> 2) & 1 : 0;
      state.y = bits >= 3
        ? evalGate(mode, evalGate(mode === 7 ? 6 : mode, a, b), cc) & 1
        : evalGate(mode, a, bits === 1 ? a : b);
      state._a = a; state._b = b; state._c = cc;
    } else {
      state.y = bits === 1
        ? evalGate(mode, a, a)
        : bits === 2
          ? evalGate(mode, a, b)
          : evalGate(mode, evalGate(mode === 7 ? 6 : mode, a, b), c) & 1;
      state._a = a; state._b = b; state._c = c;
    }

    state.wave.push(state.y);
    if (state.wave.length > 160) state.wave.shift();

    // truth table snapshot
    state.table = [];
    for (let i = 0; i < 2 ** bits; i += 1) {
      const aa = (i >> 0) & 1;
      const bb = bits >= 2 ? (i >> 1) & 1 : 0;
      const cc = bits >= 3 ? (i >> 2) & 1 : 0;
      const yy = bits === 1
        ? evalGate(mode, aa, aa)
        : bits === 2
          ? evalGate(mode, aa, bb)
          : evalGate(mode, evalGate(mode === 7 ? 6 : mode, aa, bb), cc) & 1;
      state.table.push({ a: aa, b: bb, c: cc, y: yy });
    }
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const mode = Math.round(P(state.params, 'mode', 0));
    ctx.fillStyle = C.muted;
    ctx.font = '12px IBM Plex Mono, monospace';
    ctx.fillText(`${GATES[mode] || '?'}  A=${state._a} B=${state._b} C=${state._c} → Y=${state.y}`, 16, 22);

    // gate body
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

    // truth table
    const tx = W * 0.55; const ty = 48;
    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText('A B C | Y', tx, ty);
    state.table.forEach((row, i) => {
      const active = row.a === state._a && row.b === state._b && row.c === state._c;
      ctx.fillStyle = active ? C.accent : C.body;
      ctx.fillText(`${row.a} ${row.b} ${row.c} | ${row.y}`, tx, ty + 18 + i * 16);
    });

    // wave
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
    return [
      { label: 'gate', value: GATES[mode] || '?' },
      { label: 'A', value: String(state._a) },
      { label: 'B', value: String(state._b) },
      { label: 'Y', value: String(state.y) },
      { label: 't', value: `${formatNum(state.t, 2)} s` },
    ];
  },

  getTrajectory(state) {
    return state.table.map((r, i) => ({ i, ...r }));
  },
};
