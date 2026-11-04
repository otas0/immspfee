import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

/** 网格寻路：BFS / A* 对照（计算机科学） */
export default {
  id: 'bfs-grid',
  name: 'BFS / A* 寻路',
  capabilities: {
    pointer: true,
    interaction: 'canvas',
    formalism: 'network',
    viz: 'algo-step',
    fidelity: 'principle',
    hint: '左键起/终点；右键拖墙（Shift=只刷墙 · Alt=只擦通路）',
    actions: [
      { id: 'step', label: '单步扩展' },
      { id: 'reset', label: '重置网格' },
    ],
  },
  params: {
    cols: 18, rows: 12, wallDensity: 0.22, stepDt: 0.05, seed: 7, algo: 0, // 0 BFS 1 A*
  },
  paramSchema: {
    cols: { group: 'numerics', unit: '—', label: '列数', min: 8, max: 40 },
    rows: { group: 'numerics', unit: '—', label: '行数', min: 6, max: 30 },
    wallDensity: { group: 'initial', unit: '—', label: '墙密度', min: 0, max: 0.45 },
    stepDt: { group: 'dynamics', unit: 's', label: '步进间隔', min: 0.02, max: 0.3 },
    seed: { group: 'initial', unit: '—', label: '随机种子', min: 1, max: 9999 },
    algo: {
      group: 'dynamics', unit: '—', label: '算法', min: 0, max: 1,
      options: [
        { value: 0, label: 'BFS' },
        { value: 1, label: 'A*' },
      ],
    },
  },

  runAction(state, actionId) {
    if (actionId === 'reset') {
      this.init(state);
      return true;
    }
    if (actionId === 'step') {
      if (state.done) return false;
      expandOnce(state);
      state._cur = state._lastCur || null;
      return true;
    }
    return false;
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
    while (state.acc >= period && !state.done) {
      state.acc -= period;
      expandOnce(state);
    }
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 36;
    const cw = (W - pad * 2) / state.cols;
    const ch = (H - pad * 2) / state.rows;
    state._gridHit = { pad, cw, ch };
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
    if (state._lastCur) {
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        pad + state._lastCur.x * cw + 1,
        pad + state._lastCur.y * ch + 1,
        cw - 2,
        ch - 2,
      );
    }
    ctx.fillStyle = C.muted;
    ctx.font = '11px IBM Plex Mono, monospace';
    const algo = state.algo === 1 ? 'A*' : 'BFS';
    ctx.fillText(
      state.found
        ? `${algo} · path`
        : (state.done ? `${algo} · no path` : `${algo} · 点选起/终点 · step`),
      12,
      22,
    );
  },

  onPointer(state, ev) {
    const g = state._gridHit;
    if (!g) return false;
    const col = Math.floor((ev.x - g.pad) / g.cw);
    const row = Math.floor((ev.y - g.pad) / g.ch);
    const inGrid = col >= 0 && row >= 0 && col < state.cols && row < state.rows;

    const paintWallAt = (c, r) => {
      if (c < 0 || r < 0 || c >= state.cols || r >= state.rows) return false;
      const isStart = state.start?.x === c && state.start?.y === r;
      const isGoal = state.goal?.x === c && state.goal?.y === r;
      if (isStart || isGoal) return false;
      if (state.grid[r][c] === state._paintValue) return false;
      state.grid[r][c] = state._paintValue;
      state._paintDirty = true;
      return true;
    };

    if (ev.type === 'up') {
      if (state._paintWall) {
        state._paintWall = false;
        if (state._paintDirty) restartSearch(state);
        state._paintDirty = false;
        return true;
      }
      return false;
    }

    if (ev.type === 'move') {
      if (!state._paintWall || !inGrid) return !!state._paintWall;
      paintWallAt(col, row);
      return true;
    }

    if (ev.type !== 'down' || !inGrid) return false;

    // 右键 / 中键：拖动画墙；Shift=只刷墙(1)，Alt=只擦通路(0)；否则首格决定
    if (ev.button === 2 || ev.button === 1) {
      const isStart = state.start?.x === col && state.start?.y === row;
      const isGoal = state.goal?.x === col && state.goal?.y === row;
      if (!isStart && !isGoal) {
        if (ev.shiftKey) {
          state._paintValue = 1;
          state._lastPaintMode = '刷墙';
        } else if (ev.altKey) {
          state._paintValue = 0;
          state._lastPaintMode = '擦除';
        } else {
          state._paintValue = state.grid[row][col] === 1 ? 0 : 1;
          state._lastPaintMode = '切换';
        }
        state._paintWall = true;
        state._paintDirty = false;
        paintWallAt(col, row);
      }
      return true;
    }

    state._paintWall = false;
    if (state.grid[row][col] === 1) return true; // 墙忽略左键
    if (!state._setPhase || state._setPhase === 'start') {
      state.start = { x: col, y: row };
      state._setPhase = 'goal';
      restartSearch(state);
      return true;
    }
    state.goal = { x: col, y: row };
    state._setPhase = 'start';
    restartSearch(state);
    return true;
  },

  getReadouts(state) {
    let paintMode = '—';
    if (state._paintWall) {
      paintMode = state._paintValue === 1 ? '刷墙' : state._paintValue === 0 ? '擦除' : '切换';
    } else if (state._lastPaintMode) {
      paintMode = state._lastPaintMode;
    }
    return [
      { label: 'algo', value: state.algo === 1 ? 'A*' : 'BFS' },
      { label: '画墙', value: paintMode },
      { label: 'expanded', value: String(state.expanded) },
      { label: 'frontier', value: String(state.queue.length) },
      { label: 'path', value: state.found ? String(state.path.length) : '—' },
    ];
  },
};

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** 保留墙与起终点，只重置搜索状态 */
function restartSearch(state) {
  const { cols, rows, start, goal } = state;
  state.visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  state.parent = Array.from({ length: rows }, () => Array(cols).fill(null));
  state.gScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  state.gScore[start.y][start.x] = 0;
  state.queue = [{ x: start.x, y: start.y, f: heuristic(start, goal) }];
  state.visited[start.y][start.x] = true;
  state.found = false;
  state.path = [];
  state.expanded = 0;
  state.acc = 0;
  state.done = false;
  state._lastCur = null;
}

function expandOnce(state) {
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
    return;
  }
  if (!state.queue.length) {
    state.done = true;
    return;
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
  state._lastCur = cur;
  state.expanded += 1;
  if (cur.x === state.goal.x && cur.y === state.goal.y) {
    state.found = true;
    return;
  }
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
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
      state.queue.push({ x: nx, y: ny, f });
    }
  }
}
