/**
 * 固定时间步长累加器循环，保证物理积分稳定、与帧率无关。
 */
export function createFixedStepper(fixedDt = 1 / 240, maxSubSteps = 48) {
  let accumulator = 0;
  let dt = fixedDt;
  let maxSteps = maxSubSteps;

  return {
    get fixedDt() { return dt; },
    get maxSubSteps() { return maxSteps; },
    setFixedDt(next) {
      const v = Number(next);
      if (Number.isFinite(v) && v > 0) dt = v;
    },
    setMaxSubSteps(next) {
      const v = Math.floor(Number(next));
      if (Number.isFinite(v) && v >= 1) maxSteps = v;
    },
    reset() { accumulator = 0; },
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
    },
  };
}

export function semiImplicitEuler(pos, vel, acc, dt) {
  const v = vel + acc * dt;
  const p = pos + v * dt;
  return { pos: p, vel: v };
}

export function velocityVerlet1D(x, v, a, aAt, dt) {
  const xNext = x + v * dt + 0.5 * a * dt * dt;
  const aNext = aAt(xNext);
  const vNext = v + 0.5 * (a + aNext) * dt;
  return { x: xNext, v: vNext, a: aNext };
}
