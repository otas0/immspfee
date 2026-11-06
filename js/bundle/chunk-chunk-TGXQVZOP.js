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
function objectiveRingColor(mag) {
  if (mag <= 4) return { rgb: [0.92, 0.18, 0.16], hex: "#eb2e29", name: "red" };
  if (mag <= 10) return { rgb: [0.95, 0.82, 0.12], hex: "#f2d11f", name: "yellow" };
  if (mag <= 40) return { rgb: [0.25, 0.62, 0.95], hex: "#3f9ef2", name: "light blue" };
  return { rgb: [0.94, 0.94, 0.96], hex: "#f0f0f5", name: "white" };
}
var OBJECTIVE_RING_LEGEND = OBJECTIVES.map((o) => ({
  mag: o.mag,
  id: o.id,
  ...objectiveRingColor(o.mag)
}));
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

export {
  createFixedStepper,
  velocityVerlet1D,
  OBJECTIVES,
  EYEPIECES,
  objectiveRingColor,
  OBJECTIVE_RING_LEGEND,
  opticsFromParams,
  applyTurretDefaults,
  DEFAULT_PARAMS,
  PARAM_SCHEMA
};
