/**
 * Dedicated microscope shell chrome — keeps catalog / ODE UI off the WebGL stage.
 */
import {
  applyShell,
  persistShellId,
  getShell,
  MICROSCOPE_MODEL_ID,
  MICROSCOPE_SHELL_ID,
} from './registry.js';

/**
 * @param {{
 *   t: (key: string) => string,
 *   getActiveShellId: () => string,
 *   setActiveShellId: (id: string) => void,
 *   getModelId: () => string | undefined,
 *   switchModel: (id: string, opts?: { skipShellSync?: boolean }) => void,
 *   paintFrame: () => void,
 *   setSidebarOpen: (open: boolean) => void,
 *   setBenchOpen: (open: boolean) => void,
 *   syncPauseUi: () => void,
 *   syncDrawerChrome: () => void,
 *   resetSim: () => void,
 *   setPaused: (paused: boolean) => void,
 * }} api
 */
export function createMicroscopeChrome(api) {
  let lock = false;
  const microChrome = () => document.getElementById('microscope-chrome');
  const microTitle = () => document.getElementById('micro-title');
  const microLede = () => document.getElementById('micro-lede');
  const benchKicker = () => document.getElementById('bench-kicker');
  const benchTitle = () => document.getElementById('bench-title');

  function writeShellUrl(id) {
    try {
      const url = new URL(location.href);
      url.searchParams.set('shell', id);
      history.replaceState(null, '', url);
    } catch { /* ignore */ }
  }

  function sync(on) {
    const chrome = microChrome();
    if (chrome) chrome.hidden = !on;
    const kicker = benchKicker();
    if (kicker) kicker.textContent = on ? api.t('ui.microBenchKicker') : api.t('ui.benchKicker');
    const title = benchTitle();
    if (title) title.textContent = on ? api.t('ui.microBench') : api.t('ui.bench');
    const lede = microLede();
    if (lede) lede.textContent = api.t('ui.microLede');
    if (on) {
      api.setPaused(true);
      api.syncPauseUi();
      api.setSidebarOpen(false);
      api.setBenchOpen(true);
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
      const sel = document.getElementById('shell-select');
      if (sel) sel.value = MICROSCOPE_SHELL_ID;
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

  function leave({ nextShell = 'lab-classic' } = {}) {
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
      const sel = document.getElementById('shell-select');
      if (sel) sel.value = target;
      writeShellUrl(target);
      sync(false);
      api.paintFrame();
    } finally {
      lock = false;
    }
  }

  function onModelChange(modelId) {
    if (lock) return;
    if (modelId === MICROSCOPE_MODEL_ID && api.getActiveShellId() !== MICROSCOPE_SHELL_ID) {
      enter({ skipModel: true });
    } else if (modelId !== MICROSCOPE_MODEL_ID && api.getActiveShellId() === MICROSCOPE_SHELL_ID) {
      leave({ nextShell: 'lab-classic' });
    } else {
      sync(api.getActiveShellId() === MICROSCOPE_SHELL_ID);
    }
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

  function bind() {
    document.getElementById('btn-micro-exit')?.addEventListener('click', () => {
      leave({ nextShell: 'lab-classic' });
    });
    document.getElementById('btn-micro-reset')?.addEventListener('click', () => {
      if (api.getModelId() !== MICROSCOPE_MODEL_ID) return;
      api.resetSim();
    });
    document.getElementById('btn-micro-shot')?.addEventListener('click', () => {
      document.getElementById('btn-shot')?.click();
    });
    document.getElementById('btn-micro-params')?.addEventListener('click', () => {
      const bench = document.getElementById('bench');
      api.setBenchOpen(!bench?.classList.contains('open'));
    });
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
    isMicroscopeShell: () => api.getActiveShellId() === MICROSCOPE_SHELL_ID,
    getShell,
  };
}
