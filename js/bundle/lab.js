import {
  C,
  FAMILY_META,
  HAND_FORMALISM,
  P,
  STRINGS,
  accelExtras,
  applyDomI18n,
  applyLowInkStrokeBoost,
  bootI18n,
  clampNumber,
  domainLabel,
  drawArrow,
  drawPaletteLegend,
  drawZigZagSpring,
  ensureSidebarLocales,
  finiteOr,
  forceGraphStep,
  formalismFor,
  formatDtFriendly,
  formatNum,
  formatParamNumber,
  getActiveModelId,
  getLocale,
  getModelColors,
  groupLabels,
  heatTempColor,
  inferBounds,
  inferGroup,
  inferUnit,
  localizeModel,
  localizeModel2,
  mapNormToScreen,
  mountLocaleSelect,
  onLocaleChange,
  paintGraph,
  palettesReady,
  palettesReadyNow,
  parseUserNumber,
  phaseHueColor,
  sanitizeGlobals,
  setModelPalette,
  springK,
  t,
  topicMissNote,
  validateCustomParam
} from "./chunk-chunk-HHLDLSXD.js";

// js/utils/integrator.js
function createFixedStepper(fixedDt = 1 / 240, maxSubSteps = 48) {
  let accumulator = 0;
  let dt = fixedDt;
  let maxSteps = maxSubSteps;
  return {
    get fixedDt() {
      return dt;
    },
    get maxSubSteps() {
      return maxSteps;
    },
    setFixedDt(next) {
      const v = Number(next);
      if (Number.isFinite(v) && v > 0) dt = v;
    },
    setMaxSubSteps(next) {
      const v = Math.floor(Number(next));
      if (Number.isFinite(v) && v >= 1) maxSteps = v;
    },
    reset() {
      accumulator = 0;
    },
    advance(frameDt, stepFn) {
      const clamped = Math.min(Math.max(frameDt, 0), 0.05);
      accumulator += clamped;
      let steps = 0;
      while (accumulator >= dt && steps < maxSteps) {
        stepFn(dt);
        accumulator -= dt;
        steps += 1;
      }
      if (steps === maxSteps) accumulator = 0;
      return steps;
    }
  };
}
function velocityVerlet1D(x, v, a, aAt, dt) {
  const xNext = x + v * dt + 0.5 * a * dt * dt;
  const aNext = aAt(xNext);
  const vNext = v + 0.5 * (a + aNext) * dt;
  return { x: xNext, v: vNext, a: aNext };
}

