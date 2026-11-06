/**
 * Dedicated microscope shell chrome — fully isolated from catalog / ODE panels.
 */
import {
  applyShell,
  persistShellId,
  getShell,
  listShells,
  MICROSCOPE_MODEL_ID,
  MICROSCOPE_SHELL_ID,
} from './registry.js';
import { createMicroscopeStage } from './microscopeStage.js';
import { setInputMode, INPUT_MICROSCOPE, INPUT_LAB } from './inputMode.js';
import { mobileBudget } from '../utils/mobilePerf.js';

/**
 * @param {{
 *   t: (key: string) => string,
 *   getActiveShellId: () => string,
 *   setActiveShellId: (id: string) => void,
 *   getModelId: () => string | undefined,
 *   getModelLoc?: (id: string) => { domain: string, sub: string },
 *   getState: () => object | null,
 *   switchModel: (id: string, opts?: { skipShellSync?: boolean }) => void | Promise<void>,
 *   paintFrame: () => void,
 *   setSidebarOpen: (open: boolean) => void,
 *   setBenchOpen: (open: boolean) => void,
 *   syncPauseUi: () => void,
 *   syncDrawerChrome: () => void,
 *   resetSim: () => void,
 *   setPaused: (paused: boolean) => void,
 *   focusCatalogModel?: (id: string, loc: { domain: string, sub: string }) => void | Promise<void>,
 *   onOpticsChange?: () => void,
 *   remountShellSelect?: (opts?: { microOnly?: boolean }) => void,
 *   captureWebglPng?: () => void,
 * }} api
 */
const RESUME_STORAGE_KEY = 'immspfee-micro-resume-v1';

function readStoredResume() {
  try {
    const raw = sessionStorage.getItem(RESUME_STORAGE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (j && typeof j.id === 'string' && j.id) {
      return { id: j.id, domain: j.domain || '其他', sub: j.sub || '' };
    }
  } catch { /* ignore */ }
  return null;
}

function writeStoredResume(entry) {
  try {
    if (!entry?.id) sessionStorage.removeItem(RESUME_STORAGE_KEY);
    else sessionStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(entry));
  } catch { /* ignore */ }
}

