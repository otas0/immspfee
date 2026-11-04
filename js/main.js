import { models, getModelById, getAllTags, loadModelMetadata } from './models/index.js';
import { resizeCanvas } from './utils/canvas.js';
import { createFixedStepper } from './utils/integrator.js';
import { downloadCanvasPng, downloadCsv, composeExport } from './utils/export.js';
import { createParamBench } from './ui/paramBench.js';
import { finiteOr, sanitizeGlobals } from './utils/params.js';
import { btnHtml, ICO } from './ui/icons.js';
import { setModelPalette, getModelSwatch, getModelColors } from './utils/theme.js';
import { deriveCapabilities } from './ui/modelShell.js';
import { buildZipStore, readZipStore } from './utils/zipStore.js';
import { FAMILY_META } from './lab/formalism.js';

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
const filterFormalism = document.getElementById('filter-formalism');
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
  filter: { q: '', tag: '', formalism: '' },
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
const BASELINE_KEY = 'physics-lab-baselines-v1';
const MODEL_KEY = 'physics-lab-model';
const DEFAULT_MODEL_ID = 'free-fall';
const HOT_SUBS = new Set([
  '经典力学', '算法与数据结构', '计算机体系结构', '波与振动', '电磁学', '数字逻辑',
  '梁与框架', '动力循环', '经典控制', '气动', '交通流', '静力与强度',
]);

/** URL: write `#m=<id>`; read hash then `?model=<id>`. URL beats localStorage on boot. */
function readModelIdFromUrl() {
  try {
    const hash = (location.hash || '').replace(/^#/, '');
    if (hash.includes('=')) {
      const m = new URLSearchParams(hash).get('m');
      if (m) return m;
    }
    const q = new URLSearchParams(location.search).get('model');
    if (q) return q;
    return null;
  } catch {
    return null;
  }
}

function readModelIdFromStorage() {
  try { return localStorage.getItem(MODEL_KEY); }
  catch { return null; }
}

function persistActiveModel(id) {
  try { localStorage.setItem(MODEL_KEY, id); } catch { /* ignore */ }
  try {
    const url = new URL(location.href);
    // Keep existing query; sync hash for shareable deep links without reload.
    url.hash = `m=${encodeURIComponent(id)}`;
    history.replaceState(null, '', url);
  } catch { /* ignore */ }
}

function resolveInitialModelId() {
  const candidates = [readModelIdFromUrl(), readModelIdFromStorage()];
  for (const id of candidates) {
    if (!id) continue;
    if (models.some((m) => m.id === id)) return id;
  }
  return DEFAULT_MODEL_ID;
}

/** 多快照对照基线（按模型 id 分桶，最多 8 个） */
const baselineStore = {
  byModel: loadBaselines(),
  activeId: null,
};

function loadBaselines() {
  try { return JSON.parse(localStorage.getItem(BASELINE_KEY) || '{}'); }
  catch { return {}; }
}
function saveBaselines() {
  try { localStorage.setItem(BASELINE_KEY, JSON.stringify(baselineStore.byModel)); }
  catch { /* ignore */ }
}

const shellModeEl = document.getElementById('shell-mode');
const shellHintEl = document.getElementById('shell-hint');
const btnSafeRestore = document.getElementById('btn-safe-restore');
const baselineSelect = document.getElementById('baseline-select');
const btnSaveBaseline = document.getElementById('btn-save-baseline');

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

/** 完全以 schema.group 为准：dynamics/display=live；initial/numerics=reset；无 schema 的自定义键默认 live */
function shouldReinitModel(key) {
  if (!key || String(key).startsWith('__')) return true;
  const schema = app.model?.paramSchema?.[key];
  if (!schema) return false;
  if (schema.group === 'dynamics' || schema.group === 'display' || schema.group === 'custom') return false;
  if (schema.group === 'initial' || schema.group === 'numerics') return true;
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
    showToast(`非有限值保护: ${check.bad.slice(0, 3).join(', ')} — 可点「恢复安全默认」`);
    app.paused = true;
    syncPauseUi();
    setSafeRestoreVisible(true);
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

function setSafeRestoreVisible(on) {
  if (!btnSafeRestore) return;
  btnSafeRestore.hidden = !on;
}

function updateShellStrip() {
  const cap = deriveCapabilities(app.model);
  const note = app.model?.fidelityNote
    || (cap.fidelity === 'principle' && (cap.viz === 'beam' || cap.viz === 'control')
      ? '原理级，非 FEA/工业调参'
      : '');
  if (shellModeEl) {
    shellModeEl.textContent = [cap.formalism, cap.interaction].filter(Boolean).join(' · ') || 'knobs';
  }
  if (shellHintEl) {
    shellHintEl.textContent = [
      note ? `【${note}】` : '',
      cap.hint,
      cap.fidelity === 'principle' ? '· 原理级' : '',
      cap.hasPointer ? '· 画布可交互' : '',
      cap.hasEnergy ? '· CSV 含能量' : '',
      `· ${cap.paramCount} 参`,
    ].filter(Boolean).join(' ');
  }
  canvas?.classList.toggle('has-pointer', !!cap.hasPointer);
  renderShellActions(cap);
}

function renderShellActions(cap) {
  let bar = document.getElementById('shell-actions');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'shell-actions';
    bar.className = 'shell-actions';
    document.getElementById('model-shell')?.appendChild(bar);
  }
  const actions = cap?.actions || [];
  bar.innerHTML = '';
  for (const a of actions) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn quiet';
    btn.textContent = a.label || a.id;
    btn.addEventListener('click', () => {
      if (typeof app.model?.runAction !== 'function') return;
      const ok = app.model.runAction(app.state, a.id);
      if (ok) {
        paintFrame();
        paramBench.refresh?.();
        updateHud({ flash: true });
        showToast(a.label || a.id);
      } else {
        showToast('无可撤销操作');
      }
    });
    bar.appendChild(btn);
  }
}

