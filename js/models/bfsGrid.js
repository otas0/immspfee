import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** 网格寻路：BFS / A* 对照（计算机科学） */
export default {
  id: 'bfs-grid',
  name: 'BFS / A* 寻路',
  params: {
    cols: 18, rows: 12, wallDensity: 0.22, stepDt: 0.05, seed: 7, algo: 0, // 0 BFS 1 A*
  },
  paramSchema: {
    cols: { group: 'numerics', unit: '', label: 'cols', min: 8, max: 40 },
    rows: { group: 'numerics', unit: '', label: 'rows', min: 6, max: 30 },
    wallDensity: { group: 'initial', unit: '', label: 'walls', min: 0, max: 0.45 },
    stepDt: { group: 'dynamics', unit: 's', label: 'stepDt', min: 0.02, max: 0.3 },
    seed: { group: 'initial', unit: '', label: 'seed', min: 1, max: 9999 },
    algo: { group: 'dynamics', unit: '', label: 'algo 0BFS/1A*', min: 0, max: 1 },
  },

  init(state) {
    const cols = Math.floor(P(state.params, 'cols', 16));
    const rows = Math.floor(P(state.params, 'rows', 12));
    const dens = P(state.params, 'wallDensity', 0.2);
    let s = Math.floor(P(state.params, 'seed', 1)) || 1;
    const rnd = () => {
      s = (s * 48271) % 2147483647;
      return (s - 1) / 2147483646;
    };
    state.cols = cols;
    state.rows = rows;
    state.algo = Math.round(P(state.params, 'algo', 0)) >= 1 ? 1 : 0;
    state.grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if ((x === 0 && y === 0) || (x === cols - 1 && y === rows - 1)) continue;
        if (rnd() < dens) state.grid[y][x] = 1;
      }
    }
    state.start = { x: 0, y: 0 };
    state.goal = { x: cols - 1, y: rows - 1 };
    state.visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    state.parent = Array.from({ length: rows }, () => Array(cols).fill(null));
    state.gScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
    state.gScore[0][0] = 0;
    state.queue = [{ x: 0, y: 0, f: heuristic({ x: 0, y: 0 }, state.goal) }];
    state.visited[0][0] = true;
    state.found = false;
    state.path = [];
    state.expanded = 0;
    state.acc = 0;
    state.t = 0;
    state.done = false;
  },

  step(state, dt) {
    const want = Math.round(P(state.params, 'algo', 0)) >= 1 ? 1 : 0;
    if (want !== state.algo) {
      this.init(state);
      return;
    }
    if (state.done) return;
    const period = Math.max(P(state.params, 'stepDt', 0.05), 0.01);
    state.acc += dt;
    state.t += dt;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (state.acc >= period && !state.done) {
      state.acc -= period;
      if (state.found) {
        if (!state.path.length) {
          let cur = state.goal;
          while (cur) {
            state.path.push(cur);
            cur = state.parent[cur.y][cur.x];
          }
          state.path.reverse();
        }
        state.done = true;
        break;
      }
      if (!state.queue.length) {
        state.done = true;
        break;
      }
      let cur;
      if (state.algo === 0) {
        cur = state.queue.shift();
      } else {
        let best = 0;
        for (let i = 1; i < state.queue.length; i += 1) {
          if (state.queue[i].f < state.queue[best].f) best = i;
        }
        cur = state.queue.splice(best, 1)[0];
      }
      state.expanded += 1;
      if (cur.x === state.goal.x && cur.y === state.goal.y) {
        state.found = true;
        continue;
      }
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (nx < 0 || ny < 0 || nx >= state.cols || ny >= state.rows) continue;
        if (state.grid[ny][nx] === 1) continue;
        const tentG = state.gScore[cur.y][cur.x] + 1;
        if (tentG >= state.gScore[ny][nx]) continue;
        state.gScore[ny][nx] = tentG;
        state.parent[ny][nx] = { x: cur.x, y: cur.y };
        const f = tentG + heuristic({ x: nx, y: ny }, state.goal);
        if (!state.visited[ny][nx]) {
          state.visited[ny][nx] = true;
          state.queue.push({ x: nx, y: ny, f });
        } else if (state.algo === 1) {
          // A*: allow decrease-key via re-push (simple)
          state.queue.push({ x: nx, y: ny, f });
        }
      }
    }
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 36;
    const cw = (W - pad * 2) / state.cols;
    const ch = (H - pad * 2) / state.rows;
    for (let y = 0; y < state.rows; y += 1) {
      for (let x = 0; x < state.cols; x += 1) {
        const px = pad + x * cw;
        const py = pad + y * ch;
        if (state.grid[y][x] === 1) ctx.fillStyle = C.ground;
        else if (state.path.some((p) => p.x === x && p.y === y)) ctx.fillStyle = C.accent;
        else if (state.visited[y][x]) ctx.fillStyle = C.body2;
        else ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(px + 1, py + 1, cw - 2, ch - 2);
      }
    }
    const paintCell = (c, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(pad + c.x * cw + 2, pad + c.y * ch + 2, cw - 4, ch - 4);
    };
    paintCell(state.start, C.vector);
    paintCell(state.goal, C.body);
    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    const algo = state.algo === 1 ? 'A*' : 'BFS';
    ctx.fillText(state.found ? `${algo} · path` : (state.done ? `${algo} · no path` : `${algo} · searching…`), 12, 22);
  },

  getReadouts(state) {
    return [
      { label: 'algo', value: state.algo === 1 ? 'A*' : 'BFS' },
      { label: 'expanded', value: String(state.expanded) },
      { label: 'frontier', value: String(state.queue.length) },
      { label: 'path', value: state.found ? String(state.path.length) : '—' },
    ];
  },
};

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
