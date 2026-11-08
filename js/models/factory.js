/**
 * Catalog factory：为非手写模型生成可运行的教学可视化。
 * 手写模型（family=hand）不走此路径。
 */
import { formatNum, drawArrow } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C, heatTempColor } from '../utils/theme.js';
import { localizeSchema } from '../utils/zhLabels.js';
import { familyCapabilities } from '../lab/formalism.js';
import { applyLowInkStrokeBoost } from '../lab/lowInkIds.js';
import { forceGraphStep, mapNormToScreen, paintGraph } from '../utils/graphLayout.js';
import { buildTopicModel } from '../lab/topicModel.js';
import { buildFamPhysics, warnDecorativeSine } from './famPhysics.js';
import {
  createRingTrail,
  ensureRingCap,
  mobileBudget,
  particleHashCell,
  perfClassFor,
  pushTrail,
  ringForEach,
  ringLast,
  ringPush,
} from '../utils/mobilePerf.js';

function schemaNum(label, group, unit, min, max) {
  return { label, group, unit, min, max };
}

function baseMeta(spec) {
  return {
    id: spec.id,
    name: spec.name,
    tags: [spec.domain, spec.sub].filter(Boolean),
    formula: spec.formula || '',
    description: spec.description || '',
    sub: spec.sub || '',
    perfClass: perfClassFor(spec.id),
  };
}

function rnd(seed) {
  let s = (Math.floor(seed) % 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Reserved top band so canvas titles sit above the plot, not in it. */
const TITLE_BAND = 46;

function title(ctx, text, x = 14, y = 26) {
  ctx.fillStyle = C.muted;
  ctx.font = '600 13px IBM Plex Mono, monospace';
  ctx.fillText(text, x, y);
}

function padBox(W, H, m = 36) {
  const top = Math.max(m, TITLE_BAND);
  return { l: m, r: W - m, t: top, b: H - m, w: W - 2 * m, h: H - top - m };
}

function enrich(model, spec) {
  if (model.paramSchema) model.paramSchema = localizeSchema(model.paramSchema);
  const fam = spec.family || 'gauge';
  const caps = familyCapabilities(fam, spec);
  const topicBound = !!model.topicBound;
  model.capabilities = { ...caps, ...(model.capabilities || {}) };
  model.formalism = model.capabilities.formalism || caps.formalism;
  model.fidelity = topicBound
    ? (model.fidelity || spec.fidelity || 'principle')
    : (spec.fidelity || model.fidelity || 'principle');
  model.capabilities.fidelity = model.fidelity;
  if (topicBound) {
    model.authority = model.authority || spec.authority || '';
    model.assumptions = model.assumptions || spec.assumptions || '';
  } else {
    model.authority = spec.authority || model.authority || '';
    model.assumptions = spec.assumptions || model.assumptions || '';
  }
  if (typeof model.getEnergy !== 'function') {
    model.getEnergy = (state) => {
      if (Number.isFinite(state?.energy)) return { kinetic: state.energy, potential: 0 };
      if (Number.isFinite(state?.loss)) return { kinetic: 0, potential: state.loss };
      if (Array.isArray(state?.parts)) {
        const ke = state.parts.reduce((s, p) => s + 0.5 * (p.vx * p.vx + p.vy * p.vy), 0);
        return { kinetic: ke, potential: 0 };
      }
      if (Number.isFinite(state?.v) && Number.isFinite(state?.y)) {
        const m = P(state.params, 'm', 1);
        const g = P(state.params, 'g', 9.81);
        return { kinetic: 0.5 * m * state.v * state.v, potential: m * g * state.y };
      }
      if (Number.isFinite(state?.x) && Number.isFinite(state?.v)) {
        const m = P(state.params, 'm', 1);
        const k = P(state.params, 'k', 1);
        return { kinetic: 0.5 * m * state.v * state.v, potential: 0.5 * k * state.x * state.x };
      }
      return { kinetic: 0, potential: 0 };
    };
  }
  if (typeof model.getEnergyAt !== 'function') {
    model.getEnergyAt = (state, row) => {
      if (!row || typeof row !== 'object') return model.getEnergy(state);
      const probe = { params: state.params };
      for (const [k, v] of Object.entries(state)) {
        if (k === 'params' || k === 'trail' || k === 'trails' || k.startsWith('_')) continue;
        probe[k] = v;
      }
      for (const [k, v] of Object.entries(row)) {
        if (k.startsWith('E_') || k === 'note' || k === 'kind') continue;
        if (typeof v === 'number' && Number.isFinite(v)) probe[k] = v;
      }
      // 无 y/v 时用 hist/wave 索引近似
      if (!Number.isFinite(probe.y) && Number.isFinite(row.v) && Array.isArray(state?.wave)) {
        probe.energy = Number(row.v) ** 2;
      }
      if (!Number.isFinite(probe.y) && Number.isFinite(row.emf)) {
        probe.energy = 0.5 * Number(row.emf) ** 2;
      }
      return model.getEnergy(probe);
    };
  }
  if (typeof model.getTrajectory !== 'function') {
    model.getTrajectory = (state) => {
      if (Array.isArray(state?.trail)) return state.trail;
      if (Array.isArray(state?.hist)) return state.hist.map((v, i) => ({ i, v: typeof v === 'number' ? v : v }));
      if (Array.isArray(state?.wave)) return state.wave.map((v, i) => ({ i, v }));
      return [{ t: state?.t || 0, note: spec.id }];
    };
  }
  const step0 = model.step?.bind(model);
  const recompute = model.recompute?.bind(model);
  model.refresh = (state) => {
    if (recompute) recompute(state);
    else if (step0) step0(state, 0);
  };
  // 稀疏绘制保底像素；仅 low-ink 静态表内 id 加粗主曲线
  if (typeof model.draw === 'function') {
    if (!model.id) model.id = spec.id;
    applyLowInkStrokeBoost(model);
    const draw0 = model.draw.bind(model);
    model.draw = (ctx, state, view) => {
      draw0(ctx, state, view);
      const W = view?.width || 0;
      const H = view?.height || 0;
      if (W > 20 && H > 20) {
        ctx.fillStyle = C.muted || '#666';
        ctx.fillRect(2, 2, 8, 8);
        ctx.fillRect(W - 10, 2, 8, 8);
        ctx.fillRect(2, H - 10, 8, 8);
        ctx.fillRect(W - 10, H - 10, 8, 8);
      }
    };
  }
  return model;
}

/** @param {object} spec catalog entry */
export function createFactoryModel(spec) {
  // Prefer textbook topic engines (overrides + PREFIX) over generic family demos.
  if (!(spec.dims || spec.generated)) {
    const topic = buildTopicModel(spec);
    if (topic) return enrich(topic, spec);
  }
  const family = spec.family || 'gauge';
  const builders = {
    ode1d: buildOde1d,
    ode2d: buildOde2d,
    circular: buildCircular,
    particles: buildParticles,
    nbody: buildNbody,
    euler: buildEuler,
    buoyancy: buildBuoyancy,
    flow: buildFlow,
    wave1d: buildWave1d,
    doppler: buildDoppler,
    interference: buildInterference,
    field2d: buildField2d,
    piston: buildPiston,
    cycle: buildCycle,
    fieldlines: buildFieldlines,
    circuit: buildCircuit,
    induction: buildInduction,
    rays: buildRays,
    gauge: buildGauge,
    variant: buildVariant,
    bohr: buildBohr,
    decay: buildDecay,
    discrete: buildDiscrete,
    graph: buildGraph,
    tree: buildTree,
    fsm: buildFsm,
    turing: buildTuring,
    crypto: buildCrypto,
    ml: buildMl,
    opt: buildOpt,
    logic: buildLogic,
    arch: buildArch,
    embed: buildEmbed,
    comm: buildComm,
    net: buildNet,
    os: buildOs,
    compile: buildCompile,
    dist: buildDist,
    struct: buildStruct,
    control: buildControl,
    chaos: buildChaos,
    traffic: buildTraffic,
    reactor: buildReactor,
    aero: buildAero,
  };
  // 族×维度生成条目：用薄 variant 读 dims/defaults，capabilities 仍按映射 family
  if (spec.dims || spec.generated) {
    return enrich(buildVariant(spec), spec);
  }
  const build = builders[family] || buildGauge;
  return enrich(build(spec), spec);
}

function variantKnobs(spec) {
  const dimList = Array.isArray(spec.dims) ? spec.dims : [];
  const defaults = spec.defaults && typeof spec.defaults === 'object' ? spec.defaults : {};
  const params = { ...defaults };
  const paramSchema = {};
  for (const d of dimList) {
    if (!d?.key) continue;
    if (params[d.key] === undefined) params[d.key] = d.value ?? d.min ?? 1;
    paramSchema[d.key] = schemaNum(
      d.label || d.key,
      'dynamics',
      d.unit || '—',
      Number.isFinite(d.min) ? d.min : 0,
      Number.isFinite(d.max) ? d.max : 100,
    );
  }
  return { params, paramSchema };
}

function isPhotoelectricSpec(spec) {
  const id = String(spec?.id || '');
  const of = String(spec?.variantOf || '');
  return id === 'photoelectric'
    || of === 'photoelectric'
    || /^fam-photoelectric/i.test(id)
    || /photoelectric/i.test(id)
    || /photoelectric/i.test(of);
}

function isHeatConductionSpec(spec) {
  const id = String(spec?.id || '');
  const of = String(spec?.variantOf || '');
  const formula = String(spec?.formula || '');
  return id === 'heat'
    || of === 'heat'
    || of === 'heat-cond'
    || of === 'cond-eng'
    || /^fam-heat-cond/i.test(id)
    || /^fam-cond-eng/i.test(id)
    || /conduction/i.test(id)
    || /conduction/i.test(of)
    || formula === '傅里叶律'
    || formula === '多层壁';
}

/**
 * Einstein photoelectric equation (1905). Halliday: K_max does not scale with intensity.
 * K_max = max(0, h ν − W). Catalog ν and W share one energy unit, so h defaults to 1
 * (ν is already an energy, matching the eV form K_max = max(0, hf − W)).
 * Relative yield R = I above threshold and 0 below. Intensity does not enter K_max.
 */
function buildPhotoelectricVariant(spec) {
  const { params, paramSchema } = variantKnobs(spec);
  if (params.nu === undefined && params.freq === undefined && params.hf === undefined) {
    params.nu = 3;
    paramSchema.nu = schemaNum('ν', 'dynamics', 'eV', 0, 12);
  }
  if (params.W === undefined && params.workFunc === undefined) {
    params.W = 2;
    paramSchema.W = schemaNum('W', 'dynamics', 'eV', 0, 10);
  }
  if (params.I === undefined && params.intensity === undefined) {
    params.I = 1;
    paramSchema.I = schemaNum('I', 'dynamics', '—', 0, 10);
  }
  if (paramSchema.nu) paramSchema.nu = { ...paramSchema.nu, unit: paramSchema.nu.unit === '—' ? 'eV' : paramSchema.nu.unit };
  if (paramSchema.W) paramSchema.W = { ...paramSchema.W, unit: paramSchema.W.unit === '—' ? 'eV' : paramSchema.W.unit };
  params.h = params.h ?? 1;
  paramSchema.h = schemaNum('h', 'dynamics', '—', 0, 10);

  const photonEnergy = (p) => {
    if (p.hf !== undefined && p.nu === undefined && p.freq === undefined) return P(p, 'hf', 0);
    const h = P(p, 'h', 1);
    const nu = p.nu !== undefined ? P(p, 'nu', 0) : p.freq !== undefined ? P(p, 'freq', 0) : P(p, 'hf', 0);
    return h * nu;
  };

  return {
    ...baseMeta(spec),
    equation: 'K_max = max(0, hν − W); R ∝ I only if K_max>0',
    authority: 'Einstein photoelectric equation (1905); Halliday (K_max independent of intensity; yield ∝ I above threshold)',
    assumptions: 'hν and W share one energy unit (h=1 when the frequency knob is already an energy); no space charge; R is a relative yield',
    governing: true,
    params,
    paramSchema,
    init(state) {
      state.t = 0;
      state.hist = [];
      this.step(state, 0);
      state.hist.length = 0;
      state.t = 0;
    },
    step(state, dt) {
      const p = state.params || {};
      const hf = photonEnergy(p);
      const W = p.W !== undefined ? P(p, 'W', 0) : P(p, 'workFunc', 0);
      const I = Math.max(0, p.I !== undefined ? P(p, 'I', 0) : P(p, 'intensity', 0));
      const K = Math.max(0, hf - W);
      state.hf = hf;
      state.W = W;
      state.K = K;
      state.val = K;
      state.rate = K > 0 ? I : 0;
      const frame = Number(dt);
      if (frame > 0) state.t += frame;
      if (!state.hist) state.hist = [];
      state.hist.push(K);
      if (state.hist.length > 160) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H, 40);
      title(ctx, spec.name);
      const mid = box.t + box.h * 0.62;
      const span = Math.max(state.hf, state.W, 0.5);
      const xOf = (e) => box.l + (Math.max(0, e) / span) * box.w;
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(box.l, mid);
      ctx.lineTo(box.r, mid);
      ctx.stroke();
      ctx.strokeStyle = C.muted;
      ctx.beginPath();
      ctx.moveTo(xOf(state.W), mid - 28);
      ctx.lineTo(xOf(state.W), mid + 18);
      ctx.stroke();
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      ctx.moveTo(xOf(state.hf), mid - 46);
      ctx.lineTo(xOf(state.hf), mid + 10);
      ctx.stroke();
      const kW = Math.max(0, xOf(state.hf) - xOf(state.W));
      ctx.fillStyle = C.accent;
      ctx.fillRect(xOf(state.W), mid - 16, kW, 10);
      const yieldH = Math.min(box.h * 0.28, state.rate * 14);
      ctx.fillStyle = C.vector || C.body;
      ctx.fillRect(box.l, box.b - yieldH, 18, yieldH);
      ctx.fillStyle = C.muted;
      ctx.font = '11px IBM Plex Mono, monospace';
      ctx.fillText('W', xOf(state.W) + 4, mid + 32);
      ctx.fillText('hν', xOf(state.hf) + 4, mid - 52);
      ctx.fillStyle = C.accent;
      ctx.font = '13px IBM Plex Mono, monospace';
      ctx.fillText(`K_max=${formatNum(state.K, 3)}`, box.l, box.t + 18);
      ctx.fillText(`R=${formatNum(state.rate, 3)}`, box.l + 28, box.b - 4);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 'K_max', value: `${formatNum(state.K, d)} eV` },
        { label: 'R', value: formatNum(state.rate, d) },
        { label: 'hν', value: `${formatNum(state.hf, d)} eV` },
        { label: 'W', value: `${formatNum(state.W, d)} eV` },
      ];
    },
    getEnergy(state) {
      return { kinetic: state.K || 0, potential: 0 };
    },
    getTrajectory(state) {
      return (state.hist || []).map((v, i) => ({ i, K: v }));
    },
  };
}

/**
 * Steady plane-wall conduction. Fourier's law (Incropera, Fundamentals of
 * Heat and Mass Transfer, Ch. 2): q_x = −κ (T(L) − T(0)) / L.
 * Constant κ, no generation. The straight T(x) is the exact steady solution
 * of d²T/dx² = 0. This is not an electrodynamics solve.
 * κ ← k. L ← thk when the catalog gives a wall thickness, otherwise L.
 */
function buildHeatConductionVariant(spec) {
  const { params, paramSchema } = variantKnobs(spec);
  if (params.k === undefined) params.k = 1;
  const kPrev = paramSchema.k;
  paramSchema.k = schemaNum('κ', 'dynamics', 'W/(m·K)', kPrev?.min ?? 0.02, kPrev?.max ?? 400);
  if (params.thk === undefined) {
    params.L = params.L ?? 0.1;
    paramSchema.L = schemaNum('L', 'dynamics', 'm', 0.001, 5);
  } else if (paramSchema.thk) {
    paramSchema.thk = { ...paramSchema.thk, label: paramSchema.thk.label || 'L', unit: 'm' };
  }
  params.Th = params.Th ?? params.T0 ?? 100;
  paramSchema.Th = schemaNum('T(0)', 'dynamics', '°C', -50, 800);
  if (params.Tb === undefined && params.Tc === undefined) params.Tb = 0;
  if (!paramSchema.Tb && params.Tc === undefined) {
    paramSchema.Tb = schemaNum('T(L)', 'dynamics', '°C', -50, 800);
  } else if (paramSchema.Tb) {
    paramSchema.Tb = { ...paramSchema.Tb, label: 'T(L)' };
  }

  const wallLength = (p) => (
    p.thk !== undefined
      ? Math.max(P(p, 'thk', 0.01), 1e-9)
      : Math.max(P(p, 'L', 0.1), 1e-9)
  );

  return {
    ...baseMeta(spec),
    equation: 'q = −κ (T(L) − T(0)) / L',
    authority: 'Incropera, Fundamentals of Heat and Mass Transfer, Fourier law q=−κ ΔT/L (plane wall)',
    assumptions: 'Steady plane wall, constant κ, no generation; ΔT = T(L)−T(0). Single layer when only one thickness is set.',
    governing: true,
    params,
    paramSchema,
    init(state) {
      state.t = 0;
      state.hist = [];
      this.step(state, 0);
      state.hist.length = 0;
      state.t = 0;
    },
    step(state, dt) {
      const p = state.params || {};
      const kappa = P(p, 'k', P(p, 'kappa', 1));
      const L = wallLength(p);
      const T0 = P(p, 'Th', P(p, 'T0', 100));
      const TL = p.Tc !== undefined ? P(p, 'Tc', 0) : P(p, 'Tb', 0);
      const dT = TL - T0;
      state.kappa = kappa;
      state.Lwall = L;
      state.T0 = T0;
      state.TL = TL;
      state.dT = dT;
      state.q = -kappa * dT / L;
      state.val = state.q;
      const frame = Number(dt);
      if (frame > 0) state.t += frame;
      if (!state.hist) state.hist = [];
      state.hist.push(state.q);
      if (state.hist.length > 160) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H, 36);
      title(ctx, spec.name);
      const plotTop = box.t + 28;
      const plotH = Math.max(20, box.h - 56);
      const tLo = Math.min(state.T0, state.TL);
      const tHi = Math.max(state.T0, state.TL);
      const yOf = (temp) => plotTop + (1 - (temp - tLo) / Math.max(1e-9, tHi - tLo)) * plotH;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l, plotTop, box.w, plotH);
      ctx.lineWidth = 2;
      ctx.beginPath();
      const n = 48;
      for (let i = 0; i < n; i += 1) {
        const u = i / (n - 1);
        const temp = state.T0 + state.dT * u;
        const x = box.l + u * box.w;
        const y = yOf(temp);
        ctx.strokeStyle = heatTempColor(temp, tLo, tHi);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, plotTop + plotH);
        ctx.stroke();
      }
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      ctx.moveTo(box.l, yOf(state.T0));
      ctx.lineTo(box.r, yOf(state.TL));
      ctx.stroke();
      ctx.lineWidth = 1;
      const dir = state.q >= 0 ? 1 : -1;
      const mag = Math.min(box.w * 0.35, 28 + 18 * Math.log10(1 + Math.abs(state.q)));
      const yA = plotTop + plotH * 0.5;
      const x0 = box.l + box.w * 0.5 - dir * mag * 0.5;
      drawArrow(ctx, x0, yA, x0 + dir * mag, yA, C.accent, 2);
      ctx.fillStyle = C.accent;
      ctx.font = '13px IBM Plex Mono, monospace';
      ctx.fillText(`q=${formatNum(state.q, 3)}`, box.l, box.t + 16);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 'q', value: `${formatNum(state.q, d)} W/m²` },
        { label: 'ΔT', value: `${formatNum(state.dT, d)} K` },
        { label: 'κ', value: `${formatNum(state.kappa, d)} W/(m·K)` },
        { label: 'L', value: `${formatNum(state.Lwall, d)} m` },
      ];
    },
    getEnergy() {
      return null;
    },
    getTrajectory(state) {
      const rows = [];
      const n = 16;
      for (let i = 0; i <= n; i += 1) {
        const u = i / n;
        rows.push({
          x: u * state.Lwall,
          T: state.T0 + state.dT * u,
          q: state.q,
        });
      }
      return rows;
    },
  };
}

