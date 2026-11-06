/**
 * principle 模型 ink density < 1% 静态表（与 data/principle-low-ink.json 同步）。
 * 仅对这些 id 做「内建曲线加粗」（无墨点网格）。
 * 更新：npm run gen:low-ink | npm run gen:low-ink:tighten
 * KEEP IN SYNC: applyLowInkStrokeBoost must match scripts/gen-low-ink.mjs template
 * (guard missing strokeRect/fillRect on probe canvases).
 */
export const LOW_INK_THRESHOLD = 0.01;

export const LOW_INK_IDS = new Set([
  'active-filter',
  'adder',
  'airfoil-aero',
  'asm-simple',
  'cstr',
  'free-fall',
  'hodgkin-huxley',
  'lens',
  'logic-gates',
  'logistic-growth',
  'nasch-ca',
  'neutron-diffusion',
  'opamp-configs',
  'phugoid-short',
  'pid-tune',
  'queue-mmc',
  'r066-凸轮',
  'r066-四杆',
  'r066-曲柄滑块',
  'rc-circuit',
  'rc-rl-filter',
  'root-locus',
  'rossler',
  'step-response',
  'supply-demand',
  'titration-curve',
  'vortex-lattice',
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
