import {
  velocityVerlet1D
} from "./chunk-chunk-CSLFYDCB.js";
import {
  forceGraphStep,
  mapNormToScreen,
  paintGraph
} from "./chunk-chunk-O2CR3FKE.js";
import {
  C,
  P,
  accelExtras,
  drawArrow,
  drawZigZagSpring,
  finiteOr,
  formatNum,
  heatTempColor,
  phaseHueColor,
  springK
} from "./chunk-chunk-RJLELWJ4.js";
import {
  DEFAULT_PARAMS,
  EYEPIECES,
  OBJECTIVES,
  PARAM_SCHEMA,
  applyTurretDefaults,
  opticsFromParams
} from "./chunk-chunk-EW7TY4D2.js";
import {
  mobileBudget,
  perfClassFor
} from "./chunk-chunk-6F5B3IST.js";

// js/models/projectile.js
var projectile_default = {
  id: "projectile",
  name: "\u659C\u629B\u8FD0\u52A8",
  capabilities: {
    pointer: true,
    interaction: "canvas",
    formalism: "ode",
    viz: "phet-particle",
    fidelity: "principle",
    hint: "\u62D6\u7403\u653E\u7F6E\uFF1B\u62D6\u5C16\u7AEF\u6539 v\u2080/\u03B8\uFF1B\u5DE5\u5177\u6761\u300C\u518D\u53D1\u5C04\u300D",
    actions: [
      { id: "launch", label: "\u518D\u53D1\u5C04", resume: true }
    ]
  },
  params: {
    v0: 20,
    theta: 45,
    g: 9.81,
    k: 0,
    m: 1,
    dragExp: 1,
    windX: 0,
    windY: 0,
    showTheory: true,
    resumeOnLaunch: 1,
    pauseOnLand: 1
  },
  paramSchema: {
    v0: { group: "initial", unit: "m/s", label: "v\u2080", min: 0, max: 500 },
    theta: { group: "initial", unit: "\xB0", label: "\u03B8", min: 0, max: 90 },
    g: { group: "dynamics", unit: "m/s\xB2", label: "g", min: 0, max: 200 },
    k: { group: "dynamics", unit: "kg/s", label: "\u963B\u529B k", min: 0, max: 5e3 },
    m: { group: "dynamics", unit: "kg", label: "m", min: 1e-6, max: 1e6 },
    dragExp: { group: "dynamics", unit: "\u2014", label: "\u963B\u529B\u6307\u6570", min: 0.5, max: 3 },
    windX: { group: "dynamics", unit: "m/s\xB2", label: "\u98CE\u573A ax", min: -50, max: 50 },
    windY: { group: "dynamics", unit: "m/s\xB2", label: "\u98CE\u573A ay", min: -50, max: 50 },
    showTheory: { group: "display", label: "\u7406\u8BBA\u629B\u7269\u7EBF" },
    resumeOnLaunch: {
      group: "display",
      unit: "\u2014",
      label: "\u518D\u53D1\u5C04\u540E\u7EE7\u7EED",
      min: 0,
      max: 1,
      options: [
        { value: 1, label: "\u53D6\u6D88\u6682\u505C" },
        { value: 0, label: "\u4FDD\u6301\u6682\u505C" }
      ]
    },
    pauseOnLand: {
      group: "display",
      unit: "\u2014",
      label: "\u843D\u5730\u540E\u6682\u505C",
      min: 0,
      max: 1,
      options: [
        { value: 1, label: "\u81EA\u52A8\u6682\u505C" },
        { value: 0, label: "\u7EE7\u7EED\u8D70\u8868" }
      ]
    }
  },
  runAction(state, actionId) {
    if (actionId !== "launch") return false;
    const th = P(state.params, "theta", 45) * Math.PI / 180;
    const v0 = P(state.params, "v0", 20);
    state.vx = v0 * Math.cos(th);
    state.vy = v0 * Math.sin(th);
    state.t = 0;
    state.landed = false;
    state.range = 0;
    state.maxY = Math.max(0, state.y);
    state.trail = [{ t: 0, x: state.x, y: state.y }];
    state._resumeApp = Math.round(P(state.params, "resumeOnLaunch", 1)) === 1;
    return true;
  },
  init(state) {
    const p = state.params;
    const th = P(p, "theta", 45) * Math.PI / 180;
    const v0 = P(p, "v0", 0);
    state.t = 0;
    state.x = 0;
    state.y = 0;
    state.vx = v0 * Math.cos(th);
    state.vy = v0 * Math.sin(th);
    state.maxY = 0;
    state.range = 0;
    state.landed = false;
    state.trail = [{ t: 0, x: 0, y: 0 }];
  },
  step(state, dt) {
    if (state.landed) return;
    const g = P(state.params, "g", 9.81);
    const k = P(state.params, "k", 0);
    const m = Math.max(P(state.params, "m", 1), 1e-9);
    const exp = Math.max(P(state.params, "dragExp", 1), 0.5);
    const windX = P(state.params, "windX", 0);
    const windY = P(state.params, "windY", 0);
    const locals = { x: state.x, y: state.y, vx: state.vx, vy: state.vy, t: state.t, g, k, m };
    const speed = Math.hypot(state.vx, state.vy);
    const dragMag = k === 0 ? 0 : k / m * speed ** (exp - 1);
    const ax = -dragMag * state.vx + windX + accelExtras(state.params, { ...locals, axis: 0 });
    const ay = -g - dragMag * state.vy + windY + accelExtras(state.params, locals);
    state.vx = finiteOr(state.vx + ax * dt, 0);
    state.vy = finiteOr(state.vy + ay * dt, 0);
    state.x = finiteOr(state.x + state.vx * dt, state.x);
    state.y = finiteOr(state.y + state.vy * dt, state.y);
    state.t += dt;
    if (state.y > state.maxY) state.maxY = state.y;
    state.trail.push({ t: state.t, x: state.x, y: state.y });
    if (state.trail.length > 800) state.trail.shift();
    if (state.y < 0 && state.t > 0.05) {
      state.y = 0;
      state.range = state.x;
      state.landed = true;
      state.vx = 0;
      state.vy = 0;
      if (Math.round(P(state.params, "pauseOnLand", 1)) === 1) {
        state._pauseApp = true;
      }
    }
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const p = state.params;
    const th = P(p, "theta", 45) * Math.PI / 180;
    const v0 = P(p, "v0", 1);
    const g = Math.max(P(p, "g", 9.81), 1e-9);
    const R = v0 * v0 * Math.sin(2 * th) / g || 1;
    const Hmax = v0 * v0 * Math.sin(th) ** 2 / (2 * g) || 1;
    const worldW = Math.max(R * 1.15, state.x * 1.1, 5);
    const worldH = Math.max(Hmax * 1.25, state.maxY * 1.2, 2);
    const margin = { l: 50, r: 30, t: 30, b: 45 };
    const sx = (W - margin.l - margin.r) / worldW;
    const sy = (H - margin.t - margin.b) / worldH;
    const ox = margin.l;
    const oy = H - margin.b;
    const X = (x) => ox + x * sx;
    const Y = (y) => oy - y * sy;
    if (view.showAxes !== false) {
      ctx.strokeStyle = C.ground;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(W - margin.r, oy);
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox, margin.t);
      ctx.stroke();
    }
    if (p.showTheory) {
      const Tflight = 2 * v0 * Math.sin(th) / g;
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = C.theory || "#7c9cbf";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i <= 80; i += 1) {
        const t = Tflight * i / 80;
        const x = v0 * Math.cos(th) * t;
        const y = v0 * Math.sin(th) * t - 0.5 * g * t * t;
        if (y < 0) break;
        if (i === 0) ctx.moveTo(X(x), Y(y));
        else ctx.lineTo(X(x), Y(y));
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.theory || C.muted;
      ctx.font = "11px IBM Plex Mono, monospace";
      ctx.fillText("\u865A\u7EBF=\u65E0\u963B\u529B\u89E3\u6790\u89E3\uFF08\u7070\u84DD\uFF09", ox + 8, margin.t + 4);
    }
    if (view.showTrail !== false) {
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      state.trail.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(X(pt.x), Y(pt.y));
        else ctx.lineTo(X(pt.x), Y(pt.y));
      });
      ctx.stroke();
    }
    const bx = X(state.x);
    const by = Y(state.y);
    const tipScale = 2.2;
    const tipX = X(0) + (state.landed || state.t < 0.02 ? v0 * Math.cos(th) * tipScale * sx : state.vx * tipScale * sx);
    const tipY = Y(0) - (state.landed || state.t < 0.02 ? v0 * Math.sin(th) * tipScale * sy : state.vy * tipScale * sy);
    const originX = X(state.t < 0.05 ? 0 : state.x);
    const originY = Y(state.t < 0.05 ? 0 : state.y);
    const launchTipX = state.t < 0.05 ? tipX : bx + state.vx * tipScale * sx;
    const launchTipY = state.t < 0.05 ? tipY : by - state.vy * tipScale * sy;
    state._proj = {
      X,
      Y,
      sx,
      sy,
      ox,
      oy,
      tipScale,
      ball: { x: bx, y: by, r: 14 },
      tip: { x: launchTipX, y: launchTipY, r: 12 },
      origin: { x: state.t < 0.05 ? ox : bx, y: state.t < 0.05 ? oy : by }
    };
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(state._proj.origin.x, state._proj.origin.y);
    ctx.lineTo(launchTipX, launchTipY);
    ctx.stroke();
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(launchTipX, launchTipY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.body;
    ctx.beginPath();
    ctx.arc(bx, by, 10, 0, Math.PI * 2);
    ctx.fill();
    if (state._drag === "ball" || state._drag === "tip") {
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (view.showVectors !== false) {
      const vs = 3;
      drawArrow(ctx, bx, by, bx + state.vx * vs, by, C.vector, 2);
      drawArrow(ctx, bx, by, bx, by - state.vy * vs, C.accent, 2);
      drawArrow(ctx, bx, by, bx + state.vx * vs, by - state.vy * vs, C.body, 2);
    }
  },
  onPointer(state, ev) {
    const g = state._proj;
    if (!g) return false;
    if (ev.type === "down") {
      const tip = g.tip;
      if ((ev.x - tip.x) ** 2 + (ev.y - tip.y) ** 2 <= tip.r * tip.r) {
        state._drag = "tip";
        return true;
      }
      const b = g.ball;
      if ((ev.x - b.x) ** 2 + (ev.y - b.y) ** 2 <= b.r * b.r) {
        state._drag = "ball";
        return true;
      }
      return false;
    }
    if (ev.type === "move" && state._drag === "tip") {
      const ox = g.origin.x;
      const oy = g.origin.y;
      const dx = (ev.x - ox) / Math.max(g.sx * g.tipScale, 1e-6);
      const dy = (oy - ev.y) / Math.max(g.sy * g.tipScale, 1e-6);
      const speed = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      state.params.v0 = Math.max(0.5, Math.min(200, speed));
      state.params.theta = Math.max(0, Math.min(89, ang));
      if (state.t < 0.05 || state.landed) {
        const th = state.params.theta * Math.PI / 180;
        state.vx = state.params.v0 * Math.cos(th);
        state.vy = state.params.v0 * Math.sin(th);
        if (state.landed) {
          state.x = 0;
          state.y = 0;
          state.t = 0;
          state.landed = false;
          state.trail = [{ t: 0, x: 0, y: 0 }];
          state.maxY = 0;
        }
      }
      return true;
    }
    if (ev.type === "move" && state._drag === "ball") {
      const x = Math.max(0, (ev.x - g.ox) / Math.max(g.sx, 1e-6));
      const y = Math.max(0, (g.oy - ev.y) / Math.max(g.sy, 1e-6));
      state.x = x;
      state.y = y;
      state.vx = 0;
      state.vy = 0;
      state.landed = false;
      state.t = 0;
      state.trail = [{ t: 0, x, y }];
      state.maxY = y;
      return true;
    }
    if (ev.type === "up") {
      state._drag = null;
      return true;
    }
    return false;
  },
  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: "t", value: `${formatNum(state.t, d)} s` },
      { label: "(x,y)", value: `(${formatNum(state.x, d)}, ${formatNum(state.y, d)})` },
      { label: "vx", value: `${formatNum(state.vx, d)}` },
      { label: "vy", value: `${formatNum(state.vy, d)}` },
      { label: "Hmax", value: `${formatNum(state.maxY, d)} m` },
      { label: "\u5C04\u7A0B", value: state.landed ? `${formatNum(state.range, d)} m` : "\u2014" }
    ];
  },
  getEnergy(state) {
    const m = P(state.params, "m", 1);
    const g = P(state.params, "g", 9.81);
    return {
      kinetic: 0.5 * m * (state.vx ** 2 + state.vy ** 2),
      potential: m * g * Math.max(0, state.y)
    };
  },
  getTrajectory(state) {
    return state.trail;
  }
};

// js/models/spring.js
var spring_default = {
  id: "spring",
  name: "\u5F39\u7C27\u632F\u5B50",
  capabilities: {
    pointer: true,
    interaction: "canvas",
    formalism: "ode",
    viz: "phet-particle",
    fidelity: "principle",
    hint: "\u62D6\u52A8\u8D28\u91CF\u5757\u8BBE\u7F6E\u4F4D\u79FB x\uFF08\u7C7B PhET \u7EA6\u675F\u70B9\uFF09"
  },
  params: {
    m: 1,
    k: 20,
    c: 0.3,
    x0: 0.8,
    v0: 0,
    dragExp: 1,
    windX: 0,
    driveA: 0,
    driveF: 0
  },
  paramSchema: {
    m: { group: "dynamics", unit: "kg", label: "m", min: 1e-6, max: 1e6 },
    k: { group: "dynamics", unit: "N/m", label: "k", min: 0.01, max: 5e3 },
    c: { group: "dynamics", unit: "N\xB7s/m", label: "\u963B\u5C3C c", min: 0, max: 500 },
    dragExp: { group: "dynamics", unit: "\u2014", label: "\u963B\u5C3C\u6307\u6570", min: 0.5, max: 3 },
    windX: { group: "dynamics", unit: "m/s\xB2", label: "\u5916\u573A a", min: -50, max: 50 },
    driveA: { group: "dynamics", unit: "m/s\xB2", label: "\u9A71\u52A8\u632F\u5E45", min: 0, max: 50 },
    driveF: { group: "dynamics", unit: "Hz", label: "\u9A71\u52A8\u9891\u7387", min: 0, max: 20 },
    x0: { group: "initial", unit: "m", label: "x\u2080", min: -50, max: 50 },
    v0: { group: "initial", unit: "m/s", label: "v\u2080", min: -50, max: 50 }
  },
  init(state) {
    const p = state.params;
    state.t = 0;
    state.x = P(p, "x0", 0);
    state.v = P(p, "v0", 0);
    const m = Math.max(P(p, "m", 1), 1e-9);
    state.a = (-springK(p) * state.x - P(p, "c", 0) * state.v) / m;
    state.trail = [];
    state.crossings = [];
    state.lastXSign = Math.sign(state.x) || 1;
  },
  step(state, dt) {
    const p = state.params;
    const m = Math.max(P(p, "m", 1), 1e-9);
    const k = springK(p);
    const c = P(p, "c", 0);
    const exp = Math.max(P(p, "dragExp", 1), 0.5);
    const wind = P(p, "windX", 0);
    const drive = P(p, "driveA", 0) * Math.sin(2 * Math.PI * P(p, "driveF", 0) * state.t);
    const locals = { x: state.x, v: state.v, t: state.t, m, k, c };
    const damp = (v) => c === 0 ? 0 : c / m * Math.sign(v) * Math.abs(v) ** exp;
    if (c === 0 && P(p, "driveA", 0) === 0 && wind === 0) {
      const aAt = (x) => -k * x / m + accelExtras(p, { ...locals, x });
      const next = velocityVerlet1D(state.x, state.v, state.a, aAt, dt);
      state.x = finiteOr(next.x, 0);
      state.v = finiteOr(next.v, 0);
      state.a = finiteOr(next.a, 0);
    } else {
      state.a = -k * state.x / m - damp(state.v) + wind + drive + accelExtras(p, locals);
      state.v = finiteOr(state.v + state.a * dt, 0);
      state.x = finiteOr(state.x + state.v * dt, 0);
      state.a = -k * state.x / m - damp(state.v) + wind + drive + accelExtras(p, { ...locals, x: state.x, v: state.v });
    }
    state.t += dt;
    const sign = Math.sign(state.x) || state.lastXSign;
    if (sign !== state.lastXSign && state.v > 0) {
      state.crossings.push(state.t);
      if (state.crossings.length > 6) state.crossings.shift();
    }
    state.lastXSign = sign;
    state.trail.push({ t: state.t, x: state.x, v: state.v });
    if (state.trail.length > 600) state.trail.shift();
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const wallX = 80;
    const eqX = W * 0.45;
    const y = H * 0.5;
    const scale = Math.min(120, (W - wallX - 80) / 2);
    const massX = eqX + state.x * scale;
    state._spring = { eqX, y, scale, massX, wallX };
    ctx.fillStyle = C.ground;
    ctx.fillRect(wallX - 16, y - 50, 16, 100);
    if (view.showAxes !== false) {
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(eqX, y - 70);
      ctx.lineTo(eqX, y + 70);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.muted;
      ctx.font = "12px IBM Plex Mono, monospace";
      ctx.fillText("eq", eqX + 6, y - 55);
    }
    ctx.strokeStyle = C.body2;
    ctx.lineWidth = 2;
    drawZigZagSpring(ctx, wallX, y, massX - 22, 14, 12);
    ctx.fillStyle = C.body;
    ctx.strokeStyle = state._dragMass ? C.accent : C.vector;
    ctx.lineWidth = state._dragMass ? 3 : 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(massX - 22, y - 22, 44, 44, 4);
    else ctx.rect(massX - 22, y - 22, 44, 44);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.vector;
    ctx.fillText(`x=${formatNum(state.x)} \xB7 \u62D6\u5757`, massX - 36, y + 48);
  },
  onPointer(state, ev) {
    const g = state._spring;
    if (!g) return false;
    if (ev.type === "down") {
      if (Math.abs(ev.x - g.massX) <= 28 && Math.abs(ev.y - g.y) <= 28) {
        state._dragMass = true;
        return true;
      }
      return false;
    }
    if (ev.type === "move" && state._dragMass) {
      const x = (ev.x - g.eqX) / Math.max(g.scale, 1e-6);
      state.x = Math.max(-8, Math.min(8, x));
      state.params.x0 = state.x;
      state.v = 0;
      return true;
    }
    if (ev.type === "up") {
      state._dragMass = false;
      return true;
    }
    return false;
  },
  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const m = P(state.params, "m", 1);
    const k = springK(state.params);
    const Tth = 2 * Math.PI * Math.sqrt(Math.max(m, 1e-9) / Math.max(k, 1e-9));
    let Tmeas = null;
    if (state.crossings.length >= 2) {
      const a = state.crossings;
      Tmeas = (a[a.length - 1] - a[0]) / (a.length - 1);
    }
    return [
      { label: "t", value: `${formatNum(state.t, d)} s` },
      { label: "x", value: `${formatNum(state.x, d)} m` },
      { label: "v", value: `${formatNum(state.v, d)} m/s` },
      { label: "T\u7406\u8BBA", value: `${formatNum(Tth, d)} s` },
      { label: "T\u6D4B\u91CF", value: Tmeas != null ? `${formatNum(Tmeas, d)} s` : "\u2014" }
    ];
  },
  getEnergy(state) {
    const m = P(state.params, "m", 1);
    const k = springK(state.params);
    return { kinetic: 0.5 * m * state.v ** 2, potential: 0.5 * k * state.x ** 2 };
  },
  getTrajectory(state) {
    return state.trail;
  }
};

