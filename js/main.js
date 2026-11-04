import { models, getModelById, getAllTags, loadModelMetadata } from './models/index.js';
import { resizeCanvas } from './utils/canvas.js';
import { createFixedStepper } from './utils/integrator.js';
import { downloadCanvasPng, downloadCsv, composeExport } from './utils/export.js';
import { createParamBench } from './ui/paramBench.js';
import { finiteOr, sanitizeGlobals } from './utils/params.js';
import { btnHtml, ICO } from './ui/icons.js';
import { setModelPalette, getModelSwatch, getModelColors } from './utils/theme.js';

const canvas = document.getElementById('canvas');
const canvasWrap = document.querySelector('.canvas-wrap');
const readoutsEl = document.getElementById('readouts');
const modelListEl = document.getElementById('model-list');
const toolbarTitle = document.getElementById('toolbar-title');
const toolbarSub = document.getElementById('toolbar-sub');
const metaFormula = document.getElementById('meta-formula');
const bench = document.getElementById('bench');
const paramRoot = document.getElementById('param-root');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const sidebar = document.getElementById('sidebar');
const filterQ = document.getElementById('filter-q');
const filterTag = document.getElementById('filter-tag');
const speedSlider = document.getElementById('speed-slider');
const speedLabel = document.getElementById('speed-label');
const btnPause = document.getElementById('btn-pause');
const btnReset = document.getElementById('btn-reset');
const btnMenu = document.getElementById('btn-menu');
const btnParams = document.getElementById('btn-params');
const btnCloseBench = document.getElementById('btn-close-bench');
const btnShot = document.getElementById('btn-shot');
const btnCsv = document.getElementById('btn-csv');
const btnCsvMore = document.getElementById('btn-csv-more');
const tbMore = document.getElementById('tb-more');
const btnHc = document.getElementById('btn-hc');
const benchDrag = document.getElementById('bench-drag');
const sidebarDrag = document.getElementById('sidebar-drag');

const stepper = createFixedStepper(1 / 240, 48);

const app = {
  model: null,
  state: null,
  paused: false,
  filter: { q: '', tag: '' },
  lastReadouts: [],
  globals: {
    timeScale: 1,
    fixedDt: 1 / 240,
    maxSubSteps: 48,
    viewScale: 1,
    showVectors: true,
    showTrail: true,
    showAxes: true,
    readoutDigits: 3,
    frameShot: false,
    shotReadouts: false,
    shotLegend: false,
    compareReadouts: false,
    pinBaseline: false,
    wideBounds: true,
  },
};

const FOLD_KEY = 'physics-lab-folds-v1';
const HOT_SUBS = new Set([
  '经典力学', '算法与数据结构', '计算机体系结构', '波与振动', '电磁学', '数字逻辑',
  '梁与框架', '动力循环', '经典控制', '气动', '交通流', '静力与强度',
]);