/**
 * 薄变体构建器：按 catalog.dims / defaults 生成旋钮与示意动态。
 * 映射的 factory family 仅用于 formalism/capabilities。
 * Photoelectric and conduction families use the builders above.
 */
function buildVariant(spec) {
  if (isPhotoelectricSpec(spec)) return buildPhotoelectricVariant(spec);
  if (isHeatConductionSpec(spec)) return buildHeatConductionVariant(spec);
  const physics = buildFamPhysics(spec);
  if (physics) return physics;
  warnDecorativeSine(spec);
  const dimList = Array.isArray(spec.dims) ? spec.dims : [];
  const defaults = spec.defaults && typeof spec.defaults === 'object' ? spec.defaults : {};
  const params = { speed: 1, ...defaults };
  const paramSchema = {
    speed: schemaNum('动画速', 'dynamics', '—', 0.1, 8),
  };
  for (const d of dimList) {
    if (!d?.key) continue;
    if (params[d.key] === undefined) params[d.key] = d.value ?? d.min ?? 1;
    paramSchema[d.key] = schemaNum(
      d.label || d.key,
      'dynamics',
      d.unit || '—',
      Number.isFinite(d.min) ? d.min : 0,
      Number.isFinite(d.max) ? d.max : 100,
    );
  }
  if (!dimList.length) {
    params.amplitude = params.amplitude ?? 1;
    params.offset = params.offset ?? 0.5;
    params.phase = params.phase ?? 0;
    paramSchema.amplitude = schemaNum('振幅', 'dynamics', '—', 0, 20);
    paramSchema.offset = schemaNum('偏置', 'dynamics', '—', -10, 10);
    paramSchema.phase = schemaNum('相位', 'dynamics', 'rad', -6.28, 6.28);
  }
  const axisLabels = Array.isArray(spec.axes) ? spec.axes : [];
  const keys = Object.keys(params).filter((k) => k !== 'speed');

  return {
    ...baseMeta(spec),
    governing: false,
    params,
    paramSchema,
    init(state) {
      state.t = 0;
      state.val = 0;
      state.hist = [];
      state.parts = keys.slice(0, 6).map((k, i) => ({
        k,
        x: 0.15 + (i % 3) * 0.3,
        y: 0.35 + Math.floor(i / 3) * 0.3,
        r: 0.04,
      }));
    },
    step(state, dt) {
      const sp = P(state.params, 'speed', 1);
      state.t += dt * sp;
      let acc = 0;
      let w = 0;
      for (const k of keys) {
        const v = P(state.params, k, 0);
        if (!Number.isFinite(v)) continue;
        acc += v;
        w += 1;
      }
      const mean = w ? acc / w : 0;
      const amp = Number.isFinite(P(state.params, 'amplitude', NaN))
        ? P(state.params, 'amplitude', 1)
        : Math.max(0.2, Math.abs(mean) * 0.15 + 0.5);
      const phase = P(state.params, 'phase', 0);
      const offset = Number.isFinite(P(state.params, 'offset', NaN))
        ? P(state.params, 'offset', 0)
        : mean * 0.02;
      state.val = amp * Math.sin(state.t + phase) + offset;
      state.metric = mean;
      state.hist.push(state.val);
      if (state.hist.length > 160) state.hist.shift();
      if (Array.isArray(state.parts)) {
        for (let i = 0; i < state.parts.length; i += 1) {
          const p = state.parts[i];
          const kv = P(state.params, p.k, 1);
          p.vx = 0.15 * Math.sin(state.t * (1.1 + i * 0.17) + kv * 0.01);
          p.vy = 0.12 * Math.cos(state.t * (0.9 + i * 0.13) - kv * 0.01);
          p.x = Math.min(0.92, Math.max(0.08, p.x + p.vx * dt));
          p.y = Math.min(0.88, Math.max(0.18, p.y + p.vy * dt));
        }
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H, 40);
      title(ctx, spec.name);
      if (axisLabels.length) {
        ctx.fillStyle = C.muted;
        ctx.font = '10px IBM Plex Mono, monospace';
        ctx.fillText(axisLabels.join(' · ').slice(0, 64), 12, 34);
      }
      const mid = box.t + box.h * 0.58;
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(box.l, mid);
      ctx.lineTo(box.r, mid);
      ctx.stroke();
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      state.hist.forEach((v, i) => {
        const x = box.l + (i / 160) * box.w;
        const y = mid - v * 18;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      ctx.lineWidth = 1;
      if (Array.isArray(state.parts)) {
        for (const p of state.parts) {
          const x = box.l + p.x * box.w;
          const y = box.t + p.y * box.h * 0.7;
          ctx.fillStyle = C.accent;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(4, p.r * box.w), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = C.muted;
          ctx.font = '9px IBM Plex Mono, monospace';
          ctx.fillText(p.k, x + 6, y - 6);
        }
      }
      ctx.fillStyle = C.accent;
      ctx.font = '13px IBM Plex Mono, monospace';
      ctx.fillText(formatNum(state.val, 3), box.l, box.t + 28);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      const rows = [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'val', value: formatNum(state.val, d) },
        { label: 'metric', value: formatNum(state.metric, d) },
      ];
      for (const k of keys.slice(0, 6)) {
        rows.push({ label: k, value: formatNum(P(state.params, k, 0), d) });
      }
      return rows;
    },
    getTrajectory(state) { return state.hist.map((v, i) => ({ i, v })); },
  };
}

function buildOde1d(spec) {
  const inclined = spec.id === 'inclined-plane';
  const drag = spec.id === 'drag-fall';
  return {
    ...baseMeta(spec),
    params: inclined
      ? { g: 9.81, theta: 30, mu: 0.2, m: 1, s0: 0 }
      : { g: 9.81, m: 1, b: 0.8, h: 8 },
    paramSchema: inclined
      ? {
        g: schemaNum('g', 'dynamics', 'm/s²', 0, 40),
        theta: schemaNum('θ', 'dynamics', '°', 0, 80),
        mu: schemaNum('μ', 'dynamics', '—', 0, 1),
        m: schemaNum('m', 'dynamics', 'kg', 0.01, 100),
        s0: schemaNum('s₀', 'initial', 'm', 0, 20),
      }
      : {
        g: schemaNum('g', 'dynamics', 'm/s²', 0, 40),
        m: schemaNum('m', 'dynamics', 'kg', 0.01, 100),
        b: schemaNum('b', 'dynamics', 'kg/s', 0, 20),
        h: schemaNum('h₀', 'initial', 'm', 0, 40),
      },
    init(state) {
      state.t = 0;
      state.trail = [];
      if (inclined) {
        state.s = P(state.params, 's0', 0);
        state.v = 0;
      } else {
        state.y = P(state.params, 'h', 8);
        state.v = 0;
      }
    },
    step(state, dt) {
      if (inclined) {
        const g = P(state.params, 'g', 9.81);
        const th = (P(state.params, 'theta', 30) * Math.PI) / 180;
        const mu = P(state.params, 'mu', 0.2);
        const a = g * (Math.sin(th) - mu * Math.cos(th));
        state.v += a * dt;
        state.s += state.v * dt;
        if (state.s < 0) { state.s = 0; state.v = 0; }
        if (state.s > 12) { state.s = 12; state.v = 0; }
        state.a = a;
      } else {
        const g = P(state.params, 'g', 9.81);
        const m = Math.max(P(state.params, 'm', 1), 1e-6);
        const b = P(state.params, 'b', 0.8);
        const a = g - (b / m) * state.v;
        state.v += a * dt;
        state.y -= state.v * dt;
        if (state.y < 0) { state.y = 0; state.v = 0; }
        state.a = a;
      }
      state.t += dt;
      pushTrail(state.trail, inclined ? state.s : state.y, 240);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      if (inclined) {
        const th = (P(state.params, 'theta', 30) * Math.PI) / 180;
        const x0 = box.l;
        const y0 = box.b;
        const len = box.w * 0.85;
        const x1 = x0 + len * Math.cos(th);
        const y1 = y0 - len * Math.sin(th);
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        const u = Math.min(1, state.s / 12);
        const bx = x0 + u * (x1 - x0);
        const by = y0 + u * (y1 - y0);
        ctx.fillStyle = C.body;
        ctx.fillRect(bx - 10, by - 18, 20, 16);
        if (view.showVectors !== false) {
          drawArrow(ctx, bx, by - 8, bx + state.v * 6 * Math.cos(th), by - 8 - state.v * 6 * Math.sin(th), C.vector, 2);
        }
      } else {
        const h0 = Math.max(P(state.params, 'h', 8), 0.1);
        const ground = box.b;
        const scale = box.h / (h0 * 1.2);
        const cx = W * 0.45;
        const sy = ground - state.y * scale;
        ctx.strokeStyle = C.axis;
        ctx.beginPath();
        ctx.moveTo(box.l, ground);
        ctx.lineTo(box.r, ground);
        ctx.stroke();
        ctx.fillStyle = C.body;
        ctx.beginPath();
        ctx.arc(cx, sy, 11, 0, Math.PI * 2);
        ctx.fill();
        if (view.showVectors !== false) drawArrow(ctx, cx, sy, cx, sy + state.v * 5, C.vector, 2);
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      if (inclined) {
        return [
          { label: 't', value: `${formatNum(state.t, d)} s` },
          { label: 's', value: `${formatNum(state.s, d)} m` },
          { label: 'v', value: `${formatNum(state.v, d)} m/s` },
          { label: 'a', value: `${formatNum(state.a, d)} m/s²` },
        ];
      }
      return [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'y', value: `${formatNum(state.y, d)} m` },
        { label: 'v', value: `${formatNum(state.v, d)} m/s` },
        { label: 'a', value: `${formatNum(state.a, d)} m/s²` },
      ];
    },
    getTrajectory(state) {
      return (state.trail || []).map((v, i) => ({ i, v }));
    },
  };
}

function buildOde2d(spec) {
  return {
    ...baseMeta(spec),
    params: { q: 1, m: 1, Ex: 2, Ey: 0, vx0: 2, vy0: 3, x0: -2, y0: 0 },
    paramSchema: {
      q: schemaNum('q', 'dynamics', 'C', -5, 5),
      m: schemaNum('m', 'dynamics', 'kg', 0.01, 20),
      Ex: schemaNum('Ex', 'dynamics', 'N/C', -10, 10),
      Ey: schemaNum('Ey', 'dynamics', 'N/C', -10, 10),
      vx0: schemaNum('vx₀', 'initial', 'm/s', -20, 20),
      vy0: schemaNum('vy₀', 'initial', 'm/s', -20, 20),
      x0: schemaNum('x₀', 'initial', 'm', -5, 5),
      y0: schemaNum('y₀', 'initial', 'm', -5, 5),
    },
    init(state) {
      state.t = 0;
      state.x = P(state.params, 'x0', -2);
      state.y = P(state.params, 'y0', 0);
      state.vx = P(state.params, 'vx0', 2);
      state.vy = P(state.params, 'vy0', 3);
      state.trail = [];
    },
    step(state, dt) {
      const q = P(state.params, 'q', 1);
      const m = Math.max(P(state.params, 'm', 1), 1e-6);
      const ax = (q * P(state.params, 'Ex', 0)) / m;
      const ay = (q * P(state.params, 'Ey', 0)) / m;
      state.vx += ax * dt;
      state.vy += ay * dt;
      state.x += state.vx * dt;
      state.y += state.vy * dt;
      state.t += dt;
      pushTrail(state.trail, { x: state.x, y: state.y }, 500);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const sx = (x) => box.l + box.w * 0.5 + x * 28;
      const sy = (y) => box.t + box.h * 0.5 - y * 28;
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(box.l, sy(0));
      ctx.lineTo(box.r, sy(0));
      ctx.moveTo(sx(0), box.t);
      ctx.lineTo(sx(0), box.b);
      ctx.stroke();
      if (view.showTrail !== false && state.trail.length > 1) {
        ctx.strokeStyle = C.trail;
        ctx.beginPath();
        state.trail.forEach((p, i) => (i ? ctx.lineTo(sx(p.x), sy(p.y)) : ctx.moveTo(sx(p.x), sy(p.y))));
        ctx.stroke();
      }
      ctx.fillStyle = C.body;
      ctx.beginPath();
      ctx.arc(sx(state.x), sy(state.y), 8, 0, Math.PI * 2);
      ctx.fill();
      if (view.showVectors !== false) {
        drawArrow(ctx, sx(state.x), sy(state.y), sx(state.x) + P(state.params, 'Ex', 0) * 12, sy(state.y) - P(state.params, 'Ey', 0) * 12, C.vector, 2);
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'x', value: `${formatNum(state.x, d)}` },
        { label: 'y', value: `${formatNum(state.y, d)}` },
        { label: 'v', value: `${formatNum(Math.hypot(state.vx, state.vy), d)}` },
      ];
    },
    getTrajectory(state) { return state.trail; },
  };
}

function buildCircular(spec) {
  return {
    ...baseMeta(spec),
    params: { R: 2, omega: 1.5, m: 1 },
    paramSchema: {
      R: schemaNum('R', 'dynamics', 'm', 0.2, 8),
      omega: schemaNum('ω', 'dynamics', 'rad/s', 0.1, 8),
      m: schemaNum('m', 'dynamics', 'kg', 0.01, 50),
    },
    init(state) { state.t = 0; state.trail = []; },
    step(state, dt) {
      state.t += dt;
      const R = P(state.params, 'R', 2);
      const w = P(state.params, 'omega', 1.5);
      state.x = R * Math.cos(w * state.t);
      state.y = R * Math.sin(w * state.t);
      pushTrail(state.trail, { x: state.x, y: state.y }, 360);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const cx = W / 2; const cy = H / 2;
      const R = P(state.params, 'R', 2);
      const sc = Math.min(W, H) * 0.18;
      title(ctx, spec.name);
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.arc(cx, cy, R * sc, 0, Math.PI * 2);
      ctx.stroke();
      const x = cx + state.x * sc;
      const y = cy - state.y * sc;
      ctx.fillStyle = C.body;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      if (view.showVectors !== false) {
        drawArrow(ctx, x, y, cx + (cx - x) * 0.35, cy + (cy - y) * 0.35, C.accent, 2);
        const w = P(state.params, 'omega', 1.5);
        drawArrow(ctx, x, y, x - state.y * w * sc * 0.25, y - state.x * w * sc * 0.25, C.vector, 2);
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      const R = P(state.params, 'R', 2);
      const w = P(state.params, 'omega', 1.5);
      return [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'v', value: `${formatNum(R * w, d)} m/s` },
        { label: 'aₙ', value: `${formatNum(w * w * R, d)} m/s²` },
      ];
    },
    getTrajectory(state) { return state.trail; },
  };
}

function buildParticles(spec) {
  const isGas = /ideal-gas|entropy|sph|collision-2d/.test(spec.id);
  return {
    ...baseMeta(spec),
    params: { N: 40, T: 300, seed: 7, viscosity: 0.2, g: 2, e: 0.9 },
    paramSchema: {
      N: schemaNum('N', 'numerics', '—', 8, 120),
      T: schemaNum('T', 'dynamics', 'K', 50, 1000),
      seed: schemaNum('seed', 'initial', '—', 1, 9999),
      viscosity: schemaNum('粘度', 'dynamics', '—', 0, 2),
      g: schemaNum('g', 'dynamics', 'm/s²', 0, 20),
      e: schemaNum('e', 'dynamics', '—', 0, 1),
    },
    init(state) {
      const cap = mobileBudget().particleNCap;
      const n = Math.min(cap, Math.max(4, Math.floor(P(state.params, 'N', 40))));
      if (Number(state.params.N) > n) state.params.N = n;
      const r = rnd(P(state.params, 'seed', 7));
      const T = P(state.params, 'T', 300);
      const speed = Math.sqrt(T) * 0.02;
      state.parts = Array.from({ length: n }, (_, i) => ({
        x: 0.1 + r() * 0.8,
        y: 0.1 + r() * 0.8,
        vx: (r() - 0.5) * speed * 2,
        vy: (r() - 0.5) * speed * 2,
        kind: i < n / 2 ? 0 : 1,
      }));
      state.t = 0;
      state.entropy = 0;
    },
    step(state, dt) {
      const visc = P(state.params, 'viscosity', 0.2);
      const g = P(state.params, 'g', 0) * (isGas && spec.id === 'sph-simple' ? 1 : 0);
      const e = P(state.params, 'e', 0.9);
      const cap = mobileBudget().particleNCap;
      if (state.parts.length > cap) state.parts.length = cap;
      for (const p of state.parts) {
        p.vy += g * dt * 0.15;
        p.vx *= (1 - visc * dt * 0.3);
        p.vy *= (1 - visc * dt * 0.3);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < 0.02 || p.x > 0.98) { p.vx *= -e; p.x = Math.max(0.02, Math.min(0.98, p.x)); }
        if (p.y < 0.02 || p.y > 0.98) { p.vy *= -e; p.y = Math.max(0.02, Math.min(0.98, p.y)); }
      }
      // Spatial hash pairwise for collision-2d / sph (O(n) typical vs O(n²)).
      if (/collision-2d|sph/.test(spec.id)) {
        const parts = state.parts;
        const cell = particleHashCell(parts.length);
        const buckets = new Map();
        const cellKey = (x, y) => `${(x / cell) | 0},${(y / cell) | 0}`;
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          const k = cellKey(p.x, p.y);
          let bin = buckets.get(k);
          if (!bin) { bin = []; buckets.set(k, bin); }
          bin.push(i);
        }
        const resolve = (i, j) => {
          const a = parts[i];
          const b = parts[j];
          const dx = b.x - a.x; const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= 0.0025 || d2 <= 1e-8) return;
          const d = Math.sqrt(d2);
          const nx = dx / d; const ny = dy / d;
          const dv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (dv > 0) return;
          a.vx -= dv * nx * 0.5 * (1 + e);
          a.vy -= dv * ny * 0.5 * (1 + e);
          b.vx += dv * nx * 0.5 * (1 + e);
          b.vy += dv * ny * 0.5 * (1 + e);
        };
        for (const [k, idxs] of buckets) {
          const comma = k.indexOf(',');
          const cx = Number(k.slice(0, comma));
          const cy = Number(k.slice(comma + 1));
          for (let ndx = 0; ndx <= 1; ndx += 1) {
            for (let ndy = ndx === 0 ? 0 : -1; ndy <= 1; ndy += 1) {
              const other = buckets.get(`${cx + ndx},${cy + ndy}`);
              if (!other) continue;
              if (ndx === 0 && ndy === 0) {
                for (let a = 0; a < idxs.length; a += 1) {
                  for (let b = a + 1; b < idxs.length; b += 1) resolve(idxs[a], idxs[b]);
                }
              } else {
                for (const i of idxs) {
                  for (const j of other) resolve(i, j);
                }
              }
            }
          }
        }
      }
      state.t += dt;
      if (spec.id === 'entropy-mix') {
        const left = state.parts.filter((p) => p.x < 0.5).length / state.parts.length;
        state.entropy = -left * Math.log(Math.max(left, 1e-6)) - (1 - left) * Math.log(Math.max(1 - left, 1e-6));
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H, 28);
      title(ctx, spec.name);
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l, box.t, box.w, box.h);
      for (const p of state.parts) {
        ctx.fillStyle = p.kind ? C.accent : C.body;
        ctx.beginPath();
        ctx.arc(box.l + p.x * box.w, box.t + p.y * box.h, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      const ke = state.parts.reduce((s, p) => s + 0.5 * (p.vx * p.vx + p.vy * p.vy), 0);
      const rows = [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'N', value: String(state.parts.length) },
        { label: 'KE', value: formatNum(ke, d) },
      ];
      if (spec.id === 'entropy-mix') rows.push({ label: 'S', value: formatNum(state.entropy, d) });
      return rows;
    },
    getTrajectory() { return []; },
  };
}

