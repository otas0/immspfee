// js/utils/mobilePerf.js
var HEAVY_MODEL_IDS = /* @__PURE__ */ new Set([
  "mandelbrot-julia",
  "heat-2d",
  "membrane-2d",
  "collision-2d",
  "sph-simple",
  "interference",
  "diffraction",
  "single-slit",
  "life",
  "heat",
  "lorenz",
  "rossler",
  "ideal-gas",
  "entropy-mix",
  "bohr"
]);
var POWER_SAVER_KEY = "physics-lab-power-saver";
function powerSaverEnabled() {
  try {
    if (typeof document !== "undefined" && document.documentElement?.dataset?.powerSaver === "1") {
      return true;
    }
    return localStorage.getItem(POWER_SAVER_KEY) === "1";
  } catch {
    return false;
  }
}
function setPowerSaver(on) {
  try {
    localStorage.setItem(POWER_SAVER_KEY, on ? "1" : "0");
    if (typeof document !== "undefined") {
      document.documentElement.dataset.powerSaver = on ? "1" : "0";
    }
  } catch {
  }
}
function viewportTier() {
  if (typeof matchMedia !== "function") return "desktop";
  if (matchMedia("(max-height: 500px) and (max-width: 1100px)").matches) return "phone";
  if (matchMedia("(max-width: 900px)").matches) return "phone";
  if (matchMedia("(max-width: 1100px)").matches) return "tablet";
  return "desktop";
}
function isCompactViewport() {
  return viewportTier() !== "desktop";
}
function isPhoneViewport() {
  return viewportTier() === "phone";
}
function budgetFor(tier) {
  if (tier === "phone") {
    return {
      maxSubSteps: 8,
      mandelStep: 6,
      mandelIterCap: 48,
      fieldNCap: 24,
      particleNCap: 64,
      interferenceCols: 32,
      interferenceRows: 20,
      heatNCap: 96,
      lifeNCap: 48,
      lifeMaxGens: 1,
      microDprCap: 1.75,
      microTess: 0.55,
      trailCap: 400,
      hudMinMs: 125
    };
  }
  if (tier === "tablet") {
    return {
      maxSubSteps: 16,
      mandelStep: 4,
      mandelIterCap: 72,
      fieldNCap: 32,
      particleNCap: 80,
      interferenceCols: 48,
      interferenceRows: 28,
      heatNCap: 128,
      lifeNCap: 64,
      lifeMaxGens: 2,
      microDprCap: 2,
      microTess: 0.72,
      trailCap: 700,
      hudMinMs: 100
    };
  }
  return {
    maxSubSteps: 48,
    mandelStep: 3,
    mandelIterCap: 120,
    fieldNCap: 48,
    particleNCap: 120,
    interferenceCols: 64,
    interferenceRows: 40,
    heatNCap: 256,
    lifeNCap: 128,
    lifeMaxGens: 8,
    microDprCap: 3,
    microTess: 1,
    trailCap: 1400,
    hudMinMs: 0
  };
}
function mobileBudget(tier = viewportTier()) {
  if (tier === "desktop" && powerSaverEnabled()) return budgetFor("tablet");
  return budgetFor(tier);
}
function isHeavyModel(id) {
  return !!(id && HEAVY_MODEL_IDS.has(id));
}
function perfClassFor(id) {
  return isHeavyModel(id) ? "heavy" : "normal";
}
function particleHashCell(n) {
  const count = Math.max(4, Number(n) || 40);
  return Math.max(0.05, Math.min(0.12, 0.7 / Math.sqrt(count)));
}
function pushTrail(trail, point, maxLen) {
  const cap = Math.max(8, Math.floor(maxLen ?? mobileBudget().trailCap));
  trail.push(point);
  if (trail.length > cap) trail.splice(0, trail.length - cap);
  return trail;
}
function createRingTrail(cap) {
  const n = Math.max(8, Math.floor(cap ?? mobileBudget().trailCap));
  return { buf: new Array(n), head: 0, len: 0, cap: n };
}
function ensureRingCap(ring, cap) {
  const n = Math.max(8, Math.floor(cap ?? mobileBudget().trailCap));
  if (!ring?.buf) return createRingTrail(n);
  if (ring.cap === n) return ring;
  const pts = [];
  ringForEach(ring, (p) => pts.push(p));
  const next = createRingTrail(n);
  const start = Math.max(0, pts.length - n);
  for (let i = start; i < pts.length; i += 1) ringPush(next, pts[i]);
  return next;
}
function ringPush(ring, point) {
  if (!ring?.buf?.length) return ring;
  ring.buf[ring.head] = point;
  ring.head = (ring.head + 1) % ring.cap;
  if (ring.len < ring.cap) ring.len += 1;
  return ring;
}
function ringForEach(ring, fn) {
  if (!ring?.len) return;
  const start = ring.len < ring.cap ? 0 : ring.head;
  for (let i = 0; i < ring.len; i += 1) {
    fn(ring.buf[(start + i) % ring.cap], i);
  }
}
function ringLast(ring) {
  if (!ring?.len) return null;
  return ring.buf[(ring.head - 1 + ring.cap) % ring.cap];
}

export {
  powerSaverEnabled,
  setPowerSaver,
  viewportTier,
  isCompactViewport,
  isPhoneViewport,
  mobileBudget,
  isHeavyModel,
  perfClassFor,
  particleHashCell,
  pushTrail,
  createRingTrail,
  ensureRingCap,
  ringPush,
  ringForEach,
  ringLast
};
