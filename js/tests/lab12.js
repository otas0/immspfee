/**
 * Locks for formula translation, sketches, dose, observation time, and catalog routing.
 */
import { models } from '../models/index.js';
import pidTune from '../models/pidTune.js';
import compoundMicroscope from '../models/compoundMicroscope.js';
import { probeSketch } from './sketchPixels.js';
import { assumptionPreview, formulaLine } from '../i18n/previewText.js';
import { translateCatalogText } from '../i18n/catalogText.js';
import { exprUsesClock, assertClockParam, overrideRecord } from '../lab/topicOverrides.js';
import catalog from '../../data/catalog.json' with { type: 'json' };

function boot(model, extra = {}) {
  const state = { params: { ...(model?.params || {}), ...extra } };
  model.init(state);
  return state;
}

export function runLab12() {
  const results = [];
  const assert = (name, cond, detail = '') => {
    results.push({ name, ok: !!cond, detail: detail == null ? '' : String(detail) });
  };
  const byId = (id) => models.find((m) => m.id === id);
  const han = /[\u4e00-\u9fff]/;
  const kana = /[\u3040-\u30ff]/;

  const dose = byId('r024-剂量');
  if (!dose) assert('剂量模型存在', false, 'r024-剂量');
  else {
    const d0 = boot(dose);
    assert('剂量默认 H=1 mSv 且光子/电子', Math.abs(d0.H - 0.001) < 1e-9 && d0.rad === '光子/电子', `${d0.H} ${d0.rad}`);
    const d20 = boot(dose, { w: 20 });
    assert('w_R=20 为 α 且 H=20 mSv', Math.abs(d20.H - 0.02) < 1e-9 && d20.rad === 'α 粒子', `${d20.H} ${d20.rad}`);
    const d2 = boot(dose, { w: 2 });
    assert('w_R=2 标质子', Math.abs(d2.H - 0.002) < 1e-9 && d2.rad === '质子', `${d2.H} ${d2.rad}`);
  }

  const drag = byId('r002-空气阻力落体');
  const dragSt = drag ? boot(drag) : null;
  assert('空气阻力落体观察时刻 v>10', !!dragSt && dragSt.v > 10, String(dragSt?.v));
  const accel = byId('r001-匀加速直线');
  const accelSt = accel ? boot(accel) : null;
  assert('匀加速从原点 t0=0', !!accelSt && Math.abs(accelSt.x) < 1e-9, String(accelSt?.x));
  const chain = byId('r091-衰变链');
  const chainSt = chain ? boot(chain) : null;
  assert('Bateman N2 在观察时刻非零', !!chainSt && chainSt.N2 > 1, String(chainSt?.N2));
  const cell = byId('r107-电解');
  const cellSt = cell ? boot(cell) : null;
  assert('电解质量在观察时刻非零', !!cellSt && cellSt.y > 1e-4, String(cellSt?.y));

  const oblique = byId('r003-二维斜碰');
  if (!oblique) assert('斜碰模型存在', false);
  else {
    const obPx = probeSketch(oblique);
    const horiz = (s) => Math.abs(s.y0 - s.y1) < 2 && Math.abs(s.x1 - s.x0) > 18;
    const dashed = obPx.segments.filter((s) => s.dashed && horiz(s));
    const solid = obPx.segments.filter((s) => !s.dashed && horiz(s));
    const sameSeg = dashed.some((d) => solid.some((s) => Math.hypot(d.x0 - s.x0, d.y0 - s.y0) < 3 && Math.hypot(d.x1 - s.x1, d.y1 - s.y1) < 3));
    assert(
      '斜碰切向虚线与法向不是同一段',
      obPx.texts.some((t) => t.includes('切向')) && dashed.length >= 1 && solid.length >= 1 && !sameSeg
        && Math.min(...dashed.map((d) => d.y0)) > Math.min(...solid.map((s) => s.y0)) + 12,
      `dashed ${dashed.length} solid ${solid.length}`,
    );
  }

  const neutron = byId('neutron-diffusion') || byId('r024-中子扩散');
  if (!neutron) assert('中子模型存在', false);
  else {
    const neuPx = probeSketch(neutron);
    const top = (runs) => (runs.length ? runs[0].y0 : 999);
    const midTop = top(neuPx.columns.mid);
    const leftTop = top(neuPx.columns.left);
    const rightTop = top(neuPx.columns.right);
    const midThin = neuPx.columns.mid.length && (neuPx.columns.mid[0].y1 - neuPx.columns.mid[0].y0) < 10;
    assert(
      '中子余弦中点近峰、两端近基线',
      neuPx.texts.includes('φ = φ₀ cos(πx/a)') && midTop < Math.min(leftTop, rightTop) - 24
        && Math.abs(leftTop - rightTop) < 16 && midThin,
      `mid ${midTop} ends ${leftTop}/${rightTop}`,
    );
  }

  const bohr = byId('r018-玻尔模型');
  if (!bohr) assert('玻尔模型存在', false);
  else {
    const bohrPx = probeSketch(bohr);
    assert(
      '玻尔图含能级与轨道',
      bohrPx.kind === 'bohr' && bohrPx.texts.some((t) => t.includes('n=')) && bohrPx.texts.some((t) => t.includes('轨道 r∝n²')),
      bohrPx.texts.join('|'),
    );
  }

  const catById = new Map(catalog.map((e) => [e.id, e]));
  let routed = 0;
  let overwritten = 0;
  for (const m of models) {
    if (!m.topicBound) continue;
    const entry = catById.get(m.id);
    if (!entry || !/ · /.test(entry.formula || '')) continue;
    routed += 1;
    if (entry.formula === m.formula) overwritten += 1;
  }
  assert('同步后路由键不被方程覆盖', routed > 1000 && overwritten === 0, `routed ${routed} same ${overwritten}`);

  assert('厚度表达式不用时钟 t', exprUsesClock('8.686*thick/delta') === false);
  assert('衰减表达式使用时钟 t', exprUsesClock('exp(-k*t)') === true);
  assert('t0 不是时钟', exprUsesClock('t0') === false);
  let clockThrew = false;
  try { assertClockParam('demo', { t: 1 }); } catch { clockThrew = true; }
  assert('参数名 t 被时钟白名单拒绝', clockThrew);

  const micro = overrideRecord('光学·显微镜');
  const hand = compoundMicroscope.params;
  assert(
    '显微镜与手写装配默认筒长物镜目镜',
    !!micro && micro.params.startsWith('L=0.16:') && micro.params.includes('fo=0.016:') && micro.params.includes('fe=0.025:')
      && hand.tubeL_mm === 160 && hand.fObj_mm === 16 && hand.fEye_mm === 25,
    micro?.params || '',
  );

  const pid = byId(catalog.find((e) => e.formula === '控制 · PID')?.id);
  if (!pid) assert('PID 课程模型存在', false);
  else {
    const pidSt = boot(pid);
    pid.step(pidSt, 1);
    assert('PID 课程律 t=1 时 u=1.95', Math.abs(pidSt.y - 1.95) < 1e-6, String(pidSt.y));
  }
  const tune = boot(pidTune);
  for (let i = 0; i < 600; i += 1) pidTune.step(tune, 1 / 60);
  assert('pid-tune 超调约 0.408', Math.abs(tune.overshoot - 0.408) < 0.02, String(tune.overshoot));

  const warm = translateCatalogText('ja', '恒温');
  assert('恒温的日文是带假名的句子', kana.test(warm) && !warm.includes('です'), warm);
  const bohrEn = translateCatalogText('en', '类氢、历史模型');
  assert('玻尔假设译成 hydrogen-like; historical model', bohrEn === 'hydrogen-like; historical model', bohrEn);

  const hall = models.find((m) => /霍尔/.test(`${m.id} ${m.name}`) && m.params && Object.prototype.hasOwnProperty.call(m.params, 'thick'));
  assert('霍尔厚度参数名不是时钟 t', !!hall && !Object.prototype.hasOwnProperty.call(hall.params, 't') && !Object.prototype.hasOwnProperty.call(hall.paramSchema || {}, 't'), hall?.id || 'missing');

  const rlCourse = byId('r013-rl');
  const rlSt = rlCourse ? boot(rlCourse) : null;
  assert('课程 RL 在观察时刻电流非零', !!rlSt && rlSt.i > 1, String(rlSt?.i));
  const handRl = byId('rl-circuit');
  const handRlSt = handRl ? boot(handRl) : null;
  assert('手写 RL 从零电流出发', !!handRlSt && Math.abs(handRlSt.y) < 1e-9, String(handRlSt?.y));

  let hanLeak = 0;
  let sample = '';
  const hanRuns = (text) => (String(text).match(/[\u4e00-\u9fff]+/g) || []).join(',');
  for (const m of models) {
    for (const loc of ['en', 'es', 'fr', 'de', 'ko']) {
      const a = assumptionPreview(loc, m.assumptions || '');
      const f = formulaLine(loc, m.formula || '');
      if (han.test(a) || han.test(f)) {
        hanLeak += 1;
        if (!sample) sample = `${m.id} [${loc}] ${hanRuns(han.test(a) ? a : f)}`;
      }
    }
    if (han.test(m.assumptions || '') && !kana.test(assumptionPreview('ja', m.assumptions || ''))) {
      hanLeak += 1;
      if (!sample) sample = `${m.id} [ja] assumptions`;
    }
    if (han.test(m.formula || '') && !kana.test(formulaLine('ja', m.formula || ''))) {
      hanLeak += 1;
      if (!sample) sample = `${m.id} [ja] formula`;
    }
  }
  assert('英西法德韩预览不再出现汉字', hanLeak === 0, sample || String(hanLeak));
  return results;
}