function loadFolds() {
  try { return JSON.parse(localStorage.getItem(FOLD_KEY) || '{}'); }
  catch { return {}; }
}
function saveFolds(map) {
  try { localStorage.setItem(FOLD_KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

function isCompact() {
  return window.matchMedia('(max-width: 1100px)').matches;
}
function isMobileDrawer() {
  return window.matchMedia('(max-width: 900px)').matches;
}

function createState(model) {
  const params = JSON.parse(JSON.stringify(model.params));
  const state = { params };
  model.init(state);
  return state;
}

function applyGlobals() {
  sanitizeGlobals(app.globals);
  stepper.setFixedDt(app.globals.fixedDt);
  stepper.setMaxSubSteps(app.globals.maxSubSteps);
  speedSlider.value = String(app.globals.timeScale);
  speedLabel.textContent = `${Number(app.globals.timeScale).toFixed(1)}×`;
}

function syncPauseUi() {
  btnPause.innerHTML = app.paused ? btnHtml('play', 'play') : btnHtml('pause', 'pause');
  btnPause.classList.toggle('primary', !app.paused);
}

let scrubResume = null;
const DEBUG_PARAM_LOG = (() => {
  try { return localStorage.getItem('physics-lab-debug-params') === '1'; }
  catch { return false; }
})();
let paramLogTimer = null;
let prevReadoutMap = new Map();

function showToast(msg) {
  let el = document.getElementById('lab-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'lab-toast';
    el.className = 'lab-toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

/** 改这些键必须 re-init；动力学量（g/k/m…）就地生效，避免“调参无反应” */
const REINIT_KEYS = new Set([
  'n', 'N', 'seed', 'algo', 'cols', 'rows', 'wallDensity',
  'capacity', 'uniq', 'depth', 'hazardMode', 'hazardRate',
  'h', 'x0', 'y0', 'v0', 'vx0', 'vy0', 'theta', 'theta0', 'theta1', 'theta2',
  'V0', 'I0', 'T0', 'hotspot', 'Tleft', 'Tright', 'A1', 'A2', 'A3',
  'v1', 'v2', 's0', 'vx1', 'vy1', 'vx2', 'vy2', 'x1', 'y1', 'x2', 'y2',
  'start', 'goal', 'density', 'rule',
]);

function shouldReinitModel(key) {
  if (!key || String(key).startsWith('__')) return true;
  const schema = app.model?.paramSchema?.[key];
  // schema 优先：dynamics/display 永 live；initial/numerics 必 reset
  if (schema?.group === 'dynamics' || schema?.group === 'display') return false;
  if (schema?.group === 'initial' || schema?.group === 'numerics') return true;
  if (REINIT_KEYS.has(key)) return true;
  return false;
}

function sanitizeSimState(state) {
  if (!state || typeof state !== 'object') return { ok: true };
  const bad = [];
  const walk = (obj, path) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'params' || k.startsWith('_')) continue;
      const p = path ? `${path}.${k}` : k;
      if (typeof v === 'number' && Number.isNaN(v)) bad.push(p);
      else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Float64Array)) walk(v, p);
      else if (Array.isArray(v) && v.length && typeof v[0] === 'number') {
        for (let i = 0; i < v.length; i += 1) {
          if (typeof v[i] === 'number' && Number.isNaN(v[i])) { bad.push(`${p}[${i}]`); break; }
        }
      }
    }
  };
  walk(state, '');
  return { ok: !bad.length, bad };
}

function applyParamChange(key) {
  if (shouldReinitModel(key)) {
    stepper.reset();
    const kept = { ...app.state.params };
    app.state = { params: kept };
    app.model.init(app.state);
  }
  // 死规则：改参后立即 refresh，保证 HUD/图在暂停时也立刻响应
  try {
    if (typeof app.model.refresh === 'function') app.model.refresh(app.state);
    else if (typeof app.model.recompute === 'function') app.model.recompute(app.state);
    else if (typeof app.model.step === 'function') app.model.step(app.state, 0);
  } catch (err) {
    console.warn('refresh after param', err);
    showToast(`参数应用失败: ${key}`);
  }
  const check = sanitizeSimState(app.state);
  if (!check.ok) {
    showToast(`非有限值保护: ${check.bad.slice(0, 3).join(', ')} — 已暂停，请调回合理范围`);
    app.paused = true;
    syncPauseUi();
  }
  if (DEBUG_PARAM_LOG) {
    clearTimeout(paramLogTimer);
    paramLogTimer = setTimeout(() => {
      const mode = shouldReinitModel(key) ? 'reinit' : 'live';
      console.debug(`[param ${mode}]`, key, app.state?.params?.[key]);
    }, 120);
  }
  paintFrame();
  updateHud({ flash: true });
}

const paramBench = createParamBench(paramRoot, {
  onParamChange: (key) => applyParamChange(key),
  onResetDefaults: () => resetToModelDefaults(),
  onGlobalsChange: () => applyGlobals(),
  onLayoutChange: () => measureSysSticky(),
  onToast: showToast,
  onScrubStart: () => {
    if (scrubResume !== null) return;
    scrubResume = app.paused;
    if (!app.paused) {
      app.paused = true;
      syncPauseUi();
    }
  },
  onScrubEnd: () => {
    if (scrubResume === null) return;
    const was = scrubResume;
    scrubResume = null;
    if (!was) {
      app.paused = false;
      syncPauseUi();
    }
  },
});

