/**
 * Multiple Lab shells may coexist (different projects / teaching layouts).
 * Switch with ?shell=<id> or localStorage key immspfee-shell.
 * Add a new entry here; do not fork the whole app for a second chassis.
 */

export const SHELL_STORAGE_KEY = 'immspfee-shell';

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   description: string,
 *   rootClass: string,
 *   stageMode: 'canvas2d' | 'webgl3d',
 *   hideSidebar?: boolean,
 *   dprCap?: number,
 * }} ShellDef
 */

/** @type {ShellDef[]} */
export const SHELLS = [
  {
    id: 'lab-classic',
    label: 'Lab Classic',
    description: 'Three-column catalog · canvas · param bench (default workbench)',
    rootClass: 'shell-lab-classic',
    stageMode: 'canvas2d',
    dprCap: 2.5,
  },
  {
    id: 'lab-focus',
    label: 'Lab Focus',
    description: 'Same engines; denser stage, larger readouts for demos',
    rootClass: 'shell-lab-focus',
    stageMode: 'canvas2d',
    dprCap: 3,
  },
  {
    id: 'lab-projector',
    label: 'Lab Projector',
    description: 'Classroom projection: large readouts, sidebar hidden by default',
    rootClass: 'shell-lab-projector',
    stageMode: 'canvas2d',
    hideSidebar: true,
    dprCap: 3,
  },
];

const byId = new Map(SHELLS.map((s) => [s.id, s]));

export function listShells() {
  return SHELLS.slice();
}

export function getShell(id) {
  return byId.get(id) || SHELLS[0];
}

export function resolveShellId(search = typeof location !== 'undefined' ? location.search : '') {
  try {
    const q = new URLSearchParams(search).get('shell');
    if (q && byId.has(q)) return q;
  } catch { /* ignore */ }
  try {
    const stored = localStorage.getItem(SHELL_STORAGE_KEY);
    if (stored && byId.has(stored)) return stored;
  } catch { /* ignore */ }
  return SHELLS[0].id;
}

export function persistShellId(id) {
  if (!byId.has(id)) return;
  try { localStorage.setItem(SHELL_STORAGE_KEY, id); } catch { /* ignore */ }
}

/**
 * Apply shell chrome classes on documentElement / chassis.
 * @param {string} id
 * @param {{ document?: Document, onHideSidebar?: (hide: boolean) => void }} [opts]
 */
export function applyShell(id, opts = {}) {
  const doc = opts.document || (typeof document !== 'undefined' ? document : null);
  const shell = getShell(id);
  if (!doc) return shell;
  const root = doc.documentElement;
  for (const s of SHELLS) root.classList.remove(s.rootClass);
  root.classList.add(shell.rootClass);
  root.dataset.shell = shell.id;
  root.dataset.stageMode = shell.stageMode;
  if (shell.dprCap) root.dataset.dprCap = String(shell.dprCap);
  else delete root.dataset.dprCap;
  const chassis = doc.getElementById('chassis') || doc.getElementById('app') || doc.body;
  if (chassis) {
    for (const s of SHELLS) chassis.classList.remove(s.rootClass);
    chassis.classList.add(shell.rootClass);
    chassis.classList.toggle('shell-hide-sidebar', !!shell.hideSidebar);
  }
  if (typeof opts.onHideSidebar === 'function') {
    opts.onHideSidebar(!!shell.hideSidebar);
  }
  return shell;
}
