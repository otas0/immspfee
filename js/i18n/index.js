import { LOCALES, STRINGS } from './strings.js';

const STORAGE_KEY = 'physics-lab-locale-v1';
const DEFAULT = 'en';

/** @type {string} */
let locale = DEFAULT;
/** @type {Set<() => void>} */
const listeners = new Set();
/** @type {Record<string, Record<string, {name?: string, description?: string}>>} */
const modelPacks = {};
/** @type {Set<string>} */
const packLoading = new Set();

function readUrlLang() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && STRINGS[q]) return q;
  } catch { /* ignore */ }
  return null;
}

function writeUrlLang(id) {
  try {
    const url = new URL(location.href);
    if (id === DEFAULT) url.searchParams.delete('lang');
    else url.searchParams.set('lang', id);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch { /* ignore */ }
}

function detect() {
  const fromUrl = readUrlLang();
  if (fromUrl) return fromUrl;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && STRINGS[saved]) return saved;
  } catch { /* ignore */ }
  const nav = (typeof navigator !== 'undefined' && (navigator.language || '')).toLowerCase();
  if (nav.startsWith('zh')) return 'zh';
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('ko')) return 'ko';
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('fr')) return 'fr';
  if (nav.startsWith('de')) return 'de';
  if (nav.startsWith('en')) return 'en';
  return DEFAULT;
}

locale = detect();

export function getLocale() {
  return locale;
}

export function listLocales() {
  return LOCALES.slice();
}

/** @param {string} key @param {Record<string, string|number>} [vars] */
export function t(key, vars) {
  const table = STRINGS[locale] || STRINGS[DEFAULT] || {};
  let s = table[key] ?? STRINGS.en?.[key] ?? STRINGS.zh?.[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

export function domainLabel(domain) {
  const key = `domain.${domain}`;
  const out = t(key);
  return out === key ? domain : out;
}

export function groupLabels() {
  return {
    dynamics: t('group.dynamics'),
    initial: t('group.initial'),
    display: t('group.display'),
    numerics: t('group.numerics'),
    custom: t('group.custom'),
    global: t('group.global'),
  };
}

function htmlLang(id) {
  if (id === 'zh') return 'zh-CN';
  if (id === 'ja') return 'ja';
  if (id === 'ko') return 'ko';
  return id;
}

async function ensureModelPack(id) {
  if (id === 'zh') return null; // catalog source is Chinese
  if (modelPacks[id]) return modelPacks[id];
  if (packLoading.has(id)) return null;
  if (id !== 'en' && id !== 'ja') return null;
  packLoading.add(id);
  try {
    const res = await fetch(`./data/locales/models-${id}.json`);
    if (res.ok) modelPacks[id] = await res.json();
  } catch { /* ignore */ }
  packLoading.delete(id);
  return modelPacks[id] || null;
}

/** Localized catalog fields; falls back to source model. */
export function localizeModel(model) {
  if (!model) return model;
  const pack = modelPacks[locale];
  const hit = pack?.[model.id];
  if (!hit) return model;
  return {
    ...model,
    name: hit.name || model.name,
    description: hit.description || model.description,
  };
}

function notify() {
  for (const fn of listeners) {
    try { fn(); } catch { /* ignore */ }
  }
}

/** @param {string} next @param {{ focusSelect?: boolean }} [opts] */
export function setLocale(next, opts = {}) {
  if (!STRINGS[next] || next === locale) {
    if (opts.focusSelect !== false) {
      queueMicrotask(() => document.getElementById('locale-select')?.focus());
    }
    return;
  }
  locale = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  writeUrlLang(next);
  document.documentElement.lang = htmlLang(next);
  document.documentElement.setAttribute('xml:lang', htmlLang(next));
  applyDomI18n();
  notify();
  void ensureModelPack(next).then(() => notify());
  if (opts.focusSelect !== false) {
    queueMicrotask(() => document.getElementById('locale-select')?.focus());
  }
}

/** @param {() => void} fn */
export function onLocaleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function applyDomI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.hasAttribute('data-i18n-placeholder')) el.setAttribute('placeholder', val);
    } else {
      el.textContent = val;
    }
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', t(key));
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', t(key));
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (key) el.setAttribute('aria-label', t(key));
  });
  const sel = root.querySelector('#locale-select');
  if (sel && sel instanceof HTMLSelectElement && sel.value !== locale) {
    sel.value = locale;
  }
}

export function mountLocaleSelect(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  for (const loc of LOCALES) {
    const opt = document.createElement('option');
    opt.value = loc.id;
    opt.textContent = loc.label;
    selectEl.appendChild(opt);
  }
  selectEl.value = locale;
  selectEl.addEventListener('change', () => {
    setLocale(selectEl.value, { focusSelect: true });
  });
}

/** Call once at boot: URL wins, then hydrate packs. */
export function bootI18n() {
  const fromUrl = readUrlLang();
  if (fromUrl && fromUrl !== locale) locale = fromUrl;
  document.documentElement.lang = htmlLang(locale);
  document.documentElement.setAttribute('xml:lang', htmlLang(locale));
  try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* ignore */ }
  writeUrlLang(locale);
  applyDomI18n();
  return ensureModelPack(locale);
}

if (typeof document !== 'undefined') {
  document.documentElement.lang = htmlLang(locale);
}
