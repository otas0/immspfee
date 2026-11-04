/**
 * principle 模型 ink density < 1% 静态表（与 data/principle-low-ink.json 同步）。
 * 仅对这些 id 做「内建曲线加粗」（无墨点网格）。
 * 更新：npm run gen:low-ink | npm run gen:low-ink:tighten
 */
export const LOW_INK_THRESHOLD = 0.01;

export const LOW_INK_IDS = new Set([
  'active-filter',
  'adder',
  'airfoil-aero',
  'asm-simple',
  'cstr',
  'hodgkin-huxley',
  'logistic-growth',
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
    const stroke0 = ctx.stroke.bind(ctx);
    const strokeRect0 = ctx.strokeRect.bind(ctx);
    const fillRect0 = ctx.fillRect.bind(ctx);
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
    ctx.fillRect = (x, y, w, h) => {
      if (Math.abs(w) < 3 && Math.abs(h) > 6) fillRect0(x - 1, y, w + (w >= 0 ? 2 : -2), h);
      else if (Math.abs(h) < 3 && Math.abs(w) > 6) fillRect0(x, y - 1, w, h + (h >= 0 ? 2 : -2));
      else fillRect0(x, y, w, h);
    };
    try { draw0(ctx, state, view); }
    finally {
      ctx.stroke = stroke0;
      ctx.strokeRect = strokeRect0;
      ctx.fillRect = fillRect0;
    }
  };
  model._lowInkBoosted = true;
  return model;
}