function endScrubResume() {
  if (scrubResume === null) return;
  const was = scrubResume;
  scrubResume = null;
  if (!was) {
    app.paused = false;
    syncPauseUi();
  }
}

// 防止松手事件丢失导致仿真一直停在 scrub 暂停
window.addEventListener('blur', endScrubResume);
window.addEventListener('pointercancel', endScrubResume);
window.addEventListener('touchcancel', endScrubResume);

function resetToModelDefaults() {
  app.state = createState(app.model);
  stepper.reset();
  paramBench.bind(app.model, app.state.params, app.globals);
  updateHud();
}

function resetSim() {
  stepper.reset();
  const kept = { ...app.state.params };
  app.state = { params: kept };
  app.model.init(app.state);
  updateHud();
}

const DOMAIN_ORDER = [
  '物理', '计算机科学', '计算机工程',
  '材料力学与结构工程', '工程热力学与能源动力', '电子工程与信号处理', '控制系统',
  '航空航天工程', '水利与土木', '交通工程', '化学工程', '工业工程', '核工程',
  '生物医学工程', '环境工程', '数学', '化学', '生物', '地球科学', '经济与管理',
];
const SEARCH_ALIASES = {
  cs: ['计算机科学', '算法', '排序', '图论', '搜索', '元胞', '机器学习', '密码'],
  ce: ['计算机工程', '体系结构', '缓存', '流水线', '电路', '队列', '数字', '网络', '操作系统'],
  phy: ['物理', '力学', '电磁', '波动', '热学', '光学', '流体', '近代'],
  physics: ['物理'],
  me: ['材料力学与结构工程', '梁', '桁架', '屈曲'],
  thermo: ['工程热力学与能源动力', '朗肯', '制冷', '布雷顿'],
  ee: ['电子工程与信号处理', '滤波器', '运放', 'PLL'],
  control: ['控制系统', 'PID', '根轨迹', '倒立摆'],
  aero: ['航空航天工程', '翼型', '轨道', '再入'],
  civil: ['水利与土木', '明渠', '水锤', '堰'],
};

function modelDomain(m) {
  const tags = m.tags || [];
  for (const d of DOMAIN_ORDER) {
    if (tags.includes(d)) return d;
  }
  return '其他';
}

function expandSearchQuery(raw) {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  const tokens = [q];
  for (const [alias, words] of Object.entries(SEARCH_ALIASES)) {
    if (q === alias || q.includes(alias)) tokens.push(...words.map((w) => w.toLowerCase()));
  }
  return [...new Set(tokens)];
}

function filteredModels() {
  const raw = app.filter.q.trim();
  const rawLower = raw.toLowerCase();
  // 子类全名精确匹配（中英不区分大小写）
  if (raw) {
    const exactSub = models.filter((m) => {
      const sub = modelSub(m);
      return sub === raw || sub.toLowerCase() === rawLower;
    });
    if (exactSub.length) {
      return exactSub.filter((m) => !app.filter.tag || (m.tags || []).includes(app.filter.tag));
    }
  }
  const tokens = expandSearchQuery(app.filter.q);
  return models.filter((m) => {
    if (app.filter.tag && !(m.tags || []).includes(app.filter.tag)) return false;
    if (!tokens.length) return true;
    const hay = `${m.name} ${m.id} ${m.sub || ''} ${m.formula || ''} ${(m.tags || []).join(' ')} ${m.description || ''}`.toLowerCase();
    return tokens.some((t) => hay.includes(t));
  });
}

function makeModelButton(m) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'model-item' + (app.model?.id === m.id ? ' active' : '');
  btn.dataset.id = m.id;
  const tags = (m.tags || []).filter((t) => !DOMAIN_ORDER.includes(t)).slice(0, 2)
    .map((t) => `<span class="tag">${t}</span>`).join('');
  const swatch = getModelSwatch(m.id);
  btn.innerHTML = `<span class="swatch" style="--swatch:${swatch}"></span><span class="name">${m.name}</span><span class="tags">${tags}</span>`;
  btn.addEventListener('click', () => {
    switchModel(m.id);
    setSidebarOpen(false);
  });
  return btn;
}

