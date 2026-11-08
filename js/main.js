import {
  models, domainIndex, getModelById, getAllTags, rebuildModels, loadIndex, loadDomain, ensureId, primeHandModel, ensureDomainNames,
} from './models/browser.js';
import { resizeCanvas } from './utils/canvas.js';
import { createFixedStepper } from './utils/integrator.js';
import { downloadCanvasPng, downloadCsv, composeExport } from './utils/export.js';
import { createParamBench } from './ui/paramBench.js';
import { finiteOr, sanitizeGlobals } from './utils/params.js';
import {
  isCompactViewport,
  isHeavyModel,
  isPhoneViewport,
  mobileBudget,
  powerSaverEnabled,
  setPowerSaver,
  viewportTier,
} from './utils/mobilePerf.js';
import { btnHtml, iconOnly, ICO } from './ui/icons.js';
import { setModelPalette, getModelColors, palettesReady, palettesReadyNow, hydratePalettesForModel } from './utils/theme.js';
import { deriveCapabilities } from './ui/modelShell.js';
import { buildZipStore, readZipStore } from './utils/zipStore.js';
import { FAMILY_META, formalismFor } from './lab/formalism.js';
import {
  USER_MODEL_FAMILIES,
  ensureTopicRows,
  validateUserModelDraft,
  persistUserSpec,
  loadUserSpecs,
  deleteUserSpec,
  exportUserSpecsJson,
  parseUserSpecsImport,
  mergeImportedSpecs,
} from './lab/userModels.js';
import {
  t,
  getLocale,
  domainLabel,
  localizeModel,
  mountLocaleSelect,
  applyDomI18n,
  onLocaleChange,
  bootI18n,
  ensureSidebarLocales,
} from './i18n/index.js';
import { ensureCatalogGloss, formulaLine } from './i18n/previewText.js';
import {
  listShells,
  resolveShellId,
  persistShellId,
  applyShell,
  getShell,
} from './shells/registry.js';
import { createMicroscopeChrome } from './shells/microscopeChrome.js';

const canvas = document.getElementById('canvas');
const canvasWebgl = document.getElementById('canvas-webgl');
const canvasWrap = document.querySelector('.canvas-wrap');
let webglStage = null;
let activeShellId = resolveShellId();
/** @type {ReturnType<typeof createMicroscopeChrome> | null} */
let microUi = null;
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
const filterHeavyBtn = document.getElementById('filter-heavy');
const foldBarEl = document.getElementById('fold-bar');
const btnUserModel = document.getElementById('btn-user-model');
const userModelDialog = document.getElementById('user-model-dialog');
const userModelForm = document.getElementById('user-model-form');
const userModelError = document.getElementById('user-model-error');
const userModelFamily = document.getElementById('user-model-family');
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
  filter: { q: '', tag: '', formalism: '', heavy: false },
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
    powerSaver: false,
  },
};

const FOLD_KEY = 'physics-lab-folds-v1';
const BASELINE_KEY = 'physics-lab-baselines-v1';
const MODEL_KEY = 'physics-lab-model';
const RECENTS_KEY = 'physics-lab-recents-v1';
const RECENTS_MAX = 8;
const AUTO_OPEN_BENCH_KEY = 'physics-lab-auto-open-bench';
const DEFAULT_MODEL_ID = 'free-fall';
/** P1 stub: shareable deep link `#m=<id>&p=<compressed-params>` (encoding TBD; keep IA 三栏). */
const HOT_SUBS = new Set([
  '经典力学', '算法与数据结构', '计算机体系结构', '波与振动', '电磁学', '光学', '数字逻辑',
  '梁与框架', '动力循环', '经典控制', '气动', '交通流', '静力与强度',
]);