export function createMicroscopeChrome(api) {
  let lock = false;
  /** Model that was active before entering WebGL — exit restores this, not always r016. */
  let resumeModel = readStoredResume();
  const microChrome = () => document.getElementById('microscope-chrome');
  const microTitle = () => document.getElementById('micro-title');
  const microLede = () => document.getElementById('micro-lede');

  function locFor(id) {
    const fallback = { domain: '物理', sub: '光学' };
    if (!id) return fallback;
    try {
      const loc = api.getModelLoc?.(id);
      if (loc?.domain) return { domain: loc.domain, sub: loc.sub || '' };
    } catch { /* ignore */ }
    return id === MICROSCOPE_MODEL_ID ? fallback : { domain: '其他', sub: '' };
  }

  function setResume(entry) {
    resumeModel = entry;
    writeStoredResume(entry);
  }

  const stage = createMicroscopeStage({
    getState: () => (typeof api.getState === 'function' ? api.getState() : null),
    onChange: () => {
      api.onOpticsChange?.();
      api.paintFrame();
    },
    t: api.t,
  });

  function writeShellUrl(id) {
    try {
      const url = new URL(location.href);
      url.searchParams.set('shell', id);
      history.replaceState(null, '', url);
    } catch { /* ignore */ }
  }

  /** Shell picker inside microscope: only “back to catalog”, never the full 1517 list. */
  function syncShellPicker(on) {
    const el = document.getElementById('shell-select');
    if (!el) return;
    if (on) {
      el.innerHTML = '';
      const opt = document.createElement('option');
      opt.value = 'lab-classic';
      opt.textContent = api.t('ui.microExit');
      opt.selected = true;
      el.appendChild(opt);
      el.setAttribute('aria-label', api.t('ui.microExit'));
      return;
    }
    api.remountShellSelect?.({ microOnly: false });
  }

  function applyMicroDprCap(on) {
    const root = document.documentElement;
    if (!on) return;
    const shellCap = Number(getShell(MICROSCOPE_SHELL_ID)?.dprCap) || 3;
    const cap = Math.min(shellCap, mobileBudget().microDprCap);
    root.dataset.dprCap = String(cap);
  }

  function sync(on) {
    setInputMode(on ? INPUT_MICROSCOPE : INPUT_LAB);
    const chrome = microChrome();
    if (chrome) chrome.hidden = !on;
    document.documentElement.classList.toggle('shell-micro-active', on);
    const lede = microLede();
    if (lede) lede.textContent = api.t('ui.microLede');
    const exit = document.getElementById('btn-micro-exit');
    if (exit) exit.textContent = api.t('ui.microExit');
    const params = document.getElementById('btn-micro-params');
    if (params) params.textContent = api.t('ui.microBench');
    syncShellPicker(on);
    if (on) {
      // Keep the rAF paint loop alive for orbit/zoom; sim clock stays paused.
      api.setPaused(true);
      api.syncPauseUi();
      api.setSidebarOpen(false);
      api.setBenchOpen(false);
      applyMicroDprCap(true);
      stage.ensureDom();
      stage.setVisible(true);
      // Narrow: rail closed. Desktop: open so optics knobs are discoverable.
      const narrow = typeof matchMedia === 'function' && matchMedia('(max-width: 720px)').matches;
      stage.setRailOpen(!narrow);
      stage.paint();
    } else {
      stage.setRailOpen(false);
      stage.setVisible(false);
    }
    api.syncDrawerChrome();
  }

  async function enter({ skipModel = false } = {}) {
    if (lock) return;
    lock = true;
    try {
      const prevId = api.getModelId();
      if (prevId && prevId !== MICROSCOPE_MODEL_ID) {
        const loc = locFor(prevId);
        setResume({ id: prevId, domain: loc.domain, sub: loc.sub });
      } else if (!resumeModel) {
        // Deep-link / already on r016: fall back to 2D microscope after exit.
        setResume({ id: MICROSCOPE_MODEL_ID, domain: '物理', sub: '光学' });
      }
      // else keep sessionStorage resume (refresh mid-3D / re-enter while on r016)
      api.setActiveShellId(MICROSCOPE_SHELL_ID);
      persistShellId(MICROSCOPE_SHELL_ID);
      applyShell(MICROSCOPE_SHELL_ID, {
        onHideSidebar: () => {
          const chassis = document.getElementById('chassis');
          chassis?.classList.add('shell-hide-sidebar');
          chassis?.classList.remove('shell-sidebar-overlay');
          api.setSidebarOpen(false);
        },
      });
      writeShellUrl(MICROSCOPE_SHELL_ID);
      // Must await: a late r016 settle after leave() would wipe the restored catalog model.
      if (!skipModel && api.getModelId() !== MICROSCOPE_MODEL_ID) {
        await Promise.resolve(api.switchModel(MICROSCOPE_MODEL_ID, { skipShellSync: true }));
      }
      sync(true);
      api.paintFrame();
    } finally {
      lock = false;
    }
  }

  /**
   * @param {{ nextShell?: string, restore?: boolean }} [opts]
   * restore=true (default): switch back to the model that was open before WebGL.
   * restore=false: model already changed (catalog pick) — only drop the shell chrome.
   */
  async function leave({ nextShell = 'lab-classic', restore = true } = {}) {
    // Wait out an in-flight enter() so r016 switch cannot land after restore.
    for (let i = 0; lock && i < 200; i += 1) {
      await new Promise((r) => setTimeout(r, 16));
    }
    if (lock) return;
    lock = true;
    let resume = resumeModel;
    try {
      const target = nextShell === MICROSCOPE_SHELL_ID ? 'lab-classic' : nextShell;
      api.setActiveShellId(target);
      persistShellId(target);
      applyShell(target, {
        onHideSidebar: (hide) => {
          const chassis = document.getElementById('chassis');
          chassis?.classList.toggle('shell-hide-sidebar', hide);
          chassis?.classList.remove('shell-sidebar-overlay');
          if (hide) api.setSidebarOpen(false);
        },
      });
      writeShellUrl(target);
      sync(false);
      api.setBenchOpen(true);
      if (restore && resume?.id) {
        // Heal stale sessionStorage that captured domain="其他" before getModelLoc used domainIndex.
        const healed = locFor(resume.id);
        if (healed.domain && healed.domain !== '其他' && healed.domain !== resume.domain) {
          resume = { id: resume.id, domain: healed.domain, sub: healed.sub || '' };
          setResume(resume);
        }
        // Always switch (even if ids match after a partial restore) so ensureId runs.
        await Promise.resolve(api.switchModel(resume.id, { skipShellSync: true }));
        if (api.getModelId() !== resume.id) {
          console.warn('[microscope] resume switch failed', resume.id, 'still', api.getModelId());
        }
      }
      api.paintFrame();
    } finally {
      lock = false;
    }
    const focusId = restore && resume?.id ? resume.id : (api.getModelId() || MICROSCOPE_MODEL_ID);
    const focusLoc = restore && resume?.id
      ? { domain: resume.domain || '其他', sub: resume.sub || '' }
      : locFor(focusId);
    const focused = api.focusCatalogModel?.(focusId, focusLoc);
    // Keep resume sticky across a later re-enter from r016 2D; clear only when
    // the user navigated away via catalog while inside WebGL (restore=false).
    if (!restore) setResume(null);
    return focused;
  }

  function onModelChange(modelId) {
    if (lock) return;
    // Catalog row for r016 stays 2D Lab Classic. Only the separated sidebar
    // 3D entry / ?shell=lab-microscope3d / applyShellId enter the WebGL shell.
    if (modelId !== MICROSCOPE_MODEL_ID && api.getActiveShellId() === MICROSCOPE_SHELL_ID) {
      // Model already switched — do not yank back to resume/r016.
      leave({ nextShell: 'lab-classic', restore: false });
      return;
    }
    sync(api.getActiveShellId() === MICROSCOPE_SHELL_ID);
  }

  function applyShellId(id) {
    if (id === MICROSCOPE_SHELL_ID) {
      void enter({ skipModel: api.getModelId() === MICROSCOPE_MODEL_ID });
      return true;
    }
    if (api.getActiveShellId() === MICROSCOPE_SHELL_ID) {
      void leave({ nextShell: id });
      return true;
    }
    return false;
  }

  function setTitle(name) {
    const el = microTitle();
    if (el) el.textContent = name;
  }

  function refresh() {
    if (api.getActiveShellId() === MICROSCOPE_SHELL_ID) stage.paint();
  }

  function syncOverlayLabels(labels) {
    if (api.getActiveShellId() === MICROSCOPE_SHELL_ID) stage.syncOverlayLabels(labels);
  }

  function onKeydown(e) {
    if (api.getActiveShellId() !== MICROSCOPE_SHELL_ID) return false;
    // Block catalog undo / Esc drawer routing while microscope owns input.
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      return true;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      const rail = document.getElementById('micro-rail');
      if (rail?.classList.contains('is-open')) {
        stage.setRailOpen(false);
        return true;
      }
      leave({ nextShell: 'lab-classic' });
      return true;
    }
    // Catalog model cycling must not run under microscope inputMode.
    if (
      !e.target?.closest?.('input, textarea, select, #micro-rail')
      && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'j', 'k', 'J', 'K', 'PageUp', 'PageDown'].includes(e.key)
    ) {
      e.preventDefault();
      return true;
    }
    return false;
  }

  function onWheel(e) {
    if (api.getActiveShellId() !== MICROSCOPE_SHELL_ID) return;
    // Allow scrolling the optical rail; block catalog-list / model-switch side effects.
    if (e.target?.closest?.('#micro-rail')) return;
    if (e.target?.closest?.('#model-list, #sidebar')) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function bind() {
    document.getElementById('btn-micro-exit')?.addEventListener('click', () => {
      void leave({ nextShell: 'lab-classic' });
    });
    document.getElementById('btn-micro-reset')?.addEventListener('click', () => {
      if (api.getModelId() !== MICROSCOPE_MODEL_ID) return;
      api.resetSim();
      stage.captureBaseline();
      stage.paint();
    });
    document.getElementById('btn-micro-shot')?.addEventListener('click', () => {
      if (api.getModelId() !== MICROSCOPE_MODEL_ID) return;
      api.captureWebglPng?.();
    });
    document.getElementById('btn-micro-params')?.addEventListener('click', () => {
      if (api.getModelId() !== MICROSCOPE_MODEL_ID) return;
      stage.toggleRail();
    });
    document.addEventListener('wheel', onWheel, { capture: true, passive: false });
  }

  return {
    MICROSCOPE_MODEL_ID,
    MICROSCOPE_SHELL_ID,
    sync,
    enter,
    leave,
    onModelChange,
    applyShellId,
    setTitle,
    bind,
    refresh,
    syncOverlayLabels,
    onKeydown,
    isMicroscopeShell: () => api.getActiveShellId() === MICROSCOPE_SHELL_ID,
    getShell,
    listShells,
  };
}
