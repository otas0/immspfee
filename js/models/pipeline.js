import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

const STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'];

/** 五级流水线气泡 / 停顿（计算机工程） */
export default {
  id: 'pipeline',
  name: 'CPU 流水线',
  params: {
    stallEvery: 5, stepDt: 0.2, issueRate: 1,
  },
  paramSchema: {
    stallEvery: { group: 'dynamics', unit: '', label: 'stallEvery', min: 0, max: 20 },
    stepDt: { group: 'dynamics', unit: 's', label: 'stepDt', min: 0.05, max: 0.8 },
    issueRate: { group: 'numerics', unit: '', label: 'issue', min: 1, max: 1 },
  },

  init(state) {
    state.stages = STAGES.map(() => null); // instr id or null
    state.nextId = 1;
    state.cycle = 0;
    state.retired = 0;
    state.stalls = 0;
    state.bubbles = 0;
    state.acc = 0;
    state.t = 0;
    state.log = [];
  },

  step(state, dt) {
    const period = Math.max(P(state.params, 'stepDt', 0.2), 0.05);
    const stallEvery = Math.floor(P(state.params, 'stallEvery', 5));
    state.acc += dt;
    state.t += dt;
    while (state.acc >= period) {
      state.acc -= period;
      state.cycle += 1;
      // retire WB
      if (state.stages[4] != null) {
        state.retired += 1;
        state.stages[4] = null;
      }
      // shift right MEM←EX←ID←IF
      for (let i = 4; i >= 1; i -= 1) {
        state.stages[i] = state.stages[i - 1];
        state.stages[i - 1] = null;
      }
      const stall = stallEvery > 0 && state.cycle % stallEvery === 0;
      if (stall) {
        state.stalls += 1;
        state.bubbles += 1;
        state.stages[0] = null; // bubble in IF
        state.log.push({ c: state.cycle, ev: 'stall' });
      } else {
        state.stages[0] = state.nextId;
        state.nextId += 1;
        state.log.push({ c: state.cycle, ev: 'issue' });
      }
      if (state.log.length > 40) state.log.shift();
    }
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 40;
    const boxW = (W - pad * 2) / 5;
    const y = H * 0.35;
    const h = 70;

    STAGES.forEach((name, i) => {
      const x = pad + i * boxW;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(x + 6, y, boxW - 12, h);
      ctx.fillStyle = C.muted;
      ctx.font = '12px IBM Plex Mono, monospace';
      ctx.fillText(name, x + 16, y - 10);
      const id = state.stages[i];
      if (id == null) {
        ctx.fillStyle = C.ground;
        ctx.fillRect(x + 10, y + 10, boxW - 20, h - 20);
        ctx.fillStyle = '#111';
        ctx.fillText('○', x + boxW / 2 - 6, y + 42);
      } else {
        ctx.fillStyle = C.body;
        ctx.fillRect(x + 10, y + 10, boxW - 20, h - 20);
        ctx.fillStyle = '#111';
        ctx.font = 'bold 14px IBM Plex Mono, monospace';
        ctx.fillText(`I${id}`, x + boxW / 2 - 12, y + 42);
      }
      if (i < 4) {
        ctx.strokeStyle = C.vector;
        ctx.beginPath();
        ctx.moveTo(x + boxW - 8, y + h / 2);
        ctx.lineTo(x + boxW + 4, y + h / 2);
        ctx.stroke();
      }
    });

    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText('bubble = 空槽（停顿插入）', pad, y + h + 36);
  },

  getReadouts(state) {
    const ipc = state.cycle ? state.retired / state.cycle : 0;
    return [
      { label: 'cycle', value: String(state.cycle) },
      { label: 'retired', value: String(state.retired) },
      { label: 'stalls', value: String(state.stalls) },
      { label: 'IPC', value: formatNum(ipc, 2) },
    ];
  },
};