function modelSub(m) {
  if (m.sub) return m.sub;
  const tags = m.tags || [];
  return tags.find((t) => !DOMAIN_ORDER.includes(t)) || '未分类';
}

function foldKey(domain, sub) {
  return sub ? `${domain}::${sub}` : domain;
}

function setAllFolds(open) {
  const next = loadFolds();
  for (const el of modelListEl.querySelectorAll('details.domain-group, details.sub-group')) {
    el.open = open;
  }
  for (const el of modelListEl.querySelectorAll('details.domain-group')) {
    const name = el.querySelector('.domain-name')?.textContent || '';
    next[foldKey(name)] = open;
  }
  for (const el of modelListEl.querySelectorAll('details.sub-group')) {
    const sub = el.querySelector('.sub-name')?.textContent || '';
    const domain = el.closest('.domain-group')?.querySelector('.domain-name')?.textContent || '';
    next[foldKey(domain, sub)] = open;
  }
  saveFolds(next);
}

function buildSidebar() {
  modelListEl.innerHTML = '';
  const list = filteredModels();
  const folds = loadFolds();
  const searching = !!app.filter.q.trim() || !!app.filter.tag;
  const foldBar = document.createElement('div');
  foldBar.className = 'fold-bar';
  const btnExpand = document.createElement('button');
  btnExpand.type = 'button';
  btnExpand.className = 'btn quiet';
  btnExpand.textContent = '全部展开';
  btnExpand.addEventListener('click', () => setAllFolds(true));
  const btnCollapse = document.createElement('button');
  btnCollapse.type = 'button';
  btnCollapse.className = 'btn quiet';
  btnCollapse.textContent = '全部收起';
  btnCollapse.addEventListener('click', () => setAllFolds(false));
  foldBar.append(btnExpand, btnCollapse);
  modelListEl.appendChild(foldBar);

  if (!list.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:0.75rem;font-family:var(--font-mono);font-size:0.75rem;color:var(--muted)';
    empty.textContent = 'no match';
    modelListEl.appendChild(empty);
    return;
  }
  const groups = new Map();
  for (const m of list) {
    const d = modelDomain(m);
    if (!groups.has(d)) groups.set(d, new Map());
    const sub = modelSub(m);
    if (!groups.get(d).has(sub)) groups.get(d).set(sub, []);
    groups.get(d).get(sub).push(m);
  }
  const order = [...DOMAIN_ORDER, '其他'];
  for (const domain of order) {
    const subMap = groups.get(domain);
    if (!subMap?.size) continue;
    const count = [...subMap.values()].reduce((n, arr) => n + arr.length, 0);
    const details = document.createElement('details');
    details.className = 'domain-group';
    const dKey = foldKey(domain);
    details.open = searching || (folds[dKey] != null ? !!folds[dKey] : domain === '物理');
    details.addEventListener('toggle', () => {
      const next = loadFolds();
      next[dKey] = details.open;
      saveFolds(next);
    });
    const sum = document.createElement('summary');
    sum.innerHTML = `<span class="domain-name">${domain}</span><span class="domain-count">${count}</span>`;
    const body = document.createElement('div');
    body.className = 'domain-body';
    for (const [sub, items] of subMap) {
      const subEl = document.createElement('details');
      subEl.className = 'sub-group';
      const sKey = foldKey(domain, sub);
      const defaultOpen = searching || HOT_SUBS.has(sub) || items.length <= 3;
      subEl.open = folds[sKey] != null ? !!folds[sKey] : defaultOpen;
      subEl.addEventListener('toggle', () => {
        const next = loadFolds();
        next[sKey] = subEl.open;
        saveFolds(next);
      });
      const subSum = document.createElement('summary');
      const q = app.filter.q.trim();
      const hit = q && (sub === q || sub.toLowerCase() === q.toLowerCase());
      subSum.innerHTML = `<span class="sub-name${hit ? ' is-match' : ''}">${sub}</span><span class="sub-count">${items.length}</span>`;
      const subBody = document.createElement('div');
      subBody.className = 'sub-body';
      for (const m of items) subBody.appendChild(makeModelButton(m));
      subEl.append(subSum, subBody);
      body.appendChild(subEl);
    }
    details.append(sum, body);
    modelListEl.appendChild(details);
  }
}

