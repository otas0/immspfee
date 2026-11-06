// js/utils/graphLayout.js
function forceGraphStep(nodes, edges, { W = 400, H = 300, pad = 36, repulsion = 800, spring = 0.02, rest = 80 } = {}) {
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
      dx /= inv;
      dy /= inv;
      fx[i] -= f * dx;
      fy[i] -= f * dy;
      fx[j] += f * dx;
      fy[j] += f * dy;
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
    dx /= dist;
    dy /= dist;
    fx[a] += f * dx;
    fy[a] += f * dy;
    fx[b] -= f * dx;
    fy[b] -= f * dy;
  }
  for (let i = 0; i < n; i += 1) {
    nodes[i].x = Math.max(pad, Math.min(W - pad, nodes[i].x + fx[i] * 0.02));
    nodes[i].y = Math.max(pad, Math.min(H - pad, nodes[i].y + fy[i] * 0.02));
  }
  return nodes;
}
function mapNormToScreen(nodes, W, H, pad = 36) {
  return nodes.map((n, i) => ({
    ...n,
    i: n.i ?? i,
    sx: pad + (n.x ?? 0.5) * (W - pad * 2),
    sy: pad + (n.y ?? 0.5) * (H - pad * 2)
  }));
}
function paintGraph(ctx, screenNodes, edges, {
  highlight = /* @__PURE__ */ new Set(),
  path = [],
  edgeColor = "rgba(100,100,100,0.7)",
  nodeColor = "#888",
  accent = "#fff",
  r = 10
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
      const x = p.sx ?? p.x;
      const y = p.sy ?? p.y;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  }
  screenNodes.forEach((p, i) => {
    const x = p.sx ?? p.x;
    const y = p.sy ?? p.y;
    ctx.fillStyle = highlight.has(i) ? accent : nodeColor;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

export {
  forceGraphStep,
  mapNormToScreen,
  paintGraph
};
