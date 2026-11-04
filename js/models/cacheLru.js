import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** LRU 缓存命中可视化（计算机工程） */
export default {
  id: 'cache-lru',
  name: 'LRU 缓存',
  params: {
    capacity: 6, uniq: 14, stepDt: 0.15, seed: 11,
  },
  paramSchema: {
    capacity: { group: 'numerics', unit: '', label: 'capacity', min: 2, max: 16 },
    uniq: { group: 'initial', unit: '', label: 'keys', min: 4, max: 40 },
    stepDt: { group: 'dynamics', unit: 's', label: 'stepDt', min: 0.05, max: 0.6 },
    seed: { group: 'initial', unit: '', label: 'seed', min: 1, max: 9999 },
  },

  init(state) {
    const cap = Math.floor(P(state.params, 'capacity', 6));
    const uniq = Math.floor(P(state.params, 'uniq', 12));
    let s = Math.floor(P(state.params, 'seed', 1)) || 1;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    state.cap = cap;
    state.slots = []; // {key, age}
    state.stream = Array.from({ length: 200 }, () => 1 + Math.floor(rnd() * uniq));
    state.si = 0;
    state.hits = 0;
    state.misses = 0;
    state.last = null;
    state.lastHit = false;
    state.acc = 0;
    state.t = 0;
  },

  step(state, dt) {
    const period = Math.max(P(state.params, 'stepDt', 0.15), 0.03);
    state.acc += dt;
    state.t += dt;
    while (state.acc >= period) {
      state.acc -= period;
      const key = state.stream[state.si % state.stream.length];
      state.si += 1;
      state.last = key;
      const idx = state.slots.findIndex((s) => s.key === key);
      if (idx >= 0) {
        state.hits += 1;
        state.lastHit = true;
        const [item] = state.slots.splice(idx, 1);
        item.age = state.t;
        state.slots.push(item);
      } else {
        state.misses += 1;
        state.lastHit = false;
        if (state.slots.length >= state.cap) state.slots.shift();
        state.slots.push({ key, age: state.t });
      }
    }
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 48;
    const slotW = (W - pad * 2) / state.cap;
    const slotH = 64;
    const y = H * 0.38;

    ctx.fillStyle = C.muted;
    ctx.font = '12px IBM Plex Mono, monospace';
    ctx.fillText('LRU ← oldest … newest →', pad, y - 16);

    for (let i = 0; i < state.cap; i += 1) {
      const x = pad + i * slotW;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(x + 4, y, slotW - 8, slotH);
      const item = state.slots[i];
      if (item) {
        ctx.fillStyle = item.key === state.last ? C.accent : C.body;
        ctx.fillRect(x + 6, y + 2, slotW - 12, slotH - 4);
        ctx.fillStyle = '#111';
        ctx.font = 'bold 16px IBM Plex Mono, monospace';
        ctx.fillText(String(item.key), x + slotW / 2 - 8, y + 38);
      }
    }

    ctx.fillStyle = state.lastHit ? C.vector : C.body2;
    ctx.font = '13px IBM Plex Mono, monospace';
    ctx.fillText(
      state.last == null ? '—' : `access ${state.last} → ${state.lastHit ? 'HIT' : 'MISS'}`,
      pad,
      y + slotH + 36,
    );
  },

  getReadouts(state) {
    const total = state.hits + state.misses;
    const rate = total ? state.hits / total : 0;
    return [
      { label: 'hits', value: String(state.hits) },
      { label: 'miss', value: String(state.misses) },
      { label: 'hit%', value: formatNum(rate * 100, 1) },
      { label: 'fill', value: `${state.slots.length}/${state.cap}` },
    ];
  },
};