function syncSidebarActive() {
  for (const el of modelListEl.querySelectorAll('.model-item')) {
    el.classList.toggle('active', el.dataset.id === app.model.id);
  }
}

function populateTagFilter() {
  filterTag.innerHTML = '<option value="">all</option>';
  for (const t of getAllTags()) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    filterTag.appendChild(opt);
  }
}

function syncDrawerChrome() {
  const compact = isCompact();
  const sideOpen = sidebar.classList.contains('open');
  const benchOpen = compact && bench.classList.contains('open');
  btnMenu?.setAttribute('aria-expanded', sideOpen ? 'true' : 'false');
  btnParams?.setAttribute('aria-expanded', benchOpen ? 'true' : 'false');
  // 宽屏三栏常驻：params/close 无开关意义，隐藏并移出 Tab 序
  if (btnParams) {
    btnParams.hidden = !compact;
    btnParams.tabIndex = compact ? 0 : -1;
    btnParams.setAttribute('aria-hidden', compact ? 'false' : 'true');
  }
  if (btnCloseBench) {
    btnCloseBench.hidden = !compact;
    btnCloseBench.tabIndex = compact ? 0 : -1;
    btnCloseBench.setAttribute('aria-hidden', compact ? 'false' : 'true');
  }
  const showBackdrop = sideOpen || benchOpen;
  drawerBackdrop.hidden = !showBackdrop;
  document.body.classList.toggle('drawer-open', showBackdrop && isMobileDrawer());
}

function setSidebarOpen(open) {
  if (!isMobileDrawer()) {
    sidebar.classList.remove('open');
    sidebar.style.transform = '';
    syncDrawerChrome();
    return;
  }
  sidebar.classList.toggle('open', open);
  sidebar.style.transform = '';
  syncDrawerChrome();
}

function setBenchOpen(open) {
  // 宽屏（>1100）：工作台是三栏常驻面板，不可关闭；此处强制 open 并忽略 close。
  // 仅 ≤1100 抽屉模式下 open=false 才会真正收起。
  if (!isCompact()) {
    bench.classList.add('open');
    bench.style.transform = '';
    bench.style.height = '';
    syncDrawerChrome();
    return;
  }
  bench.classList.toggle('open', open);
  if (!open) {
    bench.style.transform = '';
    bench.style.height = '';
  }
  syncDrawerChrome();
}

function measureSysSticky() {
  // 仅标题 sticky；记录 sys 折叠后高度供调试 / 未来错开
  const sys = paramRoot.querySelector('.param-section.is-sys');
  if (!sys) return;
  const h = Math.ceil(sys.getBoundingClientRect().height);
  paramRoot.style.setProperty('--sys-sticky-h', `${Math.max(28, h)}px`);
}

function switchModel(id) {
  const model = getModelById(id);
  app.model = model;
  setModelPalette(model.id);
  app.state = createState(model);
  stepper.reset();
  prevReadoutMap = new Map();
  toolbarTitle.textContent = model.name;
  toolbarSub.textContent = [model.sub, ...(model.tags || []).filter((t) => t !== model.sub)].filter(Boolean).join(' / ') || 'model';
  metaFormula.textContent = [model.formula, model.description].filter(Boolean).join('\n');
  paramBench.bind(model, app.state.params, app.globals);
  syncSidebarActive();
  updateHud();
  setBenchOpen(!isCompact());
  requestAnimationFrame(measureSysSticky);
}

