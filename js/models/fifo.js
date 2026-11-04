import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** FIFO 缓冲占用（计算机工程） */
export default {
  id: 'fifo',
  name: 'FIFO 缓冲',
  params: {
    depth: 10, produceRate: 4, consumeRate: 3, stepDt: 0.12, seed: 5,
  },
  paramSchema: {
    depth: { group: 'numerics', unit: '', label: 'depth', min: 3, max: 24 },
    produceRate: { group: 'dynamics', unit: '1/s', label: 'produce', min: 0, max: 20 },
    consumeRate: { group: 'dynamics', unit: '1/s', label: 'consume', min: 0, max: 20 },
    stepDt: { group: 'dynamics', unit: 's', label: 'stepDt', min: 0.05, max: 0.5 },
    seed: { group: 'initial', unit: '', label: 'seed', min: 1, max: 9999 },
  },

  init(state) {
    state.depth = Math.floor(P(state.params, 'depth', 10));
    state.q = [];
    state.nextId = 1;
    state.dropped = 0;
    state.produced = 0;
    state.consumed = 0;
    state.acc = 0;
    state.prodAcc = 0;
    state.consAcc = 0;
    state.t = 0;
    state.lastEvent = 'idle';
  },

  step(state, dt) {
    const period = Math.max(P(state.params, 'stepDt', 0.12), 0.03);
    const pr = Math.max(P(state.params, 'produceRate', 1), 0);
    const cr = Math.max(P(state.params, 'consumeRate', 1), 0);
    state.acc += dt;
    state.t += dt;
    state.prodAcc += pr * dt;
    state.consAcc += cr * dt;
    while (state.acc >= period) {
      state.acc -= period;
      while (state.prodAcc >= 1) {
        state.prodAcc -= 1;
        if (state.q.length >= state.depth) {
          state.dropped += 1;
          state.lastEvent = 'drop';
        } else {
          state.q.push(state.nextId);
          state.nextId += 1;
          state.produced += 1;
          state.lastEvent = 'push';
        }
      }
      while (state.consAcc >= 1) {
        state.consAcc -= 1;
        if (state.q.length) {
          state.q.shift();
          state.consumed += 1;
          state.lastEvent = 'pop';
        }
      }
    }
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 50;
    const slotW = (W - pad * 2) / state.depth;
    const y = H * 0.4;
    const h = 56;

    ctx.fillStyle = C.muted;
    ctx.font = '12px IBM Plex Mono, monospace';
    ctx.fillText('in →  FIFO  → out', pad, y - 18);

    for (let i = 0; i < state.depth; i += 1) {
      const x = pad + i * slotW;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(x + 3, y, slotW - 6, h);
      const item = state.q[i];
      if (item != null) {
        ctx.fillStyle = C.body;
        ctx.fillRect(x + 5, y + 2, slotW - 10, h - 4);
        ctx.fillStyle = '#111';
        ctx.font = '12px IBM Plex Mono, monospace';
        ctx.fillText(String(item), x + slotW / 2 - 8, y + 34);
      }
    }

    const fill = state.q.length / state.depth;
    ctx.fillStyle = C.vector;
    ctx.fillRect(pad, y + h + 24, (W - pad * 2) * fill, 10);
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(pad, y + h + 24, W - pad * 2, 10);

    ctx.fillStyle = state.lastEvent === 'drop' ? C.accent : C.muted;
    ctx.fillText(`last: ${state.lastEvent}`, pad, y + h + 54);
  },

  getReadouts(state) {
    return [
      { label: 'occ', value: `${state.q.length}/${state.depth}` },
      { label: 'prod', value: String(state.produced) },
      { label: 'cons', value: String(state.consumed) },
      { label: 'drop', value: String(state.dropped) },
    ];
  },
};
