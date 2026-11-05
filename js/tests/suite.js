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
import beamSfdBmd from '../models/beamSfdBmd.js';
import pidTune from '../models/pidTune.js';
import hodgkinHuxley from '../models/hodgkinHuxley.js';
import compoundMicroscope from '../models/compoundMicroscope.js';
import { runModelContract } from './model-contract.js';
import { validateUserModelDraft } from '../lab/userModels.js';

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
      const state = { params: { ...sorting.params, n: 8, algo: 1, stepDt: 0.01, seed: 2, demo: 0 } };
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
    {
      const { state, r } = smoke(beamSfdBmd, 10, 0.1);
      assert('beam-sfd-bmd SFD/BMD', state.sfd?.length > 10 && state.bmd?.length > 10 && r.length >= 4);
      state.params.support = 1;
      beamSfdBmd.step(state, 0.1);
      assert('beam cantilever Ra', Math.abs(state.Ra - (state.params.P1 + state.params.P2 + state.params.P3)) < 1e-6, `Ra=${state.Ra}`);
    }
    {
      const { state, r } = smoke(pidTune, 400, 0.02);
      assert('pid-tune metrics', r.some((x) => x.label === 'OS%') && r.some((x) => x.label === 'IAE') && r.some((x) => x.label === 'ts'));
      assert('pid-tune IAE grows', state.iae > 0, `iae=${state.iae}`);
    }
    {
      const { r } = smoke(hodgkinHuxley, 200, 0.001);
      assert('hodgkin-huxley readout', r.length >= 4);
    }
    {
      const state = { params: { ...compoundMicroscope.params } };
      compoundMicroscope.init(state);
      compoundMicroscope.step(state, 0);
      const r = compoundMicroscope.getReadouts(state, { digits: 3 });
      const na0 = r.find((x) => x.label === 'NA')?.value;
      const m0 = Math.abs(parseFloat(r.find((x) => x.label === '|M|')?.value));
      state.params.objective = '40x';
      compoundMicroscope.refresh(state);
      const r2 = compoundMicroscope.getReadouts(state, { digits: 3 });
      const m1 = Math.abs(parseFloat(r2.find((x) => x.label === '|M|')?.value));
      state.params.objective = '100x';
      compoundMicroscope.refresh(state);
      const r3 = compoundMicroscope.getReadouts(state, { digits: 3 });
      const nOil = parseFloat(r3.find((x) => x.label === 'n')?.value);
      assert(
        'compound-microscope optics',
        r.some((x) => x.label === 'NA')
          && r.some((x) => x.label === 'WD')
          && r.some((x) => x.label === '|M|')
          && r.some((x) => x.label === 'NA_cap')
          && m1 > m0
          && nOil >= 1.5
          && !!na0,
        `M0=${m0} M1=${m1} nOil=${nOil}`,
      );
    }
  }

  // 目录规模 + live/reset 语义
  {
    // 每族×引擎仅 1 条；不再要求笛卡尔爆炸后的 ≥3000
    assert('catalog ≥ 1000 models', models.length >= 1000, `n=${models.length}`);
    {
      const idsList = models.map((m) => m.id);
      const famIds = idsList.filter((id) => /^fam-.+-v\d+$/.test(id));
      const bySlug = new Map();
      let dup = null;
      for (const id of famIds) {
        const slug = id.replace(/^fam-/, '').replace(/-v\d+$/, '');
        if (bySlug.has(slug)) { dup = slug; break; }
        bySlug.set(slug, id);
      }
      assert('generated families unique by slug', !dup && bySlug.size >= 100,
        dup ? `dup=${dup}` : `families=${bySlug.size}`);
      const nonV01 = famIds.filter((id) => !/-v01$/.test(id));
      assert('family entries prefer -v01 only', nonV01.length === 0, `extra=${nonV01.slice(0, 5).join(',')}`);
    }
    const ids = new Set(models.map((m) => m.id));
    const missingAuth = models.filter((m) => !m.authority || !m.assumptions);
    assert('全库 authority+assumptions', missingAuth.length === 0, `missing=${missingAuth.length}`);
    const ff = models.find((m) => m.id === 'free-fall');
    assert('free-fall fidelity engineering', ff?.fidelity === 'engineering', ff?.fidelity);
    const polGate = models.find((m) => m.id === 'polarization');
    assert('偏振不再是占位 deprecated', polGate && polGate.deprecated !== true && polGate.topicBound, String(polGate?.deprecated));
    assert('偏振公式写的是 Malus', String(polGate?.formula || '').includes('cos'));

    const kept = validateUserModelDraft({
      name: '有阻尼谐振子（工程）',
      domain: '物理',
      sub: '经典力学',
      family: 'ode1d',
      formula: 'mẍ = −kx − cẋ',
      authority: 'Thornton & Marion, Classical Dynamics, §3.4',
      assumptions: '线性弹簧与粘滞阻尼；忽略干摩擦与大变形',
      description: '状态 (x,v)；参数 m,k,c 可调；与标准阻尼谐振子方程一致',
      fidelity: 'engineering',
      ethicsOk: true,
    }, { keepId: 'user-ode1d-edit' });
    assert('自建模型编辑保留 id', kept.ok && kept.spec?.id === 'user-ode1d-edit', kept.spec?.id);

    const vert = models.find((m) => m.id === 'r001-竖直上抛');
    {
      const state = { params: { ...vert.params, v0: 20, a: -9.81, x0: 0, speed: 1 } };
      vert.init(state);
      vert.step(state, 1);
      assert('竖直上抛 v=v0-gt', Math.abs(state.v - (20 - 9.81)) < 1e-6, `v=${state.v}`);
    }
    const ohm = models.find((m) => m.id === 'ohms-law');
    {
      const state = { params: { ...ohm.params, I: 2, R: 5, speed: 1 } };
      ohm.init(state);
      const V = ohm.getReadouts(state).find((r) => r.label === 'V');
      assert('欧姆定律 V=IR', V && Math.abs(parseFloat(V.value) - 10) < 1e-6, V && V.value);
    }
    const pol = models.find((m) => m.id === 'polarization');
    {
      const state = { params: { ...pol.params, I0: 2, theta: 60, speed: 1 } };
      pol.init(state);
      const I = pol.getReadouts(state).find((r) => r.label === 'I');
      assert('Malus I=I0 cos²θ', I && Math.abs(parseFloat(I.value) - 0.5) < 1e-6, I && I.value);
    }
    const col = models.find((m) => m.id === 'r003-一维弹性碰撞');
    {
      const state = { params: { ...col.params, m1: 2, m2: 2, u1: 3, u2: 0, e: 1, speed: 1 } };
      col.init(state);
      assert('弹性等质量交换速度', Math.abs(state.v1) < 1e-6 && Math.abs(state.v2 - 3) < 1e-6, `v1=${state.v1} v2=${state.v2}`);
    }
    const bohrTopic = models.find((m) => m.id === 'r018-玻尔模型');
    {
      const state = { params: { ...bohrTopic.params, n: 2, speed: 1 } };
      bohrTopic.init(state);
      const E = bohrTopic.getReadouts(state).find((r) => r.label === 'E');
      assert('玻尔能级 E=-13.6/n²', E && Math.abs(parseFloat(E.value) + 3.4) < 1e-6, E && E.value);
    }
    const boom = models.find((m) => m.id === 'r003-爆炸反冲');
    {
      const state = { params: { ...boom.params, m1: 2, m2: 1, v2: 4, speed: 1 } };
      boom.init(state);
      const v1 = boom.getReadouts(state).find((r) => r.label === 'v1');
      assert('爆炸反冲 m1 v1=-m2 v2', v1 && Math.abs(parseFloat(v1.value) + 2) < 1e-6, v1 && v1.value);
    }
    const stand = models.find((m) => m.id === 'standing-wave');
    {
      const state = { params: { ...stand.params, A: 0.01, k: Math.PI, w: 0, speed: 1, t0: 0 } };
      stand.init(state);
      assert('驻波 y=2A sin(kx)（t=0, kx=π/2）', Math.abs(state.y - 0.02) < 1e-6, `y=${state.y}`);
    }
    const slit = models.find((m) => m.id === 'double-slit');
    {
      const state = { params: { ...slit.params, lambda: 5.5e-7, L: 1, d: 2e-4, speed: 1 } };
      slit.init(state);
      assert('双缝 Δy=λL/d', Math.abs(state.y - 0.00275) < 1e-9, `Δy=${state.y}`);
    }
    const toss = models.find((m) => m.id === 'r001-斜抛');
    {
      const state = { params: { ...toss.params, v0: 16, theta: 45, g: 9.81, y0: 0, speed: 1 } };
      toss.init(state);
      toss.step(state, 1);
      const expectY = 16 * Math.sin(Math.PI / 4) - 0.5 * 9.81;
      assert('斜抛 y=v0 sinθ t−½gt²', Math.abs(state.y - expectY) < 1e-6, `y=${state.y}`);
    }
    const rl = models.find((m) => m.id === 'rl-circuit');
    {
      const state = { params: { ...rl.params, I: 1, R: 10, L: 0.1, speed: 1, t0: 0 } };
      rl.init(state);
      rl.step(state, 0.05);
      assert('RL 电流 i=I(1−e^{−Rt/L})', Math.abs(state.y - (1 - Math.exp(-5))) < 1e-9, `i=${state.y}`);
    }
    const accel = models.find((m) => m.formula && String(m.formula).includes('默认 a = +2'));
    const decel = models.find((m) => m.formula && String(m.formula).includes('默认 a = −2'));
    assert('匀加速公式标明默认 a', !!accel);
    assert('匀减速公式标明默认 a', !!decel);
    assert('弹性碰撞公式标明默认 e', String(col.formula).includes('e = 1'));
    const thin = models.filter((m) => m.topicBound && Object.keys(m.paramSchema || {}).length < 4);
    assert('paramSchema 不少于 4', thin.length === 0, `thin=${thin.length}`);

    const topicN = models.filter((m) => m.topicBound).length;
    const stray = models.filter((m) => (
      !m.topicBound
      && m.family !== 'hand'
      && m.id !== 'r016-显微镜'
      && !String(m.id).startsWith('fam-')
    ));
    assert(
      '非手写模型都走主题方程',
      stray.length === 0 && topicN >= 1200,
      `topic=${topicN} n=${models.length} stray=${stray.map((m) => m.id).join(',')}`,
    );

    assert('catalog has free-fall', ids.has('free-fall'));
    assert('catalog has sorting', ids.has('sorting'));
    assert('catalog has raft', ids.has('raft'));
    assert('catalog has photoelectric', ids.has('photoelectric'));
    assert('catalog has beam-sfd-bmd', ids.has('beam-sfd-bmd'));
    assert('catalog has pid-tune', ids.has('pid-tune'));
    assert('catalog has lorenz', ids.has('lorenz'));
    assert('catalog has nasch-ca', ids.has('nasch-ca'));
    assert('catalog has compound microscope', ids.has('r016-显微镜'));
    assert('catalog has fam-projectile-v01', ids.has('fam-projectile-v01'));
    assert('no fam-projectile-v02 clone', !ids.has('fam-projectile-v02'));

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

    // 工厂模型冒烟（抽样 + 新学科家族）
    const must = ['beam-sfd-bmd', 'pid-tune', 'lorenz', 'nasch-ca', 'cstr', 'vortex-lattice'];
    const sample = [
      ...models.filter((m) => must.includes(m.id)),
      ...models.filter((m) => !['free-fall', 'sorting', 'rlc', ...must].includes(m.id)).slice(0, 8),
    ];
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

  {
    const bad = validateUserModelDraft({
      name: 'x',
      domain: '物理',
      sub: '力学',
      family: 'ode1d',
      formula: 'a',
      authority: 'short',
      assumptions: 'too short',
      description: 'too short',
      fidelity: 'engineering',
      ethicsOk: false,
    });
    assert('自建模型拒绝缺权威/伦理', !bad.ok, bad.error);

    const good = validateUserModelDraft({
      name: '有阻尼谐振子（工程）',
      domain: '物理',
      sub: '经典力学',
      family: 'ode1d',
      formula: 'mẍ = −kx − cẋ',
      authority: 'Thornton & Marion, Classical Dynamics, §3.4',
      assumptions: '线性弹簧与粘滞阻尼；忽略干摩擦与大变形',
      description: '状态 (x,v)；参数 m,k,c 可调；与标准阻尼谐振子方程一致',
      fidelity: 'engineering',
      ethicsOk: true,
    });
    assert('自建模型接受完整工业级草稿', good.ok, good.error);
    const missingAsm = validateUserModelDraft({
      name: '缺假设的振子',
      domain: '物理',
      sub: '经典力学',
      family: 'ode1d',
      formula: 'mẍ = −kx',
      authority: 'Thornton & Marion, Classical Dynamics, §3.4',
      assumptions: '这里写满十二个字却不说边界',
      description: '状态 (x,v)；参数 m 与 k 可调，对照简谐振子',
      fidelity: 'engineering',
      ethicsOk: true,
    });
    assert('自建模型指出缺少的假设', !missingAsm.ok && String(missingAsm.error).includes('缺少假设'), missingAsm.error);
    assert('自建模型 id 前缀 user-', !!good.spec?.id?.startsWith('user-'), good.spec?.id);
  }

  {
    const contract = runModelContract();
    for (const r of contract) results.push(r);
    if (contract._contractFailures) results._contractFailures = contract._contractFailures;
  }

  return results;
}

// 供 Node 侧可选预加载（浏览器 loadModelMetadata 另走）
void loadModelMetadata;