function updateHud(opts = {}) {
  const digits = app.globals.readoutDigits;
  const readouts = app.model.getReadouts(app.state, { digits }) || [];
  app.lastReadouts = readouts;
  const accent = getModelColors(app.model?.id).body || '#fff';
  readoutsEl.style.setProperty('--hud-accent', accent);
  const compare = !!app.globals.compareReadouts;
  readoutsEl.classList.toggle('is-compare', compare);
  const baseline = prevReadoutMap;
  readoutsEl.innerHTML = readouts.map((r) => {
    const prev = baseline.get(r.label);
    const changed = opts.flash && prev != null && prev !== r.value;
    const prevHtml = compare
      ? `<span class="prev" title="改前">${prev != null ? prev : '—'}</span>`
      : '';
    return `<div class="readout-card${changed ? ' is-changed' : ''}${compare ? ' has-compare' : ''}"><span class="dot" aria-hidden="true"></span><span class="label">${r.label}</span><span class="value-row">${prevHtml}<span class="value">${r.value}</span></span></div>`;
  }).join('');
  const pinned = !!app.globals.pinBaseline;
  if (opts.snapshotPrev || baseline.size === 0) {
    prevReadoutMap = new Map(readouts.map((r) => [r.label, r.value]));
  } else if (!compare) {
    prevReadoutMap = new Map(readouts.map((r) => [r.label, r.value]));
  } else if (opts.flash && !pinned) {
    clearTimeout(updateHud._cmpT);
    updateHud._cmpT = setTimeout(() => {
      prevReadoutMap = new Map(readouts.map((r) => [r.label, r.value]));
    }, 120);
  }
  if (opts.flash) {
    clearTimeout(updateHud._flashT);
    updateHud._flashT = setTimeout(() => {
      for (const el of readoutsEl.querySelectorAll('.readout-card.is-changed')) {
        el.classList.remove('is-changed');
      }
    }, 900);
  }
}

function paintFrame(opts = {}) {
  const viewBase = resizeCanvas(canvas, canvasWrap, opts);
  const view = {
    width: viewBase.width,
    height: viewBase.height,
    dpr: viewBase.dpr,
    scale: app.globals.viewScale,
    showVectors: app.globals.showVectors,
    showTrail: app.globals.showTrail,
    showAxes: app.globals.showAxes,
  };
  const ctx = viewBase.ctx;
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.save();
  if (view.scale !== 1) {
    ctx.translate(view.width / 2, view.height / 2);
    ctx.scale(view.scale, view.scale);
    ctx.translate(-view.width / 2, -view.height / 2);
  }
  app.model.draw(ctx, app.state, view);
  ctx.restore();
  return viewBase;
}

function frame(now) {
  if (!frame.last) frame.last = now;
  const frameDt = (now - frame.last) / 1000;
  frame.last = now;

  if (!app.paused) {
    stepper.advance(frameDt * app.globals.timeScale, (dt) => {
      try {
        app.model.step(app.state, dt);
        const check = sanitizeSimState(app.state);
        if (!check.ok) {
          showToast(`非有限值保护: ${check.bad.slice(0, 2).join(', ')}`);
          app.paused = true;
          syncPauseUi();
        }
      } catch (err) {
        console.warn('step error', err);
        showToast('仿真步进异常，已暂停');
        app.paused = true;
        syncPauseUi();
      }
    });
  }

  paintFrame();
  updateHud();
  requestAnimationFrame(frame);
}

btnPause.addEventListener('click', () => {
  app.paused = !app.paused;
  syncPauseUi();
});
btnReset.addEventListener('click', () => resetSim());
btnMenu.addEventListener('click', (e) => {
  // 菜单在 stage 内，必须阻止冒泡，否则 stage click 会立刻关掉侧栏
  e.stopPropagation();
  setSidebarOpen(!sidebar.classList.contains('open'));
});
btnParams.addEventListener('click', (e) => {
  e.stopPropagation();
  setBenchOpen(!bench.classList.contains('open'));
});
btnCloseBench.addEventListener('click', (e) => {
  e.stopPropagation();
  setBenchOpen(false);
});
drawerBackdrop.addEventListener('click', () => {
  setBenchOpen(false);
  setSidebarOpen(false);
});

