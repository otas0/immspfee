/**
 * 树/图布局（eigenvue / Algorithm Visualizer 思路，纯 Canvas 坐标，无 DOM）。
 * 输出屏幕坐标，供 draw / onPointer 复用。
 */

/** 力导向一步（可多帧调用） */
export function forceGraphStep(nodes, edges, { W = 400, H = 300, pad = 36, repulsion = 800, spring = 0.02, rest = 80 } = {}) {
  const n = nodes.length;
  const fx = new Float64Array(n);
  const fy = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      let dx = nodes[j].x - nodes[i].x;
      let dy = nodes[j].y - nodes[i].y;
      let d2 = dx * dx + dy * dy || 1e-4;
      const f = repulsion / d2;
      const inv = Math.sqrt(d2);
      dx /= inv; dy /= inv;
      fx[i] -= f * dx; fy[i] -= f * dy;
      fx[j] += f * dx; fy[j] += f * dy;
    }
  }
  for (const e of edges) {
    const a = e.a ?? e.source;
    const b = e.b ?? e.target;
    if (a == null || b == null) continue;
    let dx = nodes[b].x - nodes[a].x;
    let dy = nodes[b].y - nodes[a].y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1e-4;
    const f = spring * (dist - (e.rest ?? rest));
    dx /= dist; dy /= dist;
    fx[a] += f * dx; fy[a] += f * dy;
    fx[b] -= f * dx; fy[b] -= f * dy;
  }
  for (let i = 0; i < n; i += 1) {
    nodes[i].x = Math.max(pad, Math.min(W - pad, nodes[i].x + fx[i] * 0.02));
    nodes[i].y = Math.max(pad, Math.min(H - pad, nodes[i].y + fy[i] * 0.02));
  }
  return nodes;
}

/** 层次树：根在上，子节点均分宽度 */
export function layoutTree(root, { x0 = 40, y0 = 40, x1 = 400, levelH = 64 } = {}) {
  const nodes = [];
  const links = [];
  function walk(node, depth, left, right, parentId) {
    const id = nodes.length;
    const x = (left + right) / 2;
    const y = y0 + depth * levelH;
    nodes.push({ id, label: node.label ?? node.name ?? String(id), x, y, data: node });
    if (parentId != null) links.push({ a: parentId, b: id });
    const kids = node.children || node.kids || [];
    if (!kids.length) return id;
    const span = (right - left) / kids.length;
    kids.forEach((ch, i) => walk(ch, depth + 1, left + i * span, left + (i + 1) * span, id));
    return id;
  }
  walk(root, 0, x0, x1, null);
  return { nodes, links };
}

/** 圆环布局（图算法默认） */
export function layoutRing(n, { cx, cy, r }) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { i, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}

/** 规范化：把 0..1 节点坐标映射到画布 */
export function mapNormToScreen(nodes, W, H, pad = 36) {
  return nodes.map((n, i) => ({
    ...n,
    i: n.i ?? i,
    sx: pad + (n.x ?? 0.5) * (W - pad * 2),
    sy: pad + (n.y ?? 0.5) * (H - pad * 2),
  }));
}

/** 画边 + 节点（高亮集合可选） */
export function paintGraph(ctx, screenNodes, edges, {
  highlight = new Set(),
  path = [],
  edgeColor = 'rgba(100,100,100,0.7)',
  nodeColor = '#888',
  accent = '#fff',
  r = 10,
} = {}) {
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = edgeColor;
  for (const e of edges) {
    const a = screenNodes[e.a ?? e.source];
    const b = screenNodes[e.b ?? e.target];
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.sx ?? a.x, a.sy ?? a.y);
    ctx.lineTo(b.sx ?? b.x, b.sy ?? b.y);
    ctx.stroke();
  }
  if (path.length > 1) {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    path.forEach((i, k) => {
      const p = screenNodes[i];
      if (!p) return;
      const x = p.sx ?? p.x; const y = p.sy ?? p.y;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  }
  screenNodes.forEach((p, i) => {
    const x = p.sx ?? p.x; const y = p.sy ?? p.y;
    ctx.fillStyle = highlight.has(i) ? accent : nodeColor;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}
