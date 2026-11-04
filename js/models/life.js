import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** Conway 生命游戏（计算机科学 / 元胞自动机） */
export default {
  id: 'life',
  name: '生命游戏',
  params: {
    n: 36, stepDt: 0.12, density: 0.28, seed: 3, algo: 0,
  },
  paramSchema: {
    n: { group: 'numerics', unit: '', label: 'n', min: 8, max: 128 },
    stepDt: { group: 'dynamics', unit: 's', label: 'stepDt', min: 0.02, max: 2 },
    density: { group: 'initial', unit: '', label: 'density', min: 0, max: 1 },
    seed: { group: 'initial', unit: '', label: 'seed', min: 1, max: 9999 },
    algo: {
      group: 'dynamics', unit: '', label: '规则', min: 0, max: 2,
      options: [
        { value: 0, label: 'B3/S23 Conway' },
        { value: 1, label: 'B3/S23 HighLife≈' },
        { value: 2, label: 'seeds B2/S' },
      ],
    },
  },

  init(state) {
    const n = Math.floor(P(state.params, 'n', 32));
    const dens = P(state.params, 'density', 0.3);
    let s = Math.floor(P(state.params, 'seed', 1)) || 1;
    const rnd = () => {
      s = (s * 48271) % 2147483647;
      return (s - 1) / 2147483646;
    };
    state.n = n;
    state.grid = Array.from({ length: n }, () => Array.from({ length: n }, () => (rnd() < dens ? 1 : 0)));
    state.gen = 0;
    state.alive = state.grid.flat().reduce((a, b) => a + b, 0);
    state.acc = 0;
    state.t = 0;
    state.algo = Math.round(P(state.params, 'algo', 0));
  },

  step(state, dt) {
    const want = Math.round(P(state.params, 'algo', 0));
    if (want !== state.algo) {
      this.init(state);
      return;
    }
    const period = Math.max(P(state.params, 'stepDt', 0.12), 0.02);
    state.acc += dt;
    state.t += dt;
    const n = state.n;
    const algo = state.algo;
    while (state.acc >= period) {
      state.acc -= period;
      const next = Array.from({ length: n }, () => Array(n).fill(0));
      let alive = 0;
      for (let y = 0; y < n; y += 1) {
        for (let x = 0; x < n; x += 1) {
          let nb = 0;
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (!dx && !dy) continue;
              const yy = (y + dy + n) % n;
              const xx = (x + dx + n) % n;
              nb += state.grid[yy][xx];
            }
          }
          const live = state.grid[y][x];
          let v = 0;
          if (algo === 2) {
            // seeds: born on 2, never survive
            v = !live && nb === 2 ? 1 : 0;
          } else if (algo === 1) {
            // HighLife B36/S23
            v = live ? (nb === 2 || nb === 3 ? 1 : 0) : (nb === 3 || nb === 6 ? 1 : 0);
          } else {
            v = live ? (nb === 2 || nb === 3 ? 1 : 0) : (nb === 3 ? 1 : 0);
          }
          next[y][x] = v;
          alive += v;
        }
      }
      state.grid = next;
      state.alive = alive;
      state.gen += 1;
    }
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const n = state.n;
    const pad = 28;
    const cell = Math.min((W - pad * 2) / n, (H - pad * 2) / n);
    const ox = (W - cell * n) / 2;
    const oy = (H - cell * n) / 2;
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        if (!state.grid[y][x]) continue;
        ctx.fillStyle = C.body;
        ctx.fillRect(ox + x * cell, oy + y * cell, cell - 0.5, cell - 0.5);
      }
    }
    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText(`gen ${state.gen}`, 12, 20);
  },

  getReadouts(state) {
    return [
      { label: 'gen', value: String(state.gen) },
      { label: 'alive', value: String(state.alive) },
      { label: 'density', value: formatNum(state.alive / (state.n * state.n), 3) },
      { label: 't', value: `${formatNum(state.t, 2)} s` },
    ];
  },
};