btnShot.addEventListener('click', () => {
  paintFrame({ forceDpr: 2 });
  downloadCanvasPng(canvas, `${app.model.id}-${Date.now()}.png`, {
    framed: !!app.globals.frameShot,
    readouts: app.globals.shotReadouts ? app.lastReadouts : null,
    legend: !!app.globals.shotLegend,
    modelId: app.model.id,
  });
  // 导出后恢复屏幕 DPR，避免下一帧糊一下
  requestAnimationFrame(() => paintFrame());
});
function exportCsv() {
  let rows = typeof app.model.getTrajectory === 'function'
    ? app.model.getTrajectory(app.state)
    : null;
  if (!rows || !rows.length) rows = [{ t: finiteOr(app.state.t, 0), note: 'no-trajectory' }];
  const energy = typeof app.model.getEnergy === 'function'
    ? app.model.getEnergy(app.state)
    : null;
  rows = rows.map((row, i) => {
    const out = { ...row };
    if (energy && i === 0) {
      if (Number.isFinite(energy.kinetic)) out.E_kin = energy.kinetic;
      if (Number.isFinite(energy.potential)) out.E_pot = energy.potential;
      if (Number.isFinite(energy.kinetic) && Number.isFinite(energy.potential)) {
        out.E_tot = energy.kinetic + energy.potential;
      }
    } else if (energy && typeof app.model.getEnergy === 'function') {
      // 逐行尽量附当前能量（轨迹点无独立能量时重复末态）
      const e = app.model.getEnergy(app.state);
      if (Number.isFinite(e.kinetic)) out.E_kin = e.kinetic;
      if (Number.isFinite(e.potential)) out.E_pot = e.potential;
      if (Number.isFinite(e.kinetic) && Number.isFinite(e.potential)) {
        out.E_tot = e.kinetic + e.potential;
      }
    }
    return out;
  });
  downloadCsv(rows, `${app.model.id}-trajectory.csv`);
  if (tbMore) tbMore.open = false;
}
btnCsv.addEventListener('click', exportCsv);
btnCsvMore?.addEventListener('click', exportCsv);

document.getElementById('btn-pin-baseline')?.addEventListener('click', () => {
  app.globals.compareReadouts = true;
  app.globals.pinBaseline = true;
  updateHud({ snapshotPrev: true });
  paramBench.refresh?.();
  showToast('已钉住基线（对照开）');
});

speedSlider.addEventListener('input', () => {
  app.globals.timeScale = Number(speedSlider.value) || 1;
  speedLabel.textContent = `${app.globals.timeScale.toFixed(1)}×`;
  paramBench.refresh();
});

filterQ.addEventListener('input', () => {
  app.filter.q = filterQ.value;
  buildSidebar();
});
filterTag.addEventListener('change', () => {
  app.filter.tag = filterTag.value;
  buildSidebar();
});

btnHc?.addEventListener('click', (e) => {
  e.preventDefault();
  document.documentElement.classList.toggle('hc');
  localStorage.setItem('physics-lab-hc', document.documentElement.classList.contains('hc') ? '1' : '0');
});

document.querySelector('.stage')?.addEventListener('click', (e) => {
  if (!isMobileDrawer()) return;
  if (e.target.closest('#btn-menu, #btn-params, .toolbar-actions, .tb-more')) return;
  if (sidebar.classList.contains('open')) setSidebarOpen(false);
});
sidebar.addEventListener('click', (e) => e.stopPropagation());
bench.addEventListener('click', (e) => e.stopPropagation());

function rubber(x, limit) {
  // 越过开合边界时衰减位移，形成橡皮筋手感
  if (x >= 0) return x * 0.22;
  if (x < -limit) return -limit + (x + limit) * 0.28;
  return x;
}

