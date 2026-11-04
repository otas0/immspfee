/**
 * 画布色板：界面外壳仍为黑白；各模型用语义色区分物理对象。
 * html.hc 时提高亮度，保持色相可读。
 */

let activeModelId = 'free-fall';

const NEUTRAL = {
  axis: '#5c6570',
  ground: '#6b7280',
  muted: '#94a3b8',
  theory: '#64748b',
  text: '#94a3b8',
  bg: '#000000',
  flash: 'rgba(255, 220, 100, 0.45)',
};

/** 按模型语义着色 */
const MODEL = {
  'free-fall': {
    body: '#f0b429',       // 球：琥珀
    body2: '#d97706',
    accent: '#fb7185',
    vector: '#2dd4bf',     // 速度：青绿
    trail: 'rgba(240, 180, 41, 0.4)',
  },
  projectile: {
    body: '#fb923c',       // 弹体 / 轨迹
    body2: '#ea580c',
    accent: '#60a5fa',     // vy
    vector: '#34d399',     // vx
    trail: 'rgba(251, 146, 60, 0.45)',
    theory: '#94a3b8',
  },
  spring: {
    body: '#f43f5e',       // 质量块
    body2: '#14b8a6',      // 弹簧
    accent: '#fbbf24',
    vector: '#fde68a',
    trail: 'rgba(244, 63, 94, 0.35)',
  },
  pendulum: {
    body: '#f97316',       // 摆球
    body2: '#c2410c',
    accent: '#4ade80',     // 切向速度
    vector: '#818cf8',     // 摆杆
    trail: 'rgba(249, 115, 22, 0.4)',
  },
  collision: {
    body: '#fbbf24',       // m2 描边 / 高光
    body2: '#ef4444',      // m2 填充
    accent: '#fbbf24',
    vector: '#3b82f6',     // m1
    trail: 'rgba(59, 130, 246, 0.35)',
    flash: 'rgba(250, 204, 21, 0.5)',
  },
  'double-pendulum': {
    body: '#a78bfa',       // 质点 1
    body2: '#7c3aed',
    accent: '#fb7185',     // 质点 2
    vector: '#cbd5e1',     // 连杆
    trail: 'rgba(167, 139, 250, 0.4)',
  },
  wave: {
    body: '#22d3ee',       // 波形
    body2: '#0891b2',
    accent: '#a5f3fc',
    vector: '#67e8f9',     // 质点
    trail: 'rgba(34, 211, 238, 0.35)',
    ground: '#6366f1',     // 端点固定座
    theory: 'rgba(148, 163, 184, 0.55)',
  },
  heat: {
    body: '#fb923c',       // T(x) 曲线
    body2: '#ea580c',
    accent: '#ef4444',
    vector: '#38bdf8',
    trail: 'rgba(251, 146, 60, 0.35)',
  },
};

export function setModelPalette(modelId) {
  activeModelId = MODEL[modelId] ? modelId : 'free-fall';
}

export function getActiveModelId() {
  return activeModelId;
}

function lightenHex(hex, amt = 0.18) {
  if (!hex || hex[0] !== '#' || (hex.length !== 7 && hex.length !== 4)) return hex;
  const full = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const n = parseInt(full.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  r = Math.min(255, Math.round(r + (255 - r) * amt));
  g = Math.min(255, Math.round(g + (255 - g) * amt));
  b = Math.min(255, Math.round(b + (255 - b) * amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function getModelColors(modelId = activeModelId) {
  const hc = typeof document !== 'undefined'
    && document.documentElement.classList.contains('hc');
  const base = { ...NEUTRAL, ...(MODEL[modelId] || MODEL['free-fall']) };
  if (!hc) return base;
  const out = { ...base };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (typeof v === 'string' && v.startsWith('#') && v.length >= 4) {
      out[k] = lightenHex(v, 0.22);
    }
  }
  return out;
}

export function getColors() {
  return getModelColors(activeModelId);
}

/** 运行时取当前模型色（跟随 activeModelId + html.hc） */
export const C = new Proxy({}, {
  get(_t, prop) {
    return getModelColors(activeModelId)[prop];
  },
});

/** 热传导：蓝(冷) → 青 → 黄 → 红(热) */
export function heatTempColor(t, tMin, tMax) {
  const u = Math.max(0, Math.min(1, (t - tMin) / Math.max(1e-9, tMax - tMin)));
  // 分段 RGB
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
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/** 双摆轨迹：相空间 → 色相 */
export function phaseHueColor(theta, omega, alpha = 0.7) {
  const hue = ((theta * 180) / Math.PI + omega * 40 + 3600) % 360;
  const light = 48 + 22 * Math.tanh(Math.abs(omega) * 0.25);
  return `hsla(${hue.toFixed(1)}, 78%, ${light.toFixed(1)}%, ${alpha})`;
}
