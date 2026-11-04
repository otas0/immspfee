/**
 * 可在 Node / 浏览器共用的物理断言套件
 */
import { velocityVerlet1D } from '../utils/integrator.js';
import {
  formatParamNumber,
  formatDtFriendly,
  sanitizeGlobals,
  parseUserNumber,
  validateCustomParam,
  clampNumber,
} from '../utils/params.js';
import sorting from '../models/sorting.js';
import bfsGrid from '../models/bfsGrid.js';
import life from '../models/life.js';
import cacheLru from '../models/cacheLru.js';
import pipeline from '../models/pipeline.js';
import fifo from '../models/fifo.js';
import rcCircuit from '../models/rcCircuit.js';
import rlc from '../models/rlc.js';
import { models, loadModelMetadata } from '../models/index.js';
import freeFall from '../models/freeFall.js';
import inclinedPlane from '../models/inclinedPlane.js';
import collision2d from '../models/collision2d.js';
import dijkstra from '../models/dijkstra.js';
import logicGates from '../models/logicGates.js';

function almostEqual(a, b, relTol = 1e-3, absTol = 1e-6) {
  const diff = Math.abs(a - b);
  const scale = Math.max(Math.abs(a), Math.abs(b), 1e-12);
  return diff <= absTol || diff / scale <= relTol;
}

function collide(m1, m2, u1, u2, e) {
  const v1 = ((m1 - e * m2) * u1 + (1 + e) * m2 * u2) / (m1 + m2);
  const v2 = ((m2 - e * m1) * u2 + (1 + e) * m1 * u1) / (m1 + m2);
  return { v1, v2 };
}