// js/models/freeFall.js
var freeFall_default = {
  id: "free-fall",
  name: "\u81EA\u7531\u843D\u4F53",
  capabilities: {
    pointer: true,
    interaction: "canvas",
    formalism: "ode",
    viz: "phet-particle",
    fidelity: "principle",
    hint: "\u62D6\u52A8\u7403\u6539\u521D\u9AD8\u5EA6 h\u2080\uFF08\u7C7B PhET \u7EA6\u675F\u70B9\uFF09"
  },
  params: {
    g: 9.81,
    h: 10,
    v0: 0,
    k: 0,
    m: 1,
    e: 0.7,
    dragExp: 1,
    restVel: 0.05,
    ground: 0
  },
  paramSchema: {
    g: { group: "dynamics", unit: "m/s\xB2", label: "g", min: 0, max: 200 },
    k: { group: "dynamics", unit: "kg/s", label: "\u963B\u529B k", min: 0, max: 5e3 },
    m: { group: "dynamics", unit: "kg", label: "m", min: 1e-6, max: 1e6 },
    e: { group: "dynamics", unit: "\u2014", label: "\u6062\u590D\u7CFB\u6570 e", min: 0, max: 1 },
    dragExp: { group: "dynamics", unit: "\u2014", label: "\u963B\u529B\u6307\u6570", min: 0.5, max: 3 },
    restVel: { group: "dynamics", unit: "m/s", label: "\u9759\u6B62\u9608\u503C", min: 0, max: 2 },
    ground: { group: "dynamics", unit: "m", label: "\u5730\u9762\u9AD8\u5EA6", min: -50, max: 50 },
    h: { group: "initial", unit: "m", label: "h\u2080", min: 0, max: 1e4 },
    v0: { group: "initial", unit: "m/s", label: "v\u2080", min: -500, max: 500 }
  },
  init(state) {
    const h = Math.max(P(state.params, "h", 10), 0);
    const ground = P(state.params, "ground", 0);
    state.t = 0;
    state.y = h;
    state.v = P(state.params, "v0", 0);
    state.a = -P(state.params, "g", 9.81);
    state.bounces = 0;
    state.resting = false;
    state.trail = [];
    state.ground = ground;
  },
  step(state, dt) {
    if (state.resting) return;
    const g = P(state.params, "g", 9.81);
    const k = P(state.params, "k", 0);
    const m = Math.max(P(state.params, "m", 1), 1e-9);
    const e = P(state.params, "e", 0);
    const exp = Math.max(P(state.params, "dragExp", 1), 0.5);
    const ground = P(state.params, "ground", 0);
    const restVel = P(state.params, "restVel", 0.05);
    const locals = { y: state.y, v: state.v, t: state.t, g, k, m, ground };
    const drag = (v) => {
      if (k === 0) return 0;
      const mag = Math.abs(v) ** exp;
      return -(k / m) * MagSign(v, mag);
    };
    if (k === 0) {
      const aAt = (y) => -g + accelExtras(state.params, { ...locals, y });
      const next = velocityVerlet1D(state.y, state.v, state.a, aAt, dt);
      state.y = finiteOr(next.x, 0);
      state.v = finiteOr(next.v, 0);
      state.a = finiteOr(next.a, -g);
    } else {
      let a = -g + drag(state.v) + accelExtras(state.params, locals);
      state.v = finiteOr(state.v + a * dt, 0);
      state.y = finiteOr(state.y + state.v * dt, 0);
      state.a = -g + drag(state.v) + accelExtras(state.params, { ...locals, v: state.v, y: state.y });
    }
    state.t += dt;
    if (state.y <= ground && state.v < 0) {
      state.y = ground;
      state.v = -e * state.v;
      state.bounces += 1;
      state.a = -g;
      if (Math.abs(state.v) < restVel || e <= 0) {
        state.v = 0;
        state.a = 0;
        state.resting = true;
      }
    }
    state.trail.push({ t: state.t, y: state.y, v: state.v });
    if (state.trail.length > 600) state.trail.shift();
  },
  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const h0 = Math.max(P(state.params, "h", 10), 1e-6);
    const margin = { l: 60, r: 40, t: 40, b: 50 };
    const groundY = H - margin.b;
    const scale = (H - margin.t - margin.b) / (h0 * 1.15);
    const cx = W * 0.45;
    const toY = (y) => groundY - y * scale;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.l, groundY);
    ctx.lineTo(W - margin.r, groundY);
    ctx.stroke();
    if (view.showAxes !== false) {
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(cx, toY(h0));
      ctx.lineTo(cx, groundY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (view.showTrail !== false) {
      ctx.fillStyle = C.trail;
      for (let i = 0; i < state.trail.length; i += 3) {
        ctx.beginPath();
        ctx.arc(cx, toY(state.trail[i].y), 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const sy = toY(state.y);
    state._ball = { x: cx, y: sy, r: 16, groundY, scale, cx };
    ctx.fillStyle = C.body;
    ctx.beginPath();
    ctx.arc(cx, sy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = state._dragBall ? C.accent : C.vector;
    ctx.lineWidth = state._dragBall ? 3 : 2;
    ctx.stroke();
    if (view.showVectors !== false) {
      drawArrow(ctx, cx, sy, cx, sy - state.v * 8, C.vector, 2);
    }
    ctx.fillStyle = C.muted;
    ctx.font = "12px IBM Plex Mono, monospace";
    ctx.fillText(`h0=${formatNum(h0)}  e=${formatNum(P(state.params, "e", 0), 2)} \xB7 \u62D6\u7403`, margin.l, margin.t - 8);
  },
  onPointer(state, ev) {
    const b = state._ball;
    if (!b) return false;
    if (ev.type === "down") {
      if ((ev.x - b.x) ** 2 + (ev.y - b.y) ** 2 <= b.r * b.r) {
        state._dragBall = true;
        return true;
      }
      return false;
    }
    if (ev.type === "move" && state._dragBall) {
      const y = (b.groundY - ev.y) / Math.max(b.scale, 1e-6);
      const ground = P(state.params, "ground", 0);
      const next = Math.max(ground, Math.min(200, y));
      state.y = next;
      state.params.h = next;
      state.v = P(state.params, "v0", 0);
      state.resting = false;
      state.bounces = 0;
      state.t = 0;
      state.trail = [];
      return true;
    }
    if (ev.type === "up") {
      state._dragBall = false;
      return true;
    }
    return false;
  },
  getReadouts(state, opts = {}) {
    const d = opts.digits ?? 3;
    return [
      { label: "t", value: `${formatNum(state.t, d)} s` },
      { label: "y", value: `${formatNum(state.y, d)} m` },
      { label: "v", value: `${formatNum(state.v, d)} m/s` },
      { label: "\u5F39\u8DF3", value: `${state.bounces}` }
    ];
  },
  getEnergy(state) {
    const m = P(state.params, "m", 1);
    const g = P(state.params, "g", 9.81);
    return { kinetic: 0.5 * m * state.v * state.v, potential: m * g * state.y };
  },
  getTrajectory(state) {
    return state.trail;
  }
};
function MagSign(v, mag) {
  if (v === 0) return 0;
  return Math.sign(v) * mag;
}

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
        const t2 = Tflight * i / 80;
        const x = v0 * Math.cos(th) * t2;
        const y = v0 * Math.sin(th) * t2 - 0.5 * g * t2 * t2;
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
    const N = Math.max(10, Math.floor(p.N));
    state.N = N;
    state.dx = p.L / (N - 1);
    state.t = 0;
    state.T = new Float64Array(N);
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
    const next = new Float64Array(N);
    next[0] = state.params.Tleft;
    next[N - 1] = state.params.Tright;
    for (let i = 1; i < N - 1; i += 1) {
      next[i] = T[i] + r * (T[i + 1] - 2 * T[i] + T[i - 1]);
    }
    state.T = next;
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
    const frame2 = state.stack.pop();
    if (frame2.lo < frame2.hi) {
      state.lo = frame2.lo;
      state.hi = frame2.hi;
      state.i = frame2.lo - 1;
      state.j = frame2.lo;
      state.pivot = frame2.hi;
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
    const n = Math.floor(P(state.params, "n", 32));
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
    while (state.acc >= period) {
      state.acc -= period;
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
    const X = (t2) => pad.l + t2 / tMax * plotW;
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
      const t2 = tMax * i / 80;
      const v = Vin + (V0 - Vin) * Math.exp(-t2 / tau);
      const x = X(t2);
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
          const t2 = tMax * i / 100;
          const v = analyticFn(t2);
          const x = pad.l + t2 / tMax * plotW;
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
    const vcAnalytic = (t2) => Math.exp(-alpha * t2) * (A * Math.cos(wd * t2) + B * Math.sin(wd * t2));
    const iAnalytic = (t2) => {
      const e = Math.exp(-alpha * t2);
      const dVc = e * (-alpha * (A * Math.cos(wd * t2) + B * Math.sin(wd * t2)) + (-A * wd * Math.sin(wd * t2) + B * wd * Math.cos(wd * t2)));
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
    const box2 = { l: m, r: W - m, t: m, b: H - m, w: W - 2 * m, h: H - 2 * m };
    ctx.fillStyle = C.muted;
    ctx.font = "11px IBM Plex Mono, monospace";
    const names = ["\u7B80\u652F", "\u60AC\u81C2", "\u56FA\u652F"];
    ctx.fillText(`beam \xB7 ${names[support] || "?"} \xB7 multi-load SFD/BMD`, 12, 18);
    const midY = box2.t + box2.h * 0.26;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(box2.l, midY);
    ctx.lineTo(box2.r, midY);
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
      drawSupport(box2.l, "pin");
      drawSupport(box2.r, "roller");
    } else if (support === 1) {
      drawSupport(box2.l, "fixed");
    } else {
      drawSupport(box2.l, "fixed");
      drawSupport(box2.r, "fixed");
    }
    for (const ld of state.loads || []) {
      const px = box2.l + ld.a / L * box2.w;
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
        const x = box2.l + p.x / L * box2.w;
        const y = y0 - p[key] / maxA * h;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      ctx.strokeStyle = C.axis;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(box2.l, y0);
      ctx.lineTo(box2.r, y0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.muted;
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText(label, box2.l, y0 - h - 6);
    };
    plot(state.sfd, "v", box2.t + box2.h * 0.55, box2.h * 0.12, C.vector, "SFD");
    plot(state.bmd, "m", box2.t + box2.h * 0.82, box2.h * 0.12, C.body, "BMD");
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

// js/models/microscopeOptics.js
var OBJECTIVES = [
  { id: "4x", mag: 4, fMm: 40, na: 0.1, wdMm: 18, alphaDeg: 5.7 },
  { id: "10x", mag: 10, fMm: 16, na: 0.25, wdMm: 6.5, alphaDeg: 14.5 },
  { id: "40x", mag: 40, fMm: 4, na: 0.65, wdMm: 0.6, alphaDeg: 40.5 },
  { id: "100x", mag: 100, fMm: 1.6, na: 1.25, wdMm: 0.15, alphaDeg: 55, immersion: true }
];
var EYEPIECES = [
  { id: "5x", mag: 5, fMm: 50 },
  { id: "10x", mag: 10, fMm: 25 },
  { id: "15x", mag: 15, fMm: 16.7 }
];
var OBJ_OPTIONS = OBJECTIVES.map((o) => ({ value: o.id, label: `${o.mag}\xD7` }));
var EYE_OPTIONS = EYEPIECES.map((e) => ({ value: e.id, label: `${e.mag}\xD7` }));
function findObjective(id) {
  return OBJECTIVES.find((o) => o.id === id) || OBJECTIVES[1];
}
function findEyepiece(id) {
  return EYEPIECES.find((e) => e.id === id) || EYEPIECES[1];
}
function naCap(n, obj) {
  const alpha = obj.alphaDeg * Math.PI / 180;
  return Math.max(0.05, Math.min(n * Math.sin(alpha), n * 0.95));
}
function opticsFromParams(params) {
  const obj = findObjective(params.objective || "10x");
  const eye = findEyepiece(params.eyepiece || "10x");
  const Lmm = Math.max(80, Number(params.tubeL_mm) || 160);
  let n = Math.max(1, Number(params.n) || 1);
  if (obj.immersion) n = Math.max(n, 1.515);
  else n = Math.min(n, 1.33);
  const cap = naCap(n, obj);
  const NA = Math.max(0.05, Math.min(cap, Number(params.NA) || obj.na));
  const WD = Math.max(0.05, Number(params.WD_mm) || obj.wdMm);
  const lambdaNm = Math.max(380, Math.min(780, Number(params.lambda_nm) || 550));
  const fObjM = (Number(params.fObj_mm) || obj.fMm) * 1e-3;
  const fEyeM = (Number(params.fEye_mm) || eye.fMm) * 1e-3;
  const L = Lmm * 1e-3;
  const mObj = -(L / Math.max(fObjM, 1e-6));
  const Meye = 0.25 / Math.max(fEyeM, 1e-6);
  const M = mObj * Meye;
  const dResM = 0.61 * (lambdaNm * 1e-9) / Math.max(NA, 1e-6);
  const sObj = -fObjM;
  const sImg = L;
  return {
    obj,
    eye,
    Lmm,
    n,
    NA,
    NAcap: cap,
    WD,
    lambdaNm,
    fObjM,
    fEyeM,
    L,
    M,
    mObj,
    Meye,
    dResM,
    sObj,
    sImg,
    immersion: !!obj.immersion
  };
}
function applyTurretDefaults(state, which = "all") {
  const obj = findObjective(state.params.objective || "10x");
  const eye = findEyepiece(state.params.eyepiece || "10x");
  if (which === "obj" || which === "all") {
    state.params.objective = obj.id;
    state.params.fObj_mm = obj.fMm;
    state.params.WD_mm = obj.wdMm;
    if (obj.immersion) {
      state.params.n = Math.max(Number(state.params.n) || 1, 1.515);
    } else if (Number(state.params.n) > 1.33) {
      state.params.n = 1;
    }
    state.params.NA = Math.min(obj.na, naCap(state.params.n, obj));
  }
  if (which === "eye" || which === "all") {
    state.params.eyepiece = eye.id;
    state.params.fEye_mm = eye.fMm;
  }
  const o = opticsFromParams(state.params);
  state.params.n = o.n;
  state.params.NA = Math.min(Number(state.params.NA) || o.NA, o.NAcap);
}
var DEFAULT_PARAMS = {
  objective: "10x",
  eyepiece: "10x",
  tubeL_mm: 160,
  fObj_mm: 16,
  fEye_mm: 25,
  NA: 0.25,
  WD_mm: 6.5,
  n: 1,
  lambda_nm: 550,
  showRays: 1
};
var PARAM_SCHEMA = {
  objective: {
    group: "dynamics",
    unit: "",
    label: "Objective",
    options: OBJ_OPTIONS
  },
  eyepiece: {
    group: "dynamics",
    unit: "",
    label: "Eyepiece",
    options: EYE_OPTIONS
  },
  tubeL_mm: { group: "dynamics", unit: "mm", label: "Tube length L", min: 120, max: 200 },
  fObj_mm: { group: "dynamics", unit: "mm", label: "f_obj", min: 1, max: 50 },
  fEye_mm: { group: "dynamics", unit: "mm", label: "f_eye", min: 10, max: 60 },
  NA: { group: "dynamics", unit: "\u2014", label: "NA", min: 0.05, max: 1.4 },
  WD_mm: { group: "dynamics", unit: "mm", label: "Working distance", min: 0.05, max: 25 },
  n: { group: "dynamics", unit: "\u2014", label: "n (medium)", min: 1, max: 1.6 },
  lambda_nm: { group: "dynamics", unit: "nm", label: "\u03BB", min: 400, max: 700 },
  showRays: {
    group: "display",
    unit: "",
    label: "Ray diagram",
    options: [{ value: 0, label: "Hide" }, { value: 1, label: "Show" }]
  }
};

// js/models/compoundMicroscope.js
function hitTest(px, py, layout) {
  for (const h of layout.hits) {
    if (px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h) return h;
  }
  return null;
}
function drawRayDiagram(ctx, o, box2) {
  const { x, y, w, h } = box2;
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

// js/models/factoryLoader.js
var builder = null;
var pending = null;
function factoryBuilder() {
  if (!builder) throw new Error("factory builder is not loaded");
  return builder;
}
function ensureFactory() {
  if (builder) return Promise.resolve(builder);
  if (!pending) {
    pending = import("./chunk-factory-BTK4WHEY.js").then((mod) => {
      builder = mod.createFactoryModel;
      return builder;
    });
  }
  return pending;
}

// data/authority-templates.json
var authority_templates_default = {
  deprecatedFamilies: {},
  families: {
    ode1d: {
      fidelity: "engineering",
      authority: "Thornton & Marion, Classical Dynamics of Particles and Systems, Ch. 2\u20133\uFF08\u4E00\u7EF4\u725B\u987F\u5B9A\u5F8B\uFF09",
      assumptions: "\u4E00\u7EF4\u3001\u5E38\u8D28\u91CF\u3001\u96C6\u603B\u529B\uFF1B\u7EBF\u6027\u963B\u529B\u6216\u5E38\u529B\uFF1B\u975E\u591A\u4F53/\u67D4\u6027\u4F53\uFF1B\u53C2\u6570\u8D85\u8303\u56F4\u65F6\u4E0D\u4FDD\u8BC1\u5DE5\u7A0B\u7CBE\u5EA6"
    },
    ode2d: {
      fidelity: "engineering",
      authority: "Taylor, Classical Mechanics, Ch. 2\uFF08\u5E73\u9762\u725B\u987F\u5B9A\u5F8B\uFF09",
      assumptions: "\u5E73\u9762\u3001\u5E38\u8D28\u91CF\u3001\u96C6\u603B\uFF1B\u5FFD\u7565\u4E09\u7EF4\u8026\u5408\u4E0E\u67D4\u6027\uFF1B\u975E CAD \u8FD0\u52A8\u5B66"
    },
    circular: {
      fidelity: "principle",
      authority: "Goldstein, Classical Mechanics, Ch. 3\uFF08\u6709\u5FC3\u52BF/\u5F00\u666E\u52D2\u95EE\u9898\u7684\u6559\u79D1\u4E66\u5F62\u5F0F\uFF09",
      assumptions: "\u70B9\u8D28\u91CF\u3001\u5E73\u65B9\u53CD\u6BD4\u6216\u5300\u901F\u5706\u5468\u793A\u610F\uFF1B\u975E N \u4F53\u661F\u5386\u3001\u975E\u6444\u52A8\u5DE5\u4E1A\u8F68\u9053\u786E\u5B9A"
    },
    particles: {
      fidelity: "principle",
      authority: "Griffiths, Introduction to Electrodynamics, Ch. 2\uFF08\u70B9\u7535\u8377\u573A\u7684\u6559\u79D1\u4E66\u6781\u9650\uFF09",
      assumptions: "\u70B9\u7C92\u5B50\u3001\u5E93\u4ED1/\u6D1B\u4F26\u5179\u793A\u610F\uFF1B\u65E0\u81EA\u80FD\u91CD\u6574\u3001\u975E\u7C92\u5B50\u8F93\u8FD0\u6C42\u89E3\u5668"
    },
    nbody: {
      fidelity: "principle",
      authority: "Murray & Dermott, Solar System Dynamics, Ch. 2\uFF08\u5C11\u4F53\u5F15\u529B\uFF09",
      assumptions: "\u5C11\u4F53\u3001\u725B\u987F\u5F15\u529B\u3001\u8F6F\u5316\u9632\u5947\u70B9\uFF1B\u975E\u7CBE\u5BC6\u661F\u5386"
    },
    euler: {
      fidelity: "principle",
      authority: "Goldstein, Classical Mechanics, Ch. 4\uFF08\u6B27\u62C9\u89D2\uFF09",
      assumptions: "\u521A\u4F53\u59FF\u6001\u793A\u610F\uFF1B\u4E07\u5411\u8282\u9501\u4E0E\u987A\u5E8F\u987B\u6309\u6587\u732E\uFF0C\u975E\u98DE\u63A7\u89E3\u7B97"
    },
    buoyancy: {
      fidelity: "principle",
      authority: "Kundu, Fluid Mechanics, Ch. 1\uFF08\u963F\u57FA\u7C73\u5FB7\u6D6E\u529B\uFF09",
      assumptions: "\u9759\u6D41\u4F53\u3001\u5B8C\u5168\u6D78\u6CA1\u6216\u7B80\u5355\u5403\u6C34\uFF1B\u975E CFD \u81EA\u7531\u6DB2\u9762"
    },
    flow: {
      fidelity: "principle",
      authority: "White, Fluid Mechanics\uFF08\u8FDE\u7EED\u6027\u4E0E\u4F2F\u52AA\u5229\u7684\u6559\u79D1\u4E66\u9002\u7528\u6761\u4EF6\uFF09",
      assumptions: "\u4E0D\u53EF\u538B\u3001\u5B9A\u5E38\u3001\u6CBF\u6D41\u7EBF\u7684\u539F\u7406\u56FE\uFF1B\u975E CFD/\u7BA1\u7F51\u6C34\u529B\u8BA1\u7B97\u8F6F\u4EF6"
    },
    wave1d: {
      fidelity: "engineering",
      authority: "Kinsler, Fundamentals of Acoustics, Ch. 1\uFF1B\u6216 Pain, The Physics of Vibrations and Waves\uFF08\u4E00\u7EF4\u6CE2\u52A8\u65B9\u7A0B\uFF09",
      assumptions: "\u4E00\u7EF4\u3001\u5E38\u6CE2\u901F\u3001\u6709\u9650\u5DEE\u5206\uFF1B\u8FB9\u754C\u6309\u6A21\u578B\u58F0\u660E\uFF1B\u975E\u4E09\u7EF4\u5168\u6CE2\u4EFF\u771F"
    },
    doppler: {
      fidelity: "principle",
      authority: "Halliday, Resnick, Walker, Fundamentals of Physics, \u58F0\u6CE2\u591A\u666E\u52D2\u7AE0\u8282",
      assumptions: "\u5300\u901F\u6E90/\u89C2\u5BDF\u8005\u3001\u8FDC\u5C0F\u4E8E\u5149\u901F\uFF1B\u975E\u5BBD\u5E26\u4FE1\u53F7\u5904\u7406"
    },
    interference: {
      fidelity: "principle",
      authority: "Hecht, Optics, \u53CC\u7F1D/\u53CC\u6E90\u5E72\u6D89\u7AE0\u8282",
      assumptions: "\u6807\u91CF\u6CE2\u3001\u76F8\u5E72\u70B9\u6E90\u793A\u610F\uFF1B\u975E\u77E2\u91CF\u884D\u5C04\u5DE5\u4E1A\u8BBE\u8BA1"
    },
    field2d: {
      fidelity: "principle",
      authority: "Griffiths, Introduction to Electrodynamics, Ch. 2\u20133\uFF08\u9759\u573A\uFF09",
      assumptions: "\u4E8C\u7EF4\u9759\u573A\u6216\u52BF\u7684\u793A\u610F\u7F51\u683C\uFF1B\u975E\u6709\u9650\u5143\u7535\u78C1\u6C42\u89E3\u5668"
    },
    piston: {
      fidelity: "principle",
      authority: "\xC7engel & Boles, Thermodynamics, \u95ED\u53E3\u7CFB\u7EDF\u6D3B\u585E\u8FC7\u7A0B",
      assumptions: "\u51C6\u9759\u6001\u3001\u7406\u60F3\u6C14\u4F53\u6216\u7ED9\u5B9A\u8FC7\u7A0B\u6307\u6570\uFF1B\u975E CFD \u7F38\u5185\u8FC7\u7A0B"
    },
    cycle: {
      fidelity: "principle",
      authority: "\xC7engel & Boles, Thermodynamics, \u52A8\u529B/\u5236\u51B7\u5FAA\u73AF\u7AE0\u8282",
      assumptions: "\u7406\u60F3\u5FAA\u73AF\u3001\u96C6\u603B\u5DE5\u8D28\uFF1B\u5FFD\u7565\u4E0D\u53EF\u9006\u7EC6\u8282\u65F6\u4E0D\u5F97\u6807\u5DE5\u7A0B\u673A\u7EC4\u6548\u7387"
    },
    fieldlines: {
      fidelity: "principle",
      authority: "Griffiths, Introduction to Electrodynamics, Ch. 2\uFF08\u7535\u573A\u7EBF\u7EA6\u5B9A\uFF09",
      assumptions: "\u9759\u7535\u3001\u53EF\u89C6\u5316\u7EA6\u5B9A\uFF1B\u7EBF\u5BC6\u5EA6\u4E0D\u662F\u5B9A\u91CF\u5DE5\u7A0B\u573A\u89E3"
    },
    circuit: {
      fidelity: "engineering",
      authority: "Nilsson & Riedel, Electric Circuits, \u4E00\u9636/\u4E8C\u9636\u7535\u8DEF\u7AE0\u8282",
      assumptions: "\u96C6\u603B\u53C2\u6570\u3001\u7406\u60F3 R/L/C\u3001\u57FA\u5C14\u970D\u592B\u5B9A\u5F8B\uFF1B\u975E SPICE \u5206\u5E03\u5BC4\u751F\u4E0E\u5F00\u5173\u77AC\u6001\u5168\u6A21\u578B"
    },
    induction: {
      fidelity: "principle",
      authority: "Griffiths, Introduction to Electrodynamics, Ch. 7\uFF08\u6CD5\u62C9\u7B2C\u5B9A\u5F8B\uFF09",
      assumptions: "\u51C6\u9759\u6001\u3001\u7B80\u5355\u56DE\u8DEF\uFF1B\u975E\u7535\u673A\u6709\u9650\u5143"
    },
    rays: {
      fidelity: "principle",
      authority: "Hecht, Optics, \u8FD1\u8F74\u51E0\u4F55\u5149\u5B66 / \u8584\u900F\u955C\u65B9\u7A0B",
      assumptions: "\u8FD1\u8F74\u3001\u8584\u900F\u955C\u6216\u5355\u7403\u9762\uFF1B\u865A\u50CF\u7528\u865A\u7EBF\uFF1B\u975E Zemax \u7EA7\u50CF\u5DEE\u8BBE\u8BA1"
    },
    gauge: {
      fidelity: "engineering",
      authority: "\u6761\u76EE\u7531\u4E3B\u9898\u6C42\u89E3\u5668\u6309\u540D\u79F0\u79EF\u5206\u6807\u51C6\u5173\u7CFB\uFF1B\u89C1\u6A21\u578B assumptions",
      assumptions: "\u65B9\u7A0B\u4E0E\u8BFB\u6570\u5BF9\u5E94\u8BE5\u6761\u76EE\u516C\u5F0F\uFF0C\u4E0D\u518D\u4F7F\u7528\u65E0\u5173\u6B63\u5F26\u5360\u4F4D"
    },
    variant: {
      fidelity: "principle",
      authority: "\u65CF\xD7\u7EF4\u5EA6\u53D8\u4F53\uFF1A\u65B9\u7A0B\u7EE7\u627F\u6240\u5C5E family \u7684\u6559\u79D1\u4E66\u5F62\u5F0F\uFF0C\u89C1 data/families.json",
      assumptions: "dims \u53EA\u6539\u7CFB\u6570/\u521D\u503C\uFF0C\u4E0D\u6539\u53D8\u65B9\u7A0B\u7ED3\u6784\uFF1B\u8D85\u8303\u56F4\u5373\u5931\u6548"
    },
    bohr: {
      fidelity: "principle",
      authority: "Bransden & Joachain, Physics of Atoms and Molecules, \u73BB\u5C14\u6A21\u578B\u7AE0\u8282\uFF08\u5386\u53F2\u6A21\u578B\uFF09",
      assumptions: "\u73BB\u5C14\u8F68\u9053\u662F\u5386\u53F2\u8FD1\u4F3C\uFF0C\u4E0D\u662F\u73B0\u4EE3\u91CF\u5B50\u5316\u5B66\uFF1B\u7981\u6B62\u5916\u63A8\u5230\u5206\u5B50\u5408\u6210"
    },
    decay: {
      fidelity: "principle",
      authority: "Krane, Introductory Nuclear Physics, \u6307\u6570\u8870\u53D8\u5B9A\u5F8B\u7AE0\u8282",
      assumptions: "\u5E38\u6570\u8870\u53D8\u7387\u3001\u65E0\u94FE\u5F0F\u5DE5\u7A0B\u71C3\u8017\uFF1B\u975E\u53CD\u5E94\u5806\u71C3\u6599\u7BA1\u7406"
    },
    discrete: {
      fidelity: "engineering",
      authority: "Cormen et al., Introduction to Algorithms (CLRS), \u76F8\u5173\u7B97\u6CD5\u7AE0\u8282",
      assumptions: "\u79BB\u6563\u6B65\u9AA4\u4E0E\u4E0D\u53D8\u91CF\u6309\u8BE5\u7B97\u6CD5\u5B9A\u4E49\uFF1B\u53EF\u89C6\u5316\u9AD8\u4EAE\u4E0D\u662F\u590D\u6742\u5EA6\u8BC1\u660E\u672C\u8EAB"
    },
    graph: {
      fidelity: "engineering",
      authority: "CLRS, \u56FE\u7B97\u6CD5\uFF08BFS/Dijkstra/\u677E\u5F1B\uFF09",
      assumptions: "\u6709\u9650\u56FE\u3001\u975E\u8D1F\u6743\uFF08Dijkstra\uFF09\uFF1B\u70B9\u9009\u8FDE\u8FB9\u987B\u4FDD\u6301\u7B97\u6CD5\u4E0D\u53D8\u91CF"
    },
    tree: {
      fidelity: "engineering",
      authority: "CLRS, \u6811\u4E0E\u5206\u6CBB\u7AE0\u8282",
      assumptions: "\u6709\u9650\u6811\uFF1B\u6B65\u8FDB\u9AD8\u4EAE\u5BF9\u5E94\u6807\u51C6\u904D\u5386/\u64CD\u4F5C"
    },
    fsm: {
      fidelity: "principle",
      authority: "Hopcroft, Motwani, Ullman, Introduction to Automata Theory, \u6709\u9650\u81EA\u52A8\u673A",
      assumptions: "\u6709\u9650\u72B6\u6001\u3001\u786E\u5B9A\u6216\u6309\u6A21\u578B\u58F0\u660E\u7684\u4E0D\u786E\u5B9A\u8F6C\u79FB\uFF1B\u975E\u5DE5\u4E1A PLC \u7A0B\u5E8F"
    },
    turing: {
      fidelity: "principle",
      authority: "Sipser, Introduction to the Theory of Computation, \u56FE\u7075\u673A\u7AE0\u8282",
      assumptions: "\u7EB8\u5E26\u793A\u610F\u3001\u6709\u9650\u6B65\u6F14\u793A\uFF1B\u975E\u901A\u7528\u89E3\u91CA\u5668"
    },
    crypto: {
      fidelity: "principle",
      authority: "Katz & Lindell, Introduction to Modern Cryptography, \u5BF9\u5E94\u539F\u8BED\u7AE0\u8282\uFF08\u4EC5\u516C\u5F00\u6559\u5B66\u6B65\u9AA4\uFF09",
      assumptions: "\u6559\u5B66\u6B65\u9AA4\u53EF\u89C6\u5316\uFF1B\u4E0D\u63D0\u4F9B\u653B\u51FB\u5B9E\u73B0\u3001\u5BC6\u94A5\u6062\u590D\u6216\u7ED5\u8FC7"
    },
    ml: {
      fidelity: "principle",
      authority: "Goodfellow, Bengio, Courville, Deep Learning, \u4F18\u5316/\u635F\u5931\u7AE0\u8282\uFF08\u793A\u610F\uFF09",
      assumptions: "\u4F4E\u7EF4\u635F\u5931\u9762\u6216\u5355\u6B65\u66F4\u65B0\u793A\u610F\uFF1B\u975E\u8BAD\u7EC3\u6846\u67B6\u3001\u65E0\u751F\u4EA7\u6570\u636E"
    },
    opt: {
      fidelity: "principle",
      authority: "Nocedal & Wright, Numerical Optimization, \u4E00\u9636\u65B9\u6CD5\u7AE0\u8282",
      assumptions: "\u4F4E\u7EF4\u76EE\u6807\u793A\u610F\uFF1B\u975E\u5DE5\u4E1A\u6C42\u89E3\u5668\u6536\u655B\u4FDD\u8BC1"
    },
    logic: {
      fidelity: "engineering",
      authority: "Mano, Digital Design, \u7EC4\u5408\u903B\u8F91\u95E8\u4E0E\u771F\u503C\u8868",
      assumptions: "\u7406\u60F3\u95E8\u3001\u96F6\u5EF6\u8FDF\u6216\u6309\u6A21\u578B\u58F0\u660E\u7684\u5355\u4F4D\u5EF6\u8FDF\uFF1B\u975E VLSI \u65F6\u5E8F\u7B7E\u6838"
    },
    arch: {
      fidelity: "principle",
      authority: "Hennessy & Patterson, Computer Organization and Design, \u6D41\u6C34\u7EBF/\u7F13\u5B58\u7AE0\u8282",
      assumptions: "\u7ECF\u5178\u4E94\u7EA7\u6216 LRU \u6559\u5B66\u6A21\u578B\uFF1B\u975E\u5177\u4F53 CPU \u5FAE\u67B6\u6784"
    },
    embed: {
      fidelity: "principle",
      authority: "Lee & Seshia, Introduction to Embedded Systems, \u65F6\u5E8F\u4E0E\u91C7\u6837\u793A\u610F",
      assumptions: "\u903B\u8F91\u65F6\u5E8F\u793A\u610F\uFF1B\u975E\u76EE\u6807\u677F BSP"
    },
    comm: {
      fidelity: "principle",
      authority: "Proakis & Salehi, Fundamentals of Communication Systems, \u8C03\u5236\u7AE0\u8282",
      assumptions: "\u57FA\u5E26/\u7406\u60F3\u4FE1\u9053\u793A\u610F\uFF1B\u975E\u94FE\u8DEF\u9884\u7B97\u8F6F\u4EF6"
    },
    net: {
      fidelity: "principle",
      authority: "Kurose & Ross, Computer Networking, \u5BF9\u5E94\u534F\u8BAE\u7AE0\u8282",
      assumptions: "\u534F\u8BAE\u6B65\u8FDB\u793A\u610F\uFF1B\u975E\u6570\u636E\u5305\u6355\u83B7\u6216\u653B\u51FB"
    },
    os: {
      fidelity: "principle",
      authority: "Silberschatz, Operating System Concepts, \u8C03\u5EA6/\u540C\u6B65\u7AE0\u8282",
      assumptions: "\u7406\u60F3\u961F\u5217\u4E0E\u65F6\u95F4\u7247\uFF1B\u975E\u5185\u6838\u6E90\u7801\u884C\u4E3A"
    },
    compile: {
      fidelity: "principle",
      authority: "Aho et al., Compilers (Dragon Book), \u7BA1\u7EBF\u9636\u6BB5\u6982\u8FF0",
      assumptions: "\u9636\u6BB5\u9AD8\u4EAE\u793A\u610F\uFF1B\u975E\u5B8C\u6574\u7F16\u8BD1\u5668"
    },
    dist: {
      fidelity: "principle",
      authority: "Tanenbaum & van Steen, Distributed Systems, \u5171\u8BC6\u7AE0\u8282\uFF08\u6559\u5B66\u72B6\u6001\u673A\uFF09",
      assumptions: "\u7B80\u5316\u6D88\u606F\u6A21\u578B\uFF1B\u975E\u751F\u4EA7\u5171\u8BC6\u5B9E\u73B0"
    },
    struct: {
      fidelity: "engineering",
      authority: "Hibbeler, Structural Analysis / Mechanics of Materials, \u6881\u5185\u529B\u4E0E\u5F2F\u66F2\u7AE0\u8282",
      assumptions: "\u6B27\u62C9-\u4F2F\u52AA\u5229\u3001\u9759\u5B9A\u3001\u5C0F\u53D8\u5F62\uFF1B\u975E\u6709\u9650\u5143\u3001\u975E\u5851\u6027"
    },
    control: {
      fidelity: "engineering",
      authority: "Ogata, Modern Control Engineering\uFF1B\xC5str\xF6m & Murray, Feedback Systems\uFF08PID/\u6839\u8F68\u8FF9\uFF09",
      assumptions: "\u7EBF\u6027\u65F6\u4E0D\u53D8\u6216\u6807\u51C6 PID\uFF1B\u975E\u5DE5\u4E1A DCS \u6574\u5B9A\u8F6F\u4EF6\u3001\u65E0\u6267\u884C\u5668\u9971\u548C\u5168\u6A21\u578B\u9664\u975E schema \u58F0\u660E"
    },
    chaos: {
      fidelity: "principle",
      authority: "Strogatz, Nonlinear Dynamics and Chaos, \u5BF9\u5E94\u6807\u51C6\u65B9\u7A0B\uFF08Lorenz \u7B49\uFF09",
      assumptions: "\u5E38\u5FAE\u5206\u65B9\u7A0B\u6570\u503C\u793A\u610F\uFF1B\u53C2\u6570\u5373\u6587\u732E\u6807\u51C6\u5F62\uFF0C\u4E0D\u5916\u63A8\u4E3A\u5DE5\u7A0B\u9884\u62A5"
    },
    traffic: {
      fidelity: "principle",
      authority: "Nagel & Schreckenberg, J. Phys. I France 2, 2221 (1992)\uFF08NaSch \u5143\u80DE\u81EA\u52A8\u673A\uFF09",
      assumptions: "\u5355\u8F66\u9053\u5143\u80DE\u89C4\u5219\uFF1B\u975E\u4EA4\u901A\u89C4\u5212\u5B8F\u89C2\u6A21\u578B"
    },
    reactor: {
      fidelity: "principle",
      authority: "Lamarsh & Baratta, Introduction to Nuclear Engineering, \u70B9\u5806\u52A8\u529B\u5B66\u7AE0\u8282\uFF08\u516C\u5F00\u6559\u79D1\u4E66\uFF09",
      assumptions: "\u70B9\u5806\u3001\u5355\u7EC4\u7F13\u53D1\u793A\u610F\uFF1B\u975E\u5806\u82AF\u8BBE\u8BA1\u3001\u975E\u71C3\u6599\u5FAA\u73AF\u3001\u65E0\u589E\u5F3A\u8DEF\u5F84"
    },
    aero: {
      fidelity: "principle",
      authority: "Anderson, Fundamentals of Aerodynamics\uFF1BEtkin, Dynamics of Flight\uFF08\u7EBF\u6027\u5316\u6A21\u6001\uFF09",
      assumptions: "\u5C0F\u6270\u52A8\u6216\u8584\u7FFC\u793A\u610F\uFF1B\u975E CFD\u3001\u975E\u98DE\u63A7\u9002\u822A\u6A21\u578B"
    },
    hand: {
      fidelity: "principle",
      authority: "\u624B\u5199\u7CBE\u8C03\uFF1A\u4EE5\u8BE5\u6761\u76EE authority \u8986\u76D6\u4E3A\u51C6",
      assumptions: "\u89C1\u6761\u76EE assumptions\uFF1B\u672A\u8986\u76D6\u524D\u4E0D\u5F97\u6807\u5DE5\u7A0B\u7CBE\u5EA6"
    }
  },
  ids: {
    "free-fall": {
      fidelity: "engineering",
      authority: "Halliday, Resnick, Walker, Fundamentals of Physics, \u76F4\u7EBF\u8FD0\u52A8\uFF1B\u7EBF\u6027\u963B\u529B\u89C1 Thornton & Marion \xA72.4",
      assumptions: "\u7AD6\u76F4\u4E00\u7EF4\u3001\u5E38 g\u3001\u7EBF\u6027\u963B\u529B F=\u2212kv\uFF1B\u4E0D\u8BA1\u6D6E\u529B\u4E0E\u4E8C\u6B21\u963B\u529B"
    },
    projectile: {
      fidelity: "engineering",
      authority: "Halliday, Resnick, Walker, Fundamentals of Physics, \u629B\u4F53\u8FD0\u52A8",
      assumptions: "\u5300 g\u3001\u65E0\u7A7A\u6C14\u963B\u529B\uFF08\u516C\u5F0F\u5C42\uFF09\uFF1B\u5E73\u9762\u8FD0\u52A8\uFF1B\u843D\u5730\u505C\u6B62\u6309\u6A21\u578B\u9009\u9879"
    },
    "inclined-plane": {
      fidelity: "engineering",
      authority: "Hibbeler, Engineering Mechanics: Dynamics, \u659C\u9762\u4E0E\u5E93\u4ED1\u6469\u64E6",
      assumptions: "\u521A\u6027\u659C\u9762\u3001\u5E93\u4ED1\u6469\u64E6\u3001\u8D28\u70B9\uFF1Ba=g(sin\u03B8\u2212\u03BCcos\u03B8) \u5728\u4E0B\u6ED1\u65B9\u5411"
    },
    spring: {
      fidelity: "engineering",
      authority: "Thornton & Marion, Classical Dynamics, \xA73.4\u20133.5\uFF08\u963B\u5C3C\u8C10\u632F\u5B50\uFF09",
      assumptions: "\u80E1\u514B\u5B9A\u5F8B\u3001\u7C98\u6EDE\u963B\u5C3C\u3001\u4E00\u7EF4\uFF1B\u5FFD\u7565\u5E72\u6469\u64E6\u4E0E\u5927\u53D8\u5F62"
    },
    pendulum: {
      fidelity: "engineering",
      authority: "Thornton & Marion, Classical Dynamics, \xA74.2\uFF08\u5355\u6446\uFF0C\u542B\u5927\u89D2 sin\u03B8\uFF09",
      assumptions: "\u521A\u6027\u8F7B\u6746\u3001\u5E73\u9762\u3001\u96C6\u603B\u8D28\u70B9\uFF1B\u963B\u5C3C\u4E3A\u7C98\u6EDE\u9879\uFF1B\u975E\u5C0F\u89D2\u7EBF\u6027\u5316\u9664\u975E\u53C2\u6570\u8FDB\u5165\u5C0F\u89D2\u533A"
    },
    collision: {
      fidelity: "engineering",
      authority: "Hibbeler, Engineering Mechanics: Dynamics, \u5BF9\u5FC3\u78B0\u649E\u4E0E\u6062\u590D\u7CFB\u6570",
      assumptions: "\u4E00\u7EF4\u5BF9\u5FC3\u3001\u78B0\u649E\u77AC\u95F4\u5916\u529B\u51B2\u91CF\u53EF\u5FFD\u7565\uFF1Be\u2208[0,1]"
    },
    "collision-2d": {
      fidelity: "engineering",
      authority: "Hibbeler, Engineering Mechanics: Dynamics, \u659C\u78B0\u4E0E\u51B2\u91CF",
      assumptions: "\u521A\u4F53\u5706\u3001\u63A5\u89E6\u6CD5\u5411\u51B2\u91CF + \u6062\u590D\u7CFB\u6570\uFF1B\u6469\u64E6\u6309\u6A21\u578B\u58F0\u660E"
    },
    "double-pendulum": {
      fidelity: "engineering",
      authority: "Goldstein, Classical Mechanics, \u62C9\u683C\u6717\u65E5\u65B9\u7A0B\u5E94\u7528\u4E8E\u53CC\u6446",
      assumptions: "\u5E73\u9762\u3001\u8F7B\u6746\u3001\u96C6\u603B\u8D28\u91CF\uFF1B\u6DF7\u6C8C\u5BF9\u521D\u503C\u654F\u611F\uFF0C\u4E0D\u4F5C\u957F\u671F\u5DE5\u7A0B\u9884\u62A5"
    },
    wave: {
      fidelity: "engineering",
      authority: "Pain, The Physics of Vibrations and Waves, \u4E00\u7EF4\u6CE2\u52A8\u65B9\u7A0B",
      assumptions: "\u5747\u5300\u5F26\u6216\u4ECB\u8D28\u3001\u5E38\u6CE2\u901F\u3001\u4E24\u7AEF\u8FB9\u754C\u6309\u5B9E\u73B0\uFF1B\u6709\u9650\u5DEE\u5206"
    },
    heat: {
      fidelity: "engineering",
      authority: "Incropera, Fundamentals of Heat and Mass Transfer, \u4E00\u7EF4\u77AC\u6001\u5BFC\u70ED",
      assumptions: "\u5E38\u7269\u6027\u3001\u4E00\u7EF4\u3001\u65E0\u5185\u70ED\u6E90\uFF08\u9664\u975E\u53C2\u6570\u58F0\u660E\uFF09\uFF1B\u663E\u5F0F\u5DEE\u5206\u53D7\u7A33\u5B9A\u6027\u9650\u5236"
    },
    lorentz: {
      fidelity: "engineering",
      authority: "Griffiths, Introduction to Electrodynamics, Ch. 5\uFF08\u6D1B\u4F26\u5179\u529B\uFF09",
      assumptions: "\u70B9\u7535\u8377\u3001\u7ED9\u5B9A\u5747\u5300\u573A\uFF1B\u5FFD\u7565\u8F90\u5C04\u963B\u5C3C"
    },
    orbit: {
      fidelity: "engineering",
      authority: "Murray & Dermott, Solar System Dynamics, Ch. 2\uFF1B\u6216 Goldstein \u6709\u5FC3\u52BF",
      assumptions: "\u4E8C\u4F53\u3001\u725B\u987F\u5F15\u529B\u3001\u70B9\u8D28\u91CF\uFF1B\u975E\u661F\u5386\u3001\u975E\u7B2C\u4E09\u4F53"
    },
    "rc-circuit": {
      fidelity: "engineering",
      authority: "Nilsson & Riedel, Electric Circuits, \u4E00\u9636 RC",
      assumptions: "\u96C6\u603B\u3001\u7406\u60F3\u6E90\u3001\u5E38 R/C\uFF1B\u03C4=RC"
    },
    rlc: {
      fidelity: "engineering",
      authority: "Nilsson & Riedel, Electric Circuits, \u4E32\u8054 RLC",
      assumptions: "\u96C6\u603B\u4E32\u8054\u3001\u5E38\u7CFB\u6570\uFF1BL I''+R I'+I/C=0"
    },
    "beam-sfd-bmd": {
      fidelity: "engineering",
      authority: "Hibbeler, Structural Analysis, \u6881\u7684\u526A\u529B\u4E0E\u5F2F\u77E9\uFF08\u03A3V=0, \u03A3M=0\uFF09",
      assumptions: "\u9759\u5B9A\u3001\u6B27\u62C9-\u4F2F\u52AA\u5229\u3001\u5C0F\u53D8\u5F62\uFF1B\u975E\u6709\u9650\u5143"
    },
    "pid-tune": {
      fidelity: "engineering",
      authority: "\xC5str\xF6m & Murray, Feedback Systems, Ch. 10\uFF1BOgata, Modern Control Engineering, PID",
      assumptions: "\u7EBF\u6027\u88AB\u63A7\u5BF9\u8C61 + \u7406\u60F3 PID u=Kp e+Ki\u222Be+Kd \u0117\uFF1B\u65E0\u5DE5\u4E1A\u6267\u884C\u5668\u8BA4\u8BC1"
    },
    "hodgkin-huxley": {
      fidelity: "engineering",
      authority: "Hodgkin & Huxley, J. Physiol. 117:500\u2013544 (1952), DOI:10.1113/jphysiol.1952.sp004764",
      assumptions: "\u7A7A\u95F4\u94B3\u4F4D\u3001\u67AA\u4E4C\u8D3C\u5DE8\u8F74\u7A81\u7535\u5BFC\u6A21\u578B\uFF1B\u4EC5\u516C\u5F00\u751F\u7406\u65B9\u7A0B\uFF0C\u65E0\u589E\u5F3A\u6216\u4E34\u5E8A\u7ED9\u836F\u8DEF\u5F84"
    },
    sorting: {
      fidelity: "engineering",
      authority: "CLRS, \u6392\u5E8F\uFF08\u63D2\u5165/\u5192\u6CE1/\u5FEB\u6392\uFF09",
      assumptions: "\u6BD4\u8F83\u6392\u5E8F\u7684\u6807\u51C6\u5FAA\u73AF\u4E0D\u53D8\u91CF\uFF1B\u6F14\u793A\u6B65\u4E0D\u7B49\u4E8E\u590D\u6742\u5EA6\u8BC1\u660E"
    },
    "bfs-grid": {
      fidelity: "engineering",
      authority: "CLRS, BFS/DFS",
      assumptions: "\u65E0\u6743\u7F51\u683C\u3001\u56DB\u90BB\u57DF\u6216\u6309\u5B9E\u73B0\uFF1B\u5899\u683C\u4E0D\u53EF\u901A"
    },
    dijkstra: {
      fidelity: "engineering",
      authority: "CLRS, Dijkstra\uFF08\u975E\u8D1F\u6743\uFF09",
      assumptions: "\u8FB9\u6743\u975E\u8D1F\uFF1B\u8D1F\u6743\u5219\u7B97\u6CD5\u4E0D\u9002\u7528"
    },
    "logic-gates": {
      fidelity: "engineering",
      authority: "Mano, Digital Design, \u57FA\u672C\u95E8\u4E0E\u771F\u503C\u8868",
      assumptions: "\u7406\u60F3\u5E03\u5C14\u95E8\uFF1B\u8FDE\u7EBF\u4E3A\u7F51\u8868\u793A\u610F"
    },
    life: {
      fidelity: "principle",
      authority: "Gardner / Berlekamp, Conway, Guy, Winning Ways\uFF08Life, B3/S23\uFF09",
      assumptions: "\u65E0\u9650\u6216\u73AF\u5F62\u7F51\u683C\u6309\u5B9E\u73B0\uFF1B\u5143\u80DE\u89C4\u5219\u4E0D\u662F\u751F\u7269\u6A21\u578B"
    },
    pipeline: {
      fidelity: "principle",
      authority: "Hennessy & Patterson, Computer Organization and Design, \u7ECF\u5178\u4E94\u7EA7\u6D41\u6C34\u7EBF",
      assumptions: "\u7406\u60F3\u8282\u62CD\u3001\u5192\u9669\u6309\u6A21\u578B\u58F0\u660E\uFF1B\u975E\u5177\u4F53 ISA"
    },
    "cache-lru": {
      fidelity: "engineering",
      authority: "Hennessy & Patterson, Computer Organization and Design, \u7F13\u5B58\u4E0E LRU",
      assumptions: "\u5168\u76F8\u8054\u6216\u6309\u6A21\u578B\u58F0\u660E\u7684\u7EC4\u76F8\u8054\uFF1B\u7406\u60F3\u547D\u4E2D\u65F6\u95F4"
    },
    fifo: {
      fidelity: "engineering",
      authority: "Silberschatz, Operating System Concepts, \u6709\u754C\u7F13\u51B2",
      assumptions: "\u4E92\u65A5\u4E0E\u7A7A/\u6EE1\u6761\u4EF6\u6309\u7ECF\u5178\u95EE\u9898\uFF1B\u975E\u771F\u5B9E\u5185\u6838"
    }
  }
};

// js/lab/userModels.js
var STORAGE_KEY = "immspfee-user-models-v1";
var DEPRECATED_FAMILIES = new Set(Object.keys(authority_templates_default.deprecatedFamilies || {}));
var USER_MODEL_FAMILIES = Object.keys(FAMILY_META).filter(
  (k) => !["variant", "hand"].includes(k) && !DEPRECATED_FAMILIES.has(k)
);
function loadUserSpecs() {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function saveUserSpecs(list) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function validateUserModelDraft(draft, opts = {}) {
  const name = String(draft.name || "").trim();
  const domain = String(draft.domain || "").trim();
  const sub = String(draft.sub || "").trim();
  const family = String(draft.family || "").trim();
  const formula = String(draft.formula || "").trim();
  const authority = String(draft.authority || "").trim();
  const assumptions = String(draft.assumptions || "").trim();
  const description = String(draft.description || "").trim();
  const fidelity = draft.fidelity === "principle" ? "principle" : "engineering";
  const ethicsOk = !!draft.ethicsOk;
  const fail = (msg) => {
    const miss = topicMissNote(formula);
    return { ok: false, error: miss ? `${msg}\uFF1B${miss}` : msg };
  };
  if (!name || name.length < 2) return fail(t("dialog.errNameShort"));
  if (!domain) return fail(t("dialog.errDomain"));
  if (!sub) return fail(t("dialog.errSub"));
  if (!USER_MODEL_FAMILIES.includes(family)) {
    return fail(t("dialog.errFamily", { family }));
  }
  if (formula.length < 3) return fail(t("dialog.errFormulaShort"));
  if (authority.length < 8) {
    return fail(t("dialog.errAuthorityShort"));
  }
  if (assumptions.length < 12) {
    return fail(t("dialog.errAssumptionsShort"));
  }
  if (!/(忽略|适用|范围|不是|线性|小角|集总|limit|neglect|assume|valid)/i.test(assumptions)) {
    return fail(t("dialog.errAssumptionsScope"));
  }
  if (description.length < 12) {
    return fail(t("dialog.errDescription"));
  }
  if (!ethicsOk) {
    return fail(t("dialog.errEthics"));
  }
  const toy = /好玩|动画|随便|demo only|just for fun/i;
  if (toy.test(`${name} ${description}`)) {
    return fail(t("dialog.errToy"));
  }
  const keepId = typeof opts.keepId === "string" && opts.keepId.startsWith("user-") ? opts.keepId : "";
  const id = keepId || `user-${family}-${slug(name)}-${Date.now().toString(36)}`;
  const spec = {
    id,
    name,
    domain,
    sub,
    family,
    formula,
    description,
    fidelity,
    authority,
    assumptions,
    userBuilt: true,
    tags: [domain, sub, "\u81EA\u5EFA"],
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return { ok: true, spec };
}
function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-").replace(/^-|-$/g, "").slice(0, 32) || "model";
}
function persistUserSpec(spec) {
  const list = loadUserSpecs().filter((s) => s.id !== spec.id);
  list.unshift(spec);
  saveUserSpecs(list);
  return list;
}
function deleteUserSpec(id) {
  const list = loadUserSpecs().filter((s) => s.id !== id);
  saveUserSpecs(list);
  return list;
}
function exportUserSpecsJson() {
  return `${JSON.stringify({ kind: "immspfee-user-models", version: 1, models: loadUserSpecs() }, null, 2)}
`;
}
function parseUserSpecsImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "JSON \u65E0\u6CD5\u89E3\u6790" };
  }
  const raw = Array.isArray(data) ? data : data?.models;
  if (!Array.isArray(raw)) return { ok: false, error: "\u987B\u4E3A\u6A21\u578B\u6570\u7EC4\u6216 { models: [] }" };
  const specs = [];
  const rejected = [];
  for (const row of raw) {
    const checked = validateUserModelDraft(
      { ...row, ethicsOk: true },
      { keepId: row?.id }
    );
    if (!checked.ok) {
      rejected.push({ error: `${row?.name || row?.id || "?"}: ${checked.error}` });
      continue;
    }
    specs.push({ ...checked.spec, id: checked.spec.id, createdAt: row.createdAt || checked.spec.createdAt });
  }
  if (!specs.length) return { ok: false, error: rejected[0]?.error || "\u6CA1\u6709\u53EF\u5BFC\u5165\u7684\u6761\u76EE" };
  return { ok: true, specs, rejected };
}
function mergeImportedSpecs(specs) {
  const byId3 = new Map(loadUserSpecs().map((s) => [s.id, s]));
  for (const s of specs) byId3.set(s.id, s);
  const list = [...byId3.values()];
  saveUserSpecs(list);
  return list;
}
function buildUserModel(spec) {
  const model = factoryBuilder()({
    ...spec,
    description: [
      spec.description,
      spec.authority ? `\u6743\u5A01\uFF1A${spec.authority}` : "",
      spec.assumptions ? `\u5047\u8BBE\uFF1A${spec.assumptions}` : ""
    ].filter(Boolean).join(" \xB7 ")
  });
  model.userBuilt = true;
  model.authority = spec.authority;
  model.assumptions = spec.assumptions;
  model.fidelity = spec.fidelity || model.fidelity || "engineering";
  if (!model.tags?.includes("\u81EA\u5EFA")) {
    model.tags = [...model.tags || [], "\u81EA\u5EFA"];
  }
  const nParams = Object.keys(model.paramSchema || {}).length;
  if (nParams < 4) {
    console.warn(`[user-model] ${spec.id} paramSchema \u4EC5 ${nParams} \u9879\uFF0C\u4F4E\u4E8E\u5DE5\u4E1A\u7EA7\u95E8\u69DB`);
  }
  return model;
}
function buildAllUserModels() {
  return loadUserSpecs().map(buildUserModel);
}

// js/models/assemble.js
var handcrafted = [
  freeFall_default,
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
var byId = Object.fromEntries(handcrafted.map((m) => [m.id, m]));
function ensureRefresh(model) {
  localizeModel(model);
  if (!model.formalism && !model.capabilities?.formalism && HAND_FORMALISM[model.id]) {
    model.formalism = HAND_FORMALISM[model.id];
    model.capabilities = { ...model.capabilities || {}, formalism: model.formalism };
  }
  if (typeof model.getEnergyAt !== "function" && typeof model.getEnergy === "function") {
    model.getEnergyAt = function getEnergyAt(state, row) {
      if (!row || typeof row !== "object") return this.getEnergy(state);
      const probe = { params: state.params };
      for (const [k, v] of Object.entries(state)) {
        if (k === "params" || k === "trail" || k === "trails" || k.startsWith("_")) continue;
        probe[k] = v;
      }
      for (const [k, v] of Object.entries(row)) {
        if (k.startsWith("E_") || k === "note") continue;
        if (typeof v === "number" && Number.isFinite(v)) probe[k] = v;
      }
      return this.getEnergy(probe);
    };
  }
  if (typeof model.refresh !== "function") {
    model.refresh = function refresh(state) {
      if (typeof this.recompute === "function") this.recompute(state);
      else if (typeof this.step === "function") this.step(state, 0);
    };
  }
  applyLowInkStrokeBoost(model);
  return model;
}
function applyCatalogPolicy(model, spec) {
  if (!spec) return model;
  if (model.topicBound) {
    model.family = spec.family || model.family;
    model.deprecated = false;
    model.deprecatedReason = "";
    if (model.capabilities && model.fidelity) {
      model.capabilities = { ...model.capabilities, fidelity: model.fidelity };
    }
    return model;
  }
  if (spec.family) model.family = spec.family;
  if (spec.authority) model.authority = spec.authority;
  if (spec.assumptions) model.assumptions = spec.assumptions;
  if (spec.fidelity) {
    model.fidelity = spec.fidelity;
    if (model.capabilities) model.capabilities = { ...model.capabilities, fidelity: spec.fidelity };
  }
  if (spec.deprecated) {
    model.deprecated = true;
    model.deprecatedReason = spec.deprecatedReason || "";
  }
  const dispatchKey = String(spec.formula || "").includes("\xB7");
  if (!dispatchKey || !model.formula) model.formula = spec.formula || model.formula || "";
  return model;
}
function buildFromSpecs(specs, options = {}) {
  const leftovers = options.leftovers !== false;
  const users = options.users !== false;
  const list = [];
  const seen = /* @__PURE__ */ new Set();
  for (const spec of specs) {
    if (!spec || seen.has(spec.id)) continue;
    seen.add(spec.id);
    if (spec.family === "hand" && byId[spec.id]) {
      list.push(ensureRefresh(applyCatalogPolicy({
        ...byId[spec.id],
        name: spec.name || byId[spec.id].name,
        tags: [spec.domain, spec.sub].filter(Boolean),
        formula: spec.formula || byId[spec.id].formula || "",
        description: spec.description || byId[spec.id].description || "",
        sub: spec.sub || ""
      }, spec)));
    } else if (byId[spec.id]) {
      list.push(ensureRefresh(applyCatalogPolicy({
        ...byId[spec.id],
        name: spec.name || byId[spec.id].name,
        tags: [spec.domain, spec.sub].filter(Boolean),
        formula: String(spec.formula || "").includes("\xB7") && byId[spec.id].formula ? byId[spec.id].formula : spec.formula || byId[spec.id].formula || "",
        description: spec.description || "",
        sub: spec.sub || ""
      }, spec)));
    } else {
      list.push(ensureRefresh(applyCatalogPolicy(factoryBuilder()(spec), spec)));
    }
  }
  if (leftovers) {
    for (const impl of handcrafted) {
      if (seen.has(impl.id)) continue;
      seen.add(impl.id);
      list.push(ensureRefresh({
        ...impl,
        tags: impl.tags || [],
        formula: impl.formula || "",
        description: impl.description || "",
        sub: ""
      }));
    }
  }
  if (users) {
    for (const um of buildAllUserModels()) {
      if (seen.has(um.id)) continue;
      seen.add(um.id);
      list.push(ensureRefresh(um));
    }
  }
  return list;
}
function handcraftedList() {
  return handcrafted;
}

// js/boot/catalogStamp.js
var stampPromise = null;
function loadAssetStamp() {
  if (!stampPromise) {
    const href = typeof document !== "undefined" ? new URL("asset-stamp.json", document.baseURI).href : new URL("../../asset-stamp.json", import.meta.url).href;
    stampPromise = fetch(href, { cache: "no-store" }).then((res) => res.ok ? res.json() : {}).catch(() => ({}));
  }
  return stampPromise;
}
function withStamp(path, version) {
  if (!version) return path;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}v=${encodeURIComponent(version)}`;
}
function domainIndexUrl(stamp) {
  return withStamp("./data/domain-index.json", stamp?.domainIndex);
}
function domainChunkUrl(domain, stamp) {
  const file = `./data/domains/${encodeURIComponent(domain)}.json`;
  return withStamp(file, stamp?.domains?.[domain]);
}

// js/models/browser.js
var models = [];
var domainIndex = [];
var loaded = /* @__PURE__ */ new Set();
var inflight = /* @__PURE__ */ new Map();
var specCache = /* @__PURE__ */ new Map();
var indexPromise = null;
function endpoint(path) {
  return new URL(path, document.baseURI).href;
}
function mark(name) {
  try {
    performance.mark(name);
  } catch {
  }
}
function loadIndex() {
  if (domainIndex.length) return Promise.resolve(domainIndex);
  if (!indexPromise) {
    mark("boot-loadIndex-start");
    indexPromise = Promise.resolve(window.__preloadedIndex || null).then(async (preloaded) => {
      if (Array.isArray(preloaded) && preloaded.length) return preloaded;
      const stamp = await loadAssetStamp();
      const res = await fetch(endpoint(domainIndexUrl(stamp)));
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    }).then((rows) => {
      domainIndex.push(...rows);
      mark("boot-loadIndex-end");
      return domainIndex;
    });
  }
  return indexPromise;
}
async function appendUsers() {
  if (!loadUserSpecs().length) return;
  await ensureFactory();
  const seen = new Set(models.map((m) => m.id));
  for (const um of buildAllUserModels()) {
    if (seen.has(um.id)) continue;
    models.push(ensureRefresh(um));
  }
}
function appendOrphans() {
  const known = new Set(domainIndex.map((row) => row.id));
  const seen = new Set(models.map((m) => m.id));
  for (const impl of handcraftedList()) {
    if (known.has(impl.id) || seen.has(impl.id)) continue;
    models.push(ensureRefresh({
      ...impl,
      tags: impl.tags || [],
      formula: impl.formula || "",
      description: impl.description || "",
      sub: ""
    }));
  }
}
async function mergeSpecs(domain, specs) {
  await ensureFactory();
  specCache.set(domain, specs);
  const seen = new Set(models.map((m) => m.id));
  for (const model of buildFromSpecs(specs, { leftovers: false, users: false })) {
    if (seen.has(model.id)) continue;
    seen.add(model.id);
    models.push(model);
  }
  appendOrphans();
  await appendUsers();
}
function loadDomain(domain) {
  if (!domain) return Promise.resolve(models);
  if (loaded.has(domain)) return Promise.resolve(models);
  if (inflight.has(domain)) return inflight.get(domain);
  const task = Promise.resolve().then(async () => {
    const warm = window.__preloadedDomain;
    if (warm && warm.domain === domain && warm.promise) {
      const specs = await warm.promise;
      if (Array.isArray(specs)) return specs;
    }
    const stamp = await loadAssetStamp();
    const res = await fetch(endpoint(domainChunkUrl(domain, stamp)));
    if (!res.ok) throw new Error(`${domain} ${res.status}`);
    return res.json();
  }).then(async (specs) => {
    loaded.add(domain);
    await mergeSpecs(domain, specs);
    inflight.delete(domain);
    return models;
  }).catch((err) => {
    inflight.delete(domain);
    throw err;
  });
  inflight.set(domain, task);
  return task;
}
async function primeHandModel(id) {
  const impl = handcraftedList().find((model) => model.id === id);
  if (!impl) return false;
  if (!models.some((model) => model.id === id)) {
    models.push(ensureRefresh({
      ...impl,
      tags: impl.tags || [],
      formula: impl.formula || "",
      description: impl.description || "",
      sub: impl.sub || ""
    }));
  }
  await appendUsers();
  return true;
}
async function ensureId(id) {
  mark("boot-ensureId-start");
  const index = await loadIndex();
  const row = index.find((entry) => entry.id === id);
  if (!row) {
    mark("boot-ensureId-end");
    return false;
  }
  mark("boot-loadDomain-start");
  await loadDomain(row.domain || "\u5176\u4ED6");
  mark("boot-loadDomain-end");
  mark("boot-ensureId-end");
  return models.some((m) => m.id === id);
}
function getModelById(id) {
  return models.find((m) => m.id === id) || null;
}
function getAllTags() {
  const set = /* @__PURE__ */ new Set();
  for (const row of domainIndex) {
    if (row.domain) set.add(row.domain);
    if (row.sub) set.add(row.sub);
  }
  for (const m of models) {
    for (const t2 of m.tags || []) set.add(t2);
    if (m.sub) set.add(m.sub);
  }
  return [...set].sort();
}
async function rebuildModels() {
  if (specCache.size || loadUserSpecs().length) await ensureFactory();
  const seen = /* @__PURE__ */ new Set();
  const next = [];
  for (const specs of specCache.values()) {
    for (const model of buildFromSpecs(specs, { leftovers: false, users: false })) {
      if (seen.has(model.id)) continue;
      seen.add(model.id);
      next.push(model);
    }
  }
  models.length = 0;
  models.push(...next);
  appendOrphans();
  await appendUsers();
  return models;
}

// js/utils/canvas.js
function resizeCanvas(canvas2, container, opts = {}) {
  const capRaw = typeof document !== "undefined" ? Number(document.documentElement?.dataset?.dprCap) : NaN;
  const cap = Number.isFinite(capRaw) && capRaw > 0 ? capRaw : 2.5;
  const dpr = opts.forceDpr || Math.max(1, Math.min(window.devicePixelRatio || 1, cap));
  const rect = container.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  const bw = Math.floor(width * dpr);
  const bh = Math.floor(height * dpr);
  if (canvas2.width !== bw || canvas2.height !== bh) {
    canvas2.width = bw;
    canvas2.height = bh;
    canvas2.style.width = `${width}px`;
    canvas2.style.height = `${height}px`;
  }
  const ctx = canvas2.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height, dpr, ctx };
}

// js/utils/export.js
function downloadCanvasPng(canvas2, filename = "physics-lab.png", opts = {}) {
  const framed = !!opts.framed;
  const readouts = opts.readouts || null;
  const legend = !!opts.legend;
  const modelId = opts.modelId || getActiveModelId();
  const source = framed || readouts || legend ? composeExport(canvas2, { framed, readouts, legend, modelId }) : canvas2;
  source.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
function composeExport(canvas2, {
  framed = false,
  readouts = null,
  legend = false,
  modelId = getActiveModelId()
} = {}) {
  const pad = framed ? 28 : 12;
  const readoutH = readouts?.length ? 28 + readouts.length * 22 : 0;
  const legendH = legend ? 22 + 5 * 16 : framed && !readouts?.length ? 36 : 0;
  const footer = readoutH + legendH;
  const w = canvas2.width + pad * 2;
  const h = canvas2.height + pad * 2 + footer;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  ctx.fillStyle = framed ? "#f2f2f2" : "#000";
  if (framed) {
    roundRect(ctx, 0, 0, w, h, 18);
    ctx.fill();
    ctx.fillStyle = "#000";
    roundRect(ctx, pad - 4, pad - 4, canvas2.width + 8, canvas2.height + 8, 10);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(canvas2, pad, pad);
  let y = pad + canvas2.height + 18;
  ctx.fillStyle = framed ? "#000" : "#fff";
  ctx.font = '500 16px "IBM Plex Mono", monospace';
  if (framed && !readouts?.length && !legend) {
    ctx.fillText("Lab", pad, h - 12);
  }
  if (readouts?.length) {
    ctx.font = '500 15px "IBM Plex Mono", monospace';
    for (const r of readouts) {
      ctx.fillText(`${r.label}: ${r.value}`, pad, y);
      y += 22;
    }
  }
  if (legend) {
    if (framed) ctx.fillStyle = "#333";
    drawPaletteLegend(ctx, pad, y, canvas2.width * 0.55, modelId);
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
function downloadCsv(rows, filename = "trajectory.csv") {
  if (!rows || !rows.length) return;
  const keys = Object.keys(rows[0]);
  const lines = [keys.join(",")];
  for (const row of rows) {
    lines.push(keys.map((k) => {
      const v = row[k];
      return typeof v === "number" && Number.isFinite(v) ? String(v) : `"${String(v ?? "")}"`;
    }).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// js/ui/icons.js
var attrs = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"';
var ICO = {
  pause: `<svg ${attrs} fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.2"/><rect x="14" y="4" width="5" height="16" rx="1.2"/></svg>`,
  play: `<svg ${attrs} fill="currentColor"><path d="M7.5 4.2v15.6L19.5 12 7.5 4.2z"/></svg>`,
  reset: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 12a7.8 7.8 0 1 0 2.2-5.4"/><path d="M4.2 3.8v4.5H8.8"/></svg>`,
  cam: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6.5" width="15" height="11.5" rx="2"/><path d="M17.5 10.2l4 2.3-4 2.3V10.2z" fill="currentColor" stroke="none"/><circle cx="10" cy="12.2" r="3" fill="none"/><circle cx="10" cy="12.2" r="1.15" fill="currentColor" stroke="none"/></svg>`,
  csv: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3.5" width="16" height="17" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/><path d="M4 8.5h16M4 12.5h16" opacity=".45"/></svg>`,
  more: `<svg ${attrs} fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>`,
  params: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="8" cy="7" r="2.4" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2.4" fill="currentColor" stroke="none"/><circle cx="10" cy="17" r="2.4" fill="currentColor" stroke="none"/></svg>`,
  close: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  menu: `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`
};
function iconOnly(icon) {
  return ICO[icon] || "";
}
function btnHtml(icon, label) {
  const svg = iconOnly(icon);
  return `${svg}<span class="lbl">${label}</span>`;
}

// js/ui/modelShell.js
function deriveCapabilities(model) {
  if (!model) {
    return {
      id: "",
      interaction: "none",
      hint: "",
      paramCount: 0,
      hasPointer: false,
      hasEnergy: false,
      hasTextParams: false,
      actions: [],
      formalism: "",
      fidelity: "principle",
      focusGroups: ["dynamics"]
    };
  }
  const schema = model.paramSchema || {};
  const keys = Object.keys(model.params || {});
  const groups = /* @__PURE__ */ new Set();
  let hasTextParams = false;
  for (const k of keys) {
    const g = schema[k]?.group || "dynamics";
    groups.add(g);
    if (schema[k]?.allowText || typeof model.params[k] === "string") hasTextParams = true;
  }
  const declared = model.capabilities || {};
  const hasPointer = typeof model.onPointer === "function" || !!declared.pointer;
  const interaction = declared.interaction || (hasPointer ? "canvas" : hasTextParams ? "text+knobs" : "knobs");
  const hint = declared.hint || (hasPointer ? "\u753B\u5E03\u53EF\u4EA4\u4E92" : "\u53F3\u4FA7\u8C03\u53C2");
  const focusGroups = ["dynamics"];
  if (keys.length < 20 && groups.has("initial")) focusGroups.push("initial");
  return {
    id: model.id,
    interaction,
    hint,
    paramCount: keys.length,
    hasPointer,
    hasEnergy: typeof model.getEnergy === "function",
    hasTextParams,
    actions: Array.isArray(declared.actions) ? declared.actions : [],
    formalism: declared.formalism || model.formalism || "",
    viz: declared.viz || "",
    fidelity: declared.fidelity || model.fidelity || "principle",
    focusGroups,
    tags: model.tags || [],
    sub: model.sub || ""
  };
}
function shouldAutoFoldGroup(group, paramCount, focusGroups = ["dynamics"]) {
  if (focusGroups.includes(group)) return false;
  if (paramCount >= 20) return true;
  if (group === "dynamics") return false;
  if (paramCount >= 14 && (group === "numerics" || group === "display")) return true;
  if (paramCount >= 20 && group === "initial") return true;
  return false;
}

// js/ui/paramBench.js
var GLOBAL_META = {
  timeScale: { label: "timeScale", unit: "\xD7", min: 0.05, max: 8, def: 1 },
  fixedDt: { label: "fixedDt", unit: "s", min: 1 / 2e3, max: 1 / 30, def: 1 / 240, friendlyDt: true },
  maxSubSteps: { label: "maxSubSteps", unit: "", min: 1, max: 256, def: 48, integer: true },
  viewScale: { label: "viewScale", unit: "\xD7", min: 0.25, max: 4, def: 1 },
  readoutDigits: { label: "digits", unit: "", min: 0, max: 8, def: 3, integer: true }
};
var WIDE = { min: -1e9, max: 1e9 };
function createParamBench(root, hooks = {}) {
  const {
    onParamChange,
    onResetDefaults,
    onGlobalsChange,
    onLayoutChange,
    onScrubStart,
    onScrubEnd,
    onToast
  } = hooks;
  let currentModel = null;
  let currentParams = null;
  let builtins = /* @__PURE__ */ new Set();
  let globals = null;
  let sysOpen = false;
  const toastOnce = /* @__PURE__ */ new Set();
  function isNarrow() {
    return typeof window !== "undefined" && window.matchMedia("(max-width: 1100px)").matches;
  }
  function toastClamp(key, from, to) {
    const id = `clamp:${key}`;
    if (toastOnce.has(id)) return;
    toastOnce.add(id);
    onToast?.(`\u5DF2\u94B3\u5236 ${key}: ${formatParamNumber(from)} \u2192 ${formatParamNumber(to)}`);
  }
  function displayValue(v, opts) {
    if (opts.allowExpr && typeof v === "string") return v;
    if (opts.friendlyDt) return formatDtFriendly(v);
    return formatParamNumber(v);
  }
  function render() {
    if (!root || !currentModel || !currentParams || !globals) return;
    const before = { ...globals };
    sanitizeGlobals(globals);
    for (const k of ["timeScale", "fixedDt", "maxSubSteps", "viewScale", "readoutDigits"]) {
      if (before[k] !== globals[k] && Number.isFinite(before[k])) {
        toastClamp(k, before[k], globals[k]);
      }
    }
    root.innerHTML = "";
    root.appendChild(renderApplyBanner());
    root.appendChild(renderGlobalSection());
    root.appendChild(renderParamSections());
    root.appendChild(renderCustomSection());
    root.appendChild(renderPresetSection());
    requestAnimationFrame(() => onLayoutChange?.());
  }
  function renderApplyBanner() {
    const cap = deriveCapabilities(currentModel);
    const bar = document.createElement("div");
    bar.className = "apply-banner";
    bar.setAttribute("role", "status");
    const applyLine = `${t("ui.applyBanner")} \xB7 ${cap.paramCount} ${t("ui.paramsUnit")}`;
    bar.innerHTML = `<strong>${t("ui.bench")} \xB7 ${cap.interaction}${cap.formalism ? ` \xB7 ${cap.formalism}` : ""}</strong><span>${applyLine}</span>`;
    return bar;
  }
  function markApplyMode(row, group) {
    const keyEl = row.querySelector(".key");
    if (group === "dynamics") {
      row.classList.add("is-live");
      if (keyEl) keyEl.dataset.applyLabel = t("ui.live");
    } else if (group === "initial" || group === "numerics") {
      row.classList.add("is-reinit");
      if (keyEl) keyEl.dataset.applyLabel = t("ui.reinit");
    }
  }
  function renderGlobalSection() {
    const labels = groupLabels();
    const sec = section(labels.global || t("group.global"), { stickySys: true, foldable: true, open: sysOpen });
    const rows = document.createElement("div");
    rows.className = "param-rows";
    const g = globals;
    for (const [key, meta] of Object.entries(GLOBAL_META)) {
      rows.appendChild(numberRow(key, g[key], {
        label: meta.label,
        unit: meta.unit,
        defaultValue: meta.def,
        min: meta.min,
        max: meta.max,
        integer: !!meta.integer,
        friendlyDt: !!meta.friendlyDt,
        onCommit: (v) => {
          const raw = v;
          let next = clampNumber(v, meta.min, meta.max);
          if (meta.integer) next = Math.round(next);
          if (key === "fixedDt" && next <= 0) return false;
          if (next !== raw) toastClamp(key, raw, next);
          g[key] = next;
          onGlobalsChange?.(g);
          return true;
        },
        onScrubStart,
        onScrubEnd
      }));
    }
    rows.appendChild(boolRow("showVectors", g.showVectors, {
      label: "vectors",
      onCommit: (v) => {
        g.showVectors = v;
        onGlobalsChange?.(g);
      }
    }));
    rows.appendChild(boolRow("showTrail", g.showTrail, {
      label: "trail",
      onCommit: (v) => {
        g.showTrail = v;
        onGlobalsChange?.(g);
      }
    }));
    rows.appendChild(boolRow("showAxes", g.showAxes, {
      label: "axes",
      onCommit: (v) => {
        g.showAxes = v;
        onGlobalsChange?.(g);
      }
    }));
    rows.appendChild(boolRow("frameShot", g.frameShot, {
      label: "frame shot",
      onCommit: (v) => {
        g.frameShot = v;
        onGlobalsChange?.(g);
      }
    }));
    rows.appendChild(boolRow("shotReadouts", g.shotReadouts, {
      label: "shot readouts",
      onCommit: (v) => {
        g.shotReadouts = v;
        onGlobalsChange?.(g);
      }
    }));
    rows.appendChild(boolRow("shotLegend", g.shotLegend, {
      label: "shot legend",
      onCommit: (v) => {
        g.shotLegend = v;
        onGlobalsChange?.(g);
      }
    }));
    rows.appendChild(boolRow("compareReadouts", g.compareReadouts, {
      label: "readout \u5BF9\u7167",
      onCommit: (v) => {
        g.compareReadouts = v;
        if (!v) g.pinBaseline = false;
        onGlobalsChange?.(g);
      }
    }));
    rows.appendChild(boolRow("pinBaseline", !!g.pinBaseline, {
      label: "\u9489\u4F4F\u57FA\u7EBF",
      onCommit: (v) => {
        g.pinBaseline = v;
        if (v) g.compareReadouts = true;
        onGlobalsChange?.(g);
      }
    }));
    rows.appendChild(boolRow("wideBounds", g.wideBounds !== false, {
      label: "\u5BBD\u91CF\u7A0B\u8F93\u5165",
      onCommit: (v) => {
        g.wideBounds = v;
        onGlobalsChange?.(g);
        render();
      }
    }));
    appendSectionBody(sec, rows, {
      foldable: true,
      open: sysOpen,
      onToggle: (open) => {
        sysOpen = open;
        onLayoutChange?.();
      }
    });
    return sec;
  }
  function renderParamSections() {
    const wrap = document.createElement("div");
    wrap.style.display = "contents";
    const groups = /* @__PURE__ */ new Map();
    for (const [key, value] of Object.entries(currentParams)) {
      if (key.startsWith("__")) continue;
      const schema = currentModel.paramSchema?.[key];
      const group = schema?.group || inferGroup(key, value);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push({ key, value, schema });
    }
    const order = ["dynamics", "initial", "numerics", "display", "custom"];
    const keys = [...groups.keys()].sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    const paramCount = Object.keys(currentParams || {}).length;
    const cap = deriveCapabilities(currentModel);
    const labels = groupLabels();
    for (const g of keys) {
      const title = labels[g] || g;
      const fold = shouldAutoFoldGroup(g, paramCount, cap.focusGroups);
      const sec = section(title);
      const rows = document.createElement("div");
      rows.className = "param-rows";
      if (g === "dynamics") {
        sec.dataset.priority = "dyn";
      }
      for (const item of groups.get(g)) {
        const def = currentModel.params?.[item.key];
        const applyGroup = item.schema?.group || g;
        if (Array.isArray(item.schema?.options) && item.schema.options.length) {
          const row = selectRow(item.key, item.value, {
            label: item.schema?.label || item.key,
            options: item.schema.options,
            onCommit: (v) => commitParam(item.key, v)
          });
          markApplyMode(row, applyGroup);
          rows.appendChild(row);
        } else if (typeof item.value === "boolean") {
          const row = boolRow(item.key, item.value, {
            label: item.schema?.label || item.key,
            onCommit: (v) => commitParam(item.key, v)
          });
          markApplyMode(row, applyGroup);
          rows.appendChild(row);
        } else if (typeof item.value === "string" || item.schema?.allowText || item.key === "expr_a") {
          const isText = typeof item.value === "string" || item.schema?.allowText || item.key === "expr_a";
          if (isText && (item.schema?.allowText || item.key === "expr_a" || typeof item.value === "string")) {
            const row = numberRow(item.key, item.value, {
              label: item.schema?.label || item.key,
              unit: item.schema?.unit || "",
              allowExpr: true,
              defaultValue: item.value,
              onCommit: (v) => commitParam(item.key, String(v)),
              removable: !builtins.has(item.key),
              onRemove: () => removeParam(item.key)
            });
            markApplyMode(row, applyGroup);
            rows.appendChild(row);
          }
        } else if (typeof item.value === "number") {
          const bounds = inferBounds(item.key, typeof def === "number" ? def : item.value, item.schema);
          const wide = globals?.wideBounds !== false;
          const commitMin = wide ? WIDE.min : bounds.min;
          const commitMax = wide ? WIDE.max : bounds.max;
          if (Number.isFinite(item.value) && !wide) {
            const clamped = clampNumber(item.value, bounds.min, bounds.max);
            if (clamped !== item.value) {
              toastClamp(item.key, item.value, clamped);
              currentParams[item.key] = clamped;
              item.value = clamped;
            }
          }
          const row = numberRow(item.key, item.value, {
            label: item.schema?.label || item.key,
            unit: item.schema?.unit || inferUnit(item.key),
            allowExpr: false,
            defaultValue: typeof def === "number" ? def : item.value,
            min: bounds.min,
            max: bounds.max,
            commitMin,
            commitMax,
            wide,
            onCommit: (v) => {
              const next = clampNumber(v, commitMin, commitMax);
              if (next !== v) toastClamp(item.key, v, next);
              return commitParam(item.key, next);
            },
            removable: !builtins.has(item.key),
            onRemove: () => removeParam(item.key),
            onScrubStart,
            onScrubEnd
          });
          markApplyMode(row, applyGroup);
          rows.appendChild(row);
        }
      }
      if (fold) {
        appendSectionBody(sec, rows, { foldable: true, open: false });
      } else {
        sec.appendChild(rows);
      }
      wrap.appendChild(sec);
    }
    return wrap;
  }
  function renderCustomSection() {
    const sec = section("add", { foldable: true, open: false });
    const box2 = document.createElement("div");
    box2.className = "custom-add";
    const keyIn = document.createElement("input");
    keyIn.type = "text";
    keyIn.placeholder = "key";
    const valIn = document.createElement("input");
    valIn.type = "text";
    valIn.placeholder = "value / expr";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = "add";
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.style.gridColumn = "1 / -1";
    hint.style.padding = "0 0.5rem 0.4rem";
    hint.style.color = "var(--muted)";
    hint.innerHTML = 'a_* / expr_a / k_extra \u2192 eq. <a href="./manual.html" style="color:inherit;text-decoration:underline">manual</a>';
    btn.addEventListener("click", () => {
      const key = keyIn.value.trim();
      const checked = validateCustomParam(key, valIn.value);
      if (!checked.ok) {
        hint.textContent = checked.error || "rejected";
        onToast?.(`\u62D2\u7EDD\u5199\u5165: ${checked.error}`);
        return;
      }
      currentParams[key] = checked.value;
      onParamChange?.(key, checked.value, true);
      keyIn.value = "";
      valIn.value = "";
      hint.textContent = "added";
      render();
    });
    box2.append(keyIn, valIn, btn);
    const templates = document.createElement("div");
    templates.className = "add-templates";
    const TEMPLATES = [
      ["a_extra", "0.5", "\u989D\u5916\u52A0\u901F\u5EA6"],
      ["k_extra", "2", "\u989D\u5916\u5F39\u7C27\u521A\u5EA6"],
      ["expr_a", "-0.1*v", "\u963B\u5C3C\u8868\u8FBE\u5F0F"],
      ["a_wind", "0.2", "\u98CE\u573A\u5E38\u91CF"]
    ];
    for (const [k, v, lab] of TEMPLATES) {
      const t2 = document.createElement("button");
      t2.type = "button";
      t2.className = "btn quiet";
      t2.textContent = lab;
      t2.title = `${k}=${v}`;
      t2.addEventListener("click", () => {
        keyIn.value = k;
        valIn.value = v;
        const checked = validateCustomParam(k, v);
        if (!checked.ok) return;
        currentParams[k] = checked.value;
        onParamChange?.(k, checked.value, true);
        render();
      });
      templates.appendChild(t2);
    }
    const body = document.createElement("div");
    body.append(box2, templates, hint);
    appendSectionBody(sec, body, { foldable: true, open: false });
    return sec;
  }
  function renderPresetSection() {
    const sec = section("presets", { foldable: true, open: false });
    const details = document.createElement("details");
    details.className = "preset-menu";
    details.open = false;
    const summary = document.createElement("summary");
    summary.innerHTML = `${ICO.more}<span>more / presets</span>`;
    const menu = document.createElement("div");
    menu.className = "menu";
    const mk = (label, fn) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn quiet";
      b.textContent = label;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        fn();
        details.open = false;
      });
      return b;
    };
    menu.append(
      mk("save local", () => {
        const name = prompt("preset name", `${currentModel.id}-preset`);
        if (!name) return;
        const all = loadPresets();
        sanitizeGlobals(globals);
        all[name] = {
          modelId: currentModel.id,
          params: { ...currentParams },
          globals: { ...globals },
          savedAt: Date.now()
        };
        localStorage.setItem(PRESET_KEY, JSON.stringify(all));
      }),
      mk("load local", () => {
        const all = loadPresets();
        const names = Object.keys(all).filter((n) => all[n].modelId === currentModel.id);
        if (!names.length) {
          alert("no presets");
          return;
        }
        const name = prompt(`available: ${names.join(", ")}`, names[0]);
        if (!name || !all[name]) return;
        Object.keys(currentParams).forEach((k) => delete currentParams[k]);
        Object.assign(currentParams, all[name].params);
        Object.assign(globals, all[name].globals || {});
        sanitizeGlobals(globals);
        onGlobalsChange?.(globals);
        onParamChange?.("__preset", null, true);
        render();
      }),
      mk("export json", () => {
        sanitizeGlobals(globals);
        const blob = new Blob([JSON.stringify({
          modelId: currentModel.id,
          params: currentParams,
          globals
        }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentModel.id}-params.json`;
        a.click();
        URL.revokeObjectURL(url);
      }),
      mk("import json", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";
        input.addEventListener("change", async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            const data = JSON.parse(await file.text());
            if (data.params) {
              Object.keys(currentParams).forEach((k) => delete currentParams[k]);
              Object.assign(currentParams, data.params);
            }
            if (data.globals) Object.assign(globals, data.globals);
            sanitizeGlobals(globals);
            onGlobalsChange?.(globals);
            onParamChange?.("__import", null, true);
            render();
          } catch {
            alert("invalid json");
          }
        });
        input.click();
      }),
      mk("restore defaults", () => onResetDefaults?.())
    );
    details.append(summary, menu);
    appendSectionBody(sec, details, { foldable: true, open: false });
    return sec;
  }
  function commitParam(key, value) {
    currentParams[key] = value;
    onParamChange?.(key, value, true);
    return true;
  }
  function removeParam(key) {
    delete currentParams[key];
    onParamChange?.(key, void 0, true);
    render();
  }
  function section(title, { stickySys = false } = {}) {
    const sec = document.createElement("section");
    sec.className = "param-section" + (stickySys ? " is-sys" : "");
    const h = document.createElement("h3");
    h.textContent = title;
    sec.appendChild(h);
    return sec;
  }
  function appendSectionBody(sec, body, { foldable, open, onToggle } = {}) {
    if (!foldable) {
      sec.appendChild(body);
      return;
    }
    const fold = document.createElement("details");
    fold.className = "section-fold";
    fold.open = !!open;
    const sum = document.createElement("summary");
    sum.className = "section-fold-sum";
    sum.textContent = open ? "collapse" : "expand";
    fold.append(sum, body);
    fold.addEventListener("toggle", () => {
      sum.textContent = fold.open ? "collapse" : "expand";
      onToggle?.(fold.open);
    });
    sec.appendChild(fold);
  }
  function bind(model, params, globalState) {
    currentModel = model;
    currentParams = params;
    globals = globalState;
    if (typeof globals.frameShot !== "boolean") globals.frameShot = false;
    if (typeof globals.shotReadouts !== "boolean") globals.shotReadouts = false;
    if (typeof globals.shotLegend !== "boolean") globals.shotLegend = false;
    if (typeof globals.compareReadouts !== "boolean") globals.compareReadouts = false;
    if (typeof globals.wideBounds !== "boolean") globals.wideBounds = true;
    sanitizeGlobals(globals);
    builtins = new Set(Object.keys(model.params || {}));
    render();
  }
  function numberRow(key, value, opts) {
    const row = document.createElement("div");
    row.className = "param-row";
    const meta = document.createElement("div");
    meta.className = "meta";
    const label = document.createElement("span");
    label.className = "key";
    label.textContent = opts.label || key;
    const unit = document.createElement("span");
    unit.className = "unit";
    unit.textContent = opts.unit || "";
    meta.append(label, unit);
    const controls = document.createElement("div");
    controls.className = "param-controls";
    const inputRow = document.createElement("div");
    inputRow.className = "param-input-row";
    const btnMinus = document.createElement("button");
    btnMinus.type = "button";
    btnMinus.className = "step-btn";
    btnMinus.textContent = "\u2212";
    btnMinus.setAttribute("aria-label", "decrease");
    const btnPlus = document.createElement("button");
    btnPlus.type = "button";
    btnPlus.className = "step-btn";
    btnPlus.textContent = "+";
    btnPlus.setAttribute("aria-label", "increase");
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.spellcheck = false;
    input.value = displayValue(value, opts);
    const hint = document.createElement("div");
    hint.className = "hint";
    const min = opts.min;
    const max = opts.max;
    const defaultValue = opts.defaultValue;
    const writeInput = (v) => {
      input.value = displayValue(v, opts);
    };
    let syncControl = () => {
    };
    const commit = () => {
      if (opts.allowExpr) {
        opts.onCommit?.(input.value);
        input.classList.remove("invalid");
        hint.textContent = "";
        return;
      }
      const parsed = parseUserNumber(input.value);
      if (!parsed.ok) {
        input.classList.add("invalid");
        hint.textContent = parsed.error;
        return;
      }
      let v = parsed.value;
      const raw = v;
      const cMin = Number.isFinite(opts.commitMin) ? opts.commitMin : min;
      const cMax = Number.isFinite(opts.commitMax) ? opts.commitMax : max;
      if (Number.isFinite(cMin) && Number.isFinite(cMax)) v = clampNumber(v, cMin, cMax);
      if (opts.integer) v = Math.round(v);
      if (v !== raw) toastClamp(key, raw, v);
      const ok = opts.onCommit?.(v);
      if (ok === false) {
        input.classList.add("invalid");
        hint.textContent = "rejected";
        return;
      }
      input.classList.remove("invalid");
      hint.textContent = "";
      writeInput(v);
      syncControl(v);
    };
    const nudge = (dir, shift) => {
      if (opts.allowExpr) return;
      const parsed = parseUserNumber(input.value);
      let cur = parsed.ok ? parsed.value : Number(defaultValue) || 0;
      const step = niceStep(cur || max - min || 1, shift);
      let next = cur + dir * step;
      if (Number.isFinite(min) && Number.isFinite(max)) next = clampNumber(next, min, max);
      if (opts.integer) next = Math.round(next);
      writeInput(next);
      syncControl(next);
      opts.onCommit?.(next);
    };
    input.addEventListener("change", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
        return;
      }
      if (opts.allowExpr) return;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        nudge(e.key === "ArrowUp" ? 1 : -1, e.shiftKey);
      }
    });
    btnMinus.addEventListener("click", () => nudge(-1, false));
    btnPlus.addEventListener("click", () => nudge(1, false));
    if (!opts.allowExpr) {
      inputRow.append(btnMinus, input, btnPlus);
    } else {
      inputRow.appendChild(input);
    }
    controls.appendChild(inputRow);
    if (!opts.allowExpr && typeof value === "number") {
      const lo = Number.isFinite(min) ? min : inferBounds(key, defaultValue).min;
      const hi = Number.isFinite(max) ? max : inferBounds(key, defaultValue).max;
      const pot = createPot({
        initial: clampNumber(value, lo, hi),
        defaultValue: Number.isFinite(defaultValue) ? defaultValue : value,
        min: lo,
        max: hi,
        integer: !!opts.integer,
        friendlyDt: !!opts.friendlyDt,
        onChange: (v) => {
          writeInput(v);
          opts.onCommit?.(v);
          hint.textContent = "";
          input.classList.remove("invalid");
        },
        onScrubStart: opts.onScrubStart,
        onScrubEnd: opts.onScrubEnd
      });
      syncControl = pot.setValue;
      controls.appendChild(pot.el);
    }
    row.append(meta, controls, hint);
    return row;
  }
  return { bind, refresh: render };
}
var PRESET_KEY = "physics-lab-presets-v1";
function loadPresets() {
  try {
    return JSON.parse(localStorage.getItem(PRESET_KEY) || "{}");
  } catch {
    return {};
  }
}
function createPot({
  initial,
  defaultValue,
  min,
  max,
  integer,
  onChange,
  onScrubStart,
  onScrubEnd
}) {
  const wrap = document.createElement("div");
  wrap.className = "pot";
  const dial = document.createElement("div");
  dial.className = "pot-dial";
  dial.tabIndex = 0;
  dial.setAttribute("role", "slider");
  dial.setAttribute("aria-label", "adjust value");
  dial.setAttribute("aria-valuemin", String(min));
  dial.setAttribute("aria-valuemax", String(max));
  dial.title = "\u62D6\u52A8\u8C03\u8282 \xB7 \u53CC\u51FB / Home \u590D\u4F4D";
  const knob = document.createElement("div");
  knob.className = "pot-knob";
  dial.appendChild(knob);
  const range = document.createElement("input");
  range.type = "range";
  range.className = "pot-range";
  range.min = String(min);
  range.max = String(max);
  range.step = integer ? "1" : String(Math.min(
    niceStep(Math.max(Math.abs(defaultValue), Math.abs(max - min) / 100), false) || 1e-3,
    Math.max((max - min) / 200, 1e-6)
  ));
  range.setAttribute("aria-label", "slider");
  const stepHint = document.createElement("span");
  stepHint.className = "pot-step";
  let value = clampNumber(initial, min, max);
  const resetTo = clampNumber(
    Number.isFinite(defaultValue) ? defaultValue : initial,
    min,
    max
  );
  const span = Math.max(max - min, Number.EPSILON);
  let scrubbing = false;
  const beginScrub = () => {
    if (scrubbing) return;
    scrubbing = true;
    onScrubStart?.();
  };
  const endScrub = () => {
    if (!scrubbing) return;
    scrubbing = false;
    onScrubEnd?.();
  };
  const angFromVal = (v) => {
    const t2 = (clampNumber(v, min, max) - min) / span;
    return -135 + t2 * 270;
  };
  const fillFromVal = (v) => {
    const t2 = (clampNumber(v, min, max) - min) / span;
    return `${t2 * 100}%`;
  };
  const paint = () => {
    dial.style.setProperty("--fill", fillFromVal(value));
    knob.style.setProperty("--ang", `${angFromVal(value)}deg`);
    dial.setAttribute("aria-valuenow", String(value));
    range.value = String(value);
    const step = niceStep(value, false);
    stepHint.textContent = `\xB1${formatParamNumber(step)}`;
  };
  const applyValue = (raw, announce = true) => {
    let v = clampNumber(raw, min, max);
    if (integer) v = Math.round(v);
    else v = roundToStep(v, niceStep(v, false));
    v = clampNumber(v, min, max);
    value = v;
    paint();
    if (announce) onChange?.(value);
  };
  const flashReset = () => {
    dial.classList.remove("pot-reset-flash");
    void dial.offsetWidth;
    dial.classList.add("pot-reset-flash");
    window.setTimeout(() => dial.classList.remove("pot-reset-flash"), 450);
  };
  const setFromPointer = (clientX, clientY) => {
    const r = dial.getBoundingClientRect();
    let deg = Math.atan2(clientY - (r.top + r.height / 2), clientX - (r.left + r.width / 2)) * 180 / Math.PI + 90;
    deg = Math.max(-135, Math.min(135, deg));
    const t2 = (deg + 135) / 270;
    applyValue(min + t2 * span);
  };
  let dragging = false;
  const onDown = (e) => {
    dragging = true;
    beginScrub();
    dial.style.cursor = "grabbing";
    const pt = e.touches ? e.touches[0] : e;
    setFromPointer(pt.clientX, pt.clientY);
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!dragging) return;
    const pt = e.touches ? e.touches[0] : e;
    setFromPointer(pt.clientX, pt.clientY);
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    dial.style.cursor = "grab";
    endScrub();
  };
  dial.addEventListener("mousedown", onDown);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  window.addEventListener("pointercancel", onUp);
  dial.addEventListener("touchstart", onDown, { passive: false });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onUp);
  window.addEventListener("touchcancel", onUp);
  dial.addEventListener("dblclick", (e) => {
    e.preventDefault();
    applyValue(resetTo);
    flashReset();
  });
  range.addEventListener("pointerdown", beginScrub);
  range.addEventListener("pointerup", endScrub);
  range.addEventListener("pointercancel", endScrub);
  range.addEventListener("change", endScrub);
  range.addEventListener("input", () => {
    beginScrub();
    applyValue(Number(range.value));
  });
  dial.addEventListener("keydown", (e) => {
    const step = niceStep(value, e.shiftKey);
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      applyValue(value + step);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      applyValue(value - step);
    } else if (e.key === "Home") {
      e.preventDefault();
      applyValue(resetTo);
      flashReset();
    } else if (e.key === "End") {
      e.preventDefault();
      applyValue(max);
    }
  });
  paint();
  wrap.append(dial, range, stepHint);
  return {
    el: wrap,
    setValue(v) {
      value = clampNumber(v, min, max);
      paint();
    }
  };
}
function niceStep(value, shift = false) {
  const mag = Math.max(Math.abs(value), 1e-12);
  const decade = 10 ** Math.floor(Math.log10(mag));
  return decade * (shift ? 1 : 0.1);
}
function roundToStep(v, step) {
  if (!Number.isFinite(step) || step <= 0) return v;
  const n = Math.round(v / step) * step;
  const digits = Math.min(8, Math.max(0, -Math.floor(Math.log10(step)) + 1));
  return Number(n.toFixed(digits));
}
function boolRow(_key, value, opts) {
  const row = document.createElement("div");
  row.className = "param-row bool";
  const meta = document.createElement("div");
  meta.className = "meta";
  const label = document.createElement("span");
  label.className = "key";
  label.textContent = opts.label || _key;
  meta.appendChild(label);
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = !!value;
  input.addEventListener("change", () => opts.onCommit?.(input.checked));
  row.append(meta, input);
  return row;
}
function selectRow(_key, value, opts) {
  const row = document.createElement("div");
  row.className = "param-row select";
  const meta = document.createElement("div");
  meta.className = "meta";
  const label = document.createElement("span");
  label.className = "key";
  label.textContent = opts.label || _key;
  meta.appendChild(label);
  const select = document.createElement("select");
  select.className = "param-select";
  select.setAttribute("aria-label", opts.label || _key);
  for (const opt of opts.options || []) {
    const o = document.createElement("option");
    o.value = String(opt.value);
    o.textContent = opt.label ?? String(opt.value);
    select.appendChild(o);
  }
  select.value = String(value);
  select.addEventListener("change", () => {
    const n = Number(select.value);
    opts.onCommit?.(Number.isFinite(n) ? n : select.value);
  });
  row.append(meta, select);
  return row;
}

// js/utils/zipStore.js
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = c >>> 1 ^ 3988292384 & -(c & 1);
  }
  return ~c >>> 0;
}
function u16(n) {
  const b = new Uint8Array(2);
  b[0] = n & 255;
  b[1] = n >>> 8 & 255;
  return b;
}
function u32(n) {
  const b = new Uint8Array(4);
  b[0] = n & 255;
  b[1] = n >>> 8 & 255;
  b[2] = n >>> 16 & 255;
  b[3] = n >>> 24 & 255;
  return b;
}
function concat(chunks) {
  const n = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}
function buildZipStore(files) {
  const enc = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    let data;
    if (typeof f.data === "string") data = enc.encode(f.data);
    else if (f.data instanceof Uint8Array) data = f.data;
    else data = new Uint8Array(f.data || []);
    const crc = crc32(data);
    const local = concat([
      u32(67324752),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data
    ]);
    const central = concat([
      u32(33639248),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralDir = concat(centrals);
  const end = concat([
    u32(101010256),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0)
  ]);
  return new Blob([concat([...locals, centralDir, end])], { type: "application/zip" });
}
async function readZipStore(arrayBuffer) {
  const buf = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const files = [];
  let i = 0;
  while (i + 30 <= buf.length) {
    const sig = view.getUint32(i, true);
    if (sig !== 67324752) break;
    const method = view.getUint16(i + 8, true);
    const comp = view.getUint32(i + 18, true);
    const nameLen = view.getUint16(i + 26, true);
    const extraLen = view.getUint16(i + 28, true);
    const name = new TextDecoder().decode(buf.subarray(i + 30, i + 30 + nameLen));
    const start = i + 30 + nameLen + extraLen;
    const data = buf.subarray(start, start + comp);
    if (method !== 0) throw new Error(`unsupported zip method ${method} for ${name}`);
    files.push({ name, data: new TextDecoder().decode(data) });
    i = start + comp;
  }
  return files;
}

// js/i18n/catalogText.js
var IDX = { en: 0, ja: 1, ko: 2, es: 3, fr: 4, de: 5 };
var PUNCT = {
  en: { "\u3001": "; ", "\uFF1B": "; ", "\uFF0C": ", ", "\u3002": ". " },
  ja: { "\u3001": "\u3001", "\uFF1B": "\u3002", "\uFF0C": "\u3001", "\u3002": "\u3002" },
  ko: { "\u3001": ", ", "\uFF1B": ". ", "\uFF0C": ", ", "\u3002": ". " },
  es: { "\u3001": "; ", "\uFF1B": "; ", "\uFF0C": ", ", "\u3002": ". " },
  fr: { "\u3001": " ; ", "\uFF1B": " ; ", "\uFF0C": ", ", "\u3002": ". " },
  de: { "\u3001": "; ", "\uFF1B": "; ", "\uFF0C": ", ", "\u3002": ". " }
};
var buckets = /* @__PURE__ */ new Map();
var rowsReady = null;
function rebuildBuckets(rows) {
  buckets.clear();
  for (const row of rows) {
    const zh = row[0];
    if (!zh) continue;
    const ch = zh[0];
    if (!buckets.has(ch)) buckets.set(ch, []);
    buckets.get(ch).push(row);
  }
  for (const list of buckets.values()) list.sort((a, b) => b[0].length - a[0].length);
}
function ensureGlyphRows() {
  if (buckets.size) return Promise.resolve();
  if (!rowsReady) {
    const href = typeof document !== "undefined" ? new URL("js/i18n/glyphRows.js", document.baseURI).href : new URL("./glyphRows.js", import.meta.url).href;
    rowsReady = import(href).then((mod) => {
      rebuildBuckets(mod.ROWS || []);
    });
  }
  return rowsReady;
}
function translateCatalogText(locale, text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw || locale === "zh" || IDX[locale] == null) return raw;
  if (!buckets.size) return raw;
  const idx = IDX[locale] + 1;
  let out = "";
  for (let i = 0; i < raw.length; ) {
    const list = buckets.get(raw[i]);
    let hit = null;
    if (list) {
      for (const row of list) {
        if (raw.startsWith(row[0], i) && row[idx]) {
          hit = row;
          break;
        }
      }
    }
    if (hit) {
      const piece = String(hit[idx] || "");
      if (locale !== "ja" && out && /[A-Za-z0-9)]$/.test(out) && /^[A-Za-z0-9(]/.test(piece)) {
        out += " ";
      }
      out += piece;
      i += hit[0].length;
    } else {
      const punct = PUNCT[locale]?.[raw[i]];
      out += punct != null ? punct : raw[i];
      i += 1;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

// js/i18n/previewText.js
if (typeof location !== "undefined") {
  try {
    const lang = new URLSearchParams(location.search).get("lang") || typeof localStorage !== "undefined" && localStorage.getItem("immspfee-lang") || "";
    if (lang && lang !== "zh") void ensureGlyphRows();
  } catch {
  }
}
function lookup(locale, key, vars) {
  const table = STRINGS[locale] || STRINGS.en;
  let s = table[key] ?? STRINGS.en[key] ?? STRINGS.zh[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}
async function ensureCatalogGloss(locale) {
  if (!locale || locale === "zh") return;
  await ensureGlyphRows();
}
function formulaLine(locale, formula) {
  const text = String(formula || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const body = locale === "zh" ? text : translateCatalogText(locale, text);
  return `${lookup(locale, "ui.formulaPrefix")} ${body}`;
}

// js/shells/registry.js
var SHELL_STORAGE_KEY = "immspfee-shell";
var MICROSCOPE_MODEL_ID = "r016-\u663E\u5FAE\u955C";
var MICROSCOPE_SHELL_ID = "lab-microscope3d";
var SHELLS = [
  {
    id: "lab-classic",
    label: "Lab Classic",
    description: "Three-column catalog \xB7 canvas \xB7 param bench (default workbench)",
    rootClass: "shell-lab-classic",
    stageMode: "canvas2d",
    dprCap: 2.5
  },
  {
    id: "lab-focus",
    label: "Lab Focus",
    description: "Denser stage, larger readouts for demos / 1080p projection",
    rootClass: "shell-lab-focus",
    stageMode: "canvas2d",
    dprCap: 3
  },
  {
    id: "lab-projector",
    label: "Lab Projector",
    description: "Classroom projection: large readouts; sidebar hidden (menu toggles overlay)",
    rootClass: "shell-lab-projector",
    stageMode: "canvas2d",
    hideSidebar: true,
    dprCap: 3
  },
  {
    id: MICROSCOPE_SHELL_ID,
    label: "Microscope",
    description: "Dedicated compound-microscope stage \u2014 WebGL structure, optical rail only",
    rootClass: "shell-lab-microscope3d",
    stageMode: "webgl3d",
    hideSidebar: true,
    exclusiveChrome: true,
    dprCap: 3,
    modelId: MICROSCOPE_MODEL_ID
  }
];
var byId2 = new Map(SHELLS.map((s) => [s.id, s]));
function listShells() {
  return SHELLS.slice();
}
function getShell(id) {
  return byId2.get(id) || SHELLS[0];
}
function resolveShellId(search = typeof location !== "undefined" ? location.search : "") {
  try {
    const q = new URLSearchParams(search).get("shell");
    if (q && byId2.has(q)) return q;
  } catch {
  }
  try {
    const stored = localStorage.getItem(SHELL_STORAGE_KEY);
    if (stored && byId2.has(stored)) return stored;
  } catch {
  }
  return SHELLS[0].id;
}
function persistShellId(id) {
  if (!byId2.has(id)) return;
  try {
    localStorage.setItem(SHELL_STORAGE_KEY, id);
  } catch {
  }
}
function applyShell(id, opts = {}) {
  const doc = opts.document || (typeof document !== "undefined" ? document : null);
  const shell = getShell(id);
  if (!doc) return shell;
  const root = doc.documentElement;
  for (const s of SHELLS) root.classList.remove(s.rootClass);
  root.classList.add(shell.rootClass);
  root.dataset.shell = shell.id;
  root.dataset.stageMode = shell.stageMode;
  if (shell.dprCap) root.dataset.dprCap = String(shell.dprCap);
  else delete root.dataset.dprCap;
  const chassis = doc.getElementById("chassis") || doc.getElementById("app") || doc.body;
  if (chassis) {
    for (const s of SHELLS) chassis.classList.remove(s.rootClass);
    chassis.classList.add(shell.rootClass);
    chassis.classList.toggle("shell-hide-sidebar", !!shell.hideSidebar);
    chassis.classList.remove("shell-sidebar-overlay");
  }
  if (typeof opts.onHideSidebar === "function") {
    opts.onHideSidebar(!!shell.hideSidebar);
  }
  return shell;
}

// js/viz/microscopeWebgl.js
function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const msg = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(msg || "shader compile");
  }
  return sh;
}
function link(gl, vsSrc, fsSrc) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) || "link");
  }
  return prog;
}
var VS = `
attribute vec3 aPos;
attribute vec3 aCol;
uniform mat4 uMVP;
varying vec3 vCol;
void main(){
  vCol = aCol;
  gl_Position = uMVP * vec4(aPos, 1.0);
}`;
var FS = `
precision mediump float;
varying vec3 vCol;
void main(){ gl_FragColor = vec4(vCol, 1.0); }`;
var OIL_VS = `
attribute vec2 aUv;
uniform mat4 uMVP;
uniform vec3 uCenter;
uniform float uScale;
varying vec2 vUv;
void main(){
  vUv = aUv;
  vec3 pos = uCenter + vec3((aUv.x - 0.5) * uScale, 0.0, (aUv.y - 0.5) * uScale);
  gl_Position = uMVP * vec4(pos, 1.0);
}`;
var OIL_FS = `
precision mediump float;
uniform float uTime;
uniform float uImmersion;
varying vec2 vUv;
void main(){
  if (uImmersion < 0.5) discard;
  vec2 d = vUv - vec2(0.5);
  float r = length(d) * 2.0;
  if (r > 1.0) discard;
  float pulse = 0.62 + 0.38 * sin(uTime * 3.1 + r * 4.0);
  float edge = smoothstep(1.0, 0.42, r);
  float sheen = smoothstep(0.18, 0.0, abs(r - 0.32 - 0.1 * sin(uTime * 2.2)));
  float rim = smoothstep(0.92, 0.72, r) * smoothstep(0.55, 0.82, r);
  vec3 col = mix(vec3(0.22, 0.55, 0.78), vec3(0.72, 0.92, 1.0), sheen);
  col = mix(col, vec3(0.95, 0.82, 0.35), rim * 0.55);
  float alpha = edge * pulse * 0.88;
  gl_FragColor = vec4(col, alpha);
}`;
function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy * Math.PI / 360);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) * nf,
    -1,
    0,
    0,
    2 * far * near * nf,
    0
  ]);
}
function multiply(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}
function lookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz) {
  let zx = ex - cx;
  let zy = ey - cy;
  let zz = ez - cz;
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len;
  zy /= len;
  zz /= len;
  let xx = uy * zz - uz * zy;
  let xy = uz * zx - ux * zz;
  let xz = ux * zy - uy * zx;
  len = Math.hypot(xx, xy, xz) || 1;
  xx /= len;
  xy /= len;
  xz /= len;
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  return new Float32Array([
    xx,
    yx,
    zx,
    0,
    xy,
    yy,
    zy,
    0,
    xz,
    yz,
    zz,
    0,
    -(xx * ex + xy * ey + xz * ez),
    -(yx * ex + yy * ey + yz * ez),
    -(zx * ex + zy * ey + zz * ez),
    1
  ]);
}
function box(cx, cy, cz, sx, sy, sz, r, g, b, out) {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const v = [
    [-hx, -hy, hz],
    [hx, -hy, hz],
    [hx, hy, hz],
    [-hx, -hy, hz],
    [hx, hy, hz],
    [-hx, hy, hz],
    [-hx, -hy, -hz],
    [-hx, hy, -hz],
    [hx, hy, -hz],
    [-hx, -hy, -hz],
    [hx, hy, -hz],
    [hx, -hy, -hz],
    [-hx, hy, -hz],
    [-hx, hy, hz],
    [hx, hy, hz],
    [-hx, hy, -hz],
    [hx, hy, hz],
    [hx, hy, -hz],
    [-hx, -hy, -hz],
    [hx, -hy, -hz],
    [hx, -hy, hz],
    [-hx, -hy, -hz],
    [hx, -hy, hz],
    [-hx, -hy, hz],
    [hx, -hy, -hz],
    [hx, hy, -hz],
    [hx, hy, hz],
    [hx, -hy, -hz],
    [hx, hy, hz],
    [hx, -hy, hz],
    [-hx, -hy, -hz],
    [-hx, -hy, hz],
    [-hx, hy, hz],
    [-hx, -hy, -hz],
    [-hx, hy, hz],
    [-hx, hy, -hz]
  ];
  for (const [x, y, z] of v) {
    out.push(cx + x, cy + y, cz + z, r, g, b);
  }
}
function cylinderY(cx, cy0, cz, radius, height, r, g, b, out, slices = 10, stacks = 4) {
  const hy = height / 2;
  for (let s = 0; s < stacks; s += 1) {
    const t0 = s / stacks;
    const t1 = (s + 1) / stacks;
    const y0 = cy0 - hy + t0 * height;
    const y1 = cy0 - hy + t1 * height;
    const midY = (y0 + y1) / 2;
    const segH = Math.max(height / stacks, 0.01);
    for (let i = 0; i < slices; i += 1) {
      const a0 = i / slices * Math.PI * 2;
      const a1 = (i + 1) / slices * Math.PI * 2;
      const x0 = cx + Math.cos(a0) * radius;
      const z0 = cz + Math.sin(a0) * radius;
      const x1 = cx + Math.cos(a1) * radius;
      const z1 = cz + Math.sin(a1) * radius;
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      const chord = Math.hypot(x1 - x0, z1 - z0) || radius * 0.4;
      box(mx, midY, mz, chord, segH, radius * 0.55, r, g, b, out);
    }
  }
}
function ring(cx, cy, cz, radius, thick, height, r, g, b, out, segs = 22) {
  for (let i = 0; i < segs; i += 1) {
    const a0 = i / segs * Math.PI * 2;
    const a1 = (i + 1) / segs * Math.PI * 2;
    const x0 = cx + Math.cos(a0) * radius;
    const z0 = cz + Math.sin(a0) * radius;
    const x1 = cx + Math.cos(a1) * radius;
    const z1 = cz + Math.sin(a1) * radius;
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    const len = Math.hypot(x1 - x0, z1 - z0) || thick;
    box(mx, cy, mz, len, height, thick, r, g, b, out);
  }
}
function project(mvp, x, y, z, width, height) {
  const clipX = mvp[0] * x + mvp[4] * y + mvp[8] * z + mvp[12];
  const clipY = mvp[1] * x + mvp[5] * y + mvp[9] * z + mvp[13];
  const clipW = mvp[3] * x + mvp[7] * y + mvp[11] * z + mvp[15];
  if (Math.abs(clipW) < 1e-6) return null;
  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;
  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (1 - (ndcY * 0.5 + 0.5)) * height
  };
}
function MagScale(m) {
  return Math.log10(Math.max(4, m));
}
function createMicroscopeWebgl(canvas2, opts = {}) {
  const gl = canvas2.getContext("webgl", { antialias: true, alpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const prog = link(gl, VS, FS);
  const aPos = gl.getAttribLocation(prog, "aPos");
  const aCol = gl.getAttribLocation(prog, "aCol");
  const uMVP = gl.getUniformLocation(prog, "uMVP");
  const buf = gl.createBuffer();
  const oilProg = link(gl, OIL_VS, OIL_FS);
  const oilAUv = gl.getAttribLocation(oilProg, "aUv");
  const oilUMVP = gl.getUniformLocation(oilProg, "uMVP");
  const oilUCenter = gl.getUniformLocation(oilProg, "uCenter");
  const oilUScale = gl.getUniformLocation(oilProg, "uScale");
  const oilUTime = gl.getUniformLocation(oilProg, "uTime");
  const oilUImm = gl.getUniformLocation(oilProg, "uImmersion");
  const oilBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, oilBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0,
    0,
    1,
    0,
    1,
    1,
    0,
    0,
    1,
    1,
    0,
    1
  ]), gl.STATIC_DRAW);
  let lastKey = "";
  let vertCount = 0;
  let yaw = 0.72;
  let pitch = 0.38;
  let radius = 3.35;
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let autoSpin = 0.08;
  let hits = [];
  let lastView = { width: 1, height: 1 };
  let lastState = null;
  let hoverHit = null;
  let oilStageY = 0.4;
  let oilActive = false;
  let overlayLabels = [];
  function turretWorld(optics) {
    const mag = optics.obj.mag;
    const Lscale = Math.max(0.85, Math.min(1.25, (optics.Lmm || 160) / 160));
    const tubeH = (1.35 + MagScale(mag) * 0.22) * Lscale;
    const headY = 1.55;
    const turY = headY - 0.28;
    const tubeCenterY = headY + tubeH / 2 - 0.05;
    const tubeTopY = tubeCenterY + tubeH / 2;
    const tubeBotY = tubeCenterY - tubeH / 2;
    const pts = [];
    OBJECTIVES.forEach((obj, i) => {
      const ang = -Math.PI / 2 + i * (Math.PI / 2);
      pts.push({
        kind: "obj",
        index: i,
        x: Math.cos(ang) * 0.32,
        y: turY - 0.08,
        z: Math.sin(ang) * 0.32,
        id: obj.id
      });
    });
    EYEPIECES.forEach((eye, i) => {
      const x = (i - (EYEPIECES.length - 1) / 2) * 0.16;
      pts.push({
        kind: "eye",
        index: i,
        x,
        y: tubeTopY + 0.42,
        z: 0.22,
        id: eye.id
      });
    });
    return { turY, tubeH, headY, tubeCenterY, tubeTopY, tubeBotY, Lscale, pts };
  }
  function buildMesh(optics, hover) {
    const data = [];
    const mag = optics.obj.mag;
    const { turY, tubeH, headY, tubeCenterY, tubeTopY, tubeBotY } = turretWorld(optics);
    box(0, 0.04, 0.05, 1.55, 0.08, 0.95, 0.16, 0.18, 0.22, data);
    box(-0.55, 0.02, 0.28, 0.22, 0.04, 0.22, 0.12, 0.13, 0.15, data);
    box(0.55, 0.02, 0.28, 0.22, 0.04, 0.22, 0.12, 0.13, 0.15, data);
    box(0, 0.02, -0.35, 0.28, 0.04, 0.22, 0.12, 0.13, 0.15, data);
    cylinderY(0.52, 0.78, 0, 0.075, 1.45, 0.28, 0.32, 0.36, data, 12, 5);
    box(0.42, 1.35, 0, 0.35, 0.12, 0.18, 0.3, 0.34, 0.38, data);
    cylinderY(0, tubeCenterY, 0, 0.11, tubeH, 0.2, 0.48, 0.62, data, 14, 6);
    cylinderY(0, tubeTopY + 0.14, 0, 0.08, 0.28, 0.42, 0.7, 0.92, data, 12, 3);
    box(0, tubeTopY + 0.3, 0, 0.16, 0.06, 0.16, 0.55, 0.78, 0.95, data);
    EYEPIECES.forEach((eye, i) => {
      const active = eye.id === optics.eye.id;
      const hovered = hover?.kind === "eye" && hover.index === i;
      const x = (i - (EYEPIECES.length - 1) / 2) * 0.16;
      const y = tubeTopY + 0.42;
      const g = active ? 0.9 : hovered ? 0.75 : 0.45;
      const rb = active ? 0.35 : hovered ? 0.28 : 0.18;
      box(x, y, 0.22, 0.12, 0.06, 0.1, rb, g, 0.85, data);
      if (active || hovered) {
        ring(x, y + 0.04, 0.22, 0.08, 0.02, 0.015, 0.5, 0.9, 1, data, 12);
      }
    });
    const dimX = -0.28;
    box(dimX, tubeCenterY, 0, 0.012, tubeH, 0.012, 0.95, 0.85, 0.35, data);
    box(dimX, tubeTopY, 0, 0.1, 0.012, 0.012, 0.95, 0.85, 0.35, data);
    box(dimX, tubeBotY, 0, 0.1, 0.012, 0.012, 0.95, 0.85, 0.35, data);
    cylinderY(0, turY + 0.06, 0, 0.3, 0.1, 0.25, 0.55, 0.38, data, 16, 2);
    ring(0, turY + 0.12, 0, 0.3, 0.03, 0.025, 0.35, 0.7, 0.5, data);
    OBJECTIVES.forEach((obj, i) => {
      const ang = -Math.PI / 2 + i * (Math.PI / 2);
      const active = obj.id === optics.obj.id;
      const hovered = hover?.kind === "obj" && hover.index === i;
      const ox = Math.cos(ang) * 0.32;
      const oz = Math.sin(ang) * 0.32;
      const len = 0.2 + MagScale(obj.mag) * 0.045;
      const taper = active ? 0.055 : 0.045;
      const g = active ? 0.92 : hovered ? 0.78 : 0.5;
      const rb = active ? 0.4 : hovered ? 0.3 : 0.18;
      cylinderY(ox, turY - len / 2 - 0.02, oz, taper, len, rb, g, 0.45, data, 10, 3);
      if (obj.immersion) {
        ring(ox, turY - len - 0.02, oz, 0.06, 0.02, 0.015, 0.9, 0.75, 0.2, data, 12);
      }
      if (active) {
        ring(ox, turY + 0.03, oz, 0.12, 0.028, 0.022, 0.45, 0.88, 1, data);
      } else if (hovered) {
        ring(ox, turY + 0.03, oz, 0.115, 0.022, 0.018, 0.72, 0.9, 1, data);
      }
    });
    const objLen = 0.24 + MagScale(mag) * 0.05;
    const stageY = turY - objLen - 0.2;
    box(0, stageY, 0, 1.05, 0.06, 0.72, 0.26, 0.28, 0.32, data);
    ring(0, stageY + 0.04, 0, 0.16, 0.03, 0.02, 0.12, 0.12, 0.14, data, 16);
    cylinderY(0, stageY - 0.18, 0, 0.12, 0.22, 0.35, 0.38, 0.42, data, 10, 3);
    box(0, stageY - 0.38, 0, 0.28, 0.14, 0.28, 0.55, 0.48, 0.22, data);
    oilStageY = stageY + 0.05;
    oilActive = !!optics.immersion;
    return new Float32Array(data);
  }
  function hitRadiusPx(mvp, p, width, height) {
    const c = project(mvp, p.x, p.y, p.z, width, height);
    const e = project(mvp, p.x + 0.14, p.y, p.z, width, height);
    if (!c || !e) return 36;
    const r = Math.hypot(e.x - c.x, e.y - c.y);
    return Math.max(30, Math.min(58, r * 1.45));
  }
  function rebuildHits(mvp, width, height, optics) {
    const { pts } = turretWorld(optics);
    hits = [];
    for (const p of pts) {
      const s = project(mvp, p.x, p.y, p.z, width, height);
      if (!s) continue;
      hits.push({
        kind: p.kind,
        index: p.index,
        x: s.x,
        y: s.y,
        r: hitRadiusPx(mvp, p, width, height)
      });
    }
  }
  function pickAt(clientX, clientY) {
    const rect = canvas2.getBoundingClientRect();
    const x = (clientX - rect.left) / Math.max(rect.width, 1) * lastView.width;
    const y = (clientY - rect.top) / Math.max(rect.height, 1) * lastView.height;
    let best = null;
    let bestD = Infinity;
    for (const h of hits) {
      const d = Math.hypot(x - h.x, y - h.y);
      if (d <= h.r && d < bestD) {
        best = h;
        bestD = d;
      }
    }
    return best;
  }
  function applyHit(hit) {
    if (!lastState?.params || !hit) return false;
    if (hit.kind === "obj") {
      lastState.params.objective = OBJECTIVES[hit.index].id;
      applyTurretDefaults(lastState, "obj");
      lastState._lastObj = lastState.params.objective;
      lastState.pick = `obj-${OBJECTIVES[hit.index].mag}\xD7`;
      opts.onPick?.(lastState);
      return true;
    }
    if (hit.kind === "eye") {
      lastState.params.eyepiece = EYEPIECES[hit.index].id;
      applyTurretDefaults(lastState, "eye");
      lastState._lastEye = lastState.params.eyepiece;
      lastState.pick = `eye-${EYEPIECES[hit.index].mag}\xD7`;
      opts.onPick?.(lastState);
      return true;
    }
    return false;
  }
  const onDown = (ev) => {
    ev.preventDefault();
    dragging = true;
    moved = false;
    autoSpin = 0;
    lastX = ev.clientX;
    lastY = ev.clientY;
    try {
      canvas2.setPointerCapture(ev.pointerId);
    } catch {
    }
  };
  const onMove = (ev) => {
    if (dragging) {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      if (Math.hypot(dx, dy) > 3) moved = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
      yaw += dx * 6e-3;
      pitch = Math.max(0.08, Math.min(1.25, pitch + dy * 5e-3));
      opts.onViewChange?.();
      return;
    }
    const hit = pickAt(ev.clientX, ev.clientY);
    const nextKey = hit ? `${hit.kind}:${hit.index}` : "";
    const prevKey = hoverHit ? `${hoverHit.kind}:${hoverHit.index}` : "";
    if (nextKey !== prevKey) {
      hoverHit = hit ? { kind: hit.kind, index: hit.index } : null;
      lastKey = "";
      canvas2.style.cursor = hit ? "pointer" : "grab";
      opts.onViewChange?.();
    }
  };
  const onUp = (ev) => {
    if (!dragging) return;
    dragging = false;
    try {
      canvas2.releasePointerCapture(ev.pointerId);
    } catch {
    }
    if (!moved) {
      const hit = pickAt(ev.clientX, ev.clientY);
      if (hit) applyHit(hit);
    }
    canvas2.style.cursor = hoverHit ? "pointer" : "grab";
  };
  const onLeave = () => {
    if (hoverHit) {
      hoverHit = null;
      lastKey = "";
      canvas2.style.cursor = "grab";
      opts.onViewChange?.();
    }
  };
  const onWheel = (ev) => {
    ev.preventDefault();
    autoSpin = 0;
    const next = radius + Math.sign(ev.deltaY) * 0.18;
    radius = Math.max(1.8, Math.min(5.5, next));
    opts.onViewChange?.();
  };
  canvas2.style.touchAction = "none";
  canvas2.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  canvas2.addEventListener("pointerleave", onLeave);
  canvas2.addEventListener("wheel", onWheel, { passive: false });
  function drawScene(state, view) {
    lastState = state;
    lastView = { width: view.width, height: view.height };
    const optics = opticsFromParams(state.params || {});
    const tSec = performance.now() * 1e-3;
    const hoverKey = hoverHit ? `${hoverHit.kind}:${hoverHit.index}` : "-";
    const key = `${optics.obj.id}:${optics.eye.id}:${optics.Lmm}:${optics.immersion}:${optics.lambdaNm}:${hoverKey}:${view.width}x${view.height}`;
    const dpr = Math.min(window.devicePixelRatio || 1, Number(document.documentElement.dataset.dprCap) || 3);
    const bw = Math.max(1, Math.floor(view.width * dpr));
    const bh = Math.max(1, Math.floor(view.height * dpr));
    if (canvas2.width !== bw || canvas2.height !== bh) {
      canvas2.width = bw;
      canvas2.height = bh;
      canvas2.style.width = `${view.width}px`;
      canvas2.style.height = `${view.height}px`;
    }
    gl.viewport(0, 0, bw, bh);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.012, 0.016, 0.022, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (key !== lastKey) {
      const mesh = buildMesh(optics, hoverHit);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
      vertCount = mesh.length / 6;
      lastKey = key;
    }
    if (!dragging && autoSpin) yaw += autoSpin * 0.016;
    const ex = Math.cos(yaw) * Math.cos(pitch) * radius;
    const ey = Math.sin(pitch) * radius + 0.4;
    const ez = Math.sin(yaw) * Math.cos(pitch) * radius;
    const aspect = view.width / Math.max(view.height, 1);
    const proj = perspective(36, aspect, 0.1, 24);
    const viewM = lookAt(ex, ey, ez, 0, 0.85, 0, 0, 1, 0);
    const mvp = multiply(proj, viewM);
    rebuildHits(mvp, view.width, view.height, optics);
    const tw = turretWorld(optics);
    const mid = project(mvp, -0.28, tw.tubeCenterY, 0, view.width, view.height);
    overlayLabels = [];
    if (mid) {
      overlayLabels.push({
        id: "L",
        text: `L = ${Math.round(optics.Lmm)} mm`,
        x: mid.x,
        y: mid.y
      });
    }
    for (const eye of EYEPIECES) {
      const i = EYEPIECES.indexOf(eye);
      const p = tw.pts.find((row) => row.kind === "eye" && row.index === i);
      if (!p) continue;
      const s = project(mvp, p.x, p.y, p.z, view.width, view.height);
      if (!s) continue;
      overlayLabels.push({
        id: `eye-${eye.id}`,
        text: `${eye.mag}\xD7`,
        x: s.x,
        y: s.y - 14,
        active: eye.id === optics.eye.id
      });
    }
    gl.useProgram(prog);
    gl.uniformMatrix4fv(uMVP, false, mvp);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 24, 12);
    gl.drawArrays(gl.TRIANGLES, 0, vertCount);
    if (oilActive) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.useProgram(oilProg);
      gl.uniformMatrix4fv(oilUMVP, false, mvp);
      gl.uniform3f(oilUCenter, 0, oilStageY, 0);
      gl.uniform1f(oilUScale, 0.58);
      gl.uniform1f(oilUTime, tSec);
      gl.uniform1f(oilUImm, 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, oilBuf);
      gl.enableVertexAttribArray(oilAUv);
      gl.vertexAttribPointer(oilAUv, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
  }
  return {
    kind: "webgl3d",
    draw(state, view) {
      drawScene(state, view);
    },
    getOverlayLabels() {
      return overlayLabels.slice();
    },
    capturePng(state, view) {
      drawScene(state, view);
      gl.finish();
      try {
        const href = canvas2.toDataURL("image/png");
        if (!href || href === "data:," || href.length < 64) return "";
        return href;
      } catch {
        return "";
      }
    },
    dispose() {
      canvas2.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas2.removeEventListener("pointerleave", onLeave);
      canvas2.removeEventListener("wheel", onWheel);
      gl.deleteBuffer(buf);
      gl.deleteBuffer(oilBuf);
      gl.deleteProgram(prog);
      gl.deleteProgram(oilProg);
    }
  };
}

// js/shells/microscopeStage.js
var READOUTS = [
  { key: "M", label: "M" },
  { key: "f_obj", label: "f_obj" },
  { key: "NA", label: "NA" },
  { key: "d_Abbe", label: "d_Abbe" }
];
function fmtReadouts(o) {
  return {
    M: `${formatNum(o.M, 1)}\xD7`,
    f_obj: `${formatNum(o.fObjM * 1e3, 2)} mm`,
    NA: formatNum(o.NA, 3),
    d_Abbe: `${formatNum(o.dResM * 1e6, 2)} \xB5m`
  };
}
function opticsFingerprint(params) {
  const o = opticsFromParams(params || {});
  return [
    o.obj.id,
    o.eye.id,
    Math.round(o.Lmm),
    o.NA.toFixed(3),
    Math.round(o.lambdaNm),
    o.immersion ? "oil" : "dry"
  ].join("|");
}
function createMicroscopeStage(api) {
  const root = () => document.getElementById("micro-stage");
  const rail = () => document.getElementById("micro-rail");
  const readoutsEl2 = () => document.getElementById("micro-readouts");
  let baselineFp = "";
  function ensureDom() {
    let stage = root();
    if (stage) return stage;
    const host = document.querySelector(".display-bezel") || document.getElementById("stage");
    if (!host) return null;
    stage = document.createElement("div");
    stage.id = "micro-stage";
    stage.className = "micro-stage";
    stage.hidden = true;
    stage.innerHTML = `
      <div class="micro-gl-labels" id="micro-gl-labels" aria-hidden="true"></div>
      <div class="micro-readouts" id="micro-readouts" aria-label="Optical readouts"></div>
      <aside class="micro-rail" id="micro-rail" aria-label="Optical parameters">
        <div class="micro-rail-head">
          <span class="micro-rail-kicker">Optical rail</span>
          <strong class="micro-rail-title">Finite tube</strong>
          <span class="micro-rail-dirty" id="micro-rail-dirty" hidden>params edited</span>
        </div>
        <div class="micro-field">
          <span class="micro-field-label">Objective</span>
          <div class="micro-chips" id="micro-obj" role="group"></div>
        </div>
        <div class="micro-field">
          <span class="micro-field-label">Eyepiece</span>
          <div class="micro-chips" id="micro-eye" role="group"></div>
        </div>
        <label class="micro-field">
          <span class="micro-field-label">Tube length L</span>
          <div class="micro-slider-row">
            <input type="range" id="micro-tube" min="120" max="200" step="1" />
            <output id="micro-tube-out">160 mm</output>
          </div>
        </label>
        <label class="micro-field">
          <span class="micro-field-label">NA</span>
          <div class="micro-slider-row">
            <input type="range" id="micro-na" min="0.05" max="1.4" step="0.01" />
            <output id="micro-na-out">0.25</output>
          </div>
          <span class="micro-cap" id="micro-na-cap"></span>
        </label>
        <label class="micro-field">
          <span class="micro-field-label">Wavelength \u03BB</span>
          <div class="micro-slider-row">
            <input type="range" id="micro-lambda-in" min="400" max="700" step="1" />
            <output id="micro-lambda">550 nm</output>
          </div>
        </label>
        <div class="micro-field">
          <span class="micro-field-label">Immersion</span>
          <div class="micro-chips" id="micro-imm" role="group">
            <button type="button" class="micro-chip" data-imm="dry">Dry</button>
            <button type="button" class="micro-chip" data-imm="oil">Oil</button>
          </div>
          <span class="micro-cap" id="micro-imm-note">Follows the objective (100\xD7 \u2192 oil)</span>
        </div>
      </aside>
    `;
    host.appendChild(stage);
    const objHost = stage.querySelector("#micro-obj");
    for (const obj of OBJECTIVES) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "micro-chip";
      b.dataset.obj = obj.id;
      b.textContent = `${obj.mag}\xD7`;
      b.title = obj.immersion ? `${obj.mag}\xD7 oil` : `${obj.mag}\xD7`;
      objHost.appendChild(b);
    }
    const eyeHost = stage.querySelector("#micro-eye");
    for (const eye of EYEPIECES) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "micro-chip";
      b.dataset.eye = eye.id;
      b.textContent = `${eye.mag}\xD7`;
      eyeHost.appendChild(b);
    }
    const readHost = stage.querySelector("#micro-readouts");
    for (const row of READOUTS) {
      const card = document.createElement("div");
      card.className = "micro-metric";
      card.dataset.key = row.key;
      card.innerHTML = `<span class="micro-metric-label">${row.label}</span><span class="micro-metric-value" data-v>\u2014</span>`;
      readHost.appendChild(card);
    }
    objHost.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-obj]");
      if (!btn) return;
      const state = api.getState();
      if (!state?.params) return;
      state.params.objective = btn.dataset.obj;
      applyTurretDefaults(state, "obj");
      state._lastObj = state.params.objective;
      state.pick = `obj-${btn.textContent}`;
      paint();
      api.onChange();
    });
    eyeHost.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-eye]");
      if (!btn) return;
      const state = api.getState();
      if (!state?.params) return;
      state.params.eyepiece = btn.dataset.eye;
      applyTurretDefaults(state, "eye");
      state._lastEye = state.params.eyepiece;
      state.pick = `eye-${btn.textContent}`;
      paint();
      api.onChange();
    });
    stage.querySelector("#micro-imm")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-imm]");
      if (!btn) return;
      const state = api.getState();
      if (!state?.params) return;
      if (btn.dataset.imm === "oil") {
        state.params.objective = "100x";
      } else if (state.params.objective === "100x") {
        state.params.objective = "40x";
      }
      applyTurretDefaults(state, "obj");
      state._lastObj = state.params.objective;
      paint();
      api.onChange();
    });
    const tube = stage.querySelector("#micro-tube");
    tube?.addEventListener("input", () => {
      const state = api.getState();
      if (!state?.params) return;
      state.params.tubeL_mm = Number(tube.value);
      paint();
      api.onChange();
    });
    const na = stage.querySelector("#micro-na");
    na?.addEventListener("input", () => {
      const state = api.getState();
      if (!state?.params) return;
      const o = opticsFromParams(state.params);
      state.params.NA = Math.min(Number(na.value), o.NAcap);
      paint();
      api.onChange();
    });
    const lambdaIn = stage.querySelector("#micro-lambda-in");
    lambdaIn?.addEventListener("input", () => {
      const state = api.getState();
      if (!state?.params) return;
      state.params.lambda_nm = Number(lambdaIn.value);
      paint();
      api.onChange();
    });
    return stage;
  }
  function captureBaseline(state = api.getState()) {
    if (!state?.params) return;
    baselineFp = opticsFingerprint(state.params);
    const dirty = document.getElementById("micro-rail-dirty");
    if (dirty) dirty.hidden = true;
  }
  function paint() {
    const stage = ensureDom();
    if (!stage) return;
    const state = api.getState();
    if (!state?.params) return;
    const o = opticsFromParams(state.params);
    const values = fmtReadouts(o);
    if (!baselineFp) baselineFp = opticsFingerprint(state.params);
    const dirty = stage.querySelector("#micro-rail-dirty");
    if (dirty) {
      const edited = opticsFingerprint(state.params) !== baselineFp;
      dirty.hidden = !edited;
      dirty.textContent = edited ? `edited \xB7 M ${formatNum(o.M, 1)}\xD7 \xB7 d_Abbe ${formatNum(o.dResM * 1e6, 2)} \xB5m` : "params edited";
    }
    for (const row of READOUTS) {
      const el = stage.querySelector(`.micro-metric[data-key="${row.key}"] [data-v]`);
      if (el) el.textContent = values[row.key];
    }
    for (const btn of stage.querySelectorAll("#micro-obj .micro-chip")) {
      btn.classList.toggle("is-active", btn.dataset.obj === o.obj.id);
    }
    for (const btn of stage.querySelectorAll("#micro-eye .micro-chip")) {
      btn.classList.toggle("is-active", btn.dataset.eye === o.eye.id);
    }
    for (const btn of stage.querySelectorAll("#micro-imm .micro-chip")) {
      btn.classList.toggle("is-active", btn.dataset.imm === "oil" === o.immersion);
    }
    const tube = stage.querySelector("#micro-tube");
    const tubeOut = stage.querySelector("#micro-tube-out");
    if (tube) tube.value = String(Math.round(o.Lmm));
    if (tubeOut) tubeOut.textContent = `${formatNum(o.Lmm, 0)} mm`;
    const na = stage.querySelector("#micro-na");
    const naOut = stage.querySelector("#micro-na-out");
    const naCap2 = stage.querySelector("#micro-na-cap");
    if (na) {
      na.max = String(o.NAcap);
      na.value = String(o.NA);
    }
    if (naOut) naOut.textContent = formatNum(o.NA, 3);
    if (naCap2) naCap2.textContent = `cap ${formatNum(o.NAcap, 3)} \xB7 n=${formatNum(o.n, 3)}`;
    const lambdaIn = stage.querySelector("#micro-lambda-in");
    const lambdaOut = stage.querySelector("#micro-lambda");
    if (lambdaIn) lambdaIn.value = String(Math.round(o.lambdaNm));
    if (lambdaOut) lambdaOut.textContent = `${formatNum(o.lambdaNm, 0)} nm`;
    const note = stage.querySelector("#micro-imm-note");
    if (note) {
      note.textContent = o.immersion ? "Oil film on the stage \xB7 n \u2265 1.515" : "Dry objective \xB7 immersion follows 100\xD7";
    }
    stage.dataset.immersion = o.immersion ? "1" : "0";
  }
  function setVisible(on) {
    const stage = ensureDom();
    if (stage) stage.hidden = !on;
    if (on) captureBaseline();
  }
  function syncOverlayLabels(labels = []) {
    const host = document.getElementById("micro-gl-labels");
    if (!host) return;
    const next = Array.isArray(labels) ? labels : [];
    const kids = [...host.children];
    while (kids.length > next.length) {
      kids.pop()?.remove();
    }
    next.forEach((lab, i) => {
      let el = kids[i];
      if (!el) {
        el = document.createElement("span");
        el.className = "micro-gl-label";
        host.appendChild(el);
      }
      el.dataset.id = lab.id || "";
      el.textContent = lab.text || "";
      el.classList.toggle("is-active", !!lab.active);
      el.classList.toggle("is-dim", lab.id === "L");
      el.style.transform = `translate(${Math.round(lab.x || 0)}px, ${Math.round(lab.y || 0)}px)`;
    });
  }
  function setRailOpen(open) {
    const el = rail();
    if (!el) return;
    el.classList.toggle("is-open", open);
    document.getElementById("btn-micro-params")?.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function toggleRail() {
    const el = rail();
    if (!el) return;
    setRailOpen(!el.classList.contains("is-open"));
  }
  return {
    ensureDom,
    paint,
    setVisible,
    setRailOpen,
    toggleRail,
    captureBaseline,
    syncOverlayLabels,
    READOUTS
  };
}

// js/shells/inputMode.js
var INPUT_LAB = "lab";
var INPUT_MICROSCOPE = "microscope";
function setInputMode(mode) {
  const next = mode === INPUT_MICROSCOPE ? INPUT_MICROSCOPE : INPUT_LAB;
  try {
    document.documentElement.dataset.inputMode = next;
  } catch {
  }
  return next;
}

// js/shells/microscopeChrome.js
function createMicroscopeChrome(api) {
  let lock = false;
  const microChrome = () => document.getElementById("microscope-chrome");
  const microTitle = () => document.getElementById("micro-title");
  const microLede = () => document.getElementById("micro-lede");
  const stage = createMicroscopeStage({
    getState: () => typeof api.getState === "function" ? api.getState() : null,
    onChange: () => {
      api.onOpticsChange?.();
      api.paintFrame();
    },
    t: api.t
  });
  function writeShellUrl(id) {
    try {
      const url = new URL(location.href);
      url.searchParams.set("shell", id);
      history.replaceState(null, "", url);
    } catch {
    }
  }
  function syncShellPicker(on) {
    const el = document.getElementById("shell-select");
    if (!el) return;
    if (on) {
      el.innerHTML = "";
      const opt = document.createElement("option");
      opt.value = "lab-classic";
      opt.textContent = api.t("ui.microExit");
      opt.selected = true;
      el.appendChild(opt);
      el.setAttribute("aria-label", api.t("ui.microExit"));
      return;
    }
    api.remountShellSelect?.({ microOnly: false });
  }
  function sync(on) {
    setInputMode(on ? INPUT_MICROSCOPE : INPUT_LAB);
    const chrome = microChrome();
    if (chrome) chrome.hidden = !on;
    document.documentElement.classList.toggle("shell-micro-active", on);
    const lede = microLede();
    if (lede) lede.textContent = api.t("ui.microLede");
    const exit = document.getElementById("btn-micro-exit");
    if (exit) exit.textContent = api.t("ui.microExit");
    const params = document.getElementById("btn-micro-params");
    if (params) params.textContent = api.t("ui.microBench");
    syncShellPicker(on);
    if (on) {
      api.setPaused(true);
      api.syncPauseUi();
      api.setSidebarOpen(false);
      api.setBenchOpen(false);
      stage.ensureDom();
      stage.setVisible(true);
      const narrow = typeof matchMedia === "function" && matchMedia("(max-width: 720px)").matches;
      stage.setRailOpen(!narrow);
      stage.paint();
    } else {
      stage.setRailOpen(false);
      stage.setVisible(false);
    }
    api.syncDrawerChrome();
  }
  function enter({ skipModel = false } = {}) {
    if (lock) return;
    lock = true;
    try {
      api.setActiveShellId(MICROSCOPE_SHELL_ID);
      persistShellId(MICROSCOPE_SHELL_ID);
      applyShell(MICROSCOPE_SHELL_ID, {
        onHideSidebar: () => {
          const chassis = document.getElementById("chassis");
          chassis?.classList.add("shell-hide-sidebar");
          chassis?.classList.remove("shell-sidebar-overlay");
          api.setSidebarOpen(false);
        }
      });
      writeShellUrl(MICROSCOPE_SHELL_ID);
      if (!skipModel && api.getModelId() !== MICROSCOPE_MODEL_ID) {
        api.switchModel(MICROSCOPE_MODEL_ID, { skipShellSync: true });
      }
      sync(true);
      api.paintFrame();
    } finally {
      lock = false;
    }
  }
  async function leave({ nextShell = "lab-classic" } = {}) {
    if (lock) return;
    lock = true;
    try {
      const target = nextShell === MICROSCOPE_SHELL_ID ? "lab-classic" : nextShell;
      api.setActiveShellId(target);
      persistShellId(target);
      applyShell(target, {
        onHideSidebar: (hide) => {
          const chassis = document.getElementById("chassis");
          chassis?.classList.toggle("shell-hide-sidebar", hide);
          chassis?.classList.remove("shell-sidebar-overlay");
          if (hide) api.setSidebarOpen(false);
        }
      });
      writeShellUrl(target);
      sync(false);
      api.setBenchOpen(true);
      api.paintFrame();
    } finally {
      lock = false;
    }
    return api.focusCatalogModel?.(MICROSCOPE_MODEL_ID, { domain: "\u7269\u7406", sub: "\u5149\u5B66" });
  }
  function onModelChange(modelId) {
    if (lock) return;
    if (modelId !== MICROSCOPE_MODEL_ID && api.getActiveShellId() === MICROSCOPE_SHELL_ID) {
      leave({ nextShell: "lab-classic" });
      return;
    }
    sync(api.getActiveShellId() === MICROSCOPE_SHELL_ID);
  }
  function applyShellId(id) {
    if (id === MICROSCOPE_SHELL_ID) {
      enter({ skipModel: api.getModelId() === MICROSCOPE_MODEL_ID });
      return true;
    }
    if (api.getActiveShellId() === MICROSCOPE_SHELL_ID) {
      leave({ nextShell: id });
      return true;
    }
    return false;
  }
  function setTitle(name) {
    const el = microTitle();
    if (el) el.textContent = name;
  }
  function refresh() {
    if (api.getActiveShellId() === MICROSCOPE_SHELL_ID) stage.paint();
  }
  function syncOverlayLabels(labels) {
    if (api.getActiveShellId() === MICROSCOPE_SHELL_ID) stage.syncOverlayLabels(labels);
  }
  function onKeydown(e) {
    if (api.getActiveShellId() !== MICROSCOPE_SHELL_ID) return false;
    if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      const rail = document.getElementById("micro-rail");
      if (rail?.classList.contains("is-open")) {
        stage.setRailOpen(false);
        return true;
      }
      leave({ nextShell: "lab-classic" });
      return true;
    }
    if (!e.target?.closest?.("input, textarea, select, #micro-rail") && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "j", "k", "J", "K", "PageUp", "PageDown"].includes(e.key)) {
      e.preventDefault();
      return true;
    }
    return false;
  }
  function onWheel(e) {
    if (api.getActiveShellId() !== MICROSCOPE_SHELL_ID) return;
    if (e.target?.closest?.("#micro-rail")) return;
    if (e.target?.closest?.("#model-list, #sidebar")) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  function bind() {
    document.getElementById("btn-micro-exit")?.addEventListener("click", () => {
      void leave({ nextShell: "lab-classic" });
    });
    document.getElementById("btn-micro-reset")?.addEventListener("click", () => {
      if (api.getModelId() !== MICROSCOPE_MODEL_ID) return;
      api.resetSim();
      stage.captureBaseline();
      stage.paint();
    });
    document.getElementById("btn-micro-shot")?.addEventListener("click", () => {
      if (api.getModelId() !== MICROSCOPE_MODEL_ID) return;
      api.captureWebglPng?.();
    });
    document.getElementById("btn-micro-params")?.addEventListener("click", () => {
      if (api.getModelId() !== MICROSCOPE_MODEL_ID) return;
      stage.toggleRail();
    });
    document.addEventListener("wheel", onWheel, { capture: true, passive: false });
  }
  return {
    MICROSCOPE_MODEL_ID,
    MICROSCOPE_SHELL_ID,
    sync,
    enter,
    leave,
    onModelChange,
    applyShellId,
    setTitle,
    bind,
    refresh,
    syncOverlayLabels,
    onKeydown,
    isMicroscopeShell: () => api.getActiveShellId() === MICROSCOPE_SHELL_ID,
    getShell,
    listShells
  };
}

// js/main.js
var canvas = document.getElementById("canvas");
var canvasWebgl = document.getElementById("canvas-webgl");
var canvasWrap = document.querySelector(".canvas-wrap");
var webglStage = null;
var activeShellId = resolveShellId();
var microUi = null;
var readoutsEl = document.getElementById("readouts");
var modelListEl = document.getElementById("model-list");
var toolbarTitle = document.getElementById("toolbar-title");
var toolbarSub = document.getElementById("toolbar-sub");
var metaFormula = document.getElementById("meta-formula");
var bench = document.getElementById("bench");
var paramRoot = document.getElementById("param-root");
var drawerBackdrop = document.getElementById("drawer-backdrop");
var sidebar = document.getElementById("sidebar");
var filterQ = document.getElementById("filter-q");
var filterTag = document.getElementById("filter-tag");
var filterFormalism = document.getElementById("filter-formalism");
var foldBarEl = document.getElementById("fold-bar");
var btnUserModel = document.getElementById("btn-user-model");
var userModelDialog = document.getElementById("user-model-dialog");
var userModelForm = document.getElementById("user-model-form");
var userModelError = document.getElementById("user-model-error");
var userModelFamily = document.getElementById("user-model-family");
var speedSlider = document.getElementById("speed-slider");
var speedLabel = document.getElementById("speed-label");
var btnPause = document.getElementById("btn-pause");
var btnReset = document.getElementById("btn-reset");
var btnMenu = document.getElementById("btn-menu");
var btnParams = document.getElementById("btn-params");
var btnCloseBench = document.getElementById("btn-close-bench");
var btnShot = document.getElementById("btn-shot");
var btnCsv = document.getElementById("btn-csv");
var btnCsvMore = document.getElementById("btn-csv-more");
var tbMore = document.getElementById("tb-more");
var btnHc = document.getElementById("btn-hc");
var benchDrag = document.getElementById("bench-drag");
var sidebarDrag = document.getElementById("sidebar-drag");
var stepper = createFixedStepper(1 / 240, 48);
var app = {
  model: null,
  state: null,
  paused: false,
  filter: { q: "", tag: "", formalism: "" },
  lastReadouts: [],
  globals: {
    timeScale: 1,
    fixedDt: 1 / 240,
    maxSubSteps: 48,
    viewScale: 1,
    showVectors: true,
    showTrail: true,
    showAxes: true,
    readoutDigits: 3,
    frameShot: false,
    shotReadouts: false,
    shotLegend: false,
    compareReadouts: false,
    pinBaseline: false,
    wideBounds: true
  }
};
var FOLD_KEY = "physics-lab-folds-v1";
var BASELINE_KEY = "physics-lab-baselines-v1";
var MODEL_KEY = "physics-lab-model";
var RECENTS_KEY = "physics-lab-recents-v1";
var RECENTS_MAX = 8;
var AUTO_OPEN_BENCH_KEY = "physics-lab-auto-open-bench";
var DEFAULT_MODEL_ID = "free-fall";
var HOT_SUBS = /* @__PURE__ */ new Set([
  "\u7ECF\u5178\u529B\u5B66",
  "\u7B97\u6CD5\u4E0E\u6570\u636E\u7ED3\u6784",
  "\u8BA1\u7B97\u673A\u4F53\u7CFB\u7ED3\u6784",
  "\u6CE2\u4E0E\u632F\u52A8",
  "\u7535\u78C1\u5B66",
  "\u5149\u5B66",
  "\u6570\u5B57\u903B\u8F91",
  "\u6881\u4E0E\u6846\u67B6",
  "\u52A8\u529B\u5FAA\u73AF",
  "\u7ECF\u5178\u63A7\u5236",
  "\u6C14\u52A8",
  "\u4EA4\u901A\u6D41",
  "\u9759\u529B\u4E0E\u5F3A\u5EA6"
]);
function readModelIdFromUrl() {
  try {
    const q = new URLSearchParams(location.search);
    const fromQuery = q.get("model") || q.get("narrow") || q.get("shot") || q.get("m");
    if (fromQuery) return fromQuery;
    const hash = (location.hash || "").replace(/^#/, "");
    if (hash.includes("=")) {
      const m = new URLSearchParams(hash).get("m");
      if (m) return m;
    }
    return null;
  } catch {
    return null;
  }
}
function readModelIdFromStorage() {
  try {
    return localStorage.getItem(MODEL_KEY);
  } catch {
    return null;
  }
}
function persistActiveModel(id) {
  try {
    localStorage.setItem(MODEL_KEY, id);
  } catch {
  }
  try {
    const url = new URL(location.href);
    url.hash = `m=${encodeURIComponent(id)}`;
    history.replaceState(null, "", url);
  } catch {
  }
}
function resolveInitialModelId() {
  const shellModel = getShell(resolveShellId())?.modelId;
  if (shellModel) return shellModel;
  const candidates = [readModelIdFromUrl(), readModelIdFromStorage()];
  for (const id of candidates) {
    if (!id) continue;
    if (models.some((m) => m.id === id)) return id;
  }
  return DEFAULT_MODEL_ID;
}
var baselineStore = {
  byModel: loadBaselines(),
  activeId: null
};
function loadBaselines() {
  try {
    return JSON.parse(localStorage.getItem(BASELINE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveBaselines() {
  try {
    localStorage.setItem(BASELINE_KEY, JSON.stringify(baselineStore.byModel));
  } catch {
  }
}
var shellModeEl = document.getElementById("shell-mode");
var shellDeprecatedEl = document.getElementById("shell-deprecated");
var shellHintEl = document.getElementById("shell-hint");
var btnSafeRestore = document.getElementById("btn-safe-restore");
var baselineSelect = document.getElementById("baseline-select");
var btnSaveBaseline = document.getElementById("btn-save-baseline");
function loadFolds() {
  try {
    return JSON.parse(localStorage.getItem(FOLD_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveFolds(map) {
  try {
    localStorage.setItem(FOLD_KEY, JSON.stringify(map));
  } catch {
  }
}
function isCompact() {
  return window.matchMedia("(max-width: 1100px)").matches;
}
function isMobileDrawer() {
  return window.matchMedia("(max-width: 900px)").matches;
}
function revealCatalogButton(btn) {
  const list = btn?.closest?.(".model-list");
  if (!(list instanceof HTMLElement) || !(btn instanceof HTMLElement)) return;
  const toolbar = document.querySelector(".toolbar");
  const tr = toolbar?.getBoundingClientRect();
  const lr = list.getBoundingClientRect();
  let pad = 12;
  if (tr && tr.width > 0 && tr.bottom > lr.top && tr.right > lr.left && tr.left > lr.left - 4) {
    pad = Math.max(pad, tr.bottom - lr.top + 12);
  }
  const before = list.scrollTop;
  const delta = btn.getBoundingClientRect().top - (lr.top + pad);
  if (Math.abs(delta) > 1) list.scrollTop = before + delta;
  if (Math.abs(btn.getBoundingClientRect().top - (list.getBoundingClientRect().top + pad)) > 2) {
    try {
      btn.scrollIntoView({ block: "center", inline: "nearest" });
    } catch {
    }
    const again = btn.getBoundingClientRect().top - (list.getBoundingClientRect().top + pad);
    if (Math.abs(again) > 1) list.scrollTop += again;
  }
}
function createState(model) {
  const params = JSON.parse(JSON.stringify(model.params));
  const state = { params };
  model.init(state);
  return state;
}
function applyGlobals() {
  sanitizeGlobals(app.globals);
  stepper.setFixedDt(app.globals.fixedDt);
  stepper.setMaxSubSteps(app.globals.maxSubSteps);
  speedSlider.value = String(app.globals.timeScale);
  speedLabel.textContent = `${Number(app.globals.timeScale).toFixed(1)}\xD7`;
}
function syncPauseUi() {
  btnPause.innerHTML = app.paused ? btnHtml("play", t("ui.play")) : btnHtml("pause", t("ui.pause"));
  btnPause.classList.toggle("primary", !app.paused);
}
function syncModelClockPause() {
  if (app.state?._pauseApp) {
    app.state._pauseApp = false;
    if (!app.paused) {
      app.paused = true;
      syncPauseUi();
      if (app.model?.id === "projectile") showToast("\u5DF2\u843D\u5730 \xB7 \u5DF2\u6682\u505C");
    }
  }
  if (typeof app.model?.shouldPauseApp === "function" && app.model.shouldPauseApp(app.state)) {
    if (!app.paused) {
      app.paused = true;
      syncPauseUi();
    }
  }
  updateShellStrip();
}
var scrubResume = null;
var DEBUG_PARAM_LOG = (() => {
  try {
    return localStorage.getItem("physics-lab-debug-params") === "1";
  } catch {
    return false;
  }
})();
var paramLogTimer = null;
var prevReadoutMap = /* @__PURE__ */ new Map();
function showToast(msg) {
  let el = document.getElementById("lab-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "lab-toast";
    el.className = "lab-toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove("show"), 2200);
}
var reinitToastAt = 0;
function toastReinitThrottled() {
  const now = Date.now();
  if (now - reinitToastAt < 900) return;
  reinitToastAt = now;
  showToast("\u5DF2\u91CD\u7F6E\u4EFF\u771F\u72B6\u6001");
}
function loadRecents() {
  try {
    const arr = JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.filter((id) => typeof id === "string" && models.some((m) => m.id === id)).slice(0, RECENTS_MAX);
  } catch {
    return [];
  }
}
function pushRecent(id) {
  if (!id || !models.some((m) => m.id === id)) return;
  const next = [id, ...loadRecents().filter((x) => x !== id)].slice(0, RECENTS_MAX);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
  }
}
function autoOpenBenchOnSelect() {
  try {
    const v = localStorage.getItem(AUTO_OPEN_BENCH_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
  }
  return false;
}
function scrollBenchToDynamics() {
  const dyn = paramRoot?.querySelector('.param-section[data-priority="dyn"]');
  dyn?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function shouldReinitModel(key) {
  if (!key || String(key).startsWith("__")) return true;
  const schema = app.model?.paramSchema?.[key];
  if (!schema) return false;
  if (schema.group === "dynamics" || schema.group === "display" || schema.group === "custom") return false;
  if (schema.group === "initial" || schema.group === "numerics") return true;
  return false;
}
function sanitizeSimState(state) {
  if (!state || typeof state !== "object") return { ok: true };
  const bad = [];
  const walk = (obj, path) => {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      if (k === "params" || k.startsWith("_")) continue;
      const p = path ? `${path}.${k}` : k;
      if (typeof v === "number" && Number.isNaN(v)) bad.push(p);
      else if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Float64Array)) walk(v, p);
      else if (Array.isArray(v) && v.length && typeof v[0] === "number") {
        for (let i = 0; i < v.length; i += 1) {
          if (typeof v[i] === "number" && Number.isNaN(v[i])) {
            bad.push(`${p}[${i}]`);
            break;
          }
        }
      }
    }
  };
  walk(state, "");
  return { ok: !bad.length, bad };
}
function applyParamChange(key) {
  const reinit = shouldReinitModel(key);
  if (reinit) {
    stepper.reset();
    const kept = { ...app.state.params };
    app.state = { params: kept };
    app.model.init(app.state);
    if (key === "layoutSteps") showToast(t("toast.layoutRelayout"));
    else toastReinitThrottled();
  }
  try {
    if (typeof app.model.refresh === "function") app.model.refresh(app.state);
    else if (typeof app.model.recompute === "function") app.model.recompute(app.state);
    else if (typeof app.model.step === "function") app.model.step(app.state, 0);
  } catch (err) {
    console.warn("refresh after param", err);
    showToast(t("toast.paramFail", { key }));
  }
  const check = sanitizeSimState(app.state);
  if (!check.ok) {
    showToast(`\u975E\u6709\u9650\u503C\u4FDD\u62A4: ${check.bad.slice(0, 3).join(", ")} \u2014 \u53EF\u70B9\u300C\u6062\u590D\u5B89\u5168\u9ED8\u8BA4\u300D`);
    app.paused = true;
    syncPauseUi();
    setSafeRestoreVisible(true);
  }
  if (DEBUG_PARAM_LOG) {
    clearTimeout(paramLogTimer);
    paramLogTimer = setTimeout(() => {
      const mode = reinit ? "reinit" : "live";
      console.debug(`[param ${mode}]`, key, app.state?.params?.[key]);
    }, 120);
  }
  syncModelClockPause();
  paintFrame();
  updateHud({ flash: true });
}
function setSafeRestoreVisible(on) {
  if (!btnSafeRestore) return;
  btnSafeRestore.hidden = !on;
}
async function updateShellStrip() {
  const cap = deriveCapabilities(app.model);
  if (shellDeprecatedEl) {
    const dep = !!app.model?.deprecated;
    shellDeprecatedEl.hidden = !dep;
    shellDeprecatedEl.textContent = dep ? "deprecated" : "";
    shellDeprecatedEl.title = app.model?.deprecatedReason || "";
  }
  if (shellModeEl) {
    shellModeEl.textContent = [cap.formalism, cap.interaction].filter(Boolean).join(" \xB7 ") || "knobs";
  }
  if (shellHintEl) {
    const hint = String(cap.hint || "");
    const isDisclaimer = /原理级|非\s*(FEA|工业|临床|设计|CFD|SPICE|N\s*体)|不作长期|假设/.test(hint);
    shellHintEl.textContent = isDisclaimer ? "" : hint;
  }
  const shell = document.getElementById("model-shell");
  const ensureLine = (id, className) => {
    let el = document.getElementById(id);
    if (!el && shell) {
      el = document.createElement("p");
      el.id = id;
      el.className = className;
      shell.appendChild(el);
    }
    return el;
  };
  const loc = getLocale();
  if (loc !== "zh") await ensureCatalogGloss(loc);
  document.getElementById("shell-assumptions")?.remove();
  document.getElementById("shell-caveat")?.remove();
  const formulaEl = ensureLine("shell-formula", "shell-formula");
  if (formulaEl) formulaEl.textContent = formulaLine(loc, app.model?.formula || "");
  let pauseBadge = document.getElementById("shell-pause-badge");
  if (!pauseBadge) {
    pauseBadge = document.createElement("span");
    pauseBadge.id = "shell-pause-badge";
    pauseBadge.className = "shell-chip shell-pause-badge";
    document.getElementById("model-shell")?.insertBefore(
      pauseBadge,
      document.getElementById("shell-actions") || null
    );
  }
  let resumeDemoBtn = document.getElementById("shell-resume-demo");
  if (!resumeDemoBtn) {
    resumeDemoBtn = document.createElement("button");
    resumeDemoBtn.type = "button";
    resumeDemoBtn.id = "shell-resume-demo";
    resumeDemoBtn.className = "btn quiet shell-resume-demo";
    resumeDemoBtn.textContent = "\u6062\u590D\u81EA\u52A8\u6B65\u8FDB";
    resumeDemoBtn.addEventListener("click", () => {
      if (typeof app.model?.runAction === "function") {
        const ok = app.model.runAction(app.state, "autoDemo");
        if (ok) {
          app.paused = false;
          syncPauseUi();
          updateShellStrip();
          paintFrame();
          paramBench.refresh?.();
          showToast("\u5DF2\u6062\u590D\u81EA\u52A8\u6B65\u8FDB");
          return;
        }
      }
      if (!app.state?.params) return;
      app.state.params.demo = 0;
      applyParamChange("demo");
      app.paused = false;
      syncPauseUi();
      updateShellStrip();
      showToast("\u5DF2\u6062\u590D\u81EA\u52A8\u6B65\u8FDB");
    });
    pauseBadge.after(resumeDemoBtn);
  }
  const demoPause = typeof app.model?.shouldPauseApp === "function" && app.model.shouldPauseApp(app.state);
  if (demoPause) {
    pauseBadge.hidden = false;
    pauseBadge.textContent = "\u65F6\u949F\u5DF2\u6682\u505C \xB7 \u7528 step";
    pauseBadge.title = "\u8BFE\u5802\u6F14\u793A\uFF1A\u5168\u5C40\u65F6\u949F\u6682\u505C\uFF0C\u70B9\u5DE5\u5177\u6761\u5355\u6B65\u63A8\u8FDB";
    resumeDemoBtn.hidden = false;
  } else {
    pauseBadge.hidden = true;
    pauseBadge.textContent = "";
    resumeDemoBtn.hidden = true;
  }
  canvas?.classList.toggle("has-pointer", !!cap.hasPointer);
  renderShellActions(cap);
}
function syncShellActionEnabled() {
  const bar = document.getElementById("shell-actions");
  if (!bar || typeof app.model?.actionEnabled !== "function") return;
  for (const btn of bar.querySelectorAll("button[data-action-id]")) {
    const id = btn.getAttribute("data-action-id");
    const enabled = !!app.model.actionEnabled(app.state, id);
    btn.disabled = !enabled;
    btn.setAttribute("aria-disabled", enabled ? "false" : "true");
    btn.title = enabled ? btn.textContent || id : id === "redoEdge" ? "\u65E0\u53EF\u91CD\u505A" : id === "undoEdge" ? "\u65E0\u53EF\u64A4\u9500" : btn.textContent || id;
  }
}
function renderShellActions(cap) {
  let bar = document.getElementById("shell-actions");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "shell-actions";
    bar.className = "shell-actions";
    document.getElementById("model-shell")?.appendChild(bar);
  }
  const actions = cap?.actions || [];
  const sig = actions.map((a) => a.id).join("|");
  if (bar.dataset.actionSig === sig && bar.childElementCount === actions.length) {
    syncShellActionEnabled();
    return;
  }
  bar.dataset.actionSig = sig;
  bar.innerHTML = "";
  for (const a of actions) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn quiet";
    btn.dataset.actionId = a.id;
    btn.textContent = a.label || a.id;
    const enabled = typeof app.model?.actionEnabled === "function" ? !!app.model.actionEnabled(app.state, a.id) : true;
    btn.disabled = !enabled;
    btn.setAttribute("aria-disabled", enabled ? "false" : "true");
    btn.title = enabled ? a.label || a.id : a.id === "redoEdge" ? "\u65E0\u53EF\u91CD\u505A" : a.id === "undoEdge" ? "\u65E0\u53EF\u64A4\u9500" : a.label || a.id;
    btn.addEventListener("click", () => {
      if (btn.disabled || typeof app.model?.runAction !== "function") return;
      const ok = app.model.runAction(app.state, a.id);
      if (ok) {
        if (app.state?._resumeApp) {
          app.state._resumeApp = false;
          if (app.paused) {
            app.paused = false;
            syncPauseUi();
          }
        }
        if (a.id === "undoEdge" || a.id === "redoEdge") {
          syncShellActionEnabled();
          paintFrame();
          paramBench.refresh?.();
          updateHud({ flash: true });
          showToast(a.label || a.id);
          return;
        }
        updateShellStrip();
        paintFrame();
        paramBench.refresh?.();
        updateHud({ flash: true });
        showToast(a.label || a.id);
      } else {
        showToast(a.id === "redoEdge" ? "\u65E0\u53EF\u91CD\u505A" : "\u65E0\u53EF\u64A4\u9500\u64CD\u4F5C");
      }
    });
    bar.appendChild(btn);
  }
}
function restoreSafeDefaults() {
  if (!app.model) return;
  app.globals.timeScale = 1;
  app.globals.fixedDt = 1 / 240;
  app.globals.maxSubSteps = 48;
  app.globals.viewScale = 1;
  sanitizeGlobals(app.globals);
  applyGlobals();
  app.state = createState(app.model);
  stepper.reset();
  paramBench.bind(app.model, app.state.params, app.globals);
  setSafeRestoreVisible(false);
  app.paused = false;
  syncPauseUi();
  updateShellStrip();
  paintFrame();
  updateHud({ flash: true });
  showToast(t("toast.safeRestore"));
}
function modelBaselineBucket() {
  const id = app.model?.id || "_";
  if (!baselineStore.byModel[id]) baselineStore.byModel[id] = [];
  return baselineStore.byModel[id];
}
function activateBaseline(slot) {
  if (!slot) return;
  baselineStore.activeId = slot.id;
  prevReadoutMap = new Map(Object.entries(slot.values || {}));
  app.globals.compareReadouts = true;
  app.globals.pinBaseline = true;
  if (slot.params || slot.sim) {
    if (slot.sim) {
      applySnapshotSimState(slot);
    } else if (slot.params && app.state?.params) {
      Object.assign(app.state.params, slot.params);
      try {
        if (typeof app.model.init === "function") {
          const kept = { ...app.state.params };
          app.state = { params: kept };
          app.model.init(app.state);
        } else if (typeof app.model.refresh === "function") app.model.refresh(app.state);
      } catch {
      }
    }
    paintFrame();
  }
  paramBench.refresh?.();
  renderBaselineSelect();
  updateHud();
}
function snapshotSimState(state) {
  if (!state || typeof state !== "object") return null;
  const out = {};
  const arrayKeys = /* @__PURE__ */ new Set([
    "trail",
    "trails",
    "hist",
    "wave",
    "path",
    "arr",
    "grid",
    "queue",
    "visited",
    "parent",
    "gScore",
    "stack"
  ]);
  const objKeys = /* @__PURE__ */ new Set(["start", "goal"]);
  for (const [k, v] of Object.entries(state)) {
    if (k === "params" || k.startsWith("_")) continue;
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean" || typeof v === "string") out[k] = v;
    else if (Array.isArray(v) && arrayKeys.has(k)) {
      const sliced = k === "trail" || k === "trails" || k === "hist" || k === "wave" ? v.slice(-400) : v;
      out[k] = JSON.parse(JSON.stringify(sliced));
    } else if (v && typeof v === "object" && objKeys.has(k)) {
      out[k] = JSON.parse(JSON.stringify(v));
    }
  }
  return out;
}
function applySnapshotSimState(slot) {
  if (!slot || !app.state) return;
  if (slot.params) Object.assign(app.state.params, slot.params);
  if (slot.sim && typeof slot.sim === "object") {
    for (const [k, v] of Object.entries(slot.sim)) {
      app.state[k] = Array.isArray(v) ? JSON.parse(JSON.stringify(v)) : v;
    }
    return;
  }
  try {
    if (typeof app.model.refresh === "function") app.model.refresh(app.state);
    else if (typeof app.model.recompute === "function") app.model.recompute(app.state);
  } catch {
  }
}
function hashParams(params) {
  const raw = JSON.stringify(params || {});
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `00000000${(h >>> 0).toString(16)}`.slice(-8);
}
function saveBaselineSnapshot(name) {
  const readouts = app.lastReadouts?.length ? app.lastReadouts : app.model?.getReadouts(app.state, { digits: app.globals.readoutDigits }) || [];
  const values = Object.fromEntries(readouts.map((r) => [r.label, r.value]));
  const bucket = modelBaselineBucket();
  const params = { ...app.state?.params || {} };
  const slot = {
    id: `s${Date.now()}`,
    name: name || `\u5FEB\u7167 ${bucket.length + 1}`,
    values,
    params,
    sim: snapshotSimState(app.state),
    paramsHash: hashParams(params),
    ts: Date.now()
  };
  bucket.push(slot);
  while (bucket.length > 8) bucket.shift();
  saveBaselines();
  activateBaseline(slot);
  showToast(`\u5DF2\u5B58\u5BF9\u7167\u5FEB\u7167\u300C${slot.name}\u300D`);
}
function renderBaselineSelect() {
  if (!baselineSelect) return;
  const bucket = modelBaselineBucket();
  const cur = baselineStore.activeId;
  baselineSelect.innerHTML = `<option value="">${t("ui.baselineCurrent")}</option>` + bucket.map((s) => `<option value="${s.id}"${s.id === cur ? " selected" : ""}>${s.name}</option>`).join("");
}
function energyAtTrajectoryRow(model, state, row) {
  if (!row || typeof row !== "object") return null;
  if (Number.isFinite(row.E_kin) || Number.isFinite(row.kinetic)) {
    const kinetic = Number.isFinite(row.E_kin) ? row.E_kin : row.kinetic;
    const potential = Number.isFinite(row.E_pot) ? row.E_pot : row.potential;
    return { kinetic, potential };
  }
  if (typeof model.getEnergyAt === "function") {
    try {
      return model.getEnergyAt(state, row);
    } catch {
    }
  }
  if (typeof model.getEnergy !== "function") return null;
  try {
    return model.getEnergy(state);
  } catch {
    return null;
  }
}
var paramBench = createParamBench(paramRoot, {
  onParamChange: (key) => applyParamChange(key),
  onResetDefaults: () => resetToModelDefaults(),
  onGlobalsChange: () => applyGlobals(),
  onLayoutChange: () => measureSysSticky(),
  onToast: showToast,
  onScrubStart: () => {
    if (scrubResume !== null) return;
    scrubResume = app.paused;
    if (!app.paused) {
      app.paused = true;
      syncPauseUi();
    }
  },
  onScrubEnd: () => {
    if (scrubResume === null) return;
    const was = scrubResume;
    scrubResume = null;
    if (!was) {
      app.paused = false;
      syncPauseUi();
    }
  }
});
function endScrubResume() {
  if (scrubResume === null) return;
  const was = scrubResume;
  scrubResume = null;
  if (!was) {
    app.paused = false;
    syncPauseUi();
  }
}
window.addEventListener("blur", endScrubResume);
window.addEventListener("pointercancel", endScrubResume);
window.addEventListener("touchcancel", endScrubResume);
function resetToModelDefaults() {
  restoreSafeDefaults();
}
function resetSim() {
  stepper.reset();
  const kept = { ...app.state.params };
  app.state = { params: kept };
  app.model.init(app.state);
  setSafeRestoreVisible(false);
  updateHud();
}
var DOMAIN_ORDER = [
  "\u7269\u7406",
  "\u8BA1\u7B97\u673A\u79D1\u5B66",
  "\u8BA1\u7B97\u673A\u5DE5\u7A0B",
  "\u5DE5\u7A0B",
  "\u6750\u6599\u529B\u5B66\u4E0E\u7ED3\u6784\u5DE5\u7A0B",
  "\u5DE5\u7A0B\u70ED\u529B\u5B66\u4E0E\u80FD\u6E90\u52A8\u529B",
  "\u7535\u5B50\u5DE5\u7A0B\u4E0E\u4FE1\u53F7\u5904\u7406",
  "\u63A7\u5236\u7CFB\u7EDF",
  "\u822A\u7A7A\u822A\u5929\u5DE5\u7A0B",
  "\u6C34\u5229\u4E0E\u571F\u6728",
  "\u4EA4\u901A\u5DE5\u7A0B",
  "\u5316\u5B66\u5DE5\u7A0B",
  "\u5DE5\u4E1A\u5DE5\u7A0B",
  "\u6838\u5DE5\u7A0B",
  "\u751F\u7269\u533B\u5B66\u5DE5\u7A0B",
  "\u73AF\u5883\u5DE5\u7A0B",
  "\u6570\u5B66",
  "\u5316\u5B66",
  "\u751F\u7269",
  "\u5730\u7403\u79D1\u5B66",
  "\u7ECF\u6D4E\u4E0E\u7BA1\u7406"
];
var SEARCH_ALIASES = {
  cs: ["\u8BA1\u7B97\u673A\u79D1\u5B66", "\u7B97\u6CD5", "\u6392\u5E8F", "\u56FE\u8BBA", "\u641C\u7D22", "\u5143\u80DE", "\u673A\u5668\u5B66\u4E60", "\u5BC6\u7801", "\u4F18\u5316", "\u8BA1\u7B97\u7406\u8BBA"],
  ce: ["\u8BA1\u7B97\u673A\u5DE5\u7A0B", "\u4F53\u7CFB\u7ED3\u6784", "\u7F13\u5B58", "\u6D41\u6C34\u7EBF", "\u7535\u8DEF", "\u961F\u5217", "\u6570\u5B57", "\u7F51\u7EDC", "\u64CD\u4F5C\u7CFB\u7EDF", "\u5D4C\u5165\u5F0F", "\u901A\u4FE1"],
  phy: ["\u7269\u7406", "\u529B\u5B66", "\u7535\u78C1", "\u6CE2\u52A8", "\u70ED\u5B66", "\u5149\u5B66", "\u6D41\u4F53", "\u8FD1\u4EE3", "\u91CF\u5B50", "\u7B49\u79BB\u5B50\u4F53", "\u6CE2\u4E0E\u632F\u52A8"],
  physics: ["\u7269\u7406"],
  eng: ["\u5DE5\u7A0B", "\u673A\u68B0\u4E0E\u7ED3\u6784", "\u6D41\u4F53\u4E0E\u70ED\u5DE5", "\u7535\u6C14\u4E0E\u80FD\u6E90", "\u5316\u5DE5\u4E0E\u8FC7\u7A0B"],
  me: ["\u6750\u6599\u529B\u5B66\u4E0E\u7ED3\u6784\u5DE5\u7A0B", "\u6881", "\u6841\u67B6", "\u5C48\u66F2", "\u673A\u68B0\u4E0E\u7ED3\u6784"],
  thermo: ["\u5DE5\u7A0B\u70ED\u529B\u5B66\u4E0E\u80FD\u6E90\u52A8\u529B", "\u6717\u80AF", "\u5236\u51B7", "\u5E03\u96F7\u987F", "\u6D41\u4F53\u4E0E\u70ED\u5DE5"],
  ee: ["\u7535\u5B50\u5DE5\u7A0B\u4E0E\u4FE1\u53F7\u5904\u7406", "\u6EE4\u6CE2\u5668", "\u8FD0\u653E", "PLL", "\u7535\u6C14\u4E0E\u80FD\u6E90"],
  control: ["\u63A7\u5236\u7CFB\u7EDF", "PID", "\u6839\u8F68\u8FF9", "\u5012\u7ACB\u6446"],
  aero: ["\u822A\u7A7A\u822A\u5929\u5DE5\u7A0B", "\u7FFC\u578B", "\u8F68\u9053", "\u518D\u5165"],
  civil: ["\u6C34\u5229\u4E0E\u571F\u6728", "\u660E\u6E20", "\u6C34\u9524", "\u5830"],
  chemeng: ["\u5316\u5DE5\u4E0E\u8FC7\u7A0B", "\u53CD\u5E94\u5668", "\u7CBE\u998F", "\u5316\u5B66\u5DE5\u7A0B"],
  geo: ["\u5730\u7403\u79D1\u5B66", "\u5730\u7403\u7269\u7406", "\u6C14\u5019", "\u677F\u5757", "\u5730\u9707", "\u6D77\u6D0B", "\u8F90\u5C04"],
  econ: ["\u7ECF\u6D4E\u4E0E\u7BA1\u7406", "\u5FAE\u89C2", "\u91D1\u878D", "\u4F9B\u9700", "\u590D\u5229", "\u62CD\u5356", "\u535A\u5F08", "\u671F\u6743"],
  fam: ["fam-", "variantOf", "\u53D8\u4F53"]
};
function modelDomain(m) {
  const tags = m.tags || [];
  for (const d of DOMAIN_ORDER) {
    if (tags.includes(d)) return d;
  }
  return "\u5176\u4ED6";
}
function expandSearchQuery(raw) {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  const tokens = [q];
  for (const [alias, words] of Object.entries(SEARCH_ALIASES)) {
    if (q === alias || q.includes(alias)) tokens.push(...words.map((w) => w.toLowerCase()));
  }
  return [...new Set(tokens)];
}
function filteredModels() {
  const raw = app.filter.q.trim();
  const rawLower = raw.toLowerCase();
  if (raw) {
    const exactSub = models.filter((m) => {
      const sub = modelSub(m);
      return sub === raw || sub.toLowerCase() === rawLower;
    });
    if (exactSub.length) {
      return exactSub.filter((m) => {
        if (app.filter.tag && !(m.tags || []).includes(app.filter.tag)) return false;
        if (app.filter.formalism && formalismFor(m) !== app.filter.formalism) return false;
        return true;
      });
    }
  }
  const tokens = expandSearchQuery(app.filter.q);
  return models.filter((m) => {
    if (app.filter.tag && !(m.tags || []).includes(app.filter.tag)) return false;
    if (app.filter.formalism && formalismFor(m) !== app.filter.formalism) return false;
    if (!tokens.length) return true;
    const hay = `${m.name} ${m.id} ${m.sub || ""} ${m.formula || ""} ${(m.tags || []).join(" ")} ${m.description || ""} ${m.formalism || ""}`.toLowerCase();
    return tokens.some((t2) => hay.includes(t2));
  });
}
function makeModelButton(raw) {
  const m = localizeModel2(raw);
  const btn = document.createElement("button");
  const active = app.model?.id === m.id;
  btn.type = "button";
  btn.className = "model-item" + (active ? " active" : "");
  btn.dataset.id = m.id;
  if (active) btn.setAttribute("aria-current", "page");
  const tags = (m.tags || []).filter((t2) => !DOMAIN_ORDER.includes(t2)).slice(0, 2).map((t2) => `<span class="tag">${t2}</span>`).join("");
  btn.title = m.name;
  btn.innerHTML = `<span class="name">${m.name}</span><span class="tags">${tags}</span>`;
  btn.addEventListener("click", () => {
    switchModel(m.id);
    setSidebarOpen(false);
  });
  return btn;
}
function renderRecentsStrip() {
  const ids = loadRecents();
  if (!ids.length) return null;
  const strip = document.createElement("div");
  strip.className = "recents-strip";
  strip.setAttribute("aria-label", t("ui.recents"));
  const label = document.createElement("span");
  label.className = "recents-label";
  label.textContent = t("ui.recents");
  strip.appendChild(label);
  for (const id of ids) {
    const raw = getModelById(id);
    if (!raw) continue;
    const m = localizeModel2(raw);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "recents-chip" + (app.model?.id === id ? " is-active" : "");
    b.textContent = m.name;
    b.title = m.id;
    if (app.model?.id === id) b.setAttribute("aria-current", "page");
    b.addEventListener("click", () => {
      switchModel(id);
      setSidebarOpen(false);
    });
    strip.appendChild(b);
  }
  return strip;
}
function renderMicro3dStrip() {
  const strip = document.createElement("div");
  strip.className = "micro3d-strip";
  strip.setAttribute("aria-label", t("ui.micro3dSection"));
  const kicker = document.createElement("span");
  kicker.className = "micro3d-kicker";
  kicker.textContent = t("ui.micro3dSection");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "btn-micro3d-entry";
  btn.className = "micro3d-entry" + (activeShellId === "lab-microscope3d" ? " is-active" : "");
  btn.innerHTML = `<span class="name">${t("ui.micro3dEntry")}</span><span class="tags"><span class="tag">WebGL</span></span>`;
  btn.title = t("ui.micro3dLede");
  if (activeShellId === "lab-microscope3d") btn.setAttribute("aria-current", "page");
  btn.addEventListener("click", () => {
    microUi?.enter?.();
    setSidebarOpen(false);
  });
  strip.append(kicker, btn);
  return strip;
}
function modelSub(m) {
  if (m.sub) return m.sub;
  const tags = m.tags || [];
  return tags.find((t2) => !DOMAIN_ORDER.includes(t2)) || "\u672A\u5206\u7C7B";
}
function foldKey(domain, sub) {
  return sub ? `${domain}::${sub}` : domain;
}
function setAllFolds(open) {
  const next = loadFolds();
  for (const el of modelListEl.querySelectorAll("details.domain-group, details.sub-group")) {
    el.open = open;
  }
  for (const el of modelListEl.querySelectorAll("details.domain-group")) {
    const name = el.dataset.domain || el.querySelector(".domain-name")?.dataset.domain || el.querySelector(".domain-name")?.textContent || "";
    next[foldKey(name)] = open;
  }
  for (const el of modelListEl.querySelectorAll("details.sub-group")) {
    const sub = el.querySelector(".sub-name")?.dataset.sub || el.querySelector(".sub-name")?.textContent || "";
    const domain = el.closest(".domain-group")?.dataset.domain || el.closest(".domain-group")?.querySelector(".domain-name")?.dataset.domain || "";
    next[foldKey(domain, sub)] = open;
  }
  saveFolds(next);
}
function buildSidebar() {
  void (async () => {
    const loc = getLocale();
    if (loc !== "zh") {
      await ensureCatalogGloss(loc);
      await ensureSidebarLocales();
    }
    paintSidebar();
  })();
}
function paintSidebar() {
  modelListEl.innerHTML = "";
  const list = filteredModels();
  const folds = loadFolds();
  const searching = !!app.filter.q.trim() || !!app.filter.tag || !!app.filter.formalism;
  const countEl = document.createElement("div");
  countEl.className = "filter-count";
  const parts = [];
  if (app.filter.tag) parts.push(`tag:${app.filter.tag}`);
  if (app.filter.formalism) parts.push(`form:${app.filter.formalism}`);
  if (app.filter.q.trim()) parts.push(`q:${app.filter.q.trim()}`);
  const catalogTotal = domainIndex.length || models.length;
  countEl.textContent = parts.length ? `\u7B5B\u9009 ${list.length} / ${catalogTotal} \xB7 ${parts.join(" \xB7 ")}` : `\u5168\u90E8 ${catalogTotal} \u6A21\u578B`;
  countEl.title = parts.length ? "\u70B9\u51FB\uFF1A\u6E05 tag/form \u2192 \u518D\u70B9\u6E05 q \u2192 \u518D\u70B9\u63D0\u793A\u5DF2\u7A7A" : "\u70B9\u51FB\u63D0\u793A\uFF1A\u5F53\u524D\u65E0\u7B5B\u9009";
  countEl.style.cursor = "pointer";
  countEl.setAttribute("role", "status");
  countEl.setAttribute("aria-live", "polite");
  const announce = (msg) => {
    countEl.setAttribute("aria-label", msg);
    showToast(msg);
  };
  countEl.addEventListener("click", () => {
    if (app.filter.tag || app.filter.formalism) {
      const keepQ = !!app.filter.q.trim();
      app.filter.tag = "";
      app.filter.formalism = "";
      if (filterTag) filterTag.value = "";
      if (filterFormalism) filterFormalism.value = "";
      buildSidebar();
      announce(keepQ ? "\u5DF2\u6E05\u9664 tag \xB7 form\uFF08\u518D\u70B9\u6E05\u9664\u641C\u7D22\uFF09" : "\u5DF2\u6E05\u9664 tag \xB7 form \u7B5B\u9009");
      return;
    }
    if (app.filter.q.trim()) {
      app.filter.q = "";
      if (filterQ) filterQ.value = "";
      buildSidebar();
      announce("\u5DF2\u6E05\u9664\u641C\u7D22 q");
      return;
    }
    announce("\u7B5B\u9009\u5DF2\u7A7A");
  });
  modelListEl.appendChild(countEl);
  modelListEl.appendChild(renderMicro3dStrip());
  if (foldBarEl) {
    foldBarEl.innerHTML = "";
    const btnExpand = document.createElement("button");
    btnExpand.type = "button";
    btnExpand.className = "btn quiet";
    btnExpand.textContent = t("ui.expandAll");
    btnExpand.addEventListener("click", () => setAllFolds(true));
    const btnCollapse = document.createElement("button");
    btnCollapse.type = "button";
    btnCollapse.className = "btn quiet";
    btnCollapse.textContent = t("ui.collapseAll");
    btnCollapse.addEventListener("click", () => setAllFolds(false));
    foldBarEl.append(btnExpand, btnCollapse);
  }
  const foldHint = document.createElement("p");
  foldHint.className = "fold-hint";
  foldHint.textContent = t("ui.foldHint");
  const recents = renderRecentsStrip();
  if (recents) modelListEl.appendChild(recents);
  modelListEl.appendChild(foldHint);
  const source = searching ? list.map((m) => ({ id: m.id, domain: modelDomain(m), sub: modelSub(m) })) : domainIndex.length ? domainIndex : list.map((m) => ({ id: m.id, domain: modelDomain(m), sub: modelSub(m) }));
  if (!source.length) {
    const empty = document.createElement("div");
    empty.style.cssText = "padding:0.75rem;font-family:var(--font-mono);font-size:0.75rem;color:var(--muted)";
    empty.textContent = t("ui.noMatch");
    modelListEl.appendChild(empty);
    return;
  }
  const groups = /* @__PURE__ */ new Map();
  for (const row of source) {
    const d = row.domain || "\u5176\u4ED6";
    if (!groups.has(d)) groups.set(d, /* @__PURE__ */ new Map());
    const sub = row.sub || "\u672A\u5206\u7C7B";
    if (!groups.get(d).has(sub)) groups.get(d).set(sub, []);
    groups.get(d).get(sub).push(row);
  }
  const order = [...DOMAIN_ORDER, "\u5176\u4ED6"];
  for (const domain of order) {
    const subMap = groups.get(domain);
    if (!subMap?.size) continue;
    const count = [...subMap.values()].reduce((n, arr) => n + arr.length, 0);
    const details = document.createElement("details");
    details.className = "domain-group";
    details.dataset.domain = domain;
    const dKey = foldKey(domain);
    const wantOpen = searching || (folds[dKey] != null ? !!folds[dKey] : false);
    const sum = document.createElement("summary");
    sum.innerHTML = `<span class="domain-name" data-domain="${domain}">${domainLabel(domain)}</span><span class="domain-count">${count}</span>`;
    const body = document.createElement("div");
    body.className = "domain-body";
    const fillBody = () => {
      body.replaceChildren();
      for (const [sub, items] of subMap) {
        const ready = items.map((row) => models.find((m) => m.id === row.id)).filter(Boolean);
        if (!ready.length) continue;
        const subEl = document.createElement("details");
        subEl.className = "sub-group";
        const sKey = foldKey(domain, sub);
        const defaultOpen = searching || HOT_SUBS.has(sub) || ready.length <= 3;
        const subWantOpen = folds[sKey] != null ? !!folds[sKey] : defaultOpen;
        const subSum = document.createElement("summary");
        const q = app.filter.q.trim();
        const hit = q && (sub === q || sub.toLowerCase() === q.toLowerCase());
        subSum.innerHTML = `<span class="sub-name${hit ? " is-match" : ""}" data-sub="${sub}">${sub}</span><span class="sub-count">${items.length}</span>`;
        const subBody = document.createElement("div");
        subBody.className = "sub-body";
        for (const m of ready) subBody.appendChild(makeModelButton(m));
        subEl.append(subSum, subBody);
        subEl.addEventListener("toggle", () => {
          const next = loadFolds();
          next[sKey] = subEl.open;
          saveFolds(next);
        });
        body.appendChild(subEl);
        subEl.open = subWantOpen;
      }
    };
    const ensureBody = () => {
      if (!details.open) return;
      const have = [...subMap.values()].some((items) => items.some((row) => models.some((m) => m.id === row.id)));
      if (have || searching) {
        fillBody();
        return;
      }
      if (details.dataset.loading === "1") return;
      details.dataset.loading = "1";
      void loadDomain(domain).then(async () => {
        details.dataset.loading = "";
        const lang = getLocale();
        if (lang !== "zh") {
          try {
            await ensureSidebarLocales();
          } catch {
          }
        }
        fillBody();
      }).catch(() => {
        details.dataset.loading = "";
      });
    };
    details.addEventListener("toggle", () => {
      const next = loadFolds();
      next[dKey] = details.open;
      saveFolds(next);
      ensureBody();
    });
    details.append(sum, body);
    modelListEl.appendChild(details);
    details.open = wantOpen;
    if (details.open) ensureBody();
  }
}
function syncSidebarActive() {
  const id = app.model?.id;
  for (const el of modelListEl.querySelectorAll(".model-item")) {
    const on = el.dataset.id === id;
    el.classList.toggle("active", on);
    if (on) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  }
  for (const el of modelListEl.querySelectorAll(".recents-chip")) {
    const active = el.title === id;
    el.classList.toggle("is-active", active);
    if (active) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  }
}
function populateTagFilter() {
  filterTag.innerHTML = '<option value="">all</option>';
  for (const t2 of getAllTags()) {
    const opt = document.createElement("option");
    opt.value = t2;
    opt.textContent = t2;
    filterTag.appendChild(opt);
  }
}
function populateFormalismFilter() {
  if (!filterFormalism) return;
  const set = new Set(Object.values(FAMILY_META).map((m) => m.formalism));
  for (const m of models) {
    const f = m.formalism || m.capabilities?.formalism;
    if (f) set.add(f);
  }
  filterFormalism.innerHTML = '<option value="">all</option>';
  for (const f of [...set].sort()) {
    const opt = document.createElement("option");
    opt.value = f;
    opt.textContent = f;
    filterFormalism.appendChild(opt);
  }
}
function syncDrawerChrome() {
  const compact = isCompact();
  const sideOpen = sidebar.classList.contains("open");
  const benchCollapsed = document.getElementById("chassis")?.classList.contains("bench-collapsed");
  const benchOpen = compact ? bench.classList.contains("open") : !benchCollapsed;
  btnMenu?.setAttribute("aria-expanded", sideOpen ? "true" : "false");
  if (btnMenu) {
    btnMenu.innerHTML = iconOnly(sideOpen ? "close" : "menu");
    btnMenu.setAttribute("aria-label", sideOpen ? t("ui.closeMenu") : t("ui.openMenu"));
  }
  btnParams?.setAttribute("aria-expanded", benchOpen ? "true" : "false");
  if (btnParams) {
    btnParams.hidden = false;
    btnParams.tabIndex = 0;
    btnParams.setAttribute("aria-hidden", "false");
    const lbl = btnParams.querySelector(".lbl");
    if (lbl) lbl.textContent = compact ? "\u53C2\u6570" : benchCollapsed ? "\u53C2\u6570" : "\u6536\u8D77";
  }
  if (btnCloseBench) {
    btnCloseBench.hidden = !compact;
    btnCloseBench.tabIndex = compact ? 0 : -1;
    btnCloseBench.setAttribute("aria-hidden", compact ? "false" : "true");
  }
  const overlayOpen = document.getElementById("chassis")?.classList.contains("shell-sidebar-overlay");
  const showBackdrop = sideOpen || overlayOpen || compact && bench.classList.contains("open");
  drawerBackdrop.hidden = !showBackdrop;
  document.body.classList.toggle("drawer-open", !!showBackdrop);
  document.getElementById("chassis")?.classList.toggle(
    "bench-drawer-open",
    !!(compact && bench.classList.contains("open"))
  );
}
function isProjectorShell() {
  return document.getElementById("chassis")?.classList.contains("shell-hide-sidebar");
}
function setSidebarOpen(open) {
  const chassis = document.getElementById("chassis");
  if (isProjectorShell()) {
    chassis?.classList.toggle("shell-sidebar-overlay", open);
    sidebar.classList.toggle("open", open);
    sidebar.style.transform = "";
    syncDrawerChrome();
    return;
  }
  if (!isMobileDrawer()) {
    sidebar.classList.remove("open");
    sidebar.style.transform = "";
    chassis?.classList.remove("shell-sidebar-overlay");
    syncDrawerChrome();
    return;
  }
  chassis?.classList.remove("shell-sidebar-overlay");
  sidebar.classList.toggle("open", open);
  sidebar.style.transform = "";
  syncDrawerChrome();
}
function setBenchOpen(open) {
  const chassis = document.getElementById("chassis");
  if (!isCompact()) {
    bench.classList.add("open");
    bench.style.transform = "";
    bench.style.height = "";
    chassis?.classList.toggle("bench-collapsed", !open);
    try {
      localStorage.setItem("physics-lab-bench-collapsed", chassis?.classList.contains("bench-collapsed") ? "1" : "0");
    } catch {
    }
    syncDrawerChrome();
    return;
  }
  chassis?.classList.remove("bench-collapsed");
  try {
    localStorage.setItem("physics-lab-bench-collapsed", "0");
  } catch {
  }
  bench.classList.toggle("open", open);
  if (!open) {
    bench.style.transform = "";
    bench.style.height = "";
  }
  syncDrawerChrome();
}
function measureSysSticky() {
  const sys = paramRoot.querySelector(".param-section.is-sys");
  if (!sys) return;
  const h = Math.ceil(sys.getBoundingClientRect().height);
  paramRoot.style.setProperty("--sys-sticky-h", `${Math.max(28, h)}px`);
}
function switchModel(id, opts = {}) {
  if (id && !models.some((m) => m.id === id)) {
    if (switchModel.pending === id) return Promise.resolve();
    switchModel.pending = id;
    return ensureId(id).then((ok) => {
      switchModel.pending = "";
      return switchModel(ok ? id : DEFAULT_MODEL_ID);
    });
  }
  const model = (id && models.some((m) => m.id === id) ? getModelById(id) : null) || getModelById(DEFAULT_MODEL_ID) || models[0];
  if (!model) return;
  app.model = model;
  const view = localizeModel2(model);
  setModelPalette(model.id);
  app.state = createState(model);
  stepper.reset();
  prevReadoutMap = /* @__PURE__ */ new Map();
  baselineStore.activeId = null;
  setSafeRestoreVisible(false);
  toolbarTitle.textContent = view.name;
  toolbarSub.textContent = [view.sub, ...(view.tags || []).filter((t2) => t2 !== view.sub)].filter(Boolean).join(" / ") || "model";
  metaFormula.textContent = [view.formula, view.description].filter(Boolean).join("\n");
  microUi?.setTitle(view.name);
  paramBench.bind(model, app.state.params, app.globals);
  pushRecent(model.id);
  const oldStrip = modelListEl.querySelector(".recents-strip");
  const nextStrip = renderRecentsStrip();
  if (oldStrip && nextStrip) oldStrip.replaceWith(nextStrip);
  else if (!oldStrip && nextStrip) {
    const foldBar = modelListEl.querySelector(".fold-bar");
    foldBar?.after(nextStrip);
  }
  syncSidebarActive();
  updateShellStrip();
  renderBaselineSelect();
  updateHud();
  if (isCompact() && !microUi?.isMicroscopeShell?.()) {
    if (autoOpenBenchOnSelect()) {
      setBenchOpen(true);
      requestAnimationFrame(() => requestAnimationFrame(scrollBenchToDynamics));
    } else {
      setBenchOpen(false);
    }
  } else {
    setBenchOpen(true);
  }
  persistActiveModel(model.id);
  syncModelClockPause();
  requestAnimationFrame(measureSysSticky);
  if (!opts.skipShellSync) microUi?.onModelChange(model.id);
}
function updateHud(opts = {}) {
  const digits = app.globals.readoutDigits;
  const readouts = app.model.getReadouts(app.state, { digits }) || [];
  app.lastReadouts = readouts;
  const accent = getModelColors(app.model?.id).body || "#fff";
  readoutsEl.style.setProperty("--hud-accent", accent);
  const compare = !!app.globals.compareReadouts;
  readoutsEl.classList.toggle("is-compare", compare);
  const baseline = prevReadoutMap;
  readoutsEl.innerHTML = readouts.map((r) => {
    const prev = baseline.get(r.label);
    const changed = opts.flash && prev != null && prev !== r.value;
    const prevHtml = compare ? `<span class="prev" title="\u6539\u524D">${prev != null ? prev : "\u2014"}</span>` : "";
    return `<div class="readout-card${changed ? " is-changed" : ""}${compare ? " has-compare" : ""}"><span class="dot" aria-hidden="true"></span><span class="label">${r.label}</span><span class="value-row">${prevHtml}<span class="value">${r.value}</span></span></div>`;
  }).join("");
  const srTable = document.getElementById("sr-readouts");
  if (srTable) {
    srTable.innerHTML = '<thead><tr><th scope="col">\u91CF</th><th scope="col">\u503C</th></tr></thead><tbody>' + readouts.map((r) => `<tr><th scope="row">${r.label}</th><td>${r.value}</td></tr>`).join("") + "</tbody>";
  }
  const pinned = !!app.globals.pinBaseline;
  if (opts.snapshotPrev || baseline.size === 0) {
    prevReadoutMap = new Map(readouts.map((r) => [r.label, r.value]));
  } else if (!compare) {
    prevReadoutMap = new Map(readouts.map((r) => [r.label, r.value]));
  } else if (opts.flash && !pinned) {
    clearTimeout(updateHud._cmpT);
    updateHud._cmpT = setTimeout(() => {
      prevReadoutMap = new Map(readouts.map((r) => [r.label, r.value]));
    }, 120);
  }
  if (opts.flash) {
    clearTimeout(updateHud._flashT);
    updateHud._flashT = setTimeout(() => {
      for (const el of readoutsEl.querySelectorAll(".readout-card.is-changed")) {
        el.classList.remove("is-changed");
      }
    }, 900);
  }
}
function ensureWebglStage() {
  if (!canvasWebgl) return null;
  if (!webglStage) {
    webglStage = createMicroscopeWebgl(canvasWebgl, {
      onPick: () => {
        paintFrame({ skipMicroRefresh: true });
        microUi?.refresh();
        updateHud({ flash: true });
        paramBench.refresh?.();
      },
      onViewChange: () => {
        paintFrame({ skipMicroRefresh: true });
      }
    });
  }
  return webglStage;
}
function syncStageMode() {
  const shell = getShell(activeShellId);
  const useGl = shell.stageMode === "webgl3d" && app.model?.id === "r016-\u663E\u5FAE\u955C";
  if (canvas) canvas.hidden = !!useGl;
  if (canvasWebgl) canvasWebgl.hidden = !useGl;
  document.documentElement.dataset.stageMode = useGl ? "webgl3d" : "canvas2d";
  return useGl;
}
function paintFrame(opts = {}) {
  if (app.model && !palettesReadyNow()) {
    window.__neutralPaints = (window.__neutralPaints || 0) + 1;
    return;
  }
  const useGl = syncStageMode();
  if (useGl) {
    const rect = canvasWrap.getBoundingClientRect();
    const view2 = {
      width: Math.max(1, Math.floor(rect.width)),
      height: Math.max(1, Math.floor(rect.height)),
      dpr: Number(document.documentElement.dataset.dprCap) || 2.5,
      scale: app.globals.viewScale,
      showVectors: app.globals.showVectors,
      showTrail: app.globals.showTrail,
      showAxes: app.globals.showAxes
    };
    const stage = ensureWebglStage();
    if (stage) {
      stage.draw(app.state, view2);
      if (typeof stage.getOverlayLabels === "function") {
        microUi?.syncOverlayLabels?.(stage.getOverlayLabels());
      }
    } else {
      if (canvas) canvas.hidden = false;
      if (canvasWebgl) canvasWebgl.hidden = true;
    }
    if (!opts.skipMicroRefresh) microUi?.refresh();
    return view2;
  }
  const viewBase = resizeCanvas(canvas, canvasWrap, opts);
  const view = {
    width: viewBase.width,
    height: viewBase.height,
    dpr: viewBase.dpr,
    scale: app.globals.viewScale,
    showVectors: app.globals.showVectors,
    showTrail: app.globals.showTrail,
    showAxes: app.globals.showAxes
  };
  const ctx = viewBase.ctx;
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.save();
  if (view.scale !== 1) {
    ctx.translate(view.width / 2, view.height / 2);
    ctx.scale(view.scale, view.scale);
    ctx.translate(-view.width / 2, -view.height / 2);
  }
  app.model.draw(ctx, app.state, view);
  ctx.restore();
  return viewBase;
}
function frame(now) {
  if (!frame.last) frame.last = now;
  const frameDt = (now - frame.last) / 1e3;
  frame.last = now;
  if (!app.paused) {
    stepper.advance(frameDt * app.globals.timeScale, (dt) => {
      try {
        app.model.step(app.state, dt);
        if (app.state?._pauseApp) syncModelClockPause();
        const check = sanitizeSimState(app.state);
        if (!check.ok) {
          showToast(`\u975E\u6709\u9650\u503C\u4FDD\u62A4: ${check.bad.slice(0, 2).join(", ")} \u2014 \u53EF\u6062\u590D\u5B89\u5168\u9ED8\u8BA4`);
          app.paused = true;
          syncPauseUi();
          setSafeRestoreVisible(true);
        }
      } catch (err) {
        console.warn("step error", err);
        showToast("\u4EFF\u771F\u6B65\u8FDB\u5F02\u5E38\uFF0C\u5DF2\u6682\u505C \u2014 \u53EF\u6062\u590D\u5B89\u5168\u9ED8\u8BA4");
        app.paused = true;
        syncPauseUi();
        setSafeRestoreVisible(true);
      }
    });
  }
  paintFrame();
  updateHud();
  requestAnimationFrame(frame);
}
btnPause.addEventListener("click", () => {
  app.paused = !app.paused;
  syncPauseUi();
});
btnReset.addEventListener("click", () => resetSim());
btnMenu.addEventListener("click", (e) => {
  e.stopPropagation();
  const chassis = document.getElementById("chassis");
  const overlayOn = chassis?.classList.contains("shell-sidebar-overlay");
  const willOpen = isProjectorShell() ? !overlayOn : !sidebar.classList.contains("open");
  setSidebarOpen(willOpen);
});
btnParams.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!isCompact()) {
    const collapsed = document.getElementById("chassis")?.classList.contains("bench-collapsed");
    setBenchOpen(!!collapsed);
    return;
  }
  setBenchOpen(!bench.classList.contains("open"));
});
btnCloseBench.addEventListener("click", (e) => {
  e.stopPropagation();
  setBenchOpen(false);
  btnParams?.focus();
});
drawerBackdrop.addEventListener("click", () => {
  const sideWas = sidebar.classList.contains("open");
  const benchWas = isCompact() && bench.classList.contains("open");
  setBenchOpen(false);
  setSidebarOpen(false);
  if (sideWas) btnMenu?.focus();
  else if (benchWas) btnParams?.focus();
});
document.addEventListener("keydown", (e) => {
  if (microUi?.onKeydown?.(e)) return;
  const inField = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT");
  if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z") && !inField) {
    if (typeof app.model?.runAction === "function") {
      const actionId = e.shiftKey ? "redoEdge" : "undoEdge";
      const ok = app.model.runAction(app.state, actionId);
      if (ok) {
        e.preventDefault();
        syncShellActionEnabled();
        paintFrame();
        paramBench.refresh?.();
        updateHud({ flash: true });
        showToast(e.shiftKey ? "\u91CD\u505A\u8FDE\u7EBF" : "\u64A4\u9500\u8FDE\u7EBF");
        return;
      }
    }
  }
  if (e.key !== "Escape") return;
  if (inField) {
    e.target.blur?.();
    return;
  }
  if (sidebar.classList.contains("open")) {
    setSidebarOpen(false);
    btnMenu?.focus();
    e.preventDefault();
    return;
  }
  if (isCompact() && bench.classList.contains("open")) {
    setBenchOpen(false);
    btnParams?.focus();
    e.preventDefault();
  }
});
document.getElementById("btn-copy-readouts")?.addEventListener("click", async () => {
  const rows = app.lastReadouts || [];
  const text = rows.map((r) => `${r.label}	${r.value}`).join("\n") || "(\u65E0\u8BFB\u6570)";
  try {
    await navigator.clipboard.writeText(text);
    showToast("\u5DF2\u590D\u5236\u8BFB\u6570");
  } catch {
    showToast("\u590D\u5236\u5931\u8D25");
  }
});
btnShot.addEventListener("click", () => {
  paintFrame({ forceDpr: 2 });
  downloadCanvasPng(canvas, `${app.model.id}-${Date.now()}.png`, {
    framed: !!app.globals.frameShot,
    readouts: app.globals.shotReadouts ? app.lastReadouts : null,
    legend: !!app.globals.shotLegend,
    modelId: app.model.id
  });
  requestAnimationFrame(() => paintFrame());
});
function exportCsv() {
  let rows = typeof app.model.getTrajectory === "function" ? app.model.getTrajectory(app.state) : null;
  if (!rows || !rows.length) rows = [{ t: finiteOr(app.state.t, 0), note: "no-trajectory" }];
  rows = rows.map((row) => {
    const out = { ...typeof row === "object" && row ? row : { v: row } };
    const e = energyAtTrajectoryRow(app.model, app.state, out);
    if (e) {
      if (Number.isFinite(e.kinetic)) out.E_kin = e.kinetic;
      if (Number.isFinite(e.potential)) out.E_pot = e.potential;
      if (Number.isFinite(e.kinetic) && Number.isFinite(e.potential)) {
        out.E_tot = e.kinetic + e.potential;
      }
    }
    return out;
  });
  downloadCsv(rows, `${app.model.id}-trajectory.csv`);
  if (tbMore) tbMore.open = false;
}
btnCsv.addEventListener("click", exportCsv);
btnCsvMore?.addEventListener("click", exportCsv);
document.getElementById("btn-pin-baseline")?.addEventListener("click", () => {
  app.globals.compareReadouts = true;
  app.globals.pinBaseline = true;
  updateHud({ snapshotPrev: true });
  const bucket = modelBaselineBucket();
  const values = Object.fromEntries([...prevReadoutMap.entries()]);
  const slot = {
    id: `pin-${Date.now()}`,
    name: `\u9489\u4F4F ${bucket.length + 1}`,
    values,
    ts: Date.now()
  };
  bucket.push(slot);
  while (bucket.length > 8) bucket.shift();
  baselineStore.activeId = slot.id;
  saveBaselines();
  renderBaselineSelect();
  paramBench.refresh?.();
  showToast("\u5DF2\u9489\u4F4F\u57FA\u7EBF\uFF08\u5BF9\u7167\u5F00\uFF09");
});
btnSaveBaseline?.addEventListener("click", () => saveBaselineSnapshot());
document.getElementById("btn-export-baseline")?.addEventListener("click", () => {
  const payload = {
    version: 1,
    kind: "lab-baseline-pack",
    modelId: app.model?.id,
    modelName: app.model?.name,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    snapshots: modelBaselineBucket(),
    activeId: baselineStore.activeId
  };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}
`], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${app.model?.id || "lab"}-baselines.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("\u5DF2\u5BFC\u51FA\u5BF9\u7167\u5377 JSON");
});
document.getElementById("btn-export-classpack")?.addEventListener("click", () => {
  const withShots = !!document.getElementById("chk-pack-shots")?.checked;
  const shotList = [];
  const files = [];
  const modelIds = Object.keys(baselineStore.byModel).filter((id) => baselineStore.byModel[id]?.length);
  for (const mid of modelIds) {
    files.push({
      name: `models/${mid}.json`,
      data: JSON.stringify({ modelId: mid, snapshots: baselineStore.byModel[mid] }, null, 2)
    });
  }
  if (!files.length) {
    showToast("\u5C1A\u65E0\u5FEB\u7167\u53EF\u6253\u5305 \u2014 \u5148\u5B58\u51E0\u4E2A\u5BF9\u7167\u5FEB\u7167");
    return;
  }
  if (withShots) {
    const prevId = app.model?.id;
    for (const mid of modelIds) {
      if (!models.some((m) => m.id === mid)) continue;
      switchModel(mid);
      const snaps = baselineStore.byModel[mid] || [];
      for (const snap of snaps) {
        applySnapshotSimState(snap);
        paintFrame({ forceDpr: 2 });
        const dataUrl = canvas.toDataURL("image/png");
        const b64 = dataUrl.split(",", 2)[1] || "";
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const safeSnap = String(snap.id || snap.name || "snap").replace(/[^\w.-]+/g, "_");
        const shotName = `shots/${mid}/${safeSnap}.png`;
        const paramsHash = snap.paramsHash || hashParams(snap.params);
        files.push({ name: shotName, data: bin });
        shotList.push({
          modelId: mid,
          snapshotId: snap.id,
          snapshotName: snap.name,
          snapshotParamsHash: paramsHash,
          file: shotName
        });
      }
    }
    if (prevId) switchModel(prevId);
    requestAnimationFrame(() => paintFrame());
  }
  const snapshotParamsHash = {};
  for (const mid of modelIds) {
    snapshotParamsHash[mid] = (baselineStore.byModel[mid] || []).map((s) => ({
      id: s.id,
      name: s.name,
      hash: s.paramsHash || hashParams(s.params)
    }));
  }
  files.unshift({
    name: "manifest.json",
    data: JSON.stringify({
      kind: "lab-classroom-pack",
      version: 2,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      models: modelIds,
      shots: shotList,
      includeShots: withShots,
      snapshotParamsHash
    }, null, 2)
  });
  if (shotList.length) {
    files.push({
      name: "shots/README.txt",
      data: `\u8BFE\u5802\u5305\u622A\u56FE\u6E05\u5355\uFF08\u6BCF\u5FEB\u7167\u4E00\u5E27\uFF09
${shotList.map((s) => `${s.modelId}	${s.snapshotId || ""}	${s.snapshotName || ""}	${s.file}`).join("\n")}
`
    });
  }
  const blob = buildZipStore(files);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `lab-classroom-pack-${Date.now()}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`\u8BFE\u5802\u5305\u5DF2\u5BFC\u51FA\uFF08${modelIds.length} \u6A21\u578B${withShots ? ` + ${shotList.length} PNG` : ""}\uFF09`);
});
document.getElementById("btn-import-baseline")?.addEventListener("click", () => {
  document.getElementById("baseline-file")?.click();
});
document.getElementById("baseline-file")?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  try {
    const isZip = /\.zip$/i.test(file.name) || file.type.includes("zip");
    if (isZip) {
      const entries = await readZipStore(await file.arrayBuffer());
      let n = 0;
      for (const ent of entries) {
        if (!ent.name.startsWith("models/") || !ent.name.endsWith(".json")) continue;
        const data2 = JSON.parse(ent.data);
        const mid = data2.modelId || ent.name.replace(/^models\//, "").replace(/\.json$/, "");
        if (!baselineStore.byModel[mid]) baselineStore.byModel[mid] = [];
        const bucket2 = baselineStore.byModel[mid];
        for (const s of data2.snapshots || []) {
          if (!s?.values) continue;
          bucket2.push({
            id: s.id || `imp-${Date.now()}-${n}`,
            name: s.name || "\u5BFC\u5165",
            values: s.values,
            ts: s.ts || Date.now()
          });
          n += 1;
        }
        while (bucket2.length > 8) bucket2.shift();
      }
      saveBaselines();
      renderBaselineSelect();
      showToast(`\u8BFE\u5802\u5305\u5BFC\u5165 ${n} \u4E2A\u5FEB\u7167`);
      return;
    }
    const text = await file.text();
    const data = JSON.parse(text);
    const snaps = Array.isArray(data?.snapshots) ? data.snapshots : Array.isArray(data) ? data : null;
    if (!snaps?.length) throw new Error("\u65E0 snapshots");
    const bucket = modelBaselineBucket();
    for (const s of snaps) {
      if (!s?.values) continue;
      bucket.push({
        id: s.id || `imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: s.name || "\u5BFC\u5165\u5FEB\u7167",
        values: s.values,
        ts: s.ts || Date.now()
      });
    }
    while (bucket.length > 8) bucket.shift();
    saveBaselines();
    const last = bucket[bucket.length - 1];
    if (last) activateBaseline(last);
    showToast(`\u5DF2\u5BFC\u5165 ${snaps.length} \u4E2A\u5BF9\u7167\u5FEB\u7167`);
  } catch (err) {
    showToast(`\u5BFC\u5165\u5931\u8D25: ${err.message || err}`);
  }
});
baselineSelect?.addEventListener("change", () => {
  const id = baselineSelect.value;
  if (!id) {
    baselineStore.activeId = null;
    app.globals.pinBaseline = false;
    updateHud({ snapshotPrev: true });
    return;
  }
  const slot = modelBaselineBucket().find((s) => s.id === id);
  if (slot) {
    activateBaseline(slot);
    showToast(`\u5BF9\u7167\u5207\u6362\uFF1A${slot.name}`);
  }
});
btnSafeRestore?.addEventListener("click", () => restoreSafeDefaults());
speedSlider.addEventListener("input", () => {
  app.globals.timeScale = Number(speedSlider.value) || 1;
  speedLabel.textContent = `${app.globals.timeScale.toFixed(1)}\xD7`;
  paramBench.refresh();
});
function rowMatchesFilter(row) {
  const tag = app.filter.tag;
  const formalism = app.filter.formalism;
  if (tag && row.domain !== tag && row.sub !== tag) return false;
  if (formalism && formalismFor(row) !== formalism) return false;
  const tokens = expandSearchQuery(app.filter.q);
  if (!tokens.length) return true;
  const hay = `${row.name || ""} ${row.id || ""} ${row.sub || ""} ${row.domain || ""} ${row.family || ""} ${row.formula || ""}`.toLowerCase();
  return tokens.some((token) => hay.includes(token));
}
function domainsForFilter() {
  const names = /* @__PURE__ */ new Set();
  for (const row of domainIndex) {
    if (rowMatchesFilter(row)) names.add(row.domain || "\u5176\u4ED6");
  }
  return [...names];
}
async function refreshSidebar() {
  if (app.filter.q.trim() || app.filter.tag || app.filter.formalism) {
    await loadIndex();
    const domains = domainsForFilter();
    await Promise.all(domains.map((domain) => loadDomain(domain)));
  }
  buildSidebar();
}
filterQ.addEventListener("input", () => {
  app.filter.q = filterQ.value;
  void refreshSidebar();
});
filterTag.addEventListener("change", () => {
  app.filter.tag = filterTag.value;
  void refreshSidebar();
});
filterFormalism?.addEventListener("change", () => {
  app.filter.formalism = filterFormalism.value;
  void refreshSidebar();
});
btnHc?.addEventListener("click", (e) => {
  e.preventDefault();
  document.documentElement.classList.toggle("hc");
  localStorage.setItem("physics-lab-hc", document.documentElement.classList.contains("hc") ? "1" : "0");
});
document.querySelector(".stage")?.addEventListener("click", (e) => {
  if (!isMobileDrawer()) return;
  if (e.target.closest("#btn-menu, #btn-params, .toolbar-actions, .tb-more")) return;
  if (sidebar.classList.contains("open")) setSidebarOpen(false);
});
sidebar.addEventListener("click", (e) => e.stopPropagation());
bench.addEventListener("click", (e) => e.stopPropagation());
function rubber(x, limit) {
  if (x >= 0) return x * 0.22;
  if (x < -limit) return -limit + (x + limit) * 0.28;
  return x;
}
function bindDrawerDrag(handle, panel, axis) {
  if (!handle || !panel) return;
  let start = 0;
  let base = 0;
  let dragging = false;
  let lastOffset = 0;
  const onStart = (e) => {
    if (!isMobileDrawer()) return;
    if (axis === "y" && !panel.classList.contains("open")) return;
    if (axis === "x" && !panel.classList.contains("open")) return;
    dragging = true;
    lastOffset = 0;
    panel.style.transition = "none";
    const pt = e.touches ? e.touches[0] : e;
    start = axis === "y" ? pt.clientY : pt.clientX;
    base = axis === "y" ? panel.getBoundingClientRect().height : panel.getBoundingClientRect().width;
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!dragging) return;
    const pt = e.touches ? e.touches[0] : e;
    if (axis === "y") {
      const dy = pt.clientY - start;
      const raw = base - dy;
      const minH = 140;
      const maxH = window.innerHeight * 0.9;
      let next = raw;
      if (raw < minH) next = minH + (raw - minH) * 0.25;
      if (raw > maxH) next = maxH + (raw - maxH) * 0.2;
      lastOffset = next;
      panel.style.height = `${next}px`;
      panel.style.transform = "translateY(0)";
    } else {
      const dx = pt.clientX - start;
      const x = rubber(dx, base);
      lastOffset = x;
      panel.style.transform = `translateX(${x}px)`;
    }
  };
  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), height 0.28s cubic-bezier(0.22, 1, 0.36, 1)";
    if (axis === "y") {
      const h = lastOffset || panel.getBoundingClientRect().height;
      if (h < window.innerHeight * 0.38) {
        setBenchOpen(false);
        panel.style.height = "";
      } else {
        panel.style.height = h < window.innerHeight * 0.58 ? "50vh" : "68vh";
      }
    } else if (lastOffset < -(base * 0.4)) {
      panel.style.transform = "translateX(-110%)";
      const finish = () => {
        panel.style.transition = "";
        panel.removeEventListener("transitionend", finish);
        setSidebarOpen(false);
      };
      panel.addEventListener("transitionend", finish);
    } else {
      panel.style.transform = "translateX(0)";
      const clear = () => {
        panel.style.transition = "";
        panel.removeEventListener("transitionend", clear);
      };
      panel.addEventListener("transitionend", clear);
    }
  };
  handle.addEventListener("mousedown", onStart);
  handle.addEventListener("touchstart", onStart, { passive: false });
  window.addEventListener("mousemove", onMove);
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("mouseup", onEnd);
  window.addEventListener("touchend", onEnd);
}
bindDrawerDrag(benchDrag, bench, "y");
bindDrawerDrag(sidebarDrag, sidebar, "x");
document.addEventListener("imm-palettes", () => {
  if (app.model && canvasWrap) paintFrame();
});
window.addEventListener("resize", () => {
  const chassis = document.getElementById("chassis");
  chassis?.classList.remove("shell-sidebar-overlay");
  if (!isCompact()) {
    const collapsed = localStorage.getItem("physics-lab-bench-collapsed") === "1";
    bench.classList.add("open");
    bench.style.transform = "";
    bench.style.height = "";
    chassis?.classList.toggle("bench-collapsed", collapsed);
  } else {
    chassis?.classList.remove("bench-collapsed");
    if (localStorage.getItem(AUTO_OPEN_BENCH_KEY) !== "1") {
      setBenchOpen(false);
    }
  }
  if (isProjectorShell() || !isMobileDrawer()) {
    sidebar.classList.remove("open");
    sidebar.style.transform = "";
  }
  syncDrawerChrome();
  measureSysSticky();
  if (canvas && canvasWrap) {
    if (app.model) {
      paintFrame();
      requestAnimationFrame(() => paintFrame());
    } else resizeCanvas(canvas, canvasWrap);
  }
});
window.__labCapture = {
  canvasPng: () => {
    paintFrame({ forceDpr: 2 });
    const url = document.getElementById("canvas").toDataURL("image/png");
    paintFrame();
    return url;
  },
  composedPng: (framed, withReadouts, withLegend = false) => {
    paintFrame({ forceDpr: 2 });
    const url = composeExport(document.getElementById("canvas"), {
      framed: !!framed,
      readouts: withReadouts ? app.lastReadouts : null,
      legend: !!withLegend,
      modelId: app.model?.id
    }).toDataURL("image/png");
    paintFrame();
    return url;
  },
  // Return the promise so Playwright can await ensureId + init; callers that only
  // care about the visible model should also wait on getModelId().
  switchModel: (id) => Promise.resolve(switchModel(id)),
  enterMicroscope3d: () => {
    microUi?.enter?.();
  },
  getModelId: () => app.model?.id,
  paintFrame: () => {
    paintFrame();
  },
  loadDomain: (domain) => loadDomain(domain),
  pause: () => {
    if (!app.paused) {
      app.paused = true;
      syncPauseUi();
    }
  },
  play: () => {
    if (app.paused) {
      app.paused = false;
      syncPauseUi();
    }
  },
  getReadouts: () => app.lastReadouts,
  getState: () => app.state,
  getGlobals: () => ({ ...app.globals }),
  getParams: () => ({ ...app.state?.params }),
  setParam: (key, value) => {
    if (!app.state?.params) return;
    app.state.params[key] = value;
    applyParamChange(key);
  },
  setGlobals: (partial) => {
    Object.assign(app.globals, partial || {});
    sanitizeGlobals(app.globals);
    applyGlobals();
    paramBench.refresh?.();
  },
  isPaused: () => !!app.paused,
  snapshotReadouts: () => updateHud({ snapshotPrev: true }),
  restoreSafeDefaults: () => restoreSafeDefaults(),
  getCapabilities: () => deriveCapabilities(app.model),
  getModel: () => app.model,
  runAction: (actionId) => {
    if (typeof app.model?.runAction !== "function") return false;
    const ok = app.model.runAction(app.state, actionId);
    if (ok) {
      if (app.state?._resumeApp) {
        app.state._resumeApp = false;
        if (app.paused) {
          app.paused = false;
          syncPauseUi();
        }
      }
      paintFrame();
      updateHud({ flash: true });
    }
    return ok;
  },
  saveBaseline: (name) => saveBaselineSnapshot(name)
};
function bindCanvasPointer() {
  let dragging = false;
  const toLocal = (e) => {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / Math.max(r.width, 1) / (window.devicePixelRatio || 1);
    return {
      x: (e.clientX - r.left) / r.width * (canvas.width / (window.devicePixelRatio || 1)),
      y: (e.clientY - r.top) / r.height * (canvas.height / (window.devicePixelRatio || 1))
    };
  };
  const pt = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    if (typeof app.model?.onPointer !== "function") return;
    const p = pt(e);
    const handled = app.model.onPointer(app.state, {
      type: "down",
      x: p.x,
      y: p.y,
      button: e.button,
      altKey: !!e.altKey,
      shiftKey: !!e.shiftKey
    });
    if (handled) {
      dragging = true;
      canvas.setPointerCapture?.(e.pointerId);
      e.preventDefault();
      paintFrame();
      paramBench.refresh?.();
      updateHud({ flash: true });
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging || typeof app.model?.onPointer !== "function") return;
    const p = pt(e);
    if (app.model.onPointer(app.state, {
      type: "move",
      x: p.x,
      y: p.y,
      button: e.button,
      altKey: !!e.altKey,
      shiftKey: !!e.shiftKey
    })) {
      paintFrame();
      paramBench.refresh?.();
      updateHud({ flash: true });
    }
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    const p = pt(e);
    app.model?.onPointer?.(app.state, {
      type: "up",
      x: p.x,
      y: p.y,
      button: e.button,
      altKey: !!e.altKey,
      shiftKey: !!e.shiftKey
    });
    paintFrame();
    paramBench.refresh?.();
    updateHud({ flash: true });
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  void toLocal;
}
function syncChromeI18n() {
  applyDomI18n();
  btnMenu.innerHTML = iconOnly("menu");
  btnMenu.setAttribute("aria-label", t("ui.openMenu"));
  btnReset.innerHTML = btnHtml("reset", t("ui.rerun"));
  btnReset.title = t("ui.rerunTitle");
  btnReset.setAttribute("aria-label", t("ui.rerun"));
  btnShot.innerHTML = btnHtml("cam", "png");
  btnCsv.innerHTML = btnHtml("csv", "csv");
  const compact = isCompact();
  const benchCollapsed = document.getElementById("chassis")?.classList.contains("bench-collapsed");
  const paramsLbl = compact ? t("ui.params") : benchCollapsed ? t("ui.params") : t("ui.paramsCollapse");
  btnParams.innerHTML = btnHtml("params", paramsLbl);
  btnParams.title = t("ui.paramsTitle");
  btnCloseBench.innerHTML = btnHtml("close", t("ui.close"));
  if (btnSafeRestore) {
    btnSafeRestore.textContent = t("ui.safeRestore");
  }
  if (shellHintEl && !shellHintEl.textContent.trim()) {
    shellHintEl.textContent = t("ui.hintDefault");
  }
  const opt0 = baselineSelect?.querySelector('option[value=""]');
  if (opt0) opt0.textContent = t("ui.baselineCurrent");
}
function applyActiveShell(id) {
  if (microUi?.applyShellId(id)) return;
  activeShellId = id;
  const chassis = document.getElementById("chassis");
  chassis?.classList.remove("shell-sidebar-overlay");
  sidebar.classList.remove("open");
  sidebar.style.transform = "";
  const shell = applyShell(id, {
    onHideSidebar: (hide) => {
      const el = document.getElementById("chassis");
      el?.classList.toggle("shell-hide-sidebar", hide);
      el?.classList.remove("shell-sidebar-overlay");
      if (hide) setSidebarOpen(false);
    }
  });
  microUi?.sync(false);
  if (shell.modelId && app.model?.id !== shell.modelId) {
    switchModel(shell.modelId, { skipShellSync: true });
  }
  syncDrawerChrome();
  if (canvas && canvasWrap) {
    if (app.model) {
      paintFrame();
      requestAnimationFrame(() => paintFrame());
    } else resizeCanvas(canvas, canvasWrap);
  }
}
function fillShellSelectOptions(el, { microOnly = false } = {}) {
  if (!el) return;
  el.innerHTML = "";
  if (microOnly || microUi?.isMicroscopeShell?.()) {
    const opt = document.createElement("option");
    opt.value = "lab-classic";
    opt.textContent = t("ui.microExit");
    opt.selected = true;
    el.appendChild(opt);
    el.setAttribute("aria-label", t("ui.microExit"));
    return;
  }
  const current = activeShellId || resolveShellId();
  for (const s of listShells()) {
    if (s.id === "lab-microscope3d") continue;
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.label;
    opt.title = s.description;
    if (s.id === current) opt.selected = true;
    el.appendChild(opt);
  }
  el.setAttribute("aria-label", "shell");
}
function mountShellSelect(el) {
  if (!el) return;
  const current = resolveShellId();
  fillShellSelectOptions(el, { microOnly: current === "lab-microscope3d" });
  if (!el.dataset.bound) {
    el.dataset.bound = "1";
    el.addEventListener("change", () => {
      const id = el.value;
      persistShellId(id);
      applyActiveShell(id);
      const url = new URL(location.href);
      url.searchParams.set("shell", id);
      history.replaceState(null, "", url);
      requestAnimationFrame(measureSysSticky);
    });
  }
  applyActiveShell(current);
}
async function boot() {
  if (localStorage.getItem("physics-lab-hc") === "1") {
    document.documentElement.classList.add("hc");
  }
  if (!isCompact() && localStorage.getItem("physics-lab-bench-collapsed") === "1") {
    document.getElementById("chassis")?.classList.add("bench-collapsed");
  } else {
    document.getElementById("chassis")?.classList.remove("bench-collapsed");
  }
  async function focusCatalogModel(id, loc = { domain: "\u7269\u7406", sub: "\u5149\u5B66" }) {
    const folds = loadFolds();
    folds[foldKey(loc.domain)] = true;
    folds[foldKey(loc.domain, loc.sub)] = true;
    saveFolds(folds);
    const tryLoad = async () => {
      try {
        await loadDomain(loc.domain);
        return true;
      } catch (err) {
        console.warn("focusCatalogModel loadDomain", err);
        return false;
      }
    };
    if (!models.some((model) => model.id === id)) {
      let ok = await tryLoad();
      if (!ok || !models.some((model) => model.id === id)) {
        showToast(`Catalog load failed for ${loc.domain} \u2014 retrying\u2026`);
        ok = await tryLoad();
        if (!ok || !models.some((model) => model.id === id)) {
          showToast(`Could not load ${loc.domain}; open the sidebar and expand it manually`);
        }
      }
    }
    const lang = getLocale();
    if (lang !== "zh") {
      await ensureCatalogGloss(lang);
      await ensureSidebarLocales();
    }
    paintSidebar();
    syncSidebarActive();
    const openFolds = () => {
      const domainEl = modelListEl?.querySelector(`.domain-group[data-domain="${loc.domain}"]`);
      if (!(domainEl instanceof HTMLDetailsElement)) return;
      domainEl.open = true;
      for (const subEl of domainEl.querySelectorAll("details.sub-group")) {
        const name = subEl.querySelector(".sub-name")?.dataset.sub || subEl.querySelector(".sub-name")?.textContent || "";
        if (name === loc.sub) subEl.open = true;
      }
    };
    openFolds();
    await Promise.resolve();
    if (lang !== "zh") await ensureSidebarLocales();
    paintSidebar();
    syncSidebarActive();
    openFolds();
    const btn = modelListEl?.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (btn) {
      btn.classList.add("active");
      btn.setAttribute("aria-current", "page");
    }
    const settle = () => {
      const current = modelListEl?.querySelector(`[data-id="${CSS.escape(id)}"]`);
      if (current) revealCatalogButton(current);
    };
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    settle();
    await new Promise((resolve) => setTimeout(resolve, 320));
    settle();
  }
  microUi = createMicroscopeChrome({
    t,
    getActiveShellId: () => activeShellId,
    setActiveShellId: (id) => {
      activeShellId = id;
    },
    getModelId: () => app.model?.id,
    getState: () => app.state,
    switchModel,
    paintFrame: () => {
      if (app.model && canvasWrap) paintFrame({ skipMicroRefresh: false });
    },
    setSidebarOpen,
    setBenchOpen,
    syncPauseUi,
    syncDrawerChrome,
    resetSim,
    setPaused: (paused) => {
      app.paused = paused;
    },
    focusCatalogModel,
    onOpticsChange: () => {
      updateHud({ flash: true });
      paramBench.refresh?.();
    },
    remountShellSelect: ({ microOnly } = {}) => {
      fillShellSelectOptions(document.getElementById("shell-select"), { microOnly });
    },
    captureWebglPng: () => {
      const gl = document.getElementById("canvas-webgl");
      if (!gl || gl.hidden) return;
      const rect = canvasWrap.getBoundingClientRect();
      const view = {
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
        dpr: Number(document.documentElement.dataset.dprCap) || 2.5,
        scale: app.globals.viewScale,
        showVectors: app.globals.showVectors,
        showTrail: app.globals.showTrail,
        showAxes: app.globals.showAxes
      };
      const stage = ensureWebglStage();
      try {
        const href = typeof stage?.capturePng === "function" ? stage.capturePng(app.state, view) : (paintFrame({ skipMicroRefresh: true }), gl.toDataURL("image/png"));
        if (!href || href === "data:,") {
          showToast("WebGL capture failed");
          return;
        }
        const a = document.createElement("a");
        a.download = `microscope-${Date.now()}.png`;
        a.href = href;
        a.click();
      } catch (err) {
        console.warn("webgl png", err);
        showToast("WebGL capture failed");
      }
    }
  });
  microUi.bind();
  mountShellSelect(document.getElementById("shell-select"));
  mountLocaleSelect(document.getElementById("locale-select"));
  await bootI18n();
  syncChromeI18n();
  microUi.sync(microUi.isMicroscopeShell());
  onLocaleChange(() => {
    syncChromeI18n();
    microUi?.sync(microUi.isMicroscopeShell());
    buildSidebar();
    if (app.model) {
      const view = localizeModel2(app.model);
      toolbarTitle.textContent = view.name;
      microUi?.setTitle(view.name);
      metaFormula.textContent = [view.formula, view.description].filter(Boolean).join("\n");
    }
    paramBench.refresh?.();
    updateShellStrip();
    if (app.model && canvas && canvasWrap) paintFrame();
    syncPauseUi();
    syncDrawerChrome();
  });
  await loadIndex();
  const pinned = readModelIdFromUrl() || readModelIdFromStorage();
  if (pinned) {
    if (!await ensureId(pinned)) await primeHandModel(DEFAULT_MODEL_ID);
  } else {
    await primeHandModel(DEFAULT_MODEL_ID);
  }
  try {
    const loadIndexMs = performance.measure("boot-loadIndex", "boot-loadIndex-start", "boot-loadIndex-end").duration;
    let ensureIdMs = null;
    let loadDomainMs = null;
    try {
      ensureIdMs = performance.measure("boot-ensureId", "boot-ensureId-start", "boot-ensureId-end").duration;
    } catch {
    }
    try {
      loadDomainMs = performance.measure("boot-loadDomain", "boot-loadDomain-start", "boot-loadDomain-end").duration;
    } catch {
    }
    window.__bootMarks = { ...window.__bootMarks || {}, loadIndexMs, ensureIdMs, loadDomainMs };
  } catch {
    window.__bootMarks = window.__bootMarks || {};
  }
  populateTagFilter();
  populateFormalismFilter();
  populateUserModelFamilies();
  bindUserModelUi();
  applyGlobals();
  syncPauseUi();
  buildSidebar();
  await palettesReady;
  const fromUrl = readModelIdFromUrl();
  const wantShell = resolveShellId();
  const shellDef = getShell(wantShell);
  const initialId = resolveInitialModelId();
  if (shellDef?.modelId) await ensureId(shellDef.modelId);
  else if (initialId && initialId !== DEFAULT_MODEL_ID) await ensureId(initialId);
  switchModel(initialId);
  if (shellDef?.modelId) microUi?.applyShellId(wantShell);
  if (fromUrl && !shellDef?.modelId) {
    const activeRow = domainIndex.find((row) => row.id === fromUrl);
    if (activeRow) {
      await focusCatalogModel(fromUrl, { domain: activeRow.domain || "\u5176\u4ED6", sub: activeRow.sub || "" });
    }
  }
  if (!isCompact()) bench.classList.add("open");
  bindCanvasPointer();
  syncDrawerChrome();
  requestAnimationFrame(frame);
}
function populateUserModelFamilies() {
  if (!userModelFamily) return;
  userModelFamily.innerHTML = "";
  for (const fam of USER_MODEL_FAMILIES.sort()) {
    const opt = document.createElement("option");
    opt.value = fam;
    const meta = FAMILY_META[fam];
    opt.textContent = meta?.formalism ? `${fam} \xB7 ${meta.formalism}` : fam;
    userModelFamily.appendChild(opt);
  }
}
function showUserModelError(msg) {
  if (!userModelError) return;
  userModelError.replaceChildren();
  if (!msg) {
    userModelError.hidden = true;
    return;
  }
  userModelError.hidden = false;
  const text = String(msg);
  const hit = text.match(/未命中主题键「([^」]+)」/);
  userModelError.append(document.createTextNode(text));
  if (!hit) return;
  const key = hit[1];
  const spaced = key.includes(" \xB7 ") ? key : key.replace("\xB7", " \xB7 ");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn quiet topic-miss-search";
  btn.textContent = spaced;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(spaced);
    } catch {
    }
    if (filterQ) {
      filterQ.value = spaced;
      filterQ.focus();
    }
    app.filter.q = spaced;
    buildSidebar();
  });
  userModelError.append(document.createTextNode(" "));
  userModelError.append(btn);
}
function renderUserModelList() {
  const ul = document.getElementById("user-model-list");
  if (!ul) return;
  ul.innerHTML = "";
  const specs = loadUserSpecs();
  if (!specs.length) {
    const li = document.createElement("li");
    li.textContent = t("dialog.empty");
    ul.appendChild(li);
    return;
  }
  for (const spec of specs) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = spec.name;
    name.title = spec.name;
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "btn quiet";
    edit.textContent = "\u7F16\u8F91";
    edit.addEventListener("click", () => fillUserModelForm(spec));
    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn quiet";
    del.textContent = "\u5220\u9664";
    del.addEventListener("click", async () => {
      deleteUserSpec(spec.id);
      await rebuildModels();
      buildSidebar();
      renderUserModelList();
      if (app.model?.id === spec.id) switchModel("free-fall");
      showToast(`\u5DF2\u5220\u9664 \xB7 ${spec.name}`);
    });
    li.append(name, edit, del);
    ul.appendChild(li);
  }
}
function fillUserModelForm(spec) {
  if (!userModelForm) return;
  userModelForm.dataset.editId = spec?.id || "";
  const set = (name, value) => {
    const el = userModelForm.elements.namedItem(name);
    if (el && "value" in el) el.value = value ?? "";
  };
  if (!spec) {
    userModelForm.reset();
    const ethics = userModelForm.elements.namedItem("ethicsOk");
    if (ethics) ethics.checked = false;
  } else {
    set("name", spec.name);
    set("domain", spec.domain);
    set("sub", spec.sub);
    set("family", spec.family);
    set("formula", spec.formula);
    set("authority", spec.authority);
    set("assumptions", spec.assumptions);
    set("description", spec.description);
    set("fidelity", spec.fidelity || "engineering");
    const ethics = userModelForm.elements.namedItem("ethicsOk");
    if (ethics) ethics.checked = true;
  }
  const submit = document.getElementById("user-model-submit");
  if (submit) submit.textContent = spec?.id ? "\u4FDD\u5B58\u4FEE\u6539" : "\u521B\u5EFA\u5E76\u8F7D\u5165";
  showUserModelError("");
}
async function reloadAfterUserModels(id, toast) {
  await rebuildModels();
  populateTagFilter();
  populateFormalismFilter();
  buildSidebar();
  renderUserModelList();
  if (id) {
    userModelDialog?.close();
    switchModel(id);
    setSidebarOpen(false);
  }
  if (toast) showToast(toast);
}
function bindUserModelUi() {
  btnUserModel?.addEventListener("click", () => {
    fillUserModelForm(null);
    renderUserModelList();
    userModelDialog?.showModal();
  });
  document.getElementById("user-model-submit")?.addEventListener("click", async () => {
    if (!userModelForm) return;
    if (!userModelForm.reportValidity()) return;
    const fd = new FormData(userModelForm);
    const draft = {
      name: fd.get("name"),
      domain: fd.get("domain"),
      sub: fd.get("sub"),
      family: fd.get("family"),
      formula: fd.get("formula"),
      authority: fd.get("authority"),
      assumptions: fd.get("assumptions"),
      description: fd.get("description"),
      fidelity: fd.get("fidelity"),
      ethicsOk: fd.get("ethicsOk") === "on"
    };
    const keepId = userModelForm.dataset.editId || "";
    const checked = validateUserModelDraft(draft, keepId ? { keepId } : {});
    if (!checked.ok) {
      showUserModelError(checked.error);
      showToast(checked.error);
      return;
    }
    showUserModelError("");
    showToast(t("dialog.validOk") || "Validation passed");
    persistUserSpec(checked.spec);
    await reloadAfterUserModels(
      checked.spec.id,
      keepId ? `\u5DF2\u66F4\u65B0\u81EA\u5EFA\u6A21\u578B \xB7 ${checked.spec.name}` : `\u5DF2\u521B\u5EFA\u81EA\u5EFA\u6A21\u578B \xB7 ${checked.spec.name}`
    );
  });
  document.getElementById("user-model-export")?.addEventListener("click", () => {
    const blob = new Blob([exportUserSpecsJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "immspfee-user-models.json";
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("\u5DF2\u5BFC\u51FA\u81EA\u5EFA\u6A21\u578B JSON");
  });
  const fileInput = document.getElementById("user-model-file");
  document.getElementById("user-model-import")?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    const parsed = parseUserSpecsImport(await file.text());
    if (!parsed.ok) {
      showUserModelError(parsed.error);
      showToast(parsed.error);
      return;
    }
    mergeImportedSpecs(parsed.specs);
    const warn = parsed.rejected?.length ? `\uFF0C\u62D2\u7EDD ${parsed.rejected.length} \u6761` : "";
    await reloadAfterUserModels(parsed.specs[0].id, `\u5DF2\u5BFC\u5165 ${parsed.specs.length} \u6761${warn}`);
  });
}
boot();