function buildNbody(spec) {
  return {
    ...baseMeta(spec),
    params: { G: 1.2, m1: 12, m2: 8, m3: 1, soft: 1.1, seed: 3 },
    paramSchema: {
      G: schemaNum('G', 'dynamics', '—', 0.1, 5),
      m1: schemaNum('m1', 'dynamics', '—', 0.1, 40),
      m2: schemaNum('m2', 'dynamics', '—', 0.1, 40),
      m3: schemaNum('m3', 'dynamics', '—', 0.01, 20),
      soft: schemaNum('soft', 'numerics', '—', 0.05, 2),
      seed: schemaNum('seed', 'initial', '—', 1, 99),
    },
    init(state) {
      const binary = spec.id === 'binary-stars';
      const assist = spec.id === 'gravity-assist';
      if (binary) {
        state.bodies = [
          { m: P(state.params, 'm1', 12), x: -1.2, y: 0, vx: 0, vy: -0.55 },
          { m: P(state.params, 'm2', 8), x: 1.5, y: 0, vx: 0, vy: 0.7 },
        ];
      } else if (assist) {
        state.bodies = [
          { m: P(state.params, 'm1', 20), x: 0, y: 0, vx: 0, vy: 0 },
          { m: P(state.params, 'm2', 4), x: 3.2, y: 0, vx: 0, vy: 1.05 },
          { m: P(state.params, 'm3', 0.05), x: -4, y: 1.2, vx: 1.6, vy: 0 },
        ];
      } else {
        state.bodies = [
          { m: P(state.params, 'm1', 12), x: -1, y: 0.2, vx: 0, vy: 0.6 },
          { m: P(state.params, 'm2', 8), x: 1.2, y: -0.1, vx: 0, vy: -0.5 },
          { m: P(state.params, 'm3', 1), x: 0, y: 1.6, vx: -0.7, vy: 0 },
        ];
      }
      state.t = 0;
      state.trails = state.bodies.map(() => []);
    },
    step(state, dt) {
      const G = P(state.params, 'G', 1.2);
      const soft = P(state.params, 'soft', 0.2);
      const n = state.bodies.length;
      const acc = state.bodies.map(() => ({ ax: 0, ay: 0 }));
      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          const a = state.bodies[i];
          const b = state.bodies[j];
          const dx = b.x - a.x; const dy = b.y - a.y;
          const r2 = dx * dx + dy * dy + soft * soft;
          const inv = G / (r2 * Math.sqrt(r2));
          acc[i].ax += inv * b.m * dx;
          acc[i].ay += inv * b.m * dy;
          acc[j].ax -= inv * a.m * dx;
          acc[j].ay -= inv * a.m * dy;
        }
      }
      for (let i = 0; i < n; i += 1) {
        const b = state.bodies[i];
        b.vx += acc[i].ax * dt;
        b.vy += acc[i].ay * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        state.trails[i].push({ x: b.x, y: b.y });
        if (state.trails[i].length > 280) state.trails[i].shift();
      }
      state.t += dt;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const cx = W / 2; const cy = H / 2; const sc = Math.min(W, H) * 0.12;
      title(ctx, spec.name);
      state.bodies.forEach((b, i) => {
        if (view.showTrail !== false && state.trails[i].length > 1) {
          ctx.strokeStyle = i ? C.trail : C.theory;
          ctx.beginPath();
          state.trails[i].forEach((p, k) => (k ? ctx.lineTo(cx + p.x * sc, cy - p.y * sc) : ctx.moveTo(cx + p.x * sc, cy - p.y * sc)));
          ctx.stroke();
        }
        ctx.fillStyle = i === 0 ? C.body : (i === 1 ? C.accent : C.vector);
        ctx.beginPath();
        ctx.arc(cx + b.x * sc, cy - b.y * sc, 4 + Math.sqrt(b.m), 0, Math.PI * 2);
        ctx.fill();
      });
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'bodies', value: String(state.bodies.length) },
        { label: 'r12', value: formatNum(Math.hypot(state.bodies[0].x - state.bodies[1].x, state.bodies[0].y - state.bodies[1].y), d) },
      ];
    },
    getTrajectory(state) { return state.trails?.[0] || []; },
  };
}

