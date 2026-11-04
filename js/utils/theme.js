/**
 * 画布色板：UI 外壳黑白；模型语义色来自 data/palettes.json。
 * html.hc 时降饱和，便于高对比阅读。
 */
import paletteDoc from '../../data/palettes.json' with { type: 'json' };

let activeModelId = 'free-fall';

const NEUTRAL = { ...paletteDoc.neutral };
const MODEL = { ...paletteDoc.models };
const HC = paletteDoc.hc || { saturationScale: 0.42, lightnessBoost: 0.08 };

function hashHue(id) {
  let h = 0;
  for (let i = 0; i < String(id).length; i += 1) h = (h * 31 + String(id).charCodeAt(i)) >>> 0;
  return h % 360;
}

function synthPalette(modelId) {
  const hue = hashHue(modelId);
  const hex = (h, s, l) => {
    const c = hslToRgb(h / 360, s, l);
    return `#${((1 << 24) + (c.r << 16) + (c.g << 8) + c.b).toString(16).slice(1)}`;
  };
  return {
    swatch: hex(hue, 0.72, 0.55),
    body: hex(hue, 0.72, 0.55),
    body2: hex((hue + 40) % 360, 0.65, 0.45),
    accent: hex((hue + 180) % 360, 0.7, 0.55),
    vector: hex((hue + 120) % 360, 0.55, 0.6),
    trail: `hsla(${hue}, 70%, 55%, 0.4)`,
    legend: ['主体 body', '强调 accent', '矢量 vector'],
  };
}

export function setModelPalette(modelId) {
  activeModelId = modelId || 'free-fall';
}

export function getActiveModelId() {
  return activeModelId;
}

export function listModelIds() {
  return Object.keys(MODEL);
}

export function getModelSwatch(modelId) {
  const m = MODEL[modelId] || synthPalette(modelId);
  return m.swatch || m.body || '#ffffff';
}

export function getModelLegend(modelId = activeModelId) {
  const m = MODEL[modelId] || synthPalette(modelId);
  const colors = getModelColors(modelId);
  const entries = [];
  for (const line of m.legend || []) {
    const s = String(line);
    if (/hue|色相/.test(s)) {
      entries.push({ label: '轨迹', kind: 'hue' });
    } else if (/冷|色标|heat/i.test(s)) {
      entries.push({ label: '冷→热', kind: 'heat' });
    } else {
      const parts = s.trim().split(/\s+/);
      const key = parts[parts.length - 1];
      const label = parts.slice(0, -1).join(' ') || key;
      entries.push({ label, color: colors[key] || colors.body, kind: 'swatch' });
    }
  }
  return entries;
}

