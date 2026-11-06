// js/utils/draw.js
function drawArrow(ctx, x, y, tipX, tipY, color = "#2dd4bf", width = 2) {
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
function drawZigZagSpring(ctx, x0, y, x1, coils = 12, amp = 10) {
  const n = Math.max(4, coils * 2);
  ctx.beginPath();
  ctx.moveTo(x0, y);
  for (let i = 1; i < n; i += 1) {
    const t2 = i / n;
    const x = x0 + (x1 - x0) * t2;
    const sign = i % 2 === 0 ? 1 : -1;
    ctx.lineTo(x, y + sign * amp);
  }
  ctx.lineTo(x1, y);
  ctx.stroke();
}
function formatNum(v, digits = 3) {
  if (!Number.isFinite(v)) return "\u2014";
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e4 || a < 1e-3)) return v.toExponential(2);
  return v.toFixed(digits);
}

// js/utils/params.js
function parseUserNumber(raw) {
  const s = String(raw ?? "").trim().replace(/,/g, "");
  if (s === "") return { ok: false, error: "empty" };
  const frac = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (frac) {
    const a = Number(frac[1]);
    const b = Number(frac[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
      return { ok: false, error: "invalid fraction" };
    }
    const v2 = a / b;
    if (!Number.isFinite(v2)) return { ok: false, error: "invalid" };
    return { ok: true, value: v2 };
  }
  const v = Number(s);
  if (!Number.isFinite(v)) return { ok: false, error: "invalid" };
  return { ok: true, value: v };
}
function formatDtFriendly(v, fallbackDigits = 6) {
  if (!Number.isFinite(v) || v === 0) return formatParamNumber(v);
  const inv = 1 / v;
  if (Number.isFinite(inv) && Math.abs(inv - Math.round(inv)) < 1e-9 && Math.abs(inv) >= 2 && Math.abs(inv) <= 1e4) {
    const n = Math.round(inv);
    return v < 0 ? `-1/${Math.abs(n)}` : `1/${n}`;
  }
  return formatParamNumber(v);
}
function validateCustomParam(key, rawValue) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
    return { ok: false, error: "bad key" };
  }
  if (key.startsWith("__") || key === "constructor" || key === "prototype") {
    return { ok: false, error: "reserved key" };
  }
  if (key === "expr_a") {
    const s = String(rawValue ?? "").trim();
    if (!s) return { ok: false, error: "empty expr" };
    if (!/^[0-9a-zA-Z_+\-*/%().\s]+$/.test(s)) return { ok: false, error: "unsafe expr" };
    return { ok: true, value: s };
  }
  const parsed = parseUserNumber(rawValue);
  if (!parsed.ok) return parsed;
  if (!Number.isFinite(parsed.value)) return { ok: false, error: "non-finite" };
  if (Math.abs(parsed.value) > 1e15) return { ok: false, error: "out of range" };
  return { ok: true, value: parsed.value };
}
function P(params, key, fallback = 0) {
  const v = Number(params?.[key]);
  return Number.isFinite(v) ? v : fallback;
}
function accelExtras(params, locals = {}) {
  let sum = 0;
  for (const [k, val] of Object.entries(params || {})) {
    if (k === "a_extra" || /^a_[a-zA-Z0-9_]+$/.test(k)) {
      const n = Number(val);
      if (Number.isFinite(n)) sum += n;
    }
  }
  if (params?.expr_a) {
    const ev = evalExpr(String(params.expr_a), { ...params, ...locals });
    if (Number.isFinite(ev)) sum += ev;
  }
  return sum;
}
function springK(params) {
  return P(params, "k", 0) + P(params, "k_extra", 0);
}
function evalExpr(expr, scope) {
  const src = String(expr || "").trim();
  if (!src) return 0;
  if (!/^[0-9a-zA-Z_+\-*/%().\s]+$/.test(src)) return NaN;
  const keys = Object.keys(scope).filter((k) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k));
  const values = keys.map((k) => {
    const n = Number(scope[k]);
    return Number.isFinite(n) ? n : 0;
  });
  try {
    const fn = new Function(...keys, `"use strict"; return (${src});`);
    const r = fn(...values);
    return Number.isFinite(r) ? r : NaN;
  } catch {
    return NaN;
  }
}
function finiteOr(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}
function clampNumber(v, min, max) {
  let n = Number(v);
  if (!Number.isFinite(n)) n = Number.isFinite(min) ? min : 0;
  if (Number.isFinite(min)) n = Math.max(min, n);
  if (Number.isFinite(max)) n = Math.min(max, n);
  return n;
}
function formatParamNumber(v) {
  if (!Number.isFinite(v)) return "\u2014";
  if (Object.is(v, -0)) return "0";
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 1e6 || a > 0 && a < 1e-4) {
    return v.toExponential(3).replace(/\.?0+e/, "e").replace(/e\+/, "e");
  }
  if (Number.isInteger(v) || Math.abs(v - Math.round(v)) < 1e-9) {
    return String(Math.round(v));
  }
  let s;
  if (a >= 100) s = v.toFixed(1);
  else if (a >= 10) s = v.toFixed(2);
  else if (a >= 1) s = v.toFixed(3);
  else if (a >= 0.01) s = v.toFixed(4);
  else s = v.toFixed(6);
  return String(Number(s));
}
function inferBounds(key, def, schema = {}) {
  if (Number.isFinite(schema.min) && Number.isFinite(schema.max) && schema.max > schema.min) {
    return { min: schema.min, max: schema.max };
  }
  const d = Number.isFinite(def) ? def : 1;
  const known = {
    e: { min: 0, max: 1 },
    g: { min: 0, max: 40 },
    m: { min: 0.01, max: 100 },
    m1: { min: 0.01, max: 100 },
    m2: { min: 0.01, max: 100 },
    k: { min: 0, max: 200 },
    c: { min: 0, max: 50 },
    damp: { min: 0, max: 20 },
    h: { min: 0, max: 100 },
    L: { min: 0.05, max: 10 },
    L1: { min: 0.05, max: 10 },
    L2: { min: 0.05, max: 10 },
    x0: { min: -5, max: 5 },
    v0: { min: -50, max: 50 },
    v1: { min: -50, max: 50 },
    v2: { min: -50, max: 50 },
    theta: { min: -180, max: 180 },
    theta0: { min: -180, max: 180 },
    theta1: { min: -180, max: 180 },
    theta2: { min: -180, max: 180 },
    alpha: { min: 0, max: 2 },
    N: { min: 8, max: 256 },
    A1: { min: 0, max: 2 },
    A2: { min: 0, max: 2 },
    A3: { min: 0, max: 2 },
    Tleft: { min: -50, max: 200 },
    Tright: { min: -50, max: 200 },
    T0: { min: -50, max: 200 },
    hotspot: { min: -50, max: 200 }
  };
  if (known[key]) return known[key];
  if (key.startsWith("a_")) return { min: -50, max: 50 };
  if (key.startsWith("k_")) return { min: 0, max: 200 };
  const mag = Math.abs(d) || 1;
  if (d >= 0) return { min: 0, max: Math.max(mag * 5, mag + 1) };
  return { min: -Math.max(mag * 5, mag + 1), max: Math.max(mag * 5, mag + 1) };
}
function finiteOrDefault(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function clampGlobal(v, min, max, fallback) {
  if (v === Infinity) return max;
  if (v === -Infinity) return min;
  return clampNumber(finiteOrDefault(v, fallback), min, max);
}
function sanitizeGlobals(g) {
  if (!g || typeof g !== "object") return g;
  g.timeScale = clampGlobal(g.timeScale, 0.05, 8, 1);
  g.fixedDt = clampGlobal(g.fixedDt > 0 ? g.fixedDt : 1 / 240, 1 / 2e3, 1 / 30, 1 / 240);
  g.maxSubSteps = Math.round(clampGlobal(g.maxSubSteps, 1, 256, 48));
  g.viewScale = clampGlobal(g.viewScale, 0.25, 4, 1);
  g.readoutDigits = Math.round(clampGlobal(g.readoutDigits, 0, 8, 3));
  return g;
}
function inferUnit(key) {
  const map = {
    g: "m/s\xB2",
    m: "kg",
    m1: "kg",
    m2: "kg",
    k: "N/m",
    k_extra: "N/m",
    c: "N\xB7s/m",
    damp: "1/s",
    h: "m",
    L: "m",
    L1: "m",
    L2: "m",
    x0: "m",
    v0: "m/s",
    v1: "m/s",
    v2: "m/s",
    theta: "\xB0",
    theta0: "\xB0",
    theta1: "\xB0",
    theta2: "\xB0",
    e: "\u2014",
    N: "\u2014",
    alpha: "m\xB2/s",
    Tleft: "\xB0C",
    Tright: "\xB0C",
    T0: "\xB0C",
    hotspot: "\xB0C",
    A1: "m",
    A2: "m",
    A3: "m",
    a_extra: "m/s\xB2",
    expr_a: "expr"
  };
  if (map[key]) return map[key];
  if (key.startsWith("a_")) return "m/s\xB2";
  if (key.startsWith("T")) return "\xB0C";
  return "";
}
function inferGroup(key, value) {
  if (typeof value === "boolean" || key.startsWith("show")) return "display";
  if (key === "expr_a" || key.endsWith("_extra") || key.startsWith("a_")) return "custom";
  if (/^(v|x0|h|theta|T0|hotspot|A)/i.test(key)) return "initial";
  if (/^(N|alpha|dt)/i.test(key)) return "numerics";
  return "dynamics";
}

// palette-shell:../../data/palettes.json
var doc = {
  neutral: { axis: "#5c6570", ground: "#6b7280", muted: "#94a3b8", theory: "#64748b", text: "#94a3b8", bg: "#000000", flash: "rgba(255, 220, 100, 0.45)" },
  models: {},
  hc: { saturationScale: 0.42, lightnessBoost: 0.08 }
};
var palettes_default = doc;

// js/utils/theme.js
var activeModelId = "free-fall";
var NEUTRAL = palettes_default.neutral;
var MODEL = palettes_default.models;
var HC = palettes_default.hc || { saturationScale: 0.42, lightnessBoost: 0.08 };
var palettesSettled = typeof document === "undefined" || Object.keys(MODEL).length > 0;
function applyPaletteDoc(full) {
  if (!full?.models) return false;
  if (full.neutral) Object.assign(NEUTRAL, full.neutral);
  Object.assign(MODEL, full.models);
  if (full.hc) Object.assign(HC, full.hc);
  return true;
}
function palettesReadyNow() {
  return palettesSettled;
}
var palettesReady = typeof document !== "undefined" && Object.keys(MODEL).length === 0 ? fetch(new URL("data/palettes.json", document.baseURI).href).then((res) => res.ok ? res.json() : null).then((full) => {
  applyPaletteDoc(full);
  palettesSettled = true;
  if (full?.models) document.dispatchEvent(new Event("imm-palettes"));
}).catch(() => {
  palettesSettled = true;
}) : Promise.resolve();
function hashHue(id) {
  let h = 0;
  for (let i = 0; i < String(id).length; i += 1) h = h * 31 + String(id).charCodeAt(i) >>> 0;
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
    legend: ["\u4E3B\u4F53 body", "\u5F3A\u8C03 accent", "\u77E2\u91CF vector"]
  };
}
function setModelPalette(modelId) {
  activeModelId = modelId || "free-fall";
}
function getActiveModelId() {
  return activeModelId;
}
function getModelLegend(modelId = activeModelId) {
  const m = MODEL[modelId] || synthPalette(modelId);
  const colors = getModelColors(modelId);
  const entries = [];
  for (const line of m.legend || []) {
    const s = String(line);
    if (/hue|色相/.test(s)) {
      entries.push({ label: "\u8F68\u8FF9", kind: "hue" });
    } else if (/冷|色标|heat/i.test(s)) {
      entries.push({ label: "\u51B7\u2192\u70ED", kind: "heat" });
    } else {
      const parts = s.trim().split(/\s+/);
      const key = parts[parts.length - 1];
      const label = parts.slice(0, -1).join(" ") || key;
      entries.push({ label, color: colors[key] || colors.body, kind: "swatch" });
    }
  }
  return entries;
}
function parseHex(hex) {
  if (!hex || hex[0] !== "#") return null;
  const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  if (full.length !== 7) return null;
  const n = parseInt(full.slice(1), 16);
  return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255 };
}
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h, s, l };
}
function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p2, q2, t2) => {
    let tt = t2;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p2 + (q2 - p2) * 6 * tt;
    if (tt < 1 / 2) return q2;
    if (tt < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - tt) * 6;
    return p2;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  };
}
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
  if (typeof v !== "string") return v;
  if (v.startsWith("#")) return desaturateHex(v);
  const rgba = v.match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const parts = rgba[1].split(",").map((s) => s.trim());
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
function getModelColors(modelId = activeModelId) {
  const hc = typeof document !== "undefined" && document.documentElement.classList.contains("hc");
  const base = { ...NEUTRAL, ...MODEL[modelId] || synthPalette(modelId) };
  if (!hc) return base;
  const out = {};
  for (const [k, v] of Object.entries(base)) {
    out[k] = typeof v === "string" ? desaturateCssColor(v) : v;
  }
  return out;
}
var C = new Proxy({}, {
  get(_t, prop) {
    return getModelColors(activeModelId)[prop];
  }
});
function heatTempColor(t2, tMin, tMax) {
  const u = Math.max(0, Math.min(1, (t2 - tMin) / Math.max(1e-9, tMax - tMin)));
  let r;
  let g;
  let b;
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
  const hc = typeof document !== "undefined" && document.documentElement.classList.contains("hc");
  if (hc) {
    const hex = desaturateHex(`#${((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1)}`);
    const p = parseHex(hex);
    if (p) return `rgb(${p.r},${p.g},${p.b})`;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}
function phaseHueColor(theta, omega, alpha = 0.7) {
  const hue = (theta * 180 / Math.PI + omega * 40 + 3600) % 360;
  let sat = 78;
  let light = 48 + 22 * Math.tanh(Math.abs(omega) * 0.25);
  const hc = typeof document !== "undefined" && document.documentElement.classList.contains("hc");
  if (hc) {
    sat *= HC.saturationScale;
    light = Math.min(88, light + HC.lightnessBoost * 100);
  }
  return `hsla(${hue.toFixed(1)}, ${sat.toFixed(1)}%, ${light.toFixed(1)}%, ${alpha})`;
}
function drawPaletteLegend(ctx, x, y, width, modelId = activeModelId) {
  const entries = getModelLegend(modelId);
  if (!entries.length) return 0;
  const rowH = 16;
  let yy = y;
  ctx.save();
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("palette", x, yy);
  yy += 14;
  for (const e of entries) {
    if (e.kind === "hue") {
      for (let i = 0; i < 48; i += 1) {
        ctx.fillStyle = `hsl(${i / 47 * 360}, 70%, 55%)`;
        ctx.fillRect(x + i * (Math.min(width, 160) / 48), yy - 8, Math.min(width, 160) / 48 + 1, 10);
      }
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(e.label, x + Math.min(width, 160) + 8, yy);
    } else if (e.kind === "heat") {
      for (let i = 0; i < 48; i += 1) {
        ctx.fillStyle = heatTempColor(i, 0, 47);
        ctx.fillRect(x + i * (Math.min(width, 160) / 48), yy - 8, Math.min(width, 160) / 48 + 1, 10);
      }
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("\u51B7\u2192\u70ED", x + Math.min(width, 160) + 8, yy);
    } else {
      ctx.fillStyle = e.color || "#fff";
      ctx.beginPath();
      ctx.arc(x + 5, yy - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(e.label, x + 16, yy);
    }
    yy += rowH;
  }
  ctx.restore();
  return yy - y;
}

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

// js/utils/zhLabels.js
var ZH_LABELS = {
  g: "\u91CD\u529B g",
  m: "\u8D28\u91CF m",
  m1: "\u8D28\u91CF m\u2081",
  m2: "\u8D28\u91CF m\u2082",
  m3: "\u8D28\u91CF m\u2083",
  k: "\u521A\u5EA6/\u7CFB\u6570 k",
  K: "\u589E\u76CA K",
  Kp: "\u6BD4\u4F8B Kp",
  Ki: "\u79EF\u5206 Ki",
  Kd: "\u5FAE\u5206 Kd",
  c: "\u963B\u5C3C c",
  damp: "\u963B\u5C3C",
  e: "\u6062\u590D\u7CFB\u6570 e",
  zeta: "\u963B\u5C3C\u6BD4 \u03B6",
  f: "\u9891\u7387/\u7126\u8DDD f",
  freq: "\u9891\u7387",
  u: "\u7269\u8DDD u",
  h: "\u9AD8\u5EA6/\u7269\u9AD8 h",
  n: "\u6570\u91CF n",
  N: "\u79BB\u6563\u70B9\u6570 N",
  nMode: "\u6A21\u6001\u9636\u6570",
  theta: "\u89D2\u5EA6 \u03B8",
  angle: "\u89D2\u5EA6",
  seed: "\u968F\u673A\u79CD\u5B50",
  stepDt: "\u6B65\u8FDB\u95F4\u9694",
  algo: "\u7B97\u6CD5",
  v0: "\u521D\u901F v\u2080",
  v1: "\u901F\u5EA6 v\u2081",
  v2: "\u901F\u5EA6 v\u2082",
  vmax: "\u6700\u5927\u901F\u5EA6",
  x0: "\u521D\u4F4D x\u2080",
  y0: "\u521D\u4F4D y\u2080",
  x1: "\u4F4D\u7F6E x\u2081",
  x2: "\u4F4D\u7F6E x\u2082",
  vx0: "\u521D\u901F vx\u2080",
  vy0: "\u521D\u901F vy\u2080",
  T: "\u6E29\u5EA6 T",
  T0: "\u521D\u6E29 T\u2080",
  Tleft: "\u5DE6\u7AEF\u6E29\u5EA6",
  Tright: "\u53F3\u7AEF\u6E29\u5EA6",
  Th: "\u70ED\u6E90\u6E29\u5EA6",
  Tc: "\u51B7\u6E90\u6E29\u5EA6",
  hotspot: "\u70ED\u6591\u6E29\u5EA6",
  temp: "\u6E29\u5EA6",
  V: "\u7535\u538B/\u4F53\u79EF V",
  Vin: "\u8F93\u5165\u7535\u538B",
  R: "\u7535\u963B/\u534A\u5F84 R",
  L: "\u7535\u611F/\u957F\u5EA6 L",
  L1: "\u957F\u5EA6 L\u2081",
  L2: "\u957F\u5EA6 L\u2082",
  C: "\u7535\u5BB9 C",
  Q: "\u6D41\u91CF Q",
  P: "\u529F\u7387/\u538B\u529B P",
  alpha: "\u6269\u6563/\u653B\u89D2 \u03B1",
  beta: "\u53C2\u6570 \u03B2",
  mu: "\u6469\u64E6/\u7C98\u5EA6 \u03BC",
  rho: "\u5BC6\u5EA6 \u03C1",
  lr: "\u5B66\u4E60\u7387",
  pop: "\u79CD\u7FA4",
  speed: "\u52A8\u753B\u901F\u5EA6",
  nodes: "\u8282\u70B9\u6570",
  start: "\u8D77\u70B9",
  goal: "\u7EC8\u70B9",
  phase: "\u76F8\u4F4D",
  intensity: "\u5F3A\u5EA6",
  workFunc: "\u9038\u51FA\u529F",
  properTime: "\u56FA\u6709\u65F6",
  plates: "\u7247\u6570",
  I0: "\u521D\u7535\u6D41 I\u2080",
  amplitude: "\u632F\u5E45",
  offset: "\u504F\u7F6E",
  A: "\u632F\u5E45 A",
  A1: "\u4E00\u9636\u632F\u5E45",
  A2: "\u4E8C\u9636\u632F\u5E45",
  A3: "\u4E09\u9636\u632F\u5E45",
  dragExp: "\u963B\u529B\u6307\u6570",
  windX: "\u98CE\u573A vx",
  windY: "\u98CE\u573A vy",
  adjText: "\u90BB\u63A5\u8868",
  netlist: "\u7F51\u8868",
  q: "\u7535\u8377 q",
  q1: "\u7535\u8377 q\u2081",
  q2: "\u7535\u8377 q\u2082",
  Ex: "\u7535\u573A Ex",
  Ey: "\u7535\u573A Ey",
  B: "\u78C1\u573A B",
  E: "\u573A\u5F3A/\u80FD\u91CF E",
  EI: "\u6297\u5F2F\u521A\u5EA6 EI",
  G: "\u526A\u5207\u6A21\u91CF G",
  GM: "\u5F15\u529B\u53C2\u6570",
  soft: "\u8F6F\u5316\u957F\u5EA6",
  a: "\u52A0\u901F\u5EA6/\u8F93\u5165 a",
  b: "\u504F\u7F6E b",
  p: "\u52A8\u91CF/\u6982\u7387 p",
  Re: "\u96F7\u8BFA\u6570 Re",
  key: "\u5BC6\u94A5",
  msg: "\u62A5\u6587",
  pc: "\u7A0B\u5E8F\u8BA1\u6570",
  sHot: "\u70ED\u71B5",
  sCold: "\u51B7\u71B5",
  mode: "\u6A21\u5F0F",
  clk: "\u65F6\u949F",
  cols: "\u5217\u6570",
  rows: "\u884C\u6570",
  wallDensity: "\u5899\u5BC6\u5EA6",
  density: "\u5BC6\u5EA6",
  stallEvery: "\u505C\u987F\u95F4\u9694",
  hazardMode: "\u5192\u9669\u6A21\u5F0F",
  hazardRate: "\u5192\u9669\u7387",
  capacity: "\u5BB9\u91CF",
  uniq: "\u53BB\u91CD",
  depth: "\u6DF1\u5EA6",
  produceRate: "\u751F\u4EA7\u901F\u7387",
  consumeRate: "\u6D88\u8D39\u901F\u7387",
  cx: "\u4E2D\u5FC3 x",
  bits: "\u4F4D\u6570",
  scan: "\u626B\u63CF",
  useNet: "\u7F51\u8868\u5F00\u5173",
  edgeW: "\u8FB9\u6743",
  restVel: "\u9759\u6B62\u9608\u503C",
  ground: "\u5730\u9762\u9AD8\u5EA6",
  showVectors: "\u663E\u793A\u77E2\u91CF",
  duration: "\u65F6\u957F t"
};
var DEFAULT_UNIT = {
  algo: "\u2014",
  mode: "\u2014",
  seed: "\u2014",
  proj: "\u2014",
  N: "\u2014",
  n: "\u2014",
  cols: "\u2014",
  rows: "\u2014",
  wallDensity: "\u2014",
  density: "\u2014",
  scan: "\u2014",
  useNet: "\u2014",
  netlist: "\u2014",
  support: "\u2014",
  showTheory: "\u2014",
  adjText: "\u2014",
  stallEvery: "\u2014",
  hazardMode: "\u2014",
  hazardRate: "\u2014",
  capacity: "\u2014",
  uniq: "\u2014",
  depth: "\u2014"
};
function localizeSchema(schema = {}) {
  const out = { ...schema };
  for (const [k, meta] of Object.entries(out)) {
    if (!meta || typeof meta !== "object") continue;
    let next = { ...meta };
    const lab = meta.label != null ? String(meta.label) : k;
    if (!/[\u4e00-\u9fff]/.test(lab)) {
      next.label = ZH_LABELS[k] || guessZhLabel(k, lab);
    }
    if (next.unit == null || String(next.unit).length === 0) {
      next.unit = DEFAULT_UNIT[k] ?? "\u2014";
    }
    if (k === "A" && /m²|m2/i.test(String(next.unit))) {
      next.label = "\u9762\u79EF A";
    }
    out[k] = next;
  }
  return out;
}
function guessZhLabel(key, lab) {
  if (/^vx\d*$/i.test(key)) return `\u901F\u5EA6 ${lab}`;
  if (/^vy\d*$/i.test(key)) return `\u901F\u5EA6 ${lab}`;
  if (/^x\d+$/i.test(key)) return `\u4F4D\u7F6E ${lab}`;
  if (/^y\d+$/i.test(key)) return `\u4F4D\u7F6E ${lab}`;
  if (/^m\d+$/i.test(key)) return `\u8D28\u91CF ${lab}`;
  if (/^A\d+$/i.test(key)) return `\u632F\u5E45 ${lab}`;
  if (/^T/i.test(key)) return `\u6E29\u5EA6 ${lab}`;
  if (/rate/i.test(key)) return `\u901F\u7387 ${lab}`;
  if (/seed/i.test(key)) return `\u79CD\u5B50 ${lab}`;
  return `\u53C2\u6570 ${lab}`;
}
function localizeModel(model) {
  if (!model?.paramSchema) return model;
  model.paramSchema = localizeSchema(model.paramSchema);
  return model;
}

// js/lab/formalism.js
var FAMILY_META = {
  ode1d: { formalism: "ode", viz: "phet-particle", hint: "Tune dynamics live" },
  ode2d: { formalism: "ode", viz: "phet-particle", hint: "2D trail; reinit on IC change" },
  circular: { formalism: "ode", viz: "phet-orbit", hint: "Circular / Kepler motion" },
  particles: { formalism: "agents", viz: "phet-field", hint: "Tune field / charge" },
  nbody: { formalism: "ode", viz: "phet-orbit", hint: "Few-body gravity" },
  euler: { formalism: "ode", viz: "gauge", hint: "Attitude / Euler angles" },
  buoyancy: { formalism: "ode", viz: "phet-fluid", hint: "Buoyancy balance" },
  flow: { formalism: "field", viz: "stream", hint: "Streamlines" },
  wave1d: { formalism: "pde", viz: "wave", hint: "1D wave FD" },
  doppler: { formalism: "wave", viz: "wave", hint: "Doppler shift" },
  interference: { formalism: "wave", viz: "wave", hint: "Two-source interference" },
  field2d: { formalism: "field", viz: "field", hint: "2D field vectors" },
  piston: { formalism: "thermo", viz: "gauge", hint: "Piston process" },
  cycle: { formalism: "thermo", viz: "cycle", hint: "P\u2013V cycle" },
  fieldlines: { formalism: "field", viz: "field", hint: "Field lines" },
  circuit: { formalism: "circuit", viz: "circuit", hint: "Lumped RC/RL" },
  induction: { formalism: "em", viz: "phet-field", hint: "Induced EMF" },
  rays: { formalism: "optics", viz: "phet-optics", hint: "Drag object distance" },
  gauge: { formalism: "gauge", viz: "gauge", hint: "Gauge + light dynamics" },
  variant: { formalism: "gauge", viz: "gauge", hint: "Family \xD7 dim knobs" },
  bohr: { formalism: "quantum", viz: "gauge", hint: "Level transitions" },
  decay: { formalism: "stochastic", viz: "gauge", hint: "Decay curve" },
  discrete: { formalism: "map", viz: "algo-step", hint: "Step discrete map" },
  graph: { formalism: "network", viz: "algo-graph", hint: "Pick nodes / edges" },
  tree: { formalism: "network", viz: "algo-tree", hint: "Tree step-through" },
  fsm: { formalism: "discrete", viz: "algo-step", hint: "Highlight FSM state" },
  turing: { formalism: "discrete", viz: "algo-step", hint: "Tape R/W" },
  crypto: { formalism: "discrete", viz: "algo-step", hint: "Crypto steps" },
  ml: { formalism: "learning", viz: "algo-step", hint: "Train step" },
  opt: { formalism: "opt", viz: "algo-step", hint: "Optimizer path" },
  logic: { formalism: "digital", viz: "netlist", hint: "Wire logic netlist" },
  arch: { formalism: "digital", viz: "algo-step", hint: "Pipeline / cache" },
  embed: { formalism: "digital", viz: "gauge", hint: "Embedded timing" },
  comm: { formalism: "signal", viz: "wave", hint: "Modulation / BER" },
  net: { formalism: "network", viz: "algo-graph", hint: "Protocol steps" },
  os: { formalism: "discrete", viz: "algo-step", hint: "Scheduler / queue" },
  compile: { formalism: "discrete", viz: "algo-tree", hint: "Compile stages" },
  dist: { formalism: "network", viz: "algo-graph", hint: "Consensus steps" },
  struct: { formalism: "ode", viz: "beam", hint: "Beam / truss forces" },
  control: { formalism: "ode", viz: "control", hint: "PID / root locus" },
  chaos: { formalism: "ode", viz: "phase", hint: "Phase space" },
  traffic: { formalism: "agents", viz: "traffic", hint: "Cellular traffic" },
  reactor: { formalism: "ode", viz: "gauge", hint: "Point-kinetics" },
  aero: { formalism: "ode", viz: "aero", hint: "Aero / attitude ODEs" }
};
var HAND_FORMALISM = {
  "free-fall": "ode",
  projectile: "ode",
  "inclined-plane": "ode",
  spring: "ode",
  pendulum: "ode",
  collision: "ode",
  "collision-2d": "ode",
  "double-pendulum": "ode",
  wave: "pde",
  heat: "pde",
  lorentz: "ode",
  "rc-circuit": "circuit",
  rlc: "circuit",
  orbit: "ode",
  sorting: "discrete",
  "bfs-grid": "network",
  dijkstra: "network",
  life: "map",
  "logic-gates": "digital",
  pipeline: "digital",
  "cache-lru": "digital",
  fifo: "discrete",
  "beam-sfd-bmd": "ode",
  "pid-tune": "ode",
  "hodgkin-huxley": "ode",
  "r016-\u663E\u5FAE\u955C": "optics"
};
function formalismFor(entry) {
  if (!entry) return "";
  const direct = entry.formalism || entry.capabilities?.formalism || "";
  if (direct) return direct;
  const mapped = entry.family ? FAMILY_META[entry.family]?.formalism : "";
  if (mapped) return mapped;
  return HAND_FORMALISM[entry.id] || "";
}
function familyCapabilities(family, spec = {}) {
  const meta = FAMILY_META[family] || FAMILY_META.gauge;
  const base = {
    formalism: meta.formalism,
    viz: meta.viz,
    interaction: meta.viz.includes("algo") || meta.viz === "netlist" || meta.viz === "phet-optics" ? meta.viz === "phet-optics" || meta.viz === "algo-graph" || meta.viz === "netlist" ? "canvas" : "knobs" : "knobs",
    hint: meta.hint,
    fidelity: "principle"
  };
  if (spec.id === "lens") {
    return {
      ...base,
      pointer: true,
      interaction: "canvas",
      hint: "Drag object to set u/h"
    };
  }
  if (family === "graph" || family === "logic") {
    return { ...base, pointer: true, interaction: "canvas" };
  }
  return base;
}

// js/lab/lowInkIds.js
var LOW_INK_IDS = /* @__PURE__ */ new Set([
  "active-filter",
  "adder",
  "airfoil-aero",
  "asm-simple",
  "cstr",
  "hodgkin-huxley",
  "logistic-growth",
  "opamp-configs",
  "phugoid-short",
  "pid-tune",
  "queue-mmc",
  "r066-\u51F8\u8F6E",
  "r066-\u56DB\u6746",
  "r066-\u66F2\u67C4\u6ED1\u5757",
  "rc-circuit",
  "rc-rl-filter",
  "root-locus",
  "step-response",
  "supply-demand",
  "titration-curve",
  "vortex-lattice"
]);
function shouldBoostStroke(modelId) {
  return !!modelId && LOW_INK_IDS.has(modelId);
}
function applyLowInkStrokeBoost(model) {
  if (!model || typeof model.draw !== "function") return model;
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
    try {
      draw0(ctx, state, view);
    } finally {
      ctx.stroke = stroke0;
      ctx.strokeRect = strokeRect0;
      ctx.fillRect = fillRect0;
    }
  };
  model._lowInkBoosted = true;
  return model;
}

// js/i18n/strings.js
var LOCALES = [
  { id: "zh", label: "\u4E2D\u6587" },
  { id: "en", label: "English" },
  { id: "ja", label: "\u65E5\u672C\u8A9E" },
  { id: "ko", label: "\uD55C\uAD6D\uC5B4" },
  { id: "es", label: "Espa\xF1ol" },
  { id: "fr", label: "Fran\xE7ais" },
  { id: "de", label: "Deutsch" }
];
var STRINGS = {
  zh: {
    "ui.search": "\u641C\u7D22",
    "ui.searchPh": "\u5B50\u7C7B / CS / CE / formula",
    "ui.tag": "\u6807\u7B7E",
    "ui.form": "\u5F62\u5F0F",
    "ui.all": "\u5168\u90E8",
    "ui.lang": "\u8BED\u8A00",
    "ui.shell": "\u58F3",
    "ui.microExit": "\u8FD4\u56DE\u8BFE\u8868",
    "ui.microLede": "\u62D6\u52A8\u65CB\u8F6C \xB7 \u6EDA\u8F6E\u7F29\u653E \xB7 \u70B9\u51FB\u7269\u955C/\u76EE\u955C \xB7 \u5149\u5B66\u53C2\u6570\u53EF\u6539 L/NA/\u03BB",
    "ui.microReset": "\u91CD\u7F6E\u5149\u5B66",
    "ui.microBench": "\u5149\u5B66\u53C2\u6570",
    "ui.microBenchKicker": "compound microscope",
    "ui.micro3dSection": "\u4E09\u7EF4\u53F0",
    "ui.micro3dEntry": "\u590D\u5F0F\u663E\u5FAE\u955C \xB7 \u4E09\u7EF4",
    "ui.micro3dLede": "\u72EC\u7ACB WebGL \u5149\u5B66\u53F0 \xB7 \u4E0E\u8BFE\u8868 2D \u7ED3\u6784\u56FE\u5206\u5F00",
    "ui.userModel": "\uFF0B \u81EA\u5EFA\u6A21\u578B",
    "ui.manual": "\u624B\u518C",
    "ui.ethics": "\u4F26\u7406",
    "ui.contrast": "\u9AD8\u5BF9\u6BD4",
    "ui.expandAll": "\u5168\u90E8\u5C55\u5F00",
    "ui.collapseAll": "\u5168\u90E8\u6536\u8D77",
    "ui.foldHint": "\u6298\u53E0\uFF1A\u6309\u94AE\u5168\u5F00/\u5168\u6536\uFF1B\u70B9\u6807\u9898\u5F00\u5408",
    "ui.recents": "\u6700\u8FD1",
    "ui.noMatch": "\u65E0\u5339\u914D",
    "ui.openMenu": "\u6253\u5F00\u6A21\u578B\u5217\u8868",
    "ui.closeMenu": "\u5173\u95ED\u6A21\u578B\u5217\u8868",
    "ui.params": "\u53C2\u6570",
    "ui.paramsCollapse": "\u6536\u8D77",
    "ui.paramsTitle": "\u6253\u5F00\u53C2\u6570\u5DE5\u4F5C\u53F0",
    "ui.rerun": "\u91CD\u8DD1",
    "ui.rerunTitle": "\u4FDD\u6301\u5F53\u524D\u53C2\u6570\uFF0C\u4ECE t=0 \u91CD\u79EF",
    "ui.pause": "pause",
    "ui.play": "play",
    "ui.bench": "\u5DE5\u4F5C\u53F0",
    "ui.benchKicker": "param module",
    "ui.close": "close",
    "ui.formulaNotes": "formula / notes",
    "ui.readouts": "readouts",
    "ui.baselineCurrent": "\u5F53\u524D\u5BF9\u7167",
    "ui.saveSnap": "\u5B58\u5FEB\u7167",
    "ui.copyReadouts": "\u590D\u5236\u8BFB\u6570",
    "ui.export": "\u5BFC\u51FA",
    "ui.withShots": "\u542B\u56FE",
    "ui.classPack": "\u8BFE\u5802\u5305",
    "ui.import": "\u5BFC\u5165",
    "ui.pinBaseline": "\u9489\u4F4F\u57FA\u7EBF",
    "ui.authority": "\u6743\u5A01\u4E0E\u5047\u8BBE",
    "ui.srTable": "\u6587\u672C\u8BFB\u6570\u8868",
    "ui.safeRestore": "\u6062\u590D\u5B89\u5168\u9ED8\u8BA4",
    "ui.hintDefault": "\u53F3\u4FA7\u8C03\u53C2",
    "ui.bootReload": "\u6B63\u5728\u91CD\u65B0\u8F7D\u5165",
    "ui.bootManual": "\u65E0\u6CD5\u81EA\u52A8\u5237\u65B0\uFF0C\u8BF7\u624B\u52A8\u91CD\u65B0\u8F7D\u5165",
    "ui.bootDismiss": "\u5173\u95ED",
    "ui.fidelityEngineering": "\u5DE5\u7A0B\u7EA7",
    "ui.fidelityPrinciple": "\u539F\u7406\u7EA7",
    "ui.formulaPrefix": "\u516C\u5F0F",
    "ui.assumptionPrefix": "\u5047\u8BBE",
    "ui.truncated": "{text}\u2026",
    "ui.assumptionSource": "\u5047\u8BBE\u89C1\u6A21\u578B\u8BB0\u5F55\uFF08\u539F\u6587\uFF09",
    "caveat.nuclear": "\u516C\u5F00\u5B9A\u4E49\u5F0F\uFF0C\u4E0D\u662F\u53CD\u5E94\u5806\u6216\u88C5\u7F6E\u8BBE\u8BA1\u5DE5\u5177",
    "caveat.electrochem": "\u516C\u5F00\u5B9A\u4E49\u5F0F\uFF0C\u4E0D\u662F\u5DE5\u827A\u6216\u914D\u65B9\u8BBE\u8BA1\u5DE5\u5177",
    "caveat.membrane": "\u516C\u5F00\u5B9A\u4E49\u5F0F\uFF0C\u4E0D\u662F\u4E34\u5E8A\u6216\u7ED9\u836F\u8BBE\u8BA1\u5DE5\u5177",
    "ui.applyBanner": "\u52A8\u529B\u5B66\u5373\u65F6\u751F\u6548\uFF1B\u521D\u503C/\u6570\u503C\u4F1A\u91CD\u7F6E\u72B6\u6001",
    "ui.paramsUnit": "\u53C2",
    "ui.live": "\u5373\u65F6",
    "ui.reinit": "\u91CD\u7F6E",
    "group.dynamics": "\u52A8\u529B\u5B66",
    "group.initial": "\u521D\u503C",
    "group.display": "\u663E\u793A",
    "group.numerics": "\u6570\u503C",
    "group.custom": "\u81EA\u5B9A\u4E49",
    "group.global": "\u7CFB\u7EDF",
    "domain.\u7269\u7406": "\u7269\u7406",
    "domain.\u8BA1\u7B97\u673A\u79D1\u5B66": "\u8BA1\u7B97\u673A\u79D1\u5B66",
    "domain.\u8BA1\u7B97\u673A\u5DE5\u7A0B": "\u8BA1\u7B97\u673A\u5DE5\u7A0B",
    "domain.\u5DE5\u7A0B": "\u5DE5\u7A0B",
    "domain.\u5316\u5B66\u5DE5\u7A0B": "\u5316\u5B66\u5DE5\u7A0B",
    "domain.\u5730\u7403\u79D1\u5B66": "\u5730\u7403\u79D1\u5B66",
    "domain.\u7ECF\u6D4E\u4E0E\u7BA1\u7406": "\u7ECF\u6D4E\u4E0E\u7BA1\u7406",
    "domain.\u5176\u4ED6": "\u5176\u4ED6",
    "dialog.title": "\u81EA\u5EFA\u6A21\u578B",
    "dialog.lede": "\u5DE5\u4E1A\u7EA7 \xB7 \u9AD8\u81EA\u5B9A\u4E49\u53C2\u6570 \xB7 \u521B\u5EFA\u524D\u987B\u6838\u5BF9\u6743\u5A01\u6587\u732E\u4E2D\u7684\u63A7\u5236\u65B9\u7A0B\u4E0E\u5047\u8BBE\u3002",
    "dialog.name": "\u540D\u79F0",
    "dialog.domain": "\u9886\u57DF",
    "dialog.sub": "\u5B50\u7C7B",
    "dialog.family": "\u5F15\u64CE\u65CF",
    "dialog.formula": "\u63A7\u5236\u65B9\u7A0B / \u516C\u5F0F",
    "dialog.authority": "\u6743\u5A01\u6765\u6E90\uFF08\u5FC5\u586B\uFF09",
    "dialog.assumptions": "\u9002\u7528\u5047\u8BBE / \u5C40\u9650",
    "dialog.description": "\u63CF\u8FF0",
    "dialog.fidelity": "\u4FDD\u771F\u5EA6",
    "dialog.ethics": "\u5DF2\u5BF9\u7167\u6743\u5A01\u6587\u6863\u6838\u5BF9\u6982\u5FF5/\u4F26\u7406\u8FB9\u754C\uFF0C\u786E\u8BA4\u975E\u9519\u8BEF\u7C7B\u6BD4",
    "dialog.saved": "\u5DF2\u5B58",
    "dialog.export": "\u5BFC\u51FA JSON",
    "dialog.import": "\u5BFC\u5165 JSON",
    "dialog.submit": "\u521B\u5EFA\u5E76\u8F7D\u5165",
    "dialog.validOk": "\u6821\u9A8C\u901A\u8FC7",
    "dialog.cancel": "\u53D6\u6D88",
    "dialog.empty": "\u6682\u65E0\u81EA\u5EFA\u6A21\u578B",
    "dialog.errNameShort": "\u540D\u79F0\u81F3\u5C11 2 \u5B57",
    "dialog.errDomain": "\u987B\u9009\u9886\u57DF",
    "dialog.errSub": "\u987B\u586B\u5B50\u7C7B",
    "dialog.errFamily": "\u5F15\u64CE\u65CF\u65E0\u6548\uFF1A{family}",
    "dialog.errFormulaShort": "\u63A7\u5236\u65B9\u7A0B\u8FC7\u77ED\uFF0C\u987B\u5199\u660E\u652F\u914D\u5173\u7CFB",
    "dialog.errAuthorityShort": "\u6743\u5A01\u6765\u6E90\u8FC7\u77ED\uFF1A\u987B\u4E66\u540D/\u6807\u51C6/DOI + \u7AE0\u8282",
    "dialog.errAssumptionsShort": "\u987B\u5199\u6E05\u9002\u7528\u5047\u8BBE\u4E0E\u5C40\u9650\uFF08\u5DE5\u4E1A\u7EA7\u4E0D\u53EF\u7701\u7565\uFF09",
    "dialog.errAssumptionsScope": "\u7F3A\u5C11\u5047\u8BBE\uFF1A\u9002\u7528\u8303\u56F4\u6216\u5FFD\u7565\u9879\uFF08\u8BF7\u5199\u660E\u4F8B\u5982\u300C\u5FFD\u7565\u6469\u64E6\u300D\u6216\u300C\u4E0D\u662F\u8BBE\u8BA1\u5DE5\u5177\u300D\uFF09",
    "dialog.errDescription": "\u63CF\u8FF0\u987B\u8BF4\u660E\u72B6\u6001\u91CF/\u8F93\u5165\u8F93\u51FA\u4E0E\u6587\u732E\u5BF9\u5E94",
    "dialog.errEthics": "\u987B\u52FE\u9009\uFF1A\u5DF2\u5BF9\u7167\u6743\u5A01\u6587\u6863\u6838\u5BF9\u6982\u5FF5\u4E0E\u4F26\u7406\u8FB9\u754C",
    "dialog.errToy": "\u62D2\u7EDD\u73A9\u5177\u5411\u6587\u6848\uFF1B\u672C\u5B9E\u9A8C\u5BA4\u6A21\u578B\u987B\u5DE5\u7A0B/\u5B66\u672F\u53EF\u7528",
    "toast.paramFail": "\u53C2\u6570\u5E94\u7528\u5931\u8D25: {key}",
    "toast.safeRestore": "\u5DF2\u6062\u590D\u5B89\u5168\u9ED8\u8BA4\u53C2\u6570",
    "toast.filtersCleared": "\u5DF2\u6E05\u9664\u7B5B\u9009",
    "toast.noFilter": "\u5F53\u524D\u65E0\u7B5B\u9009",
    "toast.layoutRelayout": "\u5E03\u5C40\u5DF2\u91CD\u7B97"
  },
  en: {
    "ui.search": "search",
    "ui.searchPh": "sub / CS / CE / formula",
    "ui.tag": "tag",
    "ui.form": "form",
    "ui.all": "all",
    "ui.lang": "language",
    "ui.shell": "shell",
    "ui.microExit": "Back to catalog",
    "ui.microLede": "Drag to orbit \xB7 wheel zoom \xB7 click objectives/eyepieces \xB7 Optical params edit L/NA/\u03BB",
    "ui.microReset": "Reset optics",
    "ui.microBench": "Optical params",
    "ui.microBenchKicker": "compound microscope",
    "ui.micro3dSection": "3D stage",
    "ui.micro3dEntry": "Compound microscope \xB7 3D",
    "ui.micro3dLede": "Dedicated WebGL optical stage \xB7 separate from the catalog 2D structure",
    "ui.userModel": "+ custom model",
    "ui.manual": "manual",
    "ui.ethics": "ethics",
    "ui.contrast": "contrast",
    "ui.expandAll": "expand all",
    "ui.collapseAll": "collapse all",
    "ui.foldHint": "Fold: expand/collapse all; click a heading to toggle",
    "ui.recents": "recent",
    "ui.noMatch": "no match",
    "ui.openMenu": "Open model list",
    "ui.closeMenu": "Close model list",
    "ui.params": "params",
    "ui.paramsCollapse": "hide",
    "ui.paramsTitle": "Open parameter bench",
    "ui.rerun": "re-run",
    "ui.rerunTitle": "Keep params; reintegrate from t=0",
    "ui.pause": "pause",
    "ui.play": "play",
    "ui.bench": "bench",
    "ui.benchKicker": "param module",
    "ui.close": "close",
    "ui.formulaNotes": "formula / notes",
    "ui.readouts": "readouts",
    "ui.baselineCurrent": "current compare",
    "ui.saveSnap": "save shot",
    "ui.copyReadouts": "copy values",
    "ui.export": "export",
    "ui.withShots": "shots",
    "ui.classPack": "class pack",
    "ui.import": "import",
    "ui.pinBaseline": "pin baseline",
    "ui.authority": "authority & assumptions",
    "ui.srTable": "text readouts",
    "ui.safeRestore": "safe defaults",
    "ui.hintDefault": "tune on the right",
    "ui.bootReload": "Reloading\u2026",
    "ui.bootManual": "Automatic refresh is unavailable. Reload the page manually.",
    "ui.bootDismiss": "Dismiss",
    "ui.fidelityEngineering": "engineering",
    "ui.fidelityPrinciple": "principle",
    "ui.formulaPrefix": "Equation",
    "ui.assumptionPrefix": "Assumptions",
    "ui.truncated": "{text}\u2026",
    "ui.assumptionSource": "Assumptions stay in the model record (catalog language).",
    "caveat.nuclear": "Public definition only. Not a reactor or device design tool.",
    "caveat.electrochem": "Public definition only. Not a process or formulation design tool.",
    "caveat.membrane": "Public definition only. Not a clinical or dosing design tool.",
    "ui.applyBanner": "Dynamics apply live; initial/numerics reinit state",
    "ui.paramsUnit": "params",
    "ui.live": "live",
    "ui.reinit": "reinit",
    "group.dynamics": "dynamics",
    "group.initial": "initial",
    "group.display": "display",
    "group.numerics": "numerics",
    "group.custom": "custom",
    "group.global": "system",
    "domain.\u7269\u7406": "Physics",
    "domain.\u8BA1\u7B97\u673A\u79D1\u5B66": "Computer Science",
    "domain.\u8BA1\u7B97\u673A\u5DE5\u7A0B": "Computer Engineering",
    "domain.\u5DE5\u7A0B": "Engineering",
    "domain.\u5316\u5B66\u5DE5\u7A0B": "Chemical Engineering",
    "domain.\u5730\u7403\u79D1\u5B66": "Earth Science",
    "domain.\u7ECF\u6D4E\u4E0E\u7BA1\u7406": "Economics & Management",
    "domain.\u5176\u4ED6": "Other",
    "dialog.title": "Custom model",
    "dialog.lede": "Industrial-grade \xB7 rich params \xB7 verify governing equations and assumptions against authoritative sources before saving.",
    "dialog.name": "Name",
    "dialog.domain": "Domain",
    "dialog.sub": "Subcategory",
    "dialog.family": "Engine family",
    "dialog.formula": "Governing equation / formula",
    "dialog.authority": "Authority (required)",
    "dialog.assumptions": "Assumptions / limits",
    "dialog.description": "Description",
    "dialog.fidelity": "Fidelity",
    "dialog.ethics": "I verified concepts/ethics against authoritative docs; not a false analogy",
    "dialog.saved": "Saved",
    "dialog.export": "Export JSON",
    "dialog.import": "Import JSON",
    "dialog.submit": "Create & load",
    "dialog.validOk": "Validation passed",
    "dialog.cancel": "Cancel",
    "dialog.empty": "No custom models yet",
    "dialog.errNameShort": "Name must be at least 2 characters",
    "dialog.errDomain": "Choose a domain",
    "dialog.errSub": "Enter a subcategory",
    "dialog.errFamily": "Invalid engine family: {family}",
    "dialog.errFormulaShort": "Governing equation is too short",
    "dialog.errAuthorityShort": "Authority is too short: book / standard / DOI + section",
    "dialog.errAssumptionsShort": "State assumptions and limits clearly (required for industrial-grade models)",
    "dialog.errAssumptionsScope": "Missing assumption: scope or neglected terms (e.g. \u201Cneglect friction\u201D or \u201Cnot a design tool\u201D)",
    "dialog.errDescription": "Describe state variables / I/O and how they map to the literature",
    "dialog.errEthics": "Confirm concepts and ethics against authoritative docs",
    "dialog.errToy": "Reject toy-oriented copy; lab models must be engineering/academic",
    "toast.paramFail": "Param apply failed: {key}",
    "toast.safeRestore": "Restored safe defaults",
    "toast.filtersCleared": "Filters cleared",
    "toast.noFilter": "No active filters",
    "toast.layoutRelayout": "Layout recomputed"
  },
  ja: {
    "ui.search": "\u691C\u7D22",
    "ui.searchPh": "\u5206\u985E / CS / CE / formula",
    "ui.tag": "\u30BF\u30B0",
    "ui.form": "\u5F62\u5F0F",
    "ui.all": "\u3059\u3079\u3066",
    "ui.lang": "\u8A00\u8A9E",
    "ui.shell": "\u30B7\u30A7\u30EB",
    "ui.microExit": "\u30AB\u30BF\u30ED\u30B0\u3078\u623B\u308B",
    "ui.microLede": "\u6709\u9650\u93E1\u7B52 \xB7 Hecht \u5149\u5B66 \xB7 \u73FE\u5728\u306E NA \u306B\u3088\u308B Abbe \u9650\u754C",
    "ui.microReset": "\u5149\u5B66\u3092\u30EA\u30BB\u30C3\u30C8",
    "ui.microBench": "\u5149\u5B66\u30D1\u30E9\u30E1\u30FC\u30BF",
    "ui.microBenchKicker": "compound microscope",
    "ui.micro3dSection": "3D \u30B9\u30C6\u30FC\u30B8",
    "ui.micro3dEntry": "\u8907\u5408\u9855\u5FAE\u93E1 \xB7 3D",
    "ui.micro3dLede": "\u72EC\u7ACB WebGL \u5149\u5B66\u53F0 \xB7 \u30AB\u30BF\u30ED\u30B0 2D \u69CB\u9020\u56F3\u3068\u306F\u5225",
    "ui.userModel": "\uFF0B \u72EC\u81EA\u30E2\u30C7\u30EB",
    "ui.manual": "\u30DE\u30CB\u30E5\u30A2\u30EB",
    "ui.ethics": "\u502B\u7406",
    "ui.contrast": "\u30B3\u30F3\u30C8\u30E9\u30B9\u30C8",
    "ui.expandAll": "\u3059\u3079\u3066\u958B\u304F",
    "ui.collapseAll": "\u3059\u3079\u3066\u9589\u3058\u308B",
    "ui.foldHint": "\u6298\u308A\u305F\u305F\u307F\uFF1A\u5168\u958B/\u5168\u9589\u3001\u898B\u51FA\u3057\u3067\u5207\u66FF",
    "ui.recents": "\u6700\u8FD1",
    "ui.noMatch": "\u4E00\u81F4\u306A\u3057",
    "ui.openMenu": "\u30E2\u30C7\u30EB\u4E00\u89A7\u3092\u958B\u304F",
    "ui.closeMenu": "\u30E2\u30C7\u30EB\u4E00\u89A7\u3092\u9589\u3058\u308B",
    "ui.params": "\u30D1\u30E9\u30E1\u30FC\u30BF",
    "ui.paramsCollapse": "\u9589\u3058\u308B",
    "ui.paramsTitle": "\u30D1\u30E9\u30E1\u30FC\u30BF\u53F0\u3092\u958B\u304F",
    "ui.rerun": "\u518D\u5B9F\u884C",
    "ui.rerunTitle": "\u30D1\u30E9\u30E1\u30FC\u30BF\u3092\u4FDD\u3061 t=0 \u304B\u3089\u518D\u7A4D\u5206",
    "ui.pause": "pause",
    "ui.play": "play",
    "ui.bench": "\u4F5C\u696D\u53F0",
    "ui.benchKicker": "param module",
    "ui.close": "close",
    "ui.formulaNotes": "formula / notes",
    "ui.readouts": "readouts",
    "ui.baselineCurrent": "\u73FE\u5728\u306E\u6BD4\u8F03",
    "ui.saveSnap": "\u4FDD\u5B58",
    "ui.copyReadouts": "\u6570\u5024\u3092\u30B3\u30D4\u30FC",
    "ui.export": "\u66F8\u304D\u51FA\u3057",
    "ui.withShots": "\u753B\u50CF\u4ED8",
    "ui.classPack": "\u6388\u696D\u30D1\u30C3\u30AF",
    "ui.import": "\u8AAD\u8FBC",
    "ui.pinBaseline": "\u57FA\u6E96\u3092\u56FA\u5B9A",
    "ui.authority": "\u6839\u62E0\u3068\u4EEE\u5B9A",
    "ui.srTable": "\u30C6\u30AD\u30B9\u30C8\u8AAD\u53D6",
    "ui.safeRestore": "\u5B89\u5168\u65E2\u5B9A\u306B\u623B\u3059",
    "ui.hintDefault": "\u53F3\u3067\u8ABF\u6574",
    "ui.bootReload": "\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u3044\u307E\u3059",
    "ui.bootManual": "\u81EA\u52D5\u3067\u306F\u66F4\u65B0\u3067\u304D\u307E\u305B\u3093\u3002\u624B\u52D5\u3067\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u304F\u3060\u3055\u3044",
    "ui.bootDismiss": "\u9589\u3058\u308B",
    "ui.fidelityEngineering": "\u5DE5\u5B66",
    "ui.fidelityPrinciple": "\u539F\u7406",
    "ui.formulaPrefix": "\u5F0F",
    "ui.assumptionPrefix": "\u4EEE\u5B9A",
    "ui.truncated": "{text}\u2026",
    "ui.assumptionSource": "\u4EEE\u5B9A\u306F\u30E2\u30C7\u30EB\u8A18\u9332\uFF08\u539F\u6587\uFF09\u306B\u3042\u308A\u307E\u3059\u3002",
    "caveat.nuclear": "\u516C\u958B\u5B9A\u7FA9\u5F0F\u3067\u3059\u3002\u539F\u5B50\u7089\u3084\u88C5\u7F6E\u306E\u8A2D\u8A08\u30C4\u30FC\u30EB\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002",
    "caveat.electrochem": "\u516C\u958B\u5B9A\u7FA9\u5F0F\u3067\u3059\u3002\u5DE5\u7A0B\u3084\u914D\u5408\u306E\u8A2D\u8A08\u30C4\u30FC\u30EB\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002",
    "caveat.membrane": "\u516C\u958B\u5B9A\u7FA9\u5F0F\u3067\u3059\u3002\u81E8\u5E8A\u3084\u6295\u4E0E\u306E\u8A2D\u8A08\u30C4\u30FC\u30EB\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002",
    "ui.applyBanner": "\u529B\u5B66\u306F\u5373\u6642\u53CD\u6620\uFF1B\u521D\u671F\u5024/\u6570\u5024\u306F\u518D\u521D\u671F\u5316",
    "ui.paramsUnit": "\u9805",
    "ui.live": "\u5373\u6642",
    "ui.reinit": "\u518D\u521D\u671F\u5316",
    "group.dynamics": "\u529B\u5B66",
    "group.initial": "\u521D\u671F\u5024",
    "group.display": "\u8868\u793A",
    "group.numerics": "\u6570\u5024",
    "group.custom": "\u30AB\u30B9\u30BF\u30E0",
    "group.global": "\u30B7\u30B9\u30C6\u30E0",
    "domain.\u7269\u7406": "\u7269\u7406",
    "domain.\u8BA1\u7B97\u673A\u79D1\u5B66": "\u30B3\u30F3\u30D4\u30E5\u30FC\u30BF\u79D1\u5B66",
    "domain.\u8BA1\u7B97\u673A\u5DE5\u7A0B": "\u30B3\u30F3\u30D4\u30E5\u30FC\u30BF\u5DE5\u5B66",
    "domain.\u5DE5\u7A0B": "\u5DE5\u5B66",
    "domain.\u5316\u5B66\u5DE5\u7A0B": "\u5316\u5B66\u5DE5\u5B66",
    "domain.\u5730\u7403\u79D1\u5B66": "\u5730\u7403\u79D1\u5B66",
    "domain.\u7ECF\u6D4E\u4E0E\u7BA1\u7406": "\u7D4C\u6E08\u30FB\u7D4C\u55B6",
    "domain.\u5176\u4ED6": "\u305D\u306E\u4ED6"
  },
  ko: {
    "ui.search": "\uAC80\uC0C9",
    "ui.searchPh": "\uBD84\uB958 / CS / CE / formula",
    "ui.tag": "\uD0DC\uADF8",
    "ui.form": "\uD615\uC2DD",
    "ui.all": "\uC804\uCCB4",
    "ui.lang": "\uC5B8\uC5B4",
    "ui.shell": "\uC178",
    "ui.microExit": "\uBAA9\uB85D\uC73C\uB85C",
    "ui.microLede": "\uC720\uD55C \uACBD\uD1B5 \xB7 Hecht \uAD11\uD559 \xB7 \uD604\uC7AC NA\uC758 Abbe \uD55C\uACC4",
    "ui.microReset": "\uAD11\uD559 \uCD08\uAE30\uD654",
    "ui.microBench": "\uAD11\uD559 \uB9E4\uAC1C\uBCC0\uC218",
    "ui.microBenchKicker": "compound microscope",
    "ui.micro3dSection": "3D \uC2A4\uD14C\uC774\uC9C0",
    "ui.micro3dEntry": "\uBCF5\uD569\uD604\uBBF8\uACBD \xB7 3D",
    "ui.micro3dLede": "\uC804\uC6A9 WebGL \uAD11\uD559\uB300 \xB7 \uBAA9\uB85D 2D \uAD6C\uC870\uB3C4\uC640 \uBD84\uB9AC",
    "ui.userModel": "+ \uC0AC\uC6A9\uC790 \uBAA8\uB378",
    "ui.manual": "\uB9E4\uB274\uC5BC",
    "ui.ethics": "\uC724\uB9AC",
    "ui.contrast": "\uB300\uBE44",
    "ui.expandAll": "\uBAA8\uB450 \uD3BC\uCE58\uAE30",
    "ui.collapseAll": "\uBAA8\uB450 \uC811\uAE30",
    "ui.foldHint": "\uC811\uAE30: \uC804\uCCB4 \uC5F4\uAE30/\uB2EB\uAE30, \uC81C\uBAA9 \uD074\uB9AD",
    "ui.recents": "\uCD5C\uADFC",
    "ui.noMatch": "\uC77C\uCE58 \uC5C6\uC74C",
    "ui.openMenu": "\uBAA8\uB378 \uBAA9\uB85D \uC5F4\uAE30",
    "ui.closeMenu": "\uBAA8\uB378 \uBAA9\uB85D \uB2EB\uAE30",
    "ui.params": "\uB9E4\uAC1C\uBCC0\uC218",
    "ui.paramsCollapse": "\uC811\uAE30",
    "ui.paramsTitle": "\uB9E4\uAC1C\uBCC0\uC218 \uD328\uB110 \uC5F4\uAE30",
    "ui.rerun": "\uB2E4\uC2DC \uC2E4\uD589",
    "ui.rerunTitle": "\uB9E4\uAC1C\uBCC0\uC218 \uC720\uC9C0, t=0\uBD80\uD130 \uC7AC\uC801\uBD84",
    "ui.pause": "pause",
    "ui.play": "play",
    "ui.bench": "\uC791\uC5C5\uB300",
    "ui.benchKicker": "param module",
    "ui.close": "close",
    "ui.formulaNotes": "formula / notes",
    "ui.readouts": "readouts",
    "ui.baselineCurrent": "\uD604\uC7AC \uBE44\uAD50",
    "ui.saveSnap": "\uC2A4\uB0C5 \uC800\uC7A5",
    "ui.copyReadouts": "\uC218\uCE58 \uBCF5\uC0AC",
    "ui.export": "\uB0B4\uBCF4\uB0B4\uAE30",
    "ui.withShots": "\uADF8\uB9BC \uD3EC\uD568",
    "ui.classPack": "\uC218\uC5C5 \uD329",
    "ui.import": "\uAC00\uC838\uC624\uAE30",
    "ui.pinBaseline": "\uAE30\uC900 \uACE0\uC815",
    "ui.authority": "\uADFC\uAC70\uC640 \uAC00\uC815",
    "ui.srTable": "\uD14D\uC2A4\uD2B8 \uC218\uCE58",
    "ui.safeRestore": "\uC548\uC804 \uAE30\uBCF8\uAC12",
    "ui.hintDefault": "\uC624\uB978\uCABD\uC5D0\uC11C \uC870\uC808",
    "ui.bootReload": "\uB2E4\uC2DC \uBD88\uB7EC\uC624\uB294 \uC911",
    "ui.bootManual": "\uC790\uB3D9\uC73C\uB85C \uC0C8\uB85C\uACE0\uCE60 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC9C1\uC811 \uC0C8\uB85C\uACE0\uCE68\uD558\uC138\uC694",
    "ui.bootDismiss": "\uB2EB\uAE30",
    "ui.fidelityEngineering": "\uACF5\uD559",
    "ui.fidelityPrinciple": "\uC6D0\uB9AC",
    "ui.formulaPrefix": "\uC2DD",
    "ui.assumptionPrefix": "\uAC00\uC815",
    "ui.truncated": "{text}\u2026",
    "ui.assumptionSource": "\uAC00\uC815\uC740 \uBAA8\uB378 \uAE30\uB85D(\uC6D0\uBB38)\uC5D0 \uC788\uC2B5\uB2C8\uB2E4.",
    "caveat.nuclear": "\uACF5\uAC1C \uC815\uC758\uC2DD\uC785\uB2C8\uB2E4. \uC6D0\uC790\uB85C\xB7\uC7A5\uCE58 \uC124\uACC4 \uB3C4\uAD6C\uAC00 \uC544\uB2D9\uB2C8\uB2E4.",
    "caveat.electrochem": "\uACF5\uAC1C \uC815\uC758\uC2DD\uC785\uB2C8\uB2E4. \uACF5\uC815\xB7\uBC30\uD569 \uC124\uACC4 \uB3C4\uAD6C\uAC00 \uC544\uB2D9\uB2C8\uB2E4.",
    "caveat.membrane": "\uACF5\uAC1C \uC815\uC758\uC2DD\uC785\uB2C8\uB2E4. \uC784\uC0C1\xB7\uD22C\uC5EC \uC124\uACC4 \uB3C4\uAD6C\uAC00 \uC544\uB2D9\uB2C8\uB2E4.",
    "ui.applyBanner": "\uB3D9\uC5ED\uD559\uC740 \uC989\uC2DC \uC801\uC6A9; \uCD08\uAE30/\uC218\uCE58\uB294 \uC7AC\uCD08\uAE30\uD654",
    "ui.paramsUnit": "\uAC1C",
    "ui.live": "\uC989\uC2DC",
    "ui.reinit": "\uC7AC\uCD08\uAE30\uD654",
    "group.dynamics": "\uB3D9\uC5ED\uD559",
    "group.initial": "\uCD08\uAE30\uAC12",
    "group.display": "\uD45C\uC2DC",
    "group.numerics": "\uC218\uCE58",
    "group.custom": "\uC0AC\uC6A9\uC790",
    "group.global": "\uC2DC\uC2A4\uD15C",
    "domain.\u7269\u7406": "\uBB3C\uB9AC",
    "domain.\u8BA1\u7B97\u673A\u79D1\u5B66": "\uCEF4\uD4E8\uD130\uACFC\uD559",
    "domain.\u8BA1\u7B97\u673A\u5DE5\u7A0B": "\uCEF4\uD4E8\uD130\uACF5\uD559",
    "domain.\u5DE5\u7A0B": "\uACF5\uD559",
    "domain.\u5316\u5B66\u5DE5\u7A0B": "\uD654\uD559\uACF5\uD559",
    "domain.\u5730\u7403\u79D1\u5B66": "\uC9C0\uAD6C\uACFC\uD559",
    "domain.\u7ECF\u6D4E\u4E0E\u7BA1\u7406": "\uACBD\uC81C\xB7\uACBD\uC601",
    "domain.\u5176\u4ED6": "\uAE30\uD0C0"
  },
  es: {
    "ui.search": "buscar",
    "ui.searchPh": "sub / CS / CE / formula",
    "ui.tag": "etiqueta",
    "ui.form": "forma",
    "ui.all": "todo",
    "ui.lang": "idioma",
    "ui.shell": "shell",
    "ui.microExit": "Volver al cat\xE1logo",
    "ui.microLede": "Tubo finito \xB7 \xF3ptica Hecht \xB7 l\xEDmite de Abbe desde el NA vivo",
    "ui.microReset": "Restablecer \xF3ptica",
    "ui.microBench": "Par\xE1metros \xF3pticos",
    "ui.microBenchKicker": "compound microscope",
    "ui.micro3dSection": "Escenario 3D",
    "ui.micro3dEntry": "Microscopio compuesto \xB7 3D",
    "ui.micro3dLede": "Escenario \xF3ptico WebGL dedicado \xB7 separado del 2D del cat\xE1logo",
    "ui.userModel": "+ modelo propio",
    "ui.manual": "manual",
    "ui.ethics": "\xE9tica",
    "ui.contrast": "contraste",
    "ui.expandAll": "expandir todo",
    "ui.collapseAll": "plegar todo",
    "ui.foldHint": "Plegado: todo abierto/cerrado; clic en el t\xEDtulo",
    "ui.recents": "recientes",
    "ui.noMatch": "sin coincidencias",
    "ui.openMenu": "Abrir lista de modelos",
    "ui.closeMenu": "Cerrar lista de modelos",
    "ui.params": "par\xE1metros",
    "ui.paramsCollapse": "ocultar",
    "ui.paramsTitle": "Abrir banco de par\xE1metros",
    "ui.rerun": "re-ejecutar",
    "ui.rerunTitle": "Mantener par\xE1metros; reintegrar desde t=0",
    "ui.pause": "pause",
    "ui.play": "play",
    "ui.bench": "banco",
    "ui.benchKicker": "param module",
    "ui.close": "close",
    "ui.formulaNotes": "formula / notes",
    "ui.readouts": "readouts",
    "ui.baselineCurrent": "comparaci\xF3n actual",
    "ui.saveSnap": "guardar",
    "ui.copyReadouts": "copiar valores",
    "ui.export": "exportar",
    "ui.withShots": "con imagen",
    "ui.classPack": "paquete clase",
    "ui.import": "importar",
    "ui.pinBaseline": "fijar base",
    "ui.authority": "autoridad e hip\xF3tesis",
    "ui.srTable": "tabla de lecturas",
    "ui.safeRestore": "valores seguros",
    "ui.hintDefault": "ajustar a la derecha",
    "ui.bootReload": "Volviendo a cargar\u2026",
    "ui.bootManual": "No se puede actualizar solo. Recarga la p\xE1gina manualmente.",
    "ui.bootDismiss": "Cerrar",
    "ui.fidelityEngineering": "ingenier\xEDa",
    "ui.fidelityPrinciple": "principio",
    "ui.formulaPrefix": "Ecuaci\xF3n",
    "ui.assumptionPrefix": "Hip\xF3tesis",
    "ui.truncated": "{text}\u2026",
    "ui.assumptionSource": "Las hip\xF3tesis est\xE1n en la ficha del modelo (idioma del cat\xE1logo).",
    "caveat.nuclear": "Solo la definici\xF3n p\xFAblica. No es una herramienta de dise\xF1o de reactores o dispositivos.",
    "caveat.electrochem": "Solo la definici\xF3n p\xFAblica. No es una herramienta de dise\xF1o de procesos o formulaciones.",
    "caveat.membrane": "Solo la definici\xF3n p\xFAblica. No es una herramienta cl\xEDnica ni de dosificaci\xF3n.",
    "ui.applyBanner": "Din\xE1mica en vivo; inicial/num\xE9rico reinicia",
    "ui.paramsUnit": "params",
    "ui.live": "vivo",
    "ui.reinit": "reinicio",
    "group.dynamics": "din\xE1mica",
    "group.initial": "inicial",
    "group.display": "pantalla",
    "group.numerics": "num\xE9rico",
    "group.custom": "custom",
    "group.global": "sistema",
    "domain.\u7269\u7406": "F\xEDsica",
    "domain.\u8BA1\u7B97\u673A\u79D1\u5B66": "Inform\xE1tica",
    "domain.\u8BA1\u7B97\u673A\u5DE5\u7A0B": "Ing. inform\xE1tica",
    "domain.\u5DE5\u7A0B": "Ingenier\xEDa",
    "domain.\u5316\u5B66\u5DE5\u7A0B": "Ing. qu\xEDmica",
    "domain.\u5730\u7403\u79D1\u5B66": "Ciencias de la Tierra",
    "domain.\u7ECF\u6D4E\u4E0E\u7BA1\u7406": "Econom\xEDa y gesti\xF3n",
    "domain.\u5176\u4ED6": "Otros"
  },
  fr: {
    "ui.search": "rechercher",
    "ui.searchPh": "sous / CS / CE / formula",
    "ui.tag": "\xE9tiquette",
    "ui.form": "forme",
    "ui.all": "tout",
    "ui.lang": "langue",
    "ui.shell": "shell",
    "ui.microExit": "Retour au catalogue",
    "ui.microLede": "Tube fini \xB7 optique Hecht \xB7 limite d\u2019Abbe depuis le NA vivant",
    "ui.microReset": "R\xE9initialiser l\u2019optique",
    "ui.microBench": "Param\xE8tres optiques",
    "ui.microBenchKicker": "compound microscope",
    "ui.micro3dSection": "Sc\xE8ne 3D",
    "ui.micro3dEntry": "Microscope compos\xE9 \xB7 3D",
    "ui.micro3dLede": "Sc\xE8ne optique WebGL d\xE9di\xE9e \xB7 s\xE9par\xE9e du 2D catalogue",
    "ui.userModel": "+ mod\xE8le perso",
    "ui.manual": "manuel",
    "ui.ethics": "\xE9thique",
    "ui.contrast": "contraste",
    "ui.expandAll": "tout ouvrir",
    "ui.collapseAll": "tout fermer",
    "ui.foldHint": "Pliage : tout ouvrir/fermer ; clic sur le titre",
    "ui.recents": "r\xE9cents",
    "ui.noMatch": "aucun r\xE9sultat",
    "ui.openMenu": "Ouvrir la liste",
    "ui.closeMenu": "Fermer la liste",
    "ui.params": "param\xE8tres",
    "ui.paramsCollapse": "masquer",
    "ui.paramsTitle": "Ouvrir le banc de param\xE8tres",
    "ui.rerun": "relancer",
    "ui.rerunTitle": "Garder les param\xE8tres ; r\xE9int\xE9grer depuis t=0",
    "ui.pause": "pause",
    "ui.play": "play",
    "ui.bench": "banc",
    "ui.benchKicker": "param module",
    "ui.close": "close",
    "ui.formulaNotes": "formula / notes",
    "ui.readouts": "readouts",
    "ui.baselineCurrent": "comparaison actuelle",
    "ui.saveSnap": "enregistrer",
    "ui.copyReadouts": "copier",
    "ui.export": "exporter",
    "ui.withShots": "avec image",
    "ui.classPack": "pack cours",
    "ui.import": "importer",
    "ui.pinBaseline": "\xE9pingler",
    "ui.authority": "autorit\xE9 et hypoth\xE8ses",
    "ui.srTable": "tableau texte",
    "ui.safeRestore": "d\xE9fauts s\xFBrs",
    "ui.hintDefault": "r\xE9gler \xE0 droite",
    "ui.bootReload": "Rechargement\u2026",
    "ui.bootManual": "Actualisation automatique impossible. Rechargez la page manuellement.",
    "ui.bootDismiss": "Fermer",
    "ui.fidelityEngineering": "ing\xE9nierie",
    "ui.fidelityPrinciple": "principe",
    "ui.formulaPrefix": "\xC9quation",
    "ui.assumptionPrefix": "Hypoth\xE8ses",
    "ui.truncated": "{text}\u2026",
    "ui.assumptionSource": "Les hypoth\xE8ses sont dans la fiche du mod\xE8le (langue du catalogue).",
    "caveat.nuclear": "D\xE9finition publique seulement. Pas un outil de conception de r\xE9acteur ou d\u2019appareil.",
    "caveat.electrochem": "D\xE9finition publique seulement. Pas un outil de conception de proc\xE9d\xE9 ou de formulation.",
    "caveat.membrane": "D\xE9finition publique seulement. Pas un outil clinique ou de dosage.",
    "ui.applyBanner": "Dynamique en direct ; initial/num\xE9rique r\xE9initialise",
    "ui.paramsUnit": "params",
    "ui.live": "live",
    "ui.reinit": "r\xE9init",
    "group.dynamics": "dynamique",
    "group.initial": "initial",
    "group.display": "affichage",
    "group.numerics": "num\xE9rique",
    "group.custom": "custom",
    "group.global": "syst\xE8me",
    "domain.\u7269\u7406": "Physique",
    "domain.\u8BA1\u7B97\u673A\u79D1\u5B66": "Informatique",
    "domain.\u8BA1\u7B97\u673A\u5DE5\u7A0B": "G\xE9nie informatique",
    "domain.\u5DE5\u7A0B": "Ing\xE9nierie",
    "domain.\u5316\u5B66\u5DE5\u7A0B": "G\xE9nie chimique",
    "domain.\u5730\u7403\u79D1\u5B66": "Sciences de la Terre",
    "domain.\u7ECF\u6D4E\u4E0E\u7BA1\u7406": "\xC9conomie & gestion",
    "domain.\u5176\u4ED6": "Autre"
  },
  de: {
    "ui.search": "Suche",
    "ui.searchPh": "Unter / CS / CE / formula",
    "ui.tag": "Tag",
    "ui.form": "Form",
    "ui.all": "alle",
    "ui.lang": "Sprache",
    "ui.shell": "Shell",
    "ui.microExit": "Zur\xFCck zum Katalog",
    "ui.microLede": "Endliches Rohr \xB7 Hecht-Optik \xB7 Abbe-Grenze aus der live NA",
    "ui.microReset": "Optik zur\xFCcksetzen",
    "ui.microBench": "Optische Parameter",
    "ui.microBenchKicker": "compound microscope",
    "ui.micro3dSection": "3D-B\xFChne",
    "ui.micro3dEntry": "Zusammengesetztes Mikroskop \xB7 3D",
    "ui.micro3dLede": "Eigene WebGL-Optikb\xFChne \xB7 getrennt vom Katalog-2D",
    "ui.userModel": "+ eigenes Modell",
    "ui.manual": "Handbuch",
    "ui.ethics": "Ethik",
    "ui.contrast": "Kontrast",
    "ui.expandAll": "alles \xF6ffnen",
    "ui.collapseAll": "alles schlie\xDFen",
    "ui.foldHint": "Falten: alles auf/zu; Titel klicken",
    "ui.recents": "zuletzt",
    "ui.noMatch": "kein Treffer",
    "ui.openMenu": "Modellliste \xF6ffnen",
    "ui.closeMenu": "Modellliste schlie\xDFen",
    "ui.params": "Parameter",
    "ui.paramsCollapse": "zuklappen",
    "ui.paramsTitle": "Parameterbank \xF6ffnen",
    "ui.rerun": "neu starten",
    "ui.rerunTitle": "Parameter behalten; ab t=0 neu integrieren",
    "ui.pause": "pause",
    "ui.play": "play",
    "ui.bench": "Bank",
    "ui.benchKicker": "param module",
    "ui.close": "close",
    "ui.formulaNotes": "formula / notes",
    "ui.readouts": "readouts",
    "ui.baselineCurrent": "aktueller Vergleich",
    "ui.saveSnap": "speichern",
    "ui.copyReadouts": "Werte kopieren",
    "ui.export": "exportieren",
    "ui.withShots": "mit Bild",
    "ui.classPack": "Klassenpaket",
    "ui.import": "importieren",
    "ui.pinBaseline": "Baseline pinnen",
    "ui.authority": "Autorit\xE4t & Annahmen",
    "ui.srTable": "Text-Ausgaben",
    "ui.safeRestore": "sichere Defaults",
    "ui.hintDefault": "rechts einstellen",
    "ui.bootReload": "Wird neu geladen\u2026",
    "ui.bootManual": "Automatisches Neuladen nicht m\xF6glich. Bitte manuell neu laden.",
    "ui.bootDismiss": "Schlie\xDFen",
    "ui.fidelityEngineering": "Ingenieur",
    "ui.fidelityPrinciple": "Prinzip",
    "ui.formulaPrefix": "Gleichung",
    "ui.assumptionPrefix": "Annahmen",
    "ui.truncated": "{text}\u2026",
    "ui.assumptionSource": "Annahmen stehen im Modelldatensatz (Katalogsprache).",
    "caveat.nuclear": "Nur die \xF6ffentliche Definition. Kein Auslegungswerkzeug f\xFCr Reaktoren oder Anlagen.",
    "caveat.electrochem": "Nur die \xF6ffentliche Definition. Kein Auslegungswerkzeug f\xFCr Prozesse oder Rezepturen.",
    "caveat.membrane": "Nur die \xF6ffentliche Definition. Kein klinisches oder Dosierungswerkzeug.",
    "ui.applyBanner": "Dynamik live; Initial/Numerik reinitialisiert",
    "ui.paramsUnit": "Params",
    "ui.live": "live",
    "ui.reinit": "reinit",
    "group.dynamics": "Dynamik",
    "group.initial": "Initial",
    "group.display": "Anzeige",
    "group.numerics": "Numerik",
    "group.custom": "Custom",
    "group.global": "System",
    "domain.\u7269\u7406": "Physik",
    "domain.\u8BA1\u7B97\u673A\u79D1\u5B66": "Informatik",
    "domain.\u8BA1\u7B97\u673A\u5DE5\u7A0B": "Technische Informatik",
    "domain.\u5DE5\u7A0B": "Ingenieurwesen",
    "domain.\u5316\u5B66\u5DE5\u7A0B": "Chemieingenieurwesen",
    "domain.\u5730\u7403\u79D1\u5B66": "Geowissenschaften",
    "domain.\u7ECF\u6D4E\u4E0E\u7BA1\u7406": "Wirtschaft & Management",
    "domain.\u5176\u4ED6": "Sonstiges"
  }
};

// js/i18n/index.js
var STORAGE_KEY = "physics-lab-locale-v1";
var DEFAULT = "en";
var locale = DEFAULT;
var listeners = /* @__PURE__ */ new Set();
var modelPacks = {};
var packPromises = {};
function readUrlLang() {
  try {
    const q = new URLSearchParams(location.search).get("lang");
    if (q && STRINGS[q]) return q;
  } catch {
  }
  return null;
}
function writeUrlLang(id) {
  try {
    const url = new URL(location.href);
    if (id === DEFAULT) url.searchParams.delete("lang");
    else url.searchParams.set("lang", id);
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  } catch {
  }
}
function detect() {
  const fromUrl = readUrlLang();
  if (fromUrl) return fromUrl;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && STRINGS[saved]) return saved;
  } catch {
  }
  const language = typeof navigator !== "undefined" && typeof navigator.language === "string" ? navigator.language : "";
  const nav = language.toLowerCase();
  if (nav.startsWith("zh")) return "zh";
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("ko")) return "ko";
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("de")) return "de";
  if (nav.startsWith("en")) return "en";
  return DEFAULT;
}
locale = detect();
function getLocale() {
  return locale;
}
function t(key, vars) {
  const table = STRINGS[locale] || STRINGS[DEFAULT] || {};
  let s = table[key] ?? STRINGS.en?.[key] ?? STRINGS.zh?.[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}
function domainLabel(domain) {
  const key = `domain.${domain}`;
  const out = t(key);
  return out === key ? domain : out;
}
function groupLabels() {
  return {
    dynamics: t("group.dynamics"),
    initial: t("group.initial"),
    display: t("group.display"),
    numerics: t("group.numerics"),
    custom: t("group.custom"),
    global: t("group.global")
  };
}
function htmlLang(id) {
  if (id === "zh") return "zh-CN";
  if (id === "ja") return "ja";
  if (id === "ko") return "ko";
  return id;
}
async function ensureModelPack(id) {
  if (id === "zh") return null;
  if (modelPacks[id]) return modelPacks[id];
  if (id !== "en" && id !== "ja") return null;
  if (!packPromises[id]) {
    packPromises[id] = (async () => {
      try {
        const stamp = typeof window !== "undefined" && window.__LAB_ASSET_V ? String(window.__LAB_ASSET_V) : "";
        const rel = `./data/locales/models-${id}.json`;
        const url = stamp ? `${rel}${rel.includes("?") ? "&" : "?"}v=${encodeURIComponent(stamp)}` : rel;
        const res = await fetch(url);
        if (res.ok) modelPacks[id] = await res.json();
      } catch {
      }
      return modelPacks[id] || null;
    })();
  }
  return packPromises[id];
}
function localizeModel2(model) {
  if (!model) return model;
  const pack = modelPacks[locale];
  const hit = pack?.[model.id];
  if (!hit) return model;
  return {
    ...model,
    name: hit.name || model.name,
    description: hit.description || model.description
  };
}
function notify() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
    }
  }
}
function setLocale(next, opts = {}) {
  if (!STRINGS[next] || next === locale) {
    if (opts.focusSelect !== false) {
      queueMicrotask(() => document.getElementById("locale-select")?.focus());
    }
    return;
  }
  locale = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
  }
  writeUrlLang(next);
  document.documentElement.lang = htmlLang(next);
  document.documentElement.setAttribute("xml:lang", htmlLang(next));
  applyDomI18n();
  notify();
  void ensureModelPack(next).then(() => notify());
  if (opts.focusSelect !== false) {
    queueMicrotask(() => document.getElementById("locale-select")?.focus());
  }
}
function onLocaleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function applyDomI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const val = t(key);
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      if (el.hasAttribute("data-i18n-placeholder")) el.setAttribute("placeholder", val);
    } else {
      el.textContent = val;
    }
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.setAttribute("placeholder", t(key));
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.setAttribute("title", t(key));
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (key) el.setAttribute("aria-label", t(key));
  });
  const sel = root.querySelector("#locale-select");
  if (sel && sel instanceof HTMLSelectElement && sel.value !== locale) {
    sel.value = locale;
  }
}
function mountLocaleSelect(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  for (const loc of LOCALES) {
    const opt = document.createElement("option");
    opt.value = loc.id;
    opt.textContent = loc.label;
    selectEl.appendChild(opt);
  }
  selectEl.value = locale;
  selectEl.addEventListener("change", () => {
    setLocale(selectEl.value, { focusSelect: true });
  });
}
function bootI18n() {
  const fromUrl = readUrlLang();
  if (fromUrl && fromUrl !== locale) locale = fromUrl;
  document.documentElement.lang = htmlLang(locale);
  document.documentElement.setAttribute("xml:lang", htmlLang(locale));
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
  }
  writeUrlLang(locale);
  applyDomI18n();
  return ensureModelPack(locale);
}
function ensureSidebarLocales() {
  return ensureModelPack(locale);
}
if (typeof document !== "undefined") {
  document.documentElement.lang = htmlLang(locale);
}

export {
  drawArrow,
  drawZigZagSpring,
  formatNum,
  parseUserNumber,
  formatDtFriendly,
  validateCustomParam,
  P,
  accelExtras,
  springK,
  finiteOr,
  clampNumber,
  formatParamNumber,
  inferBounds,
  sanitizeGlobals,
  inferUnit,
  inferGroup,
  palettesReadyNow,
  palettesReady,
  setModelPalette,
  getActiveModelId,
  getModelColors,
  C,
  heatTempColor,
  phaseHueColor,
  drawPaletteLegend,
  forceGraphStep,
  mapNormToScreen,
  paintGraph,
  localizeSchema,
  localizeModel,
  FAMILY_META,
  HAND_FORMALISM,
  formalismFor,
  familyCapabilities,
  applyLowInkStrokeBoost,
  STRINGS,
  getLocale,
  t,
  domainLabel,
  groupLabels,
  localizeModel2,
  onLocaleChange,
  applyDomI18n,
  mountLocaleSelect,
  bootI18n,
  ensureSidebarLocales
};
