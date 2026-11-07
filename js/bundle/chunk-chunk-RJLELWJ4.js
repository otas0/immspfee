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
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
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

// data/palettes/cold-stub.json
var cold_stub_default = {
  neutral: {
    axis: "#5c6570",
    ground: "#6b7280",
    muted: "#94a3b8",
    theory: "#64748b",
    text: "#94a3b8",
    bg: "#000000",
    flash: "rgba(255, 220, 100, 0.45)"
  },
  models: {
    "free-fall": {
      swatch: "#f0b429",
      body: "#f0b429",
      body2: "#d97706",
      accent: "#fb7185",
      vector: "#2dd4bf",
      trail: "rgba(240, 180, 41, 0.4)",
      legend: [
        "\u7403 body",
        "\u901F\u5EA6 vector"
      ]
    }
  },
  hc: {
    saturationScale: 0.42,
    lightnessBoost: 0.08
  }
};

// js/utils/theme.js
var activeModelId = "free-fall";
var NEUTRAL = cold_stub_default.neutral;
var MODEL = cold_stub_default.models;
var HC = cold_stub_default.hc || { saturationScale: 0.42, lightnessBoost: 0.08 };
var palettesSettled = typeof document === "undefined" || !!MODEL["free-fall"] || Object.keys(MODEL).length > 1;
var hydratedDomains = new Set(typeof document === "undefined" ? ["*"] : []);
var domainMapPromise = null;
var domainHydrates = /* @__PURE__ */ new Map();
function palettesReadyNow() {
  return palettesSettled;
}
function loadDomainMap() {
  if (typeof document === "undefined") return Promise.resolve({});
  if (!domainMapPromise) {
    domainMapPromise = fetch(new URL("data/palettes/model-domain.json", document.baseURI).href).then((res) => res.ok ? res.json() : {}).catch(() => ({}));
  }
  return domainMapPromise;
}
function hydratePaletteDomain(domain) {
  if (typeof document === "undefined") return Promise.resolve();
  const key = domain || "\u5176\u4ED6";
  if (hydratedDomains.has(key) || hydratedDomains.has("*")) return Promise.resolve();
  if (domainHydrates.has(key)) return domainHydrates.get(key);
  const file = String(key).replace(/\//g, "__");
  const safe = encodeURIComponent(file);
  const task = fetch(new URL(`data/palettes/domains/${safe}.json`, document.baseURI).href).then((res) => res.ok ? res.json() : null).then((doc) => {
    if (doc?.models) {
      Object.assign(MODEL, doc.models);
      hydratedDomains.add(key);
      palettesSettled = true;
      try {
        document.documentElement.dataset.palettesFull = hydratedDomains.size > 0 ? "1" : "";
      } catch {
      }
      document.dispatchEvent(new Event("imm-palettes"));
    }
  }).catch(() => {
    palettesSettled = true;
  }).finally(() => {
    domainHydrates.delete(key);
  });
  domainHydrates.set(key, task);
  return task;
}
async function hydratePalettesForModel(modelId) {
  if (typeof document === "undefined") return;
  if (modelId === "free-fall" && MODEL["free-fall"]) {
    palettesSettled = true;
    return;
  }
  const map = await loadDomainMap();
  const domain = map[modelId] || "\u5176\u4ED6";
  await hydratePaletteDomain(domain);
}
var palettesReady = typeof document !== "undefined" && !MODEL["free-fall"] && Object.keys(MODEL).length === 0 ? hydratePaletteDomain("\u7269\u7406") : Promise.resolve().then(() => {
  palettesSettled = true;
});
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
  const hue2rgb = (p2, q2, t) => {
    let tt = t;
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
function heatTempColor(t, tMin, tMax) {
  const u = Math.max(0, Math.min(1, (t - tMin) / Math.max(1e-9, tMax - tMin)));
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
  hydratePalettesForModel,
  palettesReady,
  setModelPalette,
  getActiveModelId,
  getModelColors,
  C,
  heatTempColor,
  phaseHueColor,
  drawPaletteLegend
};
