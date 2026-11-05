/**
 * Rasterize a model canvas enough to tell a sketch from a flat line.
 * Node has no DOM canvas; the probe records strokes into a bitmap.
 */
import { sketchKind } from '../lab/sketches.js';

function plot(pix, W, H, x, y) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
  pix[iy * W + ix] = 1;
}

function line(pix, W, H, x0, y0, x1, y1) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    plot(pix, W, H, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
  }
}

function columnRuns(pix, W, H, x) {
  const ix = Math.max(0, Math.min(W - 1, Math.round(x)));
  const runs = [];
  let start = -1;
  for (let y = 0; y < H; y += 1) {
    const on = pix[y * W + ix] === 1;
    if (on && start < 0) start = y;
    if (!on && start >= 0) {
      runs.push({ y0: start, y1: y - 1 });
      start = -1;
    }
  }
  if (start >= 0) runs.push({ y0: start, y1: H - 1 });
  return runs;
}

function makeCtx(pix, W, H, texts, segments) {
  let cx = 0;
  let cy = 0;
  let path = [];
  let dashed = false;
  return {
    fillStyle: '#fff',
    strokeStyle: '#fff',
    lineWidth: 1,
    font: '12px monospace',
    beginPath() { path = []; },
    moveTo(x, y) { cx = x; cy = y; path.push([x, y]); },
    lineTo(x, y) {
      line(pix, W, H, cx, cy, x, y);
      segments.push({ x0: cx, y0: cy, x1: x, y1: y, dashed });
      cx = x;
      cy = y;
      path.push([x, y]);
    },
    closePath() {
      if (path.length > 1) line(pix, W, H, path[path.length - 1][0], path[path.length - 1][1], path[0][0], path[0][1]);
    },
    stroke() {},
    fill() {
      for (let i = 1; i < path.length; i += 1) line(pix, W, H, path[i - 1][0], path[i - 1][1], path[i][0], path[i][1]);
    },
    arc(x, y, r) {
      const steps = 48;
      for (let i = 0; i <= steps; i += 1) {
        const a = (i / steps) * Math.PI * 2;
        plot(pix, W, H, x + r * Math.cos(a), y + r * Math.sin(a));
      }
    },
    ellipse(x, y, rx, ry) {
      const steps = 64;
      for (let i = 0; i <= steps; i += 1) {
        const a = (i / steps) * Math.PI * 2;
        plot(pix, W, H, x + rx * Math.cos(a), y + ry * Math.sin(a));
      }
    },
    fillRect(x, y, w, h) {
      line(pix, W, H, x, y, x + w, y);
      line(pix, W, H, x, y + h, x + w, y + h);
    },
    fillText(text) { texts.push(String(text)); },
    setLineDash(pattern) {
      dashed = Array.isArray(pattern) && pattern.some((n) => Number(n) > 0);
    },
    save() {},
    restore() {},
    setTransform() {},
    translate() {},
    scale() {},
    rotate() {},
  };
}

export function probeSketch(model, extra = {}) {
  const W = 240;
  const H = 220;
  const pix = new Uint8Array(W * H);
  const texts = [];
  const segments = [];
  const state = { params: { ...(model.params || {}), ...extra } };
  model.init(state);
  model.draw(makeCtx(pix, W, H, texts, segments), state, { width: W, height: H });
  let n = 0;
  let minY = H;
  let maxY = 0;
  const rows = new Set();
  for (let i = 0; i < pix.length; i += 1) {
    if (!pix[i]) continue;
    n += 1;
    const y = Math.floor(i / W);
    rows.add(y);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return {
    kind: sketchKind({ id: model.id, name: model.name, formula: model.formula }),
    n,
    rows: rows.size,
    dy: n ? maxY - minY : 0,
    texts,
    segments,
    columns: {
      left: columnRuns(pix, W, H, 36),
      mid: columnRuns(pix, W, H, 128),
      right: columnRuns(pix, W, H, 220),
    },
  };
}
