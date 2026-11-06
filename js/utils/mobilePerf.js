/**
 * Mobile / tablet paint & step budgets.
 * Keeps phone/tablet from spending a full desktop maxSubSteps × O(n²) frame.
 */

/** Models that should auto-pause on compact viewports (CPU/GPU heavy). */
export const HEAVY_MODEL_IDS = new Set([
  'mandelbrot-julia',
  'heat-2d',
  'membrane-2d',
  'collision-2d',
  'sph-simple',
  'interference',
  'diffraction',
  'single-slit',
  'life',
  'heat',
  'lorenz',
  'rossler',
  'ideal-gas',
  'entropy-mix',
  'r018-玻尔模型',
]);

/**
 * @returns {'phone' | 'tablet' | 'desktop'}
 */
export function viewportTier() {
  if (typeof matchMedia !== 'function') return 'desktop';
  // Short landscape phones count as phone (canvas height is the scarce resource).
  if (matchMedia('(max-height: 500px) and (max-width: 1100px)').matches) return 'phone';
  if (matchMedia('(max-width: 900px)').matches) return 'phone';
  if (matchMedia('(max-width: 1100px)').matches) return 'tablet';
  return 'desktop';
}

export function isCompactViewport() {
  return viewportTier() !== 'desktop';
}

export function isPhoneViewport() {
  return viewportTier() === 'phone';
}

/**
 * @param {'phone' | 'tablet' | 'desktop'} [tier]
 */
export function mobileBudget(tier = viewportTier()) {
  if (tier === 'phone') {
    return {
      maxSubSteps: 8,
      mandelStep: 6,
      mandelIterCap: 48,
      fieldNCap: 24,
      // Spatial hash lets phones run more particles than the old O(N²) cap of 40.
      particleNCap: 64,
      interferenceCols: 32,
      interferenceRows: 20,
      heatNCap: 96,
      lifeNCap: 48,
      lifeMaxGens: 1,
      microDprCap: 1.75,
      trailCap: 400,
      hudMinMs: 125,
    };
  }
  if (tier === 'tablet') {
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
      trailCap: 700,
      hudMinMs: 100,
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
    trailCap: 1400,
    hudMinMs: 0,
  };
}

export function isHeavyModel(id) {
  return !!(id && HEAVY_MODEL_IDS.has(id));
}

export function perfClassFor(id) {
  return isHeavyModel(id) ? 'heavy' : 'normal';
}

/**
 * Append to a trail without O(n) shift-per-step when over capacity.
 * @param {unknown[]} trail
 * @param {unknown} point
 * @param {number} [maxLen]
 */
export function pushTrail(trail, point, maxLen) {
  const cap = Math.max(8, Math.floor(maxLen ?? mobileBudget().trailCap));
  trail.push(point);
  if (trail.length > cap) trail.splice(0, trail.length - cap);
  return trail;
}

/**
 * True ring buffer (head index) for high-churn trails (lorenz / rossler).
 * @param {number} [cap]
 */
export function createRingTrail(cap) {
  const n = Math.max(8, Math.floor(cap ?? mobileBudget().trailCap));
  return { buf: new Array(n), head: 0, len: 0, cap: n };
}

/**
 * @param {{ buf: unknown[], head: number, len: number, cap: number }} ring
 * @param {unknown} point
 */
export function ringPush(ring, point) {
  if (!ring?.buf?.length) return ring;
  ring.buf[ring.head] = point;
  ring.head = (ring.head + 1) % ring.cap;
  if (ring.len < ring.cap) ring.len += 1;
  return ring;
}

/**
 * @param {{ buf: unknown[], head: number, len: number, cap: number }} ring
 * @param {(point: unknown, i: number) => void} fn
 */
export function ringForEach(ring, fn) {
  if (!ring?.len) return;
  const start = ring.len < ring.cap ? 0 : ring.head;
  for (let i = 0; i < ring.len; i += 1) {
    fn(ring.buf[(start + i) % ring.cap], i);
  }
}

/**
 * @param {{ buf: unknown[], head: number, len: number, cap: number }} ring
 */
export function ringLast(ring) {
  if (!ring?.len) return null;
  return ring.buf[(ring.head - 1 + ring.cap) % ring.cap];
}
