import {
  applyLowInkStrokeBoost,
  familyCapabilities,
  localizeSchema
} from "./chunk-chunk-4QGOOICJ.js";
import {
  overrideOptions
} from "./chunk-chunk-54AD6SA2.js";
import {
  forceGraphStep,
  mapNormToScreen,
  paintGraph
} from "./chunk-chunk-O2CR3FKE.js";
import {
  C,
  P,
  drawArrow,
  formatNum,
  heatTempColor
} from "./chunk-chunk-RJLELWJ4.js";
import {
  createRingTrail,
  ensureRingCap,
  mobileBudget,
  particleHashCell,
  perfClassFor,
  pushTrail,
  ringForEach,
  ringLast,
  ringPush
} from "./chunk-chunk-ZIYIE64H.js";
import {
  __export
} from "./chunk-chunk-KX6VIJEB.js";

// js/lab/sketches.js
function ink() {
  return C.body || "#fff";
}
function muted() {
  return C.muted || "#888";
}
function arrow(ctx, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  const ux = dx / len;
  const uy = dy / len;
  const s = 8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ux * s - uy * 4, y1 - uy * s + ux * 4);
  ctx.lineTo(x1 - ux * s + uy * 4, y1 - uy * s - ux * 4);
  ctx.closePath();
  ctx.fill();
}
function drawCollision(ctx, W, H, state, spec) {
  const blob = `${spec?.id || ""} ${spec?.name || ""} ${spec?.formula || ""}`;
  const oblique = /斜碰|法向/.test(blob);
  const e = P(state.params, "e", oblique ? 0.8 : 1);
  ctx.fillStyle = muted();
  ctx.font = "12px IBM Plex Mono, monospace";
  ctx.fillText(`e = ${Number(e).toFixed(2)}`, 16, 36);
  if (oblique) {
    const un = P(state.params, "un", 3);
    const vn = Number.isFinite(state.y) ? state.y : -e * un;
    const maxV2 = Math.max(1, Math.abs(un), Math.abs(vn));
    const y = H * 0.55;
    ctx.fillText("\u6CD5\u5411", 16, y - 28);
    [un, vn].forEach((vel, k) => {
      const cx = W * (0.32 + k * 0.4);
      ctx.beginPath();
      ctx.fillStyle = k ? "#9ad" : "#fc8";
      ctx.arc(cx, y, 16, 0, Math.PI * 2);
      ctx.fill();
      const len = vel / maxV2 * (W * 0.18);
      ctx.strokeStyle = ink();
      ctx.fillStyle = ink();
      arrow(ctx, cx + 18 * Math.sign(len || 1), y, cx + 18 * Math.sign(len || 1) + len, y);
      ctx.fillStyle = muted();
      ctx.fillText(vel.toFixed(2), cx - 18, y + 36);
    });
    const ut = P(state.params, "ut", 2);
    const yT = Math.min(H - 28, y + 70);
    ctx.fillStyle = muted();
    ctx.fillText("\u5207\u5411 ut\uFF08\u4E0D\u53C2\u4E0E e\uFF09", 16, yT - 16);
    ctx.save?.();
    ctx.setLineDash?.([5, 4]);
    ctx.strokeStyle = muted();
    ctx.fillStyle = muted();
    const lenT = ut / Math.max(maxV2, Math.abs(ut), 1) * (W * 0.18);
    arrow(ctx, W * 0.32, yT, W * 0.32 + lenT, yT);
    ctx.setLineDash?.([]);
    ctx.restore?.();
    ctx.fillText(Number(ut).toFixed(2), W * 0.32 - 18, yT + 18);
    return true;
  }
  const u1 = P(state.params, "u1", P(state.params, "v2", 4));
  const u2 = P(state.params, "u2", 0);
  const v1 = Number.isFinite(state.v1) ? state.v1 : Number.isFinite(state.y) ? state.y : u1;
  const v2 = Number.isFinite(state.v2) ? state.v2 : P(state.params, "v2", 0);
  const rows = [
    ["\u78B0\u524D", u1, u2],
    ["\u78B0\u540E", v1, v2]
  ];
  const maxV = Math.max(1, ...rows.flatMap((r) => [Math.abs(r[1]), Math.abs(r[2])]));
  ctx.strokeStyle = ink();
  ctx.fillStyle = ink();
  ctx.lineWidth = 1.6;
  rows.forEach((row, i) => {
    const y = 78 + i * ((H - 100) / 2);
    ctx.fillStyle = muted();
    ctx.font = "12px IBM Plex Mono, monospace";
    ctx.fillText(row[0], 16, y - 28);
    [0, 1].forEach((k) => {
      const cx = W * (0.32 + k * 0.4);
      ctx.beginPath();
      ctx.fillStyle = k ? "#9ad" : "#fc8";
      ctx.arc(cx, y, 16, 0, Math.PI * 2);
      ctx.fill();
      const vel = row[k + 1];
      const len = vel / maxV * (W * 0.18);
      ctx.strokeStyle = ink();
      ctx.fillStyle = ink();
      arrow(ctx, cx + 18 * Math.sign(len || 1), y, cx + 18 * Math.sign(len || 1) + len, y);
      ctx.fillStyle = muted();
      ctx.fillText(vel.toFixed(2), cx - 18, y + 36);
    });
  });
  return true;
}
function drawLens(ctx, W, H, state) {
  const f = Math.abs(P(state.params, "f", 0.1)) || 0.1;
  const u = P(state.params, "u", -0.3);
  const v = Number.isFinite(state.v) ? state.v : Number.isFinite(state.y) ? state.y : 0.15;
  const midY = H * 0.55;
  const cx = W * 0.48;
  const scale = Math.min(W, H) * 0.9 / Math.max(0.2, Math.abs(u) + Math.abs(v) + 2 * f);
  ctx.strokeStyle = ink();
  ctx.fillStyle = ink();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(28, midY);
  ctx.lineTo(W - 20, midY);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, midY, 8, 54, 0, 0, Math.PI * 2);
  ctx.stroke();
  const objX = cx + u * scale;
  const imgX = cx + v * scale;
  const objH = 36;
  const imgH = objH * (Number.isFinite(v / u) ? Math.abs(v / u) : 1);
  ctx.strokeStyle = "#fc8";
  arrow(ctx, objX, midY, objX, midY - objH);
  ctx.strokeStyle = "#9ad";
  const dir = v * u < 0 ? 1 : -1;
  arrow(ctx, imgX, midY, imgX, midY - dir * Math.min(80, imgH));
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.moveTo(objX, midY - objH);
  ctx.lineTo(cx, midY - objH);
  ctx.lineTo(imgX, midY - dir * Math.min(80, imgH));
  ctx.stroke();
  ctx.fillStyle = muted();
  ctx.font = "12px IBM Plex Mono, monospace";
  ctx.fillText(`f=${f.toFixed(3)}  u=${u.toFixed(3)}  v=${Number.isFinite(v) ? v.toFixed(3) : "\u2014"}`, 16, H - 16);
  return true;
}
function drawWave(ctx, W, H, state, standing) {
  const A = P(state.params, "A", 1) || 1;
  const k = P(state.params, "k", P(state.params, "omega", 3)) || 3;
  const w = P(state.params, "w", P(state.params, "omega", 4)) || 4;
  const t = state.t || 0;
  const l = 36;
  const r = W - 20;
  const mid = H * 0.55;
  const amp = Math.min(70, (H - 120) / 2);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(l, mid);
  ctx.lineTo(r, mid);
  ctx.stroke();
  ctx.strokeStyle = ink();
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  const n = 120;
  for (let i = 0; i <= n; i += 1) {
    const x = i / n;
    const phase = standing ? Math.sin(k * x * Math.PI) * Math.cos(w * t) : Math.sin(k * x * Math.PI * 2 - w * t);
    const px = l + x * (r - l);
    const py = mid - phase * amp * Math.sign(A || 1);
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = muted();
  ctx.font = "12px IBM Plex Mono, monospace";
  ctx.fillText(standing ? "\u9A7B\u6CE2  y \u221D sin(kx) cos(\u03C9t)" : "\u884C\u6CE2  y \u221D sin(kx \u2212 \u03C9t)", 16, 48);
  return true;
}
function drawBar(ctx, W, H, state, equation) {
  const hist = state.hist || [];
  const v = hist.length ? hist[hist.length - 1] : 0;
  const span = Math.max(1, Math.abs(v));
  const l = 48;
  const r = W - 36;
  const y = H * 0.58;
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.moveTo(l, y);
  ctx.lineTo(r, y);
  ctx.stroke();
  const mid = (l + r) / 2;
  const tip = mid + v / span * (r - l) * 0.42;
  ctx.strokeStyle = ink();
  ctx.fillStyle = ink();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(mid, y);
  ctx.lineTo(tip, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(tip, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = muted();
  ctx.font = "12px IBM Plex Mono, monospace";
  const label = String(equation || "").slice(0, 72);
  ctx.fillText(label, 16, H - 18);
  ctx.fillStyle = ink();
  ctx.font = "600 18px IBM Plex Mono, monospace";
  ctx.fillText(Number.isFinite(v) ? v.toExponential(3) : "\u2014", 16, y - 16);
  return true;
}
function drawBohr(ctx, W, H, state) {
  const nSel = Math.max(1, Math.round(P(state.params, "n", 2)));
  const top = 52;
  const bot = H - 36;
  const yOf = (e) => top + (0 - e) / 13.6 * (bot - top);
  ctx.fillStyle = muted();
  ctx.font = "12px IBM Plex Mono, monospace";
  ctx.fillText(`n=${nSel}  E=${(-13.6 / (nSel * nSel)).toFixed(2)} eV`, 16, 40);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(28, yOf(0));
  ctx.lineTo(W * 0.46, yOf(0));
  ctx.stroke();
  for (let n = 1; n <= 6; n += 1) {
    const e = -13.6 / (n * n);
    const y = yOf(e);
    ctx.strokeStyle = n === nSel ? "#fc8" : ink();
    ctx.lineWidth = n === nSel ? 2.4 : 1.2;
    ctx.beginPath();
    ctx.moveTo(28, y);
    ctx.lineTo(W * 0.46, y);
    ctx.stroke();
    ctx.fillStyle = n === nSel ? "#fc8" : muted();
    ctx.fillText(`${n}`, 14, y - 3);
  }
  const cx = W * 0.74;
  const cy = H * 0.56;
  ctx.fillStyle = "#fc8";
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  for (let n = 1; n <= 4; n += 1) {
    const r = 14 + n * n * 3.2;
    ctx.strokeStyle = n === nSel ? "#9ad" : "rgba(255,255,255,0.35)";
    ctx.lineWidth = n === nSel ? 2 : 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = muted();
  ctx.fillText("\u8F68\u9053 r\u221Dn\xB2", cx - 28, H - 16);
  return true;
}
function drawNeutron(ctx, W, H) {
  const l = 36;
  const r = W - 20;
  const mid = H * 0.58;
  const amp = Math.min(78, Math.max(36, (H - 110) / 2));
  ctx.fillStyle = muted();
  ctx.font = "12px IBM Plex Mono, monospace";
  ctx.fillText("\u03C6 = \u03C6\u2080 cos(\u03C0x/a)", 16, 64);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(l, mid);
  ctx.lineTo(r, mid);
  ctx.stroke();
  ctx.strokeStyle = "#9d9";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  const n = 96;
  for (let i = 0; i <= n; i += 1) {
    const x = -0.5 + i / n;
    const phi = Math.cos(Math.PI * x);
    const px = l + i / n * (r - l);
    const py = mid - phi * amp;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.stroke();
  return true;
}
function drawRiver(ctx, W, H, state) {
  const xi = P(state.params, "xi", 0);
  const Ed = Math.max(1e-3, P(state.params, "E", 5));
  const t = Math.max(0.05, state.t || 0.05);
  const sigma = Math.sqrt(2 * Ed * t);
  const l = 36;
  const r = W - 20;
  const base = H * 0.72;
  const amp = Math.min(90, Math.max(40, H * 0.42));
  ctx.fillStyle = muted();
  ctx.font = "12px IBM Plex Mono, monospace";
  const apart = Math.abs(xi) > 1e-6;
  ctx.fillText(apart ? `\u63A2\u9488\u8DDD\u5CF0 \u03BE=${Number(xi).toFixed(2)} m` : "\u63A2\u9488\u5728\u5CF0 \u03BE=0", 16, 44);
  ctx.strokeStyle = "#9cf";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  const n = 80;
  const span = Math.max(4 * sigma, Math.abs(xi) + 2 * sigma, 1);
  for (let i = 0; i <= n; i += 1) {
    const x = -span + 2 * span * i / n;
    const g = Math.exp(-(x * x) / (4 * Ed * t));
    const px = l + i / n * (r - l);
    const py = base - g * amp;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.stroke();
  const xToPx = (x) => l + (x + span) / (2 * span) * (r - l);
  const peakX = xToPx(0);
  const probeX = xToPx(xi);
  ctx.strokeStyle = "#fc8";
  ctx.beginPath();
  ctx.moveTo(peakX, base);
  ctx.lineTo(peakX, base - amp);
  ctx.stroke();
  ctx.fillText("\u5CF0", peakX - 6, base + 16);
  if (apart) {
    ctx.strokeStyle = "#f88";
    ctx.beginPath();
    ctx.moveTo(probeX, base);
    ctx.lineTo(probeX, base - amp * Math.exp(-(xi * xi) / (4 * Ed * t)));
    ctx.stroke();
    ctx.fillStyle = "#f88";
    ctx.fillText("\u63A2\u9488", probeX - 12, base + 16);
  }
  return true;
}
function histFlat(state) {
  const hist = state.hist || [];
  if (hist.length < 2) return true;
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of hist) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return !Number.isFinite(lo) || hi - lo < 1e-6 * Math.max(1, Math.abs(hi));
}
function sketchKind(spec) {
  const blob = `${spec?.id || ""} ${spec?.name || ""} ${spec?.formula || ""}`;
  if (/玻尔模型|玻尔能级|E_n\s*=\s*[−-]13\.6|E_n=[−-]13\.6/.test(blob) && !/玻尔兹曼/.test(blob)) return "bohr";
  if (/中子扩散|neutron-diffusion|π\s*x\s*\/\s*a|πx\/a/.test(blob)) return "neutron";
  if (/污染物扩散|探针在峰位|距峰 ξ/.test(blob)) return "river";
  if (/碰撞|斜碰|法向|撞墙|反冲|collision/i.test(blob)) return "collision";
  if (/透镜|lens/i.test(blob)) return "lens";
  if (/驻波|行波|横波|纵波|standing-wave|waveTravel|sin\(kx/i.test(blob)) return "wave";
  return "";
}
function drawTopicSketch(ctx, spec, state, view) {
  const W = view?.width || 640;
  const H = view?.height || 360;
  const kind = sketchKind(spec);
  if (kind === "bohr") return drawBohr(ctx, W, H, state);
  if (kind === "neutron") return drawNeutron(ctx, W, H);
  if (kind === "river") return drawRiver(ctx, W, H, state);
  if (kind === "collision") return drawCollision(ctx, W, H, state, spec);
  if (kind === "lens") return drawLens(ctx, W, H, state);
  if (kind === "wave") return drawWave(ctx, W, H, state, /驻波|standing/.test(`${spec?.id || ""} ${spec?.name || ""} ${spec?.formula || ""}`));
  if (histFlat(state)) return drawBar(ctx, W, H, state, spec?.formula);
  return false;
}

// js/lab/topicModel.js
var S = (label, group, unit, min, max) => ({ label, group, unit, min, max });
function spd() {
  return S("\u52A8\u753B\u901F", "dynamics", "\u2014", 0.1, 8);
}
function thicken(params, paramSchema) {
  if (Object.keys(paramSchema).length >= 4) return;
  if (!paramSchema.t0) {
    params.t0 = params.t0 ?? 0;
    paramSchema.t0 = S("t\u2080", "initial", "s", 0, 60);
  }
  if (Object.keys(paramSchema).length >= 4) return;
  if (!paramSchema.plotScale) {
    params.plotScale = params.plotScale ?? 1;
    paramSchema.plotScale = S("\u4F5C\u56FE\u6BD4\u4F8B", "display", "\u2014", 0.2, 5);
  }
}
function shell(spec, o) {
  const params = { speed: 1, ...o.params || {} };
  const paramSchema = { speed: spd(), ...o.schema || {} };
  thicken(params, paramSchema);
  const equation = o.equation || spec.formula || "";
  return {
    id: spec.id,
    name: spec.name,
    tags: [spec.domain, spec.sub].filter(Boolean),
    formula: equation,
    description: spec.description || "",
    sub: spec.sub || "",
    topicBound: true,
    deprecated: false,
    authority: o.authority,
    assumptions: o.assumptions,
    fidelity: o.fidelity || "engineering",
    params,
    paramSchema,
    init(state) {
      state.t = 0;
      state.hist = [];
      o.init?.(state);
      this.step(state, 0);
      if (state.hist.length === 1) state.hist.push(state.hist[0]);
    },
    step(state, dt) {
      const sp = Math.min(8, Math.max(0.05, P(state.params, "speed", 1)));
      const h = dt > 0 ? dt * sp : 0;
      state.t += h;
      const clock = state.t;
      state.t = clock + P(state.params, "t0", 0);
      o.tick(state, h);
      state.t = clock;
      let y = Number(o.plot(state));
      if (paramSchema.plotScale) y *= P(state.params, "plotScale", 1);
      state.hist.push(Number.isFinite(y) ? y : 0);
      if (state.hist.length > 200) state.hist.shift();
    },
    draw(ctx, state, view) {
      const W = view?.width || 640;
      const H = view?.height || 360;
      const l = 36;
      const r = W - 28;
      const t = 46;
      const b = H - 28;
      ctx.fillStyle = C.muted || "#888";
      ctx.font = "600 13px IBM Plex Mono, monospace";
      ctx.fillText(spec.name, 14, 22);
      if (drawTopicSketch(ctx, { ...spec, formula: equation }, state, view)) return;
      const hist = state.hist || [];
      if (hist.length < 2) return;
      let lo = Infinity;
      let hi = -Infinity;
      for (const v of hist) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      if (!Number.isFinite(lo) || hi - lo < 1e-9) {
        lo -= 1;
        hi += 1;
      }
      ctx.strokeStyle = C.body || "#fff";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      hist.forEach((v, i) => {
        const x = l + i / (hist.length - 1) * (r - l);
        const y = b - (v - lo) / (hi - lo) * (b - t);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      const rows = [...o.rows(state, d) || []];
      for (const [k, meta] of Object.entries(paramSchema || {})) {
        if (k === "speed" || meta?.group === "display" || meta?.group === "initial") continue;
        if (typeof state.params?.[k] !== "number") continue;
        if (rows.some((r) => r[0] === k)) continue;
        rows.push([k, state.params[k], meta.unit || ""]);
      }
      return rows.map(([label, val, unit]) => ({
        label,
        value: typeof val === "string" ? val : `${formatNum(Number(val), d)}${unit ? ` ${unit}` : ""}`
      }));
    },
    getTrajectory(state) {
      return (state.hist || []).map((v, i) => ({ i, v }));
    }
  };
}
function has(topic, re) {
  return re.test(topic || "");
}
function kin(spec, topic) {
  const blob = topic;
  let x0 = 0;
  let v0 = 8;
  let a = 2;
  let eq = "x = x\u2080 + v\u2080 t + \xBD a t\xB2";
  if (has(blob, /竖直上抛|竖直下抛/)) {
    v0 = 20;
    a = -9.81;
    eq = "v = v\u2080 \u2212 g t\uFF0Cy = y\u2080 + v\u2080 t \u2212 \xBD g t\xB2";
  } else if (has(blob, /自由落体/)) {
    v0 = 0;
    x0 = 20;
    a = -9.81;
    eq = "y = h\u2080 \u2212 \xBD g t\xB2";
  } else if (has(blob, /斜抛|平抛/)) {
    return projectile(spec, has(blob, /平抛/) ? 0 : 45);
  } else if (has(blob, /匀减速/)) {
    v0 = 12;
    a = -2;
    eq = "x = x\u2080 + v\u2080 t + \xBD a t\xB2\uFF08\u9ED8\u8BA4 a = \u22122 m/s\xB2\uFF09";
  } else if (has(blob, /匀加速/)) {
    v0 = 0;
    a = 2;
    eq = "x = x\u2080 + v\u2080 t + \xBD a t\xB2\uFF08\u9ED8\u8BA4 a = +2 m/s\xB2\uFF09";
  } else if (has(blob, /相对/)) {
    return relative(spec);
  } else if (has(blob, /追及|相遇/)) {
    return chase(spec);
  }
  return shell(spec, {
    equation: eq,
    authority: "Halliday, Resnick, Walker, Fundamentals of Physics, \u76F4\u7EBF\u8FD0\u52A8",
    assumptions: "\u4E00\u7EF4\u3001\u5E38\u52A0\u901F\u5EA6\u3001\u65E0\u989D\u5916\u963B\u529B\uFF08\u629B\u4F53\u5206\u652F\u53E6\u89C1\u6C34\u5E73/\u7AD6\u76F4\u5206\u89E3\uFF09",
    params: { x0, v0, a },
    schema: {
      x0: S("x\u2080", "initial", "m", -50, 80),
      v0: S("v\u2080", "initial", "m/s", -40, 40),
      a: S("a", "dynamics", "m/s\xB2", -20, 20)
    },
    tick(state) {
      const t = state.t;
      const x0p = P(state.params, "x0", 0);
      const v0p = P(state.params, "v0", 0);
      const ap = P(state.params, "a", 0);
      state.x = x0p + v0p * t + 0.5 * ap * t * t;
      state.v = v0p + ap * t;
    },
    plot: (s) => s.x,
    rows: (s, d) => [["t", s.t, "s"], ["x", s.x, "m"], ["v", s.v, "m/s"], ["a", P(s.params, "a", 0), "m/s\xB2"]]
  });
}
function projectile(spec, thetaDeg) {
  return shell(spec, {
    equation: "x = v\u2080 cos\u03B8 \xB7 t\uFF0Cy = v\u2080 sin\u03B8 \xB7 t \u2212 \xBD g t\xB2",
    authority: "Halliday, Resnick, Walker, Fundamentals of Physics, \u629B\u4F53\u8FD0\u52A8",
    assumptions: "\u5300\u91CD\u529B\u3001\u65E0\u7A7A\u6C14\u963B\u529B\u3001\u843D\u5730\u524D",
    params: { v0: 16, theta: thetaDeg, g: 9.81, y0: thetaDeg === 0 ? 8 : 0 },
    schema: {
      v0: S("v\u2080", "initial", "m/s", 0, 40),
      theta: S("\u03B8", "initial", "\xB0", 0, 85),
      g: S("g", "dynamics", "m/s\xB2", 0.1, 20),
      y0: S("y\u2080", "initial", "m", 0, 40)
    },
    tick(state) {
      const t = state.t;
      const v0 = P(state.params, "v0", 16);
      const th = P(state.params, "theta", thetaDeg) * Math.PI / 180;
      const g = P(state.params, "g", 9.81);
      const y0 = P(state.params, "y0", 0);
      state.x = v0 * Math.cos(th) * t;
      state.y = y0 + v0 * Math.sin(th) * t - 0.5 * g * t * t;
      state.vx = v0 * Math.cos(th);
      state.vy = v0 * Math.sin(th) - g * t;
    },
    plot: (s) => s.y,
    rows: (s) => [["t", s.t, "s"], ["x", s.x, "m"], ["y", s.y, "m"], ["vx", s.vx, "m/s"], ["vy", s.vy, "m/s"]]
  });
}
function relative(spec) {
  return shell(spec, {
    equation: "v_rel = v\u2081 \u2212 v\u2082\uFF0Cx_rel = x\u2080 + v_rel t",
    authority: "Halliday, Resnick, Walker, \u76F8\u5BF9\u901F\u5EA6\uFF08\u4E00\u7EF4\uFF09",
    assumptions: "\u540C\u4E00\u76F4\u7EBF\u3001\u5E38\u901F\u5EA6",
    params: { v1: 8, v2: 3, x0: 0 },
    schema: {
      v1: S("v\u2081", "dynamics", "m/s", -30, 30),
      v2: S("v\u2082", "dynamics", "m/s", -30, 30),
      x0: S("x\u2080", "initial", "m", -20, 20)
    },
    tick(state) {
      state.vrel = P(state.params, "v1", 8) - P(state.params, "v2", 3);
      state.x = P(state.params, "x0", 0) + state.vrel * state.t;
    },
    plot: (s) => s.x,
    rows: (s) => [["v_rel", s.vrel, "m/s"], ["x_rel", s.x, "m"], ["t", s.t, "s"]]
  });
}
function chase(spec) {
  return shell(spec, {
    equation: "x\u2081 = v\u2081 t\uFF0Cx\u2082 = gap + v\u2082 t\uFF1B\u8FFD\u4E0A\u65F6 t = gap/(v\u2081\u2212v\u2082)",
    authority: "Halliday, Resnick, Walker, \u8FFD\u53CA\uFF08\u5E38\u901F\u5EA6\uFF09",
    assumptions: "\u4E00\u7EF4\u5E38\u901F\u5EA6\uFF1Bv\u2081>v\u2082 \u624D\u8FFD\u4E0A",
    params: { v1: 10, v2: 4, gap: 20 },
    schema: {
      v1: S("v\u2081", "dynamics", "m/s", 0, 40),
      v2: S("v\u2082", "dynamics", "m/s", 0, 40),
      gap: S("\u521D\u59CB\u95F4\u8DDD", "initial", "m", 0, 100)
    },
    tick(state) {
      const v1 = P(state.params, "v1", 10);
      const v2 = P(state.params, "v2", 4);
      const gap = P(state.params, "gap", 20);
      state.x1 = v1 * state.t;
      state.x2 = gap + v2 * state.t;
      state.tCatch = v1 > v2 ? gap / (v1 - v2) : Infinity;
    },
    plot: (s) => s.x1 - s.x2,
    rows: (s) => [["x\u2081", s.x1, "m"], ["x\u2082", s.x2, "m"], ["t_catch", Number.isFinite(s.tCatch) ? s.tCatch : NaN, "s"]]
  });
}
function newton(spec, topic) {
  if (has(topic, /斜面/)) {
    return shell(spec, {
      equation: "a = g (sin\u03B8 \u2212 \u03BC cos\u03B8)",
      authority: "Hibbeler, Engineering Mechanics: Dynamics, \u659C\u9762\u4E0E\u5E93\u4ED1\u6469\u64E6",
      assumptions: "\u521A\u6027\u659C\u9762\u3001\u8D28\u70B9\u3001\u52A8\u6469\u64E6\u6216\u6ED1\u52A8\u65B9\u5411\u6469\u64E6",
      params: { g: 9.81, theta: 30, mu: 0.2, v0: 0 },
      schema: {
        g: S("g", "dynamics", "m/s\xB2", 1, 20),
        theta: S("\u03B8", "dynamics", "\xB0", 0, 70),
        mu: S("\u03BC", "dynamics", "\u2014", 0, 1),
        v0: S("v\u2080", "initial", "m/s", 0, 20)
      },
      tick(state) {
        const g = P(state.params, "g", 9.81);
        const th = P(state.params, "theta", 30) * Math.PI / 180;
        const mu = P(state.params, "mu", 0.2);
        state.a = g * (Math.sin(th) - mu * Math.cos(th));
        state.v = P(state.params, "v0", 0) + state.a * state.t;
        state.s = P(state.params, "v0", 0) * state.t + 0.5 * state.a * state.t * state.t;
      },
      plot: (s) => s.s,
      rows: (s) => [["a", s.a, "m/s\xB2"], ["v", s.v, "m/s"], ["s", s.s, "m"]]
    });
  }
  if (has(topic, /连接|滑轮|Atwood/i)) return atwood(spec);
  if (has(topic, /传送带/)) {
    return shell(spec, {
      equation: "a = \u03BC g\uFF0C\u76F4\u5230 v = v_belt",
      authority: "Hibbeler, Dynamics, \u52A8\u6469\u64E6\u4E0E\u4F20\u9001\u5E26",
      assumptions: "\u6C34\u5E73\u5E26\u3001\u52A8\u6469\u64E6\u3001\u8D28\u70B9\u8FBE\u5230\u5E26\u901F\u540E\u76F8\u5BF9\u9759\u6B62",
      params: { mu: 0.3, g: 9.81, vb: 4, v0: 0 },
      schema: {
        mu: S("\u03BC", "dynamics", "\u2014", 0, 1),
        vb: S("v_belt", "dynamics", "m/s", 0, 20),
        v0: S("v\u2080", "initial", "m/s", 0, 20)
      },
      tick(state) {
        const a = P(state.params, "mu", 0.3) * P(state.params, "g", 9.81);
        const vb = P(state.params, "vb", 4);
        const v0 = P(state.params, "v0", 0);
        const tStar = a > 0 ? Math.max(0, (vb - v0) / a) : 0;
        if (state.t < tStar) {
          state.v = v0 + a * state.t;
          state.s = v0 * state.t + 0.5 * a * state.t * state.t;
        } else {
          state.v = vb;
          const sStar = v0 * tStar + 0.5 * a * tStar * tStar;
          state.s = sStar + vb * (state.t - tStar);
        }
        state.a = state.t < tStar ? a : 0;
      },
      plot: (s) => s.v,
      rows: (s) => [["v", s.v, "m/s"], ["a", s.a, "m/s\xB2"], ["s", s.s, "m"]]
    });
  }
  if (has(topic, /向心|离心/)) {
    return shell(spec, {
      equation: "a_n = v\xB2/r = \u03C9\xB2 r",
      authority: "Halliday, Resnick, Walker, \u5300\u901F\u5706\u5468\u8FD0\u52A8",
      assumptions: "\u901F\u7387\u6052\u5B9A\u3001\u534A\u5F84\u6052\u5B9A\uFF1B\u79BB\u5FC3\u529B\u4E3A\u975E\u60EF\u6027\u7CFB\u8868\u89C2\u529B\uFF0C\u5927\u5C0F m v\xB2/r",
      params: { v: 4, r: 2, m: 1 },
      schema: {
        v: S("v", "dynamics", "m/s", 0, 30),
        r: S("r", "dynamics", "m", 0.2, 20),
        m: S("m", "dynamics", "kg", 0.1, 20)
      },
      tick(state) {
        const v = P(state.params, "v", 4);
        const r = Math.max(0.05, P(state.params, "r", 2));
        state.an = v * v / r;
        state.F = P(state.params, "m", 1) * state.an;
      },
      plot: (s) => s.an,
      rows: (s) => [["a_n", s.an, "m/s\xB2"], ["F", s.F, "N"]]
    });
  }
  if (has(topic, /空气阻力|阻力落体|粘滞/)) {
    return shell(spec, {
      equation: "m v\u2032 = m g \u2212 b v",
      authority: "Thornton & Marion, Classical Dynamics, \xA72.4 \u7EBF\u6027\u963B\u529B",
      assumptions: "\u7EBF\u6027\u963B\u529B\u3001\u7AD6\u76F4\u5411\u4E0B\u4E3A\u6B63\u3001\u5E38 b\u3002t0 \u662F\u53EF\u9009\u89C2\u5BDF\u65F6\u523B\uFF0C\u9ED8\u8BA4\u4E00\u4E2A\u65F6\u95F4\u5E38\u6570 m/b",
      params: { m: 1, g: 9.81, b: 0.4, v0: 0, t0: 2.5 },
      schema: {
        m: S("m", "dynamics", "kg", 0.1, 20),
        b: S("b", "dynamics", "kg/s", 0, 10),
        g: S("g", "dynamics", "m/s\xB2", 1, 20),
        v0: S("v\u2080", "initial", "m/s", 0, 30),
        t0: S("\u89C2\u5BDF\u65F6\u523B t\u2080", "initial", "s", 0, 60)
      },
      tick(state) {
        const m = Math.max(1e-3, P(state.params, "m", 1));
        const b = P(state.params, "b", 0.4);
        const g = P(state.params, "g", 9.81);
        const v0 = P(state.params, "v0", 0);
        const vinf = b > 0 ? m * g / b : v0 + g * state.t;
        state.v = b > 0 ? vinf + (v0 - vinf) * Math.exp(-(b / m) * state.t) : v0 + g * state.t;
        state.vinf = vinf;
      },
      plot: (s) => s.v,
      rows: (s) => [["v", s.v, "m/s"], ["v_\u221E", s.vinf, "m/s"]]
    });
  }
  return shell(spec, {
    equation: "F = m a",
    authority: "Newton, Principia\uFF08\u73B0\u4EE3\u8868\u8FF0\uFF09\uFF1BHalliday \u725B\u987F\u7B2C\u4E8C\u5B9A\u5F8B",
    assumptions: "\u5E38\u8D28\u91CF\u3001\u4E00\u7EF4\u5408\u5916\u529B",
    params: { F: 6, m: 2 },
    schema: {
      F: S("F", "dynamics", "N", -50, 50),
      m: S("m", "dynamics", "kg", 0.1, 50)
    },
    tick(state) {
      const m = Math.max(1e-3, P(state.params, "m", 1));
      state.a = P(state.params, "F", 6) / m;
      state.v = state.a * state.t;
      state.x = 0.5 * state.a * state.t * state.t;
    },
    plot: (s) => s.x,
    rows: (s) => [["a", s.a, "m/s\xB2"], ["v", s.v, "m/s"], ["x", s.x, "m"]]
  });
}
function atwood(spec) {
  return shell(spec, {
    equation: "a = (m\u2081 \u2212 m\u2082) g / (m\u2081 + m\u2082)",
    authority: "Hibbeler, Dynamics, Atwood \u673A",
    assumptions: "\u7406\u60F3\u6ED1\u8F6E\u3001\u8F7B\u7EF3\u3001\u4E24\u8D28\u70B9\u7AD6\u76F4",
    params: { m1: 3, m2: 2, g: 9.81 },
    schema: {
      m1: S("m\u2081", "dynamics", "kg", 0.1, 20),
      m2: S("m\u2082", "dynamics", "kg", 0.1, 20),
      g: S("g", "dynamics", "m/s\xB2", 1, 20)
    },
    tick(state) {
      const m1 = P(state.params, "m1", 3);
      const m2 = P(state.params, "m2", 2);
      const g = P(state.params, "g", 9.81);
      state.a = (m1 - m2) * g / Math.max(1e-6, m1 + m2);
      state.v = state.a * state.t;
    },
    plot: (s) => s.a,
    rows: (s) => [["a", s.a, "m/s\xB2"], ["v", s.v, "m/s"]]
  });
}
function shmFamily(spec, topic) {
  if (has(topic, /阻尼|欠|过|临界/)) {
    return shell(spec, {
      equation: "x\u2033 + 2 \u03B6 \u03C9 x\u2032 + \u03C9\xB2 x = 0",
      authority: "Thornton & Marion, Classical Dynamics, \xA73.4\u20133.5",
      assumptions: "\u7EBF\u6027\u7C98\u6EDE\u963B\u5C3C\u3001\u5E38\u7CFB\u6570",
      params: { omega: 2, zeta: 0.2, x0: 1, v0: 0 },
      schema: {
        omega: S("\u03C9\u2080", "dynamics", "rad/s", 0.2, 8),
        zeta: S("\u03B6", "dynamics", "\u2014", 0, 2),
        x0: S("x\u2080", "initial", "m", -2, 2)
      },
      tick(state) {
        const w = P(state.params, "omega", 2);
        const z = P(state.params, "zeta", 0.2);
        const x0 = P(state.params, "x0", 1);
        const t = state.t;
        if (z < 1) {
          const wd = w * Math.sqrt(1 - z * z);
          state.x = Math.exp(-z * w * t) * x0 * Math.cos(wd * t);
        } else if (Math.abs(z - 1) < 1e-3) {
          state.x = x0 * (1 + w * t) * Math.exp(-w * t);
        } else {
          const s1 = -z * w + w * Math.sqrt(z * z - 1);
          const s2 = -z * w - w * Math.sqrt(z * z - 1);
          state.x = x0 * (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s2 - s1);
        }
      },
      plot: (s) => s.x,
      rows: (s) => [["x", s.x, "m"], ["\u03B6", P(s.params, "zeta", 0), ""]]
    });
  }
  if (has(topic, /受迫|共振|扫频/)) {
    return shell(spec, {
      equation: "x\u2033 + 2 \u03B6 \u03C9\u2080 x\u2032 + \u03C9\u2080\xB2 x = A cos(\u03A9 t)",
      authority: "Thornton & Marion, \u53D7\u8FEB\u963B\u5C3C\u632F\u5B50\u7A33\u6001\u632F\u5E45",
      assumptions: "\u53EA\u663E\u793A\u7A33\u6001\u7279\u89E3\uFF0C\u7565\u53BB\u77AC\u6001",
      params: { w0: 2, zeta: 0.1, Omega: 2, A: 1 },
      schema: {
        w0: S("\u03C9\u2080", "dynamics", "rad/s", 0.2, 8),
        zeta: S("\u03B6", "dynamics", "\u2014", 0.01, 1),
        Omega: S("\u03A9", "dynamics", "rad/s", 0.1, 8),
        A: S("A", "dynamics", "\u2014", 0, 5)
      },
      tick(state) {
        const w0 = P(state.params, "w0", 2);
        const z = P(state.params, "zeta", 0.1);
        const W = P(state.params, "Omega", 2);
        const A = P(state.params, "A", 1);
        const den = Math.sqrt((w0 * w0 - W * W) ** 2 + (2 * z * w0 * W) ** 2);
        state.amp = den > 0 ? A / den : 0;
        state.x = state.amp * Math.cos(W * state.t);
      },
      plot: (s) => s.x,
      rows: (s) => [["x", s.x, "m"], ["\u632F\u5E45", s.amp, "m"]]
    });
  }
  if (has(topic, /单摆|复摆/)) {
    return shell(spec, {
      equation: "\u03B8\u2033 = \u2212(g/L) sin\u03B8\uFF08\u5C0F\u89D2\u65F6 \u03C9=\u221A(g/L) \u6216 \u221A(mgd/I)\uFF09",
      authority: "Thornton & Marion, \xA74.2 \u5355\u6446",
      assumptions: "\u590D\u6446\u7528\u7B49\u6548\u6446\u957F L_eq = I/(m d)\uFF1B\u6B64\u5904\u7528\u53EF\u8C03 L \u7684\u5355\u6446\u65B9\u7A0B",
      params: { g: 9.81, L: 1, theta0: 0.4 },
      schema: {
        L: S("L", "dynamics", "m", 0.2, 4),
        theta0: S("\u03B8\u2080", "initial", "rad", 0.05, 1.2),
        g: S("g", "dynamics", "m/s\xB2", 1, 20)
      },
      tick(state) {
        const w = Math.sqrt(P(state.params, "g", 9.81) / Math.max(0.05, P(state.params, "L", 1)));
        state.theta = P(state.params, "theta0", 0.4) * Math.cos(w * state.t);
        state.T = 2 * Math.PI / w;
      },
      plot: (s) => s.theta,
      rows: (s) => [["\u03B8", s.theta, "rad"], ["T", s.T, "s"]]
    });
  }
  return shell(spec, {
    equation: "x\u2033 = \u2212(k/m) x",
    authority: "Thornton & Marion, \u7B80\u8C10\u632F\u5B50",
    assumptions: "\u80E1\u514B\u5B9A\u5F8B\u3001\u65E0\u963B\u5C3C",
    params: { m: 1, k: 4, x0: 1 },
    schema: {
      m: S("m", "dynamics", "kg", 0.1, 10),
      k: S("k", "dynamics", "N/m", 0.1, 40),
      x0: S("x\u2080", "initial", "m", -2, 2)
    },
    tick(state) {
      const w = Math.sqrt(P(state.params, "k", 4) / Math.max(1e-3, P(state.params, "m", 1)));
      state.x = P(state.params, "x0", 1) * Math.cos(w * state.t);
      state.w = w;
    },
    plot: (s) => s.x,
    rows: (s) => [["x", s.x, "m"], ["\u03C9", s.w, "rad/s"]]
  });
}
function ohm(spec) {
  return shell(spec, {
    equation: "V = I R\uFF0CP = I V",
    authority: "Nilsson & Riedel, Electric Circuits, \u6B27\u59C6\u5B9A\u5F8B",
    assumptions: "\u96C6\u603B\u3001\u7EBF\u6027\u7535\u963B\u3001\u76F4\u6D41",
    params: { I: 0.5, R: 10 },
    schema: {
      I: S("\u7535\u6D41 I", "dynamics", "A", 0, 5),
      R: S("\u7535\u963B R", "dynamics", "\u03A9", 0.1, 100)
    },
    tick(state) {
      state.V = P(state.params, "I", 0.5) * P(state.params, "R", 10);
      state.Pwr = P(state.params, "I", 0.5) * state.V;
    },
    plot: (s) => s.V,
    rows: (s) => [["V", s.V, "V"], ["P", s.Pwr, "W"]]
  });
}
function malus(spec) {
  return shell(spec, {
    equation: "I = I\u2080 cos\xB2\u03B8",
    authority: "Hecht, Optics, Malus \u5B9A\u5F8B",
    assumptions: "\u5165\u5C04\u5149\u5DF2\u7EBF\u504F\u632F\uFF1B\u7406\u60F3\u504F\u632F\u7247\uFF1B\u03B8 \u4E3A\u504F\u632F\u65B9\u5411\u5939\u89D2",
    params: { I0: 1, theta: 30 },
    schema: {
      I0: S("I\u2080", "dynamics", "\u2014", 0, 10),
      theta: S("\u03B8", "dynamics", "\xB0", 0, 180)
    },
    tick(state) {
      const th = P(state.params, "theta", 30) * Math.PI / 180;
      state.I = P(state.params, "I0", 1) * Math.cos(th) ** 2;
    },
    plot: (s) => s.I,
    rows: (s) => [["I", s.I, ""], ["\u03B8", P(s.params, "theta", 0), "\xB0"]]
  });
}
function photo(spec) {
  return shell(spec, {
    equation: "K_max = max(0, hf \u2212 W); R \u221D I only if K_max>0",
    authority: "Einstein photoelectric equation; Halliday (K_max independent of intensity; yield \u221D I above threshold)",
    assumptions: "hf and W both in eV; no space charge; R is a relative yield, not a calibrated current",
    params: { hf: 3, W: 2, intensity: 1 },
    schema: {
      hf: S("\u5149\u5B50\u80FD hf", "dynamics", "eV", 0, 12),
      W: S("\u9038\u51FA\u529F W", "dynamics", "eV", 0, 10),
      intensity: S("\u5149\u5F3A I", "dynamics", "\u2014", 0, 10)
    },
    tick(state) {
      state.K = Math.max(0, P(state.params, "hf", 3) - P(state.params, "W", 2));
      state.rate = state.K > 0 ? Math.max(0, P(state.params, "intensity", 1)) : 0;
    },
    plot: (s) => s.K,
    rows: (s) => [["K_max", s.K, "eV"], ["R", s.rate, "\u221DI"]]
  });
}
function gamma(spec, topic) {
  return shell(spec, {
    equation: has(topic, /长度/) ? "L = L\u2080 / \u03B3" : has(topic, /质能|能量/) ? "E = \u03B3 m c\xB2" : "\u0394t = \u03B3 \u0394\u03C4\uFF0C\u03B3 = 1/\u221A(1\u2212\u03B2\xB2)",
    authority: "French, Special Relativity, \u6216 Rindler\uFF1B\u65F6\u95F4\u81A8\u80C0\u4E0E\u957F\u5EA6\u6536\u7F29",
    assumptions: "\u60EF\u6027\u7CFB\u3001\u03B2<1\uFF1B\u8D28\u80FD\u7528\u9759\u6B62\u8D28\u91CF\u3002\u53CC\u751F\u5B50\u53EA\u7ED9\u51FA \u03B3 \u65F6\u95F4\u6BD4\uFF0C\u4E0D\u662F\u5E7F\u4E49\u76F8\u5BF9\u8BBA",
    fidelity: "engineering",
    params: { beta: 0.6, tau: 1, L0: 1, m: 1 },
    schema: {
      beta: S("\u03B2", "dynamics", "\u2014", 0, 0.99),
      tau: S("\u0394\u03C4", "dynamics", "s", 0, 20),
      L0: S("L\u2080", "dynamics", "m", 0.1, 10),
      m: S("\u9759\u8D28\u91CF m", "dynamics", "\u2014", 0.1, 10)
    },
    tick(state) {
      const b = Math.min(0.999, Math.max(0, P(state.params, "beta", 0.6)));
      state.gamma = 1 / Math.sqrt(1 - b * b);
      state.dt = state.gamma * P(state.params, "tau", 1);
      state.L = P(state.params, "L0", 1) / state.gamma;
      state.E = state.gamma * P(state.params, "m", 1);
    },
    plot: (s) => s.gamma,
    rows: (s) => [["\u03B3", s.gamma, ""], ["\u0394t", s.dt, "s"], ["L", s.L, "m"]]
  });
}
function logistic(spec) {
  return shell(spec, {
    equation: "N = K / (1 + (K/N\u2080 \u2212 1) e^{\u2212r t})",
    authority: "Murray, Mathematical Biology, Logistic \u65B9\u7A0B",
    assumptions: "\u8FDE\u7EED\u3001\u5E38 r \u4E0E K\u3001\u65E0\u65F6\u6EDE",
    params: { r: 0.6, K: 10, N0: 1 },
    schema: {
      r: S("r", "dynamics", "1/s", 0.01, 3),
      K: S("K", "dynamics", "\u2014", 1, 50),
      N0: S("N\u2080", "initial", "\u2014", 0.1, 20)
    },
    tick(state) {
      const r = P(state.params, "r", 0.6);
      const K = Math.max(1e-3, P(state.params, "K", 10));
      const N0 = Math.max(1e-3, P(state.params, "N0", 1));
      state.N = K / (1 + (K / N0 - 1) * Math.exp(-r * state.t));
    },
    plot: (s) => s.N,
    rows: (s) => [["N", s.N, ""], ["K", P(s.params, "K", 0), ""]]
  });
}
function lotka(spec) {
  return shell(spec, {
    equation: "x\u2032 = x(\u03B1 \u2212 \u03B2 y)\uFF0Cy\u2032 = y(\u2212\u03B3 + \u03B4 x)",
    authority: "Murray, Mathematical Biology, Lotka\u2013Volterra",
    assumptions: "\u4E24\u7269\u79CD\u3001\u8D28\u91CF\u4F5C\u7528\u3001\u6B27\u62C9\u79EF\u5206\u4EC5\u4F5C\u793A\u610F\u8F68\u8FF9\uFF08\u6B65\u957F\u53D7\u9650\uFF09",
    fidelity: "principle",
    params: { alpha: 1, beta: 0.2, gamma: 0.8, delta: 0.2, x: 4, y: 2 },
    schema: {
      alpha: S("\u730E\u7269\u589E\u957F \u03B1", "dynamics", "\u2014", 0.1, 3),
      beta: S("\u6355\u98DF\u7387 \u03B2", "dynamics", "\u2014", 0.05, 1),
      gamma: S("\u6355\u98DF\u8005\u6B7B\u4EA1 \u03B3", "dynamics", "\u2014", 0.1, 3),
      delta: S("\u8F6C\u5316\u7387 \u03B4", "dynamics", "\u2014", 0.05, 1),
      x: S("\u730E\u7269 x\u2080", "initial", "\u2014", 0, 20),
      y: S("\u6355\u98DF\u8005 y\u2080", "initial", "\u2014", 0, 20)
    },
    init(state) {
      state.x = P(state.params, "x", 4);
      state.y = P(state.params, "y", 2);
    },
    tick(state, h) {
      if (h <= 0) return;
      const a = P(state.params, "alpha", 1);
      const b = P(state.params, "beta", 0.2);
      const g = P(state.params, "gamma", 0.8);
      const d = P(state.params, "delta", 0.2);
      const n = 8;
      const dt = h / n;
      for (let i = 0; i < n; i += 1) {
        const dx = state.x * (a - b * state.y);
        const dy = state.y * (-g + d * state.x);
        state.x = Math.max(0, state.x + dx * dt);
        state.y = Math.max(0, state.y + dy * dt);
      }
    },
    plot: (s) => s.x,
    rows: (s) => [["x", s.x, ""], ["y", s.y, ""]]
  });
}
function sir(spec, topic) {
  const exposed = has(topic, /SEIR/);
  return shell(spec, {
    equation: exposed ? "SEIR\uFF1AS\u2032=\u2212\u03B2SI\uFF0CE\u2032=\u03B2SI\u2212\u03C3E\uFF0CI\u2032=\u03C3E\u2212\u03B3I" : "SIR\uFF1AS\u2032=\u2212\u03B2SI\uFF0CI\u2032=\u03B2SI\u2212\u03B3I\uFF0CR\u2032=\u03B3I",
    authority: "Kermack & McKendrick; Hethcote, SIAM Rev. 42 (2000) \u4F20\u67D3\u75C5\u8231\u5BA4\u6A21\u578B",
    assumptions: "\u5747\u5300\u6DF7\u5408\u3001\u5E38\u7CFB\u6570\u3001\u603B\u4EBA\u53E3\u5B88\u6052\uFF1B\u975E\u4E34\u5E8A\u9884\u6D4B",
    fidelity: "principle",
    params: { beta: 0.6, gamma: 0.2, sigma: 0.3, I0: 0.02 },
    schema: {
      beta: S("\u03B2", "dynamics", "\u2014", 0.05, 2),
      gamma: S("\u03B3", "dynamics", "\u2014", 0.05, 1),
      sigma: S("\u03C3", "dynamics", "\u2014", 0.05, 1),
      I0: S("I\u2080", "initial", "\u2014", 1e-3, 0.2)
    },
    init(state) {
      state.I = P(state.params, "I0", 0.02);
      state.E = exposed ? state.I : 0;
      state.S = 1 - state.I - state.E;
      state.R = 0;
    },
    tick(state, h) {
      if (h <= 0) return;
      const beta = P(state.params, "beta", 0.6);
      const gamma2 = P(state.params, "gamma", 0.2);
      const sigma = P(state.params, "sigma", 0.3);
      const n = 6;
      const dt = h / n;
      for (let i = 0; i < n; i += 1) {
        const inf = beta * state.S * state.I;
        if (exposed) {
          const dE = inf - sigma * state.E;
          const dI = sigma * state.E - gamma2 * state.I;
          state.S = Math.max(0, state.S - inf * dt);
          state.E = Math.max(0, state.E + dE * dt);
          state.I = Math.max(0, state.I + dI * dt);
          state.R = Math.max(0, 1 - state.S - state.E - state.I);
        } else {
          const dI = inf - gamma2 * state.I;
          state.S = Math.max(0, state.S - inf * dt);
          state.I = Math.max(0, state.I + dI * dt);
          state.R = Math.max(0, 1 - state.S - state.I);
        }
      }
    },
    plot: (s) => s.I,
    rows: (s) => [["S", s.S, ""], ["I", s.I, ""], ["R", s.R, ""]]
  });
}
function lorenzSys(spec) {
  return shell(spec, {
    equation: "x\u2032=\u03C3(y\u2212x), y\u2032=x(\u03C1\u2212z)\u2212y, z\u2032=xy\u2212\u03B2z",
    authority: "Lorenz, J. Atmos. Sci. 20:130 (1963)\uFF1BStrogatz, Nonlinear Dynamics and Chaos",
    assumptions: "\u6807\u51C6\u53C2\u6570\u9644\u8FD1\u7684\u786E\u5B9A\u6027 ODE\uFF1B\u4E0D\u5BF9\u957F\u671F\u5929\u6C14\u505A\u9884\u62A5",
    fidelity: "engineering",
    params: { sigma: 10, rho: 28, beta: 2.667 },
    schema: {
      sigma: S("\u03C3", "dynamics", "\u2014", 1, 20),
      rho: S("\u03C1", "dynamics", "\u2014", 1, 40),
      beta: S("\u03B2", "dynamics", "\u2014", 0.5, 6)
    },
    init(state) {
      state.x = 1;
      state.y = 1;
      state.z = 1;
    },
    tick(state, h) {
      if (h <= 0) return;
      const s = P(state.params, "sigma", 10);
      const r = P(state.params, "rho", 28);
      const b = P(state.params, "beta", 8 / 3);
      const n = 10;
      const dt = Math.min(0.02, h / n);
      const steps = Math.max(1, Math.round(h / dt));
      for (let i = 0; i < steps; i += 1) {
        const dx = s * (state.y - state.x);
        const dy = state.x * (r - state.z) - state.y;
        const dz = state.x * state.y - b * state.z;
        state.x += dx * dt;
        state.y += dy * dt;
        state.z += dz * dt;
      }
    },
    plot: (s) => s.x,
    rows: (s) => [["x", s.x, ""], ["y", s.y, ""], ["z", s.z, ""]]
  });
}
function firstOrderReaction(spec, topic) {
  let order = 1;
  if (has(topic, /零级/)) order = 0;
  if (has(topic, /二级/)) order = 2;
  return shell(spec, {
    equation: order === 0 ? "c = c\u2080 \u2212 k t" : order === 2 ? "1/c \u2212 1/c\u2080 = k t" : "c = c\u2080 e^{\u2212k t}",
    authority: "Fogler, Elements of Chemical Reaction Engineering, \u5E42\u5F8B\u901F\u7387",
    assumptions: "\u6052\u6E29\u3001\u6052\u5BB9\u3001\u5355\u4E00\u53CD\u5E94\uFF1B\u4E0D\u53EF\u5916\u63A8\u4E3A\u5371\u9669\u5DE5\u827A\u653E\u5927",
    params: { c0: 1, k: 0.3 },
    schema: {
      c0: S("c\u2080", "initial", "mol/L", 0.1, 5),
      k: S("k", "dynamics", "\u2014", 0.01, 2)
    },
    tick(state) {
      const c0 = P(state.params, "c0", 1);
      const k = P(state.params, "k", 0.3);
      const t = state.t;
      if (order === 0) state.c = Math.max(0, c0 - k * t);
      else if (order === 2) state.c = 1 / (1 / c0 + k * t);
      else state.c = c0 * Math.exp(-k * t);
    },
    plot: (s) => s.c,
    rows: (s) => [["c", s.c, "mol/L"]]
  });
}
function boolGate(spec, topic) {
  return shell(spec, {
    equation: "\u771F\u503C\u8868\uFF1A\u4E0E/\u6216/\u975E/\u5F02\u6216/\u4E0E\u975E/\u6216\u975E",
    authority: "Mano, Digital Design, \u57FA\u672C\u95E8",
    assumptions: "\u7406\u60F3\u5E03\u5C14\u4EE3\u6570\uFF0C\u65E0\u5EF6\u8FDF",
    params: { a: 1, b: 1 },
    schema: {
      a: S("A", "dynamics", "0/1", 0, 1),
      b: S("B", "dynamics", "0/1", 0, 1)
    },
    tick(state) {
      const a = P(state.params, "a", 1) >= 0.5 ? 1 : 0;
      const b = P(state.params, "b", 1) >= 0.5 ? 1 : 0;
      let y = a & b;
      if (has(topic, /或非/)) y = a | b ? 0 : 1;
      else if (has(topic, /与非/)) y = a & b ? 0 : 1;
      else if (has(topic, /异或/)) y = a ^ b;
      else if (has(topic, /同或/)) y = a === b ? 1 : 0;
      else if (has(topic, /或/)) y = a | b;
      else if (has(topic, /非/)) y = a ? 0 : 1;
      else y = a & b;
      state.y = y;
    },
    plot: (s) => s.y,
    rows: (s) => [["Y", s.y, ""]]
  });
}
function matrix2(spec, topic) {
  return shell(spec, {
    equation: has(topic, /行列式/) ? "det = ad \u2212 bc" : has(topic, /特征/) ? "\u03BB\xB2 \u2212 tr \u03BB + det = 0" : "y = A x\uFF0CA=[[a,b],[c,d]]",
    authority: "Strang, Introduction to Linear Algebra, 2\xD72",
    assumptions: "\u5B9E 2\xD72\uFF1BPCA/SVD \u6B64\u5904\u7ED9\u51FA\u534F\u65B9\u5DEE\u6700\u5927\u7279\u5F81\u503C\uFF0C\u4E0D\u662F\u7EDF\u8BA1\u8F6F\u4EF6",
    params: { a: 2, b: 1, c: 0, d: 1, x1: 1, x2: 0 },
    schema: {
      a: S("a", "dynamics", "\u2014", -5, 5),
      b: S("b", "dynamics", "\u2014", -5, 5),
      c: S("c", "dynamics", "\u2014", -5, 5),
      d: S("d", "dynamics", "\u2014", -5, 5)
    },
    tick(state) {
      const a = P(state.params, "a", 2);
      const b = P(state.params, "b", 1);
      const c = P(state.params, "c", 0);
      const d = P(state.params, "d", 1);
      state.det = a * d - b * c;
      state.tr = a + d;
      const disc = Math.max(0, state.tr * state.tr - 4 * state.det);
      state.lam = (state.tr + Math.sqrt(disc)) / 2;
      const x1 = P(state.params, "x1", 1);
      const x2 = P(state.params, "x2", 0);
      state.y1 = a * x1 + b * x2;
      state.y2 = c * x1 + d * x2;
    },
    plot: (s) => s.det,
    rows: (s) => [["det", s.det, ""], ["\u03BB_max", s.lam, ""], ["y1", s.y1, ""]]
  });
}
function stress(spec, topic) {
  if (has(topic, /屈曲|欧拉/)) {
    return shell(spec, {
      equation: "P_cr = \u03C0\xB2 E I / (\u03BC L)\xB2",
      authority: "Hibbeler, Mechanics of Materials, \u6B27\u62C9\u5C48\u66F2",
      assumptions: "\u7406\u60F3\u8F74\u5FC3\u53D7\u538B\u3001\u5F39\u6027\u3001\u7AEF\u90E8\u7CFB\u6570 \u03BC",
      params: { E: 200, I: 1e-6, L: 2, mu: 1 },
      schema: {
        E: S("\u6A21\u91CF E", "dynamics", "GPa", 10, 300),
        I: S("\u60EF\u6027\u77E9 I", "dynamics", "m\u2074", 1e-8, 1e-4),
        L: S("\u957F\u5EA6 L", "dynamics", "m", 0.3, 8),
        mu: S("\u7AEF\u90E8 \u03BC", "dynamics", "\u2014", 0.5, 2)
      },
      tick(state) {
        const E11 = P(state.params, "E", 200) * 1e9;
        const I = P(state.params, "I", 1e-6);
        const L = Math.max(0.05, P(state.params, "L", 2));
        const mu = Math.max(0.5, P(state.params, "mu", 1));
        state.Pcr = Math.PI ** 2 * E11 * I / (mu * L) ** 2;
      },
      plot: (s) => s.Pcr / 1e3,
      rows: (s) => [["P_cr", s.Pcr / 1e3, "kN"]]
    });
  }
  if (has(topic, /弯曲|弯矩|梁/)) {
    return shell(spec, {
      equation: "\u03C3 = M y / I",
      authority: "Hibbeler, Mechanics of Materials, \u5F39\u6027\u5F2F\u66F2",
      assumptions: "\u6B27\u62C9-\u4F2F\u52AA\u5229\u3001\u7EBF\u5F39\u6027\u3001\u5E73\u622A\u9762",
      params: { M: 5e3, y: 0.05, I: 2e-5 },
      schema: {
        M: S("M", "dynamics", "N\xB7m", 0, 2e4),
        y: S("y", "dynamics", "m", 0, 0.2),
        I: S("I", "dynamics", "m\u2074", 1e-7, 1e-3)
      },
      tick(state) {
        state.sig = P(state.params, "M", 5e3) * P(state.params, "y", 0.05) / Math.max(1e-12, P(state.params, "I", 2e-5));
      },
      plot: (s) => s.sig / 1e6,
      rows: (s) => [["\u03C3", s.sig / 1e6, "MPa"]]
    });
  }
  if (has(topic, /扭转|扭矩/)) {
    return shell(spec, {
      equation: "\u03C4 = T \u03C1 / J",
      authority: "Hibbeler, Mechanics of Materials, \u5706\u8F74\u626D\u8F6C",
      assumptions: "\u5706\u622A\u9762\u3001\u7EBF\u5F39\u6027",
      params: { T: 200, rho: 0.02, J: 25e-8 },
      schema: {
        T: S("\u626D\u77E9 T", "dynamics", "N\xB7m", 0, 2e3),
        rho: S("\u534A\u5F84 \u03C1", "dynamics", "m", 1e-3, 0.1),
        J: S("\u6781\u60EF\u77E9 J", "dynamics", "m\u2074", 1e-8, 1e-5)
      },
      tick(state) {
        state.tau = P(state.params, "T", 200) * P(state.params, "rho", 0.02) / Math.max(1e-12, P(state.params, "J", 25e-8));
      },
      plot: (s) => s.tau / 1e6,
      rows: (s) => [["\u03C4", s.tau / 1e6, "MPa"]]
    });
  }
  if (has(topic, /应力强度|断裂/)) {
    return shell(spec, {
      equation: "K_I = \u03C3 \u221A(\u03C0 a)",
      authority: "Anderson, Fracture Mechanics, \u65E0\u9650\u677F\u2160\u578B",
      assumptions: "\u65E0\u9650\u677F\u4E2D\u5FC3\u88C2\u7EB9\u3001\u7EBF\u5F39\u6027\u65AD\u88C2\uFF1B\u975E\u7ED3\u6784\u8BC4\u5B9A\u8F6F\u4EF6",
      params: { sigma: 100, a: 0.01 },
      schema: {
        sigma: S("\u03C3", "dynamics", "MPa", 1, 400),
        a: S("a", "dynamics", "m", 1e-3, 0.05)
      },
      tick(state) {
        state.K = P(state.params, "sigma", 100) * Math.sqrt(Math.PI * P(state.params, "a", 0.01));
      },
      plot: (s) => s.K,
      rows: (s) => [["K_I", s.K, "MPa\u221Am"]]
    });
  }
  return shell(spec, {
    equation: "\u03C3 = F / A\uFF0C\u03B5 = \u03C3 / E",
    authority: "Hibbeler, Mechanics of Materials, \u8F74\u5411\u62C9\u538B",
    assumptions: "\u5747\u5300\u5E94\u529B\u3001\u7EBF\u5F39\u6027",
    params: { F: 1e3, A: 1e-4, E: 200 },
    schema: {
      F: S("F", "dynamics", "N", 0, 1e5),
      A: S("A", "dynamics", "m\xB2", 1e-6, 0.01),
      E: S("E", "dynamics", "GPa", 10, 300)
    },
    tick(state) {
      state.sig = P(state.params, "F", 1e3) / Math.max(1e-9, P(state.params, "A", 1e-4));
      state.eps = state.sig / 1e6 / Math.max(1, P(state.params, "E", 200) * 1e3);
    },
    plot: (s) => s.sig / 1e6,
    rows: (s) => [["\u03C3", s.sig / 1e6, "MPa"], ["\u03B5", s.eps, ""]]
  });
}
function carnot(spec, topic) {
  const fridge = has(topic, /制冷|热泵|COP|压缩/);
  return shell(spec, {
    equation: fridge ? "COP_C = T_c / (T_h \u2212 T_c)" : "\u03B7 = 1 \u2212 T_c / T_h",
    authority: "\xC7engel & Boles, Thermodynamics, \u5361\u8BFA\u6548\u7387 / \u5361\u8BFA\u5236\u51B7 COP",
    assumptions: "\u53EF\u9006\u5361\u8BFA\u6781\u9650\uFF0C\u4E0D\u662F\u5B9E\u9645\u673A\u7EC4\u6548\u7387",
    fidelity: "engineering",
    params: { Th: 600, Tc: 300 },
    schema: {
      Th: S("T_h", "dynamics", "K", 250, 1500),
      Tc: S("T_c", "dynamics", "K", 200, 400)
    },
    tick(state) {
      const Th = Math.max(P(state.params, "Th", 600), P(state.params, "Tc", 300) + 1);
      const Tc = P(state.params, "Tc", 300);
      state.eta = 1 - Tc / Th;
      state.cop = Tc / (Th - Tc);
    },
    plot: (s) => fridge ? s.cop : s.eta,
    rows: (s) => [["\u03B7", s.eta, ""], ["COP", s.cop, ""]]
  });
}
function gasLaw(spec) {
  return shell(spec, {
    equation: "P V = n R T",
    authority: "\xC7engel & Boles, Thermodynamics, \u7406\u60F3\u6C14\u4F53\u72B6\u6001\u65B9\u7A0B",
    assumptions: "\u7406\u60F3\u6C14\u4F53\u3001\u5E73\u8861\u6001",
    params: { n: 1, T: 300, V: 0.02 },
    schema: {
      n: S("n", "dynamics", "mol", 0.1, 5),
      T: S("T", "dynamics", "K", 200, 800),
      V: S("V", "dynamics", "m\xB3", 1e-3, 0.1)
    },
    tick(state) {
      const R = 8.314;
      state.P = P(state.params, "n", 1) * R * P(state.params, "T", 300) / Math.max(1e-6, P(state.params, "V", 0.02));
    },
    plot: (s) => s.P / 1e3,
    rows: (s) => [["P", s.P / 1e3, "kPa"]]
  });
}
function coulomb(spec) {
  return shell(spec, {
    equation: "F = k |q\u2081 q\u2082| / r\xB2",
    authority: "Griffiths, Introduction to Electrodynamics, Ch. 2",
    assumptions: "\u771F\u7A7A\u70B9\u7535\u8377\u3001\u5E93\u4ED1\u5B9A\u5F8B",
    params: { q1: 1e-6, q2: 1e-6, r: 0.2 },
    schema: {
      q1: S("q\u2081", "dynamics", "C", -5e-6, 5e-6),
      q2: S("q\u2082", "dynamics", "C", -5e-6, 5e-6),
      r: S("r", "dynamics", "m", 0.05, 2)
    },
    tick(state) {
      const k = 89875517923e-1;
      const r = Math.max(0.02, P(state.params, "r", 0.2));
      state.F = k * P(state.params, "q1", 1e-6) * P(state.params, "q2", 1e-6) / (r * r);
    },
    plot: (s) => s.F,
    rows: (s) => [["F", s.F, "N"]]
  });
}
function rcCircuit(spec) {
  return shell(spec, {
    equation: "v_C = V (1 \u2212 e^{\u2212t/RC})",
    authority: "Nilsson & Riedel, Electric Circuits, \u4E00\u9636 RC",
    assumptions: "\u76F4\u6D41\u9636\u8DC3\u3001\u96F6\u521D\u59CB\u3001\u96C6\u603B",
    params: { V: 5, R: 1e3, C: 1e-4 },
    schema: {
      V: S("V", "dynamics", "V", 0, 24),
      R: S("R", "dynamics", "\u03A9", 10, 1e5),
      C: S("C", "dynamics", "F", 1e-6, 0.01)
    },
    tick(state) {
      const tau = Math.max(1e-6, P(state.params, "R", 1e3) * P(state.params, "C", 1e-4));
      state.vc = P(state.params, "V", 5) * (1 - Math.exp(-state.t / tau));
      state.tau = tau;
    },
    plot: (s) => s.vc,
    rows: (s) => [["v_C", s.vc, "V"], ["\u03C4", s.tau, "s"]]
  });
}
function lens(spec) {
  return shell(spec, {
    equation: "1/v \u2212 1/u = 1/f\uFF08\u7B1B\u5361\u5C14\u7B26\u53F7\uFF1A\u5B9E\u7269 u<0\uFF09",
    authority: "Hecht, Optics, \u8584\u900F\u955C",
    assumptions: "\u8FD1\u8F74\u3001\u8584\u900F\u955C\uFF1Bu \u53D6\u8D1F\u8868\u793A\u5B9E\u7269\u5728\u5DE6\u4FA7",
    params: { f: 0.1, u: -0.3 },
    schema: {
      f: S("f", "dynamics", "m", 0.02, 0.5),
      u: S("u", "dynamics", "m", -2, -0.05)
    },
    tick(state) {
      const f = P(state.params, "f", 0.1);
      const u = P(state.params, "u", -0.3);
      const inv = 1 / f + 1 / u;
      state.v = Math.abs(inv) > 1e-9 ? 1 / inv : NaN;
    },
    plot: (s) => s.v,
    rows: (s) => [["v", s.v, "m"]]
  });
}
function snell(spec) {
  return shell(spec, {
    equation: "n\u2081 sin\u03B8\u2081 = n\u2082 sin\u03B8\u2082",
    authority: "Hecht, Optics, \u65AF\u6D85\u5C14\u5B9A\u5F8B",
    assumptions: "\u5404\u5411\u540C\u6027\u5747\u5300\u4ECB\u8D28\u3001\u51E0\u4F55\u5149\u5B66",
    params: { n1: 1, n2: 1.5, theta1: 30 },
    schema: {
      n1: S("n\u2081", "dynamics", "\u2014", 1, 2.5),
      n2: S("n\u2082", "dynamics", "\u2014", 1, 2.5),
      theta1: S("\u03B8\u2081", "dynamics", "\xB0", 0, 80)
    },
    tick(state) {
      const s = P(state.params, "n1", 1) * Math.sin(P(state.params, "theta1", 30) * Math.PI / 180) / Math.max(1, P(state.params, "n2", 1.5));
      state.theta2 = Math.abs(s) <= 1 ? Math.asin(s) * 180 / Math.PI : NaN;
    },
    plot: (s) => s.theta2,
    rows: (s) => [["\u03B8\u2082", s.theta2, "\xB0"]]
  });
}
function well(spec) {
  return shell(spec, {
    equation: "E_n = n\xB2 h\xB2 / (8 m L\xB2)",
    authority: "Griffiths, Introduction to Quantum Mechanics, \u65E0\u9650\u6DF1\u52BF\u9631",
    assumptions: "\u4E00\u7EF4\u65E0\u9650\u9631\u3001\u5B9A\u6001\u80FD\u91CF\uFF1Bh \u4E3A\u666E\u6717\u514B\u5E38\u6570",
    params: { n: 1, L: 1e-9 },
    schema: {
      n: S("n", "dynamics", "\u2014", 1, 8),
      L: S("L", "dynamics", "m", 2e-10, 5e-9)
    },
    tick(state) {
      const h = 662607015e-42;
      const m = 91093837e-38;
      const n = Math.max(1, Math.round(P(state.params, "n", 1)));
      const L = Math.max(1e-12, P(state.params, "L", 1e-9));
      state.E = n * n * h * h / (8 * m * L * L) / 1602176634e-28;
    },
    plot: (s) => s.E,
    rows: (s) => [["E_n", s.E, "eV"]]
  });
}
function decay(spec) {
  return shell(spec, {
    equation: "N = N\u2080 e^{\u2212\u03BB t}\uFF0Ct\xBD = ln2 / \u03BB",
    authority: "Krane, Introductory Nuclear Physics, \u6307\u6570\u8870\u53D8",
    assumptions: "\u5355\u4E00\u6838\u7D20\u3001\u5E38\u6570 \u03BB\uFF1B\u975E\u71C3\u8017\u3001\u975E\u5242\u91CF\u8BBE\u8BA1\u3002e^{\u2212\u03BBt} \u6309\u53CC\u7CBE\u5EA6\u8BA1\u7B97\uFF0C\u4E0D\u5728 \xB140 \u5904\u622A\u65AD",
    params: { N0: 1e3, lambda: 0.2 },
    schema: {
      N0: S("N\u2080", "initial", "\u2014", 1, 1e5),
      lambda: S("\u03BB", "dynamics", "1/s", 0.01, 2)
    },
    tick(state) {
      const lam = Math.max(1e-6, P(state.params, "lambda", 0.2));
      state.N = P(state.params, "N0", 1e3) * Math.exp(-lam * state.t);
      state.th = Math.LN2 / lam;
    },
    plot: (s) => s.N,
    rows: (s) => [["N", s.N, ""], ["t\xBD", s.th, "s"]]
  });
}
function mm1(spec) {
  return shell(spec, {
    equation: "\u03C1=\u03BB/\u03BC\uFF0CL = \u03C1/(1\u2212\u03C1)\uFF08\u03C1<1\uFF09",
    authority: "Gross & Harris, Fundamentals of Queueing Theory, M/M/1",
    assumptions: "\u6CCA\u677E\u5230\u8FBE\u3001\u6307\u6570\u670D\u52A1\u3001\u5355\u670D\u52A1\u53F0\u3001\u7A33\u6001 \u03C1<1",
    params: { lambda: 2, mu: 3 },
    schema: {
      lambda: S("\u03BB", "dynamics", "1/s", 0.1, 10),
      mu: S("\u03BC", "dynamics", "1/s", 0.2, 12)
    },
    tick(state) {
      const lam = P(state.params, "lambda", 2);
      const mu = Math.max(1e-3, P(state.params, "mu", 3));
      state.rho = lam / mu;
      state.L = state.rho < 1 ? state.rho / (1 - state.rho) : Infinity;
    },
    plot: (s) => Number.isFinite(s.L) ? s.L : 20,
    rows: (s) => [["\u03C1", s.rho, ""], ["L", s.L, ""]]
  });
}
function binaryEntropy(spec) {
  return shell(spec, {
    equation: "H = \u2212p log\u2082 p \u2212 (1\u2212p) log\u2082(1\u2212p)",
    authority: "Cover & Thomas, Elements of Information Theory, \u4E8C\u5143\u71B5",
    assumptions: "\u79BB\u6563\u4E8C\u5143\u4FE1\u6E90",
    params: { p: 0.3 },
    schema: { p: S("p", "dynamics", "\u2014", 0.01, 0.99) },
    tick(state) {
      const p = Math.min(0.999, Math.max(1e-3, P(state.params, "p", 0.3)));
      state.H = -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
    },
    plot: (s) => s.H,
    rows: (s) => [["H", s.H, "bit"]]
  });
}
function compound(spec) {
  return shell(spec, {
    equation: "A = P (1 + r)^n",
    authority: "\u6807\u51C6\u590D\u5229\u5B9A\u4E49\uFF08\u79BB\u6563\u5E74\u590D\u5229\uFF09",
    assumptions: "\u56FA\u5B9A\u5229\u7387\u3001\u65E0\u624B\u7EED\u8D39",
    params: { P: 100, r: 0.05, n: 10 },
    schema: {
      P: S("P", "dynamics", "\u2014", 1, 1e4),
      r: S("r", "dynamics", "\u2014", 0, 0.3),
      n: S("n", "dynamics", "\u2014", 0, 40)
    },
    tick(state) {
      state.A = P(state.params, "P", 100) * (1 + P(state.params, "r", 0.05)) ** P(state.params, "n", 10);
    },
    plot: (s) => s.A,
    rows: (s) => [["A", s.A, ""]]
  });
}
function supplyDemand(spec) {
  return shell(spec, {
    equation: "\u9700\u6C42 Qd=a\u2212bP\uFF0C\u4F9B\u7ED9 Qs=c+dP\uFF0CP* \u4F7F Qd=Qs",
    authority: "Varian, Intermediate Microeconomics, \u7EBF\u6027\u4F9B\u9700",
    assumptions: "\u7EBF\u6027\u3001\u7ADE\u4E89\u5E02\u573A\u5C40\u90E8\u5747\u8861",
    params: { a: 20, b: 2, c: 2, d: 1 },
    schema: {
      a: S("a", "dynamics", "\u2014", 1, 50),
      b: S("b", "dynamics", "\u2014", 0.1, 10),
      c: S("c", "dynamics", "\u2014", 0, 20),
      d: S("d", "dynamics", "\u2014", 0.1, 10)
    },
    tick(state) {
      const a = P(state.params, "a", 20);
      const b = Math.max(1e-3, P(state.params, "b", 2));
      const c = P(state.params, "c", 2);
      const d = Math.max(1e-3, P(state.params, "d", 1));
      state.Pstar = (a - c) / (b + d);
      state.Q = a - b * state.Pstar;
    },
    plot: (s) => s.Pstar,
    rows: (s) => [["P*", s.Pstar, ""], ["Q*", s.Q, ""]]
  });
}
function manning(spec) {
  return shell(spec, {
    equation: "V = (1/n) R^{2/3} S^{1/2}",
    authority: "Chow, Open-Channel Hydraulics, \u66FC\u5B81\u516C\u5F0F",
    assumptions: "\u5747\u5300\u6D41\u3001SI \u5355\u4F4D\u3001n \u4E3A\u66FC\u5B81\u7CD9\u7387",
    params: { n: 0.015, R: 0.8, S: 1e-3 },
    schema: {
      n: S("n", "dynamics", "\u2014", 8e-3, 0.05),
      R: S("R", "dynamics", "m", 0.1, 5),
      S: S("S", "dynamics", "\u2014", 1e-5, 0.02)
    },
    tick(state) {
      const n = Math.max(1e-3, P(state.params, "n", 0.015));
      state.V = 1 / n * Math.max(0, P(state.params, "R", 0.8)) ** (2 / 3) * Math.sqrt(Math.max(0, P(state.params, "S", 1e-3)));
    },
    plot: (s) => s.V,
    rows: (s) => [["V", s.V, "m/s"]]
  });
}
function darcy(spec) {
  return shell(spec, {
    equation: "h_f = f (L/D) v\xB2 / (2 g)",
    authority: "White, Fluid Mechanics, Darcy\u2013Weisbach",
    assumptions: "\u7ED9\u5B9A\u6469\u963B\u7CFB\u6570 f\uFF0C\u4E0D\u5185\u7F6E Moody \u8FED\u4EE3",
    params: { f: 0.02, L: 20, D: 0.1, v: 1.5 },
    schema: {
      f: S("f", "dynamics", "\u2014", 5e-3, 0.08),
      L: S("L", "dynamics", "m", 1, 200),
      D: S("D", "dynamics", "m", 0.02, 1),
      v: S("v", "dynamics", "m/s", 0, 6)
    },
    tick(state) {
      const D = Math.max(1e-3, P(state.params, "D", 0.1));
      const v = P(state.params, "v", 1.5);
      state.hf = P(state.params, "f", 0.02) * (P(state.params, "L", 20) / D) * v * v / (2 * 9.81);
    },
    plot: (s) => s.hf,
    rows: (s) => [["h_f", s.hf, "m"]]
  });
}
function cstr(spec) {
  return shell(spec, {
    equation: "\u03C4 = V/v\u2080\uFF0C\u4E00\u7EA7 X = k\u03C4/(1+k\u03C4)",
    authority: "Fogler, Elements of CRE, \u7B49\u6E29\u7A33\u6001 CSTR \u4E00\u7EA7\u53CD\u5E94",
    assumptions: "\u7B49\u6E29\u3001\u6052\u5BB9\u3001\u4E00\u7EA7\u4E0D\u53EF\u9006\uFF1B\u975E\u88C5\u7F6E\u653E\u5927",
    params: { k: 0.2, tau: 5 },
    schema: {
      k: S("k", "dynamics", "1/s", 0.01, 2),
      tau: S("\u03C4", "dynamics", "s", 0.1, 40)
    },
    tick(state) {
      const ktau = P(state.params, "k", 0.2) * P(state.params, "tau", 5);
      state.X = ktau / (1 + ktau);
    },
    plot: (s) => s.X,
    rows: (s) => [["X", s.X, ""]]
  });
}
function secondOrderStep(spec) {
  return shell(spec, {
    equation: "G(s)= \u03C9\u2099\xB2 / (s\xB2 + 2 \u03B6 \u03C9\u2099 s + \u03C9\u2099\xB2)\uFF0C\u5355\u4F4D\u9636\u8DC3",
    authority: "Ogata, Modern Control Engineering, \u4E8C\u9636\u7CFB\u7EDF\u9636\u8DC3\u54CD\u5E94",
    assumptions: "\u96F6\u521D\u503C\u3001\u5355\u4F4D\u589E\u76CA\u3001\u6B20\u963B\u5C3C\u7528\u6807\u51C6\u6B20\u963B\u5C3C\u89E3",
    params: { wn: 2, zeta: 0.3 },
    schema: {
      wn: S("\u03C9\u2099", "dynamics", "rad/s", 0.3, 8),
      zeta: S("\u03B6", "dynamics", "\u2014", 0.05, 1.5)
    },
    tick(state) {
      const wn = P(state.params, "wn", 2);
      const z = P(state.params, "zeta", 0.3);
      const t = state.t;
      if (z < 1) {
        const wd = wn * Math.sqrt(1 - z * z);
        state.y = 1 - Math.exp(-z * wn * t) * (Math.cos(wd * t) + z * wn / wd * Math.sin(wd * t));
      } else {
        state.y = 1 - Math.exp(-wn * t) * (1 + wn * t);
      }
    },
    plot: (s) => s.y,
    rows: (s) => [["y", s.y, ""]]
  });
}
function dcMotor(spec) {
  return shell(spec, {
    equation: "\u03C4 = K t I\uFF0C\u03C9 = (V \u2212 I R) / K e\uFF08\u7A33\u6001\uFF0CK_t=K_e\uFF09",
    authority: "Ogata / \u7535\u673A\u5B66\u6559\u6750\uFF0C\u4ED6\u52B1\u76F4\u6D41\u7535\u673A\u7A33\u6001\u7535\u67A2\u65B9\u7A0B",
    assumptions: "\u7A33\u6001\u3001\u5FFD\u7565\u7535\u611F\u3001K_t=K_e",
    params: { V: 24, R: 1, I: 2, K: 0.2 },
    schema: {
      V: S("V", "dynamics", "V", 0, 48),
      R: S("R", "dynamics", "\u03A9", 0.1, 10),
      I: S("I", "dynamics", "A", 0, 20),
      K: S("K", "dynamics", "N\xB7m/A", 0.05, 1)
    },
    tick(state) {
      const I = P(state.params, "I", 2);
      const K = Math.max(1e-3, P(state.params, "K", 0.2));
      state.torque = K * I;
      state.w = (P(state.params, "V", 24) - I * P(state.params, "R", 1)) / K;
    },
    plot: (s) => s.w,
    rows: (s) => [["\u03C9", s.w, "rad/s"], ["\u03C4", s.torque, "N\xB7m"]]
  });
}
function maxwell(spec) {
  return shell(spec, {
    equation: "f(v) \u221D v\xB2 exp(\u2212m v\xB2 / 2 k T)",
    authority: "Schroeder, An Introduction to Thermal Physics, \u9EA6\u514B\u65AF\u97E6\u901F\u7387\u5206\u5E03",
    assumptions: "\u7ECF\u5178\u7406\u60F3\u6C14\u4F53\u3001\u4E09\u7EF4\u901F\u7387",
    params: { T: 300 },
    schema: { T: S("T", "dynamics", "K", 50, 1e3) },
    tick(state) {
      const T = Math.max(1, P(state.params, "T", 300));
      const v = 200 + 400 * (0.5 + 0.5 * Math.sin(state.t));
      const kOverM = 1380649e-29 / 465e-28;
      state.f = v * v * Math.exp(-(v * v) / (2 * kOverM * T));
      state.v = v;
    },
    plot: (s) => s.f,
    rows: (s) => [["f(v)", s.f, ""], ["v", s.v, "m/s"]]
  });
}
function doppler(spec) {
  return shell(spec, {
    equation: "f' = f (v + v_o) / (v + v_s)",
    authority: "Halliday, \u58F0\u6CE2\u591A\u666E\u52D2\uFF08\u6E90\u4E0E\u89C2\u5BDF\u8005\u540C\u7EBF\uFF09",
    assumptions: "\u4ECB\u8D28\u9759\u6B62\u58F0\u901F v\uFF1B\u7B26\u53F7\uFF1A\u89C2\u5BDF\u8005\u671D\u6E90 vo>0\uFF0C\u6E90\u671D\u89C2\u5BDF\u8005 vs<0 \u9700\u81EA\u884C\u53D6\u53F7\u3002\u6B64\u5904 vs \u4EE5\u79BB\u5F00\u89C2\u5BDF\u8005\u4E3A\u6B63\uFF08\u5206\u6BCD v+vs\uFF09",
    params: { f: 440, v: 340, vo: 0, vs: 20 },
    schema: {
      f: S("\u6E90\u9891 f", "dynamics", "Hz", 50, 2e3),
      v: S("\u58F0\u901F v", "dynamics", "m/s", 200, 400),
      vo: S("\u89C2\u5BDF\u8005 vo", "dynamics", "m/s", -50, 50),
      vs: S("\u58F0\u6E90 vs", "dynamics", "m/s", -50, 50)
    },
    tick(state) {
      const v = P(state.params, "v", 340);
      const vs = P(state.params, "vs", 20);
      state.fp = P(state.params, "f", 440) * (v + P(state.params, "vo", 0)) / Math.max(1, v + vs);
    },
    plot: (s) => s.fp,
    rows: (s) => [["f'", s.fp, "Hz"]]
  });
}
function spl(spec) {
  return shell(spec, {
    equation: "L_p = 20 log10(p / p_ref)\uFF0Cp_ref=20 \u03BCPa",
    authority: "Kinsler, Fundamentals of Acoustics, \u58F0\u538B\u7EA7",
    assumptions: "\u7A7A\u6C14\u53C2\u8003\u58F0\u538B",
    params: { p: 0.02 },
    schema: { p: S("p", "dynamics", "Pa", 2e-5, 20) },
    tick(state) {
      state.L = 20 * Math.log10(Math.max(1e-8, P(state.params, "p", 0.02)) / 2e-5);
    },
    plot: (s) => s.L,
    rows: (s) => [["L_p", s.L, "dB"]]
  });
}
function waveTravel(spec) {
  return shell(spec, {
    equation: "y = A sin(kx \u2212 \u03C9 t)",
    authority: "Pain, The Physics of Vibrations and Waves, \u884C\u6CE2",
    assumptions: "\u4E00\u7EF4\u65E0\u8272\u6563\u3001\u5E38\u6CE2\u901F",
    params: { A: 1, k: 2, w: 4 },
    schema: {
      A: S("A", "dynamics", "\u2014", 0, 3),
      k: S("k", "dynamics", "1/m", 0.2, 8),
      w: S("\u03C9", "dynamics", "rad/s", 0.2, 12)
    },
    tick(state) {
      state.y = P(state.params, "A", 1) * Math.sin(P(state.params, "k", 2) * 0.5 - P(state.params, "w", 4) * state.t);
    },
    plot: (s) => s.y,
    rows: (s) => [["y", s.y, ""]]
  });
}
function isingEnergy(spec) {
  return shell(spec, {
    equation: "E = \u2212J \u03A3 s_i s_{i+1}\uFF08\u4E00\u7EF4\u5468\u671F\u94FE\uFF09",
    authority: "Ising, Z. Phys. 31 (1925)\uFF1B\u4E00\u7EF4\u7CBE\u786E\u80FD\u91CF",
    assumptions: "\u4E00\u7EF4\u3001\u8FD1\u90BB\u3001\u65E0\u5916\u573A\uFF1B\u4E0D\u662F\u4E8C\u7EF4\u4E34\u754C\u73B0\u8C61\u6C42\u89E3\u5668",
    fidelity: "principle",
    params: { J: 1, up: 8, n: 10 },
    schema: {
      J: S("J", "dynamics", "\u2014", 0.1, 3),
      up: S("\u5411\u4E0A\u81EA\u65CB\u6570", "dynamics", "\u2014", 0, 16),
      n: S("N", "dynamics", "\u2014", 4, 16)
    },
    tick(state) {
      const n = Math.max(2, Math.round(P(state.params, "n", 10)));
      const up = Math.max(0, Math.min(n, Math.round(P(state.params, "up", 8))));
      const spins = Array.from({ length: n }, (_, i) => i < up ? 1 : -1);
      let E11 = 0;
      for (let i = 0; i < n; i += 1) E11 += spins[i] * spins[(i + 1) % n];
      state.E = -P(state.params, "J", 1) * E11;
    },
    plot: (s) => s.E,
    rows: (s) => [["E", s.E, ""]]
  });
}
function dijkstraBound(spec) {
  return shell(spec, {
    equation: "\u975E\u8D1F\u6743\u677E\u5F1B\uFF1Ad(v) \u2264 d(u)+w(u,v)",
    authority: "CLRS, Dijkstra",
    assumptions: "\u793A\u610F\u4E00\u6761\u8FB9\u7684\u677E\u5F1B\uFF0C\u4E0D\u4EE3\u66FF\u5B8C\u6574\u56FE\u641C\u7D22\uFF1B\u8FB9\u6743\u987B\u975E\u8D1F",
    params: { du: 3, w: 2 },
    schema: {
      du: S("d(u)", "dynamics", "\u2014", 0, 20),
      w: S("w", "dynamics", "\u2014", 0, 10)
    },
    tick(state) {
      state.dv = P(state.params, "du", 3) + P(state.params, "w", 2);
    },
    plot: (s) => s.dv,
    rows: (s) => [["d(v)", s.dv, ""]]
  });
}
function amdahl(spec) {
  return shell(spec, {
    equation: "S = 1 / ((1\u2212p) + p/n)",
    authority: "Amdahl, AFIPS 1967\uFF1BHennessy & Patterson",
    assumptions: "\u53EF\u5E76\u884C\u6BD4\u4F8B p \u56FA\u5B9A",
    params: { p: 0.9, n: 8 },
    schema: {
      p: S("p", "dynamics", "\u2014", 0, 1),
      n: S("n", "dynamics", "\u2014", 1, 64)
    },
    tick(state) {
      const p = Math.min(1, Math.max(0, P(state.params, "p", 0.9)));
      const n = Math.max(1, P(state.params, "n", 8));
      state.S = 1 / (1 - p + p / n);
    },
    plot: (s) => s.S,
    rows: (s) => [["S", s.S, ""]]
  });
}
function eoq(spec) {
  return shell(spec, {
    equation: "EOQ = \u221A(2 D S / H)",
    authority: "Harris EOQ\uFF1BHopp & Spearman, Factory Physics",
    assumptions: "\u9700\u6C42\u5E73\u7A33\u3001\u77AC\u65F6\u8865\u8D27\u3001\u65E0\u7F3A\u8D27",
    params: { D: 1e3, S: 50, H: 2 },
    schema: {
      D: S("D", "dynamics", "\u2014", 10, 1e4),
      S: S("S", "dynamics", "\u2014", 1, 500),
      H: S("H", "dynamics", "\u2014", 0.1, 20)
    },
    tick(state) {
      state.Q = Math.sqrt(2 * P(state.params, "D", 1e3) * P(state.params, "S", 50) / Math.max(1e-3, P(state.params, "H", 2)));
    },
    plot: (s) => s.Q,
    rows: (s) => [["EOQ", s.Q, ""]]
  });
}
function kepler(spec) {
  return shell(spec, {
    equation: "T\xB2 = a\xB3\uFF08\u4EE5\u5E74\u4E3A\u5355\u4F4D\u3001\u592A\u9633\u8D28\u91CF\u3001a \u4EE5 AU\uFF09",
    authority: "Murray & Dermott, Solar System Dynamics, \u5F00\u666E\u52D2\u7B2C\u4E09\u5B9A\u5F8B\uFF08\u592A\u9633\u7CFB\u5355\u4F4D\uFF09",
    assumptions: "\u4E8C\u4F53\u3001\u4E2D\u5FC3\u8D28\u91CF\u4E3A\u592A\u9633",
    params: { a: 1.5 },
    schema: { a: S("a", "dynamics", "AU", 0.2, 30) },
    tick(state) {
      const a = Math.max(0.05, P(state.params, "a", 1.5));
      state.T = Math.sqrt(a ** 3);
    },
    plot: (s) => s.T,
    rows: (s) => [["T", s.T, "yr"]]
  });
}
function rocket(spec) {
  return shell(spec, {
    equation: "\u0394v = v_e ln(m\u2080/m)",
    authority: "Tsiolkovsky \u706B\u7BAD\u65B9\u7A0B",
    assumptions: "\u771F\u7A7A\u3001\u5E38\u55B7\u6C14\u901F\u5EA6\u3001\u65E0\u91CD\u529B\u635F\u5931",
    params: { ve: 3e3, m0: 100, m: 40 },
    schema: {
      ve: S("v_e", "dynamics", "m/s", 500, 4500),
      m0: S("m\u2080", "dynamics", "kg", 1, 500),
      m: S("m", "dynamics", "kg", 1, 500)
    },
    tick(state) {
      const m0 = Math.max(P(state.params, "m", 40), P(state.params, "m0", 100));
      const m = Math.min(m0, Math.max(0.1, P(state.params, "m", 40)));
      state.dv = P(state.params, "ve", 3e3) * Math.log(m0 / m);
    },
    plot: (s) => s.dv,
    rows: (s) => [["\u0394v", s.dv, "m/s"]]
  });
}
function clift(spec) {
  return shell(spec, {
    equation: "L = \xBD \u03C1 v\xB2 S C_L",
    authority: "Anderson, Fundamentals of Aerodynamics, \u5347\u529B\u5B9A\u4E49",
    assumptions: "\u7ED9\u5B9A C_L\uFF0C\u4E0D\u6C42\u89E3\u6D41\u573A",
    params: { rho: 1.2, v: 50, S: 16, Cl: 0.5 },
    schema: {
      rho: S("\u5BC6\u5EA6 \u03C1", "dynamics", "kg/m\xB3", 0.5, 2),
      v: S("\u901F\u5EA6 v", "dynamics", "m/s", 0, 200),
      S: S("\u9762\u79EF S", "dynamics", "m\xB2", 1, 80),
      Cl: S("C_L", "dynamics", "\u2014", 0, 1.6)
    },
    tick(state) {
      const v = P(state.params, "v", 50);
      state.L = 0.5 * P(state.params, "rho", 1.2) * v * v * P(state.params, "S", 16) * P(state.params, "Cl", 0.5);
    },
    plot: (s) => s.L,
    rows: (s) => [["L", s.L, "N"]]
  });
}
function reynolds(spec) {
  return shell(spec, {
    equation: "Re = \u03C1 v D / \u03BC",
    authority: "White, Fluid Mechanics, \u96F7\u8BFA\u6570",
    assumptions: "\u7279\u5F81\u957F\u5EA6 D",
    params: { rho: 1e3, v: 1, D: 0.05, mu: 1e-3 },
    schema: {
      rho: S("\u5BC6\u5EA6 \u03C1", "dynamics", "kg/m\xB3", 100, 2e3),
      v: S("\u6D41\u901F v", "dynamics", "m/s", 0, 10),
      D: S("\u7279\u5F81\u957F D", "dynamics", "m", 1e-3, 1),
      mu: S("\u7C98\u5EA6 \u03BC", "dynamics", "Pa\xB7s", 1e-5, 0.1)
    },
    tick(state) {
      state.Re = P(state.params, "rho", 1e3) * P(state.params, "v", 1) * P(state.params, "D", 0.05) / Math.max(1e-8, P(state.params, "mu", 1e-3));
    },
    plot: (s) => s.Re,
    rows: (s) => [["Re", s.Re, ""]]
  });
}
function bernoulli(spec) {
  return shell(spec, {
    equation: "P + \xBD \u03C1 v\xB2 + \u03C1 g h = const",
    authority: "White, Fluid Mechanics, \u4F2F\u52AA\u5229\u65B9\u7A0B",
    assumptions: "\u5B9A\u5E38\u3001\u4E0D\u53EF\u538B\u3001\u6CBF\u6D41\u7EBF\u3001\u65E0\u6469\u64E6",
    params: { P: 1e5, rho: 1e3, v: 2, h: 1 },
    schema: {
      P: S("\u9759\u538B P", "dynamics", "Pa", 0, 3e5),
      rho: S("\u5BC6\u5EA6 \u03C1", "dynamics", "kg/m\xB3", 100, 2e3),
      v: S("\u6D41\u901F v", "dynamics", "m/s", 0, 15),
      h: S("\u9AD8\u5EA6 h", "dynamics", "m", 0, 20)
    },
    tick(state) {
      const rho = P(state.params, "rho", 1e3);
      state.H = P(state.params, "P", 1e5) + 0.5 * rho * P(state.params, "v", 2) ** 2 + rho * 9.81 * P(state.params, "h", 1);
    },
    plot: (s) => s.H,
    rows: (s) => [["Bernoulli", s.H, "Pa"]]
  });
}
function compton(spec) {
  return shell(spec, {
    equation: "\u0394\u03BB = \u03BB_c (1 \u2212 cos\u03B8)\uFF0C\u03BB_c=2.426 pm",
    authority: "Compton, Phys. Rev. 21 (1923)\uFF1BHalliday \u5EB7\u666E\u987F\u6563\u5C04",
    assumptions: "\u81EA\u7531\u7535\u5B50\u3001\u5F39\u6027",
    params: { theta: 90 },
    schema: { theta: S("\u03B8", "dynamics", "\xB0", 0, 180) },
    tick(state) {
      const lc = 2426e-15;
      state.dl = lc * (1 - Math.cos(P(state.params, "theta", 90) * Math.PI / 180));
    },
    plot: (s) => s.dl * 1e12,
    rows: (s) => [["\u0394\u03BB", s.dl * 1e12, "pm"]]
  });
}
function debroglie(spec) {
  return shell(spec, {
    equation: "\u03BB = h / p",
    authority: "de Broglie\uFF1BGriffiths QM \u5F15\u8A00",
    assumptions: "\u81EA\u7531\u7C92\u5B50\u52A8\u91CF p",
    params: { p: 1e-24 },
    schema: { p: S("p", "dynamics", "kg\xB7m/s", 1e-26, 1e-22) },
    tick(state) {
      const h = 662607015e-42;
      state.lam = h / Math.max(1e-30, P(state.params, "p", 1e-24));
    },
    plot: (s) => s.lam * 1e9,
    rows: (s) => [["\u03BB", s.lam * 1e9, "nm"]]
  });
}
function uncertainty(spec) {
  return shell(spec, {
    equation: "\u0394x \u0394p \u2265 \u210F/2",
    authority: "Griffiths, QM, \u4E0D\u786E\u5B9A\u5EA6\u539F\u7406\uFF08Kennard \u5F62\u5F0F\uFF09",
    assumptions: "\u5C55\u793A\u7B49\u53F7\u4E0B\u9650\uFF0C\u4E0D\u662F\u6D4B\u91CF\u64CD\u4F5C\u624B\u518C",
    params: { dx: 1e-10 },
    schema: { dx: S("\u0394x", "dynamics", "m", 1e-12, 1e-8) },
    tick(state) {
      const hbar = 1054571817e-43;
      state.dp = hbar / 2 / Math.max(1e-15, P(state.params, "dx", 1e-10));
    },
    plot: (s) => s.dp,
    rows: (s) => [["\u0394p_min", s.dp, "kg\xB7m/s"]]
  });
}
function tunnel(spec) {
  return shell(spec, {
    equation: "T \u2248 exp(\u22122 \u03BA L)\uFF0C\u03BA=\u221A(2m(V\u2212E))/\u210F",
    authority: "Griffiths, QM, \u539A\u52BF\u5792\u8FD1\u4F3C",
    assumptions: "E<V\u3001\u539A\u5792\u3001\u77E9\u5F62\u5792\u8FD1\u4F3C",
    fidelity: "principle",
    params: { V: 5, E: 2, L: 0.5 },
    schema: {
      V: S("V", "dynamics", "eV", 0.5, 20),
      E: S("E", "dynamics", "eV", 0.1, 10),
      L: S("L", "dynamics", "nm", 0.05, 2)
    },
    tick(state) {
      const hbar = 1054571817e-43;
      const m = 91093837e-38;
      const eV = 1602176634e-28;
      const V = P(state.params, "V", 5);
      const E11 = Math.min(V - 0.01, P(state.params, "E", 2));
      const L = P(state.params, "L", 0.5) * 1e-9;
      const kappa = Math.sqrt(2 * m * (V - E11) * eV) / hbar;
      state.T = Math.exp(-2 * kappa * L);
    },
    plot: (s) => s.T,
    rows: (s) => [["T", s.T, ""]]
  });
}
function stefan(spec) {
  return shell(spec, {
    equation: "j = \u03C3 T\u2074",
    authority: "Stefan\u2013Boltzmann \u5B9A\u5F8B\uFF1BRybicki & Lightman, Radiative Processes",
    assumptions: "\u9ED1\u4F53\u3001\u534A\u7403\u8F90\u5C04\u51FA\u5C04\u5EA6",
    params: { T: 300 },
    schema: { T: S("T", "dynamics", "K", 100, 2e3) },
    tick(state) {
      const sigma = 5670374419e-17;
      state.j = sigma * P(state.params, "T", 300) ** 4;
    },
    plot: (s) => s.j,
    rows: (s) => [["j", s.j, "W/m\xB2"]]
  });
}
function hall(spec) {
  return shell(spec, {
    equation: "V_H = I B / (n e t)",
    authority: "Ashcroft & Mermin \u6216 Halliday\uFF0C\u970D\u5C14\u7535\u538B",
    assumptions: "\u5355\u4E00\u8F7D\u6D41\u5B50\u3001\u8584\u7247\u539A\u5EA6 t",
    params: { I: 0.01, B: 0.5, n: 1e22, thick: 1e-4 },
    schema: {
      I: S("I", "dynamics", "A", 0, 1),
      B: S("B", "dynamics", "T", 0, 2),
      thick: S("\u539A\u5EA6 t", "dynamics", "m", 1e-5, 2e-3)
    },
    tick(state) {
      const e = 1602176634e-28;
      const n = Math.max(1e18, P(state.params, "n", 1e22));
      const thick = Math.max(1e-6, P(state.params, "thick", 1e-4));
      state.VH = P(state.params, "I", 0.01) * P(state.params, "B", 0.5) / (n * e * thick);
    },
    plot: (s) => s.VH,
    rows: (s) => [["V_H", s.VH, "V"]]
  });
}
function quantumHall(spec) {
  return shell(spec, {
    equation: "V_H = I B / (n e t)",
    authority: "Ashcroft & Mermin \u6216 Halliday\uFF0C\u970D\u5C14\u7535\u538B\uFF08\u91CF\u5B50\u970D\u5C14\u6559\u5B66\u5165\u53E3\uFF0C\u4ECD\u7528\u7ECF\u5178\u539A\u5EA6\u5F0F\uFF09",
    assumptions: "\u5355\u4E00\u8F7D\u6D41\u5B50\u3001\u8584\u7247\u539A\u5EA6 t\uFF1B\u516C\u5F00\u6559\u79D1\u4E66\u5165\u53E3\uFF0C\u4E0D\u662F\u586B\u5145\u56E0\u5B50\u91CF\u5B50\u970D\u5C14\u8BBE\u8BA1\u5DE5\u5177",
    params: { I: 0.01, B: 0.5, n: 1e22, thick: 1e-4 },
    schema: {
      I: S("I", "dynamics", "A", 0, 1),
      B: S("B", "dynamics", "T", 0, 2),
      thick: S("\u539A\u5EA6 t", "dynamics", "m", 1e-5, 2e-3)
    },
    tick(state) {
      const e = 1602176634e-28;
      const n = Math.max(1e18, P(state.params, "n", 1e22));
      const thick = Math.max(1e-6, P(state.params, "thick", 1e-4));
      state.VH = P(state.params, "I", 0.01) * P(state.params, "B", 0.5) / (n * e * thick);
    },
    plot: (s) => s.VH,
    rows: (s) => [["V_H", s.VH, "V"]]
  });
}
function faraday(spec) {
  return shell(spec, {
    equation: "\u03B5 = \u2212 d\u03A6/dt\uFF0C\u6B64\u5904 \u03A6 = B A sin(\u03C9 t) \u7684\u5E45\u503C\u53D8\u5316\u7387\u5CF0\u503C B A \u03C9",
    authority: "Griffiths, Electrodynamics, Ch. 7 \u6CD5\u62C9\u7B2C\u5B9A\u5F8B",
    assumptions: "\u5747\u5300\u573A\u3001\u5355\u531D\u3001\u6B63\u5F26\u78C1\u901A",
    params: { B: 0.2, A: 0.01, w: 10 },
    schema: {
      B: S("B", "dynamics", "T", 0, 2),
      A: S("A", "dynamics", "m\xB2", 1e-4, 0.2),
      w: S("\u03C9", "dynamics", "rad/s", 0, 100)
    },
    tick(state) {
      const B = P(state.params, "B", 0.2);
      const A = P(state.params, "A", 0.01);
      const w = P(state.params, "w", 10);
      state.eps = -B * A * w * Math.cos(w * state.t);
    },
    plot: (s) => s.eps,
    rows: (s) => [["\u03B5", s.eps, "V"]]
  });
}
function capacitor(spec) {
  return shell(spec, {
    equation: "C = \u03B5\u2080 \u03B5_r A / d\uFF0CQ = C V\uFF0CU = \xBD C V\xB2",
    authority: "Griffiths, Ch. 2 \u5E73\u884C\u677F\u7535\u5BB9",
    assumptions: "\u5E73\u884C\u677F\u3001\u5FFD\u7565\u8FB9\u7F18",
    params: { A: 0.01, d: 1e-3, V: 10, er: 1 },
    schema: {
      A: S("A", "dynamics", "m\xB2", 1e-4, 0.1),
      d: S("d", "dynamics", "m", 1e-4, 0.02),
      V: S("V", "dynamics", "V", 0, 100),
      er: S("\u03B5_r", "dynamics", "\u2014", 1, 80)
    },
    tick(state) {
      const eps0 = 88541878128e-22;
      state.C = eps0 * P(state.params, "er", 1) * P(state.params, "A", 0.01) / Math.max(1e-6, P(state.params, "d", 1e-3));
      state.Q = state.C * P(state.params, "V", 10);
      state.U = 0.5 * state.C * P(state.params, "V", 10) ** 2;
    },
    plot: (s) => s.C * 1e12,
    rows: (s) => [["C", s.C * 1e12, "pF"], ["U", s.U, "J"]]
  });
}
function lorentzRadius(spec) {
  return shell(spec, {
    equation: "R = m v_\u22A5 / (|q| B)\uFF0C\u03C9 = |q| B / m",
    authority: "Griffiths, Ch. 5 \u5747\u5300\u78C1\u573A\u4E2D\u7684\u56DE\u65CB",
    assumptions: "\u5747\u5300 B\u3001\u5782\u76F4\u901F\u5EA6\u3001\u5FFD\u7565\u8F90\u5C04",
    params: { v: 1e6, B: 0.1 },
    schema: {
      v: S("v", "dynamics", "m/s", 1e4, 1e7),
      B: S("B", "dynamics", "T", 0.01, 2)
    },
    tick(state) {
      const q = 1602176634e-28;
      const m = 91093837e-38;
      const B = Math.max(1e-4, P(state.params, "B", 0.1));
      state.R = m * P(state.params, "v", 1e6) / (q * B);
      state.w = q * B / m;
    },
    plot: (s) => s.R,
    rows: (s) => [["R", s.R, "m"], ["\u03C9", s.w, "rad/s"]]
  });
}
function doubleSlit(spec) {
  return shell(spec, {
    equation: "\u0394y = \u03BB L / d",
    authority: "Hecht, Optics, \u6768\u6C0F\u53CC\u7F1D\u6761\u7EB9\u95F4\u8DDD",
    assumptions: "\u8FDC\u573A\u3001\u5C0F\u89D2",
    params: { lambda: 55e-8, L: 1, d: 2e-4 },
    schema: {
      lambda: S("\u6CE2\u957F \u03BB", "dynamics", "m", 4e-7, 7e-7),
      L: S("\u5C4F\u8DDD L", "dynamics", "m", 0.2, 3),
      d: S("\u7F1D\u8DDD d", "dynamics", "m", 5e-5, 1e-3)
    },
    tick(state) {
      state.dy = P(state.params, "lambda", 55e-8) * P(state.params, "L", 1) / Math.max(1e-6, P(state.params, "d", 2e-4));
    },
    plot: (s) => s.dy * 1e3,
    rows: (s) => [["\u0394y", s.dy * 1e3, "mm"]]
  });
}
function bohr(spec) {
  return shell(spec, {
    equation: "E_n = \u221213.6 eV / n\xB2",
    authority: "Bohr \u6A21\u578B\uFF1BBransden & Joachain \u5386\u53F2\u6A21\u578B\u7AE0\u8282",
    assumptions: "\u7C7B\u6C22\u3001\u73BB\u5C14\u6A21\u578B\u4E0D\u662F\u73B0\u4EE3\u91CF\u5B50\u5316\u5B66",
    fidelity: "principle",
    params: { n: 2 },
    schema: { n: S("n", "dynamics", "\u2014", 1, 8) },
    tick(state) {
      const n = Math.max(1, Math.round(P(state.params, "n", 2)));
      state.E = -13.6 / (n * n);
    },
    plot: (s) => s.E,
    rows: (s) => [["E_n", s.E, "eV"]]
  });
}
function hashLoad(spec) {
  return shell(spec, {
    equation: "\u94FE\u5730\u5740\u671F\u671B\u94FE\u957F \u03B1 = n / m",
    authority: "CLRS, \u54C8\u5E0C\u8868\u88C5\u8F7D\u56E0\u5B50",
    assumptions: "\u7B80\u5355\u5747\u5300\u54C8\u5E0C",
    params: { n: 80, m: 100 },
    schema: {
      n: S("n", "dynamics", "\u2014", 1, 500),
      m: S("m", "dynamics", "\u2014", 1, 500)
    },
    tick(state) {
      state.alpha = P(state.params, "n", 80) / Math.max(1, P(state.params, "m", 100));
    },
    plot: (s) => s.alpha,
    rows: (s) => [["\u03B1", s.alpha, ""]]
  });
}
function pageReplace(spec) {
  return shell(spec, {
    equation: "LRU\uFF1A\u6700\u8FD1\u6700\u5C11\u4F7F\u7528\u88AB\u66FF\u6362\uFF08\u7ED9\u5B9A\u5F15\u7528\u4E32\u7684\u547D\u4E2D\u6570\uFF09",
    authority: "Silberschatz, Operating System Concepts, \u9875\u7F6E\u6362",
    assumptions: "\u56FA\u5B9A\u5F15\u7528\u4E32 1,2,3,4,1,2,5,1,2,3,4,5\uFF1B\u5E27\u6570\u53EF\u8C03",
    params: { frames: 3 },
    schema: { frames: S("\u5E27", "dynamics", "\u2014", 1, 6) },
    tick(state) {
      const frames = Math.max(1, Math.round(P(state.params, "frames", 3)));
      const ref = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
      const mem = [];
      let hit = 0;
      for (const p of ref) {
        const i = mem.indexOf(p);
        if (i >= 0) {
          hit += 1;
          mem.splice(i, 1);
          mem.push(p);
        } else {
          if (mem.length >= frames) mem.shift();
          mem.push(p);
        }
      }
      state.hit = hit;
    },
    plot: (s) => s.hit,
    rows: (s) => [["hits", s.hit, ""]]
  });
}
function rsaMod(spec) {
  return shell(spec, {
    equation: "c = m^e mod n\uFF08\u6559\u5B66\u5C0F\u6574\u6570\uFF09",
    authority: "Katz & Lindell, Introduction to Modern Cryptography, RSA \u5B9A\u4E49",
    assumptions: "\u4EC5\u5C0F\u6574\u6570\u6F14\u793A\u52A0\u5BC6\u5B9A\u4E49\uFF0C\u4E0D\u751F\u6210\u5BC6\u94A5\u3001\u4E0D\u653B\u51FB",
    fidelity: "principle",
    params: { m: 7, e: 3, n: 33 },
    schema: {
      m: S("m", "dynamics", "\u2014", 0, 30),
      e: S("e", "dynamics", "\u2014", 1, 9),
      n: S("n", "dynamics", "\u2014", 2, 97)
    },
    tick(state) {
      const n = Math.max(2, Math.round(P(state.params, "n", 33)));
      let m = Math.round(P(state.params, "m", 7)) % n;
      const e = Math.max(1, Math.round(P(state.params, "e", 3)));
      let c = 1;
      for (let i = 0; i < e; i += 1) c = c * m % n;
      state.c = c;
    },
    plot: (s) => s.c,
    rows: (s) => [["c", s.c, ""]]
  });
}
function caesar(spec) {
  return shell(spec, {
    equation: "c = (p + k) mod 26",
    authority: "\u53E4\u5178\u79FB\u4F4D\u5BC6\u7801\u5B9A\u4E49",
    assumptions: "\u5355\u5B57\u6BCD\u3001\u4E0D\u63D0\u4F9B\u7834\u8BD1\u6D41\u7A0B",
    fidelity: "principle",
    params: { p: 3, k: 5 },
    schema: {
      p: S("p", "dynamics", "\u2014", 0, 25),
      k: S("k", "dynamics", "\u2014", 0, 25)
    },
    tick(state) {
      state.c = (Math.round(P(state.params, "p", 3)) + Math.round(P(state.params, "k", 5))) % 26;
    },
    plot: (s) => s.c,
    rows: (s) => [["c", s.c, ""]]
  });
}
function gdQuadratic(spec) {
  return shell(spec, {
    equation: "x \u2190 x \u2212 \u03B7 \xB7 2(x \u2212 a)\uFF08\u6700\u5C0F\u5316 (x\u2212a)\xB2\uFF09",
    authority: "Nocedal & Wright, Numerical Optimization, \u68AF\u5EA6\u4E0B\u964D",
    assumptions: "\u4E00\u7EF4\u4E8C\u6B21\u3001\u56FA\u5B9A\u6B65\u957F",
    params: { x: 4, a: 1, eta: 0.2 },
    schema: {
      x: S("x\u2080", "initial", "\u2014", -5, 5),
      a: S("a", "dynamics", "\u2014", -3, 3),
      eta: S("\u03B7", "dynamics", "\u2014", 0.01, 0.5)
    },
    init(state) {
      state.x = P(state.params, "x", 4);
    },
    tick(state, h) {
      if (h <= 0) {
        state.x = P(state.params, "x", 4);
        return;
      }
      const a = P(state.params, "a", 1);
      const eta = P(state.params, "eta", 0.2);
      state.x -= eta * 2 * (state.x - a);
    },
    plot: (s) => s.x,
    rows: (s) => [["x", s.x, ""]]
  });
}
function kmeans1d(spec) {
  return shell(spec, {
    equation: "\u4E00\u7EF4\u4E24\u70B9\uFF1A\u4E2D\u5FC3\u66F4\u65B0\u4E3A\u6240\u5C5E\u6837\u672C\u5747\u503C",
    authority: "Bishop, PRML, K-means",
    assumptions: "\u56FA\u5B9A\u6837\u672C {0,0.2,0.8,1}\uFF0C\u4E24\u4E2D\u5FC3",
    params: { c1: 0, c2: 1 },
    schema: {
      c1: S("c\u2081", "initial", "\u2014", -1, 2),
      c2: S("c\u2082", "initial", "\u2014", -1, 2)
    },
    init(state) {
      state.c1 = P(state.params, "c1", 0);
      state.c2 = P(state.params, "c2", 1);
      state.stepN = 0;
    },
    tick(state) {
      const data = [0, 0.2, 0.8, 1];
      if (state.stepN > state.t) return;
      const g1 = [];
      const g2 = [];
      for (const x of data) {
        (Math.abs(x - state.c1) <= Math.abs(x - state.c2) ? g1 : g2).push(x);
      }
      if (g1.length) state.c1 = g1.reduce((a, b) => a + b, 0) / g1.length;
      if (g2.length) state.c2 = g2.reduce((a, b) => a + b, 0) / g2.length;
      state.stepN += 1;
    },
    plot: (s) => s.c1,
    rows: (s) => [["c\u2081", s.c1, ""], ["c\u2082", s.c2, ""]]
  });
}
function binarySearchSteps(spec) {
  return shell(spec, {
    equation: "\u6BD4\u8F83\u6B21\u6570\u4E0A\u754C \u230Alog\u2082 n\u230B+1",
    authority: "CLRS, \u4E8C\u5206\u67E5\u627E",
    assumptions: "\u6709\u5E8F\u6570\u7EC4",
    params: { n: 1e3 },
    schema: { n: S("n", "dynamics", "\u2014", 1, 1e6) },
    tick(state) {
      const n = Math.max(1, P(state.params, "n", 1e3));
      state.steps = Math.floor(Math.log2(n)) + 1;
    },
    plot: (s) => s.steps,
    rows: (s) => [["steps", s.steps, ""]]
  });
}
function nyquist(spec) {
  return shell(spec, {
    equation: "f_s \u2265 2 f_max",
    authority: "Oppenheim & Schafer, Discrete-Time Signal Processing, \u91C7\u6837\u5B9A\u7406",
    assumptions: "\u5E26\u9650\u3001\u7406\u60F3\u91C7\u6837",
    params: { fmax: 1e3 },
    schema: { fmax: S("f_max", "dynamics", "Hz", 1, 2e4) },
    tick(state) {
      state.fs = 2 * P(state.params, "fmax", 1e3);
    },
    plot: (s) => s.fs,
    rows: (s) => [["f_s,min", s.fs, "Hz"]]
  });
}
function pwm(spec) {
  return shell(spec, {
    equation: "V_avg = D \xB7 V",
    authority: "Mohan, Power Electronics, PWM \u5E73\u5747\u503C",
    assumptions: "\u7406\u60F3\u5F00\u5173\u3001\u5360\u7A7A\u6BD4 D\u2208[0,1]",
    params: { D: 0.4, V: 12 },
    schema: {
      D: S("D", "dynamics", "\u2014", 0, 1),
      V: S("V", "dynamics", "V", 0, 48)
    },
    tick(state) {
      state.v = Math.min(1, Math.max(0, P(state.params, "D", 0.4))) * P(state.params, "V", 12);
    },
    plot: (s) => s.v,
    rows: (s) => [["V_avg", s.v, "V"]]
  });
}
function reflectionCoeff(spec) {
  return shell(spec, {
    equation: "\u0393 = (Z_L \u2212 Z\u2080) / (Z_L + Z\u2080)",
    authority: "Pozar, Microwave Engineering, \u7535\u538B\u53CD\u5C04\u7CFB\u6570",
    assumptions: "\u5B9E\u963B\u6297",
    params: { ZL: 75, Z0: 50 },
    schema: {
      ZL: S("Z_L", "dynamics", "\u03A9", 1, 300),
      Z0: S("Z\u2080", "dynamics", "\u03A9", 1, 300)
    },
    tick(state) {
      const ZL = P(state.params, "ZL", 75);
      const Z0 = P(state.params, "Z0", 50);
      state.G = (ZL - Z0) / (ZL + Z0);
    },
    plot: (s) => s.G,
    rows: (s) => [["\u0393", s.G, ""]]
  });
}
function phugoid(spec) {
  return shell(spec, {
    equation: "T \u2248 \u03C0 \u221A2 \xB7 V / g\uFF08\u6D6E\u6C89\u6A21\u6001\u5468\u671F\u8FD1\u4F3C\uFF09",
    authority: "Etkin, Dynamics of Flight, \u6D6E\u6C89\u8FD1\u4F3C",
    assumptions: "\u5C0F\u6270\u52A8\u3001\u5E38\u9AD8\u5EA6\u9644\u8FD1\u7684\u8FD1\u4F3C\u5468\u671F\uFF0C\u4E0D\u662F\u516D\u81EA\u7531\u5EA6\u4EFF\u771F",
    fidelity: "principle",
    params: { V: 60 },
    schema: { V: S("V", "dynamics", "m/s", 20, 250) },
    tick(state) {
      state.T = Math.PI * Math.SQRT2 * P(state.params, "V", 60) / 9.81;
    },
    plot: (s) => s.T,
    rows: (s) => [["T", s.T, "s"]]
  });
}
function blackScholes(spec) {
  return shell(spec, {
    equation: "\u6B27\u5F0F\u770B\u6DA8\uFF1AC = S \u03A6(d1) \u2212 K e^{\u2212rT} \u03A6(d2)",
    authority: "Hull, Options, Futures, and Other Derivatives, Black\u2013Scholes\u2013Merton",
    assumptions: "\u65E0\u80A1\u5229\u3001\u5E38\u6CE2\u52A8\u7387\u3001\u6B27\u5F0F\uFF1B\u03A6 \u4E3A\u6807\u51C6\u6B63\u6001 cdf \u8FD1\u4F3C",
    fidelity: "engineering",
    params: { S: 100, K: 100, r: 0.02, sigma: 0.2, T: 1 },
    schema: {
      S: S("S", "dynamics", "\u2014", 10, 200),
      K: S("K", "dynamics", "\u2014", 10, 200),
      sigma: S("\u03C3", "dynamics", "\u2014", 0.05, 0.8),
      T: S("T", "dynamics", "yr", 0.05, 3),
      r: S("r", "dynamics", "\u2014", 0, 0.1)
    },
    tick(state) {
      const S2 = P(state.params, "S", 100);
      const K = P(state.params, "K", 100);
      const r = P(state.params, "r", 0.02);
      const sig = Math.max(1e-3, P(state.params, "sigma", 0.2));
      const T = Math.max(1e-3, P(state.params, "T", 1));
      const d1 = (Math.log(S2 / K) + (r + 0.5 * sig * sig) * T) / (sig * Math.sqrt(T));
      const d2 = d1 - sig * Math.sqrt(T);
      const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
      state.C = S2 * Phi(d1) - K * Math.exp(-r * T) * Phi(d2);
    },
    plot: (s) => s.C,
    rows: (s) => [["C", s.C, ""]]
  });
}
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return sign * y;
}
function gaussPoint(spec) {
  return shell(spec, {
    equation: "\u70B9\u7535\u8377 E = k |q| / r\xB2\uFF08\u9AD8\u65AF\u5B9A\u7406\u7684\u7403\u5BF9\u79F0\u7ED3\u679C\uFF09",
    authority: "Griffiths, Ch. 2",
    assumptions: "\u7403\u5BF9\u79F0\u70B9\u7535\u8377",
    params: { q: 1e-9, r: 0.3 },
    schema: {
      q: S("q", "dynamics", "C", -5e-9, 5e-9),
      r: S("r", "dynamics", "m", 0.05, 2)
    },
    tick(state) {
      const k = 89875517923e-1;
      const r = Math.max(0.02, P(state.params, "r", 0.3));
      state.E = k * Math.abs(P(state.params, "q", 1e-9)) / (r * r);
    },
    plot: (s) => s.E,
    rows: (s) => [["E", s.E, "V/m"]]
  });
}
function qho(spec) {
  return shell(spec, {
    equation: "E_n = \u210F \u03C9 (n + 1/2)",
    authority: "Griffiths, QM, \u91CF\u5B50\u8C10\u632F\u5B50",
    assumptions: "\u4E00\u7EF4\u8C10\u632F\u5B50\u80FD\u7EA7",
    params: { n: 0, omega: 1e15 },
    schema: {
      n: S("n", "dynamics", "\u2014", 0, 8),
      omega: S("\u03C9", "dynamics", "rad/s", 1e13, 1e16)
    },
    tick(state) {
      const hbar = 1054571817e-43;
      const n = Math.max(0, Math.round(P(state.params, "n", 0)));
      state.E = hbar * P(state.params, "omega", 1e15) * (n + 0.5) / 1602176634e-28;
    },
    plot: (s) => s.E,
    rows: (s) => [["E", s.E, "eV"]]
  });
}
function heatMode(spec) {
  return shell(spec, {
    equation: "T(t) = T\u2080 exp(\u2212\u03B1 (\u03C0/L)\xB2 t)\uFF08\u7B2C\u4E00\u6B63\u5F26\u6A21\uFF09",
    authority: "Incropera, \u4E00\u7EF4\u5BFC\u70ED\u5206\u79BB\u53D8\u91CF",
    assumptions: "\u4E24\u7AEF\u96F6\u6E29\u3001\u5355\u4E00\u6A21\u6001\u3001\u5E38 \u03B1",
    params: { alpha: 1e-4, L: 0.1, T0: 80 },
    schema: {
      alpha: S("\u03B1", "dynamics", "m\xB2/s", 1e-6, 1e-3),
      L: S("L", "dynamics", "m", 0.01, 1),
      T0: S("T\u2080", "initial", "K", 0, 200)
    },
    tick(state) {
      const L = Math.max(1e-3, P(state.params, "L", 0.1));
      const k2 = (Math.PI / L) ** 2;
      state.T = P(state.params, "T0", 80) * Math.exp(-P(state.params, "alpha", 1e-4) * k2 * state.t);
    },
    plot: (s) => s.T,
    rows: (s) => [["T", s.T, "K"]]
  });
}
function brownian(spec) {
  return shell(spec, {
    equation: "\u27E8x\xB2\u27E9 = 2 D t\uFF08\u4E00\u7EF4\uFF09",
    authority: "Einstein, Ann. Phys. 1905\uFF1B\u6269\u6563",
    assumptions: "\u4E00\u7EF4\u3001\u5E38\u6269\u6563\u7CFB\u6570",
    params: { D: 1e-9 },
    schema: { D: S("D", "dynamics", "m\xB2/s", 1e-12, 1e-6) },
    tick(state) {
      state.msd = 2 * P(state.params, "D", 1e-9) * state.t;
    },
    plot: (s) => s.msd,
    rows: (s) => [["\u27E8x\xB2\u27E9", s.msd, "m\xB2"]]
  });
}
function percolation(spec) {
  return shell(spec, {
    equation: "\u5E73\u5747\u573A\u5E8F\u53C2\u91CF P \u223C (p \u2212 p_c)^\u03B2\uFF0Cp_c=0.5\uFF0C\u03B2=1\uFF08p>p_c\uFF09",
    authority: "Stauffer & Aharony, Introduction to Percolation Theory, \u5E73\u5747\u573A",
    assumptions: "\u5E73\u5747\u573A\u6307\u6570\uFF0C\u4E0D\u662F\u4E8C\u7EF4\u683C\u70B9\u7CBE\u786E pc",
    fidelity: "principle",
    params: { p: 0.7 },
    schema: { p: S("p", "dynamics", "\u2014", 0, 1) },
    tick(state) {
      const p = P(state.params, "p", 0.7);
      state.P = p > 0.5 ? p - 0.5 : 0;
    },
    plot: (s) => s.P,
    rows: (s) => [["P", s.P, ""]]
  });
}
function entropyMix(spec) {
  return shell(spec, {
    equation: "\u4E8C\u5143\u6DF7\u5408 \u0394S/k = \u2212n (x ln x + (1\u2212x) ln(1\u2212x))",
    authority: "Schroeder, Thermal Physics, \u6DF7\u5408\u71B5",
    assumptions: "\u7406\u60F3\u6C14\u4F53\u6DF7\u5408\u3001\u6469\u5C14\u5206\u6570 x",
    params: { x: 0.3, n: 1 },
    schema: {
      x: S("x", "dynamics", "\u2014", 0.01, 0.99),
      n: S("n", "dynamics", "mol", 0.1, 5)
    },
    tick(state) {
      const x = Math.min(0.999, Math.max(1e-3, P(state.params, "x", 0.3)));
      state.S = -P(state.params, "n", 1) * (x * Math.log(x) + (1 - x) * Math.log(1 - x));
    },
    plot: (s) => s.S,
    rows: (s) => [["\u0394S/R", s.S, ""]]
  });
}
function buoyancy(spec) {
  return shell(spec, {
    equation: "F_b = \u03C1_f V g",
    authority: "Kundu, Fluid Mechanics, \u963F\u57FA\u7C73\u5FB7\u539F\u7406",
    assumptions: "\u5B8C\u5168\u6D78\u6CA1\u3001\u9759\u6D41\u4F53",
    params: { rho: 1e3, V: 2e-3 },
    schema: {
      rho: S("\u03C1", "dynamics", "kg/m\xB3", 1, 2e3),
      V: S("V", "dynamics", "m\xB3", 1e-5, 0.1)
    },
    tick(state) {
      state.Fb = P(state.params, "rho", 1e3) * P(state.params, "V", 2e-3) * 9.81;
    },
    plot: (s) => s.Fb,
    rows: (s) => [["F_b", s.Fb, "N"]]
  });
}
function rigidEuler(spec) {
  return shell(spec, {
    equation: "\u03C4 = I \u03B1",
    authority: "Goldstein, Classical Mechanics, \u5B9A\u70B9\u8F6C\u52A8\uFF08\u4E3B\u8F74\u6807\u91CF\u5F62\u5F0F\uFF09",
    assumptions: "\u7ED5\u56FA\u5B9A\u8F74\u3001\u5E38\u8F6C\u52A8\u60EF\u91CF",
    params: { tau: 2, I: 0.4 },
    schema: {
      tau: S("\u03C4", "dynamics", "N\xB7m", -20, 20),
      I: S("I", "dynamics", "kg\xB7m\xB2", 0.05, 5)
    },
    tick(state) {
      state.alpha = P(state.params, "tau", 2) / Math.max(1e-3, P(state.params, "I", 0.4));
      state.omega = state.alpha * state.t;
    },
    plot: (s) => s.omega,
    rows: (s) => [["\u03B1", s.alpha, "rad/s\xB2"], ["\u03C9", s.omega, "rad/s"]]
  });
}
function coriolis(spec) {
  return shell(spec, {
    equation: "a_cor = \u22122 \u03C9 \xD7 v\uFF0C\u5927\u5C0F 2 \u03C9 v sin\u03C6",
    authority: "Thornton & Marion, \u975E\u60EF\u6027\u7CFB\u79D1\u91CC\u5965\u5229\u52A0\u901F\u5EA6",
    assumptions: "\u5730\u7403\u81EA\u8F6C \u03C9 \u7ED9\u5B9A\u5927\u5C0F\u3001\u901F\u5EA6\u6C34\u5E73",
    params: { omega: 72921e-9, v: 20, phi: 45 },
    schema: {
      v: S("v", "dynamics", "m/s", 0, 100),
      phi: S("\u03C6", "dynamics", "\xB0", 0, 90)
    },
    tick(state) {
      const w = P(state.params, "omega", 72921e-9);
      state.a = 2 * w * P(state.params, "v", 20) * Math.sin(P(state.params, "phi", 45) * Math.PI / 180);
    },
    plot: (s) => s.a,
    rows: (s) => [["|a_cor|", s.a, "m/s\xB2"]]
  });
}
function coupledModes(spec) {
  return shell(spec, {
    equation: "\u5BF9\u79F0/\u53CD\u5BF9\u79F0\u6A21\uFF1A\u03C9\xB1 = \u221A(k/m) \u4E0E \u221A((k+2\u03BA)/m)",
    authority: "French, Vibrations and Waves, \u4E24\u4E2A\u8026\u5408\u632F\u5B50",
    assumptions: "\u7B49\u8D28\u91CF\u3001\u8FD1\u90BB\u5F39\u7C27",
    params: { m: 1, k: 4, kappa: 1 },
    schema: {
      m: S("m", "dynamics", "kg", 0.2, 5),
      k: S("k", "dynamics", "N/m", 0.2, 20),
      kappa: S("\u03BA", "dynamics", "N/m", 0, 10)
    },
    tick(state) {
      const m = Math.max(1e-3, P(state.params, "m", 1));
      state.wp = Math.sqrt(P(state.params, "k", 4) / m);
      state.wm = Math.sqrt((P(state.params, "k", 4) + 2 * P(state.params, "kappa", 1)) / m);
    },
    plot: (s) => s.wm,
    rows: (s) => [["\u03C9+", s.wp, "rad/s"], ["\u03C9\u2212", s.wm, "rad/s"]]
  });
}
function duffing(spec) {
  return shell(spec, {
    equation: "x\u2033 + \u03B4 x\u2032 + \u03B1 x + \u03B2 x\xB3 = \u03B3 cos(\u03C9 t)\uFF08\u53C2\u6570\u53EF\u5173\u9A71\u52A8\uFF09",
    authority: "Strogatz\uFF1BGuckenheimer & Holmes \u4E2D\u7684 Duffing",
    assumptions: "\u5F31\u975E\u7EBF\u6027\u793A\u610F\uFF0C\u6B27\u62C9\u79EF\u5206\u6B65\u957F\u5185\u90E8\u5206\u5272",
    fidelity: "principle",
    params: { alpha: 1, beta: 0.4, delta: 0.1, gamma: 0.3, omega: 1 },
    schema: {
      alpha: S("\u03B1", "dynamics", "\u2014", -2, 2),
      beta: S("\u03B2", "dynamics", "\u2014", -1, 2),
      delta: S("\u03B4", "dynamics", "\u2014", 0, 0.5)
    },
    init(state) {
      state.x = 0.2;
      state.v = 0;
    },
    tick(state, h) {
      if (h <= 0) return;
      const a = P(state.params, "alpha", 1);
      const b = P(state.params, "beta", 0.4);
      const d = P(state.params, "delta", 0.1);
      const g = P(state.params, "gamma", 0.3);
      const w = P(state.params, "omega", 1);
      const n = 8;
      const dt = h / n;
      for (let i = 0; i < n; i += 1) {
        const acc = -d * state.v - a * state.x - b * state.x ** 3 + g * Math.cos(w * state.t);
        state.v += acc * dt;
        state.x += state.v * dt;
      }
    },
    plot: (s) => s.x,
    rows: (s) => [["x", s.x, ""], ["v", s.v, ""]]
  });
}
function tcpStates(spec) {
  return shell(spec, {
    equation: "\u4E09\u6B21\u63E1\u624B\uFF1ASYN \u2192 SYN-ACK \u2192 ACK\uFF08\u6B65 0\u20132\uFF0C\u9ED8\u8BA4 RTT = 1 s\uFF09",
    authority: "Kurose & Ross, Computer Networking, TCP \u8FDE\u63A5\u5EFA\u7ACB",
    assumptions: "\u65E0\u4E22\u5305\uFF1B\u6BCF\u6B65\u5386\u65F6\u4E00\u4E2A RTT",
    params: { rtt: 1 },
    schema: {
      rtt: S("RTT", "dynamics", "s", 0.2, 5)
    },
    tick(state) {
      const rtt = Math.max(0.05, P(state.params, "rtt", 1));
      state.step = Math.min(2, Math.floor(state.t / rtt));
    },
    plot: (s) => s.step,
    rows: (s) => [["step", s.step, ""]]
  });
}
function bankerNeed(spec) {
  return shell(spec, {
    equation: "Need = Max \u2212 Allocation\uFF08\u5355\u8D44\u6E90\uFF09",
    authority: "Silberschatz, \u94F6\u884C\u5BB6\u7B97\u6CD5\u5B9A\u4E49",
    assumptions: "\u5355\u4E00\u8D44\u6E90\u7C7B\u578B\u7684 Need",
    params: { max: 8, alloc: 3 },
    schema: {
      max: S("Max", "dynamics", "\u2014", 0, 20),
      alloc: S("Allocation", "dynamics", "\u2014", 0, 20)
    },
    tick(state) {
      state.need = Math.max(0, P(state.params, "max", 8) - P(state.params, "alloc", 3));
    },
    plot: (s) => s.need,
    rows: (s) => [["Need", s.need, ""]]
  });
}
function rrWait(spec) {
  return shell(spec, {
    equation: "\u65F6\u95F4\u7247\u8F6E\u8F6C\uFF1A\u5468\u8F6C\u65F6\u95F4\u8FD1\u4F3C\u968F\u8FDB\u7A0B\u6570\u4E0E\u7247\u957F\u53D8\u5316\uFF08n \u4E2A\u7B49\u957F\u4F5C\u4E1A\uFF09",
    authority: "Silberschatz, CPU \u8C03\u5EA6",
    assumptions: "n \u4E2A\u7B49\u957F\u4F5C\u4E1A\u3001\u65E0\u5207\u6362\u5F00\u9500\u65F6\u603B\u5468\u8F6C\u548C\u4E3A n(n+1)/2 \xD7 q \u5F53\u4F5C\u4E1A\u6070\u4E3A 1 \u7247\u2014\u2014\u6B64\u5904\u4F5C\u4E1A\u957F\u5EA6 = q",
    params: { n: 4, q: 1 },
    schema: {
      n: S("n", "dynamics", "\u2014", 1, 12),
      q: S("q", "dynamics", "s", 0.1, 5)
    },
    tick(state) {
      const n = Math.max(1, Math.round(P(state.params, "n", 4)));
      const q = P(state.params, "q", 1);
      state.Tsum = n * (n + 1) / 2 * q;
    },
    plot: (s) => s.Tsum,
    rows: (s) => [["\u03A3T", s.Tsum, "s"]]
  });
}
function hohmann(spec) {
  return shell(spec, {
    equation: "\u0394v = \u221A(\u03BC/r1) (\u221A(2 r2/(r1+r2)) \u2212 1) + \u221A(\u03BC/r2) (1 \u2212 \u221A(2 r1/(r1+r2)))",
    authority: "Curtis, Orbital Mechanics for Engineering Students, \u970D\u66FC\u8F6C\u79FB",
    assumptions: "\u5171\u9762\u5706\u8F68\u9053\u3001\u4E8C\u4F53\u3001\u03BC \u4E3A\u4E2D\u5FC3\u5F15\u529B\u53C2\u6570",
    params: { r1: 6671e3, r2: 42164e3, mu: 3986e11 },
    schema: {
      r1: S("r\u2081", "dynamics", "m", 64e5, 2e7),
      r2: S("r\u2082", "dynamics", "m", 7e6, 5e7),
      mu: S("\u5F15\u529B\u53C2\u6570 \u03BC", "dynamics", "m\xB3/s\xB2", 1e14, 5e14)
    },
    tick(state) {
      const mu = P(state.params, "mu", 3986e11);
      const r1 = P(state.params, "r1", 6671e3);
      const r2 = Math.max(r1 + 1, P(state.params, "r2", 42164e3));
      const dv1 = Math.sqrt(mu / r1) * (Math.sqrt(2 * r2 / (r1 + r2)) - 1);
      const dv2 = Math.sqrt(mu / r2) * (1 - Math.sqrt(2 * r1 / (r1 + r2)));
      state.dv = dv1 + dv2;
    },
    plot: (s) => s.dv,
    rows: (s) => [["\u0394v", s.dv, "m/s"]]
  });
}
function hydraulicJump(spec) {
  return shell(spec, {
    equation: "y\u2082/y\u2081 = \xBD (\u22121 + \u221A(1+8 Fr\u2081\xB2))",
    authority: "Chow, Open-Channel Hydraulics, \u5171\u8F6D\u6C34\u6DF1",
    assumptions: "\u6C34\u5E73\u77E9\u5F62\u6E20\u3001\u8DC3\u524D Fr>1",
    params: { y1: 0.4, Fr: 2.5 },
    schema: {
      y1: S("y\u2081", "dynamics", "m", 0.05, 3),
      Fr: S("Fr\u2081", "dynamics", "\u2014", 1, 8)
    },
    tick(state) {
      const Fr = Math.max(1, P(state.params, "Fr", 2.5));
      state.y2 = P(state.params, "y1", 0.4) * 0.5 * (-1 + Math.sqrt(1 + 8 * Fr * Fr));
    },
    plot: (s) => s.y2,
    rows: (s) => [["y\u2082", s.y2, "m"]]
  });
}
function sluice(spec) {
  return shell(spec, {
    equation: "Q = C_d a b \u221A(2 g h)",
    authority: "\u95F8\u5B54\u51FA\u6D41\uFF0CChow / \u6C34\u529B\u5B66\u6559\u6750",
    assumptions: "\u81EA\u7531\u51FA\u6D41\u3001\u7ED9\u5B9A\u6D41\u91CF\u7CFB\u6570",
    params: { Cd: 0.6, a: 0.3, b: 1, h: 1 },
    schema: {
      Cd: S("C_d", "dynamics", "\u2014", 0.4, 0.8),
      a: S("\u5F00\u5EA6", "dynamics", "m", 0.05, 2),
      b: S("\u5BBD\u5EA6", "dynamics", "m", 0.2, 10),
      h: S("h", "dynamics", "m", 0.1, 8)
    },
    tick(state) {
      state.Q = P(state.params, "Cd", 0.6) * P(state.params, "a", 0.3) * P(state.params, "b", 1) * Math.sqrt(2 * 9.81 * Math.max(0, P(state.params, "h", 1)));
    },
    plot: (s) => s.Q,
    rows: (s) => [["Q", s.Q, "m\xB3/s"]]
  });
}
function naschFlow(spec) {
  return shell(spec, {
    equation: "NaSch \u57FA\u672C\u56FE\u7684\u5E73\u5747\u573A\uFF1Aq = \u03C1 (1 \u2212 \u03C1)\uFF08vmax=1 \u7684\u7B80\u5316\uFF09",
    authority: "Nagel & Schreckenberg, J. Phys. I 2, 2221 (1992)\uFF0C\u6B64\u5904\u4E3A v_max=1 \u7684\u7CBE\u786E\u5E73\u5747\u573A\u6D41\u91CF",
    assumptions: "v_max=1\u3001\u65E0\u968F\u673A\u51CF\u901F\u65F6 q=\u03C1(1\u2212\u03C1)\uFF1B\u4E0D\u662F\u5B8C\u6574 NaSch \u8499\u7279\u5361\u6D1B",
    fidelity: "principle",
    params: { rho: 0.3 },
    schema: { rho: S("\u03C1", "dynamics", "\u2014", 0, 1) },
    tick(state) {
      const rho = Math.min(1, Math.max(0, P(state.params, "rho", 0.3)));
      state.q = rho * (1 - rho);
    },
    plot: (s) => s.q,
    rows: (s) => [["q", s.q, ""]]
  });
}
function mccabe(spec) {
  return shell(spec, {
    equation: "\u6700\u5C0F\u56DE\u6D41\u6BD4\u9644\u8FD1\uFF1A\u64CD\u4F5C\u7EBF y = (R/(R+1)) x + x_D/(R+1)",
    authority: "McCabe & Thiele\uFF1BKing, Separation Processes",
    assumptions: "\u6052\u6469\u5C14\u6EA2\u6D41\u3001\u4E8C\u5143\u7CBE\u998F\u7CBE\u998F\u6BB5\u64CD\u4F5C\u7EBF",
    params: { R: 2, xD: 0.95, x: 0.5 },
    schema: {
      R: S("R", "dynamics", "\u2014", 0.2, 10),
      xD: S("x_D", "dynamics", "\u2014", 0.5, 0.99),
      x: S("x", "dynamics", "\u2014", 0, 1)
    },
    tick(state) {
      const R = P(state.params, "R", 2);
      const x = P(state.params, "x", 0.5);
      state.y = R / (R + 1) * x + P(state.params, "xD", 0.95) / (R + 1);
    },
    plot: (s) => s.y,
    rows: (s) => [["y", s.y, ""]]
  });
}
function pkOneCompartment(spec) {
  return shell(spec, {
    equation: "C = (D/V) e^{\u2212k t}",
    authority: "Gibaldi & Perrier, Pharmacokinetics, \u4E00\u5BA4\u9759\u8109\u63A8\u6CE8",
    assumptions: "\u4E00\u5BA4\u3001\u4E00\u7EA7\u6D88\u9664\uFF1B\u975E\u7ED9\u836F\u65B9\u6848",
    fidelity: "principle",
    params: { D: 100, V: 20, k: 0.1 },
    schema: {
      D: S("D", "dynamics", "mg", 1, 500),
      V: S("V", "dynamics", "L", 1, 100),
      k: S("k", "dynamics", "1/h", 0.01, 1)
    },
    tick(state) {
      state.C = P(state.params, "D", 100) / Math.max(0.1, P(state.params, "V", 20)) * Math.exp(-P(state.params, "k", 0.1) * state.t);
    },
    plot: (s) => s.C,
    rows: (s) => [["C", s.C, "mg/L"]]
  });
}
function membraneHHNote(spec) {
  return shell(spec, {
    equation: "\u9759\u606F\uFF1AV \u2248 (gK EK + gNa ENa) / (gK + gNa)\uFF08\u4E24\u7535\u5BFC\u5206\u538B\uFF09",
    authority: "Hodgkin & Huxley, J. Physiol. 1952 \u7684\u7535\u5BFC\u5F62\u5F0F\u5728\u7A33\u6001\u7684\u5206\u538B\u6781\u9650",
    assumptions: "\u5FFD\u7565\u6F0F\u7535\u5BFC\u4E0E\u7535\u5BB9\u6682\u6001\uFF1B\u4E0D\u662F\u5B8C\u6574 HH \u95E8\u63A7\uFF08\u5B8C\u6574\u6A21\u578B\u89C1\u624B\u5199 hodgkin-huxley\uFF09",
    fidelity: "principle",
    params: { gK: 0.3, gNa: 0.05, EK: -77, ENa: 50 },
    schema: {
      gK: S("gK", "dynamics", "\u2014", 0.01, 1),
      gNa: S("gNa", "dynamics", "\u2014", 0.01, 1)
    },
    tick(state) {
      const gK = P(state.params, "gK", 0.3);
      const gNa = P(state.params, "gNa", 0.05);
      state.V = (gK * P(state.params, "EK", -77) + gNa * P(state.params, "ENa", 50)) / (gK + gNa);
    },
    plot: (s) => s.V,
    rows: (s) => [["V", s.V, "mV"]]
  });
}
function antennaArray(spec) {
  return shell(spec, {
    equation: "\u4E24\u5143\u9635\u56E0\u5B50 |AF| = |sin(N \u03C8/2) / sin(\u03C8/2)|\uFF0C\u03C8 = k d cos\u03B8 + \u03B2",
    authority: "Balanis, Antenna Theory, \u5747\u5300\u76F4\u7EBF\u9635",
    assumptions: "\u7B49\u5E45\u3001\u5747\u5300\u76F8\u4F4D\u5DEE",
    params: { N: 4, dlam: 0.5, theta: 60 },
    schema: {
      N: S("N", "dynamics", "\u2014", 2, 8),
      dlam: S("d/\u03BB", "dynamics", "\u2014", 0.1, 1),
      theta: S("\u03B8", "dynamics", "\xB0", 0, 180)
    },
    tick(state) {
      const N = Math.max(2, Math.round(P(state.params, "N", 4)));
      const psi = 2 * Math.PI * P(state.params, "dlam", 0.5) * Math.cos(P(state.params, "theta", 60) * Math.PI / 180);
      const s = Math.sin(psi / 2);
      state.AF = Math.abs(s) < 1e-6 ? N : Math.abs(Math.sin(N * psi / 2) / s);
    },
    plot: (s) => s.AF,
    rows: (s) => [["|AF|", s.AF, ""]]
  });
}
function greenhouse(spec) {
  return shell(spec, {
    equation: "\u5355\u5C42\u5927\u6C14\uFF1A\u03C3 T_s\u2074 = (S/4)(1\u2212A) / (1 \u2212 \u03B5/2)",
    authority: "Pierrehumbert, \u5355\u5C42\u7070\u4F53\u5927\u6C14\u80FD\u91CF\u5E73\u8861",
    assumptions: "\u5168\u7403\u96F6\u7EF4\u3001\u957F\u6CE2\u53D1\u5C04\u7387 \u03B5\uFF1B\u4E0D\u662F\u6C14\u5019\u6A21\u5F0F",
    fidelity: "principle",
    params: { S: 1361, A: 0.3, eps: 0.8 },
    schema: {
      A: S("A", "dynamics", "\u2014", 0, 0.8),
      eps: S("\u03B5", "dynamics", "\u2014", 0, 0.99)
    },
    tick(state) {
      const sigma = 5670374419e-17;
      const eps = Math.min(0.99, Math.max(0, P(state.params, "eps", 0.8)));
      const rhs = P(state.params, "S", 1361) / 4 * (1 - P(state.params, "A", 0.3)) / Math.max(0.05, 1 - eps / 2);
      state.T = (rhs / sigma) ** 0.25;
    },
    plot: (s) => s.T,
    rows: (s) => [["T_s", s.T, "K"]]
  });
}
function laserThreshold(spec) {
  return shell(spec, {
    equation: "\u9608\u503C\u589E\u76CA g_th = \u03B1 \u2212 (1/(2L)) ln(R1 R2)",
    authority: "Siegman, Lasers, \u9608\u503C\u589E\u76CA",
    assumptions: "\u7A33\u6001\u5F80\u8FD4\u3001\u5206\u5E03\u635F\u8017 \u03B1",
    fidelity: "principle",
    params: { alpha: 0.1, L: 0.3, R: 0.95 },
    schema: {
      alpha: S("\u03B1", "dynamics", "1/m", 0, 2),
      L: S("L", "dynamics", "m", 0.05, 1),
      R: S("R", "dynamics", "\u2014", 0.5, 0.999)
    },
    tick(state) {
      const R = Math.min(0.999, Math.max(0.01, P(state.params, "R", 0.95)));
      const L = Math.max(0.01, P(state.params, "L", 0.3));
      state.g = P(state.params, "alpha", 0.1) - 1 / (2 * L) * Math.log(R * R);
    },
    plot: (s) => s.g,
    rows: (s) => [["g_th", s.g, "1/m"]]
  });
}
function shg(spec) {
  return shell(spec, {
    equation: "\u5C0F\u4FE1\u53F7\u500D\u9891\uFF1AP_{2\u03C9} \u221D (d_eff P_\u03C9 L sinc(\u0394k L/2))\xB2 \u7684\u4F4E\u8F6C\u6362\u6781\u9650 \u221D d\xB2 L\xB2 P\xB2\uFF08\u0394k=0\uFF09",
    authority: "Boyd, Nonlinear Optics, \u5171\u7EBF\u500D\u9891\u4F4E\u8F6C\u6362",
    assumptions: "\u76F8\u4F4D\u5339\u914D\u3001\u4F4E\u8F6C\u6362\u3001\u4E0D\u6D89\u53CA\u5177\u4F53\u6676\u4F53\u751F\u957F",
    fidelity: "principle",
    params: { P: 1, L: 0.01, d: 1 },
    schema: {
      P: S("P_\u03C9", "dynamics", "\u2014", 0, 5),
      L: S("L", "dynamics", "m", 1e-3, 0.05)
    },
    tick(state) {
      state.P2 = (P(state.params, "d", 1) * P(state.params, "L", 0.01) * P(state.params, "P", 1)) ** 2;
    },
    plot: (s) => s.P2,
    rows: (s) => [["P_2\u03C9", s.P2, "arb"]]
  });
}
function bellCHSH(spec) {
  return shell(spec, {
    equation: "\u91CF\u5B50 CHSH \u6700\u5927 2\u221A2\uFF1B\u5C40\u57DF\u5B9E\u5728\u8BBA \u2264 2",
    authority: "Clauser et al., Phys. Rev. Lett. 23 (1969)\uFF1BAspect \u5B9E\u9A8C\u7EFC\u8FF0\u4E2D\u7684 CHSH",
    assumptions: "\u53EA\u7ED9\u51FA Tsirelson \u754C\u4E0E\u7ECF\u5178\u754C\uFF0C\u4E0D\u6A21\u62DF\u5B9E\u9A8C\u566A\u58F0\u534F\u8BAE",
    fidelity: "principle",
    params: { theta: 22.5 },
    schema: { theta: S("\u03B8", "dynamics", "\xB0", 0, 45) },
    tick(state) {
      state.S = 2 * Math.SQRT2 * Math.cos(0);
      state.Svis = 2 * Math.SQRT2 * Math.abs(Math.cos(2 * P(state.params, "theta", 22.5) * Math.PI / 180));
    },
    plot: (s) => s.Svis,
    rows: (s) => [["|S|", s.Svis, ""], ["Tsirelson", 2 * Math.SQRT2, ""]]
  });
}
function spinOrbit(spec) {
  return shell(spec, {
    equation: "j = l \xB1 1/2\uFF08\u5355\u7535\u5B50\uFF09",
    authority: "Bransden & Joachain, \u81EA\u65CB-\u8F68\u9053\u8026\u5408\u7684 j \u9009\u62E9",
    assumptions: "\u5355\u7535\u5B50\u89D2\u52A8\u91CF\u52A0\u6CD5\uFF0C\u4E0D\u662F\u80FD\u7EA7\u6570\u8BA1\u7B97",
    fidelity: "principle",
    params: { l: 1 },
    schema: { l: S("l", "dynamics", "\u2014", 0, 5) },
    tick(state) {
      const l = Math.max(0, Math.round(P(state.params, "l", 1)));
      state.jhi = l + 0.5;
      state.jlo = Math.abs(l - 0.5);
    },
    plot: (s) => s.jhi,
    rows: (s) => [["j+", s.jhi, ""], ["j\u2212", s.jlo, ""]]
  });
}
function pnBarrier(spec) {
  return shell(spec, {
    equation: "\u5185\u5EFA\u52BF V_bi = V_T ln(N_a N_d / n_i\xB2)",
    authority: "Sze, Semiconductor Devices, \u7A81\u53D8\u7ED3\u5185\u5EFA\u52BF",
    assumptions: "\u975E\u7B80\u5E76\u3001300 K\u3001V_T=0.026 V\u3001n_i=1e10 cm\u207B\xB3\uFF1B\u4E0D\u662F\u5DE5\u827A\u914D\u65B9",
    fidelity: "principle",
    params: { Na: 1e16, Nd: 1e16 },
    schema: {
      Na: S("N_a", "dynamics", "cm\u207B\xB3", 1e14, 1e18),
      Nd: S("N_d", "dynamics", "cm\u207B\xB3", 1e14, 1e18)
    },
    tick(state) {
      const ni = 1e10;
      const VT = 0.026;
      state.Vbi = VT * Math.log(P(state.params, "Na", 1e16) * P(state.params, "Nd", 1e16) / (ni * ni));
    },
    plot: (s) => s.Vbi,
    rows: (s) => [["V_bi", s.Vbi, "V"]]
  });
}
function viewFactor(spec) {
  return shell(spec, {
    equation: "\u540C\u5FC3\u7403\uFF1A\u5185\u5BF9\u5916 F_12=1\uFF0C\u5916\u5BF9\u5185 F_21=(r1/r2)\xB2\uFF08\u9ED8\u8BA4 r1=0.1 m, r2=0.2 m\uFF09",
    authority: "Incropera, Fundamentals of Heat and Mass Transfer, \u89C6\u89D2\u56E0\u5B50\u4E92\u6613",
    assumptions: "\u8868\u9762 1 \u5B8C\u5168\u88AB\u8868\u9762 2 \u5305\u56F4\uFF1B\u6F2B\u5C04\u8868\u9762",
    fidelity: "principle",
    params: { r1: 0.1, r2: 0.2 },
    schema: {
      r1: S("r\u2081", "dynamics", "m", 0.01, 1),
      r2: S("r\u2082", "dynamics", "m", 0.02, 2)
    },
    tick(state) {
      const r1 = P(state.params, "r1", 0.1);
      const r2 = Math.max(r1, P(state.params, "r2", 0.2));
      state.F = 1;
      state.F21 = (r1 / r2) ** 2;
    },
    plot: (s) => s.F21,
    rows: (s) => [["F_12", s.F, ""], ["F_21", s.F21, ""]]
  });
}
function poiseuille(spec) {
  return shell(spec, {
    equation: "Q = \u03C0 R\u2074 \u0394P / (8 \u03BC L)",
    authority: "White, Fluid Mechanics, Hagen\u2013Poiseuille",
    assumptions: "\u5706\u7BA1\u5C42\u6D41\u3001\u5145\u5206\u53D1\u5C55\u3001\u725B\u987F\u6D41\u4F53",
    params: { R: 5e-3, dP: 1e3, mu: 1e-3, L: 1 },
    schema: {
      R: S("R", "dynamics", "m", 1e-3, 0.02),
      dP: S("\u0394P", "dynamics", "Pa", 0, 1e4),
      L: S("L", "dynamics", "m", 0.1, 10)
    },
    tick(state) {
      const R = P(state.params, "R", 5e-3);
      state.Q = Math.PI * R ** 4 * P(state.params, "dP", 1e3) / (8 * Math.max(1e-6, P(state.params, "mu", 1e-3)) * Math.max(0.01, P(state.params, "L", 1)));
    },
    plot: (s) => s.Q,
    rows: (s) => [["Q", s.Q, "m\xB3/s"]]
  });
}
function blasius(spec) {
  return shell(spec, {
    equation: "\u5E73\u677F \u03B4/x \u2248 5 / \u221ARe_x",
    authority: "White, Fluid Mechanics, Blasius \u5C42\u6D41\u8FB9\u754C\u5C42\u539A\u5EA6",
    assumptions: "\u96F6\u538B\u529B\u68AF\u5EA6\u5E73\u677F\u3001\u5C42\u6D41",
    params: { Rex: 1e5 },
    schema: { Rex: S("Re_x", "dynamics", "\u2014", 1e3, 5e5) },
    tick(state) {
      state.dOverX = 5 / Math.sqrt(Math.max(1, P(state.params, "Rex", 1e5)));
    },
    plot: (s) => s.dOverX,
    rows: (s) => [["\u03B4/x", s.dOverX, ""]]
  });
}
function otto(spec) {
  return shell(spec, {
    equation: "\u03B7 = 1 \u2212 r^{1\u2212\u03B3}",
    authority: "\xC7engel & Boles, \u5965\u6258\u5FAA\u73AF\u51B7\u7A7A\u6C14\u6807\u51C6",
    assumptions: "\u51B7\u7A7A\u6C14\u6807\u51C6\u3001\u5B9A\u6BD4\u70ED",
    params: { r: 8, gamma: 1.4 },
    schema: {
      r: S("r", "dynamics", "\u2014", 2, 16),
      gamma: S("\u03B3", "dynamics", "\u2014", 1.2, 1.5)
    },
    tick(state) {
      const r = Math.max(1.1, P(state.params, "r", 8));
      const g = P(state.params, "gamma", 1.4);
      state.eta = 1 - r ** (1 - g);
    },
    plot: (s) => s.eta,
    rows: (s) => [["\u03B7", s.eta, ""]]
  });
}
function brayton(spec) {
  return shell(spec, {
    equation: "\u03B7 = 1 \u2212 r_p^{(1\u2212\u03B3)/\u03B3}",
    authority: "\xC7engel & Boles, \u5E03\u96F7\u987F\u5FAA\u73AF\u51B7\u7A7A\u6C14\u6807\u51C6",
    assumptions: "\u7406\u60F3\u5FAA\u73AF\u3001\u5B9A\u6BD4\u70ED",
    params: { rp: 8, gamma: 1.4 },
    schema: {
      rp: S("r_p", "dynamics", "\u2014", 2, 30),
      gamma: S("\u03B3", "dynamics", "\u2014", 1.2, 1.5)
    },
    tick(state) {
      const rp = Math.max(1.1, P(state.params, "rp", 8));
      const g = P(state.params, "gamma", 1.4);
      state.eta = 1 - rp ** ((1 - g) / g);
    },
    plot: (s) => s.eta,
    rows: (s) => [["\u03B7", s.eta, ""]]
  });
}
function pfr(spec) {
  return shell(spec, {
    equation: "\u4E00\u7EA7 PFR\uFF1AX = 1 \u2212 exp(\u2212k \u03C4)",
    authority: "Fogler, CRE, \u5E73\u63A8\u6D41\u4E00\u7EA7",
    assumptions: "\u7B49\u6E29\u3001\u6052\u5BB9",
    params: { k: 0.2, tau: 5 },
    schema: {
      k: S("k", "dynamics", "1/s", 0.01, 2),
      tau: S("\u03C4", "dynamics", "s", 0.1, 30)
    },
    tick(state) {
      state.X = 1 - Math.exp(-P(state.params, "k", 0.2) * P(state.params, "tau", 5));
    },
    plot: (s) => s.X,
    rows: (s) => [["X", s.X, ""]]
  });
}
function titration(spec) {
  return shell(spec, {
    equation: "\u5F3A\u9178\u5F3A\u78B1\u7B49\u5F53\u70B9\u524D pH = \u2212log10(c_a \u2212 c_b)\uFF08\u8FC7\u91CF\u9178\uFF0C\u6D53\u5EA6\u8FD1\u4F3C\uFF09",
    authority: "Harris, Quantitative Chemical Analysis, \u5F3A\u9178\u5F3A\u78B1\u6EF4\u5B9A",
    assumptions: "\u7B49\u4F53\u79EF\u8FD1\u4F3C\u524D\u7684\u8FC7\u91CF\u5F3A\u9178\uFF1B\u7B49\u5F53\u70B9\u9644\u8FD1\u9700\u6C34\u5E73\u8861\uFF0C\u6B64\u5904\u53EA\u7ED9\u7B49\u5F53\u70B9\u524D\u4E00\u652F",
    fidelity: "principle",
    params: { ca: 0.1, cb: 0.04 },
    schema: {
      ca: S("c_a", "dynamics", "M", 0.01, 0.2),
      cb: S("c_b", "dynamics", "M", 0, 0.2)
    },
    tick(state) {
      const left = P(state.params, "ca", 0.1) - P(state.params, "cb", 0.04);
      state.pH = left > 1e-8 ? -Math.log10(left) : 7;
    },
    plot: (s) => s.pH,
    rows: (s) => [["pH", s.pH, ""]]
  });
}
function seismicTravel(spec) {
  return shell(spec, {
    equation: "\u8D70\u65F6 t = x / v",
    authority: "Shearer, Introduction to Seismology, \u5747\u5300\u4ECB\u8D28\u8D70\u65F6",
    assumptions: "\u5E38\u901F\u5EA6",
    params: { x: 10, v: 5 },
    schema: {
      x: S("x", "dynamics", "km", 0, 100),
      v: S("v", "dynamics", "km/s", 0.5, 10)
    },
    tick(state) {
      state.t = P(state.params, "x", 10) / Math.max(0.1, P(state.params, "v", 5));
    },
    plot: (s) => s.t,
    rows: (s) => [["t", s.t, "s"]]
  });
}
function fourierSquare(spec) {
  return shell(spec, {
    equation: "\u65B9\u6CE2\uFF1Ab_n = 4/(n\u03C0)\uFF08n \u5947\uFF09",
    authority: "Tolstov, Fourier Series",
    assumptions: "\u5947\u6B21\u6B63\u5F26\u9879",
    params: { n: 1 },
    schema: { n: S("n", "dynamics", "\u2014", 1, 15) },
    tick(state) {
      const n = Math.max(1, Math.round(P(state.params, "n", 1)));
      state.b = n % 2 === 1 ? 4 / (n * Math.PI) : 0;
    },
    plot: (s) => s.b,
    rows: (s) => [["b_n", s.b, ""]]
  });
}
function mandelbrotEscape(spec) {
  return shell(spec, {
    equation: "z \u2190 z\xB2 + c\uFF0C\u9003\u9038\u534A\u5F84 2",
    authority: "Devaney, An Introduction to Chaotic Dynamical Systems\uFF1BMandelbrot \u96C6\u8FED\u4EE3",
    assumptions: "\u5355\u70B9\u8FED\u4EE3\u6B21\u6570\uFF0C\u4E0D\u662F\u6574\u5F20\u5206\u5F62\u56FE",
    params: { cr: -0.7, ci: 0.27 },
    schema: {
      cr: S("Re c", "dynamics", "\u2014", -2, 1),
      ci: S("Im c", "dynamics", "\u2014", -1.2, 1.2)
    },
    tick(state) {
      let zr = 0;
      let zi = 0;
      const cr = P(state.params, "cr", -0.7);
      const ci = P(state.params, "ci", 0.27);
      let n = 0;
      for (; n < 40; n += 1) {
        const zr2 = zr * zr - zi * zi + cr;
        const zi2 = 2 * zr * zi + ci;
        zr = zr2;
        zi = zi2;
        if (zr * zr + zi * zi > 4) break;
      }
      state.n = n;
    },
    plot: (s) => s.n,
    rows: (s) => [["iter", s.n, ""]]
  });
}
function rossler(spec) {
  return shell(spec, {
    equation: "x\u2032=\u2212y\u2212z, y\u2032=x+a y, z\u2032=b+z(x\u2212c)",
    authority: "R\xF6ssler, Phys. Lett. 57A (1976)",
    assumptions: "\u6807\u51C6\u6DF7\u6C8C\u53C2\u6570\u9644\u8FD1\u7684 ODE \u793A\u610F",
    fidelity: "principle",
    params: { a: 0.2, b: 0.2, c: 5.7 },
    schema: {
      a: S("a", "dynamics", "\u2014", 0.05, 0.4),
      b: S("b", "dynamics", "\u2014", 0.05, 0.4),
      c: S("c", "dynamics", "\u2014", 2, 10)
    },
    init(state) {
      state.x = 1;
      state.y = 0;
      state.z = 0;
    },
    tick(state, h) {
      if (h <= 0) return;
      const a = P(state.params, "a", 0.2);
      const b = P(state.params, "b", 0.2);
      const c = P(state.params, "c", 5.7);
      const n = 8;
      const dt = Math.min(0.02, h / n);
      const steps = Math.max(1, Math.round(h / dt));
      for (let i = 0; i < steps; i += 1) {
        const dx = -state.y - state.z;
        const dy = state.x + a * state.y;
        const dz = b + state.z * (state.x - c);
        state.x += dx * dt;
        state.y += dy * dt;
        state.z += dz * dt;
      }
    },
    plot: (s) => s.x,
    rows: (s) => [["x", s.x, ""], ["y", s.y, ""], ["z", s.z, ""]]
  });
}
function neutronDiffusion(spec) {
  return shell(spec, {
    equation: "\u4E00\u7EF4\u5E73\u677F\u57FA\u6A21 \u03C6=\u03C6\u2080 cos(\u03C0 x / a)\uFF0C\u4E34\u754C\u6761\u4EF6 B\xB2=\u03C0\xB2/a\xB2=(\u03BD\u03A3_f\u2212\u03A3_a)/D",
    authority: "Lamarsh, Introduction to Nuclear Engineering, \u4E00\u7FA4\u6269\u6563",
    assumptions: "\u4E00\u7FA4\u3001\u5747\u5300\u5E73\u677F\u3001\u5916\u63A8\u8FB9\u754C\u7565\u53BB\uFF1B\u516C\u5F00\u6559\u79D1\u4E66\u4E34\u754C\u6761\u4EF6\uFF0C\u975E\u8BBE\u8BA1\u3002Keep fidelity=principle until: (1) multi-group or explicit D,\u03A3a,\u03BD\u03A3f knobs matching Lamarsh \xA75\u20136, (2) extrapolated boundary / buckling vs geometry validated against a textbook numerical example, (3) no design / criticality-safety claims in description.",
    fidelity: "principle",
    params: { a: 1 },
    schema: { a: S("\u534A\u5BBD a", "dynamics", "m", 0.2, 3) },
    tick(state) {
      const a = Math.max(0.05, P(state.params, "a", 1));
      state.B2 = (Math.PI / a) ** 2;
    },
    plot: (s) => s.B2,
    rows: (s) => [["B\xB2", s.B2, "1/m\xB2"]]
  });
}
var PREFIX = {
  // Course-style subject routing removed; keep only aliases still referenced
  // by keywordModel / familyFallback.
  \u5206\u5E03\u5F0F\u4E0E\u5B89\u5168: (s) => shell(s, {
    equation: "\u591A\u6570\u6D3E\u6CD5\u5B9A\u4EBA\u6570 q = \u230An/2\u230B+1",
    authority: "Tanenbaum, Distributed Systems, \u591A\u6570\u6D3E",
    assumptions: "\u5947\u6570\u6216\u4E00\u822C n \u7684\u591A\u6570\u5B9A\u4E49",
    params: { n: 5 },
    schema: { n: S("n", "dynamics", "\u2014", 1, 21) },
    tick(st) {
      st.q = Math.floor(P(st.params, "n", 5) / 2) + 1;
    },
    plot: (st) => st.q,
    rows: (st) => [["q", st.q, ""]]
  }),
  \u8C03\u5236: (s) => shell(s, {
    equation: "AM\uFF1As(t)=(A+m cos \u03C9_m t) cos \u03C9_c t \u7684\u8C03\u5236\u5EA6 \u03BC",
    authority: "Proakis, Communication Systems, AM",
    assumptions: "\u5E38\u89C4\u8C03\u5E45\u3001\u03BC\u22641",
    params: { A: 1, m: 0.5 },
    schema: { A: S("A", "dynamics", "\u2014", 0.1, 5), m: S("m", "dynamics", "\u2014", 0, 2) },
    tick(st) {
      st.mu = P(st.params, "m", 0.5) / Math.max(1e-3, P(st.params, "A", 1));
    },
    plot: (st) => st.mu,
    rows: (st) => [["\u03BC", st.mu, ""]]
  })
};
function singleSlitModel(spec) {
  return shell(spec, {
    equation: "\u5355\u7F1D\u7B2C\u4E00\u6781\u5C0F\uFF1Aa sin\u03B8 = \u03BB",
    authority: "Hecht, Optics, \u5355\u7F1D\u884D\u5C04\u6781\u5C0F",
    assumptions: "\u592B\u7405\u79BE\u8D39\u8FDC\u573A\u3001\u5355\u8272",
    params: { a: 1e-4, lambda: 55e-8 },
    schema: {
      a: S("a", "dynamics", "m", 2e-5, 5e-4),
      lambda: S("\u03BB", "dynamics", "m", 4e-7, 7e-7)
    },
    tick(state) {
      const a = Math.max(1e-6, P(state.params, "a", 1e-4));
      const lambda = P(state.params, "lambda", 55e-8);
      state.th = Math.asin(Math.min(1, lambda / a));
    },
    plot: (s) => s.th * 180 / Math.PI,
    rows: (s) => [["\u03B8", s.th * 180 / Math.PI, "\xB0"]]
  });
}
function boltzmannFactor(spec) {
  return shell(spec, {
    equation: "n\u2082/n\u2081 = exp(\u2212\u0394E / kT)",
    authority: "Schroeder, An Introduction to Thermal Physics, Boltzmann factor",
    assumptions: "thermal equilibrium, non-degenerate levels; \u0394E and kT in joules",
    params: { dE: 16e-21, T: 300 },
    schema: {
      dE: S("\u0394E", "dynamics", "J", 1e-22, 1e-18),
      T: S("T", "dynamics", "K", 50, 2e3)
    },
    tick(state) {
      const kB = 1380649e-29;
      const T = Math.max(1, P(state.params, "T", 300));
      state.ratio = Math.exp(-P(state.params, "dE", 16e-21) / (kB * T));
    },
    plot: (s) => s.ratio,
    rows: (s) => [["n2/n1", s.ratio, ""]]
  });
}
function keywordModel(spec) {
  const blob = `${spec.id} ${spec.name} ${spec.formula || ""}`;
  if (/玻尔兹曼/.test(blob) && !/格子|斯特藩/.test(blob)) return boltzmannFactor(spec);
  const rules = [
    [/洛伦兹|lorenz/i, () => lorenzSys(spec)],
    [/rossler|若斯勒/i, () => rossler(spec)],
    [/mandelbrot|julia/i, () => mandelbrotEscape(spec)],
    [/logistic-growth|逻辑斯蒂增长|Ṅ/i, () => logistic(spec)],
    [/lotka/i, () => lotka(spec)],
    [/sir-epidemic|SIR/i, () => sir(spec, spec.formula || "")],
    [/V=IR|欧姆/, () => ohm(spec)],
    [/Malus|偏振/, () => malus(spec)],
    [/光电|hf-W|hf − W/, () => photo(spec)],
    [/时间膨胀|长度收缩|质能|洛伦兹因子|双生子/, () => gamma(spec, blob)],
    [/1\/f=1\/u|透镜/, () => lens(spec)],
    [/single-slit|单缝/, () => singleSlitModel(spec)],
    [/double-slit|双缝|Δ=d sin|Δ=d/, () => doubleSlit(spec)],
    [/斯涅尔|折射定律/, () => snell(spec)],
    [/E_n=-13\.6|玻尔模型|玻尔能级/, () => bohr(spec)],
    [/N=N₀|衰变/, () => decay(spec)],
    [/PV=nRT|理想气体/, () => gasLaw(spec)],
    [/卡诺|Tc\/Th/, () => carnot(spec, blob)],
    [/奥托|otto/i, () => otto(spec)],
    [/布雷顿|brayton/i, () => brayton(spec)],
    [/Darcy|ΔP=f|管损/, () => darcy(spec)],
    [/曼宁/, () => manning(spec)],
    [/伯努利/, () => bernoulli(spec)],
    [/雷诺|Re=/, () => reynolds(spec)],
    [/Poiseuille|泊肃叶/, () => poiseuille(spec)],
    [/Blasius|边界层/, () => blasius(spec)],
    [/库仑|kq\/r/, () => coulomb(spec)],
    [/电容|C=ε/, () => capacitor(spec)],
    [/法拉第|dΦ/, () => faraday(spec)],
    [/量子霍尔/, () => quantumHall(spec)],
    [/霍尔/, () => hall(spec)],
    [/洛伦兹力|v×B/, () => lorentzRadius(spec)],
    [/康普顿/, () => compton(spec)],
    [/德布罗意/, () => debroglie(spec)],
    [/不确定/, () => uncertainty(spec)],
    [/势阱|薛定谔/, () => well(spec)],
    [/隧穿|透射/, () => tunnel(spec)],
    [/量子谐振子/, () => qho(spec)],
    [/多普勒/, () => doppler(spec)],
    [/声压/, () => spl(spec)],
    [/视角因子/, () => viewFactor(spec)],
    [/σT|斯特藩|辐射/, () => stefan(spec)],
    [/麦克斯韦/, () => maxwell(spec)],
    [/Ising|伊辛/, () => isingEnergy(spec)],
    [/渗流/, () => percolation(spec)],
    [/中子扩散|Σa φ|neutron-diffusion/, () => neutronDiffusion(spec)],
    [/∂T\/∂t|热扩散|热传导/, () => heatMode(spec)],
    [/布朗|⟨x²⟩|菲克/, () => brownian(spec)],
    [/混合熵|ln Ω/, () => entropyMix(spec)],
    [/浮力|ρ_f/, () => buoyancy(spec)],
    [/火箭|变质量/, () => rocket(spec)],
    [/开普勒|霍曼/, () => /霍曼/.test(blob) ? hohmann(spec) : kepler(spec)],
    [/科里奥利/, () => coriolis(spec)],
    [/斜面|μcos/, () => newton(spec, "\u659C\u9762")],
    [/Atwood|滑轮/, () => atwood(spec)],
    [/简谐|x''=-/, () => shmFamily(spec, "\u7B80\u8C10")],
    [/阻尼/, () => shmFamily(spec, "\u963B\u5C3C")],
    [/受迫|扫频|共振曲线/, () => shmFamily(spec, "\u53D7\u8FEB")],
    [/简正|耦合振子/, () => coupledModes(spec)],
    [/Duffing/, () => duffing(spec)],
    [/CSTR|dc\/dt/, () => cstr(spec)],
    [/PFR|dc\/dz/, () => pfr(spec)],
    [/McCabe|操作线/, () => mccabe(spec)],
    [/M\/M|排队/, () => mm1(spec)],
    [/EOQ/, () => eoq(spec)],
    [/Black|期权/, () => blackScholes(spec)],
    [/供需|均衡价格/, () => supplyDemand(spec)],
    [/复利|\(1\+r\)/, () => compound(spec)],
    [/pH|滴定/, () => titration(spec)],
    [/矩阵|x'=Ax/, () => matrix2(spec, "\u77E9\u9635")],
    [/二分|binary-search/, () => binarySearchSteps(spec)],
    [/Dijkstra|最短/, () => dijkstraBound(spec)],
    [/K-means|kmeans/, () => kmeans1d(spec)],
    [/梯度|linreg/, () => gdQuadratic(spec)],
    [/RSA|mod n/, () => rsaMod(spec)],
    [/熵/, () => binaryEntropy(spec)],
    [/阶跃|G\(s\)/, () => secondOrderStep(spec)],
    [/直流电机|电枢/, () => dcMotor(spec)],
    [/欧拉屈曲|P_cr/, () => stress(spec, "\u5C48\u66F2")],
    [/σ=F\/A|轴向/, () => stress(spec, "\u8F74\u5411")],
    [/扭转|τ=T/, () => stress(spec, "\u626D\u8F6C")],
    [/弯曲|My\/I|挠度/, () => stress(spec, "\u5F2F\u66F2")],
    [/水跃|共轭/, () => hydraulicJump(spec)],
    [/NaSch|交通/, () => naschFlow(spec)],
    [/反射系数|Γ=/, () => reflectionCoeff(spec)],
    [/PWM|占空/, () => pwm(spec)],
    [/Nyquist|采样/, () => nyquist(spec)],
    [/傅里叶/, () => fourierSquare(spec)],
    [/走时|地震波/, () => seismicTravel(spec)],
    [/药代|compartment/, () => pkOneCompartment(spec)],
    [/Hodgkin|动作电位/, () => membraneHHNote(spec)],
    [/阵列因子|天线/, () => antennaArray(spec)],
    [/温室/, () => greenhouse(spec)],
    [/PN|半导体/, () => pnBarrier(spec)],
    [/贝尔/, () => bellCHSH(spec)],
    [/自旋/, () => spinOrbit(spec)],
    [/谐振腔|激光|g_th/, () => laserThreshold(spec)],
    [/倍频|OPA/, () => shg(spec)],
    [/压缩态|Wigner/, () => shell(spec, {
      equation: "\u771F\u7A7A\u538B\u7F29\uFF1A\u0394X \u0394P = 1/4\uFF08\u210F=1\uFF09\uFF0C\u5355\u6B63\u4EA4\u53EF\u4F4E\u4E8E 1/2",
      authority: "Scully & Zubairy, Quantum Optics, \u538B\u7F29\u771F\u7A7A\u7684\u4E0D\u786E\u5B9A\u5EA6\u5206\u914D",
      assumptions: "\u210F=1 \u7684\u5B9A\u4E49\u5F0F\uFF0C\u4E0D\u662F\u5B9E\u9A8C\u88C5\u7F6E",
      fidelity: "principle",
      params: { dX: 0.3 },
      schema: { dX: S("\u0394X", "dynamics", "\u2014", 0.05, 1) },
      tick(st) {
        st.dP = 0.25 / Math.max(0.05, P(st.params, "dX", 0.3));
      },
      plot: (st) => st.dP,
      rows: (st) => [["\u0394P", st.dP, ""]]
    })],
    [/全加器|进位/, () => boolGate(spec, "\u5F02\u6216")],
    [/哈希/, () => hashLoad(spec)],
    [/页表|TLB|虚拟/, () => pageReplace(spec)],
    [/银行家/, () => bankerNeed(spec)],
    [/Raft|选举/, () => shell(spec, {
      equation: "\u4EFB\u671F\u6295\u7968\uFF1A\u8FC7\u534A\u5373\u5F53\u9009",
      authority: "Ongaro & Ousterhout, Raft \u8BBA\u6587\u4E2D\u7684\u591A\u6570\u6D3E",
      assumptions: "\u6295\u7968\u8BA1\u6570",
      params: { votes: 3, n: 5 },
      schema: { votes: S("votes", "dynamics", "\u2014", 0, 9), n: S("n", "dynamics", "\u2014", 1, 9) },
      tick(st) {
        const n = Math.max(1, Math.round(P(st.params, "n", 5)));
        st.won = P(st.params, "votes", 3) >= Math.floor(n / 2) + 1 ? 1 : 0;
      },
      plot: (st) => st.won,
      rows: (st) => [["elected", st.won, ""]]
    })],
    [/反应级数|e\^\{-kt\}|reaction-order/, () => firstOrderReaction(spec, "\u4E00\u7EA7")],
    [/浮沉|phugoid/i, () => phugoid(spec)],
    [/升力|Cl/, () => clift(spec)],
    [/Q=Cd|闸/, () => sluice(spec)],
    [/Vavg=D|占空/, () => pwm(spec)],
    [/s\(t\)=\[1\+m|调幅/, () => PREFIX["\u8C03\u5236"](spec, "AM")],
    [/∮E|高斯/, () => gaussPoint(spec)]
  ];
  for (const [re, fn] of rules) {
    if (re.test(blob)) return fn();
  }
  return null;
}
function familyFallback(spec) {
  const fam = spec.family || "";
  const map = {
    ode1d: () => newton(spec, spec.name || ""),
    ode2d: () => projectile(spec, 40),
    circular: () => newton(spec, "\u5411\u5FC3"),
    particles: () => coulomb(spec),
    nbody: () => kepler(spec),
    euler: () => rigidEuler(spec),
    buoyancy: () => buoyancy(spec),
    flow: () => bernoulli(spec),
    wave1d: () => waveTravel(spec),
    doppler: () => doppler(spec),
    interference: () => doubleSlit(spec),
    field2d: () => heatMode(spec),
    piston: () => gasLaw(spec),
    cycle: () => carnot(spec, ""),
    fieldlines: () => coulomb(spec),
    circuit: () => rcCircuit(spec),
    induction: () => faraday(spec),
    rays: () => snell(spec),
    // gauge remounted off catalog; keep a neutral fallback if a stale family slips through
    gauge: () => kin(spec, spec.name || ""),
    bohr: () => bohr(spec),
    decay: () => decay(spec),
    discrete: () => binarySearchSteps(spec),
    graph: () => dijkstraBound(spec),
    tree: () => binarySearchSteps(spec),
    fsm: () => tcpStates(spec),
    turing: () => binarySearchSteps(spec),
    crypto: () => caesar(spec),
    ml: () => gdQuadratic(spec),
    opt: () => gdQuadratic(spec),
    logic: () => boolGate(spec, "\u4E0E"),
    arch: () => amdahl(spec),
    embed: () => pwm(spec),
    comm: () => nyquist(spec),
    net: () => tcpStates(spec),
    os: () => rrWait(spec),
    compile: () => binarySearchSteps(spec),
    dist: () => PREFIX["\u5206\u5E03\u5F0F\u4E0E\u5B89\u5168"](spec, ""),
    struct: () => stress(spec, spec.formula || ""),
    control: () => secondOrderStep(spec),
    chaos: () => lorenzSys(spec),
    traffic: () => naschFlow(spec),
    reactor: () => cstr(spec),
    aero: () => clift(spec)
  };
  const fn = map[fam];
  return fn ? fn() : kin(spec, spec.name || "");
}
function buildTopicModel(spec) {
  if (!spec) return null;
  const over = overrideOptions(spec);
  if (over) return shell(spec, over);
  return keywordModel(spec) || familyFallback(spec);
}

// js/models/fam/common.js
var G = 9.81;
var EPS0 = 8854187817e-21;
var KE = 1 / (4 * Math.PI * EPS0);
var MU0 = Math.PI * 4e-7;
var SIGMA = 5670374419e-17;
var R_GAS = 8.314462618;
var C_LIGHT = 299792458;
var LAMBDA_C_PM = 2.42631023867;
var HC_KEV_PM = 1239.84193;
var QE = 1602176634e-28;
var ME = 91093837e-38;
function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
function pos(x, floor = 1e-9) {
  const v = Number(x);
  if (!Number.isFinite(v) || v < floor) return floor;
  return v;
}
function finiteOr(v, fallback = 0) {
  return Number.isFinite(v) ? v : fallback;
}
function schemaNum(label, group, unit, min, max) {
  return { label, group, unit, min, max };
}
function knobs(spec, initialKeys) {
  const dimList = Array.isArray(spec.dims) ? spec.dims : [];
  const defaults = spec.defaults && typeof spec.defaults === "object" ? spec.defaults : {};
  const params = { ...defaults };
  const paramSchema = {};
  for (const d of dimList) {
    if (!d?.key) continue;
    if (params[d.key] === void 0) params[d.key] = d.value ?? d.min ?? 1;
    paramSchema[d.key] = schemaNum(
      d.label || d.key,
      "dynamics",
      d.unit || "\u2014",
      Number.isFinite(d.min) ? d.min : 0,
      Number.isFinite(d.max) ? d.max : 100
    );
  }
  const initSet = new Set(initialKeys || []);
  for (const k of initSet) {
    if (paramSchema[k]) paramSchema[k] = { ...paramSchema[k], group: "initial" };
  }
  return { params, paramSchema };
}
function baseMeta(spec) {
  return {
    id: spec.id,
    name: spec.name,
    tags: [spec.domain, spec.sub].filter(Boolean),
    formula: spec.formula || "",
    description: spec.description || "",
    sub: spec.sub || "",
    perfClass: perfClassFor(spec.id),
    governing: true
  };
}
function paintFrame(ctx, view) {
  const W = view?.width || 320;
  const H = view?.height || 200;
  const m = 36;
  const top = 46;
  return {
    W,
    H,
    l: m,
    r: W - m,
    t: top,
    b: H - m,
    w: Math.max(1, W - 2 * m),
    h: Math.max(1, H - m - top)
  };
}
function paintTitle(ctx, name) {
  ctx.fillStyle = C.muted || "#666";
  ctx.font = "600 13px IBM Plex Mono, monospace";
  ctx.fillText(String(name || ""), 14, 26);
}
function paintXy(ctx, state, view, name) {
  const box = paintFrame(ctx, view);
  paintTitle(ctx, name);
  ctx.strokeStyle = C.axis || "#888";
  ctx.strokeRect(box.l, box.t, box.w, box.h);
  const pts = Array.isArray(state.xy) ? state.xy : [];
  if (pts.length < 2) {
    ctx.fillStyle = C.accent || "#c45";
    ctx.font = "13px IBM Plex Mono, monospace";
    ctx.fillText(formatNum(state.val, 3), box.l + 8, box.t + 18);
    return;
  }
  let xLo = Infinity;
  let xHi = -Infinity;
  let yLo = Infinity;
  let yHi = -Infinity;
  for (const p of pts) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (p.x < xLo) xLo = p.x;
    if (p.x > xHi) xHi = p.x;
    if (p.y < yLo) yLo = p.y;
    if (p.y > yHi) yHi = p.y;
  }
  if (!Number.isFinite(xLo) || !Number.isFinite(yLo)) return;
  if (yLo > 0) yLo = 0;
  if (xLo > 0) xLo = 0;
  const xSpan = Math.max(1e-9, xHi - xLo);
  const ySpan = Math.max(1e-9, yHi - yLo);
  const sx = (x) => box.l + (x - xLo) / xSpan * box.w;
  const sy = (y) => box.t + (1 - (y - yLo) / ySpan) * box.h;
  ctx.strokeStyle = C.muted || "#aaa";
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(box.l, sy(0));
  ctx.lineTo(box.r, sy(0));
  ctx.moveTo(sx(0), box.t);
  ctx.lineTo(sx(0), box.b);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.strokeStyle = C.body || "#222";
  ctx.lineWidth = 1.6;
  let started = false;
  for (const p of pts) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const X = sx(p.x);
    const Y = sy(p.y);
    if (!started) {
      ctx.moveTo(X, Y);
      started = true;
    } else ctx.lineTo(X, Y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  const last = pts[pts.length - 1];
  if (last && Number.isFinite(last.x) && Number.isFinite(last.y)) {
    ctx.fillStyle = C.accent || "#c45";
    ctx.beginPath();
    ctx.arc(sx(last.x), sy(last.y), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = C.accent || "#c45";
  ctx.font = "13px IBM Plex Mono, monospace";
  ctx.fillText(formatNum(state.val, 3), box.l + 8, box.t + 18);
}
function paintLens(ctx, state, view, name) {
  const box = paintFrame(ctx, view);
  paintTitle(ctx, name);
  ctx.strokeStyle = C.axis || "#888";
  ctx.strokeRect(box.l, box.t, box.w, box.h);
  const u = Number(state.u);
  const v = Number(state.v);
  const f = Number(state.f);
  const h = Number(state.h) || 1;
  const hi = Number(state.hi);
  const absU = Math.abs(u) || 1;
  const absV = Math.abs(v) || absU;
  const span = Math.max(absU, absV, Math.abs(f) || 0) * 1.25;
  const ox = box.l + box.w * 0.45;
  const oy = box.t + box.h * 0.5;
  const sx = (x) => ox + x / span * (box.w * 0.42);
  const sy = (y) => oy - y / span * (box.h * 0.38);
  ctx.strokeStyle = C.muted || "#aaa";
  ctx.beginPath();
  ctx.moveTo(box.l + 8, oy);
  ctx.lineTo(box.r - 8, oy);
  ctx.stroke();
  ctx.strokeStyle = C.body || "#222";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ox, box.t + 10);
  ctx.lineTo(ox, box.b - 10);
  ctx.stroke();
  ctx.lineWidth = 1;
  const ou = -Math.abs(u);
  const iv = Number.isFinite(v) ? v : 0;
  ctx.strokeStyle = C.accent || "#c45";
  ctx.beginPath();
  ctx.moveTo(sx(ou), oy);
  ctx.lineTo(sx(ou), sy(h));
  ctx.stroke();
  if (Number.isFinite(hi)) {
    ctx.strokeStyle = C.theory || "#2a6";
    ctx.beginPath();
    ctx.moveTo(sx(iv), oy);
    ctx.lineTo(sx(iv), sy(hi));
    ctx.stroke();
  }
  ctx.strokeStyle = C.body || "#222";
  ctx.beginPath();
  ctx.moveTo(sx(ou), sy(h));
  ctx.lineTo(sx(iv), sy(hi));
  ctx.moveTo(sx(ou), sy(h));
  ctx.lineTo(ox, sy(h));
  if (Number.isFinite(f) && Math.abs(f) > 1e-9) {
    ctx.lineTo(sx(iv), sy(hi));
  }
  ctx.stroke();
  ctx.fillStyle = C.accent || "#c45";
  ctx.font = "13px IBM Plex Mono, monospace";
  ctx.fillText(`v=${formatNum(v, 3)}`, box.l + 8, box.t + 18);
}
function paint(ctx, state, view, name) {
  if (state.drawKind === "xy") {
    paintXy(ctx, state, view, name);
    return;
  }
  if (state.drawKind === "lens") {
    paintLens(ctx, state, view, name);
    return;
  }
  const box = paintFrame(ctx, view);
  paintTitle(ctx, name);
  ctx.strokeStyle = C.axis || "#888";
  ctx.strokeRect(box.l, box.t, box.w, box.h);
  const series = Array.isArray(state.curve) && state.curve.length > 1 ? state.curve : state.hist;
  if (!Array.isArray(series) || series.length < 2) {
    ctx.fillStyle = C.accent || "#c45";
    ctx.font = "13px IBM Plex Mono, monospace";
    ctx.fillText(formatNum(state.val, 3), box.l + 8, box.t + 18);
    return;
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of series) {
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return;
  const span = Math.max(1e-9, hi - lo);
  ctx.beginPath();
  ctx.strokeStyle = C.body || "#222";
  ctx.lineWidth = 1.5;
  let started = false;
  for (let i = 0; i < series.length; i += 1) {
    const v = series[i];
    if (!Number.isFinite(v)) continue;
    const x = box.l + i / Math.max(1, series.length - 1) * box.w;
    const y = box.t + (1 - (v - lo) / span) * box.h;
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = C.accent || "#c45";
  ctx.font = "13px IBM Plex Mono, monospace";
  ctx.fillText(formatNum(state.val, 3), box.l + 8, box.t + 18);
}
function algebraic(spec, def) {
  const { params, paramSchema } = knobs(spec, def.initial);
  const readRows = def.rows || [["val", "val"]];
  return {
    ...baseMeta(spec),
    equation: def.equation,
    authority: def.authority || "",
    assumptions: def.assumptions || "",
    params,
    paramSchema,
    init(state) {
      state.t = 0;
      state.hist = [];
      state.curve = null;
      state.xy = null;
      state.drawKind = def.drawKind || null;
      if (def.reset) def.reset(state);
      this.step(state, 0);
    },
    /** Live dynamics knobs must recompute closed forms (main skips step unless refresh exists). */
    refresh(state) {
      this.step(state, 0);
    },
    step(state, dt) {
      const frame = Number(dt);
      const advance = Number.isFinite(frame) && frame > 0 ? frame : 0;
      const p = state.params || {};
      let out;
      if (def.integrate) {
        out = def.eval(p, state.t || 0, state, advance) || {};
        if (advance > 0) state.t = (state.t || 0) + advance;
      } else {
        if (advance > 0) state.t = (state.t || 0) + advance;
        out = def.eval(p, state.t || 0, state, 0) || {};
      }
      for (const [k, v] of Object.entries(out)) {
        if (k === "params" || k === "hist" || k === "t") continue;
        if (typeof v === "number" && Number.isNaN(v)) state[k] = 0;
        else state[k] = v;
      }
      state.val = finiteOr(out.val, 0);
      if (out.drawKind) state.drawKind = out.drawKind;
      else if (def.drawKind) state.drawKind = def.drawKind;
      if (advance > 0) {
        if (!state.hist) state.hist = [];
        state.hist.push(state.val);
        if (state.hist.length > 160) state.hist.shift();
        if (state.drawKind === "xy" && Number.isFinite(state.x) && Number.isFinite(state.y)) {
          if (!Array.isArray(state.trail)) state.trail = [];
          state.trail.push({ x: state.x, y: state.y });
          if (state.trail.length > 240) state.trail.shift();
        }
      }
      if (state.drawKind === "xy") {
        if (Array.isArray(out.xy) && out.xy.length > 1) state.xy = out.xy;
        else if (Array.isArray(state.trail) && state.trail.length > 1) state.xy = state.trail;
      }
    },
    draw(ctx, state, view) {
      paint(ctx, state, view, spec.name);
    },
    getTrajectory(state) {
      if (Array.isArray(state?.xy) && state.xy.length) return state.xy;
      return state?.trail || [];
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return readRows.map(([label, key, unit]) => ({
        label,
        value: unit ? `${formatNum(state[key], d)} ${unit}` : formatNum(state[key], d)
      }));
    }
  };
}
function linspace(n, fn) {
  const out = new Array(n);
  for (let i = 0; i < n; i += 1) out[i] = fn(i / Math.max(1, n - 1));
  return out;
}
var PRIMES = (() => {
  const n = 65536;
  const c = new Uint8Array(n + 1);
  const p = [];
  for (let i = 2; i <= n; i += 1) {
    if (c[i]) continue;
    p.push(i);
    if (i <= 256) {
      for (let j = i * i; j <= n; j += i) c[j] = 1;
    } else {
      for (let j = i * i; j <= n; j += i) c[j] = 1;
    }
  }
  return p;
})();
function primeAtMost(x) {
  let lo = 0;
  let hi = PRIMES.length - 1;
  let ans = 2;
  while (lo <= hi) {
    const mid = lo + hi >> 1;
    if (PRIMES[mid] <= x) {
      ans = PRIMES[mid];
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}
function modPow(base, exp, mod) {
  let b = BigInt(base) % BigInt(mod);
  let e = BigInt(exp);
  const m = BigInt(mod);
  let r = 1n;
  while (e > 0n) {
    if (e & 1n) r = r * b % m;
    b = b * b % m;
    e >>= 1n;
  }
  return Number(r);
}
function fnv1a(len, byte) {
  let h = 2166136261;
  const n = Math.max(0, Math.min(1e4, Math.round(len)));
  const b = byte & 255;
  for (let i = 0; i < n; i += 1) {
    h ^= b;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// js/models/fam/evals-mechanics.js
var evals_mechanics_exports = {};
__export(evals_mechanics_exports, {
  atwoodEval: () => atwoodEval,
  circularEval: () => circularEval,
  collisionEval: () => collisionEval,
  coupledEval: () => coupledEval,
  dampedEval: () => dampedEval,
  duffingEval: () => duffingEval,
  duffingReset: () => duffingReset,
  forcedEval: () => forcedEval,
  inclinedEval: () => inclinedEval,
  noninertialEval: () => noninertialEval,
  orbitEval: () => orbitEval,
  pendulumEval: () => pendulumEval,
  pendulumReset: () => pendulumReset,
  projectileEval: () => projectileEval,
  rocketEval: () => rocketEval,
  shoEval: () => shoEval
});
function projectileEval(p, t) {
  const g = pos(P(p, "g", G), 1e-6);
  const v0 = P(p, "v0", 0);
  const th = P(p, "theta", 0) * Math.PI / 180;
  const k = Math.max(0, P(p, "k", 0));
  const c = Math.cos(th);
  const s = Math.sin(th);
  const vx0 = v0 * c;
  const vy0 = v0 * s;
  let x;
  let y;
  let vx;
  let vy;
  if (k < 1e-10) {
    vx = vx0;
    vy = vy0 - g * t;
    x = vx0 * t;
    y = vy0 * t - 0.5 * g * t * t;
  } else {
    const e = Math.exp(-k * t);
    vx = vx0 * e;
    vy = (vy0 + g / k) * e - g / k;
    x = vx0 / k * (1 - e);
    y = (vy0 + g / k) / k * (1 - e) - g / k * t;
  }
  const tEnd = Math.max(t, 1.2);
  const xy = linspace(64, (u) => {
    const tt = u * tEnd;
    if (k < 1e-10) {
      return { x: vx0 * tt, y: vy0 * tt - 0.5 * g * tt * tt };
    }
    const e = Math.exp(-k * tt);
    return {
      x: vx0 / k * (1 - e),
      y: (vy0 + g / k) / k * (1 - e) - g / k * tt
    };
  });
  const curve = xy.map((p2) => p2.y);
  return { val: y, x, y, vx, vy, curve, xy, drawKind: "xy" };
}
function inclinedEval(p, t) {
  const th = P(p, "theta", 15) * Math.PI / 180;
  const mu = Math.max(0, P(p, "mu", 0));
  const m = pos(P(p, "m", 1), 1e-9);
  const a = G * (Math.sin(th) - mu * Math.cos(th));
  const v0 = P(p, "v0", 0);
  const v = v0 + a * t;
  const s = v0 * t + 0.5 * a * t * t;
  const N = m * G * Math.cos(th);
  return { val: a, a, v, s, N };
}
function atwoodEval(p) {
  const m1 = pos(P(p, "mRatio", 0.5), 1e-9);
  const m2 = 1;
  const a = (m1 - m2) / (m1 + m2) * G;
  return { val: a, a, m1, m2 };
}
function circularEval(p, t) {
  const r = pos(P(p, "r", 1), 1e-9);
  const w = P(p, "omega", 1);
  const ac = w * w * r;
  const x = r * Math.cos(w * t);
  const y = r * Math.sin(w * t);
  const xy = linspace(96, (u) => {
    const th = u * 2 * Math.PI;
    return { x: r * Math.cos(th), y: r * Math.sin(th) };
  });
  return {
    val: ac,
    ac,
    x,
    y,
    curve: linspace(64, (u) => r * Math.sin(2 * Math.PI * u)),
    xy,
    drawKind: "xy"
  };
}
function collisionEval(p) {
  const e = clamp(P(p, "e", 0), 0, 1);
  const m1 = pos(P(p, "mRatio", 0.5), 1e-9);
  const m2 = 1;
  const ang = P(p, "angle", 0) * Math.PI / 180;
  const u1n = Math.cos(ang);
  const u1t = Math.sin(ang);
  const v1n = (m1 - e * m2) / (m1 + m2) * u1n;
  const v2n = m1 * (1 + e) / (m1 + m2) * u1n;
  const v1 = Math.hypot(v1n, u1t);
  const v2 = Math.abs(v2n);
  const n = { x: Math.cos(ang), y: Math.sin(ang) };
  const xy = [
    { x: -1.2 * n.x, y: -1.2 * n.y },
    { x: -0.15 * n.x, y: -0.15 * n.y },
    { x: 0, y: 0 },
    { x: 0.15 * n.x * Math.sign(v2n || 1), y: 0.15 * n.y * Math.sign(v2n || 1) },
    { x: v2n * n.x, y: v2n * n.y },
    { x: v1n * n.x - u1t * n.y, y: v1n * n.y + u1t * n.x }
  ];
  return { val: v2, e, v1, v2, v1n, v2n, xy, drawKind: "xy", x: v2n * n.x, y: v2n * n.y };
}
function rocketEval(p, t) {
  const u = P(p, "uRel", 50);
  const mdot = Math.max(0, P(p, "dmdt", 0));
  const m0 = 1;
  const m = Math.max(0.05, m0 - mdot * Math.max(0, t));
  const v = -u * Math.log(m / m0);
  const a0 = u * mdot / m0;
  return { val: a0, v, a0, m };
}
function noninertialEval(p) {
  const aFrame = P(p, "aFrame", 0);
  const w = P(p, "omega", 0);
  const ay = -2 * w * 1;
  const ax = aFrame;
  return { val: ay, ax, ay, aMag: Math.hypot(ax, ay) };
}
function pendulumReset(state) {
  state.theta = void 0;
  state.omega = void 0;
}
function pendulumEval(p, t, state, dt) {
  const L = pos(P(p, "L", 1), 1e-6);
  const m = pos(P(p, "m", 1), 1e-9);
  const th0 = P(p, "theta0", 15) * Math.PI / 180;
  if (!Number.isFinite(state.theta)) {
    state.theta = th0;
    state.omega = 0;
  }
  const accel = (th) => -(G / L) * Math.sin(th);
  if (dt > 0) {
    let left = Math.min(dt, 0.5);
    while (left > 1e-8) {
      const h = Math.min(0.02, left);
      const a1 = accel(state.theta);
      state.theta += state.omega * h + 0.5 * a1 * h * h;
      const a2 = accel(state.theta);
      state.omega += 0.5 * (a1 + a2) * h;
      left -= h;
    }
  }
  const alpha = accel(state.theta);
  const E11 = m * G * L * (1 - Math.cos(state.theta)) + 0.5 * m * (L * state.omega) ** 2;
  return {
    val: alpha,
    alpha,
    thetaDeg: state.theta * 180 / Math.PI,
    E: E11
  };
}
function orbitEval(p) {
  const M = pos(P(p, "M", 1), 1e-9);
  const r0 = pos(P(p, "r0", 1), 1e-6);
  const v0 = P(p, "v0", 0);
  const eReq = Math.max(0, P(p, "e", 0));
  const h = r0 * v0;
  const eps = 0.5 * v0 * v0 - M / r0;
  const disc = 1 + 2 * eps * h * h / (M * M);
  const eOsc = Math.sqrt(Math.max(0, disc));
  const ac = M / (r0 * r0);
  const unbound = eReq >= 1 ? 1 : 0;
  const rA = eReq < 0.999 ? r0 * (1 + eReq) / (1 - eReq) : r0;
  const vPeri = Math.sqrt(M * (1 + Math.min(eReq, 10)) / r0);
  const eDraw = Math.min(eReq, 0.92);
  const pConic = r0 * (1 + eDraw);
  const xy = linspace(96, (u) => {
    const th = u * 2 * Math.PI;
    const r = pConic / (1 + eDraw * Math.cos(th));
    return { x: r * Math.cos(th), y: r * Math.sin(th) };
  });
  return {
    val: ac,
    ac,
    eOsc,
    rA,
    vPeri,
    unbound,
    x: r0,
    y: 0,
    xy,
    drawKind: "xy"
  };
}
function shoEval(p, t) {
  const k = pos(P(p, "k", 1), 1e-12);
  const m = pos(P(p, "m", 1), 1e-12);
  const x0 = P(p, "x0", 1);
  const w = Math.sqrt(k / m);
  const x = x0 * Math.cos(w * t);
  const v = -x0 * w * Math.sin(w * t);
  const a = -(k / m) * x;
  return {
    val: a,
    x,
    v,
    a,
    omega: w,
    curve: linspace(64, (u) => x0 * Math.cos(2 * Math.PI * u))
  };
}
function dampedEval(p, t) {
  const k = pos(P(p, "k", 1), 1e-12);
  const c = Math.max(0, P(p, "c", 0));
  const w0 = Math.sqrt(k);
  const alpha = c / 2;
  const zeta = c / (2 * w0);
  let x;
  if (Math.abs(zeta - 1) < 1e-6) {
    x = Math.exp(-alpha * t) * (1 + alpha * t);
  } else if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    x = Math.exp(-alpha * t) * (Math.cos(wd * t) + alpha / wd * Math.sin(wd * t));
  } else {
    const beta = w0 * Math.sqrt(zeta * zeta - 1);
    x = Math.exp(-alpha * t) * (Math.cosh(beta * t) + alpha / beta * Math.sinh(beta * t));
  }
  return { val: zeta, x: finiteOr(x), zeta, omega0: w0 };
}
function forcedEval(p) {
  const F0 = P(p, "F0", 0);
  const f = P(p, "fDrive", 0.5);
  const c = Math.max(0, P(p, "c", 0));
  const w = 2 * Math.PI * f;
  const re = 1 - w * w;
  const im = c * w;
  const A = F0 / Math.sqrt(re * re + im * im);
  const phi = Math.atan2(im, re);
  return { val: A, A, phi };
}
function coupledEval(p) {
  const N = Math.max(2, Math.min(12, Math.round(P(p, "N", 2))));
  const kappa = Math.max(0, P(p, "kappa", 0));
  const q = N * Math.PI / (N + 1);
  const w2 = 1 + 4 * kappa * Math.sin(q / 2) ** 2;
  const a1 = -(1 + 2 * kappa);
  return { val: Math.sqrt(Math.max(0, w2)), omegaMax: Math.sqrt(Math.max(0, w2)), a1, N };
}
function duffingReset(state) {
  state.x = void 0;
  state.v = void 0;
}
function duffingEval(p, t, state, dt) {
  const beta = P(p, "beta", 0);
  const drive = P(p, "drive", 0);
  if (!Number.isFinite(state.x)) {
    state.x = 1;
    state.v = 0;
  }
  const accel = (x, time) => -x - beta * x * x * x + drive * Math.cos(time);
  if (dt > 0) {
    let left = Math.min(dt, 0.5);
    let time = t;
    while (left > 1e-8) {
      const h = Math.min(0.02, left);
      const a1 = accel(state.x, time);
      state.x += state.v * h + 0.5 * a1 * h * h;
      const a2 = accel(state.x, time + h);
      state.v += 0.5 * (a1 + a2) * h;
      if (!Number.isFinite(state.x) || Math.abs(state.x) > 1e3) {
        state.x = clamp(state.x || 0, -1e3, 1e3);
        state.v = 0;
        break;
      }
      time += h;
      left -= h;
    }
  }
  const a = accel(state.x, t + (dt || 0));
  return { val: a, a, x: state.x, v: state.v };
}

// js/models/fam/evals-waves.js
var evals_waves_exports = {};
__export(evals_waves_exports, {
  diffractEval: () => diffractEval,
  dopplerEval: () => dopplerEval,
  fiberEval: () => fiberEval,
  interfereEval: () => interfereEval,
  laserEval: () => laserEval,
  lensEval: () => lensEval,
  malusEval: () => malusEval,
  nloEval: () => nloEval,
  optDiffractEval: () => optDiffractEval,
  optInterfereEval: () => optInterfereEval,
  prismEval: () => prismEval,
  qopticsEval: () => qopticsEval,
  snellEval: () => snellEval,
  wave1dEval: () => wave1dEval,
  wave2dEval: () => wave2dEval
});
function wave1dEval(p, t) {
  const c = pos(P(p, "c", 1), 1e-9);
  const f = pos(P(p, "f", 1), 1e-9);
  const w = 2 * Math.PI * f;
  const k = w / c;
  const lam = c / f;
  const yProbe = Math.sin(k * 1 - w * t);
  return {
    val: lam,
    lam,
    k,
    yProbe,
    curve: linspace(64, (u) => Math.sin(k * u * 4 - w * t))
  };
}
function wave2dEval(p, t) {
  const tension = pos(P(p, "T", 1), 1e-12);
  const rho = pos(P(p, "rho", 1), 1e-12);
  const c = Math.sqrt(tension / rho);
  const omega = Math.PI * c * Math.SQRT2;
  const yMid = Math.cos(omega * t);
  return { val: c, c, omega, yMid };
}
function interfereEval(p) {
  const d = pos(P(p, "d", 1), 1e-9);
  const phi = P(p, "phi", 0);
  const lam = pos(P(p, "lam", 1), 1e-9);
  const I = Math.cos(phi / 2) ** 2;
  const beta = lam / d;
  return { val: I, I, beta };
}
function diffractEval(p) {
  const a = pos(P(p, "a", 0.1), 1e-9);
  const lam = pos(P(p, "lam", 0.4), 1e-12);
  const L = pos(P(p, "L", 1), 1e-9);
  const yMin = L * lam / a;
  const beta = Math.PI * a / Math.max(lam, 1e-12);
  const I0 = 1;
  return { val: yMin, yMin, beta, I0 };
}
function dopplerEval(p) {
  const vs = clamp(P(p, "vs", 0), -0.95, 0.95);
  const vo = clamp(P(p, "vo", 0), -0.95, 0.95);
  const ang = P(p, "ang", 0) * Math.PI / 180;
  const cs = Math.cos(ang);
  const den = 1 - vs * cs;
  const num = 1 + vo * cs;
  const ratio = Math.abs(den) < 1e-3 ? num / (den < 0 ? -1e-3 : 1e-3) : num / den;
  return { val: ratio, ratio };
}
function snellEval(p) {
  const th = P(p, "theta", 0) * Math.PI / 180;
  const n = pos(P(p, "n", 1), 1e-6);
  const s = Math.sin(th) / n;
  const tir = Math.abs(s) > 1 ? 1 : 0;
  const th2 = tir ? 90 : Math.asin(clamp(s, -1, 1)) * 180 / Math.PI;
  return { val: th2, theta2: th2, tir };
}
function lensEval(p) {
  const f = P(p, "f", 10);
  const u = P(p, "u", -20);
  const h = P(p, "h", 1);
  const den = (Math.abs(f) < 1e-8 ? 0 : 1 / f) - (Math.abs(u) < 1e-8 ? 0 : 1 / u);
  const v = Math.abs(den) < 1e-10 ? 0 : 1 / den;
  const m = Math.abs(u) < 1e-8 ? 0 : -v / u;
  return { val: v, v, m, hi: m * h, f, u, h, drawKind: "lens" };
}
function prismEval(p) {
  const A = P(p, "A", 30);
  const n = P(p, "nF", 1.5);
  const delta = (n - 1) * A;
  const Ar = A * Math.PI / 180;
  const arg = clamp(n * Math.sin(Ar / 2), -1, 1);
  const deltaMin = (2 * Math.asin(arg) - Ar) * 180 / Math.PI;
  return { val: delta, delta, deltaMin: finiteOr(deltaMin) };
}
function optInterfereEval(p) {
  const dMm = pos(P(p, "d", 0.1), 1e-9);
  const lamNm = pos(P(p, "lam", 550), 1e-9);
  const betaMm = lamNm * 1e-6 / dMm;
  return { val: betaMm, betaMm };
}
function optDiffractEval(p) {
  const aMm = pos(P(p, "a", 0.05), 1e-9);
  const lamNm = pos(P(p, "lam", 500), 1e-9);
  const L = pos(P(p, "L", 1), 1e-9);
  const yMm = lamNm * L / aMm * 1e-3;
  return { val: yMm, yMm };
}
function malusEval(p) {
  const th = P(p, "ang", 0) * Math.PI / 180;
  const I = Math.cos(th) ** 2;
  const dphi = P(p, "dphi", 0);
  return { val: I, I, dphi };
}
function fiberEval(p) {
  const n1 = P(p, "nCore", 1.45);
  const n2 = P(p, "nClad", 1.4);
  const na2 = n1 * n1 - n2 * n2;
  const NA = na2 > 0 ? Math.sqrt(na2) : 0;
  const crit = n1 > 0 ? Math.asin(clamp(n2 / n1, -1, 1)) * 180 / Math.PI : 0;
  return { val: NA, NA, thetaC: crit };
}
function laserEval(p) {
  const L = pos(P(p, "L", 0.1), 1e-6);
  const g = P(p, "g", 0);
  const loss = P(p, "loss", 0);
  const net = g * L - loss;
  return { val: net, net, gL: g * L };
}
function nloEval(p) {
  const chi = P(p, "chi", 0);
  const dk = P(p, "dk", 0);
  const x = dk / 2;
  const sinc = Math.abs(x) < 1e-8 ? 1 : Math.sin(x) / x;
  const eta = chi * chi * sinc * sinc;
  return { val: eta, eta };
}
function qopticsEval(p) {
  const r = P(p, "r", 0);
  const alpha = P(p, "alpha", 0);
  const V = Math.exp(-2 * r);
  const nbar = alpha * alpha + Math.sinh(r) ** 2;
  return { val: V, V, nbar: finiteOr(nbar) };
}

// js/models/fam/evals-thermo.js
var evals_thermo_exports = {};
__export(evals_thermo_exports, {
  brownianEval: () => brownianEval,
  convectionEval: () => convectionEval,
  entropyEval: () => entropyEval,
  heatEngineEval: () => heatEngineEval,
  idealGasEval: () => idealGasEval,
  isingEval: () => isingEval,
  kineticEval: () => kineticEval,
  percolationEval: () => percolationEval,
  radiationEval: () => radiationEval
});
function idealGasEval(p) {
  const n = P(p, "n", 1);
  const T0 = P(p, "T0", 300);
  const pRatio = 2 ** -n;
  const T2 = T0 * 2 ** (1 - n);
  return { val: pRatio, pRatio, T2: finiteOr(T2) };
}
function heatEngineEval(p) {
  const TR = pos(P(p, "TR", 2), 1e-6);
  const r = pos(P(p, "r", 4), 1e-6);
  const etaC = 1 - 1 / TR;
  const etaO = 1 - r ** (1 - 1.4);
  return { val: etaC, etaC, etaO };
}
function convectionEval(p) {
  const h = P(p, "h", 10);
  const U = Math.max(0, P(p, "U", 0));
  const q = h * 1;
  const Re = U * 1 / 15e-6;
  const Nu = 0.664 * Math.sqrt(Re) * 0.7 ** (1 / 3);
  const hBl = Nu * 0.026 / 1;
  return { val: q, q, hBl };
}
function radiationEval(p) {
  const eps = clamp(P(p, "eps", 1), 0, 1);
  const T = P(p, "T", 300);
  const q = eps * SIGMA * T ** 4;
  return { val: q, q };
}
function kineticEval(p) {
  const T = pos(P(p, "T", 300), 1e-9);
  const M = pos(P(p, "mMol", 28), 1e-9) * 1e-3;
  const vrms = Math.sqrt(3 * R_GAS * T / M);
  const vp = Math.sqrt(2 * R_GAS * T / M);
  return { val: vrms, vrms, vp };
}
function brownianEval(p) {
  const D = Math.max(0, P(p, "D", 0));
  const tau = Math.max(0, P(p, "dt", 0));
  const msd = 2 * D * tau;
  return { val: msd, msd };
}
function isingEval(p) {
  const J = P(p, "J", 1);
  const T = pos(P(p, "T", 1), 1e-6);
  const H = P(p, "H", 0);
  let m = 0.5;
  const z = 4;
  for (let i = 0; i < 80; i += 1) {
    const m2 = Math.tanh((z * J * m + H) / T);
    if (Math.abs(m2 - m) < 1e-12) {
      m = m2;
      break;
    }
    m = m2;
  }
  return { val: finiteOr(m), m: finiteOr(m) };
}
function percolationEval(p) {
  const prob = clamp(P(p, "p", 0.5), 0, 0.999999);
  const S2 = (1 + prob) / (1 - prob);
  return { val: S2, S: S2 };
}
function entropyEval(p) {
  const x = clamp(P(p, "xA", 0.5), 1e-12, 1 - 1e-12);
  const sOverR = -x * Math.log(x) - (1 - x) * Math.log(1 - x);
  const gOverR = P(p, "T", 300) * -sOverR;
  return { val: sOverR, sOverR, gOverR };
}

// js/models/fam/evals-em.js
var evals_em_exports = {};
__export(evals_em_exports, {
  acEval: () => acEval,
  antennaEval: () => antennaEval,
  biotEval: () => biotEval,
  capacitorEval: () => capacitorEval,
  coulombEval: () => coulombEval,
  dcEval: () => dcEval,
  dipoleEval: () => dipoleEval,
  faradayEval: () => faradayEval,
  gaussEval: () => gaussEval,
  lorentzEval: () => lorentzEval,
  maxwellEval: () => maxwellEval,
  mutualEval: () => mutualEval,
  rlcEval: () => rlcEval,
  tlineEval: () => tlineEval
});
function coulombEval(p) {
  const q = P(p, "q", 1);
  const r = pos(P(p, "geom", 1), 1e-6);
  const E11 = KE * q / (r * r);
  return { val: E11, E: E11 };
}
function dipoleEval(p) {
  const moment = P(p, "p", 1);
  const r = pos(P(p, "sep", 1), 1e-4);
  const E11 = KE * 2 * moment / r ** 3;
  return { val: E11, E: E11 };
}
function gaussEval(p) {
  const rho = P(p, "rho", 1);
  const R = pos(P(p, "R", 1), 1e-9);
  const E11 = rho * R / (3 * EPS0);
  const Q = rho * (4 / 3) * Math.PI * R ** 3;
  return { val: E11, E: E11, Q };
}
function capacitorEval(p) {
  const er = P(p, "eps", 1);
  const d = pos(P(p, "d", 0.1), 1e-9);
  const A = pos(P(p, "A", 0.1), 1e-12);
  const C2 = er * EPS0 * A / d;
  return { val: C2, C: C2 };
}
function dcEval(p) {
  const R = pos(P(p, "R", 1), 1e-9);
  const E11 = P(p, "E", 0);
  const I = E11 / R;
  return { val: I, I, V: E11 };
}
function rlcEval(p) {
  const R = Math.max(0, P(p, "R", 1));
  const L = pos(P(p, "L", 1e-3), 1e-12);
  const C2 = pos(P(p, "C", 1e-6), 1e-18);
  const w0 = 1 / Math.sqrt(L * C2);
  const alpha = R / (2 * L);
  const disc = w0 * w0 - alpha * alpha;
  const wd = disc > 0 ? Math.sqrt(disc) : 0;
  return { val: w0, w0, alpha, wd };
}
function acEval(p) {
  const f = pos(P(p, "f", 50), 1e-6);
  const phi = clamp(P(p, "phi", 0), -89.9, 89.9) * Math.PI / 180;
  const Z = 1 / Math.cos(phi);
  const X = Math.tan(phi);
  const Leq = X / (2 * Math.PI * f);
  return { val: Math.abs(Z), Z: Math.abs(Z), Leq };
}
function biotEval(p) {
  const I = P(p, "I", 1);
  const R = pos(P(p, "geom", 1), 1e-6);
  const B = MU0 * I / (2 * R);
  return { val: B, B };
}
function lorentzEval(p) {
  const E11 = P(p, "E", 0);
  const B = P(p, "B", 0);
  const v = P(p, "v", 0);
  const FE = E11;
  const FB = Math.abs(v * B);
  const rC = Math.abs(B) > 1e-12 ? Math.abs(v / B) : 0;
  return { val: FE, FE, FB, rC };
}
function faradayEval(p) {
  const dPhi = P(p, "dPhi", 0);
  const N = P(p, "N", 1);
  const emf = -N * dPhi;
  return { val: emf, emf };
}
function mutualEval(p) {
  const L = Math.max(0, P(p, "L", 0));
  const k = clamp(P(p, "k", 0), 0, 1);
  const M = k * L;
  return { val: M, M };
}
function maxwellEval(p) {
  const f = pos(P(p, "f", 1e9), 1);
  const mode = Math.max(1, P(p, "mode", 1));
  const lam = C_LIGHT / f;
  const fCav = C_LIGHT / 2 * Math.sqrt(1 + mode * mode);
  return { val: lam, lam, fCav };
}
function tlineEval(p) {
  const Z0 = P(p, "Z0", 50);
  const len = Math.max(0, P(p, "len", 1));
  const delay = len / C_LIGHT;
  return { val: Z0, Z0, delay };
}
function antennaEval(p) {
  const len = P(p, "len", 0.5);
  const d = P(p, "d", 0.5);
  const delta = P(p, "phi", 0) * Math.PI / 180;
  const elem = 1 - Math.cos(Math.PI * len);
  const psi = 2 * Math.PI * d + delta;
  const AF = Math.abs(Math.cos(psi / 2));
  return { val: AF, AF, elem: elem * elem };
}

// js/models/fam/evals-quantum.js
var evals_quantum_exports = {};
__export(evals_quantum_exports, {
  angmomEval: () => angmomEval,
  comptonEval: () => comptonEval,
  decayEval: () => decayEval,
  entangleEval: () => entangleEval,
  groverEval: () => groverEval,
  hydrogenEval: () => hydrogenEval,
  packetEval: () => packetEval,
  qgateEval: () => qgateEval,
  qhoEval: () => qhoEval,
  relDynEval: () => relDynEval,
  relKinEval: () => relKinEval,
  tunnelEval: () => tunnelEval,
  wellEval: () => wellEval
});
function wellEval(p) {
  const a = pos(P(p, "a", 1), 1e-9);
  const E1 = Math.PI ** 2 / (2 * a * a);
  const V0 = P(p, "V0", 0);
  return { val: E1, E1, above: E1 < V0 ? 1 : 0 };
}
function tunnelEval(p) {
  const V0 = P(p, "V0", 1);
  const E11 = P(p, "E", 0);
  const w = Math.max(0, P(p, "w", 0));
  if (E11 >= V0) return { val: 1, T: 1, kappa: 0 };
  const kappa = Math.sqrt(2 * (V0 - E11));
  const T = Math.exp(-2 * kappa * w);
  return { val: T, T, kappa };
}
function qhoEval(p) {
  const w = pos(P(p, "omega", 1), 1e-9);
  const coup = Math.max(0, P(p, "coup", 0));
  const E0 = 0.5 * w;
  const wPlus = w * Math.sqrt(1 + coup);
  return { val: E0, E0, wPlus };
}
function hydrogenEval(p) {
  const n = Math.max(1, Math.round(P(p, "n", 1)));
  const l = Math.max(0, Math.round(P(p, "l", 0)));
  const m = Math.round(P(p, "m", 0));
  const E11 = -13.6 / (n * n);
  const valid = l <= n - 1 && Math.abs(m) <= l ? 1 : 0;
  return { val: E11, E: E11, valid };
}
function angmomEval(p) {
  const j = pos(P(p, "j", 0.5), 1e-6);
  const coup = P(p, "coup", 0);
  const l = Math.max(0, j - 0.5);
  const s = 0.5;
  const jj = j * (j + 1);
  const gJ = 1 + (jj + s * (s + 1) - l * (l + 1)) / (2 * jj);
  const LS = 0.5 * (jj - l * (l + 1) - s * (s + 1));
  return { val: gJ, gJ: finiteOr(gJ), Efs: coup * LS };
}
function entangleEval(p) {
  const Cq = clamp(P(p, "conc", 0), 0, 1);
  const th = P(p, "basis", 0) * Math.PI / 180;
  const S2 = 2 * Math.sqrt(1 + Cq * Cq);
  const corr = -Cq * Math.cos(th);
  return { val: S2, S: S2, corr };
}
function qgateEval(p) {
  const th = P(p, "theta", 0) * Math.PI / 180;
  const P1 = Math.sin(th / 2) ** 2;
  const flipped = Math.round(P(p, "ctrl", 0)) !== 0 ? 1 : 0;
  return { val: P1, P1, flipped };
}
function groverEval(p) {
  const nBits = Math.max(1, Math.min(12, Math.round(P(p, "nBits", 2))));
  const k = Math.max(0, Math.round(P(p, "iters", 1)));
  const N = 2 ** nBits;
  const th = Math.asin(1 / Math.sqrt(N));
  const prob = Math.sin((2 * k + 1) * th) ** 2;
  return { val: prob, prob, N };
}
function packetEval(p, t) {
  const sigma = pos(P(p, "sigma", 1), 1e-6);
  const V = P(p, "V", 0);
  const spread = sigma * Math.sqrt(1 + (t / (2 * sigma * sigma)) ** 2);
  const E11 = 1 / (8 * sigma * sigma) + V;
  return { val: E11, E: E11, sigmaT: finiteOr(spread) };
}
function relKinEval(p) {
  const beta = clamp(Math.abs(P(p, "beta", 0)), 0, 0.999999);
  const gamma2 = 1 / Math.sqrt(1 - beta * beta);
  return { val: gamma2, gamma: gamma2, contract: 1 / gamma2 };
}
function relDynEval(p) {
  const E11 = P(p, "E", 1);
  const mom = P(p, "p", 0);
  const disc = E11 * E11 - mom * mom;
  const m = disc > 0 ? Math.sqrt(disc) : 0;
  return { val: m, m, timelike: disc > 0 ? 1 : 0 };
}
function comptonEval(p) {
  const th = P(p, "theta", 0) * Math.PI / 180;
  const E11 = pos(P(p, "E", 50), 1e-9);
  const dLam = LAMBDA_C_PM * (1 - Math.cos(th));
  const lam = HC_KEV_PM / E11;
  const Ep = HC_KEV_PM / (lam + dLam);
  return { val: dLam, dLam, Ep };
}
function decayEval(p, t) {
  const lam = Math.max(0, P(p, "lam", 0));
  const N0 = Math.max(0, P(p, "N0", 0));
  const N = N0 * Math.exp(-lam * Math.max(0, t));
  const A = lam * N;
  const half = lam > 1e-15 ? Math.LN2 / lam : 0;
  return { val: N, N, A, half };
}

// js/models/fam/evals-structures.js
var evals_structures_exports = {};
__export(evals_structures_exports, {
  axialEval: () => axialEval,
  beamBendEval: () => beamBendEval,
  beamDeflEval: () => beamDeflEval,
  bucklingEval: () => bucklingEval,
  combinedEval: () => combinedEval,
  frameEval: () => frameEval,
  sdofEval: () => sdofEval,
  seismicEval: () => seismicEval,
  torsionEval: () => torsionEval,
  trussEval: () => trussEval
});
function axialEval(p) {
  const A = pos(P(p, "A", 1), 1e-15);
  const F = P(p, "F", 0);
  const sigma = F / A;
  return { val: sigma, sigma };
}
function beamBendEval(p) {
  const L = pos(P(p, "L", 1), 1e-9);
  const EI = pos(P(p, "EI", 1), 1e-9);
  const load = P(p, "P", 0);
  const M = load * L / 4;
  const delta = load * L ** 3 / (48 * EI);
  return { val: M, M, delta, curvature: M / EI };
}
function beamDeflEval(p) {
  const delta = P(p, "delta", 0);
  const theta = P(p, "theta", 0);
  const residual = delta - theta / 2;
  return { val: residual, residual, delta, theta };
}
function bucklingEval(p) {
  const L = pos(P(p, "L", 1), 1e-9);
  const EI = pos(P(p, "EI", 1), 1e-9);
  const Pcr = Math.PI ** 2 * EI / (L * L);
  return { val: Pcr, Pcr };
}
function torsionEval(p) {
  const d = pos(P(p, "d", 0.05), 1e-9);
  const T = P(p, "T", 0);
  const tau = 16 * T / (Math.PI * d ** 3);
  return { val: tau, tau };
}
function combinedEval(p) {
  const N = P(p, "N", 0);
  const M = P(p, "M", 0);
  const T = P(p, "T", 0);
  const sx = N + M;
  const s1 = sx / 2 + Math.sqrt((sx / 2) ** 2 + T * T);
  return { val: s1, s1, sx };
}
function trussEval(p) {
  const j = Math.round(P(p, "nodes", 3));
  const b = Math.round(P(p, "bars", 3));
  const indeterminacy = b - (2 * j - 3);
  return { val: indeterminacy, indeterminacy };
}
function frameEval(p) {
  const k = pos(P(p, "k", 1), 1e-9);
  const span = P(p, "span", 1);
  const story = pos(P(p, "story", 1), 1e-9);
  return { val: 1 / k, drift: 1 / k, aspect: span / story };
}
function sdofEval(p) {
  const m = pos(P(p, "m", 1), 1e-12);
  const k = pos(P(p, "k", 1), 1e-12);
  const c = Math.max(0, P(p, "c", 0));
  const wn = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  return { val: wn, wn, zeta };
}
function seismicEval(p) {
  const pga = P(p, "pga", 0);
  const zeta = pos(P(p, "zeta", 0.05), 1e-6);
  const amp = pga / (2 * zeta);
  return { val: amp, amp };
}

// js/models/fam/evals-fluids.js
var evals_fluids_exports = {};
__export(evals_fluids_exports, {
  absorbEval: () => absorbEval,
  bernoulliEval: () => bernoulliEval,
  blasiusEval: () => blasiusEval,
  buckEval: () => buckEval,
  capillaryEval: () => capillaryEval,
  combustionEval: () => combustionEval,
  convEngEval: () => convEngEval,
  crystalEval: () => crystalEval,
  cstrEval: () => cstrEval,
  darcyEval: () => darcyEval,
  dryingEval: () => dryingEval,
  extractEval: () => extractEval,
  fenskeEval: () => fenskeEval,
  fluidbedEval: () => fluidbedEval,
  hxEval: () => hxEval,
  magnetismEval: () => magnetismEval,
  manningEval: () => manningEval,
  motorDcEval: () => motorDcEval,
  motorIndEval: () => motorIndEval,
  motorSyncEval: () => motorSyncEval,
  pinchEval: () => pinchEval,
  plasmaEval: () => plasmaEval,
  poiseuilleEval: () => poiseuilleEval,
  powerflowEval: () => powerflowEval,
  pumpEval: () => pumpEval,
  radEngEval: () => radEngEval,
  renewableEval: () => renewableEval,
  semiconductorEval: () => semiconductorEval,
  storageEval: () => storageEval,
  superconEval: () => superconEval,
  swingEval: () => swingEval,
  thermoCycleEval: () => thermoCycleEval,
  topoEval: () => topoEval,
  transformerEval: () => transformerEval,
  turbEval: () => turbEval,
  weirEval: () => weirEval
});
function bernoulliEval(p) {
  const v = P(p, "v", 0);
  const A = Math.max(0, P(p, "A", 0));
  const q = 0.5 * 1e3 * v * v;
  const Q = A * v;
  return { val: q, q, Q };
}
function poiseuilleEval(p) {
  const mu = pos(P(p, "mu", 0.01), 1e-12);
  const U = P(p, "U", 0);
  const D = pos(P(p, "D", 0.01), 1e-9);
  const R = D / 2;
  const Q = Math.PI * R ** 4 / (8 * mu);
  const tau = mu * U / D;
  return { val: Q, Q, tau };
}
function blasiusEval(p) {
  const Re = pos(P(p, "Re", 100), 1e-9);
  const rough = Math.max(0, P(p, "rough", 0));
  const cf = 0.664 / Math.sqrt(Re);
  const delta = 5 / Math.sqrt(Re);
  return { val: cf, cf, delta, ReEps: Re * rough };
}
function darcyEval(p) {
  const Re = pos(P(p, "Re", 1e3), 1e-9);
  const eps = Math.max(0, P(p, "eps", 0));
  let f;
  if (Re < 2300) f = 64 / Re;
  else {
    const arg = eps / 3.7 + 5.74 / Re ** 0.9;
    const log = Math.log10(Math.max(arg, 1e-15));
    f = 0.25 / (log * log);
  }
  return { val: f, f };
}
function manningEval(p) {
  const n = pos(P(p, "n", 0.013), 1e-9);
  const S2 = pos(P(p, "S", 1e-3), 1e-15);
  const Q = Math.max(0, P(p, "Q", 0));
  const y = (Q * n / Math.sqrt(S2)) ** (3 / 5);
  return { val: finiteOr(y), y: finiteOr(y) };
}
function weirEval(p) {
  const H = Math.max(0, P(p, "H", 0));
  const b = Math.max(0, P(p, "a", 0));
  const Q = 2 / 3 * b * Math.sqrt(2 * G) * H ** 1.5;
  return { val: Q, Q };
}
function pumpEval(p) {
  const rpm = P(p, "rpm", 1450);
  const units = Math.max(0, P(p, "units", 1));
  const speed = rpm / 1450;
  const Q = units * speed;
  const H = speed * speed;
  return { val: Q, Q, H };
}
function hxEval(p) {
  const U = P(p, "U", 0);
  const A = P(p, "A", 0);
  return { val: U * A, UA: U * A };
}
function turbEval(p) {
  const Cmu = P(p, "Cmu", 0.09);
  const grid = P(p, "grid", 0);
  return { val: Cmu, Cmu, Delta: grid };
}
function capillaryEval(p) {
  const sigma = Math.max(0, P(p, "sigma", 0));
  const drho = pos(P(p, "drho", 1), 1e-9);
  const lam = Math.sqrt(sigma / (drho * G));
  return { val: lam, lam };
}
function plasmaEval(p) {
  const B = P(p, "B", 0);
  const n = pos(P(p, "n", 1e14), 1);
  const TeV = Math.max(0, P(p, "T", 1));
  const wp = Math.sqrt(n * QE * QE / (EPS0 * ME));
  const wc = QE * Math.abs(B) / ME;
  const lamD = Math.sqrt(EPS0 * TeV * QE / (n * QE * QE));
  return { val: wp, wp, wc, lamD };
}
function superconEval(p) {
  const lam = P(p, "lam", 1);
  const xi = pos(P(p, "xi", 1), 1e-9);
  const kappa = lam / xi;
  return { val: kappa, kappa, typeII: kappa > 1 / Math.SQRT2 ? 1 : 0 };
}
function magnetismEval(p) {
  const J = P(p, "J", 1);
  const K = P(p, "K", 0);
  const Tc = 2 / 3 * 6 * J * 0.5 * 1.5;
  return { val: Tc, Tc, K };
}
function semiconductorEval(p) {
  const Nd = pos(P(p, "Nd", 1e15), 1);
  const dE = P(p, "dE", 0);
  const ni = 1e10;
  const VT = 0.025851;
  const Vbi = VT * Math.log(Nd * Nd / (ni * ni));
  return { val: Vbi, Vbi, dE };
}
function topoEval(p) {
  const Cq = P(p, "Chern", 0);
  const bc = P(p, "bc", 0) > 0 ? 1 : 0;
  const edge = bc ? Math.abs(Cq) : 0;
  return { val: Cq, sigma: Cq, edge };
}
function convEngEval(p) {
  return convectionEval(p);
}
function radEngEval(p) {
  return radiationEval(p);
}
function thermoCycleEval(p) {
  const Pbar = pos(P(p, "P", 1), 1e-9);
  const T = pos(P(p, "T", 300), 1e-9);
  const rp = Pbar;
  const etaB = 1 - rp ** ((1 - 1.4) / 1.4);
  const etaC = 1 - 298.15 / T;
  return { val: etaB, etaB, etaC };
}
function combustionEval(p) {
  const phi = pos(P(p, "phi", 1), 1e-6);
  const excess = 1 / phi - 1;
  return { val: phi, phi, excess, T: P(p, "T", 300) };
}
function motorDcEval(p) {
  const V = P(p, "V", 0);
  const TL = P(p, "TL", 0);
  const omega = V - TL;
  return { val: omega, omega, I: TL };
}
function motorIndEval(p) {
  const f = P(p, "f", 50);
  const V = P(p, "V", 0);
  const ns = 120 * f / 4;
  return { val: ns, ns, V };
}
function motorSyncEval(p) {
  const If = P(p, "If", 1);
  const delta = P(p, "delta", 0) * Math.PI / 180;
  const Ppu = If * Math.sin(delta);
  return { val: Ppu, Ppu };
}
function transformerEval(p) {
  const a = P(p, "a", 1);
  const load = P(p, "load", 0);
  const ratio = Math.abs(a) < 1e-9 ? 0 : 1 / a;
  return { val: ratio, ratio, Ipu: load };
}
function buckEval(p) {
  const fs = pos(P(p, "fs", 1e3), 1e-9);
  const D = clamp(P(p, "duty", 0.5), 0, 1);
  const ripple = D * (1 - D) / fs;
  return { val: D, duty: D, ripple };
}
function powerflowEval(p) {
  const n = Math.max(2, Math.min(40, Math.round(P(p, "n", 3))));
  const load = P(p, "load", 0);
  let theta = 0;
  for (let k = 1; k < n; k += 1) {
    const flow = (n - k) * load;
    theta += flow * 0.1;
  }
  return { val: theta, theta, Ptot: n * load };
}
function swingEval(p) {
  const fault = P(p, "fault", 0);
  const clear = Math.max(0, P(p, "clear", 0));
  const d0 = Math.asin(0.8);
  const delta = fault > 0 ? d0 + 0.4 * clear * clear : d0;
  return { val: delta, delta };
}
function renewableEval(p) {
  const irr = Math.max(0, P(p, "irr", 0));
  const wind = Math.max(0, P(p, "wind", 0));
  const Ppv = irr * 0.2;
  const Pwind = 0.5 * 1.225 * 1 * wind ** 3 * 0.4;
  return { val: Ppv, Ppv, Pwind };
}
function storageEval(p) {
  const E11 = P(p, "E", 0);
  const power = pos(P(p, "P", 1), 1e-9);
  const hours = E11 / power;
  return { val: hours, hours };
}
function cstrEval(p) {
  const V = Math.max(0, P(p, "V", 0));
  const v = pos(P(p, "v", 1), 1e-12);
  const k = Math.max(0, P(p, "k", 0));
  const tau = V / v;
  const kt = k * tau;
  const Xc = kt / (1 + kt);
  const Xp = 1 - Math.exp(-kt);
  return { val: Xc, Xc, Xp };
}
function fenskeEval(p) {
  const N = pos(P(p, "N", 1), 1e-9);
  const feed = P(p, "feed", 1);
  const xD = 0.95;
  const xB = 0.05;
  const alpha = 2.5;
  const Nmin = Math.log(xD / (1 - xD) * ((1 - xB) / xB)) / Math.log(alpha);
  return { val: feed / N, feedFrac: feed / N, Nmin };
}
function absorbEval(p) {
  const A = Math.max(0, P(p, "LGq", 0));
  const frac = A / (1 + A);
  return { val: frac, frac, T: P(p, "T", 300) };
}
function extractEval(p) {
  const N = Math.max(0, Math.round(P(p, "stages", 1)));
  const S2 = pos(P(p, "S", 1), 1e-9);
  let frac;
  if (Math.abs(S2 - 1) < 1e-8) frac = N / (N + 1);
  else {
    const Sp = S2 ** (N + 1);
    frac = (Sp - S2) / (Sp - 1);
  }
  return { val: finiteOr(frac), frac: finiteOr(frac) };
}
function pinchEval(p) {
  const Q = P(p, "Q", 0);
  const dT = pos(P(p, "dT", 1), 1e-9);
  return { val: Q / dT, UA: Q / dT };
}
function dryingEval(p) {
  const TK = P(p, "T", 330);
  const RH = clamp(P(p, "RH", 0), 0, 1);
  const TC = TK - 273.15;
  const logP = 8.07131 - 1730.63 / (TC + 233.426);
  const psat = 10 ** logP;
  const drive = psat * (1 - RH);
  return { val: finiteOr(drive), drive: finiteOr(drive) };
}
function fluidbedEval(p) {
  const dp = pos(P(p, "dp", 50), 1e-6) * 1e-6;
  const Ug = P(p, "Ug", 0);
  const rhoG = 1.2;
  const mu = 181e-7;
  const rhoS = 2500;
  const Ar = dp ** 3 * rhoG * (rhoS - rhoG) * G / (mu * mu);
  const ReMf = Math.sqrt(33.7 ** 2 + 0.0408 * Ar) - 33.7;
  const Umf = ReMf * mu / (rhoG * dp);
  return { val: Umf, Umf, above: Ug > Umf ? 1 : 0 };
}
function crystalEval(p) {
  const S2 = pos(P(p, "S", 1), 1e-9);
  return { val: Math.log(S2), lnS: Math.log(S2), T: P(p, "T", 300) };
}

// js/models/fam/evals-discrete.js
var evals_discrete_exports = {};
__export(evals_discrete_exports, {
  bfsDist: () => bfsDist,
  binaryEntropy: () => binaryEntropy2,
  branchMisrate: () => branchMisrate,
  caPopulation: () => caPopulation,
  cacheHitRate: () => cacheHitRate,
  dijkstraDist: () => dijkstraDist,
  fcfsWait: () => fcfsWait,
  heapComps: () => heapComps,
  insertionComps: () => insertionComps,
  kmeansInertia: () => kmeansInertia,
  kmpComparisons: () => kmpComparisons,
  knapsack: () => knapsack,
  mstWeight: () => mstWeight,
  nnForward: () => nnForward,
  pcaFraction: () => pcaFraction,
  sandTopples: () => sandTopples,
  searchProbes: () => searchProbes,
  tcpMbps: () => tcpMbps,
  treeHeights: () => treeHeights,
  ufOps: () => ufOps,
  zipfEntropy: () => zipfEntropy
});
function insertionComps(n, sortedness) {
  const N = Math.max(1, Math.min(256, Math.round(n)));
  const a = [];
  for (let i = 0; i < N; i += 1) a.push(i);
  const rev = clamp(Math.round((1 - clamp(sortedness, 0, 1)) * N), 0, N);
  for (let i = 0, j = rev - 1; i < j; i += 1, j -= 1) {
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  let comps = 0;
  for (let i = 1; i < N; i += 1) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0) {
      comps += 1;
      if (a[j] <= key) break;
      a[j + 1] = a[j];
      j -= 1;
    }
    a[j + 1] = key;
  }
  return comps;
}
function searchProbes(n, strategy) {
  const N = Math.max(1, Math.round(n));
  const s = Math.round(strategy);
  if (s <= 0) return N;
  if (s === 1) return Math.floor(Math.log2(N)) + 1;
  if (N < 3) return 1;
  return Math.floor(Math.log2(Math.log2(N))) + 1;
}
function bfsDist(n, pEdge) {
  const N = Math.max(2, Math.min(48, Math.round(n)));
  const extras = clamp(Math.floor(Math.max(0, pEdge) * (N - 2)), 0, N - 2);
  const adj = Array.from({ length: N }, () => []);
  const link = (a, b) => {
    adj[a].push(b);
    adj[b].push(a);
  };
  for (let i = 0; i < N - 1; i += 1) link(i, i + 1);
  for (let i = 0; i < extras; i += 1) link(i, i + 2);
  const dist = new Array(N).fill(-1);
  dist[0] = 0;
  const q = [0];
  for (let qi = 0; qi < q.length; qi += 1) {
    const u = q[qi];
    for (const v of adj[u]) {
      if (dist[v] >= 0) continue;
      dist[v] = dist[u] + 1;
      q.push(v);
    }
  }
  return dist[N - 1];
}
function dijkstraDist(n, wSpread) {
  const N = Math.max(2, Math.min(48, Math.round(n)));
  const w = Math.max(0, wSpread);
  const dist = new Array(N).fill(Infinity);
  const used = new Array(N).fill(false);
  dist[0] = 0;
  for (let iter = 0; iter < N; iter += 1) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < N; i += 1) {
      if (!used[i] && dist[i] < best) {
        best = dist[i];
        u = i;
      }
    }
    if (u < 0) break;
    used[u] = true;
    if (u + 1 < N) dist[u + 1] = Math.min(dist[u + 1], dist[u] + w);
  }
  return finiteOr(dist[N - 1], 0);
}
function mstWeight(n, pEdge) {
  const N = Math.max(2, Math.min(40, Math.round(n)));
  const extras = clamp(Math.floor(Math.max(0, pEdge) * (N - 2)), 0, N - 2);
  const edges = [];
  for (let i = 0; i < N - 1; i += 1) edges.push([3, i, i + 1]);
  for (let i = 0; i < extras; i += 1) edges.push([1, i, i + 2]);
  edges.sort((a, b) => a[0] - b[0]);
  const parent = Array.from({ length: N }, (_, i) => i);
  const find = (x) => {
    let r = x;
    while (parent[r] !== r) r = parent[r];
    let y = x;
    while (parent[y] !== r) {
      const nxp = parent[y];
      parent[y] = r;
      y = nxp;
    }
    return r;
  };
  let total = 0;
  let used = 0;
  for (const [w, a, b] of edges) {
    const pa = find(a);
    const pb = find(b);
    if (pa === pb) continue;
    parent[pa] = pb;
    total += w;
    used += 1;
    if (used === N - 1) break;
  }
  return total;
}
function kmpComparisons(m, n) {
  const M = Math.max(1, Math.min(48, Math.round(m)));
  const N = Math.max(1, Math.min(500, Math.round(n)));
  const pat = new Array(M);
  for (let i = 0; i < M; i += 1) pat[i] = i === M - 1 ? 1 : 0;
  const text = new Array(N).fill(0);
  const pi = new Array(M).fill(0);
  let comps = 0;
  let len = 0;
  for (let i = 1; i < M; i += 1) {
    while (len > 0 && pat[len] !== pat[i]) {
      comps += 1;
      len = pi[len - 1];
    }
    comps += 1;
    if (pat[len] === pat[i]) {
      len += 1;
      pi[i] = len;
    } else pi[i] = 0;
  }
  let q = 0;
  for (let i = 0; i < N; i += 1) {
    while (q > 0 && pat[q] !== text[i]) {
      comps += 1;
      q = pi[q - 1];
    }
    comps += 1;
    if (pat[q] === text[i]) q += 1;
    if (q === M) q = pi[q - 1];
  }
  return comps;
}
function knapsack(n, cap) {
  const N = Math.max(1, Math.min(32, Math.round(n)));
  const C2 = Math.max(0, Math.min(80, Math.round(cap)));
  const dp = new Array(C2 + 1).fill(0);
  for (let i = 0; i < N; i += 1) {
    const w = i % 5 + 1;
    const v = i % 3 + 1;
    for (let c = C2; c >= w; c -= 1) dp[c] = Math.max(dp[c], dp[c - w] + v);
  }
  return dp[C2];
}
function treeHeights(n, order) {
  const N = Math.max(1, Math.round(n));
  const t = Math.max(2, Math.round(order));
  const hBst = N - 1;
  const hAvl = Math.ceil(Math.log2(N + 1));
  const hB = Math.ceil(Math.log((N + 1) / 2) / Math.log(t));
  return { hBst, hAvl, hB: finiteOr(hB) };
}
function heapComps(n) {
  const N = Math.max(1, Math.min(300, Math.round(n)));
  const a = [];
  for (let i = 0; i < N; i += 1) a.push(N - i);
  let comps = 0;
  const sift = (start, heapN) => {
    let i = start;
    while (true) {
      const left = 2 * i + 1;
      const right = left + 1;
      let s = i;
      if (left < heapN) {
        comps += 1;
        if (a[left] > a[s]) s = left;
      }
      if (right < heapN) {
        comps += 1;
        if (a[right] > a[s]) s = right;
      }
      if (s === i) break;
      const tmp = a[i];
      a[i] = a[s];
      a[s] = tmp;
      i = s;
    }
  };
  for (let i = Math.floor(N / 2) - 1; i >= 0; i -= 1) sift(i, N);
  return comps;
}
function ufOps(n) {
  const N = Math.max(1, Math.min(400, Math.round(n)));
  const parent = Array.from({ length: N }, (_, i) => i);
  const rank = new Array(N).fill(0);
  let ops = 0;
  const find = (x) => {
    let r = x;
    while (parent[r] !== r) {
      ops += 1;
      r = parent[r];
    }
    let y = x;
    while (parent[y] !== r) {
      const nxt = parent[y];
      parent[y] = r;
      y = nxt;
      ops += 1;
    }
    return r;
  };
  for (let i = 0; i < N - 1; i += 1) {
    const a = find(i);
    const b = find(i + 1);
    if (a === b) continue;
    if (rank[a] < rank[b]) parent[a] = b;
    else if (rank[a] > rank[b]) parent[b] = a;
    else {
      parent[b] = a;
      rank[a] += 1;
    }
  }
  return ops;
}
function cacheHitRate(cap, block, assoc) {
  const B = Math.max(1, Math.round(block));
  const A = Math.max(1, Math.round(assoc));
  const bytes = Math.max(B * A, Math.round(cap));
  const sets = Math.max(1, Math.floor(bytes / (B * A)));
  const lines = sets * A;
  const nRef = Math.min(2048, Math.max(1, lines * B));
  const slots = Array.from({ length: sets }, () => []);
  let hits = 0;
  for (let addr = 0; addr < nRef; addr += 1) {
    const blockId = Math.floor(addr / B);
    const set = blockId % sets;
    const tag = Math.floor(blockId / sets);
    const slot = slots[set];
    const idx = slot.indexOf(tag);
    if (idx >= 0) {
      hits += 1;
      slot.splice(idx, 1);
      slot.push(tag);
    } else {
      if (slot.length >= A) slot.shift();
      slot.push(tag);
    }
  }
  return hits / nRef;
}
function branchMisrate(hist, table) {
  const H = Math.max(1, Math.min(32, Math.round(hist)));
  const T = Math.max(1, Math.min(4096, Math.round(table)));
  const sites = 64;
  const period = H + 1;
  const reps = 4;
  const ctr = new Array(T).fill(1);
  let mis = 0;
  let n = 0;
  for (let rep = 0; rep < reps; rep += 1) {
    for (let step = 0; step < period; step += 1) {
      for (let pc = 0; pc < sites; pc += 1) {
        const taken = (step + pc) % period !== H;
        const idx = pc % T;
        const pred = ctr[idx] >= 2;
        if (pred !== taken) mis += 1;
        ctr[idx] = taken ? Math.min(3, ctr[idx] + 1) : Math.max(0, ctr[idx] - 1);
        n += 1;
      }
    }
  }
  return mis / n;
}
function zipfEntropy(dict) {
  const n = Math.max(1, Math.min(512, Math.round(dict)));
  let z = 0;
  for (let i = 1; i <= n; i += 1) z += 1 / i;
  let H = 0;
  for (let i = 1; i <= n; i += 1) {
    const prob = 1 / (i * z);
    H -= prob * Math.log2(prob);
  }
  return H;
}
function kmeansInertia(k, metric) {
  const pts = [0, 1, 2, 3, 10, 11, 12, 13];
  const K = Math.max(1, Math.min(pts.length, Math.round(k)));
  const centers = [];
  for (let i = 0; i < K; i += 1) {
    centers.push(pts[Math.floor(i * (pts.length - 1) / Math.max(1, K - 1))]);
  }
  const assign = new Array(pts.length).fill(0);
  for (let iter = 0; iter < 24; iter += 1) {
    for (let i = 0; i < pts.length; i += 1) {
      let best = 0;
      let bd = Infinity;
      for (let c = 0; c < K; c += 1) {
        const d = Math.abs(pts[i] - centers[c]);
        const cost = metric >= 1 ? d : d * d;
        if (cost < bd) {
          bd = cost;
          best = c;
        }
      }
      assign[i] = best;
    }
    for (let c = 0; c < K; c += 1) {
      const mem = [];
      for (let i = 0; i < pts.length; i += 1) if (assign[i] === c) mem.push(pts[i]);
      if (!mem.length) continue;
      if (metric >= 1) {
        mem.sort((a, b) => a - b);
        centers[c] = mem[Math.floor((mem.length - 1) / 2)];
      } else centers[c] = mem.reduce((s, v) => s + v, 0) / mem.length;
    }
  }
  let inertia = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const d = pts[i] - centers[assign[i]];
    inertia += metric >= 1 ? Math.abs(d) : d * d;
  }
  return inertia;
}
function pcaFraction(k, nn) {
  const n = Math.max(2, Math.min(40, Math.round(nn)));
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  let mx = 0;
  let my = 0;
  const xs = [];
  const ys = [];
  for (let i = 1; i <= n; i += 1) {
    xs.push(i);
    ys.push(0.2 * i + (i % 3 - 1));
    mx += i;
    my += ys[ys.length - 1];
  }
  mx /= n;
  my /= n;
  for (let i = 0; i < n; i += 1) {
    const x = xs[i] - mx;
    const y = ys[i] - my;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  sxx /= n;
  syy /= n;
  sxy /= n;
  const tr = sxx + syy;
  const disc = Math.sqrt(Math.max(0, (sxx - syy) ** 2 + 4 * sxy * sxy));
  const l1 = (tr + disc) / 2;
  const kk = Math.max(1, Math.min(2, Math.round(k)));
  const kept = kk >= 2 ? tr : l1;
  return tr > 0 ? kept / tr : 0;
}
function nnForward(layers, width, act) {
  const L = Math.max(1, Math.min(8, Math.round(layers)));
  const W = Math.max(1, Math.min(48, Math.round(width)));
  let a = 1;
  for (let i = 0; i < L; i += 1) {
    const z = clamp(0.1 * W * a, -40, 40);
    if (act < 0.5) a = Math.max(0, z);
    else if (act < 1.5) a = Math.tanh(z);
    else if (act < 2.5) a = 1 / (1 + Math.exp(-z));
    else a = z;
  }
  return a;
}
function caPopulation(rule, seed) {
  const W = 24;
  let cur = new Array(W).fill(0);
  const s = Math.round(Math.abs(seed)) || 1;
  for (let i = 0; i < 8; i += 1) cur[8 + i] = s >> i & 1;
  const r = Math.round(rule) & 255;
  for (let step = 0; step < 8; step += 1) {
    const nxt = new Array(W).fill(0);
    for (let i = 0; i < W; i += 1) {
      const left = cur[(i + W - 1) % W];
      const mid = cur[i];
      const right = cur[(i + 1) % W];
      const idx = left << 2 | mid << 1 | right;
      nxt[i] = r >> idx & 1;
    }
    cur = nxt;
  }
  return cur.reduce((s0, v) => s0 + v, 0);
}
function sandTopples(prob, thresh) {
  const n = 16;
  const h = new Array(n).fill(0);
  const T = Math.max(1, Math.round(thresh));
  const openN = clamp(Math.floor(clamp(prob, 0, 1) * n), 0, n);
  for (let i = 0; i < openN; i += 1) h[i] = T;
  h[0] += 1;
  let topples = 0;
  for (let guard = 0; guard < 400; guard += 1) {
    let moved = false;
    for (let i = 0; i < n; i += 1) {
      if (h[i] > T) {
        h[i] -= 2;
        if (i > 0) h[i - 1] += 1;
        if (i < n - 1) h[i + 1] += 1;
        topples += 1;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return topples;
}
function binaryEntropy2(prob) {
  const p0 = clamp(prob, 0, 1);
  if (p0 <= 0 || p0 >= 1) return 0;
  return -p0 * Math.log2(p0) - (1 - p0) * Math.log2(1 - p0);
}
function fcfsWait(arrival, burst) {
  const n = 4;
  const b = Math.max(0, burst);
  const gap = Math.max(0, arrival);
  let time = 0;
  let wait = 0;
  for (let i = 0; i < n; i += 1) {
    const arr = i * gap;
    if (time < arr) time = arr;
    wait += time - arr;
    time += b;
  }
  return wait / n;
}
function tcpMbps(bw, rttMs, loss) {
  if (!(loss > 0)) return bw;
  const rtt = Math.max(rttMs, 0.1) / 1e3;
  const mssBits = 1460 * 8;
  const mathis = mssBits / rtt * Math.sqrt(1.5 / loss) / 1e6;
  return Math.min(bw, mathis);
}

// js/models/fam/builders-mechanics.js
var E = { ...evals_mechanics_exports, ...evals_waves_exports, ...evals_thermo_exports, ...evals_em_exports, ...evals_quantum_exports, ...evals_structures_exports, ...evals_fluids_exports, ...evals_discrete_exports };
var BUILDERS_MECHANICS = {
  projectile: (spec) => algebraic(spec, {
    equation: "x=v0 cos\u03B8 t, y=v0 sin\u03B8 t\u2212\xBD g t\xB2; linear drag k=b/m",
    assumptions: "Plane motion. k=0 is the vacuum parabola. k>0 is linear drag with k=b/m. The canvas draws the (x,y) trajectory, not a scalar hist.",
    initial: ["v0", "theta"],
    drawKind: "xy",
    rows: [["y", "y", "m"], ["x", "x", "m"], ["vx", "vx", "m/s"], ["vy", "vy", "m/s"]],
    eval: E.projectileEval
  }),
  inclined: (spec) => algebraic(spec, {
    equation: "a=g(sin\u03B8\u2212\u03BC cos\u03B8), g=9.81",
    assumptions: "Constant g=9.81 m/s\xB2. +s is down the plane. Friction points up the plane, which is the catalog formula. N=m g cos\u03B8.",
    initial: ["v0"],
    rows: [["a", "a", "m/s\xB2"], ["v", "v", "m/s"], ["s", "s", "m"], ["N", "N", "N"]],
    eval: E.inclinedEval
  }),
  atwood: (spec) => algebraic(spec, {
    equation: "a=(m1\u2212m2)/(m1+m2)\xB7g, m1=mRatio, m2=1 kg",
    assumptions: "Ideal vertical Atwood machine, g=9.81. \u03BC does not enter: a vertical string has no surface for Coulomb friction.",
    rows: [["a", "a", "m/s\xB2"], ["m1", "m1", "kg"], ["m2", "m2", "kg"]],
    eval: (p) => E.atwoodEval(p)
  }),
  circular: (spec) => algebraic(spec, {
    equation: "a=\u03C9\xB2 r",
    assumptions: "Uniform circular motion. Canvas draws the circular path in the plane.",
    drawKind: "xy",
    rows: [["a", "ac", "m/s\xB2"], ["x", "x", "m"], ["y", "y", "m"]],
    eval: E.circularEval
  }),
  "rigid-plane": (spec) => algebraic(spec, {
    equation: "I \u03B1 = torque; rolling a=g sin\u03B8/(1+I/(m r\xB2)) with m=r=1",
    assumptions: "Goldstein rigid body. Slope is in degrees. I is about the center. No slip: a=g sin\u03B8 / (1+I).",
    rows: [["a", "a", "m/s\xB2"]],
    eval: (p) => {
      const I = Math.max(0, P(p, "I", 0.5));
      const slope = P(p, "slope", 0) * Math.PI / 180;
      const a = G * Math.sin(slope) / (1 + I);
      return { val: a, a };
    }
  }),
  collision: (spec) => algebraic(spec, {
    equation: "v1n=(m1\u2212e m2)/(m1+m2)\xB7u1n, v2n=m1(1+e)/(m1+m2)\xB7u1n",
    assumptions: "m2=1, u1=1, u2=0. e is the normal restitution. Tangential velocity is unchanged. angle is the impact normal. Canvas sketches the impact-normal path.",
    drawKind: "xy",
    rows: [["v1", "v1", "m/s"], ["v2", "v2", "m/s"], ["e", "e"]],
    eval: (p) => E.collisionEval(p)
  }),
  "variable-mass": (spec) => algebraic(spec, {
    equation: "v=\u2212u ln(m/m0), m0=1 kg, a(0)=u \u1E41/m0",
    assumptions: "Tsiolkovsky, no gravity, no external force. \u1E41 is the propellant mass-loss rate. m is held at or above 0.05 kg.",
    rows: [["a0", "a0", "m/s\xB2"], ["v", "v", "m/s"], ["m", "m", "kg"]],
    eval: E.rocketEval
  }),
  noninertial: (spec) => algebraic(spec, {
    equation: "a=a_frame\u22122 \u03C9\xD7v, v0=(1,0) m/s",
    assumptions: "Horizontal frame. \u03C9 is vertical. The initial velocity is 1 m/s along x so the Coriolis term is defined.",
    rows: [["ay", "ay", "m/s\xB2"], ["ax", "ax", "m/s\xB2"], ["|a|", "aMag", "m/s\xB2"]],
    eval: (p) => E.noninertialEval(p)
  }),
  "pendulum-chain": (spec) => algebraic(spec, {
    equation: "\u03B8''=\u2212(g/L) sin\u03B8",
    assumptions: "Simple pendulum. Mass cancels in the acceleration and remains in the energy. g=9.81.",
    initial: ["theta0"],
    rows: [["\u03B1", "alpha", "rad/s\xB2"], ["\u03B8", "thetaDeg", "\xB0"], ["E", "E", "J"]],
    reset: E.pendulumReset,
    integrate: true,
    eval: E.pendulumEval
  }),
  orbit: (spec) => algebraic(spec, {
    equation: "a=M/r\xB2 (G=1); r_a=r_p(1+e)/(1\u2212e) for e<1",
    assumptions: "G=1. a_c uses r0. e_osc is the osculating eccentricity of a perpendicular launch at speed v0. r_a uses the eccentricity knob with periapsis r0. Canvas draws the focus-origin conic for the e knob.",
    initial: ["v0", "r0"],
    drawKind: "xy",
    rows: [["a", "ac"], ["e_osc", "eOsc"], ["r_a", "rA"], ["v_peri", "vPeri"]],
    eval: (p) => E.orbitEval(p)
  }),
  sho: (spec) => algebraic(spec, {
    equation: "x''=\u2212(k/m) x",
    assumptions: "Closed form x=x0 cos(\u03C9 t), \u03C9=sqrt(k/m), from t=0.",
    initial: ["x0"],
    rows: [["a", "a", "m/s\xB2"], ["x", "x", "m"], ["\u03C9", "omega", "rad/s"]],
    eval: E.shoEval
  }),
  damped: (spec) => algebraic(spec, {
    equation: "m x''+c x'+k x=0, m=1, x(0)=1, v(0)=0",
    assumptions: "Mass is 1 kg. \u03B6=c/(2\u221Ak). The closed form covers under-, critical, and over-damping.",
    rows: [["\u03B6", "zeta"], ["x", "x", "m"], ["\u03C90", "omega0", "rad/s"]],
    eval: E.dampedEval
  }),
  forced: (spec) => algebraic(spec, {
    equation: "x''+c x'+x=F0 cos(2\u03C0 f t), m=k=1",
    assumptions: "Steady-state amplitude. \u03C90=1 because k=m=1. fDrive is in hertz.",
    rows: [["A", "A", "m"], ["\u03C6", "phi", "rad"]],
    eval: (p) => E.forcedEval(p)
  }),
  coupled: (spec) => algebraic(spec, {
    equation: "x_i''=\u2212x_i+\u03BA(x_{i\u22121}\u22122x_i+x_{i+1}), fixed ends",
    assumptions: "Unit on-site springs. Highest-mode \u03C9^2=1+4\u03BA sin^2(q/2), q=N\u03C0/(N+1).",
    rows: [["\u03C9_max", "omegaMax", "rad/s"], ["a1", "a1", "m/s\xB2"], ["N", "N"]],
    eval: (p) => E.coupledEval(p)
  }),
  "nonlinear-osc": (spec) => algebraic(spec, {
    equation: "x''+x+\u03B2 x\xB3=F cos(t), x(0)=1, v(0)=0",
    assumptions: "Undamped driven Duffing with \u03C9=1. No van der Pol term: the knobs are \u03B2 and the drive.",
    rows: [["a", "a"], ["x", "x"], ["v", "v"]],
    reset: E.duffingReset,
    integrate: true,
    eval: E.duffingEval
  })
};

// js/models/fam/builders-waves.js
var E2 = { ...evals_mechanics_exports, ...evals_waves_exports, ...evals_thermo_exports, ...evals_em_exports, ...evals_quantum_exports, ...evals_structures_exports, ...evals_fluids_exports, ...evals_discrete_exports };
var BUILDERS_WAVES = {
  wave1d: (spec) => algebraic(spec, {
    equation: "y=sin(kx\u2212\u03C9t), \u03C9=2\u03C0f, k=\u03C9/c, A=1",
    assumptions: "Unit amplitude. \u03BB=c/f.",
    rows: [["\u03BB", "lam"], ["k", "k"], ["y(1)", "yProbe"]],
    eval: E2.wave1dEval
  }),
  wave2d: (spec) => algebraic(spec, {
    equation: "c=\u221A(T/\u03C1), \u03C9_11=\u03C0 c \u221A2 on the unit square",
    assumptions: "Linear membrane, mode (1,1). Pain.",
    rows: [["c", "c"], ["\u03C9", "omega", "rad/s"], ["y", "yMid"]],
    eval: E2.wave2dEval
  }),
  interfere: (spec) => algebraic(spec, {
    equation: "I/I0=cos\xB2(\u03C6/2), \u03B2=\u03BB/d",
    assumptions: "Equal amplitudes. On-axis phase is the phi knob. Screen distance L=1 for the fringe spacing.",
    rows: [["I", "I"], ["\u03B2", "beta"]],
    eval: (p) => E2.interfereEval(p)
  }),
  diffract: (spec) => algebraic(spec, {
    equation: "y_min=\u03BB L/a",
    assumptions: "Paraxial single-slit first minimum. Same length unit for a, \u03BB, and L.",
    rows: [["y1", "yMin"], ["\u03B2", "beta"]],
    eval: (p) => E2.diffractEval(p)
  }),
  doppler: (spec) => algebraic(spec, {
    equation: "f'/f=(1+vo cos\u03B8)/(1\u2212vs cos\u03B8)",
    assumptions: "vs and vo are fractions of the wave speed. Positive vs is toward the observer. Positive vo is toward the source.",
    rows: [["f'/f", "ratio"]],
    eval: (p) => E2.dopplerEval(p)
  }),
  "geo-optics": (spec) => algebraic(spec, {
    equation: "n1 sin\u03B81=n2 sin\u03B82, n1=1",
    assumptions: "Snell. tir=1 when the ray is totally reflected. Hecht.",
    rows: [["\u03B82", "theta2", "\xB0"], ["TIR", "tir"]],
    eval: (p) => E2.snellEval(p)
  }),
  lens: (spec) => algebraic(spec, {
    equation: "1/u+1/v=1/f",
    assumptions: "Signed distances as stored. Lateral magnification m=\u2212v/u. Canvas is a thin-lens ray sketch (Hecht).",
    drawKind: "lens",
    rows: [["v", "v", "cm"], ["m", "m"], ["h_i", "hi", "cm"]],
    eval: (p) => E2.lensEval(p)
  }),
  prism: (spec) => algebraic(spec, {
    equation: "\u03B4\u2248(n\u22121)A",
    assumptions: "Thin-prism limit, A in degrees. deltaMin is the exact symmetric minimum deviation.",
    rows: [["\u03B4", "delta", "\xB0"], ["\u03B4_min", "deltaMin", "\xB0"]],
    eval: (p) => E2.prismEval(p)
  }),
  "opt-interfere": (spec) => algebraic(spec, {
    equation: "\u03B2=\u03BB L/d, L=1 m",
    assumptions: "Young. d is in mm, \u03BB in nm. Hecht.",
    rows: [["\u03B2", "betaMm", "mm"]],
    eval: (p) => E2.optInterfereEval(p)
  }),
  "opt-diffract": (spec) => algebraic(spec, {
    equation: "y=\u03BB L/a",
    assumptions: "Fraunhofer slit. a in mm, \u03BB in nm, L in m.",
    rows: [["y", "yMm", "mm"]],
    eval: (p) => E2.optDiffractEval(p)
  }),
  polarization: (spec) => algebraic(spec, {
    equation: "I=I0 cos\xB2\u03B8",
    assumptions: "Malus. I0=1. dphi is retarder phase in degrees and does not change this intensity.",
    rows: [["I", "I"], ["\u03B4", "dphi", "\xB0"]],
    eval: (p) => E2.malusEval(p)
  }),
  fiber: (spec) => algebraic(spec, {
    equation: "NA=\u221A(n_core\xB2\u2212n_clad\xB2)",
    assumptions: "Step-index acceptance. Hecht.",
    rows: [["NA", "NA"], ["\u03B8_c", "thetaC", "\xB0"]],
    eval: (p) => E2.fiberEval(p)
  }),
  laser: (spec) => algebraic(spec, {
    equation: "net=g L\u2212loss",
    assumptions: "g is a gain coefficient (1/m) and loss is a dimensionless single-pass loss. Siegman.",
    rows: [["net", "net"], ["gL", "gL"]],
    eval: (p) => E2.laserEval(p)
  }),
  nlo: (spec) => algebraic(spec, {
    equation: "\u03B7\u221D\u03C7\xB2 sinc\xB2(\u0394k/2), L=1",
    assumptions: "Plane-wave second harmonic, Boyd. L=1 in the knob units.",
    rows: [["\u03B7", "eta"]],
    eval: (p) => E2.nloEval(p)
  }),
  qoptics: (spec) => algebraic(spec, {
    equation: "V=e^{\u22122r}, n\u0304=|\u03B1|\xB2+sinh\xB2 r",
    assumptions: "Single-mode squeezed state. Gerry & Knight.",
    rows: [["V", "V"], ["n", "nbar"]],
    eval: (p) => E2.qopticsEval(p)
  })
};

// js/models/fam/builders-thermo.js
var E3 = { ...evals_mechanics_exports, ...evals_waves_exports, ...evals_thermo_exports, ...evals_em_exports, ...evals_quantum_exports, ...evals_structures_exports, ...evals_fluids_exports, ...evals_discrete_exports };
var BUILDERS_THERMO = {
  "ideal-gas": (spec) => algebraic(spec, {
    equation: "P2/P0=2^{\u2212n}, T2=T0\xB72^{1\u2212n}",
    assumptions: "Polytropic ideal gas probed at V/V0=2. \xC7engel & Boles.",
    rows: [["P2/P0", "pRatio"], ["T2", "T2", "K"]],
    eval: (p) => E3.idealGasEval(p)
  }),
  "heat-engine": (spec) => algebraic(spec, {
    equation: "\u03B7_C=1\u22121/TR, \u03B7_Otto=1\u2212r^{1\u2212\u03B3}, \u03B3=1.4",
    assumptions: "TR=Th/Tc (Carnot). Otto \u03B7=1\u2212r^{1\u2212\u03B3} with fixed cold-air \u03B3=1.4 (\xC7engel & Boles); \u03B3 is not a live knob.",
    rows: [["\u03B7_C", "etaC"], ["\u03B7_Otto", "etaO"]],
    eval: (p) => E3.heatEngineEval(p)
  }),
  convection: (spec) => algebraic(spec, {
    equation: "q=h\xB71 K; Nu=0.664 Re^{1/2} Pr^{1/3}",
    assumptions: "Newton cooling per kelvin. Blasius flat plate, L=1 m, air \u03BD=1.5e\u22125, Pr=0.7, k=0.026.",
    rows: [["q", "q", "W/m\xB2"], ["h_Bl", "hBl", "W/(m\xB2K)"]],
    eval: (p) => E3.convectionEval(p)
  }),
  radiation: (spec) => algebraic(spec, {
    equation: "q=\u03B5 \u03C3 T\u2074",
    assumptions: "Surface exitance. \u03C3=5.670374419e\u22128. No incoming irradiation.",
    rows: [["q", "q", "W/m\xB2"]],
    eval: (p) => E3.radiationEval(p)
  }),
  "kinetic-gas": (spec) => algebraic(spec, {
    equation: "v_rms=\u221A(3 R T / M)",
    assumptions: "Ideal gas. mMol is the molar mass in g/mol. R=8.314 J/(mol\xB7K).",
    rows: [["v_rms", "vrms", "m/s"], ["v_p", "vp", "m/s"]],
    eval: (p) => E3.kineticEval(p)
  }),
  brownian: (spec) => algebraic(spec, {
    equation: "<x\xB2>=2 D \u03C4",
    assumptions: "Ensemble mean-square displacement in one dimension. \u03C4 is the time knob. No random path is drawn.",
    rows: [["<x\xB2>", "msd"]],
    eval: (p) => E3.brownianEval(p)
  }),
  ising: (spec) => algebraic(spec, {
    equation: "m=tanh((4 J m+H)/T)",
    assumptions: "Mean-field Ising, coordination 4. Negative J is not a staggered antiferromagnet in this scalar equation.",
    rows: [["m", "m"]],
    eval: (p) => E3.isingEval(p)
  }),
  percolation: (spec) => algebraic(spec, {
    equation: "S=(1+p)/(1\u2212p)",
    assumptions: "Exact one-dimensional site percolation. Not a 2D random lattice.",
    rows: [["S", "S"]],
    eval: (p) => E3.percolationEval(p)
  }),
  "entropy-mix": (spec) => algebraic(spec, {
    equation: "\u0394s/R=\u2212x ln x\u2212(1\u2212x) ln(1\u2212x)",
    assumptions: "Ideal binary mixture, one mole. Temperature cancels in \u0394s and remains in \u0394g=\u2212T \u0394s.",
    rows: [["\u0394s/R", "sOverR"], ["\u0394g/R", "gOverR", "K"]],
    eval: (p) => E3.entropyEval(p)
  })
};

// js/models/fam/builders-em.js
var E4 = { ...evals_mechanics_exports, ...evals_waves_exports, ...evals_thermo_exports, ...evals_em_exports, ...evals_quantum_exports, ...evals_structures_exports, ...evals_fluids_exports, ...evals_discrete_exports };
var BUILDERS_EM = {
  electrostatic: (spec) => algebraic(spec, {
    equation: "E=q/(4 \u03C0 \u03B50 r\xB2)",
    assumptions: "Point charge in SI. r is the geometry knob. Griffiths Ch. 2.",
    rows: [["E", "E", "N/C"]],
    eval: (p) => E4.coulombEval(p)
  }),
  fieldlines: (spec) => algebraic(spec, {
    equation: "E_axis=(1/(4\u03C0\u03B50)) 2p/r\xB3",
    assumptions: "Ideal dipole on axis. r is the separation knob. Griffiths Ch. 3.",
    rows: [["E", "E", "N/C"]],
    eval: (p) => E4.dipoleEval(p)
  }),
  gauss: (spec) => algebraic(spec, {
    equation: "E(R)=\u03C1 R/(3 \u03B50)",
    assumptions: "Uniform ball, field at the surface. Griffiths Ch. 2.",
    rows: [["E", "E", "N/C"], ["Q", "Q", "C"]],
    eval: (p) => E4.gaussEval(p)
  }),
  capacitor: (spec) => algebraic(spec, {
    equation: "C=\u03B5_r \u03B50 A/d",
    assumptions: "Parallel plate. eps is the relative permittivity.",
    rows: [["C", "C", "F"]],
    eval: (p) => E4.capacitorEval(p)
  }),
  "dc-network": (spec) => algebraic(spec, {
    equation: "I=E/R",
    assumptions: "Single-loop Ohm law. Nilsson.",
    rows: [["I", "I", "A"], ["V", "V", "V"]],
    eval: (p) => E4.dcEval(p)
  }),
  rlc: (spec) => algebraic(spec, {
    equation: "\u03C90=1/\u221A(LC), \u03B1=R/(2L)",
    assumptions: "Series RLC. wd=sqrt(\u03C90\xB2\u2212\u03B1\xB2) when underdamped, otherwise 0.",
    rows: [["\u03C90", "w0", "rad/s"], ["\u03B1", "alpha", "1/s"], ["\u03C9d", "wd", "rad/s"]],
    eval: (p) => E4.rlcEval(p)
  }),
  ac: (spec) => algebraic(spec, {
    equation: "|Z|=sec \u03C6 for R=1 \u03A9; L_eq=tan\u03C6 / \u03C9",
    assumptions: "phi is the impedance angle. Frequency enters the inductance that would produce that angle.",
    rows: [["|Z|", "Z", "\u03A9"], ["L_eq", "Leq", "H"]],
    eval: (p) => E4.acEval(p)
  }),
  magnetostat: (spec) => algebraic(spec, {
    equation: "B=\u03BC0 I/(2 R)",
    assumptions: "Center of a current loop. Griffiths Ch. 5.",
    rows: [["B", "B", "T"]],
    eval: (p) => E4.biotEval(p)
  }),
  lorentz: (spec) => algebraic(spec, {
    equation: "F_E=q E, r_c=m v/(|q| B), q=m=1",
    assumptions: "Normalized charge and mass. Magnetic force magnitude is |q| v B for v perpendicular to B.",
    rows: [["F_E", "FE", "N"], ["F_B", "FB", "N"], ["r_c", "rC", "m"]],
    eval: (p) => E4.lorentzEval(p)
  }),
  induction: (spec) => algebraic(spec, {
    equation: "\u03B5=\u2212N d\u03A6/dt",
    assumptions: "The dPhi knob is the flux derivative. Griffiths Ch. 7.",
    rows: [["\u03B5", "emf", "V"]],
    eval: (p) => E4.faradayEval(p)
  }),
  inductance: (spec) => algebraic(spec, {
    equation: "M=k L",
    assumptions: "L1=L2=L, so M=k sqrt(L1 L2)=k L.",
    rows: [["M", "M", "H"]],
    eval: (p) => E4.mutualEval(p)
  }),
  maxwell: (spec) => algebraic(spec, {
    equation: "\u03BB=c/f",
    assumptions: "Vacuum plane wave. The cavity comparison uses a 1 m cube and mode index n: f=(c/2)sqrt(1+n\xB2).",
    rows: [["\u03BB", "lam", "m"], ["f_cav", "fCav", "Hz"]],
    eval: (p) => E4.maxwellEval(p)
  }),
  tline: (spec) => algebraic(spec, {
    equation: "\u03C4=len/c, Z=Z0",
    assumptions: "Lossless TEM line at vacuum speed. Length is in meters.",
    rows: [["Z0", "Z0", "\u03A9"], ["\u03C4", "delay", "s"]],
    eval: (p) => E4.tlineEval(p)
  }),
  antenna: (spec) => algebraic(spec, {
    equation: "AF=|cos((2\u03C0 d+\u03B4)/2)| at endfire",
    assumptions: "Balanis. len and d are in wavelengths. phi is the inter-element phase in degrees. Element factor (1\u2212cos(\u03C0 len))\xB2 at broadside.",
    rows: [["AF", "AF"], ["F", "elem"]],
    eval: (p) => E4.antennaEval(p)
  })
};

// js/models/fam/builders-quantum.js
var E5 = { ...evals_mechanics_exports, ...evals_waves_exports, ...evals_thermo_exports, ...evals_em_exports, ...evals_quantum_exports, ...evals_structures_exports, ...evals_fluids_exports, ...evals_discrete_exports };
var BUILDERS_QUANTUM = {
  well1d: (spec) => algebraic(spec, {
    equation: "E1=\u03C0\xB2/(2 a\xB2), \u210F=m=1",
    assumptions: "Infinite square well, n=1. V0 is only a comparison with the finite-well depth.",
    rows: [["E1", "E1"], ["E1<V0", "above"]],
    eval: (p) => E5.wellEval(p)
  }),
  tunnel: (spec) => algebraic(spec, {
    equation: "T\u2248exp(\u22122 \u03BA w), \u03BA=\u221A(2(V0\u2212E))",
    assumptions: "Thick-barrier estimate, \u210F=m=1. T=1 when E\u2265V0. Griffiths QM.",
    rows: [["T", "T"], ["\u03BA", "kappa"]],
    eval: (p) => E5.tunnelEval(p)
  }),
  qho: (spec) => algebraic(spec, {
    equation: "E0=\u210F\u03C9/2, \u03C9_+=\u03C9\u221A(1+coup)",
    assumptions: "\u210F=1. The coupling raises one normal frequency of two oscillators.",
    rows: [["E0", "E0"], ["\u03C9+", "wPlus"]],
    eval: (p) => E5.qhoEval(p)
  }),
  hydrogen: (spec) => algebraic(spec, {
    equation: "E=\u221213.6 eV/n\xB2",
    assumptions: "n, l, m are rounded to integers. valid=1 when 0\u2264l\u2264n\u22121 and |m|\u2264l.",
    rows: [["E", "E", "eV"], ["valid", "valid"]],
    eval: (p) => E5.hydrogenEval(p)
  }),
  angmom: (spec) => algebraic(spec, {
    equation: "g_J=1+[j(j+1)+s(s+1)\u2212l(l+1)]/(2j(j+1))",
    assumptions: "s=1/2 and l=j\u22121/2. Fine-structure shift is coup\xB7L\xB7S.",
    rows: [["g_J", "gJ"], ["E_fs", "Efs"]],
    eval: (p) => E5.angmomEval(p)
  }),
  entangle: (spec) => algebraic(spec, {
    equation: "S=2\u221A(1+C\xB2)",
    assumptions: "Two-qubit CHSH maximum for concurrence C. The correlator uses the measurement angle.",
    rows: [["S", "S"], ["E", "corr"]],
    eval: (p) => E5.entangleEval(p)
  }),
  qgate: (spec) => algebraic(spec, {
    equation: "P(1)=sin\xB2(\u03B8/2)",
    assumptions: "Ry on |0>. flipped=1 when the control knob is nonzero.",
    rows: [["P1", "P1"], ["flip", "flipped"]],
    eval: (p) => E5.qgateEval(p)
  }),
  qalgo: (spec) => algebraic(spec, {
    equation: "P=sin\xB2((2k+1)\u03B8), sin\u03B8=1/\u221AN",
    assumptions: "Grover on N=2^{nBits} with one marked item. Nielsen & Chuang.",
    rows: [["P", "prob"], ["N", "N"]],
    eval: (p) => E5.groverEval(p)
  }),
  wavepacket: (spec) => algebraic(spec, {
    equation: "E=1/(8\u03C3\xB2)+V, \u03C3(t)=\u03C3\u221A(1+(t/(2\u03C3\xB2))\xB2)",
    assumptions: "Free Gaussian packet plus a constant potential. \u210F=m=1. Griffiths QM.",
    rows: [["E", "E"], ["\u03C3(t)", "sigmaT"]],
    eval: E5.packetEval
  }),
  "rel-kin": (spec) => algebraic(spec, {
    equation: "\u03B3=1/\u221A(1\u2212\u03B2\xB2)",
    assumptions: "Special relativity, French. \u03B2 is clamped below 1.",
    rows: [["\u03B3", "gamma"], ["1/\u03B3", "contract"]],
    eval: (p) => E5.relKinEval(p)
  }),
  "rel-dyn": (spec) => algebraic(spec, {
    equation: "m c\xB2=\u221A(E\xB2\u2212p\xB2 c\xB2), c=1",
    assumptions: "Timelike interval. A spacelike pair reports m=0 and timelike=0.",
    rows: [["m", "m"], ["timelike", "timelike"]],
    eval: (p) => E5.relDynEval(p)
  }),
  compton: (spec) => algebraic(spec, {
    equation: "\u0394\u03BB=\u03BB_C(1\u2212cos\u03B8)",
    assumptions: "Electron at rest. \u0394\u03BB is in pm. E is in keV. \u03BB_C=2.42631023867 pm.",
    rows: [["\u0394\u03BB", "dLam", "pm"], ["E'", "Ep", "keV"]],
    eval: (p) => E5.comptonEval(p)
  }),
  radioactive: (spec) => algebraic(spec, {
    equation: "N=N0 e^{\u2212\u03BB t}",
    assumptions: "Single exponential. Krane. Activity A=\u03BB N.",
    rows: [["N", "N"], ["A", "A"], ["t_half", "half"]],
    eval: E5.decayEval
  })
};

// js/models/fam/builders-structures.js
var E6 = { ...evals_mechanics_exports, ...evals_waves_exports, ...evals_thermo_exports, ...evals_em_exports, ...evals_quantum_exports, ...evals_structures_exports, ...evals_fluids_exports, ...evals_discrete_exports };
var BUILDERS_STRUCTURES = {
  axial: (spec) => algebraic(spec, {
    equation: "\u03C3=F/A",
    assumptions: "Uniform uniaxial stress. Hibbeler.",
    rows: [["\u03C3", "sigma", "Pa"]],
    eval: (p) => E6.axialEval(p)
  }),
  "beam-bend": (spec) => algebraic(spec, {
    equation: "M=P L/4, \u03B4=P L\xB3/(48 EI)",
    assumptions: "Simply supported, center point load, Euler\u2013Bernoulli.",
    rows: [["M", "M", "N\xB7m"], ["\u03B4", "delta", "m"], ["M/EI", "curvature", "1/m"]],
    eval: (p) => E6.beamBendEval(p)
  }),
  "beam-defl": (spec) => algebraic(spec, {
    equation: "residual=\u03B4\u2212\u03B8/2 on a unit length",
    assumptions: "Pure end moment on a beam of length 1: the tip values satisfy \u03B4=\u03B8 L/2. The residual is that check.",
    rows: [["resid", "residual"], ["\u03B4", "delta"], ["\u03B8", "theta"]],
    eval: (p) => E6.beamDeflEval(p)
  }),
  buckling: (spec) => algebraic(spec, {
    equation: "Pcr=\u03C0\xB2 EI/L\xB2",
    assumptions: "Pinned\u2013pinned Euler column. Hibbeler.",
    rows: [["Pcr", "Pcr", "N"]],
    eval: (p) => E6.bucklingEval(p)
  }),
  torsion: (spec) => algebraic(spec, {
    equation: "\u03C4=16 T/(\u03C0 d\xB3)",
    assumptions: "Solid circular shaft. Hibbeler.",
    rows: [["\u03C4", "tau", "Pa"]],
    eval: (p) => E6.torsionEval(p)
  }),
  combined: (spec) => algebraic(spec, {
    equation: "\u03C31=\u03C3x/2+\u221A((\u03C3x/2)\xB2+\u03C4\xB2), \u03C3x=N+M, \u03C4=T",
    assumptions: "Section moduli normalized to 1 in the catalog units.",
    rows: [["\u03C31", "s1"], ["\u03C3x", "sx"]],
    eval: (p) => E6.combinedEval(p)
  }),
  truss: (spec) => algebraic(spec, {
    equation: "i=b\u2212(2j\u22123)",
    assumptions: "Plane-truss Maxwell count. Positive i is indeterminate; negative i is a mechanism.",
    rows: [["i", "indeterminacy"]],
    eval: (p) => E6.trussEval(p)
  }),
  frame: (spec) => algebraic(spec, {
    equation: "drift=1/k under a unit load",
    assumptions: "Stated story stiffness. Aspect ratio is span/story.",
    rows: [["drift", "drift"], ["aspect", "aspect"]],
    eval: (p) => E6.frameEval(p)
  })
};

// js/models/fam/builders-fluids.js
var E7 = { ...evals_mechanics_exports, ...evals_waves_exports, ...evals_thermo_exports, ...evals_em_exports, ...evals_quantum_exports, ...evals_structures_exports, ...evals_fluids_exports, ...evals_discrete_exports };
var BUILDERS_FLUIDS = {
  "ideal-fluid": (spec) => algebraic(spec, {
    equation: "q=\xBD \u03C1 v\xB2, Q=A v, \u03C1=1000",
    assumptions: "Water. One section, so the Bernoulli term shown is the dynamic pressure.",
    rows: [["q", "q", "Pa"], ["Q", "Q", "m\xB3/s"]],
    eval: (p) => E7.bernoulliEval(p)
  }),
  viscous: (spec) => algebraic(spec, {
    equation: "Q=\u03C0 R\u2074 \u0394P/(8 \u03BC L), \u0394P/L=1; \u03C4=\u03BC U/D",
    assumptions: "Reference pressure gradient 1 Pa/m. Couette gap equals D.",
    rows: [["Q", "Q", "m\xB3/s"], ["\u03C4", "tau", "Pa"]],
    eval: (p) => E7.poiseuilleEval(p)
  }),
  "boundary-layer": (spec) => algebraic(spec, {
    equation: "c_f=0.664/\u221ARe, \u03B4/x=5/\u221ARe",
    assumptions: "Smooth-plate Blasius. rough is \u03B5/L and enters only Re_\u03B5=Re\xB7rough.",
    rows: [["cf", "cf"], ["\u03B4/x", "delta"], ["Re_\u03B5", "ReEps"]],
    eval: (p) => E7.blasiusEval(p)
  }),
  turbulence: (spec) => algebraic(spec, {
    equation: "\u03BD_t=C\u03BC k\xB2/\u03B5",
    assumptions: "C\u03BC and the filter width are the supplied closure parameters. k and \u03B5 are not invented.",
    rows: [["C\u03BC", "Cmu"], ["\u0394", "Delta"]],
    eval: (p) => E7.turbEval(p)
  }),
  multiphase: (spec) => algebraic(spec, {
    equation: "\u03BB_c=\u221A(\u03C3/(\u0394\u03C1 g))",
    assumptions: "g=9.81. White capillary length.",
    rows: [["\u03BB_c", "lam", "m"]],
    eval: (p) => E7.capillaryEval(p)
  }),
  plasma: (spec) => algebraic(spec, {
    equation: "\u03C9_p=\u221A(n e\xB2/(\u03B50 m)), \u03C9_c=eB/m",
    assumptions: "Electron mass. T is in eV for the Debye length. Chen.",
    rows: [["\u03C9_p", "wp", "rad/s"], ["\u03C9_c", "wc", "rad/s"], ["\u03BB_D", "lamD", "m"]],
    eval: (p) => E7.plasmaEval(p)
  }),
  supercon: (spec) => algebraic(spec, {
    equation: "\u03BA=\u03BB/\u03BE",
    assumptions: "Ginzburg\u2013Landau. typeII=1 when \u03BA>1/\u221A2. Tinkham.",
    rows: [["\u03BA", "kappa"], ["II", "typeII"]],
    eval: (p) => E7.superconEval(p)
  }),
  magnetism: (spec) => algebraic(spec, {
    equation: "kT_C=(2/3) z J S(S+1), z=6, S=1/2",
    assumptions: "k_B=1. Anisotropy K is reported separately and is not folded into T_C.",
    rows: [["T_C", "Tc"], ["K", "K"]],
    eval: (p) => E7.magnetismEval(p)
  }),
  semiconductor: (spec) => algebraic(spec, {
    equation: "V_bi=(kT/q) ln(Nd\xB2/ni\xB2)",
    assumptions: "300 K, Na=Nd, ni=1e10 cm^{\u22123}. Nd is in cm^{\u22123}. dE is the band offset in eV.",
    rows: [["Vbi", "Vbi", "V"], ["\u0394E", "dE", "eV"]],
    eval: (p) => E7.semiconductorEval(p)
  }),
  topo: (spec) => algebraic(spec, {
    equation: "\u03C3_xy/(e\xB2/h)=C",
    assumptions: "Integer quantum Hall. Edge channels equal |C| only when the boundary knob is on.",
    rows: [["\u03C3", "sigma"], ["edge", "edge"]],
    eval: (p) => E7.topoEval(p)
  })
};

// js/models/fam/builders-cs.js
var E8 = { ...evals_mechanics_exports, ...evals_waves_exports, ...evals_thermo_exports, ...evals_em_exports, ...evals_quantum_exports, ...evals_structures_exports, ...evals_fluids_exports, ...evals_discrete_exports };
var BUILDERS_CS = {
  sort: (spec) => algebraic(spec, {
    equation: "insertion-sort comparisons",
    assumptions: "CLRS insertion sort. The array is 0..n\u22121 with a reversed prefix of length (1\u2212sortedness)\xB7n. n is capped at 256.",
    rows: [["comps", "comps"]],
    eval: (p) => {
      const comps = E8.insertionComps(P(p, "n", 16), P(p, "sortedness", 0));
      return { val: comps, comps };
    }
  }),
  search: (spec) => algebraic(spec, {
    equation: "probes: linear n, binary \u230Alog2 n\u230B+1, interpolation \u230Alog2 log2 n\u230B+1",
    assumptions: "collide selects the strategy: 0 linear worst case, 1 binary worst case, 2 interpolation average for uniform keys (CLRS).",
    rows: [["probes", "probes"]],
    eval: (p) => {
      const probes = E8.searchProbes(P(p, "n", 32), P(p, "collide", 0));
      return { val: probes, probes };
    }
  }),
  "graph-trav": (spec) => algebraic(spec, {
    equation: "BFS distance on a path plus p-controlled chords",
    assumptions: "CLRS BFS. Nodes are capped at 48. Chord i\u2014i+2 exists for the first floor(p(n\u22122)) vertices.",
    rows: [["dist", "dist"]],
    eval: (p) => {
      const dist = E8.bfsDist(P(p, "n", 10), P(p, "p", 0));
      return { val: dist, dist };
    }
  }),
  shortest: (spec) => algebraic(spec, {
    equation: "Dijkstra on a path of weight wSpread",
    assumptions: "CLRS Dijkstra. Nonnegative weights. Distance to the last node is (n\u22121)\xB7w, computed by the algorithm.",
    rows: [["dist", "dist"]],
    eval: (p) => {
      const dist = E8.dijkstraDist(P(p, "n", 10), P(p, "wSpread", 1));
      return { val: dist, dist };
    }
  }),
  mst: (spec) => algebraic(spec, {
    equation: "Kruskal weight",
    assumptions: "CLRS Kruskal. Path edges weigh 3. Chords i\u2014i+2 weigh 1 for the first floor(p(n\u22122)) indices. n\u226440.",
    rows: [["weight", "weight"]],
    eval: (p) => {
      const weight = E8.mstWeight(P(p, "n", 12), P(p, "p", 0));
      return { val: weight, weight };
    }
  }),
  "string-match": (spec) => algebraic(spec, {
    equation: "KMP comparison count",
    assumptions: "CLRS KMP. Pattern is a\u2026ab of length m. Text is a\u2026a of length n. Lengths are capped.",
    rows: [["comps", "comps"]],
    eval: (p) => {
      const comps = E8.kmpComparisons(P(p, "m", 4), P(p, "n", 50));
      return { val: comps, comps };
    }
  }),
  dp: (spec) => algebraic(spec, {
    equation: "0/1 knapsack",
    assumptions: "CLRS. Item i has weight (i mod 5)+1 and value (i mod 3)+1. n\u226432, capacity\u226480.",
    rows: [["value", "value"]],
    eval: (p) => {
      const value = E8.knapsack(P(p, "n", 8), P(p, "cap", 10));
      return { val: value, value };
    }
  }),
  "tree-ds": (spec) => algebraic(spec, {
    equation: "h_BST=n\u22121, h_AVL=\u2308log2(n+1)\u2309",
    assumptions: "Sequential insertion degenerates a BST. AVL height is the balanced bound. B-tree minimum degree is `order` (CLRS).",
    rows: [["h_BST", "hBst"], ["h_AVL", "hAvl"], ["h_B", "hB"]],
    eval: (p) => {
      const h = E8.treeHeights(P(p, "n", 20), P(p, "order", 2));
      return { val: h.hAvl, ...h };
    }
  }),
  uf: (spec) => algebraic(spec, {
    equation: "union-by-rank with path compression",
    assumptions: "CLRS. Unions join i with i+1. The readout is the parent-access count.",
    rows: [["ops", "ops"]],
    eval: (p) => {
      const ops = E8.ufOps(P(p, "n", 32));
      return { val: ops, ops };
    }
  }),
  heap: (spec) => algebraic(spec, {
    equation: "build-heap comparisons",
    assumptions: "CLRS sift-down heapify of n, n\u22121, \u2026, 1. n\u2264300.",
    rows: [["comps", "comps"]],
    eval: (p) => {
      const comps = E8.heapComps(P(p, "n", 20));
      return { val: comps, comps };
    }
  }),
  segtree: (spec) => algebraic(spec, {
    equation: "point-query depth = \u2308log2 n\u2309",
    assumptions: "CLRS segment tree. A point query walks one root-to-leaf path.",
    rows: [["depth", "depth"]],
    eval: (p) => {
      const n = Math.max(1, P(p, "n", 2));
      const depth = Math.ceil(Math.log2(n));
      return { val: depth, depth };
    }
  }),
  fa: (spec) => algebraic(spec, {
    equation: "|\u03B4|=|Q|\xB7|\u03A3|",
    assumptions: "Complete DFA. Hopcroft, Motwani, Ullman.",
    rows: [["transitions", "transitions"]],
    eval: (p) => {
      const transitions = Math.round(P(p, "states", 1)) * Math.round(P(p, "alpha", 1));
      return { val: transitions, transitions };
    }
  }),
  pda: (spec) => algebraic(spec, {
    equation: "|\u03B4| bound = |Q|\xB7|\u0393|\xB7|\u03A3|, |\u03A3|=2",
    assumptions: "Upper bound on a complete PDA transition relation. Not a particular grammar.",
    rows: [["bound", "bound"]],
    eval: (p) => {
      const bound = Math.round(P(p, "states", 1)) * Math.round(P(p, "stackA", 1)) * 2;
      return { val: bound, bound };
    }
  }),
  tm: (spec) => algebraic(spec, {
    equation: "|Q|\xB7|\u0393|",
    assumptions: "Sipser. Count of state/symbol pairs, not a universal simulator.",
    rows: [["pairs", "pairs"]],
    eval: (p) => {
      const pairs = Math.round(P(p, "states", 1)) * Math.round(P(p, "alpha", 1));
      return { val: pairs, pairs };
    }
  }),
  regex: (spec) => algebraic(spec, {
    equation: "Thompson NFA states \u2248 2\xB7len+2\xB7complexity",
    assumptions: "Size of a Thompson NFA for `complexity` alternations plus a literal of length `len`. Hopcroft.",
    rows: [["states", "states"]],
    eval: (p) => {
      const states = 2 * Math.round(P(p, "len", 1)) + 2 * Math.round(P(p, "complexity", 1));
      return { val: states, states };
    }
  }),
  grammar: (spec) => algebraic(spec, {
    equation: "yield=min(steps, size)",
    assumptions: "A grammar whose productions are each used at most once. The yield grows by one terminal per used production.",
    rows: [["yield", "yield"]],
    eval: (p) => {
      const yieldLen = Math.min(Math.max(0, P(p, "steps", 0)), Math.max(0, P(p, "size", 0)));
      return { val: yieldLen, yield: yieldLen };
    }
  }),
  computability: (spec) => algebraic(spec, {
    equation: "counter halts in `input` steps",
    assumptions: "Sipser. This is a total counter machine. It does not decide the halting problem. encoding selects a G\xF6del convention index and is reported as that index.",
    rows: [["steps", "steps"], ["encoding", "encoding"]],
    eval: (p) => ({
      val: P(p, "input", 0),
      steps: P(p, "input", 0),
      encoding: P(p, "encoding", 0)
    })
  }),
  complexity: (spec) => algebraic(spec, {
    equation: "log2(n!) via Stirling",
    assumptions: "CLRS comparison-sort decision-tree lower bound. Stirling series through the \xBD log term.",
    rows: [["bound", "bound"]],
    eval: (p) => {
      const n = Math.max(1, P(p, "n", 2));
      const bound = n < 2 ? 0 : (n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n)) / Math.LN2;
      return { val: bound, bound };
    }
  }),
  ca: (spec) => algebraic(spec, {
    equation: "elementary CA rule",
    assumptions: "Wolfram. Width 24, eight steps, periodic boundaries. seed sets the initial bits.",
    initial: ["seed"],
    rows: [["pop", "pop"]],
    eval: (p) => {
      const pop = E8.caPopulation(P(p, "rule", 0), P(p, "seed", 1));
      return { val: pop, pop };
    }
  }),
  "ca-app": (spec) => algebraic(spec, {
    equation: "1D sandpile topples",
    assumptions: "Height above thresh sends one grain to each neighbor. The first floor(p\xB716) sites start at threshold.",
    rows: [["topples", "topples"]],
    eval: (p) => {
      const topples = E8.sandTopples(P(p, "p", 0), P(p, "thresh", 2));
      return { val: topples, topples };
    }
  }),
  conv: (spec) => algebraic(spec, {
    equation: "MACs=L_out\xB7k\xB7channels, L_out=\u230A(8\u2212k)/stride\u230B+1",
    assumptions: "Valid convolution of a length-8 input. No feature values are invented.",
    rows: [["MACs", "macs"]],
    eval: (p) => {
      const k = Math.max(1, Math.round(P(p, "k", 1)));
      const stride = Math.max(1, Math.round(P(p, "stride", 1)));
      const ch = Math.max(1, Math.round(P(p, "ch", 1)));
      const out = Math.max(0, Math.floor((8 - k) / stride) + 1);
      const macs = out * k * ch;
      return { val: macs, macs };
    }
  }),
  "opt-algo": (spec) => algebraic(spec, {
    equation: "GD on f=x\xB2/2 with momentum",
    assumptions: "Eight steps from x=1. Velocity update v\u2190mom\xB7v+\u2207f, x\u2190x\u2212lr\xB7v.",
    rows: [["x", "x"]],
    eval: (p) => {
      let x = 1;
      let v = 0;
      const lr = P(p, "lr", 0.1);
      const mom = clamp(P(p, "mom", 0), 0, 0.999);
      for (let i = 0; i < 8; i += 1) {
        v = mom * v + x;
        x -= lr * v;
        if (!Number.isFinite(x)) {
          x = 0;
          break;
        }
        x = clamp(x, -1e6, 1e6);
      }
      return { val: x, x };
    }
  }),
  evo: (spec) => algebraic(spec, {
    equation: "deterministic \xB1mut/i trials on x\xB2",
    assumptions: "Not a random GA. Offspring are accepted only when the square decreases. Trial count is pop/5, at most 40.",
    rows: [["f", "f"]],
    eval: (p) => {
      let x = 1;
      let f = 1;
      const mut = Math.max(0, P(p, "mut", 0));
      const trials = Math.max(1, Math.min(40, Math.round(P(p, "pop", 20) / 5)));
      for (let i = 1; i <= trials; i += 1) {
        const step = mut / i;
        for (const cand of [x + step, x - step]) {
          const fc = cand * cand;
          if (fc < f) {
            f = fc;
            x = cand;
          }
        }
      }
      return { val: f, f };
    }
  }),
  pgm: (spec) => algebraic(spec, {
    equation: "P=c^{n\u22121}, c=\u03BB/(1+|\u03BB|)",
    assumptions: "Koller & Friedman chain rule for a chain that copies its parent with probability c. \u03BB is the params knob.",
    rows: [["P", "prob"]],
    eval: (p) => {
      const nodes = Math.max(1, Math.round(P(p, "nodes", 2)));
      const lam = P(p, "params", 0.5);
      const c = Math.abs(lam) / (1 + Math.abs(lam));
      const prob = c ** Math.max(0, nodes - 1);
      return { val: prob, prob };
    }
  }),
  "classical-cipher": (spec) => algebraic(spec, {
    equation: "shift=keyspace mod 26; bits=log2(keyspace)",
    assumptions: "Caesar shift on a 26-letter alphabet. The bit count is the key-space logarithm, not an attack.",
    rows: [["shift", "shift"], ["bits", "bits"]],
    eval: (p) => {
      const keyspace = Math.max(1, P(p, "keyspace", 26));
      return { val: Math.log2(keyspace), shift: Math.round(keyspace) % 26, bits: Math.log2(keyspace) };
    }
  }),
  "ecc-code": (spec) => algebraic(spec, {
    equation: "Hamming n=2^m\u22121, m=K",
    assumptions: "Binary Hamming code with m parity bits. The rate knob is compared with k/n, k=n\u2212m.",
    rows: [["n", "n"], ["gap", "gap"]],
    eval: (p) => {
      const m = clamp(Math.round(P(p, "K", 3)), 2, 12);
      const n = 2 ** m - 1;
      const k = n - m;
      const rateH = k / n;
      const gap = Math.abs(P(p, "rate", 0) - rateH);
      return { val: n, n, gap };
    }
  }),
  infotheory: (spec) => algebraic(spec, {
    equation: "H=\u2212p log2 p\u2212(1\u2212p) log2(1\u2212p); C=\xBD log2(1+snr)",
    assumptions: "Cover & Thomas. Binary entropy. Real AWGN spectral efficiency at the stated SNR in dB, bandwidth 1 Hz.",
    rows: [["H", "H", "bit"], ["C", "C", "bit"]],
    eval: (p) => {
      const H = E8.binaryEntropy(P(p, "p", 0.5));
      const snr = 10 ** (P(p, "snr", 0) / 10);
      const cap = 0.5 * Math.log2(1 + snr);
      return { val: H, H, C: cap };
    }
  }),
  compress: (spec) => algebraic(spec, {
    equation: "H \u2264 L < H+1",
    assumptions: "Zipf masses \u221D1/i. Huffman redundancy is less than 1 bit (Cover & Thomas). n=min(dict,512).",
    rows: [["H", "H", "bit"], ["L_hi", "Lhi", "bit"]],
    eval: (p) => {
      const H = E8.zipfEntropy(P(p, "dict", 16));
      return { val: H, H, Lhi: H + 1 };
    }
  }),
  zkp: (spec) => algebraic(spec, {
    equation: "soundness error = 2^{\u2212rounds}",
    assumptions: "Honest completeness 1 and a public one-bit challenge. Not a production proof system. Goldwasser, Micali, Rackoff.",
    rows: [["\u03B5", "eps"]],
    eval: (p) => {
      const rounds = Math.max(0, Math.round(P(p, "rounds", 1)));
      const eps = 2 ** -rounds;
      return { val: eps, eps };
    }
  }),
  mem: (spec) => algebraic(spec, {
    equation: "compulsory faults = \u2308refs / page\u2309",
    assumptions: "One sequential pass. Each new page faults once. page is the page size in address units.",
    rows: [["faults", "faults"]],
    eval: (p) => {
      const page = pos(P(p, "page", 1), 1e-9);
      const refs = Math.max(0, P(p, "refs", 0));
      const faults = Math.ceil(refs / page);
      return { val: faults, faults };
    }
  }),
  deadlock: (spec) => algebraic(spec, {
    equation: "Banker's algorithm, need_i=nProc, available=nRes",
    assumptions: "Allocation is zero. Each process still needs nProc units of one resource type. Safe when nRes\u2265nProc.",
    rows: [["safe", "safe"]],
    eval: (p) => {
      const nProc = Math.max(1, Math.round(P(p, "nProc", 1)));
      const nRes = Math.max(0, Math.round(P(p, "nRes", 0)));
      const safe = nRes >= nProc ? 1 : 0;
      return { val: safe, safe };
    }
  }),
  fs: (spec) => algebraic(spec, {
    equation: "blocks=\u2308fsize/block\u2309",
    assumptions: "inode direct block count is 12. indirect=1 when more blocks are required. Silberschatz.",
    rows: [["blocks", "blocks"], ["indirect", "indirect"]],
    eval: (p) => {
      const block = pos(P(p, "block", 1), 1e-9);
      const blocks = Math.ceil(Math.max(0, P(p, "fsize", 0)) / block);
      return { val: blocks, blocks, indirect: blocks > 12 ? 1 : 0 };
    }
  }),
  netproto: (spec) => algebraic(spec, {
    equation: "min(bw, (MSS/RTT) \u221A(3/(2p)))",
    assumptions: "Mathis et al. 1997, MSS=1460 bytes, bw in Mbps, rtt in ms. Zero loss returns bw.",
    rows: [["rate", "rate", "Mbps"]],
    eval: (p) => {
      const rate = E8.tcpMbps(P(p, "bw", 1), P(p, "rtt", 20), P(p, "loss", 0));
      return { val: rate, rate };
    }
  }),
  consensus: (spec) => algebraic(spec, {
    equation: "quorum=\u230An/2\u230B+1; Byzantine f=\u230A(n\u22121)/3\u230B",
    assumptions: "fault 0 or 1 uses crash tolerance \u230A(n\u22121)/2\u230B (Raft majority). fault\u22652 uses Byzantine \u230A(n\u22121)/3\u230B (Lamport).",
    rows: [["quorum", "quorum"], ["f_max", "fMax"]],
    eval: (p) => {
      const n = Math.max(1, Math.round(P(p, "n", 3)));
      const fault = P(p, "fault", 0);
      const quorum = Math.floor(n / 2) + 1;
      const fMax = fault >= 2 ? Math.floor((n - 1) / 3) : Math.floor((n - 1) / 2);
      return { val: quorum, quorum, fMax };
    }
  }),
  gates: (spec) => algebraic(spec, {
    equation: "AND, OR, XOR of the low bits of combo",
    assumptions: "Mano. combo is a bit field. The readout is the XOR of bits 0 and 1.",
    rows: [["xor", "xor"], ["and", "andv"], ["or", "orv"]],
    eval: (p) => {
      const combo = Math.round(P(p, "combo", 0));
      const a = combo & 1;
      const b = combo >> 1 & 1;
      return { val: a ^ b, xor: a ^ b, andv: a & b, orv: a | b };
    }
  }),
  combo: (spec) => algebraic(spec, {
    equation: "(5+3) mod 2^{width}; select bits=\u2308log2(inputs)\u2309",
    assumptions: "Width-masked sum of the constants 5 and 3. MUX select width is the ceiling log of the input count.",
    rows: [["sum", "sum"], ["sel", "sel"]],
    eval: (p) => {
      const width = clamp(Math.round(P(p, "width", 4)), 1, 30);
      const inputs = Math.max(1, Math.round(P(p, "inputs", 2)));
      const sum = (5 + 3) % 2 ** width;
      const sel = Math.ceil(Math.log2(inputs));
      return { val: sum, sum, sel };
    }
  }),
  seq: (spec) => algebraic(spec, {
    equation: "Q=init",
    assumptions: "D flip-flop holding the initial bit. Mano.",
    initial: ["init"],
    rows: [["Q", "Q"]],
    eval: (p) => {
      const Q = Math.round(P(p, "init", 0)) ? 1 : 0;
      return { val: Q, Q };
    }
  }),
  reg: (spec) => algebraic(spec, {
    equation: "states=2^{width}",
    assumptions: "Width is capped at 40 so the integer stays inside the mantissa.",
    rows: [["states", "states"]],
    eval: (p) => {
      const width = clamp(Math.round(P(p, "width", 8)), 0, 40);
      const states = 2 ** width;
      return { val: states, states };
    }
  }),
  counter: (spec) => algebraic(spec, {
    equation: "step \u2261 dir (mod modulus)",
    assumptions: "One count step. dir is the direction knob. The modulus is the design parameter.",
    rows: [["mod", "mod"], ["step", "step"]],
    eval: (p) => {
      const mod = Math.max(1, Math.round(P(p, "mod", 2)));
      const dir = Math.round(P(p, "dir", 1));
      const step = (dir % mod + mod) % mod;
      return { val: mod, mod, step };
    }
  }),
  "fsm-ce": (spec) => algebraic(spec, {
    equation: "transitions=states\xB7alphabet",
    assumptions: "Complete Moore machine. Hopcroft.",
    rows: [["transitions", "transitions"]],
    eval: (p) => {
      const transitions = Math.round(P(p, "states", 1)) * Math.round(P(p, "alpha", 1));
      return { val: transitions, transitions };
    }
  }),
  minimize: (spec) => algebraic(spec, {
    equation: "onset=min(minterms, 2^{vars})",
    assumptions: "The onset is the first minterms of a vars-bit space, clipped to the cube. Quine\u2013McCluskey is not run above that count.",
    rows: [["onset", "onset"]],
    eval: (p) => {
      const vars = clamp(Math.round(P(p, "vars", 2)), 0, 12);
      const onset = Math.min(Math.max(0, Math.round(P(p, "minterms", 0))), 2 ** vars);
      return { val: onset, onset };
    }
  }),
  pld: (spec) => algebraic(spec, {
    equation: "connections=inputs\xB7products",
    assumptions: "PLA crosspoint count. Mano.",
    rows: [["connections", "connections"]],
    eval: (p) => {
      const connections = Math.round(P(p, "inputs", 1)) * Math.round(P(p, "products", 1));
      return { val: connections, connections };
    }
  }),
  datapath: (spec) => algebraic(spec, {
    equation: "bits=width, controls=ctrl",
    assumptions: "The datapath width and the control-signal count are the catalog inputs.",
    rows: [["bits", "bits"], ["ctrl", "ctrl"]],
    eval: (p) => ({
      val: P(p, "width", 0),
      bits: P(p, "width", 0),
      ctrl: P(p, "ctrl", 0)
    })
  }),
  vmem: (spec) => algebraic(spec, {
    equation: "TLB reach=entries\xB7page",
    assumptions: "Hennessy & Patterson. page and tlb use the catalog units.",
    rows: [["reach", "reach"]],
    eval: (p) => {
      const reach = P(p, "tlb", 0) * P(p, "page", 0);
      return { val: reach, reach };
    }
  }),
  memhier: (spec) => algebraic(spec, {
    equation: "t_stream=capacity/bandwidth, t_rand=latency",
    assumptions: "Streaming time is size/bandwidth. Random latency is the lat knob.",
    rows: [["t_stream", "tStream"], ["t_rand", "tRand"]],
    eval: (p) => {
      const tStream = P(p, "cap", 0) / pos(P(p, "bw", 1), 1e-9);
      const tRand = P(p, "lat", 0);
      return { val: tRand, tStream, tRand };
    }
  }),
  multicore: (spec) => algebraic(spec, {
    equation: "Amdahl S=1/(0.05+0.95/cores); protocol state count",
    assumptions: "Stated parallel fraction 0.95, not a measured workload. proto 0 MSI (3), 1 MESI (4), 2 MOESI (5), else MESIF (5).",
    rows: [["S", "S"], ["states", "states"]],
    eval: (p) => {
      const cores = pos(P(p, "cores", 1), 1e-9);
      const proto = Math.round(P(p, "proto", 0));
      const table = [3, 4, 5, 5];
      const states = table[clamp(proto, 0, 3)];
      const S2 = 1 / (0.05 + 0.95 / cores);
      return { val: S2, S: S2, states };
    }
  }),
  gpio: (spec) => algebraic(spec, {
    equation: "mask=1<<priority, sense=trigger",
    assumptions: "Priority is clamped to 0..15. trig 0 is level, 1 is edge.",
    rows: [["mask", "mask"], ["sense", "sense"]],
    eval: (p) => {
      const prio = clamp(Math.round(P(p, "prio", 0)), 0, 15);
      return { val: 1 << prio, mask: 1 << prio, sense: Math.round(P(p, "trig", 0)) };
    }
  }),
  pwm: (spec) => algebraic(spec, {
    equation: "f=f_clk/(prescale\xB7period), f_clk=1 MHz",
    assumptions: "Stated timer clock of 1 MHz. The period knob is the timer period register.",
    rows: [["f", "f", "Hz"]],
    eval: (p) => {
      const prescale = pos(P(p, "prescale", 1), 1e-9);
      const period = pos(P(p, "period", 1), 1e-9);
      const f = 1e6 / (prescale * period);
      return { val: f, f };
    }
  }),
  serial: (spec) => algebraic(spec, {
    equation: "byte rate=baud/frame bits",
    assumptions: "Frame 0 is 8N1 (10 bits), 1 is 8E1 (11), 2 is 8N2 (11), else 8E2 (12).",
    rows: [["Bps", "bps"], ["bits", "bits"]],
    eval: (p) => {
      const frame = clamp(Math.round(P(p, "frame", 0)), 0, 3);
      const bits = [10, 11, 11, 12][frame];
      const bps = P(p, "baud", 0) / bits;
      return { val: bps, bps, bits };
    }
  }),
  wdt: (spec) => algebraic(spec, {
    equation: "timeout",
    assumptions: "The timeout knob is the watchdog period. wake is the wake-source index.",
    rows: [["t", "timeout", "s"], ["wake", "wake"]],
    eval: (p) => ({
      val: P(p, "timeout", 0),
      timeout: P(p, "timeout", 0),
      wake: P(p, "wake", 0)
    })
  }),
  fft: (spec) => algebraic(spec, {
    equation: "|X[k0]|=(N/2)\xB7cg, cg=1, 0.5, 0.54",
    assumptions: "Bin-centered cosine. Window 0 rectangular, 1 Hann (coherent gain 0.5), else Hamming (0.54). Oppenheim & Schafer.",
    rows: [["|X|", "mag"]],
    eval: (p) => {
      const N = Math.max(1, P(p, "N", 64));
      const win = Math.round(P(p, "win", 0));
      const cg = win <= 0 ? 1 : win === 1 ? 0.5 : 0.54;
      const mag = N / 2 * cg;
      return { val: mag, mag };
    }
  }),
  mod: (spec) => algebraic(spec, {
    equation: "P/P_c=1+m\xB2/2",
    assumptions: "Conventional AM tone. The carrier frequency is reported separately. Stremler / Proakis.",
    rows: [["P/Pc", "Pr"], ["fc", "fc", "Hz"]],
    eval: (p) => {
      const m = P(p, "m", 0);
      const Pr = 1 + m * m / 2;
      return { val: Pr, Pr, fc: P(p, "fc", 0) };
    }
  }),
  linecode: (spec) => algebraic(spec, {
    equation: "line rate=rate/efficiency",
    assumptions: "Efficiency: NRZ 1, Manchester 1/2, 4B5B 4/5, 8B10B 4/5. code selects the index.",
    rows: [["line", "line"]],
    eval: (p) => {
      const code = clamp(Math.round(P(p, "code", 0)), 0, 3);
      const eff = [1, 0.5, 0.8, 0.8][code];
      const line = P(p, "rate", 0) / eff;
      return { val: line, line };
    }
  }),
  chancode: (spec) => algebraic(spec, {
    equation: "states=2^{K\u22121}",
    assumptions: "Binary convolutional encoder. Lin & Costello. rate is the code rate.",
    rows: [["states", "states"], ["rate", "rate"]],
    eval: (p) => {
      const K = Math.max(1, Math.round(P(p, "K", 3)));
      const states = 2 ** Math.max(0, K - 1);
      return { val: states, states, rate: P(p, "rate", 0) };
    }
  }),
  equalize: (spec) => algebraic(spec, {
    equation: "misadjustment\u2248\u03BC\xB7taps/2",
    assumptions: "Widrow. Unit-power regressor. The factor 1/2 is the standard LMS excess-MSE approximation.",
    rows: [["M", "M"]],
    eval: (p) => {
      const M = P(p, "mu", 0) * Math.max(0, P(p, "taps", 0)) / 2;
      return { val: M, M };
    }
  }),
  "struct-dyn": (spec) => algebraic(spec, {
    equation: "\u03C9n=\u221A(k/m), \u03B6=c/(2\u221A(km))",
    assumptions: "Viscously damped SDOF. Chopra / Hibbeler.",
    rows: [["\u03C9n", "wn", "rad/s"], ["\u03B6", "zeta"]],
    eval: (p) => E8.sdofEval(p)
  }),
  seismic: (spec) => algebraic(spec, {
    equation: "u_amp=pga/(2\u03B6)",
    assumptions: "Harmonic base acceleration at resonance. Not a design spectrum. Chopra.",
    rows: [["amp", "amp"]],
    eval: (p) => E8.seismicEval(p)
  }),
  "open-channel": (spec) => algebraic(spec, {
    equation: "y=(Q n / \u221AS)^{3/5}",
    assumptions: "SI Manning, unit width, hydraulic radius equal to depth.",
    rows: [["y", "y", "m"]],
    eval: (p) => E8.manningEval(p)
  }),
  weir: (spec) => algebraic(spec, {
    equation: "Q=(2/3) b \u221A(2g) H^{3/2}",
    assumptions: "Ideal sharp-crested weir, Cd=1. b is the opening knob. g=9.81.",
    rows: [["Q", "Q", "m\xB3/s"]],
    eval: (p) => E8.weirEval(p)
  }),
  hx: (spec) => algebraic(spec, {
    equation: "UA=U A",
    assumptions: "Terminal temperatures are not in the catalog, so LMTD is not invented. The conductance is UA.",
    rows: [["UA", "UA", "W/K"]],
    eval: (p) => E8.hxEval(p)
  }),
  "thermo-cycle": (spec) => algebraic(spec, {
    equation: "\u03B7=1\u2212rp^{(1\u2212\u03B3)/\u03B3}, rp=P/(1 bar), \u03B3=1.4",
    assumptions: "Ideal-gas Brayton. Fixed \u03B3=1.4 (cold air); rp=P/(1 bar) with P_low=1 bar. \u03B3 is not a live knob (\xC7engel & Boles).",
    rows: [["\u03B7_B", "etaB"], ["\u03B7_C", "etaC"]],
    eval: (p) => E8.thermoCycleEval(p)
  }),
  "dc-motor": (spec) => algebraic(spec, {
    equation: "\u03C9=(V\u2212TL Ra)/K, Ra=K=1",
    assumptions: "Steady separately excited machine in normalized units. Chapman.",
    rows: [["\u03C9", "omega", "rad/s"], ["I", "I", "A"]],
    eval: (p) => E8.motorDcEval(p)
  }),
  "ind-motor": (spec) => algebraic(spec, {
    equation: "n_s=120 f/4",
    assumptions: "Four poles. Voltage is reported and does not set the synchronous speed. Chapman.",
    rows: [["n_s", "ns", "rpm"], ["V", "V", "V"]],
    eval: (p) => E8.motorIndEval(p)
  }),
  "sync-motor": (spec) => algebraic(spec, {
    equation: "P_pu=If\xB7sin \u03B4",
    assumptions: "Per-unit V=Xs=1 and Ea proportional to field current. Chapman.",
    rows: [["P", "Ppu"]],
    eval: (p) => E8.motorSyncEval(p)
  }),
  pe: (spec) => algebraic(spec, {
    equation: "Vout/Vin=D, \u0394i\u221DD(1\u2212D)/fs",
    assumptions: "Ideal buck converter. Erickson. Inductance in the ripple factor is 1 H.",
    rows: [["D", "duty"], ["ripple", "ripple"]],
    eval: (p) => E8.buckEval(p)
  }),
  powerflow: (spec) => algebraic(spec, {
    equation: "DC power flow, X=0.1 pu",
    assumptions: "Radial feeder, equal bus injections. Angle is in radians.",
    rows: [["\u03B8", "theta", "rad"], ["P", "Ptot"]],
    eval: (p) => E8.powerflowEval(p)
  }),
  stability: (spec) => algebraic(spec, {
    equation: "\u03B4=asin(0.8)+\xBD\xB70.8\xB7t_clear\xB2 during a fault",
    assumptions: "Classical machine, Pm=0.8, Pe=0 while the fault knob is positive, M=1. fault=0 keeps the pre-fault angle.",
    rows: [["\u03B4", "delta", "rad"]],
    eval: (p) => E8.swingEval(p)
  }),
  renewable: (spec) => algebraic(spec, {
    equation: "P_pv=0.2\xB7irr\xB71 m\xB2; P_wind=\xBD\xB71.225\xB7v\xB3\xB70.4",
    assumptions: "Stated efficiency 0.2 and Cp=0.4. Cp is below the Betz limit 16/27. Not a measured turbine curve.",
    rows: [["P_pv", "Ppv", "W"], ["P_wind", "Pwind", "W"]],
    eval: (p) => E8.renewableEval(p)
  }),
  hen: (spec) => algebraic(spec, {
    equation: "UA=Q/\u0394T_min",
    assumptions: "Pinch conductance scale. Linnhoff. No stream set is invented.",
    rows: [["UA", "UA"]],
    eval: (p) => E8.pinchEval(p)
  }),
  drying: (spec) => algebraic(spec, {
    equation: "\u0394p=p_sat(T)(1\u2212RH)",
    assumptions: "Antoine water constants A=8.07131, B=1730.63, C=233.426, P in mmHg. The fit is for about 1\u2013100 \xB0C.",
    rows: [["\u0394p", "drive", "mmHg"]],
    eval: (p) => E8.dryingEval(p)
  }),
  fluidbed: (spec) => algebraic(spec, {
    equation: "Re_mf=\u221A(33.7\xB2+0.0408 Ar)\u221233.7",
    assumptions: "Wen & Yu 1966. Air and sand \u03C1s=2500 kg/m\xB3. dp is in \u03BCm.",
    rows: [["Umf", "Umf", "m/s"], ["above", "above"]],
    eval: (p) => E8.fluidbedEval(p)
  })
};

// js/models/fam/builders-ml.js
var E9 = { ...evals_mechanics_exports, ...evals_waves_exports, ...evals_thermo_exports, ...evals_em_exports, ...evals_quantum_exports, ...evals_structures_exports, ...evals_fluids_exports, ...evals_discrete_exports };
var BUILDERS_ML = {
  "linear-model": (spec) => algebraic(spec, {
    equation: "\u03B2=(\u03A3 x y)/(\u03A3 x\xB2+\u03BB); one GD step \u03B2=lr\xB7mean(x y)",
    assumptions: "Design x=1..8, y=2x. Ridge has no intercept. One gradient step starts at \u03B2=0. Not a fitted dataset.",
    rows: [["\u03B2_ridge", "ridge"], ["\u03B2_gd", "gd"]],
    eval: (p) => {
      let sxx = 0;
      let sxy = 0;
      for (let i = 1; i <= 8; i += 1) {
        sxx += i * i;
        sxy += i * (2 * i);
      }
      const reg = Math.max(0, P(p, "reg", 0));
      const lr = P(p, "lr", 0.1);
      const ridge = sxy / (sxx + reg);
      const gd = lr * (sxy / 8);
      return { val: ridge, ridge, gd };
    }
  }),
  "tree-model": (spec) => algebraic(spec, {
    equation: "leaves=trees\xB7min(2^{depth}, n_rows)",
    assumptions: "Capacity of an ensemble, not an accuracy. n_rows=max(2, round(8\xB7sample)). Depth is capped at 8 in the leaf count.",
    rows: [["leaves", "leaves"]],
    eval: (p) => {
      const trees = Math.max(1, Math.round(P(p, "trees", 1)));
      const depth = Math.max(1, Math.round(P(p, "depth", 1)));
      const rows = Math.max(2, Math.round(8 * clamp(P(p, "sample", 1), 0, 1)));
      const leaves = trees * Math.min(2 ** Math.min(depth, 8), rows);
      return { val: leaves, leaves };
    }
  }),
  kernel: (spec) => algebraic(spec, {
    equation: "k=exp(\u2212\u03B3 \u2016x\u2212y\u2016\xB2), \u2016x\u2212y\u2016=1",
    assumptions: "RBF kernel between two stated points a unit apart. C is the SVM box constraint. Bishop / Sch\xF6lkopf.",
    rows: [["k", "k"], ["C", "C"]],
    eval: (p) => {
      const gamma2 = P(p, "gamma", 1);
      const Cbox = P(p, "C", 1);
      const k = Math.exp(-gamma2);
      return { val: k, k, C: Cbox };
    }
  }),
  cluster: (spec) => algebraic(spec, {
    equation: "Lloyd k-means inertia",
    assumptions: "Eight fixed 1D points. metric 0 is squared distance, metric\u22651 is absolute distance with a median update.",
    rows: [["inertia", "inertia"]],
    eval: (p) => {
      const inertia = E9.kmeansInertia(P(p, "k", 2), P(p, "metric", 0));
      return { val: inertia, inertia };
    }
  }),
  dimred: (spec) => algebraic(spec, {
    equation: "PCA retained variance",
    assumptions: "2\xD72 covariance of a stated cloud. k\u22652 keeps both components. nn is the sample count. t-SNE is not computed.",
    rows: [["fraction", "fraction"]],
    eval: (p) => {
      const fraction = E9.pcaFraction(P(p, "k", 2), P(p, "nn", 10));
      return { val: fraction, fraction };
    }
  }),
  nn: (spec) => algebraic(spec, {
    equation: "a \u2190 act(0.1\xB7width\xB7a), input 1",
    assumptions: "Identical weights 0.1. act 0 ReLU, 1 tanh, 2 sigmoid, else linear. Not a trained model.",
    rows: [["y", "y"]],
    eval: (p) => {
      const y = E9.nnForward(P(p, "layers", 1), P(p, "width", 4), P(p, "act", 0));
      return { val: y, y };
    }
  }),
  attention: (spec) => algebraic(spec, {
    equation: "softmax(q\xB7k/\u221Ad_k)",
    assumptions: "Vaswani et al. 2017. Two tokens, scores \u221Ad_k and 0. Parameter count is heads\xB7d_k.",
    rows: [["w0", "w0"], ["params", "params"]],
    eval: (p) => {
      const dk = Math.max(1, P(p, "dk", 1));
      const s0 = Math.sqrt(dk);
      const e0 = Math.exp(s0 - s0);
      const e1 = Math.exp(0 - s0);
      const w0 = e0 / (e0 + e1);
      const params = Math.max(1, Math.round(P(p, "heads", 1))) * dk;
      return { val: w0, w0, params };
    }
  }),
  rl: (spec) => algebraic(spec, {
    equation: "V=1/(1\u2212\u03B3)",
    assumptions: "Sutton & Barto. One-state continuing task with reward 1. One TD step from 0 is the learning rate.",
    rows: [["V", "V"], ["td", "td"]],
    eval: (p) => {
      const gamma2 = clamp(P(p, "gamma", 0.9), 0, 0.999999);
      const V = 1 / (1 - gamma2);
      const td = P(p, "lr", 0);
      return { val: V, V, td };
    }
  }),
  transformer: (spec) => algebraic(spec, {
    equation: "V2/V1=1/a",
    assumptions: "Ideal transformer. load is the per-unit secondary current and does not change the voltage ratio.",
    rows: [["V2/V1", "ratio"], ["I_pu", "Ipu"]],
    eval: (p) => E9.transformerEval(p)
  })
};

// js/models/fam/builders-eng.js
var E10 = { ...evals_mechanics_exports, ...evals_waves_exports, ...evals_thermo_exports, ...evals_em_exports, ...evals_quantum_exports, ...evals_structures_exports, ...evals_fluids_exports, ...evals_discrete_exports };
var BUILDERS_ENG = {
  hashtable: (spec) => algebraic(spec, {
    equation: "E[probes]=1+\u03B1/2",
    assumptions: "CLRS chaining, successful search. \u03B1 is the load knob. Keys=\u03B1\xB7capacity.",
    rows: [["E", "probes"], ["keys", "keys"]],
    eval: (p) => {
      const cap = Math.max(0, P(p, "cap", 16));
      const load = Math.max(0, P(p, "load", 0));
      return { val: 1 + load / 2, probes: 1 + load / 2, keys: load * cap };
    }
  }),
  "sym-enc": (spec) => algebraic(spec, {
    equation: "AES-128/192/256 rounds = keyBits/32+6",
    assumptions: "FIPS-197 round count only when the key size is 128, 192, or 256. Other sizes report 0. No ciphertext is produced. mode is ECB/CBC/CTR as an index.",
    rows: [["rounds", "rounds"], ["mode", "mode"]],
    eval: (p) => {
      const bits = Math.round(P(p, "keyBits", 128));
      const rounds = bits === 128 || bits === 192 || bits === 256 ? bits / 32 + 6 : 0;
      return { val: rounds, rounds, mode: P(p, "mode", 0) };
    }
  }),
  pubkey: (spec) => algebraic(spec, {
    equation: "c=m^e mod n, toy primes",
    assumptions: "Classroom RSA toy only (not a secure key). Fixed constants: e=65537, plaintext m=42; primes = largest \u22642^k and next lower, k=clamp(bits/4,8,16). No padding, no CRT, no real entropy.",
    rows: [["c", "c"], ["n", "n"]],
    eval: (p) => {
      const bits = P(p, "bits", 64);
      const k = clamp(Math.round(bits / 4), 8, 16);
      const hi = primeAtMost(2 ** k);
      const lo = primeAtMost(hi - 1);
      const n = hi * lo;
      const c = modPow(42, 65537, n);
      return { val: c, c, n };
    }
  }),
  hash: (spec) => algebraic(spec, {
    equation: "FNV-1a 32-bit of len bytes 0x61",
    assumptions: "Not MD5 or SHA. Public-domain FNV-1a of a repeated letter.",
    rows: [["h", "h"]],
    eval: (p) => {
      const h = fnv1a(P(p, "len", 16), 97);
      return { val: h, h };
    }
  }),
  mac: (spec) => algebraic(spec, {
    equation: "FNV-1a tag of `msg` bytes set to key mod 256",
    assumptions: "A teaching tag, not HMAC. Katz & Lindell discuss MAC length; this readout is only the FNV tag.",
    rows: [["tag", "tag"]],
    eval: (p) => {
      const tag = fnv1a(P(p, "msg", 1), Math.round(P(p, "key", 0)));
      return { val: tag, tag };
    }
  }),
  sched: (spec) => algebraic(spec, {
    equation: "FCFS average wait, 4 jobs",
    assumptions: "Job i arrives at i\xB7arrival and runs for `burst`. Silberschatz.",
    rows: [["wait", "wait"]],
    eval: (p) => {
      const wait = E10.fcfsWait(P(p, "arrival", 0), P(p, "burst", 1));
      return { val: wait, wait };
    }
  }),
  routing: (spec) => algebraic(spec, {
    equation: "Dijkstra distance (n\u22121)\xB7cost",
    assumptions: "Path graph, every hop weighs `cost`. CLRS.",
    rows: [["dist", "dist"]],
    eval: (p) => {
      const dist = E10.dijkstraDist(P(p, "n", 6), P(p, "cost", 1));
      return { val: dist, dist };
    }
  }),
  queueing: (spec) => algebraic(spec, {
    equation: "L=\u03C1/(1\u2212\u03C1), \u03C1=\u03BB/\u03BC",
    assumptions: "M/M/1, Gross & Harris. L is undefined for \u03C1\u22651 and is reported as 0 with stable=0.",
    rows: [["L", "L"], ["\u03C1", "rho"], ["stable", "stable"]],
    eval: (p) => {
      const lam = Math.max(0, P(p, "lam", 0));
      const mu = pos(P(p, "mu", 1), 1e-12);
      const rho = lam / mu;
      const stable = rho < 1 ? 1 : 0;
      const L = stable ? rho / (1 - rho) : 0;
      return { val: L, L, rho, stable };
    }
  }),
  isa: (spec) => algebraic(spec, {
    equation: "cycles=nInst, CPI=1",
    assumptions: "Single-cycle RISC. Addressing-mode count is the addr knob and does not add cycles. Hennessy & Patterson.",
    rows: [["cycles", "cycles"], ["modes", "modes"]],
    eval: (p) => ({
      val: P(p, "nInst", 0),
      cycles: P(p, "nInst", 0),
      modes: P(p, "addr", 0)
    })
  }),
  pipeline: (spec) => algebraic(spec, {
    equation: "CPI=1/issue, latency=stages",
    assumptions: "Ideal pipeline, no hazards. Hennessy & Patterson.",
    rows: [["CPI", "cpi"], ["latency", "latency"]],
    eval: (p) => {
      const issue = pos(P(p, "issue", 1), 1e-9);
      const latency = P(p, "stages", 1);
      return { val: 1 / issue, cpi: 1 / issue, latency };
    }
  }),
  cache: (spec) => algebraic(spec, {
    equation: "LRU hit rate on a sequential scan",
    assumptions: "Hennessy & Patterson. Capacity, block, and associativity define the sets. The scan is at most 2048 references.",
    rows: [["hit", "hit"]],
    eval: (p) => {
      const hit = E10.cacheHitRate(P(p, "cap", 16), P(p, "block", 4), P(p, "assoc", 1));
      return { val: hit, hit };
    }
  }),
  branch: (spec) => algebraic(spec, {
    equation: "2-bit counter mispredict rate",
    assumptions: "Smith 2-bit counters on 64 phase-shifted loops. hist is the taken-run length. A table smaller than 64 aliases PCs.",
    rows: [["mis", "mis"]],
    eval: (p) => {
      const mis = E10.branchMisrate(P(p, "hist", 2), P(p, "table", 64));
      return { val: mis, mis };
    }
  }),
  bus: (spec) => algebraic(spec, {
    equation: "share=bw/masters",
    assumptions: "Equal share of a stated bandwidth.",
    rows: [["share", "share"]],
    eval: (p) => {
      const masters = pos(P(p, "masters", 1), 1e-9);
      const share = P(p, "bw", 0) / masters;
      return { val: share, share };
    }
  }),
  adc: (spec) => algebraic(spec, {
    equation: "SQNR=6.0206 N+1.7609 dB",
    assumptions: "Full-scale sine quantization. Nyquist frequency is fs/2. Oppenheim & Schafer.",
    rows: [["SQNR", "sqnr", "dB"], ["f_N", "fN", "Hz"]],
    eval: (p) => {
      const bits = P(p, "bits", 8);
      const sqnr = 6.0206 * bits + 1.7609;
      const fN = P(p, "fs", 0) / 2;
      return { val: sqnr, sqnr, fN };
    }
  }),
  dma: (spec) => algebraic(spec, {
    equation: "beats=size",
    assumptions: "One beat per unit of the size knob. prio is the channel priority.",
    rows: [["beats", "beats"], ["prio", "prio"]],
    eval: (p) => ({
      val: P(p, "size", 0),
      beats: P(p, "size", 0),
      prio: P(p, "prio", 0)
    })
  }),
  rtsched: (spec) => algebraic(spec, {
    equation: "U=exec/period",
    assumptions: "One task. Liu & Layland: the task is schedulable when U\u22641. RM and EDF agree for one task.",
    rows: [["U", "U"], ["ok", "ok"]],
    eval: (p) => {
      const U = P(p, "exec", 0) / pos(P(p, "period", 1), 1e-9);
      return { val: U, U, ok: U <= 1 ? 1 : 0 };
    }
  }),
  "irq-nest": (spec) => algebraic(spec, {
    equation: "depth=levels",
    assumptions: "Nesting depth is bounded by the priority-level count. rate is the interrupt rate.",
    rows: [["depth", "depth"], ["rate", "rate"]],
    eval: (p) => ({
      val: P(p, "levels", 0),
      depth: P(p, "levels", 0),
      rate: P(p, "rate", 0)
    })
  }),
  "sample-quant": (spec) => algebraic(spec, {
    equation: "SQNR=6.0206 N+1.7609; Nyquist fs\u22652 f0",
    assumptions: "Same sine quantization formula as the ADC. alias=1 when fs<2 f0.",
    rows: [["SQNR", "sqnr", "dB"], ["alias", "alias"]],
    eval: (p) => {
      const sqnr = 6.0206 * P(p, "N", 8) + 1.7609;
      const alias = P(p, "fs", 0) < 2 * P(p, "f0", 0) ? 1 : 0;
      return { val: sqnr, sqnr, alias };
    }
  }),
  filter: (spec) => algebraic(spec, {
    equation: "|H(f)|=1/\u221A(1+(f/fc)^{2n})",
    assumptions: "Analog Butterworth magnitude. Evaluated at f=min(0.45, 2 fc). Oppenheim & Schafer.",
    rows: [["|H|", "H"]],
    eval: (p) => {
      const n = Math.max(1, Math.round(P(p, "order", 1)));
      const fc = pos(P(p, "fc", 0.1), 1e-6);
      const f = Math.min(0.45, 2 * fc);
      const H = 1 / Math.sqrt(1 + (f / fc) ** (2 * n));
      return { val: H, H };
    }
  }),
  sync: (spec) => algebraic(spec, {
    equation: "\u03C4=1/bw",
    assumptions: "First-order loop time constant. jitter is the supplied rms and is not converted into a variance model.",
    rows: [["\u03C4", "tau"], ["jitter", "jitter"]],
    eval: (p) => {
      const tau = 1 / pos(P(p, "bw", 0.01), 1e-9);
      return { val: tau, tau, jitter: P(p, "jitter", 0) };
    }
  }),
  "pipe-flow": (spec) => algebraic(spec, {
    equation: "f=64/Re (laminar) or Swamee\u2013Jain",
    assumptions: "Darcy friction factor. eps is relative roughness \u03B5/D. Laminar below Re=2300.",
    rows: [["f", "f"]],
    eval: (p) => E10.darcyEval(p)
  }),
  "pump-fan": (spec) => algebraic(spec, {
    equation: "Q/Qref=(rpm/1450)\xB7units, H/Href=(rpm/1450)\xB2",
    assumptions: "Affinity laws about 1450 rpm. Qref=1 per machine.",
    rows: [["Q", "Q"], ["H", "H"]],
    eval: (p) => E10.pumpEval(p)
  }),
  "conv-eng": (spec) => algebraic(spec, {
    equation: "q=h\xB71 K; Nu=0.664 Re^{1/2} Pr^{1/3}",
    assumptions: "Same Newton and Blasius relations as the convection family. Incropera.",
    rows: [["q", "q", "W/m\xB2"], ["h_Bl", "hBl", "W/(m\xB2K)"]],
    eval: (p) => E10.convEngEval(p)
  }),
  "rad-eng": (spec) => algebraic(spec, {
    equation: "q=\u03B5 \u03C3 T\u2074, F12=1",
    assumptions: "Infinite parallel plates, view factor 1, enclosure at 0 K. Incropera.",
    rows: [["q", "q", "W/m\xB2"]],
    eval: (p) => E10.radEngEval(p)
  }),
  combustion: (spec) => algebraic(spec, {
    equation: "excess air=1/\u03C6\u22121",
    assumptions: "Turns. \u03C6>1 is fuel-rich and the excess-air term is negative. T is the reactant temperature, not an adiabatic flame temperature.",
    rows: [["\u03C6", "phi"], ["excess", "excess"]],
    eval: (p) => E10.combustionEval(p)
  }),
  storage: (spec) => algebraic(spec, {
    equation: "hours=E/P",
    assumptions: "E in kWh and P in kW, so the ratio is hours.",
    rows: [["t", "hours", "h"]],
    eval: (p) => E10.storageEval(p)
  }),
  reactor: (spec) => algebraic(spec, {
    equation: "X=k\u03C4/(1+k\u03C4), \u03C4=V/v",
    assumptions: "Isothermal irreversible first-order reaction. Fogler. Xp is the PFR conversion.",
    rows: [["X_cstr", "Xc"], ["X_pfr", "Xp"]],
    eval: (p) => E10.cstrEval(p)
  }),
  distill: (spec) => algebraic(spec, {
    equation: "Nmin=ln[(xD/(1\u2212xD))((1\u2212xB)/xB)]/ln \u03B1",
    assumptions: "Fenske for \u03B1=2.5, xD=0.95, xB=0.05. feed/N is the relative feed location.",
    rows: [["feed/N", "feedFrac"], ["Nmin", "Nmin"]],
    eval: (p) => E10.fenskeEval(p)
  }),
  absorb: (spec) => algebraic(spec, {
    equation: "fraction=A/(1+A), A=L/G",
    assumptions: "Single equilibrium stage, equilibrium slope m=1. Temperature is recorded and does not change m.",
    rows: [["abs", "frac"], ["T", "T", "K"]],
    eval: (p) => E10.absorbEval(p)
  }),
  extract: (spec) => algebraic(spec, {
    equation: "Kremser fraction (S^{N+1}\u2212S)/(S^{N+1}\u22121)",
    assumptions: "Extraction factor S, distribution ratio 1. At S=1 the fraction is N/(N+1).",
    rows: [["frac", "frac"]],
    eval: (p) => E10.extractEval(p)
  }),
  crystal: (spec) => algebraic(spec, {
    equation: "ln S",
    assumptions: "Supersaturation ratio. No nucleation prefactor. Mullin.",
    rows: [["ln S", "lnS"], ["T", "T", "K"]],
    eval: (p) => E10.crystalEval(p)
  })
};

// js/models/fam/index.js
var BUILDERS = {
  ...BUILDERS_MECHANICS,
  ...BUILDERS_WAVES,
  ...BUILDERS_THERMO,
  ...BUILDERS_EM,
  ...BUILDERS_QUANTUM,
  ...BUILDERS_STRUCTURES,
  ...BUILDERS_FLUIDS,
  ...BUILDERS_CS,
  ...BUILDERS_ML,
  ...BUILDERS_ENG
};
var sineWarned = /* @__PURE__ */ new Set();
function warnDecorativeSine(spec) {
  let debug = false;
  if (typeof globalThis !== "undefined" && globalThis.DEBUG) debug = true;
  if (typeof process !== "undefined" && process.env && process.env.DEBUG) debug = true;
  if (!debug) return;
  const key = String(spec?.variantOf || spec?.id || "");
  if (sineWarned.has(key)) return;
  sineWarned.add(key);
  console.debug(`[fam] decorative sine fallback for ${key}`);
}
function buildFamPhysics(spec) {
  const of = String(spec?.variantOf || "");
  const build = BUILDERS[of];
  if (!build) return null;
  return build(spec);
}
var FAM_PHYSICS_KEYS = Object.keys(BUILDERS);

// js/models/factory.js
function schemaNum2(label, group, unit, min, max) {
  return { label, group, unit, min, max };
}
function baseMeta2(spec) {
  return {
    id: spec.id,
    name: spec.name,
    tags: [spec.domain, spec.sub].filter(Boolean),
    formula: spec.formula || "",
    description: spec.description || "",
    sub: spec.sub || "",
    perfClass: perfClassFor(spec.id)
  };
}
function rnd(seed) {
  let s = Math.floor(seed) % 2147483646 + 1;
  return () => {
    s = s * 16807 % 2147483647;
    return (s - 1) / 2147483646;
  };
}
var TITLE_BAND = 46;
function title(ctx, text, x = 14, y = 26) {
  ctx.fillStyle = C.muted;
  ctx.font = "600 13px IBM Plex Mono, monospace";
  ctx.fillText(text, x, y);
}
function padBox(W, H, m = 36) {
  const top = Math.max(m, TITLE_BAND);
  return { l: m, r: W - m, t: top, b: H - m, w: W - 2 * m, h: H - top - m };
}
function enrich(model, spec) {
  if (model.paramSchema) model.paramSchema = localizeSchema(model.paramSchema);
  const fam = spec.family || "gauge";
  const caps = familyCapabilities(fam, spec);
  const topicBound = !!model.topicBound;
  model.capabilities = { ...caps, ...model.capabilities || {} };
  model.formalism = model.capabilities.formalism || caps.formalism;
  model.fidelity = topicBound ? model.fidelity || spec.fidelity || "principle" : spec.fidelity || model.fidelity || "principle";
  model.capabilities.fidelity = model.fidelity;
  if (topicBound) {
    model.authority = model.authority || spec.authority || "";
    model.assumptions = model.assumptions || spec.assumptions || "";
  } else {
    model.authority = spec.authority || model.authority || "";
    model.assumptions = spec.assumptions || model.assumptions || "";
  }
  if (typeof model.getEnergy !== "function") {
    model.getEnergy = (state) => {
      if (Number.isFinite(state?.energy)) return { kinetic: state.energy, potential: 0 };
      if (Number.isFinite(state?.loss)) return { kinetic: 0, potential: state.loss };
      if (Array.isArray(state?.parts)) {
        const ke = state.parts.reduce((s, p) => s + 0.5 * (p.vx * p.vx + p.vy * p.vy), 0);
        return { kinetic: ke, potential: 0 };
      }
      if (Number.isFinite(state?.v) && Number.isFinite(state?.y)) {
        const m = P(state.params, "m", 1);
        const g = P(state.params, "g", 9.81);
        return { kinetic: 0.5 * m * state.v * state.v, potential: m * g * state.y };
      }
      if (Number.isFinite(state?.x) && Number.isFinite(state?.v)) {
        const m = P(state.params, "m", 1);
        const k = P(state.params, "k", 1);
        return { kinetic: 0.5 * m * state.v * state.v, potential: 0.5 * k * state.x * state.x };
      }
      return { kinetic: 0, potential: 0 };
    };
  }
  if (typeof model.getEnergyAt !== "function") {
    model.getEnergyAt = (state, row) => {
      if (!row || typeof row !== "object") return model.getEnergy(state);
      const probe = { params: state.params };
      for (const [k, v] of Object.entries(state)) {
        if (k === "params" || k === "trail" || k === "trails" || k.startsWith("_")) continue;
        probe[k] = v;
      }
      for (const [k, v] of Object.entries(row)) {
        if (k.startsWith("E_") || k === "note" || k === "kind") continue;
        if (typeof v === "number" && Number.isFinite(v)) probe[k] = v;
      }
      if (!Number.isFinite(probe.y) && Number.isFinite(row.v) && Array.isArray(state?.wave)) {
        probe.energy = Number(row.v) ** 2;
      }
      if (!Number.isFinite(probe.y) && Number.isFinite(row.emf)) {
        probe.energy = 0.5 * Number(row.emf) ** 2;
      }
      return model.getEnergy(probe);
    };
  }
  if (typeof model.getTrajectory !== "function") {
    model.getTrajectory = (state) => {
      if (Array.isArray(state?.trail)) return state.trail;
      if (Array.isArray(state?.hist)) return state.hist.map((v, i) => ({ i, v: typeof v === "number" ? v : v }));
      if (Array.isArray(state?.wave)) return state.wave.map((v, i) => ({ i, v }));
      return [{ t: state?.t || 0, note: spec.id }];
    };
  }
  const step0 = model.step?.bind(model);
  const recompute = model.recompute?.bind(model);
  model.refresh = (state) => {
    if (recompute) recompute(state);
    else if (step0) step0(state, 0);
  };
  if (typeof model.draw === "function") {
    if (!model.id) model.id = spec.id;
    applyLowInkStrokeBoost(model);
    const draw0 = model.draw.bind(model);
    model.draw = (ctx, state, view) => {
      draw0(ctx, state, view);
      const W = view?.width || 0;
      const H = view?.height || 0;
      if (W > 20 && H > 20) {
        ctx.fillStyle = C.muted || "#666";
        ctx.fillRect(2, 2, 8, 8);
        ctx.fillRect(W - 10, 2, 8, 8);
        ctx.fillRect(2, H - 10, 8, 8);
        ctx.fillRect(W - 10, H - 10, 8, 8);
      }
    };
  }
  return model;
}
function createFactoryModel(spec) {
  if (!(spec.dims || spec.generated)) {
    const topic = buildTopicModel(spec);
    if (topic) return enrich(topic, spec);
  }
  const family = spec.family || "gauge";
  const builders = {
    ode1d: buildOde1d,
    ode2d: buildOde2d,
    circular: buildCircular,
    particles: buildParticles,
    nbody: buildNbody,
    euler: buildEuler,
    buoyancy: buildBuoyancy,
    flow: buildFlow,
    wave1d: buildWave1d,
    doppler: buildDoppler,
    interference: buildInterference,
    field2d: buildField2d,
    piston: buildPiston,
    cycle: buildCycle,
    fieldlines: buildFieldlines,
    circuit: buildCircuit,
    induction: buildInduction,
    rays: buildRays,
    gauge: buildGauge,
    variant: buildVariant,
    bohr: buildBohr,
    decay: buildDecay,
    discrete: buildDiscrete,
    graph: buildGraph,
    tree: buildTree,
    fsm: buildFsm,
    turing: buildTuring,
    crypto: buildCrypto,
    ml: buildMl,
    opt: buildOpt,
    logic: buildLogic,
    arch: buildArch,
    embed: buildEmbed,
    comm: buildComm,
    net: buildNet,
    os: buildOs,
    compile: buildCompile,
    dist: buildDist,
    struct: buildStruct,
    control: buildControl,
    chaos: buildChaos,
    traffic: buildTraffic,
    reactor: buildReactor,
    aero: buildAero
  };
  if (spec.dims || spec.generated) {
    return enrich(buildVariant(spec), spec);
  }
  const build = builders[family] || buildGauge;
  return enrich(build(spec), spec);
}
function variantKnobs(spec) {
  const dimList = Array.isArray(spec.dims) ? spec.dims : [];
  const defaults = spec.defaults && typeof spec.defaults === "object" ? spec.defaults : {};
  const params = { ...defaults };
  const paramSchema = {};
  for (const d of dimList) {
    if (!d?.key) continue;
    if (params[d.key] === void 0) params[d.key] = d.value ?? d.min ?? 1;
    paramSchema[d.key] = schemaNum2(
      d.label || d.key,
      "dynamics",
      d.unit || "\u2014",
      Number.isFinite(d.min) ? d.min : 0,
      Number.isFinite(d.max) ? d.max : 100
    );
  }
  return { params, paramSchema };
}
function isPhotoelectricSpec(spec) {
  const id = String(spec?.id || "");
  const of = String(spec?.variantOf || "");
  return id === "photoelectric" || of === "photoelectric" || /^fam-photoelectric/i.test(id) || /photoelectric/i.test(id) || /photoelectric/i.test(of);
}
function isHeatConductionSpec(spec) {
  const id = String(spec?.id || "");
  const of = String(spec?.variantOf || "");
  const formula = String(spec?.formula || "");
  return id === "heat" || of === "heat" || of === "heat-cond" || of === "cond-eng" || /^fam-heat-cond/i.test(id) || /^fam-cond-eng/i.test(id) || /conduction/i.test(id) || /conduction/i.test(of) || formula === "\u5085\u91CC\u53F6\u5F8B" || formula === "\u591A\u5C42\u58C1";
}
function buildPhotoelectricVariant(spec) {
  const { params, paramSchema } = variantKnobs(spec);
  if (params.nu === void 0 && params.freq === void 0 && params.hf === void 0) {
    params.nu = 3;
    paramSchema.nu = schemaNum2("\u03BD", "dynamics", "eV", 0, 12);
  }
  if (params.W === void 0 && params.workFunc === void 0) {
    params.W = 2;
    paramSchema.W = schemaNum2("W", "dynamics", "eV", 0, 10);
  }
  if (params.I === void 0 && params.intensity === void 0) {
    params.I = 1;
    paramSchema.I = schemaNum2("I", "dynamics", "\u2014", 0, 10);
  }
  if (paramSchema.nu) paramSchema.nu = { ...paramSchema.nu, unit: paramSchema.nu.unit === "\u2014" ? "eV" : paramSchema.nu.unit };
  if (paramSchema.W) paramSchema.W = { ...paramSchema.W, unit: paramSchema.W.unit === "\u2014" ? "eV" : paramSchema.W.unit };
  params.h = params.h ?? 1;
  paramSchema.h = schemaNum2("h", "dynamics", "\u2014", 0, 10);
  const photonEnergy = (p) => {
    if (p.hf !== void 0 && p.nu === void 0 && p.freq === void 0) return P(p, "hf", 0);
    const h = P(p, "h", 1);
    const nu = p.nu !== void 0 ? P(p, "nu", 0) : p.freq !== void 0 ? P(p, "freq", 0) : P(p, "hf", 0);
    return h * nu;
  };
  return {
    ...baseMeta2(spec),
    equation: "K_max = max(0, h\u03BD \u2212 W); R \u221D I only if K_max>0",
    authority: "Einstein photoelectric equation (1905); Halliday (K_max independent of intensity; yield \u221D I above threshold)",
    assumptions: "h\u03BD and W share one energy unit (h=1 when the frequency knob is already an energy); no space charge; R is a relative yield",
    governing: true,
    params,
    paramSchema,
    init(state) {
      state.t = 0;
      state.hist = [];
      this.step(state, 0);
      state.hist.length = 0;
      state.t = 0;
    },
    step(state, dt) {
      const p = state.params || {};
      const hf = photonEnergy(p);
      const W = p.W !== void 0 ? P(p, "W", 0) : P(p, "workFunc", 0);
      const I = Math.max(0, p.I !== void 0 ? P(p, "I", 0) : P(p, "intensity", 0));
      const K = Math.max(0, hf - W);
      state.hf = hf;
      state.W = W;
      state.K = K;
      state.val = K;
      state.rate = K > 0 ? I : 0;
      const frame = Number(dt);
      if (frame > 0) state.t += frame;
      if (!state.hist) state.hist = [];
      state.hist.push(K);
      if (state.hist.length > 160) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H, 40);
      title(ctx, spec.name);
      const mid = box.t + box.h * 0.62;
      const span = Math.max(state.hf, state.W, 0.5);
      const xOf = (e) => box.l + Math.max(0, e) / span * box.w;
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(box.l, mid);
      ctx.lineTo(box.r, mid);
      ctx.stroke();
      ctx.strokeStyle = C.muted;
      ctx.beginPath();
      ctx.moveTo(xOf(state.W), mid - 28);
      ctx.lineTo(xOf(state.W), mid + 18);
      ctx.stroke();
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      ctx.moveTo(xOf(state.hf), mid - 46);
      ctx.lineTo(xOf(state.hf), mid + 10);
      ctx.stroke();
      const kW = Math.max(0, xOf(state.hf) - xOf(state.W));
      ctx.fillStyle = C.accent;
      ctx.fillRect(xOf(state.W), mid - 16, kW, 10);
      const yieldH = Math.min(box.h * 0.28, state.rate * 14);
      ctx.fillStyle = C.vector || C.body;
      ctx.fillRect(box.l, box.b - yieldH, 18, yieldH);
      ctx.fillStyle = C.muted;
      ctx.font = "11px IBM Plex Mono, monospace";
      ctx.fillText("W", xOf(state.W) + 4, mid + 32);
      ctx.fillText("h\u03BD", xOf(state.hf) + 4, mid - 52);
      ctx.fillStyle = C.accent;
      ctx.font = "13px IBM Plex Mono, monospace";
      ctx.fillText(`K_max=${formatNum(state.K, 3)}`, box.l, box.t + 18);
      ctx.fillText(`R=${formatNum(state.rate, 3)}`, box.l + 28, box.b - 4);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "K_max", value: `${formatNum(state.K, d)} eV` },
        { label: "R", value: formatNum(state.rate, d) },
        { label: "h\u03BD", value: `${formatNum(state.hf, d)} eV` },
        { label: "W", value: `${formatNum(state.W, d)} eV` }
      ];
    },
    getEnergy(state) {
      return { kinetic: state.K || 0, potential: 0 };
    },
    getTrajectory(state) {
      return (state.hist || []).map((v, i) => ({ i, K: v }));
    }
  };
}
function buildHeatConductionVariant(spec) {
  const { params, paramSchema } = variantKnobs(spec);
  if (params.k === void 0) params.k = 1;
  const kPrev = paramSchema.k;
  paramSchema.k = schemaNum2("\u03BA", "dynamics", "W/(m\xB7K)", kPrev?.min ?? 0.02, kPrev?.max ?? 400);
  if (params.thk === void 0) {
    params.L = params.L ?? 0.1;
    paramSchema.L = schemaNum2("L", "dynamics", "m", 1e-3, 5);
  } else if (paramSchema.thk) {
    paramSchema.thk = { ...paramSchema.thk, label: paramSchema.thk.label || "L", unit: "m" };
  }
  params.Th = params.Th ?? params.T0 ?? 100;
  paramSchema.Th = schemaNum2("T(0)", "dynamics", "\xB0C", -50, 800);
  if (params.Tb === void 0 && params.Tc === void 0) params.Tb = 0;
  if (!paramSchema.Tb && params.Tc === void 0) {
    paramSchema.Tb = schemaNum2("T(L)", "dynamics", "\xB0C", -50, 800);
  } else if (paramSchema.Tb) {
    paramSchema.Tb = { ...paramSchema.Tb, label: "T(L)" };
  }
  const wallLength = (p) => p.thk !== void 0 ? Math.max(P(p, "thk", 0.01), 1e-9) : Math.max(P(p, "L", 0.1), 1e-9);
  return {
    ...baseMeta2(spec),
    equation: "q = \u2212\u03BA (T(L) \u2212 T(0)) / L",
    authority: "Incropera, Fundamentals of Heat and Mass Transfer, Fourier law q=\u2212\u03BA \u0394T/L (plane wall)",
    assumptions: "Steady plane wall, constant \u03BA, no generation; \u0394T = T(L)\u2212T(0). Single layer when only one thickness is set.",
    governing: true,
    params,
    paramSchema,
    init(state) {
      state.t = 0;
      state.hist = [];
      this.step(state, 0);
      state.hist.length = 0;
      state.t = 0;
    },
    step(state, dt) {
      const p = state.params || {};
      const kappa = P(p, "k", P(p, "kappa", 1));
      const L = wallLength(p);
      const T0 = P(p, "Th", P(p, "T0", 100));
      const TL = p.Tc !== void 0 ? P(p, "Tc", 0) : P(p, "Tb", 0);
      const dT = TL - T0;
      state.kappa = kappa;
      state.Lwall = L;
      state.T0 = T0;
      state.TL = TL;
      state.dT = dT;
      state.q = -kappa * dT / L;
      state.val = state.q;
      const frame = Number(dt);
      if (frame > 0) state.t += frame;
      if (!state.hist) state.hist = [];
      state.hist.push(state.q);
      if (state.hist.length > 160) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H, 36);
      title(ctx, spec.name);
      const plotTop = box.t + 28;
      const plotH = Math.max(20, box.h - 56);
      const tLo = Math.min(state.T0, state.TL);
      const tHi = Math.max(state.T0, state.TL);
      const yOf = (temp) => plotTop + (1 - (temp - tLo) / Math.max(1e-9, tHi - tLo)) * plotH;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l, plotTop, box.w, plotH);
      ctx.lineWidth = 2;
      ctx.beginPath();
      const n = 48;
      for (let i = 0; i < n; i += 1) {
        const u = i / (n - 1);
        const temp = state.T0 + state.dT * u;
        const x = box.l + u * box.w;
        const y = yOf(temp);
        ctx.strokeStyle = heatTempColor(temp, tLo, tHi);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, plotTop + plotH);
        ctx.stroke();
      }
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      ctx.moveTo(box.l, yOf(state.T0));
      ctx.lineTo(box.r, yOf(state.TL));
      ctx.stroke();
      ctx.lineWidth = 1;
      const dir = state.q >= 0 ? 1 : -1;
      const mag = Math.min(box.w * 0.35, 28 + 18 * Math.log10(1 + Math.abs(state.q)));
      const yA = plotTop + plotH * 0.5;
      const x0 = box.l + box.w * 0.5 - dir * mag * 0.5;
      drawArrow(ctx, x0, yA, x0 + dir * mag, yA, C.accent, 2);
      ctx.fillStyle = C.accent;
      ctx.font = "13px IBM Plex Mono, monospace";
      ctx.fillText(`q=${formatNum(state.q, 3)}`, box.l, box.t + 16);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "q", value: `${formatNum(state.q, d)} W/m\xB2` },
        { label: "\u0394T", value: `${formatNum(state.dT, d)} K` },
        { label: "\u03BA", value: `${formatNum(state.kappa, d)} W/(m\xB7K)` },
        { label: "L", value: `${formatNum(state.Lwall, d)} m` }
      ];
    },
    getEnergy() {
      return null;
    },
    getTrajectory(state) {
      const rows = [];
      const n = 16;
      for (let i = 0; i <= n; i += 1) {
        const u = i / n;
        rows.push({
          x: u * state.Lwall,
          T: state.T0 + state.dT * u,
          q: state.q
        });
      }
      return rows;
    }
  };
}
function buildVariant(spec) {
  if (isPhotoelectricSpec(spec)) return buildPhotoelectricVariant(spec);
  if (isHeatConductionSpec(spec)) return buildHeatConductionVariant(spec);
  const physics = buildFamPhysics(spec);
  if (physics) return physics;
  warnDecorativeSine(spec);
  const dimList = Array.isArray(spec.dims) ? spec.dims : [];
  const defaults = spec.defaults && typeof spec.defaults === "object" ? spec.defaults : {};
  const params = { speed: 1, ...defaults };
  const paramSchema = {
    speed: schemaNum2("\u52A8\u753B\u901F", "dynamics", "\u2014", 0.1, 8)
  };
  for (const d of dimList) {
    if (!d?.key) continue;
    if (params[d.key] === void 0) params[d.key] = d.value ?? d.min ?? 1;
    paramSchema[d.key] = schemaNum2(
      d.label || d.key,
      "dynamics",
      d.unit || "\u2014",
      Number.isFinite(d.min) ? d.min : 0,
      Number.isFinite(d.max) ? d.max : 100
    );
  }
  if (!dimList.length) {
    params.amplitude = params.amplitude ?? 1;
    params.offset = params.offset ?? 0.5;
    params.phase = params.phase ?? 0;
    paramSchema.amplitude = schemaNum2("\u632F\u5E45", "dynamics", "\u2014", 0, 20);
    paramSchema.offset = schemaNum2("\u504F\u7F6E", "dynamics", "\u2014", -10, 10);
    paramSchema.phase = schemaNum2("\u76F8\u4F4D", "dynamics", "rad", -6.28, 6.28);
  }
  const axisLabels = Array.isArray(spec.axes) ? spec.axes : [];
  const keys = Object.keys(params).filter((k) => k !== "speed");
  return {
    ...baseMeta2(spec),
    governing: false,
    params,
    paramSchema,
    init(state) {
      state.t = 0;
      state.val = 0;
      state.hist = [];
      state.parts = keys.slice(0, 6).map((k, i) => ({
        k,
        x: 0.15 + i % 3 * 0.3,
        y: 0.35 + Math.floor(i / 3) * 0.3,
        r: 0.04
      }));
    },
    step(state, dt) {
      const sp = P(state.params, "speed", 1);
      state.t += dt * sp;
      let acc = 0;
      let w = 0;
      for (const k of keys) {
        const v = P(state.params, k, 0);
        if (!Number.isFinite(v)) continue;
        acc += v;
        w += 1;
      }
      const mean = w ? acc / w : 0;
      const amp = Number.isFinite(P(state.params, "amplitude", NaN)) ? P(state.params, "amplitude", 1) : Math.max(0.2, Math.abs(mean) * 0.15 + 0.5);
      const phase = P(state.params, "phase", 0);
      const offset = Number.isFinite(P(state.params, "offset", NaN)) ? P(state.params, "offset", 0) : mean * 0.02;
      state.val = amp * Math.sin(state.t + phase) + offset;
      state.metric = mean;
      state.hist.push(state.val);
      if (state.hist.length > 160) state.hist.shift();
      if (Array.isArray(state.parts)) {
        for (let i = 0; i < state.parts.length; i += 1) {
          const p = state.parts[i];
          const kv = P(state.params, p.k, 1);
          p.vx = 0.15 * Math.sin(state.t * (1.1 + i * 0.17) + kv * 0.01);
          p.vy = 0.12 * Math.cos(state.t * (0.9 + i * 0.13) - kv * 0.01);
          p.x = Math.min(0.92, Math.max(0.08, p.x + p.vx * dt));
          p.y = Math.min(0.88, Math.max(0.18, p.y + p.vy * dt));
        }
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H, 40);
      title(ctx, spec.name);
      if (axisLabels.length) {
        ctx.fillStyle = C.muted;
        ctx.font = "10px IBM Plex Mono, monospace";
        ctx.fillText(axisLabels.join(" \xB7 ").slice(0, 64), 12, 34);
      }
      const mid = box.t + box.h * 0.58;
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(box.l, mid);
      ctx.lineTo(box.r, mid);
      ctx.stroke();
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      state.hist.forEach((v, i) => {
        const x = box.l + i / 160 * box.w;
        const y = mid - v * 18;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      ctx.lineWidth = 1;
      if (Array.isArray(state.parts)) {
        for (const p of state.parts) {
          const x = box.l + p.x * box.w;
          const y = box.t + p.y * box.h * 0.7;
          ctx.fillStyle = C.accent;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(4, p.r * box.w), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = C.muted;
          ctx.font = "9px IBM Plex Mono, monospace";
          ctx.fillText(p.k, x + 6, y - 6);
        }
      }
      ctx.fillStyle = C.accent;
      ctx.font = "13px IBM Plex Mono, monospace";
      ctx.fillText(formatNum(state.val, 3), box.l, box.t + 28);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      const rows = [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "val", value: formatNum(state.val, d) },
        { label: "metric", value: formatNum(state.metric, d) }
      ];
      for (const k of keys.slice(0, 6)) {
        rows.push({ label: k, value: formatNum(P(state.params, k, 0), d) });
      }
      return rows;
    },
    getTrajectory(state) {
      return state.hist.map((v, i) => ({ i, v }));
    }
  };
}
function buildOde1d(spec) {
  const inclined = spec.id === "inclined-plane";
  const drag = spec.id === "drag-fall";
  return {
    ...baseMeta2(spec),
    params: inclined ? { g: 9.81, theta: 30, mu: 0.2, m: 1, s0: 0 } : { g: 9.81, m: 1, b: 0.8, h: 8 },
    paramSchema: inclined ? {
      g: schemaNum2("g", "dynamics", "m/s\xB2", 0, 40),
      theta: schemaNum2("\u03B8", "dynamics", "\xB0", 0, 80),
      mu: schemaNum2("\u03BC", "dynamics", "\u2014", 0, 1),
      m: schemaNum2("m", "dynamics", "kg", 0.01, 100),
      s0: schemaNum2("s\u2080", "initial", "m", 0, 20)
    } : {
      g: schemaNum2("g", "dynamics", "m/s\xB2", 0, 40),
      m: schemaNum2("m", "dynamics", "kg", 0.01, 100),
      b: schemaNum2("b", "dynamics", "kg/s", 0, 20),
      h: schemaNum2("h\u2080", "initial", "m", 0, 40)
    },
    init(state) {
      state.t = 0;
      state.trail = [];
      if (inclined) {
        state.s = P(state.params, "s0", 0);
        state.v = 0;
      } else {
        state.y = P(state.params, "h", 8);
        state.v = 0;
      }
    },
    step(state, dt) {
      if (inclined) {
        const g = P(state.params, "g", 9.81);
        const th = P(state.params, "theta", 30) * Math.PI / 180;
        const mu = P(state.params, "mu", 0.2);
        const a = g * (Math.sin(th) - mu * Math.cos(th));
        state.v += a * dt;
        state.s += state.v * dt;
        if (state.s < 0) {
          state.s = 0;
          state.v = 0;
        }
        if (state.s > 12) {
          state.s = 12;
          state.v = 0;
        }
        state.a = a;
      } else {
        const g = P(state.params, "g", 9.81);
        const m = Math.max(P(state.params, "m", 1), 1e-6);
        const b = P(state.params, "b", 0.8);
        const a = g - b / m * state.v;
        state.v += a * dt;
        state.y -= state.v * dt;
        if (state.y < 0) {
          state.y = 0;
          state.v = 0;
        }
        state.a = a;
      }
      state.t += dt;
      pushTrail(state.trail, inclined ? state.s : state.y, 240);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      if (inclined) {
        const th = P(state.params, "theta", 30) * Math.PI / 180;
        const x0 = box.l;
        const y0 = box.b;
        const len = box.w * 0.85;
        const x1 = x0 + len * Math.cos(th);
        const y1 = y0 - len * Math.sin(th);
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        const u = Math.min(1, state.s / 12);
        const bx = x0 + u * (x1 - x0);
        const by = y0 + u * (y1 - y0);
        ctx.fillStyle = C.body;
        ctx.fillRect(bx - 10, by - 18, 20, 16);
        if (view.showVectors !== false) {
          drawArrow(ctx, bx, by - 8, bx + state.v * 6 * Math.cos(th), by - 8 - state.v * 6 * Math.sin(th), C.vector, 2);
        }
      } else {
        const h0 = Math.max(P(state.params, "h", 8), 0.1);
        const ground = box.b;
        const scale = box.h / (h0 * 1.2);
        const cx = W * 0.45;
        const sy = ground - state.y * scale;
        ctx.strokeStyle = C.axis;
        ctx.beginPath();
        ctx.moveTo(box.l, ground);
        ctx.lineTo(box.r, ground);
        ctx.stroke();
        ctx.fillStyle = C.body;
        ctx.beginPath();
        ctx.arc(cx, sy, 11, 0, Math.PI * 2);
        ctx.fill();
        if (view.showVectors !== false) drawArrow(ctx, cx, sy, cx, sy + state.v * 5, C.vector, 2);
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      if (inclined) {
        return [
          { label: "t", value: `${formatNum(state.t, d)} s` },
          { label: "s", value: `${formatNum(state.s, d)} m` },
          { label: "v", value: `${formatNum(state.v, d)} m/s` },
          { label: "a", value: `${formatNum(state.a, d)} m/s\xB2` }
        ];
      }
      return [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "y", value: `${formatNum(state.y, d)} m` },
        { label: "v", value: `${formatNum(state.v, d)} m/s` },
        { label: "a", value: `${formatNum(state.a, d)} m/s\xB2` }
      ];
    },
    getTrajectory(state) {
      return (state.trail || []).map((v, i) => ({ i, v }));
    }
  };
}
function buildOde2d(spec) {
  return {
    ...baseMeta2(spec),
    params: { q: 1, m: 1, Ex: 2, Ey: 0, vx0: 2, vy0: 3, x0: -2, y0: 0 },
    paramSchema: {
      q: schemaNum2("q", "dynamics", "C", -5, 5),
      m: schemaNum2("m", "dynamics", "kg", 0.01, 20),
      Ex: schemaNum2("Ex", "dynamics", "N/C", -10, 10),
      Ey: schemaNum2("Ey", "dynamics", "N/C", -10, 10),
      vx0: schemaNum2("vx\u2080", "initial", "m/s", -20, 20),
      vy0: schemaNum2("vy\u2080", "initial", "m/s", -20, 20),
      x0: schemaNum2("x\u2080", "initial", "m", -5, 5),
      y0: schemaNum2("y\u2080", "initial", "m", -5, 5)
    },
    init(state) {
      state.t = 0;
      state.x = P(state.params, "x0", -2);
      state.y = P(state.params, "y0", 0);
      state.vx = P(state.params, "vx0", 2);
      state.vy = P(state.params, "vy0", 3);
      state.trail = [];
    },
    step(state, dt) {
      const q = P(state.params, "q", 1);
      const m = Math.max(P(state.params, "m", 1), 1e-6);
      const ax = q * P(state.params, "Ex", 0) / m;
      const ay = q * P(state.params, "Ey", 0) / m;
      state.vx += ax * dt;
      state.vy += ay * dt;
      state.x += state.vx * dt;
      state.y += state.vy * dt;
      state.t += dt;
      pushTrail(state.trail, { x: state.x, y: state.y }, 500);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const sx = (x) => box.l + box.w * 0.5 + x * 28;
      const sy = (y) => box.t + box.h * 0.5 - y * 28;
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(box.l, sy(0));
      ctx.lineTo(box.r, sy(0));
      ctx.moveTo(sx(0), box.t);
      ctx.lineTo(sx(0), box.b);
      ctx.stroke();
      if (view.showTrail !== false && state.trail.length > 1) {
        ctx.strokeStyle = C.trail;
        ctx.beginPath();
        state.trail.forEach((p, i) => i ? ctx.lineTo(sx(p.x), sy(p.y)) : ctx.moveTo(sx(p.x), sy(p.y)));
        ctx.stroke();
      }
      ctx.fillStyle = C.body;
      ctx.beginPath();
      ctx.arc(sx(state.x), sy(state.y), 8, 0, Math.PI * 2);
      ctx.fill();
      if (view.showVectors !== false) {
        drawArrow(ctx, sx(state.x), sy(state.y), sx(state.x) + P(state.params, "Ex", 0) * 12, sy(state.y) - P(state.params, "Ey", 0) * 12, C.vector, 2);
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "x", value: `${formatNum(state.x, d)}` },
        { label: "y", value: `${formatNum(state.y, d)}` },
        { label: "v", value: `${formatNum(Math.hypot(state.vx, state.vy), d)}` }
      ];
    },
    getTrajectory(state) {
      return state.trail;
    }
  };
}
function buildCircular(spec) {
  return {
    ...baseMeta2(spec),
    params: { R: 2, omega: 1.5, m: 1 },
    paramSchema: {
      R: schemaNum2("R", "dynamics", "m", 0.2, 8),
      omega: schemaNum2("\u03C9", "dynamics", "rad/s", 0.1, 8),
      m: schemaNum2("m", "dynamics", "kg", 0.01, 50)
    },
    init(state) {
      state.t = 0;
      state.trail = [];
    },
    step(state, dt) {
      state.t += dt;
      const R = P(state.params, "R", 2);
      const w = P(state.params, "omega", 1.5);
      state.x = R * Math.cos(w * state.t);
      state.y = R * Math.sin(w * state.t);
      pushTrail(state.trail, { x: state.x, y: state.y }, 360);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const cx = W / 2;
      const cy = H / 2;
      const R = P(state.params, "R", 2);
      const sc = Math.min(W, H) * 0.18;
      title(ctx, spec.name);
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.arc(cx, cy, R * sc, 0, Math.PI * 2);
      ctx.stroke();
      const x = cx + state.x * sc;
      const y = cy - state.y * sc;
      ctx.fillStyle = C.body;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      if (view.showVectors !== false) {
        drawArrow(ctx, x, y, cx + (cx - x) * 0.35, cy + (cy - y) * 0.35, C.accent, 2);
        const w = P(state.params, "omega", 1.5);
        drawArrow(ctx, x, y, x - state.y * w * sc * 0.25, y - state.x * w * sc * 0.25, C.vector, 2);
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      const R = P(state.params, "R", 2);
      const w = P(state.params, "omega", 1.5);
      return [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "v", value: `${formatNum(R * w, d)} m/s` },
        { label: "a\u2099", value: `${formatNum(w * w * R, d)} m/s\xB2` }
      ];
    },
    getTrajectory(state) {
      return state.trail;
    }
  };
}
function buildParticles(spec) {
  const isGas = /ideal-gas|entropy|sph|collision-2d/.test(spec.id);
  return {
    ...baseMeta2(spec),
    params: { N: 40, T: 300, seed: 7, viscosity: 0.2, g: 2, e: 0.9 },
    paramSchema: {
      N: schemaNum2("N", "numerics", "\u2014", 8, 120),
      T: schemaNum2("T", "dynamics", "K", 50, 1e3),
      seed: schemaNum2("seed", "initial", "\u2014", 1, 9999),
      viscosity: schemaNum2("\u7C98\u5EA6", "dynamics", "\u2014", 0, 2),
      g: schemaNum2("g", "dynamics", "m/s\xB2", 0, 20),
      e: schemaNum2("e", "dynamics", "\u2014", 0, 1)
    },
    init(state) {
      const cap = mobileBudget().particleNCap;
      const n = Math.min(cap, Math.max(4, Math.floor(P(state.params, "N", 40))));
      if (Number(state.params.N) > n) state.params.N = n;
      const r = rnd(P(state.params, "seed", 7));
      const T = P(state.params, "T", 300);
      const speed = Math.sqrt(T) * 0.02;
      state.parts = Array.from({ length: n }, (_, i) => ({
        x: 0.1 + r() * 0.8,
        y: 0.1 + r() * 0.8,
        vx: (r() - 0.5) * speed * 2,
        vy: (r() - 0.5) * speed * 2,
        kind: i < n / 2 ? 0 : 1
      }));
      state.t = 0;
      state.entropy = 0;
    },
    step(state, dt) {
      const visc = P(state.params, "viscosity", 0.2);
      const g = P(state.params, "g", 0) * (isGas && spec.id === "sph-simple" ? 1 : 0);
      const e = P(state.params, "e", 0.9);
      const cap = mobileBudget().particleNCap;
      if (state.parts.length > cap) state.parts.length = cap;
      for (const p of state.parts) {
        p.vy += g * dt * 0.15;
        p.vx *= 1 - visc * dt * 0.3;
        p.vy *= 1 - visc * dt * 0.3;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < 0.02 || p.x > 0.98) {
          p.vx *= -e;
          p.x = Math.max(0.02, Math.min(0.98, p.x));
        }
        if (p.y < 0.02 || p.y > 0.98) {
          p.vy *= -e;
          p.y = Math.max(0.02, Math.min(0.98, p.y));
        }
      }
      if (/collision-2d|sph/.test(spec.id)) {
        const parts = state.parts;
        const cell = particleHashCell(parts.length);
        const buckets = /* @__PURE__ */ new Map();
        const cellKey = (x, y) => `${x / cell | 0},${y / cell | 0}`;
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          const k = cellKey(p.x, p.y);
          let bin = buckets.get(k);
          if (!bin) {
            bin = [];
            buckets.set(k, bin);
          }
          bin.push(i);
        }
        const resolve = (i, j) => {
          const a = parts[i];
          const b = parts[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= 25e-4 || d2 <= 1e-8) return;
          const d = Math.sqrt(d2);
          const nx = dx / d;
          const ny = dy / d;
          const dv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (dv > 0) return;
          a.vx -= dv * nx * 0.5 * (1 + e);
          a.vy -= dv * ny * 0.5 * (1 + e);
          b.vx += dv * nx * 0.5 * (1 + e);
          b.vy += dv * ny * 0.5 * (1 + e);
        };
        for (const [k, idxs] of buckets) {
          const comma = k.indexOf(",");
          const cx = Number(k.slice(0, comma));
          const cy = Number(k.slice(comma + 1));
          for (let ndx = 0; ndx <= 1; ndx += 1) {
            for (let ndy = ndx === 0 ? 0 : -1; ndy <= 1; ndy += 1) {
              const other = buckets.get(`${cx + ndx},${cy + ndy}`);
              if (!other) continue;
              if (ndx === 0 && ndy === 0) {
                for (let a = 0; a < idxs.length; a += 1) {
                  for (let b = a + 1; b < idxs.length; b += 1) resolve(idxs[a], idxs[b]);
                }
              } else {
                for (const i of idxs) {
                  for (const j of other) resolve(i, j);
                }
              }
            }
          }
        }
      }
      state.t += dt;
      if (spec.id === "entropy-mix") {
        const left = state.parts.filter((p) => p.x < 0.5).length / state.parts.length;
        state.entropy = -left * Math.log(Math.max(left, 1e-6)) - (1 - left) * Math.log(Math.max(1 - left, 1e-6));
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H, 28);
      title(ctx, spec.name);
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l, box.t, box.w, box.h);
      for (const p of state.parts) {
        ctx.fillStyle = p.kind ? C.accent : C.body;
        ctx.beginPath();
        ctx.arc(box.l + p.x * box.w, box.t + p.y * box.h, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      const ke = state.parts.reduce((s, p) => s + 0.5 * (p.vx * p.vx + p.vy * p.vy), 0);
      const rows = [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "N", value: String(state.parts.length) },
        { label: "KE", value: formatNum(ke, d) }
      ];
      if (spec.id === "entropy-mix") rows.push({ label: "S", value: formatNum(state.entropy, d) });
      return rows;
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildNbody(spec) {
  return {
    ...baseMeta2(spec),
    params: { G: 1.2, m1: 12, m2: 8, m3: 1, soft: 1.1, seed: 3 },
    paramSchema: {
      G: schemaNum2("G", "dynamics", "\u2014", 0.1, 5),
      m1: schemaNum2("m1", "dynamics", "\u2014", 0.1, 40),
      m2: schemaNum2("m2", "dynamics", "\u2014", 0.1, 40),
      m3: schemaNum2("m3", "dynamics", "\u2014", 0.01, 20),
      soft: schemaNum2("soft", "numerics", "\u2014", 0.05, 2),
      seed: schemaNum2("seed", "initial", "\u2014", 1, 99)
    },
    init(state) {
      const binary = spec.id === "binary-stars";
      const assist = spec.id === "gravity-assist";
      if (binary) {
        state.bodies = [
          { m: P(state.params, "m1", 12), x: -1.2, y: 0, vx: 0, vy: -0.55 },
          { m: P(state.params, "m2", 8), x: 1.5, y: 0, vx: 0, vy: 0.7 }
        ];
      } else if (assist) {
        state.bodies = [
          { m: P(state.params, "m1", 20), x: 0, y: 0, vx: 0, vy: 0 },
          { m: P(state.params, "m2", 4), x: 3.2, y: 0, vx: 0, vy: 1.05 },
          { m: P(state.params, "m3", 0.05), x: -4, y: 1.2, vx: 1.6, vy: 0 }
        ];
      } else {
        state.bodies = [
          { m: P(state.params, "m1", 12), x: -1, y: 0.2, vx: 0, vy: 0.6 },
          { m: P(state.params, "m2", 8), x: 1.2, y: -0.1, vx: 0, vy: -0.5 },
          { m: P(state.params, "m3", 1), x: 0, y: 1.6, vx: -0.7, vy: 0 }
        ];
      }
      state.t = 0;
      state.trails = state.bodies.map(() => []);
    },
    step(state, dt) {
      const G2 = P(state.params, "G", 1.2);
      const soft = P(state.params, "soft", 0.2);
      const n = state.bodies.length;
      const acc = state.bodies.map(() => ({ ax: 0, ay: 0 }));
      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          const a = state.bodies[i];
          const b = state.bodies[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const r2 = dx * dx + dy * dy + soft * soft;
          const inv = G2 / (r2 * Math.sqrt(r2));
          acc[i].ax += inv * b.m * dx;
          acc[i].ay += inv * b.m * dy;
          acc[j].ax -= inv * a.m * dx;
          acc[j].ay -= inv * a.m * dy;
        }
      }
      for (let i = 0; i < n; i += 1) {
        const b = state.bodies[i];
        b.vx += acc[i].ax * dt;
        b.vy += acc[i].ay * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        state.trails[i].push({ x: b.x, y: b.y });
        if (state.trails[i].length > 280) state.trails[i].shift();
      }
      state.t += dt;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const cx = W / 2;
      const cy = H / 2;
      const sc = Math.min(W, H) * 0.12;
      title(ctx, spec.name);
      state.bodies.forEach((b, i) => {
        if (view.showTrail !== false && state.trails[i].length > 1) {
          ctx.strokeStyle = i ? C.trail : C.theory;
          ctx.beginPath();
          state.trails[i].forEach((p, k) => k ? ctx.lineTo(cx + p.x * sc, cy - p.y * sc) : ctx.moveTo(cx + p.x * sc, cy - p.y * sc));
          ctx.stroke();
        }
        ctx.fillStyle = i === 0 ? C.body : i === 1 ? C.accent : C.vector;
        ctx.beginPath();
        ctx.arc(cx + b.x * sc, cy - b.y * sc, 4 + Math.sqrt(b.m), 0, Math.PI * 2);
        ctx.fill();
      });
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "bodies", value: String(state.bodies.length) },
        { label: "r12", value: formatNum(Math.hypot(state.bodies[0].x - state.bodies[1].x, state.bodies[0].y - state.bodies[1].y), d) }
      ];
    },
    getTrajectory(state) {
      return state.trails?.[0] || [];
    }
  };
}
function buildEuler(spec) {
  return {
    ...baseMeta2(spec),
    params: { I1: 1, I2: 1.4, I3: 2, wx: 1.2, wy: 0.2, wz: 0.1 },
    paramSchema: {
      I1: schemaNum2("I\u2081", "dynamics", "\u2014", 0.2, 5),
      I2: schemaNum2("I\u2082", "dynamics", "\u2014", 0.2, 5),
      I3: schemaNum2("I\u2083", "dynamics", "\u2014", 0.2, 5),
      wx: schemaNum2("\u03C9x", "initial", "rad/s", -5, 5),
      wy: schemaNum2("\u03C9y", "initial", "rad/s", -5, 5),
      wz: schemaNum2("\u03C9z", "initial", "rad/s", -5, 5)
    },
    init(state) {
      state.t = 0;
      state.wx = P(state.params, "wx", 1.2);
      state.wy = P(state.params, "wy", 0.2);
      state.wz = P(state.params, "wz", 0.1);
      state.trail = [];
    },
    step(state, dt) {
      const I1 = P(state.params, "I1", 1);
      const I2 = P(state.params, "I2", 1.4);
      const I3 = P(state.params, "I3", 2);
      const { wx, wy, wz } = state;
      const dwx = (I2 - I3) / I1 * wy * wz;
      const dwy = (I3 - I1) / I2 * wz * wx;
      const dwz = (I1 - I2) / I3 * wx * wy;
      state.wx += dwx * dt;
      state.wy += dwy * dt;
      state.wz += dwz * dt;
      state.t += dt;
      pushTrail(state.trail, { x: state.wx, y: state.wy, z: state.wz }, 400);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const cx = W / 2;
      const cy = H / 2;
      const sc = 40;
      title(ctx, spec.name);
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(cx - 80, cy);
      ctx.lineTo(cx + 80, cy);
      ctx.moveTo(cx, cy - 80);
      ctx.lineTo(cx, cy + 80);
      ctx.stroke();
      if (state.trail.length > 1) {
        ctx.strokeStyle = C.trail;
        ctx.beginPath();
        state.trail.forEach((p, i) => {
          const x = cx + p.x * sc + p.z * 12;
          const y = cy - p.y * sc + p.z * 8;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
      drawArrow(ctx, cx, cy, cx + state.wx * sc, cy - state.wy * sc, C.vector, 2);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "\u03C9x", value: formatNum(state.wx, d) },
        { label: "\u03C9y", value: formatNum(state.wy, d) },
        { label: "\u03C9z", value: formatNum(state.wz, d) }
      ];
    },
    getTrajectory(state) {
      return state.trail;
    }
  };
}
function buildBuoyancy(spec) {
  return {
    ...baseMeta2(spec),
    params: { rhoObj: 700, rhoFluid: 1e3, V: 0.02, g: 9.81 },
    paramSchema: {
      rhoObj: schemaNum2("\u03C1\u7269\u4F53", "dynamics", "kg/m\xB3", 100, 2e3),
      rhoFluid: schemaNum2("\u03C1\u6DB2\u4F53", "dynamics", "kg/m\xB3", 200, 2e3),
      V: schemaNum2("V", "dynamics", "m\xB3", 1e-3, 0.1),
      g: schemaNum2("g", "dynamics", "m/s\xB2", 1, 40)
    },
    init(state) {
      state.t = 0;
      state.y = 0.7;
      state.v = 0;
    },
    step(state, dt) {
      const g = P(state.params, "g", 9.81);
      const V = P(state.params, "V", 0.02);
      const ro = P(state.params, "rhoObj", 700);
      const rf = P(state.params, "rhoFluid", 1e3);
      const submerged = Math.max(0, Math.min(1, (0.55 - state.y + 0.12) / 0.24));
      const Fb = rf * V * submerged * g;
      const Fg = ro * V * g;
      const m = Math.max(ro * V, 1e-4);
      const a = (Fg - Fb) / m - 1.5 * state.v;
      state.v += a * dt;
      state.y += state.v * dt * 0.15;
      state.y = Math.max(0.15, Math.min(0.85, state.y));
      state.Fb = Fb;
      state.Fg = Fg;
      state.sub = submerged;
      state.t += dt;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const waterY = box.t + box.h * 0.45;
      ctx.fillStyle = "rgba(56,189,248,0.25)";
      ctx.fillRect(box.l, waterY, box.w, box.b - waterY);
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l, box.t, box.w, box.h);
      const bx = W / 2;
      const by = box.t + state.y * box.h;
      ctx.fillStyle = C.body;
      ctx.fillRect(bx - 28, by - 22, 56, 44);
      if (view.showVectors !== false) {
        drawArrow(ctx, bx - 40, by, bx - 40, by + 30, C.accent, 2);
        drawArrow(ctx, bx + 40, by, bx + 40, by - 30, C.vector, 2);
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "Fb", value: formatNum(state.Fb, d) },
        { label: "Fg", value: formatNum(state.Fg, d) },
        { label: "sub", value: formatNum(state.sub, d) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildFlow(spec) {
  return {
    ...baseMeta2(spec),
    params: { Q: 2, D1: 1.2, D2: 0.6, mu: 0.05, rho: 1 },
    paramSchema: {
      Q: schemaNum2("\u6D41\u91CF Q", "dynamics", "\u2014", 0.2, 8),
      D1: schemaNum2("D\u2081", "dynamics", "\u2014", 0.3, 3),
      D2: schemaNum2("D\u2082", "dynamics", "\u2014", 0.2, 2),
      mu: schemaNum2("\u7C98\u5EA6 \u03BC", "dynamics", "\u2014", 1e-3, 1),
      rho: schemaNum2("\u03C1", "dynamics", "\u2014", 0.2, 5)
    },
    init(state) {
      state.t = 0;
      state.phase = 0;
    },
    step(state, dt) {
      state.t += dt;
      state.phase += dt * P(state.params, "Q", 2);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const D1 = P(state.params, "D1", 1.2);
      const D2 = P(state.params, "D2", 0.6);
      const y1 = box.t + box.h * 0.5;
      const h1 = 18 * D1;
      const h2 = 18 * D2;
      ctx.fillStyle = C.axis;
      ctx.fillRect(box.l, y1 - h1 / 2, box.w * 0.45, h1);
      ctx.fillRect(box.l + box.w * 0.45, y1 - h2 / 2, box.w * 0.45, h2);
      const A1 = Math.PI * (D1 / 2) ** 2;
      const A2 = Math.PI * (D2 / 2) ** 2;
      const Q = P(state.params, "Q", 2);
      const v1 = Q / Math.max(A1, 1e-6);
      const v2 = Q / Math.max(A2, 1e-6);
      const P1 = 1 - 0.5 * v1 * v1;
      const P2 = 1 - 0.5 * v2 * v2;
      for (let i = 0; i < 8; i += 1) {
        const u = (state.phase * 0.15 + i / 8) % 1;
        const x = box.l + u * box.w * 0.9;
        const narrow = u > 0.45;
        const yy = y1 + Math.sin(u * 12 + state.phase) * (narrow ? 6 : 3) * (spec.id.includes("turb") && P(state.params, "rho", 1) * v2 * D2 / Math.max(P(state.params, "mu", 0.05), 1e-4) > 2e3 ? 2.5 : 0.4);
        ctx.fillStyle = heatTempColor(narrow ? P2 : P1, -2, 2);
        ctx.beginPath();
        ctx.arc(x, yy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      state._Re = P(state.params, "rho", 1) * v2 * D2 / Math.max(P(state.params, "mu", 0.05), 1e-4);
      state._v1 = v1;
      state._v2 = v2;
      state._P1 = P1;
      state._P2 = P2;
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "v1", value: formatNum(state._v1, d) },
        { label: "v2", value: formatNum(state._v2, d) },
        { label: "\u0394P", value: formatNum((state._P1 || 0) - (state._P2 || 0), d) },
        { label: "Re", value: formatNum(state._Re, 1) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildWave1d(spec) {
  return {
    ...baseMeta2(spec),
    params: { f: 1.2, A: 1, c: 1.5, L: 1, nMode: 2, barrierH: 4, barrierW: 0.15, E: 2 },
    paramSchema: {
      f: schemaNum2("f", "dynamics", "Hz", 0.1, 8),
      A: schemaNum2("A", "dynamics", "\u2014", 0.1, 3),
      c: schemaNum2("c", "dynamics", "\u2014", 0.2, 5),
      L: schemaNum2("L", "dynamics", "\u2014", 0.3, 3),
      nMode: schemaNum2("mode n", "dynamics", "\u2014", 1, 6),
      barrierH: schemaNum2("\u52BF\u5792\u9AD8", "dynamics", "\u2014", 0, 12),
      barrierW: schemaNum2("\u52BF\u5792\u5BBD", "dynamics", "\u2014", 0.02, 0.5),
      E: schemaNum2("E", "dynamics", "\u2014", 0.1, 10)
    },
    init(state) {
      state.t = 0;
      state.N = 96;
      state.y = new Float64Array(state.N);
    },
    step(state, dt) {
      state.t += dt;
      const N = state.N;
      const f = P(state.params, "f", 1.2);
      const A = P(state.params, "A", 1);
      const c = P(state.params, "c", 1.5);
      const n = Math.max(1, Math.round(P(state.params, "nMode", 2)));
      for (let i = 0; i < N; i += 1) {
        const x = i / (N - 1);
        if (spec.id === "standing-wave") {
          state.y[i] = A * Math.sin(n * Math.PI * x) * Math.cos(2 * Math.PI * f * state.t);
        } else if (spec.id === "longitudinal-wave") {
          state.y[i] = A * Math.sin(2 * Math.PI * (x * 3 - f * state.t));
        } else if (spec.id === "em-wave") {
          state.y[i] = A * Math.sin(2 * Math.PI * (x * 2 - f * state.t));
        } else if (spec.id === "wavepacket") {
          const x0 = 0.35 + 0.1 * Math.sin(state.t * 0.2);
          const w = 0.08;
          state.y[i] = A * Math.exp(-((x - x0) ** 2) / (2 * w * w)) * Math.cos(40 * (x - c * state.t * 0.05));
        } else if (spec.id === "tunneling") {
          const k = Math.sqrt(Math.max(P(state.params, "E", 2), 0.1)) * 8;
          const bw = P(state.params, "barrierW", 0.15);
          const mid = 0.55;
          const inside = Math.abs(x - mid) < bw / 2;
          const amp = inside ? A * Math.exp(-P(state.params, "barrierH", 4) * Math.abs(x - mid)) : A;
          state.y[i] = amp * Math.sin(k * x - 6 * state.t);
        } else {
          state.y[i] = A * Math.sin(2 * Math.PI * (x * 2 - f * state.t));
        }
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const mid = box.t + box.h / 2;
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(box.l, mid);
      ctx.lineTo(box.r, mid);
      ctx.stroke();
      if (spec.id === "tunneling") {
        const bw = P(state.params, "barrierW", 0.15);
        ctx.fillStyle = "rgba(148,163,184,0.25)";
        ctx.fillRect(box.l + (0.55 - bw / 2) * box.w, box.t + 20, bw * box.w, box.h - 40);
      }
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < state.N; i += 1) {
        const x = box.l + i / (state.N - 1) * box.w;
        const y = mid - state.y[i] * box.h * 0.28;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      if (spec.id === "longitudinal-wave") {
        for (let i = 0; i < 24; i += 1) {
          const x0 = i / 23;
          const disp = 0.02 * P(state.params, "A", 1) * Math.sin(2 * Math.PI * (x0 * 3 - P(state.params, "f", 1.2) * state.t));
          ctx.fillStyle = C.accent;
          ctx.beginPath();
          ctx.arc(box.l + (x0 + disp) * box.w, mid + 40, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "f", value: formatNum(P(state.params, "f", 1), d) },
        { label: "A", value: formatNum(P(state.params, "A", 1), d) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildDoppler(spec) {
  return {
    ...baseMeta2(spec),
    params: { f: 2, v: 1.2, vs: 0.6, c: 2 },
    paramSchema: {
      f: schemaNum2("f", "dynamics", "Hz", 0.2, 8),
      vs: schemaNum2("\u6E90\u901F", "dynamics", "\u2014", -2, 2),
      c: schemaNum2("\u6CE2\u901F", "dynamics", "\u2014", 0.5, 5),
      v: schemaNum2("\u89C2\u5BDF\u8005", "dynamics", "\u2014", -2, 2)
    },
    init(state) {
      state.t = 0;
      state.rings = [];
      state.x = 0.25;
    },
    step(state, dt) {
      state.t += dt;
      state.x += P(state.params, "vs", 0.6) * dt * 0.08;
      if (state.x > 0.9) state.x = 0.1;
      const period = 1 / Math.max(P(state.params, "f", 2), 0.1);
      if (!state.acc) state.acc = 0;
      state.acc += dt;
      if (state.acc >= period) {
        state.acc = 0;
        state.rings.push({ x: state.x, r: 0, born: state.t });
      }
      const c = P(state.params, "c", 2);
      for (const ring of state.rings) ring.r = (state.t - ring.born) * c * 0.12;
      state.rings = state.rings.filter((r) => r.r < 1.2);
      const vs = P(state.params, "vs", 0.6);
      const vo = P(state.params, "v", 0);
      state.fp = P(state.params, "f", 2) * (c + vo) / Math.max(c - vs, 0.05);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const cy = box.t + box.h / 2;
      for (const ring of state.rings) {
        ctx.strokeStyle = C.trail;
        ctx.beginPath();
        ctx.arc(box.l + ring.x * box.w, cy, ring.r * box.w * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = C.body;
      ctx.beginPath();
      ctx.arc(box.l + state.x * box.w, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.accent;
      ctx.fillRect(box.r - 30, cy - 10, 14, 20);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "f\u2032", value: formatNum(state.fp, d) },
        { label: "rings", value: String(state.rings.length) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildInterference(spec) {
  return {
    ...baseMeta2(spec),
    params: { f: 2, phase: 0, d: 0.25, lambda: 0.18, slit: 0.12 },
    paramSchema: {
      f: schemaNum2("f", "dynamics", "Hz", 0.2, 8),
      phase: schemaNum2("\u0394\u03C6", "dynamics", "rad", -3.14, 3.14),
      d: schemaNum2("\u95F4\u8DDD d", "dynamics", "\u2014", 0.05, 0.6),
      lambda: schemaNum2("\u03BB", "dynamics", "\u2014", 0.05, 0.5),
      slit: schemaNum2("\u7F1D\u5BBD", "dynamics", "\u2014", 0.02, 0.4)
    },
    init(state) {
      state.t = 0;
    },
    step(state, dt) {
      state.t += dt;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H, 32);
      title(ctx, spec.name);
      const budget = mobileBudget();
      const cols = budget.interferenceCols;
      const rows = budget.interferenceRows;
      const d = P(state.params, "d", 0.25);
      const lam = P(state.params, "lambda", 0.18);
      const ph = P(state.params, "phase", 0);
      const slit = P(state.params, "slit", 0.12);
      const k = 2 * Math.PI / Math.max(lam, 1e-4);
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const x = i / (cols - 1);
          const y = j / (rows - 1);
          let amp;
          if (spec.id === "diffraction" || spec.id === "single-slit") {
            const beta = Math.PI * slit * (y - 0.5) / Math.max(lam, 1e-4);
            amp = beta === 0 ? 1 : Math.sin(beta) / beta;
            amp *= Math.cos(k * x - 4 * state.t);
          } else {
            const r1 = Math.hypot(x, y - (0.5 - d / 2));
            const r2 = Math.hypot(x, y - (0.5 + d / 2));
            amp = Math.cos(k * r1 - 4 * state.t) + Math.cos(k * r2 - 4 * state.t + ph);
          }
          const u = (amp + 2) / 4;
          ctx.fillStyle = heatTempColor(u, 0, 1);
          ctx.fillRect(box.l + i / cols * box.w, box.t + j / rows * box.h, box.w / cols + 1, box.h / rows + 1);
        }
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "\u03BB", value: formatNum(P(state.params, "lambda", 0.18), d) },
        { label: "d", value: formatNum(P(state.params, "d", 0.25), d) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildField2d(spec) {
  return {
    ...baseMeta2(spec),
    params: { alpha: 0.15, n: 24, tension: 1, excite: 0.5 },
    paramSchema: {
      alpha: schemaNum2("\u03B1", "dynamics", "\u2014", 0.01, 0.5),
      n: schemaNum2("n", "numerics", "\u2014", 12, 48),
      tension: schemaNum2("\u5F20\u529B", "dynamics", "\u2014", 0.2, 4),
      excite: schemaNum2("\u6FC0\u52B1", "initial", "\u2014", 0, 1)
    },
    init(state) {
      const cap = mobileBudget().fieldNCap;
      const n = Math.min(cap, Math.max(8, Math.floor(P(state.params, "n", 24))));
      if (Number(state.params.n) > n) state.params.n = n;
      state.n = n;
      state.u = new Float64Array(n * n);
      state.v = new Float64Array(n * n);
      state._next = new Float64Array(n * n);
      const ex = Math.floor(P(state.params, "excite", 0.5) * (n - 1));
      state.u[ex * n + Math.floor(n / 2)] = 1;
      state.t = 0;
    },
    step(state, dt) {
      const n = state.n;
      const a = P(state.params, "alpha", 0.15) * P(state.params, "tension", 1);
      if (!state._next || state._next.length !== n * n) state._next = new Float64Array(n * n);
      const next = state._next;
      next.fill(0);
      for (let i = 1; i < n - 1; i += 1) {
        for (let j = 1; j < n - 1; j += 1) {
          const idx = i * n + j;
          const lap = state.u[idx - 1] + state.u[idx + 1] + state.u[idx - n] + state.u[idx + n] - 4 * state.u[idx];
          if (spec.id === "heat-2d") next[idx] = state.u[idx] + a * lap * dt * 8;
          else {
            state.v[idx] += a * lap * dt * 40;
            next[idx] = state.u[idx] + state.v[idx] * dt;
          }
        }
      }
      const swap = state.u;
      state.u = next;
      state._next = swap;
      state.t += dt;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H, 28);
      title(ctx, spec.name);
      const n = state.n;
      const cw = box.w / n;
      const ch = box.h / n;
      for (let i = 0; i < n; i += 1) {
        for (let j = 0; j < n; j += 1) {
          const v = state.u[i * n + j];
          ctx.fillStyle = heatTempColor(v, -1, 1);
          ctx.fillRect(box.l + j * cw, box.t + i * ch, cw + 1, ch + 1);
        }
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      let max = 0;
      for (const v of state.u) max = Math.max(max, Math.abs(v));
      return [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "|u|max", value: formatNum(max, d) },
        { label: "n", value: String(state.n) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildPiston(spec) {
  return {
    ...baseMeta2(spec),
    params: { T: 300, V: 1, n: 1, R: 0.082 },
    paramSchema: {
      T: schemaNum2("T", "dynamics", "K", 100, 800),
      V: schemaNum2("V", "dynamics", "L", 0.2, 5),
      n: schemaNum2("n", "dynamics", "mol", 0.1, 5),
      R: schemaNum2("R", "dynamics", "\u2014", 0.05, 0.2)
    },
    init(state) {
      state.t = 0;
    },
    step(state, dt) {
      state.t += dt;
      state.P = P(state.params, "n", 1) * P(state.params, "R", 0.082) * P(state.params, "T", 300) / Math.max(P(state.params, "V", 1), 1e-6);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const V = P(state.params, "V", 1);
      const top = box.t + 40 + (5 - V) * 28;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l + 40, box.t + 40, 120, box.h - 80);
      ctx.fillStyle = C.body;
      ctx.fillRect(box.l + 40, top, 120, 14);
      ctx.fillStyle = "rgba(56,189,248,0.3)";
      ctx.fillRect(box.l + 40, top + 14, 120, box.b - 40 - (top + 14));
      ctx.fillStyle = C.muted;
      ctx.font = "12px IBM Plex Mono, monospace";
      ctx.fillText(`P=${formatNum(state.P, 3)}`, box.l + 180, box.t + 80);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "P", value: formatNum(state.P, d) },
        { label: "V", value: formatNum(P(state.params, "V", 1), d) },
        { label: "T", value: formatNum(P(state.params, "T", 300), d) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildCycle(spec) {
  const dragTs = /rankine|vapor-compression|heat-pump|brayton|otto|carnot/i.test(spec.id);
  return {
    ...baseMeta2(spec),
    params: { Th: 500, Tc: 300, phaseSpeed: 0.4, sHot: 0.72, sCold: 0.28 },
    paramSchema: {
      Th: schemaNum2("Th", "dynamics", "K", 250, 900),
      Tc: schemaNum2("Tc", "dynamics", "K", 100, 600),
      phaseSpeed: schemaNum2("\u901F\u7387", "dynamics", "\u2014", 0.05, 2),
      sHot: schemaNum2("s_hot", "dynamics", "\u2014", 0.15, 0.9),
      sCold: schemaNum2("s_cold", "dynamics", "\u2014", 0.1, 0.85)
    },
    init(state) {
      state.t = 0;
      state.s = 0;
      state.drag = null;
      state._box = null;
    },
    step(state, dt) {
      state.t += dt;
      state.s = (state.s + dt * P(state.params, "phaseSpeed", 0.4)) % 4;
      const Th = P(state.params, "Th", 500);
      const Tc = P(state.params, "Tc", 300);
      state.eta = Math.max(0, 1 - Tc / Math.max(Th, 1));
      if (spec.id.includes("vapor") || spec.id.includes("heat-pump")) {
        state.cop = Tc / Math.max(Th - Tc, 1);
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      state._box = box;
      title(ctx, `${spec.name}${dragTs ? " \xB7 drag T-s pts" : ""}`);
      const sh = Math.max(0.15, Math.min(0.9, P(state.params, "sHot", 0.72)));
      const sc = Math.max(0.1, Math.min(0.85, P(state.params, "sCold", 0.28)));
      const Th = P(state.params, "Th", 500);
      const Tc = P(state.params, "Tc", 300);
      const Tmax = 900;
      const Tmin = 100;
      const toX = (s) => box.l + s * box.w;
      const toY = (T) => box.b - (T - Tmin) / (Tmax - Tmin) * box.h;
      const pts = [
        { s: sc, T: Tc, key: "c" },
        { s: sh, T: Tc, key: "b" },
        { s: sh, T: Th, key: "h" },
        { s: sc, T: Th, key: "a" }
      ];
      state._pts = pts.map((p) => ({ ...p, x: toX(p.s), y: toY(p.T) }));
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l, box.t, box.w, box.h);
      ctx.fillStyle = C.muted;
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText("s \u2192", box.r - 28, box.b + 14);
      ctx.fillText("T", box.l - 16, box.t + 10);
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      state._pts.forEach((p, i2) => {
        i2 ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.stroke();
      state._pts.forEach((p) => {
        ctx.fillStyle = p.key === "h" || p.key === "a" ? C.accent : C.vector;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fill();
      });
      const i = Math.floor(state.s) % 4;
      const j = (i + 1) % 4;
      const u = state.s - Math.floor(state.s);
      const x = state._pts[i].x * (1 - u) + state._pts[j].x * u;
      const y = state._pts[i].y * (1 - u) + state._pts[j].y * u;
      ctx.strokeStyle = C.flash || "#fbbf24";
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.stroke();
    },
    hitTest(state, x, y) {
      if (!dragTs || !state._pts) return null;
      for (const p of state._pts) {
        const dx = x - p.x;
        const dy = y - p.y;
        if (dx * dx + dy * dy < 14 * 14) return p.key;
      }
      return null;
    },
    onPointer(state, ev) {
      if (!dragTs || !state._box) return false;
      const box = state._box;
      if (ev.type === "down") {
        state.drag = this.hitTest(state, ev.x, ev.y);
        return !!state.drag;
      }
      if (ev.type === "move" && state.drag) {
        const sn = Math.max(0.12, Math.min(0.92, (ev.x - box.l) / box.w));
        const Tn = 100 + Math.max(0, Math.min(1, (box.b - ev.y) / box.h)) * 800;
        if (state.drag === "h" || state.drag === "a") {
          state.params.Th = Tn;
          if (state.drag === "h") state.params.sHot = sn;
          else state.params.sCold = sn;
        } else {
          state.params.Tc = Math.min(Tn, P(state.params, "Th", 500) - 10);
          if (state.drag === "b") state.params.sHot = sn;
          else state.params.sCold = sn;
        }
        return true;
      }
      if (ev.type === "up") {
        state.drag = null;
        return true;
      }
      return false;
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      const rows = [
        { label: "\u03B7", value: formatNum(state.eta, d) },
        { label: "Th", value: formatNum(P(state.params, "Th", 500), 0) },
        { label: "Tc", value: formatNum(P(state.params, "Tc", 300), 0) }
      ];
      if (Number.isFinite(state.cop)) rows.push({ label: "COP", value: formatNum(state.cop, d) });
      return rows;
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildFieldlines(spec) {
  return {
    ...baseMeta2(spec),
    params: { q1: 1, q2: -1, x1: -1.2, x2: 1.2 },
    paramSchema: {
      q1: schemaNum2("q1", "dynamics", "C", -5, 5),
      q2: schemaNum2("q2", "dynamics", "C", -5, 5),
      x1: schemaNum2("x1", "initial", "\u2014", -3, 3),
      x2: schemaNum2("x2", "initial", "\u2014", -3, 3)
    },
    init(state) {
      state.t = 0;
    },
    step(state, dt) {
      state.t += dt;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const cx = W / 2;
      const cy = H / 2;
      const sc = 50;
      title(ctx, spec.name);
      const charges = [
        { q: P(state.params, "q1", 1), x: P(state.params, "x1", -1.2), y: 0 },
        { q: P(state.params, "q2", -1), x: P(state.params, "x2", 1.2), y: 0 }
      ];
      const field = (x, y) => {
        let ex = 0;
        let ey = 0;
        for (const c of charges) {
          const dx = x - c.x;
          const dy = y - c.y;
          const r2 = dx * dx + dy * dy + 0.05;
          const inv = c.q / (r2 * Math.sqrt(r2));
          ex += inv * dx;
          ey += inv * dy;
        }
        return { ex, ey };
      };
      for (let ang = 0; ang < Math.PI * 2; ang += Math.PI / 6) {
        for (const c of charges) {
          if (c.q === 0) continue;
          let x = c.x + 0.15 * Math.cos(ang);
          let y = c.y + 0.15 * Math.sin(ang);
          ctx.strokeStyle = c.q > 0 ? C.vector : C.accent;
          ctx.beginPath();
          ctx.moveTo(cx + x * sc, cy - y * sc);
          for (let s = 0; s < 40; s += 1) {
            const f = field(x, y);
            const mag = Math.hypot(f.ex, f.ey) || 1;
            const step = 0.08 * Math.sign(c.q);
            x += f.ex / mag * step;
            y += f.ey / mag * step;
            ctx.lineTo(cx + x * sc, cy - y * sc);
            if (Math.hypot(x, y) > 4) break;
          }
          ctx.stroke();
        }
      }
      for (const c of charges) {
        ctx.fillStyle = c.q >= 0 ? C.body : C.accent;
        ctx.beginPath();
        ctx.arc(cx + c.x * sc, cy - c.y * sc, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    getReadouts(state) {
      return [
        { label: "q1", value: formatNum(P(state.params, "q1", 1), 2) },
        { label: "q2", value: formatNum(P(state.params, "q2", -1), 2) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildCircuit(spec) {
  const rl = spec.id === "rl-circuit";
  return {
    ...baseMeta2(spec),
    params: rl ? { R: 10, L: 0.5, Vin: 5, I0: 0 } : { V: 5, R: 100, series: 1 },
    paramSchema: rl ? {
      R: schemaNum2("R", "dynamics", "\u03A9", 1, 200),
      L: schemaNum2("L", "dynamics", "H", 0.01, 5),
      Vin: schemaNum2("Vin", "dynamics", "V", 0, 20),
      I0: schemaNum2("I\u2080", "initial", "A", -5, 5)
    } : {
      V: schemaNum2("V", "dynamics", "V", 0, 24),
      R: schemaNum2("R", "dynamics", "\u03A9", 1, 1e3),
      series: schemaNum2("\u4E32/\u5E76 1/0", "dynamics", "\u2014", 0, 1)
    },
    init(state) {
      state.t = 0;
      state.I = rl ? P(state.params, "I0", 0) : 0;
      state.hist = [];
    },
    step(state, dt) {
      if (rl) {
        const R = P(state.params, "R", 10);
        const L = Math.max(P(state.params, "L", 0.5), 1e-4);
        const Vin = P(state.params, "Vin", 5);
        state.I += (Vin - state.I * R) / L * dt;
      } else {
        const V = P(state.params, "V", 5);
        const R = Math.max(P(state.params, "R", 100), 1e-6);
        state.I = V / R;
      }
      state.t += dt;
      state.hist.push(state.I);
      if (state.hist.length > 200) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l, box.t + 30, box.w * 0.45, box.h * 0.5);
      ctx.fillStyle = C.muted;
      ctx.font = "12px IBM Plex Mono, monospace";
      ctx.fillText(rl ? "RL" : "Ohm", box.l + 12, box.t + 55);
      const mid = box.t + box.h * 0.7;
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      state.hist.forEach((v, i) => {
        const x = box.l + i / 200 * box.w;
        const y = mid - v * 8;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "I", value: `${formatNum(state.I, d)} A` }
      ];
    },
    getTrajectory(state) {
      return state.hist.map((I, i) => ({ i, I }));
    }
  };
}
function buildInduction(spec) {
  return {
    ...baseMeta2(spec),
    params: { v: 1.2, N: 40, B: 0.8 },
    paramSchema: {
      v: schemaNum2("\u78C1\u94C1\u901F\u5EA6", "dynamics", "\u2014", 0.1, 5),
      N: schemaNum2("\u531D\u6570", "dynamics", "\u2014", 1, 200),
      B: schemaNum2("B", "dynamics", "T", 0.05, 3)
    },
    init(state) {
      state.t = 0;
      state.x = 0.1;
      state.emf = 0;
      state.hist = [];
    },
    step(state, dt) {
      const v = P(state.params, "v", 1.2);
      state.x += v * dt * 0.1;
      if (state.x > 0.9) state.x = 0.1;
      const near = Math.exp(-((state.x - 0.55) ** 2) / 0.01);
      state.emf = P(state.params, "N", 40) * P(state.params, "B", 0.8) * v * near * 0.02;
      state.t += dt;
      state.hist.push(state.emf);
      if (state.hist.length > 180) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l + box.w * 0.45, box.t + 40, 50, 80);
      ctx.fillStyle = C.body;
      ctx.fillRect(box.l + state.x * box.w - 12, box.t + 60, 24, 40);
      const mid = box.b - 40;
      ctx.strokeStyle = C.vector;
      ctx.beginPath();
      state.hist.forEach((v, i) => {
        const x = box.l + i / 180 * box.w;
        const y = mid - v * 20;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "\u03B5", value: formatNum(state.emf, d) },
        { label: "x", value: formatNum(state.x, d) }
      ];
    },
    getTrajectory(state) {
      return state.hist.map((emf, i) => ({ i, emf }));
    }
  };
}
function lensOptics(params) {
  const u = Math.max(P(params, "u", 4), 0.05);
  const f = Math.max(P(params, "f", 2), 0.05);
  const h = P(params, "h", 1.2);
  const denom = 1 / f - 1 / u;
  let v = Infinity;
  let m = NaN;
  let kind = "\u7126\u70B9\u4E0A";
  if (Math.abs(denom) > 1e-6) {
    v = 1 / denom;
    m = -v / u;
    kind = v > 0 ? "\u5B9E\u50CF" : "\u865A\u50CF";
  }
  return { u, f, h, v, m, kind };
}
function buildRays(spec) {
  return {
    ...baseMeta2(spec),
    capabilities: spec.id === "lens" ? { pointer: true, interaction: "canvas", hint: "\u62D6\u7269\u6216\u62D6\u50CF\uFF1A\u50CF\u4FA7\u53CD\u63A8\u7269\u8DDD\uFF08\u53CC\u5411\u8054\u52A8\uFF09\uFF1B\u865A\u50CF\u865A\u7EBF" } : { interaction: "knobs", hint: "\u8C03\u8282\u5165\u5C04\u89D2\u4E0E\u6298\u5C04\u7387" },
    params: { theta: 35, n1: 1, n2: 1.5, u: 4, f: 2, h: 1.2, scale: 28 },
    paramSchema: {
      theta: schemaNum2("\u5165\u5C04\u89D2", "dynamics", "\xB0", 0, 89),
      n1: schemaNum2("n\u2081", "dynamics", "\u2014", 1, 3),
      n2: schemaNum2("n\u2082", "dynamics", "\u2014", 1, 3),
      u: schemaNum2("\u7269\u8DDD u", "dynamics", "\u2014", 0.2, 30),
      f: schemaNum2("\u7126\u8DDD f", "dynamics", "\u2014", 0.2, 20),
      h: schemaNum2("\u7269\u9AD8 h", "dynamics", "\u2014", 0.05, 8),
      scale: schemaNum2("\u663E\u793A\u6BD4\u4F8B", "dynamics", "\u2014", 8, 60)
    },
    init(state) {
      state.t = 0;
      this.recompute(state);
    },
    recompute(state) {
      if (spec.id === "lens") {
        const o = lensOptics(state.params);
        state._v = o.v;
        state._m = o.m;
        state._kind = o.kind;
      } else {
        const th1 = P(state.params, "theta", 35) * Math.PI / 180;
        const n1 = Math.max(P(state.params, "n1", 1), 1e-6);
        const n2 = Math.max(P(state.params, "n2", 1.5), 1e-6);
        const sn = n1 / n2 * Math.sin(th1);
        state._th2 = Math.abs(sn) <= 1 ? Math.asin(sn) * 180 / Math.PI : NaN;
      }
    },
    step(state, dt) {
      state.t += dt;
      this.recompute(state);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const cx = box.l + box.w * 0.5;
      const cy = box.t + box.h * 0.55;
      state._lens = { cx, cy, box };
      this.recompute(state);
      if (spec.id === "lens") {
        const o = lensOptics(state.params);
        const sc = P(state.params, "scale", 28);
        const maxX = box.w * 0.42;
        const clampX = (x) => Math.max(-maxX, Math.min(maxX, x));
        ctx.strokeStyle = C.axis;
        ctx.beginPath();
        ctx.moveTo(box.l, cy);
        ctx.lineTo(box.r, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy - 70);
        ctx.quadraticCurveTo(cx + 18, cy, cx, cy + 70);
        ctx.moveTo(cx, cy - 70);
        ctx.quadraticCurveTo(cx - 18, cy, cx, cy + 70);
        ctx.stroke();
        ctx.fillStyle = C.muted;
        ctx.fillRect(cx + o.f * sc - 2, cy - 6, 4, 12);
        ctx.fillRect(cx - o.f * sc - 2, cy - 6, 4, 12);
        ctx.font = "10px IBM Plex Mono, monospace";
        ctx.fillText("F", cx + o.f * sc - 4, cy + 18);
        const ox = cx + clampX(-o.u * sc);
        const oy = cy - o.h * sc * 0.35;
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1;
        const tickY = cy + 28;
        ctx.beginPath();
        ctx.moveTo(cx - maxX, tickY);
        ctx.lineTo(cx + maxX, tickY);
        ctx.stroke();
        for (let uTick = -Math.floor(maxX / sc); uTick <= Math.floor(maxX / sc); uTick += 1) {
          const tx = cx + uTick * sc;
          if (tx < cx - maxX || tx > cx + maxX) continue;
          ctx.beginPath();
          ctx.moveTo(tx, tickY - 4);
          ctx.lineTo(tx, tickY + 4);
          ctx.stroke();
          if (uTick !== 0 && uTick % 2 === 0) {
            ctx.fillStyle = C.muted;
            ctx.font = "9px IBM Plex Mono, monospace";
            ctx.fillText(String(uTick), tx - 4, tickY + 14);
          }
        }
        ctx.fillStyle = C.muted;
        ctx.font = "9px IBM Plex Mono, monospace";
        ctx.fillText("\u8F74\u8DDD", cx - maxX, tickY - 8);
        const hi = state._hoverImg || state._dragObj;
        state._obj = { x: ox, y: Math.min(oy, cy), h: Math.abs(oy - cy) || 2 };
        if (hi) {
          ctx.strokeStyle = C.accent;
          ctx.lineWidth = 2;
          ctx.strokeRect(ox - 6, state._obj.y - 4, 12, state._obj.h + 8);
        }
        ctx.fillStyle = C.accent;
        ctx.fillRect(ox - 2, state._obj.y, 4, state._obj.h);
        ctx.fillStyle = C.accent;
        ctx.font = "12px IBM Plex Mono, monospace";
        ctx.fillText("\u7269 O", ox - 18, state._obj.y - 6);
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = C.accent;
        ctx.beginPath();
        ctx.moveTo(ox, cy + 8);
        ctx.lineTo(cx, cy + 8);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = C.accent;
        ctx.font = "10px IBM Plex Mono, monospace";
        ctx.fillText("u=" + o.u.toFixed(2), (ox + cx) / 2 - 12, cy + 20);
        if (Number.isFinite(o.v)) {
          const ix = cx + clampX(o.v * sc);
          const iy = cy - (Number.isFinite(o.m) ? o.m * o.h * sc * 0.35 : 0);
          state._img = { x: ix, y: Math.min(iy, cy), h: Math.abs(iy - cy) || 2, virtual: o.v < 0 };
          ctx.strokeStyle = C.body;
          ctx.setLineDash(o.v < 0 ? [4, 4] : []);
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(cx, oy);
          ctx.lineTo(ix, iy);
          ctx.moveTo(ox, oy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(ix, iy);
          ctx.stroke();
          ctx.setLineDash([]);
          if (hi || o.v < 0) {
            ctx.strokeStyle = C.vector;
            ctx.lineWidth = 2;
            ctx.setLineDash(o.v < 0 ? [3, 3] : []);
            ctx.strokeRect(ix - 6, state._img.y - 4, 12, state._img.h + 8);
            ctx.setLineDash([]);
            ctx.lineWidth = 1;
          }
          ctx.fillStyle = C.vector;
          if (o.v < 0) ctx.globalAlpha = 0.55;
          ctx.fillRect(ix - 2, state._img.y, 4, state._img.h);
          ctx.globalAlpha = 1;
          ctx.fillStyle = C.vector;
          ctx.fillText(o.v < 0 ? "\u865A\u50CF I'" : "\u5B9E\u50CF I", ix + 6, state._img.y - 6);
          ctx.setLineDash(o.v < 0 ? [2, 3] : []);
          ctx.strokeStyle = C.vector;
          ctx.beginPath();
          ctx.moveTo(ix, cy + 8);
          ctx.lineTo(cx, cy + 8);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = C.vector;
          ctx.font = "10px IBM Plex Mono, monospace";
          ctx.fillText("v=" + o.v.toFixed(2), (ix + cx) / 2 - 12, cy + 20);
        } else {
          state._img = null;
          ctx.strokeStyle = C.body;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(cx, oy);
          ctx.moveTo(ox, oy);
          ctx.lineTo(cx, cy);
          ctx.stroke();
          ctx.fillStyle = C.muted;
          ctx.fillText("u = f \xB7 \u50CF\u5728\u65E0\u7A77\u8FDC", box.l + 8, box.b - 8);
        }
        ctx.fillStyle = C.muted;
        ctx.font = "11px IBM Plex Mono, monospace";
        ctx.fillText(o.kind + " \xB7 \u62D6\u52A8\u7269\u4F53\uFF08\u7269/\u50CF\u8054\u52A8\uFF09", box.l + 8, box.t + 36);
        const narrow = box.w < 420;
        const vStr = Number.isFinite(o.v) ? o.v.toFixed(2) : "\u221E";
        const mStr = Number.isFinite(o.m) ? o.m.toFixed(2) : "\u2014";
        ctx.fillStyle = state._flashUv ? C.accent || C.body : C.muted;
        if (narrow) {
          ctx.font = "600 11px IBM Plex Mono, monospace";
          ctx.fillText("1/u+1/v=1/f", box.l + 8, box.b - 22);
          ctx.fillText(`v=${vStr}  m=${mStr}`, box.l + 8, box.b - 8);
        } else {
          ctx.font = "600 12px IBM Plex Mono, monospace";
          ctx.fillText(`1/u+1/v=1/f  \u2192  v=${vStr}  m=${mStr}`, box.l + 8, box.b - 10);
        }
        if (state._flashUv > 0) state._flashUv -= 1;
      } else {
        const th1 = P(state.params, "theta", 35) * Math.PI / 180;
        const n1 = P(state.params, "n1", 1);
        const n2 = P(state.params, "n2", 1.5);
        const sn = n1 / n2 * Math.sin(th1);
        const th2 = Math.abs(sn) <= 1 ? Math.asin(sn) : null;
        ctx.strokeStyle = C.axis;
        ctx.beginPath();
        ctx.moveTo(cx, box.t);
        ctx.lineTo(cx, box.b);
        ctx.moveTo(box.l, cy);
        ctx.lineTo(box.r, cy);
        ctx.stroke();
        const L = 90;
        ctx.strokeStyle = C.body;
        ctx.beginPath();
        ctx.moveTo(cx - L * Math.sin(th1), cy - L * Math.cos(th1));
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.strokeStyle = C.accent;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + L * Math.sin(th1), cy - L * Math.cos(th1));
        ctx.stroke();
        if (th2 != null) {
          ctx.strokeStyle = C.vector;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + L * Math.sin(th2), cy + L * Math.cos(th2));
          ctx.stroke();
        } else {
          ctx.fillStyle = C.muted;
          ctx.font = "12px IBM Plex Mono, monospace";
          ctx.fillText("\u5168\u53CD\u5C04 TIR", box.l + 8, box.b - 8);
        }
      }
    },
    onPointer(state, ev) {
      if (spec.id !== "lens" || !state._lens || !state._obj) return false;
      const { cx, cy } = state._lens;
      const sc = P(state.params, "scale", 28);
      const hitBox = (box, pad = 10) => box && ev.x >= box.x - pad && ev.x <= box.x + pad && ev.y >= box.y - pad && ev.y <= box.y + (box.h || 0) + pad;
      if (ev.type === "down") {
        if (hitBox(state._img, 12)) {
          state._dragImg = true;
          state._dragObj = false;
          state._hoverImg = true;
          return true;
        }
        if (hitBox(state._obj, 10)) {
          state._dragObj = true;
          state._dragImg = false;
          return true;
        }
        return false;
      }
      if (ev.type === "move" && state._dragObj) {
        const u = Math.max(0.2, (cx - ev.x) / sc);
        const h = Math.max(0.05, (cy - ev.y) / (sc * 0.35));
        state.params.u = u;
        state.params.h = h;
        state._hoverImg = true;
        this.recompute(state);
        return true;
      }
      if (ev.type === "move" && state._dragImg) {
        const f = Math.max(P(state.params, "f", 2), 0.05);
        let v = (ev.x - cx) / sc;
        if (Math.abs(v) < 0.05) v = v >= 0 ? 0.05 : -0.05;
        const denom = 1 / f - 1 / v;
        if (Math.abs(denom) > 1e-6) {
          const u = 1 / denom;
          if (u > 0.2 && u < 40) state.params.u = u;
        }
        const imgH = Math.abs(cy - ev.y) / (sc * 0.35);
        if (Number.isFinite(state._m) && Math.abs(state._m) > 1e-6) {
          state.params.h = Math.max(0.05, imgH / Math.abs(state._m));
        } else {
          state.params.h = Math.max(0.05, imgH);
        }
        state._hoverImg = true;
        state._flashUv = 24;
        this.recompute(state);
        return true;
      }
      if (ev.type === "up") {
        state._dragObj = false;
        state._dragImg = false;
        state._hoverImg = false;
        return true;
      }
      return false;
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      this.recompute(state);
      if (spec.id === "lens") {
        const o = lensOptics(state.params);
        const rows = [
          { label: "u", value: formatNum(o.u, d) },
          { label: "v", value: Number.isFinite(o.v) ? formatNum(o.v, d) : "\u221E" },
          { label: "m", value: Number.isFinite(o.m) ? formatNum(o.m, d) : "\u2014" },
          { label: "\u50CF", value: o.kind }
        ];
        if (state._dragImg || state._flashUv) {
          rows.unshift({
            label: "\u63A8\u5BFC",
            value: Number.isFinite(o.v) ? `1/u=1/f\u22121/v \u2192 u=${formatNum(o.u, d)}` : "1/u+1/v=1/f"
          });
        }
        return rows;
      }
      return [
        { label: "\u03B81", value: formatNum(P(state.params, "theta", 35), d) },
        { label: "\u03B82", value: Number.isFinite(state._th2) ? formatNum(state._th2, d) : "TIR" }
      ];
    },
    getTrajectory(state) {
      if (spec.id === "lens") {
        const o = lensOptics(state.params);
        return [{ u: o.u, f: o.f, v: o.v, m: o.m, kind: o.kind }];
      }
      return [{ theta: P(state.params, "theta", 35), th2: state._th2 }];
    }
  };
}
function buildGauge(spec) {
  const presets = {
    photoelectric: {
      params: { freq: 2.2, intensity: 1, workFunc: 1.5, speed: 1 },
      schema: {
        freq: schemaNum2("hf", "dynamics", "eV", 0.1, 20),
        intensity: schemaNum2("\u5149\u5F3A I", "dynamics", "\u2014", 0, 10),
        workFunc: schemaNum2("\u9038\u51FA\u529F W", "dynamics", "eV", 0.1, 10),
        speed: schemaNum2("\u52A8\u753B\u901F", "dynamics", "\u2014", 0.1, 4)
      },
      step(state, dt) {
        state.t += dt * P(state.params, "speed", 1);
        const K = Math.max(0, P(state.params, "freq", 2.2) - P(state.params, "workFunc", 1.5));
        state.val = K;
        state.rate = K > 0 ? Math.max(0, P(state.params, "intensity", 1)) : 0;
      }
    },
    "time-dilation": {
      params: { beta: 0.6, properTime: 1, speed: 1 },
      schema: {
        beta: schemaNum2("\u03B2=v/c", "dynamics", "\u2014", 0, 0.999),
        properTime: schemaNum2("\u56FA\u6709\u65F6 \u0394\u03C4", "dynamics", "s", 0.1, 100),
        speed: schemaNum2("\u52A8\u753B\u901F", "dynamics", "\u2014", 0.1, 4)
      },
      step(state, dt) {
        state.t += dt * P(state.params, "speed", 1);
        const beta = Math.min(0.999, Math.max(0, P(state.params, "beta", 0.6)));
        state.val = P(state.params, "properTime", 1) / Math.sqrt(1 - beta * beta);
      }
    },
    polarization: {
      params: { angle: 45, plates: 1, I0: 1, speed: 1 },
      schema: {
        angle: schemaNum2("\u504F\u632F\u89D2", "dynamics", "\xB0", 0, 180),
        plates: schemaNum2("\u504F\u632F\u7247\u6570", "dynamics", "\u2014", 1, 6),
        I0: schemaNum2("\u5165\u5C04\u5149\u5F3A", "dynamics", "\u2014", 0, 10),
        speed: schemaNum2("\u52A8\u753B\u901F", "dynamics", "\u2014", 0.1, 4)
      },
      step(state, dt) {
        state.t += dt * P(state.params, "speed", 1);
        const n = Math.max(1, Math.round(P(state.params, "plates", 1)));
        const ang = P(state.params, "angle", 45) * Math.PI / 180;
        state.val = P(state.params, "I0", 1) * Math.cos(ang) ** (2 * n);
      }
    }
  };
  const preset = presets[spec.id];
  if (!preset?.step) {
    return {
      ...baseMeta2(spec),
      params: { speed: 1 },
      paramSchema: { speed: schemaNum2("\u52A8\u753B\u901F", "dynamics", "\u2014", 0.1, 8) },
      init(state) {
        state.t = 0;
        state.val = 0;
        state.hist = [];
        state.err = "gauge_unwired";
      },
      step(state, dt) {
        state.t += dt;
      },
      draw(ctx, state, view) {
        title(ctx, spec.name);
        ctx.fillStyle = C.muted;
        ctx.font = "12px IBM Plex Mono, monospace";
        ctx.fillText("Unwired gauge family \u2014 remount on a topic/family engine", 16, 48);
      },
      getReadouts() {
        return [{ label: "status", value: "unwired" }];
      },
      getTrajectory() {
        return [];
      }
    };
  }
  return {
    ...baseMeta2(spec),
    params: preset.params,
    paramSchema: preset.schema,
    init(state) {
      state.t = 0;
      state.val = 0;
      state.hist = [];
    },
    step(state, dt) {
      preset.step(state, dt);
      state.hist.push(state.val);
      if (state.hist.length > 160) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const mid = box.t + box.h * 0.55;
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      state.hist.forEach((v, i) => {
        const x = box.l + i / 160 * box.w;
        const y = mid - v * 25;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      ctx.fillStyle = C.accent;
      ctx.font = "14px IBM Plex Mono, monospace";
      ctx.fillText(formatNum(state.val, 3), box.l, box.t + 36);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      const rows = [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "val", value: formatNum(state.val, d) }
      ];
      if (Number.isFinite(state.rate)) rows.push({ label: "R", value: formatNum(state.rate, d) });
      return rows;
    },
    getTrajectory(state) {
      return state.hist.map((v, i) => ({ i, v }));
    }
  };
}
function buildBohr(spec) {
  return {
    ...baseMeta2(spec),
    params: { n: 3, n2: 2 },
    paramSchema: {
      n: schemaNum2("n\u4E0A", "dynamics", "\u2014", 1, 8),
      n2: schemaNum2("n\u4E0B", "dynamics", "\u2014", 1, 7)
    },
    init(state) {
      state.t = 0;
      state.phi = 0;
    },
    step(state, dt) {
      state.t += dt;
      const n = Math.max(1, Math.round(P(state.params, "n", 3)));
      state.phi += dt * (1.2 / n);
      state.E = -13.6 / (n * n);
      state.dE = -13.6 / Math.round(P(state.params, "n2", 2)) ** 2 - state.E;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const cx = W / 2;
      const cy = H / 2;
      title(ctx, spec.name);
      const n = Math.max(1, Math.round(P(state.params, "n", 3)));
      for (let k = 1; k <= 5; k += 1) {
        ctx.strokeStyle = k === n ? C.body : C.axis;
        ctx.beginPath();
        ctx.arc(cx, cy, 18 * k, 0, Math.PI * 2);
        ctx.stroke();
      }
      const r = 18 * n;
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.arc(cx + r * Math.cos(state.phi), cy - r * Math.sin(state.phi), 6, 0, Math.PI * 2);
      ctx.fill();
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "E", value: `${formatNum(state.E, d)} eV` },
        { label: "\u0394E", value: `${formatNum(state.dE, d)} eV` }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildDecay(spec) {
  return {
    ...baseMeta2(spec),
    params: { halfLife: 4, N0: 200 },
    paramSchema: {
      halfLife: schemaNum2("\u534A\u8870\u671F", "dynamics", "s", 0.5, 30),
      N0: schemaNum2("N\u2080", "initial", "\u2014", 10, 500)
    },
    init(state) {
      state.t = 0;
      state.N = P(state.params, "N0", 200);
      state.hist = [];
    },
    step(state, dt) {
      const hl = Math.max(P(state.params, "halfLife", 4), 0.1);
      const lam = Math.LN2 / hl;
      state.N = P(state.params, "N0", 200) * Math.exp(-lam * state.t);
      state.t += dt;
      state.hist.push(state.N);
      if (state.hist.length > 200) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const nShow = Math.min(80, Math.round(state.N / Math.max(P(state.params, "N0", 200) / 80, 1)));
      for (let i = 0; i < nShow; i += 1) {
        ctx.fillStyle = C.body;
        ctx.beginPath();
        ctx.arc(box.l + i % 10 * 18 + 10, box.t + 40 + Math.floor(i / 10) * 16, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      const mid = box.b - 30;
      ctx.strokeStyle = C.vector;
      ctx.beginPath();
      state.hist.forEach((v, i) => {
        const x = box.l + i / 200 * box.w;
        const y = mid - v / P(state.params, "N0", 200) * 80;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "N", value: formatNum(state.N, 1) }
      ];
    },
    getTrajectory(state) {
      return state.hist.map((N, i) => ({ i, N }));
    }
  };
}
function buildDiscrete(spec) {
  return {
    ...baseMeta2(spec),
    params: {
      n: 16,
      target: 7,
      seed: 3,
      stepDt: 0.12,
      algo: 0,
      capacity: 8,
      capacityKnapsack: 10
    },
    paramSchema: {
      n: schemaNum2("n", "numerics", "\u2014", 4, 48),
      target: schemaNum2("\u76EE\u6807", "dynamics", "\u2014", 0, 64),
      seed: schemaNum2("seed", "initial", "\u2014", 1, 999),
      stepDt: schemaNum2("stepDt", "dynamics", "s", 0.02, 0.5),
      algo: {
        group: "dynamics",
        unit: "",
        label: "algo",
        min: 0,
        max: 3,
        options: spec.id === "binary-search" ? [{ value: 0, label: "binary" }] : [{ value: 0, label: "mode A" }, { value: 1, label: "mode B" }]
      },
      capacity: schemaNum2("\u5BB9\u91CF", "dynamics", "\u2014", 2, 32),
      capacityKnapsack: schemaNum2("\u80CC\u5305\u5BB9\u91CF", "dynamics", "\u2014", 2, 40)
    },
    init(state) {
      const n = Math.max(4, Math.floor(P(state.params, "n", 16)));
      const r = rnd(P(state.params, "seed", 3));
      state.arr = Array.from({ length: n }, (_, i) => i);
      if (spec.id !== "binary-search") state.arr = state.arr.map(() => Math.floor(r() * 40));
      state.lo = 0;
      state.hi = n - 1;
      state.mid = -1;
      state.found = false;
      state.t = 0;
      state.acc = 0;
      state.step = 0;
      state.cursor = 0;
      state.table = Array.from({ length: 6 }, () => Array(8).fill(0));
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      const period = Math.max(P(state.params, "stepDt", 0.12), 0.02);
      while (state.acc >= period) {
        state.acc -= period;
        state.step += 1;
        if (spec.id === "binary-search") {
          if (state.found || state.lo > state.hi) break;
          state.mid = state.lo + state.hi >> 1;
          const target = Math.round(P(state.params, "target", 7));
          if (state.arr[state.mid] === target) state.found = true;
          else if (state.arr[state.mid] < target) state.lo = state.mid + 1;
          else state.hi = state.mid - 1;
        } else if (spec.id === "dp-table") {
          const rows = state.table.length;
          const cols = state.table[0].length;
          const i = state.step % rows;
          const j = Math.floor(state.step / rows) % cols;
          state.table[i][j] = i === 0 || j === 0 ? 0 : Math.max(state.table[i - 1][j], state.table[i][j - 1] + (i + j) % 3);
          state.cursor = i * cols + j;
        } else if (spec.id === "hashtable") {
          state.cursor = (state.cursor + 1) % Math.max(Math.floor(P(state.params, "capacity", 8)), 2);
        } else {
          state.cursor = (state.cursor + 1) % state.arr.length;
        }
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      if (spec.id === "dp-table") {
        const rows = state.table.length;
        const cols = state.table[0].length;
        const cw = box.w / cols;
        const ch = (box.h - 20) / rows;
        for (let i = 0; i < rows; i += 1) {
          for (let j = 0; j < cols; j += 1) {
            const idx = i * cols + j;
            ctx.fillStyle = idx === state.cursor ? C.accent : heatTempColor(state.table[i][j], 0, 12);
            ctx.fillRect(box.l + j * cw, box.t + 20 + i * ch, cw - 1, ch - 1);
          }
        }
      } else {
        const n = state.arr.length;
        const bw = box.w / n;
        for (let i = 0; i < n; i += 1) {
          let fill = C.body;
          if (spec.id === "binary-search") {
            if (i < state.lo || i > state.hi) fill = C.axis;
            if (i === state.mid) fill = C.accent;
          } else if (i === state.cursor) fill = C.accent;
          ctx.fillStyle = fill;
          const h = 20 + state.arr[i] % 20 * 4;
          ctx.fillRect(box.l + i * bw + 1, box.b - h, Math.max(2, bw - 2), h);
        }
      }
    },
    getReadouts(state) {
      return [
        { label: "step", value: String(state.step) },
        { label: "lo/hi", value: `${state.lo}/${state.hi}` },
        { label: "found", value: state.found ? "yes" : "no" }
      ];
    },
    getTrajectory(state) {
      return state.arr.map((v, i) => ({ i, v }));
    }
  };
}
function buildGraph(spec) {
  return {
    ...baseMeta2(spec),
    params: { nodes: 8, seed: 5, start: 0, goal: 7, stepDt: 0.15, algo: 0, layoutSteps: 40 },
    paramSchema: {
      nodes: schemaNum2("\u8282\u70B9\u6570", "numerics", "\u2014", 4, 16),
      seed: schemaNum2("\u968F\u673A\u79CD\u5B50", "initial", "\u2014", 1, 99),
      start: schemaNum2("\u8D77\u70B9", "initial", "\u2014", 0, 15),
      goal: schemaNum2("\u7EC8\u70B9", "initial", "\u2014", 0, 15),
      stepDt: schemaNum2("\u6B65\u8FDB\u95F4\u9694", "dynamics", "s", 0.05, 0.5),
      layoutSteps: schemaNum2("\u529B\u5BFC\u5411\u6B65\u6570", "numerics", "\u2014", 0, 120),
      algo: {
        group: "dynamics",
        unit: "\u2014",
        label: "\u7B97\u6CD5",
        min: 0,
        max: 2,
        options: [{ value: 0, label: "Dijkstra" }, { value: 1, label: "A*" }, { value: 2, label: "BFS" }]
      }
    },
    init(state) {
      const n = Math.max(4, Math.floor(P(state.params, "nodes", 8)));
      const r = rnd(P(state.params, "seed", 5));
      state.nodes = Array.from({ length: n }, (_, i) => ({
        x: 0.15 + r() * 0.7,
        y: 0.15 + r() * 0.7,
        i
      }));
      state.edges = [];
      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          if (r() < 0.35) state.edges.push({ a: i, b: j, w: 1 + Math.floor(r() * 9) });
        }
      }
      const W = 400;
      const H = 300;
      const steps = Math.max(0, Math.floor(P(state.params, "layoutSteps", 40)));
      const px = state.nodes.map((n2) => ({ x: n2.x * W, y: n2.y * H }));
      for (let k = 0; k < steps; k += 1) forceGraphStep(px, state.edges, { W, H, pad: 24 });
      state.nodes = px.map((p, i) => ({
        i,
        x: Math.max(0.05, Math.min(0.95, p.x / W)),
        y: Math.max(0.05, Math.min(0.95, p.y / H))
      }));
      state.visit = /* @__PURE__ */ new Set();
      state.frontier = [Math.min(Math.floor(P(state.params, "start", 0)), n - 1)];
      state.parent = {};
      state.t = 0;
      state.acc = 0;
      state.done = false;
      state.path = [];
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      const period = Math.max(P(state.params, "stepDt", 0.15), 0.05);
      while (state.acc >= period && !state.done) {
        state.acc -= period;
        if (!state.frontier.length) {
          state.done = true;
          break;
        }
        const u = state.frontier.shift();
        if (state.visit.has(u)) continue;
        state.visit.add(u);
        const goal = Math.min(Math.floor(P(state.params, "goal", 7)), state.nodes.length - 1);
        if (u === goal) {
          state.done = true;
          const path = [u];
          let cur = u;
          while (state.parent[cur] != null) {
            cur = state.parent[cur];
            path.push(cur);
          }
          state.path = path.reverse();
          break;
        }
        for (const e of state.edges) {
          const v = e.a === u ? e.b : e.b === u ? e.a : null;
          if (v == null || state.visit.has(v)) continue;
          if (state.parent[v] == null) state.parent[v] = u;
          state.frontier.push(v);
        }
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      const screen = mapNormToScreen(state.nodes, W, H, 40);
      const hi = /* @__PURE__ */ new Set([...state.visit, ...state.frontier]);
      paintGraph(ctx, screen, state.edges, {
        highlight: hi,
        path: state.path || [],
        edgeColor: C.axis,
        nodeColor: C.muted,
        accent: C.accent,
        r: 8
      });
      state.nodes.forEach((_, i) => {
        const p = screen[i];
        let fill = null;
        if (state.frontier.includes(i)) fill = C.vector;
        if (state.visit.has(i)) fill = C.body;
        if (fill) {
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    },
    getReadouts(state) {
      return [
        { label: "visited", value: String(state.visit.size) },
        { label: "frontier", value: String(state.frontier.length) },
        { label: "path", value: String(state.path.length) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildTree(spec) {
  return {
    ...baseMeta2(spec),
    params: { seed: 4, n: 12, stepDt: 0.2 },
    paramSchema: {
      seed: schemaNum2("seed", "initial", "\u2014", 1, 99),
      n: schemaNum2("n", "numerics", "\u2014", 4, 24),
      stepDt: schemaNum2("stepDt", "dynamics", "s", 0.05, 0.6)
    },
    init(state) {
      const r = rnd(P(state.params, "seed", 4));
      const n = Math.floor(P(state.params, "n", 12));
      state.keys = Array.from({ length: n }, () => Math.floor(r() * 90));
      state.shown = 1;
      state.t = 0;
      state.acc = 0;
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc > P(state.params, "stepDt", 0.2) && state.shown < state.keys.length) {
        state.acc = 0;
        state.shown += 1;
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      const keys = state.keys.slice(0, state.shown).slice().sort((a, b) => a - b);
      const levels = Math.ceil(Math.log2(keys.length + 1));
      const drawNode = (i, x, y, spread) => {
        if (i >= keys.length) return;
        ctx.fillStyle = C.body;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111";
        ctx.font = "10px IBM Plex Mono, monospace";
        ctx.fillText(String(keys[i]), x - 8, y + 3);
        const L = 2 * i + 1;
        const R = 2 * i + 2;
        if (L < keys.length) {
          ctx.strokeStyle = C.axis;
          ctx.beginPath();
          ctx.moveTo(x, y + 12);
          ctx.lineTo(x - spread, y + 50);
          ctx.stroke();
          drawNode(L, x - spread, y + 50, spread * 0.55);
        }
        if (R < keys.length) {
          ctx.strokeStyle = C.axis;
          ctx.beginPath();
          ctx.moveTo(x, y + 12);
          ctx.lineTo(x + spread, y + 50);
          ctx.stroke();
          drawNode(R, x + spread, y + 50, spread * 0.55);
        }
      };
      drawNode(0, W / 2, 50, Math.min(140, W * 0.22));
      void levels;
    },
    getReadouts(state) {
      return [
        { label: "shown", value: String(state.shown) },
        { label: "n", value: String(state.keys.length) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildFsm(spec) {
  return {
    ...baseMeta2(spec),
    params: { input: 10110, stepDt: 0.35 },
    paramSchema: {
      input: schemaNum2("\u8F93\u5165\u4E32(\u5341\u8FDB\u5236\u793A\u610F)", "initial", "\u2014", 0, 111111),
      stepDt: schemaNum2("stepDt", "dynamics", "s", 0.1, 1)
    },
    init(state) {
      state.states = ["q0", "q1", "q2", "q3"];
      state.idx = 0;
      state.tape = String(Math.floor(P(state.params, "input", 10110))).split("");
      state.pos = 0;
      state.t = 0;
      state.acc = 0;
      state.stack = [];
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < P(state.params, "stepDt", 0.35)) return;
      state.acc = 0;
      if (state.pos >= state.tape.length) return;
      const bit = state.tape[state.pos];
      state.idx = (state.idx + Number(bit || 0) + 1) % state.states.length;
      if (spec.id === "pda") state.stack.push(bit);
      if (state.stack.length > 8) state.stack.shift();
      state.pos += 1;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      state.states.forEach((s, i) => {
        const x = 80 + i * 90;
        const y = H * 0.35;
        ctx.strokeStyle = i === state.idx ? C.accent : C.axis;
        ctx.lineWidth = i === state.idx ? 3 : 1;
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = C.muted;
        ctx.font = "12px IBM Plex Mono, monospace";
        ctx.fillText(s, x - 10, y + 4);
        if (i < state.states.length - 1) {
          ctx.strokeStyle = C.axis;
          ctx.beginPath();
          ctx.moveTo(x + 22, y);
          ctx.lineTo(x + 68, y);
          ctx.stroke();
        }
      });
      ctx.fillStyle = C.body;
      ctx.font = "14px IBM Plex Mono, monospace";
      ctx.fillText(state.tape.join(" "), 60, H * 0.7);
      if (state.pos < state.tape.length) {
        ctx.fillStyle = C.accent;
        ctx.fillRect(60 + state.pos * 8.5, H * 0.72, 8, 3);
      }
      if (spec.id === "pda") ctx.fillText(`stack: ${state.stack.join("")}`, 60, H * 0.82);
    },
    getReadouts(state) {
      return [
        { label: "state", value: state.states[state.idx] },
        { label: "pos", value: String(state.pos) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildTuring(spec) {
  return {
    ...baseMeta2(spec),
    params: { tape: 1001101, stepDt: 0.25 },
    paramSchema: {
      tape: schemaNum2("\u7EB8\u5E26\u521D\u503C", "initial", "\u2014", 0, 11111111),
      stepDt: schemaNum2("stepDt", "dynamics", "s", 0.05, 1)
    },
    init(state) {
      state.tape = String(Math.floor(P(state.params, "tape", 1001101))).padStart(16, "0").split("");
      state.head = 4;
      state.state = "A";
      state.t = 0;
      state.acc = 0;
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < P(state.params, "stepDt", 0.25)) return;
      state.acc = 0;
      const cell = state.tape[state.head] || "0";
      if (state.state === "A") {
        state.tape[state.head] = cell === "0" ? "1" : "0";
        state.head = Math.min(state.tape.length - 1, state.head + 1);
        state.state = "B";
      } else {
        state.head = Math.max(0, state.head - 1);
        state.state = "A";
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      const y = H * 0.45;
      state.tape.forEach((c, i) => {
        const x = 40 + i * 28;
        ctx.strokeStyle = i === state.head ? C.accent : C.axis;
        ctx.strokeRect(x, y, 24, 28);
        ctx.fillStyle = C.body;
        ctx.font = "14px IBM Plex Mono, monospace";
        ctx.fillText(c, x + 7, y + 19);
      });
      ctx.fillStyle = C.muted;
      ctx.fillText(`state ${state.state}`, 40, y + 60);
    },
    getReadouts(state) {
      return [
        { label: "state", value: state.state },
        { label: "head", value: String(state.head) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildCrypto(spec) {
  return {
    ...baseMeta2(spec),
    params: { key: 3, p: 17, q: 11, e: 7, msg: 42, g: 3 },
    paramSchema: {
      key: schemaNum2("key", "dynamics", "\u2014", 0, 25),
      p: schemaNum2("p", "dynamics", "\u2014", 5, 97),
      q: schemaNum2("q", "dynamics", "\u2014", 5, 97),
      e: schemaNum2("e", "dynamics", "\u2014", 3, 40),
      msg: schemaNum2("msg", "initial", "\u2014", 0, 200),
      g: schemaNum2("g", "dynamics", "\u2014", 2, 20)
    },
    init(state) {
      state.t = 0;
      state.out = "";
    },
    step(state, dt) {
      state.t += dt;
      if (spec.id === "caesar") {
        const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const k = Math.round(P(state.params, "key", 3));
        state.out = "HELLO".split("").map((ch) => alpha[(alpha.indexOf(ch) + k) % 26]).join("");
      } else if (spec.id === "rsa") {
        const p = Math.round(P(state.params, "p", 17));
        const q = Math.round(P(state.params, "q", 11));
        const n = p * q;
        const e = Math.round(P(state.params, "e", 7));
        const m = Math.round(P(state.params, "msg", 42)) % n;
        let c = 1;
        for (let i = 0; i < e; i += 1) c = c * m % n;
        state.out = String(c);
        state.n = n;
      } else {
        const p = Math.round(P(state.params, "p", 23));
        const g = Math.round(P(state.params, "g", 5));
        const a = Math.round(P(state.params, "key", 6));
        let A = 1;
        for (let i = 0; i < a; i += 1) A = A * g % p;
        state.out = String(A);
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      ctx.fillStyle = C.body;
      ctx.font = "22px IBM Plex Mono, monospace";
      ctx.fillText(state.out || "\u2014", 48, H * 0.45);
      ctx.fillStyle = C.muted;
      ctx.font = "12px IBM Plex Mono, monospace";
      ctx.fillText(spec.formula || "", 48, H * 0.55);
    },
    getReadouts(state) {
      return [
        { label: "out", value: state.out || "\u2014" },
        { label: "t", value: formatNum(state.t, 2) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildMl(spec) {
  return {
    ...baseMeta2(spec),
    params: { lr: 0.05, k: 3, seed: 2, steps: 1 },
    paramSchema: {
      lr: schemaNum2("\u5B66\u4E60\u7387", "dynamics", "\u2014", 1e-3, 1),
      k: schemaNum2("k/\u5BBD\u5EA6", "dynamics", "\u2014", 1, 8),
      seed: schemaNum2("seed", "initial", "\u2014", 1, 99),
      steps: schemaNum2("\u6BCF\u5E27\u6B65\u6570", "dynamics", "\u2014", 1, 20)
    },
    init(state) {
      const r = rnd(P(state.params, "seed", 2));
      state.pts = Array.from({ length: 36 }, () => ({ x: r(), y: r() * 0.8 + 0.1 * r(), c: 0 }));
      state.w = r() - 0.5;
      state.b = r() - 0.5;
      state.loss = 1;
      state.t = 0;
      state.centers = Array.from({ length: Math.max(1, Math.round(P(state.params, "k", 3))) }, () => ({ x: r(), y: r() }));
      state.attn = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => r()));
    },
    step(state, dt) {
      state.t += dt;
      const lr = P(state.params, "lr", 0.05);
      const steps = Math.max(1, Math.round(P(state.params, "steps", 1)));
      for (let s = 0; s < steps; s += 1) {
        if (spec.id === "kmeans") {
          for (const p of state.pts) {
            let best = 0;
            let bd = 1e9;
            state.centers.forEach((c, i) => {
              const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
              if (d < bd) {
                bd = d;
                best = i;
              }
            });
            p.c = best;
          }
          state.centers.forEach((c, i) => {
            const group = state.pts.filter((p) => p.c === i);
            if (!group.length) return;
            c.x = group.reduce((a, p) => a + p.x, 0) / group.length;
            c.y = group.reduce((a, p) => a + p.y, 0) / group.length;
          });
        } else if (spec.id === "attention") {
          for (let i = 0; i < 6; i += 1) {
            for (let j = 0; j < 6; j += 1) {
              state.attn[i][j] = 0.7 * state.attn[i][j] + 0.3 * Math.abs(Math.sin(state.t + i + j));
            }
          }
        } else {
          let gw = 0;
          let gb = 0;
          let loss = 0;
          for (const p of state.pts) {
            const yhat = state.w * p.x + state.b;
            const err = yhat - p.y;
            loss += err * err;
            gw += err * p.x;
            gb += err;
          }
          state.w -= lr * gw / state.pts.length;
          state.b -= lr * gb / state.pts.length;
          state.loss = loss / state.pts.length;
        }
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      if (spec.id === "attention") {
        const n = 6;
        const cw = box.w / n;
        const ch = box.h / n;
        for (let i = 0; i < n; i += 1) {
          for (let j = 0; j < n; j += 1) {
            ctx.fillStyle = heatTempColor(state.attn[i][j], 0, 1);
            ctx.fillRect(box.l + j * cw, box.t + i * ch, cw - 1, ch - 1);
          }
        }
        return;
      }
      for (const p of state.pts) {
        ctx.fillStyle = spec.id === "kmeans" ? [C.body, C.accent, C.vector, C.theory][p.c % 4] : C.body;
        ctx.beginPath();
        ctx.arc(box.l + p.x * box.w, box.b - p.y * box.h, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (spec.id === "kmeans") {
        for (const c of state.centers) {
          ctx.strokeStyle = C.accent;
          ctx.strokeRect(box.l + c.x * box.w - 6, box.b - c.y * box.h - 6, 12, 12);
        }
      } else {
        ctx.strokeStyle = C.vector;
        ctx.beginPath();
        ctx.moveTo(box.l, box.b - state.b * box.h);
        ctx.lineTo(box.r, box.b - (state.w + state.b) * box.h);
        ctx.stroke();
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "loss", value: formatNum(state.loss || 0, d) },
        { label: "w", value: formatNum(state.w, d) },
        { label: "t", value: formatNum(state.t, d) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildOpt(spec) {
  return {
    ...baseMeta2(spec),
    params: { pop: 20, mutate: 0.1, temp: 5, cool: 0.98, ants: 12, evaporate: 0.1, seed: 1 },
    paramSchema: {
      pop: schemaNum2("\u79CD\u7FA4", "dynamics", "\u2014", 4, 60),
      mutate: schemaNum2("\u53D8\u5F02\u7387", "dynamics", "\u2014", 0, 1),
      temp: schemaNum2("\u6E29\u5EA6", "dynamics", "\u2014", 0.1, 20),
      cool: schemaNum2("\u964D\u6E29", "dynamics", "\u2014", 0.8, 0.999),
      ants: schemaNum2("\u8682\u8681\u6570", "dynamics", "\u2014", 2, 40),
      evaporate: schemaNum2("\u6325\u53D1", "dynamics", "\u2014", 0.01, 0.5),
      seed: schemaNum2("seed", "initial", "\u2014", 1, 99)
    },
    init(state) {
      const r = rnd(P(state.params, "seed", 1));
      state.best = r();
      state.energy = (state.best - 0.6) ** 2;
      state.temp = P(state.params, "temp", 5);
      state.t = 0;
      state.hist = [];
      state.pher = Array.from({ length: 24 }, () => r());
    },
    step(state, dt) {
      state.t += dt;
      const r = Math.random();
      if (spec.id === "sim-anneal") {
        const cand = state.best + (r - 0.5) * 0.2;
        const e = (cand - 0.6) ** 2;
        const dE = e - state.energy;
        if (dE < 0 || Math.exp(-dE / Math.max(state.temp, 1e-3)) > Math.random()) {
          state.best = cand;
          state.energy = e;
        }
        state.temp *= P(state.params, "cool", 0.98);
      } else if (spec.id === "ant-colony") {
        for (let i = 0; i < state.pher.length; i += 1) {
          state.pher[i] *= 1 - P(state.params, "evaporate", 0.1);
          state.pher[i] += Math.random() < 0.2 ? 0.3 : 0;
        }
        state.best = state.pher.indexOf(Math.max(...state.pher)) / state.pher.length;
        state.energy = 1 - Math.max(...state.pher);
      } else {
        const mut = P(state.params, "mutate", 0.1);
        const cand = state.best + (r - 0.5) * mut;
        const e = (cand - 0.6) ** 2;
        if (e < state.energy) {
          state.best = cand;
          state.energy = e;
        }
      }
      state.hist.push(state.energy);
      if (state.hist.length > 160) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const mid = box.t + box.h * 0.55;
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      state.hist.forEach((v, i) => {
        const x = box.l + i / 160 * box.w;
        const y = mid - v * 80;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      if (spec.id === "ant-colony") {
        state.pher.forEach((p, i) => {
          ctx.fillStyle = heatTempColor(p, 0, 1);
          ctx.fillRect(box.l + i / state.pher.length * box.w, box.b - 30, box.w / state.pher.length, 16);
        });
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "E", value: formatNum(state.energy, d) },
        { label: "best", value: formatNum(state.best, d) },
        { label: "T", value: formatNum(state.temp, d) }
      ];
    },
    getTrajectory(state) {
      return state.hist.map((E11, i) => ({ i, E: E11 }));
    }
  };
}
function buildLogic(spec) {
  return {
    ...baseMeta2(spec),
    params: { a: 1, b: 0, clk: 1, mode: 0 },
    paramSchema: {
      a: schemaNum2("A", "dynamics", "\u2014", 0, 1),
      b: schemaNum2("B", "dynamics", "\u2014", 0, 1),
      clk: schemaNum2("CLK", "dynamics", "\u2014", 0, 1),
      mode: {
        group: "dynamics",
        unit: "",
        label: "mode",
        min: 0,
        max: 3,
        options: [
          { value: 0, label: "AND" },
          { value: 1, label: "OR" },
          { value: 2, label: "XOR" },
          { value: 3, label: "NAND" }
        ]
      }
    },
    init(state) {
      state.t = 0;
      state.q = 0;
      state.wave = [];
    },
    step(state, dt) {
      state.t += dt;
      const a = Math.round(P(state.params, "a", 1)) & 1;
      const b = Math.round(P(state.params, "b", 0)) & 1;
      const mode = Math.round(P(state.params, "mode", 0));
      let y = 0;
      if (mode === 0) y = a & b;
      else if (mode === 1) y = a | b;
      else if (mode === 2) y = a ^ b;
      else y = a & b ^ 1;
      if (/flip|counter/.test(spec.id)) {
        const clk = Math.round(P(state.params, "clk", 1)) & 1;
        if (clk && !state.prevClk) state.q = a;
        state.prevClk = clk;
        y = state.q;
      }
      if (spec.id === "adder") y = a + b;
      state.y = y;
      state.wave.push(y);
      if (state.wave.length > 120) state.wave.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      ctx.fillStyle = C.muted;
      ctx.font = "14px IBM Plex Mono, monospace";
      ctx.fillText(`A=${Math.round(P(state.params, "a", 1))}  B=${Math.round(P(state.params, "b", 0))}  Y=${state.y}`, box.l, box.t + 40);
      const mid = box.t + box.h * 0.6;
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      state.wave.forEach((v, i) => {
        const x = box.l + i / 120 * box.w;
        const y = mid - v * 28;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    },
    getReadouts(state) {
      return [
        { label: "Y", value: String(state.y) },
        { label: "t", value: formatNum(state.t, 2) }
      ];
    },
    getTrajectory(state) {
      return state.wave.map((y, i) => ({ i, y }));
    }
  };
}
function buildArch(spec) {
  return {
    ...baseMeta2(spec),
    params: { pc: 0, stepDt: 0.3, pages: 8, cacheLines: 4 },
    paramSchema: {
      pc: schemaNum2("PC", "initial", "\u2014", 0, 32),
      stepDt: schemaNum2("stepDt", "dynamics", "s", 0.05, 1),
      pages: schemaNum2("\u9875\u6570", "numerics", "\u2014", 2, 32),
      cacheLines: schemaNum2("cache\u884C", "numerics", "\u2014", 2, 16)
    },
    init(state) {
      state.t = 0;
      state.acc = 0;
      state.pc = Math.floor(P(state.params, "pc", 0));
      state.stage = 0;
      state.regs = [0, 0, 0, 0];
      state.hit = 0;
      state.miss = 0;
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < P(state.params, "stepDt", 0.3)) return;
      state.acc = 0;
      state.stage = (state.stage + 1) % 5;
      if (state.stage === 0) state.pc += 1;
      state.regs[state.pc % 4] = (state.regs[state.pc % 4] + state.pc) % 256;
      if (Math.random() < 0.6) state.hit += 1;
      else state.miss += 1;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      const stages = ["IF", "ID", "EX", "MEM", "WB"];
      stages.forEach((s, i) => {
        const x = 40 + i * 70;
        ctx.fillStyle = i === state.stage ? C.accent : C.axis;
        ctx.fillRect(x, H * 0.35, 58, 36);
        ctx.fillStyle = "#111";
        ctx.font = "12px IBM Plex Mono, monospace";
        ctx.fillText(s, x + 16, H * 0.35 + 22);
      });
      ctx.fillStyle = C.muted;
      ctx.fillText(`PC=${state.pc}  regs=[${state.regs.join(",")}]`, 40, H * 0.6);
    },
    getReadouts(state) {
      return [
        { label: "PC", value: String(state.pc) },
        { label: "stage", value: String(state.stage) },
        { label: "hit%", value: formatNum(100 * state.hit / Math.max(1, state.hit + state.miss), 1) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildEmbed(spec) {
  return {
    ...baseMeta2(spec),
    params: { duty: 0.4, freq: 2, bits: 4, rate: 8 },
    paramSchema: {
      duty: schemaNum2("\u5360\u7A7A\u6BD4", "dynamics", "\u2014", 0.05, 0.95),
      freq: schemaNum2("\u9891\u7387", "dynamics", "Hz", 0.2, 10),
      bits: schemaNum2("\u4F4D\u6570", "dynamics", "\u2014", 2, 12),
      rate: schemaNum2("\u91C7\u6837\u7387", "dynamics", "Hz", 1, 40)
    },
    init(state) {
      state.t = 0;
      state.wave = [];
      state.samples = [];
    },
    step(state, dt) {
      state.t += dt;
      const f = P(state.params, "freq", 2);
      const duty = P(state.params, "duty", 0.4);
      const phase = state.t * f % 1;
      const pwm2 = phase < duty ? 1 : 0;
      const analog = Math.sin(2 * Math.PI * f * state.t);
      state.val = spec.id === "pwm" ? pwm2 : analog;
      state.wave.push(state.val);
      if (state.wave.length > 160) state.wave.shift();
      if (spec.id === "adc-dac") {
        const bits = Math.round(P(state.params, "bits", 4));
        const levels = 2 ** bits;
        state.q = Math.round((analog + 1) * 0.5 * (levels - 1)) / (levels - 1) * 2 - 1;
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const mid = box.t + box.h * 0.5;
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      state.wave.forEach((v, i) => {
        const x = box.l + i / 160 * box.w;
        const y = mid - v * 40;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "val", value: formatNum(state.val, d) },
        { label: "q", value: formatNum(state.q || 0, d) }
      ];
    },
    getTrajectory(state) {
      return state.wave.map((v, i) => ({ i, v }));
    }
  };
}
function buildComm(spec) {
  return {
    ...baseMeta2(spec),
    params: { fc: 8, fm: 1, beta: 1.5, data: 181, errBit: 3 },
    paramSchema: {
      fc: schemaNum2("\u8F7D\u6CE2 f", "dynamics", "Hz", 1, 20),
      fm: schemaNum2("\u8C03\u5236 f", "dynamics", "Hz", 0.2, 5),
      beta: schemaNum2("\u8C03\u5236\u6307\u6570", "dynamics", "\u2014", 0.1, 5),
      data: schemaNum2("\u6570\u636E", "initial", "\u2014", 0, 255),
      errBit: schemaNum2("\u9519\u8BEF\u4F4D", "dynamics", "\u2014", 0, 15)
    },
    init(state) {
      state.t = 0;
      state.wave = [];
    },
    step(state, dt) {
      state.t += dt;
      const fc = P(state.params, "fc", 8);
      const fm = P(state.params, "fm", 1);
      const beta = P(state.params, "beta", 1.5);
      const m = Math.sin(2 * Math.PI * fm * state.t);
      state.val = Math.sin(2 * Math.PI * fc * state.t + beta * m);
      state.wave.push(state.val);
      if (state.wave.length > 180) state.wave.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const mid = box.t + box.h * 0.5;
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      state.wave.forEach((v, i) => {
        const x = box.l + i / 180 * box.w;
        const y = mid - v * 40;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      if (spec.id !== "am-fm") {
        const bits = Math.floor(P(state.params, "data", 181)).toString(2).padStart(8, "0");
        ctx.fillStyle = C.muted;
        ctx.font = "14px IBM Plex Mono, monospace";
        ctx.fillText(bits, box.l, box.b - 20);
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [{ label: "s(t)", value: formatNum(state.val, d) }, { label: "t", value: formatNum(state.t, d) }];
    },
    getTrajectory(state) {
      return state.wave.map((v, i) => ({ i, v }));
    }
  };
}
function buildNet(spec) {
  return {
    ...baseMeta2(spec),
    params: { loss: 0.1, delay: 0.2, stepDt: 0.35 },
    paramSchema: {
      loss: schemaNum2("\u4E22\u5305\u7387", "dynamics", "\u2014", 0, 0.8),
      delay: schemaNum2("\u5EF6\u8FDF", "dynamics", "s", 0, 2),
      stepDt: schemaNum2("stepDt", "dynamics", "s", 0.1, 1)
    },
    init(state) {
      state.t = 0;
      state.acc = 0;
      state.phase = 0;
      state.log = [];
      state.client = "CLOSED";
      state.server = "LISTEN";
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < P(state.params, "stepDt", 0.35) + P(state.params, "delay", 0.2) * 0.2) return;
      state.acc = 0;
      if (Math.random() < P(state.params, "loss", 0.1)) {
        state.log.push("LOSS");
        return;
      }
      const seq = [
        ["SYN_SENT", "SYN_RCVD", "SYN"],
        ["ESTABLISHED", "ESTABLISHED", "SYN-ACK"],
        ["ESTABLISHED", "ESTABLISHED", "ACK"],
        ["FIN_WAIT", "CLOSE_WAIT", "FIN"],
        ["CLOSED", "CLOSED", "ACK"]
      ];
      const row = seq[Math.min(state.phase, seq.length - 1)];
      state.client = row[0];
      state.server = row[1];
      state.log.push(row[2]);
      if (state.log.length > 8) state.log.shift();
      state.phase = Math.min(state.phase + 1, seq.length - 1);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      ctx.fillStyle = C.body;
      ctx.font = "14px IBM Plex Mono, monospace";
      ctx.fillText(`client: ${state.client}`, 40, H * 0.35);
      ctx.fillText(`server: ${state.server}`, 40, H * 0.45);
      ctx.fillStyle = C.muted;
      ctx.fillText(state.log.join(" \u2192 "), 40, H * 0.6);
    },
    getReadouts(state) {
      return [
        { label: "phase", value: String(state.phase) },
        { label: "client", value: state.client },
        { label: "server", value: state.server }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildOs(spec) {
  return {
    ...baseMeta2(spec),
    params: { algo: 0, quantum: 2, n: 4, seed: 2 },
    paramSchema: {
      algo: {
        group: "dynamics",
        unit: "",
        label: "algo",
        min: 0,
        max: 2,
        options: [{ value: 0, label: "FCFS" }, { value: 1, label: "RR" }, { value: 2, label: "Priority" }]
      },
      quantum: schemaNum2("\u65F6\u95F4\u7247", "dynamics", "\u2014", 1, 10),
      n: schemaNum2("\u8FDB\u7A0B\u6570", "numerics", "\u2014", 2, 8),
      seed: schemaNum2("seed", "initial", "\u2014", 1, 99)
    },
    init(state) {
      const r = rnd(P(state.params, "seed", 2));
      const n = Math.floor(P(state.params, "n", 4));
      state.jobs = Array.from({ length: n }, (_, i) => ({
        id: i,
        burst: 2 + Math.floor(r() * 6),
        left: 0,
        prio: Math.floor(r() * 5)
      }));
      state.jobs.forEach((j) => {
        j.left = j.burst;
      });
      state.t = 0;
      state.cur = 0;
      state.gantt = [];
      state.acc = 0;
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < 0.2) return;
      state.acc = 0;
      const alive = state.jobs.filter((j) => j.left > 0);
      if (!alive.length) return;
      const algo = Math.round(P(state.params, "algo", 0));
      if (algo === 2) alive.sort((a, b) => a.prio - b.prio);
      state.cur = alive[0].id;
      alive[0].left -= 1;
      state.gantt.push(state.cur);
      if (state.gantt.length > 40) state.gantt.shift();
      if (algo === 1) {
        state.jobs.push(state.jobs.shift());
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const colors = [C.body, C.accent, C.vector, C.theory, C.muted];
      state.gantt.forEach((id, i) => {
        ctx.fillStyle = colors[id % colors.length];
        ctx.fillRect(box.l + i * 12, box.t + 50, 10, 28);
      });
      state.jobs.forEach((j, i) => {
        ctx.fillStyle = C.muted;
        ctx.font = "12px IBM Plex Mono, monospace";
        ctx.fillText(`P${j.id} left=${j.left} prio=${j.prio}`, box.l, box.t + 110 + i * 18);
      });
    },
    getReadouts(state) {
      return [
        { label: "cur", value: `P${state.cur}` },
        { label: "t", value: formatNum(state.t, 2) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildCompile(spec) {
  return {
    ...baseMeta2(spec),
    params: { src: 0, stepDt: 0.25 },
    paramSchema: {
      src: schemaNum2("\u6837\u4F8B\u6E90\u7801#", "initial", "\u2014", 0, 3),
      stepDt: schemaNum2("stepDt", "dynamics", "s", 0.05, 1)
    },
    init(state) {
      const samples = [
        "int x = 1 + 2;",
        "if (a < b) return a;",
        "while (n) n = n - 1;",
        "print(fib(5));"
      ];
      state.src = samples[Math.round(P(state.params, "src", 0)) % samples.length];
      state.tokens = state.src.match(/[A-Za-z_]\w*|\d+|[=+\-*/<>();]|./g) || [];
      state.pos = 0;
      state.t = 0;
      state.acc = 0;
      state.stack = [];
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < P(state.params, "stepDt", 0.25)) return;
      state.acc = 0;
      if (state.pos < state.tokens.length) {
        state.stack.push(state.tokens[state.pos]);
        state.pos += 1;
        if (state.stack.length > 10) state.stack.shift();
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      ctx.fillStyle = C.muted;
      ctx.font = "14px IBM Plex Mono, monospace";
      ctx.fillText(state.src, 40, H * 0.3);
      state.tokens.forEach((tok, i) => {
        ctx.fillStyle = i === state.pos - 1 ? C.accent : C.body;
        ctx.fillText(tok, 40 + i * 36, H * 0.45);
      });
      ctx.fillStyle = C.muted;
      ctx.fillText(`stack: ${state.stack.join(" ")}`, 40, H * 0.65);
    },
    getReadouts(state) {
      return [
        { label: "pos", value: String(state.pos) },
        { label: "tok", value: String(state.tokens.length) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildDist(spec) {
  return {
    ...baseMeta2(spec),
    params: { nodes: 5, partition: 0, shards: 4, stepDt: 0.3 },
    paramSchema: {
      nodes: schemaNum2("\u8282\u70B9\u6570", "numerics", "\u2014", 3, 9),
      partition: schemaNum2("\u5206\u533A", "dynamics", "\u2014", 0, 1),
      shards: schemaNum2("\u5206\u7247", "numerics", "\u2014", 1, 12),
      stepDt: schemaNum2("stepDt", "dynamics", "s", 0.1, 1)
    },
    init(state) {
      const n = Math.floor(P(state.params, "nodes", 5));
      state.nodes = Array.from({ length: n }, (_, i) => ({ id: i, role: i === 0 ? "leader" : "follower", log: 0 }));
      state.t = 0;
      state.acc = 0;
      state.phase = 0;
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < P(state.params, "stepDt", 0.3)) return;
      state.acc = 0;
      if (spec.id === "raft") {
        if (P(state.params, "partition", 0) > 0.5) {
          state.nodes[0].role = "candidate";
        } else {
          state.nodes.forEach((n, i) => {
            n.role = i === 0 ? "leader" : "follower";
            if (i !== 0) n.log = state.nodes[0].log;
          });
          state.nodes[0].log += 1;
        }
      } else {
        state.phase = (state.phase + 1) % 3;
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      if (spec.id === "mapreduce") {
        const labels = ["Map", "Shuffle", "Reduce"];
        labels.forEach((lab, i) => {
          ctx.fillStyle = i === state.phase ? C.accent : C.axis;
          ctx.fillRect(60 + i * 120, H * 0.4, 100, 40);
          ctx.fillStyle = "#111";
          ctx.font = "14px IBM Plex Mono, monospace";
          ctx.fillText(lab, 85 + i * 120, H * 0.4 + 25);
        });
      } else {
        state.nodes.forEach((n, i) => {
          const x = 70 + i * 70;
          const y = H * 0.45;
          ctx.fillStyle = n.role === "leader" ? C.accent : C.body;
          ctx.beginPath();
          ctx.arc(x, y, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#111";
          ctx.font = "10px IBM Plex Mono, monospace";
          ctx.fillText(n.role[0].toUpperCase(), x - 4, y + 3);
        });
      }
    },
    getReadouts(state) {
      return [
        { label: "phase", value: String(state.phase) },
        { label: "nodes", value: String(state.nodes.length) },
        { label: "log", value: String(state.nodes[0]?.log || 0) }
      ];
    },
    getTrajectory() {
      return [];
    }
  };
}
function buildStruct(spec) {
  return {
    ...baseMeta2(spec),
    params: { load: 10, span: 6, EI: 1, pos: 0.5, shape: 1 },
    paramSchema: {
      load: schemaNum2("\u8F7D\u8377 P", "dynamics", "kN", 0, 100),
      span: schemaNum2("\u8DE8\u5EA6 L", "dynamics", "m", 1, 40),
      EI: schemaNum2("EI", "dynamics", "\u2014", 0.1, 50),
      pos: schemaNum2("\u8F7D\u8377\u4F4D\u7F6E", "dynamics", "\u2014", 0.05, 0.95),
      shape: schemaNum2("\u622A\u9762\u7CFB\u6570", "dynamics", "\u2014", 0.2, 5)
    },
    init(state) {
      state.t = 0;
      state.sfd = [];
      state.bmd = [];
      state.defl = [];
      this._rebuild(state);
    },
    _rebuild(state) {
      const L = Math.max(P(state.params, "span", 6), 0.5);
      const Pload = P(state.params, "load", 10);
      const a = Math.max(0.05, Math.min(0.95, P(state.params, "pos", 0.5))) * L;
      const b = L - a;
      const Ra = Pload * b / L;
      const Rb = Pload * a / L;
      const n = 48;
      state.sfd = [];
      state.bmd = [];
      state.defl = [];
      const EI = Math.max(P(state.params, "EI", 1), 1e-6);
      for (let i = 0; i <= n; i += 1) {
        const x = i / n * L;
        const V = x < a ? Ra : Ra - Pload;
        const M = x < a ? Ra * x : Ra * x - Pload * (x - a);
        const y = Pload * b * x * (L * L - b * b - x * x) / (6 * EI * L);
        state.sfd.push({ x, v: V });
        state.bmd.push({ x, m: M });
        state.defl.push({ x, y: -Math.abs(y) * P(state.params, "shape", 1) });
      }
      state.Ra = Ra;
      state.Rb = Rb;
      state.Mmax = Math.max(...state.bmd.map((p) => Math.abs(p.m)));
      state.ymax = Math.max(...state.defl.map((p) => Math.abs(p.y)));
    },
    step(state, dt) {
      state.t += dt;
      this._rebuild(state);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H, 42);
      title(ctx, spec.name);
      const L = Math.max(P(state.params, "span", 6), 0.5);
      const midY = box.t + box.h * 0.28;
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(box.l, midY);
      ctx.lineTo(box.r, midY);
      ctx.stroke();
      ctx.fillStyle = C.muted;
      [[box.l, midY], [box.r, midY]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 8, y + 12);
        ctx.lineTo(x + 8, y + 12);
        ctx.closePath();
        ctx.fill();
      });
      const a = Math.max(0.05, Math.min(0.95, P(state.params, "pos", 0.5)));
      const px = box.l + a * box.w;
      drawArrow(ctx, px, midY - 40, px, midY - 4, C.accent, 2);
      const plot = (series, key, y0, h, color) => {
        const maxA = Math.max(1e-6, ...series.map((p) => Math.abs(p[key])));
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        series.forEach((p, i) => {
          const x = box.l + p.x / L * box.w;
          const y = y0 - p[key] / maxA * h;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
        ctx.strokeStyle = C.axis;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(box.l, y0);
        ctx.lineTo(box.r, y0);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      plot(state.sfd, "v", box.t + box.h * 0.55, box.h * 0.12, C.vector);
      plot(state.bmd, "m", box.t + box.h * 0.78, box.h * 0.12, C.body);
      ctx.fillStyle = C.muted;
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText("SFD", box.l, box.t + box.h * 0.48);
      ctx.fillText("BMD", box.l, box.t + box.h * 0.68);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "Ra", value: `${formatNum(state.Ra, d)} kN` },
        { label: "Rb", value: `${formatNum(state.Rb, d)} kN` },
        { label: "Mmax", value: `${formatNum(state.Mmax, d)}` },
        { label: "|y|max", value: formatNum(state.ymax, d) }
      ];
    }
  };
}
function buildControl(spec) {
  return {
    ...baseMeta2(spec),
    params: { K: 1, zeta: 0.4, wn: 2, Kp: 1.2, Ki: 0.4, Kd: 0.08, speed: 1 },
    paramSchema: {
      K: schemaNum2("K", "dynamics", "\u2014", 0.1, 10),
      zeta: schemaNum2("\u03B6", "dynamics", "\u2014", 0.05, 2),
      wn: schemaNum2("\u03C9\u2099", "dynamics", "rad/s", 0.2, 20),
      Kp: schemaNum2("Kp", "dynamics", "\u2014", 0, 20),
      Ki: schemaNum2("Ki", "dynamics", "\u2014", 0, 20),
      Kd: schemaNum2("Kd", "dynamics", "\u2014", 0, 5),
      speed: schemaNum2("\u52A8\u753B\u901F", "dynamics", "\u2014", 0.2, 4)
    },
    init(state) {
      state.t = 0;
      state.y = 0;
      state.v = 0;
      state.ie = 0;
      state.hist = [];
      state.ref = 1;
      state.overshoot = 0;
    },
    step(state, dt) {
      const s = Math.max(0.05, P(state.params, "speed", 1));
      const h = dt * s;
      const zeta = P(state.params, "zeta", 0.4);
      const wn = P(state.params, "wn", 2);
      const K = P(state.params, "K", 1);
      const e = state.ref - state.y;
      state.ie += e * h;
      const u = P(state.params, "Kp", 1.2) * e + P(state.params, "Ki", 0.4) * state.ie - P(state.params, "Kd", 0.08) * state.v;
      const drive = K * (state.ref + 0.35 * u);
      const a = drive * wn * wn - 2 * zeta * wn * state.v - wn * wn * state.y;
      state.v += a * h;
      state.y += state.v * h;
      state.t += h;
      state.overshoot = Math.max(state.overshoot, state.y - state.ref);
      state.hist.push(state.y);
      if (state.hist.length > 220) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const mid = box.t + box.h * 0.55;
      ctx.strokeStyle = C.axis;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(box.l, mid - 40);
      ctx.lineTo(box.r, mid - 40);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      state.hist.forEach((v, i) => {
        const x = box.l + i / 220 * box.w;
        const y = mid - v * 40;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      if (spec.id === "inverted-pendulum" || spec.id === "flight-attitude") {
        const ang = state.y * 0.4;
        const cx = W * 0.5;
        const cy = H * 0.78;
        ctx.strokeStyle = C.vector;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.sin(ang) * 70, cy - Math.cos(ang) * 70);
        ctx.stroke();
        ctx.fillStyle = C.accent;
        ctx.fillRect(cx - 28, cy, 56, 10);
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "y", value: formatNum(state.y, d) },
        { label: "OS", value: formatNum(state.overshoot, d) },
        { label: "\u03B6", value: formatNum(P(state.params, "zeta", 0.4), d) }
      ];
    }
  };
}
function buildChaos(spec) {
  const isMandel = spec.id === "mandelbrot-julia";
  return {
    ...baseMeta2(spec),
    params: isMandel ? { iter: 40, cx: -0.7, cy: 0.27, zoom: 1.2 } : { sigma: 10, rho: 28, beta: 2.67, a: 0.2, b: 0.2, c: 5.7, speed: 1, proj: 0 },
    paramSchema: isMandel ? {
      iter: schemaNum2("\u8FED\u4EE3", "numerics", "\u2014", 10, 120),
      cx: schemaNum2("c\u1D63", "dynamics", "\u2014", -2, 1),
      cy: schemaNum2("c\u1D62", "dynamics", "\u2014", -1.5, 1.5),
      zoom: schemaNum2("\u7F29\u653E", "dynamics", "\u2014", 0.3, 8)
    } : {
      sigma: schemaNum2("\u03C3", "dynamics", "\u2014", 1, 30),
      rho: schemaNum2("\u03C1", "dynamics", "\u2014", 1, 50),
      beta: schemaNum2("\u03B2", "dynamics", "\u2014", 0.5, 8),
      a: schemaNum2("a", "dynamics", "\u2014", 0.05, 1),
      b: schemaNum2("b", "dynamics", "\u2014", 0.05, 1),
      c: schemaNum2("c", "dynamics", "\u2014", 1, 20),
      speed: schemaNum2("\u52A8\u753B\u901F", "dynamics", "\u2014", 0.2, 4),
      proj: {
        label: "\u6295\u5F71",
        group: "display",
        unit: "",
        min: 0,
        max: 2,
        options: [
          { value: 0, label: "xy" },
          { value: 1, label: "xz" },
          { value: 2, label: "yz" }
        ]
      }
    },
    init(state) {
      state.t = 0;
      state.x = 0.1;
      state.y = 0;
      state.z = 0;
      state.trail = isMandel ? [] : createRingTrail(mobileBudget().trailCap);
      state.frame = 0;
      state._mandelKey = "";
      state._mandelCanvas = null;
    },
    step(state, dt) {
      if (isMandel) {
        state.t += dt;
        state.frame += 1;
        return;
      }
      const h = dt * P(state.params, "speed", 1) * 0.35;
      if (spec.id === "rossler" || spec.id === "lotka-volterra") {
        if (spec.id === "lotka-volterra") {
          const alpha = P(state.params, "sigma", 10) * 0.1;
          const beta = P(state.params, "rho", 28) * 0.02;
          const gamma2 = P(state.params, "beta", 2.67) * 0.2;
          const delta = P(state.params, "a", 0.2);
          const dx = state.x * (alpha - beta * state.y);
          const dy = -state.y * (gamma2 - delta * state.x);
          state.x = Math.max(0.01, state.x + dx * h);
          state.y = Math.max(0.01, state.y + dy * h);
        } else {
          const a = P(state.params, "a", 0.2);
          const b = P(state.params, "b", 0.2);
          const c = P(state.params, "c", 5.7);
          const dx = -state.y - state.z;
          const dy = state.x + a * state.y;
          const dz = b + state.z * (state.x - c);
          state.x += dx * h;
          state.y += dy * h;
          state.z += dz * h;
        }
      } else {
        const sigma = P(state.params, "sigma", 10);
        const rho = P(state.params, "rho", 28);
        const beta = P(state.params, "beta", 2.67);
        const dx = sigma * (state.y - state.x);
        const dy = state.x * (rho - state.z) - state.y;
        const dz = state.x * state.y - beta * state.z;
        state.x += dx * h;
        state.y += dy * h;
        state.z += dz * h;
      }
      state.t += h;
      state.trail = ensureRingCap(state.trail, mobileBudget().trailCap);
      ringPush(state.trail, { x: state.x, y: state.y, z: state.z });
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      if (isMandel) {
        const budget = mobileBudget();
        const iterMax = Math.min(budget.mandelIterCap, Math.floor(P(state.params, "iter", 40)));
        const zoom = P(state.params, "zoom", 1.2);
        const cx0 = P(state.params, "cx", -0.7);
        const cy0 = P(state.params, "cy", 0.27);
        const step = budget.mandelStep;
        const dpr = Math.max(1, Number(view.dpr) || (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1);
        const key = `${iterMax}|${zoom}|${cx0}|${cy0}|${step}|${W}x${H}|dpr=${dpr.toFixed(2)}`;
        if (state._mandelKey === key && state._mandelCanvas) {
          ctx.drawImage(state._mandelCanvas, 0, 0, W, H);
          title(ctx, spec.name);
          return;
        }
        const off = typeof document !== "undefined" && document.createElement ? state._mandelCanvas || document.createElement("canvas") : null;
        if (off) {
          off.width = Math.max(1, Math.floor(W * dpr));
          off.height = Math.max(1, Math.floor(H * dpr));
        }
        const g = off ? off.getContext("2d") : ctx;
        if (off) {
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          g.fillStyle = "#0b0e14";
          g.fillRect(0, 0, W, H);
        }
        for (let py = 30; py < H - 10; py += step) {
          for (let px = 10; px < W - 10; px += step) {
            let zx = (px - W / 2) / (0.25 * W * zoom);
            let zy = (py - H / 2) / (0.25 * H * zoom);
            const cr = cx0;
            const ci = cy0;
            let n = 0;
            while (zx * zx + zy * zy < 4 && n < iterMax) {
              const xt = zx * zx - zy * zy + cr;
              zy = 2 * zx * zy + ci;
              zx = xt;
              n += 1;
            }
            g.fillStyle = n >= iterMax ? "#111" : heatTempColor(n, 0, iterMax);
            g.fillRect(px, py, step, step);
          }
        }
        if (off) {
          state._mandelCanvas = off;
          state._mandelKey = key;
          ctx.drawImage(off, 0, 0, W, H);
        } else {
          state._mandelKey = key;
        }
        title(ctx, spec.name);
        return;
      }
      title(ctx, spec.name);
      const box = padBox(W, H);
      const proj = Math.round(P(state.params, "proj", 0));
      const labels = ["xy", "xz", "yz"];
      ctx.fillStyle = C.muted;
      ctx.font = "11px IBM Plex Mono, monospace";
      ctx.fillText(`proj ${labels[proj] || "xy"}`, box.l, box.t - 8);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(box.l, box.t + box.h * 0.5);
      ctx.lineTo(box.r, box.t + box.h * 0.5);
      ctx.moveTo(box.l + box.w * 0.5, box.t);
      ctx.lineTo(box.l + box.w * 0.5, box.b);
      ctx.stroke();
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const trail = state.trail?.buf ? state.trail : null;
      if (trail) {
        ringForEach(trail, (p, i) => {
          let u;
          let v;
          if (proj === 1) {
            u = p.x;
            v = p.z;
          } else if (proj === 2) {
            u = p.y;
            v = p.z;
          } else {
            u = p.x;
            v = p.y;
          }
          const x = box.l + box.w * 0.5 + u * 6;
          const y = box.t + box.h * 0.5 + v * 6;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
      }
      ctx.stroke();
      const last = trail ? ringLast(trail) : null;
      if (last) {
        let u;
        let v;
        if (proj === 1) {
          u = last.x;
          v = last.z;
        } else if (proj === 2) {
          u = last.y;
          v = last.z;
        } else {
          u = last.x;
          v = last.y;
        }
        ctx.fillStyle = C.accent;
        ctx.beginPath();
        ctx.arc(box.l + box.w * 0.5 + u * 6, box.t + box.h * 0.5 + v * 6, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      if (isMandel) {
        return [
          { label: "iter", value: String(Math.floor(P(state.params, "iter", 40))) },
          { label: "zoom", value: formatNum(P(state.params, "zoom", 1.2), d) }
        ];
      }
      const labels = ["xy", "xz", "yz"];
      return [
        { label: "x", value: formatNum(state.x, d) },
        { label: "y", value: formatNum(state.y, d) },
        { label: "z", value: formatNum(state.z, d) },
        { label: "proj", value: labels[Math.round(P(state.params, "proj", 0))] || "xy" }
      ];
    }
  };
}
function buildTraffic(spec) {
  return {
    ...baseMeta2(spec),
    params: { density: 0.25, pSlow: 0.2, vmax: 5, green: 0.55, cycle: 30, seed: 7 },
    paramSchema: {
      density: schemaNum2("\u5BC6\u5EA6", "dynamics", "\u2014", 0.05, 0.9),
      pSlow: schemaNum2("\u968F\u673A\u6162\u5316", "dynamics", "\u2014", 0, 0.8),
      vmax: schemaNum2("vmax", "dynamics", "\u2014", 1, 8),
      green: schemaNum2("\u7EFF\u4FE1\u6BD4", "dynamics", "\u2014", 0.2, 0.9),
      cycle: schemaNum2("\u5468\u671F", "dynamics", "s", 10, 90),
      seed: schemaNum2("seed", "initial", "\u2014", 1, 9999)
    },
    init(state) {
      const n = 60;
      const dens = P(state.params, "density", 0.25);
      const rand = rnd(P(state.params, "seed", 7));
      state.cells = Array.from({ length: n }, () => rand() < dens ? Math.floor(rand() * P(state.params, "vmax", 5)) + 1 : -1);
      state.t = 0;
      state.acc = 0;
      state.flow = 0;
      state.queue = 0;
      state.n = n;
      state.fund = [];
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < 0.12) return;
      state.acc = 0;
      const vmax = Math.max(1, Math.floor(P(state.params, "vmax", 5)));
      const pSlow = P(state.params, "pSlow", 0.2);
      const n = state.n;
      const next = state.cells.slice();
      const rand = rnd(Math.floor(state.t * 1e3) + 1);
      let moved = 0;
      for (let i = 0; i < n; i += 1) {
        if (state.cells[i] < 0) continue;
        let v = state.cells[i];
        v = Math.min(v + 1, vmax);
        let gap = 0;
        for (let k = 1; k <= vmax; k += 1) {
          if (state.cells[(i + k) % n] >= 0) break;
          gap = k;
        }
        v = Math.min(v, gap);
        if (v > 0 && rand() < pSlow) v -= 1;
        if (spec.id === "signalized-intersection") {
          const cyc = Math.max(5, P(state.params, "cycle", 30));
          const g = P(state.params, "green", 0.55);
          const phase = state.t % cyc / cyc;
          if (i > n * 0.45 && i < n * 0.55 && phase > g) v = 0;
        }
        next[i] = -1;
        const j = (i + v) % n;
        next[j] = v;
        if (v > 0) moved += 1;
      }
      state.cells = next;
      state.flow = moved / n;
      state.queue = state.cells.filter((c) => c === 0).length;
      const dens = state.cells.filter((c) => c >= 0).length / n;
      state.fund.push({ rho: dens, q: state.flow });
      if (state.fund.length > 220) state.fund.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, `${spec.name} \xB7 \u03C1\u2013q`);
      const n = state.n;
      const cellW = (W - 40) / n;
      const y = H * 0.32;
      for (let i = 0; i < n; i += 1) {
        const v = state.cells[i];
        if (v < 0) continue;
        ctx.fillStyle = heatTempColor(v, 0, Math.max(1, P(state.params, "vmax", 5)));
        ctx.fillRect(20 + i * cellW, y - 8, Math.max(2, cellW - 1), 16);
      }
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(20, y - 12, W - 40, 24);
      const box = { l: 40, t: H * 0.48, w: W - 80, h: H * 0.42 };
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l, box.t, box.w, box.h);
      ctx.fillStyle = C.muted;
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText("\u03C1", box.l + box.w - 12, box.t + box.h + 12);
      ctx.fillText("q", box.l - 12, box.t + 10);
      const qMax = Math.max(0.15, ...state.fund.map((p) => p.q));
      for (const p of state.fund) {
        const x = box.l + p.rho * box.w;
        const yy = box.t + box.h - p.q / qMax * box.h;
        ctx.fillStyle = C.body;
        ctx.fillRect(x - 1.5, yy - 1.5, 3, 3);
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      const dens = state.cells.filter((c) => c >= 0).length / state.n;
      return [
        { label: "\u03C1", value: formatNum(dens, d) },
        { label: "q", value: formatNum(state.flow, d) },
        { label: "queue", value: String(state.queue) },
        { label: "pts", value: String(state.fund.length) }
      ];
    }
  };
}
function buildReactor(spec) {
  return {
    ...baseMeta2(spec),
    params: { tau: 2, k: 0.8, order: 1, cin: 1, T: 350, P: 1, reflux: 1.5, z: 0.5 },
    paramSchema: {
      tau: schemaNum2("\u505C\u7559 \u03C4", "dynamics", "s", 0.2, 20),
      k: schemaNum2("\u901F\u7387 k", "dynamics", "1/s", 0, 5),
      order: schemaNum2("\u7EA7\u6570", "dynamics", "\u2014", 1, 2),
      cin: schemaNum2("\u8FDB\u6599 c\u1D62\u2099", "dynamics", "\u2014", 0, 5),
      T: schemaNum2("T", "dynamics", "K", 250, 600),
      P: schemaNum2("P", "dynamics", "bar", 0.2, 20),
      reflux: schemaNum2("\u56DE\u6D41\u6BD4", "dynamics", "\u2014", 0.5, 8),
      z: schemaNum2("\u8FDB\u6599\u7EC4\u6210", "dynamics", "\u2014", 0.05, 0.95)
    },
    init(state) {
      state.t = 0;
      state.c = P(state.params, "cin", 1);
      state.hist = [];
      state.profile = [];
      state.stages = 0;
    },
    step(state, dt) {
      const tau = Math.max(0.05, P(state.params, "tau", 2));
      const k = P(state.params, "k", 0.8);
      const n = Math.max(1, Math.round(P(state.params, "order", 1)));
      const cin = P(state.params, "cin", 1);
      if (spec.id === "pfr") {
        const u = 1 / tau;
        state.profile = [];
        let c = cin;
        for (let i = 0; i <= 40; i += 1) {
          state.profile.push(c);
          const r = -k * c ** n;
          c = Math.max(0, c + r / Math.max(u, 1e-6) * (1 / 40));
        }
        state.c = c;
      } else if (spec.id === "mccabe-thiele") {
        const R = P(state.params, "reflux", 1.5);
        const z = P(state.params, "z", 0.5);
        state.stages = Math.max(2, Math.min(20, Math.round(8 / Math.max(0.2, R)) + Math.round(z * 6)));
        state.c = z;
      } else {
        const r = -k * state.c ** n;
        state.c += ((cin - state.c) / tau + r) * dt;
        state.c = Math.max(0, state.c);
      }
      state.t += dt;
      state.hist.push(state.c);
      if (state.hist.length > 180) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      if (spec.id === "pfr" && state.profile?.length) {
        ctx.strokeStyle = C.body;
        ctx.beginPath();
        state.profile.forEach((c, i) => {
          const x = box.l + i / (state.profile.length - 1) * box.w;
          const y = box.b - c * box.h * 0.7;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      } else if (spec.id === "mccabe-thiele") {
        ctx.strokeStyle = C.axis;
        ctx.strokeRect(box.l, box.t, box.w, box.h);
        ctx.strokeStyle = C.body;
        ctx.beginPath();
        ctx.moveTo(box.l, box.b);
        ctx.lineTo(box.r, box.t);
        ctx.stroke();
        ctx.strokeStyle = C.accent;
        ctx.beginPath();
        const stages = state.stages || 4;
        let x = P(state.params, "z", 0.5);
        let y = x;
        for (let i = 0; i < stages; i += 1) {
          const yEq = Math.sqrt(x);
          const px = box.l + x * box.w;
          const py = box.b - y * box.h;
          const pye = box.b - yEq * box.h;
          ctx.moveTo(px, py);
          ctx.lineTo(px, pye);
          x = Math.min(0.98, yEq * (1 + 0.1 * P(state.params, "reflux", 1.5)));
          y = yEq;
          ctx.lineTo(box.l + x * box.w, pye);
        }
        ctx.stroke();
      } else {
        ctx.strokeStyle = C.body;
        ctx.beginPath();
        state.hist.forEach((c, i) => {
          const x = box.l + i / 180 * box.w;
          const y = box.b - c * box.h * 0.7;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "c", value: formatNum(state.c, d) },
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "stages", value: String(state.stages || 0) },
        { label: "X", value: formatNum(1 - state.c / Math.max(1e-6, P(state.params, "cin", 1)), d) }
      ];
    }
  };
}
function buildAero(spec) {
  return {
    ...baseMeta2(spec),
    params: { alpha: 5, AR: 8, sweep: 20, camber: 0.04, Re: 1e6, thrust: 1.2, mass: 1 },
    paramSchema: {
      alpha: schemaNum2("\u653B\u89D2 \u03B1", "dynamics", "\xB0", -5, 25),
      AR: schemaNum2("\u5C55\u5F26\u6BD4", "dynamics", "\u2014", 2, 20),
      sweep: schemaNum2("\u540E\u63A0\u89D2", "dynamics", "\xB0", 0, 45),
      camber: schemaNum2("\u5F2F\u5EA6", "dynamics", "\u2014", 0, 0.15),
      Re: schemaNum2("Re/10\u2076", "dynamics", "\u2014", 0.1, 10),
      thrust: schemaNum2("\u63A8\u529B", "dynamics", "\u2014", 0.2, 5),
      mass: schemaNum2("\u8D28\u91CF", "dynamics", "\u2014", 0.2, 10)
    },
    init(state) {
      state.t = 0;
      state.x = 0.2;
      state.y = 0.7;
      state.vx = 0;
      state.vy = 0;
      state.trail = [];
      state.Cl = 0;
      state.Cd = 0;
    },
    step(state, dt) {
      const alpha = P(state.params, "alpha", 5) * Math.PI / 180;
      const AR = P(state.params, "AR", 8);
      const camber = P(state.params, "camber", 0.04);
      state.Cl = 2 * Math.PI * (alpha + camber) * (AR / (AR + 2));
      state.Cd = 0.02 + state.Cl * state.Cl / (Math.PI * AR * 0.9) + 1e-3 * P(state.params, "sweep", 20);
      if (spec.id === "rocket-vt" || spec.id === "reentry-trajectory") {
        const T = P(state.params, "thrust", 1.2);
        const m = Math.max(0.1, P(state.params, "mass", 1));
        state.vy += (T / m - 1 - 0.15 * state.Cd) * dt;
        state.vx += Math.sin(alpha) * 0.2 * dt;
        state.x += state.vx * dt * 0.05;
        state.y += state.vy * dt * 0.05;
        if (state.y < 0.08) {
          state.y = 0.08;
          state.vy = 0;
        }
        pushTrail(state.trail, { x: state.x, y: state.y }, 200);
      }
      state.t += dt;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const alpha = P(state.params, "alpha", 5) * Math.PI / 180;
      const sweep = P(state.params, "sweep", 20) * Math.PI / 180;
      const cx = W * 0.5;
      const cy = H * 0.45;
      const span = 120;
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - span, cy + Math.tan(sweep) * 20);
      ctx.lineTo(cx, cy - 10 - P(state.params, "camber", 0.04) * 80);
      ctx.lineTo(cx + span, cy + Math.tan(sweep) * 20);
      ctx.lineTo(cx, cy + 18);
      ctx.closePath();
      ctx.stroke();
      drawArrow(ctx, cx, cy, cx + Math.cos(alpha) * 50, cy - Math.sin(alpha) * 50, C.vector, 2);
      drawArrow(ctx, cx, cy, cx, cy - state.Cl * 25, C.accent, 2);
      if (state.trail.length) {
        ctx.strokeStyle = C.trail || C.muted;
        ctx.beginPath();
        state.trail.forEach((p, i) => {
          const x = box.l + p.x * box.w;
          const y = box.b - p.y * box.h;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: "Cl", value: formatNum(state.Cl, d) },
        { label: "Cd", value: formatNum(state.Cd, d) },
        { label: "L/D", value: formatNum(state.Cl / Math.max(1e-6, state.Cd), d) },
        { label: "t", value: `${formatNum(state.t, d)} s` }
      ];
    }
  };
}
export {
  createFactoryModel
};