// js/models/pendulum.js
var pendulum_default = {
  id: "pendulum",
  name: "\u5355\u6446",
  params: {
    L: 1.2,
    g: 9.81,
    c: 0.05,
    theta0: 40,
    m: 1
  },
  paramSchema: {
    L: { group: "dynamics", unit: "m", label: "L", min: 0.05, max: 10 },
    g: { group: "dynamics", unit: "m/s\xB2", label: "g", min: 0, max: 40 },
    c: { group: "dynamics", unit: "1/s", label: "\u963B\u5C3C c", min: 0, max: 20 },
    theta0: { group: "initial", unit: "\xB0", label: "\u03B8\u2080", min: -180, max: 180 },
    m: { group: "dynamics", unit: "kg", label: "m", min: 0.01, max: 100 }
  },
  init(state) {
    state.t = 0;
    state.theta = P(state.params, "theta0", 0) * Math.PI / 180;
    state.omega = 0;
    state.trail = [];
    state.crossings = [];
    state.lastSign = Math.sign(state.theta) || 1;
  },
  step(state, dt) {
    const L = Math.max(P(state.params, "L", 1), 1e-9);
    const g = P(state.params, "g", 9.81);
    const c = P(state.params, "c", 0);
    const locals = { theta: state.theta, omega: state.omega, t: state.t, L, g, c };
    const alpha = -(g / L) * Math.sin(state.theta) - c * state.omega + accelExtras(state.params, locals);
    state.omega = finiteOr(state.omega + alpha * dt, 0);
    state.theta = finiteOr(state.theta + state.omega * dt, state.theta);
    state.t += dt;
    const sign = Math.sign(state.theta) || state.lastSign;
    if (sign !== state.lastSign && state.omega > 0) {
      state.crossings.push(state.t);
      if (state.crossings.length > 6) state.crossings.shift();
    }
    state.lastSign = sign;
    state.trail.push({
      t: state.t,
      x: L * Math.sin(state.theta),
      y: -L * Math.cos(state.theta),
      theta: state.theta,
      omega: state.omega
    });
    if (state.trail.length > 400) state.trail.shift();
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const L = Math.max(P(state.params, "L", 1), 1e-6);
    const pivot = { x: W * 0.5, y: H * 0.18 };
    const scale = Math.min(W, H) * 0.38 / Math.max(L, 0.5);
    const toScreen = (x, y) => ({ x: pivot.x + x * scale, y: pivot.y - y * scale });
    if (view.showTrail !== false && state.trail.length > 1) {
      ctx.beginPath();
      state.trail.forEach((p, i) => {
        const s = toScreen(p.x, p.y);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.strokeStyle = C.trail;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = C.muted;
    ctx.beginPath();
    ctx.arc(pivot.x, pivot.y, 6, 0, Math.PI * 2);
    ctx.fill();
    const bob = toScreen(L * Math.sin(state.theta), -L * Math.cos(state.theta));
    ctx.strokeStyle = C.vector;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivot.x, pivot.y);
    ctx.lineTo(bob.x, bob.y);
    ctx.stroke();
    ctx.fillStyle = C.body;
    ctx.beginPath();
    ctx.arc(bob.x, bob.y, 14, 0, Math.PI * 2);
    ctx.fill();
    if (view.showVectors !== false) {
      const v = L * state.omega;
      drawArrow(
        ctx,
        bob.x,
        bob.y,
        bob.x + Math.cos(state.theta) * v * 8,
        bob.y + Math.sin(state.theta) * v * 8,
        C.accent,
        2
      );
    }
  },
  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const L = P(state.params, "L", 1);
    const g = Math.max(P(state.params, "g", 9.81), 1e-9);
    const Tth = 2 * Math.PI * Math.sqrt(Math.max(L, 1e-9) / g);
    let Tmeas = null;
    if (state.crossings.length >= 2) {
      const a = state.crossings;
      Tmeas = (a[a.length - 1] - a[0]) / (a.length - 1);
    }
    return [
      { label: "t", value: `${formatNum(state.t, d)} s` },
      { label: "\u03B8", value: `${formatNum(state.theta * 180 / Math.PI, d)}\xB0` },
      { label: "\u03C9", value: `${formatNum(state.omega, d)}` },
      { label: "T\u7406\u8BBA", value: `${formatNum(Tth, d)} s` },
      { label: "T\u6D4B\u91CF", value: Tmeas != null ? `${formatNum(Tmeas, d)} s` : "\u2014" }
    ];
  },
  getEnergy(state) {
    const m = P(state.params, "m", 1);
    const L = P(state.params, "L", 1);
    const g = P(state.params, "g", 9.81);
    return {
      kinetic: 0.5 * m * (L * state.omega) ** 2,
      potential: m * g * L * (1 - Math.cos(state.theta))
    };
  },
  getTrajectory(state) {
    return state.trail.map((p) => ({
      t: p.t,
      x: p.x,
      y: p.y,
      theta: p.theta,
      omega: p.omega
    }));
  }
};

// js/models/collision.js
var collision_default = {
  id: "collision",
  name: "\u4E00\u7EF4\u78B0\u649E",
  params: {
    m1: 2,
    m2: 1,
    v1: 3,
    v2: -1,
    e: 1
  },
  paramSchema: {
    m1: { group: "dynamics", unit: "kg", label: "m1", min: 0.01, max: 100 },
    m2: { group: "dynamics", unit: "kg", label: "m2", min: 0.01, max: 100 },
    v1: { group: "initial", unit: "m/s", label: "v1", min: -50, max: 50 },
    v2: { group: "initial", unit: "m/s", label: "v2", min: -50, max: 50 },
    e: { group: "dynamics", unit: "\u2014", label: "e", min: 0, max: 1 }
  },
  init(state) {
    const p = state.params;
    state.t = 0;
    state.x1 = -2;
    state.x2 = 2;
    state.v1 = P(p, "v1", 0);
    state.v2 = P(p, "v2", 0);
    state.contact = false;
    state.flash = 0;
    state.collisionCount = 0;
    state.keBefore = null;
    state.keAfter = null;
    state.collisionLog = [];
  },
  step(state, dt) {
    const m1 = Math.max(P(state.params, "m1", 1), 1e-9);
    const m2 = Math.max(P(state.params, "m2", 1), 1e-9);
    const e = P(state.params, "e", 1);
    const r1 = 0.35;
    const r2 = 0.28;
    state.x1 = finiteOr(state.x1 + state.v1 * dt, state.x1);
    state.x2 = finiteOr(state.x2 + state.v2 * dt, state.x2);
    state.t += dt;
    const dist = state.x2 - state.x1;
    const minDist = r1 + r2;
    if (!state.contact && dist <= minDist && state.v1 > state.v2) {
      const ke0 = 0.5 * m1 * state.v1 ** 2 + 0.5 * m2 * state.v2 ** 2;
      const u1 = state.v1;
      const u2 = state.v2;
      state.v1 = ((m1 - e * m2) * u1 + (1 + e) * m2 * u2) / (m1 + m2);
      state.v2 = ((m2 - e * m1) * u2 + (1 + e) * m1 * u1) / (m1 + m2);
      state.v1 = finiteOr(state.v1, 0);
      state.v2 = finiteOr(state.v2, 0);
      const overlap = minDist - dist;
      state.x1 -= overlap / 2;
      state.x2 += overlap / 2;
      const ke1 = 0.5 * m1 * state.v1 ** 2 + 0.5 * m2 * state.v2 ** 2;
      state.keBefore = ke0;
      state.keAfter = ke1;
      state.contact = true;
      state.flash = 0.3;
      state.collisionCount += 1;
      state.collisionLog.push({
        n: state.collisionCount,
        t: state.t,
        keBefore: ke0,
        keAfter: ke1,
        v1: state.v1,
        v2: state.v2
      });
    } else if (dist > minDist + 0.02) {
      state.contact = false;
    }
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
    const bound = 6;
    if (state.x1 < -bound) {
      state.x1 = -bound;
      state.v1 = Math.abs(state.v1);
      state.contact = false;
    }
    if (state.x1 > bound) {
      state.x1 = bound;
      state.v1 = -Math.abs(state.v1);
      state.contact = false;
    }
    if (state.x2 < -bound) {
      state.x2 = -bound;
      state.v2 = Math.abs(state.v2);
      state.contact = false;
    }
    if (state.x2 > bound) {
      state.x2 = bound;
      state.v2 = -Math.abs(state.v2);
      state.contact = false;
    }
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const y = H * 0.55;
    const scale = Math.min(W * 0.08, 55);
    const ox = W / 2;
    const X = (x) => ox + x * scale;
    const r1 = 0.35 * scale;
    const r2 = 0.28 * scale;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, y + Math.max(r1, r2) + 4);
    ctx.lineTo(W - 40, y + Math.max(r1, r2) + 4);
    ctx.stroke();
    if (state.flash > 0) {
      const alpha = state.flash / 0.3;
      ctx.strokeStyle = `rgba(250, 204, 21, ${alpha * 0.55})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X((state.x1 + state.x2) / 2), y, 18 + (1 - alpha) * 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = C.vector;
    ctx.beginPath();
    ctx.arc(X(state.x1), y, r1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.body2;
    ctx.beginPath();
    ctx.arc(X(state.x2), y, r2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.body;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(X(state.x2), y, r2, 0, Math.PI * 2);
    ctx.stroke();
    if (view.showVectors !== false) {
      drawArrow(ctx, X(state.x1), y, X(state.x1) + state.v1 * 18, y, C.vector, 2);
      drawArrow(ctx, X(state.x2), y, X(state.x2) + state.v2 * 18, y, C.body2, 2);
    }
    const lx = 16;
    const ly = 18;
    ctx.fillStyle = C.vector;
    ctx.beginPath();
    ctx.arc(lx + 5, ly, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.body2;
    ctx.beginPath();
    ctx.arc(lx + 48, ly, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.muted;
    ctx.font = "12px IBM Plex Mono, monospace";
    ctx.fillText("m1", lx + 14, ly + 4);
    ctx.fillText("m2", lx + 57, ly + 4);
    ctx.fillText(`hits ${state.collisionCount}`, lx, ly + 22);
    if (state.keBefore != null) {
      ctx.fillText(`KE ${formatNum(state.keBefore)} \u2192 ${formatNum(state.keAfter)}`, lx, ly + 40);
    }
  },
  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const m1 = P(state.params, "m1", 1);
    const m2 = P(state.params, "m2", 1);
    const mom = m1 * state.v1 + m2 * state.v2;
    const ke = 0.5 * m1 * state.v1 ** 2 + 0.5 * m2 * state.v2 ** 2;
    return [
      { label: "v1", value: `${formatNum(state.v1, d)} m/s` },
      { label: "v2", value: `${formatNum(state.v2, d)} m/s` },
      { label: "\u52A8\u91CF", value: `${formatNum(mom, d)}` },
      { label: "\u52A8\u80FD", value: `${formatNum(ke, d)} J` },
      { label: "\u78B0\u649E", value: `${state.collisionCount}` }
    ];
  },
  getEnergy(state) {
    const m1 = P(state.params, "m1", 1);
    const m2 = P(state.params, "m2", 1);
    return { kinetic: 0.5 * m1 * state.v1 ** 2 + 0.5 * m2 * state.v2 ** 2, potential: 0 };
  },
  getTrajectory(state) {
    return state.collisionLog.length ? state.collisionLog : [{ t: state.t, v1: state.v1, v2: state.v2 }];
  }
};

// js/models/doublePendulum.js
var doublePendulum_default = {
  id: "double-pendulum",
  name: "\u53CC\u6446",
  params: {
    L1: 1,
    L2: 1,
    m1: 1,
    m2: 1,
    g: 9.81,
    theta1: 120,
    // deg
    theta2: -10
  },
  paramSchema: {
    L1: { group: "dynamics", unit: "m", label: "L1", min: 0.05, max: 10 },
    L2: { group: "dynamics", unit: "m", label: "L2", min: 0.05, max: 10 },
    m1: { group: "dynamics", unit: "kg", label: "m1", min: 0.01, max: 100 },
    m2: { group: "dynamics", unit: "kg", label: "m2", min: 0.01, max: 100 },
    g: { group: "dynamics", unit: "m/s\xB2", label: "g", min: 0, max: 40 },
    theta1: { group: "initial", unit: "\xB0", label: "\u03B81", min: -180, max: 180 },
    theta2: { group: "initial", unit: "\xB0", label: "\u03B82", min: -180, max: 180 }
  },
  init(state) {
    const p = state.params;
    state.t = 0;
    state.th1 = p.theta1 * Math.PI / 180;
    state.th2 = p.theta2 * Math.PI / 180;
    state.w1 = 0;
    state.w2 = 0;
    state.trail = [];
  },
  step(state, dt) {
    const { L1, L2, m1, m2, g } = state.params;
    let { th1, th2, w1, w2 } = state;
    const accel = (th12, th22, w12, w22) => {
      const d = th12 - th22;
      const den = 2 * m1 + m2 - m2 * Math.cos(2 * d);
      const a12 = (-g * (2 * m1 + m2) * Math.sin(th12) - m2 * g * Math.sin(th12 - 2 * th22) - 2 * Math.sin(d) * m2 * (w22 * w22 * L2 + w12 * w12 * L1 * Math.cos(d))) / (L1 * den);
      const a22 = 2 * Math.sin(d) * (w12 * w12 * L1 * (m1 + m2) + g * (m1 + m2) * Math.cos(th12) + w22 * w22 * L2 * m2 * Math.cos(d)) / (L2 * den);
      return { a1: a12, a2: a22 };
    };
    const { a1, a2 } = accel(th1, th2, w1, w2);
    w1 += a1 * dt;
    w2 += a2 * dt;
    th1 += w1 * dt;
    th2 += w2 * dt;
    state.th1 = th1;
    state.th2 = th2;
    state.w1 = w1;
    state.w2 = w2;
    state.t += dt;
    const x2 = L1 * Math.sin(th1) + L2 * Math.sin(th2);
    const y2 = -L1 * Math.cos(th1) - L2 * Math.cos(th2);
    state.trail.push({ x: x2, y: y2, th1, w1 });
    if (state.trail.length > 1200) state.trail.shift();
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const { L1, L2 } = state.params;
    const pivot = { x: W * 0.5, y: H * 0.2 };
    const scale = Math.min(W, H) * 0.28 / Math.max(L1 + L2, 0.5);
    const toS = (x, y) => ({ x: pivot.x + x * scale, y: pivot.y - y * scale });
    for (let i = 1; i < state.trail.length; i += 1) {
      const a = state.trail[i - 1];
      const b = state.trail[i];
      const sa = toS(a.x, a.y);
      const sb = toS(b.x, b.y);
      ctx.strokeStyle = phaseHueColor(b.th1, b.w1, 0.62);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.stroke();
    }
    const x1 = L1 * Math.sin(state.th1);
    const y1 = -L1 * Math.cos(state.th1);
    const x2 = x1 + L2 * Math.sin(state.th2);
    const y2 = y1 - L2 * Math.cos(state.th2);
    const p1 = toS(x1, y1);
    const p2 = toS(x2, y2);
    ctx.strokeStyle = C.vector;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pivot.x, pivot.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.fillStyle = C.muted;
    ctx.beginPath();
    ctx.arc(pivot.x, pivot.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.body;
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, 11, 0, Math.PI * 2);
    ctx.fill();
    const barX = 12;
    const barY = H - 28;
    const barW = Math.min(160, W - 24);
    for (let i = 0; i < 64; i += 1) {
      ctx.fillStyle = `hsl(${i / 63 * 360}, 72%, 56%)`;
      ctx.fillRect(barX + i * barW / 64, barY, barW / 64 + 1, 8);
    }
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText("\u8272\u76F8\u221D\u03B8\u2081,\u03C9\u2081", barX, barY - 4);
  },
  getReadouts(state) {
    return [
      { label: "t", value: `${formatNum(state.t)} s` },
      { label: "\u03B8\u2081", value: `${formatNum(state.th1 * 180 / Math.PI)}\xB0` },
      { label: "\u03B8\u2082", value: `${formatNum(state.th2 * 180 / Math.PI)}\xB0` },
      { label: "\u03C9\u2081", value: `${formatNum(state.w1)} rad/s` }
    ];
  },
  getEnergy(state) {
    const { L1, L2, m1, m2, g } = state.params;
    const { th1, th2, w1, w2 } = state;
    const v1sq = (L1 * w1) ** 2;
    const v2sq = (L1 * w1) ** 2 + (L2 * w2) ** 2 + 2 * L1 * L2 * w1 * w2 * Math.cos(th1 - th2);
    const ke = 0.5 * m1 * v1sq + 0.5 * m2 * v2sq;
    const pe = -(m1 + m2) * g * L1 * Math.cos(th1) - m2 * g * L2 * Math.cos(th2);
    const peShift = (m1 + m2) * g * L1 + m2 * g * L2;
    return { kinetic: ke, potential: pe + peShift };
  },
  getTrajectory(state) {
    return state.trail.map((p, i) => ({
      i,
      t: i,
      x: p.x,
      y: p.y,
      theta1: p.th1,
      omega1: p.w1
    }));
  }
};

// js/models/wave.js
var wave_default = {
  id: "wave",
  name: "\u6A2A\u6CE2 / \u5F26\u632F\u52A8",
  params: {
    N: 48,
    // 内部质点数
    L: 1,
    // 弦长 m
    c: 2,
    // 波速 m/s
    damp: 0.05,
    // 阻尼
    A1: 0.12,
    // 1 阶驻波振幅
    A2: 0.06,
    A3: 0.03
  },
  paramSchema: {
    N: { group: "numerics", unit: "", label: "\u8D28\u70B9\u6570 N", min: 8, max: 256 },
    L: { group: "dynamics", unit: "m", label: "\u5F26\u957F L", min: 0.1, max: 10 },
    c: { group: "dynamics", unit: "m/s", label: "\u6CE2\u901F c", min: 0.1, max: 20 },
    damp: { group: "dynamics", unit: "1/s", label: "\u963B\u5C3C", min: 0, max: 5 },
    A1: { group: "initial", unit: "m", label: "\u4E00\u9636\u632F\u5E45", min: 0, max: 2 },
    A2: { group: "initial", unit: "m", label: "\u4E8C\u9636\u632F\u5E45", min: 0, max: 2 },
    A3: { group: "initial", unit: "m", label: "\u4E09\u9636\u632F\u5E45", min: 0, max: 2 }
  },
  init(state) {
    const p = state.params;
    const N = Math.max(8, Math.floor(p.N));
    const dx = p.L / (N + 1);
    state.N = N;
    state.dx = dx;
    state.t = 0;
    state.y = new Float64Array(N + 2);
    state.v = new Float64Array(N + 2);
    for (let i = 1; i <= N; i += 1) {
      const x = i * dx;
      state.y[i] = p.A1 * Math.sin(1 * Math.PI * x / p.L) + p.A2 * Math.sin(2 * Math.PI * x / p.L) + p.A3 * Math.sin(3 * Math.PI * x / p.L);
    }
    state.y[0] = 0;
    state.y[N + 1] = 0;
  },
  step(state, dt) {
    const { c, damp } = state.params;
    const { N, dx, y, v } = state;
    const c2 = c * c;
    const inv = 1 / (dx * dx);
    for (let i = 1; i <= N; i += 1) {
      const a = c2 * (y[i + 1] - 2 * y[i] + y[i - 1]) * inv - damp * v[i];
      v[i] += a * dt;
    }
    for (let i = 1; i <= N; i += 1) {
      y[i] += v[i] * dt;
    }
    y[0] = 0;
    y[N + 1] = 0;
    v[0] = 0;
    v[N + 1] = 0;
    state.t += dt;
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const { L, A1, A2, A3 } = state.params;
    const { N, dx, y } = state;
    const margin = { l: 40, r: 40, t: 40, b: 40 };
    const amp = Math.max(0.05, Math.abs(A1) + Math.abs(A2) + Math.abs(A3)) * 1.4;
    const sx = (W - margin.l - margin.r) / L;
    const sy = (H - margin.t - margin.b) / (2 * amp);
    const ox = margin.l;
    const oy = H / 2;
    const X = (x) => ox + x * sx;
    const Y = (yy) => oy - yy * sy;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(W - margin.r, oy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = C.theory;
    ctx.beginPath();
    for (let i = 0; i <= N + 1; i += 1) {
      const x = i * dx;
      const yy = A1 * Math.sin(Math.PI * x / L) + A2 * Math.sin(2 * Math.PI * x / L) + A3 * Math.sin(3 * Math.PI * x / L);
      const px = X(x);
      const py = Y(yy);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const pos = C.pos || "rgba(251, 113, 133, 0.28)";
    const neg = C.neg || "rgba(56, 189, 248, 0.28)";
    for (let i = 0; i < N + 1; i += 1) {
      const x0 = X(i * dx);
      const x1 = X((i + 1) * dx);
      const y0 = y[i];
      const y1 = y[i + 1];
      const mid = (y0 + y1) / 2;
      ctx.fillStyle = mid >= 0 ? pos : neg;
      ctx.beginPath();
      ctx.moveTo(x0, oy);
      ctx.lineTo(x0, Y(y0));
      ctx.lineTo(x1, Y(y1));
      ctx.lineTo(x1, oy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = C.body;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= N + 1; i += 1) {
      const px = X(i * dx);
      const py = Y(y[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    for (let i = 1; i <= N; i += 1) {
      ctx.fillStyle = y[i] >= 0 ? C.accent || C.vector : C.vector;
      ctx.beginPath();
      ctx.arc(X(i * dx), Y(y[i]), 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = C.ground;
    ctx.fillRect(X(0) - 6, oy - 18, 12, 36);
    ctx.fillRect(X(L) - 6, oy - 18, 12, 36);
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText("\u865A\u7EBF=\u521D\u59CB\u6A21\u6001\u53E0\u52A0\u5F62\u72B6", 12, 20);
  },
  getReadouts(state) {
    let eMax = 0;
    for (let i = 1; i <= state.N; i += 1) {
      eMax = Math.max(eMax, Math.abs(state.y[i]));
    }
    return [
      { label: "t", value: `${formatNum(state.t)} s` },
      { label: "N", value: `${state.N}` },
      { label: "|y|max", value: `${formatNum(eMax)} m` },
      { label: "c", value: `${formatNum(state.params.c)} m/s` }
    ];
  },
  getEnergy(state) {
    const { c, damp } = state.params;
    const \u03BC = 1;
    const kEff = \u03BC * (c * c) / (state.dx * state.dx);
    let ke = 0;
    let pe = 0;
    for (let i = 1; i <= state.N; i += 1) {
      ke += 0.5 * \u03BC * state.dx * state.v[i] * state.v[i];
      const dy = state.y[i] - state.y[i - 1];
      pe += 0.5 * kEff * state.dx * dy * dy;
    }
    void damp;
    return { kinetic: ke, potential: pe };
  },
  getTrajectory(state) {
    const rows = [];
    for (let i = 0; i <= state.N + 1; i += 1) {
      rows.push({ i, x: i * state.dx, y: state.y[i], v: state.v[i] });
    }
    return rows;
  }
};

// js/models/heat.js
var heat_default = {
  id: "heat",
  name: "\u70ED\u4F20\u5BFC",
  perfClass: perfClassFor("heat"),
  params: {
    N: 80,
    L: 1,
    alpha: 0.02,
    // 热扩散率 m²/s
    Tleft: 100,
    // 左端温度 °C
    Tright: 20,
    // 右端温度 °C
    T0: 20,
    // 初始内部温度
    hotspot: 80
    // 中心热斑温度
  },
  paramSchema: {
    N: { group: "numerics", unit: "", label: "\u7F51\u683C\u70B9\u6570 N", min: 10, max: 256 },
    L: { group: "dynamics", unit: "m", label: "\u6746\u957F L", min: 0.1, max: 10 },
    alpha: { group: "dynamics", unit: "m\xB2/s", label: "\u70ED\u6269\u6563\u7387 \u03B1", min: 0, max: 2 },
    Tleft: { group: "initial", unit: "\xB0C", label: "\u5DE6\u7AEF\u6E29\u5EA6", min: -50, max: 200 },
    Tright: { group: "initial", unit: "\xB0C", label: "\u53F3\u7AEF\u6E29\u5EA6", min: -50, max: 200 },
    T0: { group: "initial", unit: "\xB0C", label: "\u521D\u6E29 T\u2080", min: -50, max: 200 },
    hotspot: { group: "initial", unit: "\xB0C", label: "\u70ED\u6591\u6E29\u5EA6", min: -50, max: 200 }
  },
  init(state) {
    const p = state.params;
    const cap = mobileBudget().heatNCap;
    const N = Math.min(cap, Math.max(10, Math.floor(p.N)));
    if (Number(p.N) > N) p.N = N;
    state.N = N;
    state.dx = p.L / (N - 1);
    state.t = 0;
    state.T = new Float64Array(N);
    state._next = new Float64Array(N);
    for (let i = 0; i < N; i += 1) {
      state.T[i] = p.T0;
    }
    const mid = Math.floor(N / 2);
    const w = Math.max(2, Math.floor(N * 0.08));
    for (let i = mid - w; i <= mid + w; i += 1) {
      if (i > 0 && i < N - 1) state.T[i] = p.hotspot;
    }
    state.T[0] = p.Tleft;
    state.T[N - 1] = p.Tright;
  },
  step(state, dt) {
    const { alpha } = state.params;
    const { N, dx, T } = state;
    const dtMax = dx * dx / (2 * Math.max(alpha, 1e-9));
    const h = Math.min(dt, dtMax * 0.9);
    const r = alpha * h / (dx * dx);
    if (!state._next || state._next.length !== N) state._next = new Float64Array(N);
    const next = state._next;
    next[0] = state.params.Tleft;
    next[N - 1] = state.params.Tright;
    for (let i = 1; i < N - 1; i += 1) {
      next[i] = T[i] + r * (T[i + 1] - 2 * T[i] + T[i - 1]);
    }
    const swap = state.T;
    state.T = next;
    state._next = swap;
    state.t += h;
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const { L } = state.params;
    const { N, T } = state;
    const margin = { l: 50, r: 50, t: 50, b: 70 };
    const tMin = Math.min(state.params.Tright, state.params.T0, 0);
    const tMax = Math.max(state.params.Tleft, state.params.hotspot, 1);
    const barY = margin.t;
    const barH = 36;
    const barW = W - margin.l - margin.r;
    const cellW = barW / (N - 1);
    for (let i = 0; i < N - 1; i += 1) {
      ctx.fillStyle = heatTempColor(T[i], tMin, tMax);
      ctx.fillRect(margin.l + i * cellW, barY, cellW + 1, barH);
    }
    ctx.strokeStyle = C.ground;
    ctx.strokeRect(margin.l, barY, barW, barH);
    const plotTop = barY + barH + 30;
    const plotH = H - plotTop - margin.b;
    const X = (i) => margin.l + i / (N - 1) * barW;
    const Y = (temp) => plotTop + (1 - (temp - tMin) / (tMax - tMin)) * plotH;
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(margin.l, plotTop);
    ctx.lineTo(margin.l, plotTop + plotH);
    ctx.lineTo(margin.l + barW, plotTop + plotH);
    ctx.stroke();
    ctx.strokeStyle = C.body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < N; i += 1) {
      const px = X(i);
      const py = Y(T[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    const legendY = H - 36;
    for (let i = 0; i < 80; i += 1) {
      const u = i / 79;
      const temp = tMin + u * (tMax - tMin);
      ctx.fillStyle = heatTempColor(temp, tMin, tMax);
      ctx.fillRect(margin.l + i * (barW / 80), legendY, barW / 80 + 1, 12);
    }
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText(`\u51B7 ${formatNum(tMin, 0)}\xB0C`, margin.l, legendY + 26);
    ctx.fillText(`\u70ED ${formatNum(tMax, 0)}\xB0C`, margin.l + barW - 52, legendY + 26);
    ctx.fillText(`L=${formatNum(L)} m`, margin.l, barY - 8);
  },
  getReadouts(state) {
    let sum = 0;
    let tmax = -Infinity;
    let tmin = Infinity;
    for (let i = 0; i < state.N; i += 1) {
      sum += state.T[i];
      tmax = Math.max(tmax, state.T[i]);
      tmin = Math.min(tmin, state.T[i]);
    }
    return [
      { label: "t", value: `${formatNum(state.t)} s` },
      { label: "T\u0304", value: `${formatNum(sum / state.N)} \xB0C` },
      { label: "Tmin", value: `${formatNum(tmin)} \xB0C` },
      { label: "Tmax", value: `${formatNum(tmax)} \xB0C` }
    ];
  },
  getEnergy() {
    return null;
  },
  getTrajectory(state) {
    const rows = [];
    for (let i = 0; i < state.N; i += 1) {
      rows.push({ i, x: i * state.dx, T: state.T[i] });
    }
    return rows;
  }
};

// js/models/orbit.js
var orbit_default = {
  id: "orbit",
  name: "\u5F00\u666E\u52D2\u8F68\u9053",
  params: {
    GM: 40,
    x0: 2.2,
    y0: 0,
    vx0: 0,
    vy0: 3.6
  },
  paramSchema: {
    GM: { group: "dynamics", unit: "m\xB3/s\xB2", label: "GM", min: 1, max: 200 },
    x0: { group: "initial", unit: "m", label: "x\u2080", min: -8, max: 8 },
    y0: { group: "initial", unit: "m", label: "y\u2080", min: -8, max: 8 },
    vx0: { group: "initial", unit: "m/s", label: "vx\u2080", min: -12, max: 12 },
    vy0: { group: "initial", unit: "m/s", label: "vy\u2080", min: -12, max: 12 }
  },
  init(state) {
    const p = state.params;
    state.t = 0;
    state.x = P(p, "x0", 2);
    state.y = P(p, "y0", 0);
    state.vx = P(p, "vx0", 0);
    state.vy = P(p, "vy0", 4);
    state.trail = [];
  },
  step(state, dt) {
    const GM = Math.max(P(state.params, "GM", 1), 1e-9);
    const r2 = state.x ** 2 + state.y ** 2;
    const r = Math.sqrt(Math.max(r2, 1e-9));
    const ax = -GM * state.x / r ** 3;
    const ay = -GM * state.y / r ** 3;
    state.vx = finiteOr(state.vx + ax * dt, 0);
    state.vy = finiteOr(state.vy + ay * dt, 0);
    state.x = finiteOr(state.x + state.vx * dt, state.x);
    state.y = finiteOr(state.y + state.vy * dt, state.y);
    state.t += dt;
    state.trail.push({ x: state.x, y: state.y });
    if (state.trail.length > 900) state.trail.shift();
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const scale = Math.min(W, H) * 0.12;
    const ox = W / 2;
    const oy = H / 2;
    const X = (x) => ox + x * scale;
    const Y = (y) => oy - y * scale;
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(ox, oy, 10, 0, Math.PI * 2);
    ctx.fill();
    if (view.showTrail !== false && state.trail.length > 1) {
      ctx.strokeStyle = C.trail;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      state.trail.forEach((p, i) => {
        if (i === 0) ctx.moveTo(X(p.x), Y(p.y));
        else ctx.lineTo(X(p.x), Y(p.y));
      });
      ctx.stroke();
    }
    ctx.fillStyle = C.body;
    ctx.beginPath();
    ctx.arc(X(state.x), Y(state.y), 8, 0, Math.PI * 2);
    ctx.fill();
    if (view.showVectors !== false) {
      ctx.strokeStyle = C.vector;
      ctx.beginPath();
      ctx.moveTo(X(state.x), Y(state.y));
      ctx.lineTo(X(state.x + state.vx * 0.25), Y(state.y + state.vy * 0.25));
      ctx.stroke();
    }
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText("\u4E2D\u5FC3 = \u5F15\u529B\u6E90", 12, 20);
  },
  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const r = Math.hypot(state.x, state.y);
    const v = Math.hypot(state.vx, state.vy);
    return [
      { label: "t", value: `${formatNum(state.t, d)} s` },
      { label: "r", value: `${formatNum(r, d)} m` },
      { label: "|v|", value: `${formatNum(v, d)} m/s` }
    ];
  },
  getTrajectory(state) {
    return state.trail.map((p, i) => ({ i, x: p.x, y: p.y }));
  }
};

// js/models/lorentz.js
var lorentz_default = {
  id: "lorentz",
  name: "\u6D1B\u4F26\u5179\u529B",
  params: {
    q: 1,
    m: 1,
    Ex: 0.4,
    B: 1.2,
    vx0: 0,
    vy0: 2.5,
    x0: -1.5,
    y0: 0
  },
  paramSchema: {
    q: { group: "dynamics", unit: "C", label: "\u7535\u8377 q", min: -5, max: 5 },
    m: { group: "dynamics", unit: "kg", label: "\u8D28\u91CF m", min: 0.1, max: 10 },
    Ex: { group: "dynamics", unit: "V/m", label: "\u7535\u573A Ex", min: -5, max: 5 },
    B: { group: "dynamics", unit: "T", label: "\u78C1\u573A B\u22A5", min: -5, max: 5 },
    x0: { group: "initial", unit: "m", label: "\u521D\u4F4D x\u2080", min: -5, max: 5 },
    y0: { group: "initial", unit: "m", label: "\u521D\u4F4D y\u2080", min: -5, max: 5 },
    vx0: { group: "initial", unit: "m/s", label: "\u521D\u901F vx\u2080", min: -8, max: 8 },
    vy0: { group: "initial", unit: "m/s", label: "\u521D\u901F vy\u2080", min: -8, max: 8 }
  },
  init(state) {
    const p = state.params;
    state.t = 0;
    state.x = P(p, "x0", 0);
    state.y = P(p, "y0", 0);
    state.vx = P(p, "vx0", 0);
    state.vy = P(p, "vy0", 2);
    state.trail = [];
  },
  step(state, dt) {
    const q = P(state.params, "q", 1);
    const m = Math.max(P(state.params, "m", 1), 1e-9);
    const Ex = P(state.params, "Ex", 0);
    const B = P(state.params, "B", 1);
    const ax = q / m * (Ex + state.vy * B);
    const ay = q / m * (-state.vx * B);
    state.vx = finiteOr(state.vx + ax * dt, 0);
    state.vy = finiteOr(state.vy + ay * dt, 0);
    state.x = finiteOr(state.x + state.vx * dt, state.x);
    state.y = finiteOr(state.y + state.vy * dt, state.y);
    state.t += dt;
    state.trail.push({ x: state.x, y: state.y });
    if (state.trail.length > 800) state.trail.shift();
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const scale = Math.min(W, H) * 0.14;
    const ox = W / 2;
    const oy = H / 2;
    const X = (x) => ox + x * scale;
    const Y = (y) => oy - y * scale;
    if (view.showTrail !== false && state.trail.length > 1) {
      ctx.strokeStyle = C.trail;
      ctx.beginPath();
      state.trail.forEach((p, i) => {
        if (i === 0) ctx.moveTo(X(p.x), Y(p.y));
        else ctx.lineTo(X(p.x), Y(p.y));
      });
      ctx.stroke();
    }
    ctx.fillStyle = C.body;
    ctx.beginPath();
    ctx.arc(X(state.x), Y(state.y), 8, 0, Math.PI * 2);
    ctx.fill();
    if (view.showVectors !== false) {
      drawArrow(ctx, X(state.x), Y(state.y), X(state.x + state.vx * 0.2), Y(state.y + state.vy * 0.2), C.vector, 2);
    }
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText("B \u2299 \u51FA\u5C4F \xB7 E \u2192", 12, 20);
  },
  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: "t", value: `${formatNum(state.t, d)} s` },
      { label: "x", value: `${formatNum(state.x, d)}` },
      { label: "y", value: `${formatNum(state.y, d)}` },
      { label: "|v|", value: `${formatNum(Math.hypot(state.vx, state.vy), d)}` }
    ];
  },
  getTrajectory(state) {
    return state.trail.map((p, i) => ({ i, x: p.x, y: p.y }));
  }
};

// js/models/sorting.js
var sorting_default = {
  id: "sorting",
  name: "\u6392\u5E8F\u7B97\u6CD5",
  capabilities: {
    interaction: "knobs",
    formalism: "discrete",
    viz: "algo-step",
    fidelity: "principle",
    hint: "\u8BFE\u5802\u6F14\u793A\u53EF\u5173\u81EA\u52A8\u6B65\u8FDB\uFF0C\u4EC5\u7528 step\uFF1B\u9AD8\u4EAE\u6BD4\u8F83\u4F4D",
    actions: [
      { id: "step", label: "\u5355\u6B65 step" },
      { id: "toggleDemo", label: "\u5207\u6362\u8BFE\u5802\u6A21\u5F0F" },
      { id: "reset", label: "\u91CD\u7F6E\u6570\u7EC4" }
    ]
  },
  params: {
    n: 24,
    stepDt: 0.08,
    seed: 42,
    algo: 0,
    demo: 1
    // 默认课堂：仅 step + 暂停时钟
  },
  paramSchema: {
    n: { group: "numerics", unit: "\u2014", label: "\u5143\u7D20\u6570 n", min: 6, max: 64 },
    stepDt: { group: "dynamics", unit: "s", label: "\u6B65\u8FDB\u95F4\u9694", min: 0.02, max: 0.5 },
    seed: { group: "initial", unit: "\u2014", label: "\u968F\u673A\u79CD\u5B50", min: 1, max: 9999 },
    algo: {
      group: "dynamics",
      unit: "\u2014",
      label: "\u7B97\u6CD5",
      min: 0,
      max: 2,
      options: [
        { value: 0, label: "bubble" },
        { value: 1, label: "insertion" },
        { value: 2, label: "quick" }
      ]
    },
    demo: {
      group: "dynamics",
      unit: "\u2014",
      label: "\u8BFE\u5802\u6F14\u793A",
      min: 0,
      max: 1,
      options: [
        { value: 0, label: "\u81EA\u52A8\u6B65\u8FDB" },
        { value: 1, label: "\u4EC5\u624B\u52A8 step" }
      ]
    }
  },
  /** 主循环：课堂模式请求暂停全局时钟，避免“卡住”错觉 */
  shouldPauseApp(state) {
    return Math.round(P(state?.params, "demo", 1)) === 1;
  },
  runAction(state, actionId) {
    if (actionId === "reset") {
      this.init(state);
      return true;
    }
    if (actionId === "step") {
      if (state.done) return false;
      if (state.algo === 0) stepBubble(state);
      else if (state.algo === 1) stepInsertion(state);
      else stepQuick(state);
      state._flash = 12;
      return true;
    }
    if (actionId === "toggleDemo") {
      state.params.demo = Math.round(P(state.params, "demo", 1)) ? 0 : 1;
      return true;
    }
    if (actionId === "autoDemo") {
      state.params.demo = 0;
      return true;
    }
    return false;
  },
  init(state) {
    const n = Math.max(4, Math.floor(P(state.params, "n", 20)));
    let s = Math.floor(P(state.params, "seed", 1)) || 1;
    const rnd = () => {
      s = s * 16807 % 2147483647;
      return (s - 1) / 2147483646;
    };
    state.arr = Array.from({ length: n }, () => 0.15 + rnd() * 0.85);
    state.algo = Math.round(clampAlgo(P(state.params, "algo", 0)));
    state.i = 0;
    state.j = 0;
    state.swaps = 0;
    state.comps = 0;
    state.done = false;
    state.acc = 0;
    state.t = 0;
    state.n = n;
    state.hi = null;
    state.lo = null;
    state.stack = [];
    state.pivot = -1;
    state.phase = "scan";
    if (state.algo === 2) {
      state.stack = [{ lo: 0, hi: n - 1 }];
      state.lo = 0;
      state.hi = n - 1;
      state.j = 0;
      state.i = -1;
      state.pivot = n - 1;
      state.phase = "partition";
    }
  },
  step(state, dt) {
    if (state.done) return;
    const want = Math.round(clampAlgo(P(state.params, "algo", 0)));
    if (want !== state.algo) {
      this.init(state);
      return;
    }
    state.t += dt;
    if (Math.round(P(state.params, "demo", 1)) === 1) return;
    const period = Math.max(P(state.params, "stepDt", 0.08), 0.01);
    state.acc += dt;
    while (state.acc >= period && !state.done) {
      state.acc -= period;
      if (state.algo === 0) stepBubble(state);
      else if (state.algo === 1) stepInsertion(state);
      else stepQuick(state);
    }
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const n = state.arr.length;
    const pad = 40;
    const bw = (W - pad * 2) / n;
    const maxH = H - pad * 2;
    const names = ["bubble", "insertion", "quick"];
    for (let k = 0; k < n; k += 1) {
      const h = state.arr[k] * maxH;
      const x = pad + k * bw;
      const y = H - pad - h;
      let fill = C.body;
      const hot = !state.done && (state.algo === 0 && (k === state.j || k === state.j + 1) || state.algo === 1 && (k === state.j || k === state.i) || state.algo === 2 && (k === state.j || k === state.i || k === state.pivot));
      if (state.done) fill = C.vector;
      else if (hot) fill = C.accent;
      ctx.fillStyle = fill;
      ctx.fillRect(x + 1, y, Math.max(2, bw - 2), h);
      if (hot || state._flash > 0) {
        ctx.strokeStyle = C.vector;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 0.5, y - 1, Math.max(2, bw - 1), h + 2);
      }
    }
    if (state._flash > 0) state._flash -= 1;
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    const demo = Math.round(P(state.params, "demo", 0)) === 1;
    ctx.fillText(
      state.done ? `${names[state.algo]} \xB7 sorted` : `${names[state.algo]} \xB7 ${demo ? "\u8BFE\u5802\xB7\u4EC5step" : "\u81EA\u52A8"} \xB7 \u9AD8\u4EAE\u6BD4\u8F83\u4F4D`,
      12,
      20
    );
  },
  getReadouts(state) {
    const names = ["bubble", "insertion", "quick"];
    return [
      { label: "algo", value: names[state.algo] || "?" },
      { label: "comps", value: String(state.comps) },
      { label: "swaps", value: String(state.swaps) },
      { label: "t", value: `${formatNum(state.t, 2)} s` }
    ];
  },
  getTrajectory(state) {
    return state.arr.map((v, i) => ({ i, v }));
  }
};
function clampAlgo(v) {
  return Math.max(0, Math.min(2, Number(v) || 0));
}
function stepBubble(state) {
  const n = state.arr.length;
  if (state.i >= n - 1) {
    state.done = true;
    return;
  }
  state.comps += 1;
  if (state.arr[state.j] > state.arr[state.j + 1]) {
    const tmp = state.arr[state.j];
    state.arr[state.j] = state.arr[state.j + 1];
    state.arr[state.j + 1] = tmp;
    state.swaps += 1;
  }
  state.j += 1;
  if (state.j >= n - 1 - state.i) {
    state.j = 0;
    state.i += 1;
  }
}
function stepInsertion(state) {
  const n = state.arr.length;
  if (state.i === 0 && state.j === 0) state.i = 1;
  if (state.i >= n) {
    state.done = true;
    return;
  }
  if (state.j < 0) {
    state.i += 1;
    state.j = state.i - 1;
    return;
  }
  state.comps += 1;
  if (state.j >= 0 && state.arr[state.j] > state.arr[state.j + 1]) {
    const tmp = state.arr[state.j];
    state.arr[state.j] = state.arr[state.j + 1];
    state.arr[state.j + 1] = tmp;
    state.swaps += 1;
    state.j -= 1;
  } else {
    state.i += 1;
    state.j = state.i - 1;
  }
}
function stepQuick(state) {
  if (state.phase === "partition") {
    const { lo, hi } = state;
    if (lo == null || hi == null || lo >= hi) {
      state.phase = "next";
      return;
    }
    const pivotVal = state.arr[hi];
    state.pivot = hi;
    if (state.j > hi - 1) {
      const p = state.i + 1;
      if (p !== hi) {
        const tmp = state.arr[p];
        state.arr[p] = state.arr[hi];
        state.arr[hi] = tmp;
        state.swaps += 1;
      }
      state.stack.push({ lo, hi: p - 1 });
      state.stack.push({ lo: p + 1, hi });
      state.phase = "next";
      return;
    }
    state.comps += 1;
    if (state.arr[state.j] < pivotVal) {
      state.i += 1;
      if (state.i !== state.j) {
        const tmp = state.arr[state.i];
        state.arr[state.i] = state.arr[state.j];
        state.arr[state.j] = tmp;
        state.swaps += 1;
      }
    }
    state.j += 1;
    return;
  }
  while (state.stack.length) {
    const frame = state.stack.pop();
    if (frame.lo < frame.hi) {
      state.lo = frame.lo;
      state.hi = frame.hi;
      state.i = frame.lo - 1;
      state.j = frame.lo;
      state.pivot = frame.hi;
      state.phase = "partition";
      return;
    }
  }
  state.done = true;
}

// js/models/bfsGrid.js
var bfsGrid_default = {
  id: "bfs-grid",
  name: "BFS / A* \u5BFB\u8DEF",
  capabilities: {
    pointer: true,
    interaction: "canvas",
    formalism: "network",
    viz: "algo-step",
    fidelity: "principle",
    hint: "\u5DE6\u952E\u8D77/\u7EC8\u70B9\uFF1B\u53F3\u952E\u62D6\u5899\uFF08Shift=\u53EA\u5237\u5899 \xB7 Alt=\u53EA\u64E6\u901A\u8DEF\uFF09",
    actions: [
      { id: "step", label: "\u5355\u6B65\u6269\u5C55" },
      { id: "reset", label: "\u91CD\u7F6E\u7F51\u683C" }
    ]
  },
  params: {
    cols: 18,
    rows: 12,
    wallDensity: 0.22,
    stepDt: 0.05,
    seed: 7,
    algo: 0
    // 0 BFS 1 A*
  },
  paramSchema: {
    cols: { group: "numerics", unit: "\u2014", label: "\u5217\u6570", min: 8, max: 40 },
    rows: { group: "numerics", unit: "\u2014", label: "\u884C\u6570", min: 6, max: 30 },
    wallDensity: { group: "initial", unit: "\u2014", label: "\u5899\u5BC6\u5EA6", min: 0, max: 0.45 },
    stepDt: { group: "dynamics", unit: "s", label: "\u6B65\u8FDB\u95F4\u9694", min: 0.02, max: 0.3 },
    seed: { group: "initial", unit: "\u2014", label: "\u968F\u673A\u79CD\u5B50", min: 1, max: 9999 },
    algo: {
      group: "dynamics",
      unit: "\u2014",
      label: "\u7B97\u6CD5",
      min: 0,
      max: 1,
      options: [
        { value: 0, label: "BFS" },
        { value: 1, label: "A*" }
      ]
    }
  },
  runAction(state, actionId) {
    if (actionId === "reset") {
      this.init(state);
      return true;
    }
    if (actionId === "step") {
      if (state.done) return false;
      expandOnce(state);
      state._cur = state._lastCur || null;
      return true;
    }
    return false;
  },
  init(state) {
    const cols = Math.floor(P(state.params, "cols", 16));
    const rows = Math.floor(P(state.params, "rows", 12));
    const dens = P(state.params, "wallDensity", 0.2);
    let s = Math.floor(P(state.params, "seed", 1)) || 1;
    const rnd = () => {
      s = s * 48271 % 2147483647;
      return (s - 1) / 2147483646;
    };
    state.cols = cols;
    state.rows = rows;
    state.algo = Math.round(P(state.params, "algo", 0)) >= 1 ? 1 : 0;
    state.grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (x === 0 && y === 0 || x === cols - 1 && y === rows - 1) continue;
        if (rnd() < dens) state.grid[y][x] = 1;
      }
    }
    state.start = { x: 0, y: 0 };
    state.goal = { x: cols - 1, y: rows - 1 };
    state.visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    state.parent = Array.from({ length: rows }, () => Array(cols).fill(null));
    state.gScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
    state.gScore[0][0] = 0;
    state.queue = [{ x: 0, y: 0, f: heuristic({ x: 0, y: 0 }, state.goal) }];
    state.visited[0][0] = true;
    state.found = false;
    state.path = [];
    state.expanded = 0;
    state.acc = 0;
    state.t = 0;
    state.done = false;
  },
  step(state, dt) {
    const want = Math.round(P(state.params, "algo", 0)) >= 1 ? 1 : 0;
    if (want !== state.algo) {
      this.init(state);
      return;
    }
    if (state.done) return;
    const period = Math.max(P(state.params, "stepDt", 0.05), 0.01);
    state.acc += dt;
    state.t += dt;
    while (state.acc >= period && !state.done) {
      state.acc -= period;
      expandOnce(state);
    }
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 36;
    const cw = (W - pad * 2) / state.cols;
    const ch = (H - pad * 2) / state.rows;
    state._gridHit = { pad, cw, ch };
    for (let y = 0; y < state.rows; y += 1) {
      for (let x = 0; x < state.cols; x += 1) {
        const px = pad + x * cw;
        const py = pad + y * ch;
        if (state.grid[y][x] === 1) ctx.fillStyle = C.ground;
        else if (state.path.some((p) => p.x === x && p.y === y)) ctx.fillStyle = C.accent;
        else if (state.visited[y][x]) ctx.fillStyle = C.body2;
        else ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(px + 1, py + 1, cw - 2, ch - 2);
      }
    }
    const paintCell = (c, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(pad + c.x * cw + 2, pad + c.y * ch + 2, cw - 4, ch - 4);
    };
    paintCell(state.start, C.vector);
    paintCell(state.goal, C.body);
    if (state._lastCur) {
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        pad + state._lastCur.x * cw + 1,
        pad + state._lastCur.y * ch + 1,
        cw - 2,
        ch - 2
      );
    }
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    const algo = state.algo === 1 ? "A*" : "BFS";
    ctx.fillText(
      state.found ? `${algo} \xB7 path` : state.done ? `${algo} \xB7 no path` : `${algo} \xB7 \u70B9\u9009\u8D77/\u7EC8\u70B9 \xB7 step`,
      12,
      22
    );
  },
  onPointer(state, ev) {
    const g = state._gridHit;
    if (!g) return false;
    const col = Math.floor((ev.x - g.pad) / g.cw);
    const row = Math.floor((ev.y - g.pad) / g.ch);
    const inGrid = col >= 0 && row >= 0 && col < state.cols && row < state.rows;
    const paintWallAt = (c, r) => {
      if (c < 0 || r < 0 || c >= state.cols || r >= state.rows) return false;
      const isStart = state.start?.x === c && state.start?.y === r;
      const isGoal = state.goal?.x === c && state.goal?.y === r;
      if (isStart || isGoal) return false;
      if (state.grid[r][c] === state._paintValue) return false;
      state.grid[r][c] = state._paintValue;
      state._paintDirty = true;
      return true;
    };
    if (ev.type === "up") {
      if (state._paintWall) {
        state._paintWall = false;
        if (state._paintDirty) restartSearch(state);
        state._paintDirty = false;
        return true;
      }
      return false;
    }
    if (ev.type === "move") {
      if (!state._paintWall || !inGrid) return !!state._paintWall;
      paintWallAt(col, row);
      return true;
    }
    if (ev.type !== "down" || !inGrid) return false;
    if (ev.button === 2 || ev.button === 1) {
      const isStart = state.start?.x === col && state.start?.y === row;
      const isGoal = state.goal?.x === col && state.goal?.y === row;
      if (!isStart && !isGoal) {
        if (ev.shiftKey) {
          state._paintValue = 1;
          state._lastPaintMode = "\u5237\u5899";
        } else if (ev.altKey) {
          state._paintValue = 0;
          state._lastPaintMode = "\u64E6\u9664";
        } else {
          state._paintValue = state.grid[row][col] === 1 ? 0 : 1;
          state._lastPaintMode = "\u5207\u6362";
        }
        state._paintWall = true;
        state._paintDirty = false;
        paintWallAt(col, row);
      }
      return true;
    }
    state._paintWall = false;
    if (state.grid[row][col] === 1) return true;
    if (!state._setPhase || state._setPhase === "start") {
      state.start = { x: col, y: row };
      state._setPhase = "goal";
      restartSearch(state);
      return true;
    }
    state.goal = { x: col, y: row };
    state._setPhase = "start";
    restartSearch(state);
    return true;
  },
  getReadouts(state) {
    let paintMode = "\u2014";
    if (state._paintWall) {
      paintMode = state._paintValue === 1 ? "\u5237\u5899" : state._paintValue === 0 ? "\u64E6\u9664" : "\u5207\u6362";
    } else if (state._lastPaintMode) {
      paintMode = state._lastPaintMode;
    }
    return [
      { label: "t", value: formatNum(state.t || 0, 3) },
      { label: "algo", value: state.algo === 1 ? "A*" : "BFS" },
      { label: "\u753B\u5899", value: paintMode },
      { label: "expanded", value: String(state.expanded) },
      { label: "frontier", value: String(state.queue.length) },
      { label: "path", value: state.found ? String(state.path.length) : "\u2014" }
    ];
  }
};
function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
function restartSearch(state) {
  const { cols, rows, start, goal } = state;
  state.visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  state.parent = Array.from({ length: rows }, () => Array(cols).fill(null));
  state.gScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  state.gScore[start.y][start.x] = 0;
  state.queue = [{ x: start.x, y: start.y, f: heuristic(start, goal) }];
  state.visited[start.y][start.x] = true;
  state.found = false;
  state.path = [];
  state.expanded = 0;
  state.acc = 0;
  state.done = false;
  state._lastCur = null;
}
function expandOnce(state) {
  if (state.found) {
    if (!state.path.length) {
      let cur2 = state.goal;
      while (cur2) {
        state.path.push(cur2);
        cur2 = state.parent[cur2.y][cur2.x];
      }
      state.path.reverse();
    }
    state.done = true;
    return;
  }
  if (!state.queue.length) {
    state.done = true;
    return;
  }
  let cur;
  if (state.algo === 0) {
    cur = state.queue.shift();
  } else {
    let best = 0;
    for (let i = 1; i < state.queue.length; i += 1) {
      if (state.queue[i].f < state.queue[best].f) best = i;
    }
    cur = state.queue.splice(best, 1)[0];
  }
  state._lastCur = cur;
  state.expanded += 1;
  if (cur.x === state.goal.x && cur.y === state.goal.y) {
    state.found = true;
    return;
  }
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dy] of dirs) {
    const nx = cur.x + dx;
    const ny = cur.y + dy;
    if (nx < 0 || ny < 0 || nx >= state.cols || ny >= state.rows) continue;
    if (state.grid[ny][nx] === 1) continue;
    const tentG = state.gScore[cur.y][cur.x] + 1;
    if (tentG >= state.gScore[ny][nx]) continue;
    state.gScore[ny][nx] = tentG;
    state.parent[ny][nx] = { x: cur.x, y: cur.y };
    const f = tentG + heuristic({ x: nx, y: ny }, state.goal);
    if (!state.visited[ny][nx]) {
      state.visited[ny][nx] = true;
      state.queue.push({ x: nx, y: ny, f });
    } else if (state.algo === 1) {
      state.queue.push({ x: nx, y: ny, f });
    }
  }
}

// js/models/life.js
var life_default = {
  id: "life",
  name: "\u751F\u547D\u6E38\u620F",
  perfClass: perfClassFor("life"),
  params: {
    n: 36,
    stepDt: 0.12,
    density: 0.28,
    seed: 3,
    algo: 0
  },
  paramSchema: {
    n: { group: "numerics", unit: "", label: "n", min: 8, max: 128 },
    stepDt: { group: "dynamics", unit: "s", label: "stepDt", min: 0.02, max: 2 },
    density: { group: "initial", unit: "", label: "density", min: 0, max: 1 },
    seed: { group: "initial", unit: "", label: "seed", min: 1, max: 9999 },
    algo: {
      group: "dynamics",
      unit: "",
      label: "\u89C4\u5219",
      min: 0,
      max: 2,
      options: [
        { value: 0, label: "B3/S23 Conway" },
        { value: 1, label: "B3/S23 HighLife\u2248" },
        { value: 2, label: "seeds B2/S" }
      ]
    }
  },
  init(state) {
    const cap = mobileBudget().lifeNCap;
    const n = Math.min(cap, Math.max(8, Math.floor(P(state.params, "n", 32))));
    if (Number(state.params.n) > n) state.params.n = n;
    const dens = P(state.params, "density", 0.3);
    let s = Math.floor(P(state.params, "seed", 1)) || 1;
    const rnd = () => {
      s = s * 48271 % 2147483647;
      return (s - 1) / 2147483646;
    };
    state.n = n;
    state.grid = Array.from({ length: n }, () => Array.from({ length: n }, () => rnd() < dens ? 1 : 0));
    state.gen = 0;
    state.alive = state.grid.flat().reduce((a, b) => a + b, 0);
    state.acc = 0;
    state.t = 0;
    state.algo = Math.round(P(state.params, "algo", 0));
  },
  step(state, dt) {
    const want = Math.round(P(state.params, "algo", 0));
    if (want !== state.algo) {
      this.init(state);
      return;
    }
    const period = Math.max(P(state.params, "stepDt", 0.12), 0.02);
    state.acc += dt;
    state.t += dt;
    const n = state.n;
    const algo = state.algo;
    const maxGens = mobileBudget().lifeMaxGens;
    let gens = 0;
    while (state.acc >= period && gens < maxGens) {
      state.acc -= period;
      gens += 1;
      const next = Array.from({ length: n }, () => Array(n).fill(0));
      let alive = 0;
      for (let y = 0; y < n; y += 1) {
        for (let x = 0; x < n; x += 1) {
          let nb = 0;
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (!dx && !dy) continue;
              const yy = (y + dy + n) % n;
              const xx = (x + dx + n) % n;
              nb += state.grid[yy][xx];
            }
          }
          const live = state.grid[y][x];
          let v = 0;
          if (algo === 2) {
            v = !live && nb === 2 ? 1 : 0;
          } else if (algo === 1) {
            v = live ? nb === 2 || nb === 3 ? 1 : 0 : nb === 3 || nb === 6 ? 1 : 0;
          } else {
            v = live ? nb === 2 || nb === 3 ? 1 : 0 : nb === 3 ? 1 : 0;
          }
          next[y][x] = v;
          alive += v;
        }
      }
      state.grid = next;
      state.alive = alive;
      state.gen += 1;
    }
    if (gens >= maxGens && state.acc >= period) state.acc = period * 0.5;
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const n = state.n;
    const pad = 28;
    const cell = Math.min((W - pad * 2) / n, (H - pad * 2) / n);
    const ox = (W - cell * n) / 2;
    const oy = (H - cell * n) / 2;
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        if (!state.grid[y][x]) continue;
        ctx.fillStyle = C.body;
        ctx.fillRect(ox + x * cell, oy + y * cell, cell - 0.5, cell - 0.5);
      }
    }
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText(`gen ${state.gen}`, 12, 20);
  },
  getReadouts(state) {
    return [
      { label: "gen", value: String(state.gen) },
      { label: "alive", value: String(state.alive) },
      { label: "density", value: formatNum(state.alive / (state.n * state.n), 3) },
      { label: "t", value: `${formatNum(state.t, 2)} s` }
    ];
  }
};

// js/models/cacheLru.js
var cacheLru_default = {
  id: "cache-lru",
  name: "LRU \u7F13\u5B58",
  params: {
    capacity: 6,
    uniq: 14,
    stepDt: 0.15,
    seed: 11
  },
  paramSchema: {
    capacity: { group: "numerics", unit: "", label: "capacity", min: 2, max: 16 },
    uniq: { group: "initial", unit: "", label: "keys", min: 4, max: 40 },
    stepDt: { group: "dynamics", unit: "s", label: "stepDt", min: 0.05, max: 0.6 },
    seed: { group: "initial", unit: "", label: "seed", min: 1, max: 9999 }
  },
  init(state) {
    const cap = Math.floor(P(state.params, "capacity", 6));
    const uniq = Math.floor(P(state.params, "uniq", 12));
    let s = Math.floor(P(state.params, "seed", 1)) || 1;
    const rnd = () => {
      s = s * 16807 % 2147483647;
      return (s - 1) / 2147483646;
    };
    state.cap = cap;
    state.slots = [];
    state.stream = Array.from({ length: 200 }, () => 1 + Math.floor(rnd() * uniq));
    state.si = 0;
    state.hits = 0;
    state.misses = 0;
    state.last = null;
    state.lastHit = false;
    state.acc = 0;
    state.t = 0;
  },
  step(state, dt) {
    const period = Math.max(P(state.params, "stepDt", 0.15), 0.03);
    state.acc += dt;
    state.t += dt;
    while (state.acc >= period) {
      state.acc -= period;
      const key = state.stream[state.si % state.stream.length];
      state.si += 1;
      state.last = key;
      const idx = state.slots.findIndex((s) => s.key === key);
      if (idx >= 0) {
        state.hits += 1;
        state.lastHit = true;
        const [item] = state.slots.splice(idx, 1);
        item.age = state.t;
        state.slots.push(item);
      } else {
        state.misses += 1;
        state.lastHit = false;
        if (state.slots.length >= state.cap) state.slots.shift();
        state.slots.push({ key, age: state.t });
      }
    }
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 48;
    const slotW = (W - pad * 2) / state.cap;
    const slotH = 64;
    const y = H * 0.38;
    ctx.fillStyle = C.muted;
    ctx.font = "12px IBM Plex Mono, monospace";
    ctx.fillText("LRU \u2190 oldest \u2026 newest \u2192", pad, y - 16);
    for (let i = 0; i < state.cap; i += 1) {
      const x = pad + i * slotW;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(x + 4, y, slotW - 8, slotH);
      const item = state.slots[i];
      if (item) {
        ctx.fillStyle = item.key === state.last ? C.accent : C.body;
        ctx.fillRect(x + 6, y + 2, slotW - 12, slotH - 4);
        ctx.fillStyle = "#111";
        ctx.font = "bold 16px IBM Plex Mono, monospace";
        ctx.fillText(String(item.key), x + slotW / 2 - 8, y + 38);
      }
    }
    ctx.fillStyle = state.lastHit ? C.vector : C.body2;
    ctx.font = "13px IBM Plex Mono, monospace";
    ctx.fillText(
      state.last == null ? "\u2014" : `access ${state.last} \u2192 ${state.lastHit ? "HIT" : "MISS"}`,
      pad,
      y + slotH + 36
    );
  },
  getReadouts(state) {
    const total = state.hits + state.misses;
    const rate = total ? state.hits / total : 0;
    return [
      { label: "t", value: formatNum(state.t || 0, 3) },
      { label: "hits", value: String(state.hits) },
      { label: "miss", value: String(state.misses) },
      { label: "hit%", value: formatNum(rate * 100, 1) },
      { label: "fill", value: `${state.slots.length}/${state.cap}` }
    ];
  }
};

// js/models/pipeline.js
var STAGES = ["IF", "ID", "EX", "MEM", "WB"];
var pipeline_default = {
  id: "pipeline",
  name: "CPU \u6D41\u6C34\u7EBF",
  params: {
    stallEvery: 5,
    stepDt: 0.2,
    hazardMode: 1,
    hazardRate: 0.35,
    seed: 9
  },
  paramSchema: {
    stallEvery: { group: "dynamics", unit: "", label: "stallEvery", min: 0, max: 20 },
    stepDt: { group: "dynamics", unit: "s", label: "stepDt", min: 0.05, max: 0.8 },
    hazardMode: {
      group: "dynamics",
      unit: "",
      label: "hazardMode",
      min: 0,
      max: 1,
      options: [
        { value: 0, label: "\u5468\u671F\u505C\u987F" },
        { value: 1, label: "\u6570\u636E\u5192\u9669" }
      ]
    },
    hazardRate: { group: "dynamics", unit: "", label: "hazardRate", min: 0, max: 1 },
    seed: { group: "initial", unit: "", label: "seed", min: 1, max: 9999 }
  },
  init(state) {
    let s = Math.floor(P(state.params, "seed", 9)) || 1;
    state.rnd = () => {
      s = s * 48271 % 2147483647;
      return (s - 1) / 2147483646;
    };
    state.stages = STAGES.map(() => null);
    state.nextId = 1;
    state.cycle = 0;
    state.retired = 0;
    state.stalls = 0;
    state.bubbles = 0;
    state.dataHazards = 0;
    state.acc = 0;
    state.t = 0;
    state.freezeIF = 0;
    state.lastEvent = "boot";
  },
  step(state, dt) {
    const period = Math.max(P(state.params, "stepDt", 0.2), 0.05);
    const stallEvery = Math.floor(P(state.params, "stallEvery", 5));
    const hazardMode = Math.round(P(state.params, "hazardMode", 1)) >= 1 ? 1 : 0;
    const hazardRate = P(state.params, "hazardRate", 0.35);
    state.acc += dt;
    state.t += dt;
    while (state.acc >= period) {
      state.acc -= period;
      state.cycle += 1;
      if (state.stages[4] != null) {
        state.retired += 1;
        state.stages[4] = null;
      }
      let dataStall = false;
      if (hazardMode === 1 && state.stages[1] != null) {
        const rawHazard = (state.stages[2] != null || state.stages[3] != null) && state.rnd() < hazardRate;
        if (rawHazard) {
          dataStall = true;
          state.dataHazards += 1;
          state.stalls += 1;
          state.bubbles += 1;
          state.lastEvent = "data-hazard";
          state.stages[4] = state.stages[3];
          state.stages[3] = state.stages[2];
          state.stages[2] = null;
          continue;
        }
      }
      for (let i = 4; i >= 1; i -= 1) {
        state.stages[i] = state.stages[i - 1];
        state.stages[i - 1] = null;
      }
      const periodStall = hazardMode === 0 && stallEvery > 0 && state.cycle % stallEvery === 0;
      if (periodStall || state.freezeIF > 0) {
        if (periodStall) {
          state.stalls += 1;
          state.bubbles += 1;
          state.lastEvent = "period-stall";
        }
        if (state.freezeIF > 0) state.freezeIF -= 1;
        state.stages[0] = null;
      } else if (!dataStall) {
        state.stages[0] = state.nextId;
        state.nextId += 1;
        state.lastEvent = "issue";
      }
    }
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 40;
    const boxW = (W - pad * 2) / 5;
    const y = H * 0.35;
    const h = 70;
    const mode = Math.round(P(state.params, "hazardMode", 1)) >= 1 ? "data-hazard" : "period-stall";
    STAGES.forEach((name, i) => {
      const x = pad + i * boxW;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(x + 6, y, boxW - 12, h);
      ctx.fillStyle = C.muted;
      ctx.font = "12px IBM Plex Mono, monospace";
      ctx.fillText(name, x + 16, y - 10);
      const id = state.stages[i];
      if (id == null) {
        ctx.fillStyle = C.ground;
        ctx.fillRect(x + 10, y + 10, boxW - 20, h - 20);
        ctx.fillStyle = "#111";
        ctx.fillText("\u25CB", x + boxW / 2 - 6, y + 42);
      } else {
        ctx.fillStyle = C.body;
        ctx.fillRect(x + 10, y + 10, boxW - 20, h - 20);
        ctx.fillStyle = "#111";
        ctx.font = "bold 14px IBM Plex Mono, monospace";
        ctx.fillText(`I${id}`, x + boxW / 2 - 12, y + 42);
      }
      if (i < 4) {
        ctx.strokeStyle = C.vector;
        ctx.beginPath();
        ctx.moveTo(x + boxW - 8, y + h / 2);
        ctx.lineTo(x + boxW + 4, y + h / 2);
        ctx.stroke();
      }
    });
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText(`mode=${mode} \xB7 last ${state.lastEvent}`, pad, y + h + 36);
  },
  getReadouts(state) {
    const ipc = state.cycle ? state.retired / state.cycle : 0;
    return [
      { label: "t", value: formatNum(state.t || 0, 3) },
      { label: "cycle", value: String(state.cycle) },
      { label: "retired", value: String(state.retired) },
      { label: "hazards", value: String(state.dataHazards) },
      { label: "IPC", value: formatNum(ipc, 2) }
    ];
  }
};

// js/models/fifo.js
var fifo_default = {
  id: "fifo",
  name: "FIFO \u7F13\u51B2",
  params: {
    depth: 10,
    produceRate: 4,
    consumeRate: 3,
    stepDt: 0.12,
    seed: 5
  },
  paramSchema: {
    depth: { group: "numerics", unit: "", label: "depth", min: 3, max: 24 },
    produceRate: { group: "dynamics", unit: "1/s", label: "produce", min: 0, max: 20 },
    consumeRate: { group: "dynamics", unit: "1/s", label: "consume", min: 0, max: 20 },
    stepDt: { group: "dynamics", unit: "s", label: "stepDt", min: 0.05, max: 0.5 },
    seed: { group: "initial", unit: "", label: "seed", min: 1, max: 9999 }
  },
  init(state) {
    state.depth = Math.floor(P(state.params, "depth", 10));
    state.q = [];
    state.nextId = 1;
    state.dropped = 0;
    state.produced = 0;
    state.consumed = 0;
    state.acc = 0;
    state.prodAcc = 0;
    state.consAcc = 0;
    state.t = 0;
    state.lastEvent = "idle";
  },
  step(state, dt) {
    const period = Math.max(P(state.params, "stepDt", 0.12), 0.03);
    const pr = Math.max(P(state.params, "produceRate", 1), 0);
    const cr = Math.max(P(state.params, "consumeRate", 1), 0);
    state.acc += dt;
    state.t += dt;
    state.prodAcc += pr * dt;
    state.consAcc += cr * dt;
    while (state.acc >= period) {
      state.acc -= period;
      while (state.prodAcc >= 1) {
        state.prodAcc -= 1;
        if (state.q.length >= state.depth) {
          state.dropped += 1;
          state.lastEvent = "drop";
        } else {
          state.q.push(state.nextId);
          state.nextId += 1;
          state.produced += 1;
          state.lastEvent = "push";
        }
      }
      while (state.consAcc >= 1) {
        state.consAcc -= 1;
        if (state.q.length) {
          state.q.shift();
          state.consumed += 1;
          state.lastEvent = "pop";
        }
      }
    }
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 50;
    const slotW = (W - pad * 2) / state.depth;
    const y = H * 0.4;
    const h = 56;
    ctx.fillStyle = C.muted;
    ctx.font = "12px IBM Plex Mono, monospace";
    ctx.fillText("in \u2192  FIFO  \u2192 out", pad, y - 18);
    for (let i = 0; i < state.depth; i += 1) {
      const x = pad + i * slotW;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(x + 3, y, slotW - 6, h);
      const item = state.q[i];
      if (item != null) {
        ctx.fillStyle = C.body;
        ctx.fillRect(x + 5, y + 2, slotW - 10, h - 4);
        ctx.fillStyle = "#111";
        ctx.font = "12px IBM Plex Mono, monospace";
        ctx.fillText(String(item), x + slotW / 2 - 8, y + 34);
      }
    }
    const fill = state.q.length / state.depth;
    ctx.fillStyle = C.vector;
    ctx.fillRect(pad, y + h + 24, (W - pad * 2) * fill, 10);
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(pad, y + h + 24, W - pad * 2, 10);
    ctx.fillStyle = state.lastEvent === "drop" ? C.accent : C.muted;
    ctx.fillText(`last: ${state.lastEvent}`, pad, y + h + 54);
  },
  getReadouts(state) {
    return [
      { label: "occ", value: `${state.q.length}/${state.depth}` },
      { label: "prod", value: String(state.produced) },
      { label: "cons", value: String(state.consumed) },
      { label: "drop", value: String(state.dropped) }
    ];
  }
};

// js/models/rcCircuit.js
var rcCircuit_default = {
  id: "rc-circuit",
  name: "RC \u7535\u8DEF",
  params: {
    R: 1e3,
    C: 1e-3,
    Vin: 5,
    V0: 0,
    mode: 1
  },
  paramSchema: {
    R: { group: "dynamics", unit: "\u03A9", label: "R", min: 10, max: 2e4 },
    C: { group: "dynamics", unit: "F", label: "C", min: 1e-4, max: 0.05 },
    Vin: { group: "dynamics", unit: "V", label: "Vin", min: -12, max: 12 },
    V0: { group: "initial", unit: "V", label: "Vc\u2080", min: -12, max: 12 },
    mode: { group: "dynamics", unit: "", label: "charge(1)/dis(0)", min: 0, max: 1 }
  },
  init(state) {
    state.t = 0;
    state.Vc = P(state.params, "V0", 0);
    state.trail = [];
  },
  step(state, dt) {
    const R = Math.max(P(state.params, "R", 1e3), 1e-6);
    const Cap = Math.max(P(state.params, "C", 1e-3), 1e-9);
    const mode = P(state.params, "mode", 1) >= 0.5 ? 1 : 0;
    const Vin = mode ? P(state.params, "Vin", 5) : 0;
    const tau = R * Cap;
    state.Vc = finiteOr(state.Vc + (Vin - state.Vc) / tau * dt, state.Vc);
    state.t += dt;
    state.trail.push({ t: state.t, Vc: state.Vc });
    if (state.trail.length > 600) state.trail.shift();
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = { l: 50, r: 30, t: 40, b: 40 };
    const VinAbs = Math.abs(P(state.params, "Vin", 5)) || 5;
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const tMax = Math.max(state.t, 0.5);
    const X = (t) => pad.l + t / tMax * plotW;
    const Y = (v) => pad.t + (1 - (v / (VinAbs * 1.2) + 0.1) / 1.2) * plotH;
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + plotH);
    ctx.lineTo(pad.l + plotW, pad.t + plotH);
    ctx.stroke();
    const R = Math.max(P(state.params, "R", 1e3), 1e-6);
    const Cap = Math.max(P(state.params, "C", 1e-3), 1e-9);
    const tau = R * Cap;
    const mode = P(state.params, "mode", 1) >= 0.5 ? 1 : 0;
    const Vin = mode ? P(state.params, "Vin", 5) : 0;
    const V0 = P(state.params, "V0", 0);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = C.theory || "#7c9cbf";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 80; i += 1) {
      const t = tMax * i / 80;
      const v = Vin + (V0 - Vin) * Math.exp(-t / tau);
      const x = X(t);
      const y = Y(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (state.trail.length > 1) {
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      state.trail.forEach((p, i) => {
        const x = X(p.t);
        const y = Y(p.Vc);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    const cx = W * 0.78;
    const cy = H * 0.28;
    ctx.strokeStyle = C.vector;
    ctx.strokeRect(cx, cy, 40, 24);
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText("C", cx + 14, cy + 16);
    ctx.fillText(`Vc=${formatNum(state.Vc, 2)}V \xB7 \u865A\u7EBF=\u89E3\u6790`, 12, 22);
  },
  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const R = P(state.params, "R", 1e3);
    const Cap = P(state.params, "C", 1e-3);
    return [
      { label: "t", value: `${formatNum(state.t, d)} s` },
      { label: "Vc", value: `${formatNum(state.Vc, d)} V` },
      { label: "\u03C4", value: `${formatNum(R * Cap, d)} s` }
    ];
  },
  getTrajectory(state) {
    return state.trail.map((p) => ({ t: p.t, Vc: p.Vc }));
  }
};

// js/models/rlc.js
var rlc_default = {
  id: "rlc",
  name: "RLC \u632F\u8361",
  params: {
    R: 2,
    L: 1,
    C: 0.25,
    I0: 0,
    V0: 4
  },
  paramSchema: {
    R: { group: "dynamics", unit: "\u03A9", label: "R", min: 0, max: 40 },
    L: { group: "dynamics", unit: "H", label: "L", min: 0.05, max: 10 },
    C: { group: "dynamics", unit: "F", label: "C", min: 0.02, max: 5 },
    I0: { group: "initial", unit: "A", label: "I\u2080", min: -10, max: 10 },
    V0: { group: "initial", unit: "V", label: "Vc\u2080", min: -20, max: 20 }
  },
  init(state) {
    state.t = 0;
    state.I = P(state.params, "I0", 0);
    state.Vc = P(state.params, "V0", 4);
    state.trailI = [];
    state.trailV = [];
  },
  step(state, dt) {
    const R = P(state.params, "R", 1);
    const L = Math.max(P(state.params, "L", 1), 1e-6);
    const Cap = Math.max(P(state.params, "C", 0.2), 1e-6);
    const dI = -R / L * state.I - state.Vc / L;
    const dV = state.I / Cap;
    state.I = finiteOr(state.I + dI * dt, 0);
    state.Vc = finiteOr(state.Vc + dV * dt, state.Vc);
    state.t += dt;
    state.trailI.push({ t: state.t, v: state.I });
    state.trailV.push({ t: state.t, v: state.Vc });
    if (state.trailI.length > 700) {
      state.trailI.shift();
      state.trailV.shift();
    }
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = { l: 48, r: 24, t: 36, b: 36 };
    const plotW = W - pad.l - pad.r;
    const plotH = (H - pad.t - pad.b) / 2 - 10;
    const tMax = Math.max(state.t, 0.8);
    const iMax = Math.max(1, ...state.trailI.map((p) => Math.abs(p.v)), Math.abs(state.I));
    const vMax = Math.max(1, ...state.trailV.map((p) => Math.abs(p.v)), Math.abs(state.Vc));
    const R = P(state.params, "R", 1);
    const L = Math.max(P(state.params, "L", 1), 1e-6);
    const Cap = Math.max(P(state.params, "C", 0.25), 1e-6);
    const I0 = P(state.params, "I0", 0);
    const V0 = P(state.params, "V0", 4);
    const alpha = R / (2 * L);
    const w0 = 1 / Math.sqrt(L * Cap);
    const under = w0 > alpha;
    const wd = under ? Math.sqrt(w0 * w0 - alpha * alpha) : 0;
    const dVc0 = I0 / Cap;
    const drawSeries = (trail, top, maxAbs, color, label, analyticFn) => {
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(pad.l, top);
      ctx.lineTo(pad.l, top + plotH);
      ctx.lineTo(pad.l + plotW, top + plotH);
      ctx.stroke();
      if (analyticFn && under) {
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = C.theory || "#7c9cbf";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i <= 100; i += 1) {
          const t = tMax * i / 100;
          const v = analyticFn(t);
          const x = pad.l + t / tMax * plotW;
          const y = top + plotH / 2 - v / (maxAbs * 1.2) * (plotH / 2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (trail.length > 1) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        trail.forEach((p, i) => {
          const x = pad.l + p.t / tMax * plotW;
          const y = top + plotH / 2 - p.v / (maxAbs * 1.2) * (plotH / 2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
      ctx.fillStyle = C.muted;
      ctx.font = "11px IBM Plex Mono, monospace";
      ctx.fillText(label, pad.l + 6, top + 14);
    };
    const A = V0;
    const B = wd > 0 ? (dVc0 + alpha * V0) / wd : 0;
    const vcAnalytic = (t) => Math.exp(-alpha * t) * (A * Math.cos(wd * t) + B * Math.sin(wd * t));
    const iAnalytic = (t) => {
      const e = Math.exp(-alpha * t);
      const dVc = e * (-alpha * (A * Math.cos(wd * t) + B * Math.sin(wd * t)) + (-A * wd * Math.sin(wd * t) + B * wd * Math.cos(wd * t)));
      return Cap * dVc;
    };
    drawSeries(state.trailI, pad.t, iMax, C.body, "I(t) \xB7 \u865A\u7EBF\u89E3\u6790", iAnalytic);
    drawSeries(state.trailV, pad.t + plotH + 20, vMax, C.vector, "Vc(t) \xB7 \u865A\u7EBF\u89E3\u6790", vcAnalytic);
  },
  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const L = P(state.params, "L", 1);
    const Cap = P(state.params, "C", 0.25);
    const w0 = 1 / Math.sqrt(L * Cap);
    return [
      { label: "t", value: `${formatNum(state.t, d)} s` },
      { label: "I", value: `${formatNum(state.I, d)} A` },
      { label: "Vc", value: `${formatNum(state.Vc, d)} V` },
      { label: "\u03C9\u2080", value: `${formatNum(w0, d)} rad/s` }
    ];
  },
  getTrajectory(state) {
    return state.trailI.map((p, i) => ({ t: p.t, I: p.v, Vc: state.trailV[i]?.v }));
  }
};

// js/models/inclinedPlane.js
var inclinedPlane_default = {
  id: "inclined-plane",
  name: "\u659C\u9762\u6ED1\u52A8\u7269\u5757",
  capabilities: {
    pointer: true,
    interaction: "canvas",
    formalism: "ode",
    viz: "phet-particle",
    fidelity: "principle",
    hint: "\u62D6\u52A8\u7269\u5757\u6539 s\uFF1B\u62D6\u659C\u9762\u7AEF\u70B9\u6539 \u03B8\uFF08\u7C7B PhET \u7EA6\u675F\u70B9\uFF09"
  },
  params: {
    g: 9.81,
    theta: 30,
    mu_s: 0.35,
    mu_k: 0.22,
    m: 1.2,
    s0: 0.2,
    v0: 0,
    c: 0,
    length: 8,
    e: 0.3
  },
  paramSchema: {
    g: { group: "dynamics", unit: "m/s\xB2", label: "g", min: 0, max: 80 },
    theta: { group: "dynamics", unit: "\xB0", label: "\u659C\u9762\u89D2 \u03B8", min: 0, max: 89 },
    mu_s: { group: "dynamics", unit: "\u2014", label: "\u9759\u6469\u64E6 \u03BC_s", min: 0, max: 2 },
    mu_k: { group: "dynamics", unit: "\u2014", label: "\u52A8\u6469\u64E6 \u03BC_k", min: 0, max: 2 },
    m: { group: "dynamics", unit: "kg", label: "m", min: 1e-3, max: 1e4 },
    c: { group: "dynamics", unit: "N\xB7s/m", label: "\u7C98\u6EDE c", min: 0, max: 200 },
    length: { group: "dynamics", unit: "m", label: "\u659C\u9762\u957F", min: 0.5, max: 50 },
    e: { group: "dynamics", unit: "\u2014", label: "\u5E95\u7AEF e", min: 0, max: 1 },
    s0: { group: "initial", unit: "m", label: "s\u2080", min: 0, max: 50 },
    v0: { group: "initial", unit: "m/s", label: "v\u2080", min: -40, max: 40 }
  },
  init(state) {
    const L = Math.max(P(state.params, "length", 8), 0.1);
    state.t = 0;
    state.s = Math.max(0, Math.min(L, P(state.params, "s0", 0)));
    state.v = P(state.params, "v0", 0);
    state.a = 0;
    state.stuck = false;
    state.trail = [];
    state.N = 0;
    state.Ff = 0;
  },
  step(state, dt) {
    const g = P(state.params, "g", 9.81);
    const th = P(state.params, "theta", 30) * Math.PI / 180;
    const muS = P(state.params, "mu_s", 0.35);
    const muK = P(state.params, "mu_k", 0.22);
    const m = Math.max(P(state.params, "m", 1), 1e-9);
    const c = P(state.params, "c", 0);
    const L = Math.max(P(state.params, "length", 8), 0.1);
    const e = P(state.params, "e", 0.3);
    const N = m * g * Math.cos(th);
    state.N = N;
    const drive = m * g * Math.sin(th);
    const locals = { s: state.s, v: state.v, t: state.t, g, m, theta: th };
    if (Math.abs(state.v) < 1e-3) {
      const maxStatic = muS * N;
      if (Math.abs(drive) <= maxStatic + 1e-9) {
        state.v = 0;
        state.a = 0;
        state.Ff = drive;
        state.stuck = true;
        state.t += dt;
        return;
      }
      state.stuck = false;
      state.v = Math.sign(drive) * 1e-4;
    } else {
      state.stuck = false;
    }
    const ff = -Math.sign(state.v) * muK * N;
    state.Ff = ff;
    let a = (drive + ff - c * state.v) / m + accelExtras(state.params, locals);
    state.v = finiteOr(state.v + a * dt, 0);
    state.s = finiteOr(state.s + state.v * dt, state.s);
    state.a = a;
    state.t += dt;
    if (state.s < 0) {
      state.s = 0;
      state.v = -e * state.v;
    }
    if (state.s > L) {
      state.s = L;
      state.v = -e * state.v;
    }
    state.trail.push({ t: state.t, s: state.s, v: state.v });
    if (state.trail.length > 500) state.trail.shift();
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const th = P(state.params, "theta", 30) * Math.PI / 180;
    const L = Math.max(P(state.params, "length", 8), 0.1);
    const margin = 48;
    const x0 = margin;
    const y0 = H - margin;
    const pix = Math.min((W - margin * 2) / (L * Math.cos(th) + 0.01), (H - margin * 2) / (L * Math.sin(th) + 0.01));
    const x1 = x0 + L * Math.cos(th) * pix;
    const y1 = y0 - L * Math.sin(th) * pix;
    state._plane = { x0, y0, x1, y1, pix, L, th, W, H };
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1, y0);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "rgba(148,163,184,0.12)";
    ctx.fill();
    const u = state.s / L;
    const bx = x0 + u * (x1 - x0);
    const by = y0 + u * (y1 - y0);
    const nx = -Math.sin(th);
    const ny = -Math.cos(th);
    state._block = { x: bx + nx * 14, y: by + ny * 14, r: 22 };
    ctx.fillStyle = C.vector;
    ctx.beginPath();
    ctx.arc(x1, y1, 7, 0, Math.PI * 2);
    ctx.fill();
    state._hinge = { x: x1, y: y1, r: 12 };
    ctx.fillStyle = C.body;
    ctx.save();
    ctx.translate(bx + nx * 14, by + ny * 14);
    ctx.rotate(-th);
    ctx.fillRect(-16, -12, 32, 24);
    if (state._drag === "block") {
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(-18, -14, 36, 28);
    }
    ctx.restore();
    if (view.showVectors !== false) {
      const scale = 8;
      drawArrow(ctx, bx, by, bx + Math.cos(th) * state.v * scale, by - Math.sin(th) * state.v * scale, C.vector, 2);
      drawArrow(ctx, bx, by, bx + nx * 28, by + ny * 28, C.accent, 2);
      const tx = Math.cos(th);
      const ty = -Math.sin(th);
      drawArrow(ctx, bx, by, bx + tx * (state.Ff / Math.max(P(state.params, "m", 1), 1e-6)) * 4, by + ty * (state.Ff / Math.max(P(state.params, "m", 1), 1e-6)) * 4, C.body2 || C.theory, 2);
    }
    if (view.showTrail !== false) {
      ctx.fillStyle = C.trail;
      for (let i = 0; i < state.trail.length; i += 4) {
        const p = state.trail[i];
        const uu = p.s / L;
        ctx.beginPath();
        ctx.arc(x0 + uu * (x1 - x0), y0 + uu * (y1 - y0), 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText(`\u03B8=${formatNum(th * 180 / Math.PI, 1)}\xB0  ${state.stuck ? "static" : "sliding"}`, margin, 22);
  },
  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: "t", value: `${formatNum(state.t, d)} s` },
      { label: "s", value: `${formatNum(state.s, d)} m` },
      { label: "v", value: `${formatNum(state.v, d)} m/s` },
      { label: "a", value: `${formatNum(state.a, d)} m/s\xB2` },
      { label: "N", value: `${formatNum(state.N, d)} N` },
      { label: "Ff", value: `${formatNum(state.Ff, d)} N` }
    ];
  },
  getEnergy(state) {
    const m = P(state.params, "m", 1);
    const g = P(state.params, "g", 9.81);
    const th = P(state.params, "theta", 30) * Math.PI / 180;
    const h = state.s * Math.sin(th);
    return { kinetic: 0.5 * m * state.v * state.v, potential: m * g * h };
  },
  getTrajectory(state) {
    return state.trail;
  },
  onPointer(state, ev) {
    if (!state._plane) return false;
    const { x0, y0, L } = state._plane;
    if (ev.type === "down") {
      const h = state._hinge;
      if (h && (ev.x - h.x) ** 2 + (ev.y - h.y) ** 2 <= h.r * h.r) {
        state._drag = "hinge";
        return true;
      }
      const b = state._block;
      if (b && (ev.x - b.x) ** 2 + (ev.y - b.y) ** 2 <= b.r * b.r) {
        state._drag = "block";
        return true;
      }
      return false;
    }
    if (ev.type === "move" && state._drag === "hinge") {
      const dx = ev.x - x0;
      const dy = y0 - ev.y;
      let deg = Math.atan2(dy, Math.max(dx, 1e-6)) * 180 / Math.PI;
      deg = Math.max(1, Math.min(85, deg));
      state.params.theta = deg;
      state.stuck = false;
      return true;
    }
    if (ev.type === "move" && state._drag === "block") {
      const th = P(state.params, "theta", 30) * Math.PI / 180;
      const pix = state._plane.pix;
      const along = (ev.x - x0) * Math.cos(th) + (y0 - ev.y) * Math.sin(th);
      state.s = Math.max(0, Math.min(L, along / Math.max(pix, 1e-6)));
      state.params.s0 = state.s;
      state.v = 0;
      state.stuck = false;
      return true;
    }
    if (ev.type === "up") {
      state._drag = null;
      return true;
    }
    return false;
  }
};

// js/models/collision2d.js
var collision2d_default = {
  id: "collision-2d",
  name: "\u4E8C\u7EF4\u521A\u4F53\u78B0\u649E",
  params: {
    m1: 2,
    m2: 1.2,
    r1: 0.45,
    r2: 0.35,
    e: 0.85,
    mu: 0.05,
    x1: -2.2,
    y1: 0.15,
    vx1: 2.4,
    vy1: 0.1,
    x2: 1.6,
    y2: -0.1,
    vx2: -0.8,
    vy2: 0.2,
    soft: 2e-3,
    trailMax: 400
  },
  paramSchema: {
    m1: { group: "dynamics", unit: "kg", label: "m\u2081", min: 1e-3, max: 1e4 },
    m2: { group: "dynamics", unit: "kg", label: "m\u2082", min: 1e-3, max: 1e4 },
    r1: { group: "dynamics", unit: "m", label: "r\u2081", min: 0.05, max: 5 },
    r2: { group: "dynamics", unit: "m", label: "r\u2082", min: 0.05, max: 5 },
    e: { group: "dynamics", unit: "\u2014", label: "\u6062\u590D\u7CFB\u6570 e", min: 0, max: 1 },
    mu: { group: "dynamics", unit: "\u2014", label: "\u5207\u5411\u6469\u64E6 \u03BC", min: 0, max: 1 },
    soft: { group: "numerics", unit: "\u2014", label: "\u8F6F\u5316", min: 0, max: 0.05 },
    trailMax: { group: "numerics", unit: "\u2014", label: "\u8F68\u8FF9\u957F", min: 50, max: 2e3 },
    x1: { group: "initial", unit: "m", label: "x\u2081", min: -20, max: 20 },
    y1: { group: "initial", unit: "m", label: "y\u2081", min: -20, max: 20 },
    vx1: { group: "initial", unit: "m/s", label: "vx\u2081", min: -50, max: 50 },
    vy1: { group: "initial", unit: "m/s", label: "vy\u2081", min: -50, max: 50 },
    x2: { group: "initial", unit: "m", label: "x\u2082", min: -20, max: 20 },
    y2: { group: "initial", unit: "m", label: "y\u2082", min: -20, max: 20 },
    vx2: { group: "initial", unit: "m/s", label: "vx\u2082", min: -50, max: 50 },
    vy2: { group: "initial", unit: "m/s", label: "vy\u2082", min: -50, max: 50 }
  },
  init(state) {
    state.t = 0;
    state.hits = 0;
    state.flash = 0;
    state.a = {
      m: P(state.params, "m1", 2),
      r: P(state.params, "r1", 0.45),
      x: P(state.params, "x1", -2),
      y: P(state.params, "y1", 0),
      vx: P(state.params, "vx1", 2),
      vy: P(state.params, "vy1", 0),
      trail: []
    };
    state.b = {
      m: P(state.params, "m2", 1),
      r: P(state.params, "r2", 0.35),
      x: P(state.params, "x2", 1.5),
      y: P(state.params, "y2", 0),
      vx: P(state.params, "vx2", -1),
      vy: P(state.params, "vy2", 0),
      trail: []
    };
    state.nx = 1;
    state.ny = 0;
  },
  step(state, dt) {
    const bodies = [state.a, state.b];
    for (const p of bodies) {
      p.m = p === state.a ? P(state.params, "m1", 2) : P(state.params, "m2", 1);
      p.r = p === state.a ? P(state.params, "r1", 0.45) : P(state.params, "r2", 0.35);
      p.x = finiteOr(p.x + p.vx * dt, p.x);
      p.y = finiteOr(p.y + p.vy * dt, p.y);
      for (const axis of ["x", "y"]) {
        const lim = 4.2;
        if (p[axis] < -lim) {
          p[axis] = -lim;
          p[`v${axis}`] *= -0.95;
        }
        if (p[axis] > lim) {
          p[axis] = lim;
          p[`v${axis}`] *= -0.95;
        }
      }
      p.trail.push({ x: p.x, y: p.y, t: state.t });
      const tmax = Math.floor(P(state.params, "trailMax", 400));
      if (p.trail.length > tmax) p.trail.shift();
    }
    const a = state.a;
    const b = state.b;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1e-9;
    const minD = a.r + b.r + P(state.params, "soft", 0);
    if (dist < minD) {
      const nx = dx / dist;
      const ny = dy / dist;
      state.nx = nx;
      state.ny = ny;
      const overlap = minD - dist;
      const inv = 1 / a.m + 1 / b.m;
      a.x -= nx * overlap * (1 / a.m) / inv;
      a.y -= ny * overlap * (1 / a.m) / inv;
      b.x += nx * overlap * (1 / b.m) / inv;
      b.y += ny * overlap * (1 / b.m) / inv;
      const rvx = a.vx - b.vx;
      const rvy = a.vy - b.vy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        const e = P(state.params, "e", 0.85);
        const jn = -(1 + e) * vn / inv;
        a.vx += jn / a.m * nx;
        a.vy += jn / a.m * ny;
        b.vx -= jn / b.m * nx;
        b.vy -= jn / b.m * ny;
        const tx = -ny;
        const ty = nx;
        const vt = rvx * tx + rvy * ty;
        const mu = P(state.params, "mu", 0.05);
        const jtMax = Math.abs(jn) * mu;
        let jt = -vt / inv;
        jt = Math.max(-jtMax, Math.min(jtMax, jt));
        a.vx += jt / a.m * tx;
        a.vy += jt / a.m * ty;
        b.vx -= jt / b.m * tx;
        b.vy -= jt / b.m * ty;
        state.hits += 1;
        state.flash = 0.25;
      }
    }
    if (state.flash > 0) state.flash -= dt;
    state.t += dt;
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const cx = W / 2;
    const cy = H / 2;
    const sc = Math.min(W, H) * 0.1;
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(cx - 4.2 * sc, cy - 4.2 * sc, 8.4 * sc, 8.4 * sc);
    const drawBody = (p, color) => {
      if (view.showTrail !== false) {
        ctx.strokeStyle = C.trail;
        ctx.beginPath();
        p.trail.forEach((q, i) => i ? ctx.lineTo(cx + q.x * sc, cy - q.y * sc) : ctx.moveTo(cx + q.x * sc, cy - q.y * sc));
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx + p.x * sc, cy - p.y * sc, p.r * sc, 0, Math.PI * 2);
      ctx.fill();
      if (view.showVectors !== false) {
        drawArrow(ctx, cx + p.x * sc, cy - p.y * sc, cx + (p.x + p.vx * 0.35) * sc, cy - (p.y + p.vy * 0.35) * sc, C.vector, 2);
      }
    };
    drawBody(state.a, C.body);
    drawBody(state.b, C.accent);
    if (state.flash > 0) {
      ctx.strokeStyle = C.flash || C.vector;
      ctx.lineWidth = 2;
      const mx = cx + (state.a.x + state.b.x) / 2 * sc;
      const my = cy - (state.a.y + state.b.y) / 2 * sc;
      ctx.beginPath();
      ctx.moveTo(mx - state.nx * 30, my + state.ny * 30);
      ctx.lineTo(mx + state.nx * 30, my - state.ny * 30);
      ctx.stroke();
    }
  },
  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const ke = 0.5 * state.a.m * (state.a.vx ** 2 + state.a.vy ** 2) + 0.5 * state.b.m * (state.b.vx ** 2 + state.b.vy ** 2);
    const px = state.a.m * state.a.vx + state.b.m * state.b.vx;
    const py = state.a.m * state.a.vy + state.b.m * state.b.vy;
    return [
      { label: "t", value: `${formatNum(state.t, d)} s` },
      { label: "hits", value: String(state.hits) },
      { label: "KE", value: formatNum(ke, d) },
      { label: "Px", value: formatNum(px, d) },
      { label: "Py", value: formatNum(py, d) }
    ];
  },
  getEnergy(state) {
    return {
      kinetic: 0.5 * state.a.m * (state.a.vx ** 2 + state.a.vy ** 2) + 0.5 * state.b.m * (state.b.vx ** 2 + state.b.vy ** 2),
      potential: 0
    };
  },
  getTrajectory(state) {
    return state.a.trail.map((p, i) => ({
      t: p.t,
      x1: p.x,
      y1: p.y,
      x2: state.b.trail[i]?.x,
      y2: state.b.trail[i]?.y
    }));
  }
};

// js/models/dijkstra.js
function parseAdj(text, n) {
  const edges = [];
  const raw = String(text || "").trim();
  if (!raw) return edges;
  for (const part of raw.split(/[,;\n]+/)) {
    const m = part.trim().match(/^(\d+)\s*[-:]\s*(\d+)(?:\s*[:=]\s*(\d+(?:\.\d+)?))?$/);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    const w = m[3] != null ? Number(m[3]) : 1;
    if (a >= 0 && b >= 0 && a < n && b < n && a !== b && Number.isFinite(w)) {
      edges.push({ a, b, w: Math.max(0.01, w) });
    }
  }
  return edges;
}
var dijkstra_default = {
  id: "dijkstra",
  name: "Dijkstra \u6700\u77ED\u8DEF\u5F84",
  params: {
    nodes: 10,
    seed: 11,
    start: 0,
    goal: 7,
    stepDt: 0.12,
    edgeProb: 0.42,
    wMin: 1,
    wMax: 12,
    algo: 0,
    layoutSteps: 40,
    adjText: "",
    edgeA: 0,
    edgeB: 1,
    edgeW: 3,
    commitEdge: 0
  },
  paramSchema: {
    nodes: { group: "numerics", unit: "\u2014", label: "\u8282\u70B9\u6570", min: 4, max: 24 },
    layoutSteps: { group: "numerics", unit: "\u2014", label: "\u529B\u5BFC\u5411\u6B65\u6570", min: 0, max: 120 },
    seed: { group: "initial", unit: "\u2014", label: "\u968F\u673A\u79CD\u5B50", min: 1, max: 9999 },
    start: { group: "initial", unit: "\u2014", label: "\u8D77\u70B9", min: 0, max: 23 },
    goal: { group: "initial", unit: "\u2014", label: "\u7EC8\u70B9", min: 0, max: 23 },
    adjText: {
      group: "initial",
      unit: "",
      label: "\u90BB\u63A5\u8868 0-1:2,1-2:5",
      allowText: true
    },
    stepDt: { group: "dynamics", unit: "s", label: "\u6B65\u8FDB\u95F4\u9694", min: 0.02, max: 1 },
    edgeProb: { group: "dynamics", unit: "\u2014", label: "\u8FB9\u6982\u7387", min: 0.05, max: 1 },
    wMin: { group: "dynamics", unit: "\u2014", label: "\u6743\u6700\u5C0F", min: 1, max: 50 },
    wMax: { group: "dynamics", unit: "\u2014", label: "\u6743\u6700\u5927", min: 1, max: 100 },
    edgeA: { group: "dynamics", unit: "\u2014", label: "\u624B\u52A8\u753B\u8FB9 A", min: 0, max: 23 },
    edgeB: { group: "dynamics", unit: "\u2014", label: "\u624B\u52A8\u753B\u8FB9 B", min: 0, max: 23 },
    edgeW: { group: "dynamics", unit: "\u2014", label: "\u624B\u52A8\u753B\u8FB9\u6743", min: 0.1, max: 100 },
    commitEdge: { group: "dynamics", unit: "\u2014", label: "\u63D0\u4EA4\u753B\u8FB9(+1)", min: 0, max: 9999 },
    algo: {
      group: "dynamics",
      unit: "",
      label: "\u7B97\u6CD5",
      min: 0,
      max: 1,
      options: [{ value: 0, label: "Dijkstra" }, { value: 1, label: "BFS(\u65E0\u6743)" }]
    }
  },
  runAction(state, actionId) {
    if (actionId === "undoEdge") {
      if (state.edges?.length) {
        state.edges.pop();
        this.resetSearch(state);
        return true;
      }
      return false;
    }
    if (actionId === "clearGraph") {
      state.edges = [];
      state._pick = null;
      this.resetSearch(state);
      return true;
    }
    return false;
  },
  init(state) {
    const n = Math.max(4, Math.floor(P(state.params, "nodes", 10)));
    let s = Math.floor(P(state.params, "seed", 11)) || 1;
    const rnd = () => {
      s = s * 48271 % 2147483647;
      return (s - 1) / 2147483646;
    };
    state.nodes = Array.from({ length: n }, (_, i) => ({
      i,
      x: 0.12 + rnd() * 0.76,
      y: 0.14 + rnd() * 0.72
    }));
    const imported = parseAdj(state.params.adjText, n);
    state.edges = imported.length ? imported : [];
    if (!state.edges.length) {
      const pEdge = P(state.params, "edgeProb", 0.42);
      const w0 = P(state.params, "wMin", 1);
      const w1 = Math.max(w0, P(state.params, "wMax", 12));
      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          if (rnd() < pEdge) {
            state.edges.push({ a: i, b: j, w: w0 + Math.floor(rnd() * (w1 - w0 + 1)) });
          }
        }
      }
    }
    const start = Math.min(Math.floor(P(state.params, "start", 0)), n - 1);
    const goal = Math.min(Math.floor(P(state.params, "goal", 7)), n - 1);
    state.start = start;
    state.goal = goal;
    if (!state.edges.length) {
      for (let i = 0; i < n - 1; i += 1) state.edges.push({ a: i, b: i + 1, w: 1 });
    }
    const W = 400;
    const H = 300;
    const steps = Math.max(0, Math.floor(P(state.params, "layoutSteps", 40)));
    const px = state.nodes.map((node) => ({ x: node.x * W, y: node.y * H }));
    for (let k = 0; k < steps; k += 1) forceGraphStep(px, state.edges, { W, H, pad: 24 });
    state.nodes = px.map((p, i) => ({
      i,
      x: Math.max(0.05, Math.min(0.95, p.x / W)),
      y: Math.max(0.05, Math.min(0.95, p.y / H))
    }));
    this.resetSearch(state);
    state._commit = Math.round(P(state.params, "commitEdge", 0));
    state._adj = String(state.params.adjText || "");
    state._layoutSteps = steps;
    state._edgeHist = state.edges.map((e) => ({ ...e }));
  },
  resetSearch(state) {
    const n = state.nodes.length;
    state.dist = Array(n).fill(Infinity);
    state.dist[state.start] = 0;
    state.parent = Array(n).fill(-1);
    state.visited = /* @__PURE__ */ new Set();
    state.frontier = /* @__PURE__ */ new Set([state.start]);
    state.done = false;
    state.path = [];
    state.t = 0;
    state.acc = 0;
    state.relax = 0;
    state.algo = Math.round(P(state.params, "algo", 0));
  },
  refresh(state) {
    const adj = String(state.params.adjText || "");
    if (adj !== state._adj) {
      state._adj = adj;
      this.init(state);
      return;
    }
    const commit = Math.round(P(state.params, "commitEdge", 0));
    if (commit !== state._commit) {
      state._commit = commit;
      const n = state.nodes.length;
      const a = Math.min(Math.max(0, Math.round(P(state.params, "edgeA", 0))), n - 1);
      const b = Math.min(Math.max(0, Math.round(P(state.params, "edgeB", 1))), n - 1);
      const w = Math.max(0.01, P(state.params, "edgeW", 3));
      if (a !== b) {
        state.edges.push({ a, b, w });
        this.resetSearch(state);
      }
    }
  },
  step(state, dt) {
    this.refresh(state);
    const want = Math.round(P(state.params, "algo", 0));
    if (want !== state.algo) {
      this.resetSearch(state);
    }
    state.t += dt;
    state.acc += dt;
    const period = Math.max(P(state.params, "stepDt", 0.12), 0.02);
    while (state.acc >= period && !state.done) {
      state.acc -= period;
      if (!state.frontier.size) {
        state.done = true;
        break;
      }
      let u = -1;
      let best = Infinity;
      for (const i of state.frontier) {
        const d = state.dist[i];
        if (d < best) {
          best = d;
          u = i;
        }
      }
      if (u < 0 || !Number.isFinite(best)) {
        state.done = true;
        break;
      }
      state.frontier.delete(u);
      if (state.visited.has(u)) continue;
      state.visited.add(u);
      if (u === state.goal) {
        state.done = true;
        const path = [];
        for (let cur = u; cur >= 0; cur = state.parent[cur]) path.push(cur);
        state.path = path.reverse();
        break;
      }
      for (const e of state.edges) {
        const v = e.a === u ? e.b : e.b === u ? e.a : -1;
        if (v < 0 || state.visited.has(v)) continue;
        const w = state.algo === 1 ? 1 : e.w;
        const nd = state.dist[u] + w;
        if (nd < state.dist[v]) {
          state.dist[v] = nd;
          state.parent[v] = u;
          state.frontier.add(v);
          state.relax += 1;
        }
      }
    }
  },
  capabilities: {
    pointer: true,
    interaction: "canvas",
    formalism: "network",
    viz: "algo-graph",
    fidelity: "principle",
    hint: "\u70B9\u51FB\u4E24\u8282\u70B9\u8FDE\u8FB9\uFF08\u7C7B Algorithm Visualizer\uFF09\uFF1B\u5DE5\u5177\u6761\u53EF\u64A4\u9500/\u6E05\u7A7A",
    actions: [
      { id: "undoEdge", label: "\u64A4\u9500\u4E0A\u4E00\u8FB9" },
      { id: "clearGraph", label: "\u6E05\u7A7A\u8FB9" }
    ]
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 36;
    state._pad = pad;
    state._view = { W, H };
    const screen = mapNormToScreen(state.nodes, W, H, pad);
    state._screen = screen.map((p) => ({ x: p.sx, y: p.sy }));
    const hi = /* @__PURE__ */ new Set([...state.frontier, ...state.visited]);
    if (state.start != null) hi.add(state.start);
    if (state.goal != null) hi.add(state.goal);
    paintGraph(ctx, screen, state.edges, {
      highlight: hi,
      path: state.path || [],
      edgeColor: C.axis,
      nodeColor: C.muted,
      accent: C.accent,
      r: 10
    });
    ctx.font = "11px IBM Plex Mono, monospace";
    for (const e of state.edges) {
      const a = state._screen[e.a];
      const b = state._screen[e.b];
      if (!a || !b) continue;
      ctx.fillStyle = C.muted;
      ctx.fillText(String(e.w), (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    state.nodes.forEach((_n, i) => {
      const p = state._screen[i];
      let fill = null;
      if (state.frontier.has(i)) fill = C.vector;
      if (state.visited.has(i)) fill = C.body;
      if (i === state.start) fill = C.theory || C.body2;
      if (i === state.goal) fill = C.accent;
      if (!fill) return;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.fillText(String(i), p.x - 3, p.y + 3);
    });
    if (state._pick != null && state._screen[state._pick]) {
      const p = state._screen[state._pick];
      ctx.strokeStyle = C.vector;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = C.muted;
    ctx.fillText(
      state.done ? `done \xB7 cost=${formatNum(state.dist[state.goal], 2)} \xB7 edges=${state.edges.length}` : `searching \xB7 edges=${state.edges.length} \xB7 \u70B9\u9009\u8FDE\u8FB9`,
      12,
      18
    );
  },
  onPointer(state, ev) {
    if (ev.type !== "down" || !state._screen) return false;
    let hit = -1;
    let best = 16 * 16;
    state._screen.forEach((p, i) => {
      const d = (p.x - ev.x) ** 2 + (p.y - ev.y) ** 2;
      if (d < best) {
        best = d;
        hit = i;
      }
    });
    if (hit < 0) {
      state._pick = null;
      return true;
    }
    if (state._pick == null) {
      state._pick = hit;
      return true;
    }
    if (state._pick === hit) {
      state._pick = null;
      return true;
    }
    const a = state._pick;
    const b = hit;
    const w = Math.max(0.01, P(state.params, "edgeW", 3));
    if (!state.edges.some((e) => e.a === a && e.b === b || e.a === b && e.b === a)) {
      state.edges.push({ a, b, w });
    }
    state._pick = null;
    this.resetSearch(state);
    return true;
  },
  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: "visited", value: String(state.visited.size) },
      { label: "frontier", value: String(state.frontier.size) },
      { label: "relax", value: String(state.relax) },
      { label: "cost", value: Number.isFinite(state.dist[state.goal]) ? formatNum(state.dist[state.goal], d) : "\u221E" },
      { label: "edges", value: String(state.edges.length) }
    ];
  },
  getTrajectory(state) {
    return state.nodes.map((n, i) => ({ i, dist: state.dist[i], x: n.x, y: n.y }));
  }
};

// js/models/logicGates.js
var GATES = ["AND", "OR", "XOR", "NAND", "NOR", "XNOR", "BUF", "NOT"];
function evalGate(mode, a, b) {
  switch (mode) {
    case 0:
      return a & b;
    case 1:
      return a | b;
    case 2:
      return a ^ b;
    case 3:
      return a & b ^ 1;
    case 4:
      return (a | b) ^ 1;
    case 5:
      return a ^ b ^ 1;
    case 6:
      return a;
    case 7:
      return a ^ 1;
    default:
      return 0;
  }
}
function gateIndex(name) {
  const i = GATES.indexOf(String(name || "").toUpperCase());
  return i >= 0 ? i : 0;
}
function parseNetlist(text) {
  const gates = [];
  const raw = String(text || "").trim();
  if (!raw) return gates;
  for (const part of raw.split(/[;\n]+/)) {
    const toks = part.trim().split(/\s+/).filter(Boolean);
    if (toks.length < 3) continue;
    const op = toks[0];
    if (toks.length === 3) {
      gates.push({ op, in: [toks[1], toks[1]], out: toks[2] });
    } else {
      gates.push({ op, in: [toks[1], toks[2]], out: toks[3] || toks[2] });
    }
  }
  return gates;
}
function evalNet(gates, inputs) {
  const wire = { ...inputs };
  for (const g of gates) {
    const a = wire[g.in[0]] != null ? wire[g.in[0]] & 1 : 0;
    const b = wire[g.in[1]] != null ? wire[g.in[1]] & 1 : a;
    wire[g.out] = evalGate(gateIndex(g.op), a, b);
  }
  return wire;
}
var logicGates_default = {
  id: "logic-gates",
  name: "\u57FA\u672C\u903B\u8F91\u95E8",
  capabilities: {
    pointer: true,
    interaction: "canvas",
    formalism: "digital",
    viz: "netlist",
    fidelity: "principle",
    hint: "\u7F51\u8868\u62D6\u7EBF\uFF1B\u6E05\u7A7A\u8FDE\u7EBF\u4FDD\u7559\u95E8 / \u91CD\u7F6E\u6A21\u677F \u4E24\u6863",
    actions: [
      { id: "undoEdge", label: "\u64A4\u9500\u8FDE\u7EBF" },
      { id: "redoEdge", label: "\u91CD\u505A\u8FDE\u7EBF" },
      { id: "clearWires", label: "\u6E05\u7A7A\u8FDE\u7EBF" },
      { id: "resetTemplate", label: "\u91CD\u7F6E\u6A21\u677F" }
    ]
  },
  params: {
    a: 1,
    b: 0,
    c: 0,
    mode: 0,
    scan: 0,
    stepDt: 0.4,
    bits: 2,
    netlist: "",
    useNet: 0
  },
  paramSchema: {
    a: { group: "dynamics", unit: "\u2014", label: "\u8F93\u5165 A", min: 0, max: 1 },
    b: { group: "dynamics", unit: "\u2014", label: "\u8F93\u5165 B", min: 0, max: 1 },
    c: { group: "dynamics", unit: "\u2014", label: "\u8F93\u5165 C", min: 0, max: 1 },
    bits: { group: "dynamics", unit: "\u2014", label: "\u6709\u6548\u8F93\u5165\u6570", min: 1, max: 3 },
    scan: {
      group: "dynamics",
      unit: "",
      label: "\u771F\u503C\u8868\u626B\u63CF",
      min: 0,
      max: 1,
      options: [{ value: 0, label: "\u624B\u52A8" }, { value: 1, label: "\u81EA\u52A8\u626B\u63CF" }]
    },
    stepDt: { group: "dynamics", unit: "s", label: "\u626B\u63CF\u95F4\u9694", min: 0.05, max: 2 },
    mode: {
      group: "dynamics",
      unit: "",
      label: "\u95E8\u7C7B\u578B",
      min: 0,
      max: 7,
      options: GATES.map((g, i) => ({ value: i, label: g }))
    },
    useNet: {
      group: "dynamics",
      unit: "",
      label: "\u7F51\u8868\u6A21\u5F0F",
      min: 0,
      max: 1,
      options: [{ value: 0, label: "\u5355\u95E8" }, { value: 1, label: "\u7EC4\u5408\u7F51\u8868" }]
    },
    netlist: {
      group: "initial",
      unit: "",
      label: "\u7F51\u8868 AND A B N1; OR N1 C Y",
      allowText: true
    }
  },
  pushNetHist(state) {
    if (!state._netHist) state._netHist = [];
    state._netHist.push(String(state.params.netlist || ""));
    while (state._netHist.length > 32) state._netHist.shift();
    state._netRedo = [];
  },
  /** 工具条 disabled：与 undo 同深 32 的 redo 栈 */
  actionEnabled(state, actionId) {
    if (actionId === "undoEdge") return (state?._netHist?.length || 0) > 0;
    if (actionId === "redoEdge") return (state?._netRedo?.length || 0) > 0;
    return true;
  },
  runAction(state, actionId) {
    if (actionId === "undoEdge") {
      const hist = state._netHist || [];
      if (!hist.length) return false;
      if (!state._netRedo) state._netRedo = [];
      state._netRedo.push(String(state.params.netlist || ""));
      while (state._netRedo.length > 32) state._netRedo.shift();
      state.params.netlist = hist.pop();
      state._netHist = hist;
      this.recompute(state);
      return true;
    }
    if (actionId === "redoEdge") {
      const redo = state._netRedo || [];
      if (!redo.length) return false;
      if (!state._netHist) state._netHist = [];
      state._netHist.push(String(state.params.netlist || ""));
      while (state._netHist.length > 32) state._netHist.shift();
      state.params.netlist = redo.pop();
      state._netRedo = redo;
      this.recompute(state);
      return true;
    }
    if (actionId === "clearWires" || actionId === "clearGraph") {
      this.pushNetHist(state);
      const gates = state.gates?.length ? state.gates : parseNetlist(state.params.netlist || "AND A B N1; OR N1 C Y");
      gates.forEach((g, i) => {
        g.in[0] = i === 0 ? "A" : gates[i - 1]?.out || "A";
        g.in[1] = i === 0 ? "B" : "C";
      });
      state.gates = gates;
      state.params.netlist = gates.map((g) => `${g.op} ${g.in[0]} ${g.in[1]} ${g.out}`).join("; ");
      this.recompute(state);
      return true;
    }
    if (actionId === "resetTemplate") {
      this.pushNetHist(state);
      state.params.netlist = "AND A B N1; OR N1 C Y";
      state.gates = parseNetlist(state.params.netlist);
      state._layout = null;
      this.recompute(state);
      return true;
    }
    return false;
  },
  init(state) {
    state.t = 0;
    state.acc = 0;
    state.scanIdx = 0;
    state.y = 0;
    state.wave = [];
    state.table = [];
    state.wires = {};
    state._netHist = [];
    state._netRedo = [];
    state.gates = parseNetlist(state.params.netlist || "AND A B N1; OR N1 C Y");
    this.recompute(state);
  },
  recompute(state) {
    state.gates = parseNetlist(state.params.netlist || "AND A B N1; OR N1 C Y");
    const bits = Math.max(1, Math.min(3, Math.round(P(state.params, "bits", 2))));
    const mode = Math.round(P(state.params, "mode", 0));
    let a = Math.round(P(state.params, "a", 1)) & 1;
    let b = Math.round(P(state.params, "b", 0)) & 1;
    let c = Math.round(P(state.params, "c", 0)) & 1;
    if (Math.round(P(state.params, "scan", 0)) === 1) {
      a = state.scanIdx >> 0 & 1;
      b = bits >= 2 ? state.scanIdx >> 1 & 1 : 0;
      c = bits >= 3 ? state.scanIdx >> 2 & 1 : 0;
    }
    state._a = a;
    state._b = b;
    state._c = c;
    if (Math.round(P(state.params, "useNet", 0)) === 1) {
      state.wires = evalNet(state.gates, { A: a, B: b, C: c, a, b, c });
      const outs = state.gates.map((g) => g.out);
      const last = outs[outs.length - 1] || "Y";
      state.y = state.wires[last] != null ? state.wires[last] & 1 : 0;
      state._outName = last;
    } else {
      state.y = bits === 1 ? evalGate(mode, a, a) : bits === 2 ? evalGate(mode, a, b) : evalGate(mode, evalGate(mode === 7 ? 6 : mode, a, b), c) & 1;
      state._outName = "Y";
    }
    state.table = [];
    for (let i = 0; i < 2 ** bits; i += 1) {
      const aa = i >> 0 & 1;
      const bb = bits >= 2 ? i >> 1 & 1 : 0;
      const cc = bits >= 3 ? i >> 2 & 1 : 0;
      let yy;
      if (Math.round(P(state.params, "useNet", 0)) === 1) {
        const w = evalNet(state.gates, { A: aa, B: bb, C: cc, a: aa, b: bb, c: cc });
        const outs = state.gates.map((g) => g.out);
        yy = w[outs[outs.length - 1]] & 1;
      } else {
        yy = bits === 1 ? evalGate(mode, aa, aa) : bits === 2 ? evalGate(mode, aa, bb) : evalGate(mode, evalGate(mode === 7 ? 6 : mode, aa, bb), cc) & 1;
      }
      state.table.push({ a: aa, b: bb, c: cc, y: yy });
    }
  },
  refresh(state) {
    this.recompute(state);
  },
  step(state, dt) {
    state.t += dt;
    if (Math.round(P(state.params, "scan", 0)) === 1) {
      state.acc += dt;
      if (state.acc >= Math.max(P(state.params, "stepDt", 0.4), 0.05)) {
        state.acc = 0;
        const bits = Math.max(1, Math.min(3, Math.round(P(state.params, "bits", 2))));
        state.scanIdx = (state.scanIdx + 1) % 2 ** bits;
      }
    }
    this.recompute(state);
    state.wave.push(state.y);
    if (state.wave.length > 160) state.wave.shift();
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const mode = Math.round(P(state.params, "mode", 0));
    const net = Math.round(P(state.params, "useNet", 0)) === 1;
    ctx.fillStyle = C.muted;
    ctx.font = "12px IBM Plex Mono, monospace";
    ctx.fillText(
      net ? `NET \u2192 ${state._outName}=${state.y}  A${state._a}B${state._b}C${state._c} \xB7 \u62D6\u7EBF\u7F16\u8F91` : `${GATES[mode] || "?"}  A=${state._a} B=${state._b} C=${state._c} \u2192 Y=${state.y}`,
      16,
      22
    );
    if (net) {
      if (!state._layout || state._layout.length !== state.gates.length) {
        state._layout = state.gates.map((g, i) => ({
          i,
          x: 40 + i % 3 * 150,
          y: 60 + Math.floor(i / 3) * 80
        }));
      }
      state._ports = [];
      for (const g of state.gates) {
        for (const inp of g.in) {
          const src = state.gates.find((x) => x.out === inp);
          if (!src) continue;
          const si = state.gates.indexOf(src);
          const di = state.gates.indexOf(g);
          const a = state._layout[si];
          const b = state._layout[di];
          if (!a || !b) continue;
          ctx.strokeStyle = C.axis;
          ctx.beginPath();
          ctx.moveTo(a.x + 110, a.y + 22);
          ctx.lineTo(b.x, b.y + 14);
          ctx.stroke();
        }
      }
      if (state._wire && state._wire.from != null) {
        const a = state._layout[state._wire.from];
        ctx.strokeStyle = C.vector;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(a.x + 110, a.y + 22);
        ctx.lineTo(state._wire.x, state._wire.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      state.gates.forEach((g, i) => {
        const L = state._layout[i];
        const x = L.x;
        const y = L.y;
        ctx.strokeStyle = C.body;
        ctx.strokeRect(x, y, 110, 44);
        ctx.fillStyle = C.body;
        ctx.font = "12px IBM Plex Mono, monospace";
        ctx.fillText(`${g.op}`, x + 8, y + 18);
        ctx.fillStyle = C.muted;
        ctx.fillText(`${g.in.join(",")}\u2192${g.out}=${state.wires[g.out] ?? "?"}`, x + 8, y + 36);
        ctx.fillStyle = C.accent;
        ctx.beginPath();
        ctx.arc(x, y + 14, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y + 30, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.vector;
        ctx.beginPath();
        ctx.arc(x + 110, y + 22, 5, 0, Math.PI * 2);
        ctx.fill();
        state._ports.push({ gate: i, kind: "in0", x, y: y + 14 });
        state._ports.push({ gate: i, kind: "in1", x, y: y + 30 });
        state._ports.push({ gate: i, kind: "out", x: x + 110, y: y + 22 });
      });
    } else {
      const gx = W * 0.22;
      const gy = H * 0.38;
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2;
      ctx.strokeRect(gx, gy - 36, 110, 72);
      ctx.fillStyle = C.body;
      ctx.font = "16px IBM Plex Mono, monospace";
      ctx.fillText(GATES[mode], gx + 30, gy + 6);
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(gx - 40, gy - 18);
      ctx.lineTo(gx, gy - 18);
      ctx.moveTo(gx - 40, gy + 18);
      ctx.lineTo(gx, gy + 18);
      ctx.moveTo(gx + 110, gy);
      ctx.lineTo(gx + 150, gy);
      ctx.stroke();
      ctx.fillStyle = state._a ? C.accent : C.muted;
      ctx.beginPath();
      ctx.arc(gx - 46, gy - 18, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = state._b ? C.accent : C.muted;
      ctx.beginPath();
      ctx.arc(gx - 46, gy + 18, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = state.y ? C.vector : C.muted;
      ctx.beginPath();
      ctx.arc(gx + 158, gy, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    const tx = W * 0.55;
    const ty = 48;
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText("A B C | Y", tx, ty);
    state.table.forEach((row, i) => {
      const active = row.a === state._a && row.b === state._b && row.c === state._c;
      ctx.fillStyle = active ? C.accent : C.body;
      ctx.fillText(`${row.a} ${row.b} ${row.c} | ${row.y}`, tx, ty + 18 + i * 16);
    });
    const mid = H * 0.78;
    ctx.strokeStyle = C.vector;
    ctx.beginPath();
    state.wave.forEach((v, i) => {
      const x = 20 + i / 160 * (W - 40);
      const y = mid - v * 28;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  },
  getReadouts(state) {
    const mode = Math.round(P(state.params, "mode", 0));
    const net = Math.round(P(state.params, "useNet", 0)) === 1;
    return [
      { label: "mode", value: net ? "NET" : GATES[mode] || "?" },
      { label: "A", value: String(state._a) },
      { label: "B", value: String(state._b) },
      { label: state._outName || "Y", value: String(state.y) },
      { label: "gates", value: String(state.gates?.length || 0) },
      { label: "t", value: `${formatNum(state.t, 2)} s` }
    ];
  },
  getTrajectory(state) {
    return state.table.map((r, i) => ({ i, ...r }));
  },
  onPointer(state, ev) {
    if (Math.round(P(state.params, "useNet", 0)) !== 1) return false;
    if (!state._layout) return false;
    const hitPort = (x, y) => {
      if (!state._ports) return null;
      for (const p of state._ports) {
        if ((p.x - x) ** 2 + (p.y - y) ** 2 < 10 * 10) return p;
      }
      return null;
    };
    const hitGate = (x, y) => {
      for (const L of state._layout) {
        if (x >= L.x && x <= L.x + 110 && y >= L.y && y <= L.y + 44) return L;
      }
      return null;
    };
    if (ev.type === "down") {
      const port = hitPort(ev.x, ev.y);
      if (port?.kind === "out") {
        state._wire = { from: port.gate, x: ev.x, y: ev.y };
        state._dragGate = null;
        return true;
      }
      const g = hitGate(ev.x, ev.y);
      if (g) {
        state._dragGate = { i: g.i, ox: ev.x - g.x, oy: ev.y - g.y };
        state._wire = null;
        return true;
      }
      return false;
    }
    if (ev.type === "move") {
      if (state._wire) {
        state._wire.x = ev.x;
        state._wire.y = ev.y;
        return true;
      }
      if (state._dragGate) {
        const L = state._layout[state._dragGate.i];
        L.x = ev.x - state._dragGate.ox;
        L.y = ev.y - state._dragGate.oy;
        return true;
      }
      return false;
    }
    if (ev.type === "up") {
      if (state._wire) {
        const port = hitPort(ev.x, ev.y);
        if (port && (port.kind === "in0" || port.kind === "in1") && port.gate !== state._wire.from) {
          this.pushNetHist(state);
          const src = state.gates[state._wire.from];
          const dst = state.gates[port.gate];
          const idx = port.kind === "in0" ? 0 : 1;
          dst.in[idx] = src.out;
          state.params.netlist = state.gates.map((g) => `${g.op} ${g.in[0]} ${g.in[1]} ${g.out}`).join("; ");
          this.recompute(state);
        }
        state._wire = null;
        return true;
      }
      state._dragGate = null;
      return true;
    }
    return false;
  }
};

// js/models/beamSfdBmd.js
function loadsFromParams(params) {
  const raw = [
    { p: P(params, "P1", 10), a: P(params, "a1", 0.35) },
    { p: P(params, "P2", 0), a: P(params, "a2", 0.65) },
    { p: P(params, "P3", 0), a: P(params, "a3", 0.85) }
  ];
  const L = Math.max(P(params, "span", 6), 0.5);
  return raw.filter((x) => Math.abs(x.p) > 1e-9).map((x) => ({
    P: x.p,
    a: Math.max(0.02, Math.min(0.98, x.a)) * L
  }));
}
function rebuild(state) {
  const L = Math.max(P(state.params, "span", 6), 0.5);
  const support = Math.round(P(state.params, "support", 0));
  const loads = loadsFromParams(state.params);
  const n = 64;
  const xs = Array.from({ length: n + 1 }, (_, i) => i / n * L);
  let Ra = 0;
  let Rb = 0;
  let Ma = 0;
  if (support === 1) {
    Ra = loads.reduce((s, ld) => s + ld.P, 0);
    Rb = 0;
    Ma = -loads.reduce((s, ld) => s + ld.P * ld.a, 0);
  } else if (support === 2) {
    Ra = 0;
    Rb = 0;
    Ma = 0;
    let Mb = 0;
    for (const ld of loads) {
      const a = ld.a;
      const b = L - a;
      const Pload = ld.P;
      Ra += Pload * b * b * (3 * a + b) / L ** 3;
      Rb += Pload * a * a * (a + 3 * b) / L ** 3;
      Ma += -(Pload * a * b * b) / (L * L);
      Mb += Pload * a * a * b / (L * L);
    }
    state.Mb = Mb;
  } else {
    Ra = 0;
    Rb = 0;
    for (const ld of loads) {
      Ra += ld.P * (L - ld.a) / L;
      Rb += ld.P * ld.a / L;
    }
    Ma = 0;
  }
  state.sfd = [];
  state.bmd = [];
  for (const x of xs) {
    let V = Ra;
    let M = Ma + Ra * x;
    for (const ld of loads) {
      if (x >= ld.a - 1e-9) {
        V -= ld.P;
        M -= ld.P * (x - ld.a);
      }
    }
    if (support === 1 && x > L - 1e-9) {
      V = 0;
      M = 0;
    }
    state.sfd.push({ x, v: V });
    state.bmd.push({ x, m: M });
  }
  state.Ra = Ra;
  state.Rb = Rb;
  state.Ma = Ma;
  state.loads = loads;
  state.Mmax = Math.max(...state.bmd.map((p) => Math.abs(p.m)), 0);
  state.Vmax = Math.max(...state.sfd.map((p) => Math.abs(p.v)), 0);
}
var beamSfdBmd_default = {
  id: "beam-sfd-bmd",
  name: "\u6881\u7684\u5F2F\u66F2\u5185\u529B\uFF08\u526A\u529B\u56FE/\u5F2F\u77E9\u56FE\uFF09",
  capabilities: {
    interaction: "knobs",
    formalism: "ode",
    viz: "beam",
    fidelity: "principle"
  },
  fidelity: "principle",
  params: {
    span: 6,
    support: 0,
    P1: 10,
    a1: 0.35,
    P2: 6,
    a2: 0.65,
    P3: 0,
    a3: 0.85
  },
  paramSchema: {
    span: { group: "dynamics", unit: "m", label: "\u8DE8\u5EA6 L", min: 1, max: 40 },
    support: {
      group: "dynamics",
      unit: "",
      label: "\u652F\u5EA7",
      min: 0,
      max: 2,
      options: [
        { value: 0, label: "\u7B80\u652F" },
        { value: 1, label: "\u60AC\u81C2" },
        { value: 2, label: "\u56FA\u652F" }
      ]
    },
    P1: { group: "dynamics", unit: "kN", label: "P\u2081", min: -80, max: 80 },
    a1: { group: "dynamics", unit: "\u2014", label: "a\u2081/L", min: 0.05, max: 0.95 },
    P2: { group: "dynamics", unit: "kN", label: "P\u2082", min: -80, max: 80 },
    a2: { group: "dynamics", unit: "\u2014", label: "a\u2082/L", min: 0.05, max: 0.95 },
    P3: { group: "dynamics", unit: "kN", label: "P\u2083", min: -80, max: 80 },
    a3: { group: "dynamics", unit: "\u2014", label: "a\u2083/L", min: 0.05, max: 0.95 }
  },
  init(state) {
    state.t = 0;
    rebuild(state);
  },
  step(state, dt) {
    state.t += dt;
    rebuild(state);
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const L = Math.max(P(state.params, "span", 6), 0.5);
    const support = Math.round(P(state.params, "support", 0));
    const m = 42;
    const box = { l: m, r: W - m, t: m, b: H - m, w: W - 2 * m, h: H - 2 * m };
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    const names = ["\u7B80\u652F", "\u60AC\u81C2", "\u56FA\u652F"];
    ctx.fillText(`beam \xB7 ${names[support] || "?"} \xB7 multi-load SFD/BMD`, 12, 18);
    const midY = box.t + box.h * 0.26;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(box.l, midY);
    ctx.lineTo(box.r, midY);
    ctx.stroke();
    const drawSupport = (x, kind) => {
      ctx.fillStyle = C.muted;
      ctx.strokeStyle = C.muted;
      if (kind === "pin" || kind === "roller") {
        ctx.beginPath();
        ctx.moveTo(x, midY);
        ctx.lineTo(x - 9, midY + 14);
        ctx.lineTo(x + 9, midY + 14);
        ctx.closePath();
        ctx.fill();
        if (kind === "roller") {
          ctx.beginPath();
          ctx.arc(x, midY + 18, 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (kind === "fixed") {
        ctx.fillRect(x - 4, midY - 16, 8, 32);
        for (let i = 0; i < 5; i += 1) {
          ctx.beginPath();
          ctx.moveTo(x - 4, midY - 14 + i * 7);
          ctx.lineTo(x - 14, midY - 8 + i * 7);
          ctx.stroke();
        }
      }
    };
    if (support === 0) {
      drawSupport(box.l, "pin");
      drawSupport(box.r, "roller");
    } else if (support === 1) {
      drawSupport(box.l, "fixed");
    } else {
      drawSupport(box.l, "fixed");
      drawSupport(box.r, "fixed");
    }
    for (const ld of state.loads || []) {
      const px = box.l + ld.a / L * box.w;
      const up = ld.P >= 0;
      drawArrow(
        ctx,
        px,
        up ? midY - 42 : midY + 42,
        px,
        up ? midY - 4 : midY + 4,
        C.accent,
        2
      );
      ctx.fillStyle = C.accent;
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText(`${formatNum(ld.P, 1)}`, px + 4, up ? midY - 46 : midY + 54);
    }
    const plot = (series, key, y0, h, color, label) => {
      const maxA = Math.max(1e-6, ...series.map((p) => Math.abs(p[key])));
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
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
      ctx.fillStyle = C.muted;
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText(label, box.l, y0 - h - 6);
    };
    plot(state.sfd, "v", box.t + box.h * 0.55, box.h * 0.12, C.vector, "SFD");
    plot(state.bmd, "m", box.t + box.h * 0.82, box.h * 0.12, C.body, "BMD");
  },
  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const names = ["\u7B80\u652F", "\u60AC\u81C2", "\u56FA\u652F"];
    return [
      { label: "\u4FDD\u771F", value: "\u539F\u7406\u7EA7\u2260FEA" },
      { label: "\u652F\u5EA7", value: names[Math.round(P(state.params, "support", 0))] || "?" },
      { label: "Ra", value: `${formatNum(state.Ra, d)} kN` },
      { label: "Rb", value: `${formatNum(state.Rb, d)} kN` },
      { label: "Mmax", value: `${formatNum(state.Mmax, d)}` },
      { label: "Vmax", value: `${formatNum(state.Vmax, d)}` }
    ];
  },
  getTrajectory(state) {
    return (state.bmd || []).map((p) => ({ x: p.x, M: p.m }));
  }
};

// js/models/pidTune.js
var pidTune_default = {
  id: "pid-tune",
  name: "PID \u53C2\u6570\u6574\u5B9A\uFF08\u4EA4\u4E92\uFF09",
  capabilities: {
    interaction: "knobs",
    formalism: "ode",
    viz: "control",
    fidelity: "principle"
  },
  fidelity: "principle",
  params: {
    K: 1,
    zeta: 0.35,
    wn: 2.2,
    Kp: 1.4,
    Ki: 0.55,
    Kd: 0.12,
    speed: 1,
    tol: 0.02
  },
  paramSchema: {
    K: { group: "dynamics", unit: "\u2014", label: "K", min: 0.1, max: 10 },
    zeta: { group: "dynamics", unit: "\u2014", label: "\u03B6", min: 0.05, max: 2 },
    wn: { group: "dynamics", unit: "rad/s", label: "\u03C9\u2099", min: 0.2, max: 20 },
    Kp: { group: "dynamics", unit: "\u2014", label: "Kp", min: 0, max: 20 },
    Ki: { group: "dynamics", unit: "\u2014", label: "Ki", min: 0, max: 20 },
    Kd: { group: "dynamics", unit: "\u2014", label: "Kd", min: 0, max: 5 },
    speed: { group: "dynamics", unit: "\u2014", label: "\u52A8\u753B\u901F", min: 0.2, max: 4 },
    tol: { group: "numerics", unit: "\u2014", label: "ts \u5BB9\u5DEE\u5E26", min: 5e-3, max: 0.1 }
  },
  init(state) {
    state.t = 0;
    state.y = 0;
    state.v = 0;
    state.ie = 0;
    state.hist = [];
    state.ref = 1;
    state.peak = 0;
    state.overshoot = 0;
    state.iae = 0;
    state.ts = -1;
    state.settled = false;
    state.lastOut = false;
  },
  step(state, dt) {
    const s = Math.max(0.05, P(state.params, "speed", 1));
    const h = dt * s;
    const zeta = P(state.params, "zeta", 0.35);
    const wn = P(state.params, "wn", 2.2);
    const K = P(state.params, "K", 1);
    const e = state.ref - state.y;
    state.ie += e * h;
    const u = P(state.params, "Kp", 1.4) * e + P(state.params, "Ki", 0.55) * state.ie - P(state.params, "Kd", 0.12) * state.v;
    const drive = K * (state.ref + 0.4 * u);
    const a = drive * wn * wn - 2 * zeta * wn * state.v - wn * wn * state.y;
    state.v += a * h;
    state.y += state.v * h;
    state.t += h;
    state.iae += Math.abs(e) * h;
    state.peak = Math.max(state.peak, state.y);
    state.overshoot = Math.max(0, state.peak - state.ref);
    const tol = P(state.params, "tol", 0.02);
    const inside = Math.abs(e) <= tol * Math.max(Math.abs(state.ref), 1e-6);
    if (!inside) {
      state.lastOut = true;
      state.settled = false;
      state.ts = -1;
    } else if (state.lastOut || !state.settled) {
      if (!state.settled) {
        state.ts = state.t;
        state.settled = true;
      }
      state.lastOut = false;
    }
    state.hist.push({ t: state.t, y: state.y, e });
    if (state.hist.length > 260) state.hist.shift();
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 40;
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText("PID tune \xB7 step metrics OS / ts / IAE", 12, 18);
    const mid = H * 0.55;
    const yScale = 48;
    ctx.strokeStyle = C.axis;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad, mid - state.ref * yScale);
    ctx.lineTo(W - pad, mid - state.ref * yScale);
    ctx.stroke();
    const tol = P(state.params, "tol", 0.02);
    ctx.beginPath();
    ctx.moveTo(pad, mid - state.ref * (1 + tol) * yScale);
    ctx.lineTo(W - pad, mid - state.ref * (1 + tol) * yScale);
    ctx.moveTo(pad, mid - state.ref * (1 - tol) * yScale);
    ctx.lineTo(W - pad, mid - state.ref * (1 - tol) * yScale);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = C.body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    state.hist.forEach((p, i) => {
      const x = pad + i / 260 * (W - 2 * pad);
      const y = mid - p.y * yScale;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = C.accent;
    ctx.font = "12px IBM Plex Mono, monospace";
    const osPct = state.overshoot / Math.max(Math.abs(state.ref), 1e-9) * 100;
    ctx.fillText(
      `OS=${formatNum(osPct, 1)}%  ts=${state.ts >= 0 ? formatNum(state.ts, 2) : "\u2014"}  IAE=${formatNum(state.iae, 2)}`,
      pad,
      H - 18
    );
  },
  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    const osPct = state.overshoot / Math.max(Math.abs(state.ref), 1e-9) * 100;
    return [
      { label: "\u4FDD\u771F", value: "\u539F\u7406\u7EA7\u2260\u5DE5\u4E1A" },
      { label: "y", value: formatNum(state.y, d) },
      { label: "OS%", value: formatNum(osPct, d) },
      { label: "ts", value: state.ts >= 0 ? `${formatNum(state.ts, d)} s` : "\u2014" },
      { label: "IAE", value: formatNum(state.iae, d) },
      { label: "t", value: `${formatNum(state.t, d)} s` }
    ];
  },
  getTrajectory(state) {
    return state.hist;
  }
};

// js/models/hodgkinHuxley.js
var GNa = 120;
var GK = 36;
var GL = 0.3;
var ENa = 50;
var EK = -77;
var EL = -54.387;
function alphaN(V) {
  return 0.01 * (V + 55) / (1 - Math.exp(-(V + 55) / 10));
}
function betaN(V) {
  return 0.125 * Math.exp(-(V + 65) / 80);
}
function alphaM(V) {
  return 0.1 * (V + 40) / (1 - Math.exp(-(V + 40) / 10));
}
function betaM(V) {
  return 4 * Math.exp(-(V + 65) / 18);
}
function alphaH(V) {
  return 0.07 * Math.exp(-(V + 65) / 20);
}
function betaH(V) {
  return 1 / (1 + Math.exp(-(V + 35) / 10));
}
function safeGate(a, b, x, dt) {
  const inf = a / (a + b);
  const tau = 1 / (a + b);
  return inf + (x - inf) * Math.exp(-dt / Math.max(tau, 1e-6));
}
var hodgkinHuxley_default = {
  id: "hodgkin-huxley",
  name: "\u795E\u7ECF\u52A8\u4F5C\u7535\u4F4D\uFF08Hodgkin-Huxley\uFF09",
  params: {
    Istim: 10,
    stimStart: 5,
    stimDur: 2,
    C: 1,
    speed: 1
  },
  paramSchema: {
    Istim: { group: "dynamics", unit: "\u03BCA/cm\xB2", label: "\u523A\u6FC0\u7535\u6D41", min: 0, max: 40 },
    stimStart: { group: "initial", unit: "ms", label: "\u523A\u6FC0\u8D77\u70B9", min: 0, max: 40 },
    stimDur: { group: "dynamics", unit: "ms", label: "\u523A\u6FC0\u65F6\u957F", min: 0.2, max: 20 },
    C: { group: "dynamics", unit: "\u03BCF/cm\xB2", label: "\u819C\u7535\u5BB9 C", min: 0.5, max: 2 },
    speed: { group: "dynamics", unit: "\u2014", label: "\u52A8\u753B\u901F", min: 0.2, max: 4 }
  },
  init(state) {
    state.t = 0;
    state.V = -65;
    const aN = alphaN(state.V);
    const bN = betaN(state.V);
    const aM = alphaM(state.V);
    const bM = betaM(state.V);
    const aH = alphaH(state.V);
    const bH = betaH(state.V);
    state.n = aN / (aN + bN);
    state.m = aM / (aM + bM);
    state.h = aH / (aH + bH);
    state.hist = [];
    state.gNa = 0;
    state.gK = 0;
    state.Iion = 0;
  },
  step(state, dt) {
    const s = Math.max(0.05, P(state.params, "speed", 1));
    const h = Math.min(0.05, dt * s * 8);
    const steps = Math.max(1, Math.ceil(dt * s * 8 / h));
    for (let k = 0; k < steps; k += 1) {
      const V = state.V;
      const Iapp = state.t >= P(state.params, "stimStart", 5) && state.t < P(state.params, "stimStart", 5) + P(state.params, "stimDur", 2) ? P(state.params, "Istim", 10) : 0;
      state.n = safeGate(alphaN(V), betaN(V), state.n, h);
      state.m = safeGate(alphaM(V), betaM(V), state.m, h);
      state.h = safeGate(alphaH(V), betaH(V), state.h, h);
      state.gNa = GNa * state.m ** 3 * state.h;
      state.gK = GK * state.n ** 4;
      const INa = state.gNa * (V - ENa);
      const IK = state.gK * (V - EK);
      const IL = GL * (V - EL);
      state.Iion = INa + IK + IL;
      const C2 = Math.max(P(state.params, "C", 1), 0.2);
      state.V += (Iapp - state.Iion) / C2 * h;
      state.t += h;
    }
    state.hist.push({ t: state.t, V: state.V });
    if (state.hist.length > 320) state.hist.shift();
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const pad = 44;
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText("Hodgkin\u2013Huxley \xB7 membrane potential", 12, 18);
    const vMin = -90;
    const vMax = 50;
    const toY = (V) => pad + (vMax - V) / (vMax - vMin) * (H - 2 * pad);
    ctx.strokeStyle = C.axis;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pad, toY(-65));
    ctx.lineTo(W - pad, toY(-65));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = C.body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    state.hist.forEach((p, i) => {
      const x = pad + i / 320 * (W - 2 * pad);
      const y = toY(p.V);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    const barY = H - 28;
    const gMax = 40;
    ctx.fillStyle = C.vector;
    ctx.fillRect(pad, barY, Math.min(120, state.gNa / gMax * 120), 8);
    ctx.fillStyle = C.accent;
    ctx.fillRect(pad + 140, barY, Math.min(120, state.gK / gMax * 120), 8);
    ctx.fillStyle = C.muted;
    ctx.font = "10px IBM Plex Mono, monospace";
    ctx.fillText("gNa", pad, barY - 4);
    ctx.fillText("gK", pad + 140, barY - 4);
  },
  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: "V", value: `${formatNum(state.V, d)} mV` },
      { label: "t", value: `${formatNum(state.t, d)} ms` },
      { label: "gNa", value: formatNum(state.gNa, d) },
      { label: "gK", value: formatNum(state.gK, d) },
      { label: "n", value: formatNum(state.n, d) }
    ];
  },
  getTrajectory(state) {
    return state.hist;
  }
};

// js/models/compoundMicroscope.js
function hitTest(px, py, layout) {
  for (const h of layout.hits) {
    if (px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h) return h;
  }
  return null;
}
function drawRayDiagram(ctx, o, box) {
  const { x, y, w, h } = box;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = C.muted || "#888";
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.fillText("Finite conjugate \xB7 object \u2192 intermediate image \u2192 eyepiece", x + 8, y + 16);
  const axisY = y + h * 0.55;
  const objX = x + w * 0.12;
  const lensObjX = x + w * 0.32;
  const imgX = x + w * 0.62;
  const lensEyeX = x + w * 0.82;
  const eyeX = x + w * 0.94;
  ctx.strokeStyle = C.muted || "#888";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x + 8, axisY);
  ctx.lineTo(x + w - 8, axisY);
  ctx.stroke();
  ctx.setLineDash([]);
  const drawLens = (lx, half) => {
    ctx.strokeStyle = C.body || "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, axisY - half);
    ctx.quadraticCurveTo(lx + 6, axisY, lx, axisY + half);
    ctx.quadraticCurveTo(lx - 6, axisY, lx, axisY - half);
    ctx.stroke();
  };
  drawLens(lensObjX, 28);
  drawLens(lensEyeX, 20);
  const objH = 22;
  ctx.strokeStyle = "#9fd4ff";
  ctx.fillStyle = "#9fd4ff";
  ctx.beginPath();
  ctx.moveTo(objX, axisY);
  ctx.lineTo(objX, axisY - objH);
  ctx.lineTo(objX - 4, axisY - objH + 8);
  ctx.moveTo(objX, axisY - objH);
  ctx.lineTo(objX + 4, axisY - objH + 8);
  ctx.stroke();
  ctx.fillText("O", objX - 4, axisY + 14);
  const imgH = Math.min(36, objH * Math.abs(o.mObj) * 0.15);
  ctx.strokeStyle = "#b4ffc8";
  ctx.beginPath();
  ctx.moveTo(imgX, axisY);
  ctx.lineTo(imgX, axisY + imgH);
  ctx.lineTo(imgX - 4, axisY + imgH - 8);
  ctx.moveTo(imgX, axisY + imgH);
  ctx.lineTo(imgX + 4, axisY + imgH - 8);
  ctx.stroke();
  ctx.fillStyle = "#b4ffc8";
  ctx.fillText("I'", imgX - 6, axisY + imgH + 14);
  ctx.strokeStyle = "rgba(159,212,255,0.85)";
  ctx.lineWidth = 1.4;
  const rays = [
    [objX, axisY - objH, lensObjX, axisY - 18, imgX, axisY + imgH],
    [objX, axisY - objH, lensObjX, axisY, imgX, axisY + imgH],
    [objX, axisY - objH * 0.4, lensObjX, axisY + 14, imgX, axisY + imgH * 0.4]
  ];
  for (const [x0, y0, x1, y1, x2, y2] of rays) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,210,120,0.9)";
  ctx.beginPath();
  ctx.moveTo(imgX, axisY + imgH);
  ctx.lineTo(lensEyeX, axisY - 10);
  ctx.lineTo(eyeX, axisY - 16);
  ctx.moveTo(imgX, axisY + imgH * 0.3);
  ctx.lineTo(lensEyeX, axisY + 6);
  ctx.lineTo(eyeX, axisY + 10);
  ctx.stroke();
  ctx.fillStyle = C.muted || "#888";
  ctx.fillText("eye", eyeX - 10, axisY + 28);
  ctx.fillText("obj", lensObjX - 10, axisY - 34);
  ctx.fillText("eye piece", lensEyeX - 18, axisY - 26);
  ctx.fillText(`m_obj=${formatNum(o.mObj, 1)}`, x + 8, y + h - 10);
  ctx.restore();
}
var compoundMicroscope_default = {
  id: "r016-\u663E\u5FAE\u955C",
  name: "Compound microscope (structure)",
  formula: "M \u2248 \u2212(L/f_obj)\xB7(25 cm/f_eye); d = 0.61 \u03BB / NA; NA \u2264 n sin \u03B1",
  description: "Structure + finite-conjugate ray diagram; NA, WD, immersion editable",
  authority: "Hecht, Optics \u2014 compound microscope; Abbe d = 0.61 \u03BB / NA",
  assumptions: "Paraxial finite-tube; thin lenses; near-point 25 cm; NA capped by n sin \u03B1",
  fidelity: "engineering",
  capabilities: {
    interaction: "canvas",
    formalism: "optics",
    viz: "phet-optics",
    fidelity: "engineering",
    pointer: true,
    hint: "Click turret / eyepiece \xB7 tune NA & immersion",
    stageModes: ["canvas2d", "webgl3d"]
  },
  params: { ...DEFAULT_PARAMS },
  paramSchema: { ...PARAM_SCHEMA },
  init(state) {
    applyTurretDefaults(state, "all");
    state.t = 0;
    state._layout = null;
    state.pick = null;
    state._lastObj = state.params.objective;
    state._lastEye = state.params.eyepiece;
  },
  refresh(state) {
    if (state._lastObj !== state.params.objective) {
      state._lastObj = state.params.objective;
      applyTurretDefaults(state, "obj");
    }
    if (state._lastEye !== state.params.eyepiece) {
      state._lastEye = state.params.eyepiece;
      applyTurretDefaults(state, "eye");
    }
    const o = opticsFromParams(state.params);
    state.params.n = o.n;
    state.params.NA = Math.min(Number(state.params.NA) || o.NA, o.NAcap);
  },
  step(state, dt) {
    state.t += Math.max(0, dt);
    this.refresh(state);
  },
  onPointer(state, ev) {
    const layout = state._layout;
    if (!layout) return false;
    if (ev.type === "down" || ev.type === "tap") {
      const hit = hitTest(ev.x, ev.y, layout);
      if (!hit) return false;
      if (hit.kind === "obj") {
        state.params.objective = OBJECTIVES[hit.index].id;
        applyTurretDefaults(state, "obj");
        state._lastObj = state.params.objective;
        state.pick = `obj-${OBJECTIVES[hit.index].mag}\xD7`;
        return true;
      }
      if (hit.kind === "eye") {
        state.params.eyepiece = EYEPIECES[hit.index].id;
        applyTurretDefaults(state, "eye");
        state._lastEye = state.params.eyepiece;
        state.pick = `eye-${EYEPIECES[hit.index].mag}\xD7`;
        return true;
      }
    }
    return false;
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const o = opticsFromParams(state.params);
    const cx = W * 0.28;
    const baseY = H * 0.92;
    const hits = [];
    ctx.fillStyle = C.muted || "#888";
    ctx.font = "600 13px IBM Plex Mono, monospace";
    ctx.fillText("Compound microscope \xB7 structure + rays", 14, 22);
    ctx.font = "12px IBM Plex Mono, monospace";
    const imm = o.immersion ? " \xB7 oil" : "";
    ctx.fillText(
      `M=${formatNum(o.M, 1)}\xD7  NA=${formatNum(o.NA, 2)}\u2264${formatNum(o.NAcap, 2)}  WD=${formatNum(o.WD, 2)} mm  n=${formatNum(o.n, 3)}${imm}`,
      14,
      40
    );
    ctx.strokeStyle = C.body || "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 70, baseY);
    ctx.lineTo(cx + 90, baseY);
    ctx.moveTo(cx + 70, baseY);
    ctx.lineTo(cx + 70, H * 0.28);
    ctx.lineTo(cx + 20, H * 0.28);
    ctx.stroke();
    const tubeTop = H * 0.3;
    const tubeBot = H * 0.58;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(cx - 18, tubeTop, 36, tubeBot - tubeTop);
    ctx.strokeStyle = C.body || "#fff";
    ctx.strokeRect(cx - 18, tubeTop, 36, tubeBot - tubeTop);
    const eyeY = tubeTop - 36;
    const eyeW = 44;
    const eyeH = 28;
    EYEPIECES.forEach((eye, i) => {
      const x = cx - 70 + i * (eyeW + 8);
      const active = eye.id === o.eye.id;
      ctx.fillStyle = active ? "rgba(180,220,255,0.35)" : "rgba(255,255,255,0.06)";
      ctx.fillRect(x, eyeY, eyeW, eyeH);
      ctx.strokeStyle = active ? "#b4dcff" : C.muted || "#888";
      ctx.strokeRect(x, eyeY, eyeW, eyeH);
      ctx.fillStyle = C.body || "#fff";
      ctx.font = "11px IBM Plex Mono, monospace";
      ctx.fillText(`${eye.mag}\xD7`, x + 12, eyeY + 18);
      hits.push({ kind: "eye", index: i, x, y: eyeY, w: eyeW, h: eyeH });
    });
    const turY = tubeBot + 8;
    const turR = 48;
    ctx.beginPath();
    ctx.arc(cx, turY + 10, turR, 0, Math.PI * 2);
    ctx.strokeStyle = C.body || "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    OBJECTIVES.forEach((obj, i) => {
      const ang = -Math.PI / 2 + i * (Math.PI / 2);
      const lx = cx + Math.cos(ang) * 30;
      const ly = turY + 10 + Math.sin(ang) * 30;
      const s = 26;
      const active = obj.id === o.obj.id;
      ctx.fillStyle = active ? "rgba(180,255,200,0.35)" : "rgba(255,255,255,0.06)";
      ctx.fillRect(lx - s / 2, ly - s / 2, s, s);
      ctx.strokeStyle = active ? "#b4ffc8" : C.muted || "#888";
      ctx.strokeRect(lx - s / 2, ly - s / 2, s, s);
      ctx.fillStyle = C.body || "#fff";
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText(`${obj.mag}\xD7`, lx - 10, ly + 4);
      hits.push({ kind: "obj", index: i, x: lx - s / 2, y: ly - s / 2, w: s, h: s });
    });
    const stageY = turY + turR + 40;
    ctx.strokeStyle = C.body || "#fff";
    ctx.beginPath();
    ctx.moveTo(cx - 50, stageY);
    ctx.lineTo(cx + 50, stageY);
    ctx.stroke();
    if (o.immersion) {
      ctx.fillStyle = "rgba(180,220,255,0.25)";
      ctx.fillRect(cx - 12, stageY - 14, 24, 14);
      ctx.fillStyle = C.muted || "#888";
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText("oil", cx - 8, stageY - 16);
    }
    if (P(state.params, "showRays", 1) > 0.5) {
      drawRayDiagram(ctx, o, {
        x: W * 0.48,
        y: H * 0.12,
        w: W * 0.48,
        h: H * 0.55
      });
    }
    const px = W * 0.48;
    let py = H * 0.72;
    ctx.fillStyle = C.body || "#fff";
    ctx.font = "12px IBM Plex Mono, monospace";
    for (const line of [
      `${o.obj.mag}\xD7 / ${o.eye.mag}\xD7 \xB7 L=${formatNum(o.Lmm, 0)} mm`,
      `NA ${formatNum(o.NA, 3)} (cap ${formatNum(o.NAcap, 3)}) \xB7 WD ${formatNum(o.WD, 2)} mm`,
      `|M|\u2248${formatNum(Math.abs(o.M), 1)}\xD7 \xB7 d\u2248${formatNum(o.dResM * 1e6, 2)} \xB5m`
    ]) {
      ctx.fillText(line, px, py);
      py += 16;
    }
    if (state.pick) {
      ctx.fillStyle = C.muted || "#888";
      ctx.fillText(`selected ${state.pick}`, px, py + 4);
    }
    state._layout = { hits };
  },
  getReadouts(state, opts = {}) {
    const digits = opts.digits ?? 3;
    const o = opticsFromParams(state.params);
    return [
      { label: "M", value: `${formatNum(o.M, digits)}\xD7` },
      { label: "|M|", value: `${formatNum(Math.abs(o.M), digits)}\xD7` },
      { label: "m_obj", value: formatNum(o.mObj, digits) },
      { label: "M_eye", value: formatNum(o.Meye, digits) },
      { label: "NA", value: formatNum(o.NA, digits) },
      { label: "NA_cap", value: formatNum(o.NAcap, digits) },
      { label: "WD", value: `${formatNum(o.WD, digits)} mm` },
      { label: "f_obj", value: `${formatNum(o.fObjM * 1e3, digits)} mm` },
      { label: "f_eye", value: `${formatNum(o.fEyeM * 1e3, digits)} mm` },
      { label: "L", value: `${formatNum(o.Lmm, digits)} mm` },
      { label: "n", value: formatNum(o.n, digits) },
      { label: "d (Abbe)", value: `${formatNum(o.dResM * 1e6, digits)} \xB5m` },
      { label: "obj", value: `${o.obj.mag}\xD7` },
      { label: "eye", value: `${o.eye.mag}\xD7` },
      { label: "immersion", value: o.immersion ? "oil" : "dry" }
    ];
  }
};

// js/models/handModels.js
var HANDS = [
  projectile_default,
  spring_default,
  pendulum_default,
  collision_default,
  doublePendulum_default,
  wave_default,
  heat_default,
  orbit_default,
  lorentz_default,
  sorting_default,
  bfsGrid_default,
  life_default,
  cacheLru_default,
  pipeline_default,
  fifo_default,
  rcCircuit_default,
  rlc_default,
  inclinedPlane_default,
  collision2d_default,
  dijkstra_default,
  logicGates_default,
  beamSfdBmd_default,
  pidTune_default,
  hodgkinHuxley_default,
  compoundMicroscope_default
];
export {
  HANDS
};
