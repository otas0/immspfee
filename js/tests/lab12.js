/**
 * Locks for formula translation, sketches, dose, observation time, and catalog routing.
 */
import { models } from '../models/index.js';
import pidTune from '../models/pidTune.js';
import compoundMicroscope from '../models/compoundMicroscope.js';
import { probeSketch } from './sketchPixels.js';
import { assumptionPreview, formulaLine } from '../i18n/previewText.js';
import { hydrateGlyphRows, translateCatalogText, translatePhrasesOnly } from '../i18n/catalogText.js';
import { ROWS } from '../i18n/glyphRows.js';
import { exprUsesClock, assertClockParam, overrideRecord } from '../lab/topicOverrides.js';
import catalog from '../../data/catalog.json' with { type: 'json' };

hydrateGlyphRows(ROWS);

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

  // Course-only dose / irrigation / Hall shells were pruned with the unfinished catalog.
  assert('衰变完成模型仍在库', !!byId('radioactive') || !!byId('decay-chain'));

  const drag = byId('drag-fall');
  const dragSt = drag ? boot(drag) : null;
  assert('空气阻力落体观察时刻 v>10', !!dragSt && dragSt.v > 10, String(dragSt?.v));
  const accel = byId('free-fall');
  const accelSt = accel ? boot(accel, { v0: 0, h: 10, k: 0 }) : null;
  assert('自由落体从静止出发', !!accelSt && Math.abs(accelSt.v) < 1e-9, String(accelSt?.v));
  const chain = byId('decay-chain') || byId('radioactive');
  const chainSt = chain ? boot(chain) : null;
  assert('衰变 N 在观察时刻为正', !!chainSt && (chainSt.N > 1 || chainSt.N2 > 1), String(chainSt?.N ?? chainSt?.N2));
  const cell = byId('faraday') || byId('ohms-law');
  assert('电磁/电路完成模型仍在库', !!cell, cell?.id);

  const oblique = byId('collision-2d');
  if (!oblique) assert('二维碰撞手写模型存在', false);
  else {
    const st = boot(oblique);
    assert('二维碰撞有两体状态', !!st.a && !!st.b && Number.isFinite(st.a.x) && Number.isFinite(st.b.x), JSON.stringify({ a: st.a, b: st.b }));
  }

  const neutron = byId('neutron-diffusion');
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

  const bohr = byId('bohr');
  if (!bohr) assert('玻尔模型存在', false);
  else {
    const bohrPx = probeSketch(bohr);
    assert(
      '玻尔图含能级',
      bohrPx.kind === 'bohr' && bohrPx.texts.some((t) => t.includes('n=')),
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
  assert('同步后路由键不被方程覆盖', routed >= 0 && overwritten === 0, `routed ${routed} same ${overwritten}`);

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

  assert('pid-tune 手写模型在库', !!byId('pid-tune'));
  const tune = boot(pidTune);
  for (let i = 0; i < 600; i += 1) pidTune.step(tune, 1 / 60);
  assert(
    'pid-tune Ogata 对象 10s 内无超调且已上升',
    tune.overshoot < 0.02 && tune.y > 0.9,
    `os=${tune.overshoot} y=${tune.y}`,
  );

  const warm = translateCatalogText('ja', '恒温');
  assert('恒温的日文是带假名的句子', kana.test(warm) && !warm.includes('です'), warm);
  const bohrEn = translateCatalogText('en', '类氢、历史模型');
  assert('玻尔假设译成 hydrogen-like; historical model', bohrEn === 'hydrogen-like; historical model', bohrEn);
  assert('玻尔兹曼不拆成单字', translateCatalogText('en', '玻尔兹曼') === 'Boltzmann', translateCatalogText('en', '玻尔兹曼'));
  assert('格子玻尔兹曼先于玻尔兹曼', translateCatalogText('en', '格子玻尔兹曼') === 'lattice Boltzmann', translateCatalogText('en', '格子玻尔兹曼'));
  assert('卡诺不是 card promise', translateCatalogText('en', '卡诺') === 'Carnot', translateCatalogText('en', '卡诺'));
  assert('电路不是 electric path', translateCatalogText('en', '电路') === 'circuit', translateCatalogText('en', '电路'));
  assert('液滴撞击整词翻译', translatePhrasesOnly('en', '液滴撞击') === 'droplet impact', String(translatePhrasesOnly('en', '液滴撞击')));
  assert('短语未覆盖时不回落到单字', translatePhrasesOnly('en', '麒麟占位句') == null, String(translatePhrasesOnly('en', '麒麟占位句')));

  const eCharge = 1.602176634e-19;
  const phraseEn = {
    有限差分: 'finite difference',
    集总: 'lumped',
    稳态: 'steady state',
    阶跃: 'step',
    集总参数: 'lumped parameter',
    稳态阶跃响应: 'steady-state step response',
    有限差分格式: 'finite-difference scheme',
  };
  for (const [zh, en] of Object.entries(phraseEn)) {
    const got = translateCatalogText('en', zh);
    assert(`${zh} 译成 ${en}`, got === en, got);
  }
  const phraseLocales = {
    集总参数: {
      ja: 'しゅうそうパラメータである',
      ko: '집중 매개변수',
      es: 'parámetro concentrado',
      fr: 'paramètre localisé',
      de: 'konzentrierter Parameter',
    },
    稳态阶跃响应: {
      ja: 'ていじょうステップ応答である',
      ko: '정상상태 계단응답',
      es: 'respuesta al escalón en régimen',
      fr: 'réponse indicielle en régime',
      de: 'Beharrungs-Sprungantwort',
    },
    有限差分格式: {
      ja: 'ゆうげんさぶんスキームである',
      ko: '유한차분 형식',
      es: 'esquema de diferencias finitas',
      fr: 'schéma aux différences finies',
      de: 'Finite-Differenzen-Schema',
    },
  };
  for (const [zh, byLoc] of Object.entries(phraseLocales)) {
    for (const [loc, want] of Object.entries(byLoc)) {
      const got = translateCatalogText(loc, zh);
      assert(`${zh} ${loc} gloss`, got === want, got);
    }
  }

  function assertHallThickness(id, { quantum = false } = {}) {
    const hall = byId(id);
    const thick = hall?.params?.thick;
    const n = hall?.params?.n;
    const expect = hall ? (hall.params.I * hall.params.B) / (n * eCharge * thick) : NaN;
    const hallSt = hall ? boot(hall) : null;
    const poison = hall ? boot(hall, { t: 9e9 }) : null;
    assert(`${id} 厚度键是 thick、标签仍是厚度 t`, !!hall
      && thick === 1e-4
      && !Object.prototype.hasOwnProperty.call(hall.params, 't')
      && !Object.prototype.hasOwnProperty.call(hall.paramSchema || {}, 't')
      && hall.paramSchema?.thick?.label === '厚度 t', hall?.paramSchema?.thick?.label || 'missing');
    assert(`${id} 载流子浓度 n 在 params 且不在 schema`, !!hall
      && Object.prototype.hasOwnProperty.call(hall.params, 'n')
      && !Object.prototype.hasOwnProperty.call(hall.paramSchema || {}, 'n'), String(n));
    assert(`${id} 默认 V_H = I B / (n e thick)`, !!hallSt && Math.abs(hallSt.VH - expect) < 1e-9 * Math.abs(expect), String(hallSt?.VH));
    assert(`${id} tick 不读 params.t`, !!hallSt && !!poison && Math.abs(hallSt.VH - poison.VH) < 1e-12, String(poison?.VH));
    if (quantum) {
      assert(`${id} 使用独立 quantumHall 入口`, /填充因子|教学入口/.test(hall?.assumptions || ''), hall?.assumptions || '');
    } else {
      assert(`${id} 保持经典 hall 假设`, !!hall?.assumptions && !/填充因子/.test(hall.assumptions), hall?.assumptions || '');
    }
  }
  // Hall / irrigation / course inductor shells removed; keep clock + hand RL locks.
  let irrClock = false;
  try { assertClockParam('农业船舶汽车·灌溉', { t: 3600 }); } catch { irrClock = true; }
  assert('灌溉时钟 t 在加载期被拒绝', irrClock);
  const hallOverride = overrideRecord('磁学·霍尔效应') || overrideRecord('凝聚态·霍尔效应');
  assert('霍尔 override 不用 params.t', !hallOverride || !Object.prototype.hasOwnProperty.call(hallOverride.params || {}, 't'));

  const handRl = byId('rl-circuit');
  const handRlSt = handRl ? boot(handRl) : null;
  assert('手写 RL 从零电流出发', !!handRlSt && Math.abs(handRlSt.y) < 1e-9, String(handRlSt?.y));
  const handRlc = byId('rlc');
  assert('手写 RLC 在库', !!handRlc);

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
    // JA scientific gloss may be Kanji-only (二光源干渉). Fail only when a
    // Chinese source run still appears verbatim with no kana evidence of gloss.
    const jaStillChinese = (src, preview) => {
      const raw = String(src || '').replace(/\s+/g, ' ').trim();
      if (!han.test(raw)) return false;
      const body = String(preview || '').replace(/^(仮定|式)\s*/, '');
      if (body === raw) return true;
      if (kana.test(body)) return false;
      const runs = raw.match(/[\u4e00-\u9fff]{2,}/g) || [];
      return runs.some((run) => body.includes(run));
    };
    if (jaStillChinese(m.assumptions || '', assumptionPreview('ja', m.assumptions || ''))) {
      hanLeak += 1;
      if (!sample) sample = `${m.id} [ja] assumptions`;
    }
    if (jaStillChinese(m.formula || '', formulaLine('ja', m.formula || ''))) {
      hanLeak += 1;
      if (!sample) sample = `${m.id} [ja] formula`;
    }
  }
  assert('英西法德韩预览不再出现汉字', hanLeak === 0, sample || String(hanLeak));
  return results;
}