function buildEuler(spec) {
  return {
    ...baseMeta(spec),
    params: { I1: 1, I2: 1.4, I3: 2, wx: 1.2, wy: 0.2, wz: 0.1 },
    paramSchema: {
      I1: schemaNum('I₁', 'dynamics', '—', 0.2, 5),
      I2: schemaNum('I₂', 'dynamics', '—', 0.2, 5),
      I3: schemaNum('I₃', 'dynamics', '—', 0.2, 5),
      wx: schemaNum('ωx', 'initial', 'rad/s', -5, 5),
      wy: schemaNum('ωy', 'initial', 'rad/s', -5, 5),
      wz: schemaNum('ωz', 'initial', 'rad/s', -5, 5),
    },
    init(state) {
      state.t = 0;
      state.wx = P(state.params, 'wx', 1.2);
      state.wy = P(state.params, 'wy', 0.2);
      state.wz = P(state.params, 'wz', 0.1);
      state.trail = [];
    },
    step(state, dt) {
      const I1 = P(state.params, 'I1', 1);
      const I2 = P(state.params, 'I2', 1.4);
      const I3 = P(state.params, 'I3', 2);
      const { wx, wy, wz } = state;
      const dwx = ((I2 - I3) / I1) * wy * wz;
      const dwy = ((I3 - I1) / I2) * wz * wx;
      const dwz = ((I1 - I2) / I3) * wx * wy;
      state.wx += dwx * dt;
      state.wy += dwy * dt;
      state.wz += dwz * dt;
      state.t += dt;
      pushTrail(state.trail, { x: state.wx, y: state.wy, z: state.wz }, 400);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const cx = W / 2; const cy = H / 2; const sc = 40;
      title(ctx, spec.name);
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(cx - 80, cy); ctx.lineTo(cx + 80, cy);
      ctx.moveTo(cx, cy - 80); ctx.lineTo(cx, cy + 80);
      ctx.stroke();
      if (state.trail.length > 1) {
        ctx.strokeStyle = C.trail;
        ctx.beginPath();
        state.trail.forEach((p, i) => {
          const x = cx + p.x * sc + p.z * 12;
          const y = cy - p.y * sc + p.z * 8;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
      drawArrow(ctx, cx, cy, cx + state.wx * sc, cy - state.wy * sc, C.vector, 2);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'ωx', value: formatNum(state.wx, d) },
        { label: 'ωy', value: formatNum(state.wy, d) },
        { label: 'ωz', value: formatNum(state.wz, d) },
      ];
    },
    getTrajectory(state) { return state.trail; },
  };
}

function buildBuoyancy(spec) {
  return {
    ...baseMeta(spec),
    params: { rhoObj: 700, rhoFluid: 1000, V: 0.02, g: 9.81 },
    paramSchema: {
      rhoObj: schemaNum('ρ物体', 'dynamics', 'kg/m³', 100, 2000),
      rhoFluid: schemaNum('ρ液体', 'dynamics', 'kg/m³', 200, 2000),
      V: schemaNum('V', 'dynamics', 'm³', 0.001, 0.1),
      g: schemaNum('g', 'dynamics', 'm/s²', 1, 40),
    },
    init(state) {
      state.t = 0;
      state.y = 0.7;
      state.v = 0;
    },
    step(state, dt) {
      const g = P(state.params, 'g', 9.81);
      const V = P(state.params, 'V', 0.02);
      const ro = P(state.params, 'rhoObj', 700);
      const rf = P(state.params, 'rhoFluid', 1000);
      const submerged = Math.max(0, Math.min(1, (0.55 - state.y + 0.12) / 0.24));
      const Fb = rf * V * submerged * g;
      const Fg = ro * V * g;
      const m = Math.max(ro * V, 1e-4);
      const a = (Fg - Fb) / m - 1.5 * state.v;
      state.v += a * dt;
      state.y += state.v * dt * 0.15;
      state.y = Math.max(0.15, Math.min(0.85, state.y));
      state.Fb = Fb; state.Fg = Fg; state.sub = submerged;
      state.t += dt;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const waterY = box.t + box.h * 0.45;
      ctx.fillStyle = 'rgba(56,189,248,0.25)';
      ctx.fillRect(box.l, waterY, box.w, box.b - waterY);
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l, box.t, box.w, box.h);
      const bx = W / 2;
      const by = box.t + state.y * box.h;
      ctx.fillStyle = C.body;
      ctx.fillRect(bx - 28, by - 22, 56, 44);
      if (view.showVectors !== false) {
        drawArrow(ctx, bx - 40, by, bx - 40, by + 30, C.accent, 2);
        drawArrow(ctx, bx + 40, by, bx + 40, by - 30, C.vector, 2);
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'Fb', value: formatNum(state.Fb, d) },
        { label: 'Fg', value: formatNum(state.Fg, d) },
        { label: 'sub', value: formatNum(state.sub, d) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildFlow(spec) {
  return {
    ...baseMeta(spec),
    params: { Q: 2, D1: 1.2, D2: 0.6, mu: 0.05, rho: 1 },
    paramSchema: {
      Q: schemaNum('流量 Q', 'dynamics', '—', 0.2, 8),
      D1: schemaNum('D₁', 'dynamics', '—', 0.3, 3),
      D2: schemaNum('D₂', 'dynamics', '—', 0.2, 2),
      mu: schemaNum('粘度 μ', 'dynamics', '—', 0.001, 1),
      rho: schemaNum('ρ', 'dynamics', '—', 0.2, 5),
    },
    init(state) { state.t = 0; state.phase = 0; },
    step(state, dt) { state.t += dt; state.phase += dt * P(state.params, 'Q', 2); },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const D1 = P(state.params, 'D1', 1.2);
      const D2 = P(state.params, 'D2', 0.6);
      const y1 = box.t + box.h * 0.5;
      const h1 = 18 * D1; const h2 = 18 * D2;
      ctx.fillStyle = C.axis;
      ctx.fillRect(box.l, y1 - h1 / 2, box.w * 0.45, h1);
      ctx.fillRect(box.l + box.w * 0.45, y1 - h2 / 2, box.w * 0.45, h2);
      const A1 = Math.PI * (D1 / 2) ** 2;
      const A2 = Math.PI * (D2 / 2) ** 2;
      const Q = P(state.params, 'Q', 2);
      const v1 = Q / Math.max(A1, 1e-6);
      const v2 = Q / Math.max(A2, 1e-6);
      const P1 = 1 - 0.5 * v1 * v1; const P2 = 1 - 0.5 * v2 * v2;
      for (let i = 0; i < 8; i += 1) {
        const u = ((state.phase * 0.15 + i / 8) % 1);
        const x = box.l + u * box.w * 0.9;
        const narrow = u > 0.45;
        const yy = y1 + Math.sin(u * 12 + state.phase) * (narrow ? 6 : 3) * (spec.id.includes('turb') && (P(state.params, 'rho', 1) * v2 * D2) / Math.max(P(state.params, 'mu', 0.05), 1e-4) > 2000 ? 2.5 : 0.4);
        ctx.fillStyle = heatTempColor(narrow ? P2 : P1, -2, 2);
        ctx.beginPath();
        ctx.arc(x, yy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      state._Re = (P(state.params, 'rho', 1) * v2 * D2) / Math.max(P(state.params, 'mu', 0.05), 1e-4);
      state._v1 = v1; state._v2 = v2; state._P1 = P1; state._P2 = P2;
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 'v1', value: formatNum(state._v1, d) },
        { label: 'v2', value: formatNum(state._v2, d) },
        { label: 'ΔP', value: formatNum((state._P1 || 0) - (state._P2 || 0), d) },
        { label: 'Re', value: formatNum(state._Re, 1) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildWave1d(spec) {
  return {
    ...baseMeta(spec),
    params: { f: 1.2, A: 1, c: 1.5, L: 1, nMode: 2, barrierH: 4, barrierW: 0.15, E: 2 },
    paramSchema: {
      f: schemaNum('f', 'dynamics', 'Hz', 0.1, 8),
      A: schemaNum('A', 'dynamics', '—', 0.1, 3),
      c: schemaNum('c', 'dynamics', '—', 0.2, 5),
      L: schemaNum('L', 'dynamics', '—', 0.3, 3),
      nMode: schemaNum('mode n', 'dynamics', '—', 1, 6),
      barrierH: schemaNum('势垒高', 'dynamics', '—', 0, 12),
      barrierW: schemaNum('势垒宽', 'dynamics', '—', 0.02, 0.5),
      E: schemaNum('E', 'dynamics', '—', 0.1, 10),
    },
    init(state) {
      state.t = 0;
      state.N = 96;
      state.y = new Float64Array(state.N);
    },
    step(state, dt) {
      state.t += dt;
      const N = state.N;
      const f = P(state.params, 'f', 1.2);
      const A = P(state.params, 'A', 1);
      const c = P(state.params, 'c', 1.5);
      const n = Math.max(1, Math.round(P(state.params, 'nMode', 2)));
      for (let i = 0; i < N; i += 1) {
        const x = i / (N - 1);
        if (spec.id === 'standing-wave') {
          state.y[i] = A * Math.sin(n * Math.PI * x) * Math.cos(2 * Math.PI * f * state.t);
        } else if (spec.id === 'longitudinal-wave') {
          state.y[i] = A * Math.sin(2 * Math.PI * (x * 3 - f * state.t));
        } else if (spec.id === 'em-wave') {
          state.y[i] = A * Math.sin(2 * Math.PI * (x * 2 - f * state.t));
        } else if (spec.id === 'wavepacket') {
          const x0 = 0.35 + 0.1 * Math.sin(state.t * 0.2);
          const w = 0.08;
          state.y[i] = A * Math.exp(-((x - x0) ** 2) / (2 * w * w)) * Math.cos(40 * (x - c * state.t * 0.05));
        } else if (spec.id === 'tunneling') {
          const k = Math.sqrt(Math.max(P(state.params, 'E', 2), 0.1)) * 8;
          const bw = P(state.params, 'barrierW', 0.15);
          const mid = 0.55;
          const inside = Math.abs(x - mid) < bw / 2;
          const amp = inside ? A * Math.exp(-P(state.params, 'barrierH', 4) * Math.abs(x - mid)) : A;
          state.y[i] = amp * Math.sin(k * x - 6 * state.t);
        } else {
          state.y[i] = A * Math.sin(2 * Math.PI * (x * 2 - f * state.t));
        }
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const mid = box.t + box.h / 2;
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(box.l, mid);
      ctx.lineTo(box.r, mid);
      ctx.stroke();
      if (spec.id === 'tunneling') {
        const bw = P(state.params, 'barrierW', 0.15);
        ctx.fillStyle = 'rgba(148,163,184,0.25)';
        ctx.fillRect(box.l + (0.55 - bw / 2) * box.w, box.t + 20, bw * box.w, box.h - 40);
      }
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < state.N; i += 1) {
        const x = box.l + (i / (state.N - 1)) * box.w;
        const y = mid - state.y[i] * box.h * 0.28;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      if (spec.id === 'longitudinal-wave') {
        for (let i = 0; i < 24; i += 1) {
          const x0 = i / 23;
          const disp = 0.02 * P(state.params, 'A', 1) * Math.sin(2 * Math.PI * (x0 * 3 - P(state.params, 'f', 1.2) * state.t));
          ctx.fillStyle = C.accent;
          ctx.beginPath();
          ctx.arc(box.l + (x0 + disp) * box.w, mid + 40, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'f', value: formatNum(P(state.params, 'f', 1), d) },
        { label: 'A', value: formatNum(P(state.params, 'A', 1), d) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildDoppler(spec) {
  return {
    ...baseMeta(spec),
    params: { f: 2, v: 1.2, vs: 0.6, c: 2 },
    paramSchema: {
      f: schemaNum('f', 'dynamics', 'Hz', 0.2, 8),
      vs: schemaNum('源速', 'dynamics', '—', -2, 2),
      c: schemaNum('波速', 'dynamics', '—', 0.5, 5),
      v: schemaNum('观察者', 'dynamics', '—', -2, 2),
    },
    init(state) { state.t = 0; state.rings = []; state.x = 0.25; },
    step(state, dt) {
      state.t += dt;
      state.x += P(state.params, 'vs', 0.6) * dt * 0.08;
      if (state.x > 0.9) state.x = 0.1;
      const period = 1 / Math.max(P(state.params, 'f', 2), 0.1);
      if (!state.acc) state.acc = 0;
      state.acc += dt;
      if (state.acc >= period) {
        state.acc = 0;
        state.rings.push({ x: state.x, r: 0, born: state.t });
      }
      const c = P(state.params, 'c', 2);
      for (const ring of state.rings) ring.r = (state.t - ring.born) * c * 0.12;
      state.rings = state.rings.filter((r) => r.r < 1.2);
      const vs = P(state.params, 'vs', 0.6);
      const vo = P(state.params, 'v', 0);
      state.fp = P(state.params, 'f', 2) * (c + vo) / Math.max(c - vs, 0.05);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const cy = box.t + box.h / 2;
      for (const ring of state.rings) {
        ctx.strokeStyle = C.trail;
        ctx.beginPath();
        ctx.arc(box.l + ring.x * box.w, cy, ring.r * box.w * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = C.body;
      ctx.beginPath();
      ctx.arc(box.l + state.x * box.w, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.accent;
      ctx.fillRect(box.r - 30, cy - 10, 14, 20);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'f′', value: formatNum(state.fp, d) },
        { label: 'rings', value: String(state.rings.length) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildInterference(spec) {
  return {
    ...baseMeta(spec),
    params: { f: 2, phase: 0, d: 0.25, lambda: 0.18, slit: 0.12 },
    paramSchema: {
      f: schemaNum('f', 'dynamics', 'Hz', 0.2, 8),
      phase: schemaNum('Δφ', 'dynamics', 'rad', -3.14, 3.14),
      d: schemaNum('间距 d', 'dynamics', '—', 0.05, 0.6),
      lambda: schemaNum('λ', 'dynamics', '—', 0.05, 0.5),
      slit: schemaNum('缝宽', 'dynamics', '—', 0.02, 0.4),
    },
    init(state) { state.t = 0; },
    step(state, dt) { state.t += dt; },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H, 32);
      title(ctx, spec.name);
      const budget = mobileBudget();
      const cols = budget.interferenceCols;
      const rows = budget.interferenceRows;
      const d = P(state.params, 'd', 0.25);
      const lam = P(state.params, 'lambda', 0.18);
      const ph = P(state.params, 'phase', 0);
      const slit = P(state.params, 'slit', 0.12);
      const k = (2 * Math.PI) / Math.max(lam, 1e-4);
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const x = i / (cols - 1);
          const y = j / (rows - 1);
          let amp;
          if (spec.id === 'diffraction' || spec.id === 'single-slit') {
            const beta = (Math.PI * slit * (y - 0.5)) / Math.max(lam, 1e-4);
            amp = beta === 0 ? 1 : Math.sin(beta) / beta;
            amp *= Math.cos(k * x - 4 * state.t);
          } else {
            const r1 = Math.hypot(x, y - (0.5 - d / 2));
            const r2 = Math.hypot(x, y - (0.5 + d / 2));
            amp = Math.cos(k * r1 - 4 * state.t) + Math.cos(k * r2 - 4 * state.t + ph);
          }
          const u = (amp + 2) / 4;
          ctx.fillStyle = heatTempColor(u, 0, 1);
          ctx.fillRect(box.l + (i / cols) * box.w, box.t + (j / rows) * box.h, box.w / cols + 1, box.h / rows + 1);
        }
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'λ', value: formatNum(P(state.params, 'lambda', 0.18), d) },
        { label: 'd', value: formatNum(P(state.params, 'd', 0.25), d) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildField2d(spec) {
  return {
    ...baseMeta(spec),
    params: { alpha: 0.15, n: 24, tension: 1, excite: 0.5 },
    paramSchema: {
      alpha: schemaNum('α', 'dynamics', '—', 0.01, 0.5),
      n: schemaNum('n', 'numerics', '—', 12, 48),
      tension: schemaNum('张力', 'dynamics', '—', 0.2, 4),
      excite: schemaNum('激励', 'initial', '—', 0, 1),
    },
    init(state) {
      const cap = mobileBudget().fieldNCap;
      const n = Math.min(cap, Math.max(8, Math.floor(P(state.params, 'n', 24))));
      if (Number(state.params.n) > n) state.params.n = n;
      state.n = n;
      state.u = new Float64Array(n * n);
      state.v = new Float64Array(n * n);
      state._next = new Float64Array(n * n);
      const ex = Math.floor(P(state.params, 'excite', 0.5) * (n - 1));
      state.u[ex * n + Math.floor(n / 2)] = 1;
      state.t = 0;
    },
    step(state, dt) {
      const n = state.n;
      const a = P(state.params, 'alpha', 0.15) * P(state.params, 'tension', 1);
      if (!state._next || state._next.length !== n * n) state._next = new Float64Array(n * n);
      const next = state._next;
      next.fill(0);
      for (let i = 1; i < n - 1; i += 1) {
        for (let j = 1; j < n - 1; j += 1) {
          const idx = i * n + j;
          const lap = state.u[idx - 1] + state.u[idx + 1] + state.u[idx - n] + state.u[idx + n] - 4 * state.u[idx];
          if (spec.id === 'heat-2d') next[idx] = state.u[idx] + a * lap * dt * 8;
          else {
            state.v[idx] += a * lap * dt * 40;
            next[idx] = state.u[idx] + state.v[idx] * dt;
          }
        }
      }
      const swap = state.u;
      state.u = next;
      state._next = swap;
      state.t += dt;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H, 28);
      title(ctx, spec.name);
      const n = state.n;
      const cw = box.w / n; const ch = box.h / n;
      for (let i = 0; i < n; i += 1) {
        for (let j = 0; j < n; j += 1) {
          const v = state.u[i * n + j];
          ctx.fillStyle = heatTempColor(v, -1, 1);
          ctx.fillRect(box.l + j * cw, box.t + i * ch, cw + 1, ch + 1);
        }
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      let max = 0;
      for (const v of state.u) max = Math.max(max, Math.abs(v));
      return [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: '|u|max', value: formatNum(max, d) },
        { label: 'n', value: String(state.n) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildPiston(spec) {
  return {
    ...baseMeta(spec),
    params: { T: 300, V: 1, n: 1, R: 0.082 },
    paramSchema: {
      T: schemaNum('T', 'dynamics', 'K', 100, 800),
      V: schemaNum('V', 'dynamics', 'L', 0.2, 5),
      n: schemaNum('n', 'dynamics', 'mol', 0.1, 5),
      R: schemaNum('R', 'dynamics', '—', 0.05, 0.2),
    },
    init(state) { state.t = 0; },
    step(state, dt) {
      state.t += dt;
      state.P = (P(state.params, 'n', 1) * P(state.params, 'R', 0.082) * P(state.params, 'T', 300)) / Math.max(P(state.params, 'V', 1), 1e-6);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const V = P(state.params, 'V', 1);
      const top = box.t + 40 + (5 - V) * 28;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l + 40, box.t + 40, 120, box.h - 80);
      ctx.fillStyle = C.body;
      ctx.fillRect(box.l + 40, top, 120, 14);
      ctx.fillStyle = 'rgba(56,189,248,0.3)';
      ctx.fillRect(box.l + 40, top + 14, 120, box.b - 40 - (top + 14));
      ctx.fillStyle = C.muted;
      ctx.font = '12px IBM Plex Mono, monospace';
      ctx.fillText(`P=${formatNum(state.P, 3)}`, box.l + 180, box.t + 80);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 'P', value: formatNum(state.P, d) },
        { label: 'V', value: formatNum(P(state.params, 'V', 1), d) },
        { label: 'T', value: formatNum(P(state.params, 'T', 300), d) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildCycle(spec) {
  const dragTs = /rankine|vapor-compression|heat-pump|brayton|otto|carnot/i.test(spec.id);
  return {
    ...baseMeta(spec),
    params: { Th: 500, Tc: 300, phaseSpeed: 0.4, sHot: 0.72, sCold: 0.28 },
    paramSchema: {
      Th: schemaNum('Th', 'dynamics', 'K', 250, 900),
      Tc: schemaNum('Tc', 'dynamics', 'K', 100, 600),
      phaseSpeed: schemaNum('速率', 'dynamics', '—', 0.05, 2),
      sHot: schemaNum('s_hot', 'dynamics', '—', 0.15, 0.9),
      sCold: schemaNum('s_cold', 'dynamics', '—', 0.1, 0.85),
    },
    init(state) {
      state.t = 0;
      state.s = 0;
      state.drag = null;
      state._box = null;
    },
    step(state, dt) {
      state.t += dt;
      state.s = (state.s + dt * P(state.params, 'phaseSpeed', 0.4)) % 4;
      const Th = P(state.params, 'Th', 500);
      const Tc = P(state.params, 'Tc', 300);
      state.eta = Math.max(0, 1 - Tc / Math.max(Th, 1));
      if (spec.id.includes('vapor') || spec.id.includes('heat-pump')) {
        state.cop = Tc / Math.max(Th - Tc, 1);
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      state._box = box;
      title(ctx, `${spec.name}${dragTs ? ' · drag T-s pts' : ''}`);
      // T-s 轴：x=熵 y=温度（上高）
      const sh = Math.max(0.15, Math.min(0.9, P(state.params, 'sHot', 0.72)));
      const sc = Math.max(0.1, Math.min(0.85, P(state.params, 'sCold', 0.28)));
      const Th = P(state.params, 'Th', 500);
      const Tc = P(state.params, 'Tc', 300);
      const Tmax = 900;
      const Tmin = 100;
      const toX = (s) => box.l + s * box.w;
      const toY = (T) => box.b - ((T - Tmin) / (Tmax - Tmin)) * box.h;
      const pts = [
        { s: sc, T: Tc, key: 'c' },
        { s: sh, T: Tc, key: 'b' },
        { s: sh, T: Th, key: 'h' },
        { s: sc, T: Th, key: 'a' },
      ];
      state._pts = pts.map((p) => ({ ...p, x: toX(p.s), y: toY(p.T) }));
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l, box.t, box.w, box.h);
      ctx.fillStyle = C.muted;
      ctx.font = '10px IBM Plex Mono, monospace';
      ctx.fillText('s →', box.r - 28, box.b + 14);
      ctx.fillText('T', box.l - 16, box.t + 10);
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      state._pts.forEach((p, i) => {
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.stroke();
      state._pts.forEach((p) => {
        ctx.fillStyle = p.key === 'h' || p.key === 'a' ? C.accent : C.vector;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fill();
      });
      const i = Math.floor(state.s) % 4;
      const j = (i + 1) % 4;
      const u = state.s - Math.floor(state.s);
      const x = state._pts[i].x * (1 - u) + state._pts[j].x * u;
      const y = state._pts[i].y * (1 - u) + state._pts[j].y * u;
      ctx.strokeStyle = C.flash || '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.stroke();
    },
    hitTest(state, x, y) {
      if (!dragTs || !state._pts) return null;
      for (const p of state._pts) {
        const dx = x - p.x;
        const dy = y - p.y;
        if (dx * dx + dy * dy < 14 * 14) return p.key;
      }
      return null;
    },
    onPointer(state, ev) {
      if (!dragTs || !state._box) return false;
      const box = state._box;
      if (ev.type === 'down') {
        state.drag = this.hitTest(state, ev.x, ev.y);
        return !!state.drag;
      }
      if (ev.type === 'move' && state.drag) {
        const sn = Math.max(0.12, Math.min(0.92, (ev.x - box.l) / box.w));
        const Tn = 100 + Math.max(0, Math.min(1, (box.b - ev.y) / box.h)) * 800;
        if (state.drag === 'h' || state.drag === 'a') {
          state.params.Th = Tn;
          if (state.drag === 'h') state.params.sHot = sn;
          else state.params.sCold = sn;
        } else {
          state.params.Tc = Math.min(Tn, P(state.params, 'Th', 500) - 10);
          if (state.drag === 'b') state.params.sHot = sn;
          else state.params.sCold = sn;
        }
        return true;
      }
      if (ev.type === 'up') {
        state.drag = null;
        return true;
      }
      return false;
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      const rows = [
        { label: 'η', value: formatNum(state.eta, d) },
        { label: 'Th', value: formatNum(P(state.params, 'Th', 500), 0) },
        { label: 'Tc', value: formatNum(P(state.params, 'Tc', 300), 0) },
      ];
      if (Number.isFinite(state.cop)) rows.push({ label: 'COP', value: formatNum(state.cop, d) });
      return rows;
    },
    getTrajectory() { return []; },
  };
}

function buildFieldlines(spec) {
  return {
    ...baseMeta(spec),
    params: { q1: 1, q2: -1, x1: -1.2, x2: 1.2 },
    paramSchema: {
      q1: schemaNum('q1', 'dynamics', 'C', -5, 5),
      q2: schemaNum('q2', 'dynamics', 'C', -5, 5),
      x1: schemaNum('x1', 'initial', '—', -3, 3),
      x2: schemaNum('x2', 'initial', '—', -3, 3),
    },
    init(state) { state.t = 0; },
    step(state, dt) { state.t += dt; },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const cx = W / 2; const cy = H / 2; const sc = 50;
      title(ctx, spec.name);
      const charges = [
        { q: P(state.params, 'q1', 1), x: P(state.params, 'x1', -1.2), y: 0 },
        { q: P(state.params, 'q2', -1), x: P(state.params, 'x2', 1.2), y: 0 },
      ];
      const field = (x, y) => {
        let ex = 0; let ey = 0;
        for (const c of charges) {
          const dx = x - c.x; const dy = y - c.y;
          const r2 = dx * dx + dy * dy + 0.05;
          const inv = c.q / (r2 * Math.sqrt(r2));
          ex += inv * dx; ey += inv * dy;
        }
        return { ex, ey };
      };
      for (let ang = 0; ang < Math.PI * 2; ang += Math.PI / 6) {
        for (const c of charges) {
          if (c.q === 0) continue;
          let x = c.x + 0.15 * Math.cos(ang);
          let y = c.y + 0.15 * Math.sin(ang);
          ctx.strokeStyle = c.q > 0 ? C.vector : C.accent;
          ctx.beginPath();
          ctx.moveTo(cx + x * sc, cy - y * sc);
          for (let s = 0; s < 40; s += 1) {
            const f = field(x, y);
            const mag = Math.hypot(f.ex, f.ey) || 1;
            const step = 0.08 * Math.sign(c.q);
            x += (f.ex / mag) * step;
            y += (f.ey / mag) * step;
            ctx.lineTo(cx + x * sc, cy - y * sc);
            if (Math.hypot(x, y) > 4) break;
          }
          ctx.stroke();
        }
      }
      for (const c of charges) {
        ctx.fillStyle = c.q >= 0 ? C.body : C.accent;
        ctx.beginPath();
        ctx.arc(cx + c.x * sc, cy - c.y * sc, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    getReadouts(state) {
      return [
        { label: 'q1', value: formatNum(P(state.params, 'q1', 1), 2) },
        { label: 'q2', value: formatNum(P(state.params, 'q2', -1), 2) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildCircuit(spec) {
  const rl = spec.id === 'rl-circuit';
  return {
    ...baseMeta(spec),
    params: rl
      ? { R: 10, L: 0.5, Vin: 5, I0: 0 }
      : { V: 5, R: 100, series: 1 },
    paramSchema: rl
      ? {
        R: schemaNum('R', 'dynamics', 'Ω', 1, 200),
        L: schemaNum('L', 'dynamics', 'H', 0.01, 5),
        Vin: schemaNum('Vin', 'dynamics', 'V', 0, 20),
        I0: schemaNum('I₀', 'initial', 'A', -5, 5),
      }
      : {
        V: schemaNum('V', 'dynamics', 'V', 0, 24),
        R: schemaNum('R', 'dynamics', 'Ω', 1, 1000),
        series: schemaNum('串/并 1/0', 'dynamics', '—', 0, 1),
      },
    init(state) {
      state.t = 0;
      state.I = rl ? P(state.params, 'I0', 0) : 0;
      state.hist = [];
    },
    step(state, dt) {
      if (rl) {
        const R = P(state.params, 'R', 10);
        const L = Math.max(P(state.params, 'L', 0.5), 1e-4);
        const Vin = P(state.params, 'Vin', 5);
        state.I += ((Vin - state.I * R) / L) * dt;
      } else {
        const V = P(state.params, 'V', 5);
        const R = Math.max(P(state.params, 'R', 100), 1e-6);
        state.I = V / R;
      }
      state.t += dt;
      state.hist.push(state.I);
      if (state.hist.length > 200) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l, box.t + 30, box.w * 0.45, box.h * 0.5);
      ctx.fillStyle = C.muted;
      ctx.font = '12px IBM Plex Mono, monospace';
      ctx.fillText(rl ? 'RL' : 'Ohm', box.l + 12, box.t + 55);
      const mid = box.t + box.h * 0.7;
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      state.hist.forEach((v, i) => {
        const x = box.l + (i / 200) * box.w;
        const y = mid - v * 8;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'I', value: `${formatNum(state.I, d)} A` },
      ];
    },
    getTrajectory(state) { return state.hist.map((I, i) => ({ i, I })); },
  };
}

function buildInduction(spec) {
  return {
    ...baseMeta(spec),
    params: { v: 1.2, N: 40, B: 0.8 },
    paramSchema: {
      v: schemaNum('磁铁速度', 'dynamics', '—', 0.1, 5),
      N: schemaNum('匝数', 'dynamics', '—', 1, 200),
      B: schemaNum('B', 'dynamics', 'T', 0.05, 3),
    },
    init(state) { state.t = 0; state.x = 0.1; state.emf = 0; state.hist = []; },
    step(state, dt) {
      const v = P(state.params, 'v', 1.2);
      state.x += v * dt * 0.1;
      if (state.x > 0.9) state.x = 0.1;
      const near = Math.exp(-((state.x - 0.55) ** 2) / 0.01);
      state.emf = P(state.params, 'N', 40) * P(state.params, 'B', 0.8) * v * near * 0.02;
      state.t += dt;
      state.hist.push(state.emf);
      if (state.hist.length > 180) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l + box.w * 0.45, box.t + 40, 50, 80);
      ctx.fillStyle = C.body;
      ctx.fillRect(box.l + state.x * box.w - 12, box.t + 60, 24, 40);
      const mid = box.b - 40;
      ctx.strokeStyle = C.vector;
      ctx.beginPath();
      state.hist.forEach((v, i) => {
        const x = box.l + (i / 180) * box.w;
        const y = mid - v * 20;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 'ε', value: formatNum(state.emf, d) },
        { label: 'x', value: formatNum(state.x, d) },
      ];
    },
    getTrajectory(state) { return state.hist.map((emf, i) => ({ i, emf })); },
  };
}

function lensOptics(params) {
  const u = Math.max(P(params, 'u', 4), 0.05);
  const f = Math.max(P(params, 'f', 2), 0.05);
  const h = P(params, 'h', 1.2);
  const denom = (1 / f) - (1 / u);
  let v = Infinity;
  let m = NaN;
  let kind = '焦点上';
  if (Math.abs(denom) > 1e-6) {
    v = 1 / denom;
    m = -v / u;
    kind = v > 0 ? '实像' : '虚像';
  }
  return { u, f, h, v, m, kind };
}

function buildRays(spec) {
  return {
    ...baseMeta(spec),
    capabilities: spec.id === 'lens'
      ? { pointer: true, interaction: 'canvas', hint: '拖物或拖像：像侧反推物距（双向联动）；虚像虚线' }
      : { interaction: 'knobs', hint: '调节入射角与折射率' },
    params: { theta: 35, n1: 1, n2: 1.5, u: 4, f: 2, h: 1.2, scale: 28 },
    paramSchema: {
      theta: schemaNum('入射角', 'dynamics', '°', 0, 89),
      n1: schemaNum('n₁', 'dynamics', '—', 1, 3),
      n2: schemaNum('n₂', 'dynamics', '—', 1, 3),
      u: schemaNum('物距 u', 'dynamics', '—', 0.2, 30),
      f: schemaNum('焦距 f', 'dynamics', '—', 0.2, 20),
      h: schemaNum('物高 h', 'dynamics', '—', 0.05, 8),
      scale: schemaNum('显示比例', 'dynamics', '—', 8, 60),
    },
    init(state) {
      state.t = 0;
      this.recompute(state);
    },
    recompute(state) {
      if (spec.id === 'lens') {
        const o = lensOptics(state.params);
        state._v = o.v;
        state._m = o.m;
        state._kind = o.kind;
      } else {
        const th1 = (P(state.params, 'theta', 35) * Math.PI) / 180;
        const n1 = Math.max(P(state.params, 'n1', 1), 1e-6);
        const n2 = Math.max(P(state.params, 'n2', 1.5), 1e-6);
        const sn = (n1 / n2) * Math.sin(th1);
        state._th2 = Math.abs(sn) <= 1 ? (Math.asin(sn) * 180) / Math.PI : NaN;
      }
    },
    step(state, dt) {
      state.t += dt;
      this.recompute(state);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const cx = box.l + box.w * 0.5;
      const cy = box.t + box.h * 0.55;
      state._lens = { cx, cy, box };
      this.recompute(state);
      if (spec.id === 'lens') {
        const o = lensOptics(state.params);
        const sc = P(state.params, 'scale', 28);
        const maxX = box.w * 0.42;
        const clampX = (x) => Math.max(-maxX, Math.min(maxX, x));
        ctx.strokeStyle = C.axis;
        ctx.beginPath();
        ctx.moveTo(box.l, cy); ctx.lineTo(box.r, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy - 70); ctx.quadraticCurveTo(cx + 18, cy, cx, cy + 70);
        ctx.moveTo(cx, cy - 70); ctx.quadraticCurveTo(cx - 18, cy, cx, cy + 70);
        ctx.stroke();
        ctx.fillStyle = C.muted;
        ctx.fillRect(cx + o.f * sc - 2, cy - 6, 4, 12);
        ctx.fillRect(cx - o.f * sc - 2, cy - 6, 4, 12);
        ctx.font = '10px IBM Plex Mono, monospace';
        ctx.fillText('F', cx + o.f * sc - 4, cy + 18);
        const ox = cx + clampX(-o.u * sc);
        const oy = cy - o.h * sc * 0.35;
        // 像距/物距刻度尺（原理级，类 oPhysics）
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1;
        const tickY = cy + 28;
        ctx.beginPath();
        ctx.moveTo(cx - maxX, tickY); ctx.lineTo(cx + maxX, tickY);
        ctx.stroke();
        for (let uTick = -Math.floor(maxX / sc); uTick <= Math.floor(maxX / sc); uTick += 1) {
          const tx = cx + uTick * sc;
          if (tx < cx - maxX || tx > cx + maxX) continue;
          ctx.beginPath();
          ctx.moveTo(tx, tickY - 4); ctx.lineTo(tx, tickY + 4);
          ctx.stroke();
          if (uTick !== 0 && uTick % 2 === 0) {
            ctx.fillStyle = C.muted;
            ctx.font = '9px IBM Plex Mono, monospace';
            ctx.fillText(String(uTick), tx - 4, tickY + 14);
          }
        }
        ctx.fillStyle = C.muted;
        ctx.font = '9px IBM Plex Mono, monospace';
        ctx.fillText('轴距', cx - maxX, tickY - 8);

        const hi = state._hoverImg || state._dragObj;
        state._obj = { x: ox, y: Math.min(oy, cy), h: Math.abs(oy - cy) || 2 };
        if (hi) {
          ctx.strokeStyle = C.accent;
          ctx.lineWidth = 2;
          ctx.strokeRect(ox - 6, state._obj.y - 4, 12, state._obj.h + 8);
        }
        ctx.fillStyle = C.accent;
        ctx.fillRect(ox - 2, state._obj.y, 4, state._obj.h);
        ctx.fillStyle = C.accent;
        ctx.font = '12px IBM Plex Mono, monospace';
        ctx.fillText('物 O', ox - 18, state._obj.y - 6);
        // 物距标注
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = C.accent;
        ctx.beginPath();
        ctx.moveTo(ox, cy + 8); ctx.lineTo(cx, cy + 8);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = C.accent;
        ctx.font = '10px IBM Plex Mono, monospace';
        ctx.fillText('u=' + o.u.toFixed(2), (ox + cx) / 2 - 12, cy + 20);

        if (Number.isFinite(o.v)) {
          const ix = cx + clampX(o.v * sc);
          const iy = cy - (Number.isFinite(o.m) ? o.m * o.h * sc * 0.35 : 0);
          state._img = { x: ix, y: Math.min(iy, cy), h: Math.abs(iy - cy) || 2, virtual: o.v < 0 };
          ctx.strokeStyle = C.body;
          ctx.setLineDash(o.v < 0 ? [4, 4] : []);
          ctx.beginPath();
          ctx.moveTo(ox, oy); ctx.lineTo(cx, oy); ctx.lineTo(ix, iy);
          ctx.moveTo(ox, oy); ctx.lineTo(cx, cy); ctx.lineTo(ix, iy);
          ctx.stroke();
          ctx.setLineDash([]);
          if (hi || o.v < 0) {
            ctx.strokeStyle = C.vector;
            ctx.lineWidth = 2;
            ctx.setLineDash(o.v < 0 ? [3, 3] : []);
            ctx.strokeRect(ix - 6, state._img.y - 4, 12, state._img.h + 8);
            ctx.setLineDash([]);
            ctx.lineWidth = 1;
          }
          ctx.fillStyle = C.vector;
          if (o.v < 0) ctx.globalAlpha = 0.55;
          ctx.fillRect(ix - 2, state._img.y, 4, state._img.h);
          ctx.globalAlpha = 1;
          ctx.fillStyle = C.vector;
          ctx.fillText(o.v < 0 ? "虚像 I'" : '实像 I', ix + 6, state._img.y - 6);
          // 像距标注（虚像在物侧）
          ctx.setLineDash(o.v < 0 ? [2, 3] : []);
          ctx.strokeStyle = C.vector;
          ctx.beginPath();
          ctx.moveTo(ix, cy + 8); ctx.lineTo(cx, cy + 8);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = C.vector;
          ctx.font = '10px IBM Plex Mono, monospace';
          ctx.fillText('v=' + o.v.toFixed(2), (ix + cx) / 2 - 12, cy + 20);
        } else {
          state._img = null;
          ctx.strokeStyle = C.body;
          ctx.beginPath();
          ctx.moveTo(ox, oy); ctx.lineTo(cx, oy);
          ctx.moveTo(ox, oy); ctx.lineTo(cx, cy);
          ctx.stroke();
          ctx.fillStyle = C.muted;
          ctx.fillText('u = f · 像在无穷远', box.l + 8, box.b - 8);
        }
        ctx.fillStyle = C.muted;
        ctx.font = '11px IBM Plex Mono, monospace';
        ctx.fillText(o.kind + ' · 拖动物体（物/像联动）', box.l + 8, box.t + 36);
        // 推导式叠画布（窄屏缩写/换行，避免与刻度重叠）
        const narrow = box.w < 420;
        const vStr = Number.isFinite(o.v) ? o.v.toFixed(2) : '∞';
        const mStr = Number.isFinite(o.m) ? o.m.toFixed(2) : '—';
        ctx.fillStyle = state._flashUv ? (C.accent || C.body) : C.muted;
        if (narrow) {
          ctx.font = '600 11px IBM Plex Mono, monospace';
          ctx.fillText('1/u+1/v=1/f', box.l + 8, box.b - 22);
          ctx.fillText(`v=${vStr}  m=${mStr}`, box.l + 8, box.b - 8);
        } else {
          ctx.font = '600 12px IBM Plex Mono, monospace';
          ctx.fillText(`1/u+1/v=1/f  →  v=${vStr}  m=${mStr}`, box.l + 8, box.b - 10);
        }
        if (state._flashUv > 0) state._flashUv -= 1;
      } else {
        const th1 = (P(state.params, 'theta', 35) * Math.PI) / 180;
        const n1 = P(state.params, 'n1', 1);
        const n2 = P(state.params, 'n2', 1.5);
        const sn = (n1 / n2) * Math.sin(th1);
        const th2 = Math.abs(sn) <= 1 ? Math.asin(sn) : null;
        ctx.strokeStyle = C.axis;
        ctx.beginPath();
        ctx.moveTo(cx, box.t); ctx.lineTo(cx, box.b);
        ctx.moveTo(box.l, cy); ctx.lineTo(box.r, cy);
        ctx.stroke();
        const L = 90;
        ctx.strokeStyle = C.body;
        ctx.beginPath();
        ctx.moveTo(cx - L * Math.sin(th1), cy - L * Math.cos(th1));
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.strokeStyle = C.accent;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + L * Math.sin(th1), cy - L * Math.cos(th1));
        ctx.stroke();
        if (th2 != null) {
          ctx.strokeStyle = C.vector;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + L * Math.sin(th2), cy + L * Math.cos(th2));
          ctx.stroke();
        } else {
          ctx.fillStyle = C.muted;
          ctx.font = '12px IBM Plex Mono, monospace';
          ctx.fillText('全反射 TIR', box.l + 8, box.b - 8);
        }
      }
    },
    onPointer(state, ev) {
      if (spec.id !== 'lens' || !state._lens || !state._obj) return false;
      const { cx, cy } = state._lens;
      const sc = P(state.params, 'scale', 28);
      const hitBox = (box, pad = 10) => box && ev.x >= box.x - pad && ev.x <= box.x + pad
        && ev.y >= box.y - pad && ev.y <= box.y + (box.h || 0) + pad;
      if (ev.type === 'down') {
        if (hitBox(state._img, 12)) {
          state._dragImg = true;
          state._dragObj = false;
          state._hoverImg = true;
          return true;
        }
        if (hitBox(state._obj, 10)) {
          state._dragObj = true;
          state._dragImg = false;
          return true;
        }
        return false;
      }
      if (ev.type === 'move' && state._dragObj) {
        const u = Math.max(0.2, (cx - ev.x) / sc);
        const h = Math.max(0.05, (cy - ev.y) / (sc * 0.35));
        state.params.u = u;
        state.params.h = h;
        state._hoverImg = true;
        this.recompute(state);
        return true;
      }
      if (ev.type === 'move' && state._dragImg) {
        // 像侧拖动：由 v 反推 u（1/u+1/v=1/f）
        const f = Math.max(P(state.params, 'f', 2), 0.05);
        let v = (ev.x - cx) / sc;
        if (Math.abs(v) < 0.05) v = v >= 0 ? 0.05 : -0.05;
        const denom = (1 / f) - (1 / v);
        if (Math.abs(denom) > 1e-6) {
          const u = 1 / denom;
          if (u > 0.2 && u < 40) state.params.u = u;
        }
        const imgH = Math.abs(cy - ev.y) / (sc * 0.35);
        if (Number.isFinite(state._m) && Math.abs(state._m) > 1e-6) {
          state.params.h = Math.max(0.05, imgH / Math.abs(state._m));
        } else {
          state.params.h = Math.max(0.05, imgH);
        }
        state._hoverImg = true;
        state._flashUv = 24;
        this.recompute(state);
        return true;
      }
      if (ev.type === 'up') {
        state._dragObj = false;
        state._dragImg = false;
        state._hoverImg = false;
        return true;
      }
      return false;
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      this.recompute(state);
      if (spec.id === 'lens') {
        const o = lensOptics(state.params);
        const rows = [
          { label: 'u', value: formatNum(o.u, d) },
          { label: 'v', value: Number.isFinite(o.v) ? formatNum(o.v, d) : '∞' },
          { label: 'm', value: Number.isFinite(o.m) ? formatNum(o.m, d) : '—' },
          { label: '像', value: o.kind },
        ];
        if (state._dragImg || state._flashUv) {
          rows.unshift({
            label: '推导',
            value: Number.isFinite(o.v)
              ? `1/u=1/f−1/v → u=${formatNum(o.u, d)}`
              : '1/u+1/v=1/f',
          });
        }
        return rows;
      }
      return [
        { label: 'θ1', value: formatNum(P(state.params, 'theta', 35), d) },
        { label: 'θ2', value: Number.isFinite(state._th2) ? formatNum(state._th2, d) : 'TIR' },
      ];
    },
    getTrajectory(state) {
      if (spec.id === 'lens') {
        const o = lensOptics(state.params);
        return [{ u: o.u, f: o.f, v: o.v, m: o.m, kind: o.kind }];
      }
      return [{ theta: P(state.params, 'theta', 35), th2: state._th2 }];
    },
  };
}

function buildGauge(spec) {
  const presets = {
    photoelectric: {
      params: { freq: 2.2, intensity: 1, workFunc: 1.5, speed: 1 },
      schema: {
        freq: schemaNum('hf', 'dynamics', 'eV', 0.1, 20),
        intensity: schemaNum('光强 I', 'dynamics', '—', 0, 10),
        workFunc: schemaNum('逸出功 W', 'dynamics', 'eV', 0.1, 10),
        speed: schemaNum('动画速', 'dynamics', '—', 0.1, 4),
      },
      step(state, dt) {
        state.t += dt * P(state.params, 'speed', 1);
        // Einstein: K_max = max(0, hf − W) does not scale with intensity.
        // `freq` is photon energy in eV (same convention as the topic model).
        const K = Math.max(0, P(state.params, 'freq', 2.2) - P(state.params, 'workFunc', 1.5));
        state.val = K;
        state.rate = K > 0 ? Math.max(0, P(state.params, 'intensity', 1)) : 0;
      },
    },
    'time-dilation': {
      params: { beta: 0.6, properTime: 1, speed: 1 },
      schema: {
        beta: schemaNum('β=v/c', 'dynamics', '—', 0, 0.999),
        properTime: schemaNum('固有时 Δτ', 'dynamics', 's', 0.1, 100),
        speed: schemaNum('动画速', 'dynamics', '—', 0.1, 4),
      },
      step(state, dt) {
        state.t += dt * P(state.params, 'speed', 1);
        const beta = Math.min(0.999, Math.max(0, P(state.params, 'beta', 0.6)));
        state.val = P(state.params, 'properTime', 1) / Math.sqrt(1 - beta * beta);
      },
    },
    polarization: {
      params: { angle: 45, plates: 1, I0: 1, speed: 1 },
      schema: {
        angle: schemaNum('偏振角', 'dynamics', '°', 0, 180),
        plates: schemaNum('偏振片数', 'dynamics', '—', 1, 6),
        I0: schemaNum('入射光强', 'dynamics', '—', 0, 10),
        speed: schemaNum('动画速', 'dynamics', '—', 0.1, 4),
      },
      step(state, dt) {
        state.t += dt * P(state.params, 'speed', 1);
        const n = Math.max(1, Math.round(P(state.params, 'plates', 1)));
        const ang = (P(state.params, 'angle', 45) * Math.PI) / 180;
        state.val = P(state.params, 'I0', 1) * (Math.cos(ang) ** (2 * n));
      },
    },
  };
  const preset = presets[spec.id];
  // No decorative sine fallback — unnamed gauge shells were pruned.
  // Prefer topicModel / a dedicated family builder over this path.
  if (!preset?.step) {
    return {
      ...baseMeta(spec),
      params: { speed: 1 },
      paramSchema: { speed: schemaNum('动画速', 'dynamics', '—', 0.1, 8) },
      init(state) { state.t = 0; state.val = 0; state.hist = []; state.err = 'gauge_unwired'; },
      step(state, dt) { state.t += dt; },
      draw(ctx, state, view) {
        title(ctx, spec.name);
        ctx.fillStyle = C.muted;
        ctx.font = '12px IBM Plex Mono, monospace';
        ctx.fillText('Unwired gauge family — remount on a topic/family engine', 16, 48);
      },
      getReadouts() {
        return [{ label: 'status', value: 'unwired' }];
      },
      getTrajectory() { return []; },
    };
  }
  return {
    ...baseMeta(spec),
    params: preset.params,
    paramSchema: preset.schema,
    init(state) { state.t = 0; state.val = 0; state.hist = []; },
    step(state, dt) {
      preset.step(state, dt);
      state.hist.push(state.val);
      if (state.hist.length > 160) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const mid = box.t + box.h * 0.55;
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      state.hist.forEach((v, i) => {
        const x = box.l + (i / 160) * box.w;
        const y = mid - v * 25;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      ctx.fillStyle = C.accent;
      ctx.font = '14px IBM Plex Mono, monospace';
      ctx.fillText(formatNum(state.val, 3), box.l, box.t + 36);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      const rows = [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'val', value: formatNum(state.val, d) },
      ];
      if (Number.isFinite(state.rate)) rows.push({ label: 'R', value: formatNum(state.rate, d) });
      return rows;
    },
    getTrajectory(state) { return state.hist.map((v, i) => ({ i, v })); },
  };
}

function buildBohr(spec) {
  return {
    ...baseMeta(spec),
    params: { n: 3, n2: 2 },
    paramSchema: {
      n: schemaNum('n上', 'dynamics', '—', 1, 8),
      n2: schemaNum('n下', 'dynamics', '—', 1, 7),
    },
    init(state) { state.t = 0; state.phi = 0; },
    step(state, dt) {
      state.t += dt;
      const n = Math.max(1, Math.round(P(state.params, 'n', 3)));
      state.phi += dt * (1.2 / n);
      state.E = -13.6 / (n * n);
      state.dE = -13.6 / (Math.round(P(state.params, 'n2', 2)) ** 2) - state.E;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const cx = W / 2; const cy = H / 2;
      title(ctx, spec.name);
      const n = Math.max(1, Math.round(P(state.params, 'n', 3)));
      for (let k = 1; k <= 5; k += 1) {
        ctx.strokeStyle = k === n ? C.body : C.axis;
        ctx.beginPath();
        ctx.arc(cx, cy, 18 * k, 0, Math.PI * 2);
        ctx.stroke();
      }
      const r = 18 * n;
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.arc(cx + r * Math.cos(state.phi), cy - r * Math.sin(state.phi), 6, 0, Math.PI * 2);
      ctx.fill();
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 'E', value: `${formatNum(state.E, d)} eV` },
        { label: 'ΔE', value: `${formatNum(state.dE, d)} eV` },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildDecay(spec) {
  return {
    ...baseMeta(spec),
    params: { halfLife: 4, N0: 200 },
    paramSchema: {
      halfLife: schemaNum('半衰期', 'dynamics', 's', 0.5, 30),
      N0: schemaNum('N₀', 'initial', '—', 10, 500),
    },
    init(state) {
      state.t = 0;
      state.N = P(state.params, 'N0', 200);
      state.hist = [];
    },
    step(state, dt) {
      const hl = Math.max(P(state.params, 'halfLife', 4), 0.1);
      const lam = Math.LN2 / hl;
      state.N = P(state.params, 'N0', 200) * Math.exp(-lam * state.t);
      state.t += dt;
      state.hist.push(state.N);
      if (state.hist.length > 200) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const nShow = Math.min(80, Math.round(state.N / Math.max(P(state.params, 'N0', 200) / 80, 1)));
      for (let i = 0; i < nShow; i += 1) {
        ctx.fillStyle = C.body;
        ctx.beginPath();
        ctx.arc(box.l + (i % 10) * 18 + 10, box.t + 40 + Math.floor(i / 10) * 16, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      const mid = box.b - 30;
      ctx.strokeStyle = C.vector;
      ctx.beginPath();
      state.hist.forEach((v, i) => {
        const x = box.l + (i / 200) * box.w;
        const y = mid - (v / P(state.params, 'N0', 200)) * 80;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'N', value: formatNum(state.N, 1) },
      ];
    },
    getTrajectory(state) { return state.hist.map((N, i) => ({ i, N })); },
  };
}

function buildDiscrete(spec) {
  return {
    ...baseMeta(spec),
    params: {
      n: 16, target: 7, seed: 3, stepDt: 0.12, algo: 0, capacity: 8, capacityKnapsack: 10,
    },
    paramSchema: {
      n: schemaNum('n', 'numerics', '—', 4, 48),
      target: schemaNum('目标', 'dynamics', '—', 0, 64),
      seed: schemaNum('seed', 'initial', '—', 1, 999),
      stepDt: schemaNum('stepDt', 'dynamics', 's', 0.02, 0.5),
      algo: {
        group: 'dynamics', unit: '', label: 'algo', min: 0, max: 3,
        options: spec.id === 'binary-search'
          ? [{ value: 0, label: 'binary' }]
          : [{ value: 0, label: 'mode A' }, { value: 1, label: 'mode B' }],
      },
      capacity: schemaNum('容量', 'dynamics', '—', 2, 32),
      capacityKnapsack: schemaNum('背包容量', 'dynamics', '—', 2, 40),
    },
    init(state) {
      const n = Math.max(4, Math.floor(P(state.params, 'n', 16)));
      const r = rnd(P(state.params, 'seed', 3));
      state.arr = Array.from({ length: n }, (_, i) => i);
      if (spec.id !== 'binary-search') state.arr = state.arr.map(() => Math.floor(r() * 40));
      state.lo = 0;
      state.hi = n - 1;
      state.mid = -1;
      state.found = false;
      state.t = 0;
      state.acc = 0;
      state.step = 0;
      state.cursor = 0;
      state.table = Array.from({ length: 6 }, () => Array(8).fill(0));
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      const period = Math.max(P(state.params, 'stepDt', 0.12), 0.02);
      while (state.acc >= period) {
        state.acc -= period;
        state.step += 1;
        if (spec.id === 'binary-search') {
          if (state.found || state.lo > state.hi) break;
          state.mid = (state.lo + state.hi) >> 1;
          const target = Math.round(P(state.params, 'target', 7));
          if (state.arr[state.mid] === target) state.found = true;
          else if (state.arr[state.mid] < target) state.lo = state.mid + 1;
          else state.hi = state.mid - 1;
        } else if (spec.id === 'dp-table') {
          const rows = state.table.length;
          const cols = state.table[0].length;
          const i = state.step % rows;
          const j = Math.floor(state.step / rows) % cols;
          state.table[i][j] = (i === 0 || j === 0) ? 0 : Math.max(state.table[i - 1][j], state.table[i][j - 1] + ((i + j) % 3));
          state.cursor = i * cols + j;
        } else if (spec.id === 'hashtable') {
          state.cursor = (state.cursor + 1) % Math.max(Math.floor(P(state.params, 'capacity', 8)), 2);
        } else {
          state.cursor = (state.cursor + 1) % state.arr.length;
        }
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      if (spec.id === 'dp-table') {
        const rows = state.table.length; const cols = state.table[0].length;
        const cw = box.w / cols; const ch = (box.h - 20) / rows;
        for (let i = 0; i < rows; i += 1) {
          for (let j = 0; j < cols; j += 1) {
            const idx = i * cols + j;
            ctx.fillStyle = idx === state.cursor ? C.accent : heatTempColor(state.table[i][j], 0, 12);
            ctx.fillRect(box.l + j * cw, box.t + 20 + i * ch, cw - 1, ch - 1);
          }
        }
      } else {
        const n = state.arr.length;
        const bw = box.w / n;
        for (let i = 0; i < n; i += 1) {
          let fill = C.body;
          if (spec.id === 'binary-search') {
            if (i < state.lo || i > state.hi) fill = C.axis;
            if (i === state.mid) fill = C.accent;
          } else if (i === state.cursor) fill = C.accent;
          ctx.fillStyle = fill;
          const h = 20 + (state.arr[i] % 20) * 4;
          ctx.fillRect(box.l + i * bw + 1, box.b - h, Math.max(2, bw - 2), h);
        }
      }
    },
    getReadouts(state) {
      return [
        { label: 'step', value: String(state.step) },
        { label: 'lo/hi', value: `${state.lo}/${state.hi}` },
        { label: 'found', value: state.found ? 'yes' : 'no' },
      ];
    },
    getTrajectory(state) { return state.arr.map((v, i) => ({ i, v })); },
  };
}

function buildGraph(spec) {
  return {
    ...baseMeta(spec),
    params: { nodes: 8, seed: 5, start: 0, goal: 7, stepDt: 0.15, algo: 0, layoutSteps: 40 },
    paramSchema: {
      nodes: schemaNum('节点数', 'numerics', '—', 4, 16),
      seed: schemaNum('随机种子', 'initial', '—', 1, 99),
      start: schemaNum('起点', 'initial', '—', 0, 15),
      goal: schemaNum('终点', 'initial', '—', 0, 15),
      stepDt: schemaNum('步进间隔', 'dynamics', 's', 0.05, 0.5),
      layoutSteps: schemaNum('力导向步数', 'numerics', '—', 0, 120),
      algo: {
        group: 'dynamics', unit: '—', label: '算法', min: 0, max: 2,
        options: [{ value: 0, label: 'Dijkstra' }, { value: 1, label: 'A*' }, { value: 2, label: 'BFS' }],
      },
    },
    init(state) {
      const n = Math.max(4, Math.floor(P(state.params, 'nodes', 8)));
      const r = rnd(P(state.params, 'seed', 5));
      state.nodes = Array.from({ length: n }, (_, i) => ({
        x: 0.15 + r() * 0.7,
        y: 0.15 + r() * 0.7,
        i,
      }));
      state.edges = [];
      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          if (r() < 0.35) state.edges.push({ a: i, b: j, w: 1 + Math.floor(r() * 9) });
        }
      }
      // eigenvue 思路：力导向松弛 layoutSteps 步再映射画布
      const W = 400; const H = 300;
      const steps = Math.max(0, Math.floor(P(state.params, 'layoutSteps', 40)));
      const px = state.nodes.map((n) => ({ x: n.x * W, y: n.y * H }));
      for (let k = 0; k < steps; k += 1) forceGraphStep(px, state.edges, { W, H, pad: 24 });
      state.nodes = px.map((p, i) => ({
        i,
        x: Math.max(0.05, Math.min(0.95, p.x / W)),
        y: Math.max(0.05, Math.min(0.95, p.y / H)),
      }));
      state.visit = new Set();
      state.frontier = [Math.min(Math.floor(P(state.params, 'start', 0)), n - 1)];
      state.parent = {};
      state.t = 0;
      state.acc = 0;
      state.done = false;
      state.path = [];
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      const period = Math.max(P(state.params, 'stepDt', 0.15), 0.05);
      while (state.acc >= period && !state.done) {
        state.acc -= period;
        if (!state.frontier.length) { state.done = true; break; }
        const u = state.frontier.shift();
        if (state.visit.has(u)) continue;
        state.visit.add(u);
        const goal = Math.min(Math.floor(P(state.params, 'goal', 7)), state.nodes.length - 1);
        if (u === goal) {
          state.done = true;
          const path = [u];
          let cur = u;
          while (state.parent[cur] != null) {
            cur = state.parent[cur];
            path.push(cur);
          }
          state.path = path.reverse();
          break;
        }
        for (const e of state.edges) {
          const v = e.a === u ? e.b : (e.b === u ? e.a : null);
          if (v == null || state.visit.has(v)) continue;
          if (state.parent[v] == null) state.parent[v] = u;
          state.frontier.push(v);
        }
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      const screen = mapNormToScreen(state.nodes, W, H, 40);
      const hi = new Set([...state.visit, ...state.frontier]);
      paintGraph(ctx, screen, state.edges, {
        highlight: hi,
        path: state.path || [],
        edgeColor: C.axis,
        nodeColor: C.muted,
        accent: C.accent,
        r: 8,
      });
      state.nodes.forEach((_, i) => {
        const p = screen[i];
        let fill = null;
        if (state.frontier.includes(i)) fill = C.vector;
        if (state.visit.has(i)) fill = C.body;
        if (fill) {
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    },
    getReadouts(state) {
      return [
        { label: 'visited', value: String(state.visit.size) },
        { label: 'frontier', value: String(state.frontier.length) },
        { label: 'path', value: String(state.path.length) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildTree(spec) {
  return {
    ...baseMeta(spec),
    params: { seed: 4, n: 12, stepDt: 0.2 },
    paramSchema: {
      seed: schemaNum('seed', 'initial', '—', 1, 99),
      n: schemaNum('n', 'numerics', '—', 4, 24),
      stepDt: schemaNum('stepDt', 'dynamics', 's', 0.05, 0.6),
    },
    init(state) {
      const r = rnd(P(state.params, 'seed', 4));
      const n = Math.floor(P(state.params, 'n', 12));
      state.keys = Array.from({ length: n }, () => Math.floor(r() * 90));
      state.shown = 1;
      state.t = 0;
      state.acc = 0;
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc > P(state.params, 'stepDt', 0.2) && state.shown < state.keys.length) {
        state.acc = 0;
        state.shown += 1;
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      const keys = state.keys.slice(0, state.shown).slice().sort((a, b) => a - b);
      const levels = Math.ceil(Math.log2(keys.length + 1));
      const drawNode = (i, x, y, spread) => {
        if (i >= keys.length) return;
        ctx.fillStyle = C.body;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.font = '10px IBM Plex Mono, monospace';
        ctx.fillText(String(keys[i]), x - 8, y + 3);
        const L = 2 * i + 1; const R = 2 * i + 2;
        if (L < keys.length) {
          ctx.strokeStyle = C.axis;
          ctx.beginPath();
          ctx.moveTo(x, y + 12); ctx.lineTo(x - spread, y + 50);
          ctx.stroke();
          drawNode(L, x - spread, y + 50, spread * 0.55);
        }
        if (R < keys.length) {
          ctx.strokeStyle = C.axis;
          ctx.beginPath();
          ctx.moveTo(x, y + 12); ctx.lineTo(x + spread, y + 50);
          ctx.stroke();
          drawNode(R, x + spread, y + 50, spread * 0.55);
        }
      };
      drawNode(0, W / 2, 50, Math.min(140, W * 0.22));
      void levels;
    },
    getReadouts(state) {
      return [
        { label: 'shown', value: String(state.shown) },
        { label: 'n', value: String(state.keys.length) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildFsm(spec) {
  return {
    ...baseMeta(spec),
    params: { input: 10110, stepDt: 0.35 },
    paramSchema: {
      input: schemaNum('输入串(十进制示意)', 'initial', '—', 0, 111111),
      stepDt: schemaNum('stepDt', 'dynamics', 's', 0.1, 1),
    },
    init(state) {
      state.states = ['q0', 'q1', 'q2', 'q3'];
      state.idx = 0;
      state.tape = String(Math.floor(P(state.params, 'input', 10110))).split('');
      state.pos = 0;
      state.t = 0;
      state.acc = 0;
      state.stack = [];
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < P(state.params, 'stepDt', 0.35)) return;
      state.acc = 0;
      if (state.pos >= state.tape.length) return;
      const bit = state.tape[state.pos];
      state.idx = (state.idx + Number(bit || 0) + 1) % state.states.length;
      if (spec.id === 'pda') state.stack.push(bit);
      if (state.stack.length > 8) state.stack.shift();
      state.pos += 1;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      state.states.forEach((s, i) => {
        const x = 80 + i * 90;
        const y = H * 0.35;
        ctx.strokeStyle = i === state.idx ? C.accent : C.axis;
        ctx.lineWidth = i === state.idx ? 3 : 1;
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = C.muted;
        ctx.font = '12px IBM Plex Mono, monospace';
        ctx.fillText(s, x - 10, y + 4);
        if (i < state.states.length - 1) {
          ctx.strokeStyle = C.axis;
          ctx.beginPath();
          ctx.moveTo(x + 22, y); ctx.lineTo(x + 68, y);
          ctx.stroke();
        }
      });
      ctx.fillStyle = C.body;
      ctx.font = '14px IBM Plex Mono, monospace';
      ctx.fillText(state.tape.join(' '), 60, H * 0.7);
      if (state.pos < state.tape.length) {
        ctx.fillStyle = C.accent;
        ctx.fillRect(60 + state.pos * 8.5, H * 0.72, 8, 3);
      }
      if (spec.id === 'pda') ctx.fillText(`stack: ${state.stack.join('')}`, 60, H * 0.82);
    },
    getReadouts(state) {
      return [
        { label: 'state', value: state.states[state.idx] },
        { label: 'pos', value: String(state.pos) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildTuring(spec) {
  return {
    ...baseMeta(spec),
    params: { tape: 1001101, stepDt: 0.25 },
    paramSchema: {
      tape: schemaNum('纸带初值', 'initial', '—', 0, 11111111),
      stepDt: schemaNum('stepDt', 'dynamics', 's', 0.05, 1),
    },
    init(state) {
      state.tape = String(Math.floor(P(state.params, 'tape', 1001101))).padStart(16, '0').split('');
      state.head = 4;
      state.state = 'A';
      state.t = 0;
      state.acc = 0;
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < P(state.params, 'stepDt', 0.25)) return;
      state.acc = 0;
      const cell = state.tape[state.head] || '0';
      if (state.state === 'A') {
        state.tape[state.head] = cell === '0' ? '1' : '0';
        state.head = Math.min(state.tape.length - 1, state.head + 1);
        state.state = 'B';
      } else {
        state.head = Math.max(0, state.head - 1);
        state.state = 'A';
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      const y = H * 0.45;
      state.tape.forEach((c, i) => {
        const x = 40 + i * 28;
        ctx.strokeStyle = i === state.head ? C.accent : C.axis;
        ctx.strokeRect(x, y, 24, 28);
        ctx.fillStyle = C.body;
        ctx.font = '14px IBM Plex Mono, monospace';
        ctx.fillText(c, x + 7, y + 19);
      });
      ctx.fillStyle = C.muted;
      ctx.fillText(`state ${state.state}`, 40, y + 60);
    },
    getReadouts(state) {
      return [
        { label: 'state', value: state.state },
        { label: 'head', value: String(state.head) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildCrypto(spec) {
  return {
    ...baseMeta(spec),
    params: { key: 3, p: 17, q: 11, e: 7, msg: 42, g: 3 },
    paramSchema: {
      key: schemaNum('key', 'dynamics', '—', 0, 25),
      p: schemaNum('p', 'dynamics', '—', 5, 97),
      q: schemaNum('q', 'dynamics', '—', 5, 97),
      e: schemaNum('e', 'dynamics', '—', 3, 40),
      msg: schemaNum('msg', 'initial', '—', 0, 200),
      g: schemaNum('g', 'dynamics', '—', 2, 20),
    },
    init(state) { state.t = 0; state.out = ''; },
    step(state, dt) {
      state.t += dt;
      if (spec.id === 'caesar') {
        const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const k = Math.round(P(state.params, 'key', 3));
        state.out = 'HELLO'.split('').map((ch) => alpha[(alpha.indexOf(ch) + k) % 26]).join('');
      } else if (spec.id === 'rsa') {
        const p = Math.round(P(state.params, 'p', 17));
        const q = Math.round(P(state.params, 'q', 11));
        const n = p * q;
        const e = Math.round(P(state.params, 'e', 7));
        const m = Math.round(P(state.params, 'msg', 42)) % n;
        let c = 1;
        for (let i = 0; i < e; i += 1) c = (c * m) % n;
        state.out = String(c);
        state.n = n;
      } else {
        const p = Math.round(P(state.params, 'p', 23));
        const g = Math.round(P(state.params, 'g', 5));
        const a = Math.round(P(state.params, 'key', 6));
        let A = 1;
        for (let i = 0; i < a; i += 1) A = (A * g) % p;
        state.out = String(A);
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      ctx.fillStyle = C.body;
      ctx.font = '22px IBM Plex Mono, monospace';
      ctx.fillText(state.out || '—', 48, H * 0.45);
      ctx.fillStyle = C.muted;
      ctx.font = '12px IBM Plex Mono, monospace';
      ctx.fillText(spec.formula || '', 48, H * 0.55);
    },
    getReadouts(state) {
      return [
        { label: 'out', value: state.out || '—' },
        { label: 't', value: formatNum(state.t, 2) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildMl(spec) {
  return {
    ...baseMeta(spec),
    params: { lr: 0.05, k: 3, seed: 2, steps: 1 },
    paramSchema: {
      lr: schemaNum('学习率', 'dynamics', '—', 0.001, 1),
      k: schemaNum('k/宽度', 'dynamics', '—', 1, 8),
      seed: schemaNum('seed', 'initial', '—', 1, 99),
      steps: schemaNum('每帧步数', 'dynamics', '—', 1, 20),
    },
    init(state) {
      const r = rnd(P(state.params, 'seed', 2));
      state.pts = Array.from({ length: 36 }, () => ({ x: r(), y: r() * 0.8 + 0.1 * r(), c: 0 }));
      state.w = r() - 0.5;
      state.b = r() - 0.5;
      state.loss = 1;
      state.t = 0;
      state.centers = Array.from({ length: Math.max(1, Math.round(P(state.params, 'k', 3))) }, () => ({ x: r(), y: r() }));
      state.attn = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => r()));
    },
    step(state, dt) {
      state.t += dt;
      const lr = P(state.params, 'lr', 0.05);
      const steps = Math.max(1, Math.round(P(state.params, 'steps', 1)));
      for (let s = 0; s < steps; s += 1) {
        if (spec.id === 'kmeans') {
          for (const p of state.pts) {
            let best = 0; let bd = 1e9;
            state.centers.forEach((c, i) => {
              const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
              if (d < bd) { bd = d; best = i; }
            });
            p.c = best;
          }
          state.centers.forEach((c, i) => {
            const group = state.pts.filter((p) => p.c === i);
            if (!group.length) return;
            c.x = group.reduce((a, p) => a + p.x, 0) / group.length;
            c.y = group.reduce((a, p) => a + p.y, 0) / group.length;
          });
        } else if (spec.id === 'attention') {
          for (let i = 0; i < 6; i += 1) {
            for (let j = 0; j < 6; j += 1) {
              state.attn[i][j] = 0.7 * state.attn[i][j] + 0.3 * Math.abs(Math.sin(state.t + i + j));
            }
          }
        } else {
          let gw = 0; let gb = 0; let loss = 0;
          for (const p of state.pts) {
            const yhat = state.w * p.x + state.b;
            const err = yhat - p.y;
            loss += err * err;
            gw += err * p.x;
            gb += err;
          }
          state.w -= lr * gw / state.pts.length;
          state.b -= lr * gb / state.pts.length;
          state.loss = loss / state.pts.length;
        }
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      if (spec.id === 'attention') {
        const n = 6; const cw = box.w / n; const ch = box.h / n;
        for (let i = 0; i < n; i += 1) {
          for (let j = 0; j < n; j += 1) {
            ctx.fillStyle = heatTempColor(state.attn[i][j], 0, 1);
            ctx.fillRect(box.l + j * cw, box.t + i * ch, cw - 1, ch - 1);
          }
        }
        return;
      }
      for (const p of state.pts) {
        ctx.fillStyle = spec.id === 'kmeans' ? [C.body, C.accent, C.vector, C.theory][p.c % 4] : C.body;
        ctx.beginPath();
        ctx.arc(box.l + p.x * box.w, box.b - p.y * box.h, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (spec.id === 'kmeans') {
        for (const c of state.centers) {
          ctx.strokeStyle = C.accent;
          ctx.strokeRect(box.l + c.x * box.w - 6, box.b - c.y * box.h - 6, 12, 12);
        }
      } else {
        ctx.strokeStyle = C.vector;
        ctx.beginPath();
        ctx.moveTo(box.l, box.b - (state.b) * box.h);
        ctx.lineTo(box.r, box.b - (state.w + state.b) * box.h);
        ctx.stroke();
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 'loss', value: formatNum(state.loss || 0, d) },
        { label: 'w', value: formatNum(state.w, d) },
        { label: 't', value: formatNum(state.t, d) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildOpt(spec) {
  return {
    ...baseMeta(spec),
    params: { pop: 20, mutate: 0.1, temp: 5, cool: 0.98, ants: 12, evaporate: 0.1, seed: 1 },
    paramSchema: {
      pop: schemaNum('种群', 'dynamics', '—', 4, 60),
      mutate: schemaNum('变异率', 'dynamics', '—', 0, 1),
      temp: schemaNum('温度', 'dynamics', '—', 0.1, 20),
      cool: schemaNum('降温', 'dynamics', '—', 0.8, 0.999),
      ants: schemaNum('蚂蚁数', 'dynamics', '—', 2, 40),
      evaporate: schemaNum('挥发', 'dynamics', '—', 0.01, 0.5),
      seed: schemaNum('seed', 'initial', '—', 1, 99),
    },
    init(state) {
      const r = rnd(P(state.params, 'seed', 1));
      state.best = r();
      state.energy = (state.best - 0.6) ** 2;
      state.temp = P(state.params, 'temp', 5);
      state.t = 0;
      state.hist = [];
      state.pher = Array.from({ length: 24 }, () => r());
    },
    step(state, dt) {
      state.t += dt;
      const r = Math.random();
      if (spec.id === 'sim-anneal') {
        const cand = state.best + (r - 0.5) * 0.2;
        const e = (cand - 0.6) ** 2;
        const dE = e - state.energy;
        if (dE < 0 || Math.exp(-dE / Math.max(state.temp, 1e-3)) > Math.random()) {
          state.best = cand;
          state.energy = e;
        }
        state.temp *= P(state.params, 'cool', 0.98);
      } else if (spec.id === 'ant-colony') {
        for (let i = 0; i < state.pher.length; i += 1) {
          state.pher[i] *= (1 - P(state.params, 'evaporate', 0.1));
          state.pher[i] += (Math.random() < 0.2 ? 0.3 : 0);
        }
        state.best = state.pher.indexOf(Math.max(...state.pher)) / state.pher.length;
        state.energy = 1 - Math.max(...state.pher);
      } else {
        const mut = P(state.params, 'mutate', 0.1);
        const cand = state.best + (r - 0.5) * mut;
        const e = (cand - 0.6) ** 2;
        if (e < state.energy) { state.best = cand; state.energy = e; }
      }
      state.hist.push(state.energy);
      if (state.hist.length > 160) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const mid = box.t + box.h * 0.55;
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      state.hist.forEach((v, i) => {
        const x = box.l + (i / 160) * box.w;
        const y = mid - v * 80;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      if (spec.id === 'ant-colony') {
        state.pher.forEach((p, i) => {
          ctx.fillStyle = heatTempColor(p, 0, 1);
          ctx.fillRect(box.l + (i / state.pher.length) * box.w, box.b - 30, box.w / state.pher.length, 16);
        });
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 'E', value: formatNum(state.energy, d) },
        { label: 'best', value: formatNum(state.best, d) },
        { label: 'T', value: formatNum(state.temp, d) },
      ];
    },
    getTrajectory(state) { return state.hist.map((E, i) => ({ i, E })); },
  };
}

function buildLogic(spec) {
  return {
    ...baseMeta(spec),
    params: { a: 1, b: 0, clk: 1, mode: 0 },
    paramSchema: {
      a: schemaNum('A', 'dynamics', '—', 0, 1),
      b: schemaNum('B', 'dynamics', '—', 0, 1),
      clk: schemaNum('CLK', 'dynamics', '—', 0, 1),
      mode: {
        group: 'dynamics', unit: '', label: 'mode', min: 0, max: 3,
        options: [
          { value: 0, label: 'AND' }, { value: 1, label: 'OR' },
          { value: 2, label: 'XOR' }, { value: 3, label: 'NAND' },
        ],
      },
    },
    init(state) { state.t = 0; state.q = 0; state.wave = []; },
    step(state, dt) {
      state.t += dt;
      const a = Math.round(P(state.params, 'a', 1)) & 1;
      const b = Math.round(P(state.params, 'b', 0)) & 1;
      const mode = Math.round(P(state.params, 'mode', 0));
      let y = 0;
      if (mode === 0) y = a & b;
      else if (mode === 1) y = a | b;
      else if (mode === 2) y = a ^ b;
      else y = (a & b) ^ 1;
      if (/flip|counter/.test(spec.id)) {
        const clk = Math.round(P(state.params, 'clk', 1)) & 1;
        if (clk && !state.prevClk) state.q = a;
        state.prevClk = clk;
        y = state.q;
      }
      if (spec.id === 'adder') y = a + b;
      state.y = y;
      state.wave.push(y);
      if (state.wave.length > 120) state.wave.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      ctx.fillStyle = C.muted;
      ctx.font = '14px IBM Plex Mono, monospace';
      ctx.fillText(`A=${Math.round(P(state.params, 'a', 1))}  B=${Math.round(P(state.params, 'b', 0))}  Y=${state.y}`, box.l, box.t + 40);
      const mid = box.t + box.h * 0.6;
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      state.wave.forEach((v, i) => {
        const x = box.l + (i / 120) * box.w;
        const y = mid - v * 28;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    },
    getReadouts(state) {
      return [
        { label: 'Y', value: String(state.y) },
        { label: 't', value: formatNum(state.t, 2) },
      ];
    },
    getTrajectory(state) { return state.wave.map((y, i) => ({ i, y })); },
  };
}

function buildArch(spec) {
  return {
    ...baseMeta(spec),
    params: { pc: 0, stepDt: 0.3, pages: 8, cacheLines: 4 },
    paramSchema: {
      pc: schemaNum('PC', 'initial', '—', 0, 32),
      stepDt: schemaNum('stepDt', 'dynamics', 's', 0.05, 1),
      pages: schemaNum('页数', 'numerics', '—', 2, 32),
      cacheLines: schemaNum('cache行', 'numerics', '—', 2, 16),
    },
    init(state) {
      state.t = 0;
      state.acc = 0;
      state.pc = Math.floor(P(state.params, 'pc', 0));
      state.stage = 0;
      state.regs = [0, 0, 0, 0];
      state.hit = 0;
      state.miss = 0;
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < P(state.params, 'stepDt', 0.3)) return;
      state.acc = 0;
      state.stage = (state.stage + 1) % 5;
      if (state.stage === 0) state.pc += 1;
      state.regs[state.pc % 4] = (state.regs[state.pc % 4] + state.pc) % 256;
      if (Math.random() < 0.6) state.hit += 1; else state.miss += 1;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      const stages = ['IF', 'ID', 'EX', 'MEM', 'WB'];
      stages.forEach((s, i) => {
        const x = 40 + i * 70;
        ctx.fillStyle = i === state.stage ? C.accent : C.axis;
        ctx.fillRect(x, H * 0.35, 58, 36);
        ctx.fillStyle = '#111';
        ctx.font = '12px IBM Plex Mono, monospace';
        ctx.fillText(s, x + 16, H * 0.35 + 22);
      });
      ctx.fillStyle = C.muted;
      ctx.fillText(`PC=${state.pc}  regs=[${state.regs.join(',')}]`, 40, H * 0.6);
    },
    getReadouts(state) {
      return [
        { label: 'PC', value: String(state.pc) },
        { label: 'stage', value: String(state.stage) },
        { label: 'hit%', value: formatNum((100 * state.hit) / Math.max(1, state.hit + state.miss), 1) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildEmbed(spec) {
  return {
    ...baseMeta(spec),
    params: { duty: 0.4, freq: 2, bits: 4, rate: 8 },
    paramSchema: {
      duty: schemaNum('占空比', 'dynamics', '—', 0.05, 0.95),
      freq: schemaNum('频率', 'dynamics', 'Hz', 0.2, 10),
      bits: schemaNum('位数', 'dynamics', '—', 2, 12),
      rate: schemaNum('采样率', 'dynamics', 'Hz', 1, 40),
    },
    init(state) { state.t = 0; state.wave = []; state.samples = []; },
    step(state, dt) {
      state.t += dt;
      const f = P(state.params, 'freq', 2);
      const duty = P(state.params, 'duty', 0.4);
      const phase = (state.t * f) % 1;
      const pwm = phase < duty ? 1 : 0;
      const analog = Math.sin(2 * Math.PI * f * state.t);
      state.val = spec.id === 'pwm' ? pwm : analog;
      state.wave.push(state.val);
      if (state.wave.length > 160) state.wave.shift();
      if (spec.id === 'adc-dac') {
        const bits = Math.round(P(state.params, 'bits', 4));
        const levels = 2 ** bits;
        state.q = Math.round((analog + 1) * 0.5 * (levels - 1)) / (levels - 1) * 2 - 1;
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const mid = box.t + box.h * 0.5;
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      state.wave.forEach((v, i) => {
        const x = box.l + (i / 160) * box.w;
        const y = mid - v * 40;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 'val', value: formatNum(state.val, d) },
        { label: 'q', value: formatNum(state.q || 0, d) },
      ];
    },
    getTrajectory(state) { return state.wave.map((v, i) => ({ i, v })); },
  };
}

function buildComm(spec) {
  return {
    ...baseMeta(spec),
    params: { fc: 8, fm: 1, beta: 1.5, data: 0b10110101, errBit: 3 },
    paramSchema: {
      fc: schemaNum('载波 f', 'dynamics', 'Hz', 1, 20),
      fm: schemaNum('调制 f', 'dynamics', 'Hz', 0.2, 5),
      beta: schemaNum('调制指数', 'dynamics', '—', 0.1, 5),
      data: schemaNum('数据', 'initial', '—', 0, 255),
      errBit: schemaNum('错误位', 'dynamics', '—', 0, 15),
    },
    init(state) { state.t = 0; state.wave = []; },
    step(state, dt) {
      state.t += dt;
      const fc = P(state.params, 'fc', 8);
      const fm = P(state.params, 'fm', 1);
      const beta = P(state.params, 'beta', 1.5);
      const m = Math.sin(2 * Math.PI * fm * state.t);
      state.val = Math.sin(2 * Math.PI * fc * state.t + beta * m);
      state.wave.push(state.val);
      if (state.wave.length > 180) state.wave.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const mid = box.t + box.h * 0.5;
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      state.wave.forEach((v, i) => {
        const x = box.l + (i / 180) * box.w;
        const y = mid - v * 40;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      if (spec.id !== 'am-fm') {
        const bits = Math.floor(P(state.params, 'data', 0b10110101)).toString(2).padStart(8, '0');
        ctx.fillStyle = C.muted;
        ctx.font = '14px IBM Plex Mono, monospace';
        ctx.fillText(bits, box.l, box.b - 20);
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [{ label: 's(t)', value: formatNum(state.val, d) }, { label: 't', value: formatNum(state.t, d) }];
    },
    getTrajectory(state) { return state.wave.map((v, i) => ({ i, v })); },
  };
}

function buildNet(spec) {
  return {
    ...baseMeta(spec),
    params: { loss: 0.1, delay: 0.2, stepDt: 0.35 },
    paramSchema: {
      loss: schemaNum('丢包率', 'dynamics', '—', 0, 0.8),
      delay: schemaNum('延迟', 'dynamics', 's', 0, 2),
      stepDt: schemaNum('stepDt', 'dynamics', 's', 0.1, 1),
    },
    init(state) {
      state.t = 0;
      state.acc = 0;
      state.phase = 0;
      state.log = [];
      state.client = 'CLOSED';
      state.server = 'LISTEN';
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < P(state.params, 'stepDt', 0.35) + P(state.params, 'delay', 0.2) * 0.2) return;
      state.acc = 0;
      if (Math.random() < P(state.params, 'loss', 0.1)) {
        state.log.push('LOSS');
        return;
      }
      const seq = [
        ['SYN_SENT', 'SYN_RCVD', 'SYN'],
        ['ESTABLISHED', 'ESTABLISHED', 'SYN-ACK'],
        ['ESTABLISHED', 'ESTABLISHED', 'ACK'],
        ['FIN_WAIT', 'CLOSE_WAIT', 'FIN'],
        ['CLOSED', 'CLOSED', 'ACK'],
      ];
      const row = seq[Math.min(state.phase, seq.length - 1)];
      state.client = row[0];
      state.server = row[1];
      state.log.push(row[2]);
      if (state.log.length > 8) state.log.shift();
      state.phase = Math.min(state.phase + 1, seq.length - 1);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      ctx.fillStyle = C.body;
      ctx.font = '14px IBM Plex Mono, monospace';
      ctx.fillText(`client: ${state.client}`, 40, H * 0.35);
      ctx.fillText(`server: ${state.server}`, 40, H * 0.45);
      ctx.fillStyle = C.muted;
      ctx.fillText(state.log.join(' → '), 40, H * 0.6);
    },
    getReadouts(state) {
      return [
        { label: 'phase', value: String(state.phase) },
        { label: 'client', value: state.client },
        { label: 'server', value: state.server },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildOs(spec) {
  return {
    ...baseMeta(spec),
    params: { algo: 0, quantum: 2, n: 4, seed: 2 },
    paramSchema: {
      algo: {
        group: 'dynamics', unit: '', label: 'algo', min: 0, max: 2,
        options: [{ value: 0, label: 'FCFS' }, { value: 1, label: 'RR' }, { value: 2, label: 'Priority' }],
      },
      quantum: schemaNum('时间片', 'dynamics', '—', 1, 10),
      n: schemaNum('进程数', 'numerics', '—', 2, 8),
      seed: schemaNum('seed', 'initial', '—', 1, 99),
    },
    init(state) {
      const r = rnd(P(state.params, 'seed', 2));
      const n = Math.floor(P(state.params, 'n', 4));
      state.jobs = Array.from({ length: n }, (_, i) => ({
        id: i, burst: 2 + Math.floor(r() * 6), left: 0, prio: Math.floor(r() * 5),
      }));
      state.jobs.forEach((j) => { j.left = j.burst; });
      state.t = 0;
      state.cur = 0;
      state.gantt = [];
      state.acc = 0;
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < 0.2) return;
      state.acc = 0;
      const alive = state.jobs.filter((j) => j.left > 0);
      if (!alive.length) return;
      const algo = Math.round(P(state.params, 'algo', 0));
      if (algo === 2) alive.sort((a, b) => a.prio - b.prio);
      state.cur = alive[0].id;
      alive[0].left -= 1;
      state.gantt.push(state.cur);
      if (state.gantt.length > 40) state.gantt.shift();
      if (algo === 1) {
        // RR rotate
        state.jobs.push(state.jobs.shift());
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const colors = [C.body, C.accent, C.vector, C.theory, C.muted];
      state.gantt.forEach((id, i) => {
        ctx.fillStyle = colors[id % colors.length];
        ctx.fillRect(box.l + i * 12, box.t + 50, 10, 28);
      });
      state.jobs.forEach((j, i) => {
        ctx.fillStyle = C.muted;
        ctx.font = '12px IBM Plex Mono, monospace';
        ctx.fillText(`P${j.id} left=${j.left} prio=${j.prio}`, box.l, box.t + 110 + i * 18);
      });
    },
    getReadouts(state) {
      return [
        { label: 'cur', value: `P${state.cur}` },
        { label: 't', value: formatNum(state.t, 2) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildCompile(spec) {
  return {
    ...baseMeta(spec),
    params: { src: 0, stepDt: 0.25 },
    paramSchema: {
      src: schemaNum('样例源码#', 'initial', '—', 0, 3),
      stepDt: schemaNum('stepDt', 'dynamics', 's', 0.05, 1),
    },
    init(state) {
      const samples = [
        'int x = 1 + 2;',
        'if (a < b) return a;',
        'while (n) n = n - 1;',
        'print(fib(5));',
      ];
      state.src = samples[Math.round(P(state.params, 'src', 0)) % samples.length];
      state.tokens = state.src.match(/[A-Za-z_]\w*|\d+|[=+\-*/<>();]|./g) || [];
      state.pos = 0;
      state.t = 0;
      state.acc = 0;
      state.stack = [];
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < P(state.params, 'stepDt', 0.25)) return;
      state.acc = 0;
      if (state.pos < state.tokens.length) {
        state.stack.push(state.tokens[state.pos]);
        state.pos += 1;
        if (state.stack.length > 10) state.stack.shift();
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      ctx.fillStyle = C.muted;
      ctx.font = '14px IBM Plex Mono, monospace';
      ctx.fillText(state.src, 40, H * 0.3);
      state.tokens.forEach((tok, i) => {
        ctx.fillStyle = i === state.pos - 1 ? C.accent : C.body;
        ctx.fillText(tok, 40 + i * 36, H * 0.45);
      });
      ctx.fillStyle = C.muted;
      ctx.fillText(`stack: ${state.stack.join(' ')}`, 40, H * 0.65);
    },
    getReadouts(state) {
      return [
        { label: 'pos', value: String(state.pos) },
        { label: 'tok', value: String(state.tokens.length) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildDist(spec) {
  return {
    ...baseMeta(spec),
    params: { nodes: 5, partition: 0, shards: 4, stepDt: 0.3 },
    paramSchema: {
      nodes: schemaNum('节点数', 'numerics', '—', 3, 9),
      partition: schemaNum('分区', 'dynamics', '—', 0, 1),
      shards: schemaNum('分片', 'numerics', '—', 1, 12),
      stepDt: schemaNum('stepDt', 'dynamics', 's', 0.1, 1),
    },
    init(state) {
      const n = Math.floor(P(state.params, 'nodes', 5));
      state.nodes = Array.from({ length: n }, (_, i) => ({ id: i, role: i === 0 ? 'leader' : 'follower', log: 0 }));
      state.t = 0;
      state.acc = 0;
      state.phase = 0;
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < P(state.params, 'stepDt', 0.3)) return;
      state.acc = 0;
      if (spec.id === 'raft') {
        if (P(state.params, 'partition', 0) > 0.5) {
          state.nodes[0].role = 'candidate';
        } else {
          state.nodes.forEach((n, i) => {
            n.role = i === 0 ? 'leader' : 'follower';
            if (i !== 0) n.log = state.nodes[0].log;
          });
          state.nodes[0].log += 1;
        }
      } else {
        state.phase = (state.phase + 1) % 3;
      }
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, spec.name);
      if (spec.id === 'mapreduce') {
        const labels = ['Map', 'Shuffle', 'Reduce'];
        labels.forEach((lab, i) => {
          ctx.fillStyle = i === state.phase ? C.accent : C.axis;
          ctx.fillRect(60 + i * 120, H * 0.4, 100, 40);
          ctx.fillStyle = '#111';
          ctx.font = '14px IBM Plex Mono, monospace';
          ctx.fillText(lab, 85 + i * 120, H * 0.4 + 25);
        });
      } else {
        state.nodes.forEach((n, i) => {
          const x = 70 + i * 70;
          const y = H * 0.45;
          ctx.fillStyle = n.role === 'leader' ? C.accent : C.body;
          ctx.beginPath();
          ctx.arc(x, y, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#111';
          ctx.font = '10px IBM Plex Mono, monospace';
          ctx.fillText(n.role[0].toUpperCase(), x - 4, y + 3);
        });
      }
    },
    getReadouts(state) {
      return [
        { label: 'phase', value: String(state.phase) },
        { label: 'nodes', value: String(state.nodes.length) },
        { label: 'log', value: String(state.nodes[0]?.log || 0) },
      ];
    },
    getTrajectory() { return []; },
  };
}

function buildStruct(spec) {
  return {
    ...baseMeta(spec),
    params: { load: 10, span: 6, EI: 1, pos: 0.5, shape: 1 },
    paramSchema: {
      load: schemaNum('载荷 P', 'dynamics', 'kN', 0, 100),
      span: schemaNum('跨度 L', 'dynamics', 'm', 1, 40),
      EI: schemaNum('EI', 'dynamics', '—', 0.1, 50),
      pos: schemaNum('载荷位置', 'dynamics', '—', 0.05, 0.95),
      shape: schemaNum('截面系数', 'dynamics', '—', 0.2, 5),
    },
    init(state) {
      state.t = 0;
      state.sfd = [];
      state.bmd = [];
      state.defl = [];
      this._rebuild(state);
    },
    _rebuild(state) {
      const L = Math.max(P(state.params, 'span', 6), 0.5);
      const Pload = P(state.params, 'load', 10);
      const a = Math.max(0.05, Math.min(0.95, P(state.params, 'pos', 0.5))) * L;
      const b = L - a;
      const Ra = (Pload * b) / L;
      const Rb = (Pload * a) / L;
      const n = 48;
      state.sfd = [];
      state.bmd = [];
      state.defl = [];
      const EI = Math.max(P(state.params, 'EI', 1), 1e-6);
      for (let i = 0; i <= n; i += 1) {
        const x = (i / n) * L;
        const V = x < a ? Ra : Ra - Pload;
        const M = x < a ? Ra * x : Ra * x - Pload * (x - a);
        // 简支梁挠度近似（单位载荷形状）
        const y = (Pload * b * x * (L * L - b * b - x * x)) / (6 * EI * L);
        state.sfd.push({ x, v: V });
        state.bmd.push({ x, m: M });
        state.defl.push({ x, y: -Math.abs(y) * P(state.params, 'shape', 1) });
      }
      state.Ra = Ra;
      state.Rb = Rb;
      state.Mmax = Math.max(...state.bmd.map((p) => Math.abs(p.m)));
      state.ymax = Math.max(...state.defl.map((p) => Math.abs(p.y)));
    },
    step(state, dt) {
      state.t += dt;
      this._rebuild(state);
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H, 42);
      title(ctx, spec.name);
      const L = Math.max(P(state.params, 'span', 6), 0.5);
      const midY = box.t + box.h * 0.28;
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(box.l, midY);
      ctx.lineTo(box.r, midY);
      ctx.stroke();
      // supports
      ctx.fillStyle = C.muted;
      [[box.l, midY], [box.r, midY]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 8, y + 12);
        ctx.lineTo(x + 8, y + 12);
        ctx.closePath();
        ctx.fill();
      });
      const a = Math.max(0.05, Math.min(0.95, P(state.params, 'pos', 0.5)));
      const px = box.l + a * box.w;
      drawArrow(ctx, px, midY - 40, px, midY - 4, C.accent, 2);
      const plot = (series, key, y0, h, color) => {
        const maxA = Math.max(1e-6, ...series.map((p) => Math.abs(p[key])));
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        series.forEach((p, i) => {
          const x = box.l + (p.x / L) * box.w;
          const y = y0 - (p[key] / maxA) * h;
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
      };
      plot(state.sfd, 'v', box.t + box.h * 0.55, box.h * 0.12, C.vector);
      plot(state.bmd, 'm', box.t + box.h * 0.78, box.h * 0.12, C.body);
      ctx.fillStyle = C.muted;
      ctx.font = '10px IBM Plex Mono, monospace';
      ctx.fillText('SFD', box.l, box.t + box.h * 0.48);
      ctx.fillText('BMD', box.l, box.t + box.h * 0.68);
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 'Ra', value: `${formatNum(state.Ra, d)} kN` },
        { label: 'Rb', value: `${formatNum(state.Rb, d)} kN` },
        { label: 'Mmax', value: `${formatNum(state.Mmax, d)}` },
        { label: '|y|max', value: formatNum(state.ymax, d) },
      ];
    },
  };
}

function buildControl(spec) {
  return {
    ...baseMeta(spec),
    params: { K: 1, zeta: 0.4, wn: 2, Kp: 1.2, Ki: 0.4, Kd: 0.08, speed: 1 },
    paramSchema: {
      K: schemaNum('K', 'dynamics', '—', 0.1, 10),
      zeta: schemaNum('ζ', 'dynamics', '—', 0.05, 2),
      wn: schemaNum('ωₙ', 'dynamics', 'rad/s', 0.2, 20),
      Kp: schemaNum('Kp', 'dynamics', '—', 0, 20),
      Ki: schemaNum('Ki', 'dynamics', '—', 0, 20),
      Kd: schemaNum('Kd', 'dynamics', '—', 0, 5),
      speed: schemaNum('动画速', 'dynamics', '—', 0.2, 4),
    },
    init(state) {
      state.t = 0;
      state.y = 0;
      state.v = 0;
      state.ie = 0;
      state.hist = [];
      state.ref = 1;
      state.overshoot = 0;
    },
    step(state, dt) {
      const s = Math.max(0.05, P(state.params, 'speed', 1));
      const h = dt * s;
      const zeta = P(state.params, 'zeta', 0.4);
      const wn = P(state.params, 'wn', 2);
      const K = P(state.params, 'K', 1);
      const e = state.ref - state.y;
      state.ie += e * h;
      const u = P(state.params, 'Kp', 1.2) * e
        + P(state.params, 'Ki', 0.4) * state.ie
        - P(state.params, 'Kd', 0.08) * state.v;
      // 二阶被控：ÿ + 2ζωṅẏ + ωₙ² y = K ωₙ² (ref + u增益混合)
      const drive = K * (state.ref + 0.35 * u);
      const a = drive * wn * wn - 2 * zeta * wn * state.v - wn * wn * state.y;
      state.v += a * h;
      state.y += state.v * h;
      state.t += h;
      state.overshoot = Math.max(state.overshoot, state.y - state.ref);
      state.hist.push(state.y);
      if (state.hist.length > 220) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const mid = box.t + box.h * 0.55;
      ctx.strokeStyle = C.axis;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(box.l, mid - 40);
      ctx.lineTo(box.r, mid - 40);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = C.body;
      ctx.beginPath();
      state.hist.forEach((v, i) => {
        const x = box.l + (i / 220) * box.w;
        const y = mid - v * 40;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      if (spec.id === 'inverted-pendulum' || spec.id === 'flight-attitude') {
        const ang = state.y * 0.4;
        const cx = W * 0.5;
        const cy = H * 0.78;
        ctx.strokeStyle = C.vector;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.sin(ang) * 70, cy - Math.cos(ang) * 70);
        ctx.stroke();
        ctx.fillStyle = C.accent;
        ctx.fillRect(cx - 28, cy, 56, 10);
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'y', value: formatNum(state.y, d) },
        { label: 'OS', value: formatNum(state.overshoot, d) },
        { label: 'ζ', value: formatNum(P(state.params, 'zeta', 0.4), d) },
      ];
    },
  };
}

function buildChaos(spec) {
  const isMandel = spec.id === 'mandelbrot-julia';
  return {
    ...baseMeta(spec),
    params: isMandel
      ? { iter: 40, cx: -0.7, cy: 0.27, zoom: 1.2 }
      : { sigma: 10, rho: 28, beta: 2.67, a: 0.2, b: 0.2, c: 5.7, speed: 1, proj: 0 },
    paramSchema: isMandel
      ? {
        iter: schemaNum('迭代', 'numerics', '—', 10, 120),
        cx: schemaNum('cᵣ', 'dynamics', '—', -2, 1),
        cy: schemaNum('cᵢ', 'dynamics', '—', -1.5, 1.5),
        zoom: schemaNum('缩放', 'dynamics', '—', 0.3, 8),
      }
      : {
        sigma: schemaNum('σ', 'dynamics', '—', 1, 30),
        rho: schemaNum('ρ', 'dynamics', '—', 1, 50),
        beta: schemaNum('β', 'dynamics', '—', 0.5, 8),
        a: schemaNum('a', 'dynamics', '—', 0.05, 1),
        b: schemaNum('b', 'dynamics', '—', 0.05, 1),
        c: schemaNum('c', 'dynamics', '—', 1, 20),
        speed: schemaNum('动画速', 'dynamics', '—', 0.2, 4),
        proj: {
          label: '投影', group: 'display', unit: '', min: 0, max: 2,
          options: [
            { value: 0, label: 'xy' },
            { value: 1, label: 'xz' },
            { value: 2, label: 'yz' },
          ],
        },
      },
    init(state) {
      state.t = 0;
      state.x = 0.1;
      state.y = 0;
      state.z = 0;
      state.trail = isMandel ? [] : createRingTrail(mobileBudget().trailCap);
      state.frame = 0;
      state._mandelKey = '';
      state._mandelCanvas = null;
    },
    step(state, dt) {
      if (isMandel) {
        state.t += dt;
        state.frame += 1;
        return;
      }
      const h = dt * P(state.params, 'speed', 1) * 0.35;
      if (spec.id === 'rossler' || spec.id === 'lotka-volterra') {
        if (spec.id === 'lotka-volterra') {
          const alpha = P(state.params, 'sigma', 10) * 0.1;
          const beta = P(state.params, 'rho', 28) * 0.02;
          const gamma = P(state.params, 'beta', 2.67) * 0.2;
          const delta = P(state.params, 'a', 0.2);
          const dx = state.x * (alpha - beta * state.y);
          const dy = -state.y * (gamma - delta * state.x);
          state.x = Math.max(0.01, state.x + dx * h);
          state.y = Math.max(0.01, state.y + dy * h);
        } else {
          const a = P(state.params, 'a', 0.2);
          const b = P(state.params, 'b', 0.2);
          const c = P(state.params, 'c', 5.7);
          const dx = -state.y - state.z;
          const dy = state.x + a * state.y;
          const dz = b + state.z * (state.x - c);
          state.x += dx * h;
          state.y += dy * h;
          state.z += dz * h;
        }
      } else {
        const sigma = P(state.params, 'sigma', 10);
        const rho = P(state.params, 'rho', 28);
        const beta = P(state.params, 'beta', 2.67);
        const dx = sigma * (state.y - state.x);
        const dy = state.x * (rho - state.z) - state.y;
        const dz = state.x * state.y - beta * state.z;
        state.x += dx * h;
        state.y += dy * h;
        state.z += dz * h;
      }
      state.t += h;
      state.trail = ensureRingCap(state.trail, mobileBudget().trailCap);
      ringPush(state.trail, { x: state.x, y: state.y, z: state.z });
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      if (isMandel) {
        const budget = mobileBudget();
        const iterMax = Math.min(budget.mandelIterCap, Math.floor(P(state.params, 'iter', 40)));
        const zoom = P(state.params, 'zoom', 1.2);
        const cx0 = P(state.params, 'cx', -0.7);
        const cy0 = P(state.params, 'cy', 0.27);
        const step = budget.mandelStep;
        const dpr = Math.max(1, Number(view.dpr) || (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1);
        const key = `${iterMax}|${zoom}|${cx0}|${cy0}|${step}|${W}x${H}|dpr=${dpr.toFixed(2)}`;
        if (state._mandelKey === key && state._mandelCanvas) {
          ctx.drawImage(state._mandelCanvas, 0, 0, W, H);
          title(ctx, spec.name);
          return;
        }
        const off = (typeof document !== 'undefined' && document.createElement)
          ? (state._mandelCanvas || document.createElement('canvas'))
          : null;
        if (off) {
          off.width = Math.max(1, Math.floor(W * dpr));
          off.height = Math.max(1, Math.floor(H * dpr));
        }
        const g = off ? off.getContext('2d') : ctx;
        if (off) {
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          g.fillStyle = '#0b0e14';
          g.fillRect(0, 0, W, H);
        }
        for (let py = 30; py < H - 10; py += step) {
          for (let px = 10; px < W - 10; px += step) {
            let zx = ((px - W / 2) / (0.25 * W * zoom));
            let zy = ((py - H / 2) / (0.25 * H * zoom));
            const cr = cx0;
            const ci = cy0;
            // Julia set with c fixed
            let n = 0;
            while (zx * zx + zy * zy < 4 && n < iterMax) {
              const xt = zx * zx - zy * zy + cr;
              zy = 2 * zx * zy + ci;
              zx = xt;
              n += 1;
            }
            g.fillStyle = n >= iterMax ? '#111' : heatTempColor(n, 0, iterMax);
            g.fillRect(px, py, step, step);
          }
        }
        if (off) {
          state._mandelCanvas = off;
          state._mandelKey = key;
          ctx.drawImage(off, 0, 0, W, H);
        } else {
          state._mandelKey = key;
        }
        title(ctx, spec.name);
        return;
      }
      title(ctx, spec.name);
      const box = padBox(W, H);
      const proj = Math.round(P(state.params, 'proj', 0));
      const labels = ['xy', 'xz', 'yz'];
      ctx.fillStyle = C.muted;
      ctx.font = '11px IBM Plex Mono, monospace';
      ctx.fillText(`proj ${labels[proj] || 'xy'}`, box.l, box.t - 8);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(box.l, box.t + box.h * 0.5); ctx.lineTo(box.r, box.t + box.h * 0.5);
      ctx.moveTo(box.l + box.w * 0.5, box.t); ctx.lineTo(box.l + box.w * 0.5, box.b);
      ctx.stroke();
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const trail = state.trail?.buf ? state.trail : null;
      if (trail) {
        ringForEach(trail, (p, i) => {
          let u; let v;
          if (proj === 1) { u = p.x; v = p.z; }
          else if (proj === 2) { u = p.y; v = p.z; }
          else { u = p.x; v = p.y; }
          const x = box.l + box.w * 0.5 + u * 6;
          const y = box.t + box.h * 0.5 + v * 6;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
      }
      ctx.stroke();
      const last = trail ? ringLast(trail) : null;
      if (last) {
        let u; let v;
        if (proj === 1) { u = last.x; v = last.z; }
        else if (proj === 2) { u = last.y; v = last.z; }
        else { u = last.x; v = last.y; }
        ctx.fillStyle = C.accent;
        ctx.beginPath();
        ctx.arc(box.l + box.w * 0.5 + u * 6, box.t + box.h * 0.5 + v * 6, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      if (isMandel) {
        return [
          { label: 'iter', value: String(Math.floor(P(state.params, 'iter', 40))) },
          { label: 'zoom', value: formatNum(P(state.params, 'zoom', 1.2), d) },
        ];
      }
      const labels = ['xy', 'xz', 'yz'];
      return [
        { label: 'x', value: formatNum(state.x, d) },
        { label: 'y', value: formatNum(state.y, d) },
        { label: 'z', value: formatNum(state.z, d) },
        { label: 'proj', value: labels[Math.round(P(state.params, 'proj', 0))] || 'xy' },
      ];
    },
  };
}

function buildTraffic(spec) {
  return {
    ...baseMeta(spec),
    params: { density: 0.25, pSlow: 0.2, vmax: 5, green: 0.55, cycle: 30, seed: 7 },
    paramSchema: {
      density: schemaNum('密度', 'dynamics', '—', 0.05, 0.9),
      pSlow: schemaNum('随机慢化', 'dynamics', '—', 0, 0.8),
      vmax: schemaNum('vmax', 'dynamics', '—', 1, 8),
      green: schemaNum('绿信比', 'dynamics', '—', 0.2, 0.9),
      cycle: schemaNum('周期', 'dynamics', 's', 10, 90),
      seed: schemaNum('seed', 'initial', '—', 1, 9999),
    },
    init(state) {
      const n = 60;
      const dens = P(state.params, 'density', 0.25);
      const rand = rnd(P(state.params, 'seed', 7));
      state.cells = Array.from({ length: n }, () => (rand() < dens ? Math.floor(rand() * P(state.params, 'vmax', 5)) + 1 : -1));
      state.t = 0;
      state.acc = 0;
      state.flow = 0;
      state.queue = 0;
      state.n = n;
      state.fund = [];
    },
    step(state, dt) {
      state.t += dt;
      state.acc += dt;
      if (state.acc < 0.12) return;
      state.acc = 0;
      const vmax = Math.max(1, Math.floor(P(state.params, 'vmax', 5)));
      const pSlow = P(state.params, 'pSlow', 0.2);
      const n = state.n;
      const next = state.cells.slice();
      const rand = rnd(Math.floor(state.t * 1000) + 1);
      let moved = 0;
      for (let i = 0; i < n; i += 1) {
        if (state.cells[i] < 0) continue;
        let v = state.cells[i];
        v = Math.min(v + 1, vmax);
        let gap = 0;
        for (let k = 1; k <= vmax; k += 1) {
          if (state.cells[(i + k) % n] >= 0) break;
          gap = k;
        }
        v = Math.min(v, gap);
        if (v > 0 && rand() < pSlow) v -= 1;
        if (spec.id === 'signalized-intersection') {
          const cyc = Math.max(5, P(state.params, 'cycle', 30));
          const g = P(state.params, 'green', 0.55);
          const phase = (state.t % cyc) / cyc;
          if (i > n * 0.45 && i < n * 0.55 && phase > g) v = 0;
        }
        next[i] = -1;
        const j = (i + v) % n;
        next[j] = v;
        if (v > 0) moved += 1;
      }
      state.cells = next;
      state.flow = moved / n;
      state.queue = state.cells.filter((c) => c === 0).length;
      const dens = state.cells.filter((c) => c >= 0).length / n;
      state.fund.push({ rho: dens, q: state.flow });
      if (state.fund.length > 220) state.fund.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      title(ctx, `${spec.name} · ρ–q`);
      const n = state.n;
      const cellW = (W - 40) / n;
      const y = H * 0.32;
      for (let i = 0; i < n; i += 1) {
        const v = state.cells[i];
        if (v < 0) continue;
        ctx.fillStyle = heatTempColor(v, 0, Math.max(1, P(state.params, 'vmax', 5)));
        ctx.fillRect(20 + i * cellW, y - 8, Math.max(2, cellW - 1), 16);
      }
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(20, y - 12, W - 40, 24);

      // 基本图散点
      const box = { l: 40, t: H * 0.48, w: W - 80, h: H * 0.42 };
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(box.l, box.t, box.w, box.h);
      ctx.fillStyle = C.muted;
      ctx.font = '10px IBM Plex Mono, monospace';
      ctx.fillText('ρ', box.l + box.w - 12, box.t + box.h + 12);
      ctx.fillText('q', box.l - 12, box.t + 10);
      const qMax = Math.max(0.15, ...state.fund.map((p) => p.q));
      for (const p of state.fund) {
        const x = box.l + p.rho * box.w;
        const yy = box.t + box.h - (p.q / qMax) * box.h;
        ctx.fillStyle = C.body;
        ctx.fillRect(x - 1.5, yy - 1.5, 3, 3);
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      const dens = state.cells.filter((c) => c >= 0).length / state.n;
      return [
        { label: 'ρ', value: formatNum(dens, d) },
        { label: 'q', value: formatNum(state.flow, d) },
        { label: 'queue', value: String(state.queue) },
        { label: 'pts', value: String(state.fund.length) },
      ];
    },
  };
}

function buildReactor(spec) {
  return {
    ...baseMeta(spec),
    params: { tau: 2, k: 0.8, order: 1, cin: 1, T: 350, P: 1, reflux: 1.5, z: 0.5 },
    paramSchema: {
      tau: schemaNum('停留 τ', 'dynamics', 's', 0.2, 20),
      k: schemaNum('速率 k', 'dynamics', '1/s', 0, 5),
      order: schemaNum('级数', 'dynamics', '—', 1, 2),
      cin: schemaNum('进料 cᵢₙ', 'dynamics', '—', 0, 5),
      T: schemaNum('T', 'dynamics', 'K', 250, 600),
      P: schemaNum('P', 'dynamics', 'bar', 0.2, 20),
      reflux: schemaNum('回流比', 'dynamics', '—', 0.5, 8),
      z: schemaNum('进料组成', 'dynamics', '—', 0.05, 0.95),
    },
    init(state) {
      state.t = 0;
      state.c = P(state.params, 'cin', 1);
      state.hist = [];
      state.profile = [];
      state.stages = 0;
    },
    step(state, dt) {
      const tau = Math.max(0.05, P(state.params, 'tau', 2));
      const k = P(state.params, 'k', 0.8);
      const n = Math.max(1, Math.round(P(state.params, 'order', 1)));
      const cin = P(state.params, 'cin', 1);
      if (spec.id === 'pfr') {
        const u = 1 / tau;
        state.profile = [];
        let c = cin;
        for (let i = 0; i <= 40; i += 1) {
          state.profile.push(c);
          const r = -k * (c ** n);
          c = Math.max(0, c + (r / Math.max(u, 1e-6)) * (1 / 40));
        }
        state.c = c;
      } else if (spec.id === 'mccabe-thiele') {
        const R = P(state.params, 'reflux', 1.5);
        const z = P(state.params, 'z', 0.5);
        state.stages = Math.max(2, Math.min(20, Math.round(8 / Math.max(0.2, R)) + Math.round(z * 6)));
        state.c = z;
      } else {
        const r = -k * (state.c ** n);
        state.c += ((cin - state.c) / tau + r) * dt;
        state.c = Math.max(0, state.c);
      }
      state.t += dt;
      state.hist.push(state.c);
      if (state.hist.length > 180) state.hist.shift();
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      if (spec.id === 'pfr' && state.profile?.length) {
        ctx.strokeStyle = C.body;
        ctx.beginPath();
        state.profile.forEach((c, i) => {
          const x = box.l + (i / (state.profile.length - 1)) * box.w;
          const y = box.b - c * box.h * 0.7;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      } else if (spec.id === 'mccabe-thiele') {
        ctx.strokeStyle = C.axis;
        ctx.strokeRect(box.l, box.t, box.w, box.h);
        ctx.strokeStyle = C.body;
        ctx.beginPath();
        ctx.moveTo(box.l, box.b);
        ctx.lineTo(box.r, box.t);
        ctx.stroke();
        ctx.strokeStyle = C.accent;
        ctx.beginPath();
        const stages = state.stages || 4;
        let x = P(state.params, 'z', 0.5);
        let y = x;
        for (let i = 0; i < stages; i += 1) {
          const yEq = Math.sqrt(x); // 示意平衡线
          const px = box.l + x * box.w;
          const py = box.b - y * box.h;
          const pye = box.b - yEq * box.h;
          ctx.moveTo(px, py);
          ctx.lineTo(px, pye);
          x = Math.min(0.98, yEq * (1 + 0.1 * P(state.params, 'reflux', 1.5)));
          y = yEq;
          ctx.lineTo(box.l + x * box.w, pye);
        }
        ctx.stroke();
      } else {
        ctx.strokeStyle = C.body;
        ctx.beginPath();
        state.hist.forEach((c, i) => {
          const x = box.l + (i / 180) * box.w;
          const y = box.b - c * box.h * 0.7;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 'c', value: formatNum(state.c, d) },
        { label: 't', value: `${formatNum(state.t, d)} s` },
        { label: 'stages', value: String(state.stages || 0) },
        { label: 'X', value: formatNum(1 - state.c / Math.max(1e-6, P(state.params, 'cin', 1)), d) },
      ];
    },
  };
}

function buildAero(spec) {
  return {
    ...baseMeta(spec),
    params: { alpha: 5, AR: 8, sweep: 20, camber: 0.04, Re: 1e6, thrust: 1.2, mass: 1 },
    paramSchema: {
      alpha: schemaNum('攻角 α', 'dynamics', '°', -5, 25),
      AR: schemaNum('展弦比', 'dynamics', '—', 2, 20),
      sweep: schemaNum('后掠角', 'dynamics', '°', 0, 45),
      camber: schemaNum('弯度', 'dynamics', '—', 0, 0.15),
      Re: schemaNum('Re/10⁶', 'dynamics', '—', 0.1, 10),
      thrust: schemaNum('推力', 'dynamics', '—', 0.2, 5),
      mass: schemaNum('质量', 'dynamics', '—', 0.2, 10),
    },
    init(state) {
      state.t = 0;
      state.x = 0.2;
      state.y = 0.7;
      state.vx = 0;
      state.vy = 0;
      state.trail = [];
      state.Cl = 0;
      state.Cd = 0;
    },
    step(state, dt) {
      const alpha = (P(state.params, 'alpha', 5) * Math.PI) / 180;
      const AR = P(state.params, 'AR', 8);
      const camber = P(state.params, 'camber', 0.04);
      state.Cl = 2 * Math.PI * (alpha + camber) * (AR / (AR + 2));
      state.Cd = 0.02 + (state.Cl * state.Cl) / (Math.PI * AR * 0.9) + 0.001 * P(state.params, 'sweep', 20);
      if (spec.id === 'rocket-vt' || spec.id === 'reentry-trajectory') {
        const T = P(state.params, 'thrust', 1.2);
        const m = Math.max(0.1, P(state.params, 'mass', 1));
        state.vy += (T / m - 1.0 - 0.15 * state.Cd) * dt;
        state.vx += Math.sin(alpha) * 0.2 * dt;
        state.x += state.vx * dt * 0.05;
        state.y += state.vy * dt * 0.05;
        if (state.y < 0.08) {
          state.y = 0.08;
          state.vy = 0;
        }
        pushTrail(state.trail, { x: state.x, y: state.y }, 200);
      }
      state.t += dt;
    },
    draw(ctx, state, view) {
      const { width: W, height: H } = view;
      const box = padBox(W, H);
      title(ctx, spec.name);
      const alpha = (P(state.params, 'alpha', 5) * Math.PI) / 180;
      const sweep = (P(state.params, 'sweep', 20) * Math.PI) / 180;
      const cx = W * 0.5;
      const cy = H * 0.45;
      const span = 120;
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - span, cy + Math.tan(sweep) * 20);
      ctx.lineTo(cx, cy - 10 - P(state.params, 'camber', 0.04) * 80);
      ctx.lineTo(cx + span, cy + Math.tan(sweep) * 20);
      ctx.lineTo(cx, cy + 18);
      ctx.closePath();
      ctx.stroke();
      drawArrow(ctx, cx, cy, cx + Math.cos(alpha) * 50, cy - Math.sin(alpha) * 50, C.vector, 2);
      drawArrow(ctx, cx, cy, cx, cy - state.Cl * 25, C.accent, 2);
      if (state.trail.length) {
        ctx.strokeStyle = C.trail || C.muted;
        ctx.beginPath();
        state.trail.forEach((p, i) => {
          const x = box.l + p.x * box.w;
          const y = box.b - p.y * box.h;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
    },
    getReadouts(state, opts = {}) {
      const d = opts.digits ?? 3;
      return [
        { label: 'Cl', value: formatNum(state.Cl, d) },
        { label: 'Cd', value: formatNum(state.Cd, d) },
        { label: 'L/D', value: formatNum(state.Cl / Math.max(1e-6, state.Cd), d) },
        { label: 't', value: `${formatNum(state.t, d)} s` },
      ];
    },
  };
}