/** 宽量程 NaN / 发散后：一键回到模型 schema 默认 + 安全全局量 */
function restoreSafeDefaults() {
  if (!app.model) return;
  app.globals.timeScale = 1;
  app.globals.fixedDt = 1 / 240;
  app.globals.maxSubSteps = 48;
  app.globals.viewScale = 1;
  sanitizeGlobals(app.globals);
  applyGlobals();
  app.state = createState(app.model);
  stepper.reset();
  paramBench.bind(app.model, app.state.params, app.globals);
  setSafeRestoreVisible(false);
  app.paused = false;
  syncPauseUi();
  updateShellStrip();
  paintFrame();
  updateHud({ flash: true });
  showToast('已恢复安全默认参数');
}

function modelBaselineBucket() {
  const id = app.model?.id || '_';
  if (!baselineStore.byModel[id]) baselineStore.byModel[id] = [];
  return baselineStore.byModel[id];
}

function activateBaseline(slot) {
  if (!slot) return;
  baselineStore.activeId = slot.id;
  prevReadoutMap = new Map(Object.entries(slot.values || {}));
  app.globals.compareReadouts = true;
  app.globals.pinBaseline = true;
  paramBench.refresh?.();
  renderBaselineSelect();
  updateHud();
}

function saveBaselineSnapshot(name) {
  const readouts = app.lastReadouts?.length
    ? app.lastReadouts
    : (app.model?.getReadouts(app.state, { digits: app.globals.readoutDigits }) || []);
  const values = Object.fromEntries(readouts.map((r) => [r.label, r.value]));
  const bucket = modelBaselineBucket();
  const slot = {
    id: `s${Date.now()}`,
    name: name || `快照 ${bucket.length + 1}`,
    values,
    ts: Date.now(),
  };
  bucket.push(slot);
  while (bucket.length > 8) bucket.shift();
  saveBaselines();
  activateBaseline(slot);
  showToast(`已存对照快照「${slot.name}」`);
}

function renderBaselineSelect() {
  if (!baselineSelect) return;
  const bucket = modelBaselineBucket();
  const cur = baselineStore.activeId;
  baselineSelect.innerHTML = '<option value="">当前对照</option>'
    + bucket.map((s) => `<option value="${s.id}"${s.id === cur ? ' selected' : ''}>${s.name}</option>`).join('');
}

