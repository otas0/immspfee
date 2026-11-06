/**
 * 按条目名称/公式积分教科书关系。
 * 工厂里原先大量条目共用正弦或落体，与概念不符；这里改成该主题的标准方程。
 * 假设写在 assumptions。敏感族只用公开定义式。
 */
import { overrideOptions } from './topicOverrides.js';
import { drawTopicSketch } from './sketches.js';
import { formatNum } from '../utils/draw.js';
// designCaveatText stays in designCaveat.js for audits — never paint on canvas
// (AGENTS: no on-stage assumption / caveat chrome).
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

const S = (label, group, unit, min, max) => ({ label, group, unit, min, max });

function spd() {
  return S('动画速', 'dynamics', '—', 0.1, 8);
}

function thicken(params, paramSchema) {
  if (Object.keys(paramSchema).length >= 4) return;
  if (!paramSchema.t0) {
    params.t0 = params.t0 ?? 0;
    paramSchema.t0 = S('t₀', 'initial', 's', 0, 60);
  }
  if (Object.keys(paramSchema).length >= 4) return;
  if (!paramSchema.plotScale) {
    params.plotScale = params.plotScale ?? 1;
    paramSchema.plotScale = S('作图比例', 'display', '—', 0.2, 5);
  }
}

function shell(spec, o) {
  const params = { speed: 1, ...(o.params || {}) };
  const paramSchema = { speed: spd(), ...(o.schema || {}) };
  thicken(params, paramSchema);
  const equation = o.equation || spec.formula || '';
  return {
    id: spec.id,
    name: spec.name,
    tags: [spec.domain, spec.sub].filter(Boolean),
    formula: equation,
    description: spec.description || '',
    sub: spec.sub || '',
    topicBound: true,
    deprecated: false,
    authority: o.authority,
    assumptions: o.assumptions,
    fidelity: o.fidelity || 'engineering',
    params,
    paramSchema,
    init(state) {
      state.t = 0;
      state.hist = [];
      o.init?.(state);
      this.step(state, 0);
      // First paint needs ≥2 hist samples for the stroke; init only steps once.
      // Duplicate the init ordinate so steady factory models (e.g. Manning V)
      // are not title-only until the second RAF — avoids soft-paint open-channel.
      if (state.hist.length === 1) state.hist.push(state.hist[0]);
    },
    step(state, dt) {
      const sp = Math.min(8, Math.max(0.05, P(state.params, 'speed', 1)));
      const h = dt > 0 ? dt * sp : 0;
      state.t += h;
      const clock = state.t;
      state.t = clock + P(state.params, 't0', 0);
      o.tick(state, h);
      state.t = clock;
      let y = Number(o.plot(state));
      if (paramSchema.plotScale) y *= P(state.params, 'plotScale', 1);
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
      ctx.fillStyle = C.muted || '#888';
      ctx.font = '600 13px IBM Plex Mono, monospace';
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
      ctx.strokeStyle = C.body || '#fff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      hist.forEach((v, i) => {
        const x = l + (i / (hist.length - 1)) * (r - l);
        const y = b - ((v - lo) / (hi - lo)) * (b - t);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      const rows = [...(o.rows(state, d) || [])];
      // Surface dynamics knobs so topic readouts track editable params (no-fake-data).
      for (const [k, meta] of Object.entries(paramSchema || {})) {
        if (k === 'speed' || meta?.group === 'display' || meta?.group === 'initial') continue;
        if (typeof state.params?.[k] !== 'number') continue;
        if (rows.some((r) => r[0] === k)) continue;
        rows.push([k, state.params[k], meta.unit || '']);
      }
      return rows.map(([label, val, unit]) => ({
        label,
        value: typeof val === 'string'
          ? val
          : `${formatNum(Number(val), d)}${unit ? ` ${unit}` : ''}`,
      }));
    },
    getTrajectory(state) {
      return (state.hist || []).map((v, i) => ({ i, v }));
    },
  };
}

function radiationKind(w) {
  const x = Number(w);
  if (Math.abs(x - 1) < 1e-6) return '光子/电子';
  if (Math.abs(x - 2) < 1e-6) return '质子';
  if (Math.abs(x - 20) < 1e-6) return 'α 粒子';
  return '中子（w_R 随能量）';
}

function has(topic, re) {
  return re.test(topic || '');
}

function kin(spec, topic) {
  const blob = topic;
  let x0 = 0;
  let v0 = 8;
  let a = 2;
  let eq = 'x = x₀ + v₀ t + ½ a t²';
  if (has(blob, /竖直上抛|竖直下抛/)) {
    v0 = 20; a = -9.81; eq = 'v = v₀ − g t，y = y₀ + v₀ t − ½ g t²';
  } else if (has(blob, /自由落体/)) {
    v0 = 0; x0 = 20; a = -9.81; eq = 'y = h₀ − ½ g t²';
  } else if (has(blob, /斜抛|平抛/)) {
    return projectile(spec, has(blob, /平抛/) ? 0 : 45);
  } else if (has(blob, /匀减速/)) {
    v0 = 12; a = -2;
    eq = 'x = x₀ + v₀ t + ½ a t²（默认 a = −2 m/s²）';
  } else if (has(blob, /匀加速/)) {
    v0 = 0; a = 2;
    eq = 'x = x₀ + v₀ t + ½ a t²（默认 a = +2 m/s²）';
  } else if (has(blob, /相对/)) {
    return relative(spec);
  } else if (has(blob, /追及|相遇/)) {
    return chase(spec);
  }
  return shell(spec, {
    equation: eq,
    authority: 'Halliday, Resnick, Walker, Fundamentals of Physics, 直线运动',
    assumptions: '一维、常加速度、无额外阻力（抛体分支另见水平/竖直分解）',
    params: { x0, v0, a },
    schema: {
      x0: S('x₀', 'initial', 'm', -50, 80),
      v0: S('v₀', 'initial', 'm/s', -40, 40),
      a: S('a', 'dynamics', 'm/s²', -20, 20),
    },
    tick(state) {
      const t = state.t;
      const x0p = P(state.params, 'x0', 0);
      const v0p = P(state.params, 'v0', 0);
      const ap = P(state.params, 'a', 0);
      state.x = x0p + v0p * t + 0.5 * ap * t * t;
      state.v = v0p + ap * t;
    },
    plot: (s) => s.x,
    rows: (s, d) => [['t', s.t, 's'], ['x', s.x, 'm'], ['v', s.v, 'm/s'], ['a', P(s.params, 'a', 0), 'm/s²']],
  });
}

function projectile(spec, thetaDeg) {
  return shell(spec, {
    equation: 'x = v₀ cosθ · t，y = v₀ sinθ · t − ½ g t²',
    authority: 'Halliday, Resnick, Walker, Fundamentals of Physics, 抛体运动',
    assumptions: '匀重力、无空气阻力、落地前',
    params: { v0: 16, theta: thetaDeg, g: 9.81, y0: thetaDeg === 0 ? 8 : 0 },
    schema: {
      v0: S('v₀', 'initial', 'm/s', 0, 40),
      theta: S('θ', 'initial', '°', 0, 85),
      g: S('g', 'dynamics', 'm/s²', 0.1, 20),
      y0: S('y₀', 'initial', 'm', 0, 40),
    },
    tick(state) {
      const t = state.t;
      const v0 = P(state.params, 'v0', 16);
      const th = P(state.params, 'theta', thetaDeg) * Math.PI / 180;
      const g = P(state.params, 'g', 9.81);
      const y0 = P(state.params, 'y0', 0);
      state.x = v0 * Math.cos(th) * t;
      state.y = y0 + v0 * Math.sin(th) * t - 0.5 * g * t * t;
      state.vx = v0 * Math.cos(th);
      state.vy = v0 * Math.sin(th) - g * t;
    },
    plot: (s) => s.y,
    rows: (s) => [['t', s.t, 's'], ['x', s.x, 'm'], ['y', s.y, 'm'], ['vx', s.vx, 'm/s'], ['vy', s.vy, 'm/s']],
  });
}

function relative(spec) {
  return shell(spec, {
    equation: 'v_rel = v₁ − v₂，x_rel = x₀ + v_rel t',
    authority: 'Halliday, Resnick, Walker, 相对速度（一维）',
    assumptions: '同一直线、常速度',
    params: { v1: 8, v2: 3, x0: 0 },
    schema: {
      v1: S('v₁', 'dynamics', 'm/s', -30, 30),
      v2: S('v₂', 'dynamics', 'm/s', -30, 30),
      x0: S('x₀', 'initial', 'm', -20, 20),
    },
    tick(state) {
      state.vrel = P(state.params, 'v1', 8) - P(state.params, 'v2', 3);
      state.x = P(state.params, 'x0', 0) + state.vrel * state.t;
    },
    plot: (s) => s.x,
    rows: (s) => [['v_rel', s.vrel, 'm/s'], ['x_rel', s.x, 'm'], ['t', s.t, 's']],
  });
}

function chase(spec) {
  return shell(spec, {
    equation: 'x₁ = v₁ t，x₂ = gap + v₂ t；追上时 t = gap/(v₁−v₂)',
    authority: 'Halliday, Resnick, Walker, 追及（常速度）',
    assumptions: '一维常速度；v₁>v₂ 才追上',
    params: { v1: 10, v2: 4, gap: 20 },
    schema: {
      v1: S('v₁', 'dynamics', 'm/s', 0, 40),
      v2: S('v₂', 'dynamics', 'm/s', 0, 40),
      gap: S('初始间距', 'initial', 'm', 0, 100),
    },
    tick(state) {
      const v1 = P(state.params, 'v1', 10);
      const v2 = P(state.params, 'v2', 4);
      const gap = P(state.params, 'gap', 20);
      state.x1 = v1 * state.t;
      state.x2 = gap + v2 * state.t;
      state.tCatch = v1 > v2 ? gap / (v1 - v2) : Infinity;
    },
    plot: (s) => s.x1 - s.x2,
    rows: (s) => [['x₁', s.x1, 'm'], ['x₂', s.x2, 'm'], ['t_catch', Number.isFinite(s.tCatch) ? s.tCatch : NaN, 's']],
  });
}

