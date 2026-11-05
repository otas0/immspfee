import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

const STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'];

/**
 * 五级流水线（计算机工程）
 * hazardMode: 0=周期停顿 stallEvery；1=数据冒险（EX/MEM 写后读停顿）
 */
export default {
  id: 'pipeline',
  name: 'CPU 流水线',
  params: {
    stallEvery: 5, stepDt: 0.2, hazardMode: 1, hazardRate: 0.35, seed: 9,
  },
  paramSchema: {
    stallEvery: { group: 'dynamics', unit: '', label: 'stallEvery', min: 0, max: 20 },
    stepDt: { group: 'dynamics', unit: 's', label: 'stepDt', min: 0.05, max: 0.8 },
    hazardMode: {
      group: 'dynamics', unit: '', label: 'hazardMode', min: 0, max: 1,
      options: [
        { value: 0, label: '周期停顿' },
        { value: 1, label: '数据冒险' },
      ],
    },
    hazardRate: { group: 'dynamics', unit: '', label: 'hazardRate', min: 0, max: 1 },
    seed: { group: 'initial', unit: '', label: 'seed', min: 1, max: 9999 },
  },

  init(state) {
    let s = Math.floor(P(state.params, 'seed', 9)) || 1;
    state.rnd = () => {
      s = (s * 48271) % 2147483647;
      return (s - 1) / 2147483646;
    };
    state.stages = STAGES.map(() => null);
    state.nextId = 1;
    state.cycle = 0;
    state.retired = 0;
    state.stalls = 0;
    state.bubbles = 0;
    state.dataHazards = 0;
    state.acc = 0;
    state.t = 0;
    state.freezeIF = 0; // remaining stall cycles for IF
    state.lastEvent = 'boot';
  },

  step(state, dt) {
    const period = Math.max(P(state.params, 'stepDt', 0.2), 0.05);
    const stallEvery = Math.floor(P(state.params, 'stallEvery', 5));
    const hazardMode = Math.round(P(state.params, 'hazardMode', 1)) >= 1 ? 1 : 0;
    const hazardRate = P(state.params, 'hazardRate', 0.35);
    state.acc += dt;
    state.t += dt;
    while (state.acc >= period) {
      state.acc -= period;
      state.cycle += 1;

      if (state.stages[4] != null) {
        state.retired += 1;
        state.stages[4] = null;
      }

      // 数据冒险：若 ID 指令与 EX/MEM 写相关，插入气泡（简化：随机+占用检测）
      let dataStall = false;
      if (hazardMode === 1 && state.stages[1] != null) {
        const rawHazard = (state.stages[2] != null || state.stages[3] != null)
          && state.rnd() < hazardRate;
        if (rawHazard) {
          dataStall = true;
          state.dataHazards += 1;
          state.stalls += 1;
          state.bubbles += 1;
          state.lastEvent = 'data-hazard';
          // 冻结 IF/ID：不推进前两级，后级照常（插入气泡到 EX）
          state.stages[4] = state.stages[3];
          state.stages[3] = state.stages[2];
          state.stages[2] = null; // bubble in EX
          // IF/ID hold
          continue;
        }
      }

      for (let i = 4; i >= 1; i -= 1) {
        state.stages[i] = state.stages[i - 1];
        state.stages[i - 1] = null;
      }

      const periodStall = hazardMode === 0 && stallEvery > 0 && state.cycle % stallEvery === 0;
      if (periodStall || state.freezeIF > 0) {
        if (periodStall) {
          state.stalls += 1;
          state.bubbles += 1;
          state.lastEvent = 'period-stall';
        }
        if (state.freezeIF > 0) state.freezeIF -= 1;
        state.stages[0] = null;
      } else if (!dataStall) {
        state.stages[0] = state.nextId;
        state.nextId += 1;
        state.lastEvent = 'issue';
      }
    }
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 40;
    const boxW = (W - pad * 2) / 5;
    const y = H * 0.35;
    const h = 70;
    const mode = Math.round(P(state.params, 'hazardMode', 1)) >= 1 ? 'data-hazard' : 'period-stall';

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
    ctx.fillText(`mode=${mode} · last ${state.lastEvent}`, pad, y + h + 36);
  },

  getReadouts(state) {
    const ipc = state.cycle ? state.retired / state.cycle : 0;
    return [
      { label: 't', value: formatNum(state.t || 0, 3) },
      { label: 'cycle', value: String(state.cycle) },
      { label: 'retired', value: String(state.retired) },
      { label: 'hazards', value: String(state.dataHazards) },
      { label: 'IPC', value: formatNum(ipc, 2) },
    ];
  },
};
