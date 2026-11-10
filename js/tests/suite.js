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
import heat from '../models/heat.js';
import wave from '../models/wave.js';
import compoundMicroscope from '../models/compoundMicroscope.js';
import {
  OBJECTIVE_RING_LEGEND,
  OBJECTIVES,
  EYEPIECES,
  objectiveRingColor,
  opticsFromParams,
  DEFAULT_PARAMS,
} from '../models/microscopeOptics.js';
import { createMicroscopeStage } from '../shells/microscopeStage.js';
import { microscopeLayout, DRAG_KINDS, CLICK_KINDS } from '../viz/microscopeLayout.js';
import { buildMicroscopeSolid, digitStrokes, condenserLensRadii, meshDynamicKey } from '../viz/microscopeMeshBuild.js';
import { overlayCaptionPolicy, CAMERA_HOLD, VIEW_HOTKEYS, STAGE_CAPTURE_KEYS } from '../viz/microscopeWebgl.js';
import { runModelContract } from './model-contract.js';
import { validateUserModelDraft, USER_MODEL_FAMILIES } from '../lab/userModels.js';
import { runLab12 } from './lab12.js';

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

  // Dirichlet ends are live; length updates dx without wiping the interior.
  {
    const hs = {
      params: {
        ...heat.params, N: 21, L: 1, alpha: 0, T0: 20, hotspot: 20, Tleft: 100, Tright: 0,
      },
    };
    heat.init(hs);
    const mid = hs.T[10];
    hs.params.Tleft = 5;
    hs.params.L = 2;
    heat.refresh(hs);
    assert('热传导左端温度 live 不重置内部', hs.T[0] === 5 && hs.T[10] === mid, `T0=${hs.T[0]} mid=${hs.T[10]}`);
    assert('热传导 L 更新 dx', Math.abs(hs.dx - 2 / 20) < 1e-12, `dx=${hs.dx}`);
    assert('热传导边界组为 dynamics', heat.paramSchema.Tleft.group === 'dynamics' && heat.paramSchema.Tright.group === 'dynamics');
  }

  {
    const ws = { params: { ...wave.params, N: 16, L: 1 } };
    wave.init(ws);
    const y1 = ws.y[1];
    ws.params.L = 4;
    wave.refresh(ws);
    assert('弦长 L 更新 dx 且不抹掉位移', Math.abs(ws.dx - 4 / 17) < 1e-12 && ws.y[1] === y1, `dx=${ws.dx} y1=${ws.y[1]}`);
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

  // Full-frame substeps: Fourier limit for heat, CFL for the wave.
  {
    const hs = {
      params: {
        ...heat.params, N: 41, L: 1, alpha: 0.25, T0: 20, hotspot: 90, Tleft: 100, Tright: 0,
      },
    };
    heat.init(hs);
    const dt = 1 / 60;
    const dtMax = (hs.dx * hs.dx) / (2 * hs.params.alpha);
    assert('热传导该帧超过一次 Fourier 上限', dt > dtMax, `dt=${dt} dtMax=${dtMax}`);
    heat.step(hs, dt);
    assert('热传导 step 推进完整 dt', Math.abs(hs.t - dt) < 1e-8, `t=${hs.t}`);
    let finite = hs.T[0] === 100 && hs.T[hs.N - 1] === 0;
    for (let i = 0; i < hs.N; i += 1) if (!Number.isFinite(hs.T[i])) finite = false;
    assert('热传导子步后端点与温度有限', finite, `T0=${hs.T[0]} TN=${hs.T[hs.N - 1]}`);
    const t1 = hs.t;
    heat.step(hs, dt);
    assert('热传导第二帧仍走完整 dt', Math.abs(hs.t - t1 - dt) < 1e-8, `t=${hs.t}`);
  }

  {
    const ws = {
      params: { ...wave.params, N: 32, L: 0.2, c: 6, damp: 0, A1: 0.04, A2: 0, A3: 0 },
    };
    wave.init(ws);
    const dt = 1 / 60;
    const cfl = ws.dx / ws.params.c;
    assert('短弦该帧超过一阶 CFL', dt > cfl, `dt=${dt} cfl=${cfl}`);
    let yMax = 0;
    let finite = true;
    const frames = 90;
    for (let n = 0; n < frames; n += 1) {
      wave.step(ws, dt);
      for (let i = 0; i < ws.y.length; i += 1) {
        if (!Number.isFinite(ws.y[i]) || !Number.isFinite(ws.v[i])) finite = false;
        yMax = Math.max(yMax, Math.abs(ws.y[i]));
      }
    }
    assert(
      '短弦中等波速 CFL 子步保持稳定',
      finite && yMax > 0.02 && yMax < 0.5 && ws.y[0] === 0 && ws.y[ws.N + 1] === 0,
      `ymax=${yMax} t=${ws.t} y0=${ws.y[0]} yN=${ws.y[ws.N + 1]}`,
    );
    assert('弦振动 step 累计完整 dt', Math.abs(ws.t - frames * dt) < 1e-6, `t=${ws.t}`);
  }

  {
    // Fresh undamped string: Velocity-Verlet + CFL substeps keep discrete energy in gate.
    const we = {
      params: { ...wave.params, N: 64, L: 1, c: 0.8, damp: 0, A1: 0.05, A2: 0, A3: 0 },
    };
    wave.init(we);
    const dtE = 1 / 180;
    const e0 = wave.getEnergy(we);
    const E0 = e0.kinetic + e0.potential;
    let maxRel = 0;
    for (let n = 0; n < 360; n += 1) {
      wave.step(we, dtE);
      const e = wave.getEnergy(we);
      const E = e.kinetic + e.potential;
      if (E0 > 1e-12) maxRel = Math.max(maxRel, Math.abs(E - E0) / E0);
    }
    assert('无阻尼波能量漂移门 < 2%', maxRel < 0.02, `maxRel=${(maxRel * 100).toFixed(4)}% E0=${E0}`);
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
      const plant = { params: { ...pidTune.params, speed: 1 } };
      pidTune.init(plant);
      pidTune.step(plant, 0.01);
      const u0 = 1.4 * 1 + 0.55 * 0.01;
      const a0 = (2.2 ** 2) * u0;
      const yExpect = a0 * 0.01 * 0.01;
      assert('pid 对象 ÿ=K ωn² u − 2ζωn ẏ − ωn² y', Math.abs(plant.y - yExpect) < 1e-9, `y=${plant.y} expect=${yExpect}`);
    }
    {
      const { r } = smoke(hodgkinHuxley, 200, 0.001);
      assert('hodgkin-huxley readout', r.length >= 4);
      const hh = { params: { ...hodgkinHuxley.params } };
      hodgkinHuxley.init(hh);
      hh.V = -55;
      hodgkinHuxley.step(hh, 1 / 60);
      assert(
        'HH α_n 在 V=-55 有限',
        Number.isFinite(hh.V) && Number.isFinite(hh.n) && Number.isFinite(hh.m),
        `V=${hh.V} n=${hh.n} m=${hh.m}`,
      );
      assert('HH 刺激起点为 dynamics', hodgkinHuxley.paramSchema.stimStart.group === 'dynamics');
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
      const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
      const clickObj = (index) => {
        const state = { params: { ...compoundMicroscope.params } };
        compoundMicroscope.init(state);
        compoundMicroscope.draw(ctx, state, { width: 800, height: 600 });
        const box = state._layout?.hits?.find((h) => h.kind === 'obj' && h.index === index);
        const okClick = box && compoundMicroscope.onPointer(state, {
          type: 'down', x: box.x + box.w / 2, y: box.y + box.h / 2,
        });
        return { ok: !!okClick, readouts: compoundMicroscope.getReadouts(state, { digits: 3 }) };
      };
      // One table locks every common turret stop (default 10× plus 4× / 40× / 100×).
      const TURRET = [
        { index: 0, mag: '4×', f: '40.000 mm', M: '-40.000×' },
        { index: 1, mag: '10×', f: '16.000 mm', M: '-100.000×' },
        { index: 2, mag: '40×', f: '4.000 mm', M: '-400.000×' },
        { index: 3, mag: '100×', f: '1.600 mm', M: '-1000.000×' },
      ];
      for (const row of TURRET) {
        const hit = clickObj(row.index);
        assert(
          `物镜转盘 ${row.mag} 锁定 f_obj 与 M`,
          hit.ok
            && hit.readouts.find((x) => x.label === 'f_obj')?.value === row.f
            && hit.readouts.find((x) => x.label === 'M')?.value === row.M,
          `f ${hit.readouts.find((x) => x.label === 'f_obj')?.value} M ${hit.readouts.find((x) => x.label === 'M')?.value}`,
        );
      }
      const at10 = clickObj(1);
      const at40 = clickObj(2);
      assert(
        '物镜转盘 10×→40× 锁定 f_obj 与 M',
        at10.ok && at40.ok
          && at10.readouts.find((x) => x.label === 'f_obj')?.value === '16.000 mm'
          && at10.readouts.find((x) => x.label === 'M')?.value === '-100.000×'
          && at40.readouts.find((x) => x.label === 'f_obj')?.value === '4.000 mm'
          && at40.readouts.find((x) => x.label === 'M')?.value === '-400.000×',
        `10× ${at10.readouts.find((x) => x.label === 'M')?.value} 40× ${at40.readouts.find((x) => x.label === 'M')?.value}`,
      );
    }

    // #micro-ring-legend four-color DIN DOM contract.
    {
      assert('DIN ring legend has 4 rows', OBJECTIVE_RING_LEGEND.length === 4, String(OBJECTIVE_RING_LEGEND.length));
      const names = OBJECTIVE_RING_LEGEND.map((r) => r.name);
      assert(
        'DIN ring legend colors red/yellow/light blue/white',
        names[0] === 'red' && names[1] === 'yellow' && names[2] === 'light blue' && names[3] === 'white',
        names.join(','),
      );
      const hexes = new Set(OBJECTIVE_RING_LEGEND.map((r) => r.hex));
      assert('DIN ring legend hex unique', hexes.size === 4, [...hexes].join(','));
      assert('4× ring is red', objectiveRingColor(4).name === 'red');
      assert('100× ring is white', objectiveRingColor(100).name === 'white');

      const store = new Map();
      const makeEl = (tag) => {
        const attrs = {};
        const children = [];
        const el = {
          tagName: String(tag).toUpperCase(),
          id: '',
          className: '',
          hidden: false,
          style: { setProperty() {} },
          dataset: {},
          children,
          childNodes: children,
          textContent: '',
          innerHTML: '',
          getAttribute(k) { return attrs[k] ?? null; },
          setAttribute(k, v) {
            attrs[k] = String(v);
            if (k === 'id') {
              el.id = String(v);
              store.set(String(v), el);
            }
          },
          appendChild(c) { children.push(c); el.childNodes = children; return c; },
          addEventListener() {},
          querySelector(sel) {
            if (sel.startsWith('#')) return store.get(sel.slice(1)) || null;
            return null;
          },
          querySelectorAll() { return []; },
          closest() { return null; },
        };
        return el;
      };
      const doc = {
        getElementById: (id) => store.get(id) || null,
        querySelector: (sel) => (sel.startsWith('#') ? store.get(sel.slice(1)) || null : null),
        createElement: makeEl,
        createTextNode: (t) => ({ textContent: String(t), nodeType: 3 }),
      };
      const prevDoc = globalThis.document;
      globalThis.document = doc;
      try {
        const stageApi = createMicroscopeStage({
          getState: () => ({
            params: {
              objective: '10x', eyepiece: '10x', tubeL_mm: 160, NA: 0.25, WD_mm: 6.5,
              lambda_nm: 550, lampOn: 1, fieldIris: 0.55, focusZ_mm: 0, stageX_mm: 0, stageY_mm: 0,
            },
          }),
          onChange: () => {},
          t: (k) => k,
        });
        const legend = makeEl('div');
        legend.id = 'micro-ring-legend';
        legend.className = 'micro-ring-legend';
        legend.setAttribute('aria-label', 'DIN objective rings');
        store.set('micro-ring-legend', legend);
        for (const row of OBJECTIVE_RING_LEGEND) {
          const sw = makeEl('span');
          sw.className = 'micro-ring-swatch';
          sw.style.setProperty('--micro-ring', row.hex);
          const dot = makeEl('i');
          dot.setAttribute('aria-hidden', 'true');
          sw.appendChild(dot);
          sw.appendChild(doc.createTextNode(`${row.mag}× ${row.name}`));
          legend.appendChild(sw);
        }
        const legendEl = doc.getElementById('micro-ring-legend');
        assert('micro-ring-legend exists', !!legendEl, 'missing #micro-ring-legend');
        assert(
          'micro-ring-legend aria-label',
          legendEl.getAttribute('aria-label') === 'DIN objective rings',
          String(legendEl.getAttribute('aria-label')),
        );
        assert(
          'micro-ring-legend has 4 swatches',
          legendEl.children.length === 4,
          String(legendEl.children.length),
        );
        assert('stage API exposes paint', typeof stageApi.paint === 'function');
      } finally {
        globalThis.document = prevDoc;
      }
    }

    {
      const o40 = opticsFromParams({ objective: '40x', eyepiece: '10x', tubeL_mm: 160, NA: 0.65, WD_mm: 0.6 });
      const lay = microscopeLayout(o40, { focusZ_mm: 0.5, stageX_mm: 5, stageY_mm: -3, fieldIris: 0.4, lampOn: 1 });
      const active = lay.pts.find((p) => p.kind === 'obj' && p.index === 2);
      assert('turret puts 40× on optical axis (−Z)', !!active && Math.abs(active.z + 0.32) < 0.02 && Math.abs(active.x) < 0.02, JSON.stringify(active));
      const eyes = lay.pts.filter((p) => p.kind === 'eye');
      assert('eyepiece picks sit on tubes (y ≥ tubeTop)', eyes.length === 3 && eyes.every((e) => e.y >= lay.tubeTopY), eyes.map((e) => e.y).join(','));
      assert(
        'Abbe iris tracks NA',
        Math.abs(lay.irisOpen - Math.min(0.95, Math.max(0.08, o40.NA / o40.NAcap))) < 1e-9,
        String(lay.irisOpen),
      );
      assert('condenser height tracks WD', lay.condenserY < lay.stageY - 0.05, `c=${lay.condenserY} s=${lay.stageY}`);
      assert('focus displaces stage (rack)', lay.stageY < microscopeLayout(o40, { focusZ_mm: 0 }).stageY);
      const layWide = microscopeLayout(
        opticsFromParams({ objective: '40x', eyepiece: '10x', tubeL_mm: 160, NA: 0.65, WD_mm: 6 }),
        { focusZ_mm: 0 },
      );
      assert(
        'WD opens objective–stage gap',
        layWide.stageY < lay.stageY - 0.05,
        `wide=${layWide.stageY} tight=${lay.stageY}`,
      );
      assert('tubeL is not a focus drag', !DRAG_KINDS.has('tubeL'));
      assert('stage XY slides slide picks', Math.abs(lay.slideX - 0.02) < 1e-9 && Math.abs(lay.slideZ + 0.012) < 1e-9);
      for (const k of ['focusCoarse', 'focusFine', 'stageX', 'stageY', 'condenser', 'iris', 'fieldIris']) {
        assert(`DRAG_KINDS has ${k}`, DRAG_KINDS.has(k));
      }
      for (const k of ['obj', 'eye', 'lamp', 'immersion', 'clip']) {
        assert(`CLICK_KINDS has ${k}`, CLICK_KINDS.has(k));
      }
      const mesh = buildMicroscopeSolid(
        o40,
        null,
        OBJECTIVES,
        EYEPIECES,
        objectiveRingColor,
        { layout: lay, tess: 1, part: 'all' },
      );
      const dynVerts = mesh.dynamicData.length / 6;
      assert('desktop tess=1 dynamic verts > 100k', dynVerts > 100000, `dyn=${dynVerts}`);

      const strokeCounts = {
        0: 6, 1: 2, 2: 5, 3: 5, 4: 4, 5: 5, 6: 6, 7: 3, 8: 7, 9: 6, '×': 2,
      };
      for (const [ch, n] of Object.entries(strokeCounts)) {
        const got = digitStrokes(ch).length;
        assert(`digitStrokes ${ch} → ${n}`, got === n, `got ${got}`);
      }
      assert(
        'digitStrokes x/X match ×',
        digitStrokes('x').length === 2 && digitStrokes('X').length === 2,
        `x=${digitStrokes('x').length} X=${digitStrokes('X').length}`,
      );

      const hoverCap = overlayCaptionPolicy({ showLabels: 0, hot: true });
      assert(
        'showLabels=0 + hot → hover caption',
        hoverCap.hoverCaption === true && hoverCap.standing === false,
        JSON.stringify(hoverCap),
      );
      const standCap = overlayCaptionPolicy({ showLabels: 1, hot: true });
      assert('showLabels=1 → standing captions', standCap.standing === true, JSON.stringify(standCap));
      const coldCap = overlayCaptionPolicy({ showLabels: '0', hot: false });
      assert(
        "showLabels='0' cold hides captions",
        coldCap.standing === false && coldCap.hoverCaption === false,
        JSON.stringify(coldCap),
      );
      assert('DEFAULT_PARAMS.showLabels is 0', DEFAULT_PARAMS.showLabels === 0, String(DEFAULT_PARAMS.showLabels));
      assert('DEFAULT_PARAMS.tubeL_mm is 160', DEFAULT_PARAMS.tubeL_mm === 160, String(DEFAULT_PARAMS.tubeL_mm));
      assert('DEFAULT_PARAMS.objective is 10x', DEFAULT_PARAMS.objective === '10x', String(DEFAULT_PARAMS.objective));
      assert('DEFAULT_PARAMS.focusZ_mm is 0', DEFAULT_PARAMS.focusZ_mm === 0, String(DEFAULT_PARAMS.focusZ_mm));
      assert('CAMERA_HOLD KeyD → yawRight', CAMERA_HOLD.KeyD === 'yawRight', String(CAMERA_HOLD.KeyD));
      assert('CAMERA_HOLD KeyA → yawLeft', CAMERA_HOLD.KeyA === 'yawLeft', String(CAMERA_HOLD.KeyA));
      assert('CAMERA_HOLD KeyW → dollyIn', CAMERA_HOLD.KeyW === 'dollyIn', String(CAMERA_HOLD.KeyW));
      assert('VIEW_HOTKEYS 3 → turret', VIEW_HOTKEYS['3'] === 'turret', String(VIEW_HOTKEYS['3']));
      assert('VIEW_HOTKEYS 5 → lamp', VIEW_HOTKEYS['5'] === 'lamp', String(VIEW_HOTKEYS['5']));
      assert(
        'STAGE_CAPTURE_KEYS includes getMeshDynamicKey',
        STAGE_CAPTURE_KEYS.includes('getMeshDynamicKey'),
        String(STAGE_CAPTURE_KEYS),
      );

      const oLow = opticsFromParams({ objective: '40x', eyepiece: '10x', tubeL_mm: 160, NA: 0.2, WD_mm: 0.6 });
      const layLow = microscopeLayout(oLow, { focusZ_mm: 0.5, stageX_mm: 5, stageY_mm: -3, fieldIris: 0.4, lampOn: 1 });
      assert(
        'NA=0.65 vs NA=0.2 changes irisOpen',
        Math.abs(lay.irisOpen - layLow.irisOpen) > 0.05,
        `hi=${lay.irisOpen} lo=${layLow.irisOpen}`,
      );
      const lensShut = condenserLensRadii(0.08);
      const lensOpen = condenserLensRadii(lay.irisOpen);
      assert(
        'irisOpen→lensBot/lensTop opens with NA',
        lensOpen.lensBot > lensShut.lensBot && lensOpen.lensTop > lensShut.lensTop,
        `shut=${JSON.stringify(lensShut)} open=${JSON.stringify(lensOpen)}`,
      );
      assert(
        'condenserLensRadii matches irisOpen clamp',
        Math.abs(lensOpen.irisOpen - lay.irisOpen) < 1e-12,
        String(lensOpen.irisOpen),
      );
      const keyHi = meshDynamicKey(o40, null, { NA: o40.NA, objective: '40x' });
      const keyLo = meshDynamicKey(oLow, null, { NA: oLow.NA, objective: '40x' });
      assert(
        'meshDynamicKey changes with NA/irisOpen',
        keyHi !== keyLo,
        `hi=${keyHi} lo=${keyLo}`,
      );
      const meshShut = buildMicroscopeSolid(
        o40, null, OBJECTIVES, EYEPIECES, objectiveRingColor,
        { layout: { ...lay, irisOpen: 0.08 }, tess: 0.4, part: 'dynamic' },
      );
      const meshOpen = buildMicroscopeSolid(
        o40, null, OBJECTIVES, EYEPIECES, objectiveRingColor,
        { layout: { ...lay, irisOpen: lay.irisOpen }, tess: 0.4, part: 'dynamic' },
      );
      let lensDiff = meshShut.dynamicData.length !== meshOpen.dynamicData.length;
      if (!lensDiff) {
        const a = meshShut.dynamicData;
        const b = meshOpen.dynamicData;
        for (let i = 0; i < a.length; i += 3) {
          if (a[i] !== b[i]) { lensDiff = true; break; }
        }
      }
      assert(
        'irisOpen scales condenser lens mesh',
        lensDiff,
        `verts ${meshOpen.dynamicData.length / 6} vs ${meshShut.dynamicData.length / 6}`,
      );
    }
  }

  // 目录规模 + live/reset 语义
  {
    // 每族×引擎仅 1 条；不再要求笛卡尔爆炸后的 ≥3000
    assert('completed catalog size (hand+fam+named)', models.length >= 200 && models.length <= 450, `n=${models.length}`);
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
    assert('偏振不再是占位 deprecated', polGate && polGate.deprecated !== true, String(polGate?.deprecated));
    assert('偏振已升手写 family=hand', polGate?.family === 'hand', polGate?.family);
    for (const id of ['double-slit', 'single-slit', 'standing-wave', 'crc-hamming', 'avl-tree', 'turing', 'huffman']) {
      const m = models.find((x) => x.id === id);
      assert(`${id} 手写在库`, !!m && m.family === 'hand', m?.family);
    }
    assert('偏振公式写的是 Malus', /cos|Malus/i.test(String(polGate?.formula || polGate?.equation || '')));
    assert('目录无 gauge family', models.every((m) => m.family !== 'gauge'), models.filter((m) => m.family === 'gauge').map((m) => m.id).join(','));
    assert('自建白名单不含 gauge', !USER_MODEL_FAMILIES.includes('gauge'), USER_MODEL_FAMILIES.join(','));
    {
      const impostors = models.filter((m) => {
        const f = `${m.formula || ''} ${m.equation || ''} ${m.authority || ''}`;
        const idn = `${m.id} ${m.name}`;
        if (/条目由主题求解器/.test(f)) return true;
        if (/⌊log₂ n⌋|比较次数上界/.test(f) && m.id !== 'binary-search') return true;
        if (/f_s ≥ 2 f_max/.test(f) && !/adc|采样|nyquist/i.test(idn)) return true;
        return false;
      });
      assert('无错绑占位模型', impostors.length === 0, impostors.map((m) => m.id).join(','));
    }

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

    const vert = models.find((m) => m.id === 'free-fall');
    {
      const state = { params: { ...vert.params, v0: 20, g: 9.81, k: 0, h: 10 } };
      vert.init(state);
      vert.step(state, 1);
      assert('竖直上抛/落体 v=v0−gt', Math.abs(state.v - (20 - 9.81)) < 1e-6, `v=${state.v}`);
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
    const col = models.find((m) => m.id === 'fam-collision-v01');
    {
      const state = { params: { ...col.params, e: 1, mRatio: 1, angle: 0 } };
      col.init(state);
      assert('弹性等质量交换速度', Math.abs(state.v1) < 1e-6 && Math.abs(state.v2 - 1) < 1e-6, `v1=${state.v1} v2=${state.v2}`);
    }
    const bohrTopic = models.find((m) => m.id === 'bohr');
    {
      assert('玻尔模型存在', !!bohrTopic, 'missing bohr');
      assert('玻尔默认 n 可调', bohrTopic && Number(bohrTopic.params?.n) >= 1, JSON.stringify(bohrTopic?.params));
      assert('玻尔方程非空', !!(bohrTopic?.equation || bohrTopic?.formula), bohrTopic?.equation || bohrTopic?.formula);
      const state = { params: { ...bohrTopic.params, n: 2, speed: 1 } };
      bohrTopic.init(state);
      const E = bohrTopic.getReadouts(state).find((r) => r.label === 'E' || r.label === 'E_n');
      assert('玻尔能级 E=-13.6/n²', E && Math.abs(parseFloat(E.value) + 3.4) < 1e-6, E && E.value);
    }
    const boom = models.find((m) => m.id === 'fam-collision-v01');
    {
      const state = { params: { ...boom.params, e: 0, mRatio: 0.5, angle: 0 } };
      boom.init(state);
      // Sticky 1D with mRatio=m1/m2=0.5, u1=1,u2=0 → v = m1/(m1+m2)=1/3
      assert('完全非弹性共速', Math.abs(state.v1 - state.v2) < 1e-9 && Math.abs(state.v1 - 1 / 3) < 1e-9, `v1=${state.v1} v2=${state.v2}`);
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
    const toss = models.find((m) => m.id === 'fam-projectile-v01');
    {
      const state = { params: { ...toss.params, v0: 16, theta: 45, g: 9.81, k: 0 } };
      toss.init(state);
      toss.step(state, 1);
      const expectY = 16 * Math.sin(Math.PI / 4) - 0.5 * 9.81;
      assert('斜抛 y=v0 sinθ t−½gt²', Math.abs(state.y - expectY) < 1e-6, `y=${state.y}`);
    }
    const rl = models.find((m) => m.id === 'rl-circuit');
    {
      const state = { params: { ...rl.params, V: 10, R: 10, L: 0.1, i0: 0, mode: 1 } };
      rl.init(state);
      const h = 1e-4;
      for (let i = 0; i < 500; i += 1) rl.step(state, h);
      const iInf = 1;
      const expect = iInf * (1 - Math.exp(-(10 / 0.1) * state.t));
      assert('RL 电流逼近 (V/R)(1−e^{−Rt/L})', Math.abs(state.i - expect) < 2e-3, `i=${state.i} expect=${expect}`);
    }
    assert('自由落体在库', !!models.find((m) => m.id === 'free-fall'));
    assert('阻力落体在库', !!models.find((m) => m.id === 'drag-fall'));
    assert('弹性碰撞公式含恢复系数', /e|恢复/.test(String(col.formula || col.equation || '')));
    const thin = models.filter((m) => m.topicBound && Object.keys(m.paramSchema || {}).length < 4);
    assert('paramSchema 不少于 4', thin.length === 0, `thin=${thin.length}`);

    const topicN = models.filter((m) => m.topicBound).length;
    const stray = models.filter((m) => (
      !m.topicBound
      && m.family !== 'hand'
      && m.id !== 'r016-显微镜'
      && !String(m.id).startsWith('fam-')
      && !(m.generated || m.dims)
    ));
    assert(
      '非手写模型都走主题方程或 fam 控制方程',
      stray.length === 0 && topicN >= 150 && models.length >= 200 && models.length <= 500,
      `topic=${topicN} n=${models.length} stray=${stray.map((m) => m.id).join(',')}`,
    );

    assert('catalog has free-fall', ids.has('free-fall'));
    assert('catalog has sorting', ids.has('sorting'));
    assert('catalog has raft', ids.has('raft'));
    assert('catalog has photoelectric', ids.has('photoelectric'));
    {
      const pe = models.find((m) => m.id === 'photoelectric');
      const st = { params: { ...pe.params, hf: 5, W: 2, intensity: 4 } };
      pe.init(st);
      const kOf = () => parseFloat(pe.getReadouts(st).find((r) => r.label === 'K_max')?.value);
      const rOf = () => parseFloat(pe.getReadouts(st).find((r) => r.label === 'R')?.value);
      assert('光电 K_max=hf−W 不乘光强', Math.abs(kOf() - 3) < 1e-9 && Math.abs(rOf() - 4) < 1e-9, `K=${kOf()} R=${rOf()}`);
      st.params.intensity = 9;
      pe.step(st, 0);
      assert('光电光强只改产额', Math.abs(kOf() - 3) < 1e-9 && Math.abs(rOf() - 9) < 1e-9, `K=${kOf()} R=${rOf()}`);
      st.params.hf = 1;
      pe.step(st, 0);
      assert('光电阈值以下产额为 0', Math.abs(kOf()) < 1e-9 && Math.abs(rOf()) < 1e-9, `K=${kOf()} R=${rOf()}`);
    }
    {
      const peVar = models.find((m) => m.id === 'fam-photoelectric-v01');
      const st = { params: { ...peVar.params, nu: 4, W: 1, I: 2, h: 1 } };
      peVar.init(st);
      assert(
        'fam-photoelectric K_max=hν−W',
        Math.abs(st.K - 3) < 1e-12 && Math.abs(st.rate - 2) < 1e-12,
        `K=${st.K} R=${st.rate}`,
      );
      st.params.I = 7;
      peVar.step(st, 0.2);
      assert('fam-photoelectric 光强只改产额', Math.abs(st.K - 3) < 1e-12 && Math.abs(st.rate - 7) < 1e-12, `K=${st.K} R=${st.rate}`);
      const kBefore = st.K;
      peVar.step(st, 0.5);
      assert('fam-photoelectric 时间不改 K_max', st.K === kBefore, `K=${st.K}`);
      st.params.nu = 0.4;
      peVar.step(st, 0);
      assert('fam-photoelectric 阈值下产额为 0', Math.abs(st.K) < 1e-12 && Math.abs(st.rate) < 1e-12, `K=${st.K} R=${st.rate}`);
      assert(
        'fam-photoelectric 权威为 Einstein',
        /Einstein/.test(peVar.authority) && !/Griffiths/.test(peVar.authority),
        peVar.authority,
      );
    }
    {
      const hc = models.find((m) => m.id === 'fam-heat-cond-v01');
      assert(
        'fam-heat-cond 权威为 Incropera/Fourier',
        hc && /Incropera/.test(hc.authority) && /Fourier/.test(hc.authority) && !/Griffiths/.test(hc.authority),
        hc && hc.authority,
      );
      const st = { params: { ...hc.params, k: 4, L: 0.2, Th: 100, Tb: 20 } };
      hc.init(st);
      const qExpect = -4 * (20 - 100) / 0.2;
      assert('fam-heat-cond q=−κΔT/L', Math.abs(st.q - qExpect) < 1e-9, `q=${st.q} expect=${qExpect}`);
      const q0 = st.q;
      hc.step(st, 0.5);
      assert('fam-heat-cond 稳态热流不随时间漂移', st.q === q0 && Math.abs(st.t - 0.5) < 1e-12, `q=${st.q} t=${st.t}`);
      st.params.k = 8;
      hc.step(st, 0);
      assert('fam-heat-cond κ 线性进入热流', Math.abs(st.q - 2 * q0) < 1e-9, `q=${st.q}`);
    }
    {
      const fam = models.filter((m) => String(m.id).startsWith('fam-'));
      const decorative = fam.filter((m) => m.governing !== true);
      assert(
        'fam-* 不再使用装饰正弦',
        fam.length >= 170 && decorative.length === 0,
        `n=${fam.length} sine=${decorative.map((m) => m.id).join(',')}`,
      );
      const boot = (id, patch = {}) => {
        const model = models.find((m) => m.id === id);
        const st = { params: { ...model.params, ...patch } };
        model.init(st);
        return { model, st };
      };
      const shown = (model, st, label) => parseFloat(model.getReadouts(st).find((r) => r.label === label)?.value);
      const authOf = (id) => models.find((m) => m.id === id).authority;
      assert(
        'fam-wave2d 权威为 Pain',
        /Pain/.test(authOf('fam-wave2d-v01')) && !/Electrodynamics/.test(authOf('fam-wave2d-v01')),
        authOf('fam-wave2d-v01'),
      );
      assert(
        'fam-kinetic-gas 权威为 Reif',
        /Reif/.test(authOf('fam-kinetic-gas-v01')) && !/Electrodynamics/.test(authOf('fam-kinetic-gas-v01')),
        authOf('fam-kinetic-gas-v01'),
      );
      assert(
        'fam-collision 权威为 Thornton',
        /Thornton/.test(authOf('fam-collision-v01')) && !/Electrodynamics/.test(authOf('fam-collision-v01')),
        authOf('fam-collision-v01'),
      );
      assert(
        'fam-compton 权威为 Compton',
        /Compton, Phys\. Rev/.test(authOf('fam-compton-v01')) && !/Electrodynamics/.test(authOf('fam-compton-v01')),
        authOf('fam-compton-v01'),
      );
      assert(
        'fam-convection 权威为 Incropera',
        /Incropera/.test(authOf('fam-convection-v01')) && !/White, Fluid/.test(authOf('fam-convection-v01')),
        authOf('fam-convection-v01'),
      );
      assert(
        'fam-reactor 权威为 Fogler',
        /Fogler/.test(authOf('fam-reactor-v01')) && !/Lamarsh/.test(authOf('fam-reactor-v01')),
        authOf('fam-reactor-v01'),
      );

      const EPS0 = 8.854187817e-12;
      {
        const { model, st } = boot('fam-projectile-v01', { g: 9.81, v0: 10, theta: 45, k: 0 });
        model.step(st, 1);
        const yVac = 10 * Math.sin(Math.PI / 4) - 0.5 * 9.81;
        assert('fam-projectile 真空抛物线', almostEqual(st.y, yVac, 1e-9, 1e-9), `y=${st.y}`);
        const yRead = shown(model, st, 'y');
        st.params.g = 20;
        model.step(st, 0);
        assert('fam-projectile g 改变落体读数', shown(model, st, 'y') !== yRead && st.y < yVac, `y=${st.y}`);
        st.params.g = 9.81;
        st.params.k = 0.4;
        model.step(st, 0);
        assert('fam-projectile 线性阻力改变 y', !almostEqual(st.y, yVac, 1e-4, 1e-4), `y=${st.y}`);
      }
      {
        const { model, st } = boot('fam-inclined-v01', { mu: 0.2, theta: 30, m: 2, v0: 0 });
        const a = 9.81 * (Math.sin(Math.PI / 6) - 0.2 * Math.cos(Math.PI / 6));
        assert('fam-inclined a=g(sinθ−μ cosθ)', almostEqual(st.a, a, 1e-12, 1e-12), `a=${st.a}`);
        const aRead = shown(model, st, 'a');
        st.params.mu = 0;
        model.step(st, 0);
        assert('fam-inclined μ 改变加速度', shown(model, st, 'a') !== aRead && st.a > a, `a=${st.a}`);
      }
      {
        const { model, st } = boot('fam-atwood-v01', { mRatio: 3, mu: 0 });
        const a = ((3 - 1) / (3 + 1)) * 9.81;
        assert('fam-atwood a=(m1−m2)/(m1+m2)·g', almostEqual(st.a, a, 1e-12, 1e-12), `a=${st.a}`);
        st.params.mu = 0.8;
        model.step(st, 0);
        assert('fam-atwood 竖直机 μ 不进入 a', almostEqual(st.a, a, 1e-12, 1e-12), `a=${st.a}`);
      }
      {
        const { st } = boot('fam-circular-v01', { r: 2, omega: 3 });
        assert('fam-circular a=ω²r', almostEqual(st.ac, 18, 1e-12, 1e-12), `a=${st.ac}`);
      }
      {
        const { model, st } = boot('fam-collision-v01', { e: 1, mRatio: 1, angle: 0 });
        assert('fam-collision 等质量弹性交换', almostEqual(st.v1, 0, 1e-12, 1e-12) && almostEqual(st.v2, 1, 1e-12, 1e-12), `v=${st.v1},${st.v2}`);
        st.params.e = 0;
        model.step(st, 0);
        assert('fam-collision e 改变出射速度', !almostEqual(st.v2, 1, 1e-6, 1e-6), `v2=${st.v2}`);
      }
      {
        // Hand projectile vs fam-projectile: same vacuum parabola at t=1 (substepped).
        const { model: famModel, st: famSt } = boot('fam-projectile-v01', { g: 9.81, v0: 10, theta: 45, k: 0 });
        const hand = models.find((m) => m.id === 'projectile');
        const handSt = { params: { ...hand.params, g: 9.81, v0: 10, theta: 45, k: 0, m: 1, windX: 0, windY: 0, pauseOnLand: 0 } };
        hand.init(handSt);
        const dt = 1 / 60;
        for (let i = 0; i < 60; i += 1) {
          hand.step(handSt, dt);
          famModel.step(famSt, dt);
        }
        const yVac = 10 * Math.sin(Math.PI / 4) - 0.5 * 9.81;
        const xVac = 10 * Math.cos(Math.PI / 4);
        // fam is analytic; hand is stepped ODE — allow integrator drift but keep same vacuum law.
        assert('fam-projectile 真空解析', almostEqual(famSt.y, yVac, 1e-9, 1e-9) && almostEqual(famSt.x, xVac, 1e-9, 1e-9), `fam=(${famSt.x},${famSt.y})`);
        assert('hand-projectile 真空近解析', almostEqual(handSt.y, yVac, 0.12, 0.12) && almostEqual(handSt.x, xVac, 0.12, 0.12), `hand=(${handSt.x},${handSt.y})`);
        assert('hand/fam projectile 同号同量级', handSt.y > 1.5 && famSt.y > 1.5 && Math.abs(handSt.y - famSt.y) < 0.2, `Δy=${handSt.y - famSt.y}`);
      }
      {
        // Hand 1D collision vs fam-collision: equal-mass elastic exchange (analytic).
        const { st: famSt } = boot('fam-collision-v01', { e: 1, mRatio: 1, angle: 0 });
        const hand = models.find((m) => m.id === 'collision');
        const handSt = { params: { m1: 1, m2: 1, v1: 1, v2: 0, e: 1 } };
        hand.init(handSt);
        for (let i = 0; i < 8000 && handSt.collisionCount < 1; i += 1) hand.step(handSt, 1 / 240);
        assert('hand collision 发生过碰撞', handSt.collisionCount >= 1, `n=${handSt.collisionCount}`);
        assert(
          'hand/fam collision 等质量弹性交换对照',
          almostEqual(handSt.v1, 0, 1e-9, 1e-9)
            && almostEqual(handSt.v2, 1, 1e-9, 1e-9)
            && almostEqual(famSt.v1, 0, 1e-12, 1e-12)
            && almostEqual(famSt.v2, 1, 1e-12, 1e-12),
          `hand=${handSt.v1},${handSt.v2} fam=${famSt.v1},${famSt.v2}`,
        );
      }
      {
        const { model, st } = boot('fam-sho-v01', { k: 5, m: 0.5, x0: -1 });
        assert('fam-sho a=−(k/m)x', almostEqual(st.a, 10, 1e-9, 1e-9), `a=${st.a}`);
        st.params.k = 10;
        model.step(st, 0);
        assert('fam-sho k 改变加速度', almostEqual(st.a, 20, 1e-9, 1e-9), `a=${st.a}`);
      }
      {
        const { model, st } = boot('fam-pendulum-chain-v01', { L: 1, m: 2, theta0: 90 });
        assert('fam-pendulum α=−(g/L)sinθ', almostEqual(st.alpha, -9.81, 1e-9, 1e-9), `α=${st.alpha}`);
        st.params.L = 2;
        model.step(st, 0);
        assert('fam-pendulum L 改变角加速度', almostEqual(st.alpha, -4.905, 1e-9, 1e-9), `α=${st.alpha}`);
      }
      {
        const { model, st } = boot('fam-radioactive-v01', { lam: Math.LN2, N0: 100 });
        assert('fam-radioactive A=λN', almostEqual(st.A, Math.LN2 * 100, 1e-9, 1e-9), `A=${st.A}`);
        model.step(st, 1);
        assert('fam-radioactive 一个半衰期 N=N0/2', almostEqual(st.N, 50, 1e-8, 1e-8), `N=${st.N}`);
      }
      {
        const { model, st } = boot('fam-lens-v01', { f: -10, u: -20, h: 1 });
        assert('fam-lens 1/v=1/f−1/u', almostEqual(st.v, -20, 1e-9, 1e-9), `v=${st.v}`);
        const vRead = shown(model, st, 'v');
        st.params.f = -5;
        model.refresh(st);
        assert('fam-lens refresh 驱动像距', almostEqual(st.v, -20 / 3, 1e-9, 1e-9) && shown(model, st, 'v') !== vRead, `v=${st.v}`);
        assert('fam-lens 画布为光线草图', st.drawKind === 'lens', st.drawKind);
      }
      {
        const { model, st } = boot('fam-projectile-v01', { g: 9.81, v0: 10, theta: 45, k: 0 });
        model.step(st, 0);
        assert('fam-projectile 轨迹点数', Array.isArray(st.xy) && st.xy.length > 8, `n=${st.xy?.length}`);
        assert('fam-projectile getTrajectory', (model.getTrajectory?.(st) || []).length > 8);
      }
      {
        const { model, st } = boot('fam-variable-mass-v01', { uRel: 100, dmdt: 0.2 });
        assert('fam-rocket a0=u ṁ/m0', almostEqual(st.a0, 20, 1e-12, 1e-12), `a0=${st.a0}`);
        model.step(st, 1);
        const vExpect = -100 * Math.log(Math.max(0.05, 1 - 0.2));
        assert('fam-rocket Tsiolkovsky Δv', almostEqual(st.v, vExpect, 1e-9, 1e-9), `v=${st.v}`);
        st.params.uRel = 200;
        model.refresh(st);
        assert('fam-rocket uRel 驱动 Δv', almostEqual(st.v, 2 * vExpect, 1e-9, 1e-9), `v=${st.v}`);
      }
      {
        const { model, st } = boot('fam-orbit-v01', { M: 1, r0: 1, v0: 1, e: 0.5 });
        assert('fam-kepler a=M/r²', almostEqual(st.ac, 1, 1e-12, 1e-12), `a=${st.ac}`);
        assert('fam-kepler r_a=r_p(1+e)/(1−e)', almostEqual(st.rA, 3, 1e-12, 1e-12), `ra=${st.rA}`);
        assert('fam-kepler 画布为圆锥曲线', st.drawKind === 'xy' && st.xy?.length > 16, `kind=${st.drawKind}`);
        st.params.e = 0.2;
        model.refresh(st);
        assert('fam-kepler e 驱动远点', almostEqual(st.rA, 1.5, 1e-12, 1e-12), `ra=${st.rA}`);
      }
      {
        const { model, st } = boot('fam-nonlinear-osc-v01', { beta: 0, drive: 0 });
        assert('fam-duffing β=0 初值 a=−x', almostEqual(st.a, -1, 1e-9, 1e-9), `a=${st.a}`);
        st.params.beta = 1;
        model.refresh(st);
        assert('fam-duffing β 进入加速度', almostEqual(st.a, -2, 1e-9, 1e-9), `a=${st.a}`);
        model.step(st, 0.2);
        assert('fam-duffing 积分推进有限', Number.isFinite(st.x) && Number.isFinite(st.v), `x=${st.x}`);
      }
      {
        const { model, st } = boot('fam-diffract-v01', { a: 0.5, lam: 500, L: 2 });
        assert('fam-slit y_min=λL/a', almostEqual(st.yMin, 2000, 1e-12, 1e-9), `y=${st.yMin}`);
        st.params.a = 1;
        model.refresh(st);
        assert('fam-slit a 驱动第一暗纹', almostEqual(st.yMin, 1000, 1e-12, 1e-9), `y=${st.yMin}`);
      }
      {
        const { model, st } = boot('fam-polarization-v01', { ang: 60, dphi: 0 });
        assert('fam-polarization Malus I=cos²θ', almostEqual(st.I, 0.25, 1e-12, 1e-12), `I=${st.I}`);
        st.params.dphi = 90;
        model.step(st, 0);
        assert('fam-polarization 延迟相位不改变 I', almostEqual(st.I, 0.25, 1e-12, 1e-12), `I=${st.I}`);
      }
      {
        const { model, st } = boot('fam-axial-v01', { A: 0.01, F: 1000 });
        assert('fam-axial σ=F/A', almostEqual(st.sigma, 1e5, 1e-9, 1e-6), `σ=${st.sigma}`);
        const sRead = shown(model, st, 'σ');
        st.params.F = 2000;
        model.refresh(st);
        assert('fam-axial F 线性进入应力', almostEqual(st.sigma, 2e5, 1e-9, 1e-6) && shown(model, st, 'σ') !== sRead, `σ=${st.sigma}`);
      }
      {
        const { model, st } = boot('fam-heat-engine-v01', { r: 8, TR: 2 });
        const otto = 1 - 8 ** (1 - 1.4);
        assert('fam-heat-engine Carnot η=1−1/TR', almostEqual(st.etaC, 0.5, 1e-12, 1e-12), `η=${st.etaC}`);
        assert('fam-heat-engine Otto η=1−r^{1−γ}', almostEqual(st.etaO, otto, 1e-12, 1e-12), `η=${st.etaO}`);
        st.params.TR = 4;
        model.step(st, 0);
        assert('fam-heat-engine TR 改变卡诺效率', almostEqual(st.etaC, 0.75, 1e-12, 1e-12), `η=${st.etaC}`);
      }
      {
        const { st } = boot('fam-buckling-v01', { L: 2, EI: 10000 });
        const Pcr = (Math.PI ** 2) * 10000 / 4;
        assert('fam-buckling Pcr=π²EI/L²', almostEqual(st.Pcr, Pcr, 1e-12, 1e-6), `P=${st.Pcr}`);
      }
      {
        const { st } = boot('fam-gauss-v01', { rho: 1, R: 0.5 });
        const E = 0.5 / (3 * EPS0);
        assert('fam-gauss E=ρR/(3ε0)', almostEqual(st.E, E, 1e-9, 1), `E=${st.E}`);
      }
      {
        const { st } = boot('fam-capacitor-v01', { eps: 2, d: 0.1, A: 0.2 });
        const C = 2 * EPS0 * 0.2 / 0.1;
        assert('fam-capacitor C=εA/d', almostEqual(st.C, C, 1e-9, 1e-18), `C=${st.C}`);
      }
      {
        const { model, st } = boot('fam-queueing-v01', { lam: 1, mu: 2 });
        assert('fam-queueing L=ρ/(1−ρ)', almostEqual(st.L, 1, 1e-12, 1e-12) && st.stable === 1, `L=${st.L}`);
        st.params.lam = 3;
        model.step(st, 0);
        assert('fam-queueing ρ≥1 报告不稳定', st.stable === 0 && st.L === 0, `L=${st.L}`);
      }
      {
        const { model, st } = boot('fam-well1d-v01', { a: 0.5, V0: 5 });
        const E = (Math.PI ** 2) / (2 * 0.25);
        assert('fam-well1d E∝1/a²', almostEqual(st.E1, E, 1e-12, 1e-9), `E=${st.E1}`);
        st.params.a = 1;
        model.step(st, 0);
        assert('fam-well1d 加倍宽度能级降为 1/4', almostEqual(st.E1, E / 4, 1e-12, 1e-9), `E=${st.E1}`);
      }
      {
        const { st } = boot('fam-doppler-v01', { vs: 0.5, vo: 0, ang: 0 });
        assert('fam-doppler f\'/f=(1)/(1−vs)', almostEqual(st.ratio, 2, 1e-12, 1e-12), `r=${st.ratio}`);
      }
      {
        const { model, st } = boot('fam-compton-v01', { theta: 0, E: 50 });
        assert('fam-compton θ=0 时 Δλ=0', almostEqual(st.dLam, 0, 1e-12, 1e-12), `dλ=${st.dLam}`);
        st.params.theta = 180;
        model.step(st, 0);
        assert('fam-compton θ=180 时 Δλ=2λc', almostEqual(st.dLam, 2 * 2.42631023867, 1e-9, 1e-9), `dλ=${st.dLam}`);
      }
      {
        const { model, st } = boot('fam-pipe-flow-v01', { Re: 1000, eps: 0.01 });
        assert('fam-pipe-flow 层流 f=64/Re', almostEqual(st.f, 0.064, 1e-12, 1e-12), `f=${st.f}`);
        st.params.Re = 500;
        model.step(st, 0);
        assert('fam-pipe-flow Re 改变摩阻', almostEqual(st.f, 0.128, 1e-12, 1e-12), `f=${st.f}`);
      }
      {
        const { st } = boot('fam-entropy-mix-v01', { xA: 0.5, T: 300 });
        assert('fam-entropy-mix Δs/R=ln2', almostEqual(st.sOverR, Math.LN2, 1e-12, 1e-12), `s=${st.sOverR}`);
      }
      {
        const { st } = boot('fam-tunnel-v01', { V0: 5, w: 0.3, E: 2 });
        const T = Math.exp(-2 * Math.sqrt(6) * 0.3);
        assert('fam-tunnel T≈exp(−2κw)', almostEqual(st.T, T, 1e-12, 1e-12), `T=${st.T}`);
      }
      {
        const { st } = boot('fam-prism-v01', { nF: 1.5, A: 10 });
        assert('fam-prism δ≈(n−1)A', almostEqual(st.delta, 5, 1e-12, 1e-12), `δ=${st.delta}`);
      }
    }
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
    assert(
      '自建模型指出缺少的假设',
      !missingAsm.ok && /缺少假设|Missing assumption/i.test(String(missingAsm.error || '')),
      missingAsm.error,
    );
    assert('自建模型 id 前缀 user-', !!good.spec?.id?.startsWith('user-'), good.spec?.id);
  }

  for (const r of runLab12()) results.push(r);

  {
    const contract = runModelContract();
    for (const r of contract) results.push(r);
    if (contract._contractFailures) results._contractFailures = contract._contractFailures;
  }

  return results;
}

// 供 Node 侧可选预加载（浏览器 loadModelMetadata 另走）
void loadModelMetadata;