/** 按轨迹点字段叠到临时 state，再调 getEnergy — 避免整表重复末态能量 */
function energyAtTrajectoryRow(model, state, row) {
  if (!row || typeof row !== 'object') return null;
  if (Number.isFinite(row.E_kin) || Number.isFinite(row.kinetic)) {
    const kinetic = Number.isFinite(row.E_kin) ? row.E_kin : row.kinetic;
    const potential = Number.isFinite(row.E_pot) ? row.E_pot : row.potential;
    return { kinetic, potential };
  }
  if (typeof model.getEnergyAt === 'function') {
    try { return model.getEnergyAt(state, row); } catch { /* fall through */ }
  }
  if (typeof model.getEnergy !== 'function') return null;
  try { return model.getEnergy(state); } catch { return null; }
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
  restoreSafeDefaults();
}

function resetSim() {
  stepper.reset();
  const kept = { ...app.state.params };
  app.state = { params: kept };
  app.model.init(app.state);
  setSafeRestoreVisible(false);
  updateHud();
}

const DOMAIN_ORDER = [
  '物理', '计算机科学', '计算机工程', '工程',
  '材料力学与结构工程', '工程热力学与能源动力', '电子工程与信号处理', '控制系统',
  '航空航天工程', '水利与土木', '交通工程', '化学工程', '工业工程', '核工程',
  '生物医学工程', '环境工程', '数学', '化学', '生物', '地球科学', '经济与管理',
];
const SEARCH_ALIASES = {
  cs: ['计算机科学', '算法', '排序', '图论', '搜索', '元胞', '机器学习', '密码', '优化', '计算理论'],
  ce: ['计算机工程', '体系结构', '缓存', '流水线', '电路', '队列', '数字', '网络', '操作系统', '嵌入式', '通信'],
  phy: ['物理', '力学', '电磁', '波动', '热学', '光学', '流体', '近代', '量子', '等离子体', '波与振动'],
  physics: ['物理'],
  eng: ['工程', '机械与结构', '流体与热工', '电气与能源', '化工与过程'],
  me: ['材料力学与结构工程', '梁', '桁架', '屈曲', '机械与结构'],
  thermo: ['工程热力学与能源动力', '朗肯', '制冷', '布雷顿', '流体与热工'],
  ee: ['电子工程与信号处理', '滤波器', '运放', 'PLL', '电气与能源'],
  control: ['控制系统', 'PID', '根轨迹', '倒立摆'],
  aero: ['航空航天工程', '翼型', '轨道', '再入'],
  civil: ['水利与土木', '明渠', '水锤', '堰'],
  chemeng: ['化工与过程', '反应器', '精馏', '化学工程'],
  geo: ['地球科学', '地球物理', '气候', '板块', '地震', '海洋', '辐射'],
  econ: ['经济与管理', '微观', '金融', '供需', '复利', '拍卖', '博弈', '期权'],
  fam: ['fam-', 'variantOf', '变体'],
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

let domainCursor = 0;

function visibleDomains() {
  const list = filteredModels();
  const set = new Set(list.map(modelDomain));
  return [...DOMAIN_ORDER, '其他'].filter((d) => set.has(d));
}

function cycleDomain(dir) {
  const domains = visibleDomains();
  if (!domains.length) return;
  domainCursor = (domainCursor + dir + domains.length) % domains.length;
  const target = domains[domainCursor];
  const folds = loadFolds();
  for (const d of domains) folds[foldKey(d)] = d === target;
  saveFolds(folds);
  buildSidebar();
  const el = modelListEl.querySelector(`details.domain-group > summary .domain-name`);
  const match = [...modelListEl.querySelectorAll('details.domain-group')].find(
    (d) => d.querySelector('.domain-name')?.textContent === target,
  );
  match?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  showToast(`领域：${target}`);
  void el;
}

function bindDomainSwipe(el) {
  if (!el || el.dataset.swipeBound) return;
  el.dataset.swipeBound = '1';
  let x0 = 0;
  let armed = false;
  el.addEventListener('touchstart', (e) => {
    if (!isMobileDrawer() && !isCompact()) return;
    armed = true;
    x0 = e.touches[0].clientX;
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (!armed) return;
    armed = false;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) < 48) return;
    cycleDomain(dx < 0 ? 1 : -1);
  }, { passive: true });
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
      return exactSub.filter((m) => {
        if (app.filter.tag && !(m.tags || []).includes(app.filter.tag)) return false;
        if (app.filter.formalism) {
          const f = m.formalism || m.capabilities?.formalism || '';
          if (f !== app.filter.formalism) return false;
        }
        return true;
      });
    }
  }
  const tokens = expandSearchQuery(app.filter.q);
  return models.filter((m) => {
    if (app.filter.tag && !(m.tags || []).includes(app.filter.tag)) return false;
    if (app.filter.formalism) {
      const f = m.formalism || m.capabilities?.formalism || '';
      if (f !== app.filter.formalism) return false;
    }
    if (!tokens.length) return true;
    const hay = `${m.name} ${m.id} ${m.sub || ''} ${m.formula || ''} ${(m.tags || []).join(' ')} ${m.description || ''} ${m.formalism || ''}`.toLowerCase();
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
  const foldHint = document.createElement('p');
  foldHint.className = 'fold-hint';
  foldHint.textContent = '折叠：按钮全开/全收；点标题开合；窄屏在折叠栏左右滑切换领域';
  const btnPrevDom = document.createElement('button');
  btnPrevDom.type = 'button';
  btnPrevDom.className = 'btn quiet domain-nav';
  btnPrevDom.textContent = '‹ 域';
  btnPrevDom.title = '上一个领域';
  const btnNextDom = document.createElement('button');
  btnNextDom.type = 'button';
  btnNextDom.className = 'btn quiet domain-nav';
  btnNextDom.textContent = '域 ›';
  btnNextDom.title = '下一个领域';
  btnPrevDom.addEventListener('click', () => cycleDomain(-1));
  btnNextDom.addEventListener('click', () => cycleDomain(1));
  foldBar.append(btnPrevDom, btnExpand, btnCollapse, btnNextDom);
  bindDomainSwipe(foldBar);
  modelListEl.appendChild(foldBar);
  modelListEl.appendChild(foldHint);

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

function populateFormalismFilter() {
  if (!filterFormalism) return;
  const set = new Set(Object.values(FAMILY_META).map((m) => m.formalism));
  for (const m of models) {
    const f = m.formalism || m.capabilities?.formalism;
    if (f) set.add(f);
  }
  filterFormalism.innerHTML = '<option value="">all</option>';
  for (const f of [...set].sort()) {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    filterFormalism.appendChild(opt);
  }
}

function syncDrawerChrome() {
  const compact = isCompact();
  const sideOpen = sidebar.classList.contains('open');
  const benchCollapsed = document.getElementById('chassis')?.classList.contains('bench-collapsed');
  const benchOpen = compact
    ? bench.classList.contains('open')
    : !benchCollapsed;
  btnMenu?.setAttribute('aria-expanded', sideOpen ? 'true' : 'false');
  btnParams?.setAttribute('aria-expanded', benchOpen ? 'true' : 'false');
  // 宽屏：params 改为折叠/展开三栏工作台（非整隐）；close 仍仅抽屉模式
  if (btnParams) {
    btnParams.hidden = false;
    btnParams.tabIndex = 0;
    btnParams.setAttribute('aria-hidden', 'false');
    const lbl = btnParams.querySelector('.lbl');
    if (lbl) lbl.textContent = compact ? 'params' : (benchCollapsed ? 'bench' : 'fold');
  }
  if (btnCloseBench) {
    btnCloseBench.hidden = !compact;
    btnCloseBench.tabIndex = compact ? 0 : -1;
    btnCloseBench.setAttribute('aria-hidden', compact ? 'false' : 'true');
  }
  const showBackdrop = sideOpen || (compact && bench.classList.contains('open'));
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
  const chassis = document.getElementById('chassis');
  // 宽屏：params 折叠/展开第三栏（bench-collapsed），close 仍无操作空间。
  // 窄屏抽屉：open=false 真正收起。
  if (!isCompact()) {
    bench.classList.add('open');
    bench.style.transform = '';
    bench.style.height = '';
    chassis?.classList.toggle('bench-collapsed', !open);
    try {
      localStorage.setItem('physics-lab-bench-collapsed', chassis?.classList.contains('bench-collapsed') ? '1' : '0');
    } catch { /* ignore */ }
    syncDrawerChrome();
    return;
  }
  chassis?.classList.remove('bench-collapsed');
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
  const model = (id && models.some((m) => m.id === id) ? getModelById(id) : null)
    || getModelById(DEFAULT_MODEL_ID)
    || models[0];
  if (!model) return;
  app.model = model;
  setModelPalette(model.id);
  app.state = createState(model);
  stepper.reset();
  prevReadoutMap = new Map();
  baselineStore.activeId = null;
  setSafeRestoreVisible(false);
  toolbarTitle.textContent = model.name;
  toolbarSub.textContent = [model.sub, ...(model.tags || []).filter((t) => t !== model.sub)].filter(Boolean).join(' / ') || 'model';
  metaFormula.textContent = [model.formula, model.description].filter(Boolean).join('\n');
  paramBench.bind(model, app.state.params, app.globals);
  syncSidebarActive();
  updateShellStrip();
  renderBaselineSelect();
  updateHud();
  setBenchOpen(!isCompact());
  persistActiveModel(model.id);
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
          showToast(`非有限值保护: ${check.bad.slice(0, 2).join(', ')} — 可恢复安全默认`);
          app.paused = true;
          syncPauseUi();
          setSafeRestoreVisible(true);
        }
      } catch (err) {
        console.warn('step error', err);
        showToast('仿真步进异常，已暂停 — 可恢复安全默认');
        app.paused = true;
        syncPauseUi();
        setSafeRestoreVisible(true);
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
  if (!isCompact()) {
    const collapsed = document.getElementById('chassis')?.classList.contains('bench-collapsed');
    setBenchOpen(!!collapsed); // 折叠→展开 / 展开→折叠
    return;
  }
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
  rows = rows.map((row) => {
    const out = { ...(typeof row === 'object' && row ? row : { v: row }) };
    const e = energyAtTrajectoryRow(app.model, app.state, out);
    if (e) {
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
  const bucket = modelBaselineBucket();
  const values = Object.fromEntries([...prevReadoutMap.entries()]);
  const slot = {
    id: `pin-${Date.now()}`,
    name: `钉住 ${bucket.length + 1}`,
    values,
    ts: Date.now(),
  };
  bucket.push(slot);
  while (bucket.length > 8) bucket.shift();
  baselineStore.activeId = slot.id;
  saveBaselines();
  renderBaselineSelect();
  paramBench.refresh?.();
  showToast('已钉住基线（对照开）');
});

btnSaveBaseline?.addEventListener('click', () => saveBaselineSnapshot());
document.getElementById('btn-export-baseline')?.addEventListener('click', () => {
  const payload = {
    version: 1,
    kind: 'lab-baseline-pack',
    modelId: app.model?.id,
    modelName: app.model?.name,
    exportedAt: new Date().toISOString(),
    snapshots: modelBaselineBucket(),
    activeId: baselineStore.activeId,
  };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${app.model?.id || 'lab'}-baselines.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('已导出对照卷 JSON');
});
document.getElementById('btn-export-classpack')?.addEventListener('click', () => {
  const files = [{
    name: 'manifest.json',
    data: JSON.stringify({
      kind: 'lab-classroom-pack',
      version: 1,
      exportedAt: new Date().toISOString(),
      models: Object.keys(baselineStore.byModel),
    }, null, 2),
  }];
  for (const [mid, snaps] of Object.entries(baselineStore.byModel)) {
    if (!snaps?.length) continue;
    files.push({
      name: `models/${mid}.json`,
      data: JSON.stringify({ modelId: mid, snapshots: snaps }, null, 2),
    });
  }
  if (files.length < 2) {
    showToast('尚无快照可打包 — 先存几个对照快照');
    return;
  }
  const blob = buildZipStore(files);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lab-classroom-pack-${Date.now()}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`课堂包已导出（${files.length - 1} 个模型）`);
});
document.getElementById('btn-import-baseline')?.addEventListener('click', () => {
  document.getElementById('baseline-file')?.click();
});
document.getElementById('baseline-file')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  try {
    const isZip = /\.zip$/i.test(file.name) || file.type.includes('zip');
    if (isZip) {
      const entries = await readZipStore(await file.arrayBuffer());
      let n = 0;
      for (const ent of entries) {
        if (!ent.name.startsWith('models/') || !ent.name.endsWith('.json')) continue;
        const data = JSON.parse(ent.data);
        const mid = data.modelId || ent.name.replace(/^models\//, '').replace(/\.json$/, '');
        if (!baselineStore.byModel[mid]) baselineStore.byModel[mid] = [];
        const bucket = baselineStore.byModel[mid];
        for (const s of data.snapshots || []) {
          if (!s?.values) continue;
          bucket.push({
            id: s.id || `imp-${Date.now()}-${n}`,
            name: s.name || '导入',
            values: s.values,
            ts: s.ts || Date.now(),
          });
          n += 1;
        }
        while (bucket.length > 8) bucket.shift();
      }
      saveBaselines();
      renderBaselineSelect();
      showToast(`课堂包导入 ${n} 个快照`);
      return;
    }
    const text = await file.text();
    const data = JSON.parse(text);
    const snaps = Array.isArray(data?.snapshots) ? data.snapshots : (Array.isArray(data) ? data : null);
    if (!snaps?.length) throw new Error('无 snapshots');
    const bucket = modelBaselineBucket();
    for (const s of snaps) {
      if (!s?.values) continue;
      bucket.push({
        id: s.id || `imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: s.name || '导入快照',
        values: s.values,
        ts: s.ts || Date.now(),
      });
    }
    while (bucket.length > 8) bucket.shift();
    saveBaselines();
    const last = bucket[bucket.length - 1];
    if (last) activateBaseline(last);
    showToast(`已导入 ${snaps.length} 个对照快照`);
  } catch (err) {
    showToast(`导入失败: ${err.message || err}`);
  }
});
baselineSelect?.addEventListener('change', () => {
  const id = baselineSelect.value;
  if (!id) {
    baselineStore.activeId = null;
    app.globals.pinBaseline = false;
    updateHud({ snapshotPrev: true });
    return;
  }
  const slot = modelBaselineBucket().find((s) => s.id === id);
  if (slot) {
    activateBaseline(slot);
    showToast(`对照切换：${slot.name}`);
  }
});
btnSafeRestore?.addEventListener('click', () => restoreSafeDefaults());

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
filterFormalism?.addEventListener('change', () => {
  app.filter.formalism = filterFormalism.value;
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
  restoreSafeDefaults: () => restoreSafeDefaults(),
  getCapabilities: () => deriveCapabilities(app.model),
  saveBaseline: (name) => saveBaselineSnapshot(name),
};

function bindCanvasPointer() {
  let dragging = false;
  const toLocal = (e) => {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / Math.max(r.width, 1) / (window.devicePixelRatio || 1);
    // paintFrame 用 CSS 像素逻辑坐标
    return {
      x: ((e.clientX - r.left) / r.width) * (canvas.width / (window.devicePixelRatio || 1)),
      y: ((e.clientY - r.top) / r.height) * (canvas.height / (window.devicePixelRatio || 1)),
    };
  };
  // 更稳：用 view 逻辑尺寸
  const pt = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (typeof app.model?.onPointer !== 'function') return;
    const p = pt(e);
    const handled = app.model.onPointer(app.state, { type: 'down', x: p.x, y: p.y });
    if (handled) {
      dragging = true;
      canvas.setPointerCapture?.(e.pointerId);
      e.preventDefault();
      paintFrame();
      paramBench.refresh?.();
      updateHud({ flash: true });
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || typeof app.model?.onPointer !== 'function') return;
    const p = pt(e);
    if (app.model.onPointer(app.state, { type: 'move', x: p.x, y: p.y })) {
      paintFrame();
      paramBench.refresh?.();
      updateHud({ flash: true });
    }
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    const p = pt(e);
    app.model?.onPointer?.(app.state, { type: 'up', x: p.x, y: p.y });
    paintFrame();
    paramBench.refresh?.();
    updateHud({ flash: true });
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  void toLocal;
}

async function boot() {
  if (localStorage.getItem('physics-lab-hc') === '1') {
    document.documentElement.classList.add('hc');
  }
  if (localStorage.getItem('physics-lab-bench-collapsed') === '1') {
    document.getElementById('chassis')?.classList.add('bench-collapsed');
  }
  btnMenu.innerHTML = ICO.menu;
  btnReset.innerHTML = btnHtml('reset', 'reset');
  btnShot.innerHTML = btnHtml('cam', 'png');
  btnCsv.innerHTML = btnHtml('csv', 'csv');
  btnParams.innerHTML = btnHtml('params', 'params');
  btnCloseBench.innerHTML = btnHtml('close', 'close');

  await loadModelMetadata('./data/models.json');
  populateTagFilter();
  populateFormalismFilter();
  applyGlobals();
  syncPauseUi();
  buildSidebar();
  switchModel(resolveInitialModelId());
  if (!isCompact()) bench.classList.add('open');
  bindCanvasPointer();
  syncDrawerChrome();
  requestAnimationFrame(frame);
}

boot();