function bindDrawerDrag(handle, panel, axis) {
  if (!handle || !panel) return;
  let start = 0;
  let base = 0;
  let dragging = false;
  let lastOffset = 0;

  const onStart = (e) => {
    if (!isMobileDrawer()) return;
    if (axis === 'y' && !panel.classList.contains('open')) return;
    if (axis === 'x' && !panel.classList.contains('open')) return;
    dragging = true;
    lastOffset = 0;
    panel.style.transition = 'none';
    const pt = e.touches ? e.touches[0] : e;
    start = axis === 'y' ? pt.clientY : pt.clientX;
    base = axis === 'y'
      ? panel.getBoundingClientRect().height
      : panel.getBoundingClientRect().width;
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!dragging) return;
    const pt = e.touches ? e.touches[0] : e;
    if (axis === 'y') {
      const dy = pt.clientY - start;
      const raw = base - dy;
      const minH = 140;
      const maxH = window.innerHeight * 0.9;
      let next = raw;
      if (raw < minH) next = minH + (raw - minH) * 0.25;
      if (raw > maxH) next = maxH + (raw - maxH) * 0.2;
      lastOffset = next;
      panel.style.height = `${next}px`;
      panel.style.transform = 'translateY(0)';
    } else {
      const dx = pt.clientX - start;
      const x = rubber(dx, base);
      lastOffset = x;
      panel.style.transform = `translateX(${x}px)`;
    }
  };
  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), height 0.28s cubic-bezier(0.22, 1, 0.36, 1)';
    if (axis === 'y') {
      const h = lastOffset || panel.getBoundingClientRect().height;
      if (h < window.innerHeight * 0.38) {
        setBenchOpen(false);
        panel.style.height = '';
      } else {
        panel.style.height = h < window.innerHeight * 0.58 ? '50vh' : '68vh';
      }
    } else if (lastOffset < -(base * 0.4)) {
      panel.style.transform = 'translateX(-110%)';
      const finish = () => {
        panel.style.transition = '';
        panel.removeEventListener('transitionend', finish);
        setSidebarOpen(false);
      };
      panel.addEventListener('transitionend', finish);
    } else {
      panel.style.transform = 'translateX(0)';
      const clear = () => {
        panel.style.transition = '';
        panel.removeEventListener('transitionend', clear);
      };
      panel.addEventListener('transitionend', clear);
    }
  };
  handle.addEventListener('mousedown', onStart);
  handle.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);
}

bindDrawerDrag(benchDrag, bench, 'y');
bindDrawerDrag(sidebarDrag, sidebar, 'x');

window.addEventListener('resize', () => {
  if (!isCompact()) {
    bench.classList.add('open');
    bench.style.transform = '';
    bench.style.height = '';
  }
  if (!isMobileDrawer()) {
    sidebar.classList.remove('open');
    sidebar.style.transform = '';
  }
  syncDrawerChrome();
  measureSysSticky();
});

/** 供视觉回归 / 验收脚本：纯画布 dataURL + 合成导出（固定 2× DPR） */
window.__labCapture = {
  canvasPng: () => {
    paintFrame({ forceDpr: 2 });
    const url = document.getElementById('canvas').toDataURL('image/png');
    paintFrame();
    return url;
  },
  composedPng: (framed, withReadouts, withLegend = false) => {
    paintFrame({ forceDpr: 2 });
    const url = composeExport(document.getElementById('canvas'), {
      framed: !!framed,
      readouts: withReadouts ? app.lastReadouts : null,
      legend: !!withLegend,
      modelId: app.model?.id,
    }).toDataURL('image/png');
    paintFrame();
    return url;
  },
  switchModel: (id) => switchModel(id),
  pause: () => { if (!app.paused) { app.paused = true; syncPauseUi(); } },
  play: () => { if (app.paused) { app.paused = false; syncPauseUi(); } },
  getReadouts: () => app.lastReadouts,
  getState: () => app.state,
  getGlobals: () => ({ ...app.globals }),
  getParams: () => ({ ...app.state?.params }),
  setParam: (key, value) => {
    if (!app.state?.params) return;
    app.state.params[key] = value;
    applyParamChange(key);
  },
  setGlobals: (partial) => {
    Object.assign(app.globals, partial || {});
    sanitizeGlobals(app.globals);
    applyGlobals();
    paramBench.refresh?.();
  },
  isPaused: () => !!app.paused,
  snapshotReadouts: () => updateHud({ snapshotPrev: true }),
};

async function boot() {
  if (localStorage.getItem('physics-lab-hc') === '1') {
    document.documentElement.classList.add('hc');
  }
  btnMenu.innerHTML = ICO.menu;
  btnReset.innerHTML = btnHtml('reset', 'reset');
  btnShot.innerHTML = btnHtml('cam', 'png');
  btnCsv.innerHTML = btnHtml('csv', 'csv');
  btnParams.innerHTML = btnHtml('params', 'params');
  btnCloseBench.innerHTML = btnHtml('close', 'close');

  await loadModelMetadata('./data/models.json');
  populateTagFilter();
  applyGlobals();
  syncPauseUi();
  buildSidebar();
  switchModel('free-fall');
  if (!isCompact()) bench.classList.add('open');
  syncDrawerChrome();
  requestAnimationFrame(frame);
}

boot();
