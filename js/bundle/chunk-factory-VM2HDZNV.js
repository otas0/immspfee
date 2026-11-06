import {
  C,
  P,
  applyLowInkStrokeBoost,
  drawArrow,
  familyCapabilities,
  forceGraphStep,
  formatNum,
  heatTempColor,
  localizeSchema,
  mapNormToScreen,
  overrideOptions,
  paintGraph,
  t
} from "./chunk-chunk-2PIWYVTY.js";

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
  const t2 = state.t || 0;
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
    const phase = standing ? Math.sin(k * x * Math.PI) * Math.cos(w * t2) : Math.sin(k * x * Math.PI * 2 - w * t2);
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
  const t2 = Math.max(0.05, state.t || 0.05);
  const sigma = Math.sqrt(2 * Ed * t2);
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
    const g = Math.exp(-(x * x) / (4 * Ed * t2));
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
    ctx.lineTo(probeX, base - amp * Math.exp(-(xi * xi) / (4 * Ed * t2)));
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

// js/lab/designCaveat.js
function designCaveatKey(model) {
  if (!model) return "";
  const blob = `${model.id || ""} ${model.name || ""} ${model.sub || ""} ${model.formula || ""} ${(model.tags || []).join(" ")}`;
  if (/核工程|核物理|裂变|聚变|反应堆|中子|劳逊|剂量|屏蔽|链式反应|neutron|fission|fusion|reactor|lawson/i.test(blob)) {
    return "caveat.nuclear";
  }
  if (/平衡与电化学|电解|电镀|燃料电池|能斯特|腐蚀|electrochem|electrolysis|fuel cell|nernst/i.test(blob)) {
    return "caveat.electrochem";
  }
  if (/生物膜|Goldman|膜运输|膜电位|动作电位|Hodgkin|药代|membrane|action potential/i.test(blob)) {
    return "caveat.membrane";
  }
  return "";
}
function designCaveatText(model) {
  const key = designCaveatKey(model);
  return key ? t(key) : "";
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
      const t2 = 46;
      const b = H - 28;
      ctx.fillStyle = C.muted || "#888";
      ctx.font = "600 13px IBM Plex Mono, monospace";
      ctx.fillText(spec.name, 14, 22);
      const caveat = designCaveatText({ ...spec, formula: equation });
      if (caveat) {
        ctx.fillStyle = C.muted;
        ctx.font = "11px IBM Plex Sans, sans-serif";
        ctx.fillText(caveat, 14, 40);
      }
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
        const y = b - (v - lo) / (hi - lo) * (b - t2);
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
function radiationKind(w) {
  const x = Number(w);
  if (Math.abs(x - 1) < 1e-6) return "\u5149\u5B50/\u7535\u5B50";
  if (Math.abs(x - 2) < 1e-6) return "\u8D28\u5B50";
  if (Math.abs(x - 20) < 1e-6) return "\u03B1 \u7C92\u5B50";
  return "\u4E2D\u5B50\uFF08w_R \u968F\u80FD\u91CF\uFF09";
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
      const t2 = state.t;
      const x0p = P(state.params, "x0", 0);
      const v0p = P(state.params, "v0", 0);
      const ap = P(state.params, "a", 0);
      state.x = x0p + v0p * t2 + 0.5 * ap * t2 * t2;
      state.v = v0p + ap * t2;
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
      const t2 = state.t;
      const v0 = P(state.params, "v0", 16);
      const th = P(state.params, "theta", thetaDeg) * Math.PI / 180;
      const g = P(state.params, "g", 9.81);
      const y0 = P(state.params, "y0", 0);
      state.x = v0 * Math.cos(th) * t2;
      state.y = y0 + v0 * Math.sin(th) * t2 - 0.5 * g * t2 * t2;
      state.vx = v0 * Math.cos(th);
      state.vy = v0 * Math.sin(th) - g * t2;
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
function collision(spec, topic) {
  let e = 0.6;
  if (has(topic, /弹性/) && !has(topic, /非弹性/)) e = 1;
  if (has(topic, /完全非弹性|爆炸/)) e = 0;
  if (has(topic, /非弹性/) && !has(topic, /完全/)) e = 0.4;
  return shell(spec, {
    equation: `v\u2081,v\u2082 \u7531\u52A8\u91CF\u5B88\u6052\u4E0E\u6062\u590D\u7CFB\u6570\u51B3\u5B9A\uFF08\u9ED8\u8BA4 e = ${e}\uFF09`,
    authority: "Hibbeler, Dynamics, \u5BF9\u5FC3\u78B0\u649E\u4E0E\u6062\u590D\u7CFB\u6570",
    assumptions: "\u4E00\u7EF4\u5BF9\u5FC3\u3001\u78B0\u649E\u77AC\u95F4\u5916\u529B\u51B2\u91CF\u53EF\u5FFD\u7565\uFF1B\u4E8C\u7EF4\u659C\u78B0\u6B64\u5904\u53EA\u7ED9\u51FA\u6CD5\u5411\u5206\u91CF\u540C\u4E00\u516C\u5F0F",
    params: { m1: 2, m2: 1, u1: 4, u2: 0, e },
    schema: {
      m1: S("m\u2081", "dynamics", "kg", 0.1, 20),
      m2: S("m\u2082", "dynamics", "kg", 0.1, 20),
      u1: S("u\u2081", "initial", "m/s", -20, 20),
      u2: S("u\u2082", "initial", "m/s", -20, 20),
      e: S("e", "dynamics", "\u2014", 0, 1)
    },
    tick(state) {
      const m1 = P(state.params, "m1", 2);
      const m2 = P(state.params, "m2", 1);
      const u1 = P(state.params, "u1", 4);
      const u2 = P(state.params, "u2", 0);
      const er = Math.min(1, Math.max(0, P(state.params, "e", e)));
      const den = m1 + m2;
      state.v1 = ((m1 - er * m2) * u1 + (1 + er) * m2 * u2) / den;
      state.v2 = ((m2 - er * m1) * u2 + (1 + er) * m1 * u1) / den;
      state.p = m1 * state.v1 + m2 * state.v2;
      state.p0 = m1 * u1 + m2 * u2;
      state.J = m1 * (state.v1 - u1);
    },
    plot: (s) => s.v1,
    rows: (s) => [["v\u2081", s.v1, "m/s"], ["v\u2082", s.v2, "m/s"], ["p", s.p, "kg\xB7m/s"], ["J", s.J, "N\xB7s"]]
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
        const t2 = state.t;
        if (z < 1) {
          const wd = w * Math.sqrt(1 - z * z);
          state.x = Math.exp(-z * w * t2) * x0 * Math.cos(wd * t2);
        } else if (Math.abs(z - 1) < 1e-3) {
          state.x = x0 * (1 + w * t2) * Math.exp(-w * t2);
        } else {
          const s1 = -z * w + w * Math.sqrt(z * z - 1);
          const s2 = -z * w - w * Math.sqrt(z * z - 1);
          state.x = x0 * (s2 * Math.exp(s1 * t2) - s1 * Math.exp(s2 * t2)) / (s2 - s1);
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
      I: S("I", "dynamics", "A", 0, 5),
      R: S("R", "dynamics", "\u03A9", 0.1, 100)
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
    equation: "K_max = max(0, hf \u2212 W)",
    authority: "Einstein \u5149\u7535\u65B9\u7A0B\uFF1BHalliday \u8FD1\u4EE3\u7269\u7406\u7AE0\u8282",
    assumptions: "hf \u4E0E W \u540C\u7528 eV\uFF1B\u65E0\u7A7A\u95F4\u7535\u8377",
    params: { hf: 3, W: 2 },
    schema: {
      hf: S("hf", "dynamics", "eV", 0, 12),
      W: S("W", "dynamics", "eV", 0, 10)
    },
    tick(state) {
      state.K = Math.max(0, P(state.params, "hf", 3) - P(state.params, "W", 2));
    },
    plot: (s) => s.K,
    rows: (s) => [["K_max", s.K, "eV"]]
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
      L0: S("L\u2080", "dynamics", "m", 0.1, 10)
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
      alpha: S("\u03B1", "dynamics", "\u2014", 0.1, 3),
      beta: S("\u03B2", "dynamics", "\u2014", 0.05, 1),
      gamma: S("\u03B3", "dynamics", "\u2014", 0.1, 3),
      delta: S("\u03B4", "dynamics", "\u2014", 0.05, 1)
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
      const t2 = state.t;
      if (order === 0) state.c = Math.max(0, c0 - k * t2);
      else if (order === 2) state.c = 1 / (1 / c0 + k * t2);
      else state.c = c0 * Math.exp(-k * t2);
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
        E: S("E", "dynamics", "GPa", 10, 300),
        L: S("L", "dynamics", "m", 0.3, 8),
        mu: S("\u03BC", "dynamics", "\u2014", 0.5, 2)
      },
      tick(state) {
        const E = P(state.params, "E", 200) * 1e9;
        const I = P(state.params, "I", 1e-6);
        const L = Math.max(0.05, P(state.params, "L", 2));
        const mu = Math.max(0.5, P(state.params, "mu", 1));
        state.Pcr = Math.PI ** 2 * E * I / (mu * L) ** 2;
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
        T: S("T", "dynamics", "N\xB7m", 0, 2e3),
        rho: S("\u03C1", "dynamics", "m", 1e-3, 0.1)
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
function gearOrBelt(spec, topic) {
  const belt = has(topic, /带|摩擦轮/);
  return shell(spec, {
    equation: belt ? "i = D\u2082/D\u2081\uFF0Cv = \u03C0 D n" : "i = z\u2082/z\u2081\uFF0C\u03C9\u2082 = \u03C9\u2081 / i",
    authority: belt ? "Shigley, Mechanical Engineering Design, \u5E26\u4F20\u52A8\u901F\u6BD4" : "Shigley, Mechanical Engineering Design, \u9F7F\u8F6E\u901F\u6BD4",
    assumptions: "\u65E0\u6ED1\u52A8\uFF08\u5E26\u4F20\u52A8\u4E3A\u7406\u60F3\uFF09\uFF1B\u9F7F\u6570\u6216\u76F4\u5F84\u4E3A\u6B63",
    params: belt ? { D1: 0.1, D2: 0.2, n: 10 } : { z1: 20, z2: 40, w1: 10 },
    schema: belt ? {
      D1: S("D\u2081", "dynamics", "m", 0.02, 1),
      D2: S("D\u2082", "dynamics", "m", 0.02, 1),
      n: S("n", "dynamics", "rev/s", 0.1, 50)
    } : {
      z1: S("z\u2081", "dynamics", "\u2014", 8, 120),
      z2: S("z\u2082", "dynamics", "\u2014", 8, 200),
      w1: S("\u03C9\u2081", "dynamics", "rad/s", 0, 100)
    },
    tick(state) {
      if (belt) {
        const D1 = Math.max(1e-3, P(state.params, "D1", 0.1));
        const D2 = Math.max(1e-3, P(state.params, "D2", 0.2));
        state.i = D2 / D1;
        state.v = Math.PI * D1 * P(state.params, "n", 10);
      } else {
        const z1 = Math.max(1, P(state.params, "z1", 20));
        const z2 = Math.max(1, P(state.params, "z2", 40));
        state.i = z2 / z1;
        state.w2 = P(state.params, "w1", 10) / state.i;
      }
    },
    plot: (s) => s.i,
    rows: (s) => [["i", s.i, ""], belt ? ["v", s.v, "m/s"] : ["\u03C9\u2082", s.w2, "rad/s"]]
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
function normalPdf(spec, topic) {
  if (has(topic, /泊松/)) {
    return shell(spec, {
      equation: "P(k)= e^{\u2212\u03BB} \u03BB^k / k!",
      authority: "Ross, A First Course in Probability, \u6CCA\u677E\u5206\u5E03",
      assumptions: "\u72EC\u7ACB\u7A00\u6709\u4E8B\u4EF6",
      params: { lambda: 3, k: 2 },
      schema: {
        lambda: S("\u03BB", "dynamics", "\u2014", 0.1, 12),
        k: S("k", "dynamics", "\u2014", 0, 15)
      },
      tick(state) {
        const lam = P(state.params, "lambda", 3);
        const k = Math.max(0, Math.round(P(state.params, "k", 2)));
        let fact = 1;
        for (let i = 2; i <= k; i += 1) fact *= i;
        state.p = Math.exp(-lam) * lam ** k / fact;
      },
      plot: (s) => s.p,
      rows: (s) => [["P(k)", s.p, ""]]
    });
  }
  if (has(topic, /二项/)) {
    return shell(spec, {
      equation: "P(k)= C(n,k) p^k (1\u2212p)^{n\u2212k}",
      authority: "Ross, A First Course in Probability, \u4E8C\u9879\u5206\u5E03",
      assumptions: "n \u6B21\u72EC\u7ACB\u4F2F\u52AA\u5229",
      params: { n: 10, p: 0.4, k: 4 },
      schema: {
        n: S("n", "dynamics", "\u2014", 1, 30),
        p: S("p", "dynamics", "\u2014", 0, 1),
        k: S("k", "dynamics", "\u2014", 0, 30)
      },
      tick(state) {
        const n = Math.max(1, Math.round(P(state.params, "n", 10)));
        const k = Math.min(n, Math.max(0, Math.round(P(state.params, "k", 4))));
        const p = Math.min(1, Math.max(0, P(state.params, "p", 0.4)));
        let c = 1;
        for (let i = 1; i <= k; i += 1) c = c * (n - k + i) / i;
        state.p = c * p ** k * (1 - p) ** (n - k);
      },
      plot: (s) => s.p,
      rows: (s) => [["P(k)", s.p, ""]]
    });
  }
  if (has(topic, /指数/)) {
    return shell(spec, {
      equation: "f(t)= \u03BB e^{\u2212\u03BB t}",
      authority: "Ross, \u6307\u6570\u5206\u5E03",
      assumptions: "\u65E0\u8BB0\u5FC6",
      params: { lambda: 0.5 },
      schema: { lambda: S("\u03BB", "dynamics", "1/s", 0.05, 3) },
      tick(state) {
        const lam = P(state.params, "lambda", 0.5);
        state.f = lam * Math.exp(-lam * state.t);
      },
      plot: (s) => s.f,
      rows: (s) => [["f", s.f, ""]]
    });
  }
  return shell(spec, {
    equation: "\u03C6(x) = (1/\u221A(2\u03C0)\u03C3) exp(\u2212(x\u2212\u03BC)\xB2/(2\u03C3\xB2))",
    authority: "Ross, \u6B63\u6001\u5206\u5E03",
    assumptions: "\u4E00\u5143\u6B63\u6001",
    params: { mu: 0, sigma: 1 },
    schema: {
      mu: S("\u03BC", "dynamics", "\u2014", -5, 5),
      sigma: S("\u03C3", "dynamics", "\u2014", 0.2, 4)
    },
    tick(state) {
      const mu = P(state.params, "mu", 0);
      const sg = Math.max(0.05, P(state.params, "sigma", 1));
      const x = mu + 2 * sg * Math.sin(state.t);
      state.f = Math.exp(-0.5 * ((x - mu) / sg) ** 2) / (sg * Math.sqrt(2 * Math.PI));
      state.x = x;
    },
    plot: (s) => s.f,
    rows: (s) => [["\u03C6", s.f, ""], ["x", s.x, ""]]
  });
}
function derivativeLesson(spec, topic) {
  if (has(topic, /积分/) && !has(topic, /数值|微分/)) {
    return shell(spec, {
      equation: "\u222B x^n dx = x^{n+1}/(n+1)\uFF08n\u2260\u22121\uFF09",
      authority: "Stewart, Calculus, \u5E42\u51FD\u6570\u79EF\u5206",
      assumptions: "n\u2260\u22121",
      params: { n: 2, x: 2 },
      schema: {
        n: S("n", "dynamics", "\u2014", 0, 6),
        x: S("x", "dynamics", "\u2014", 0, 5)
      },
      tick(state) {
        const n = P(state.params, "n", 2);
        const x = P(state.params, "x", 2);
        state.y = x ** (n + 1) / (n + 1);
      },
      plot: (s) => s.y,
      rows: (s) => [["\u222B", s.y, ""]]
    });
  }
  if (has(topic, /泰勒/)) {
    return shell(spec, {
      equation: "e^x \u2248 \u03A3 x^k/k!\uFF08\u5230 n \u9879\uFF09",
      authority: "Stewart, Calculus, \u6CF0\u52D2\u7EA7\u6570",
      assumptions: "\u5728 0 \u5904\u5C55\u5F00",
      params: { x: 1, n: 6 },
      schema: {
        x: S("x", "dynamics", "\u2014", -2, 3),
        n: S("n", "dynamics", "\u2014", 1, 12)
      },
      tick(state) {
        const x = P(state.params, "x", 1);
        const n = Math.max(1, Math.round(P(state.params, "n", 6)));
        let s = 1;
        let term = 1;
        for (let k = 1; k <= n; k += 1) {
          term *= x / k;
          s += term;
        }
        state.y = s;
        state.ex = Math.exp(x);
      },
      plot: (s) => s.y,
      rows: (s) => [["series", s.y, ""], ["exp", s.ex, ""]]
    });
  }
  if (has(topic, /拉普拉斯/)) {
    return shell(spec, {
      equation: "L{e^{\u2212at}} = 1/(s+a)",
      authority: "Oppenheim, Signals and Systems, \u62C9\u666E\u62C9\u65AF\u53D8\u6362",
      assumptions: "\u56E0\u679C\u6307\u6570\u3001Re(s)>\u2212a \u4EE5\u5B9E s \u8868\u793A",
      params: { a: 1, s: 2 },
      schema: {
        a: S("a", "dynamics", "\u2014", 0, 5),
        s: S("s", "dynamics", "\u2014", 0.1, 10)
      },
      tick(state) {
        state.F = 1 / (P(state.params, "s", 2) + P(state.params, "a", 1));
      },
      plot: (s) => s.F,
      rows: (s) => [["F(s)", s.F, ""]]
    });
  }
  if (has(topic, /极限/)) {
    return shell(spec, {
      equation: "lim_{x\u21920} sin x / x = 1",
      authority: "Stewart, Calculus, \u6807\u51C6\u6781\u9650",
      assumptions: "x \u4EE5\u5F27\u5EA6\u3001\u907F\u5F00 0 \u7528\u5C0F\u91CF",
      params: { x: 0.1 },
      schema: { x: S("x", "dynamics", "rad", 1e-3, 1) },
      tick(state) {
        const x = Math.max(1e-4, P(state.params, "x", 0.1));
        state.y = Math.sin(x) / x;
      },
      plot: (s) => s.y,
      rows: (s) => [["sinx/x", s.y, ""]]
    });
  }
  return shell(spec, {
    equation: "d/dx x^n = n x^{n\u22121}",
    authority: "Stewart, Calculus, \u5E42\u51FD\u6570\u5BFC\u6570",
    assumptions: "\u5B9E\u5E42\u3001x>0 \u5F53 n \u975E\u6574\u6570",
    params: { n: 3, x: 2 },
    schema: {
      n: S("n", "dynamics", "\u2014", 1, 6),
      x: S("x", "dynamics", "\u2014", 0.1, 5)
    },
    tick(state) {
      const n = P(state.params, "n", 3);
      const x = Math.max(1e-3, P(state.params, "x", 2));
      state.y = n * x ** (n - 1);
    },
    plot: (s) => s.y,
    rows: (s) => [["dy/dx", s.y, ""]]
  });
}
function rankineSoil(spec) {
  return shell(spec, {
    equation: "K_a=(1\u2212sin\u03C6)/(1+sin\u03C6)\uFF0CP_a=\xBD \u03B3 H\xB2 K_a",
    authority: "Das, Principles of Geotechnical Engineering, Rankine \u4E3B\u52A8\u571F\u538B\u529B",
    assumptions: "\u65E0\u7C98\u6027\u3001\u5899\u80CC\u7AD6\u76F4\u5149\u6ED1\u3001\u6C34\u5E73\u586B\u571F",
    params: { phi: 30, gamma: 18, H: 4 },
    schema: {
      phi: S("\u03C6", "dynamics", "\xB0", 10, 45),
      gamma: S("\u03B3", "dynamics", "kN/m\xB3", 10, 22),
      H: S("H", "dynamics", "m", 1, 12)
    },
    tick(state) {
      const phi = P(state.params, "phi", 30) * Math.PI / 180;
      const Ka = (1 - Math.sin(phi)) / (1 + Math.sin(phi));
      const H = P(state.params, "H", 4);
      state.Pa = 0.5 * P(state.params, "gamma", 18) * H * H * Ka;
      state.Ka = Ka;
    },
    plot: (s) => s.Pa,
    rows: (s) => [["K_a", s.Ka, ""], ["P_a", s.Pa, "kN/m"]]
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
function shieldLaw(spec) {
  return shell(spec, {
    equation: "I = I\u2080 e^{\u2212\u03BC x}",
    authority: "Krane, Introductory Nuclear Physics, \u7A84\u675F\u6307\u6570\u8870\u51CF",
    assumptions: "\u7A84\u675F\u3001\u5355\u4E00 \u03BC\uFF1B\u516C\u5F00\u6559\u79D1\u4E66\u8870\u51CF\uFF0C\u975E\u5C4F\u853D\u8BBE\u8BA1",
    fidelity: "principle",
    params: { I0: 1, mu: 0.1, x: 5 },
    schema: {
      mu: S("\u03BC", "dynamics", "1/m", 0.01, 2),
      x: S("x", "dynamics", "m", 0, 20)
    },
    tick(state) {
      state.I = P(state.params, "I0", 1) * Math.exp(-P(state.params, "mu", 0.1) * P(state.params, "x", 5));
    },
    plot: (s) => s.I,
    rows: (s) => [["I/I\u2080", s.I, ""]]
  });
}
function larmor(spec) {
  return shell(spec, {
    equation: "\u03C9 = \u03B3 B",
    authority: "Levitt, Spin Dynamics, \u62C9\u83AB\u5C14\u8FDB\u52A8\uFF08\u516C\u5F00\u5B9A\u4E49\uFF09",
    assumptions: "\u4EC5\u8FDB\u52A8\u89D2\u9891\u7387\uFF0C\u65E0\u8109\u51B2\u5E8F\u5217\u3001\u65E0\u4E34\u5E8A\u65B9\u6848",
    fidelity: "principle",
    params: { gamma: 2675e5, B: 1 },
    schema: {
      B: S("B", "dynamics", "T", 0.1, 7)
    },
    tick(state) {
      state.w = P(state.params, "gamma", 2675e5) * P(state.params, "B", 1);
    },
    plot: (s) => s.w / 1e6,
    rows: (s) => [["\u03C9/2\u03C0", s.w / (2 * Math.PI) / 1e6, "MHz"]]
  });
}
function criticality(spec) {
  return shell(spec, {
    equation: "\u03C1 = (k \u2212 1)/k\uFF0Cn(t)=n\u2080 exp(\u03C1 t / \u039B)\uFF08\u70B9\u5806\u65E0\u7F13\u53D1\uFF09",
    authority: "Lamarsh & Baratta, Introduction to Nuclear Engineering, \u70B9\u5806\u53CD\u5E94\u6027\u5B9A\u4E49",
    assumptions: "\u65E0\u7F13\u53D1\u4E2D\u5B50\u3001\u5E38 \u039B\uFF1B\u516C\u5F00\u6559\u79D1\u4E66\u5B9A\u4E49\uFF0C\u975E\u5806\u82AF\u8BBE\u8BA1",
    fidelity: "principle",
    params: { k: 1.001, Lambda: 1e-4, n0: 1 },
    schema: {
      k: S("k_eff", "dynamics", "\u2014", 0.9, 1.05),
      Lambda: S("\u039B", "dynamics", "s", 1e-5, 0.01)
    },
    tick(state) {
      const k = Math.max(0.5, P(state.params, "k", 1.001));
      const Lam = Math.max(1e-6, P(state.params, "Lambda", 1e-4));
      state.rho = (k - 1) / k;
      const expo = state.rho / Lam * Math.min(state.t, 0.05);
      state.n = P(state.params, "n0", 1) * Math.exp(Math.max(-20, Math.min(20, expo)));
    },
    plot: (s) => s.rho,
    rows: (s) => [["\u03C1", s.rho, ""], ["n", s.n, ""]]
  });
}
function hhBuffer(spec) {
  return shell(spec, {
    equation: "pH = pKa + log10([A\u207B]/[HA])",
    authority: "Harris, Quantitative Chemical Analysis, Henderson\u2013Hasselbalch",
    assumptions: "\u7406\u60F3\u7F13\u51B2\u3001\u6D53\u5EA6\u6BD4\u5373\u6D3B\u5EA6\u6BD4",
    params: { pKa: 4.76, ratio: 1 },
    schema: {
      pKa: S("pKa", "dynamics", "\u2014", 2, 12),
      ratio: S("[A\u207B]/[HA]", "dynamics", "\u2014", 0.05, 20)
    },
    tick(state) {
      state.pH = P(state.params, "pKa", 4.76) + Math.log10(Math.max(1e-4, P(state.params, "ratio", 1)));
    },
    plot: (s) => s.pH,
    rows: (s) => [["pH", s.pH, ""]]
  });
}
function beerLambert(spec) {
  return shell(spec, {
    equation: "A = \u03B5 c l",
    authority: "Harris, Quantitative Chemical Analysis, Beer\u2013Lambert",
    assumptions: "\u7A00\u6EB6\u6DB2\u3001\u5355\u8272\u5149",
    params: { eps: 100, c: 0.01, l: 1 },
    schema: {
      eps: S("\u03B5", "dynamics", "L/mol\xB7cm", 1, 1e4),
      c: S("c", "dynamics", "mol/L", 0, 0.1),
      l: S("l", "dynamics", "cm", 0.1, 5)
    },
    tick(state) {
      state.A = P(state.params, "eps", 100) * P(state.params, "c", 0.01) * P(state.params, "l", 1);
    },
    plot: (s) => s.A,
    rows: (s) => [["A", s.A, ""]]
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
      const t2 = state.t;
      if (z < 1) {
        const wd = wn * Math.sqrt(1 - z * z);
        state.y = 1 - Math.exp(-z * wn * t2) * (Math.cos(wd * t2) + z * wn / wd * Math.sin(wd * t2));
      } else {
        state.y = 1 - Math.exp(-wn * t2) * (1 + wn * t2);
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
function grashof(spec) {
  return shell(spec, {
    equation: "Grashof\uFF1As+l \u2264 p+q \u5219\u53EF\u6574\u5468\u8F6C\u52A8",
    authority: "Norton, Design of Machinery, Grashof \u51C6\u5219",
    assumptions: "\u5E73\u9762\u56DB\u6746\u3001\u6746\u957F\u4E3A\u6B63",
    params: { s: 1, l: 4, p: 3, q: 3 },
    schema: {
      s: S("\u6700\u77ED", "dynamics", "\u2014", 0.2, 5),
      l: S("\u6700\u957F", "dynamics", "\u2014", 1, 8),
      p: S("\u5176\u4F591", "dynamics", "\u2014", 0.5, 8),
      q: S("\u5176\u4F592", "dynamics", "\u2014", 0.5, 8)
    },
    tick(state) {
      const lens2 = [P(state.params, "s", 1), P(state.params, "l", 4), P(state.params, "p", 3), P(state.params, "q", 3)].sort((a, b) => a - b);
      state.g = lens2[0] + lens2[3] <= lens2[1] + lens2[2] ? 1 : 0;
    },
    plot: (s) => s.g,
    rows: (s) => [["Grashof", s.g, ""]]
  });
}
function camHarmonic(spec) {
  return shell(spec, {
    equation: "s = (h/2) (1 \u2212 cos \u03C9 t)\uFF08\u7B80\u8C10\u51F8\u8F6E\u5347\u7A0B\uFF09",
    authority: "Norton, Design of Machinery, \u7B80\u8C10\u8FD0\u52A8\u89C4\u5F8B",
    assumptions: "\u5347\u7A0B\u6BB5\u3001\u65E0\u51B2\u51FB\u4FEE\u6B63",
    params: { h: 20, w: 2 },
    schema: {
      h: S("h", "dynamics", "mm", 1, 80),
      w: S("\u03C9", "dynamics", "rad/s", 0.2, 8)
    },
    tick(state) {
      state.s = 0.5 * P(state.params, "h", 20) * (1 - Math.cos(P(state.params, "w", 2) * state.t));
    },
    plot: (s) => s.s,
    rows: (s) => [["s", s.s, "mm"]]
  });
}
function leverRule(spec) {
  return shell(spec, {
    equation: "\u56FA\u76F8\u5206\u6570 f_s = (c_L \u2212 c\u2080)/(c_L \u2212 c_S)",
    authority: "Callister, Materials Science and Engineering, \u6760\u6746\u5B9A\u5F8B",
    assumptions: "\u4E8C\u5143\u5E73\u8861\u3001\u6760\u6746\u5728\u540C\u4E00\u6E29\u5EA6\u7ED3\u7EBF",
    params: { cL: 0.6, cS: 0.1, c0: 0.3 },
    schema: {
      cL: S("c_L", "dynamics", "\u2014", 0, 1),
      cS: S("c_S", "dynamics", "\u2014", 0, 1),
      c0: S("c\u2080", "dynamics", "\u2014", 0, 1)
    },
    tick(state) {
      const cL = P(state.params, "cL", 0.6);
      const cS = P(state.params, "cS", 0.1);
      const c0 = P(state.params, "c0", 0.3);
      const den = cL - cS;
      state.fs = Math.abs(den) < 1e-9 ? 0 : Math.min(1, Math.max(0, (cL - c0) / den));
    },
    plot: (s) => s.fs,
    rows: (s) => [["f_s", s.fs, ""]]
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
      f: S("f", "dynamics", "Hz", 50, 2e3),
      vo: S("v_o", "dynamics", "m/s", -50, 50),
      vs: S("v_s", "dynamics", "m/s", -50, 50)
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
      let E = 0;
      for (let i = 0; i < n; i += 1) E += spins[i] * spins[(i + 1) % n];
      state.E = -P(state.params, "J", 1) * E;
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
      v: S("v", "dynamics", "m/s", 0, 200),
      S: S("S", "dynamics", "m\xB2", 1, 80),
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
      v: S("v", "dynamics", "m/s", 0, 10),
      D: S("D", "dynamics", "m", 1e-3, 1),
      mu: S("\u03BC", "dynamics", "Pa\xB7s", 1e-5, 0.1)
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
      P: S("P", "dynamics", "Pa", 0, 3e5),
      v: S("v", "dynamics", "m/s", 0, 15),
      h: S("h", "dynamics", "m", 0, 20)
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
      const E = Math.min(V - 0.01, P(state.params, "E", 2));
      const L = P(state.params, "L", 0.5) * 1e-9;
      const kappa = Math.sqrt(2 * m * (V - E) * eV) / hbar;
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
function transformer(spec) {
  return shell(spec, {
    equation: "V\u2082/V\u2081 = N\u2082/N\u2081\uFF08\u7406\u60F3\u53D8\u538B\u5668\uFF09",
    authority: "Nilsson & Riedel, \u7406\u60F3\u53D8\u538B\u5668",
    assumptions: "\u5168\u8026\u5408\u3001\u65E0\u635F\u8017",
    params: { V1: 220, N1: 100, N2: 20 },
    schema: {
      V1: S("V\u2081", "dynamics", "V", 1, 500),
      N1: S("N\u2081", "dynamics", "\u2014", 1, 500),
      N2: S("N\u2082", "dynamics", "\u2014", 1, 500)
    },
    tick(state) {
      state.V2 = P(state.params, "V1", 220) * P(state.params, "N2", 20) / Math.max(1, P(state.params, "N1", 100));
    },
    plot: (s) => s.V2,
    rows: (s) => [["V\u2082", s.V2, "V"]]
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
function ampere(spec) {
  return shell(spec, {
    equation: "F = I L B sin\u03B8",
    authority: "Halliday, \u5B89\u57F9\u529B",
    assumptions: "\u76F4\u5BFC\u7EBF\u3001\u5747\u5300\u573A",
    params: { I: 2, L: 0.3, B: 0.4, theta: 90 },
    schema: {
      I: S("I", "dynamics", "A", 0, 20),
      L: S("L", "dynamics", "m", 0.05, 2),
      B: S("B", "dynamics", "T", 0, 2),
      theta: S("\u03B8", "dynamics", "\xB0", 0, 180)
    },
    tick(state) {
      state.F = P(state.params, "I", 2) * P(state.params, "L", 0.3) * P(state.params, "B", 0.4) * Math.sin(P(state.params, "theta", 90) * Math.PI / 180);
    },
    plot: (s) => s.F,
    rows: (s) => [["F", s.F, "N"]]
  });
}
function beats(spec) {
  return shell(spec, {
    equation: "y = 2 cos(\u0394\u03C9 t / 2) sin(\u03C9 t)",
    authority: "French, Vibrations and Waves, \u62CD",
    assumptions: "\u4E24\u7B49\u5E45\u8FD1\u9891\u7B80\u8C10\u53E0\u52A0",
    params: { w1: 8, w2: 9 },
    schema: {
      w1: S("\u03C9\u2081", "dynamics", "rad/s", 1, 20),
      w2: S("\u03C9\u2082", "dynamics", "rad/s", 1, 20)
    },
    tick(state) {
      const w1 = P(state.params, "w1", 8);
      const w2 = P(state.params, "w2", 9);
      const dw = w2 - w1;
      const w = 0.5 * (w1 + w2);
      state.y = 2 * Math.cos(0.5 * dw * state.t) * Math.sin(w * state.t);
    },
    plot: (s) => s.y,
    rows: (s) => [["y", s.y, ""]]
  });
}
function soundSpeed(spec) {
  return shell(spec, {
    equation: "v \u2248 331 \u221A(T/273) m/s\uFF08\u5E72\u71E5\u7A7A\u6C14\u8FD1\u4F3C\uFF09",
    authority: "Kinsler, Fundamentals of Acoustics, \u58F0\u901F\u4E0E\u6E29\u5EA6",
    assumptions: "\u7406\u60F3\u6C14\u4F53\u7A7A\u6C14\u30010 \xB0C \u4E3A 331 m/s \u7684\u5E38\u7528\u8FD1\u4F3C",
    params: { T: 293 },
    schema: { T: S("T", "dynamics", "K", 230, 350) },
    tick(state) {
      state.v = 331 * Math.sqrt(Math.max(1, P(state.params, "T", 293)) / 273.15);
    },
    plot: (s) => s.v,
    rows: (s) => [["v", s.v, "m/s"]]
  });
}
function sabine(spec) {
  return shell(spec, {
    equation: "T60 = 0.161 V / A",
    authority: "Kuttruff, Room Acoustics, Sabine \u516C\u5F0F",
    assumptions: "\u6269\u6563\u573A\u3001A \u4E3A\u603B\u5438\u58F0\u91CF m\xB2",
    params: { V: 200, A: 20 },
    schema: {
      V: S("V", "dynamics", "m\xB3", 10, 2e3),
      A: S("A", "dynamics", "m\xB2", 1, 200)
    },
    tick(state) {
      state.T60 = 0.161 * P(state.params, "V", 200) / Math.max(0.1, P(state.params, "A", 20));
    },
    plot: (s) => s.T60,
    rows: (s) => [["T60", s.T60, "s"]]
  });
}
function doubleSlit(spec) {
  return shell(spec, {
    equation: "\u0394y = \u03BB L / d",
    authority: "Hecht, Optics, \u6768\u6C0F\u53CC\u7F1D\u6761\u7EB9\u95F4\u8DDD",
    assumptions: "\u8FDC\u573A\u3001\u5C0F\u89D2",
    params: { lambda: 55e-8, L: 1, d: 2e-4 },
    schema: {
      L: S("L", "dynamics", "m", 0.2, 3),
      d: S("d", "dynamics", "m", 5e-5, 1e-3)
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
function editDistance(spec) {
  return shell(spec, {
    equation: "Levenshtein\uFF1A\u63D2\u5165/\u5220\u9664/\u66FF\u6362\u4EE3\u4EF7 1",
    authority: "CLRS, \u7F16\u8F91\u8DDD\u79BB",
    assumptions: "\u56FA\u5B9A\u4E32 kitten \u2192 sitting \u7684\u957F\u5EA6\u6F14\u793A\u6539\u4E3A\u957F\u5EA6\u5DEE\u4E0A\u754C\uFF1B\u7528\u4E24\u77ED\u4E32 a,b \u7684\u957F\u5EA6\u53C2\u6570\u505A\u7CBE\u786E DP",
    params: { la: 4, lb: 6 },
    schema: {
      la: S("|a|", "dynamics", "\u2014", 0, 8),
      lb: S("|b|", "dynamics", "\u2014", 0, 8)
    },
    tick(state) {
      const la = Math.max(0, Math.round(P(state.params, "la", 4)));
      const lb = Math.max(0, Math.round(P(state.params, "lb", 6)));
      const dp = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0));
      for (let i = 0; i <= la; i += 1) dp[i][0] = i;
      for (let j = 0; j <= lb; j += 1) dp[0][j] = j;
      for (let i = 1; i <= la; i += 1) {
        for (let j = 1; j <= lb; j += 1) {
          const cost = i === j ? 0 : 1;
          dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
      }
      state.d = dp[la][lb];
    },
    plot: (s) => s.d,
    rows: (s) => [["d", s.d, ""]]
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
function blackbodyPeak(spec) {
  return shell(spec, {
    equation: "\u03BB_max T = 2.897\xD710\u207B\xB3 m\xB7K\uFF08\u7EF4\u6069\u4F4D\u79FB\uFF09",
    authority: "Rybicki & Lightman, \u7EF4\u6069\u4F4D\u79FB\u5B9A\u5F8B",
    assumptions: "\u9ED1\u4F53\u8C31\u5CF0",
    params: { T: 5800 },
    schema: { T: S("T", "dynamics", "K", 300, 1e4) },
    tick(state) {
      state.lam = 2897e-6 / Math.max(1, P(state.params, "T", 5800));
    },
    plot: (s) => s.lam * 1e9,
    rows: (s) => [["\u03BB_max", s.lam * 1e9, "nm"]]
  });
}
function hubble(spec) {
  return shell(spec, {
    equation: "v = H\u2080 d\uFF0Cz \u2248 v/c\uFF08\u4F4E\u7EA2\u79FB\uFF09",
    authority: "Ryden, Introduction to Cosmology, \u54C8\u52C3\u2013\u52D2\u6885\u7279\u5B9A\u5F8B",
    assumptions: "\u4F4E\u7EA2\u79FB\u3001H\u2080=70 km/s/Mpc",
    fidelity: "principle",
    params: { d: 100 },
    schema: { d: S("d", "dynamics", "Mpc", 1, 1e3) },
    tick(state) {
      const H0 = 70;
      state.v = H0 * P(state.params, "d", 100);
      state.z = state.v * 1e3 / 299792458;
    },
    plot: (s) => s.v,
    rows: (s) => [["v", s.v, "km/s"], ["z", s.z, ""]]
  });
}
function prisoner(spec) {
  return shell(spec, {
    equation: "\u56DA\u5F92\u56F0\u5883\uFF1A\u53CC\u65B9\u80CC\u53DB\u662F\u7EAF\u7B56\u7565\u7EB3\u4EC0\uFF08\u6536\u76CA T>R>P>S\uFF09",
    authority: "Osborne, An Introduction to Game Theory",
    assumptions: "\u6807\u51C6\u6392\u5E8F T>R>P>S",
    params: { T: 5, R: 3, P: 1, S: 0 },
    schema: {
      T: S("T", "dynamics", "\u2014", 0, 10),
      R: S("R", "dynamics", "\u2014", 0, 10),
      P: S("P", "dynamics", "\u2014", 0, 10),
      S: S("S", "dynamics", "\u2014", 0, 10)
    },
    tick(state) {
      state.nash = P(state.params, "P", 1);
    },
    plot: (s) => s.nash,
    rows: (s) => [["u(\u80CC\u53DB,\u80CC\u53DB)", s.nash, ""]]
  });
}
function draftRatio(spec) {
  return shell(spec, {
    equation: "\u7275\u4F38\u6BD4 E = v\u2082 / v\u2081",
    authority: "Lawrence, Fundamentals of Spun Yarn Technology, \u7275\u4F38\u5B9A\u4E49",
    assumptions: "\u4E24\u7F57\u62C9\u7EBF\u901F\u5EA6\u3001\u65E0\u6ED1\u6E9C",
    params: { v1: 1, v2: 8 },
    schema: {
      v1: S("v\u2081", "dynamics", "m/min", 0.1, 20),
      v2: S("v\u2082", "dynamics", "m/min", 0.1, 80)
    },
    tick(state) {
      state.E = P(state.params, "v2", 8) / Math.max(1e-3, P(state.params, "v1", 1));
    },
    plot: (s) => s.E,
    rows: (s) => [["E", s.E, ""]]
  });
}
function irrigation(spec) {
  return shell(spec, {
    equation: "Q = A d / t",
    authority: "\u704C\u6E89\u6C34\u91CF\u5E73\u8861\uFF08\u4F53\u79EF = \u9762\u79EF \xD7 \u6C34\u6DF1\uFF09",
    assumptions: "\u5747\u5300\u704C\u6C34\u6DF1\u3001\u65E0\u635F\u5931\uFF1B\u4E0D\u662F\u6E20\u9053\u8BBE\u8BA1\u5DE5\u5177",
    params: { A: 1e3, d: 0.03, duration: 3600 },
    schema: {
      A: S("\u9762\u79EF A", "dynamics", "m\xB2", 10, 1e5),
      d: S("\u6C34\u6DF1 d", "dynamics", "m", 1e-3, 0.2),
      duration: S("\u65F6\u957F t", "dynamics", "s", 60, 86400)
    },
    tick(state) {
      const duration = Math.max(1, P(state.params, "duration", 3600));
      state.Q = P(state.params, "A", 1e3) * P(state.params, "d", 0.03) / duration;
    },
    plot: (s) => s.Q,
    rows: (s) => [["Q", s.Q, "m\xB3/s"]]
  });
}
function isolation(spec) {
  return shell(spec, {
    equation: "T_r = \u221A( (1+(2\u03B6r)\xB2) / ((1\u2212r\xB2)\xB2+(2\u03B6r)\xB2) )",
    authority: "Inman, Engineering Vibration, \u529B\u4F20\u9012\u7387",
    assumptions: "\u5355\u81EA\u7531\u5EA6\u3001\u7C98\u6EDE\u963B\u5C3C\u3001\u57FA\u5EA7\u56FA\u5B9A",
    params: { r: 1.5, zeta: 0.1 },
    schema: {
      r: S("\u03C9/\u03C9\u2099", "dynamics", "\u2014", 0, 4),
      zeta: S("\u03B6", "dynamics", "\u2014", 0.01, 0.5)
    },
    tick(state) {
      const r = P(state.params, "r", 1.5);
      const z = P(state.params, "zeta", 0.1);
      const num = 1 + (2 * z * r) ** 2;
      const den = (1 - r * r) ** 2 + (2 * z * r) ** 2;
      state.Tr = Math.sqrt(num / Math.max(1e-9, den));
    },
    plot: (s) => s.Tr,
    rows: (s) => [["T_r", s.Tr, ""]]
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
function arrhenius(spec) {
  return shell(spec, {
    equation: "k = A exp(\u2212E_a / R T)",
    authority: "Fogler, CRE, Arrhenius",
    assumptions: "R=8.314 J/mol\xB7K\uFF1B\u4E0D\u662F\u53CD\u5E94\u5668\u8BBE\u8BA1",
    params: { A: 1e6, Ea: 5e4, T: 350 },
    schema: {
      Ea: S("E_a", "dynamics", "J/mol", 1e3, 12e4),
      T: S("T", "dynamics", "K", 250, 800)
    },
    tick(state) {
      const R = 8.314;
      state.k = P(state.params, "A", 1e6) * Math.exp(-P(state.params, "Ea", 5e4) / (R * Math.max(1, P(state.params, "T", 350))));
    },
    plot: (s) => s.k,
    rows: (s) => [["k", s.k, ""]]
  });
}
function nernst(spec) {
  return shell(spec, {
    equation: "E = E\u2070 \u2212 (RT/nF) ln Q",
    authority: "Bard & Faulkner, Electrochemical Methods, \u80FD\u65AF\u7279\u65B9\u7A0B",
    assumptions: "\u6D3B\u5EA6\u4EE5\u6D53\u5EA6\u4EE3\u66FF\u3002\u7B49\u4EF7\u6307\u6570 e^{nFE/RT} \u6309\u53CC\u7CBE\u5EA6\u8BA1\u7B97\uFF0C\u4E0D\u5728 \xB140 \u5904\u622A\u65AD\uFF1Bln \u7684\u81EA\u53D8\u91CF\u4F4E\u4E8E 10\u207B\u2076 \u65F6\u6309 10\u207B\u2076",
    params: { E0: 1, n: 1, Q: 0.1, T: 298 },
    schema: {
      E0: S("E\u2070", "dynamics", "V", -2, 2),
      n: S("n", "dynamics", "\u2014", 1, 4),
      Q: S("Q", "dynamics", "\u2014", 0.01, 10),
      T: S("T", "dynamics", "K", 273, 373)
    },
    tick(state) {
      const R = 8.314;
      const F = 96485;
      const n = Math.max(1, P(state.params, "n", 1));
      state.E = P(state.params, "E0", 1) - R * P(state.params, "T", 298) / (n * F) * Math.log(Math.max(1e-6, P(state.params, "Q", 0.1)));
    },
    plot: (s) => s.E,
    rows: (s) => [["E", s.E, "V"]]
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
  const t2 = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t2 - 1.453152027) * t2 + 1.421413741) * t2 - 0.284496736) * t2 + 0.254829592) * t2 * Math.exp(-a * a);
  return sign * y;
}
function forwardKinematics(spec) {
  return shell(spec, {
    equation: "\u5E73\u9762 2R\uFF1Ax = l\u2081 cos\u03B8\u2081 + l\u2082 cos(\u03B8\u2081+\u03B8\u2082)",
    authority: "Craig, Introduction to Robotics, \u5E73\u9762\u53CC\u8FDE\u6746\u6B63\u8FD0\u52A8\u5B66",
    assumptions: "\u5E73\u9762\u3001\u4E24\u8F6C\u52A8\u5173\u8282",
    params: { l1: 1, l2: 0.8, th1: 30, th2: 20 },
    schema: {
      l1: S("l\u2081", "dynamics", "m", 0.2, 2),
      l2: S("l\u2082", "dynamics", "m", 0.2, 2),
      th1: S("\u03B8\u2081", "dynamics", "\xB0", -180, 180),
      th2: S("\u03B8\u2082", "dynamics", "\xB0", -180, 180)
    },
    tick(state) {
      const th1 = P(state.params, "th1", 30) * Math.PI / 180;
      const th2 = P(state.params, "th2", 20) * Math.PI / 180;
      state.x = P(state.params, "l1", 1) * Math.cos(th1) + P(state.params, "l2", 0.8) * Math.cos(th1 + th2);
      state.y = P(state.params, "l1", 1) * Math.sin(th1) + P(state.params, "l2", 0.8) * Math.sin(th1 + th2);
    },
    plot: (s) => s.x,
    rows: (s) => [["x", s.x, "m"], ["y", s.y, "m"]]
  });
}
function reliability(spec) {
  return shell(spec, {
    equation: "R(t) = exp(\u2212\u03BB t)",
    authority: "Ebeling, An Introduction to Reliability and Maintainability Engineering",
    assumptions: "\u5E38\u6570\u5931\u6548\u7387",
    params: { lambda: 0.01 },
    schema: { lambda: S("\u03BB", "dynamics", "1/h", 1e-4, 0.2) },
    tick(state) {
      state.R = Math.exp(-P(state.params, "lambda", 0.01) * state.t);
    },
    plot: (s) => s.R,
    rows: (s) => [["R", s.R, ""]]
  });
}
function littleLaw(spec) {
  return shell(spec, {
    equation: "L = \u03BB W",
    authority: "Little, Oper. Res. 9 (1961)",
    assumptions: "\u7A33\u6001\u3001\u5B88\u6052\u6D41",
    params: { lambda: 2, W: 3 },
    schema: {
      lambda: S("\u03BB", "dynamics", "1/s", 0, 20),
      W: S("W", "dynamics", "s", 0, 30)
    },
    tick(state) {
      state.L = P(state.params, "lambda", 2) * P(state.params, "W", 3);
    },
    plot: (s) => s.L,
    rows: (s) => [["L", s.L, ""]]
  });
}
function dipole(spec) {
  return shell(spec, {
    equation: "\u8F74\u4E0A E \u2248 (1/4\u03C0\u03B5\u2080) 2 p / r\xB3",
    authority: "Griffiths, Ch. 3 \u7535\u5076\u6781\u5B50\u8FDC\u573A\uFF08\u8F74\u4E0A\uFF09",
    assumptions: "r \u8FDC\u5927\u4E8E\u5076\u6781\u5C3A\u5EA6",
    params: { p: 1e-9, r: 0.2 },
    schema: {
      p: S("p", "dynamics", "C\xB7m", 1e-12, 1e-6),
      r: S("r", "dynamics", "m", 0.05, 2)
    },
    tick(state) {
      const k = 89875517923e-1;
      const r = Math.max(0.02, P(state.params, "r", 0.2));
      state.E = k * 2 * P(state.params, "p", 1e-9) / r ** 3;
    },
    plot: (s) => s.E,
    rows: (s) => [["E", s.E, "V/m"]]
  });
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
function mutual(spec) {
  return shell(spec, {
    equation: "\u03B5\u2082 = \u2212 M dI\u2081/dt\uFF0C\u53D6 I\u2081 = I sin(\u03C9t) \u5219\u5E45\u503C M I \u03C9",
    authority: "Nilsson, \u4E92\u611F",
    assumptions: "\u5E38\u4E92\u611F M",
    params: { M: 0.01, I: 2, w: 50 },
    schema: {
      M: S("M", "dynamics", "H", 1e-4, 0.2),
      I: S("I", "dynamics", "A", 0, 10),
      w: S("\u03C9", "dynamics", "rad/s", 0, 400)
    },
    tick(state) {
      state.eps = P(state.params, "M", 0.01) * P(state.params, "I", 2) * P(state.params, "w", 50) * Math.cos(P(state.params, "w", 50) * state.t);
    },
    plot: (s) => s.eps,
    rows: (s) => [["\u03B5\u2082", s.eps, "V"]]
  });
}
function selfL(spec) {
  return shell(spec, {
    equation: "i(t) = (V/R) (1 \u2212 e^{\u2212(R/L) t})",
    authority: "Nilsson, \u4E00\u9636 RL",
    assumptions: "\u76F4\u6D41\u9636\u8DC3\u3001\u96F6\u521D\u59CB\u3002t\u2080 \u662F\u53EF\u9009\u89C2\u5BDF\u65F6\u523B\uFF0C\u9ED8\u8BA4\u4E00\u4E2A\u65F6\u95F4\u5E38\u6570 L/R",
    params: { V: 10, R: 5, L: 0.2, t0: 0.04 },
    schema: {
      V: S("V", "dynamics", "V", 0, 48),
      R: S("R", "dynamics", "\u03A9", 0.2, 50),
      L: S("L", "dynamics", "H", 0.01, 2),
      t0: S("\u89C2\u5BDF\u65F6\u523B t\u2080", "initial", "s", 0, 60)
    },
    tick(state) {
      const R = Math.max(1e-3, P(state.params, "R", 5));
      const L = Math.max(1e-4, P(state.params, "L", 0.2));
      state.i = P(state.params, "V", 10) / R * (1 - Math.exp(-(R / L) * state.t));
    },
    plot: (s) => s.i,
    rows: (s) => [["i", s.i, "A"]]
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
function rolling(spec) {
  return shell(spec, {
    equation: "a = g sin\u03B8 / (1 + I /(m R\xB2))",
    authority: "Hibbeler, Dynamics, \u6CBF\u659C\u9762\u7EAF\u6EDA\u52A8",
    assumptions: "\u7EAF\u6EDA\u52A8\u3001\u65E0\u6ED1\uFF1BI=k m R\xB2\uFF0Ck \u53EF\u8C03\uFF08\u5706\u67F1 0.5\uFF0C\u7403 0.4\uFF09",
    params: { theta: 20, k: 0.5 },
    schema: {
      theta: S("\u03B8", "dynamics", "\xB0", 0, 40),
      k: S("I/(mR\xB2)", "dynamics", "\u2014", 0, 1)
    },
    tick(state) {
      const th = P(state.params, "theta", 20) * Math.PI / 180;
      state.a = 9.81 * Math.sin(th) / (1 + P(state.params, "k", 0.5));
    },
    plot: (s) => s.a,
    rows: (s) => [["a", s.a, "m/s\xB2"]]
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
function fftBin(spec) {
  return shell(spec, {
    equation: "DFT \u9891\u7387\u5206\u8FA8\u7387 \u0394f = f_s / N",
    authority: "Oppenheim & Schafer, DFT",
    assumptions: "\u5747\u5300\u91C7\u6837",
    params: { fs: 1e3, N: 256 },
    schema: {
      fs: S("f_s", "dynamics", "Hz", 10, 1e5),
      N: S("N", "dynamics", "\u2014", 8, 4096)
    },
    tick(state) {
      state.df = P(state.params, "fs", 1e3) / Math.max(1, P(state.params, "N", 256));
    },
    plot: (s) => s.df,
    rows: (s) => [["\u0394f", s.df, "Hz"]]
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
function cmosDelay(spec) {
  return shell(spec, {
    equation: "t_p \u2248 0.69 R_eq C_L",
    authority: "Rabaey, Digital Integrated Circuits, RC \u5EF6\u8FDF",
    assumptions: "\u4E00\u9636 RC\u3001\u7B49\u6548\u7535\u963B\u7ED9\u5B9A",
    params: { R: 1e4, C: 1e-14 },
    schema: {
      R: S("R_eq", "dynamics", "\u03A9", 100, 1e5),
      C: S("C_L", "dynamics", "F", 1e-15, 1e-12)
    },
    tick(state) {
      state.tp = 0.69 * P(state.params, "R", 1e4) * P(state.params, "C", 1e-14);
    },
    plot: (s) => s.tp * 1e12,
    rows: (s) => [["t_p", s.tp * 1e12, "ps"]]
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
      r2: S("r\u2082", "dynamics", "m", 7e6, 5e7)
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
function respiratory(spec) {
  return shell(spec, {
    equation: "\u80BA\u987A\u5E94\u6027 C = \u0394V / \u0394P",
    authority: "West, Respiratory Physiology, \u987A\u5E94\u6027\u5B9A\u4E49",
    assumptions: "\u51C6\u9759\u6001\u3001\u5355\u4E00\u987A\u5E94\u6027",
    fidelity: "principle",
    params: { dV: 0.5, dP: 5 },
    schema: {
      dV: S("\u0394V", "dynamics", "L", 0.05, 2),
      dP: S("\u0394P", "dynamics", "cmH2O", 0.5, 30)
    },
    tick(state) {
      state.C = P(state.params, "dV", 0.5) / Math.max(0.1, P(state.params, "dP", 5));
    },
    plot: (s) => s.C,
    rows: (s) => [["C", s.C, "L/cmH2O"]]
  });
}
function ecgPeriod(spec) {
  return shell(spec, {
    equation: "\u5FC3\u7387 HR = 60 / RR",
    authority: "Guyton & Hall, \u5FC3\u52A8\u5468\u671F\u4E0E\u5FC3\u7387\u5B9A\u4E49",
    assumptions: "\u53EA\u7531 RR \u95F4\u671F\u5B9A\u4E49\u5FC3\u7387\uFF0C\u4E0D\u5408\u6210\u4E34\u5E8A\u8BCA\u65AD\u6CE2\u5F62",
    fidelity: "principle",
    params: { RR: 0.8 },
    schema: { RR: S("RR", "dynamics", "s", 0.3, 2) },
    tick(state) {
      state.HR = 60 / Math.max(0.2, P(state.params, "RR", 0.8));
    },
    plot: (s) => s.HR,
    rows: (s) => [["HR", s.HR, "1/min"]]
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
function radiationBalance(spec) {
  return shell(spec, {
    equation: "\u03C3 T\u2074 = (S/4) (1 \u2212 A)\uFF08\u884C\u661F\u6709\u6548\u6E29\u5EA6\uFF0C\u65E0\u5927\u6C14\uFF09",
    authority: "Pierrehumbert, Principles of Planetary Climate, \u80FD\u91CF\u5E73\u8861\u96F6\u7EF4",
    assumptions: "\u5168\u7403\u5E74\u5E73\u5747\u3001\u53CD\u7167\u7387 A\u3001\u65E0\u5927\u6C14\u6E29\u5BA4\u9879\uFF1B\u6E29\u5BA4\u6761\u76EE\u5728\u6B64\u5F0F\u4E0A\u4E58 1/(1\u2212\u03B5/2) \u7684\u5355\u5C42\u8FD1\u4F3C\u9700\u53E6\u5F00\u53C2\u6570",
    fidelity: "principle",
    params: { S: 1361, A: 0.3 },
    schema: {
      S: S("S", "dynamics", "W/m\xB2", 100, 2e3),
      A: S("A", "dynamics", "\u2014", 0, 0.8)
    },
    tick(state) {
      const sigma = 5670374419e-17;
      const rhs = P(state.params, "S", 1361) / 4 * (1 - P(state.params, "A", 0.3));
      state.T = (Math.max(0, rhs) / sigma) ** 0.25;
    },
    plot: (s) => s.T,
    rows: (s) => [["T_e", s.T, "K"]]
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
function fiberNA(spec) {
  return shell(spec, {
    equation: "NA = \u221A(n\u2081\xB2 \u2212 n\u2082\xB2)\uFF0C\u03B8_c = arcsin(n\u2082/n\u2081)",
    authority: "Hecht, Optics, \u9636\u8DC3\u5149\u7EA4\u6570\u503C\u5B54\u5F84",
    assumptions: "\u5B50\u5348\u5149\u7EBF\u3001n\u2081>n\u2082",
    params: { n1: 1.48, n2: 1.46 },
    schema: {
      n1: S("n\u2081", "dynamics", "\u2014", 1.3, 1.7),
      n2: S("n\u2082", "dynamics", "\u2014", 1.3, 1.7)
    },
    tick(state) {
      const n1 = P(state.params, "n1", 1.48);
      const n2 = Math.min(n1 - 1e-3, P(state.params, "n2", 1.46));
      state.NA = Math.sqrt(Math.max(0, n1 * n1 - n2 * n2));
    },
    plot: (s) => s.NA,
    rows: (s) => [["NA", s.NA, ""]]
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
function equivalence(spec) {
  return shell(spec, {
    equation: "\u03C6 = (F/A) / (F/A)_st",
    authority: "Turns, An Introduction to Combustion, \u5F53\u91CF\u6BD4\u5B9A\u4E49",
    assumptions: "\u53EA\u8BA1\u7B97\u5F53\u91CF\u6BD4\uFF0C\u4E0D\u8BA1\u7B97\u706B\u7130\u6E29\u5EA6\u6216\u7206\u8F70",
    fidelity: "principle",
    params: { FA: 0.06, FAst: 0.068 },
    schema: {
      FA: S("F/A", "dynamics", "\u2014", 0.01, 0.2),
      FAst: S("(F/A)_st", "dynamics", "\u2014", 0.02, 0.15)
    },
    tick(state) {
      state.phi = P(state.params, "FA", 0.06) / Math.max(1e-4, P(state.params, "FAst", 0.068));
    },
    plot: (s) => s.phi,
    rows: (s) => [["\u03C6", s.phi, ""]]
  });
}
function slipMotor(spec) {
  return shell(spec, {
    equation: "s = (n_s \u2212 n) / n_s",
    authority: "Chapman, Electric Machinery Fundamentals, \u8F6C\u5DEE\u7387",
    assumptions: "\u540C\u6B65\u901F\u7ED9\u5B9A",
    params: { ns: 1500, n: 1450 },
    schema: {
      ns: S("n_s", "dynamics", "rpm", 100, 3600),
      n: S("n", "dynamics", "rpm", 0, 3600)
    },
    tick(state) {
      const ns = Math.max(1, P(state.params, "ns", 1500));
      state.s = (ns - P(state.params, "n", 1450)) / ns;
    },
    plot: (s) => s.s,
    rows: (s) => [["s", s.s, ""]]
  });
}
function powerFactor(spec) {
  return shell(spec, {
    equation: "pf = cos\u03C6\uFF0CP = V I pf",
    authority: "Nilsson, \u4EA4\u6D41\u529F\u7387",
    assumptions: "\u6B63\u5F26\u7A33\u6001",
    params: { V: 220, I: 5, phi: 30 },
    schema: {
      V: S("V", "dynamics", "V", 0, 400),
      I: S("I", "dynamics", "A", 0, 50),
      phi: S("\u03C6", "dynamics", "\xB0", -90, 90)
    },
    tick(state) {
      state.pf = Math.cos(P(state.params, "phi", 30) * Math.PI / 180);
      state.P = P(state.params, "V", 220) * P(state.params, "I", 5) * state.pf;
    },
    plot: (s) => s.P,
    rows: (s) => [["pf", s.pf, ""], ["P", s.P, "W"]]
  });
}
function mppt(spec) {
  return shell(spec, {
    equation: "\u5355\u4E8C\u6781\u7BA1\u8FD1\u4F3C\u4E0B P=V I\uFF0CI=I_ph \u2212 I0 (e^{V/V_t}\u22121)\uFF0C\u5728\u626B\u63CF\u4E2D\u53D6\u6700\u5927",
    authority: "Messenger & Ventre, Photovoltaic Systems Engineering, \u5355\u4E8C\u6781\u7BA1",
    assumptions: "\u5FFD\u7565\u4E32\u8054\u7535\u963B\uFF1B\u626B\u63CF\u627E P \u6700\u5927\uFF0C\u4E0D\u662F\u5177\u4F53\u9006\u53D8\u5668\u7B97\u6CD5\u5B9E\u73B0",
    fidelity: "principle",
    params: { Iph: 5, I0: 1e-8, Vt: 0.7 },
    schema: {
      Iph: S("I_ph", "dynamics", "A", 0.5, 10),
      Vt: S("V_scale", "dynamics", "V", 0.3, 2)
    },
    tick(state) {
      const Iph = P(state.params, "Iph", 5);
      const I0 = P(state.params, "I0", 1e-8);
      const Vt = Math.max(0.05, P(state.params, "Vt", 0.7));
      let best = 0;
      for (let i = 1; i <= 40; i += 1) {
        const V = i / 40 * 0.8;
        const I = Math.max(0, Iph - I0 * (Math.exp(V / (Vt / 20)) - 1));
        best = Math.max(best, V * I);
      }
      state.P = best;
    },
    plot: (s) => s.P,
    rows: (s) => [["P_max", s.P, "W"]]
  });
}
function batteryOcv(spec) {
  return shell(spec, {
    equation: "V = OCV \u2212 I R",
    authority: "\u7535\u6C60\u7B49\u6548\u7535\u8DEF\u7684\u6B27\u59C6\u538B\u964D\uFF08\u96C6\u603B\uFF09",
    assumptions: "\u77AC\u65F6\u6B27\u59C6\u6A21\u578B\uFF0C\u4E0D\u542B\u6269\u6563\u4E0E\u70ED\u5931\u63A7",
    params: { OCV: 3.7, I: 2, R: 0.05 },
    schema: {
      OCV: S("OCV", "dynamics", "V", 2, 4.2),
      I: S("I", "dynamics", "A", 0, 20),
      R: S("R", "dynamics", "\u03A9", 1e-3, 0.5)
    },
    tick(state) {
      state.V = P(state.params, "OCV", 3.7) - P(state.params, "I", 2) * P(state.params, "R", 0.05);
    },
    plot: (s) => s.V,
    rows: (s) => [["V", s.V, "V"]]
  });
}
function absorptionLG(spec) {
  return shell(spec, {
    equation: "\u6700\u5C0F\u6DB2\u6C14\u6BD4\u9644\u8FD1\uFF1A\u64CD\u4F5C\u7EBF\u659C\u7387 L/G",
    authority: "Treybal, Mass-Transfer Operations, \u5438\u6536\u64CD\u4F5C\u7EBF",
    assumptions: "\u7A00\u6EB6\u6DB2\u3001\u76F4\u7EBF\u5E73\u8861 y*=m x \u65F6 (L/G)_min = (y_in\u2212y_out)/(x_out* \u2212 x_in)",
    params: { yin: 0.1, yout: 0.01, m: 1, xin: 0 },
    schema: {
      yin: S("y_in", "dynamics", "\u2014", 0.01, 0.3),
      yout: S("y_out", "dynamics", "\u2014", 1e-3, 0.1),
      m: S("m", "dynamics", "\u2014", 0.2, 3)
    },
    tick(state) {
      const yin = P(state.params, "yin", 0.1);
      const yout = Math.min(yin, P(state.params, "yout", 0.01));
      const m = Math.max(0.05, P(state.params, "m", 1));
      const xout = yout / m;
      state.LGmin = (yin - yout) / Math.max(1e-6, xout - P(state.params, "xin", 0));
    },
    plot: (s) => s.LGmin,
    rows: (s) => [["(L/G)_min", s.LGmin, ""]]
  });
}
function dryingPage(spec) {
  return shell(spec, {
    equation: "MR = exp(\u2212k t^n)\uFF08Page \u5E72\u71E5\u6A21\u578B\uFF09",
    authority: "Page, 1949\uFF1B\u8584\u5C42\u5E72\u71E5\u7ECF\u9A8C\u65B9\u7A0B\u7684\u5E38\u7528\u5F62\u5F0F",
    assumptions: "\u8584\u5C42\u3001\u62DF\u5408\u53C2\u6570 k,n\uFF0C\u4E0D\u662F\u8BBE\u5907\u8BBE\u8BA1",
    fidelity: "principle",
    params: { k: 0.2, n: 1 },
    schema: {
      k: S("k", "dynamics", "\u2014", 0.01, 2),
      n: S("n", "dynamics", "\u2014", 0.5, 2)
    },
    tick(state) {
      const n = P(state.params, "n", 1);
      state.MR = Math.exp(-P(state.params, "k", 0.2) * state.t ** n);
    },
    plot: (s) => s.MR,
    rows: (s) => [["MR", s.MR, ""]]
  });
}
function extractStages(spec) {
  return shell(spec, {
    equation: "\u9519\u6D41\u8403\u53D6\u7406\u60F3\u7EA7\uFF1A\u5355\u7EA7\u8403\u53D6\u7387 E = K / (1+K)\uFF0CK=E_factor",
    authority: "Treybal, \u5355\u7EA7\u8403\u53D6\u5206\u914D",
    assumptions: "\u7EBF\u6027\u5206\u914D\u3001\u4E00\u6B21\u63A5\u89E6",
    params: { K: 2 },
    schema: { K: S("K", "dynamics", "\u2014", 0.1, 10) },
    tick(state) {
      const K = Math.max(0, P(state.params, "K", 2));
      state.E = K / (1 + K);
    },
    plot: (s) => s.E,
    rows: (s) => [["E", s.E, ""]]
  });
}
function fluidization(spec) {
  return shell(spec, {
    equation: "\u0394P / H = (1 \u2212 \u03B5) (\u03C1_s \u2212 \u03C1) g\uFF08\u5E8A\u5C42\u538B\u964D\uFF0C\u5FFD\u7565\u58C1\u6469\u64E6\uFF09",
    authority: "Kunii & Levenspiel, Fluidization Engineering, \u5E8A\u5C42\u9759\u538B\u964D",
    assumptions: "\u5747\u5300\u7A7A\u9699\u7387",
    params: { eps: 0.45, rhos: 1500, rho: 1.2, H: 0.4 },
    schema: {
      eps: S("\u03B5", "dynamics", "\u2014", 0.3, 0.8),
      H: S("H", "dynamics", "m", 0.05, 2)
    },
    tick(state) {
      const eps = P(state.params, "eps", 0.45);
      state.dP = (1 - eps) * (P(state.params, "rhos", 1500) - P(state.params, "rho", 1.2)) * 9.81 * P(state.params, "H", 0.4);
    },
    plot: (s) => s.dP,
    rows: (s) => [["\u0394P", s.dP, "Pa"]]
  });
}
function supersat(spec) {
  return shell(spec, {
    equation: "\u8FC7\u9971\u548C\u6BD4 S = c / c*",
    authority: "Mullin, Crystallization, \u8FC7\u9971\u548C\u6BD4\u5B9A\u4E49",
    assumptions: "\u6D53\u5EA6\u4E0E\u6EB6\u89E3\u5EA6\u7ED9\u5B9A",
    params: { c: 1.2, cstar: 1 },
    schema: {
      c: S("c", "dynamics", "\u2014", 0, 3),
      cstar: S("c*", "dynamics", "\u2014", 0.1, 3)
    },
    tick(state) {
      state.S = P(state.params, "c", 1.2) / Math.max(1e-3, P(state.params, "cstar", 1));
    },
    plot: (s) => s.S,
    rows: (s) => [["S", s.S, ""]]
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
function corrosionRate(spec) {
  return shell(spec, {
    equation: "\u5747\u5300\u8150\u8680\u6DF1\u5EA6\u901F\u7387 r = i M / (n F \u03C1)\uFF08\u6CD5\u62C9\u7B2C\uFF09",
    authority: "Fontana, Corrosion Engineering, \u6CD5\u62C9\u7B2C\u8150\u8680\u901F\u7387",
    assumptions: "\u5747\u5300\u6EB6\u89E3\u3001\u5DF2\u77E5\u7535\u6D41\u5BC6\u5EA6\uFF1B\u975E\u9632\u62A4\u914D\u65B9",
    fidelity: "principle",
    params: { i: 1e-5, M: 0.056, n: 2, rho: 7800 },
    schema: {
      i: S("i", "dynamics", "A/m\xB2", 1e-7, 1)
    },
    tick(state) {
      const F = 96485;
      state.r = P(state.params, "i", 1e-5) * P(state.params, "M", 0.056) / (Math.max(1, P(state.params, "n", 2)) * F * P(state.params, "rho", 7800));
    },
    plot: (s) => s.r * 3154e4 * 1e3,
    rows: (s) => [["r", s.r * 3154e4 * 1e3, "mm/yr"]]
  });
}
function fuelCellV(spec) {
  return shell(spec, {
    equation: "V = E \u2212 i r \u2212 A ln(i)\uFF08\u7B80\u5316\u6781\u5316\uFF0CA,r \u7ECF\u9A8C\uFF09",
    authority: "O'Hayre, Fuel Cell Fundamentals, \u6781\u5316\u5206\u89E3\u7684\u6559\u5B66\u5F0F",
    assumptions: "\u5BF9\u6570\u6D3B\u5316\u9879\u5728 i>0\uFF1B\u4E0D\u662F\u7535\u5806\u8BBE\u8BA1",
    fidelity: "principle",
    params: { E: 1.2, i: 0.3, r: 0.1, A: 0.05 },
    schema: {
      i: S("i", "dynamics", "A/cm\xB2", 0.01, 1.5),
      r: S("r", "dynamics", "\u03A9\xB7cm\xB2", 0.01, 0.5)
    },
    tick(state) {
      const i = Math.max(1e-3, P(state.params, "i", 0.3));
      state.V = P(state.params, "E", 1.2) - i * P(state.params, "r", 0.1) - P(state.params, "A", 0.05) * Math.log(i);
    },
    plot: (s) => s.V,
    rows: (s) => [["V", s.V, "V"]]
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
function eulerMethod(spec) {
  return shell(spec, {
    equation: "y\u2032=\u2212y\uFF0CEuler\uFF1Ay_{n+1}=y_n+h f",
    authority: "Burden & Faires, Numerical Analysis, \u663E\u5F0F\u6B27\u62C9",
    assumptions: "\u4E0E\u7CBE\u786E\u89E3 e^{\u2212t} \u5BF9\u7167",
    params: { h: 0.2, y0: 1 },
    schema: { h: S("h", "numerics", "\u2014", 0.01, 0.5) },
    init(state) {
      state.y = P(state.params, "y0", 1);
      state.n = 0;
    },
    tick(state, dt) {
      if (dt <= 0) return;
      const h = P(state.params, "h", 0.2);
      state.y += h * -state.y;
      state.exact = Math.exp(-state.t);
    },
    plot: (s) => s.y,
    rows: (s) => [["y_E", s.y, ""], ["e^{\u2212t}", s.exact, ""]]
  });
}
function neutronDiffusion(spec) {
  return shell(spec, {
    equation: "\u4E00\u7EF4\u5E73\u677F\u57FA\u6A21 \u03C6=\u03C6\u2080 cos(\u03C0 x / a)\uFF0C\u4E34\u754C\u6761\u4EF6 B\xB2=\u03C0\xB2/a\xB2=(\u03BD\u03A3_f\u2212\u03A3_a)/D",
    authority: "Lamarsh, Introduction to Nuclear Engineering, \u4E00\u7FA4\u6269\u6563",
    assumptions: "\u4E00\u7FA4\u3001\u5747\u5300\u5E73\u677F\u3001\u5916\u63A8\u8FB9\u754C\u7565\u53BB\uFF1B\u516C\u5F00\u6559\u79D1\u4E66\u4E34\u754C\u6761\u4EF6\uFF0C\u975E\u8BBE\u8BA1",
    fidelity: "principle",
    params: { a: 1 },
    schema: { a: S("a", "dynamics", "m", 0.2, 3) },
    tick(state) {
      const a = Math.max(0.05, P(state.params, "a", 1));
      state.B2 = (Math.PI / a) ** 2;
    },
    plot: (s) => s.B2,
    rows: (s) => [["B\xB2", s.B2, "1/m\xB2"]]
  });
}
function bateman(spec) {
  return shell(spec, {
    equation: "\u4E24\u4EE3 Bateman\uFF1AN2 = N10 \u03BB1/(\u03BB2\u2212\u03BB1) (e^{\u2212\u03BB1 t}\u2212e^{\u2212\u03BB2 t})",
    authority: "Krane, \u4E24\u4EE3\u653E\u5C04\u6027\u8870\u53D8\u94FE",
    assumptions: "N2(0)=0\u3001\u03BB1\u2260\u03BB2\u3002t\u2080 \u662F\u53EF\u9009\u89C2\u5BDF\u65F6\u523B\uFF0C\u9ED8\u8BA4 2 s\uFF0C\u907F\u514D\u53EA\u770B\u89C1\u5B50\u4F53\u4E3A\u96F6",
    params: { l1: 0.3, l2: 0.1, N10: 100, t0: 2 },
    schema: {
      l1: S("\u03BB1", "dynamics", "1/s", 0.05, 2),
      l2: S("\u03BB2", "dynamics", "1/s", 0.05, 2),
      t0: S("\u89C2\u5BDF\u65F6\u523B t\u2080", "initial", "s", 0, 60)
    },
    tick(state) {
      const l1 = P(state.params, "l1", 0.3);
      const l2 = P(state.params, "l2", 0.1);
      const den = l2 - l1;
      state.N2 = Math.abs(den) < 1e-6 ? P(state.params, "N10", 100) * l1 * state.t * Math.exp(-l1 * state.t) : P(state.params, "N10", 100) * l1 / den * (Math.exp(-l1 * state.t) - Math.exp(-l2 * state.t));
    },
    plot: (s) => s.N2,
    rows: (s) => [["N2", s.N2, ""]]
  });
}
function doBalance(spec) {
  return shell(spec, {
    equation: "Streeter\u2013Phelps\uFF1A\u4E8F\u6C27 D(t) \u7684\u7ECF\u5178\u89E3\uFF08\u70B9\u6E90\uFF09",
    authority: "Metcalf & Eddy / Chapra, Surface Water-Quality Modeling, Streeter\u2013Phelps",
    assumptions: "\u4E00\u9636\u590D\u6C27\u4E0E\u8017\u6C27\u3001\u6052\u5B9A\u6D41\u901F\u5316\u4E3A\u65F6\u95F4",
    fidelity: "principle",
    params: { k1: 0.3, k2: 0.5, L0: 20, D0: 1 },
    schema: {
      k1: S("k1", "dynamics", "1/d", 0.05, 1),
      k2: S("k2", "dynamics", "1/d", 0.05, 1),
      L0: S("L0", "initial", "mg/L", 0, 40)
    },
    tick(state) {
      const kd = P(state.params, "k1", 0.3);
      const ka = P(state.params, "k2", 0.5);
      const t2 = state.t;
      const L = P(state.params, "L0", 20) * Math.exp(-kd * t2);
      state.D = Math.abs(ka - kd) < 1e-6 ? P(state.params, "D0", 1) * Math.exp(-ka * t2) + kd * P(state.params, "L0", 20) * t2 * Math.exp(-ka * t2) : P(state.params, "D0", 1) * Math.exp(-ka * t2) + kd * P(state.params, "L0", 20) / (ka - kd) * (Math.exp(-kd * t2) - Math.exp(-ka * t2));
      state.L = L;
    },
    plot: (s) => s.D,
    rows: (s) => [["D", s.D, "mg/L"], ["L", s.L, "mg/L"]]
  });
}
function asmSubstrate(spec) {
  return shell(spec, {
    equation: "Monod\uFF1A\u03BC = \u03BC_max S / (K_s + S)",
    authority: "Henze et al., Activated Sludge Models, Monod \u751F\u957F\u9879",
    assumptions: "\u5355\u4E00\u5E95\u7269\u3001\u65E0\u6291\u5236\uFF1B\u4E0D\u662F\u6574\u5EA7\u6C61\u6C34\u5382",
    fidelity: "principle",
    params: { umax: 2, Ks: 10, S: 8 },
    schema: {
      umax: S("\u03BC_max", "dynamics", "1/d", 0.2, 8),
      Ks: S("K_s", "dynamics", "mg/L", 1, 50),
      S: S("S", "dynamics", "mg/L", 0, 80)
    },
    tick(state) {
      const S2 = Math.max(0, P(state.params, "S", 8));
      state.mu = P(state.params, "umax", 2) * S2 / (P(state.params, "Ks", 10) + S2);
    },
    plot: (s) => s.mu,
    rows: (s) => [["\u03BC", s.mu, "1/d"]]
  });
}
function riverDisp(spec) {
  return shell(spec, {
    equation: "\u4E00\u7EF4\u8109\u51B2\uFF1Ac = M/A / \u221A(4\u03C0 E t) exp(\u2212\u03BE\xB2/(4 E t))\uFF0C\u63A2\u9488\u5728\u5CF0\u4F4D x = u t + \u03BE\uFF0C\u9ED8\u8BA4 \u03BE = 0",
    authority: "Fischer et al., Mixing in Inland and Coastal Waters",
    assumptions: "\u6052\u5B9A\u65AD\u9762\u4E0E\u6D41\u901F\u3001\u77AC\u65F6\u6295\u653E\u5728 x=0\u3002t>0 \u65F6\u9ED8\u8BA4\u63A2\u9488\u8DDF\u7740\u5CF0\u8D70\uFF08\u03BE=0\uFF09\uFF0C\u4E0D\u8BFB\u9AD8\u65AF\u8FDC\u5C3E",
    params: { M: 10, A: 20, E: 5, u: 0.4, xi: 0 },
    schema: {
      u: S("u", "dynamics", "m/s", 0.05, 2),
      E: S("E", "dynamics", "m\xB2/s", 0.1, 50),
      xi: S("\u8DDD\u5CF0 \u03BE", "dynamics", "m", -30, 30)
    },
    tick(state) {
      const t2 = Math.max(0.05, state.t);
      const u = P(state.params, "u", 0.4);
      const E = Math.max(1e-3, P(state.params, "E", 5));
      const xi = P(state.params, "xi", 0);
      state.xPeak = u * t2;
      state.c = P(state.params, "M", 10) / Math.max(0.1, P(state.params, "A", 20)) / Math.sqrt(4 * Math.PI * E * t2) * Math.exp(-(xi * xi) / (4 * E * t2));
    },
    plot: (s) => s.c,
    rows: (s) => [["c", s.c, ""]]
  });
}
function proteinFoldNote(spec) {
  return shell(spec, {
    equation: "\u4E24\u6001\uFF1AK = exp(\u2212\u0394G / RT)\uFF0C\u6298\u53E0\u5206\u6570 f = K/(1+K)",
    authority: "Dill & Bromberg, Molecular Driving Forces, \u4E24\u6001\u6298\u53E0",
    assumptions: "\u4E24\u6001\u3001\u5FFD\u7565\u4E2D\u95F4\u4F53",
    fidelity: "principle",
    params: { dG: -5 },
    schema: { dG: S("\u0394G", "dynamics", "kJ/mol", -30, 20) },
    tick(state) {
      const R = 8314e-6;
      const T = 298;
      const K = Math.exp(-P(state.params, "dG", -5) / (R * T));
      state.f = K / (1 + K);
    },
    plot: (s) => s.f,
    rows: (s) => [["f_fold", s.f, ""]]
  });
}
function membraneTransport(spec) {
  return shell(spec, {
    equation: "Goldman\uFF1AV_m = (RT/F) ln( (P_K K_o)/(P_K K_i) )\uFF08\u4EC5\u94BE\uFF0C\u7B80\u5316\uFF09",
    authority: "Hille, Ion Channels of Excitable Membranes, Goldman \u65B9\u7A0B",
    assumptions: "\u53EA\u6709\u94BE\u901A\u900F\u65F6\u9000\u5316\u4E3A Nernst",
    fidelity: "principle",
    params: { Ko: 4, Ki: 140 },
    schema: {
      Ko: S("K_o", "dynamics", "mM", 1, 20),
      Ki: S("K_i", "dynamics", "mM", 50, 200)
    },
    tick(state) {
      const R = 8.314;
      const T = 310;
      const F = 96485;
      state.V = R * T / F * Math.log(Math.max(0.1, P(state.params, "Ko", 4)) / Math.max(1, P(state.params, "Ki", 140))) * 1e3;
    },
    plot: (s) => s.V,
    rows: (s) => [["V_m", s.V, "mV"]]
  });
}
function logisticMap(spec) {
  return shell(spec, {
    equation: "x \u2190 r x (1 \u2212 x)",
    authority: "May, Nature 261 (1976)\uFF1BStrogatz",
    assumptions: "\u79BB\u6563\u903B\u8F91\u65AF\u8482\u6620\u5C04",
    params: { r: 3.2, x: 0.2 },
    schema: {
      r: S("r", "dynamics", "\u2014", 0, 4)
    },
    init(state) {
      state.x = P(state.params, "x", 0.2);
    },
    tick(state, h) {
      if (h <= 0) return;
      const r = P(state.params, "r", 3.2);
      state.x = r * state.x * (1 - state.x);
    },
    plot: (s) => s.x,
    rows: (s) => [["x", s.x, ""]]
  });
}
function vanderPol(spec) {
  return shell(spec, {
    equation: "x\u2033 \u2212 \u03BC(1\u2212x\xB2)x\u2032 + x = 0",
    authority: "Strogatz, van der Pol",
    assumptions: "\u6781\u9650\u73AF\u793A\u610F",
    fidelity: "principle",
    params: { mu: 0.5 },
    schema: { mu: S("\u03BC", "dynamics", "\u2014", 0.05, 3) },
    init(state) {
      state.x = 0.1;
      state.v = 0;
    },
    tick(state, h) {
      if (h <= 0) return;
      const mu = P(state.params, "mu", 0.5);
      const n = 8;
      const dt = h / n;
      for (let i = 0; i < n; i += 1) {
        const acc = mu * (1 - state.x * state.x) * state.v - state.x;
        state.v += acc * dt;
        state.x += state.v * dt;
      }
    },
    plot: (s) => s.x,
    rows: (s) => [["x", s.x, ""]]
  });
}
function lyapunovNote(spec) {
  return shell(spec, {
    equation: "\u7EBF\u6027\u5316 x\u2032=a x\uFF0C\u03BB=a\uFF08\u4E00\u7EF4\u674E\u96C5\u666E\u8BFA\u592B\u6307\u6570\uFF09",
    authority: "Strogatz, \u7EBF\u6027\u7A33\u5B9A\u6027",
    assumptions: "\u4E00\u7EF4\u7EBF\u6027",
    params: { a: -0.5 },
    schema: { a: S("a", "dynamics", "\u2014", -2, 2) },
    tick(state) {
      state.x = Math.exp(P(state.params, "a", -0.5) * state.t);
    },
    plot: (s) => s.x,
    rows: (s) => [["x", s.x, ""], ["\u03BB", P(s.params, "a", 0), ""]]
  });
}
var PREFIX = {
  \u8FD0\u52A8\u5B66: (s, t2) => kin(s, t2),
  \u52A8\u529B\u5B66: (s, t2) => newton(s, t2),
  \u78B0\u649E: (s, t2) => collision(s, t2),
  \u521A\u4F53: (s, t2) => has(t2, /滚动/) ? rolling(s) : has(t2, /欧拉/) ? rigidEuler(s) : has(t2, /凸轮/) ? camHarmonic(s) : has(t2, /连杆|机构/) ? grashof(s) : rigidEuler(s),
  \u632F\u52A8: (s, t2) => shmFamily(s, t2),
  \u6CE2: (s, t2) => waveTravel(s),
  \u58F0\u5B66: (s, t2) => has(t2, /声压/) ? spl(s) : has(t2, /拍/) ? beats(s) : has(t2, /声速|温度/) ? soundSpeed(s) : has(t2, /混响/) ? sabine(s) : has(t2, /声源|多普勒/) ? doppler(s) : spl(s),
  \u70ED\u529B\u5B66: (s, t2) => has(t2, /卡诺|效率/) ? carnot(s, t2) : has(t2, /气体|状态/) ? gasLaw(s) : carnot(s, t2),
  \u7EDF\u8BA1\u7269\u7406: (s, t2) => has(t2, /麦克斯韦/) ? maxwell(s) : has(t2, /伊辛/) ? isingEnergy(s) : has(t2, /游走|扩散/) ? brownian(s) : has(t2, /渗流/) ? percolation(s) : has(t2, /熵/) ? entropyMix(s) : maxwell(s),
  \u6D41\u4F53: (s, t2) => has(t2, /雷诺/) ? reynolds(s) : has(t2, /泊|管/) ? poiseuille(s) : bernoulli(s),
  \u6D41\u4F532: (s, t2) => has(t2, /边界/) ? blasius(s) : has(t2, /湍流|雷诺/) ? reynolds(s) : poiseuille(s),
  \u9759\u7535: (s, t2) => has(t2, /偶极/) ? dipole(s) : has(t2, /电容/) ? capacitor(s) : has(t2, /高斯|库仑|电场/) ? coulomb(s) : gaussPoint(s),
  \u7535\u8DEF: (s, t2) => has(t2, /欧姆|电阻/) ? ohm(s) : has(t2, /电容/) ? capacitor(s) : has(t2, /RL|电感|自感/) ? selfL(s) : rcCircuit(s),
  \u78C1\u5B66: (s, t2) => has(t2, /霍尔/) ? hall(s) : has(t2, /安培/) ? ampere(s) : has(t2, /变压器/) ? transformer(s) : has(t2, /互感/) ? mutual(s) : has(t2, /自感/) ? selfL(s) : has(t2, /感应|楞次|法拉第/) ? faraday(s) : lorentzRadius(s),
  \u7535\u78C1\u6CE2: (s, t2) => waveTravel(s),
  \u5149\u5B66: (s, t2) => has(t2, /Malus|偏振/) ? malus(s) : has(t2, /透镜|成像/) ? lens(s) : has(t2, /折射|反射|斯涅尔/) ? snell(s) : has(t2, /光纤|全反射/) ? fiberNA(s) : snell(s),
  \u6CE2\u52A8\u5149\u5B66: (s, t2) => has(t2, /双缝|杨氏|干涉/) ? doubleSlit(s) : doubleSlit(s),
  \u8FD1\u4EE3: (s, t2) => has(t2, /光电/) ? photo(s) : has(t2, /康普顿/) ? compton(s) : has(t2, /德布罗意/) ? debroglie(s) : has(t2, /不确定/) ? uncertainty(s) : has(t2, /隧|势垒|阱/) ? has(t2, /阱/) ? well(s) : tunnel(s) : has(t2, /黑体/) ? stefan(s) : photo(s),
  \u91CF\u5B50: (s, t2) => has(t2, /势阱|无限/) ? well(s) : has(t2, /隧|势垒/) ? tunnel(s) : has(t2, /谐振子/) ? qho(s) : has(t2, /贝尔/) ? bellCHSH(s) : has(t2, /自旋/) ? spinOrbit(s) : well(s),
  \u76F8\u5BF9\u8BBA: (s, t2) => gamma(s, t2),
  \u5929\u4F53: (s, t2) => has(t2, /开普勒|轨道/) ? kepler(s) : kepler(s),
  \u5B87\u5B99: (s, t2) => has(t2, /红移|哈勃|膨胀/) ? hubble(s) : has(t2, /黑体|核合成|温度/) ? blackbodyPeak(s) : hubble(s),
  \u7C92\u5B50: (s, t2) => debroglie(s),
  \u6838\u7269\u7406: (s, t2) => has(t2, /屏蔽|衰减/) ? shieldLaw(s) : has(t2, /磁共振|拉莫/) ? larmor(s) : has(t2, /临界|裂变|链式|反应堆/) ? criticality(s) : has(t2, /剂量/) ? shell(s, {
    equation: "H = w_R D\uFF0C\u9ED8\u8BA4\u5149\u5B50/\u7535\u5B50 w_R = 1\uFF0CH = 1 mSv",
    authority: "ICRP 103 \u516C\u5F00\u7684\u8F90\u5C04\u6743\u91CD\u56E0\u5B50\u4E0E\u5F53\u91CF\u5242\u91CF\u5B9A\u4E49\uFF08\u6559\u5B66\uFF09",
    assumptions: "\u5B9A\u4E49\u5F0F\u3002\u9ED8\u8BA4\u5149\u5B50\u548C\u7535\u5B50 w_R=1\uFF1B\u8D28\u5B50 w_R=2\uFF1B\u03B1 \u7C92\u5B50 w_R=20\u3002\u4E2D\u5B50\u7684 w_R \u968F\u80FD\u91CF\u53D8\u5316\uFF0C\u8FD9\u91CC\u4E0D\u662F\u5242\u91CF\u8BC4\u4F30",
    fidelity: "principle",
    params: { D: 1e-3, w: 1 },
    schema: { D: S("D", "dynamics", "Gy", 0, 5), w: S("w_R", "dynamics", "\u2014", 1, 20) },
    tick(st) {
      const w = P(st.params, "w", 1);
      st.H = P(st.params, "D", 1e-3) * w;
      st.rad = radiationKind(w);
    },
    plot: (st) => st.H,
    rows: (st) => [["H", st.H, "Sv"], ["\u8F90\u5C04", st.rad, ""]]
  }) : decay(s),
  \u51DD\u805A\u6001: (s, t2) => has(t2, /半导体|PN|MOS/) ? pnBarrier(s) : has(t2, /量子霍尔|霍尔/) ? has(t2, /量子/) ? quantumHall(s) : hall(s) : has(t2, /超导/) ? shell(s, {
    equation: "\u4F26\u6566\u7A7F\u900F\u6DF1\u5EA6\u5173\u7CFB\u7684\u6559\u5B66\u5F0F \u03BB_L = \u221A(m / (\u03BC\u2080 n_s e\xB2))",
    authority: "Tinkham, Introduction to Superconductivity, London \u6DF1\u5EA6",
    assumptions: "\u7ED9\u5B9A\u8D85\u6D41\u5BC6\u5EA6\uFF0C\u4E0D\u662F\u6750\u6599\u8BBE\u8BA1",
    fidelity: "principle",
    params: { ns: 1e28 },
    schema: { ns: S("n_s", "dynamics", "1/m\xB3", 1e27, 1e29) },
    tick(st) {
      const m = 9109e-34;
      const e = 1602e-22;
      const mu0 = 1256637e-12;
      st.lam = Math.sqrt(m / (mu0 * P(st.params, "ns", 1e28) * e * e));
    },
    plot: (st) => st.lam * 1e9,
    rows: (st) => [["\u03BB_L", st.lam * 1e9, "nm"]]
  }) : isingEnergy(s),
  \u975E\u7EBF\u6027: (s, t2) => has(t2, /同步/) ? lyapunovNote(s) : has(t2, /Duffing|达芬/) ? duffing(s) : has(t2, /范德波尔|极限/) ? vanderPol(s) : logisticMap(s),
  \u8BA1\u7B97\u7269\u7406: (s, t2) => has(t2, /欧拉|数值/) ? eulerMethod(s) : heatMode(s),
  \u751F\u7269\u7269\u7406: (s, t2) => has(t2, /膜|Goldman|神经/) ? membraneTransport(s) : has(t2, /折叠/) ? proteinFoldNote(s) : membraneHHNote(s),
  \u7B49\u79BB\u5B50\u4F53: (s, t2) => lorentzRadius(s),
  \u6392\u5E8F: (s) => binarySearchSteps(s),
  \u67E5\u627E: (s) => binarySearchSteps(s),
  \u56FE\u7B97\u6CD5: (s) => dijkstraBound(s),
  \u5B57\u7B26\u4E32: (s) => editDistance(s),
  \u52A8\u6001\u89C4\u5212: (s) => editDistance(s),
  \u6570\u636E\u7ED3\u6784: (s, t2) => has(t2, /哈希|散列/) ? hashLoad(s) : binarySearchSteps(s),
  \u8BA1\u7B97\u7406\u8BBA: (s) => binarySearchSteps(s),
  \u5BC6\u7801\u5B66: (s, t2) => has(t2, /RSA|模/) ? rsaMod(s) : caesar(s),
  \u4FE1\u606F\u8BBA: (s, t2) => has(t2, /容量|信道/) ? shell(s, {
    equation: "C = B log2(1+SNR)",
    authority: "Cover & Thomas, \u5E26\u9650 AWGN \u5BB9\u91CF",
    assumptions: "AWGN",
    params: { B: 1e3, snr: 10 },
    schema: { B: S("B", "dynamics", "Hz", 1, 1e6), snr: S("SNR", "dynamics", "\u2014", 0.1, 100) },
    tick(st) {
      st.C = P(st.params, "B", 1e3) * Math.log2(1 + P(st.params, "snr", 10));
    },
    plot: (st) => st.C,
    rows: (st) => [["C", st.C, "bit/s"]]
  }) : binaryEntropy(s),
  \u76D1\u7763\u5B66\u4E60: (s) => gdQuadratic(s),
  \u65E0\u76D1\u7763: (s, t2) => has(t2, /K-means|聚类/) ? kmeans1d(s) : matrix2(s, "\u7279\u5F81"),
  \u795E\u7ECF\u7F51\u7EDC: (s) => gdQuadratic(s),
  \u5F3A\u5316\u5B66\u4E60: (s) => shell(s, {
    equation: "\u8D1D\u5C14\u66FC\uFF1AV = r + \u03B3 V\u2032\uFF08\u5355\u72B6\u6001\u793A\u610F\uFF09",
    authority: "Sutton & Barto, Reinforcement Learning",
    assumptions: "\u786E\u5B9A\u6027\u5355\u5907\u4EFD",
    params: { r: 1, gamma: 0.9, Vp: 2 },
    schema: { r: S("r", "dynamics", "\u2014", -5, 5), gamma: S("\u03B3", "dynamics", "\u2014", 0, 0.99), Vp: S("V\u2032", "dynamics", "\u2014", 0, 10) },
    tick(st) {
      st.V = P(st.params, "r", 1) + P(st.params, "gamma", 0.9) * P(st.params, "Vp", 2);
    },
    plot: (st) => st.V,
    rows: (st) => [["V", st.V, ""]]
  }),
  \u4F18\u5316: (s) => gdQuadratic(s),
  \u56FE\u5F62\u5B66: (s) => shell(s, {
    equation: "Lambert\uFF1AL = (I/\u03C0) max(0, n\xB7l)",
    authority: "Pharr, Humphreys, Physically Based Rendering, Lambert",
    assumptions: "\u6F2B\u53CD\u5C04\u3001\u5149\u4E0E\u6CD5\u7EBF\u5939\u89D2",
    params: { ndotl: 0.5, I: 1 },
    schema: { ndotl: S("n\xB7l", "dynamics", "\u2014", -1, 1), I: S("I", "dynamics", "\u2014", 0, 5) },
    tick(st) {
      st.L = P(st.params, "I", 1) / Math.PI * Math.max(0, P(st.params, "ndotl", 0.5));
    },
    plot: (st) => st.L,
    rows: (st) => [["L", st.L, ""]]
  }),
  \u6570\u636E\u5E93: (s) => shell(s, {
    equation: "\u9009\u62E9\u7387 sel \u2248 1/N \u7684\u5747\u5300\u5047\u8BBE\u4E0B\u671F\u671B\u626B\u63CF\u4EE3\u4EF7 \u221D N",
    authority: "Ramakrishnan & Gehrke, Database Management Systems, \u9009\u62E9\u626B\u63CF",
    assumptions: "\u5168\u8868\u626B\u63CF\u4EE3\u4EF7\u4E0E\u884C\u6570\u6210\u6B63\u6BD4",
    params: { N: 1e3 },
    schema: { N: S("N", "dynamics", "\u2014", 1, 1e6) },
    tick(st) {
      st.cost = P(st.params, "N", 1e3);
    },
    plot: (st) => st.cost,
    rows: (st) => [["cost", st.cost, ""]]
  }),
  \u7F51\u7EDC: (s, t2) => has(t2, /握手|TCP/) ? tcpStates(s) : littleLaw(s),
  \u64CD\u4F5C\u7CFB\u7EDF: (s, t2) => has(t2, /银行/) ? bankerNeed(s) : has(t2, /LRU|页/) ? pageReplace(s) : rrWait(s),
  \u7F16\u8BD1: (s) => binarySearchSteps(s),
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
  \u6570\u5B57\u903B\u8F91: (s, t2) => boolGate(s, t2),
  \u7EC4\u5408\u903B\u8F91: (s, t2) => boolGate(s, t2 || "\u4E0E"),
  \u65F6\u5E8F\u903B\u8F91: (s) => shell(s, {
    equation: "\u5206\u9891\uFF1Af_out = f_in / N",
    authority: "Mano, \u8BA1\u6570\u5668\u5206\u9891",
    assumptions: "\u6574\u6570\u5206\u9891",
    params: { fin: 1e3, N: 4 },
    schema: { fin: S("f_in", "dynamics", "Hz", 1, 1e6), N: S("N", "dynamics", "\u2014", 1, 64) },
    tick(st) {
      st.fo = P(st.params, "fin", 1e3) / Math.max(1, Math.round(P(st.params, "N", 4)));
    },
    plot: (st) => st.fo,
    rows: (st) => [["f_out", st.fo, "Hz"]]
  }),
  \u8BA1\u7B97\u673A\u4F53\u7CFB: (s) => amdahl(s),
  \u5B58\u50A8\u5C42\u6B21: (s, t2) => has(t2, /LRU/) ? pageReplace(s) : amdahl(s),
  \u5D4C\u5165\u5F0F: (s, t2) => has(t2, /PWM|占空/) ? pwm(s) : nyquist(s),
  \u901A\u4FE1\u7F16\u7801: (s) => binaryEntropy(s),
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
  }),
  \u5DEE\u9519\u63A7\u5236: (s) => shell(s, {
    equation: "\u6C49\u660E\u754C\u793A\u610F\uFF1A\u6700\u5C11\u6821\u9A8C n\u2212k \u2265 log2(n+1)\uFF08\u7EA0\u6B63 1 \u4F4D\uFF09",
    authority: "Lin & Costello, Error Control Coding, \u6C49\u660E\u7801\u53C2\u6570",
    assumptions: "\u7EA0\u6B63\u5355\u9519\u7684\u6C49\u660E\u754C",
    params: { n: 7 },
    schema: { n: S("n", "dynamics", "\u2014", 3, 31) },
    tick(st) {
      const n = Math.max(3, Math.round(P(st.params, "n", 7)));
      st.r = Math.ceil(Math.log2(n + 1));
    },
    plot: (st) => st.r,
    rows: (st) => [["r_min", st.r, ""]]
  }),
  \u7F51\u7EDC\u534F\u8BAE: (s) => tcpStates(s),
  "VLSI-FPGA": (s) => cmosDelay(s),
  \u4FE1\u53F7\u5904\u7406: (s, t2) => has(t2, /采样|Nyquist/) ? nyquist(s) : fftBin(s),
  \u63A7\u5236: (s, t2) => has(t2, /电机/) ? dcMotor(s) : has(t2, /PID|阶跃|二阶/) ? secondOrderStep(s) : secondOrderStep(s),
  \u673A\u5668\u4EBA: (s) => forwardKinematics(s),
  \u7535\u529B\u7535\u5B50\u4E0E\u7535\u673A: (s, t2) => has(t2, /感应|异步|转差/) ? slipMotor(s) : has(t2, /变压器/) ? transformer(s) : has(t2, /因数/) ? powerFactor(s) : dcMotor(s),
  \u673A\u68B0\u673A\u6784: (s, t2) => has(t2, /凸轮/) ? camHarmonic(s) : has(t2, /齿轮/) ? gearOrBelt(s, "\u9F7F\u8F6E") : grashof(s),
  \u4F20\u52A8: (s, t2) => gearOrBelt(s, t2),
  \u673A\u68B0\u632F\u52A8: (s, t2) => has(t2, /隔振|传递/) ? isolation(s) : shmFamily(s, t2),
  \u75B2\u52B3\u65AD\u88C2: (s) => stress(s, "\u65AD\u88C2"),
  \u6D41\u4F53\u673A\u68B0: (s, t2) => has(t2, /泵|功率|水轮机/) ? shell(s, {
    equation: "P = \u03C1 g Q H / \u03B7",
    authority: "White, \u6C34\u529B\u673A\u68B0\u529F\u7387",
    assumptions: "\u7ED9\u5B9A\u6548\u7387",
    params: { Q: 0.05, H: 20, eta: 0.75 },
    schema: { Q: S("Q", "dynamics", "m\xB3/s", 1e-3, 1), H: S("H", "dynamics", "m", 1, 100), eta: S("\u03B7", "dynamics", "\u2014", 0.3, 0.95) },
    tick(st) {
      st.P = 1e3 * 9.81 * P(st.params, "Q", 0.05) * P(st.params, "H", 20) / Math.max(0.2, P(st.params, "eta", 0.75));
    },
    plot: (st) => st.P,
    rows: (st) => [["P", st.P, "W"]]
  }) : bernoulli(s),
  \u6750\u6599\u529B\u5B66: (s, t2) => stress(s, t2),
  \u6750\u6599\u79D1\u5B66: (s, t2) => has(t2, /相/) ? leverRule(s) : stress(s, t2),
  \u76F8\u56FE: (s) => leverRule(s),
  \u6269\u6563: (s) => brownian(s),
  \u65AD\u88C2\u529B\u5B66: (s) => stress(s, "\u65AD\u88C2"),
  \u590D\u5408\u6750\u6599: (s) => shell(s, {
    equation: "\u7EB5\u5411\u6DF7\u5408\u5F8B E = E_f V_f + E_m (1\u2212V_f)",
    authority: "Kaw, Mechanics of Composite Materials, Voigt \u6DF7\u5408\u5F8B",
    assumptions: "\u5355\u5411\u3001\u7B49\u5E94\u53D8",
    params: { Ef: 200, Em: 3, Vf: 0.6 },
    schema: { Ef: S("E_f", "dynamics", "GPa", 10, 400), Em: S("E_m", "dynamics", "GPa", 0.5, 20), Vf: S("V_f", "dynamics", "\u2014", 0, 1) },
    tick(st) {
      const vf = Math.min(1, Math.max(0, P(st.params, "Vf", 0.6)));
      st.E = P(st.params, "Ef", 200) * vf + P(st.params, "Em", 3) * (1 - vf);
    },
    plot: (st) => st.E,
    rows: (st) => [["E", st.E, "GPa"]]
  }),
  \u7ED3\u6784\u5DE5\u7A0B: (s, t2) => stress(s, t2),
  \u5CA9\u571F\u5DE5\u7A0B: (s) => rankineSoil(s),
  \u6865\u6881: (s) => stress(s, "\u5F2F\u66F2"),
  \u5730\u9707\u5DE5\u7A0B: (s) => secondOrderStep(s),
  \u822A\u7A7A\u6C14\u52A8: (s, t2) => has(t2, /马赫/) ? shell(s, {
    equation: "M = v / a",
    authority: "Anderson, \u9A6C\u8D6B\u6570\u5B9A\u4E49",
    assumptions: "\u5F53\u5730\u58F0\u901F\u7ED9\u5B9A",
    params: { v: 200, a: 340 },
    schema: { v: S("v", "dynamics", "m/s", 0, 600), a: S("a", "dynamics", "m/s", 200, 400) },
    tick(st) {
      st.M = P(st.params, "v", 200) / Math.max(1, P(st.params, "a", 340));
    },
    plot: (st) => st.M,
    rows: (st) => [["M", st.M, ""]]
  }) : clift(s),
  \u98DE\u884C\u529B\u5B66: (s, t2) => has(t2, /浮沉|长周期/) ? phugoid(s) : phugoid(s),
  \u63A8\u8FDB: (s) => rocket(s),
  \u8F68\u9053: (s, t2) => has(t2, /霍曼/) ? hohmann(s) : kepler(s),
  \u660E\u6E20\u6C34\u529B\u5B66: (s, t2) => has(t2, /水跃|共轭/) ? hydraulicJump(s) : has(t2, /闸/) ? sluice(s) : manning(s),
  \u6C34\u5DE5\u7ED3\u6784: (s) => shell(s, {
    equation: "\u9759\u6C34\u538B\u529B\u5408\u529B P = \xBD \u03C1 g h\xB2\uFF08\u5355\u4F4D\u5BBD\u5EA6\uFF09",
    authority: "\u9759\u6C34\u538B\u5F3A\u4E09\u89D2\u5F62",
    assumptions: "\u7AD6\u76F4\u8FCE\u6C34\u9762\u3001\u5355\u4F4D\u5BBD\u5EA6",
    params: { h: 10 },
    schema: { h: S("h", "dynamics", "m", 0.5, 80) },
    tick(st) {
      st.P = 0.5 * 1e3 * 9.81 * P(st.params, "h", 10) ** 2;
    },
    plot: (st) => st.P / 1e3,
    rows: (st) => [["P", st.P / 1e3, "kN/m"]]
  }),
  \u4EA4\u901A\u6D41: (s) => naschFlow(s),
  \u5316\u5DE5\u53CD\u5E94\u5668: (s, t2) => has(t2, /PFR|平推/) ? pfr(s) : has(t2, /当量/) ? equivalence(s) : cstr(s),
  \u5316\u5DE5\u5206\u79BB: (s, t2) => has(t2, /精馏|操作线/) ? mccabe(s) : has(t2, /吸收/) ? absorptionLG(s) : has(t2, /干燥/) ? dryingPage(s) : has(t2, /萃取/) ? extractStages(s) : has(t2, /结晶|过饱和/) ? supersat(s) : has(t2, /流化/) ? fluidization(s) : mccabe(s),
  \u5DE5\u4E1A\u5DE5\u7A0B: (s, t2) => has(t2, /EOQ|库存/) ? eoq(s) : has(t2, /排队|M\/M/) ? mm1(s) : has(t2, /可靠/) ? reliability(s) : littleLaw(s),
  \u6838\u5DE5\u7A0B: (s, t2) => has(t2, /屏蔽/) ? shieldLaw(s) : has(t2, /衰变|链/) ? bateman(s) : has(t2, /扩散/) ? neutronDiffusion(s) : criticality(s),
  \u751F\u7269\u533B\u5B66\u5DE5\u7A0B: (s, t2) => has(t2, /Hodgkin|膜|动作电位/) ? membraneHHNote(s) : has(t2, /ECG|心电/) ? ecgPeriod(s) : has(t2, /呼吸/) ? respiratory(s) : has(t2, /药/) ? pkOneCompartment(s) : ecgPeriod(s),
  \u73AF\u5883\u5DE5\u7A0B: (s, t2) => has(t2, /氧|污泥|Monod/) ? asmSubstrate(s) : has(t2, /河|扩散/) ? riverDisp(s) : doBalance(s),
  \u7535\u6C14\u7535\u673A: (s, t2) => has(t2, /异步|转差/) ? slipMotor(s) : has(t2, /变压器/) ? transformer(s) : dcMotor(s),
  \u7535\u529B\u7CFB\u7EDF: (s, t2) => has(t2, /因数/) ? powerFactor(s) : has(t2, /MPPT|光伏/) ? mppt(s) : powerFactor(s),
  \u80FD\u6E90: (s, t2) => has(t2, /电池/) ? batteryOcv(s) : has(t2, /燃料电池/) ? fuelCellV(s) : has(t2, /光伏|MPPT/) ? mppt(s) : stefan(s),
  \u77FF\u4E1A\u51B6\u91D1: (s) => shell(s, {
    equation: "\u90A6\u5FB7\u529F\u6307\u6570\u793A\u610F\uFF1AE = W_i (10/\u221AP \u2212 10/\u221AF)",
    authority: "Bond \u7C89\u788E\u529F\u6307\u6570\u516C\u5F0F\uFF08\u9009\u77FF\u6559\u6750\uFF09",
    assumptions: "P\u3001F \u4E3A 80% \u901A\u8FC7\u7C92\u5F84 \u03BCm",
    fidelity: "principle",
    params: { Wi: 12, P: 100, F: 1e3 },
    schema: { Wi: S("W_i", "dynamics", "kWh/t", 5, 30), P: S("P", "dynamics", "\u03BCm", 10, 500), F: S("F", "dynamics", "\u03BCm", 100, 5e3) },
    tick(st) {
      st.E = P(st.params, "Wi", 12) * (10 / Math.sqrt(Math.max(1, P(st.params, "P", 100))) - 10 / Math.sqrt(Math.max(1, P(st.params, "F", 1e3))));
    },
    plot: (st) => st.E,
    rows: (st) => [["E", st.E, "kWh/t"]]
  }),
  \u7EBA\u7EC7\u98DF\u54C1: (s, t2) => has(t2, /干燥/) ? dryingPage(s) : has(t2, /纺|牵伸/) ? draftRatio(s) : draftRatio(s),
  \u519C\u4E1A\u8239\u8236\u6C7D\u8F66: (s, t2) => has(t2, /灌溉/) ? irrigation(s) : has(t2, /阻力/) ? shell(s, {
    equation: "\u6469\u64E6\u963B\u529B R = \xBD \u03C1 v\xB2 S C_f",
    authority: "\u8239\u8236\u963B\u529B\u7684\u4E8C\u6B21\u963B\u529B\u5B9A\u4E49",
    assumptions: "\u7ED9\u5B9A C_f",
    params: { v: 5, S: 20, Cf: 2e-3 },
    schema: { v: S("v", "dynamics", "m/s", 0, 20), S: S("S", "dynamics", "m\xB2", 1, 200), Cf: S("C_f", "dynamics", "\u2014", 5e-4, 0.01) },
    tick(st) {
      st.R = 0.5 * 1025 * P(st.params, "v", 5) ** 2 * P(st.params, "S", 20) * P(st.params, "Cf", 2e-3);
    },
    plot: (st) => st.R,
    rows: (st) => [["R", st.R, "N"]]
  }) : has(t2, /悬架/) ? isolation(s) : irrigation(s),
  \u94C1\u8DEF\u5EFA\u7B51\u6D4B\u7ED8\u5B89\u5168: (s) => shell(s, {
    equation: "\u5236\u52A8\u8DDD\u79BB\u8FD1\u4F3C s = v\xB2 / (2 a)",
    authority: "\u5300\u51CF\u901F\u8FD0\u52A8\u5B66",
    assumptions: "\u5E38\u51CF\u901F\u5EA6",
    params: { v: 20, a: 1 },
    schema: { v: S("v", "dynamics", "m/s", 0, 80), a: S("a", "dynamics", "m/s\xB2", 0.2, 4) },
    tick(st) {
      st.s = P(st.params, "v", 20) ** 2 / (2 * Math.max(0.05, P(st.params, "a", 1)));
    },
    plot: (st) => st.s,
    rows: (st) => [["s", st.s, "m"]]
  }),
  \u5FAE\u79EF\u5206: (s, t2) => derivativeLesson(s, t2),
  \u7EBF\u6027\u4EE3\u6570: (s, t2) => matrix2(s, t2),
  \u6982\u7387\u7EDF\u8BA1: (s, t2) => has(t2, /贝叶斯/) ? shell(s, {
    equation: "P(A|B)= P(B|A)P(A)/P(B)",
    authority: "Ross, \u8D1D\u53F6\u65AF\u516C\u5F0F",
    assumptions: "P(B)>0",
    params: { pba: 0.9, pa: 0.2, pb: 0.3 },
    schema: { pba: S("P(B|A)", "dynamics", "\u2014", 0, 1), pa: S("P(A)", "dynamics", "\u2014", 0, 1), pb: S("P(B)", "dynamics", "\u2014", 0.01, 1) },
    tick(st) {
      st.p = P(st.params, "pba", 0.9) * P(st.params, "pa", 0.2) / Math.max(1e-3, P(st.params, "pb", 0.3));
    },
    plot: (st) => st.p,
    rows: (st) => [["P(A|B)", st.p, ""]]
  }) : has(t2, /中心极限|大数/) ? shell(s, {
    equation: "se = \u03C3 / \u221An",
    authority: "Ross, \u6837\u672C\u5747\u503C\u6807\u51C6\u8BEF",
    assumptions: "\u72EC\u7ACB\u540C\u5206\u5E03\u3001\u6709\u9650\u65B9\u5DEE",
    params: { sigma: 2, n: 25 },
    schema: { sigma: S("\u03C3", "dynamics", "\u2014", 0.1, 10), n: S("n", "dynamics", "\u2014", 1, 400) },
    tick(st) {
      st.se = P(st.params, "sigma", 2) / Math.sqrt(Math.max(1, P(st.params, "n", 25)));
    },
    plot: (st) => st.se,
    rows: (st) => [["se", st.se, ""]]
  }) : normalPdf(s, t2),
  \u52A8\u529B\u7CFB\u7EDF: (s, t2) => has(t2, /极限/) ? vanderPol(s) : lyapunovNote(s),
  \u4F18\u5316\u56FE\u8BBA: (s, t2) => has(t2, /线性规划/) ? shell(s, {
    equation: "\u5728 x+y\u22641, x,y\u22650 \u4E0A z=c\u2081x+c\u2082y\uFF0C\u9876\u70B9\u6700\u4F18 z*=max(c\u2081,c\u2082)\uFF08\u9ED8\u8BA4 c\u2081=3, c\u2082=2\uFF09",
    authority: "Dantzig \u5355\u7EAF\u5F62\u6240\u4F9D\u636E\u7684\u9876\u70B9\u6700\u4F18\uFF08\u7EBF\u6027\u89C4\u5212\u57FA\u672C\u5B9A\u7406\uFF09",
    assumptions: "\u8BE5\u53EF\u884C\u57DF\u7684\u6700\u4F18\u503C\u5728\u9876\u70B9 (1,0) \u6216 (0,1)",
    params: { c1: 3, c2: 2 },
    schema: {
      c1: S("c\u2081", "dynamics", "\u2014", 0, 10),
      c2: S("c\u2082", "dynamics", "\u2014", 0, 10)
    },
    tick(st) {
      st.z = Math.max(P(st.params, "c1", 3), P(st.params, "c2", 2));
    },
    plot: (st) => st.z,
    rows: (st) => [["z*", st.z, ""]]
  }) : dijkstraBound(s),
  \u53CD\u5E94: (s, t2) => has(t2, /阿伦尼|活化/) ? arrhenius(s) : firstOrderReaction(s, t2),
  \u5E73\u8861\u4E0E\u7535\u5316\u5B66: (s, t2) => has(t2, /缓冲|pH|滴定/) ? has(t2, /滴定/) ? titration(s) : hhBuffer(s) : has(t2, /能斯特|电池|氧化还原/) ? nernst(s) : has(t2, /腐蚀/) ? corrosionRate(s) : has(t2, /燃料/) ? fuelCellV(s) : hhBuffer(s),
  \u7ED3\u6784\u4E0E\u5149\u8C31: (s) => beerLambert(s),
  \u751F\u6001\u751F\u7406: (s, t2) => has(t2, /Lotka|捕食/) ? lotka(s) : has(t2, /SIR|SEIR|传染/) ? sir(s, t2) : has(t2, /Logistic|种群/) ? logistic(s) : logistic(s),
  \u6C14\u5019: (s, t2) => has(t2, /温室/) ? greenhouse(s) : radiationBalance(s),
  \u5FAE\u89C2: (s, t2) => has(t2, /囚徒|博弈/) ? prisoner(s) : supplyDemand(s),
  \u91D1\u878D: (s, t2) => has(t2, /期权|Black|BS/) ? blackScholes(s) : compound(s)
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
function keywordModel(spec) {
  const blob = `${spec.id} ${spec.name} ${spec.formula || ""}`;
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
    [/E_n=-13\.6|玻尔/, () => bohr(spec)],
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
    [/视角因子/, () => viewFactor(spec)],
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
    gauge: () => malus(spec),
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
  const formula = String(spec.formula || "");
  if (formula.includes("\xB7")) {
    const prefix = formula.split("\xB7")[0].trim();
    const topic = formula.split("\xB7").slice(1).join("\xB7").trim();
    const fn = PREFIX[prefix];
    if (fn) return fn(spec, topic);
  }
  return keywordModel(spec) || familyFallback(spec);
}

// js/models/factory.js
function schemaNum(label, group, unit, min, max) {
  return { label, group, unit, min, max };
}
function baseMeta(spec) {
  return {
    id: spec.id,
    name: spec.name,
    tags: [spec.domain, spec.sub].filter(Boolean),
    formula: spec.formula || "",
    description: spec.description || "",
    sub: spec.sub || ""
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
function buildVariant(spec) {
  const dimList = Array.isArray(spec.dims) ? spec.dims : [];
  const defaults = spec.defaults && typeof spec.defaults === "object" ? spec.defaults : {};
  const params = { speed: 1, ...defaults };
  const paramSchema = {
    speed: schemaNum("\u52A8\u753B\u901F", "dynamics", "\u2014", 0.1, 8)
  };
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
  if (!dimList.length) {
    params.amplitude = params.amplitude ?? 1;
    params.offset = params.offset ?? 0.5;
    params.phase = params.phase ?? 0;
    paramSchema.amplitude = schemaNum("\u632F\u5E45", "dynamics", "\u2014", 0, 20);
    paramSchema.offset = schemaNum("\u504F\u7F6E", "dynamics", "\u2014", -10, 10);
    paramSchema.phase = schemaNum("\u76F8\u4F4D", "dynamics", "rad", -6.28, 6.28);
  }
  const axisLabels = Array.isArray(spec.axes) ? spec.axes : [];
  const keys = Object.keys(params).filter((k) => k !== "speed");
  return {
    ...baseMeta(spec),
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
    ...baseMeta(spec),
    params: inclined ? { g: 9.81, theta: 30, mu: 0.2, m: 1, s0: 0 } : { g: 9.81, m: 1, b: 0.8, h: 8 },
    paramSchema: inclined ? {
      g: schemaNum("g", "dynamics", "m/s\xB2", 0, 40),
      theta: schemaNum("\u03B8", "dynamics", "\xB0", 0, 80),
      mu: schemaNum("\u03BC", "dynamics", "\u2014", 0, 1),
      m: schemaNum("m", "dynamics", "kg", 0.01, 100),
      s0: schemaNum("s\u2080", "initial", "m", 0, 20)
    } : {
      g: schemaNum("g", "dynamics", "m/s\xB2", 0, 40),
      m: schemaNum("m", "dynamics", "kg", 0.01, 100),
      b: schemaNum("b", "dynamics", "kg/s", 0, 20),
      h: schemaNum("h\u2080", "initial", "m", 0, 40)
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
      state.trail.push(inclined ? state.s : state.y);
      if (state.trail.length > 240) state.trail.shift();
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
    ...baseMeta(spec),
    params: { q: 1, m: 1, Ex: 2, Ey: 0, vx0: 2, vy0: 3, x0: -2, y0: 0 },
    paramSchema: {
      q: schemaNum("q", "dynamics", "C", -5, 5),
      m: schemaNum("m", "dynamics", "kg", 0.01, 20),
      Ex: schemaNum("Ex", "dynamics", "N/C", -10, 10),
      Ey: schemaNum("Ey", "dynamics", "N/C", -10, 10),
      vx0: schemaNum("vx\u2080", "initial", "m/s", -20, 20),
      vy0: schemaNum("vy\u2080", "initial", "m/s", -20, 20),
      x0: schemaNum("x\u2080", "initial", "m", -5, 5),
      y0: schemaNum("y\u2080", "initial", "m", -5, 5)
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
      state.trail.push({ x: state.x, y: state.y });
      if (state.trail.length > 500) state.trail.shift();
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
    ...baseMeta(spec),
    params: { R: 2, omega: 1.5, m: 1 },
    paramSchema: {
      R: schemaNum("R", "dynamics", "m", 0.2, 8),
      omega: schemaNum("\u03C9", "dynamics", "rad/s", 0.1, 8),
      m: schemaNum("m", "dynamics", "kg", 0.01, 50)
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
      state.trail.push({ x: state.x, y: state.y });
      if (state.trail.length > 360) state.trail.shift();
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
    ...baseMeta(spec),
    params: { N: 40, T: 300, seed: 7, viscosity: 0.2, g: 2, e: 0.9 },
    paramSchema: {
      N: schemaNum("N", "numerics", "\u2014", 8, 120),
      T: schemaNum("T", "dynamics", "K", 50, 1e3),
      seed: schemaNum("seed", "initial", "\u2014", 1, 9999),
      viscosity: schemaNum("\u7C98\u5EA6", "dynamics", "\u2014", 0, 2),
      g: schemaNum("g", "dynamics", "m/s\xB2", 0, 20),
      e: schemaNum("e", "dynamics", "\u2014", 0, 1)
    },
    init(state) {
      const n = Math.max(4, Math.floor(P(state.params, "N", 40)));
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
        const n = state.parts.length;
        for (let i = 0; i < n; i += 1) {
          for (let j = i + 1; j < n; j += 1) {
            const a = state.parts[i];
            const b = state.parts[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 25e-4 && d2 > 1e-8) {
              const d = Math.sqrt(d2);
              const nx = dx / d;
              const ny = dy / d;
              const dv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (dv > 0) continue;
              a.vx -= dv * nx * 0.5 * (1 + e);
              a.vy -= dv * ny * 0.5 * (1 + e);
              b.vx += dv * nx * 0.5 * (1 + e);
              b.vy += dv * ny * 0.5 * (1 + e);
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
    ...baseMeta(spec),
    params: { G: 1.2, m1: 12, m2: 8, m3: 1, soft: 1.1, seed: 3 },
    paramSchema: {
      G: schemaNum("G", "dynamics", "\u2014", 0.1, 5),
      m1: schemaNum("m1", "dynamics", "\u2014", 0.1, 40),
      m2: schemaNum("m2", "dynamics", "\u2014", 0.1, 40),
      m3: schemaNum("m3", "dynamics", "\u2014", 0.01, 20),
      soft: schemaNum("soft", "numerics", "\u2014", 0.05, 2),
      seed: schemaNum("seed", "initial", "\u2014", 1, 99)
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
      const G = P(state.params, "G", 1.2);
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
          const inv = G / (r2 * Math.sqrt(r2));
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
    ...baseMeta(spec),
    params: { I1: 1, I2: 1.4, I3: 2, wx: 1.2, wy: 0.2, wz: 0.1 },
    paramSchema: {
      I1: schemaNum("I\u2081", "dynamics", "\u2014", 0.2, 5),
      I2: schemaNum("I\u2082", "dynamics", "\u2014", 0.2, 5),
      I3: schemaNum("I\u2083", "dynamics", "\u2014", 0.2, 5),
      wx: schemaNum("\u03C9x", "initial", "rad/s", -5, 5),
      wy: schemaNum("\u03C9y", "initial", "rad/s", -5, 5),
      wz: schemaNum("\u03C9z", "initial", "rad/s", -5, 5)
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
      state.trail.push({ x: state.wx, y: state.wy, z: state.wz });
      if (state.trail.length > 400) state.trail.shift();
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
    ...baseMeta(spec),
    params: { rhoObj: 700, rhoFluid: 1e3, V: 0.02, g: 9.81 },
    paramSchema: {
      rhoObj: schemaNum("\u03C1\u7269\u4F53", "dynamics", "kg/m\xB3", 100, 2e3),
      rhoFluid: schemaNum("\u03C1\u6DB2\u4F53", "dynamics", "kg/m\xB3", 200, 2e3),
      V: schemaNum("V", "dynamics", "m\xB3", 1e-3, 0.1),
      g: schemaNum("g", "dynamics", "m/s\xB2", 1, 40)
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
    ...baseMeta(spec),
    params: { Q: 2, D1: 1.2, D2: 0.6, mu: 0.05, rho: 1 },
    paramSchema: {
      Q: schemaNum("\u6D41\u91CF Q", "dynamics", "\u2014", 0.2, 8),
      D1: schemaNum("D\u2081", "dynamics", "\u2014", 0.3, 3),
      D2: schemaNum("D\u2082", "dynamics", "\u2014", 0.2, 2),
      mu: schemaNum("\u7C98\u5EA6 \u03BC", "dynamics", "\u2014", 1e-3, 1),
      rho: schemaNum("\u03C1", "dynamics", "\u2014", 0.2, 5)
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
    ...baseMeta(spec),
    params: { f: 1.2, A: 1, c: 1.5, L: 1, nMode: 2, barrierH: 4, barrierW: 0.15, E: 2 },
    paramSchema: {
      f: schemaNum("f", "dynamics", "Hz", 0.1, 8),
      A: schemaNum("A", "dynamics", "\u2014", 0.1, 3),
      c: schemaNum("c", "dynamics", "\u2014", 0.2, 5),
      L: schemaNum("L", "dynamics", "\u2014", 0.3, 3),
      nMode: schemaNum("mode n", "dynamics", "\u2014", 1, 6),
      barrierH: schemaNum("\u52BF\u5792\u9AD8", "dynamics", "\u2014", 0, 12),
      barrierW: schemaNum("\u52BF\u5792\u5BBD", "dynamics", "\u2014", 0.02, 0.5),
      E: schemaNum("E", "dynamics", "\u2014", 0.1, 10)
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
    ...baseMeta(spec),
    params: { f: 2, v: 1.2, vs: 0.6, c: 2 },
    paramSchema: {
      f: schemaNum("f", "dynamics", "Hz", 0.2, 8),
      vs: schemaNum("\u6E90\u901F", "dynamics", "\u2014", -2, 2),
      c: schemaNum("\u6CE2\u901F", "dynamics", "\u2014", 0.5, 5),
      v: schemaNum("\u89C2\u5BDF\u8005", "dynamics", "\u2014", -2, 2)
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
    ...baseMeta(spec),
    params: { f: 2, phase: 0, d: 0.25, lambda: 0.18, slit: 0.12 },
    paramSchema: {
      f: schemaNum("f", "dynamics", "Hz", 0.2, 8),
      phase: schemaNum("\u0394\u03C6", "dynamics", "rad", -3.14, 3.14),
      d: schemaNum("\u95F4\u8DDD d", "dynamics", "\u2014", 0.05, 0.6),
      lambda: schemaNum("\u03BB", "dynamics", "\u2014", 0.05, 0.5),
      slit: schemaNum("\u7F1D\u5BBD", "dynamics", "\u2014", 0.02, 0.4)
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
      const cols = 64;
      const rows = 40;
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
    ...baseMeta(spec),
    params: { alpha: 0.15, n: 24, tension: 1, excite: 0.5 },
    paramSchema: {
      alpha: schemaNum("\u03B1", "dynamics", "\u2014", 0.01, 0.5),
      n: schemaNum("n", "numerics", "\u2014", 12, 48),
      tension: schemaNum("\u5F20\u529B", "dynamics", "\u2014", 0.2, 4),
      excite: schemaNum("\u6FC0\u52B1", "initial", "\u2014", 0, 1)
    },
    init(state) {
      const n = Math.max(8, Math.floor(P(state.params, "n", 24)));
      state.n = n;
      state.u = new Float64Array(n * n);
      state.v = new Float64Array(n * n);
      const ex = Math.floor(P(state.params, "excite", 0.5) * (n - 1));
      state.u[ex * n + Math.floor(n / 2)] = 1;
      state.t = 0;
    },
    step(state, dt) {
      const n = state.n;
      const a = P(state.params, "alpha", 0.15) * P(state.params, "tension", 1);
      const next = new Float64Array(n * n);
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
      state.u = next;
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
    ...baseMeta(spec),
    params: { T: 300, V: 1, n: 1, R: 0.082 },
    paramSchema: {
      T: schemaNum("T", "dynamics", "K", 100, 800),
      V: schemaNum("V", "dynamics", "L", 0.2, 5),
      n: schemaNum("n", "dynamics", "mol", 0.1, 5),
      R: schemaNum("R", "dynamics", "\u2014", 0.05, 0.2)
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
    ...baseMeta(spec),
    params: { Th: 500, Tc: 300, phaseSpeed: 0.4, sHot: 0.72, sCold: 0.28 },
    paramSchema: {
      Th: schemaNum("Th", "dynamics", "K", 250, 900),
      Tc: schemaNum("Tc", "dynamics", "K", 100, 600),
      phaseSpeed: schemaNum("\u901F\u7387", "dynamics", "\u2014", 0.05, 2),
      sHot: schemaNum("s_hot", "dynamics", "\u2014", 0.15, 0.9),
      sCold: schemaNum("s_cold", "dynamics", "\u2014", 0.1, 0.85)
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
    ...baseMeta(spec),
    params: { q1: 1, q2: -1, x1: -1.2, x2: 1.2 },
    paramSchema: {
      q1: schemaNum("q1", "dynamics", "C", -5, 5),
      q2: schemaNum("q2", "dynamics", "C", -5, 5),
      x1: schemaNum("x1", "initial", "\u2014", -3, 3),
      x2: schemaNum("x2", "initial", "\u2014", -3, 3)
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
    ...baseMeta(spec),
    params: rl ? { R: 10, L: 0.5, Vin: 5, I0: 0 } : { V: 5, R: 100, series: 1 },
    paramSchema: rl ? {
      R: schemaNum("R", "dynamics", "\u03A9", 1, 200),
      L: schemaNum("L", "dynamics", "H", 0.01, 5),
      Vin: schemaNum("Vin", "dynamics", "V", 0, 20),
      I0: schemaNum("I\u2080", "initial", "A", -5, 5)
    } : {
      V: schemaNum("V", "dynamics", "V", 0, 24),
      R: schemaNum("R", "dynamics", "\u03A9", 1, 1e3),
      series: schemaNum("\u4E32/\u5E76 1/0", "dynamics", "\u2014", 0, 1)
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
    ...baseMeta(spec),
    params: { v: 1.2, N: 40, B: 0.8 },
    paramSchema: {
      v: schemaNum("\u78C1\u94C1\u901F\u5EA6", "dynamics", "\u2014", 0.1, 5),
      N: schemaNum("\u531D\u6570", "dynamics", "\u2014", 1, 200),
      B: schemaNum("B", "dynamics", "T", 0.05, 3)
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
    ...baseMeta(spec),
    capabilities: spec.id === "lens" ? { pointer: true, interaction: "canvas", hint: "\u62D6\u7269\u6216\u62D6\u50CF\uFF1A\u50CF\u4FA7\u53CD\u63A8\u7269\u8DDD\uFF08\u53CC\u5411\u8054\u52A8\uFF09\uFF1B\u865A\u50CF\u865A\u7EBF" } : { interaction: "knobs", hint: "\u8C03\u8282\u5165\u5C04\u89D2\u4E0E\u6298\u5C04\u7387" },
    params: { theta: 35, n1: 1, n2: 1.5, u: 4, f: 2, h: 1.2, scale: 28 },
    paramSchema: {
      theta: schemaNum("\u5165\u5C04\u89D2", "dynamics", "\xB0", 0, 89),
      n1: schemaNum("n\u2081", "dynamics", "\u2014", 1, 3),
      n2: schemaNum("n\u2082", "dynamics", "\u2014", 1, 3),
      u: schemaNum("\u7269\u8DDD u", "dynamics", "\u2014", 0.2, 30),
      f: schemaNum("\u7126\u8DDD f", "dynamics", "\u2014", 0.2, 20),
      h: schemaNum("\u7269\u9AD8 h", "dynamics", "\u2014", 0.05, 8),
      scale: schemaNum("\u663E\u793A\u6BD4\u4F8B", "dynamics", "\u2014", 8, 60)
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
        freq: schemaNum("\u9891\u7387 f", "dynamics", "Hz", 0.1, 20),
        intensity: schemaNum("\u5149\u5F3A", "dynamics", "\u2014", 0, 10),
        workFunc: schemaNum("\u9038\u51FA\u529F W", "dynamics", "eV", 0.1, 10),
        speed: schemaNum("\u52A8\u753B\u901F", "dynamics", "\u2014", 0.1, 4)
      },
      step(state, dt) {
        state.t += dt * P(state.params, "speed", 1);
        state.val = Math.max(0, P(state.params, "freq", 2.2) - P(state.params, "workFunc", 1.5)) * P(state.params, "intensity", 1);
      }
    },
    "time-dilation": {
      params: { beta: 0.6, properTime: 1, speed: 1 },
      schema: {
        beta: schemaNum("\u03B2=v/c", "dynamics", "\u2014", 0, 0.999),
        properTime: schemaNum("\u56FA\u6709\u65F6 \u0394\u03C4", "dynamics", "s", 0.1, 100),
        speed: schemaNum("\u52A8\u753B\u901F", "dynamics", "\u2014", 0.1, 4)
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
        angle: schemaNum("\u504F\u632F\u89D2", "dynamics", "\xB0", 0, 180),
        plates: schemaNum("\u504F\u632F\u7247\u6570", "dynamics", "\u2014", 1, 6),
        I0: schemaNum("\u5165\u5C04\u5149\u5F3A", "dynamics", "\u2014", 0, 10),
        speed: schemaNum("\u52A8\u753B\u901F", "dynamics", "\u2014", 0.1, 4)
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
  return {
    ...baseMeta(spec),
    params: preset?.params || { amplitude: 1, offset: 0.5, phase: 0, speed: 1 },
    paramSchema: preset?.schema || {
      amplitude: schemaNum("\u632F\u5E45", "dynamics", "\u2014", 0, 20),
      offset: schemaNum("\u504F\u7F6E", "dynamics", "\u2014", -10, 10),
      phase: schemaNum("\u76F8\u4F4D", "dynamics", "rad", -6.28, 6.28),
      speed: schemaNum("\u52A8\u753B\u901F", "dynamics", "\u2014", 0.1, 8)
    },
    init(state) {
      state.t = 0;
      state.val = 0;
      state.hist = [];
    },
    step(state, dt) {
      if (preset?.step) {
        preset.step(state, dt);
      } else {
        state.t += dt * P(state.params, "speed", 1);
        state.val = P(state.params, "amplitude", 1) * Math.sin(state.t + P(state.params, "phase", 0)) + P(state.params, "offset", 0.5);
      }
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
      return [
        { label: "t", value: `${formatNum(state.t, d)} s` },
        { label: "val", value: formatNum(state.val, d) }
      ];
    },
    getTrajectory(state) {
      return state.hist.map((v, i) => ({ i, v }));
    }
  };
}
function buildBohr(spec) {
  return {
    ...baseMeta(spec),
    params: { n: 3, n2: 2 },
    paramSchema: {
      n: schemaNum("n\u4E0A", "dynamics", "\u2014", 1, 8),
      n2: schemaNum("n\u4E0B", "dynamics", "\u2014", 1, 7)
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
    ...baseMeta(spec),
    params: { halfLife: 4, N0: 200 },
    paramSchema: {
      halfLife: schemaNum("\u534A\u8870\u671F", "dynamics", "s", 0.5, 30),
      N0: schemaNum("N\u2080", "initial", "\u2014", 10, 500)
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
    ...baseMeta(spec),
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
      n: schemaNum("n", "numerics", "\u2014", 4, 48),
      target: schemaNum("\u76EE\u6807", "dynamics", "\u2014", 0, 64),
      seed: schemaNum("seed", "initial", "\u2014", 1, 999),
      stepDt: schemaNum("stepDt", "dynamics", "s", 0.02, 0.5),
      algo: {
        group: "dynamics",
        unit: "",
        label: "algo",
        min: 0,
        max: 3,
        options: spec.id === "binary-search" ? [{ value: 0, label: "binary" }] : [{ value: 0, label: "mode A" }, { value: 1, label: "mode B" }]
      },
      capacity: schemaNum("\u5BB9\u91CF", "dynamics", "\u2014", 2, 32),
      capacityKnapsack: schemaNum("\u80CC\u5305\u5BB9\u91CF", "dynamics", "\u2014", 2, 40)
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
    ...baseMeta(spec),
    params: { nodes: 8, seed: 5, start: 0, goal: 7, stepDt: 0.15, algo: 0, layoutSteps: 40 },
    paramSchema: {
      nodes: schemaNum("\u8282\u70B9\u6570", "numerics", "\u2014", 4, 16),
      seed: schemaNum("\u968F\u673A\u79CD\u5B50", "initial", "\u2014", 1, 99),
      start: schemaNum("\u8D77\u70B9", "initial", "\u2014", 0, 15),
      goal: schemaNum("\u7EC8\u70B9", "initial", "\u2014", 0, 15),
      stepDt: schemaNum("\u6B65\u8FDB\u95F4\u9694", "dynamics", "s", 0.05, 0.5),
      layoutSteps: schemaNum("\u529B\u5BFC\u5411\u6B65\u6570", "numerics", "\u2014", 0, 120),
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
    ...baseMeta(spec),
    params: { seed: 4, n: 12, stepDt: 0.2 },
    paramSchema: {
      seed: schemaNum("seed", "initial", "\u2014", 1, 99),
      n: schemaNum("n", "numerics", "\u2014", 4, 24),
      stepDt: schemaNum("stepDt", "dynamics", "s", 0.05, 0.6)
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
    ...baseMeta(spec),
    params: { input: 10110, stepDt: 0.35 },
    paramSchema: {
      input: schemaNum("\u8F93\u5165\u4E32(\u5341\u8FDB\u5236\u793A\u610F)", "initial", "\u2014", 0, 111111),
      stepDt: schemaNum("stepDt", "dynamics", "s", 0.1, 1)
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
    ...baseMeta(spec),
    params: { tape: 1001101, stepDt: 0.25 },
    paramSchema: {
      tape: schemaNum("\u7EB8\u5E26\u521D\u503C", "initial", "\u2014", 0, 11111111),
      stepDt: schemaNum("stepDt", "dynamics", "s", 0.05, 1)
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
    ...baseMeta(spec),
    params: { key: 3, p: 17, q: 11, e: 7, msg: 42, g: 3 },
    paramSchema: {
      key: schemaNum("key", "dynamics", "\u2014", 0, 25),
      p: schemaNum("p", "dynamics", "\u2014", 5, 97),
      q: schemaNum("q", "dynamics", "\u2014", 5, 97),
      e: schemaNum("e", "dynamics", "\u2014", 3, 40),
      msg: schemaNum("msg", "initial", "\u2014", 0, 200),
      g: schemaNum("g", "dynamics", "\u2014", 2, 20)
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
    ...baseMeta(spec),
    params: { lr: 0.05, k: 3, seed: 2, steps: 1 },
    paramSchema: {
      lr: schemaNum("\u5B66\u4E60\u7387", "dynamics", "\u2014", 1e-3, 1),
      k: schemaNum("k/\u5BBD\u5EA6", "dynamics", "\u2014", 1, 8),
      seed: schemaNum("seed", "initial", "\u2014", 1, 99),
      steps: schemaNum("\u6BCF\u5E27\u6B65\u6570", "dynamics", "\u2014", 1, 20)
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
    ...baseMeta(spec),
    params: { pop: 20, mutate: 0.1, temp: 5, cool: 0.98, ants: 12, evaporate: 0.1, seed: 1 },
    paramSchema: {
      pop: schemaNum("\u79CD\u7FA4", "dynamics", "\u2014", 4, 60),
      mutate: schemaNum("\u53D8\u5F02\u7387", "dynamics", "\u2014", 0, 1),
      temp: schemaNum("\u6E29\u5EA6", "dynamics", "\u2014", 0.1, 20),
      cool: schemaNum("\u964D\u6E29", "dynamics", "\u2014", 0.8, 0.999),
      ants: schemaNum("\u8682\u8681\u6570", "dynamics", "\u2014", 2, 40),
      evaporate: schemaNum("\u6325\u53D1", "dynamics", "\u2014", 0.01, 0.5),
      seed: schemaNum("seed", "initial", "\u2014", 1, 99)
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
      return state.hist.map((E, i) => ({ i, E }));
    }
  };
}
function buildLogic(spec) {
  return {
    ...baseMeta(spec),
    params: { a: 1, b: 0, clk: 1, mode: 0 },
    paramSchema: {
      a: schemaNum("A", "dynamics", "\u2014", 0, 1),
      b: schemaNum("B", "dynamics", "\u2014", 0, 1),
      clk: schemaNum("CLK", "dynamics", "\u2014", 0, 1),
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
    ...baseMeta(spec),
    params: { pc: 0, stepDt: 0.3, pages: 8, cacheLines: 4 },
    paramSchema: {
      pc: schemaNum("PC", "initial", "\u2014", 0, 32),
      stepDt: schemaNum("stepDt", "dynamics", "s", 0.05, 1),
      pages: schemaNum("\u9875\u6570", "numerics", "\u2014", 2, 32),
      cacheLines: schemaNum("cache\u884C", "numerics", "\u2014", 2, 16)
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
    ...baseMeta(spec),
    params: { duty: 0.4, freq: 2, bits: 4, rate: 8 },
    paramSchema: {
      duty: schemaNum("\u5360\u7A7A\u6BD4", "dynamics", "\u2014", 0.05, 0.95),
      freq: schemaNum("\u9891\u7387", "dynamics", "Hz", 0.2, 10),
      bits: schemaNum("\u4F4D\u6570", "dynamics", "\u2014", 2, 12),
      rate: schemaNum("\u91C7\u6837\u7387", "dynamics", "Hz", 1, 40)
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
    ...baseMeta(spec),
    params: { fc: 8, fm: 1, beta: 1.5, data: 181, errBit: 3 },
    paramSchema: {
      fc: schemaNum("\u8F7D\u6CE2 f", "dynamics", "Hz", 1, 20),
      fm: schemaNum("\u8C03\u5236 f", "dynamics", "Hz", 0.2, 5),
      beta: schemaNum("\u8C03\u5236\u6307\u6570", "dynamics", "\u2014", 0.1, 5),
      data: schemaNum("\u6570\u636E", "initial", "\u2014", 0, 255),
      errBit: schemaNum("\u9519\u8BEF\u4F4D", "dynamics", "\u2014", 0, 15)
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
    ...baseMeta(spec),
    params: { loss: 0.1, delay: 0.2, stepDt: 0.35 },
    paramSchema: {
      loss: schemaNum("\u4E22\u5305\u7387", "dynamics", "\u2014", 0, 0.8),
      delay: schemaNum("\u5EF6\u8FDF", "dynamics", "s", 0, 2),
      stepDt: schemaNum("stepDt", "dynamics", "s", 0.1, 1)
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
    ...baseMeta(spec),
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
      quantum: schemaNum("\u65F6\u95F4\u7247", "dynamics", "\u2014", 1, 10),
      n: schemaNum("\u8FDB\u7A0B\u6570", "numerics", "\u2014", 2, 8),
      seed: schemaNum("seed", "initial", "\u2014", 1, 99)
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
    ...baseMeta(spec),
    params: { src: 0, stepDt: 0.25 },
    paramSchema: {
      src: schemaNum("\u6837\u4F8B\u6E90\u7801#", "initial", "\u2014", 0, 3),
      stepDt: schemaNum("stepDt", "dynamics", "s", 0.05, 1)
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
    ...baseMeta(spec),
    params: { nodes: 5, partition: 0, shards: 4, stepDt: 0.3 },
    paramSchema: {
      nodes: schemaNum("\u8282\u70B9\u6570", "numerics", "\u2014", 3, 9),
      partition: schemaNum("\u5206\u533A", "dynamics", "\u2014", 0, 1),
      shards: schemaNum("\u5206\u7247", "numerics", "\u2014", 1, 12),
      stepDt: schemaNum("stepDt", "dynamics", "s", 0.1, 1)
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
    ...baseMeta(spec),
    params: { load: 10, span: 6, EI: 1, pos: 0.5, shape: 1 },
    paramSchema: {
      load: schemaNum("\u8F7D\u8377 P", "dynamics", "kN", 0, 100),
      span: schemaNum("\u8DE8\u5EA6 L", "dynamics", "m", 1, 40),
      EI: schemaNum("EI", "dynamics", "\u2014", 0.1, 50),
      pos: schemaNum("\u8F7D\u8377\u4F4D\u7F6E", "dynamics", "\u2014", 0.05, 0.95),
      shape: schemaNum("\u622A\u9762\u7CFB\u6570", "dynamics", "\u2014", 0.2, 5)
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
    ...baseMeta(spec),
    params: { K: 1, zeta: 0.4, wn: 2, Kp: 1.2, Ki: 0.4, Kd: 0.08, speed: 1 },
    paramSchema: {
      K: schemaNum("K", "dynamics", "\u2014", 0.1, 10),
      zeta: schemaNum("\u03B6", "dynamics", "\u2014", 0.05, 2),
      wn: schemaNum("\u03C9\u2099", "dynamics", "rad/s", 0.2, 20),
      Kp: schemaNum("Kp", "dynamics", "\u2014", 0, 20),
      Ki: schemaNum("Ki", "dynamics", "\u2014", 0, 20),
      Kd: schemaNum("Kd", "dynamics", "\u2014", 0, 5),
      speed: schemaNum("\u52A8\u753B\u901F", "dynamics", "\u2014", 0.2, 4)
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
    ...baseMeta(spec),
    params: isMandel ? { iter: 40, cx: -0.7, cy: 0.27, zoom: 1.2 } : { sigma: 10, rho: 28, beta: 2.67, a: 0.2, b: 0.2, c: 5.7, speed: 1, proj: 0 },
    paramSchema: isMandel ? {
      iter: schemaNum("\u8FED\u4EE3", "numerics", "\u2014", 10, 120),
      cx: schemaNum("c\u1D63", "dynamics", "\u2014", -2, 1),
      cy: schemaNum("c\u1D62", "dynamics", "\u2014", -1.5, 1.5),
      zoom: schemaNum("\u7F29\u653E", "dynamics", "\u2014", 0.3, 8)
    } : {
      sigma: schemaNum("\u03C3", "dynamics", "\u2014", 1, 30),
      rho: schemaNum("\u03C1", "dynamics", "\u2014", 1, 50),
      beta: schemaNum("\u03B2", "dynamics", "\u2014", 0.5, 8),
      a: schemaNum("a", "dynamics", "\u2014", 0.05, 1),
      b: schemaNum("b", "dynamics", "\u2014", 0.05, 1),
      c: schemaNum("c", "dynamics", "\u2014", 1, 20),
      speed: schemaNum("\u52A8\u753B\u901F", "dynamics", "\u2014", 0.2, 4),
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
      state.trail = [];
      state.frame = 0;
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
      state.trail.push({ x: state.x, y: state.y, z: state.z });
      if (state.trail.length > 1400) state.trail.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      if (isMandel) {
        const iterMax = Math.floor(P(state.params, "iter", 40));
        const zoom = P(state.params, "zoom", 1.2);
        const cx0 = P(state.params, "cx", -0.7);
        const cy0 = P(state.params, "cy", 0.27);
        const step = 3;
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
            ctx.fillStyle = n >= iterMax ? "#111" : heatTempColor(n, 0, iterMax);
            ctx.fillRect(px, py, step, step);
          }
        }
        return;
      }
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
      state.trail.forEach((p, i) => {
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
      ctx.stroke();
      if (state.trail.length) {
        const p = state.trail[state.trail.length - 1];
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
    ...baseMeta(spec),
    params: { density: 0.25, pSlow: 0.2, vmax: 5, green: 0.55, cycle: 30, seed: 7 },
    paramSchema: {
      density: schemaNum("\u5BC6\u5EA6", "dynamics", "\u2014", 0.05, 0.9),
      pSlow: schemaNum("\u968F\u673A\u6162\u5316", "dynamics", "\u2014", 0, 0.8),
      vmax: schemaNum("vmax", "dynamics", "\u2014", 1, 8),
      green: schemaNum("\u7EFF\u4FE1\u6BD4", "dynamics", "\u2014", 0.2, 0.9),
      cycle: schemaNum("\u5468\u671F", "dynamics", "s", 10, 90),
      seed: schemaNum("seed", "initial", "\u2014", 1, 9999)
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
    ...baseMeta(spec),
    params: { tau: 2, k: 0.8, order: 1, cin: 1, T: 350, P: 1, reflux: 1.5, z: 0.5 },
    paramSchema: {
      tau: schemaNum("\u505C\u7559 \u03C4", "dynamics", "s", 0.2, 20),
      k: schemaNum("\u901F\u7387 k", "dynamics", "1/s", 0, 5),
      order: schemaNum("\u7EA7\u6570", "dynamics", "\u2014", 1, 2),
      cin: schemaNum("\u8FDB\u6599 c\u1D62\u2099", "dynamics", "\u2014", 0, 5),
      T: schemaNum("T", "dynamics", "K", 250, 600),
      P: schemaNum("P", "dynamics", "bar", 0.2, 20),
      reflux: schemaNum("\u56DE\u6D41\u6BD4", "dynamics", "\u2014", 0.5, 8),
      z: schemaNum("\u8FDB\u6599\u7EC4\u6210", "dynamics", "\u2014", 0.05, 0.95)
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
    ...baseMeta(spec),
    params: { alpha: 5, AR: 8, sweep: 20, camber: 0.04, Re: 1e6, thrust: 1.2, mass: 1 },
    paramSchema: {
      alpha: schemaNum("\u653B\u89D2 \u03B1", "dynamics", "\xB0", -5, 25),
      AR: schemaNum("\u5C55\u5F26\u6BD4", "dynamics", "\u2014", 2, 20),
      sweep: schemaNum("\u540E\u63A0\u89D2", "dynamics", "\xB0", 0, 45),
      camber: schemaNum("\u5F2F\u5EA6", "dynamics", "\u2014", 0, 0.15),
      Re: schemaNum("Re/10\u2076", "dynamics", "\u2014", 0.1, 10),
      thrust: schemaNum("\u63A8\u529B", "dynamics", "\u2014", 0.2, 5),
      mass: schemaNum("\u8D28\u91CF", "dynamics", "\u2014", 0.2, 10)
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
        state.trail.push({ x: state.x, y: state.y });
        if (state.trail.length > 200) state.trail.shift();
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
