import {
  parseUserNumber,
  inferUnit,
  inferGroup,
  GROUP_LABELS,
} from '../utils/params.js';
import { ICO } from './icons.js';

export function createParamBench(root, hooks = {}) {
  const { onParamChange, onResetDefaults, onGlobalsChange, onLayoutChange } = hooks;

  let currentModel = null;
  let currentParams = null;
  let builtins = new Set();
  let globals = null;
  let sectionIdx = 0;
  let sysOpen = true;

  function render() {
    if (!root || !currentModel || !currentParams || !globals) return;
    root.innerHTML = '';
    sectionIdx = 0;
    root.appendChild(renderGlobalSection());
    root.appendChild(renderParamSections());
    root.appendChild(renderCustomSection());
    root.appendChild(renderPresetSection());
    requestAnimationFrame(() => onLayoutChange?.());
  }

  function renderGlobalSection() {
    const sec = section('sys', true);
    const fold = document.createElement('details');
    fold.className = 'sys-fold';
    fold.open = sysOpen;
    const sum = document.createElement('summary');
    sum.className = 'sys-fold-sum';
    sum.textContent = 'expand / collapse';
    const rows = document.createElement('div');
    rows.className = 'param-rows';
    const g = globals;
    rows.appendChild(numberRow('timeScale', g.timeScale, {
      label: 'timeScale', unit: '×', defaultValue: 1,
      onCommit: (v) => { g.timeScale = v; onGlobalsChange?.(g); },
    }));
    rows.appendChild(numberRow('fixedDt', g.fixedDt, {
      label: 'fixedDt', unit: 's', defaultValue: 1 / 240,
      onCommit: (v) => {
        if (v <= 0) return false;
        g.fixedDt = v; onGlobalsChange?.(g); return true;
      },
    }));
    rows.appendChild(numberRow('maxSubSteps', g.maxSubSteps, {
      label: 'maxSubSteps', unit: '', defaultValue: 48,
      onCommit: (v) => {
        const n = Math.floor(v);
        if (n < 1) return false;
        g.maxSubSteps = n; onGlobalsChange?.(g); return true;
      },
    }));
    rows.appendChild(numberRow('viewScale', g.viewScale, {
      label: 'viewScale', unit: '×', defaultValue: 1,
      onCommit: (v) => {
        if (v <= 0) return false;
        g.viewScale = v; onGlobalsChange?.(g); return true;
      },
    }));
    rows.appendChild(numberRow('readoutDigits', g.readoutDigits, {
      label: 'digits', unit: '', defaultValue: 3,
      onCommit: (v) => {
        const n = Math.floor(v);
        if (n < 0 || n > 12) return false;
        g.readoutDigits = n; onGlobalsChange?.(g); return true;
      },
    }));
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
    fold.append(sum, rows);
    fold.addEventListener('toggle', () => {
      sysOpen = fold.open;
      onLayoutChange?.();
    });
    sec.appendChild(fold);
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
      const sec = section(GROUP_LABELS[g] || g, false);
      const rows = document.createElement('div');
      rows.className = 'param-rows';
      for (const item of groups.get(g)) {
        const def = currentModel.params?.[item.key];
        if (typeof item.value === 'boolean') {
          rows.appendChild(boolRow(item.key, item.value, {
            label: item.schema?.label || item.key,
            onCommit: (v) => commitParam(item.key, v),
          }));
        } else if (typeof item.value === 'number' || item.key === 'expr_a') {
          rows.appendChild(numberRow(item.key, item.value, {
            label: item.schema?.label || item.key,
            unit: item.schema?.unit || inferUnit(item.key),
            allowExpr: item.key === 'expr_a',
            defaultValue: typeof def === 'number' ? def : item.value,
            onCommit: (v) => commitParam(item.key, v),
            removable: !builtins.has(item.key),
            onRemove: () => removeParam(item.key),
          }));
        }
      }
      sec.appendChild(rows);
      wrap.appendChild(sec);
    }
    return wrap;
  }

  function renderCustomSection() {
    const sec = section('add', false);
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
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        hint.textContent = 'bad key'; return;
      }
      if (key === 'expr_a') {
        currentParams[key] = valIn.value.trim();
        onParamChange?.(key, currentParams[key], true);
      } else {
        const parsed = parseUserNumber(valIn.value);
        if (!parsed.ok) { hint.textContent = parsed.error; return; }
        currentParams[key] = parsed.value;
        onParamChange?.(key, parsed.value, true);
      }
      keyIn.value = ''; valIn.value = '';
      hint.textContent = 'added';
      render();
    });
    box.append(keyIn, valIn, btn);
    sec.append(box, hint);
    return sec;
  }

  function renderPresetSection() {
    const sec = section('presets', false);
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
        onGlobalsChange?.(globals);
        onParamChange?.('__preset', null, true);
        render();
      }),
      mk('export json', () => {
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
    sec.appendChild(details);
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

  function section(title, stickySys = false) {
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

  function bind(model, params, globalState) {
    currentModel = model;
    currentParams = params;
    globals = globalState;
    if (typeof globals.frameShot !== 'boolean') globals.frameShot = false;
    if (typeof globals.shotReadouts !== 'boolean') globals.shotReadouts = false;
    builtins = new Set(Object.keys(model.params || {}));
    render();
  }

  return { bind, refresh: render };
}

const PRESET_KEY = 'physics-lab-presets-v1';
function loadPresets() {
  try { return JSON.parse(localStorage.getItem(PRESET_KEY) || '{}'); }
  catch { return {}; }
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

  const input = document.createElement('input');
  input.type = 'text';
  input.value = opts.allowExpr && typeof value === 'string' ? value : String(value);
  input.spellcheck = false;
  const hint = document.createElement('div');
  hint.className = 'hint';

  const defaultValue = opts.defaultValue;

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
    const ok = opts.onCommit?.(parsed.value);
    if (ok === false) {
      input.classList.add('invalid');
      hint.textContent = 'rejected';
      return;
    }
    input.classList.remove('invalid');
    hint.textContent = '';
    syncPot(parsed.value);
  };

  input.addEventListener('change', commit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
  row.append(meta, input);

  let syncPot = () => {};
  if (!opts.allowExpr && typeof value === 'number') {
    const pot = createPot(value, defaultValue, (v) => {
      input.value = String(v);
      commit();
    });
    syncPot = pot.setValue;
    row.appendChild(pot.el);
  }

  if (opts.removable) {
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'btn quiet';
    rm.textContent = 'remove';
    rm.style.gridColumn = '1 / -1';
    rm.addEventListener('click', () => opts.onRemove?.());
    row.appendChild(rm);
  }
  row.appendChild(hint);
  return row;
}

function createPot(initial, defaultValue, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'pot';
  const dial = document.createElement('div');
  dial.className = 'pot-dial';
  dial.tabIndex = 0;
  dial.setAttribute('role', 'slider');
  dial.setAttribute('aria-label', 'reference pot');
  const knob = document.createElement('div');
  knob.className = 'pot-knob';
  dial.appendChild(knob);
  const ticks = document.createElement('div');
  ticks.className = 'pot-ticks';

  let center = Math.abs(initial) || 1;
  let value = initial;
  const resetTo = Number.isFinite(defaultValue) ? defaultValue : initial;

  const angFromVal = (v) => {
    const t = Math.max(-1, Math.min(1, v / (center * 4 || 1)));
    return -135 + (t + 1) * 135;
  };
  const fillFromVal = (v) => {
    const t = Math.max(0, Math.min(1, (v / (center * 4 || 1) + 1) / 2));
    return `${t * 100}%`;
  };
  const paint = () => {
    dial.style.setProperty('--fill', fillFromVal(value));
    knob.style.setProperty('--ang', `${angFromVal(value)}deg`);
    dial.setAttribute('aria-valuenow', String(value));
  };
  paint();

  const applyValue = (v) => {
    value = v;
    const mag = Math.abs(value);
    value = mag >= 10 ? Math.round(value * 10) / 10 : Math.round(value * 1000) / 1000;
    if (Math.abs(value) > center) center = Math.abs(value) || 1;
    paint();
    onChange?.(value);
  };

  const setFromPointer = (clientX, clientY) => {
    const r = dial.getBoundingClientRect();
    let deg = (Math.atan2(clientY - (r.top + r.height / 2), clientX - (r.left + r.width / 2)) * 180) / Math.PI + 90;
    deg = Math.max(-135, Math.min(135, deg));
    const t = (deg + 135) / 270;
    applyValue((t * 2 - 1) * center * 4);
  };

  let dragging = false;
  const onDown = (e) => {
    dragging = true;
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
  const onUp = () => { dragging = false; dial.style.cursor = 'grab'; };

  dial.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  dial.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);

  dial.addEventListener('dblclick', (e) => {
    e.preventDefault();
    center = Math.abs(resetTo) || 1;
    applyValue(resetTo);
  });

  const stepHint = document.createElement('span');
  stepHint.className = 'pot-step';
  const updateStepHint = (shift = false) => {
    const mag = Math.max(Math.abs(value), Math.abs(center), Math.abs(resetTo), 1e-12);
    const decade = 10 ** Math.floor(Math.log10(mag));
    const step = decade * (shift ? 1 : 0.1);
    const txt = step >= 1 ? step.toFixed(0) : step.toPrecision(1);
    stepHint.textContent = `±${txt}`;
    return step;
  };
  updateStepHint();

  dial.addEventListener('keydown', (e) => {
    const step = updateStepHint(e.shiftKey);
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault(); applyValue(value + step);
      updateStepHint(e.shiftKey);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault(); applyValue(value - step);
      updateStepHint(e.shiftKey);
    } else if (e.key === 'Home') {
      e.preventDefault();
      center = Math.abs(resetTo) || 1;
      applyValue(resetTo);
      updateStepHint(e.shiftKey);
    }
  });
  dial.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') updateStepHint(false);
  });

  wrap.append(dial, ticks, stepHint);

  return {
    el: wrap,
    setValue(v) {
      value = v;
      if (Math.abs(v) > center * 0.25) center = Math.abs(v) || 1;
      paint();
      updateStepHint();
    },
  };
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