/** URL: write `#m=<id>`; read hash then `?model=<id>`. URL beats localStorage on boot. */
function readModelIdFromUrl() {
  try {
    const q = new URLSearchParams(location.search);
    const fromQuery = q.get('model') || q.get('narrow') || q.get('shot') || q.get('m');
    if (fromQuery) return fromQuery;
    const hash = (location.hash || '').replace(/^#/, '');
    if (hash.includes('=')) {
      const m = new URLSearchParams(hash).get('m');
      if (m) return m;
    }
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
  // Exclusive shells (microscope) pin their model — do not fall through to free-fall
  // after mountShellSelect already entered the shell.
  const shellModel = getShell(resolveShellId())?.modelId;
  if (shellModel) return shellModel;
  // URL / narrow / #m= wins even before ensureId has loaded the subject into `models`.
  const fromUrl = readModelIdFromUrl();
  if (fromUrl) return fromUrl;
  const fromStorage = readModelIdFromStorage();
  if (fromStorage && models.some((m) => m.id === fromStorage)) return fromStorage;
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
const shellDeprecatedEl = document.getElementById('shell-deprecated');
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
  return isCompactViewport();
}
function isMobileDrawer() {
  // Phone + short-landscape: bottom drawer / overlay sidebar.
  return isPhoneViewport();
}

/** Keep the active row inside the list and below a toolbar that covers the drawer. */
function revealCatalogButton(btn) {
  const list = btn?.closest?.('.model-list');
  if (!(list instanceof HTMLElement) || !(btn instanceof HTMLElement)) return;
  const toolbar = document.querySelector('.toolbar');
  const tr = toolbar?.getBoundingClientRect();
  const lr = list.getBoundingClientRect();
  let pad = 12;
  if (tr && tr.width > 0 && tr.bottom > lr.top && tr.right > lr.left && tr.left > lr.left - 4) {
    pad = Math.max(pad, tr.bottom - lr.top + 12);
  }
  const before = list.scrollTop;
  const delta = btn.getBoundingClientRect().top - (lr.top + pad);
  if (Math.abs(delta) > 1) list.scrollTop = before + delta;
  if (Math.abs(btn.getBoundingClientRect().top - (list.getBoundingClientRect().top + pad)) > 2) {
    try { btn.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch { /* ignore */ }
    const again = btn.getBoundingClientRect().top - (list.getBoundingClientRect().top + pad);
    if (Math.abs(again) > 1) list.scrollTop += again;
  }
}

/** Snapshot catalog defaults once so live edits never poison "restore defaults". */
function ensureParamDefaults(model) {
  if (!model || model.__paramDefaultsFrozen) return;
  try {
    model.paramDefaults = JSON.parse(JSON.stringify(model.params || {}));
  } catch {
    model.paramDefaults = { ...(model.params || {}) };
  }
  model.__paramDefaultsFrozen = true;
}

function createState(model) {
  ensureParamDefaults(model);
  const src = model.paramDefaults || model.params || {};
  const params = JSON.parse(JSON.stringify(src));
  const state = { params };
  model.init(state);
  return state;
}

function applyGlobals() {
  sanitizeGlobals(app.globals);
  if (typeof app.globals.powerSaver === 'boolean') setPowerSaver(!!app.globals.powerSaver);
  else app.globals.powerSaver = powerSaverEnabled();
  stepper.setFixedDt(app.globals.fixedDt);
  // Compact viewports (and desktop power-saver) clamp substeps.
  const budget = mobileBudget();
  const steps = Math.min(Math.max(1, Number(app.globals.maxSubSteps) || 48), budget.maxSubSteps);
  stepper.setMaxSubSteps(steps);
  speedSlider.value = String(app.globals.timeScale);
  speedLabel.textContent = `${Number(app.globals.timeScale).toFixed(1)}×`;
  document.documentElement.dataset.viewportTier = viewportTier();
}

function syncPauseUi() {
  btnPause.innerHTML = app.paused
    ? btnHtml('play', t('ui.play'))
    : btnHtml('pause', t('ui.pause'));
  btnPause.classList.toggle('primary', !app.paused);
}

/** 模型声明 shouldPauseApp / state._pauseApp 时暂停全局时钟 */
function syncModelClockPause() {
  if (app.state?._pauseApp) {
    app.state._pauseApp = false;
    if (!app.paused) {
      app.paused = true;
      syncPauseUi();
      if (app.model?.id === 'projectile') showToast('已落地 · 已暂停');
    }
  }
  if (typeof app.model?.shouldPauseApp === 'function' && app.model.shouldPauseApp(app.state)) {
    if (!app.paused) {
      app.paused = true;
      syncPauseUi();
    }
  }
  updateShellStrip();
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

/** 初值/数值改参：节流 toast，避免拖电位器刷屏 */
let reinitToastAt = 0;
function toastReinitThrottled() {
  const now = Date.now();
  if (now - reinitToastAt < 900) return;
  reinitToastAt = now;
  showToast('已重置仿真状态');
}

function loadRecents() {
  try {
    const arr = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
    if (!Array.isArray(arr)) return [];
    return arr.filter((id) => typeof id === 'string' && models.some((m) => m.id === id)).slice(0, RECENTS_MAX);
  } catch {
    return [];
  }
}

function pushRecent(id) {
  if (!id || !models.some((m) => m.id === id)) return;
  const next = [id, ...loadRecents().filter((x) => x !== id)].slice(0, RECENTS_MAX);
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
}

/** 窄屏默认收起，避免抽屉盖住公式。localStorage physics-lab-auto-open-bench=1 才自动打开。 */
function autoOpenBenchOnSelect() {
  try {
    const v = localStorage.getItem(AUTO_OPEN_BENCH_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch { /* ignore */ }
  return false;
}

function scrollBenchToDynamics() {
  const dyn = paramRoot?.querySelector('.param-section[data-priority="dyn"]');
  dyn?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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

let lastAppliedParam = { key: '', value: undefined, at: 0 };
let paramApplyRaf = 0;
let paramApplyPendingKey = null;

function applyParamChange(key, opts = {}) {
  const immediate = !!opts.immediate;
  const nextVal = app.state?.params?.[key];
  const scrubbingLive = scrubResume === null && !shouldReinitModel(key);
  if (
    key
    && lastAppliedParam.key === key
    && Object.is(lastAppliedParam.value, nextVal)
    && (performance.now() - lastAppliedParam.at) < 32
  ) {
    return;
  }
  if (!immediate && !shouldReinitModel(key)) {
    paramApplyPendingKey = key;
    if (paramApplyRaf) return;
    paramApplyRaf = requestAnimationFrame(() => {
      paramApplyRaf = 0;
      const k = paramApplyPendingKey;
      paramApplyPendingKey = null;
      if (k) applyParamChange(k, { immediate: true });
    });
    return;
  }
  lastAppliedParam = { key, value: nextVal, at: performance.now() };
  const reinit = shouldReinitModel(key);
  if (reinit) {
    stepper.reset();
    const kept = { ...app.state.params };
    app.state = { params: kept };
    app.model.init(app.state);
    if (key === 'layoutSteps') showToast(t('toast.layoutRelayout'));
    else toastReinitThrottled();
  }
  // Live: refresh/recompute. Avoid step(dt=0) spam — the integrator applies dynamics while scrubbing live.
  try {
    if (typeof app.model.refresh === 'function') app.model.refresh(app.state);
    else if (typeof app.model.recompute === 'function') app.model.recompute(app.state);
    else if (reinit && typeof app.model.step === 'function') app.model.step(app.state, 0);
  } catch (err) {
    console.warn('refresh after param', err);
    showToast(t('toast.paramFail', { key }));
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
      const mode = reinit ? 'reinit' : 'live';
      console.debug(`[param ${mode}]`, key, app.state?.params?.[key]);
    }, 120);
  }
  syncModelClockPause();
  paintFrame();
  updateHud({ flash: !scrubbingLive });
}

function setSafeRestoreVisible(on) {
  if (!btnSafeRestore) return;
  btnSafeRestore.hidden = !on;
}

async function updateShellStrip() {
  const cap = deriveCapabilities(app.model);
  if (shellDeprecatedEl) {
    const dep = !!app.model?.deprecated;
    shellDeprecatedEl.hidden = !dep;
    shellDeprecatedEl.textContent = dep ? 'deprecated' : '';
    shellDeprecatedEl.title = app.model?.deprecatedReason || '';
  }
  if (shellModeEl) {
    shellModeEl.textContent = [cap.formalism, cap.interaction].filter(Boolean).join(' · ') || 'knobs';
  }
  if (shellHintEl) {
    const hint = String(cap.hint || '');
    const isDisclaimer = /原理级|非\s*(FEA|工业|临床|设计|CFD|SPICE|N\s*体)|不作长期|假设/.test(hint);
    shellHintEl.textContent = isDisclaimer ? '' : hint;
  }
  const shell = document.getElementById('model-shell');
  const ensureLine = (id, className) => {
    let el = document.getElementById(id);
    if (!el && shell) {
      el = document.createElement('p');
      el.id = id;
      el.className = className;
      shell.appendChild(el);
    }
    return el;
  };
  const loc = getLocale();
  if (loc !== 'zh') await ensureCatalogGloss(loc);
  // Formula stays; assumption / caveat chrome stay off the stage (catalog metadata only).
  document.getElementById('shell-assumptions')?.remove();
  document.getElementById('shell-caveat')?.remove();
  const formulaEl = ensureLine('shell-formula', 'shell-formula');
  if (formulaEl) formulaEl.textContent = formulaLine(loc, app.model?.formula || '');
  // 课堂模式：时钟已暂停徽章 + 恢复自动步进
  let pauseBadge = document.getElementById('shell-pause-badge');
  if (!pauseBadge) {
    pauseBadge = document.createElement('span');
    pauseBadge.id = 'shell-pause-badge';
    pauseBadge.className = 'shell-chip shell-pause-badge';
    document.getElementById('model-shell')?.insertBefore(
      pauseBadge,
      document.getElementById('shell-actions') || null,
    );
  }
  let resumeDemoBtn = document.getElementById('shell-resume-demo');
  if (!resumeDemoBtn) {
    resumeDemoBtn = document.createElement('button');
    resumeDemoBtn.type = 'button';
    resumeDemoBtn.id = 'shell-resume-demo';
    resumeDemoBtn.className = 'btn quiet shell-resume-demo';
    resumeDemoBtn.textContent = '恢复自动步进';
    resumeDemoBtn.addEventListener('click', () => {
      if (typeof app.model?.runAction === 'function') {
        const ok = app.model.runAction(app.state, 'autoDemo');
        if (ok) {
          app.paused = false;
          syncPauseUi();
          updateShellStrip();
          paintFrame();
          paramBench.refresh?.();
          showToast('已恢复自动步进');
          return;
        }
      }
      if (!app.state?.params) return;
      app.state.params.demo = 0;
      applyParamChange('demo');
      app.paused = false;
      syncPauseUi();
      updateShellStrip();
      showToast('已恢复自动步进');
    });
    pauseBadge.after(resumeDemoBtn);
  }
  const demoPause = typeof app.model?.shouldPauseApp === 'function'
    && app.model.shouldPauseApp(app.state);
  if (demoPause) {
    pauseBadge.hidden = false;
    pauseBadge.textContent = '时钟已暂停 · 用 step';
    pauseBadge.title = '课堂演示：全局时钟暂停，点工具条单步推进';
    resumeDemoBtn.hidden = false;
  } else {
    pauseBadge.hidden = true;
    pauseBadge.textContent = '';
    resumeDemoBtn.hidden = true;
  }
  canvas?.classList.toggle('has-pointer', !!cap.hasPointer);
  renderShellActions(cap);
}

function syncShellActionEnabled() {
  const bar = document.getElementById('shell-actions');
  if (!bar || typeof app.model?.actionEnabled !== 'function') return;
  for (const btn of bar.querySelectorAll('button[data-action-id]')) {
    const id = btn.getAttribute('data-action-id');
    const enabled = !!app.model.actionEnabled(app.state, id);
    btn.disabled = !enabled;
    btn.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    btn.title = enabled
      ? (btn.textContent || id)
      : (id === 'redoEdge' ? '无可重做' : id === 'undoEdge' ? '无可撤销' : btn.textContent || id);
  }
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
  const sig = actions.map((a) => a.id).join('|');
  // undo/redo 后只刷新 disabled，不整表重建
  if (bar.dataset.actionSig === sig && bar.childElementCount === actions.length) {
    syncShellActionEnabled();
    return;
  }
  bar.dataset.actionSig = sig;
  bar.innerHTML = '';
  for (const a of actions) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn quiet';
    btn.dataset.actionId = a.id;
    btn.textContent = a.label || a.id;
    const enabled = typeof app.model?.actionEnabled === 'function'
      ? !!app.model.actionEnabled(app.state, a.id)
      : true;
    btn.disabled = !enabled;
    btn.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    btn.title = enabled ? (a.label || a.id) : (a.id === 'redoEdge' ? '无可重做' : a.id === 'undoEdge' ? '无可撤销' : a.label || a.id);
    btn.addEventListener('click', () => {
      if (btn.disabled || typeof app.model?.runAction !== 'function') return;
      const ok = app.model.runAction(app.state, a.id);
      if (ok) {
        if (app.state?._resumeApp) {
          app.state._resumeApp = false;
          if (app.paused) {
            app.paused = false;
            syncPauseUi();
          }
        }
        // 逻辑门 undo/redo：只更新 disabled，不整壳重建
        if (a.id === 'undoEdge' || a.id === 'redoEdge') {
          syncShellActionEnabled();
          paintFrame();
          paramBench.refresh?.();
          updateHud({ flash: true });
          showToast(a.label || a.id);
          return;
        }
        updateShellStrip();
        paintFrame();
        paramBench.refresh?.();
        updateHud({ flash: true });
        showToast(a.label || a.id);
      } else {
        showToast(a.id === 'redoEdge' ? '无可重做' : '无可撤销操作');
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
  showToast(t('toast.safeRestore'));
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
  if (slot.params || slot.sim) {
    if (slot.sim) {
      applySnapshotSimState(slot);
    } else if (slot.params && app.state?.params) {
      Object.assign(app.state.params, slot.params);
      try {
        if (typeof app.model.init === 'function') {
          const kept = { ...app.state.params };
          app.state = { params: kept };
          app.model.init(app.state);
        } else if (typeof app.model.refresh === 'function') app.model.refresh(app.state);
      } catch { /* ignore */ }
    }
    paintFrame();
  }
  paramBench.refresh?.();
  renderBaselineSelect();
  updateHud();
}

function snapshotSimState(state) {
  if (!state || typeof state !== 'object') return null;
  const out = {};
  const arrayKeys = new Set([
    'trail', 'trails', 'hist', 'wave', 'path', 'arr',
    'grid', 'queue', 'visited', 'parent', 'gScore', 'stack',
  ]);
  const objKeys = new Set(['start', 'goal']);
  for (const [k, v] of Object.entries(state)) {
    if (k === 'params' || k.startsWith('_')) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean' || typeof v === 'string') out[k] = v;
    else if (Array.isArray(v) && arrayKeys.has(k)) {
      const sliced = (k === 'trail' || k === 'trails' || k === 'hist' || k === 'wave')
        ? v.slice(-400)
        : v;
      out[k] = JSON.parse(JSON.stringify(sliced));
    } else if (v && typeof v === 'object' && objKeys.has(k)) {
      out[k] = JSON.parse(JSON.stringify(v));
    }
  }
  return out;
}

function applySnapshotSimState(slot) {
  if (!slot || !app.state) return;
  if (slot.params) Object.assign(app.state.params, slot.params);
  if (slot.sim && typeof slot.sim === 'object') {
    // 有完整仿真态时不要 refresh/init 冲掉 trail/t
    for (const [k, v] of Object.entries(slot.sim)) {
      app.state[k] = Array.isArray(v) ? JSON.parse(JSON.stringify(v)) : v;
    }
    return;
  }
  try {
    if (typeof app.model.refresh === 'function') app.model.refresh(app.state);
    else if (typeof app.model.recompute === 'function') app.model.recompute(app.state);
  } catch { /* ignore */ }
}

function hashParams(params) {
  const raw = JSON.stringify(params || {});
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (`00000000${(h >>> 0).toString(16)}`).slice(-8);
}

function saveBaselineSnapshot(name) {
  const readouts = app.lastReadouts?.length
    ? app.lastReadouts
    : (app.model?.getReadouts(app.state, { digits: app.globals.readoutDigits }) || []);
  const values = Object.fromEntries(readouts.map((r) => [r.label, r.value]));
  const bucket = modelBaselineBucket();
  const params = { ...(app.state?.params || {}) };
  const slot = {
    id: `s${Date.now()}`,
    name: name || `快照 ${bucket.length + 1}`,
    values,
    params,
    sim: snapshotSimState(app.state),
    paramsHash: hashParams(params),
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
  baselineSelect.innerHTML = `<option value="">${t('ui.baselineCurrent')}</option>`
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
  onScrubStart: (opts = {}) => {
    // Live dynamics/display keep integrating while dragging; globals + reinit still pause.
    if (opts.pause === false) return;
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

/**
 * Re-run from t=0 keeping the current params (toolbar 「重跑」).
 * Not for "restore defaults" / microscope 「重置光学」.
 */
function resetSim() {
  if (!app.model || !app.state?.params) return;
  stepper.reset();
  const kept = { ...app.state.params };
  app.state = { params: kept };
  app.model.init(app.state);
  setSafeRestoreVisible(false);
  updateHud();
  paintFrame();
}

/** Microscope 「Reset optics」: schema defaults + safe globals (not keep-params re-run). */
function resetOptics() {
  restoreSafeDefaults();
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
        if (app.filter.formalism && formalismFor(m) !== app.filter.formalism) return false;
        if (app.filter.heavy && !isHeavyModel(m.id)) return false;
        return true;
      });
    }
  }
  const tokens = expandSearchQuery(app.filter.q);
  return models.filter((m) => {
    if (app.filter.tag && !(m.tags || []).includes(app.filter.tag)) return false;
    if (app.filter.formalism && formalismFor(m) !== app.filter.formalism) return false;
    if (app.filter.heavy && !isHeavyModel(m.id)) return false;
    if (!tokens.length) return true;
    const hay = `${m.name} ${m.id} ${m.sub || ''} ${m.formula || ''} ${(m.tags || []).join(' ')} ${m.description || ''} ${m.formalism || ''}`.toLowerCase();
    return tokens.some((t) => hay.includes(t));
  });
}

function makeModelButton(raw) {
  const m = localizeModel(raw);
  const btn = document.createElement('button');
  const active = app.model?.id === m.id;
  const heavy = isHeavyModel(m.id);
  btn.type = 'button';
  btn.className = 'model-item' + (active ? ' active' : '') + (heavy ? ' is-heavy' : '');
  btn.dataset.id = m.id;
  if (heavy) btn.dataset.perfClass = 'heavy';
  if (active) btn.setAttribute('aria-current', 'page');
  const tags = (m.tags || []).filter((t) => !DOMAIN_ORDER.includes(t)).slice(0, 2)
    .map((t) => `<span class="tag">${t}</span>`);
  if (heavy) {
    const hint = t('ui.perfHeavyHint');
    tags.unshift(
      `<span class="tag heavy" title="${hint}" aria-label="${hint}">${t('ui.perfHeavy')}</span>`,
    );
    btn.setAttribute('aria-label', `${m.name}. ${hint}`);
  }
  btn.title = heavy ? `${m.name} · ${t('ui.perfHeavyHint')}` : m.name;
  btn.innerHTML = `<span class="name">${m.name}</span><span class="tags">${tags.join('')}</span>`;
  btn.addEventListener('click', () => {
    switchModel(m.id);
    setSidebarOpen(false);
  });
  return btn;
}

function renderRecentsStrip() {
  const ids = loadRecents();
  if (!ids.length) return null;
  const strip = document.createElement('div');
  strip.className = 'recents-strip';
  strip.setAttribute('aria-label', t('ui.recents'));
  const label = document.createElement('span');
  label.className = 'recents-label';
  label.textContent = t('ui.recents');
  strip.appendChild(label);
  for (const id of ids) {
    const raw = getModelById(id);
    if (!raw) continue;
    const m = localizeModel(raw);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'recents-chip' + (app.model?.id === id ? ' is-active' : '');
    b.textContent = m.name;
    b.title = m.id;
    if (app.model?.id === id) b.setAttribute('aria-current', 'page');
    b.addEventListener('click', () => {
      switchModel(id);
      setSidebarOpen(false);
    });
    strip.appendChild(b);
  }
  return strip;
}

/** Isolated from domain folds — the only catalog path into lab-microscope3d. */
function renderMicro3dStrip() {
  const strip = document.createElement('div');
  strip.className = 'micro3d-strip';
  strip.setAttribute('aria-label', t('ui.micro3dSection'));
  const kicker = document.createElement('span');
  kicker.className = 'micro3d-kicker';
  kicker.textContent = t('ui.micro3dSection');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'btn-micro3d-entry';
  btn.className = 'micro3d-entry'
    + (activeShellId === 'lab-microscope3d' ? ' is-active' : '');
  btn.innerHTML = `<span class="name">${t('ui.micro3dEntry')}</span>`
    + `<span class="tags"><span class="tag">WebGL</span></span>`;
  btn.title = t('ui.micro3dLede');
  if (activeShellId === 'lab-microscope3d') btn.setAttribute('aria-current', 'page');
  btn.addEventListener('click', () => {
    microUi?.enter?.();
    setSidebarOpen(false);
  });
  strip.append(kicker, btn);
  return strip;
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
    const name = el.dataset.domain
      || el.querySelector('.domain-name')?.dataset.domain
      || el.querySelector('.domain-name')?.textContent
      || '';
    next[foldKey(name)] = open;
  }
  for (const el of modelListEl.querySelectorAll('details.sub-group')) {
    const sub = el.querySelector('.sub-name')?.dataset.sub
      || el.querySelector('.sub-name')?.textContent
      || '';
    const domain = el.closest('.domain-group')?.dataset.domain
      || el.closest('.domain-group')?.querySelector('.domain-name')?.dataset.domain
      || '';
    next[foldKey(domain, sub)] = open;
  }
  saveFolds(next);
}

function buildSidebar() {
  void (async () => {
    const loc = getLocale();
    if (loc !== 'zh') {
      await ensureCatalogGloss(loc);
      await ensureSidebarLocales();
    }
    paintSidebar();
  })();
}

function paintSidebar() {
  modelListEl.innerHTML = '';
  const list = filteredModels();
  const folds = loadFolds();
  const searching = !!app.filter.q.trim() || !!app.filter.tag || !!app.filter.formalism || !!app.filter.heavy;
  const countEl = document.createElement('div');
  countEl.className = 'filter-count';
  const parts = [];
  if (app.filter.tag) parts.push(`tag:${app.filter.tag}`);
  if (app.filter.formalism) parts.push(`form:${app.filter.formalism}`);
  if (app.filter.heavy) parts.push('heavy');
  if (app.filter.q.trim()) parts.push(`q:${app.filter.q.trim()}`);
  const catalogTotal = domainIndex.length || models.length;
  countEl.textContent = parts.length
    ? `筛选 ${list.length} / ${catalogTotal} · ${parts.join(' · ')}`
    : `全部 ${catalogTotal} 模型`;
  // 三次点击循环：清 tag/form → 清 q → 提示已空；aria-live 播报
  countEl.title = parts.length
    ? '点击：清 tag/form → 再点清 q → 再点提示已空'
    : '点击提示：当前无筛选';
  countEl.style.cursor = 'pointer';
  countEl.setAttribute('role', 'status');
  countEl.setAttribute('aria-live', 'polite');
  const announce = (msg) => {
    countEl.setAttribute('aria-label', msg);
    showToast(msg);
  };
  countEl.addEventListener('click', () => {
    if (app.filter.tag || app.filter.formalism || app.filter.heavy) {
      const keepQ = !!app.filter.q.trim();
      app.filter.tag = '';
      app.filter.formalism = '';
      app.filter.heavy = false;
      if (filterTag) filterTag.value = '';
      if (filterFormalism) filterFormalism.value = '';
      syncHeavyFilterChip();
      buildSidebar();
      announce(keepQ ? '已清除 tag · form · heavy（再点清除搜索）' : '已清除 tag · form · heavy 筛选');
      return;
    }
    if (app.filter.q.trim()) {
      app.filter.q = '';
      if (filterQ) filterQ.value = '';
      buildSidebar();
      announce('已清除搜索 q');
      return;
    }
    announce('筛选已空');
  });
  modelListEl.appendChild(countEl);
  // Own catalog zone at the top of #model-list — with models, never inside a domain fold.
  const microHost = document.createElement('section');
  microHost.id = 'micro3d-host';
  microHost.className = 'micro3d-host';
  microHost.setAttribute('aria-label', t('ui.micro3dSection'));
  microHost.appendChild(renderMicro3dStrip());
  modelListEl.appendChild(microHost);
  if (foldBarEl) {
    foldBarEl.innerHTML = '';
    const btnExpand = document.createElement('button');
    btnExpand.type = 'button';
    btnExpand.className = 'btn quiet';
    btnExpand.textContent = t('ui.expandAll');
    btnExpand.addEventListener('click', () => setAllFolds(true));
    const btnCollapse = document.createElement('button');
    btnCollapse.type = 'button';
    btnCollapse.className = 'btn quiet';
    btnCollapse.textContent = t('ui.collapseAll');
    btnCollapse.addEventListener('click', () => setAllFolds(false));
    foldBarEl.append(btnExpand, btnCollapse);
  }
  const foldHint = document.createElement('p');
  foldHint.className = 'fold-hint';
  foldHint.textContent = t('ui.foldHint');
  const recents = renderRecentsStrip();
  if (recents) modelListEl.appendChild(recents);
  modelListEl.appendChild(foldHint);

  const source = searching
    ? list.map((m) => ({ id: m.id, domain: modelDomain(m), sub: modelSub(m) }))
    : (domainIndex.length ? domainIndex : list.map((m) => ({ id: m.id, domain: modelDomain(m), sub: modelSub(m) })));
  if (!source.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:0.75rem;font-family:var(--font-mono);font-size:0.75rem;color:var(--muted)';
    empty.textContent = t('ui.noMatch');
    modelListEl.appendChild(empty);
    return;
  }
  const groups = new Map();
  for (const row of source) {
    const d = row.domain || '其他';
    if (!groups.has(d)) groups.set(d, new Map());
    const sub = row.sub || '未分类';
    if (!groups.get(d).has(sub)) groups.get(d).set(sub, []);
    groups.get(d).get(sub).push(row);
  }
  const order = [...DOMAIN_ORDER, '其他'];
  for (const domain of order) {
    const subMap = groups.get(domain);
    if (!subMap?.size) continue;
    const count = [...subMap.values()].reduce((n, arr) => n + arr.length, 0);
    const details = document.createElement('details');
    details.className = 'domain-group';
    details.dataset.domain = domain;
    const dKey = foldKey(domain);
    // Cold boot stays folded — opening a subject is what triggers loadDomain.
    const wantOpen = searching || (folds[dKey] != null ? !!folds[dKey] : false);
    const sum = document.createElement('summary');
    sum.innerHTML = `<span class="domain-name" data-domain="${domain}">${domainLabel(domain)}</span><span class="domain-count">${count}</span>`;
    const body = document.createElement('div');
    body.className = 'domain-body';
    const fillBody = () => {
      body.replaceChildren();
      for (const [sub, items] of subMap) {
        const ready = items.map((row) => models.find((m) => m.id === row.id)).filter(Boolean);
        if (!ready.length) continue;
        const subEl = document.createElement('details');
        subEl.className = 'sub-group';
        const sKey = foldKey(domain, sub);
        // Deep-link focus writes explicit fold keys; otherwise stay collapsed.
        const defaultOpen = searching;
        const subWantOpen = folds[sKey] != null ? !!folds[sKey] : defaultOpen;
        const subSum = document.createElement('summary');
        const q = app.filter.q.trim();
        const hit = q && (sub === q || sub.toLowerCase() === q.toLowerCase());
        subSum.innerHTML = `<span class="sub-name${hit ? ' is-match' : ''}" data-sub="${sub}">${sub}</span><span class="sub-count">${items.length}</span>`;
        const subBody = document.createElement('div');
        subBody.className = 'sub-body';
        for (const m of ready) subBody.appendChild(makeModelButton(m));
        subEl.append(subSum, subBody);
        subEl.addEventListener('toggle', () => {
          const next = loadFolds();
          next[sKey] = subEl.open;
          saveFolds(next);
        });
        body.appendChild(subEl);
        subEl.open = subWantOpen;
      }
    };
    const ensureBody = () => {
      if (!details.open) return;
      const rows = [...subMap.values()].flat();
      const readyCount = rows.filter((row) => models.some((m) => m.id === row.id)).length;
      // Cold stub may already hold free-fall while the rest of 物理 is still on disk.
      // Require the full subject pack — a single hit must not skip loadDomain.
      const complete = rows.length > 0 && readyCount >= rows.length;
      if (searching || complete) {
        fillBody();
        return;
      }
      if (readyCount > 0) fillBody();
      if (details.dataset.loading === '1') return;
      details.dataset.loading = '1';
      void loadDomain(domain).then(async () => {
        details.dataset.loading = '';
        const lang = getLocale();
        if (lang !== 'zh') {
          try { await ensureSidebarLocales(); } catch { /* ignore */ }
        }
        fillBody();
      }).catch(() => { details.dataset.loading = ''; });
    };
    details.addEventListener('toggle', () => {
      const next = loadFolds();
      next[dKey] = details.open;
      saveFolds(next);
      ensureBody();
    });
    // Set open only after <summary> exists — otherwise browsers keep details closed.
    details.append(sum, body);
    modelListEl.appendChild(details);
    details.open = wantOpen;
    if (details.open) ensureBody();
  }
}

function syncSidebarActive() {
  const id = app.model?.id;
  for (const el of modelListEl.querySelectorAll('.model-item')) {
    const on = el.dataset.id === id;
    el.classList.toggle('active', on);
    if (on) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  }
  for (const el of modelListEl.querySelectorAll('.recents-chip')) {
    // chips store model id in title
    const active = el.title === id;
    el.classList.toggle('is-active', active);
    if (active) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
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
  // 侧栏开：汉堡 → close；关：menu
  if (btnMenu) {
    btnMenu.innerHTML = iconOnly(sideOpen ? 'close' : 'menu');
    btnMenu.setAttribute('aria-label', sideOpen ? t('ui.closeMenu') : t('ui.openMenu'));
  }
  btnParams?.setAttribute('aria-expanded', benchOpen ? 'true' : 'false');
  // 宽屏：params 改为折叠/展开三栏工作台（非整隐）；close 仍仅抽屉模式
  if (btnParams) {
    btnParams.hidden = false;
    btnParams.tabIndex = 0;
    btnParams.setAttribute('aria-hidden', 'false');
    const lbl = btnParams.querySelector('.lbl');
    if (lbl) lbl.textContent = compact ? '参数' : (benchCollapsed ? '参数' : '收起');
  }
  if (btnCloseBench) {
    btnCloseBench.hidden = !compact;
    btnCloseBench.tabIndex = compact ? 0 : -1;
    btnCloseBench.setAttribute('aria-hidden', compact ? 'false' : 'true');
  }
  const overlayOpen = document.getElementById('chassis')?.classList.contains('shell-sidebar-overlay');
  // Projector overlay uses the same dimmed backdrop as the mobile drawer.
  const showBackdrop = sideOpen || overlayOpen || (compact && bench.classList.contains('open'));
  drawerBackdrop.hidden = !showBackdrop;
  document.body.classList.toggle('drawer-open', !!showBackdrop);
  document.getElementById('chassis')?.classList.toggle(
    'bench-drawer-open',
    !!(compact && bench.classList.contains('open')),
  );
}

function isProjectorShell() {
  return document.getElementById('chassis')?.classList.contains('shell-hide-sidebar');
}

function setSidebarOpen(open) {
  const chassis = document.getElementById('chassis');
  // Projector (any width): menu toggles a fixed overlay. Avoid the half-state where
  // shell-hide-sidebar keeps visibility:hidden while .sidebar.open is set.
  if (isProjectorShell()) {
    chassis?.classList.toggle('shell-sidebar-overlay', open);
    sidebar.classList.toggle('open', open);
    sidebar.style.transform = '';
    syncDrawerChrome();
    if (open) {
      // VoiceOver / keyboard: land in search, not the stage Play control.
      requestAnimationFrame(() => { try { filterQ?.focus({ preventScroll: true }); } catch { filterQ?.focus(); } });
    }
    return;
  }
  if (!isMobileDrawer()) {
    sidebar.classList.remove('open');
    sidebar.style.transform = '';
    chassis?.classList.remove('shell-sidebar-overlay');
    syncDrawerChrome();
    return;
  }
  chassis?.classList.remove('shell-sidebar-overlay');
  sidebar.classList.toggle('open', open);
  sidebar.style.transform = '';
  syncDrawerChrome();
  if (open) {
    requestAnimationFrame(() => { try { filterQ?.focus({ preventScroll: true }); } catch { filterQ?.focus(); } });
  }
}

function setBenchOpen(open) {
  const chassis = document.getElementById('chassis');
  // Wide: params folds the third column (bench-collapsed). Compact: only the
  // fixed drawer (.bench.open) — never keep both states at once.
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
  try { localStorage.setItem('physics-lab-bench-collapsed', '0'); } catch { /* ignore */ }
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

function switchModel(id, opts = {}) {
  if (id && !models.some((m) => m.id === id)) {
    if (switchModel.pending === id) return Promise.resolve();
    switchModel.pending = id;
    return ensureId(id).then((ok) => {
      switchModel.pending = '';
      return switchModel(ok ? id : DEFAULT_MODEL_ID, opts);
    });
  }
  const model = (id && models.some((m) => m.id === id) ? getModelById(id) : null)
    || getModelById(DEFAULT_MODEL_ID)
    || models[0];
  if (!model) return;
  app.model = model;
  const view = localizeModel(model);
  setModelPalette(model.id);
  void hydratePalettesForModel(model.id);
  app.state = createState(model);
  stepper.reset();
  prevReadoutMap = new Map();
  baselineStore.activeId = null;
  setSafeRestoreVisible(false);
  toolbarTitle.textContent = view.name;
  toolbarSub.textContent = [view.sub, ...(view.tags || []).filter((t) => t !== view.sub)].filter(Boolean).join(' / ') || 'model';
  metaFormula.textContent = [view.formula, view.description].filter(Boolean).join('\n');
  microUi?.setTitle(view.name);
  paramBench.bind(model, app.state.params, app.globals);
  pushRecent(model.id);
  // 刷新最近条（fold-bar 下），不整树重建以免丢折叠态时也可接受轻量 rebuild 条
  const oldStrip = modelListEl.querySelector('.recents-strip');
  const nextStrip = renderRecentsStrip();
  if (oldStrip && nextStrip) oldStrip.replaceWith(nextStrip);
  else if (!oldStrip && nextStrip) {
    const foldBar = modelListEl.querySelector('.fold-bar');
    foldBar?.after(nextStrip);
  }
  syncSidebarActive();
  updateShellStrip();
  renderBaselineSelect();
  updateHud();
  if (isCompact() && !(microUi?.isMicroscopeShell?.())) {
    // Heavy models stay paused and keep the bench closed so the canvas stays tappable.
    if (autoOpenBenchOnSelect() && !isHeavyModel(model.id)) {
      setBenchOpen(true);
      requestAnimationFrame(() => requestAnimationFrame(scrollBenchToDynamics));
    } else {
      setBenchOpen(false);
    }
  } else {
    setBenchOpen(true);
  }
  persistActiveModel(model.id);
  syncModelClockPause();
  // Heavy models on phone/tablet: pause on enter so the first paint stays interactive.
  if (!opts.skipHeavyPause && isHeavyModel(model.id) && isCompact()) {
    if (!app.paused) {
      app.paused = true;
      syncPauseUi();
    }
    showToast(t('toast.heavyPaused'));
  }
  requestAnimationFrame(measureSysSticky);
  if (!opts.skipShellSync) microUi?.onModelChange(model.id);
}

function updateHud(opts = {}) {
  const digits = app.globals.readoutDigits;
  const readouts = app.model.getReadouts(app.state, { digits }) || [];
  app.lastReadouts = readouts;
  const compare = !!app.globals.compareReadouts;
  const accent = getModelColors(app.model?.id).body || '#fff';
  // Skip DOM rewrite when values / chrome flags are unchanged (desktop + mobile).
  const sig = `${app.model?.id || ''}|cmp=${compare ? 1 : 0}|${readouts.map((r) => `${r.label}=${r.value}`).join('\n')}`;
  if (!opts.force && !opts.flash && !opts.snapshotPrev && sig === updateHud._sig) {
    return;
  }
  const baseline = prevReadoutMap;
  // Compare mode: patch per-card when label layout is stable (avoid full innerHTML thrash).
  if (
    compare
    && !opts.force
    && !opts.snapshotPrev
    && readoutsEl.children.length === readouts.length
    && [...readoutsEl.children].every((card, i) => card.querySelector('.label')?.textContent === readouts[i]?.label)
  ) {
    readoutsEl.style.setProperty('--hud-accent', accent);
    readoutsEl.classList.add('is-compare');
    for (let i = 0; i < readouts.length; i += 1) {
      const card = readoutsEl.children[i];
      const r = readouts[i];
      const valEl = card.querySelector('.value');
      let prevEl = card.querySelector('.prev');
      if (!prevEl) {
        const row = card.querySelector('.value-row');
        prevEl = document.createElement('span');
        prevEl.className = 'prev';
        prevEl.title = '改前';
        row?.insertBefore(prevEl, valEl);
      }
      const nextVal = r.value;
      if (valEl && valEl.textContent !== nextVal) {
        if (!app.globals.pinBaseline) prevEl.textContent = valEl.textContent || '—';
        valEl.textContent = nextVal;
        if (opts.flash) card.classList.add('is-changed');
      }
      card.classList.toggle('has-compare', true);
    }
    const srTable = document.getElementById('sr-readouts');
    if (srTable) {
      const cells = srTable.querySelectorAll('tbody td');
      if (cells.length === readouts.length) {
        readouts.forEach((r, i) => { cells[i].textContent = r.value; });
      }
    }
    updateHud._sig = sig;
    if (opts.flash && !app.globals.pinBaseline) {
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
    return;
  }
  updateHud._sig = sig;
  readoutsEl.style.setProperty('--hud-accent', accent);
  readoutsEl.classList.toggle('is-compare', compare);
  readoutsEl.innerHTML = readouts.map((r) => {
    const prev = baseline.get(r.label);
    const changed = opts.flash && prev != null && prev !== r.value;
    const prevHtml = compare
      ? `<span class="prev" title="改前">${prev != null ? prev : '—'}</span>`
      : '';
    return `<div class="readout-card${changed ? ' is-changed' : ''}${compare ? ' has-compare' : ''}"><span class="dot" aria-hidden="true"></span><span class="label">${r.label}</span><span class="value-row">${prevHtml}<span class="value">${r.value}</span></span></div>`;
  }).join('');
  const srTable = document.getElementById('sr-readouts');
  if (srTable) {
    srTable.innerHTML = '<thead><tr><th scope="col">量</th><th scope="col">值</th></tr></thead><tbody>'
      + readouts.map((r) => `<tr><th scope="row">${r.label}</th><td>${r.value}</td></tr>`).join('')
      + '</tbody>';
  }
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

/** @type {Promise<typeof import('./viz/microscopeWebgl.js').createMicroscopeWebgl>|null} */
let webglCreatePromise = null;

function loadMicroscopeWebgl() {
  if (!webglCreatePromise) {
    webglCreatePromise = import('./viz/microscopeWebgl.js').then((mod) => mod.createMicroscopeWebgl);
  }
  return webglCreatePromise;
}

function ensureWebglStage() {
  if (!canvasWebgl) return null;
  if (webglStage) return webglStage;
  // Kick async load so paintFrame after enter settles without a second click.
  void ensureWebglStageAsync().then((stage) => {
    if (stage) paintFrame({ skipMicroRefresh: true });
  });
  return null;
}

async function ensureWebglStageAsync() {
  if (!canvasWebgl) return null;
  if (webglStage) return webglStage;
  const create = await loadMicroscopeWebgl();
  if (webglStage) return webglStage;
  webglStage = create(canvasWebgl, {
    t,
    onPick: (_state, meta = {}) => {
      paintFrame({ skipMicroRefresh: true });
      microUi?.refresh();
      if (!meta.live) { updateHud({ flash: true }); paramBench.refresh?.(); }
    },
    onViewChange: () => {
      paintFrame({ skipMicroRefresh: true });
    },
    onCameraView: (id) => {
      microUi?.syncCameraView?.(id);
    },
  });
  return webglStage;
}


function syncStageMode() {
  const shell = getShell(activeShellId);
  const useGl = shell.stageMode === 'webgl3d' && app.model?.id === 'r016-显微镜';
  if (canvas) canvas.hidden = !!useGl;
  if (canvasWebgl) canvasWebgl.hidden = !useGl;
  document.documentElement.dataset.stageMode = useGl ? 'webgl3d' : 'canvas2d';
  return useGl;
}

function paintFrame(opts = {}) {
  if (app.model && !palettesReadyNow()) {
    window.__neutralPaints = (window.__neutralPaints || 0) + 1;
    return;
  }
  const useGl = syncStageMode();
  if (useGl) {
    const rect = canvasWrap.getBoundingClientRect();
    const view = {
      width: Math.max(1, Math.floor(rect.width)),
      height: Math.max(1, Math.floor(rect.height)),
      dpr: Number(document.documentElement.dataset.dprCap) || 2.5,
      scale: app.globals.viewScale,
      showVectors: app.globals.showVectors,
      showTrail: app.globals.showTrail,
      showAxes: app.globals.showAxes,
    };
    const stage = ensureWebglStage();
    if (stage) {
      stage.draw(app.state, view);
      if (typeof stage.getOverlayLabels === 'function') {
        microUi?.syncOverlayLabels?.(stage.getOverlayLabels());
      }
    } else {
      // Fallback to 2D if WebGL unavailable
      if (canvas) canvas.hidden = false;
      if (canvasWebgl) canvasWebgl.hidden = true;
    }
    if (!opts.skipMicroRefresh) microUi?.refresh();
    return view;
  }
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
        if (app.state?._pauseApp) syncModelClockPause();
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
  // Throttle HUD DOM writes on compact (~8Hz); always refresh when paused / flash.
  const hudMin = mobileBudget().hudMinMs;
  if (!hudMin || app.paused || !frame._hudAt || (now - frame._hudAt) >= hudMin) {
    frame._hudAt = now;
    updateHud();
  }
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
  const chassis = document.getElementById('chassis');
  const overlayOn = chassis?.classList.contains('shell-sidebar-overlay');
  const willOpen = isProjectorShell()
    ? !overlayOn
    : !sidebar.classList.contains('open');
  setSidebarOpen(willOpen);
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
  btnParams?.focus();
});
drawerBackdrop.addEventListener('click', () => {
  const sideWas = sidebar.classList.contains('open');
  const benchWas = isCompact() && bench.classList.contains('open');
  setBenchOpen(false);
  setSidebarOpen(false);
  if (sideWas) btnMenu?.focus();
  else if (benchWas) btnParams?.focus();
});

document.addEventListener('keydown', (e) => {
  // Microscope shell owns Escape / undo — do not mix with catalog drawer keys.
  if (microUi?.onKeydown?.(e)) return;
  const inField = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT');
  // Ctrl/Cmd+Shift+Z → redoEdge；Ctrl/Cmd+Z → undoEdge
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !inField) {
    if (typeof app.model?.runAction === 'function') {
      const actionId = e.shiftKey ? 'redoEdge' : 'undoEdge';
      const ok = app.model.runAction(app.state, actionId);
      if (ok) {
        e.preventDefault();
        syncShellActionEnabled();
        paintFrame();
        paramBench.refresh?.();
        updateHud({ flash: true });
        showToast(e.shiftKey ? '重做连线' : '撤销连线');
        return;
      }
    }
  }
  if (e.key !== 'Escape') return;
  const catalogOpen = sidebar.classList.contains('open')
    || !!document.getElementById('chassis')?.classList.contains('shell-sidebar-overlay');
  if (inField && catalogOpen) {
    // Open menu auto-focuses #filter-q for VoiceOver — first Esc must close the
    // catalog (not only blur), or shell-chrome / projector Escape gates time out.
    e.target.blur?.();
    setSidebarOpen(false);
    btnMenu?.focus();
    e.preventDefault();
    return;
  }
  if (inField) {
    // Idle search field with catalog closed: blur only.
    e.target.blur?.();
    return;
  }
  if (catalogOpen) {
    setSidebarOpen(false);
    btnMenu?.focus();
    e.preventDefault();
    return;
  }
  if (isCompact() && bench.classList.contains('open')) {
    setBenchOpen(false);
    btnParams?.focus();
    e.preventDefault();
  }
});

document.getElementById('btn-copy-readouts')?.addEventListener('click', async () => {
  const rows = app.lastReadouts || [];
  const text = rows.map((r) => `${r.label}\t${r.value}`).join('\n') || '(无读数)';
  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制读数');
  } catch {
    showToast('复制失败');
  }
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
  const withShots = !!document.getElementById('chk-pack-shots')?.checked;
  const shotList = [];
  const files = [];
  const modelIds = Object.keys(baselineStore.byModel).filter((id) => baselineStore.byModel[id]?.length);
  for (const mid of modelIds) {
    files.push({
      name: `models/${mid}.json`,
      data: JSON.stringify({ modelId: mid, snapshots: baselineStore.byModel[mid] }, null, 2),
    });
  }
  if (!files.length) {
    showToast('尚无快照可打包 — 先存几个对照快照');
    return;
  }
  if (withShots) {
    const prevId = app.model?.id;
    for (const mid of modelIds) {
      if (!models.some((m) => m.id === mid)) continue;
      switchModel(mid);
      const snaps = baselineStore.byModel[mid] || [];
      for (const snap of snaps) {
        applySnapshotSimState(snap);
        paintFrame({ forceDpr: 2 });
        const dataUrl = canvas.toDataURL('image/png');
        const b64 = dataUrl.split(',', 2)[1] || '';
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const safeSnap = String(snap.id || snap.name || 'snap').replace(/[^\w.-]+/g, '_');
        const shotName = `shots/${mid}/${safeSnap}.png`;
        const paramsHash = snap.paramsHash || hashParams(snap.params);
        files.push({ name: shotName, data: bin });
        shotList.push({
          modelId: mid,
          snapshotId: snap.id,
          snapshotName: snap.name,
          snapshotParamsHash: paramsHash,
          file: shotName,
        });
      }
    }
    if (prevId) switchModel(prevId);
    requestAnimationFrame(() => paintFrame());
  }
  const snapshotParamsHash = {};
  for (const mid of modelIds) {
    snapshotParamsHash[mid] = (baselineStore.byModel[mid] || []).map((s) => ({
      id: s.id,
      name: s.name,
      hash: s.paramsHash || hashParams(s.params),
    }));
  }
  files.unshift({
    name: 'manifest.json',
    data: JSON.stringify({
      kind: 'lab-classroom-pack',
      version: 2,
      exportedAt: new Date().toISOString(),
      models: modelIds,
      shots: shotList,
      includeShots: withShots,
      snapshotParamsHash,
    }, null, 2),
  });
  if (shotList.length) {
    files.push({
      name: 'shots/README.txt',
      data: `课堂包截图清单（每快照一帧）\n${shotList.map((s) => `${s.modelId}\t${s.snapshotId || ''}\t${s.snapshotName || ''}\t${s.file}`).join('\n')}\n`,
    });
  }
  const blob = buildZipStore(files);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lab-classroom-pack-${Date.now()}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`课堂包已导出（${modelIds.length} 模型${withShots ? ` + ${shotList.length} PNG` : ''}）`);
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

function rowMatchesFilter(row) {
  const tag = app.filter.tag;
  const formalism = app.filter.formalism;
  if (tag && row.domain !== tag && row.sub !== tag) return false;
  if (formalism && formalismFor(row) !== formalism) return false;
  const tokens = expandSearchQuery(app.filter.q);
  if (!tokens.length) return true;
  const hay = `${row.name || ''} ${row.id || ''} ${row.sub || ''} ${row.domain || ''} ${row.family || ''} ${row.formula || ''}`.toLowerCase();
  return tokens.some((token) => hay.includes(token));
}

const FILTER_DOMAIN_CAP = 8;

function domainsForFilter() {
  const counts = new Map();
  for (const row of domainIndex) {
    if (!rowMatchesFilter(row)) continue;
    const name = row.domain || '其他';
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  const ranked = [...counts.keys()].sort((a, b) => (counts.get(b) - counts.get(a)) || a.localeCompare(b));
  const active = app.model ? modelDomain(app.model) : '';
  const ordered = [];
  if (active && counts.has(active)) ordered.push(active);
  for (const name of ranked) {
    if (!ordered.includes(name)) ordered.push(name);
  }
  const loaded = ordered.slice(0, FILTER_DOMAIN_CAP);
  window.__filterDomainStats = {
    matched: ordered.length,
    loaded: loaded.length,
    cap: FILTER_DOMAIN_CAP,
    formalism: app.filter.formalism || '',
  };
  return loaded;
}

function setNamesLoading(on) {
  if (!sidebar) return;
  const filters = sidebar.querySelector('.filters');
  if (on) {
    sidebar.classList.add('is-names-loading');
    sidebar.setAttribute('aria-busy', 'true');
    if (filters) filters.dataset.namesLoading = t('ui.namesLoading');
  } else {
    sidebar.classList.remove('is-names-loading');
    sidebar.removeAttribute('aria-busy');
    if (filters) delete filters.dataset.namesLoading;
  }
}

async function refreshSidebar(signal) {
  const q = app.filter.q.trim();
  const stillMine = () => !signal || sidebarSearchAbort?.signal === signal;
  if (signal?.aborted) {
    if (stillMine()) setNamesLoading(false);
    return;
  }
  try {
    if (q) {
      setNamesLoading(true);
      try {
        await ensureDomainNames(signal);
      } catch (err) {
        if (err?.name === 'AbortError' || signal?.aborted) return;
      }
    }
    if (signal?.aborted) return;
    if (q || app.filter.tag || app.filter.formalism || app.filter.heavy) {
      try {
        await loadIndex(signal);
      } catch (err) {
        if (err?.name === 'AbortError' || signal?.aborted) return;
        throw err;
      }
      if (signal?.aborted) return;
      const domains = domainsForFilter();
      try {
        await Promise.all(domains.map((domain) => loadDomain(domain, signal)));
      } catch (err) {
        if (err?.name === 'AbortError' || signal?.aborted) return;
        throw err;
      }
    }
    if (signal?.aborted) return;
    buildSidebar();
  } finally {
    // Only the latest search owns the loading chrome — aborted predecessors must not clear it early,
    // and a superseded abort must not leave is-names-loading stuck forever.
    if (stillMine()) setNamesLoading(false);
  }
}

/** Debounce catalog search so domain-names / domain loads are not fired per keystroke. */
let sidebarRefreshTimer = 0;
/** @type {AbortController|null} */
let sidebarSearchAbort = null;
const SIDEBAR_SEARCH_DEBOUNCE_MS = 200;
filterQ.addEventListener('input', () => {
  app.filter.q = filterQ.value;
  if (app.filter.q.trim()) setNamesLoading(true);
  else setNamesLoading(false);
  clearTimeout(sidebarRefreshTimer);
  sidebarSearchAbort?.abort();
  const ac = new AbortController();
  sidebarSearchAbort = ac;
  sidebarRefreshTimer = setTimeout(() => { void refreshSidebar(ac.signal); }, SIDEBAR_SEARCH_DEBOUNCE_MS);
});
filterTag.addEventListener('change', () => {
  app.filter.tag = filterTag.value;
  void refreshSidebar();
});
filterFormalism?.addEventListener('change', () => {
  app.filter.formalism = filterFormalism.value;
  void refreshSidebar();
});

function syncHeavyFilterChip() {
  if (!filterHeavyBtn) return;
  const on = !!app.filter.heavy;
  filterHeavyBtn.classList.toggle('is-active', on);
  filterHeavyBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  filterHeavyBtn.textContent = t('ui.perfHeavyFilter');
  filterHeavyBtn.setAttribute('aria-label', t('ui.perfHeavyFilterHint'));
}

filterHeavyBtn?.addEventListener('click', () => {
  app.filter.heavy = !app.filter.heavy;
  syncHeavyFilterChip();
  void refreshSidebar();
});

btnHc?.addEventListener('click', (e) => {
  e.preventDefault();
  document.documentElement.classList.toggle('hc');
  localStorage.setItem('physics-lab-hc', document.documentElement.classList.contains('hc') ? '1' : '0');
});

document.querySelector('.stage')?.addEventListener('click', (e) => {
  // Compact (≤1100) + phone drawer: tap stage dismisses overlay chrome.
  if (!isCompact()) return;
  if (e.target.closest('#btn-menu, #btn-params, .toolbar-actions, .tb-more, #bench, #sidebar')) return;
  if (isMobileDrawer() && sidebar.classList.contains('open')) setSidebarOpen(false);
  if (bench.classList.contains('open')) setBenchOpen(false);
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

document.addEventListener('imm-palettes', () => {
  if (app.model && canvasWrap) paintFrame();
});

window.addEventListener('resize', () => {
  const chassis = document.getElementById('chassis');
  chassis?.classList.remove('shell-sidebar-overlay');
  applyGlobals();
  if (!isCompact()) {
    const collapsed = localStorage.getItem('physics-lab-bench-collapsed') === '1';
    bench.classList.add('open');
    bench.style.transform = '';
    bench.style.height = '';
    chassis?.classList.toggle('bench-collapsed', collapsed);
  } else {
    // Compact owns the fixed drawer only — drop wide-layout fold state.
    chassis?.classList.remove('bench-collapsed');
    if (localStorage.getItem(AUTO_OPEN_BENCH_KEY) !== '1') {
      setBenchOpen(false);
    }
  }
  if (isProjectorShell() || !isMobileDrawer()) {
    sidebar.classList.remove('open');
    sidebar.style.transform = '';
  }
  syncDrawerChrome();
  measureSysSticky();
  if (canvas && canvasWrap) {
    if (app.model) {
      paintFrame();
      requestAnimationFrame(() => paintFrame());
    } else resizeCanvas(canvas, canvasWrap);
  }
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
  // Return the promise so Playwright can await ensureId + init; callers that only
  // care about the visible model should also wait on getModelId().
  // Surface failures instead of letting an unhandled rejection / paint throw
  // look like a silent page death in Playwright.
  switchModel: (id, opts) => Promise.resolve()
    .then(() => switchModel(id, opts))
    .catch((err) => {
      const msg = err?.stack || err?.message || String(err);
      window.__labLastSwitchError = { id, message: msg, at: Date.now() };
      console.error('[lab] switchModel failed', id, err);
      throw err;
    }),
  enterMicroscope3d: (opts) => Promise.resolve(microUi?.enter?.(opts)),
  leaveMicroscope3d: (opts) => Promise.resolve(microUi?.leave?.(opts)),
  getModelId: () => app.model?.id,
  paintFrame: () => { paintFrame(); },
  getWebglStage: () => webglStage,
  loadDomain: (domain) => loadDomain(domain),
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
  getViewportTier: () => viewportTier(),
  getEffectiveMaxSubSteps: () => stepper.maxSubSteps,
  getMobileBudget: () => mobileBudget(),
  isHeavyModel: (id) => isHeavyModel(id),
  snapshotReadouts: () => updateHud({ snapshotPrev: true }),
  restoreSafeDefaults: () => restoreSafeDefaults(),
  resetToModelDefaults: () => resetToModelDefaults(),
  resetOptics: () => resetOptics(),
  resetSim: () => resetSim(),
  getCapabilities: () => deriveCapabilities(app.model),
  getModel: () => app.model,
  runAction: (actionId) => {
    if (typeof app.model?.runAction !== 'function') return false;
    const ok = app.model.runAction(app.state, actionId);
    if (ok) {
      if (app.state?._resumeApp) {
        app.state._resumeApp = false;
        if (app.paused) {
          app.paused = false;
          syncPauseUi();
        }
      }
      paintFrame();
      updateHud({ flash: true });
    }
    return ok;
  },
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
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    if (typeof app.model?.onPointer !== 'function') return;
    const p = pt(e);
    const handled = app.model.onPointer(app.state, {
      type: 'down', x: p.x, y: p.y, button: e.button, altKey: !!e.altKey, shiftKey: !!e.shiftKey,
    });
    if (handled) {
      // 左键拖交互；右键/中键也可拖（BFS 画墙）
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
    if (app.model.onPointer(app.state, {
      type: 'move', x: p.x, y: p.y, button: e.button, altKey: !!e.altKey, shiftKey: !!e.shiftKey,
    })) {
      paintFrame();
      paramBench.refresh?.();
      updateHud({ flash: true });
    }
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    const p = pt(e);
    app.model?.onPointer?.(app.state, {
      type: 'up', x: p.x, y: p.y, button: e.button, altKey: !!e.altKey, shiftKey: !!e.shiftKey,
    });
    paintFrame();
    paramBench.refresh?.();
    updateHud({ flash: true });
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  void toLocal;
}

function syncChromeI18n() {
  applyDomI18n();
  btnMenu.innerHTML = iconOnly('menu');
  btnMenu.setAttribute('aria-label', t('ui.openMenu'));
  btnReset.innerHTML = btnHtml('reset', t('ui.rerun'));
  btnReset.title = t('ui.rerunTitle');
  btnReset.setAttribute('aria-label', t('ui.rerun'));
  btnShot.innerHTML = btnHtml('cam', 'png');
  btnCsv.innerHTML = btnHtml('csv', 'csv');
  const compact = isCompact();
  const benchCollapsed = document.getElementById('chassis')?.classList.contains('bench-collapsed');
  const paramsLbl = compact ? t('ui.params') : (benchCollapsed ? t('ui.params') : t('ui.paramsCollapse'));
  btnParams.innerHTML = btnHtml('params', paramsLbl);
  btnParams.title = t('ui.paramsTitle');
  btnCloseBench.innerHTML = btnHtml('close', t('ui.close'));
  if (btnSafeRestore) {
    btnSafeRestore.textContent = t('ui.safeRestore');
  }
  // model-specific hints win; only seed empty default
  if (shellHintEl && !shellHintEl.textContent.trim()) {
    shellHintEl.textContent = t('ui.hintDefault');
  }
  // refresh baseline empty option
  const opt0 = baselineSelect?.querySelector('option[value=""]');
  if (opt0) opt0.textContent = t('ui.baselineCurrent');
}

function applyActiveShell(id) {
  if (microUi?.applyShellId(id)) return;
  activeShellId = id;
  const chassis = document.getElementById('chassis');
  chassis?.classList.remove('shell-sidebar-overlay');
  sidebar.classList.remove('open');
  sidebar.style.transform = '';
  const shell = applyShell(id, {
    onHideSidebar: (hide) => {
      const el = document.getElementById('chassis');
      el?.classList.toggle('shell-hide-sidebar', hide);
      el?.classList.remove('shell-sidebar-overlay');
      if (hide) setSidebarOpen(false);
    },
  });
  microUi?.sync(false);
  if (shell.modelId && app.model?.id !== shell.modelId) {
    switchModel(shell.modelId, { skipShellSync: true });
  }
  syncDrawerChrome();
  if (canvas && canvasWrap) {
    if (app.model) {
      paintFrame();
      requestAnimationFrame(() => paintFrame());
    } else resizeCanvas(canvas, canvasWrap);
  }
}

function fillShellSelectOptions(el, { microOnly = false } = {}) {
  if (!el) return;
  el.innerHTML = '';
  if (microOnly || microUi?.isMicroscopeShell?.()) {
    const opt = document.createElement('option');
    opt.value = 'lab-classic';
    opt.textContent = t('ui.microExit');
    opt.selected = true;
    el.appendChild(opt);
    el.setAttribute('aria-label', t('ui.microExit'));
    return;
  }
  const current = activeShellId || resolveShellId();
  for (const s of listShells()) {
    if (s.id === 'lab-microscope3d') continue; // enter only via 3D strip / ?shell=
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    opt.title = s.description;
    if (s.id === current) opt.selected = true;
    el.appendChild(opt);
  }
  el.setAttribute('aria-label', 'shell');
}

function mountShellSelect(el) {
  if (!el) return;
  const current = resolveShellId();
  fillShellSelectOptions(el, { microOnly: current === 'lab-microscope3d' });
  if (!el.dataset.bound) {
    el.dataset.bound = '1';
    el.addEventListener('change', () => {
      const id = el.value;
      persistShellId(id);
      applyActiveShell(id);
      const url = new URL(location.href);
      url.searchParams.set('shell', id);
      history.replaceState(null, '', url);
      requestAnimationFrame(measureSysSticky);
    });
  }
  // Exclusive shells enter after their model chunk loads. An early enter
  // falls back to free-fall and leaves the shell on lab-classic.
  if (!getShell(current).exclusiveChrome) applyActiveShell(current);
}

async function boot() {
  // Bind before any await so dialog open works as soon as __labCapture appears.
  bindUserModelUi();
  if (localStorage.getItem('physics-lab-hc') === '1') {
    document.documentElement.classList.add('hc');
  }
  if (!isCompact() && localStorage.getItem('physics-lab-bench-collapsed') === '1') {
    document.getElementById('chassis')?.classList.add('bench-collapsed');
  } else {
    document.getElementById('chassis')?.classList.remove('bench-collapsed');
  }
  async function focusCatalogModel(id, loc = { domain: '物理', sub: '光学' }) {
    const folds = loadFolds();
    // Only the target subject — collapse every other domain/sub (avoids painting 400+ rows).
    for (const key of Object.keys(folds)) folds[key] = false;
    folds[foldKey(loc.domain)] = true;
    if (loc.sub) folds[foldKey(loc.domain, loc.sub)] = true;
    saveFolds(folds);
    const tryLoad = async () => {
      try {
        await loadDomain(loc.domain);
        return true;
      } catch (err) {
        console.warn('focusCatalogModel loadDomain', err);
        return false;
      }
    };
    if (!models.some((model) => model.id === id)) {
      let ok = await tryLoad();
      if (!ok || !models.some((model) => model.id === id)) {
        showToast(`Catalog load failed for ${loc.domain} — retrying…`);
        ok = await tryLoad();
        if (!ok || !models.some((model) => model.id === id)) {
          showToast(`Could not load ${loc.domain}; open the sidebar and expand it manually`);
        }
      }
    }
    const lang = getLocale();
    if (lang !== 'zh') {
      await ensureCatalogGloss(lang);
      await ensureSidebarLocales();
    }
    paintSidebar();
    syncSidebarActive();
    const openFolds = () => {
      const domainEl = modelListEl?.querySelector(`.domain-group[data-domain="${loc.domain}"]`);
      if (!(domainEl instanceof HTMLDetailsElement)) return;
      domainEl.open = true;
      for (const subEl of domainEl.querySelectorAll('details.sub-group')) {
        const name = subEl.querySelector('.sub-name')?.dataset.sub
          || subEl.querySelector('.sub-name')?.textContent
          || '';
        if (name === loc.sub) subEl.open = true;
      }
    };
    openFolds();
    await Promise.resolve();
    if (lang !== 'zh') await ensureSidebarLocales();
    paintSidebar();
    syncSidebarActive();
    openFolds();
    const btn = modelListEl?.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (btn) {
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'page');
    }
    // Cold boot / focus must not auto-open the mobile drawer — menu stays the only opener.
    // Microscope leave can call setSidebarOpen(true) explicitly when a reveal is wanted.
    const settle = () => {
      const current = modelListEl?.querySelector(`[data-id="${CSS.escape(id)}"]`);
      if (current) revealCatalogButton(current);
    };
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    settle();
    await new Promise((resolve) => setTimeout(resolve, 320));
    settle();
  }

  microUi = createMicroscopeChrome({
    t,
    getWebglStage: () => ensureWebglStage(),
    ensureWebglStageAsync,
    getActiveShellId: () => activeShellId,
    setActiveShellId: (id) => { activeShellId = id; },
    getModelId: () => app.model?.id,
    getModelLoc: (id) => {
      // Prefer domain-index / catalog rows — runtime model objects often omit domain/sub.
      const row = (id && domainIndex.find((r) => r.id === id)) || null;
      if (row?.domain) return { domain: row.domain, sub: row.sub || '' };
      const m = (id && getModelById(id)) || models.find((entry) => entry.id === id) || null;
      if (!m) return { domain: '其他', sub: '' };
      return { domain: m.domain || modelDomain(m) || '其他', sub: m.sub || modelSub(m) || '' };
    },
    getState: () => app.state,
    switchModel,
    paintFrame: () => { if (app.model && canvasWrap) paintFrame({ skipMicroRefresh: false }); },
    setSidebarOpen,
    setBenchOpen,
    syncPauseUi,
    syncDrawerChrome,
    resetSim,
    resetOptics,
    restoreSafeDefaults,
    setPaused: (paused) => { app.paused = paused; },
    focusCatalogModel,
    onOpticsChange: () => {
      updateHud({ flash: true });
      paramBench.refresh?.();
    },
    remountShellSelect: ({ microOnly } = {}) => {
      fillShellSelectOptions(document.getElementById('shell-select'), { microOnly });
    },
    captureWebglPng: async () => {
      const gl = document.getElementById('canvas-webgl');
      if (!gl || gl.hidden) return;
      const rect = canvasWrap.getBoundingClientRect();
      const view = {
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
        dpr: Number(document.documentElement.dataset.dprCap) || 2.5,
        scale: app.globals.viewScale,
        showVectors: app.globals.showVectors,
        showTrail: app.globals.showTrail,
        showAxes: app.globals.showAxes,
      };
      const stage = await ensureWebglStageAsync();
      try {
        // Draw + sync DOM labels, then composite WebGL + L/eyepiece overlays (avoids black / label-less exports).
        paintFrame({ skipMicroRefresh: true });
        if (typeof stage?.getOverlayLabels === 'function') {
          microUi?.syncOverlayLabels?.(stage.getOverlayLabels());
        }
        const href = (typeof stage?.capturePng === 'function')
          ? stage.capturePng(app.state, view)
          : gl.toDataURL('image/png');
        if (!href || href === 'data:,' || href.length < 64) {
          showToast('WebGL capture failed');
          return;
        }
        const labels = typeof stage?.getOverlayLabels === 'function' ? stage.getOverlayLabels() : [];
        const out = document.createElement('canvas');
        out.width = gl.width;
        out.height = gl.height;
        const ctx = out.getContext('2d');
        if (!ctx) {
          showToast('WebGL capture failed');
          return;
        }
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          const sx = out.width / Math.max(view.width, 1);
          const sy = out.height / Math.max(view.height, 1);
          // Cap font growth on DPR>2 / high-res buffers so labels stay readable,
          // not billboard-sized relative to the eyepiece glyphs.
          const fontPx = Math.min(22, Math.max(11, Math.round(12 * Math.min(sx, 2.25))));
          ctx.font = `${fontPx}px "IBM Plex Mono", ui-monospace, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          for (const lab of labels) {
            const x = (lab.x || 0) * sx;
            const y = (lab.y || 0) * sy;
            const text = String(lab.text || '');
            if (!text) continue;
            const padX = Math.min(14, 6 * Math.min(sx, 2.25));
            const padY = Math.min(10, 4 * Math.min(sy, 2.25));
            const tw = ctx.measureText(text).width;
            const th = Math.min(26, Math.max(12, fontPx * 1.15));
            ctx.fillStyle = 'rgba(6, 8, 11, 0.72)';
            ctx.strokeStyle = lab.active
              ? 'rgba(110, 180, 255, 0.9)'
              : lab.id === 'L'
                ? 'rgba(240, 213, 106, 0.7)'
                : 'rgba(232, 238, 246, 0.28)';
            ctx.lineWidth = Math.max(1, sx);
            ctx.beginPath();
            ctx.rect(x - tw / 2 - padX, y - th - padY, tw + padX * 2, th + padY);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = lab.id === 'L' ? '#f0d56a' : lab.active ? '#6eb4ff' : '#e8eef6';
            ctx.fillText(text, x, y - padY * 0.35);
          }
          const a = document.createElement('a');
          a.download = `microscope-${Date.now()}.png`;
          a.href = out.toDataURL('image/png');
          a.click();
        };
        img.onerror = () => {
          showToast('WebGL capture failed');
        };
        img.src = href;
      } catch (err) {
        console.warn('webgl png', err);
        showToast('WebGL capture failed');
      }
    },
  });
  microUi.bind();
  mountShellSelect(document.getElementById('shell-select'));
  mountLocaleSelect(document.getElementById('locale-select'));
  // Kick chrome i18n + model-name pack in parallel with catalog work — do not
  // serialize ~160KB models-en behind domain-index on the cold CDN path.
  const i18nPack = bootI18n();
  onLocaleChange(() => {
    syncChromeI18n();
    microUi?.sync(microUi.isMicroscopeShell());
    buildSidebar();
    if (app.model) {
      const view = localizeModel(app.model);
      toolbarTitle.textContent = view.name;
      microUi?.setTitle(view.name);
      metaFormula.textContent = [view.formula, view.description].filter(Boolean).join('\n');
    }
    paramBench.refresh?.();
    updateShellStrip();
    if (app.model && canvas && canvasWrap) paintFrame();
    syncPauseUi();
    syncDrawerChrome();
  });

  const fromUrl = readModelIdFromUrl();
  const wantShell = resolveShellId();
  const shellDef = getShell(wantShell);
  const initialId = resolveInitialModelId();
  const needsCatalog = !!(shellDef?.modelId || (initialId && initialId !== DEFAULT_MODEL_ID) || fromUrl);

  // Fast path: free-fall (+ stub palette) paints before index / locale pack land.
  await Promise.all([
    palettesReady,
    primeHandModel(DEFAULT_MODEL_ID),
    needsCatalog ? loadIndex() : Promise.resolve(),
  ]);
  if (shellDef?.modelId) await ensureId(shellDef.modelId);
  else if (initialId && initialId !== DEFAULT_MODEL_ID) {
    if (!(await ensureId(initialId))) await primeHandModel(DEFAULT_MODEL_ID);
  }
  switchModel(initialId);
  if (shellDef?.modelId) microUi?.applyShellId(wantShell);
  requestAnimationFrame(frame);
  try {
    performance.mark('boot-interactive');
    window.__bootMarks = {
      ...(window.__bootMarks || {}),
      interactiveMs: performance.getEntriesByName('boot-interactive').at(-1)?.startTime ?? null,
    };
  } catch { /* ignore */ }

  // Sidebar / filters / deep-link focus — after first interactive frame.
  await Promise.all([
    needsCatalog ? Promise.resolve() : loadIndex(),
    i18nPack,
  ]);
  try { await ensureSidebarLocales(); } catch { /* ignore */ }
  syncChromeI18n();
  microUi.sync(microUi.isMicroscopeShell());
  try {
    const loadIndexMs = performance.measure('boot-loadIndex', 'boot-loadIndex-start', 'boot-loadIndex-end').duration;
    let ensureIdMs = null;
    let loadDomainMs = null;
    try {
      ensureIdMs = performance.measure('boot-ensureId', 'boot-ensureId-start', 'boot-ensureId-end').duration;
    } catch { /* primeHandModel path skips ensureId marks */ }
    try {
      loadDomainMs = performance.measure('boot-loadDomain', 'boot-loadDomain-start', 'boot-loadDomain-end').duration;
    } catch { /* no domain fetch on hand-only boot */ }
    window.__bootMarks = { ...(window.__bootMarks || {}), loadIndexMs, ensureIdMs, loadDomainMs };
  } catch { window.__bootMarks = window.__bootMarks || {}; }
  populateTagFilter();
  populateFormalismFilter();
  syncHeavyFilterChip();
  populateUserModelFamilies();
  bindUserModelUi();
  app.globals.powerSaver = powerSaverEnabled();
  applyGlobals();
  syncPauseUi();
  buildSidebar();
  if (app.model) {
    const view = localizeModel(app.model);
    toolbarTitle.textContent = view.name;
    microUi?.setTitle(view.name);
    metaFormula.textContent = [view.formula, view.description].filter(Boolean).join('\n');
  }
  if (fromUrl && !shellDef?.modelId) {
    const activeRow = domainIndex.find((row) => row.id === fromUrl);
    if (activeRow) {
      await focusCatalogModel(fromUrl, { domain: activeRow.domain || '其他', sub: activeRow.sub || '' });
    }
  }
  if (!isCompact()) bench.classList.add('open');
  bindCanvasPointer();
  syncDrawerChrome();
}

function populateUserModelFamilies() {
  if (!userModelFamily) return;
  userModelFamily.innerHTML = '';
  for (const fam of USER_MODEL_FAMILIES.sort()) {
    const opt = document.createElement('option');
    opt.value = fam;
    const meta = FAMILY_META[fam];
    opt.textContent = meta?.formalism ? `${fam} · ${meta.formalism}` : fam;
    userModelFamily.appendChild(opt);
  }
}

function showUserModelError(msg) {
  if (!userModelError) return;
  userModelError.replaceChildren();
  if (!msg) {
    userModelError.hidden = true;
    return;
  }
  userModelError.hidden = false;
  const text = String(msg);
  const hit = text.match(/未命中主题键「([^」]+)」/);
  userModelError.append(document.createTextNode(text));
  if (!hit) return;
  const key = hit[1];
  const spaced = key.includes(' · ') ? key : key.replace('·', ' · ');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn quiet topic-miss-search';
  btn.textContent = spaced;
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(spaced); } catch { /* clipboard may be blocked */ }
    if (filterQ) {
      filterQ.value = spaced;
      filterQ.focus();
    }
    app.filter.q = spaced;
    buildSidebar();
  });
  userModelError.append(document.createTextNode(' '));
  userModelError.append(btn);
}

function renderUserModelList() {
  const ul = document.getElementById('user-model-list');
  if (!ul) return;
  ul.innerHTML = '';
  const specs = loadUserSpecs();
  if (!specs.length) {
    const li = document.createElement('li');
    li.textContent = t('dialog.empty');
    ul.appendChild(li);
    return;
  }
  for (const spec of specs) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = spec.name;
    // Keep validation of assumptions on save; do not surface long assumption text in the list.
    name.title = spec.name;
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'btn quiet';
    edit.textContent = '编辑';
    edit.addEventListener('click', () => fillUserModelForm(spec));
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn quiet';
    del.textContent = '删除';
    del.addEventListener('click', async () => {
      deleteUserSpec(spec.id);
      await rebuildModels();
      buildSidebar();
      renderUserModelList();
      if (app.model?.id === spec.id) switchModel('free-fall');
      showToast(`已删除 · ${spec.name}`);
    });
    li.append(name, edit, del);
    ul.appendChild(li);
  }
}

function fillUserModelForm(spec) {
  if (!userModelForm) return;
  userModelForm.dataset.editId = spec?.id || '';
  const set = (name, value) => {
    const el = userModelForm.elements.namedItem(name);
    if (el && 'value' in el) el.value = value ?? '';
  };
  if (!spec) {
    userModelForm.reset();
    const ethics = userModelForm.elements.namedItem('ethicsOk');
    if (ethics) ethics.checked = false;
  } else {
    set('name', spec.name);
    set('domain', spec.domain);
    set('sub', spec.sub);
    set('family', spec.family);
    set('formula', spec.formula);
    set('authority', spec.authority);
    set('assumptions', spec.assumptions);
    set('description', spec.description);
    set('fidelity', spec.fidelity || 'engineering');
    const ethics = userModelForm.elements.namedItem('ethicsOk');
    if (ethics) ethics.checked = true;
  }
  const submit = document.getElementById('user-model-submit');
  if (submit) submit.textContent = spec?.id ? '保存修改' : '创建并载入';
  showUserModelError('');
}

async function reloadAfterUserModels(id, toast) {
  await rebuildModels();
  populateTagFilter();
  populateFormalismFilter();
  buildSidebar();
  renderUserModelList();
  if (id) {
    userModelDialog?.close();
    switchModel(id);
    setSidebarOpen(false);
  }
  if (toast) showToast(toast);
}

function bindUserModelUi() {
  // Idempotent: __labCapture is exposed at module load, but boot awaits loadIndex /
  // primeHandModel before the previous call site — Playwright clicking #btn-user-model
  // right after __labCapture races an unbound button (narrow miss=1 flake).
  if (btnUserModel?.dataset.bound === '1') return;
  if (btnUserModel) btnUserModel.dataset.bound = '1';
  btnUserModel?.addEventListener('click', () => {
    void ensureTopicRows();
    fillUserModelForm(null);
    renderUserModelList();
    userModelDialog?.showModal();
  });
  document.getElementById('user-model-submit')?.addEventListener('click', async () => {
    if (!userModelForm) return;
    if (!userModelForm.reportValidity()) return;
    await ensureTopicRows();
    const fd = new FormData(userModelForm);
    const draft = {
      name: fd.get('name'),
      domain: fd.get('domain'),
      sub: fd.get('sub'),
      family: fd.get('family'),
      formula: fd.get('formula'),
      authority: fd.get('authority'),
      assumptions: fd.get('assumptions'),
      description: fd.get('description'),
      fidelity: fd.get('fidelity'),
      ethicsOk: fd.get('ethicsOk') === 'on',
    };
    const keepId = userModelForm.dataset.editId || '';
    const checked = validateUserModelDraft(draft, keepId ? { keepId } : {});
    if (!checked.ok) {
      showUserModelError(checked.error);
      showToast(checked.error);
      return;
    }
    showUserModelError('');
    showToast(t('dialog.validOk') || 'Validation passed');
    persistUserSpec(checked.spec);
    await reloadAfterUserModels(
      checked.spec.id,
      keepId ? `已更新自建模型 · ${checked.spec.name}` : `已创建自建模型 · ${checked.spec.name}`,
    );
  });
  document.getElementById('user-model-export')?.addEventListener('click', () => {
    const blob = new Blob([exportUserSpecsJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'immspfee-user-models.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('已导出自建模型 JSON');
  });
  const fileInput = document.getElementById('user-model-file');
  document.getElementById('user-model-import')?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    const parsed = parseUserSpecsImport(await file.text());
    if (!parsed.ok) {
      showUserModelError(parsed.error);
      showToast(parsed.error);
      return;
    }
    mergeImportedSpecs(parsed.specs);
    const warn = parsed.rejected?.length ? `，拒绝 ${parsed.rejected.length} 条` : '';
    await reloadAfterUserModels(parsed.specs[0].id, `已导入 ${parsed.specs.length} 条${warn}`);
  });
}

boot();