function newton(spec, topic) {
  if (has(topic, /斜面/)) {
    return shell(spec, {
      equation: 'a = g (sinθ − μ cosθ)',
      authority: 'Hibbeler, Engineering Mechanics: Dynamics, 斜面与库仑摩擦',
      assumptions: '刚性斜面、质点、动摩擦或滑动方向摩擦',
      params: { g: 9.81, theta: 30, mu: 0.2, v0: 0 },
      schema: {
        g: S('g', 'dynamics', 'm/s²', 1, 20),
        theta: S('θ', 'dynamics', '°', 0, 70),
        mu: S('μ', 'dynamics', '—', 0, 1),
        v0: S('v₀', 'initial', 'm/s', 0, 20),
      },
      tick(state) {
        const g = P(state.params, 'g', 9.81);
        const th = P(state.params, 'theta', 30) * Math.PI / 180;
        const mu = P(state.params, 'mu', 0.2);
        state.a = g * (Math.sin(th) - mu * Math.cos(th));
        state.v = P(state.params, 'v0', 0) + state.a * state.t;
        state.s = P(state.params, 'v0', 0) * state.t + 0.5 * state.a * state.t * state.t;
      },
      plot: (s) => s.s,
      rows: (s) => [['a', s.a, 'm/s²'], ['v', s.v, 'm/s'], ['s', s.s, 'm']],
    });
  }
  if (has(topic, /连接|滑轮|Atwood/i)) return atwood(spec);
  if (has(topic, /传送带/)) {
    return shell(spec, {
      equation: 'a = μ g，直到 v = v_belt',
      authority: 'Hibbeler, Dynamics, 动摩擦与传送带',
      assumptions: '水平带、动摩擦、质点达到带速后相对静止',
      params: { mu: 0.3, g: 9.81, vb: 4, v0: 0 },
      schema: {
        mu: S('μ', 'dynamics', '—', 0, 1),
        vb: S('v_belt', 'dynamics', 'm/s', 0, 20),
        v0: S('v₀', 'initial', 'm/s', 0, 20),
      },
      tick(state) {
        const a = P(state.params, 'mu', 0.3) * P(state.params, 'g', 9.81);
        const vb = P(state.params, 'vb', 4);
        const v0 = P(state.params, 'v0', 0);
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
      rows: (s) => [['v', s.v, 'm/s'], ['a', s.a, 'm/s²'], ['s', s.s, 'm']],
    });
  }
  if (has(topic, /向心|离心/)) {
    return shell(spec, {
      equation: 'a_n = v²/r = ω² r',
      authority: 'Halliday, Resnick, Walker, 匀速圆周运动',
      assumptions: '速率恒定、半径恒定；离心力为非惯性系表观力，大小 m v²/r',
      params: { v: 4, r: 2, m: 1 },
      schema: {
        v: S('v', 'dynamics', 'm/s', 0, 30),
        r: S('r', 'dynamics', 'm', 0.2, 20),
        m: S('m', 'dynamics', 'kg', 0.1, 20),
      },
      tick(state) {
        const v = P(state.params, 'v', 4);
        const r = Math.max(0.05, P(state.params, 'r', 2));
        state.an = v * v / r;
        state.F = P(state.params, 'm', 1) * state.an;
      },
      plot: (s) => s.an,
      rows: (s) => [['a_n', s.an, 'm/s²'], ['F', s.F, 'N']],
    });
  }
  if (has(topic, /空气阻力|阻力落体|粘滞/)) {
    return shell(spec, {
      equation: 'm v′ = m g − b v',
      authority: 'Thornton & Marion, Classical Dynamics, §2.4 线性阻力',
      assumptions: '线性阻力、竖直向下为正、常 b。t0 是可选观察时刻，默认一个时间常数 m/b',
      params: { m: 1, g: 9.81, b: 0.4, v0: 0, t0: 2.5 },
      schema: {
        m: S('m', 'dynamics', 'kg', 0.1, 20),
        b: S('b', 'dynamics', 'kg/s', 0, 10),
        g: S('g', 'dynamics', 'm/s²', 1, 20),
        v0: S('v₀', 'initial', 'm/s', 0, 30),
        t0: S('观察时刻 t₀', 'initial', 's', 0, 60),
      },
      tick(state) {
        const m = Math.max(1e-3, P(state.params, 'm', 1));
        const b = P(state.params, 'b', 0.4);
        const g = P(state.params, 'g', 9.81);
        const v0 = P(state.params, 'v0', 0);
        const vinf = b > 0 ? (m * g) / b : v0 + g * state.t;
        state.v = b > 0 ? vinf + (v0 - vinf) * Math.exp(-(b / m) * state.t) : v0 + g * state.t;
        state.vinf = vinf;
      },
      plot: (s) => s.v,
      rows: (s) => [['v', s.v, 'm/s'], ['v_∞', s.vinf, 'm/s']],
    });
  }
  return shell(spec, {
    equation: 'F = m a',
    authority: 'Newton, Principia（现代表述）；Halliday 牛顿第二定律',
    assumptions: '常质量、一维合外力',
    params: { F: 6, m: 2 },
    schema: {
      F: S('F', 'dynamics', 'N', -50, 50),
      m: S('m', 'dynamics', 'kg', 0.1, 50),
    },
    tick(state) {
      const m = Math.max(1e-3, P(state.params, 'm', 1));
      state.a = P(state.params, 'F', 6) / m;
      state.v = state.a * state.t;
      state.x = 0.5 * state.a * state.t * state.t;
    },
    plot: (s) => s.x,
    rows: (s) => [['a', s.a, 'm/s²'], ['v', s.v, 'm/s'], ['x', s.x, 'm']],
  });
}

function atwood(spec) {
  return shell(spec, {
    equation: 'a = (m₁ − m₂) g / (m₁ + m₂)',
    authority: 'Hibbeler, Dynamics, Atwood 机',
    assumptions: '理想滑轮、轻绳、两质点竖直',
    params: { m1: 3, m2: 2, g: 9.81 },
    schema: {
      m1: S('m₁', 'dynamics', 'kg', 0.1, 20),
      m2: S('m₂', 'dynamics', 'kg', 0.1, 20),
      g: S('g', 'dynamics', 'm/s²', 1, 20),
    },
    tick(state) {
      const m1 = P(state.params, 'm1', 3);
      const m2 = P(state.params, 'm2', 2);
      const g = P(state.params, 'g', 9.81);
      state.a = (m1 - m2) * g / Math.max(1e-6, m1 + m2);
      state.v = state.a * state.t;
    },
    plot: (s) => s.a,
    rows: (s) => [['a', s.a, 'm/s²'], ['v', s.v, 'm/s']],
  });
}

function collision(spec, topic) {
  let e = 0.6;
  if (has(topic, /弹性/) && !has(topic, /非弹性/)) e = 1;
  if (has(topic, /完全非弹性|爆炸/)) e = 0;
  if (has(topic, /非弹性/) && !has(topic, /完全/)) e = 0.4;
  return shell(spec, {
    equation: `v₁,v₂ 由动量守恒与恢复系数决定（默认 e = ${e}）`,
    authority: 'Hibbeler, Dynamics, 对心碰撞与恢复系数',
    assumptions: '一维对心、碰撞瞬间外力冲量可忽略；二维斜碰此处只给出法向分量同一公式',
    params: { m1: 2, m2: 1, u1: 4, u2: 0, e },
    schema: {
      m1: S('m₁', 'dynamics', 'kg', 0.1, 20),
      m2: S('m₂', 'dynamics', 'kg', 0.1, 20),
      u1: S('u₁', 'initial', 'm/s', -20, 20),
      u2: S('u₂', 'initial', 'm/s', -20, 20),
      e: S('e', 'dynamics', '—', 0, 1),
    },
    tick(state) {
      const m1 = P(state.params, 'm1', 2);
      const m2 = P(state.params, 'm2', 1);
      const u1 = P(state.params, 'u1', 4);
      const u2 = P(state.params, 'u2', 0);
      const er = Math.min(1, Math.max(0, P(state.params, 'e', e)));
      const den = m1 + m2;
      state.v1 = ((m1 - er * m2) * u1 + (1 + er) * m2 * u2) / den;
      state.v2 = ((m2 - er * m1) * u2 + (1 + er) * m1 * u1) / den;
      state.p = m1 * state.v1 + m2 * state.v2;
      state.p0 = m1 * u1 + m2 * u2;
      state.J = m1 * (state.v1 - u1);
    },
    plot: (s) => s.v1,
    rows: (s) => [['v₁', s.v1, 'm/s'], ['v₂', s.v2, 'm/s'], ['p', s.p, 'kg·m/s'], ['J', s.J, 'N·s']],
  });
}

function shmFamily(spec, topic) {
  if (has(topic, /阻尼|欠|过|临界/)) {
    return shell(spec, {
      equation: 'x″ + 2 ζ ω x′ + ω² x = 0',
      authority: 'Thornton & Marion, Classical Dynamics, §3.4–3.5',
      assumptions: '线性粘滞阻尼、常系数',
      params: { omega: 2, zeta: 0.2, x0: 1, v0: 0 },
      schema: {
        omega: S('ω₀', 'dynamics', 'rad/s', 0.2, 8),
        zeta: S('ζ', 'dynamics', '—', 0, 2),
        x0: S('x₀', 'initial', 'm', -2, 2),
      },
      tick(state) {
        const w = P(state.params, 'omega', 2);
        const z = P(state.params, 'zeta', 0.2);
        const x0 = P(state.params, 'x0', 1);
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
      rows: (s) => [['x', s.x, 'm'], ['ζ', P(s.params, 'zeta', 0), '']],
    });
  }
  if (has(topic, /受迫|共振|扫频/)) {
    return shell(spec, {
      equation: 'x″ + 2 ζ ω₀ x′ + ω₀² x = A cos(Ω t)',
      authority: 'Thornton & Marion, 受迫阻尼振子稳态振幅',
      assumptions: '只显示稳态特解，略去瞬态',
      params: { w0: 2, zeta: 0.1, Omega: 2, A: 1 },
      schema: {
        w0: S('ω₀', 'dynamics', 'rad/s', 0.2, 8),
        zeta: S('ζ', 'dynamics', '—', 0.01, 1),
        Omega: S('Ω', 'dynamics', 'rad/s', 0.1, 8),
        A: S('A', 'dynamics', '—', 0, 5),
      },
      tick(state) {
        const w0 = P(state.params, 'w0', 2);
        const z = P(state.params, 'zeta', 0.1);
        const W = P(state.params, 'Omega', 2);
        const A = P(state.params, 'A', 1);
        const den = Math.sqrt((w0 * w0 - W * W) ** 2 + (2 * z * w0 * W) ** 2);
        state.amp = den > 0 ? A / den : 0;
        state.x = state.amp * Math.cos(W * state.t);
      },
      plot: (s) => s.x,
      rows: (s) => [['x', s.x, 'm'], ['振幅', s.amp, 'm']],
    });
  }
  if (has(topic, /单摆|复摆/)) {
    return shell(spec, {
      equation: 'θ″ = −(g/L) sinθ（小角时 ω=√(g/L) 或 √(mgd/I)）',
      authority: 'Thornton & Marion, §4.2 单摆',
      assumptions: '复摆用等效摆长 L_eq = I/(m d)；此处用可调 L 的单摆方程',
      params: { g: 9.81, L: 1, theta0: 0.4 },
      schema: {
        L: S('L', 'dynamics', 'm', 0.2, 4),
        theta0: S('θ₀', 'initial', 'rad', 0.05, 1.2),
        g: S('g', 'dynamics', 'm/s²', 1, 20),
      },
      tick(state) {
        const w = Math.sqrt(P(state.params, 'g', 9.81) / Math.max(0.05, P(state.params, 'L', 1)));
        state.theta = P(state.params, 'theta0', 0.4) * Math.cos(w * state.t);
        state.T = 2 * Math.PI / w;
      },
      plot: (s) => s.theta,
      rows: (s) => [['θ', s.theta, 'rad'], ['T', s.T, 's']],
    });
  }
  return shell(spec, {
    equation: 'x″ = −(k/m) x',
    authority: 'Thornton & Marion, 简谐振子',
    assumptions: '胡克定律、无阻尼',
    params: { m: 1, k: 4, x0: 1 },
    schema: {
      m: S('m', 'dynamics', 'kg', 0.1, 10),
      k: S('k', 'dynamics', 'N/m', 0.1, 40),
      x0: S('x₀', 'initial', 'm', -2, 2),
    },
    tick(state) {
      const w = Math.sqrt(P(state.params, 'k', 4) / Math.max(1e-3, P(state.params, 'm', 1)));
      state.x = P(state.params, 'x0', 1) * Math.cos(w * state.t);
      state.w = w;
    },
    plot: (s) => s.x,
    rows: (s) => [['x', s.x, 'm'], ['ω', s.w, 'rad/s']],
  });
}

function ohm(spec) {
  return shell(spec, {
    equation: 'V = I R，P = I V',
    authority: 'Nilsson & Riedel, Electric Circuits, 欧姆定律',
    assumptions: '集总、线性电阻、直流',
    params: { I: 0.5, R: 10 },
    schema: {
      I: S('I', 'dynamics', 'A', 0, 5),
      R: S('R', 'dynamics', 'Ω', 0.1, 100),
    },
    tick(state) {
      state.V = P(state.params, 'I', 0.5) * P(state.params, 'R', 10);
      state.Pwr = P(state.params, 'I', 0.5) * state.V;
    },
    plot: (s) => s.V,
    rows: (s) => [['V', s.V, 'V'], ['P', s.Pwr, 'W']],
  });
}

function malus(spec) {
  return shell(spec, {
    equation: 'I = I₀ cos²θ',
    authority: 'Hecht, Optics, Malus 定律',
    assumptions: '入射光已线偏振；理想偏振片；θ 为偏振方向夹角',
    params: { I0: 1, theta: 30 },
    schema: {
      I0: S('I₀', 'dynamics', '—', 0, 10),
      theta: S('θ', 'dynamics', '°', 0, 180),
    },
    tick(state) {
      const th = P(state.params, 'theta', 30) * Math.PI / 180;
      state.I = P(state.params, 'I0', 1) * Math.cos(th) ** 2;
    },
    plot: (s) => s.I,
    rows: (s) => [['I', s.I, ''], ['θ', P(s.params, 'theta', 0), '°']],
  });
}

function photo(spec) {
  return shell(spec, {
    equation: 'K_max = max(0, hf − W)',
    authority: 'Einstein 光电方程；Halliday 近代物理章节',
    assumptions: 'hf 与 W 同用 eV；无空间电荷',
    params: { hf: 3, W: 2 },
    schema: {
      hf: S('hf', 'dynamics', 'eV', 0, 12),
      W: S('W', 'dynamics', 'eV', 0, 10),
    },
    tick(state) {
      state.K = Math.max(0, P(state.params, 'hf', 3) - P(state.params, 'W', 2));
    },
    plot: (s) => s.K,
    rows: (s) => [['K_max', s.K, 'eV']],
  });
}

function gamma(spec, topic) {
  return shell(spec, {
    equation: has(topic, /长度/) ? 'L = L₀ / γ' : has(topic, /质能|能量/) ? 'E = γ m c²' : 'Δt = γ Δτ，γ = 1/√(1−β²)',
    authority: 'French, Special Relativity, 或 Rindler；时间膨胀与长度收缩',
    assumptions: '惯性系、β<1；质能用静止质量。双生子只给出 γ 时间比，不是广义相对论',
    fidelity: 'engineering',
    params: { beta: 0.6, tau: 1, L0: 1, m: 1 },
    schema: {
      beta: S('β', 'dynamics', '—', 0, 0.99),
      tau: S('Δτ', 'dynamics', 's', 0, 20),
      L0: S('L₀', 'dynamics', 'm', 0.1, 10),
    },
    tick(state) {
      const b = Math.min(0.999, Math.max(0, P(state.params, 'beta', 0.6)));
      state.gamma = 1 / Math.sqrt(1 - b * b);
      state.dt = state.gamma * P(state.params, 'tau', 1);
      state.L = P(state.params, 'L0', 1) / state.gamma;
      state.E = state.gamma * P(state.params, 'm', 1);
    },
    plot: (s) => s.gamma,
    rows: (s) => [['γ', s.gamma, ''], ['Δt', s.dt, 's'], ['L', s.L, 'm']],
  });
}

function logistic(spec) {
  return shell(spec, {
    equation: 'N = K / (1 + (K/N₀ − 1) e^{−r t})',
    authority: 'Murray, Mathematical Biology, Logistic 方程',
    assumptions: '连续、常 r 与 K、无时滞',
    params: { r: 0.6, K: 10, N0: 1 },
    schema: {
      r: S('r', 'dynamics', '1/s', 0.01, 3),
      K: S('K', 'dynamics', '—', 1, 50),
      N0: S('N₀', 'initial', '—', 0.1, 20),
    },
    tick(state) {
      const r = P(state.params, 'r', 0.6);
      const K = Math.max(1e-3, P(state.params, 'K', 10));
      const N0 = Math.max(1e-3, P(state.params, 'N0', 1));
      state.N = K / (1 + (K / N0 - 1) * Math.exp(-r * state.t));
    },
    plot: (s) => s.N,
    rows: (s) => [['N', s.N, ''], ['K', P(s.params, 'K', 0), '']],
  });
}

function lotka(spec) {
  return shell(spec, {
    equation: 'x′ = x(α − β y)，y′ = y(−γ + δ x)',
    authority: 'Murray, Mathematical Biology, Lotka–Volterra',
    assumptions: '两物种、质量作用、欧拉积分仅作示意轨迹（步长受限）',
    fidelity: 'principle',
    params: { alpha: 1, beta: 0.2, gamma: 0.8, delta: 0.2, x: 4, y: 2 },
    schema: {
      alpha: S('α', 'dynamics', '—', 0.1, 3),
      beta: S('β', 'dynamics', '—', 0.05, 1),
      gamma: S('γ', 'dynamics', '—', 0.1, 3),
      delta: S('δ', 'dynamics', '—', 0.05, 1),
    },
    init(state) {
      state.x = P(state.params, 'x', 4);
      state.y = P(state.params, 'y', 2);
    },
    tick(state, h) {
      if (h <= 0) return;
      const a = P(state.params, 'alpha', 1);
      const b = P(state.params, 'beta', 0.2);
      const g = P(state.params, 'gamma', 0.8);
      const d = P(state.params, 'delta', 0.2);
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
    rows: (s) => [['x', s.x, ''], ['y', s.y, '']],
  });
}

function sir(spec, topic) {
  const exposed = has(topic, /SEIR/);
  return shell(spec, {
    equation: exposed ? 'SEIR：S′=−βSI，E′=βSI−σE，I′=σE−γI' : 'SIR：S′=−βSI，I′=βSI−γI，R′=γI',
    authority: 'Kermack & McKendrick; Hethcote, SIAM Rev. 42 (2000) 传染病舱室模型',
    assumptions: '均匀混合、常系数、总人口守恒；非临床预测',
    fidelity: 'principle',
    params: { beta: 0.6, gamma: 0.2, sigma: 0.3, I0: 0.02 },
    schema: {
      beta: S('β', 'dynamics', '—', 0.05, 2),
      gamma: S('γ', 'dynamics', '—', 0.05, 1),
      sigma: S('σ', 'dynamics', '—', 0.05, 1),
      I0: S('I₀', 'initial', '—', 0.001, 0.2),
    },
    init(state) {
      state.I = P(state.params, 'I0', 0.02);
      state.E = exposed ? state.I : 0;
      state.S = 1 - state.I - state.E;
      state.R = 0;
    },
    tick(state, h) {
      if (h <= 0) return;
      const beta = P(state.params, 'beta', 0.6);
      const gamma = P(state.params, 'gamma', 0.2);
      const sigma = P(state.params, 'sigma', 0.3);
      const n = 6;
      const dt = h / n;
      for (let i = 0; i < n; i += 1) {
        const inf = beta * state.S * state.I;
        if (exposed) {
          const dE = inf - sigma * state.E;
          const dI = sigma * state.E - gamma * state.I;
          state.S = Math.max(0, state.S - inf * dt);
          state.E = Math.max(0, state.E + dE * dt);
          state.I = Math.max(0, state.I + dI * dt);
          state.R = Math.max(0, 1 - state.S - state.E - state.I);
        } else {
          const dI = inf - gamma * state.I;
          state.S = Math.max(0, state.S - inf * dt);
          state.I = Math.max(0, state.I + dI * dt);
          state.R = Math.max(0, 1 - state.S - state.I);
        }
      }
    },
    plot: (s) => s.I,
    rows: (s) => [['S', s.S, ''], ['I', s.I, ''], ['R', s.R, '']],
  });
}

function lorenzSys(spec) {
  return shell(spec, {
    equation: 'x′=σ(y−x), y′=x(ρ−z)−y, z′=xy−βz',
    authority: 'Lorenz, J. Atmos. Sci. 20:130 (1963)；Strogatz, Nonlinear Dynamics and Chaos',
    assumptions: '标准参数附近的确定性 ODE；不对长期天气做预报',
    fidelity: 'engineering',
    params: { sigma: 10, rho: 28, beta: 2.667 },
    schema: {
      sigma: S('σ', 'dynamics', '—', 1, 20),
      rho: S('ρ', 'dynamics', '—', 1, 40),
      beta: S('β', 'dynamics', '—', 0.5, 6),
    },
    init(state) {
      state.x = 1;
      state.y = 1;
      state.z = 1;
    },
    tick(state, h) {
      if (h <= 0) return;
      const s = P(state.params, 'sigma', 10);
      const r = P(state.params, 'rho', 28);
      const b = P(state.params, 'beta', 8 / 3);
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
    rows: (s) => [['x', s.x, ''], ['y', s.y, ''], ['z', s.z, '']],
  });
}

function firstOrderReaction(spec, topic) {
  let order = 1;
  if (has(topic, /零级/)) order = 0;
  if (has(topic, /二级/)) order = 2;
  return shell(spec, {
    equation: order === 0 ? 'c = c₀ − k t' : order === 2 ? '1/c − 1/c₀ = k t' : 'c = c₀ e^{−k t}',
    authority: 'Fogler, Elements of Chemical Reaction Engineering, 幂律速率',
    assumptions: '恒温、恒容、单一反应；不可外推为危险工艺放大',
    params: { c0: 1, k: 0.3 },
    schema: {
      c0: S('c₀', 'initial', 'mol/L', 0.1, 5),
      k: S('k', 'dynamics', '—', 0.01, 2),
    },
    tick(state) {
      const c0 = P(state.params, 'c0', 1);
      const k = P(state.params, 'k', 0.3);
      const t = state.t;
      if (order === 0) state.c = Math.max(0, c0 - k * t);
      else if (order === 2) state.c = 1 / (1 / c0 + k * t);
      else state.c = c0 * Math.exp(-k * t);
    },
    plot: (s) => s.c,
    rows: (s) => [['c', s.c, 'mol/L']],
  });
}

function boolGate(spec, topic) {
  return shell(spec, {
    equation: '真值表：与/或/非/异或/与非/或非',
    authority: 'Mano, Digital Design, 基本门',
    assumptions: '理想布尔代数，无延迟',
    params: { a: 1, b: 1 },
    schema: {
      a: S('A', 'dynamics', '0/1', 0, 1),
      b: S('B', 'dynamics', '0/1', 0, 1),
    },
    tick(state) {
      const a = P(state.params, 'a', 1) >= 0.5 ? 1 : 0;
      const b = P(state.params, 'b', 1) >= 0.5 ? 1 : 0;
      let y = a & b;
      if (has(topic, /或非/)) y = (a | b) ? 0 : 1;
      else if (has(topic, /与非/)) y = (a & b) ? 0 : 1;
      else if (has(topic, /异或/)) y = a ^ b;
      else if (has(topic, /同或/)) y = a === b ? 1 : 0;
      else if (has(topic, /或/)) y = a | b;
      else if (has(topic, /非/)) y = a ? 0 : 1;
      else y = a & b;
      state.y = y;
    },
    plot: (s) => s.y,
    rows: (s) => [['Y', s.y, '']],
  });
}

function matrix2(spec, topic) {
  return shell(spec, {
    equation: has(topic, /行列式/) ? 'det = ad − bc'
      : has(topic, /特征/) ? 'λ² − tr λ + det = 0'
        : 'y = A x，A=[[a,b],[c,d]]',
    authority: 'Strang, Introduction to Linear Algebra, 2×2',
    assumptions: '实 2×2；PCA/SVD 此处给出协方差最大特征值，不是统计软件',
    params: { a: 2, b: 1, c: 0, d: 1, x1: 1, x2: 0 },
    schema: {
      a: S('a', 'dynamics', '—', -5, 5),
      b: S('b', 'dynamics', '—', -5, 5),
      c: S('c', 'dynamics', '—', -5, 5),
      d: S('d', 'dynamics', '—', -5, 5),
    },
    tick(state) {
      const a = P(state.params, 'a', 2);
      const b = P(state.params, 'b', 1);
      const c = P(state.params, 'c', 0);
      const d = P(state.params, 'd', 1);
      state.det = a * d - b * c;
      state.tr = a + d;
      const disc = Math.max(0, state.tr * state.tr - 4 * state.det);
      state.lam = (state.tr + Math.sqrt(disc)) / 2;
      const x1 = P(state.params, 'x1', 1);
      const x2 = P(state.params, 'x2', 0);
      state.y1 = a * x1 + b * x2;
      state.y2 = c * x1 + d * x2;
    },
    plot: (s) => s.det,
    rows: (s) => [['det', s.det, ''], ['λ_max', s.lam, ''], ['y1', s.y1, '']],
  });
}

function stress(spec, topic) {
  if (has(topic, /屈曲|欧拉/)) {
    return shell(spec, {
      equation: 'P_cr = π² E I / (μ L)²',
      authority: 'Hibbeler, Mechanics of Materials, 欧拉屈曲',
      assumptions: '理想轴心受压、弹性、端部系数 μ',
      params: { E: 200, I: 1e-6, L: 2, mu: 1 },
      schema: {
        E: S('E', 'dynamics', 'GPa', 10, 300),
        L: S('L', 'dynamics', 'm', 0.3, 8),
        mu: S('μ', 'dynamics', '—', 0.5, 2),
      },
      tick(state) {
        const E = P(state.params, 'E', 200) * 1e9;
        const I = P(state.params, 'I', 1e-6);
        const L = Math.max(0.05, P(state.params, 'L', 2));
        const mu = Math.max(0.5, P(state.params, 'mu', 1));
        state.Pcr = (Math.PI ** 2) * E * I / (mu * L) ** 2;
      },
      plot: (s) => s.Pcr / 1000,
      rows: (s) => [['P_cr', s.Pcr / 1000, 'kN']],
    });
  }
  if (has(topic, /弯曲|弯矩|梁/)) {
    return shell(spec, {
      equation: 'σ = M y / I',
      authority: 'Hibbeler, Mechanics of Materials, 弹性弯曲',
      assumptions: '欧拉-伯努利、线弹性、平截面',
      params: { M: 5000, y: 0.05, I: 2e-5 },
      schema: {
        M: S('M', 'dynamics', 'N·m', 0, 2e4),
        y: S('y', 'dynamics', 'm', 0, 0.2),
        I: S('I', 'dynamics', 'm⁴', 1e-7, 1e-3),
      },
      tick(state) {
        state.sig = P(state.params, 'M', 5000) * P(state.params, 'y', 0.05) / Math.max(1e-12, P(state.params, 'I', 2e-5));
      },
      plot: (s) => s.sig / 1e6,
      rows: (s) => [['σ', s.sig / 1e6, 'MPa']],
    });
  }
  if (has(topic, /扭转|扭矩/)) {
    return shell(spec, {
      equation: 'τ = T ρ / J',
      authority: 'Hibbeler, Mechanics of Materials, 圆轴扭转',
      assumptions: '圆截面、线弹性',
      params: { T: 200, rho: 0.02, J: 2.5e-7 },
      schema: {
        T: S('T', 'dynamics', 'N·m', 0, 2000),
        rho: S('ρ', 'dynamics', 'm', 0.001, 0.1),
      },
      tick(state) {
        state.tau = P(state.params, 'T', 200) * P(state.params, 'rho', 0.02) / Math.max(1e-12, P(state.params, 'J', 2.5e-7));
      },
      plot: (s) => s.tau / 1e6,
      rows: (s) => [['τ', s.tau / 1e6, 'MPa']],
    });
  }
  if (has(topic, /应力强度|断裂/)) {
    return shell(spec, {
      equation: 'K_I = σ √(π a)',
      authority: 'Anderson, Fracture Mechanics, 无限板Ⅰ型',
      assumptions: '无限板中心裂纹、线弹性断裂；非结构评定软件',
      params: { sigma: 100, a: 0.01 },
      schema: {
        sigma: S('σ', 'dynamics', 'MPa', 1, 400),
        a: S('a', 'dynamics', 'm', 0.001, 0.05),
      },
      tick(state) {
        state.K = P(state.params, 'sigma', 100) * Math.sqrt(Math.PI * P(state.params, 'a', 0.01));
      },
      plot: (s) => s.K,
      rows: (s) => [['K_I', s.K, 'MPa√m']],
    });
  }
  return shell(spec, {
    equation: 'σ = F / A，ε = σ / E',
    authority: 'Hibbeler, Mechanics of Materials, 轴向拉压',
    assumptions: '均匀应力、线弹性',
    params: { F: 1000, A: 1e-4, E: 200 },
    schema: {
      F: S('F', 'dynamics', 'N', 0, 1e5),
      A: S('A', 'dynamics', 'm²', 1e-6, 0.01),
      E: S('E', 'dynamics', 'GPa', 10, 300),
    },
    tick(state) {
      state.sig = P(state.params, 'F', 1000) / Math.max(1e-9, P(state.params, 'A', 1e-4));
      state.eps = (state.sig / 1e6) / Math.max(1, P(state.params, 'E', 200) * 1e3);
    },
    plot: (s) => s.sig / 1e6,
    rows: (s) => [['σ', s.sig / 1e6, 'MPa'], ['ε', s.eps, '']],
  });
}

function gearOrBelt(spec, topic) {
  const belt = has(topic, /带|摩擦轮/);
  return shell(spec, {
    equation: belt ? 'i = D₂/D₁，v = π D n' : 'i = z₂/z₁，ω₂ = ω₁ / i',
    authority: belt
      ? 'Shigley, Mechanical Engineering Design, 带传动速比'
      : 'Shigley, Mechanical Engineering Design, 齿轮速比',
    assumptions: '无滑动（带传动为理想）；齿数或直径为正',
    params: belt ? { D1: 0.1, D2: 0.2, n: 10 } : { z1: 20, z2: 40, w1: 10 },
    schema: belt
      ? {
        D1: S('D₁', 'dynamics', 'm', 0.02, 1),
        D2: S('D₂', 'dynamics', 'm', 0.02, 1),
        n: S('n', 'dynamics', 'rev/s', 0.1, 50),
      }
      : {
        z1: S('z₁', 'dynamics', '—', 8, 120),
        z2: S('z₂', 'dynamics', '—', 8, 200),
        w1: S('ω₁', 'dynamics', 'rad/s', 0, 100),
      },
    tick(state) {
      if (belt) {
        const D1 = Math.max(1e-3, P(state.params, 'D1', 0.1));
        const D2 = Math.max(1e-3, P(state.params, 'D2', 0.2));
        state.i = D2 / D1;
        state.v = Math.PI * D1 * P(state.params, 'n', 10);
      } else {
        const z1 = Math.max(1, P(state.params, 'z1', 20));
        const z2 = Math.max(1, P(state.params, 'z2', 40));
        state.i = z2 / z1;
        state.w2 = P(state.params, 'w1', 10) / state.i;
      }
    },
    plot: (s) => s.i,
    rows: (s) => [['i', s.i, ''], belt ? ['v', s.v, 'm/s'] : ['ω₂', s.w2, 'rad/s']],
  });
}

function carnot(spec, topic) {
  const fridge = has(topic, /制冷|热泵|COP|压缩/);
  return shell(spec, {
    equation: fridge ? 'COP_C = T_c / (T_h − T_c)' : 'η = 1 − T_c / T_h',
    authority: 'Çengel & Boles, Thermodynamics, 卡诺效率 / 卡诺制冷 COP',
    assumptions: '可逆卡诺极限，不是实际机组效率',
    fidelity: 'engineering',
    params: { Th: 600, Tc: 300 },
    schema: {
      Th: S('T_h', 'dynamics', 'K', 250, 1500),
      Tc: S('T_c', 'dynamics', 'K', 200, 400),
    },
    tick(state) {
      const Th = Math.max(P(state.params, 'Th', 600), P(state.params, 'Tc', 300) + 1);
      const Tc = P(state.params, 'Tc', 300);
      state.eta = 1 - Tc / Th;
      state.cop = Tc / (Th - Tc);
    },
    plot: (s) => (fridge ? s.cop : s.eta),
    rows: (s) => [['η', s.eta, ''], ['COP', s.cop, '']],
  });
}

function gasLaw(spec) {
  return shell(spec, {
    equation: 'P V = n R T',
    authority: 'Çengel & Boles, Thermodynamics, 理想气体状态方程',
    assumptions: '理想气体、平衡态',
    params: { n: 1, T: 300, V: 0.02 },
    schema: {
      n: S('n', 'dynamics', 'mol', 0.1, 5),
      T: S('T', 'dynamics', 'K', 200, 800),
      V: S('V', 'dynamics', 'm³', 0.001, 0.1),
    },
    tick(state) {
      const R = 8.314;
      state.P = P(state.params, 'n', 1) * R * P(state.params, 'T', 300) / Math.max(1e-6, P(state.params, 'V', 0.02));
    },
    plot: (s) => s.P / 1000,
    rows: (s) => [['P', s.P / 1000, 'kPa']],
  });
}

function coulomb(spec) {
  return shell(spec, {
    equation: 'F = k |q₁ q₂| / r²',
    authority: 'Griffiths, Introduction to Electrodynamics, Ch. 2',
    assumptions: '真空点电荷、库仑定律',
    params: { q1: 1e-6, q2: 1e-6, r: 0.2 },
    schema: {
      q1: S('q₁', 'dynamics', 'C', -5e-6, 5e-6),
      q2: S('q₂', 'dynamics', 'C', -5e-6, 5e-6),
      r: S('r', 'dynamics', 'm', 0.05, 2),
    },
    tick(state) {
      const k = 8.9875517923e9;
      const r = Math.max(0.02, P(state.params, 'r', 0.2));
      state.F = k * P(state.params, 'q1', 1e-6) * P(state.params, 'q2', 1e-6) / (r * r);
    },
    plot: (s) => s.F,
    rows: (s) => [['F', s.F, 'N']],
  });
}

function rcCircuit(spec) {
  return shell(spec, {
    equation: 'v_C = V (1 − e^{−t/RC})',
    authority: 'Nilsson & Riedel, Electric Circuits, 一阶 RC',
    assumptions: '直流阶跃、零初始、集总',
    params: { V: 5, R: 1000, C: 1e-4 },
    schema: {
      V: S('V', 'dynamics', 'V', 0, 24),
      R: S('R', 'dynamics', 'Ω', 10, 1e5),
      C: S('C', 'dynamics', 'F', 1e-6, 0.01),
    },
    tick(state) {
      const tau = Math.max(1e-6, P(state.params, 'R', 1000) * P(state.params, 'C', 1e-4));
      state.vc = P(state.params, 'V', 5) * (1 - Math.exp(-state.t / tau));
      state.tau = tau;
    },
    plot: (s) => s.vc,
    rows: (s) => [['v_C', s.vc, 'V'], ['τ', s.tau, 's']],
  });
}

function lens(spec) {
  return shell(spec, {
    equation: '1/v − 1/u = 1/f（笛卡尔符号：实物 u<0）',
    authority: 'Hecht, Optics, 薄透镜',
    assumptions: '近轴、薄透镜；u 取负表示实物在左侧',
    params: { f: 0.1, u: -0.3 },
    schema: {
      f: S('f', 'dynamics', 'm', 0.02, 0.5),
      u: S('u', 'dynamics', 'm', -2, -0.05),
    },
    tick(state) {
      const f = P(state.params, 'f', 0.1);
      const u = P(state.params, 'u', -0.3);
      const inv = 1 / f + 1 / u;
      state.v = Math.abs(inv) > 1e-9 ? 1 / inv : NaN;
    },
    plot: (s) => s.v,
    rows: (s) => [['v', s.v, 'm']],
  });
}

function snell(spec) {
  return shell(spec, {
    equation: 'n₁ sinθ₁ = n₂ sinθ₂',
    authority: 'Hecht, Optics, 斯涅尔定律',
    assumptions: '各向同性均匀介质、几何光学',
    params: { n1: 1, n2: 1.5, theta1: 30 },
    schema: {
      n1: S('n₁', 'dynamics', '—', 1, 2.5),
      n2: S('n₂', 'dynamics', '—', 1, 2.5),
      theta1: S('θ₁', 'dynamics', '°', 0, 80),
    },
    tick(state) {
      const s = P(state.params, 'n1', 1) * Math.sin(P(state.params, 'theta1', 30) * Math.PI / 180) / Math.max(1, P(state.params, 'n2', 1.5));
      state.theta2 = Math.abs(s) <= 1 ? Math.asin(s) * 180 / Math.PI : NaN;
    },
    plot: (s) => s.theta2,
    rows: (s) => [['θ₂', s.theta2, '°']],
  });
}

function well(spec) {
  return shell(spec, {
    equation: 'E_n = n² h² / (8 m L²)',
    authority: 'Griffiths, Introduction to Quantum Mechanics, 无限深势阱',
    assumptions: '一维无限阱、定态能量；h 为普朗克常数',
    params: { n: 1, L: 1e-9 },
    schema: {
      n: S('n', 'dynamics', '—', 1, 8),
      L: S('L', 'dynamics', 'm', 0.2e-9, 5e-9),
    },
    tick(state) {
      const h = 6.62607015e-34;
      const m = 9.1093837e-31;
      const n = Math.max(1, Math.round(P(state.params, 'n', 1)));
      const L = Math.max(1e-12, P(state.params, 'L', 1e-9));
      state.E = (n * n * h * h) / (8 * m * L * L) / 1.602176634e-19;
    },
    plot: (s) => s.E,
    rows: (s) => [['E_n', s.E, 'eV']],
  });
}

function decay(spec) {
  return shell(spec, {
    equation: 'N = N₀ e^{−λ t}，t½ = ln2 / λ',
    authority: 'Krane, Introductory Nuclear Physics, 指数衰变',
    assumptions: '单一核素、常数 λ；非燃耗、非剂量设计。e^{−λt} 按双精度计算，不在 ±40 处截断',
    params: { N0: 1000, lambda: 0.2 },
    schema: {
      N0: S('N₀', 'initial', '—', 1, 1e5),
      lambda: S('λ', 'dynamics', '1/s', 0.01, 2),
    },
    tick(state) {
      const lam = Math.max(1e-6, P(state.params, 'lambda', 0.2));
      state.N = P(state.params, 'N0', 1000) * Math.exp(-lam * state.t);
      state.th = Math.LN2 / lam;
    },
    plot: (s) => s.N,
    rows: (s) => [['N', s.N, ''], ['t½', s.th, 's']],
  });
}

function mm1(spec) {
  return shell(spec, {
    equation: 'ρ=λ/μ，L = ρ/(1−ρ)（ρ<1）',
    authority: 'Gross & Harris, Fundamentals of Queueing Theory, M/M/1',
    assumptions: '泊松到达、指数服务、单服务台、稳态 ρ<1',
    params: { lambda: 2, mu: 3 },
    schema: {
      lambda: S('λ', 'dynamics', '1/s', 0.1, 10),
      mu: S('μ', 'dynamics', '1/s', 0.2, 12),
    },
    tick(state) {
      const lam = P(state.params, 'lambda', 2);
      const mu = Math.max(1e-3, P(state.params, 'mu', 3));
      state.rho = lam / mu;
      state.L = state.rho < 1 ? state.rho / (1 - state.rho) : Infinity;
    },
    plot: (s) => (Number.isFinite(s.L) ? s.L : 20),
    rows: (s) => [['ρ', s.rho, ''], ['L', s.L, '']],
  });
}

function binaryEntropy(spec) {
  return shell(spec, {
    equation: 'H = −p log₂ p − (1−p) log₂(1−p)',
    authority: 'Cover & Thomas, Elements of Information Theory, 二元熵',
    assumptions: '离散二元信源',
    params: { p: 0.3 },
    schema: { p: S('p', 'dynamics', '—', 0.01, 0.99) },
    tick(state) {
      const p = Math.min(0.999, Math.max(0.001, P(state.params, 'p', 0.3)));
      state.H = -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
    },
    plot: (s) => s.H,
    rows: (s) => [['H', s.H, 'bit']],
  });
}

function compound(spec) {
  return shell(spec, {
    equation: 'A = P (1 + r)^n',
    authority: '标准复利定义（离散年复利）',
    assumptions: '固定利率、无手续费',
    params: { P: 100, r: 0.05, n: 10 },
    schema: {
      P: S('P', 'dynamics', '—', 1, 1e4),
      r: S('r', 'dynamics', '—', 0, 0.3),
      n: S('n', 'dynamics', '—', 0, 40),
    },
    tick(state) {
      state.A = P(state.params, 'P', 100) * (1 + P(state.params, 'r', 0.05)) ** P(state.params, 'n', 10);
    },
    plot: (s) => s.A,
    rows: (s) => [['A', s.A, '']],
  });
}

function supplyDemand(spec) {
  return shell(spec, {
    equation: '需求 Qd=a−bP，供给 Qs=c+dP，P* 使 Qd=Qs',
    authority: 'Varian, Intermediate Microeconomics, 线性供需',
    assumptions: '线性、竞争市场局部均衡',
    params: { a: 20, b: 2, c: 2, d: 1 },
    schema: {
      a: S('a', 'dynamics', '—', 1, 50),
      b: S('b', 'dynamics', '—', 0.1, 10),
      c: S('c', 'dynamics', '—', 0, 20),
      d: S('d', 'dynamics', '—', 0.1, 10),
    },
    tick(state) {
      const a = P(state.params, 'a', 20);
      const b = Math.max(1e-3, P(state.params, 'b', 2));
      const c = P(state.params, 'c', 2);
      const d = Math.max(1e-3, P(state.params, 'd', 1));
      state.Pstar = (a - c) / (b + d);
      state.Q = a - b * state.Pstar;
    },
    plot: (s) => s.Pstar,
    rows: (s) => [['P*', s.Pstar, ''], ['Q*', s.Q, '']],
  });
}

function normalPdf(spec, topic) {
  if (has(topic, /泊松/)) {
    return shell(spec, {
      equation: 'P(k)= e^{−λ} λ^k / k!',
      authority: 'Ross, A First Course in Probability, 泊松分布',
      assumptions: '独立稀有事件',
      params: { lambda: 3, k: 2 },
      schema: {
        lambda: S('λ', 'dynamics', '—', 0.1, 12),
        k: S('k', 'dynamics', '—', 0, 15),
      },
      tick(state) {
        const lam = P(state.params, 'lambda', 3);
        const k = Math.max(0, Math.round(P(state.params, 'k', 2)));
        let fact = 1;
        for (let i = 2; i <= k; i += 1) fact *= i;
        state.p = Math.exp(-lam) * (lam ** k) / fact;
      },
      plot: (s) => s.p,
      rows: (s) => [['P(k)', s.p, '']],
    });
  }
  if (has(topic, /二项/)) {
    return shell(spec, {
      equation: 'P(k)= C(n,k) p^k (1−p)^{n−k}',
      authority: 'Ross, A First Course in Probability, 二项分布',
      assumptions: 'n 次独立伯努利',
      params: { n: 10, p: 0.4, k: 4 },
      schema: {
        n: S('n', 'dynamics', '—', 1, 30),
        p: S('p', 'dynamics', '—', 0, 1),
        k: S('k', 'dynamics', '—', 0, 30),
      },
      tick(state) {
        const n = Math.max(1, Math.round(P(state.params, 'n', 10)));
        const k = Math.min(n, Math.max(0, Math.round(P(state.params, 'k', 4))));
        const p = Math.min(1, Math.max(0, P(state.params, 'p', 0.4)));
        let c = 1;
        for (let i = 1; i <= k; i += 1) c = c * (n - k + i) / i;
        state.p = c * (p ** k) * ((1 - p) ** (n - k));
      },
      plot: (s) => s.p,
      rows: (s) => [['P(k)', s.p, '']],
    });
  }
  if (has(topic, /指数/)) {
    return shell(spec, {
      equation: 'f(t)= λ e^{−λ t}',
      authority: 'Ross, 指数分布',
      assumptions: '无记忆',
      params: { lambda: 0.5 },
      schema: { lambda: S('λ', 'dynamics', '1/s', 0.05, 3) },
      tick(state) {
        const lam = P(state.params, 'lambda', 0.5);
        state.f = lam * Math.exp(-lam * state.t);
      },
      plot: (s) => s.f,
      rows: (s) => [['f', s.f, '']],
    });
  }
  return shell(spec, {
    equation: 'φ(x) = (1/√(2π)σ) exp(−(x−μ)²/(2σ²))',
    authority: 'Ross, 正态分布',
    assumptions: '一元正态',
    params: { mu: 0, sigma: 1 },
    schema: {
      mu: S('μ', 'dynamics', '—', -5, 5),
      sigma: S('σ', 'dynamics', '—', 0.2, 4),
    },
    tick(state) {
      const mu = P(state.params, 'mu', 0);
      const sg = Math.max(0.05, P(state.params, 'sigma', 1));
      const x = mu + 2 * sg * Math.sin(state.t);
      state.f = Math.exp(-0.5 * ((x - mu) / sg) ** 2) / (sg * Math.sqrt(2 * Math.PI));
      state.x = x;
    },
    plot: (s) => s.f,
    rows: (s) => [['φ', s.f, ''], ['x', s.x, '']],
  });
}

function derivativeLesson(spec, topic) {
  if (has(topic, /积分/) && !has(topic, /数值|微分/)) {
    return shell(spec, {
      equation: '∫ x^n dx = x^{n+1}/(n+1)（n≠−1）',
      authority: 'Stewart, Calculus, 幂函数积分',
      assumptions: 'n≠−1',
      params: { n: 2, x: 2 },
      schema: {
        n: S('n', 'dynamics', '—', 0, 6),
        x: S('x', 'dynamics', '—', 0, 5),
      },
      tick(state) {
        const n = P(state.params, 'n', 2);
        const x = P(state.params, 'x', 2);
        state.y = (x ** (n + 1)) / (n + 1);
      },
      plot: (s) => s.y,
      rows: (s) => [['∫', s.y, '']],
    });
  }
  if (has(topic, /泰勒/)) {
    return shell(spec, {
      equation: 'e^x ≈ Σ x^k/k!（到 n 项）',
      authority: 'Stewart, Calculus, 泰勒级数',
      assumptions: '在 0 处展开',
      params: { x: 1, n: 6 },
      schema: {
        x: S('x', 'dynamics', '—', -2, 3),
        n: S('n', 'dynamics', '—', 1, 12),
      },
      tick(state) {
        const x = P(state.params, 'x', 1);
        const n = Math.max(1, Math.round(P(state.params, 'n', 6)));
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
      rows: (s) => [['series', s.y, ''], ['exp', s.ex, '']],
    });
  }
  if (has(topic, /拉普拉斯/)) {
    return shell(spec, {
      equation: 'L{e^{−at}} = 1/(s+a)',
      authority: 'Oppenheim, Signals and Systems, 拉普拉斯变换',
      assumptions: '因果指数、Re(s)>−a 以实 s 表示',
      params: { a: 1, s: 2 },
      schema: {
        a: S('a', 'dynamics', '—', 0, 5),
        s: S('s', 'dynamics', '—', 0.1, 10),
      },
      tick(state) {
        state.F = 1 / (P(state.params, 's', 2) + P(state.params, 'a', 1));
      },
      plot: (s) => s.F,
      rows: (s) => [['F(s)', s.F, '']],
    });
  }
  if (has(topic, /极限/)) {
    return shell(spec, {
      equation: 'lim_{x→0} sin x / x = 1',
      authority: 'Stewart, Calculus, 标准极限',
      assumptions: 'x 以弧度、避开 0 用小量',
      params: { x: 0.1 },
      schema: { x: S('x', 'dynamics', 'rad', 0.001, 1) },
      tick(state) {
        const x = Math.max(1e-4, P(state.params, 'x', 0.1));
        state.y = Math.sin(x) / x;
      },
      plot: (s) => s.y,
      rows: (s) => [['sinx/x', s.y, '']],
    });
  }
  return shell(spec, {
    equation: 'd/dx x^n = n x^{n−1}',
    authority: 'Stewart, Calculus, 幂函数导数',
    assumptions: '实幂、x>0 当 n 非整数',
    params: { n: 3, x: 2 },
    schema: {
      n: S('n', 'dynamics', '—', 1, 6),
      x: S('x', 'dynamics', '—', 0.1, 5),
    },
    tick(state) {
      const n = P(state.params, 'n', 3);
      const x = Math.max(1e-3, P(state.params, 'x', 2));
      state.y = n * x ** (n - 1);
    },
    plot: (s) => s.y,
    rows: (s) => [['dy/dx', s.y, '']],
  });
}

function rankineSoil(spec) {
  return shell(spec, {
    equation: 'K_a=(1−sinφ)/(1+sinφ)，P_a=½ γ H² K_a',
    authority: 'Das, Principles of Geotechnical Engineering, Rankine 主动土压力',
    assumptions: '无粘性、墙背竖直光滑、水平填土',
    params: { phi: 30, gamma: 18, H: 4 },
    schema: {
      phi: S('φ', 'dynamics', '°', 10, 45),
      gamma: S('γ', 'dynamics', 'kN/m³', 10, 22),
      H: S('H', 'dynamics', 'm', 1, 12),
    },
    tick(state) {
      const phi = P(state.params, 'phi', 30) * Math.PI / 180;
      const Ka = (1 - Math.sin(phi)) / (1 + Math.sin(phi));
      const H = P(state.params, 'H', 4);
      state.Pa = 0.5 * P(state.params, 'gamma', 18) * H * H * Ka;
      state.Ka = Ka;
    },
    plot: (s) => s.Pa,
    rows: (s) => [['K_a', s.Ka, ''], ['P_a', s.Pa, 'kN/m']],
  });
}

function manning(spec) {
  return shell(spec, {
    equation: 'V = (1/n) R^{2/3} S^{1/2}',
    authority: 'Chow, Open-Channel Hydraulics, 曼宁公式',
    assumptions: '均匀流、SI 单位、n 为曼宁糙率',
    params: { n: 0.015, R: 0.8, S: 0.001 },
    schema: {
      n: S('n', 'dynamics', '—', 0.008, 0.05),
      R: S('R', 'dynamics', 'm', 0.1, 5),
      S: S('S', 'dynamics', '—', 1e-5, 0.02),
    },
    tick(state) {
      const n = Math.max(1e-3, P(state.params, 'n', 0.015));
      state.V = (1 / n) * (Math.max(0, P(state.params, 'R', 0.8)) ** (2 / 3)) * Math.sqrt(Math.max(0, P(state.params, 'S', 0.001)));
    },
    plot: (s) => s.V,
    rows: (s) => [['V', s.V, 'm/s']],
  });
}

function darcy(spec) {
  return shell(spec, {
    equation: 'h_f = f (L/D) v² / (2 g)',
    authority: 'White, Fluid Mechanics, Darcy–Weisbach',
    assumptions: '给定摩阻系数 f，不内置 Moody 迭代',
    params: { f: 0.02, L: 20, D: 0.1, v: 1.5 },
    schema: {
      f: S('f', 'dynamics', '—', 0.005, 0.08),
      L: S('L', 'dynamics', 'm', 1, 200),
      D: S('D', 'dynamics', 'm', 0.02, 1),
      v: S('v', 'dynamics', 'm/s', 0, 6),
    },
    tick(state) {
      const D = Math.max(1e-3, P(state.params, 'D', 0.1));
      const v = P(state.params, 'v', 1.5);
      state.hf = P(state.params, 'f', 0.02) * (P(state.params, 'L', 20) / D) * v * v / (2 * 9.81);
    },
    plot: (s) => s.hf,
    rows: (s) => [['h_f', s.hf, 'm']],
  });
}

function shieldLaw(spec) {
  return shell(spec, {
    equation: 'I = I₀ e^{−μ x}',
    authority: 'Krane, Introductory Nuclear Physics, 窄束指数衰减',
    assumptions: '窄束、单一 μ；公开教科书衰减，非屏蔽设计',
    fidelity: 'principle',
    params: { I0: 1, mu: 0.1, x: 5 },
    schema: {
      mu: S('μ', 'dynamics', '1/m', 0.01, 2),
      x: S('x', 'dynamics', 'm', 0, 20),
    },
    tick(state) {
      state.I = P(state.params, 'I0', 1) * Math.exp(-P(state.params, 'mu', 0.1) * P(state.params, 'x', 5));
    },
    plot: (s) => s.I,
    rows: (s) => [['I/I₀', s.I, '']],
  });
}

function larmor(spec) {
  return shell(spec, {
    equation: 'ω = γ B',
    authority: 'Levitt, Spin Dynamics, 拉莫尔进动（公开定义）',
    assumptions: '仅进动角频率，无脉冲序列、无临床方案',
    fidelity: 'principle',
    params: { gamma: 2.675e8, B: 1 },
    schema: {
      B: S('B', 'dynamics', 'T', 0.1, 7),
    },
    tick(state) {
      state.w = P(state.params, 'gamma', 2.675e8) * P(state.params, 'B', 1);
    },
    plot: (s) => s.w / 1e6,
    rows: (s) => [['ω/2π', s.w / (2 * Math.PI) / 1e6, 'MHz']],
  });
}

function criticality(spec) {
  return shell(spec, {
    equation: 'ρ = (k − 1)/k，n(t)=n₀ exp(ρ t / Λ)（点堆无缓发）',
    authority: 'Lamarsh & Baratta, Introduction to Nuclear Engineering, 点堆反应性定义',
    assumptions: '无缓发中子、常 Λ；公开教科书定义，非堆芯设计',
    fidelity: 'principle',
    params: { k: 1.001, Lambda: 1e-4, n0: 1 },
    schema: {
      k: S('k_eff', 'dynamics', '—', 0.9, 1.05),
      Lambda: S('Λ', 'dynamics', 's', 1e-5, 0.01),
    },
    tick(state) {
      const k = Math.max(0.5, P(state.params, 'k', 1.001));
      const Lam = Math.max(1e-6, P(state.params, 'Lambda', 1e-4));
      state.rho = (k - 1) / k;
      const expo = (state.rho / Lam) * Math.min(state.t, 0.05);
      state.n = P(state.params, 'n0', 1) * Math.exp(Math.max(-20, Math.min(20, expo)));
    },
    plot: (s) => s.rho,
    rows: (s) => [['ρ', s.rho, ''], ['n', s.n, '']],
  });
}

function hhBuffer(spec) {
  return shell(spec, {
    equation: 'pH = pKa + log10([A⁻]/[HA])',
    authority: 'Harris, Quantitative Chemical Analysis, Henderson–Hasselbalch',
    assumptions: '理想缓冲、浓度比即活度比',
    params: { pKa: 4.76, ratio: 1 },
    schema: {
      pKa: S('pKa', 'dynamics', '—', 2, 12),
      ratio: S('[A⁻]/[HA]', 'dynamics', '—', 0.05, 20),
    },
    tick(state) {
      state.pH = P(state.params, 'pKa', 4.76) + Math.log10(Math.max(1e-4, P(state.params, 'ratio', 1)));
    },
    plot: (s) => s.pH,
    rows: (s) => [['pH', s.pH, '']],
  });
}

function beerLambert(spec) {
  return shell(spec, {
    equation: 'A = ε c l',
    authority: 'Harris, Quantitative Chemical Analysis, Beer–Lambert',
    assumptions: '稀溶液、单色光',
    params: { eps: 100, c: 0.01, l: 1 },
    schema: {
      eps: S('ε', 'dynamics', 'L/mol·cm', 1, 1e4),
      c: S('c', 'dynamics', 'mol/L', 0, 0.1),
      l: S('l', 'dynamics', 'cm', 0.1, 5),
    },
    tick(state) {
      state.A = P(state.params, 'eps', 100) * P(state.params, 'c', 0.01) * P(state.params, 'l', 1);
    },
    plot: (s) => s.A,
    rows: (s) => [['A', s.A, '']],
  });
}

function cstr(spec) {
  return shell(spec, {
    equation: 'τ = V/v₀，一级 X = kτ/(1+kτ)',
    authority: 'Fogler, Elements of CRE, 等温稳态 CSTR 一级反应',
    assumptions: '等温、恒容、一级不可逆；非装置放大',
    params: { k: 0.2, tau: 5 },
    schema: {
      k: S('k', 'dynamics', '1/s', 0.01, 2),
      tau: S('τ', 'dynamics', 's', 0.1, 40),
    },
    tick(state) {
      const ktau = P(state.params, 'k', 0.2) * P(state.params, 'tau', 5);
      state.X = ktau / (1 + ktau);
    },
    plot: (s) => s.X,
    rows: (s) => [['X', s.X, '']],
  });
}

function secondOrderStep(spec) {
  return shell(spec, {
    equation: 'G(s)= ωₙ² / (s² + 2 ζ ωₙ s + ωₙ²)，单位阶跃',
    authority: 'Ogata, Modern Control Engineering, 二阶系统阶跃响应',
    assumptions: '零初值、单位增益、欠阻尼用标准欠阻尼解',
    params: { wn: 2, zeta: 0.3 },
    schema: {
      wn: S('ωₙ', 'dynamics', 'rad/s', 0.3, 8),
      zeta: S('ζ', 'dynamics', '—', 0.05, 1.5),
    },
    tick(state) {
      const wn = P(state.params, 'wn', 2);
      const z = P(state.params, 'zeta', 0.3);
      const t = state.t;
      if (z < 1) {
        const wd = wn * Math.sqrt(1 - z * z);
        state.y = 1 - Math.exp(-z * wn * t) * (Math.cos(wd * t) + (z * wn / wd) * Math.sin(wd * t));
      } else {
        state.y = 1 - Math.exp(-wn * t) * (1 + wn * t);
      }
    },
    plot: (s) => s.y,
    rows: (s) => [['y', s.y, '']],
  });
}

function dcMotor(spec) {
  return shell(spec, {
    equation: 'τ = K t I，ω = (V − I R) / K e（稳态，K_t=K_e）',
    authority: 'Ogata / 电机学教材，他励直流电机稳态电枢方程',
    assumptions: '稳态、忽略电感、K_t=K_e',
    params: { V: 24, R: 1, I: 2, K: 0.2 },
    schema: {
      V: S('V', 'dynamics', 'V', 0, 48),
      R: S('R', 'dynamics', 'Ω', 0.1, 10),
      I: S('I', 'dynamics', 'A', 0, 20),
      K: S('K', 'dynamics', 'N·m/A', 0.05, 1),
    },
    tick(state) {
      const I = P(state.params, 'I', 2);
      const K = Math.max(1e-3, P(state.params, 'K', 0.2));
      state.torque = K * I;
      state.w = (P(state.params, 'V', 24) - I * P(state.params, 'R', 1)) / K;
    },
    plot: (s) => s.w,
    rows: (s) => [['ω', s.w, 'rad/s'], ['τ', s.torque, 'N·m']],
  });
}

function grashof(spec) {
  return shell(spec, {
    equation: 'Grashof：s+l ≤ p+q 则可整周转动',
    authority: 'Norton, Design of Machinery, Grashof 准则',
    assumptions: '平面四杆、杆长为正',
    params: { s: 1, l: 4, p: 3, q: 3 },
    schema: {
      s: S('最短', 'dynamics', '—', 0.2, 5),
      l: S('最长', 'dynamics', '—', 1, 8),
      p: S('其余1', 'dynamics', '—', 0.5, 8),
      q: S('其余2', 'dynamics', '—', 0.5, 8),
    },
    tick(state) {
      const lens = [P(state.params, 's', 1), P(state.params, 'l', 4), P(state.params, 'p', 3), P(state.params, 'q', 3)].sort((a, b) => a - b);
      state.g = lens[0] + lens[3] <= lens[1] + lens[2] ? 1 : 0;
    },
    plot: (s) => s.g,
    rows: (s) => [['Grashof', s.g, '']],
  });
}

function camHarmonic(spec) {
  return shell(spec, {
    equation: 's = (h/2) (1 − cos ω t)（简谐凸轮升程）',
    authority: 'Norton, Design of Machinery, 简谐运动规律',
    assumptions: '升程段、无冲击修正',
    params: { h: 20, w: 2 },
    schema: {
      h: S('h', 'dynamics', 'mm', 1, 80),
      w: S('ω', 'dynamics', 'rad/s', 0.2, 8),
    },
    tick(state) {
      state.s = 0.5 * P(state.params, 'h', 20) * (1 - Math.cos(P(state.params, 'w', 2) * state.t));
    },
    plot: (s) => s.s,
    rows: (s) => [['s', s.s, 'mm']],
  });
}

function leverRule(spec) {
  return shell(spec, {
    equation: '固相分数 f_s = (c_L − c₀)/(c_L − c_S)',
    authority: 'Callister, Materials Science and Engineering, 杠杆定律',
    assumptions: '二元平衡、杠杆在同一温度结线',
    params: { cL: 0.6, cS: 0.1, c0: 0.3 },
    schema: {
      cL: S('c_L', 'dynamics', '—', 0, 1),
      cS: S('c_S', 'dynamics', '—', 0, 1),
      c0: S('c₀', 'dynamics', '—', 0, 1),
    },
    tick(state) {
      const cL = P(state.params, 'cL', 0.6);
      const cS = P(state.params, 'cS', 0.1);
      const c0 = P(state.params, 'c0', 0.3);
      const den = cL - cS;
      state.fs = Math.abs(den) < 1e-9 ? 0 : Math.min(1, Math.max(0, (cL - c0) / den));
    },
    plot: (s) => s.fs,
    rows: (s) => [['f_s', s.fs, '']],
  });
}

function maxwell(spec) {
  return shell(spec, {
    equation: 'f(v) ∝ v² exp(−m v² / 2 k T)',
    authority: 'Schroeder, An Introduction to Thermal Physics, 麦克斯韦速率分布',
    assumptions: '经典理想气体、三维速率',
    params: { T: 300 },
    schema: { T: S('T', 'dynamics', 'K', 50, 1000) },
    tick(state) {
      const T = Math.max(1, P(state.params, 'T', 300));
      const v = 200 + 400 * (0.5 + 0.5 * Math.sin(state.t));
      const kOverM = (1.380649e-23 / 4.65e-26);
      state.f = v * v * Math.exp(-(v * v) / (2 * kOverM * T));
      state.v = v;
    },
    plot: (s) => s.f,
    rows: (s) => [['f(v)', s.f, ''], ['v', s.v, 'm/s']],
  });
}

function doppler(spec) {
  return shell(spec, {
    equation: "f' = f (v + v_o) / (v + v_s)",
    authority: 'Halliday, 声波多普勒（源与观察者同线）',
    assumptions: '介质静止声速 v；符号：观察者朝源 vo>0，源朝观察者 vs<0 需自行取号。此处 vs 以离开观察者为正（分母 v+vs）',
    params: { f: 440, v: 340, vo: 0, vs: 20 },
    schema: {
      f: S('f', 'dynamics', 'Hz', 50, 2000),
      vo: S('v_o', 'dynamics', 'm/s', -50, 50),
      vs: S('v_s', 'dynamics', 'm/s', -50, 50),
    },
    tick(state) {
      const v = P(state.params, 'v', 340);
      const vs = P(state.params, 'vs', 20);
      state.fp = P(state.params, 'f', 440) * (v + P(state.params, 'vo', 0)) / Math.max(1, v + vs);
    },
    plot: (s) => s.fp,
    rows: (s) => [["f'", s.fp, 'Hz']],
  });
}

function spl(spec) {
  return shell(spec, {
    equation: 'L_p = 20 log10(p / p_ref)，p_ref=20 μPa',
    authority: 'Kinsler, Fundamentals of Acoustics, 声压级',
    assumptions: '空气参考声压',
    params: { p: 0.02 },
    schema: { p: S('p', 'dynamics', 'Pa', 2e-5, 20) },
    tick(state) {
      state.L = 20 * Math.log10(Math.max(1e-8, P(state.params, 'p', 0.02)) / 2e-5);
    },
    plot: (s) => s.L,
    rows: (s) => [['L_p', s.L, 'dB']],
  });
}

function waveTravel(spec) {
  return shell(spec, {
    equation: 'y = A sin(kx − ω t)',
    authority: 'Pain, The Physics of Vibrations and Waves, 行波',
    assumptions: '一维无色散、常波速',
    params: { A: 1, k: 2, w: 4 },
    schema: {
      A: S('A', 'dynamics', '—', 0, 3),
      k: S('k', 'dynamics', '1/m', 0.2, 8),
      w: S('ω', 'dynamics', 'rad/s', 0.2, 12),
    },
    tick(state) {
      state.y = P(state.params, 'A', 1) * Math.sin(P(state.params, 'k', 2) * 0.5 - P(state.params, 'w', 4) * state.t);
    },
    plot: (s) => s.y,
    rows: (s) => [['y', s.y, '']],
  });
}

function isingEnergy(spec) {
  return shell(spec, {
    equation: 'E = −J Σ s_i s_{i+1}（一维周期链）',
    authority: 'Ising, Z. Phys. 31 (1925)；一维精确能量',
    assumptions: '一维、近邻、无外场；不是二维临界现象求解器',
    fidelity: 'principle',
    params: { J: 1, up: 8, n: 10 },
    schema: {
      J: S('J', 'dynamics', '—', 0.1, 3),
      up: S('向上自旋数', 'dynamics', '—', 0, 16),
      n: S('N', 'dynamics', '—', 4, 16),
    },
    tick(state) {
      const n = Math.max(2, Math.round(P(state.params, 'n', 10)));
      const up = Math.max(0, Math.min(n, Math.round(P(state.params, 'up', 8))));
      const spins = Array.from({ length: n }, (_, i) => (i < up ? 1 : -1));
      let E = 0;
      for (let i = 0; i < n; i += 1) E += spins[i] * spins[(i + 1) % n];
      state.E = -P(state.params, 'J', 1) * E;
    },
    plot: (s) => s.E,
    rows: (s) => [['E', s.E, '']],
  });
}

function dijkstraBound(spec) {
  return shell(spec, {
    equation: '非负权松弛：d(v) ≤ d(u)+w(u,v)',
    authority: 'CLRS, Dijkstra',
    assumptions: '示意一条边的松弛，不代替完整图搜索；边权须非负',
    params: { du: 3, w: 2 },
    schema: {
      du: S('d(u)', 'dynamics', '—', 0, 20),
      w: S('w', 'dynamics', '—', 0, 10),
    },
    tick(state) {
      state.dv = P(state.params, 'du', 3) + P(state.params, 'w', 2);
    },
    plot: (s) => s.dv,
    rows: (s) => [['d(v)', s.dv, '']],
  });
}

function amdahl(spec) {
  return shell(spec, {
    equation: 'S = 1 / ((1−p) + p/n)',
    authority: 'Amdahl, AFIPS 1967；Hennessy & Patterson',
    assumptions: '可并行比例 p 固定',
    params: { p: 0.9, n: 8 },
    schema: {
      p: S('p', 'dynamics', '—', 0, 1),
      n: S('n', 'dynamics', '—', 1, 64),
    },
    tick(state) {
      const p = Math.min(1, Math.max(0, P(state.params, 'p', 0.9)));
      const n = Math.max(1, P(state.params, 'n', 8));
      state.S = 1 / ((1 - p) + p / n);
    },
    plot: (s) => s.S,
    rows: (s) => [['S', s.S, '']],
  });
}

function eoq(spec) {
  return shell(spec, {
    equation: 'EOQ = √(2 D S / H)',
    authority: 'Harris EOQ；Hopp & Spearman, Factory Physics',
    assumptions: '需求平稳、瞬时补货、无缺货',
    params: { D: 1000, S: 50, H: 2 },
    schema: {
      D: S('D', 'dynamics', '—', 10, 1e4),
      S: S('S', 'dynamics', '—', 1, 500),
      H: S('H', 'dynamics', '—', 0.1, 20),
    },
    tick(state) {
      state.Q = Math.sqrt(2 * P(state.params, 'D', 1000) * P(state.params, 'S', 50) / Math.max(1e-3, P(state.params, 'H', 2)));
    },
    plot: (s) => s.Q,
    rows: (s) => [['EOQ', s.Q, '']],
  });
}

function kepler(spec) {
  return shell(spec, {
    equation: 'T² = a³（以年为单位、太阳质量、a 以 AU）',
    authority: 'Murray & Dermott, Solar System Dynamics, 开普勒第三定律（太阳系单位）',
    assumptions: '二体、中心质量为太阳',
    params: { a: 1.5 },
    schema: { a: S('a', 'dynamics', 'AU', 0.2, 30) },
    tick(state) {
      const a = Math.max(0.05, P(state.params, 'a', 1.5));
      state.T = Math.sqrt(a ** 3);
    },
    plot: (s) => s.T,
    rows: (s) => [['T', s.T, 'yr']],
  });
}

function rocket(spec) {
  return shell(spec, {
    equation: 'Δv = v_e ln(m₀/m)',
    authority: 'Tsiolkovsky 火箭方程',
    assumptions: '真空、常喷气速度、无重力损失',
    params: { ve: 3000, m0: 100, m: 40 },
    schema: {
      ve: S('v_e', 'dynamics', 'm/s', 500, 4500),
      m0: S('m₀', 'dynamics', 'kg', 1, 500),
      m: S('m', 'dynamics', 'kg', 1, 500),
    },
    tick(state) {
      const m0 = Math.max(P(state.params, 'm', 40), P(state.params, 'm0', 100));
      const m = Math.min(m0, Math.max(0.1, P(state.params, 'm', 40)));
      state.dv = P(state.params, 've', 3000) * Math.log(m0 / m);
    },
    plot: (s) => s.dv,
    rows: (s) => [['Δv', s.dv, 'm/s']],
  });
}

function clift(spec) {
  return shell(spec, {
    equation: 'L = ½ ρ v² S C_L',
    authority: 'Anderson, Fundamentals of Aerodynamics, 升力定义',
    assumptions: '给定 C_L，不求解流场',
    params: { rho: 1.2, v: 50, S: 16, Cl: 0.5 },
    schema: {
      v: S('v', 'dynamics', 'm/s', 0, 200),
      S: S('S', 'dynamics', 'm²', 1, 80),
      Cl: S('C_L', 'dynamics', '—', 0, 1.6),
    },
    tick(state) {
      const v = P(state.params, 'v', 50);
      state.L = 0.5 * P(state.params, 'rho', 1.2) * v * v * P(state.params, 'S', 16) * P(state.params, 'Cl', 0.5);
    },
    plot: (s) => s.L,
    rows: (s) => [['L', s.L, 'N']],
  });
}

function reynolds(spec) {
  return shell(spec, {
    equation: 'Re = ρ v D / μ',
    authority: 'White, Fluid Mechanics, 雷诺数',
    assumptions: '特征长度 D',
    params: { rho: 1000, v: 1, D: 0.05, mu: 0.001 },
    schema: {
      v: S('v', 'dynamics', 'm/s', 0, 10),
      D: S('D', 'dynamics', 'm', 0.001, 1),
      mu: S('μ', 'dynamics', 'Pa·s', 1e-5, 0.1),
    },
    tick(state) {
      state.Re = P(state.params, 'rho', 1000) * P(state.params, 'v', 1) * P(state.params, 'D', 0.05) / Math.max(1e-8, P(state.params, 'mu', 0.001));
    },
    plot: (s) => s.Re,
    rows: (s) => [['Re', s.Re, '']],
  });
}

function bernoulli(spec) {
  return shell(spec, {
    equation: 'P + ½ ρ v² + ρ g h = const',
    authority: 'White, Fluid Mechanics, 伯努利方程',
    assumptions: '定常、不可压、沿流线、无摩擦',
    params: { P: 1e5, rho: 1000, v: 2, h: 1 },
    schema: {
      P: S('P', 'dynamics', 'Pa', 0, 3e5),
      v: S('v', 'dynamics', 'm/s', 0, 15),
      h: S('h', 'dynamics', 'm', 0, 20),
    },
    tick(state) {
      const rho = P(state.params, 'rho', 1000);
      state.H = P(state.params, 'P', 1e5) + 0.5 * rho * P(state.params, 'v', 2) ** 2 + rho * 9.81 * P(state.params, 'h', 1);
    },
    plot: (s) => s.H,
    rows: (s) => [['Bernoulli', s.H, 'Pa']],
  });
}

function compton(spec) {
  return shell(spec, {
    equation: 'Δλ = λ_c (1 − cosθ)，λ_c=2.426 pm',
    authority: 'Compton, Phys. Rev. 21 (1923)；Halliday 康普顿散射',
    assumptions: '自由电子、弹性',
    params: { theta: 90 },
    schema: { theta: S('θ', 'dynamics', '°', 0, 180) },
    tick(state) {
      const lc = 2.426e-12;
      state.dl = lc * (1 - Math.cos(P(state.params, 'theta', 90) * Math.PI / 180));
    },
    plot: (s) => s.dl * 1e12,
    rows: (s) => [['Δλ', s.dl * 1e12, 'pm']],
  });
}

function debroglie(spec) {
  return shell(spec, {
    equation: 'λ = h / p',
    authority: 'de Broglie；Griffiths QM 引言',
    assumptions: '自由粒子动量 p',
    params: { p: 1e-24 },
    schema: { p: S('p', 'dynamics', 'kg·m/s', 1e-26, 1e-22) },
    tick(state) {
      const h = 6.62607015e-34;
      state.lam = h / Math.max(1e-30, P(state.params, 'p', 1e-24));
    },
    plot: (s) => s.lam * 1e9,
    rows: (s) => [['λ', s.lam * 1e9, 'nm']],
  });
}

function uncertainty(spec) {
  return shell(spec, {
    equation: 'Δx Δp ≥ ℏ/2',
    authority: 'Griffiths, QM, 不确定度原理（Kennard 形式）',
    assumptions: '展示等号下限，不是测量操作手册',
    params: { dx: 1e-10 },
    schema: { dx: S('Δx', 'dynamics', 'm', 1e-12, 1e-8) },
    tick(state) {
      const hbar = 1.054571817e-34;
      state.dp = (hbar / 2) / Math.max(1e-15, P(state.params, 'dx', 1e-10));
    },
    plot: (s) => s.dp,
    rows: (s) => [['Δp_min', s.dp, 'kg·m/s']],
  });
}

function tunnel(spec) {
  return shell(spec, {
    equation: 'T ≈ exp(−2 κ L)，κ=√(2m(V−E))/ℏ',
    authority: 'Griffiths, QM, 厚势垒近似',
    assumptions: 'E<V、厚垒、矩形垒近似',
    fidelity: 'principle',
    params: { V: 5, E: 2, L: 0.5 },
    schema: {
      V: S('V', 'dynamics', 'eV', 0.5, 20),
      E: S('E', 'dynamics', 'eV', 0.1, 10),
      L: S('L', 'dynamics', 'nm', 0.05, 2),
    },
    tick(state) {
      const hbar = 1.054571817e-34;
      const m = 9.1093837e-31;
      const eV = 1.602176634e-19;
      const V = P(state.params, 'V', 5);
      const E = Math.min(V - 0.01, P(state.params, 'E', 2));
      const L = P(state.params, 'L', 0.5) * 1e-9;
      const kappa = Math.sqrt(2 * m * (V - E) * eV) / hbar;
      state.T = Math.exp(-2 * kappa * L);
    },
    plot: (s) => s.T,
    rows: (s) => [['T', s.T, '']],
  });
}

function stefan(spec) {
  return shell(spec, {
    equation: 'j = σ T⁴',
    authority: 'Stefan–Boltzmann 定律；Rybicki & Lightman, Radiative Processes',
    assumptions: '黑体、半球辐射出射度',
    params: { T: 300 },
    schema: { T: S('T', 'dynamics', 'K', 100, 2000) },
    tick(state) {
      const sigma = 5.670374419e-8;
      state.j = sigma * P(state.params, 'T', 300) ** 4;
    },
    plot: (s) => s.j,
    rows: (s) => [['j', s.j, 'W/m²']],
  });
}

function hall(spec) {
  return shell(spec, {
    equation: 'V_H = I B / (n e t)',
    authority: 'Ashcroft & Mermin 或 Halliday，霍尔电压',
    assumptions: '单一载流子、薄片厚度 t',
    params: { I: 0.01, B: 0.5, n: 1e22, thick: 1e-4 },
    schema: {
      I: S('I', 'dynamics', 'A', 0, 1),
      B: S('B', 'dynamics', 'T', 0, 2),
      thick: S('厚度 t', 'dynamics', 'm', 1e-5, 0.002),
    },
    tick(state) {
      const e = 1.602176634e-19;
      const n = Math.max(1e18, P(state.params, 'n', 1e22));
      const thick = Math.max(1e-6, P(state.params, 'thick', 1e-4));
      state.VH = P(state.params, 'I', 0.01) * P(state.params, 'B', 0.5) / (n * e * thick);
    },
    plot: (s) => s.VH,
    rows: (s) => [['V_H', s.VH, 'V']],
  });
}

/** Separate from classical hall() so a future filling-factor law cannot rewrite V_H. */
function quantumHall(spec) {
  return shell(spec, {
    equation: 'V_H = I B / (n e t)',
    authority: 'Ashcroft & Mermin 或 Halliday，霍尔电压（量子霍尔教学入口，仍用经典厚度式）',
    assumptions: '单一载流子、薄片厚度 t；公开教科书入口，不是填充因子量子霍尔设计工具',
    params: { I: 0.01, B: 0.5, n: 1e22, thick: 1e-4 },
    schema: {
      I: S('I', 'dynamics', 'A', 0, 1),
      B: S('B', 'dynamics', 'T', 0, 2),
      thick: S('厚度 t', 'dynamics', 'm', 1e-5, 0.002),
    },
    tick(state) {
      const e = 1.602176634e-19;
      const n = Math.max(1e18, P(state.params, 'n', 1e22));
      const thick = Math.max(1e-6, P(state.params, 'thick', 1e-4));
      state.VH = P(state.params, 'I', 0.01) * P(state.params, 'B', 0.5) / (n * e * thick);
    },
    plot: (s) => s.VH,
    rows: (s) => [['V_H', s.VH, 'V']],
  });
}

function faraday(spec) {
  return shell(spec, {
    equation: 'ε = − dΦ/dt，此处 Φ = B A sin(ω t) 的幅值变化率峰值 B A ω',
    authority: 'Griffiths, Electrodynamics, Ch. 7 法拉第定律',
    assumptions: '均匀场、单匝、正弦磁通',
    params: { B: 0.2, A: 0.01, w: 10 },
    schema: {
      B: S('B', 'dynamics', 'T', 0, 2),
      A: S('A', 'dynamics', 'm²', 1e-4, 0.2),
      w: S('ω', 'dynamics', 'rad/s', 0, 100),
    },
    tick(state) {
      const B = P(state.params, 'B', 0.2);
      const A = P(state.params, 'A', 0.01);
      const w = P(state.params, 'w', 10);
      state.eps = -B * A * w * Math.cos(w * state.t);
    },
    plot: (s) => s.eps,
    rows: (s) => [['ε', s.eps, 'V']],
  });
}

function transformer(spec) {
  return shell(spec, {
    equation: 'V₂/V₁ = N₂/N₁（理想变压器）',
    authority: 'Nilsson & Riedel, 理想变压器',
    assumptions: '全耦合、无损耗',
    params: { V1: 220, N1: 100, N2: 20 },
    schema: {
      V1: S('V₁', 'dynamics', 'V', 1, 500),
      N1: S('N₁', 'dynamics', '—', 1, 500),
      N2: S('N₂', 'dynamics', '—', 1, 500),
    },
    tick(state) {
      state.V2 = P(state.params, 'V1', 220) * P(state.params, 'N2', 20) / Math.max(1, P(state.params, 'N1', 100));
    },
    plot: (s) => s.V2,
    rows: (s) => [['V₂', s.V2, 'V']],
  });
}

function capacitor(spec) {
  return shell(spec, {
    equation: 'C = ε₀ ε_r A / d，Q = C V，U = ½ C V²',
    authority: 'Griffiths, Ch. 2 平行板电容',
    assumptions: '平行板、忽略边缘',
    params: { A: 0.01, d: 0.001, V: 10, er: 1 },
    schema: {
      A: S('A', 'dynamics', 'm²', 1e-4, 0.1),
      d: S('d', 'dynamics', 'm', 1e-4, 0.02),
      V: S('V', 'dynamics', 'V', 0, 100),
      er: S('ε_r', 'dynamics', '—', 1, 80),
    },
    tick(state) {
      const eps0 = 8.8541878128e-12;
      state.C = eps0 * P(state.params, 'er', 1) * P(state.params, 'A', 0.01) / Math.max(1e-6, P(state.params, 'd', 0.001));
      state.Q = state.C * P(state.params, 'V', 10);
      state.U = 0.5 * state.C * P(state.params, 'V', 10) ** 2;
    },
    plot: (s) => s.C * 1e12,
    rows: (s) => [['C', s.C * 1e12, 'pF'], ['U', s.U, 'J']],
  });
}

function lorentzRadius(spec) {
  return shell(spec, {
    equation: 'R = m v_⊥ / (|q| B)，ω = |q| B / m',
    authority: 'Griffiths, Ch. 5 均匀磁场中的回旋',
    assumptions: '均匀 B、垂直速度、忽略辐射',
    params: { v: 1e6, B: 0.1 },
    schema: {
      v: S('v', 'dynamics', 'm/s', 1e4, 1e7),
      B: S('B', 'dynamics', 'T', 0.01, 2),
    },
    tick(state) {
      const q = 1.602176634e-19;
      const m = 9.1093837e-31;
      const B = Math.max(1e-4, P(state.params, 'B', 0.1));
      state.R = m * P(state.params, 'v', 1e6) / (q * B);
      state.w = q * B / m;
    },
    plot: (s) => s.R,
    rows: (s) => [['R', s.R, 'm'], ['ω', s.w, 'rad/s']],
  });
}

function ampere(spec) {
  return shell(spec, {
    equation: 'F = I L B sinθ',
    authority: 'Halliday, 安培力',
    assumptions: '直导线、均匀场',
    params: { I: 2, L: 0.3, B: 0.4, theta: 90 },
    schema: {
      I: S('I', 'dynamics', 'A', 0, 20),
      L: S('L', 'dynamics', 'm', 0.05, 2),
      B: S('B', 'dynamics', 'T', 0, 2),
      theta: S('θ', 'dynamics', '°', 0, 180),
    },
    tick(state) {
      state.F = P(state.params, 'I', 2) * P(state.params, 'L', 0.3) * P(state.params, 'B', 0.4) * Math.sin(P(state.params, 'theta', 90) * Math.PI / 180);
    },
    plot: (s) => s.F,
    rows: (s) => [['F', s.F, 'N']],
  });
}

function beats(spec) {
  return shell(spec, {
    equation: 'y = 2 cos(Δω t / 2) sin(ω t)',
    authority: 'French, Vibrations and Waves, 拍',
    assumptions: '两等幅近频简谐叠加',
    params: { w1: 8, w2: 9 },
    schema: {
      w1: S('ω₁', 'dynamics', 'rad/s', 1, 20),
      w2: S('ω₂', 'dynamics', 'rad/s', 1, 20),
    },
    tick(state) {
      const w1 = P(state.params, 'w1', 8);
      const w2 = P(state.params, 'w2', 9);
      const dw = w2 - w1;
      const w = 0.5 * (w1 + w2);
      state.y = 2 * Math.cos(0.5 * dw * state.t) * Math.sin(w * state.t);
    },
    plot: (s) => s.y,
    rows: (s) => [['y', s.y, '']],
  });
}

function soundSpeed(spec) {
  return shell(spec, {
    equation: 'v ≈ 331 √(T/273) m/s（干燥空气近似）',
    authority: 'Kinsler, Fundamentals of Acoustics, 声速与温度',
    assumptions: '理想气体空气、0 °C 为 331 m/s 的常用近似',
    params: { T: 293 },
    schema: { T: S('T', 'dynamics', 'K', 230, 350) },
    tick(state) {
      state.v = 331 * Math.sqrt(Math.max(1, P(state.params, 'T', 293)) / 273.15);
    },
    plot: (s) => s.v,
    rows: (s) => [['v', s.v, 'm/s']],
  });
}

function sabine(spec) {
  return shell(spec, {
    equation: 'T60 = 0.161 V / A',
    authority: 'Kuttruff, Room Acoustics, Sabine 公式',
    assumptions: '扩散场、A 为总吸声量 m²',
    params: { V: 200, A: 20 },
    schema: {
      V: S('V', 'dynamics', 'm³', 10, 2000),
      A: S('A', 'dynamics', 'm²', 1, 200),
    },
    tick(state) {
      state.T60 = 0.161 * P(state.params, 'V', 200) / Math.max(0.1, P(state.params, 'A', 20));
    },
    plot: (s) => s.T60,
    rows: (s) => [['T60', s.T60, 's']],
  });
}

function doubleSlit(spec) {
  return shell(spec, {
    equation: 'Δy = λ L / d',
    authority: 'Hecht, Optics, 杨氏双缝条纹间距',
    assumptions: '远场、小角',
    params: { lambda: 550e-9, L: 1, d: 0.2e-3 },
    schema: {
      L: S('L', 'dynamics', 'm', 0.2, 3),
      d: S('d', 'dynamics', 'm', 0.05e-3, 1e-3),
    },
    tick(state) {
      state.dy = P(state.params, 'lambda', 550e-9) * P(state.params, 'L', 1) / Math.max(1e-6, P(state.params, 'd', 2e-4));
    },
    plot: (s) => s.dy * 1000,
    rows: (s) => [['Δy', s.dy * 1000, 'mm']],
  });
}

function bohr(spec) {
  return shell(spec, {
    equation: 'E_n = −13.6 eV / n²',
    authority: 'Bohr 模型；Bransden & Joachain 历史模型章节',
    assumptions: '类氢、玻尔模型不是现代量子化学',
    fidelity: 'principle',
    params: { n: 2 },
    schema: { n: S('n', 'dynamics', '—', 1, 8) },
    tick(state) {
      const n = Math.max(1, Math.round(P(state.params, 'n', 2)));
      state.E = -13.6 / (n * n);
    },
    plot: (s) => s.E,
    rows: (s) => [['E_n', s.E, 'eV']],
  });
}

function hashLoad(spec) {
  return shell(spec, {
    equation: '链地址期望链长 α = n / m',
    authority: 'CLRS, 哈希表装载因子',
    assumptions: '简单均匀哈希',
    params: { n: 80, m: 100 },
    schema: {
      n: S('n', 'dynamics', '—', 1, 500),
      m: S('m', 'dynamics', '—', 1, 500),
    },
    tick(state) {
      state.alpha = P(state.params, 'n', 80) / Math.max(1, P(state.params, 'm', 100));
    },
    plot: (s) => s.alpha,
    rows: (s) => [['α', s.alpha, '']],
  });
}

function pageReplace(spec) {
  return shell(spec, {
    equation: 'LRU：最近最少使用被替换（给定引用串的命中数）',
    authority: 'Silberschatz, Operating System Concepts, 页置换',
    assumptions: '固定引用串 1,2,3,4,1,2,5,1,2,3,4,5；帧数可调',
    params: { frames: 3 },
    schema: { frames: S('帧', 'dynamics', '—', 1, 6) },
    tick(state) {
      const frames = Math.max(1, Math.round(P(state.params, 'frames', 3)));
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
    rows: (s) => [['hits', s.hit, '']],
  });
}

function rsaMod(spec) {
  return shell(spec, {
    equation: 'c = m^e mod n（教学小整数）',
    authority: 'Katz & Lindell, Introduction to Modern Cryptography, RSA 定义',
    assumptions: '仅小整数演示加密定义，不生成密钥、不攻击',
    fidelity: 'principle',
    params: { m: 7, e: 3, n: 33 },
    schema: {
      m: S('m', 'dynamics', '—', 0, 30),
      e: S('e', 'dynamics', '—', 1, 9),
      n: S('n', 'dynamics', '—', 2, 97),
    },
    tick(state) {
      const n = Math.max(2, Math.round(P(state.params, 'n', 33)));
      let m = Math.round(P(state.params, 'm', 7)) % n;
      const e = Math.max(1, Math.round(P(state.params, 'e', 3)));
      let c = 1;
      for (let i = 0; i < e; i += 1) c = (c * m) % n;
      state.c = c;
    },
    plot: (s) => s.c,
    rows: (s) => [['c', s.c, '']],
  });
}

function caesar(spec) {
  return shell(spec, {
    equation: 'c = (p + k) mod 26',
    authority: '古典移位密码定义',
    assumptions: '单字母、不提供破译流程',
    fidelity: 'principle',
    params: { p: 3, k: 5 },
    schema: {
      p: S('p', 'dynamics', '—', 0, 25),
      k: S('k', 'dynamics', '—', 0, 25),
    },
    tick(state) {
      state.c = (Math.round(P(state.params, 'p', 3)) + Math.round(P(state.params, 'k', 5))) % 26;
    },
    plot: (s) => s.c,
    rows: (s) => [['c', s.c, '']],
  });
}

function gdQuadratic(spec) {
  return shell(spec, {
    equation: 'x ← x − η · 2(x − a)（最小化 (x−a)²）',
    authority: 'Nocedal & Wright, Numerical Optimization, 梯度下降',
    assumptions: '一维二次、固定步长',
    params: { x: 4, a: 1, eta: 0.2 },
    schema: {
      x: S('x₀', 'initial', '—', -5, 5),
      a: S('a', 'dynamics', '—', -3, 3),
      eta: S('η', 'dynamics', '—', 0.01, 0.5),
    },
    init(state) {
      state.x = P(state.params, 'x', 4);
    },
    tick(state, h) {
      if (h <= 0) {
        state.x = P(state.params, 'x', 4);
        return;
      }
      const a = P(state.params, 'a', 1);
      const eta = P(state.params, 'eta', 0.2);
      state.x -= eta * 2 * (state.x - a);
    },
    plot: (s) => s.x,
    rows: (s) => [['x', s.x, '']],
  });
}

function kmeans1d(spec) {
  return shell(spec, {
    equation: '一维两点：中心更新为所属样本均值',
    authority: 'Bishop, PRML, K-means',
    assumptions: '固定样本 {0,0.2,0.8,1}，两中心',
    params: { c1: 0, c2: 1 },
    schema: {
      c1: S('c₁', 'initial', '—', -1, 2),
      c2: S('c₂', 'initial', '—', -1, 2),
    },
    init(state) {
      state.c1 = P(state.params, 'c1', 0);
      state.c2 = P(state.params, 'c2', 1);
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
    rows: (s) => [['c₁', s.c1, ''], ['c₂', s.c2, '']],
  });
}

function binarySearchSteps(spec) {
  return shell(spec, {
    equation: '比较次数上界 ⌊log₂ n⌋+1',
    authority: 'CLRS, 二分查找',
    assumptions: '有序数组',
    params: { n: 1000 },
    schema: { n: S('n', 'dynamics', '—', 1, 1e6) },
    tick(state) {
      const n = Math.max(1, P(state.params, 'n', 1000));
      state.steps = Math.floor(Math.log2(n)) + 1;
    },
    plot: (s) => s.steps,
    rows: (s) => [['steps', s.steps, '']],
  });
}

function editDistance(spec) {
  return shell(spec, {
    equation: 'Levenshtein：插入/删除/替换代价 1',
    authority: 'CLRS, 编辑距离',
    assumptions: '固定串 kitten → sitting 的长度演示改为长度差上界；用两短串 a,b 的长度参数做精确 DP',
    params: { la: 4, lb: 6 },
    schema: {
      la: S('|a|', 'dynamics', '—', 0, 8),
      lb: S('|b|', 'dynamics', '—', 0, 8),
    },
    tick(state) {
      const la = Math.max(0, Math.round(P(state.params, 'la', 4)));
      const lb = Math.max(0, Math.round(P(state.params, 'lb', 6)));
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
    rows: (s) => [['d', s.d, '']],
  });
}

function nyquist(spec) {
  return shell(spec, {
    equation: 'f_s ≥ 2 f_max',
    authority: 'Oppenheim & Schafer, Discrete-Time Signal Processing, 采样定理',
    assumptions: '带限、理想采样',
    params: { fmax: 1000 },
    schema: { fmax: S('f_max', 'dynamics', 'Hz', 1, 2e4) },
    tick(state) {
      state.fs = 2 * P(state.params, 'fmax', 1000);
    },
    plot: (s) => s.fs,
    rows: (s) => [['f_s,min', s.fs, 'Hz']],
  });
}

function pwm(spec) {
  return shell(spec, {
    equation: 'V_avg = D · V',
    authority: 'Mohan, Power Electronics, PWM 平均值',
    assumptions: '理想开关、占空比 D∈[0,1]',
    params: { D: 0.4, V: 12 },
    schema: {
      D: S('D', 'dynamics', '—', 0, 1),
      V: S('V', 'dynamics', 'V', 0, 48),
    },
    tick(state) {
      state.v = Math.min(1, Math.max(0, P(state.params, 'D', 0.4))) * P(state.params, 'V', 12);
    },
    plot: (s) => s.v,
    rows: (s) => [['V_avg', s.v, 'V']],
  });
}

function reflectionCoeff(spec) {
  return shell(spec, {
    equation: 'Γ = (Z_L − Z₀) / (Z_L + Z₀)',
    authority: 'Pozar, Microwave Engineering, 电压反射系数',
    assumptions: '实阻抗',
    params: { ZL: 75, Z0: 50 },
    schema: {
      ZL: S('Z_L', 'dynamics', 'Ω', 1, 300),
      Z0: S('Z₀', 'dynamics', 'Ω', 1, 300),
    },
    tick(state) {
      const ZL = P(state.params, 'ZL', 75);
      const Z0 = P(state.params, 'Z0', 50);
      state.G = (ZL - Z0) / (ZL + Z0);
    },
    plot: (s) => s.G,
    rows: (s) => [['Γ', s.G, '']],
  });
}

function blackbodyPeak(spec) {
  return shell(spec, {
    equation: 'λ_max T = 2.897×10⁻³ m·K（维恩位移）',
    authority: 'Rybicki & Lightman, 维恩位移定律',
    assumptions: '黑体谱峰',
    params: { T: 5800 },
    schema: { T: S('T', 'dynamics', 'K', 300, 10000) },
    tick(state) {
      state.lam = 2.897e-3 / Math.max(1, P(state.params, 'T', 5800));
    },
    plot: (s) => s.lam * 1e9,
    rows: (s) => [['λ_max', s.lam * 1e9, 'nm']],
  });
}

function hubble(spec) {
  return shell(spec, {
    equation: 'v = H₀ d，z ≈ v/c（低红移）',
    authority: 'Ryden, Introduction to Cosmology, 哈勃–勒梅特定律',
    assumptions: '低红移、H₀=70 km/s/Mpc',
    fidelity: 'principle',
    params: { d: 100 },
    schema: { d: S('d', 'dynamics', 'Mpc', 1, 1000) },
    tick(state) {
      const H0 = 70;
      state.v = H0 * P(state.params, 'd', 100);
      state.z = (state.v * 1e3) / 2.99792458e8;
    },
    plot: (s) => s.v,
    rows: (s) => [['v', s.v, 'km/s'], ['z', s.z, '']],
  });
}

function prisoner(spec) {
  return shell(spec, {
    equation: '囚徒困境：双方背叛是纯策略纳什（收益 T>R>P>S）',
    authority: 'Osborne, An Introduction to Game Theory',
    assumptions: '标准排序 T>R>P>S',
    params: { T: 5, R: 3, P: 1, S: 0 },
    schema: {
      T: S('T', 'dynamics', '—', 0, 10),
      R: S('R', 'dynamics', '—', 0, 10),
      P: S('P', 'dynamics', '—', 0, 10),
      S: S('S', 'dynamics', '—', 0, 10),
    },
    tick(state) {
      state.nash = P(state.params, 'P', 1);
    },
    plot: (s) => s.nash,
    rows: (s) => [['u(背叛,背叛)', s.nash, '']],
  });
}

function draftRatio(spec) {
  return shell(spec, {
    equation: '牵伸比 E = v₂ / v₁',
    authority: 'Lawrence, Fundamentals of Spun Yarn Technology, 牵伸定义',
    assumptions: '两罗拉线速度、无滑溜',
    params: { v1: 1, v2: 8 },
    schema: {
      v1: S('v₁', 'dynamics', 'm/min', 0.1, 20),
      v2: S('v₂', 'dynamics', 'm/min', 0.1, 80),
    },
    tick(state) {
      state.E = P(state.params, 'v2', 8) / Math.max(1e-3, P(state.params, 'v1', 1));
    },
    plot: (s) => s.E,
    rows: (s) => [['E', s.E, '']],
  });
}

function irrigation(spec) {
  return shell(spec, {
    equation: 'Q = A d / t',
    authority: '灌溉水量平衡（体积 = 面积 × 水深）',
    assumptions: '均匀灌水深、无损失；不是渠道设计工具',
    params: { A: 1000, d: 0.03, duration: 3600 },
    schema: {
      A: S('面积 A', 'dynamics', 'm²', 10, 1e5),
      d: S('水深 d', 'dynamics', 'm', 0.001, 0.2),
      duration: S('时长 t', 'dynamics', 's', 60, 86400),
    },
    tick(state) {
      const duration = Math.max(1, P(state.params, 'duration', 3600));
      state.Q = P(state.params, 'A', 1000) * P(state.params, 'd', 0.03) / duration;
    },
    plot: (s) => s.Q,
    rows: (s) => [['Q', s.Q, 'm³/s']],
  });
}

function isolation(spec) {
  return shell(spec, {
    equation: 'T_r = √( (1+(2ζr)²) / ((1−r²)²+(2ζr)²) )',
    authority: 'Inman, Engineering Vibration, 力传递率',
    assumptions: '单自由度、粘滞阻尼、基座固定',
    params: { r: 1.5, zeta: 0.1 },
    schema: {
      r: S('ω/ωₙ', 'dynamics', '—', 0, 4),
      zeta: S('ζ', 'dynamics', '—', 0.01, 0.5),
    },
    tick(state) {
      const r = P(state.params, 'r', 1.5);
      const z = P(state.params, 'zeta', 0.1);
      const num = 1 + (2 * z * r) ** 2;
      const den = (1 - r * r) ** 2 + (2 * z * r) ** 2;
      state.Tr = Math.sqrt(num / Math.max(1e-9, den));
    },
    plot: (s) => s.Tr,
    rows: (s) => [['T_r', s.Tr, '']],
  });
}

function phugoid(spec) {
  return shell(spec, {
    equation: 'T ≈ π √2 · V / g（浮沉模态周期近似）',
    authority: 'Etkin, Dynamics of Flight, 浮沉近似',
    assumptions: '小扰动、常高度附近的近似周期，不是六自由度仿真',
    fidelity: 'principle',
    params: { V: 60 },
    schema: { V: S('V', 'dynamics', 'm/s', 20, 250) },
    tick(state) {
      state.T = Math.PI * Math.SQRT2 * P(state.params, 'V', 60) / 9.81;
    },
    plot: (s) => s.T,
    rows: (s) => [['T', s.T, 's']],
  });
}

function hookeSpringEnergy(spec) {
  return shell(spec, {
    equation: 'U = ½ k x²，F = −k x',
    authority: 'Thornton & Marion, 胡克定律',
    assumptions: '线弹性小变形',
    params: { k: 20, x: 0.1 },
    schema: {
      k: S('k', 'dynamics', 'N/m', 1, 200),
      x: S('x', 'dynamics', 'm', -0.5, 0.5),
    },
    tick(state) {
      const x = P(state.params, 'x', 0.1);
      const k = P(state.params, 'k', 20);
      state.F = -k * x;
      state.U = 0.5 * k * x * x;
    },
    plot: (s) => s.U,
    rows: (s) => [['F', s.F, 'N'], ['U', s.U, 'J']],
  });
}

function arrhenius(spec) {
  return shell(spec, {
    equation: 'k = A exp(−E_a / R T)',
    authority: 'Fogler, CRE, Arrhenius',
    assumptions: 'R=8.314 J/mol·K；不是反应器设计',
    params: { A: 1e6, Ea: 50000, T: 350 },
    schema: {
      Ea: S('E_a', 'dynamics', 'J/mol', 1000, 1.2e5),
      T: S('T', 'dynamics', 'K', 250, 800),
    },
    tick(state) {
      const R = 8.314;
      state.k = P(state.params, 'A', 1e6) * Math.exp(-P(state.params, 'Ea', 50000) / (R * Math.max(1, P(state.params, 'T', 350))));
    },
    plot: (s) => s.k,
    rows: (s) => [['k', s.k, '']],
  });
}

function nernst(spec) {
  return shell(spec, {
    equation: 'E = E⁰ − (RT/nF) ln Q',
    authority: 'Bard & Faulkner, Electrochemical Methods, 能斯特方程',
    assumptions: '活度以浓度代替。等价指数 e^{nFE/RT} 按双精度计算，不在 ±40 处截断；ln 的自变量低于 10⁻⁶ 时按 10⁻⁶',
    params: { E0: 1, n: 1, Q: 0.1, T: 298 },
    schema: {
      E0: S('E⁰', 'dynamics', 'V', -2, 2),
      n: S('n', 'dynamics', '—', 1, 4),
      Q: S('Q', 'dynamics', '—', 0.01, 10),
      T: S('T', 'dynamics', 'K', 273, 373),
    },
    tick(state) {
      const R = 8.314;
      const F = 96485;
      const n = Math.max(1, P(state.params, 'n', 1));
      state.E = P(state.params, 'E0', 1) - (R * P(state.params, 'T', 298) / (n * F)) * Math.log(Math.max(1e-6, P(state.params, 'Q', 0.1)));
    },
    plot: (s) => s.E,
    rows: (s) => [['E', s.E, 'V']],
  });
}

function blackScholes(spec) {
  return shell(spec, {
    equation: '欧式看涨：C = S Φ(d1) − K e^{−rT} Φ(d2)',
    authority: 'Hull, Options, Futures, and Other Derivatives, Black–Scholes–Merton',
    assumptions: '无股利、常波动率、欧式；Φ 为标准正态 cdf 近似',
    fidelity: 'engineering',
    params: { S: 100, K: 100, r: 0.02, sigma: 0.2, T: 1 },
    schema: {
      S: S('S', 'dynamics', '—', 10, 200),
      K: S('K', 'dynamics', '—', 10, 200),
      sigma: S('σ', 'dynamics', '—', 0.05, 0.8),
      T: S('T', 'dynamics', 'yr', 0.05, 3),
      r: S('r', 'dynamics', '—', 0, 0.1),
    },
    tick(state) {
      const S = P(state.params, 'S', 100);
      const K = P(state.params, 'K', 100);
      const r = P(state.params, 'r', 0.02);
      const sig = Math.max(1e-3, P(state.params, 'sigma', 0.2));
      const T = Math.max(1e-3, P(state.params, 'T', 1));
      const d1 = (Math.log(S / K) + (r + 0.5 * sig * sig) * T) / (sig * Math.sqrt(T));
      const d2 = d1 - sig * Math.sqrt(T);
      const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
      state.C = S * Phi(d1) - K * Math.exp(-r * T) * Phi(d2);
    },
    plot: (s) => s.C,
    rows: (s) => [['C', s.C, '']],
  });
}

function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return sign * y;
}

function forwardKinematics(spec) {
  return shell(spec, {
    equation: '平面 2R：x = l₁ cosθ₁ + l₂ cos(θ₁+θ₂)',
    authority: 'Craig, Introduction to Robotics, 平面双连杆正运动学',
    assumptions: '平面、两转动关节',
    params: { l1: 1, l2: 0.8, th1: 30, th2: 20 },
    schema: {
      l1: S('l₁', 'dynamics', 'm', 0.2, 2),
      l2: S('l₂', 'dynamics', 'm', 0.2, 2),
      th1: S('θ₁', 'dynamics', '°', -180, 180),
      th2: S('θ₂', 'dynamics', '°', -180, 180),
    },
    tick(state) {
      const th1 = P(state.params, 'th1', 30) * Math.PI / 180;
      const th2 = P(state.params, 'th2', 20) * Math.PI / 180;
      state.x = P(state.params, 'l1', 1) * Math.cos(th1) + P(state.params, 'l2', 0.8) * Math.cos(th1 + th2);
      state.y = P(state.params, 'l1', 1) * Math.sin(th1) + P(state.params, 'l2', 0.8) * Math.sin(th1 + th2);
    },
    plot: (s) => s.x,
    rows: (s) => [['x', s.x, 'm'], ['y', s.y, 'm']],
  });
}

function reliability(spec) {
  return shell(spec, {
    equation: 'R(t) = exp(−λ t)',
    authority: 'Ebeling, An Introduction to Reliability and Maintainability Engineering',
    assumptions: '常数失效率',
    params: { lambda: 0.01 },
    schema: { lambda: S('λ', 'dynamics', '1/h', 1e-4, 0.2) },
    tick(state) {
      state.R = Math.exp(-P(state.params, 'lambda', 0.01) * state.t);
    },
    plot: (s) => s.R,
    rows: (s) => [['R', s.R, '']],
  });
}

function littleLaw(spec) {
  return shell(spec, {
    equation: 'L = λ W',
    authority: 'Little, Oper. Res. 9 (1961)',
    assumptions: '稳态、守恒流',
    params: { lambda: 2, W: 3 },
    schema: {
      lambda: S('λ', 'dynamics', '1/s', 0, 20),
      W: S('W', 'dynamics', 's', 0, 30),
    },
    tick(state) {
      state.L = P(state.params, 'lambda', 2) * P(state.params, 'W', 3);
    },
    plot: (s) => s.L,
    rows: (s) => [['L', s.L, '']],
  });
}

function dipole(spec) {
  return shell(spec, {
    equation: '轴上 E ≈ (1/4πε₀) 2 p / r³',
    authority: 'Griffiths, Ch. 3 电偶极子远场（轴上）',
    assumptions: 'r 远大于偶极尺度',
    params: { p: 1e-9, r: 0.2 },
    schema: {
      p: S('p', 'dynamics', 'C·m', 1e-12, 1e-6),
      r: S('r', 'dynamics', 'm', 0.05, 2),
    },
    tick(state) {
      const k = 8.9875517923e9;
      const r = Math.max(0.02, P(state.params, 'r', 0.2));
      state.E = k * 2 * P(state.params, 'p', 1e-9) / (r ** 3);
    },
    plot: (s) => s.E,
    rows: (s) => [['E', s.E, 'V/m']],
  });
}

function gaussPoint(spec) {
  return shell(spec, {
    equation: '点电荷 E = k |q| / r²（高斯定理的球对称结果）',
    authority: 'Griffiths, Ch. 2',
    assumptions: '球对称点电荷',
    params: { q: 1e-9, r: 0.3 },
    schema: {
      q: S('q', 'dynamics', 'C', -5e-9, 5e-9),
      r: S('r', 'dynamics', 'm', 0.05, 2),
    },
    tick(state) {
      const k = 8.9875517923e9;
      const r = Math.max(0.02, P(state.params, 'r', 0.3));
      state.E = k * Math.abs(P(state.params, 'q', 1e-9)) / (r * r);
    },
    plot: (s) => s.E,
    rows: (s) => [['E', s.E, 'V/m']],
  });
}

function mutual(spec) {
  return shell(spec, {
    equation: 'ε₂ = − M dI₁/dt，取 I₁ = I sin(ωt) 则幅值 M I ω',
    authority: 'Nilsson, 互感',
    assumptions: '常互感 M',
    params: { M: 0.01, I: 2, w: 50 },
    schema: {
      M: S('M', 'dynamics', 'H', 1e-4, 0.2),
      I: S('I', 'dynamics', 'A', 0, 10),
      w: S('ω', 'dynamics', 'rad/s', 0, 400),
    },
    tick(state) {
      state.eps = P(state.params, 'M', 0.01) * P(state.params, 'I', 2) * P(state.params, 'w', 50) * Math.cos(P(state.params, 'w', 50) * state.t);
    },
    plot: (s) => s.eps,
    rows: (s) => [['ε₂', s.eps, 'V']],
  });
}

function selfL(spec) {
  return shell(spec, {
    equation: 'i(t) = (V/R) (1 − e^{−(R/L) t})',
    authority: 'Nilsson, 一阶 RL',
    assumptions: '直流阶跃、零初始。t₀ 是可选观察时刻，默认一个时间常数 L/R',
    params: { V: 10, R: 5, L: 0.2, t0: 0.04 },
    schema: {
      V: S('V', 'dynamics', 'V', 0, 48),
      R: S('R', 'dynamics', 'Ω', 0.2, 50),
      L: S('L', 'dynamics', 'H', 0.01, 2),
      t0: S('观察时刻 t₀', 'initial', 's', 0, 60),
    },
    tick(state) {
      const R = Math.max(1e-3, P(state.params, 'R', 5));
      const L = Math.max(1e-4, P(state.params, 'L', 0.2));
      state.i = (P(state.params, 'V', 10) / R) * (1 - Math.exp(-(R / L) * state.t));
    },
    plot: (s) => s.i,
    rows: (s) => [['i', s.i, 'A']],
  });
}

function qho(spec) {
  return shell(spec, {
    equation: 'E_n = ℏ ω (n + 1/2)',
    authority: 'Griffiths, QM, 量子谐振子',
    assumptions: '一维谐振子能级',
    params: { n: 0, omega: 1e15 },
    schema: {
      n: S('n', 'dynamics', '—', 0, 8),
      omega: S('ω', 'dynamics', 'rad/s', 1e13, 1e16),
    },
    tick(state) {
      const hbar = 1.054571817e-34;
      const n = Math.max(0, Math.round(P(state.params, 'n', 0)));
      state.E = hbar * P(state.params, 'omega', 1e15) * (n + 0.5) / 1.602176634e-19;
    },
    plot: (s) => s.E,
    rows: (s) => [['E', s.E, 'eV']],
  });
}

function heatMode(spec) {
  return shell(spec, {
    equation: 'T(t) = T₀ exp(−α (π/L)² t)（第一正弦模）',
    authority: 'Incropera, 一维导热分离变量',
    assumptions: '两端零温、单一模态、常 α',
    params: { alpha: 1e-4, L: 0.1, T0: 80 },
    schema: {
      alpha: S('α', 'dynamics', 'm²/s', 1e-6, 1e-3),
      L: S('L', 'dynamics', 'm', 0.01, 1),
      T0: S('T₀', 'initial', 'K', 0, 200),
    },
    tick(state) {
      const L = Math.max(1e-3, P(state.params, 'L', 0.1));
      const k2 = (Math.PI / L) ** 2;
      state.T = P(state.params, 'T0', 80) * Math.exp(-P(state.params, 'alpha', 1e-4) * k2 * state.t);
    },
    plot: (s) => s.T,
    rows: (s) => [['T', s.T, 'K']],
  });
}

function brownian(spec) {
  return shell(spec, {
    equation: '⟨x²⟩ = 2 D t（一维）',
    authority: 'Einstein, Ann. Phys. 1905；扩散',
    assumptions: '一维、常扩散系数',
    params: { D: 1e-9 },
    schema: { D: S('D', 'dynamics', 'm²/s', 1e-12, 1e-6) },
    tick(state) {
      state.msd = 2 * P(state.params, 'D', 1e-9) * state.t;
    },
    plot: (s) => s.msd,
    rows: (s) => [['⟨x²⟩', s.msd, 'm²']],
  });
}

function percolation(spec) {
  return shell(spec, {
    equation: '平均场序参量 P ∼ (p − p_c)^β，p_c=0.5，β=1（p>p_c）',
    authority: 'Stauffer & Aharony, Introduction to Percolation Theory, 平均场',
    assumptions: '平均场指数，不是二维格点精确 pc',
    fidelity: 'principle',
    params: { p: 0.7 },
    schema: { p: S('p', 'dynamics', '—', 0, 1) },
    tick(state) {
      const p = P(state.params, 'p', 0.7);
      state.P = p > 0.5 ? (p - 0.5) : 0;
    },
    plot: (s) => s.P,
    rows: (s) => [['P', s.P, '']],
  });
}

function entropyMix(spec) {
  return shell(spec, {
    equation: '二元混合 ΔS/k = −n (x ln x + (1−x) ln(1−x))',
    authority: 'Schroeder, Thermal Physics, 混合熵',
    assumptions: '理想气体混合、摩尔分数 x',
    params: { x: 0.3, n: 1 },
    schema: {
      x: S('x', 'dynamics', '—', 0.01, 0.99),
      n: S('n', 'dynamics', 'mol', 0.1, 5),
    },
    tick(state) {
      const x = Math.min(0.999, Math.max(0.001, P(state.params, 'x', 0.3)));
      state.S = -P(state.params, 'n', 1) * (x * Math.log(x) + (1 - x) * Math.log(1 - x));
    },
    plot: (s) => s.S,
    rows: (s) => [['ΔS/R', s.S, '']],
  });
}

function buoyancy(spec) {
  return shell(spec, {
    equation: 'F_b = ρ_f V g',
    authority: 'Kundu, Fluid Mechanics, 阿基米德原理',
    assumptions: '完全浸没、静流体',
    params: { rho: 1000, V: 0.002 },
    schema: {
      rho: S('ρ', 'dynamics', 'kg/m³', 1, 2000),
      V: S('V', 'dynamics', 'm³', 1e-5, 0.1),
    },
    tick(state) {
      state.Fb = P(state.params, 'rho', 1000) * P(state.params, 'V', 0.002) * 9.81;
    },
    plot: (s) => s.Fb,
    rows: (s) => [['F_b', s.Fb, 'N']],
  });
}

function rigidEuler(spec) {
  return shell(spec, {
    equation: 'τ = I α',
    authority: 'Goldstein, Classical Mechanics, 定点转动（主轴标量形式）',
    assumptions: '绕固定轴、常转动惯量',
    params: { tau: 2, I: 0.4 },
    schema: {
      tau: S('τ', 'dynamics', 'N·m', -20, 20),
      I: S('I', 'dynamics', 'kg·m²', 0.05, 5),
    },
    tick(state) {
      state.alpha = P(state.params, 'tau', 2) / Math.max(1e-3, P(state.params, 'I', 0.4));
      state.omega = state.alpha * state.t;
    },
    plot: (s) => s.omega,
    rows: (s) => [['α', s.alpha, 'rad/s²'], ['ω', s.omega, 'rad/s']],
  });
}

function rolling(spec) {
  return shell(spec, {
    equation: 'a = g sinθ / (1 + I /(m R²))',
    authority: 'Hibbeler, Dynamics, 沿斜面纯滚动',
    assumptions: '纯滚动、无滑；I=k m R²，k 可调（圆柱 0.5，球 0.4）',
    params: { theta: 20, k: 0.5 },
    schema: {
      theta: S('θ', 'dynamics', '°', 0, 40),
      k: S('I/(mR²)', 'dynamics', '—', 0, 1),
    },
    tick(state) {
      const th = P(state.params, 'theta', 20) * Math.PI / 180;
      state.a = 9.81 * Math.sin(th) / (1 + P(state.params, 'k', 0.5));
    },
    plot: (s) => s.a,
    rows: (s) => [['a', s.a, 'm/s²']],
  });
}

function variableMassNote(spec) {
  return rocket(spec);
}

function coriolis(spec) {
  return shell(spec, {
    equation: 'a_cor = −2 ω × v，大小 2 ω v sinφ',
    authority: 'Thornton & Marion, 非惯性系科里奥利加速度',
    assumptions: '地球自转 ω 给定大小、速度水平',
    params: { omega: 7.2921e-5, v: 20, phi: 45 },
    schema: {
      v: S('v', 'dynamics', 'm/s', 0, 100),
      phi: S('φ', 'dynamics', '°', 0, 90),
    },
    tick(state) {
      const w = P(state.params, 'omega', 7.2921e-5);
      state.a = 2 * w * P(state.params, 'v', 20) * Math.sin(P(state.params, 'phi', 45) * Math.PI / 180);
    },
    plot: (s) => s.a,
    rows: (s) => [['|a_cor|', s.a, 'm/s²']],
  });
}

function coupledModes(spec) {
  return shell(spec, {
    equation: '对称/反对称模：ω± = √(k/m) 与 √((k+2κ)/m)',
    authority: 'French, Vibrations and Waves, 两个耦合振子',
    assumptions: '等质量、近邻弹簧',
    params: { m: 1, k: 4, kappa: 1 },
    schema: {
      m: S('m', 'dynamics', 'kg', 0.2, 5),
      k: S('k', 'dynamics', 'N/m', 0.2, 20),
      kappa: S('κ', 'dynamics', 'N/m', 0, 10),
    },
    tick(state) {
      const m = Math.max(1e-3, P(state.params, 'm', 1));
      state.wp = Math.sqrt(P(state.params, 'k', 4) / m);
      state.wm = Math.sqrt((P(state.params, 'k', 4) + 2 * P(state.params, 'kappa', 1)) / m);
    },
    plot: (s) => s.wm,
    rows: (s) => [['ω+', s.wp, 'rad/s'], ['ω−', s.wm, 'rad/s']],
  });
}

function duffing(spec) {
  return shell(spec, {
    equation: 'x″ + δ x′ + α x + β x³ = γ cos(ω t)（参数可关驱动）',
    authority: 'Strogatz；Guckenheimer & Holmes 中的 Duffing',
    assumptions: '弱非线性示意，欧拉积分步长内部分割',
    fidelity: 'principle',
    params: { alpha: 1, beta: 0.4, delta: 0.1, gamma: 0.3, omega: 1 },
    schema: {
      alpha: S('α', 'dynamics', '—', -2, 2),
      beta: S('β', 'dynamics', '—', -1, 2),
      delta: S('δ', 'dynamics', '—', 0, 0.5),
    },
    init(state) {
      state.x = 0.2;
      state.v = 0;
    },
    tick(state, h) {
      if (h <= 0) return;
      const a = P(state.params, 'alpha', 1);
      const b = P(state.params, 'beta', 0.4);
      const d = P(state.params, 'delta', 0.1);
      const g = P(state.params, 'gamma', 0.3);
      const w = P(state.params, 'omega', 1);
      const n = 8;
      const dt = h / n;
      for (let i = 0; i < n; i += 1) {
        const acc = -d * state.v - a * state.x - b * state.x ** 3 + g * Math.cos(w * state.t);
        state.v += acc * dt;
        state.x += state.v * dt;
      }
    },
    plot: (s) => s.x,
    rows: (s) => [['x', s.x, ''], ['v', s.v, '']],
  });
}

function fftBin(spec) {
  return shell(spec, {
    equation: 'DFT 频率分辨率 Δf = f_s / N',
    authority: 'Oppenheim & Schafer, DFT',
    assumptions: '均匀采样',
    params: { fs: 1000, N: 256 },
    schema: {
      fs: S('f_s', 'dynamics', 'Hz', 10, 1e5),
      N: S('N', 'dynamics', '—', 8, 4096),
    },
    tick(state) {
      state.df = P(state.params, 'fs', 1000) / Math.max(1, P(state.params, 'N', 256));
    },
    plot: (s) => s.df,
    rows: (s) => [['Δf', s.df, 'Hz']],
  });
}

function tcpStates(spec) {
  return shell(spec, {
    equation: '三次握手：SYN → SYN-ACK → ACK（步 0–2，默认 RTT = 1 s）',
    authority: 'Kurose & Ross, Computer Networking, TCP 连接建立',
    assumptions: '无丢包；每步历时一个 RTT',
    params: { rtt: 1 },
    schema: {
      rtt: S('RTT', 'dynamics', 's', 0.2, 5),
    },
    tick(state) {
      const rtt = Math.max(0.05, P(state.params, 'rtt', 1));
      state.step = Math.min(2, Math.floor(state.t / rtt));
    },
    plot: (s) => s.step,
    rows: (s) => [['step', s.step, '']],
  });
}

function bankerNeed(spec) {
  return shell(spec, {
    equation: 'Need = Max − Allocation（单资源）',
    authority: 'Silberschatz, 银行家算法定义',
    assumptions: '单一资源类型的 Need',
    params: { max: 8, alloc: 3 },
    schema: {
      max: S('Max', 'dynamics', '—', 0, 20),
      alloc: S('Allocation', 'dynamics', '—', 0, 20),
    },
    tick(state) {
      state.need = Math.max(0, P(state.params, 'max', 8) - P(state.params, 'alloc', 3));
    },
    plot: (s) => s.need,
    rows: (s) => [['Need', s.need, '']],
  });
}

function rrWait(spec) {
  return shell(spec, {
    equation: '时间片轮转：周转时间近似随进程数与片长变化（n 个等长作业）',
    authority: 'Silberschatz, CPU 调度',
    assumptions: 'n 个等长作业、无切换开销时总周转和为 n(n+1)/2 × q 当作业恰为 1 片——此处作业长度 = q',
    params: { n: 4, q: 1 },
    schema: {
      n: S('n', 'dynamics', '—', 1, 12),
      q: S('q', 'dynamics', 's', 0.1, 5),
    },
    tick(state) {
      const n = Math.max(1, Math.round(P(state.params, 'n', 4)));
      const q = P(state.params, 'q', 1);
      state.Tsum = (n * (n + 1) / 2) * q;
    },
    plot: (s) => s.Tsum,
    rows: (s) => [['ΣT', s.Tsum, 's']],
  });
}

function cmosDelay(spec) {
  return shell(spec, {
    equation: 't_p ≈ 0.69 R_eq C_L',
    authority: 'Rabaey, Digital Integrated Circuits, RC 延迟',
    assumptions: '一阶 RC、等效电阻给定',
    params: { R: 1e4, C: 10e-15 },
    schema: {
      R: S('R_eq', 'dynamics', 'Ω', 100, 1e5),
      C: S('C_L', 'dynamics', 'F', 1e-15, 1e-12),
    },
    tick(state) {
      state.tp = 0.69 * P(state.params, 'R', 1e4) * P(state.params, 'C', 10e-15);
    },
    plot: (s) => s.tp * 1e12,
    rows: (s) => [['t_p', s.tp * 1e12, 'ps']],
  });
}

function opampGain(spec) {
  return shell(spec, {
    equation: '反相放大 A_v = − R_f / R_in',
    authority: 'Sedra & Smith, Microelectronic Circuits, 理想运放',
    assumptions: '理想运放、纯电阻反馈',
    params: { Rf: 10000, Rin: 1000 },
    schema: {
      Rf: S('R_f', 'dynamics', 'Ω', 100, 1e6),
      Rin: S('R_in', 'dynamics', 'Ω', 100, 1e5),
    },
    tick(state) {
      state.Av = -P(state.params, 'Rf', 10000) / Math.max(1, P(state.params, 'Rin', 1000));
    },
    plot: (s) => s.Av,
    rows: (s) => [['A_v', s.Av, '']],
  });
}

function rlcQ(spec) {
  return shell(spec, {
    equation: 'ω₀ = 1/√(LC)，Q = ω₀ L / R',
    authority: 'Nilsson, 串联 RLC',
    assumptions: '串联、欠阻尼条件另由 Q 判断',
    params: { L: 0.01, C: 1e-6, R: 10 },
    schema: {
      L: S('L', 'dynamics', 'H', 1e-4, 1),
      C: S('C', 'dynamics', 'F', 1e-9, 1e-3),
      R: S('R', 'dynamics', 'Ω', 0.1, 100),
    },
    tick(state) {
      const L = Math.max(1e-6, P(state.params, 'L', 0.01));
      const C = Math.max(1e-12, P(state.params, 'C', 1e-6));
      state.w0 = 1 / Math.sqrt(L * C);
      state.Q = state.w0 * L / Math.max(1e-3, P(state.params, 'R', 10));
    },
    plot: (s) => s.Q,
    rows: (s) => [['ω₀', s.w0, 'rad/s'], ['Q', s.Q, '']],
  });
}

function diodeDrop(spec) {
  return shell(spec, {
    equation: '半波整流平均值 V_avg = V_m / π（理想二极管）',
    authority: 'Sedra & Smith, 整流电路',
    assumptions: '理想二极管、纯电阻负载、无电容',
    params: { Vm: 10 },
    schema: { Vm: S('V_m', 'dynamics', 'V', 0, 48) },
    tick(state) {
      state.avg = P(state.params, 'Vm', 10) / Math.PI;
    },
    plot: (s) => s.avg,
    rows: (s) => [['V_avg', s.avg, 'V']],
  });
}

function filterCutoff(spec) {
  return shell(spec, {
    equation: '一阶低通 f_c = 1 / (2 π R C)',
    authority: 'Nilsson, 一阶滤波器',
    assumptions: '无源 RC 低通',
    params: { R: 1000, C: 1e-6 },
    schema: {
      R: S('R', 'dynamics', 'Ω', 10, 1e6),
      C: S('C', 'dynamics', 'F', 1e-9, 1e-3),
    },
    tick(state) {
      state.fc = 1 / (2 * Math.PI * Math.max(1, P(state.params, 'R', 1000)) * Math.max(1e-12, P(state.params, 'C', 1e-6)));
    },
    plot: (s) => s.fc,
    rows: (s) => [['f_c', s.fc, 'Hz']],
  });
}

function hohmann(spec) {
  return shell(spec, {
    equation: 'Δv = √(μ/r1) (√(2 r2/(r1+r2)) − 1) + √(μ/r2) (1 − √(2 r1/(r1+r2)))',
    authority: 'Curtis, Orbital Mechanics for Engineering Students, 霍曼转移',
    assumptions: '共面圆轨道、二体、μ 为中心引力参数',
    params: { r1: 6671e3, r2: 42164e3, mu: 3.986e14 },
    schema: {
      r1: S('r₁', 'dynamics', 'm', 6.4e6, 2e7),
      r2: S('r₂', 'dynamics', 'm', 7e6, 5e7),
    },
    tick(state) {
      const mu = P(state.params, 'mu', 3.986e14);
      const r1 = P(state.params, 'r1', 6671e3);
      const r2 = Math.max(r1 + 1, P(state.params, 'r2', 42164e3));
      const dv1 = Math.sqrt(mu / r1) * (Math.sqrt(2 * r2 / (r1 + r2)) - 1);
      const dv2 = Math.sqrt(mu / r2) * (1 - Math.sqrt(2 * r1 / (r1 + r2)));
      state.dv = dv1 + dv2;
    },
    plot: (s) => s.dv,
    rows: (s) => [['Δv', s.dv, 'm/s']],
  });
}

function hydraulicJump(spec) {
  return shell(spec, {
    equation: 'y₂/y₁ = ½ (−1 + √(1+8 Fr₁²))',
    authority: 'Chow, Open-Channel Hydraulics, 共轭水深',
    assumptions: '水平矩形渠、跃前 Fr>1',
    params: { y1: 0.4, Fr: 2.5 },
    schema: {
      y1: S('y₁', 'dynamics', 'm', 0.05, 3),
      Fr: S('Fr₁', 'dynamics', '—', 1, 8),
    },
    tick(state) {
      const Fr = Math.max(1, P(state.params, 'Fr', 2.5));
      state.y2 = P(state.params, 'y1', 0.4) * 0.5 * (-1 + Math.sqrt(1 + 8 * Fr * Fr));
    },
    plot: (s) => s.y2,
    rows: (s) => [['y₂', s.y2, 'm']],
  });
}

function sluice(spec) {
  return shell(spec, {
    equation: 'Q = C_d a b √(2 g h)',
    authority: '闸孔出流，Chow / 水力学教材',
    assumptions: '自由出流、给定流量系数',
    params: { Cd: 0.6, a: 0.3, b: 1, h: 1 },
    schema: {
      Cd: S('C_d', 'dynamics', '—', 0.4, 0.8),
      a: S('开度', 'dynamics', 'm', 0.05, 2),
      b: S('宽度', 'dynamics', 'm', 0.2, 10),
      h: S('h', 'dynamics', 'm', 0.1, 8),
    },
    tick(state) {
      state.Q = P(state.params, 'Cd', 0.6) * P(state.params, 'a', 0.3) * P(state.params, 'b', 1) * Math.sqrt(2 * 9.81 * Math.max(0, P(state.params, 'h', 1)));
    },
    plot: (s) => s.Q,
    rows: (s) => [['Q', s.Q, 'm³/s']],
  });
}

function naschFlow(spec) {
  return shell(spec, {
    equation: 'NaSch 基本图的平均场：q = ρ (1 − ρ)（vmax=1 的简化）',
    authority: 'Nagel & Schreckenberg, J. Phys. I 2, 2221 (1992)，此处为 v_max=1 的精确平均场流量',
    assumptions: 'v_max=1、无随机减速时 q=ρ(1−ρ)；不是完整 NaSch 蒙特卡洛',
    fidelity: 'principle',
    params: { rho: 0.3 },
    schema: { rho: S('ρ', 'dynamics', '—', 0, 1) },
    tick(state) {
      const rho = Math.min(1, Math.max(0, P(state.params, 'rho', 0.3)));
      state.q = rho * (1 - rho);
    },
    plot: (s) => s.q,
    rows: (s) => [['q', s.q, '']],
  });
}

function mccabe(spec) {
  return shell(spec, {
    equation: '最小回流比附近：操作线 y = (R/(R+1)) x + x_D/(R+1)',
    authority: 'McCabe & Thiele；King, Separation Processes',
    assumptions: '恒摩尔溢流、二元精馏精馏段操作线',
    params: { R: 2, xD: 0.95, x: 0.5 },
    schema: {
      R: S('R', 'dynamics', '—', 0.2, 10),
      xD: S('x_D', 'dynamics', '—', 0.5, 0.99),
      x: S('x', 'dynamics', '—', 0, 1),
    },
    tick(state) {
      const R = P(state.params, 'R', 2);
      const x = P(state.params, 'x', 0.5);
      state.y = (R / (R + 1)) * x + P(state.params, 'xD', 0.95) / (R + 1);
    },
    plot: (s) => s.y,
    rows: (s) => [['y', s.y, '']],
  });
}

function pkOneCompartment(spec) {
  return shell(spec, {
    equation: 'C = (D/V) e^{−k t}',
    authority: 'Gibaldi & Perrier, Pharmacokinetics, 一室静脉推注',
    assumptions: '一室、一级消除；非给药方案',
    fidelity: 'principle',
    params: { D: 100, V: 20, k: 0.1 },
    schema: {
      D: S('D', 'dynamics', 'mg', 1, 500),
      V: S('V', 'dynamics', 'L', 1, 100),
      k: S('k', 'dynamics', '1/h', 0.01, 1),
    },
    tick(state) {
      state.C = (P(state.params, 'D', 100) / Math.max(0.1, P(state.params, 'V', 20))) * Math.exp(-P(state.params, 'k', 0.1) * state.t);
    },
    plot: (s) => s.C,
    rows: (s) => [['C', s.C, 'mg/L']],
  });
}

function respiratory(spec) {
  return shell(spec, {
    equation: '肺顺应性 C = ΔV / ΔP',
    authority: 'West, Respiratory Physiology, 顺应性定义',
    assumptions: '准静态、单一顺应性',
    fidelity: 'principle',
    params: { dV: 0.5, dP: 5 },
    schema: {
      dV: S('ΔV', 'dynamics', 'L', 0.05, 2),
      dP: S('ΔP', 'dynamics', 'cmH2O', 0.5, 30),
    },
    tick(state) {
      state.C = P(state.params, 'dV', 0.5) / Math.max(0.1, P(state.params, 'dP', 5));
    },
    plot: (s) => s.C,
    rows: (s) => [['C', s.C, 'L/cmH2O']],
  });
}

function ecgPeriod(spec) {
  return shell(spec, {
    equation: '心率 HR = 60 / RR',
    authority: 'Guyton & Hall, 心动周期与心率定义',
    assumptions: '只由 RR 间期定义心率，不合成临床诊断波形',
    fidelity: 'principle',
    params: { RR: 0.8 },
    schema: { RR: S('RR', 'dynamics', 's', 0.3, 2) },
    tick(state) {
      state.HR = 60 / Math.max(0.2, P(state.params, 'RR', 0.8));
    },
    plot: (s) => s.HR,
    rows: (s) => [['HR', s.HR, '1/min']],
  });
}

function membraneHHNote(spec) {
  return shell(spec, {
    equation: '静息：V ≈ (gK EK + gNa ENa) / (gK + gNa)（两电导分压）',
    authority: 'Hodgkin & Huxley, J. Physiol. 1952 的电导形式在稳态的分压极限',
    assumptions: '忽略漏电导与电容暂态；不是完整 HH 门控（完整模型见手写 hodgkin-huxley）',
    fidelity: 'principle',
    params: { gK: 0.3, gNa: 0.05, EK: -77, ENa: 50 },
    schema: {
      gK: S('gK', 'dynamics', '—', 0.01, 1),
      gNa: S('gNa', 'dynamics', '—', 0.01, 1),
    },
    tick(state) {
      const gK = P(state.params, 'gK', 0.3);
      const gNa = P(state.params, 'gNa', 0.05);
      state.V = (gK * P(state.params, 'EK', -77) + gNa * P(state.params, 'ENa', 50)) / (gK + gNa);
    },
    plot: (s) => s.V,
    rows: (s) => [['V', s.V, 'mV']],
  });
}

function antennaArray(spec) {
  return shell(spec, {
    equation: '两元阵因子 |AF| = |sin(N ψ/2) / sin(ψ/2)|，ψ = k d cosθ + β',
    authority: 'Balanis, Antenna Theory, 均匀直线阵',
    assumptions: '等幅、均匀相位差',
    params: { N: 4, dlam: 0.5, theta: 60 },
    schema: {
      N: S('N', 'dynamics', '—', 2, 8),
      dlam: S('d/λ', 'dynamics', '—', 0.1, 1),
      theta: S('θ', 'dynamics', '°', 0, 180),
    },
    tick(state) {
      const N = Math.max(2, Math.round(P(state.params, 'N', 4)));
      const psi = 2 * Math.PI * P(state.params, 'dlam', 0.5) * Math.cos(P(state.params, 'theta', 60) * Math.PI / 180);
      const s = Math.sin(psi / 2);
      state.AF = Math.abs(s) < 1e-6 ? N : Math.abs(Math.sin(N * psi / 2) / s);
    },
    plot: (s) => s.AF,
    rows: (s) => [['|AF|', s.AF, '']],
  });
}

function radiationBalance(spec) {
  return shell(spec, {
    equation: 'σ T⁴ = (S/4) (1 − A)（行星有效温度，无大气）',
    authority: 'Pierrehumbert, Principles of Planetary Climate, 能量平衡零维',
    assumptions: '全球年平均、反照率 A、无大气温室项；温室条目在此式上乘 1/(1−ε/2) 的单层近似需另开参数',
    fidelity: 'principle',
    params: { S: 1361, A: 0.3 },
    schema: {
      S: S('S', 'dynamics', 'W/m²', 100, 2000),
      A: S('A', 'dynamics', '—', 0, 0.8),
    },
    tick(state) {
      const sigma = 5.670374419e-8;
      const rhs = (P(state.params, 'S', 1361) / 4) * (1 - P(state.params, 'A', 0.3));
      state.T = (Math.max(0, rhs) / sigma) ** 0.25;
    },
    plot: (s) => s.T,
    rows: (s) => [['T_e', s.T, 'K']],
  });
}

function greenhouse(spec) {
  return shell(spec, {
    equation: '单层大气：σ T_s⁴ = (S/4)(1−A) / (1 − ε/2)',
    authority: 'Pierrehumbert, 单层灰体大气能量平衡',
    assumptions: '全球零维、长波发射率 ε；不是气候模式',
    fidelity: 'principle',
    params: { S: 1361, A: 0.3, eps: 0.8 },
    schema: {
      A: S('A', 'dynamics', '—', 0, 0.8),
      eps: S('ε', 'dynamics', '—', 0, 0.99),
    },
    tick(state) {
      const sigma = 5.670374419e-8;
      const eps = Math.min(0.99, Math.max(0, P(state.params, 'eps', 0.8)));
      const rhs = (P(state.params, 'S', 1361) / 4) * (1 - P(state.params, 'A', 0.3)) / Math.max(0.05, 1 - eps / 2);
      state.T = (rhs / sigma) ** 0.25;
    },
    plot: (s) => s.T,
    rows: (s) => [['T_s', s.T, 'K']],
  });
}

function fiberNA(spec) {
  return shell(spec, {
    equation: 'NA = √(n₁² − n₂²)，θ_c = arcsin(n₂/n₁)',
    authority: 'Hecht, Optics, 阶跃光纤数值孔径',
    assumptions: '子午光线、n₁>n₂',
    params: { n1: 1.48, n2: 1.46 },
    schema: {
      n1: S('n₁', 'dynamics', '—', 1.3, 1.7),
      n2: S('n₂', 'dynamics', '—', 1.3, 1.7),
    },
    tick(state) {
      const n1 = P(state.params, 'n1', 1.48);
      const n2 = Math.min(n1 - 0.001, P(state.params, 'n2', 1.46));
      state.NA = Math.sqrt(Math.max(0, n1 * n1 - n2 * n2));
    },
    plot: (s) => s.NA,
    rows: (s) => [['NA', s.NA, '']],
  });
}

function laserThreshold(spec) {
  return shell(spec, {
    equation: '阈值增益 g_th = α − (1/(2L)) ln(R1 R2)',
    authority: 'Siegman, Lasers, 阈值增益',
    assumptions: '稳态往返、分布损耗 α',
    fidelity: 'principle',
    params: { alpha: 0.1, L: 0.3, R: 0.95 },
    schema: {
      alpha: S('α', 'dynamics', '1/m', 0, 2),
      L: S('L', 'dynamics', 'm', 0.05, 1),
      R: S('R', 'dynamics', '—', 0.5, 0.999),
    },
    tick(state) {
      const R = Math.min(0.999, Math.max(0.01, P(state.params, 'R', 0.95)));
      const L = Math.max(0.01, P(state.params, 'L', 0.3));
      state.g = P(state.params, 'alpha', 0.1) - (1 / (2 * L)) * Math.log(R * R);
    },
    plot: (s) => s.g,
    rows: (s) => [['g_th', s.g, '1/m']],
  });
}

function shg(spec) {
  return shell(spec, {
    equation: '小信号倍频：P_{2ω} ∝ (d_eff P_ω L sinc(Δk L/2))² 的低转换极限 ∝ d² L² P²（Δk=0）',
    authority: 'Boyd, Nonlinear Optics, 共线倍频低转换',
    assumptions: '相位匹配、低转换、不涉及具体晶体生长',
    fidelity: 'principle',
    params: { P: 1, L: 0.01, d: 1 },
    schema: {
      P: S('P_ω', 'dynamics', '—', 0, 5),
      L: S('L', 'dynamics', 'm', 0.001, 0.05),
    },
    tick(state) {
      state.P2 = (P(state.params, 'd', 1) * P(state.params, 'L', 0.01) * P(state.params, 'P', 1)) ** 2;
    },
    plot: (s) => s.P2,
    rows: (s) => [['P_2ω', s.P2, 'arb']],
  });
}

function bellCHSH(spec) {
  return shell(spec, {
    equation: '量子 CHSH 最大 2√2；局域实在论 ≤ 2',
    authority: 'Clauser et al., Phys. Rev. Lett. 23 (1969)；Aspect 实验综述中的 CHSH',
    assumptions: '只给出 Tsirelson 界与经典界，不模拟实验噪声协议',
    fidelity: 'principle',
    params: { theta: 22.5 },
    schema: { theta: S('θ', 'dynamics', '°', 0, 45) },
    tick(state) {
      state.S = 2 * Math.SQRT2 * Math.cos(0);
      state.Svis = 2 * Math.SQRT2 * Math.abs(Math.cos(2 * P(state.params, 'theta', 22.5) * Math.PI / 180));
    },
    plot: (s) => s.Svis,
    rows: (s) => [['|S|', s.Svis, ''], ['Tsirelson', 2 * Math.SQRT2, '']],
  });
}

function spinOrbit(spec) {
  return shell(spec, {
    equation: 'j = l ± 1/2（单电子）',
    authority: 'Bransden & Joachain, 自旋-轨道耦合的 j 选择',
    assumptions: '单电子角动量加法，不是能级数计算',
    fidelity: 'principle',
    params: { l: 1 },
    schema: { l: S('l', 'dynamics', '—', 0, 5) },
    tick(state) {
      const l = Math.max(0, Math.round(P(state.params, 'l', 1)));
      state.jhi = l + 0.5;
      state.jlo = Math.abs(l - 0.5);
    },
    plot: (s) => s.jhi,
    rows: (s) => [['j+', s.jhi, ''], ['j−', s.jlo, '']],
  });
}

function pnBarrier(spec) {
  return shell(spec, {
    equation: '内建势 V_bi = V_T ln(N_a N_d / n_i²)',
    authority: 'Sze, Semiconductor Devices, 突变结内建势',
    assumptions: '非简并、300 K、V_T=0.026 V、n_i=1e10 cm⁻³；不是工艺配方',
    fidelity: 'principle',
    params: { Na: 1e16, Nd: 1e16 },
    schema: {
      Na: S('N_a', 'dynamics', 'cm⁻³', 1e14, 1e18),
      Nd: S('N_d', 'dynamics', 'cm⁻³', 1e14, 1e18),
    },
    tick(state) {
      const ni = 1e10;
      const VT = 0.026;
      state.Vbi = VT * Math.log((P(state.params, 'Na', 1e16) * P(state.params, 'Nd', 1e16)) / (ni * ni));
    },
    plot: (s) => s.Vbi,
    rows: (s) => [['V_bi', s.Vbi, 'V']],
  });
}

function viewFactor(spec) {
  return shell(spec, {
    equation: '同心球：内对外 F_12=1，外对内 F_21=(r1/r2)²（默认 r1=0.1 m, r2=0.2 m）',
    authority: 'Incropera, Fundamentals of Heat and Mass Transfer, 视角因子互易',
    assumptions: '表面 1 完全被表面 2 包围；漫射表面',
    fidelity: 'principle',
    params: { r1: 0.1, r2: 0.2 },
    schema: {
      r1: S('r₁', 'dynamics', 'm', 0.01, 1),
      r2: S('r₂', 'dynamics', 'm', 0.02, 2),
    },
    tick(state) {
      const r1 = P(state.params, 'r1', 0.1);
      const r2 = Math.max(r1, P(state.params, 'r2', 0.2));
      state.F = 1;
      state.F21 = (r1 / r2) ** 2;
    },
    plot: (s) => s.F21,
    rows: (s) => [['F_12', s.F, ''], ['F_21', s.F21, '']],
  });
}

function poiseuille(spec) {
  return shell(spec, {
    equation: 'Q = π R⁴ ΔP / (8 μ L)',
    authority: 'White, Fluid Mechanics, Hagen–Poiseuille',
    assumptions: '圆管层流、充分发展、牛顿流体',
    params: { R: 0.005, dP: 1000, mu: 0.001, L: 1 },
    schema: {
      R: S('R', 'dynamics', 'm', 0.001, 0.02),
      dP: S('ΔP', 'dynamics', 'Pa', 0, 1e4),
      L: S('L', 'dynamics', 'm', 0.1, 10),
    },
    tick(state) {
      const R = P(state.params, 'R', 0.005);
      state.Q = Math.PI * R ** 4 * P(state.params, 'dP', 1000) / (8 * Math.max(1e-6, P(state.params, 'mu', 0.001)) * Math.max(0.01, P(state.params, 'L', 1)));
    },
    plot: (s) => s.Q,
    rows: (s) => [['Q', s.Q, 'm³/s']],
  });
}

function blasius(spec) {
  return shell(spec, {
    equation: '平板 δ/x ≈ 5 / √Re_x',
    authority: 'White, Fluid Mechanics, Blasius 层流边界层厚度',
    assumptions: '零压力梯度平板、层流',
    params: { Rex: 1e5 },
    schema: { Rex: S('Re_x', 'dynamics', '—', 1e3, 5e5) },
    tick(state) {
      state.dOverX = 5 / Math.sqrt(Math.max(1, P(state.params, 'Rex', 1e5)));
    },
    plot: (s) => s.dOverX,
    rows: (s) => [['δ/x', s.dOverX, '']],
  });
}

function nuselt(spec) {
  return shell(spec, {
    equation: '圆管层流充分发展 Nu = 3.66（等壁温）',
    authority: 'Incropera, 圆管充分发展层流 Nu',
    assumptions: '等壁温、充分发展；湍流关联不在此条默认',
    params: { Re: 1000 },
    schema: { Re: S('Re', 'dynamics', '—', 10, 3000) },
    tick(state) {
      state.Nu = P(state.params, 'Re', 1000) < 2300 ? 3.66 : 0.023 * (P(state.params, 'Re', 1000) ** 0.8) * (0.7 ** 0.4);
    },
    plot: (s) => s.Nu,
    rows: (s) => [['Nu', s.Nu, '']],
  });
}

function lmtd(spec) {
  return shell(spec, {
    equation: 'LMTD = (ΔT1 − ΔT2) / ln(ΔT1/ΔT2)',
    authority: 'Incropera, 对数平均温差',
    assumptions: '逆流或顺流两端温差为正',
    params: { dT1: 40, dT2: 10 },
    schema: {
      dT1: S('ΔT₁', 'dynamics', 'K', 1, 100),
      dT2: S('ΔT₂', 'dynamics', 'K', 1, 100),
    },
    tick(state) {
      const a = Math.max(0.1, P(state.params, 'dT1', 40));
      const b = Math.max(0.1, P(state.params, 'dT2', 10));
      state.L = Math.abs(a - b) < 1e-6 ? a : (a - b) / Math.log(a / b);
    },
    plot: (s) => s.L,
    rows: (s) => [['LMTD', s.L, 'K']],
  });
}

function otto(spec) {
  return shell(spec, {
    equation: 'η = 1 − r^{1−γ}',
    authority: 'Çengel & Boles, 奥托循环冷空气标准',
    assumptions: '冷空气标准、定比热',
    params: { r: 8, gamma: 1.4 },
    schema: {
      r: S('r', 'dynamics', '—', 2, 16),
      gamma: S('γ', 'dynamics', '—', 1.2, 1.5),
    },
    tick(state) {
      const r = Math.max(1.1, P(state.params, 'r', 8));
      const g = P(state.params, 'gamma', 1.4);
      state.eta = 1 - r ** (1 - g);
    },
    plot: (s) => s.eta,
    rows: (s) => [['η', s.eta, '']],
  });
}

function brayton(spec) {
  return shell(spec, {
    equation: 'η = 1 − r_p^{(1−γ)/γ}',
    authority: 'Çengel & Boles, 布雷顿循环冷空气标准',
    assumptions: '理想循环、定比热',
    params: { rp: 8, gamma: 1.4 },
    schema: {
      rp: S('r_p', 'dynamics', '—', 2, 30),
      gamma: S('γ', 'dynamics', '—', 1.2, 1.5),
    },
    tick(state) {
      const rp = Math.max(1.1, P(state.params, 'rp', 8));
      const g = P(state.params, 'gamma', 1.4);
      state.eta = 1 - rp ** ((1 - g) / g);
    },
    plot: (s) => s.eta,
    rows: (s) => [['η', s.eta, '']],
  });
}

function equivalence(spec) {
  return shell(spec, {
    equation: 'φ = (F/A) / (F/A)_st',
    authority: 'Turns, An Introduction to Combustion, 当量比定义',
    assumptions: '只计算当量比，不计算火焰温度或爆轰',
    fidelity: 'principle',
    params: { FA: 0.06, FAst: 0.068 },
    schema: {
      FA: S('F/A', 'dynamics', '—', 0.01, 0.2),
      FAst: S('(F/A)_st', 'dynamics', '—', 0.02, 0.15),
    },
    tick(state) {
      state.phi = P(state.params, 'FA', 0.06) / Math.max(1e-4, P(state.params, 'FAst', 0.068));
    },
    plot: (s) => s.phi,
    rows: (s) => [['φ', s.phi, '']],
  });
}

function slipMotor(spec) {
  return shell(spec, {
    equation: 's = (n_s − n) / n_s',
    authority: 'Chapman, Electric Machinery Fundamentals, 转差率',
    assumptions: '同步速给定',
    params: { ns: 1500, n: 1450 },
    schema: {
      ns: S('n_s', 'dynamics', 'rpm', 100, 3600),
      n: S('n', 'dynamics', 'rpm', 0, 3600),
    },
    tick(state) {
      const ns = Math.max(1, P(state.params, 'ns', 1500));
      state.s = (ns - P(state.params, 'n', 1450)) / ns;
    },
    plot: (s) => s.s,
    rows: (s) => [['s', s.s, '']],
  });
}

function powerFactor(spec) {
  return shell(spec, {
    equation: 'pf = cosφ，P = V I pf',
    authority: 'Nilsson, 交流功率',
    assumptions: '正弦稳态',
    params: { V: 220, I: 5, phi: 30 },
    schema: {
      V: S('V', 'dynamics', 'V', 0, 400),
      I: S('I', 'dynamics', 'A', 0, 50),
      phi: S('φ', 'dynamics', '°', -90, 90),
    },
    tick(state) {
      state.pf = Math.cos(P(state.params, 'phi', 30) * Math.PI / 180);
      state.P = P(state.params, 'V', 220) * P(state.params, 'I', 5) * state.pf;
    },
    plot: (s) => s.P,
    rows: (s) => [['pf', s.pf, ''], ['P', s.P, 'W']],
  });
}

function mppt(spec) {
  return shell(spec, {
    equation: '单二极管近似下 P=V I，I=I_ph − I0 (e^{V/V_t}−1)，在扫描中取最大',
    authority: 'Messenger & Ventre, Photovoltaic Systems Engineering, 单二极管',
    assumptions: '忽略串联电阻；扫描找 P 最大，不是具体逆变器算法实现',
    fidelity: 'principle',
    params: { Iph: 5, I0: 1e-8, Vt: 0.7 },
    schema: {
      Iph: S('I_ph', 'dynamics', 'A', 0.5, 10),
      Vt: S('V_scale', 'dynamics', 'V', 0.3, 2),
    },
    tick(state) {
      const Iph = P(state.params, 'Iph', 5);
      const I0 = P(state.params, 'I0', 1e-8);
      const Vt = Math.max(0.05, P(state.params, 'Vt', 0.7));
      let best = 0;
      for (let i = 1; i <= 40; i += 1) {
        const V = (i / 40) * 0.8;
        const I = Math.max(0, Iph - I0 * (Math.exp(V / (Vt / 20)) - 1));
        best = Math.max(best, V * I);
      }
      state.P = best;
    },
    plot: (s) => s.P,
    rows: (s) => [['P_max', s.P, 'W']],
  });
}

function batteryOcv(spec) {
  return shell(spec, {
    equation: 'V = OCV − I R',
    authority: '电池等效电路的欧姆压降（集总）',
    assumptions: '瞬时欧姆模型，不含扩散与热失控',
    params: { OCV: 3.7, I: 2, R: 0.05 },
    schema: {
      OCV: S('OCV', 'dynamics', 'V', 2, 4.2),
      I: S('I', 'dynamics', 'A', 0, 20),
      R: S('R', 'dynamics', 'Ω', 0.001, 0.5),
    },
    tick(state) {
      state.V = P(state.params, 'OCV', 3.7) - P(state.params, 'I', 2) * P(state.params, 'R', 0.05);
    },
    plot: (s) => s.V,
    rows: (s) => [['V', s.V, 'V']],
  });
}

function absorptionLG(spec) {
  return shell(spec, {
    equation: '最小液气比附近：操作线斜率 L/G',
    authority: 'Treybal, Mass-Transfer Operations, 吸收操作线',
    assumptions: '稀溶液、直线平衡 y*=m x 时 (L/G)_min = (y_in−y_out)/(x_out* − x_in)',
    params: { yin: 0.1, yout: 0.01, m: 1, xin: 0 },
    schema: {
      yin: S('y_in', 'dynamics', '—', 0.01, 0.3),
      yout: S('y_out', 'dynamics', '—', 0.001, 0.1),
      m: S('m', 'dynamics', '—', 0.2, 3),
    },
    tick(state) {
      const yin = P(state.params, 'yin', 0.1);
      const yout = Math.min(yin, P(state.params, 'yout', 0.01));
      const m = Math.max(0.05, P(state.params, 'm', 1));
      const xout = yout / m;
      state.LGmin = (yin - yout) / Math.max(1e-6, xout - P(state.params, 'xin', 0));
    },
    plot: (s) => s.LGmin,
    rows: (s) => [['(L/G)_min', s.LGmin, '']],
  });
}

function dryingPage(spec) {
  return shell(spec, {
    equation: 'MR = exp(−k t^n)（Page 干燥模型）',
    authority: 'Page, 1949；薄层干燥经验方程的常用形式',
    assumptions: '薄层、拟合参数 k,n，不是设备设计',
    fidelity: 'principle',
    params: { k: 0.2, n: 1 },
    schema: {
      k: S('k', 'dynamics', '—', 0.01, 2),
      n: S('n', 'dynamics', '—', 0.5, 2),
    },
    tick(state) {
      const n = P(state.params, 'n', 1);
      state.MR = Math.exp(-P(state.params, 'k', 0.2) * (state.t ** n));
    },
    plot: (s) => s.MR,
    rows: (s) => [['MR', s.MR, '']],
  });
}

function extractStages(spec) {
  return shell(spec, {
    equation: '错流萃取理想级：单级萃取率 E = K / (1+K)，K=E_factor',
    authority: 'Treybal, 单级萃取分配',
    assumptions: '线性分配、一次接触',
    params: { K: 2 },
    schema: { K: S('K', 'dynamics', '—', 0.1, 10) },
    tick(state) {
      const K = Math.max(0, P(state.params, 'K', 2));
      state.E = K / (1 + K);
    },
    plot: (s) => s.E,
    rows: (s) => [['E', s.E, '']],
  });
}

function fluidization(spec) {
  return shell(spec, {
    equation: 'ΔP / H = (1 − ε) (ρ_s − ρ) g（床层压降，忽略壁摩擦）',
    authority: 'Kunii & Levenspiel, Fluidization Engineering, 床层静压降',
    assumptions: '均匀空隙率',
    params: { eps: 0.45, rhos: 1500, rho: 1.2, H: 0.4 },
    schema: {
      eps: S('ε', 'dynamics', '—', 0.3, 0.8),
      H: S('H', 'dynamics', 'm', 0.05, 2),
    },
    tick(state) {
      const eps = P(state.params, 'eps', 0.45);
      state.dP = (1 - eps) * (P(state.params, 'rhos', 1500) - P(state.params, 'rho', 1.2)) * 9.81 * P(state.params, 'H', 0.4);
    },
    plot: (s) => s.dP,
    rows: (s) => [['ΔP', s.dP, 'Pa']],
  });
}

function supersat(spec) {
  return shell(spec, {
    equation: '过饱和比 S = c / c*',
    authority: 'Mullin, Crystallization, 过饱和比定义',
    assumptions: '浓度与溶解度给定',
    params: { c: 1.2, cstar: 1 },
    schema: {
      c: S('c', 'dynamics', '—', 0, 3),
      cstar: S('c*', 'dynamics', '—', 0.1, 3),
    },
    tick(state) {
      state.S = P(state.params, 'c', 1.2) / Math.max(1e-3, P(state.params, 'cstar', 1));
    },
    plot: (s) => s.S,
    rows: (s) => [['S', s.S, '']],
  });
}

function pfr(spec) {
  return shell(spec, {
    equation: '一级 PFR：X = 1 − exp(−k τ)',
    authority: 'Fogler, CRE, 平推流一级',
    assumptions: '等温、恒容',
    params: { k: 0.2, tau: 5 },
    schema: {
      k: S('k', 'dynamics', '1/s', 0.01, 2),
      tau: S('τ', 'dynamics', 's', 0.1, 30),
    },
    tick(state) {
      state.X = 1 - Math.exp(-P(state.params, 'k', 0.2) * P(state.params, 'tau', 5));
    },
    plot: (s) => s.X,
    rows: (s) => [['X', s.X, '']],
  });
}

function leChatelier(spec) {
  return shell(spec, {
    equation: 'van’t Hoff：ln(K2/K1) = −ΔH/R (1/T2 − 1/T1)',
    authority: 'Atkins, Physical Chemistry, van’t Hoff',
    assumptions: 'ΔH 常数；平衡移动的定量是 K(T)，不是定性口诀本身',
    params: { K1: 1, dH: -20000, T1: 300, T2: 350 },
    schema: {
      dH: S('ΔH', 'dynamics', 'J/mol', -1e5, 1e5),
      T2: S('T₂', 'dynamics', 'K', 250, 600),
    },
    tick(state) {
      const R = 8.314;
      const T1 = P(state.params, 'T1', 300);
      const T2 = Math.max(1, P(state.params, 'T2', 350));
      state.K2 = P(state.params, 'K1', 1) * Math.exp((-P(state.params, 'dH', -20000) / R) * (1 / T2 - 1 / T1));
    },
    plot: (s) => s.K2,
    rows: (s) => [['K2', s.K2, '']],
  });
}

function titration(spec) {
  return shell(spec, {
    equation: '强酸强碱等当点前 pH = −log10(c_a − c_b)（过量酸，浓度近似）',
    authority: 'Harris, Quantitative Chemical Analysis, 强酸强碱滴定',
    assumptions: '等体积近似前的过量强酸；等当点附近需水平衡，此处只给等当点前一支',
    fidelity: 'principle',
    params: { ca: 0.1, cb: 0.04 },
    schema: {
      ca: S('c_a', 'dynamics', 'M', 0.01, 0.2),
      cb: S('c_b', 'dynamics', 'M', 0, 0.2),
    },
    tick(state) {
      const left = P(state.params, 'ca', 0.1) - P(state.params, 'cb', 0.04);
      state.pH = left > 1e-8 ? -Math.log10(left) : 7;
    },
    plot: (s) => s.pH,
    rows: (s) => [['pH', s.pH, '']],
  });
}

function redoxE(spec) {
  return nernst(spec);
}

function corrosionRate(spec) {
  return shell(spec, {
    equation: '均匀腐蚀深度速率 r = i M / (n F ρ)（法拉第）',
    authority: 'Fontana, Corrosion Engineering, 法拉第腐蚀速率',
    assumptions: '均匀溶解、已知电流密度；非防护配方',
    fidelity: 'principle',
    params: { i: 1e-5, M: 0.056, n: 2, rho: 7800 },
    schema: {
      i: S('i', 'dynamics', 'A/m²', 1e-7, 1),
    },
    tick(state) {
      const F = 96485;
      state.r = P(state.params, 'i', 1e-5) * P(state.params, 'M', 0.056) / (Math.max(1, P(state.params, 'n', 2)) * F * P(state.params, 'rho', 7800));
    },
    plot: (s) => s.r * 3.154e7 * 1000,
    rows: (s) => [['r', s.r * 3.154e7 * 1000, 'mm/yr']],
  });
}

function fuelCellV(spec) {
  return shell(spec, {
    equation: 'V = E − i r − A ln(i)（简化极化，A,r 经验）',
    authority: 'O\'Hayre, Fuel Cell Fundamentals, 极化分解的教学式',
    assumptions: '对数活化项在 i>0；不是电堆设计',
    fidelity: 'principle',
    params: { E: 1.2, i: 0.3, r: 0.1, A: 0.05 },
    schema: {
      i: S('i', 'dynamics', 'A/cm²', 0.01, 1.5),
      r: S('r', 'dynamics', 'Ω·cm²', 0.01, 0.5),
    },
    tick(state) {
      const i = Math.max(1e-3, P(state.params, 'i', 0.3));
      state.V = P(state.params, 'E', 1.2) - i * P(state.params, 'r', 0.1) - P(state.params, 'A', 0.05) * Math.log(i);
    },
    plot: (s) => s.V,
    rows: (s) => [['V', s.V, 'V']],
  });
}

function monolithNote(spec) {
  return beerLambert(spec);
}

function seismicTravel(spec) {
  return shell(spec, {
    equation: '走时 t = x / v',
    authority: 'Shearer, Introduction to Seismology, 均匀介质走时',
    assumptions: '常速度',
    params: { x: 10, v: 5 },
    schema: {
      x: S('x', 'dynamics', 'km', 0, 100),
      v: S('v', 'dynamics', 'km/s', 0.5, 10),
    },
    tick(state) {
      state.t = P(state.params, 'x', 10) / Math.max(0.1, P(state.params, 'v', 5));
    },
    plot: (s) => s.t,
    rows: (s) => [['t', s.t, 's']],
  });
}

function fourierSquare(spec) {
  return shell(spec, {
    equation: '方波：b_n = 4/(nπ)（n 奇）',
    authority: 'Tolstov, Fourier Series',
    assumptions: '奇次正弦项',
    params: { n: 1 },
    schema: { n: S('n', 'dynamics', '—', 1, 15) },
    tick(state) {
      const n = Math.max(1, Math.round(P(state.params, 'n', 1)));
      state.b = n % 2 === 1 ? 4 / (n * Math.PI) : 0;
    },
    plot: (s) => s.b,
    rows: (s) => [['b_n', s.b, '']],
  });
}

function mandelbrotEscape(spec) {
  return shell(spec, {
    equation: 'z ← z² + c，逃逸半径 2',
    authority: 'Devaney, An Introduction to Chaotic Dynamical Systems；Mandelbrot 集迭代',
    assumptions: '单点迭代次数，不是整张分形图',
    params: { cr: -0.7, ci: 0.27 },
    schema: {
      cr: S('Re c', 'dynamics', '—', -2, 1),
      ci: S('Im c', 'dynamics', '—', -1.2, 1.2),
    },
    tick(state) {
      let zr = 0;
      let zi = 0;
      const cr = P(state.params, 'cr', -0.7);
      const ci = P(state.params, 'ci', 0.27);
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
    rows: (s) => [['iter', s.n, '']],
  });
}

function rossler(spec) {
  return shell(spec, {
    equation: 'x′=−y−z, y′=x+a y, z′=b+z(x−c)',
    authority: 'Rössler, Phys. Lett. 57A (1976)',
    assumptions: '标准混沌参数附近的 ODE 示意',
    fidelity: 'principle',
    params: { a: 0.2, b: 0.2, c: 5.7 },
    schema: {
      a: S('a', 'dynamics', '—', 0.05, 0.4),
      c: S('c', 'dynamics', '—', 2, 10),
    },
    init(state) {
      state.x = 1;
      state.y = 0;
      state.z = 0;
    },
    tick(state, h) {
      if (h <= 0) return;
      const a = P(state.params, 'a', 0.2);
      const b = P(state.params, 'b', 0.2);
      const c = P(state.params, 'c', 5.7);
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
    rows: (s) => [['x', s.x, ''], ['y', s.y, ''], ['z', s.z, '']],
  });
}

function eulerMethod(spec) {
  return shell(spec, {
    equation: 'y′=−y，Euler：y_{n+1}=y_n+h f',
    authority: 'Burden & Faires, Numerical Analysis, 显式欧拉',
    assumptions: '与精确解 e^{−t} 对照',
    params: { h: 0.2, y0: 1 },
    schema: { h: S('h', 'numerics', '—', 0.01, 0.5) },
    init(state) {
      state.y = P(state.params, 'y0', 1);
      state.n = 0;
    },
    tick(state, dt) {
      if (dt <= 0) return;
      const h = P(state.params, 'h', 0.2);
      state.y += h * (-state.y);
      state.exact = Math.exp(-state.t);
    },
    plot: (s) => s.y,
    rows: (s) => [['y_E', s.y, ''], ['e^{−t}', s.exact, '']],
  });
}

function neutronDiffusion(spec) {
  return shell(spec, {
    equation: '一维平板基模 φ=φ₀ cos(π x / a)，临界条件 B²=π²/a²=(νΣ_f−Σ_a)/D',
    authority: 'Lamarsh, Introduction to Nuclear Engineering, 一群扩散',
    assumptions: '一群、均匀平板、外推边界略去；公开教科书临界条件，非设计',
    fidelity: 'principle',
    params: { a: 1 },
    schema: { a: S('a', 'dynamics', 'm', 0.2, 3) },
    tick(state) {
      const a = Math.max(0.05, P(state.params, 'a', 1));
      state.B2 = (Math.PI / a) ** 2;
    },
    plot: (s) => s.B2,
    rows: (s) => [['B²', s.B2, '1/m²']],
  });
}

function bateman(spec) {
  return shell(spec, {
    equation: '两代 Bateman：N2 = N10 λ1/(λ2−λ1) (e^{−λ1 t}−e^{−λ2 t})',
    authority: 'Krane, 两代放射性衰变链',
    assumptions: 'N2(0)=0、λ1≠λ2。t₀ 是可选观察时刻，默认 2 s，避免只看见子体为零',
    params: { l1: 0.3, l2: 0.1, N10: 100, t0: 2 },
    schema: {
      l1: S('λ1', 'dynamics', '1/s', 0.05, 2),
      l2: S('λ2', 'dynamics', '1/s', 0.05, 2),
      t0: S('观察时刻 t₀', 'initial', 's', 0, 60),
    },
    tick(state) {
      const l1 = P(state.params, 'l1', 0.3);
      const l2 = P(state.params, 'l2', 0.1);
      const den = l2 - l1;
      state.N2 = Math.abs(den) < 1e-6
        ? P(state.params, 'N10', 100) * l1 * state.t * Math.exp(-l1 * state.t)
        : P(state.params, 'N10', 100) * l1 / den * (Math.exp(-l1 * state.t) - Math.exp(-l2 * state.t));
    },
    plot: (s) => s.N2,
    rows: (s) => [['N2', s.N2, '']],
  });
}

function doBalance(spec) {
  return shell(spec, {
    equation: 'Streeter–Phelps：亏氧 D(t) 的经典解（点源）',
    authority: 'Metcalf & Eddy / Chapra, Surface Water-Quality Modeling, Streeter–Phelps',
    assumptions: '一阶复氧与耗氧、恒定流速化为时间',
    fidelity: 'principle',
    params: { k1: 0.3, k2: 0.5, L0: 20, D0: 1 },
    schema: {
      k1: S('k1', 'dynamics', '1/d', 0.05, 1),
      k2: S('k2', 'dynamics', '1/d', 0.05, 1),
      L0: S('L0', 'initial', 'mg/L', 0, 40),
    },
    tick(state) {
      const kd = P(state.params, 'k1', 0.3);
      const ka = P(state.params, 'k2', 0.5);
      const t = state.t;
      const L = P(state.params, 'L0', 20) * Math.exp(-kd * t);
      state.D = Math.abs(ka - kd) < 1e-6
        ? P(state.params, 'D0', 1) * Math.exp(-ka * t) + kd * P(state.params, 'L0', 20) * t * Math.exp(-ka * t)
        : P(state.params, 'D0', 1) * Math.exp(-ka * t) + (kd * P(state.params, 'L0', 20) / (ka - kd)) * (Math.exp(-kd * t) - Math.exp(-ka * t));
      state.L = L;
    },
    plot: (s) => s.D,
    rows: (s) => [['D', s.D, 'mg/L'], ['L', s.L, 'mg/L']],
  });
}

function asmSubstrate(spec) {
  return shell(spec, {
    equation: 'Monod：μ = μ_max S / (K_s + S)',
    authority: 'Henze et al., Activated Sludge Models, Monod 生长项',
    assumptions: '单一底物、无抑制；不是整座污水厂',
    fidelity: 'principle',
    params: { umax: 2, Ks: 10, S: 8 },
    schema: {
      umax: S('μ_max', 'dynamics', '1/d', 0.2, 8),
      Ks: S('K_s', 'dynamics', 'mg/L', 1, 50),
      S: S('S', 'dynamics', 'mg/L', 0, 80),
    },
    tick(state) {
      const S = Math.max(0, P(state.params, 'S', 8));
      state.mu = P(state.params, 'umax', 2) * S / (P(state.params, 'Ks', 10) + S);
    },
    plot: (s) => s.mu,
    rows: (s) => [['μ', s.mu, '1/d']],
  });
}

function riverDisp(spec) {
  return shell(spec, {
    equation: '一维脉冲：c = M/A / √(4π E t) exp(−ξ²/(4 E t))，探针在峰位 x = u t + ξ，默认 ξ = 0',
    authority: 'Fischer et al., Mixing in Inland and Coastal Waters',
    assumptions: '恒定断面与流速、瞬时投放在 x=0。t>0 时默认探针跟着峰走（ξ=0），不读高斯远尾',
    params: { M: 10, A: 20, E: 5, u: 0.4, xi: 0 },
    schema: {
      u: S('u', 'dynamics', 'm/s', 0.05, 2),
      E: S('E', 'dynamics', 'm²/s', 0.1, 50),
      xi: S('距峰 ξ', 'dynamics', 'm', -30, 30),
    },
    tick(state) {
      const t = Math.max(0.05, state.t);
      const u = P(state.params, 'u', 0.4);
      const E = Math.max(1e-3, P(state.params, 'E', 5));
      const xi = P(state.params, 'xi', 0);
      state.xPeak = u * t;
      state.c = (P(state.params, 'M', 10) / Math.max(0.1, P(state.params, 'A', 20))) / Math.sqrt(4 * Math.PI * E * t) * Math.exp(-(xi * xi) / (4 * E * t));
    },
    plot: (s) => s.c,
    rows: (s) => [['c', s.c, '']],
  });
}

function hazenWilliamsNote(spec) {
  return darcy(spec);
}

function gaitMoment(spec) {
  return shell(spec, {
    equation: '静矩 τ = m g l sinθ（倒立或支撑的重力矩）',
    authority: 'Winter, Biomechanics and Motor Control of Human Movement, 环节重力矩',
    assumptions: '单刚体环节、准静态',
    fidelity: 'principle',
    params: { m: 5, l: 0.4, theta: 20 },
    schema: {
      m: S('m', 'dynamics', 'kg', 0.5, 20),
      l: S('l', 'dynamics', 'm', 0.1, 1),
      theta: S('θ', 'dynamics', '°', -60, 60),
    },
    tick(state) {
      state.tau = P(state.params, 'm', 5) * 9.81 * P(state.params, 'l', 0.4) * Math.sin(P(state.params, 'theta', 20) * Math.PI / 180);
    },
    plot: (s) => s.tau,
    rows: (s) => [['τ', s.tau, 'N·m']],
  });
}

function proteinFoldNote(spec) {
  return shell(spec, {
    equation: '两态：K = exp(−ΔG / RT)，折叠分数 f = K/(1+K)',
    authority: 'Dill & Bromberg, Molecular Driving Forces, 两态折叠',
    assumptions: '两态、忽略中间体',
    fidelity: 'principle',
    params: { dG: -5 },
    schema: { dG: S('ΔG', 'dynamics', 'kJ/mol', -30, 20) },
    tick(state) {
      const R = 0.008314;
      const T = 298;
      const K = Math.exp(-P(state.params, 'dG', -5) / (R * T));
      state.f = K / (1 + K);
    },
    plot: (s) => s.f,
    rows: (s) => [['f_fold', s.f, '']],
  });
}

function membraneTransport(spec) {
  return shell(spec, {
    equation: 'Goldman：V_m = (RT/F) ln( (P_K K_o)/(P_K K_i) )（仅钾，简化）',
    authority: 'Hille, Ion Channels of Excitable Membranes, Goldman 方程',
    assumptions: '只有钾通透时退化为 Nernst',
    fidelity: 'principle',
    params: { Ko: 4, Ki: 140 },
    schema: {
      Ko: S('K_o', 'dynamics', 'mM', 1, 20),
      Ki: S('K_i', 'dynamics', 'mM', 50, 200),
    },
    tick(state) {
      const R = 8.314;
      const T = 310;
      const F = 96485;
      state.V = (R * T / F) * Math.log(Math.max(0.1, P(state.params, 'Ko', 4)) / Math.max(1, P(state.params, 'Ki', 140))) * 1000;
    },
    plot: (s) => s.V,
    rows: (s) => [['V_m', s.V, 'mV']],
  });
}

function logisticMap(spec) {
  return shell(spec, {
    equation: 'x ← r x (1 − x)',
    authority: 'May, Nature 261 (1976)；Strogatz',
    assumptions: '离散逻辑斯蒂映射',
    params: { r: 3.2, x: 0.2 },
    schema: {
      r: S('r', 'dynamics', '—', 0, 4),
    },
    init(state) {
      state.x = P(state.params, 'x', 0.2);
    },
    tick(state, h) {
      if (h <= 0) return;
      const r = P(state.params, 'r', 3.2);
      state.x = r * state.x * (1 - state.x);
    },
    plot: (s) => s.x,
    rows: (s) => [['x', s.x, '']],
  });
}

function vanderPol(spec) {
  return shell(spec, {
    equation: 'x″ − μ(1−x²)x′ + x = 0',
    authority: 'Strogatz, van der Pol',
    assumptions: '极限环示意',
    fidelity: 'principle',
    params: { mu: 0.5 },
    schema: { mu: S('μ', 'dynamics', '—', 0.05, 3) },
    init(state) {
      state.x = 0.1;
      state.v = 0;
    },
    tick(state, h) {
      if (h <= 0) return;
      const mu = P(state.params, 'mu', 0.5);
      const n = 8;
      const dt = h / n;
      for (let i = 0; i < n; i += 1) {
        const acc = mu * (1 - state.x * state.x) * state.v - state.x;
        state.v += acc * dt;
        state.x += state.v * dt;
      }
    },
    plot: (s) => s.x,
    rows: (s) => [['x', s.x, '']],
  });
}

function lyapunovNote(spec) {
  return shell(spec, {
    equation: '线性化 x′=a x，λ=a（一维李雅普诺夫指数）',
    authority: 'Strogatz, 线性稳定性',
    assumptions: '一维线性',
    params: { a: -0.5 },
    schema: { a: S('a', 'dynamics', '—', -2, 2) },
    tick(state) {
      state.x = Math.exp(P(state.params, 'a', -0.5) * state.t);
    },
    plot: (s) => s.x,
    rows: (s) => [['x', s.x, ''], ['λ', P(s.params, 'a', 0), '']],
  });
}

function limitCycleNote(spec) {
  return vanderPol(spec);
}

const PREFIX = {
  运动学: (s, t) => kin(s, t),
  动力学: (s, t) => newton(s, t),
  碰撞: (s, t) => collision(s, t),
  刚体: (s, t) => (has(t, /滚动/) ? rolling(s) : has(t, /欧拉/) ? rigidEuler(s) : has(t, /凸轮/) ? camHarmonic(s) : has(t, /连杆|机构/) ? grashof(s) : rigidEuler(s)),
  振动: (s, t) => shmFamily(s, t),
  波: (s, t) => waveTravel(s),
  声学: (s, t) => (has(t, /声压/) ? spl(s) : has(t, /拍/) ? beats(s) : has(t, /声速|温度/) ? soundSpeed(s) : has(t, /混响/) ? sabine(s) : has(t, /声源|多普勒/) ? doppler(s) : spl(s)),
  热力学: (s, t) => (has(t, /卡诺|效率/) ? carnot(s, t) : has(t, /气体|状态/) ? gasLaw(s) : carnot(s, t)),
  统计物理: (s, t) => (has(t, /麦克斯韦/) ? maxwell(s) : has(t, /伊辛/) ? isingEnergy(s) : has(t, /游走|扩散/) ? brownian(s) : has(t, /渗流/) ? percolation(s) : has(t, /熵/) ? entropyMix(s) : maxwell(s)),
  流体: (s, t) => (has(t, /雷诺/) ? reynolds(s) : has(t, /泊|管/) ? poiseuille(s) : bernoulli(s)),
  流体2: (s, t) => (has(t, /边界/) ? blasius(s) : has(t, /湍流|雷诺/) ? reynolds(s) : poiseuille(s)),
  静电: (s, t) => (has(t, /偶极/) ? dipole(s) : has(t, /电容/) ? capacitor(s) : has(t, /高斯|库仑|电场/) ? coulomb(s) : gaussPoint(s)),
  电路: (s, t) => (has(t, /欧姆|电阻/) ? ohm(s) : has(t, /电容/) ? capacitor(s) : has(t, /RL|电感|自感/) ? selfL(s) : rcCircuit(s)),
  磁学: (s, t) => (has(t, /霍尔/) ? hall(s) : has(t, /安培/) ? ampere(s) : has(t, /变压器/) ? transformer(s) : has(t, /互感/) ? mutual(s) : has(t, /自感/) ? selfL(s) : has(t, /感应|楞次|法拉第/) ? faraday(s) : lorentzRadius(s)),
  电磁波: (s, t) => waveTravel(s),
  光学: (s, t) => (has(t, /Malus|偏振/) ? malus(s) : has(t, /透镜|成像/) ? lens(s) : has(t, /折射|反射|斯涅尔/) ? snell(s) : has(t, /光纤|全反射/) ? fiberNA(s) : snell(s)),
  波动光学: (s, t) => (has(t, /双缝|杨氏|干涉/) ? doubleSlit(s) : doubleSlit(s)),
  近代: (s, t) => (has(t, /光电/) ? photo(s) : has(t, /康普顿/) ? compton(s) : has(t, /德布罗意/) ? debroglie(s) : has(t, /不确定/) ? uncertainty(s) : has(t, /隧|势垒|阱/) ? (has(t, /阱/) ? well(s) : tunnel(s)) : has(t, /黑体/) ? stefan(s) : photo(s)),
  量子: (s, t) => (has(t, /势阱|无限/) ? well(s) : has(t, /隧|势垒/) ? tunnel(s) : has(t, /谐振子/) ? qho(s) : has(t, /贝尔/) ? bellCHSH(s) : has(t, /自旋/) ? spinOrbit(s) : well(s)),
  相对论: (s, t) => gamma(s, t),
  天体: (s, t) => (has(t, /开普勒|轨道/) ? kepler(s) : kepler(s)),
  宇宙: (s, t) => (has(t, /红移|哈勃|膨胀/) ? hubble(s) : has(t, /黑体|核合成|温度/) ? blackbodyPeak(s) : hubble(s)),
  粒子: (s, t) => debroglie(s),
  核物理: (s, t) => (has(t, /屏蔽|衰减/) ? shieldLaw(s) : has(t, /磁共振|拉莫/) ? larmor(s) : has(t, /临界|裂变|链式|反应堆/) ? criticality(s) : has(t, /剂量/) ? shell(s, {
    equation: 'H = w_R D，默认光子/电子 w_R = 1，H = 1 mSv',
    authority: 'ICRP 103 公开的辐射权重因子与当量剂量定义（教学）',
    assumptions: '定义式。默认光子和电子 w_R=1；质子 w_R=2；α 粒子 w_R=20。中子的 w_R 随能量变化，这里不是剂量评估',
    fidelity: 'principle',
    params: { D: 0.001, w: 1 },
    schema: { D: S('D', 'dynamics', 'Gy', 0, 5), w: S('w_R', 'dynamics', '—', 1, 20) },
    tick(st) {
      const w = P(st.params, 'w', 1);
      st.H = P(st.params, 'D', 0.001) * w;
      st.rad = radiationKind(w);
    },
    plot: (st) => st.H,
    rows: (st) => [['H', st.H, 'Sv'], ['辐射', st.rad, '']],
  }) : decay(s)),
  凝聚态: (s, t) => (has(t, /半导体|PN|MOS/) ? pnBarrier(s) : has(t, /量子霍尔|霍尔/) ? (has(t, /量子/) ? quantumHall(s) : hall(s)) : has(t, /超导/) ? shell(s, {
    equation: '伦敦穿透深度关系的教学式 λ_L = √(m / (μ₀ n_s e²))',
    authority: 'Tinkham, Introduction to Superconductivity, London 深度',
    assumptions: '给定超流密度，不是材料设计',
    fidelity: 'principle',
    params: { ns: 1e28 },
    schema: { ns: S('n_s', 'dynamics', '1/m³', 1e27, 1e29) },
    tick(st) {
      const m = 9.109e-31;
      const e = 1.602e-19;
      const mu0 = 1.256637e-6;
      st.lam = Math.sqrt(m / (mu0 * P(st.params, 'ns', 1e28) * e * e));
    },
    plot: (st) => st.lam * 1e9,
    rows: (st) => [['λ_L', st.lam * 1e9, 'nm']],
  }) : isingEnergy(s)),
  非线性: (s, t) => (has(t, /同步/) ? lyapunovNote(s) : has(t, /Duffing|达芬/) ? duffing(s) : has(t, /范德波尔|极限/) ? vanderPol(s) : logisticMap(s)),
  计算物理: (s, t) => (has(t, /欧拉|数值/) ? eulerMethod(s) : heatMode(s)),
  生物物理: (s, t) => (has(t, /膜|Goldman|神经/) ? membraneTransport(s) : has(t, /折叠/) ? proteinFoldNote(s) : membraneHHNote(s)),
  等离子体: (s, t) => lorentzRadius(s),
  排序: (s) => binarySearchSteps(s),
  查找: (s) => binarySearchSteps(s),
  图算法: (s) => dijkstraBound(s),
  字符串: (s) => editDistance(s),
  动态规划: (s) => editDistance(s),
  数据结构: (s, t) => (has(t, /哈希|散列/) ? hashLoad(s) : binarySearchSteps(s)),
  计算理论: (s) => binarySearchSteps(s),
  密码学: (s, t) => (has(t, /RSA|模/) ? rsaMod(s) : caesar(s)),
  信息论: (s, t) => (has(t, /容量|信道/) ? shell(s, {
    equation: 'C = B log2(1+SNR)',
    authority: 'Cover & Thomas, 带限 AWGN 容量',
    assumptions: 'AWGN',
    params: { B: 1000, snr: 10 },
    schema: { B: S('B', 'dynamics', 'Hz', 1, 1e6), snr: S('SNR', 'dynamics', '—', 0.1, 100) },
    tick(st) { st.C = P(st.params, 'B', 1000) * Math.log2(1 + P(st.params, 'snr', 10)); },
    plot: (st) => st.C,
    rows: (st) => [['C', st.C, 'bit/s']],
  }) : binaryEntropy(s)),
  监督学习: (s) => gdQuadratic(s),
  无监督: (s, t) => (has(t, /K-means|聚类/) ? kmeans1d(s) : matrix2(s, '特征')),
  神经网络: (s) => gdQuadratic(s),
  强化学习: (s) => shell(s, {
    equation: '贝尔曼：V = r + γ V′（单状态示意）',
    authority: 'Sutton & Barto, Reinforcement Learning',
    assumptions: '确定性单备份',
    params: { r: 1, gamma: 0.9, Vp: 2 },
    schema: { r: S('r', 'dynamics', '—', -5, 5), gamma: S('γ', 'dynamics', '—', 0, 0.99), Vp: S('V′', 'dynamics', '—', 0, 10) },
    tick(st) { st.V = P(st.params, 'r', 1) + P(st.params, 'gamma', 0.9) * P(st.params, 'Vp', 2); },
    plot: (st) => st.V,
    rows: (st) => [['V', st.V, '']],
  }),
  优化: (s) => gdQuadratic(s),
  图形学: (s) => shell(s, {
    equation: 'Lambert：L = (I/π) max(0, n·l)',
    authority: 'Pharr, Humphreys, Physically Based Rendering, Lambert',
    assumptions: '漫反射、光与法线夹角',
    params: { ndotl: 0.5, I: 1 },
    schema: { ndotl: S('n·l', 'dynamics', '—', -1, 1), I: S('I', 'dynamics', '—', 0, 5) },
    tick(st) { st.L = (P(st.params, 'I', 1) / Math.PI) * Math.max(0, P(st.params, 'ndotl', 0.5)); },
    plot: (st) => st.L,
    rows: (st) => [['L', st.L, '']],
  }),
  数据库: (s) => shell(s, {
    equation: '选择率 sel ≈ 1/N 的均匀假设下期望扫描代价 ∝ N',
    authority: 'Ramakrishnan & Gehrke, Database Management Systems, 选择扫描',
    assumptions: '全表扫描代价与行数成正比',
    params: { N: 1000 },
    schema: { N: S('N', 'dynamics', '—', 1, 1e6) },
    tick(st) { st.cost = P(st.params, 'N', 1000); },
    plot: (st) => st.cost,
    rows: (st) => [['cost', st.cost, '']],
  }),
  网络: (s, t) => (has(t, /握手|TCP/) ? tcpStates(s) : littleLaw(s)),
  操作系统: (s, t) => (has(t, /银行/) ? bankerNeed(s) : has(t, /LRU|页/) ? pageReplace(s) : rrWait(s)),
  编译: (s) => binarySearchSteps(s),
  分布式与安全: (s) => shell(s, {
    equation: '多数派法定人数 q = ⌊n/2⌋+1',
    authority: 'Tanenbaum, Distributed Systems, 多数派',
    assumptions: '奇数或一般 n 的多数定义',
    params: { n: 5 },
    schema: { n: S('n', 'dynamics', '—', 1, 21) },
    tick(st) { st.q = Math.floor(P(st.params, 'n', 5) / 2) + 1; },
    plot: (st) => st.q,
    rows: (st) => [['q', st.q, '']],
  }),
  数字逻辑: (s, t) => boolGate(s, t),
  组合逻辑: (s, t) => boolGate(s, t || '与'),
  时序逻辑: (s) => shell(s, {
    equation: '分频：f_out = f_in / N',
    authority: 'Mano, 计数器分频',
    assumptions: '整数分频',
    params: { fin: 1000, N: 4 },
    schema: { fin: S('f_in', 'dynamics', 'Hz', 1, 1e6), N: S('N', 'dynamics', '—', 1, 64) },
    tick(st) { st.fo = P(st.params, 'fin', 1000) / Math.max(1, Math.round(P(st.params, 'N', 4))); },
    plot: (st) => st.fo,
    rows: (st) => [['f_out', st.fo, 'Hz']],
  }),
  计算机体系: (s) => amdahl(s),
  存储层次: (s, t) => (has(t, /LRU/) ? pageReplace(s) : amdahl(s)),
  嵌入式: (s, t) => (has(t, /PWM|占空/) ? pwm(s) : nyquist(s)),
  通信编码: (s) => binaryEntropy(s),
  调制: (s) => shell(s, {
    equation: 'AM：s(t)=(A+m cos ω_m t) cos ω_c t 的调制度 μ',
    authority: 'Proakis, Communication Systems, AM',
    assumptions: '常规调幅、μ≤1',
    params: { A: 1, m: 0.5 },
    schema: { A: S('A', 'dynamics', '—', 0.1, 5), m: S('m', 'dynamics', '—', 0, 2) },
    tick(st) { st.mu = P(st.params, 'm', 0.5) / Math.max(1e-3, P(st.params, 'A', 1)); },
    plot: (st) => st.mu,
    rows: (st) => [['μ', st.mu, '']],
  }),
  差错控制: (s) => shell(s, {
    equation: '汉明界示意：最少校验 n−k ≥ log2(n+1)（纠正 1 位）',
    authority: 'Lin & Costello, Error Control Coding, 汉明码参数',
    assumptions: '纠正单错的汉明界',
    params: { n: 7 },
    schema: { n: S('n', 'dynamics', '—', 3, 31) },
    tick(st) {
      const n = Math.max(3, Math.round(P(st.params, 'n', 7)));
      st.r = Math.ceil(Math.log2(n + 1));
    },
    plot: (st) => st.r,
    rows: (st) => [['r_min', st.r, '']],
  }),
  网络协议: (s) => tcpStates(s),
  'VLSI-FPGA': (s) => cmosDelay(s),
  信号处理: (s, t) => (has(t, /采样|Nyquist/) ? nyquist(s) : fftBin(s)),
  控制: (s, t) => (has(t, /电机/) ? dcMotor(s) : has(t, /PID|阶跃|二阶/) ? secondOrderStep(s) : secondOrderStep(s)),
  机器人: (s) => forwardKinematics(s),
  电力电子与电机: (s, t) => (has(t, /感应|异步|转差/) ? slipMotor(s) : has(t, /变压器/) ? transformer(s) : has(t, /因数/) ? powerFactor(s) : dcMotor(s)),
  机械机构: (s, t) => (has(t, /凸轮/) ? camHarmonic(s) : has(t, /齿轮/) ? gearOrBelt(s, '齿轮') : grashof(s)),
  传动: (s, t) => gearOrBelt(s, t),
  机械振动: (s, t) => (has(t, /隔振|传递/) ? isolation(s) : shmFamily(s, t)),
  疲劳断裂: (s) => stress(s, '断裂'),
  流体机械: (s, t) => (has(t, /泵|功率|水轮机/) ? shell(s, {
    equation: 'P = ρ g Q H / η',
    authority: 'White, 水力机械功率',
    assumptions: '给定效率',
    params: { Q: 0.05, H: 20, eta: 0.75 },
    schema: { Q: S('Q', 'dynamics', 'm³/s', 0.001, 1), H: S('H', 'dynamics', 'm', 1, 100), eta: S('η', 'dynamics', '—', 0.3, 0.95) },
    tick(st) { st.P = 1000 * 9.81 * P(st.params, 'Q', 0.05) * P(st.params, 'H', 20) / Math.max(0.2, P(st.params, 'eta', 0.75)); },
    plot: (st) => st.P,
    rows: (st) => [['P', st.P, 'W']],
  }) : bernoulli(s)),
  材料力学: (s, t) => stress(s, t),
  材料科学: (s, t) => (has(t, /相/) ? leverRule(s) : stress(s, t)),
  相图: (s) => leverRule(s),
  扩散: (s) => brownian(s),
  断裂力学: (s) => stress(s, '断裂'),
  复合材料: (s) => shell(s, {
    equation: '纵向混合律 E = E_f V_f + E_m (1−V_f)',
    authority: 'Kaw, Mechanics of Composite Materials, Voigt 混合律',
    assumptions: '单向、等应变',
    params: { Ef: 200, Em: 3, Vf: 0.6 },
    schema: { Ef: S('E_f', 'dynamics', 'GPa', 10, 400), Em: S('E_m', 'dynamics', 'GPa', 0.5, 20), Vf: S('V_f', 'dynamics', '—', 0, 1) },
    tick(st) {
      const vf = Math.min(1, Math.max(0, P(st.params, 'Vf', 0.6)));
      st.E = P(st.params, 'Ef', 200) * vf + P(st.params, 'Em', 3) * (1 - vf);
    },
    plot: (st) => st.E,
    rows: (st) => [['E', st.E, 'GPa']],
  }),
  结构工程: (s, t) => stress(s, t),
  岩土工程: (s) => rankineSoil(s),
  桥梁: (s) => stress(s, '弯曲'),
  地震工程: (s) => secondOrderStep(s),
  航空气动: (s, t) => (has(t, /马赫/) ? shell(s, {
    equation: 'M = v / a',
    authority: 'Anderson, 马赫数定义',
    assumptions: '当地声速给定',
    params: { v: 200, a: 340 },
    schema: { v: S('v', 'dynamics', 'm/s', 0, 600), a: S('a', 'dynamics', 'm/s', 200, 400) },
    tick(st) { st.M = P(st.params, 'v', 200) / Math.max(1, P(st.params, 'a', 340)); },
    plot: (st) => st.M,
    rows: (st) => [['M', st.M, '']],
  }) : clift(s)),
  飞行力学: (s, t) => (has(t, /浮沉|长周期/) ? phugoid(s) : phugoid(s)),
  推进: (s) => rocket(s),
  轨道: (s, t) => (has(t, /霍曼/) ? hohmann(s) : kepler(s)),
  明渠水力学: (s, t) => (has(t, /水跃|共轭/) ? hydraulicJump(s) : has(t, /闸/) ? sluice(s) : manning(s)),
  水工结构: (s) => shell(s, {
    equation: '静水压力合力 P = ½ ρ g h²（单位宽度）',
    authority: '静水压强三角形',
    assumptions: '竖直迎水面、单位宽度',
    params: { h: 10 },
    schema: { h: S('h', 'dynamics', 'm', 0.5, 80) },
    tick(st) { st.P = 0.5 * 1000 * 9.81 * P(st.params, 'h', 10) ** 2; },
    plot: (st) => st.P / 1000,
    rows: (st) => [['P', st.P / 1000, 'kN/m']],
  }),
  交通流: (s) => naschFlow(s),
  化工反应器: (s, t) => (has(t, /PFR|平推/) ? pfr(s) : has(t, /当量/) ? equivalence(s) : cstr(s)),
  化工分离: (s, t) => (has(t, /精馏|操作线/) ? mccabe(s) : has(t, /吸收/) ? absorptionLG(s) : has(t, /干燥/) ? dryingPage(s) : has(t, /萃取/) ? extractStages(s) : has(t, /结晶|过饱和/) ? supersat(s) : has(t, /流化/) ? fluidization(s) : mccabe(s)),
  工业工程: (s, t) => (has(t, /EOQ|库存/) ? eoq(s) : has(t, /排队|M\/M/) ? mm1(s) : has(t, /可靠/) ? reliability(s) : littleLaw(s)),
  核工程: (s, t) => (has(t, /屏蔽/) ? shieldLaw(s) : has(t, /衰变|链/) ? bateman(s) : has(t, /扩散/) ? neutronDiffusion(s) : criticality(s)),
  生物医学工程: (s, t) => (has(t, /Hodgkin|膜|动作电位/) ? membraneHHNote(s) : has(t, /ECG|心电/) ? ecgPeriod(s) : has(t, /呼吸/) ? respiratory(s) : has(t, /药/) ? pkOneCompartment(s) : ecgPeriod(s)),
  环境工程: (s, t) => (has(t, /氧|污泥|Monod/) ? asmSubstrate(s) : has(t, /河|扩散/) ? riverDisp(s) : doBalance(s)),
  电气电机: (s, t) => (has(t, /异步|转差/) ? slipMotor(s) : has(t, /变压器/) ? transformer(s) : dcMotor(s)),
  电力系统: (s, t) => (has(t, /因数/) ? powerFactor(s) : has(t, /MPPT|光伏/) ? mppt(s) : powerFactor(s)),
  能源: (s, t) => (has(t, /电池/) ? batteryOcv(s) : has(t, /燃料电池/) ? fuelCellV(s) : has(t, /光伏|MPPT/) ? mppt(s) : stefan(s)),
  矿业冶金: (s) => shell(s, {
    equation: '邦德功指数示意：E = W_i (10/√P − 10/√F)',
    authority: 'Bond 粉碎功指数公式（选矿教材）',
    assumptions: 'P、F 为 80% 通过粒径 μm',
    fidelity: 'principle',
    params: { Wi: 12, P: 100, F: 1000 },
    schema: { Wi: S('W_i', 'dynamics', 'kWh/t', 5, 30), P: S('P', 'dynamics', 'μm', 10, 500), F: S('F', 'dynamics', 'μm', 100, 5000) },
    tick(st) {
      st.E = P(st.params, 'Wi', 12) * (10 / Math.sqrt(Math.max(1, P(st.params, 'P', 100))) - 10 / Math.sqrt(Math.max(1, P(st.params, 'F', 1000))));
    },
    plot: (st) => st.E,
    rows: (st) => [['E', st.E, 'kWh/t']],
  }),
  纺织食品: (s, t) => (has(t, /干燥/) ? dryingPage(s) : has(t, /纺|牵伸/) ? draftRatio(s) : draftRatio(s)),
  农业船舶汽车: (s, t) => (has(t, /灌溉/) ? irrigation(s) : has(t, /阻力/) ? shell(s, {
    equation: '摩擦阻力 R = ½ ρ v² S C_f',
    authority: '船舶阻力的二次阻力定义',
    assumptions: '给定 C_f',
    params: { v: 5, S: 20, Cf: 0.002 },
    schema: { v: S('v', 'dynamics', 'm/s', 0, 20), S: S('S', 'dynamics', 'm²', 1, 200), Cf: S('C_f', 'dynamics', '—', 0.0005, 0.01) },
    tick(st) { st.R = 0.5 * 1025 * P(st.params, 'v', 5) ** 2 * P(st.params, 'S', 20) * P(st.params, 'Cf', 0.002); },
    plot: (st) => st.R,
    rows: (st) => [['R', st.R, 'N']],
  }) : has(t, /悬架/) ? isolation(s) : irrigation(s)),
  铁路建筑测绘安全: (s) => shell(s, {
    equation: '制动距离近似 s = v² / (2 a)',
    authority: '匀减速运动学',
    assumptions: '常减速度',
    params: { v: 20, a: 1 },
    schema: { v: S('v', 'dynamics', 'm/s', 0, 80), a: S('a', 'dynamics', 'm/s²', 0.2, 4) },
    tick(st) { st.s = P(st.params, 'v', 20) ** 2 / (2 * Math.max(0.05, P(st.params, 'a', 1))); },
    plot: (st) => st.s,
    rows: (st) => [['s', st.s, 'm']],
  }),
  微积分: (s, t) => derivativeLesson(s, t),
  线性代数: (s, t) => matrix2(s, t),
  概率统计: (s, t) => (has(t, /贝叶斯/) ? shell(s, {
    equation: 'P(A|B)= P(B|A)P(A)/P(B)',
    authority: 'Ross, 贝叶斯公式',
    assumptions: 'P(B)>0',
    params: { pba: 0.9, pa: 0.2, pb: 0.3 },
    schema: { pba: S('P(B|A)', 'dynamics', '—', 0, 1), pa: S('P(A)', 'dynamics', '—', 0, 1), pb: S('P(B)', 'dynamics', '—', 0.01, 1) },
    tick(st) { st.p = P(st.params, 'pba', 0.9) * P(st.params, 'pa', 0.2) / Math.max(1e-3, P(st.params, 'pb', 0.3)); },
    plot: (st) => st.p,
    rows: (st) => [['P(A|B)', st.p, '']],
  }) : has(t, /中心极限|大数/) ? shell(s, {
    equation: 'se = σ / √n',
    authority: 'Ross, 样本均值标准误',
    assumptions: '独立同分布、有限方差',
    params: { sigma: 2, n: 25 },
    schema: { sigma: S('σ', 'dynamics', '—', 0.1, 10), n: S('n', 'dynamics', '—', 1, 400) },
    tick(st) { st.se = P(st.params, 'sigma', 2) / Math.sqrt(Math.max(1, P(st.params, 'n', 25))); },
    plot: (st) => st.se,
    rows: (st) => [['se', st.se, '']],
  }) : normalPdf(s, t)),
  动力系统: (s, t) => (has(t, /极限/) ? vanderPol(s) : lyapunovNote(s)),
  优化图论: (s, t) => (has(t, /线性规划/) ? shell(s, {
    equation: '在 x+y≤1, x,y≥0 上 z=c₁x+c₂y，顶点最优 z*=max(c₁,c₂)（默认 c₁=3, c₂=2）',
    authority: 'Dantzig 单纯形所依据的顶点最优（线性规划基本定理）',
    assumptions: '该可行域的最优值在顶点 (1,0) 或 (0,1)',
    params: { c1: 3, c2: 2 },
    schema: {
      c1: S('c₁', 'dynamics', '—', 0, 10),
      c2: S('c₂', 'dynamics', '—', 0, 10),
    },
    tick(st) { st.z = Math.max(P(st.params, 'c1', 3), P(st.params, 'c2', 2)); },
    plot: (st) => st.z,
    rows: (st) => [['z*', st.z, '']],
  }) : dijkstraBound(s)),
  反应: (s, t) => (has(t, /阿伦尼|活化/) ? arrhenius(s) : firstOrderReaction(s, t)),
  平衡与电化学: (s, t) => (has(t, /缓冲|pH|滴定/) ? (has(t, /滴定/) ? titration(s) : hhBuffer(s)) : has(t, /能斯特|电池|氧化还原/) ? nernst(s) : has(t, /腐蚀/) ? corrosionRate(s) : has(t, /燃料/) ? fuelCellV(s) : hhBuffer(s)),
  结构与光谱: (s) => beerLambert(s),
  生态生理: (s, t) => (has(t, /Lotka|捕食/) ? lotka(s) : has(t, /SIR|SEIR|传染/) ? sir(s, t) : has(t, /Logistic|种群/) ? logistic(s) : logistic(s)),
  气候: (s, t) => (has(t, /温室/) ? greenhouse(s) : radiationBalance(s)),
  微观: (s, t) => (has(t, /囚徒|博弈/) ? prisoner(s) : supplyDemand(s)),
  金融: (s, t) => (has(t, /期权|Black|BS/) ? blackScholes(s) : compound(s)),
};

function singleSlitModel(spec) {
  return shell(spec, {
    equation: '单缝第一极小：a sinθ = λ',
    authority: 'Hecht, Optics, 单缝衍射极小',
    assumptions: '夫琅禾费远场、单色',
    params: { a: 0.1e-3, lambda: 550e-9 },
    schema: {
      a: S('a', 'dynamics', 'm', 0.02e-3, 0.5e-3),
      lambda: S('λ', 'dynamics', 'm', 400e-9, 700e-9),
    },
    tick(state) {
      const a = Math.max(1e-6, P(state.params, 'a', 1e-4));
      const lambda = P(state.params, 'lambda', 550e-9);
      state.th = Math.asin(Math.min(1, lambda / a));
    },
    plot: (s) => s.th * 180 / Math.PI,
    rows: (s) => [['θ', s.th * 180 / Math.PI, '°']],
  });
}

function keywordModel(spec) {
  const blob = `${spec.id} ${spec.name} ${spec.formula || ''}`;
  const rules = [
    [/洛伦兹|lorenz/i, () => lorenzSys(spec)],
    [/rossler|若斯勒/i, () => rossler(spec)],
    [/mandelbrot|julia/i, () => mandelbrotEscape(spec)],
    [/logistic-growth|逻辑斯蒂增长|Ṅ/i, () => logistic(spec)],
    [/lotka/i, () => lotka(spec)],
    [/sir-epidemic|SIR/i, () => sir(spec, spec.formula || '')],
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
    [/开普勒|霍曼/, () => (/霍曼/.test(blob) ? hohmann(spec) : kepler(spec))],
    [/科里奥利/, () => coriolis(spec)],
    [/斜面|μcos/, () => newton(spec, '斜面')],
    [/Atwood|滑轮/, () => atwood(spec)],
    [/简谐|x''=-/, () => shmFamily(spec, '简谐')],
    [/阻尼/, () => shmFamily(spec, '阻尼')],
    [/受迫|扫频|共振曲线/, () => shmFamily(spec, '受迫')],
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
    [/矩阵|x'=Ax/, () => matrix2(spec, '矩阵')],
    [/二分|binary-search/, () => binarySearchSteps(spec)],
    [/Dijkstra|最短/, () => dijkstraBound(spec)],
    [/K-means|kmeans/, () => kmeans1d(spec)],
    [/梯度|linreg/, () => gdQuadratic(spec)],
    [/RSA|mod n/, () => rsaMod(spec)],
    [/熵/, () => binaryEntropy(spec)],
    [/阶跃|G\(s\)/, () => secondOrderStep(spec)],
    [/直流电机|电枢/, () => dcMotor(spec)],
    [/欧拉屈曲|P_cr/, () => stress(spec, '屈曲')],
    [/σ=F\/A|轴向/, () => stress(spec, '轴向')],
    [/扭转|τ=T/, () => stress(spec, '扭转')],
    [/弯曲|My\/I|挠度/, () => stress(spec, '弯曲')],
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
      equation: '真空压缩：ΔX ΔP = 1/4（ℏ=1），单正交可低于 1/2',
      authority: 'Scully & Zubairy, Quantum Optics, 压缩真空的不确定度分配',
      assumptions: 'ℏ=1 的定义式，不是实验装置',
      fidelity: 'principle',
      params: { dX: 0.3 },
      schema: { dX: S('ΔX', 'dynamics', '—', 0.05, 1) },
      tick(st) { st.dP = 0.25 / Math.max(0.05, P(st.params, 'dX', 0.3)); },
      plot: (st) => st.dP,
      rows: (st) => [['ΔP', st.dP, '']],
    })],
    [/全加器|进位/, () => boolGate(spec, '异或')],
    [/哈希/, () => hashLoad(spec)],
    [/页表|TLB|虚拟/, () => pageReplace(spec)],
    [/银行家/, () => bankerNeed(spec)],
    [/Raft|选举/, () => shell(spec, {
      equation: '任期投票：过半即当选',
      authority: 'Ongaro & Ousterhout, Raft 论文中的多数派',
      assumptions: '投票计数',
      params: { votes: 3, n: 5 },
      schema: { votes: S('votes', 'dynamics', '—', 0, 9), n: S('n', 'dynamics', '—', 1, 9) },
      tick(st) {
        const n = Math.max(1, Math.round(P(st.params, 'n', 5)));
        st.won = P(st.params, 'votes', 3) >= Math.floor(n / 2) + 1 ? 1 : 0;
      },
      plot: (st) => st.won,
      rows: (st) => [['elected', st.won, '']],
    })],
    [/反应级数|e\^\{-kt\}|reaction-order/, () => firstOrderReaction(spec, '一级')],
    [/浮沉|phugoid/i, () => phugoid(spec)],
    [/升力|Cl/, () => clift(spec)],
    [/Q=Cd|闸/, () => sluice(spec)],
    [/Vavg=D|占空/, () => pwm(spec)],
    [/s\(t\)=\[1\+m|调幅/, () => PREFIX['调制'](spec, 'AM')],
    [/∮E|高斯/, () => gaussPoint(spec)],
  ];
  for (const [re, fn] of rules) {
    if (re.test(blob)) return fn();
  }
  return null;
}

function familyFallback(spec) {
  const fam = spec.family || '';
  const map = {
    ode1d: () => newton(spec, spec.name || ''),
    ode2d: () => projectile(spec, 40),
    circular: () => newton(spec, '向心'),
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
    cycle: () => carnot(spec, ''),
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
    logic: () => boolGate(spec, '与'),
    arch: () => amdahl(spec),
    embed: () => pwm(spec),
    comm: () => nyquist(spec),
    net: () => tcpStates(spec),
    os: () => rrWait(spec),
    compile: () => binarySearchSteps(spec),
    dist: () => PREFIX['分布式与安全'](spec, ''),
    struct: () => stress(spec, spec.formula || ''),
    control: () => secondOrderStep(spec),
    chaos: () => lorenzSys(spec),
    traffic: () => naschFlow(spec),
    reactor: () => cstr(spec),
    aero: () => clift(spec),
  };
  const fn = map[fam];
  return fn ? fn() : kin(spec, spec.name || '');
}

export function buildTopicModel(spec) {
  if (!spec) return null;
  const over = overrideOptions(spec);
  if (over) return shell(spec, over);
  const formula = String(spec.formula || '');
  if (formula.includes('·')) {
    const prefix = formula.split('·')[0].trim();
    const topic = formula.split('·').slice(1).join('·').trim();
    const fn = PREFIX[prefix];
    if (fn) return fn(spec, topic);
  }
  return keywordModel(spec) || familyFallback(spec);
}
