import {
  parseUserNumber,
  inferUnit,
  inferGroup,
  GROUP_LABELS,
  formatParamNumber,
  formatDtFriendly,
  clampNumber,
  inferBounds,
  sanitizeGlobals,
  validateCustomParam,
} from '../utils/params.js';
import { ICO } from './icons.js';

const GLOBAL_META = {
  timeScale: { label: 'timeScale', unit: '×', min: 0.05, max: 8, def: 1 },
  fixedDt: { label: 'fixedDt', unit: 's', min: 1 / 2000, max: 1 / 30, def: 1 / 240, friendlyDt: true },
  maxSubSteps: { label: 'maxSubSteps', unit: '', min: 1, max: 256, def: 48, integer: true },
  viewScale: { label: 'viewScale', unit: '×', min: 0.25, max: 4, def: 1 },
  readoutDigits: { label: 'digits', unit: '', min: 0, max: 8, def: 3, integer: true },
};

export function createParamBench(root, hooks = {}) {
  const {
    onParamChange,
    onResetDefaults,
    onGlobalsChange,
    onLayoutChange,
    onScrubStart,
    onScrubEnd,
    onToast,
  } = hooks;

  let currentModel = null;
  let currentParams = null;
  let builtins = new Set();
  let globals = null;
  let sectionIdx = 0;
  let sysOpen = false;
  const toastOnce = new Set();

  function isNarrow() {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 1100px)').matches;
  }

  function toastClamp(key, from, to) {
    const id = `clamp:${key}`;
    if (toastOnce.has(id)) return;
    toastOnce.add(id);
    onToast?.(`已钳制 ${key}: ${formatParamNumber(from)} → ${formatParamNumber(to)}`);
  }

  function displayValue(v, opts) {
    if (opts.allowExpr && typeof v === 'string') return v;
    if (opts.friendlyDt) return formatDtFriendly(v);
    return formatParamNumber(v);
  }

  function render() {
    if (!root || !currentModel || !currentParams || !globals) return;
    const before = { ...globals };
    sanitizeGlobals(globals);
    for (const k of ['timeScale', 'fixedDt', 'maxSubSteps', 'viewScale', 'readoutDigits']) {
      if (before[k] !== globals[k] && Number.isFinite(before[k])) {
        toastClamp(k, before[k], globals[k]);
      }
    }
    root.innerHTML = '';
    sectionIdx = 0;
    root.appendChild(renderGlobalSection());
    root.appendChild(renderParamSections());
    root.appendChild(renderCustomSection());
    root.appendChild(renderPresetSection());
    requestAnimationFrame(() => onLayoutChange?.());
  }

  function renderGlobalSection() {
    const sec = section('sys', { stickySys: true, foldable: true, open: sysOpen });
    const rows = document.createElement('div');
    rows.className = 'param-rows';
    const g = globals;

    for (const [key, meta] of Object.entries(GLOBAL_META)) {
      rows.appendChild(numberRow(key, g[key], {
        label: meta.label,
        unit: meta.unit,
        defaultValue: meta.def,
        min: meta.min,
        max: meta.max,
        integer: !!meta.integer,
        friendlyDt: !!meta.friendlyDt,
        onCommit: (v) => {
          const raw = v;
          let next = clampNumber(v, meta.min, meta.max);
          if (meta.integer) next = Math.round(next);
          if (key === 'fixedDt' && next <= 0) return false;
          if (next !== raw) toastClamp(key, raw, next);
          g[key] = next;
          onGlobalsChange?.(g);
          return true;
        },
        onScrubStart,
        onScrubEnd,
      }));
    }

    rows.appendChild(boolRow('showVectors', g.showVectors, {
      label: 'vectors', onCommit: (v) => { g.showVectors = v; onGlobalsChange?.(g); },
    }));
    rows.appendChild(boolRow('showTrail', g.showTrail, {
      label: 'trail', onCommit: (v) => { g.showTrail = v; onGlobalsChange?.(g); },
    }));
    rows.appendChild(boolRow('showAxes', g.showAxes, {
      label: 'axes', onCommit: (v) => { g.showAxes = v; onGlobalsChange?.(g); },
    }));
    rows.appendChild(boolRow('frameShot', g.frameShot, {
      label: 'frame shot', onCommit: (v) => { g.frameShot = v; onGlobalsChange?.(g); },
    }));
    rows.appendChild(boolRow('shotReadouts', g.shotReadouts, {
      label: 'shot readouts', onCommit: (v) => { g.shotReadouts = v; onGlobalsChange?.(g); },
    }));
    rows.appendChild(boolRow('shotLegend', g.shotLegend, {
      label: 'shot legend', onCommit: (v) => { g.shotLegend = v; onGlobalsChange?.(g); },
    }));
    appendSectionBody(sec, rows, {
      foldable: true,
      open: sysOpen,
      onToggle: (open) => { sysOpen = open; onLayoutChange?.(); },
    });
    return sec;
  }

  function renderParamSections() {
    const wrap = document.createElement('div');
    wrap.style.display = 'contents';
    const groups = new Map();
    for (const [key, value] of Object.entries(currentParams)) {
      if (key.startsWith('__')) continue;
      const schema = currentModel.paramSchema?.[key];
      const group = schema?.group || inferGroup(key, value);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push({ key, value, schema });
    }
    const order = ['dynamics', 'initial', 'numerics', 'display', 'custom'];
    const keys = [...groups.keys()].sort((a, b) => {
      const ia = order.indexOf(a); const ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    for (const g of keys) {
      const title = GROUP_LABELS[g] || g;
      // dyn 始终展开；sys/add/presets 在各自 render* 里折叠
      const sec = section(title);
      const rows = document.createElement('div');
      rows.className = 'param-rows';
      // 窄屏时 dyn 排在前面（order 已保证），便于先调物理量
      if (g === 'dynamics' && isNarrow()) {
        sec.dataset.priority = 'dyn';
      }
      for (const item of groups.get(g)) {
        const def = currentModel.params?.[item.key];
        if (typeof item.value === 'boolean') {
          rows.appendChild(boolRow(item.key, item.value, {
            label: item.schema?.label || item.key,
            onCommit: (v) => commitParam(item.key, v),
          }));
        } else if (typeof item.value === 'number' || item.key === 'expr_a') {
          const bounds = inferBounds(item.key, typeof def === 'number' ? def : item.value, item.schema);
          if (typeof item.value === 'number' && Number.isFinite(item.value)) {
            const clamped = clampNumber(item.value, bounds.min, bounds.max);
            if (clamped !== item.value) {
              toastClamp(item.key, item.value, clamped);
              currentParams[item.key] = clamped;
              item.value = clamped;
            }
          }
          rows.appendChild(numberRow(item.key, item.value, {
            label: item.schema?.label || item.key,
            unit: item.schema?.unit || inferUnit(item.key),
            allowExpr: item.key === 'expr_a',
            defaultValue: typeof def === 'number' ? def : item.value,
            min: bounds.min,
            max: bounds.max,
            onCommit: (v) => {
              const next = clampNumber(v, bounds.min, bounds.max);
              if (next !== v) toastClamp(item.key, v, next);
              return commitParam(item.key, next);
            },
            removable: !builtins.has(item.key),
            onRemove: () => removeParam(item.key),
            onScrubStart,
            onScrubEnd,
          }));
        }
      }
      sec.appendChild(rows);
      wrap.appendChild(sec);
    }
    return wrap;
  }

  function renderCustomSection() {
    const sec = section('add', { foldable: true, open: false });
    const box = document.createElement('div');
    box.className = 'custom-add';
    const keyIn = document.createElement('input');
    keyIn.type = 'text'; keyIn.placeholder = 'key';
    const valIn = document.createElement('input');
    valIn.type = 'text'; valIn.placeholder = 'value / expr';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn'; btn.textContent = 'add';
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.style.gridColumn = '1 / -1';
    hint.style.padding = '0 0.5rem 0.4rem';
    hint.style.color = 'var(--muted)';
    hint.innerHTML = 'a_* / expr_a / k_extra → eq. <a href="./manual.html" style="color:inherit;text-decoration:underline">manual</a>';

    btn.addEventListener('click', () => {
      const key = keyIn.value.trim();
      const checked = validateCustomParam(key, valIn.value);
      if (!checked.ok) {
        hint.textContent = checked.error || 'rejected';
        onToast?.(`拒绝写入: ${checked.error}`);
        return;
      }
      currentParams[key] = checked.value;
      onParamChange?.(key, checked.value, true);
      keyIn.value = ''; valIn.value = '';
      hint.textContent = 'added';
      render();
    });
    box.append(keyIn, valIn, btn);
    const body = document.createElement('div');
    body.append(box, hint);
    appendSectionBody(sec, body, { foldable: true, open: false });
    return sec;
  }

  function renderPresetSection() {
    const sec = section('presets', { foldable: true, open: false });
    const details = document.createElement('details');
    details.className = 'preset-menu';
    details.open = false;
    const summary = document.createElement('summary');
    summary.innerHTML = `${ICO.more}<span>more / presets</span>`;
    const menu = document.createElement('div');
    menu.className = 'menu';

    const mk = (label, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn quiet';
      b.textContent = label;
      b.addEventListener('click', (e) => { e.preventDefault(); fn(); details.open = false; });
      return b;
    };

    menu.append(
      mk('save local', () => {
        const name = prompt('preset name', `${currentModel.id}-preset`);
        if (!name) return;
        const all = loadPresets();
        sanitizeGlobals(globals);
        all[name] = {
          modelId: currentModel.id,
          params: { ...currentParams },
          globals: { ...globals },
          savedAt: Date.now(),
        };
        localStorage.setItem(PRESET_KEY, JSON.stringify(all));
      }),
      mk('load local', () => {
        const all = loadPresets();
        const names = Object.keys(all).filter((n) => all[n].modelId === currentModel.id);
        if (!names.length) { alert('no presets'); return; }
        const name = prompt(`available: ${names.join(', ')}`, names[0]);
        if (!name || !all[name]) return;
        Object.keys(currentParams).forEach((k) => delete currentParams[k]);
        Object.assign(currentParams, all[name].params);
        Object.assign(globals, all[name].globals || {});
        sanitizeGlobals(globals);
        onGlobalsChange?.(globals);
        onParamChange?.('__preset', null, true);
        render();
      }),
      mk('export json', () => {
        sanitizeGlobals(globals);
        const blob = new Blob([JSON.stringify({
          modelId: currentModel.id, params: currentParams, globals,
        }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${currentModel.id}-params.json`; a.click();
        URL.revokeObjectURL(url);
      }),
      mk('import json', () => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'application/json,.json';
        input.addEventListener('change', async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            const data = JSON.parse(await file.text());
            if (data.params) {
              Object.keys(currentParams).forEach((k) => delete currentParams[k]);
              Object.assign(currentParams, data.params);
            }
            if (data.globals) Object.assign(globals, data.globals);
            sanitizeGlobals(globals);
            onGlobalsChange?.(globals);
            onParamChange?.('__import', null, true);
            render();
          } catch { alert('invalid json'); }
        });
        input.click();
      }),
      mk('restore defaults', () => onResetDefaults?.()),
    );
    details.append(summary, menu);
    appendSectionBody(sec, details, { foldable: true, open: false });
    return sec;
  }

  function commitParam(key, value) {
    currentParams[key] = value;
    onParamChange?.(key, value, true);
    return true;
  }
  function removeParam(key) {
    delete currentParams[key];
    onParamChange?.(key, undefined, true);
    render();
  }

  function section(title, { stickySys = false } = {}) {
    sectionIdx += 1;
    const sec = document.createElement('section');
    sec.className = 'param-section' + (stickySys ? ' is-sys' : '');
    const h = document.createElement('h3');
    const idx = document.createElement('span');
    idx.className = 'idx';
    idx.textContent = String(sectionIdx).padStart(2, '0');
    h.append(idx, document.createTextNode(` ${title}`));
    sec.appendChild(h);
    return sec;
  }

  function appendSectionBody(sec, body, { foldable, open, onToggle } = {}) {
    if (!foldable) {
      sec.appendChild(body);
      return;
    }
    const fold = document.createElement('details');
    fold.className = 'section-fold';
    fold.open = !!open;
    const sum = document.createElement('summary');
    sum.className = 'section-fold-sum';
    sum.textContent = open ? 'collapse' : 'expand';
    fold.append(sum, body);
    fold.addEventListener('toggle', () => {
      sum.textContent = fold.open ? 'collapse' : 'expand';
      onToggle?.(fold.open);
    });
    sec.appendChild(fold);
  }

  function bind(model, params, globalState) {
    currentModel = model;
    currentParams = params;
    globals = globalState;
    if (typeof globals.frameShot !== 'boolean') globals.frameShot = false;
    if (typeof globals.shotReadouts !== 'boolean') globals.shotReadouts = false;
    if (typeof globals.shotLegend !== 'boolean') globals.shotLegend = false;
    sanitizeGlobals(globals);
    builtins = new Set(Object.keys(model.params || {}));
    render();
  }

  function numberRow(key, value, opts) {
    const row = document.createElement('div');
    row.className = 'param-row';
    const meta = document.createElement('div');
    meta.className = 'meta';
    const label = document.createElement('span');
    label.className = 'key';
    label.textContent = opts.label || key;
    const unit = document.createElement('span');
    unit.className = 'unit';
    unit.textContent = opts.unit || '';
    meta.append(label, unit);

    const controls = document.createElement('div');
    controls.className = 'param-controls';

    const inputRow = document.createElement('div');
    inputRow.className = 'param-input-row';

    const btnMinus = document.createElement('button');
    btnMinus.type = 'button';
    btnMinus.className = 'step-btn';
    btnMinus.textContent = '−';
    btnMinus.setAttribute('aria-label', 'decrease');

    const btnPlus = document.createElement('button');
    btnPlus.type = 'button';
    btnPlus.className = 'step-btn';
    btnPlus.textContent = '+';
    btnPlus.setAttribute('aria-label', 'increase');

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.spellcheck = false;
    input.value = displayValue(value, opts);

    const hint = document.createElement('div');
    hint.className = 'hint';

    const min = opts.min;
    const max = opts.max;
    const defaultValue = opts.defaultValue;

    const writeInput = (v) => {
      input.value = displayValue(v, opts);
    };

    let syncControl = () => {};

    const commit = () => {
      if (opts.allowExpr) {
        opts.onCommit?.(input.value);
        input.classList.remove('invalid');
        hint.textContent = '';
        return;
      }
      const parsed = parseUserNumber(input.value);
      if (!parsed.ok) {
        input.classList.add('invalid');
        hint.textContent = parsed.error;
        return;
      }
      let v = parsed.value;
      const raw = v;
      if (Number.isFinite(min) && Number.isFinite(max)) v = clampNumber(v, min, max);
      if (opts.integer) v = Math.round(v);
      if (v !== raw) toastClamp(key, raw, v);
      const ok = opts.onCommit?.(v);
      if (ok === false) {
        input.classList.add('invalid');
        hint.textContent = 'rejected';
        return;
      }
      input.classList.remove('invalid');
      hint.textContent = '';
      writeInput(v);
      syncControl(v);
    };

    const nudge = (dir, shift) => {
      if (opts.allowExpr) return;
      const parsed = parseUserNumber(input.value);
      let cur = parsed.ok ? parsed.value : Number(defaultValue) || 0;
      const step = niceStep(cur || max - min || 1, shift);
      let next = cur + dir * step;
      if (Number.isFinite(min) && Number.isFinite(max)) next = clampNumber(next, min, max);
      if (opts.integer) next = Math.round(next);
      writeInput(next);
      syncControl(next);
      opts.onCommit?.(next);
    };

    input.addEventListener('change', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
        return;
      }
      if (opts.allowExpr) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        nudge(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey);
      }
    });
    btnMinus.addEventListener('click', () => nudge(-1, false));
    btnPlus.addEventListener('click', () => nudge(1, false));

    if (!opts.allowExpr) {
      inputRow.append(btnMinus, input, btnPlus);
    } else {
      inputRow.appendChild(input);
    }
    controls.appendChild(inputRow);

    if (!opts.allowExpr && typeof value === 'number') {
      const lo = Number.isFinite(min) ? min : inferBounds(key, defaultValue).min;
      const hi = Number.isFinite(max) ? max : inferBounds(key, defaultValue).max;
      const pot = createPot({
        initial: clampNumber(value, lo, hi),
        defaultValue: Number.isFinite(defaultValue) ? defaultValue : value,
        min: lo,
        max: hi,
        integer: !!opts.integer,
        friendlyDt: !!opts.friendlyDt,
        onChange: (v) => {
          writeInput(v);
          opts.onCommit?.(v);
          hint.textContent = '';
          input.classList.remove('invalid');
        },
        onScrubStart: opts.onScrubStart,
        onScrubEnd: opts.onScrubEnd,
      });
      syncControl = pot.setValue;
      controls.appendChild(pot.el);
    }

    row.append(meta, controls, hint);
    return row;
  }

  return { bind, refresh: render };
}

const PRESET_KEY = 'physics-lab-presets-v1';
function loadPresets() {
  try { return JSON.parse(localStorage.getItem(PRESET_KEY) || '{}'); }
  catch { return {}; }
}

/**
 * 电位器：固定 [min,max]，绝不随拖动扩张量程。
 */
function createPot({
  initial, defaultValue, min, max, integer, onChange, onScrubStart, onScrubEnd,
}) {
  const wrap = document.createElement('div');
  wrap.className = 'pot';

  const dial = document.createElement('div');
  dial.className = 'pot-dial';
  dial.tabIndex = 0;
  dial.setAttribute('role', 'slider');
  dial.setAttribute('aria-label', 'adjust value');
  dial.setAttribute('aria-valuemin', String(min));
  dial.setAttribute('aria-valuemax', String(max));
  dial.title = '拖动调节 · 双击 / Home 复位';

  const knob = document.createElement('div');
  knob.className = 'pot-knob';
  dial.appendChild(knob);

  const range = document.createElement('input');
  range.type = 'range';
  range.className = 'pot-range';
  range.min = String(min);
  range.max = String(max);
  range.step = integer
    ? '1'
    : String(Math.min(
      niceStep(Math.max(Math.abs(defaultValue), Math.abs(max - min) / 100), false) || 0.001,
      Math.max((max - min) / 200, 1e-6),
    ));
  range.setAttribute('aria-label', 'slider');

  const stepHint = document.createElement('span');
  stepHint.className = 'pot-step';

  let value = clampNumber(initial, min, max);
  const resetTo = clampNumber(
    Number.isFinite(defaultValue) ? defaultValue : initial,
    min,
    max,
  );
  const span = Math.max(max - min, Number.EPSILON);
  let scrubbing = false;

  const beginScrub = () => {
    if (scrubbing) return;
    scrubbing = true;
    onScrubStart?.();
  };
  const endScrub = () => {
    if (!scrubbing) return;
    scrubbing = false;
    onScrubEnd?.();
  };

  const angFromVal = (v) => {
    const t = (clampNumber(v, min, max) - min) / span;
    return -135 + t * 270;
  };
  const fillFromVal = (v) => {
    const t = (clampNumber(v, min, max) - min) / span;
    return `${t * 100}%`;
  };

  const paint = () => {
    dial.style.setProperty('--fill', fillFromVal(value));
    knob.style.setProperty('--ang', `${angFromVal(value)}deg`);
    dial.setAttribute('aria-valuenow', String(value));
    range.value = String(value);
    const step = niceStep(value, false);
    stepHint.textContent = `±${formatParamNumber(step)}`;
  };

  const applyValue = (raw, announce = true) => {
    let v = clampNumber(raw, min, max);
    if (integer) v = Math.round(v);
    else v = roundToStep(v, niceStep(v, false));
    v = clampNumber(v, min, max);
    value = v;
    paint();
    if (announce) onChange?.(value);
  };

  const flashReset = () => {
    dial.classList.remove('pot-reset-flash');
    // restart animation
    void dial.offsetWidth;
    dial.classList.add('pot-reset-flash');
    window.setTimeout(() => dial.classList.remove('pot-reset-flash'), 450);
  };

  const setFromPointer = (clientX, clientY) => {
    const r = dial.getBoundingClientRect();
    let deg = (Math.atan2(clientY - (r.top + r.height / 2), clientX - (r.left + r.width / 2)) * 180) / Math.PI + 90;
    deg = Math.max(-135, Math.min(135, deg));
    const t = (deg + 135) / 270;
    applyValue(min + t * span);
  };

  let dragging = false;
  const onDown = (e) => {
    dragging = true;
    beginScrub();
    dial.style.cursor = 'grabbing';
    const pt = e.touches ? e.touches[0] : e;
    setFromPointer(pt.clientX, pt.clientY);
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!dragging) return;
    const pt = e.touches ? e.touches[0] : e;
    setFromPointer(pt.clientX, pt.clientY);
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    dial.style.cursor = 'grab';
    endScrub();
  };

  dial.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  dial.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);

  dial.addEventListener('dblclick', (e) => {
    e.preventDefault();
    applyValue(resetTo);
    flashReset();
  });

  range.addEventListener('pointerdown', beginScrub);
  range.addEventListener('pointerup', endScrub);
  range.addEventListener('pointercancel', endScrub);
  range.addEventListener('change', endScrub);
  range.addEventListener('input', () => {
    beginScrub();
    applyValue(Number(range.value));
  });

  dial.addEventListener('keydown', (e) => {
    const step = niceStep(value, e.shiftKey);
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault(); applyValue(value + step);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault(); applyValue(value - step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      applyValue(resetTo);
      flashReset();
    } else if (e.key === 'End') {
      e.preventDefault(); applyValue(max);
    }
  });

  paint();
  wrap.append(dial, range, stepHint);

  return {
    el: wrap,
    setValue(v) {
      value = clampNumber(v, min, max);
      paint();
    },
  };
}

function niceStep(value, shift = false) {
  const mag = Math.max(Math.abs(value), 1e-12);
  const decade = 10 ** Math.floor(Math.log10(mag));
  return decade * (shift ? 1 : 0.1);
}

function roundToStep(v, step) {
  if (!Number.isFinite(step) || step <= 0) return v;
  const n = Math.round(v / step) * step;
  const digits = Math.min(8, Math.max(0, -Math.floor(Math.log10(step)) + 1));
  return Number(n.toFixed(digits));
}

function boolRow(_key, value, opts) {
  const row = document.createElement('div');
  row.className = 'param-row bool';
  const meta = document.createElement('div');
  meta.className = 'meta';
  const label = document.createElement('span');
  label.className = 'key';
  label.textContent = opts.label || _key;
  meta.appendChild(label);
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!value;
  input.addEventListener('change', () => opts.onCommit?.(input.checked));
  row.append(meta, input);
  return row;
}
