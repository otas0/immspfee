/**
 * Canvas DPR 自适应与尺寸同步。
 * 返回逻辑像素尺寸（CSS 像素），绘制时用 ctx 已缩放坐标系。
 */
/** @param {{ forceDpr?: number }} [opts] 导出时 forceDpr=2 固定基线 */
export function resizeCanvas(canvas, container, opts = {}) {
  const capRaw = typeof document !== 'undefined'
    ? Number(document.documentElement?.dataset?.dprCap)
    : NaN;
  const cap = Number.isFinite(capRaw) && capRaw > 0 ? capRaw : 2.5;
  const dpr = opts.forceDpr
    || Math.max(1, Math.min(window.devicePixelRatio || 1, cap));
  const rect = container.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  const bw = Math.floor(width * dpr);
  const bh = Math.floor(height * dpr);

  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height, dpr, ctx };
}
