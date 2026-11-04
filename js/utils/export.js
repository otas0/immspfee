import { drawPaletteLegend, getActiveModelId } from './theme.js';

/** 下载 Canvas PNG；可选机箱外框 + 读数 + 色板图例 */
export function downloadCanvasPng(canvas, filename = 'physics-lab.png', opts = {}) {
  const framed = !!opts.framed;
  const readouts = opts.readouts || null;
  const legend = !!opts.legend;
  const modelId = opts.modelId || getActiveModelId();
  const source = (framed || readouts || legend)
    ? composeExport(canvas, { framed, readouts, legend, modelId })
    : canvas;
  source.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

/** 合成导出画布（供测试 / 验收） */
export function composeExport(canvas, {
  framed = false,
  readouts = null,
  legend = false,
  modelId = getActiveModelId(),
} = {}) {
  const pad = framed ? 28 : 12;
  const readoutH = readouts?.length ? 28 + readouts.length * 22 : 0;
  const legendH = legend ? 22 + 5 * 16 : (framed && !readouts?.length ? 36 : 0);
  const footer = readoutH + legendH;
  const w = canvas.width + pad * 2;
  const h = canvas.height + pad * 2 + footer;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');

  ctx.fillStyle = framed ? '#f2f2f2' : '#000';
  if (framed) {
    roundRect(ctx, 0, 0, w, h, 18);
    ctx.fill();
    ctx.fillStyle = '#000';
    roundRect(ctx, pad - 4, pad - 4, canvas.width + 8, canvas.height + 8, 10);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, w, h);
  }

  ctx.drawImage(canvas, pad, pad);

  let y = pad + canvas.height + 18;
  ctx.fillStyle = framed ? '#000' : '#fff';
  ctx.font = '500 16px "IBM Plex Mono", monospace';
  if (framed && !readouts?.length && !legend) {
    ctx.fillText('physics lab', pad, h - 12);
  }
  if (readouts?.length) {
    ctx.font = '500 15px "IBM Plex Mono", monospace';
    for (const r of readouts) {
      ctx.fillText(`${r.label}: ${r.value}`, pad, y);
      y += 22;
    }
  }
  if (legend) {
    if (framed) ctx.fillStyle = '#333';
    drawPaletteLegend(ctx, pad, y, canvas.width * 0.55, modelId);
  }
  return out;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function downloadCsv(rows, filename = 'trajectory.csv') {
  if (!rows || !rows.length) return;
  const keys = Object.keys(rows[0]);
  const lines = [keys.join(',')];
  for (const row of rows) {
    lines.push(keys.map((k) => {
      const v = row[k];
      return typeof v === 'number' && Number.isFinite(v) ? String(v) : `"${String(v ?? '')}"`;
    }).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