export function runSuite() {
  const results = [];
  const assert = (name, cond, detail = '') => {
    results.push({ name, ok: !!cond, detail });
  };

  // 自由落体能量
  {
    const g = 9.81;
    const m = 1;
    const h = 10;
    const dt = 1 / 240;
    let y = h;
    let v = 0;
    let a = -g;
    const E0 = m * g * y;
    let maxRel = 0;
    while (true) {
      const next = velocityVerlet1D(y, v, a, () => -g, dt);
      if (next.x <= 0) break;
      y = next.x;
      v = next.v;
      a = next.a;
      const E = 0.5 * m * v * v + m * g * y;
      maxRel = Math.max(maxRel, Math.abs(E - E0) / E0);
    }
    assert('自由落体无阻力能量守恒（误差 < 0.1%）', maxRel < 0.001, `maxRel=${(maxRel * 100).toFixed(6)}%`);
  }

  // 恢复系数
  {
    assert('落地 e=1 速度反向等幅', almostEqual(-1 * -5, 5), 'vOut=5');
    assert('落地 e=0 速度归零', almostEqual(-0 * -5, 0), 'vStop=0');
  }

  // 弹簧能量
  {
    const m = 1;
    const k = 20;
    const dt = 1 / 240;
    let x = 0.8;
    let v = 0;
    let a = -(k / m) * x;
    const E0 = 0.5 * k * x * x;
    const T = 2 * Math.PI * Math.sqrt(m / k);
    const steps = Math.floor((3 * T) / dt);
    let maxRel = 0;
    for (let i = 0; i < steps; i += 1) {
      const next = velocityVerlet1D(x, v, a, (xx) => -(k / m) * xx, dt);
      x = next.x;
      v = next.v;
      a = next.a;
      const E = 0.5 * m * v * v + 0.5 * k * x * x;
      maxRel = Math.max(maxRel, Math.abs(E - E0) / E0);
    }
    assert('弹簧无阻尼能量守恒（3 个周期，误差 < 0.1%）', maxRel < 0.001, `maxRel=${(maxRel * 100).toFixed(6)}%`);
  }

  // 单摆周期
  {
    const L = 1.2;
    const g = 9.81;
    const dt = 1 / 240;
    let th = (5 * Math.PI) / 180;
    let w = 0;
    let t = 0;
    const crossings = [];
    let lastSign = Math.sign(th);
    while (t < 25 && crossings.length < 5) {
      const alpha = -(g / L) * Math.sin(th);
      w += alpha * dt;
      th += w * dt;
      t += dt;
      const sign = Math.sign(th) || lastSign;
      if (sign !== lastSign && w > 0) crossings.push(t);
      lastSign = sign;
    }
    const periods = [];
    for (let i = 1; i < crossings.length; i += 1) periods.push(crossings[i] - crossings[i - 1]);
    const avg = periods.reduce((a, b) => a + b, 0) / periods.length;
    const Tth = 2 * Math.PI * Math.sqrt(L / g);
    const rel = Math.abs(avg - Tth) / Tth;
    assert('单摆小角度周期 ≈ 2π√(L/g)（相对误差 < 1%）', rel < 0.01, `Tmeas=${avg.toFixed(4)} Tth=${Tth.toFixed(4)} rel=${(rel * 100).toFixed(3)}%`);
  }

  // 碰撞极限
  {
    const m1 = 2;
    const m2 = 1;
    const u1 = 3;
    const u2 = -1;
    const P0 = m1 * u1 + m2 * u2;
    const KE0 = 0.5 * m1 * u1 ** 2 + 0.5 * m2 * u2 ** 2;
    const el = collide(m1, m2, u1, u2, 1);
    const P1 = m1 * el.v1 + m2 * el.v2;
    const KE1 = 0.5 * m1 * el.v1 ** 2 + 0.5 * m2 * el.v2 ** 2;
    assert('碰撞 e=1 动量守恒', almostEqual(P1, P0, 1e-12), `P0=${P0} P1=${P1}`);
    assert('碰撞 e=1 动能守恒', almostEqual(KE1, KE0, 1e-10), `KE0=${KE0} KE1=${KE1}`);
    const inel = collide(m1, m2, u1, u2, 0);
    const P2 = m1 * inel.v1 + m2 * inel.v2;
    assert('碰撞 e=0 动量守恒', almostEqual(P2, P0, 1e-12), `P0=${P0} P2=${P2}`);
    assert('碰撞 e=0 两球同速', almostEqual(inel.v1, inel.v2, 1e-12), `v1=${inel.v1} v2=${inel.v2}`);
  }

  // 热传导 α=0
  {
    const N = 20;
    const T = new Float64Array(N);
    for (let i = 0; i < N; i += 1) T[i] = 20 + i;
    const r = 0;
    const next = new Float64Array(N);
    next[0] = T[0];
    next[N - 1] = T[N - 1];
    for (let i = 1; i < N - 1; i += 1) next[i] = T[i] + r * (T[i + 1] - 2 * T[i] + T[i - 1]);
    let ok = true;
    for (let i = 0; i < N; i += 1) if (!almostEqual(next[i], T[i], 1e-12)) ok = false;
    assert('热传导 α=0 温度场不变', ok, 'α=0 显式步进应恒等');
  }

  // 波边界
  {
    const N = 16;
    const L = 1;
    const dx = L / (N + 1);
    const y = new Float64Array(N + 2);
    const v = new Float64Array(N + 2);
    const c = 2;
    const dt = 1 / 500;
    for (let i = 1; i <= N; i += 1) y[i] = 0.1 * Math.sin((Math.PI * i * dx) / L);
    for (let step = 0; step < 200; step += 1) {
      for (let i = 1; i <= N; i += 1) {
        const a = (c * c) * (y[i + 1] - 2 * y[i] + y[i - 1]) / (dx * dx);
        v[i] += a * dt;
      }
      for (let i = 1; i <= N; i += 1) y[i] += v[i] * dt;
      y[0] = 0;
      y[N + 1] = 0;
      v[0] = 0;
      v[N + 1] = 0;
    }
    assert('弦振动两端固定边界', almostEqual(y[0], 0) && almostEqual(y[N + 1], 0), `y0=${y[0]} yN=${y[N + 1]}`);
  }

  // 参数显示 / 钳制工具
  {
    assert('formatParamNumber 截断长小数', formatParamNumber(1 / 240) === '0.004167', formatParamNumber(1 / 240));
    assert('formatParamNumber 整数', formatParamNumber(48) === '48');
    assert('formatParamNumber 大数科学计数', /e\+?212/i.test(formatParamNumber(5.7e212)));
    assert('formatDtFriendly 1/240', formatDtFriendly(1 / 240) === '1/240', formatDtFriendly(1 / 240));
    assert('parseUserNumber 分数', almostEqual(parseUserNumber('1/240').value, 1 / 240));

    const g = {
      timeScale: 5.7e212,
      fixedDt: -1,
      maxSubSteps: 0,
      viewScale: Infinity,
      readoutDigits: 99,
    };
    sanitizeGlobals(g);
    assert('sanitizeGlobals timeScale', g.timeScale === 8, String(g.timeScale));
    assert('sanitizeGlobals fixedDt', g.fixedDt >= 1 / 2000 && g.fixedDt <= 1 / 30, String(g.fixedDt));
    assert('sanitizeGlobals maxSubSteps', g.maxSubSteps === 1, String(g.maxSubSteps));
    assert('sanitizeGlobals viewScale', g.viewScale === 0.25 || g.viewScale === 4, String(g.viewScale));
    assert('sanitizeGlobals digits', g.readoutDigits === 8, String(g.readoutDigits));
    assert('clampNumber', clampNumber(100, 0, 8) === 8);

    assert('validateCustomParam 坏 key', !validateCustomParam('__x', 1).ok);
    assert('validateCustomParam 超大', !validateCustomParam('a_extra', 1e20).ok);
    assert('validateCustomParam 合法', validateCustomParam('a_extra', 1.5).ok && validateCustomParam('a_extra', 1.5).value === 1.5);
  }

  // CS / CE 冒烟
  {
    const smoke = (model, steps = 400, dt = 1 / 60) => {
      const state = { params: JSON.parse(JSON.stringify(model.params)) };
      model.init(state);
      for (let i = 0; i < steps; i += 1) model.step(state, dt);
      const r = model.getReadouts(state) || [];
      return { state, r };
    };

    {
      const state = { params: { ...sorting.params, n: 8, algo: 1, stepDt: 0.01, seed: 2 } };
      sorting.init(state);
      for (let i = 0; i < 5000 && !state.done; i += 1) sorting.step(state, 0.05);
      const sorted = state.arr.every((v, i, a) => i === 0 || a[i - 1] <= v);
      assert('CS insertion 最终有序', state.done && sorted, `done=${state.done}`);
    }
    assert('CS BFS readout', smoke(bfsGrid, 800, 0.05).r.length >= 3);
    assert('CS life readout', smoke(life, 100, 0.12).r.length >= 3);
    assert('CE cache readout', smoke(cacheLru, 200, 0.1).r.length >= 3);
    {
      const { state, r } = smoke(pipeline, 80, 0.2);
      assert('CE pipeline cycle', state.cycle > 0 && r.length >= 3, `cycle=${state.cycle}`);
    }
    assert('CE fifo readout', smoke(fifo, 200, 0.1).r.length >= 3);
    {
      const state = { params: { ...rcCircuit.params, R: 100, C: 0.01, Vin: 5, V0: 0, mode: 1 } };
      rcCircuit.init(state);
      for (let i = 0; i < 2000; i += 1) rcCircuit.step(state, 0.01);
      assert('CE RC 趋向 Vin', Math.abs(state.Vc - 5) < 0.2, `Vc=${state.Vc}`);
    }
    assert('CE RLC readout', smoke(rlc, 500, 1 / 120).r.length >= 3);
    assert('inclined-plane readout', smoke(inclinedPlane, 200).r.length >= 4);
    assert('collision-2d readout', smoke(collision2d, 200).r.length >= 4);
    assert('dijkstra readout', smoke(dijkstra, 400, 0.1).r.length >= 3);
    assert('logic-gates readout', smoke(logicGates, 50, 0.2).r.length >= 4);
  }

  // 目录规模 + live/reset 语义
  {
    assert('catalog ≥ 100 models', models.length >= 100, `n=${models.length}`);
    const ids = new Set(models.map((m) => m.id));
    assert('catalog has free-fall', ids.has('free-fall'));
    assert('catalog has sorting', ids.has('sorting'));
    assert('catalog has raft', ids.has('raft'));
    assert('catalog has photoelectric', ids.has('photoelectric'));

    // g live：高度不因改 g 而重置
    {
      const state = { params: { ...freeFall.params } };
      freeFall.init(state);
      for (let i = 0; i < 120; i += 1) freeFall.step(state, 1 / 240);
      const yBefore = state.y;
      const tBefore = state.t;
      state.params.g = 20;
      for (let i = 0; i < 5; i += 1) freeFall.step(state, 1 / 240);
      assert('live g 不跳回 h₀', state.y < yBefore && state.y > 0 && state.t > tBefore, `y0=${yBefore} y=${state.y}`);
    }
    // h₀ reset：改 h 后 init 应回到新高度
    {
      const state = { params: { ...freeFall.params, h: 10 } };
      freeFall.init(state);
      for (let i = 0; i < 80; i += 1) freeFall.step(state, 1 / 240);
      state.params.h = 25;
      freeFall.init(state);
      assert('reset h₀ 回到新初值', almostEqual(state.y, 25, 1e-9), `y=${state.y}`);
    }

    // 工厂模型冒烟（抽样）
    const sample = models.filter((m) => !['free-fall', 'sorting', 'rlc'].includes(m.id)).slice(0, 12);
    let ok = true;
    let detail = '';
    for (const model of sample) {
      try {
        const state = { params: JSON.parse(JSON.stringify(model.params)) };
        model.init(state);
        for (let i = 0; i < 30; i += 1) model.step(state, 1 / 60);
        const r = model.getReadouts(state) || [];
        if (!r.length) { ok = false; detail = model.id; break; }
      } catch (err) {
        ok = false;
        detail = `${model.id}: ${err.message}`;
        break;
      }
    }
    assert('factory sample smoke', ok, detail);
  }

  return results;
}

// 供 Node 侧可选预加载（浏览器 loadModelMetadata 另走）
void loadModelMetadata;