function parseHex(hex) {
  if (!hex || hex[0] !== '#') return null;
  const full = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  if (full.length !== 7) return null;
  const n = parseInt(full.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

/** contrast：降饱和 + 略提亮，保留色相 */
function desaturateHex(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.s *= HC.saturationScale;
  hsl.l = Math.min(0.92, hsl.l + HC.lightnessBoost);
  const out = hslToRgb(hsl.h, hsl.s, hsl.l);
  return `#${((1 << 24) + (out.r << 16) + (out.g << 8) + out.b).toString(16).slice(1)}`;
}

function desaturateCssColor(v) {
  if (typeof v !== 'string') return v;
  if (v.startsWith('#')) return desaturateHex(v);
  const rgba = v.match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const parts = rgba[1].split(',').map((s) => s.trim());
    const r = Number(parts[0]);
    const g = Number(parts[1]);
    const b = Number(parts[2]);
    const a = parts[3] != null ? Number(parts[3]) : 1;
    if (![r, g, b].every(Number.isFinite)) return v;
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    const d = parseHex(desaturateHex(hex));
    if (!d) return v;
    return `rgba(${d.r}, ${d.g}, ${d.b}, ${a})`;
  }
  return v;
}

export function getModelColors(modelId = activeModelId) {
  const hc = typeof document !== 'undefined'
    && document.documentElement.classList.contains('hc');
  const base = { ...NEUTRAL, ...(MODEL[modelId] || synthPalette(modelId)) };
  if (!hc) return base;
  const out = {};
  for (const [k, v] of Object.entries(base)) {
    out[k] = typeof v === 'string' ? desaturateCssColor(v) : v;
  }
  return out;
}

export function getColors() {
  return getModelColors(activeModelId);
}

export const C = new Proxy({}, {
  get(_t, prop) {
    return getModelColors(activeModelId)[prop];
  },
});

/** 热传导：蓝(冷) → 青 → 黄 → 红(热) */
export function heatTempColor(t, tMin, tMax) {
  const u = Math.max(0, Math.min(1, (t - tMin) / Math.max(1e-9, tMax - tMin)));
  let r; let g; let b;
  if (u < 0.33) {
    const s = u / 0.33;
    r = 30 + 20 * s;
    g = 80 + 120 * s;
    b = 200 - 40 * s;
  } else if (u < 0.66) {
    const s = (u - 0.33) / 0.33;
    r = 50 + 180 * s;
    g = 200 - 40 * s;
    b = 160 - 140 * s;
  } else {
    const s = (u - 0.66) / 0.34;
    r = 230 + 25 * s;
    g = 160 - 120 * s;
    b = 20 + 10 * s;
  }
  const hc = typeof document !== 'undefined'
    && document.documentElement.classList.contains('hc');
  if (hc) {
    const hex = desaturateHex(`#${((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1)}`);
    const p = parseHex(hex);
    if (p) return `rgb(${p.r},${p.g},${p.b})`;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/** 双摆轨迹：相空间 → 色相 */
export function phaseHueColor(theta, omega, alpha = 0.7) {
  const hue = ((theta * 180) / Math.PI + omega * 40 + 3600) % 360;
  let sat = 78;
  let light = 48 + 22 * Math.tanh(Math.abs(omega) * 0.25);
  const hc = typeof document !== 'undefined'
    && document.documentElement.classList.contains('hc');
  if (hc) {
    sat *= HC.saturationScale;
    light = Math.min(88, light + HC.lightnessBoost * 100);
  }
  return `hsla(${hue.toFixed(1)}, ${sat.toFixed(1)}%, ${light.toFixed(1)}%, ${alpha})`;
}

/** 在画布底部画导出用色板图例 */
export function drawPaletteLegend(ctx, x, y, width, modelId = activeModelId) {
  const entries = getModelLegend(modelId);
  if (!entries.length) return 0;
  const rowH = 16;
  let yy = y;
  ctx.save();
  ctx.font = '11px IBM Plex Mono, monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('palette', x, yy);
  yy += 14;
  for (const e of entries) {
    if (e.kind === 'hue') {
      for (let i = 0; i < 48; i += 1) {
        ctx.fillStyle = `hsl(${(i / 47) * 360}, 70%, 55%)`;
        ctx.fillRect(x + i * (Math.min(width, 160) / 48), yy - 8, Math.min(width, 160) / 48 + 1, 10);
      }
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(e.label, x + Math.min(width, 160) + 8, yy);
    } else if (e.kind === 'heat') {
      for (let i = 0; i < 48; i += 1) {
        ctx.fillStyle = heatTempColor(i, 0, 47);
        ctx.fillRect(x + i * (Math.min(width, 160) / 48), yy - 8, Math.min(width, 160) / 48 + 1, 10);
      }
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('冷→热', x + Math.min(width, 160) + 8, yy);
    } else {
      ctx.fillStyle = e.color || '#fff';
      ctx.beginPath();
      ctx.arc(x + 5, yy - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(e.label, x + 16, yy);
    }
    yy += rowH;
  }
  ctx.restore();
  return yy - y;
}
