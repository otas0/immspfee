#!/usr/bin/env node
/**
 * 从 artifacts/contract-browser.json 更新 data/principle-low-ink.json + js/lab/lowInkIds.js
 * 默认并集；--tighten 只留本轮 ink<1%。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = path.join(root, 'artifacts/contract-browser.json');
const outJson = path.join(root, 'data/principle-low-ink.json');
const outJs = path.join(root, 'js/lab/lowInkIds.js');
const THRESHOLD = 0.01;
/** Also fold principle ink &lt; 1.5% (sparse band) so CI flakes around 1% need less hand edits. */
const SPARSE_UNION = 0.015;
const tighten = process.argv.includes('--tighten');

if (!fs.existsSync(reportPath)) {
  console.error('缺少 artifacts/contract-browser.json — 先跑 npm run test:contract-browser');
  process.exit(1);
}

const j = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const principleRows = (j.report || []).filter((r) => (r.fidelity || 'principle') === 'principle');
const sampledLow = principleRows
  .filter((r) => (r.inkDensity || 0) < THRESHOLD)
  .map((r) => r.id);
const sampledSparse = principleRows
  .filter((r) => (r.inkDensity || 0) < SPARSE_UNION)
  .map((r) => r.id);
// Prefer principleInk.sparse from the contract payload when present.
const reportSparse = Array.isArray(j.principleInk?.sparse) ? j.principleInk.sparse : [];

let prev = [];
try {
  prev = JSON.parse(fs.readFileSync(outJson, 'utf8')).ids || [];
} catch { /* first */ }

const unionExtra = [...sampledLow, ...sampledSparse, ...reportSparse];
const ids = [...new Set(tighten ? sampledLow : [...prev, ...unionExtra])].sort();
fs.writeFileSync(outJson, `${JSON.stringify({
  threshold: THRESHOLD,
  sparseUnion: SPARSE_UNION,
  source: 'artifacts/contract-browser.json',
  generatedAt: new Date().toISOString(),
  mode: tighten ? 'tighten' : 'union',
  n: ids.length,
  sampledLowInk: sampledLow,
  sampledSparseInk: sampledSparse,
  ids,
}, null, 2)}\n`);

const idLines = ids.map((id) => `  '${String(id).replace(/'/g, "\\'")}',`).join('\n');
fs.writeFileSync(outJs, `/**
 * principle 模型 ink density < 1% 静态表（与 data/principle-low-ink.json 同步）。
 * 仅对这些 id 做「内建曲线加粗」（无墨点网格）。
 * 更新：npm run gen:low-ink | npm run gen:low-ink:tighten
 * KEEP IN SYNC: applyLowInkStrokeBoost must match scripts/gen-low-ink.mjs template
 * (guard missing strokeRect/fillRect on probe canvases).
 */
export const LOW_INK_THRESHOLD = ${THRESHOLD};

export const LOW_INK_IDS = new Set([
${idLines}
]);

export function shouldBoostStroke(modelId) {
  return !!modelId && LOW_INK_IDS.has(modelId);
}

/** 内建曲线加粗：衬底描边 + 主描边加宽 + 细填充条加粗（无墨点网格） */
export function applyLowInkStrokeBoost(model) {
  if (!model || typeof model.draw !== 'function') return model;
  if (!shouldBoostStroke(model.id)) return model;
  if (model._lowInkBoosted) return model;
  const draw0 = model.draw.bind(model);
  model.draw = (ctx, state, view) => {
    // Probe/unit canvases may omit strokeRect / fillRect — only wrap what exists.
    const stroke0 = typeof ctx.stroke === 'function' ? ctx.stroke.bind(ctx) : null;
    const strokeRect0 = typeof ctx.strokeRect === 'function' ? ctx.strokeRect.bind(ctx) : null;
    const fillRect0 = typeof ctx.fillRect === 'function' ? ctx.fillRect.bind(ctx) : null;
    if (stroke0) {
      ctx.stroke = (...a) => {
        const lw = Number(ctx.lineWidth) || 1;
        const alpha = ctx.globalAlpha;
        ctx.lineWidth = Math.max(lw * 4.2, 5);
        ctx.globalAlpha = Math.min(1, alpha * 0.22);
        stroke0(...a);
        ctx.globalAlpha = alpha;
        ctx.lineWidth = Math.max(lw * 2.8, 3.2);
        stroke0(...a);
        ctx.lineWidth = lw;
      };
    }
    if (strokeRect0) {
      ctx.strokeRect = (...a) => {
        const lw = Number(ctx.lineWidth) || 1;
        const alpha = ctx.globalAlpha;
        ctx.lineWidth = Math.max(lw * 3.5, 4);
        ctx.globalAlpha = Math.min(1, alpha * 0.25);
        strokeRect0(...a);
        ctx.globalAlpha = alpha;
        ctx.lineWidth = Math.max(lw * 2.4, 2.8);
        strokeRect0(...a);
        ctx.lineWidth = lw;
      };
    }
    if (fillRect0) {
      ctx.fillRect = (x, y, w, h) => {
        if (Math.abs(w) < 3 && Math.abs(h) > 6) fillRect0(x - 1, y, w + (w >= 0 ? 2 : -2), h);
        else if (Math.abs(h) < 3 && Math.abs(w) > 6) fillRect0(x, y - 1, w, h + (h >= 0 ? 2 : -2));
        else fillRect0(x, y, w, h);
      };
    }
    try { draw0(ctx, state, view); }
    finally {
      if (stroke0) ctx.stroke = stroke0;
      if (strokeRect0) ctx.strokeRect = strokeRect0;
      if (fillRect0) ctx.fillRect = fillRect0;
    }
  };
  model._lowInkBoosted = true;
  return model;
}
`);
console.log(
  `low-ink mode=${tighten ? 'tighten' : 'union'} n=${ids.length}`
  + ` sampledLow=${sampledLow.length} sparse<${SPARSE_UNION}=${sampledSparse.length}`,
);
console.log(ids.join(', ') || '(none)');
