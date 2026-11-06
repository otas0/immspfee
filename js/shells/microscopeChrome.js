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

/**
 * @param {{
 *   t: (key: string) => string,
 *   getActiveShellId: () => string,
 *   setActiveShellId: (id: string) => void,
 *   getModelId: () => string | undefined,
 *   getState: () => object | null,
 *   switchModel: (id: string, opts?: { skipShellSync?: boolean }) => void,
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
export function createMicroscopeChrome(api) {
  let lock = false;
  const microChrome = () => document.getElementById('microscope-chrome');
  const microTitle = () => document.getElementById('micro-title');
  const microLede = () => document.getElementById('micro-lede');

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
      api.setPaused(true);
      api.syncPauseUi();
      api.setSidebarOpen(false);
      api.setBenchOpen(false);
      stage.ensureDom();
      stage.setVisible(true);
      // Cold enter keeps the optical rail closed (esp. 390); open via Params.
      stage.setRailOpen(false);
      stage.paint();
    } else {
      stage.setRailOpen(false);
      stage.setVisible(false);
    }
    api.syncDrawerChrome();
  }

  function enter({ skipModel = false } = {}) {
    if (lock) return;
    lock = true;
    try {
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
      if (!skipModel && api.getModelId() !== MICROSCOPE_MODEL_ID) {
        api.switchModel(MICROSCOPE_MODEL_ID, { skipShellSync: true });
      }
      sync(true);
      api.paintFrame();
    } finally {
      lock = false;
    }
  }

  async function leave({ nextShell = 'lab-classic' } = {}) {
    if (lock) return;
    lock = true;
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
      api.paintFrame();
    } finally {
      lock = false;
    }
    return api.focusCatalogModel?.(MICROSCOPE_MODEL_ID, { domain: '物理', sub: '光学' });
  }

  function onModelChange(modelId) {
    if (lock) return;
    // Catalog row for r016 stays 2D Lab Classic. Only the separated sidebar
    // 3D entry / ?shell=lab-microscope3d / applyShellId enter the WebGL shell.
    if (modelId !== MICROSCOPE_MODEL_ID && api.getActiveShellId() === MICROSCOPE_SHELL_ID) {
      leave({ nextShell: 'lab-classic' });
      return;
    }
    sync(api.getActiveShellId() === MICROSCOPE_SHELL_ID);
  }

  function applyShellId(id) {
    if (id === MICROSCOPE_SHELL_ID) {
      enter({ skipModel: api.getModelId() === MICROSCOPE_MODEL_ID });
      return true;
    }
    if (api.getActiveShellId() === MICROSCOPE_SHELL_ID) {
      leave({ nextShell: id });
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
    onKeydown,
    isMicroscopeShell: () => api.getActiveShellId() === MICROSCOPE_SHELL_ID,
    getShell,
    listShells,
  };
}
