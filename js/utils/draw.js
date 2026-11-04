/** 绘制箭头（从 (x,y) 指向 tip） */
export function drawArrow(ctx, x, y, tipX, tipY, color = '#2dd4bf', width = 2) {
  const dx = tipX - x;
  const dy = tipY - y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(10, len * 0.35);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - ux * head - uy * head * 0.45, tipY - uy * head + ux * head * 0.45);
  ctx.lineTo(tipX - ux * head + uy * head * 0.45, tipY - uy * head - ux * head * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 折线式弹簧：从 (x0,y) 到 (x1,y) */
export function drawZigZagSpring(ctx, x0, y, x1, coils = 12, amp = 10) {
  const n = Math.max(4, coils * 2);
  ctx.beginPath();
  ctx.moveTo(x0, y);
  for (let i = 1; i < n; i += 1) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const sign = i % 2 === 0 ? 1 : -1;
    ctx.lineTo(x, y + sign * amp);
  }
  ctx.lineTo(x1, y);
  ctx.stroke();
}

export function formatNum(v, digits = 3) {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e4 || a < 1e-3)) return v.toExponential(2);
  return v.toFixed(digits);
}
