/**
 * Isolated optical stage UI for lab-microscope3d.
 * Does not use the catalog param bench or generic HUD cards.
 */
import {
  OBJECTIVES,
  EYEPIECES,
  OBJECTIVE_RING_LEGEND,
  objectiveRingColor,
  opticsFromParams,
  applyTurretDefaults,
} from '../models/microscopeOptics.js';
import { formatNum } from '../utils/draw.js';

const READOUTS = [
  { key: 'M', label: 'M' },
  { key: 'f_obj', label: 'f_obj' },
  { key: 'NA', label: 'NA' },
  { key: 'd_Abbe', label: 'd_Abbe' },
];

function fmtReadouts(o) {
  return {
    M: `${formatNum(o.M, 1)}×`,
    f_obj: `${formatNum(o.fObjM * 1e3, 2)} mm`,
    NA: formatNum(o.NA, 3),
    d_Abbe: `${formatNum(o.dResM * 1e6, 2)} µm`,
  };
}

/**
 * @param {{
 *   getState: () => object | null,
 *   onChange: () => void,
 *   t: (key: string) => string,
 * }} api
 */
function opticsFingerprint(params) {
  const p = params || {};
  const o = opticsFromParams(p);
  return [
    o.obj.id,
    o.eye.id,
    Math.round(o.Lmm),
    o.NA.toFixed(3),
    o.WD.toFixed(2),
    Math.round(o.lambdaNm),
    o.immersion ? 'oil' : 'dry',
    (Number(p.focusZ_mm) || 0).toFixed(2),
    (Number(p.stageX_mm) || 0).toFixed(1),
    (Number(p.stageY_mm) || 0).toFixed(1),
    (Number(p.fieldIris) || 0.55).toFixed(2),
    Number(p.lampOn) !== 0 ? '1' : '0',
    Math.round(Number(p.interpupillary_mm) || 64),
    Number(p.showLabels) !== 0 ? '1' : '0',
  ].join('|');
}

export function createMicroscopeStage(api) {
  const root = () => document.getElementById('micro-stage');
  const rail = () => document.getElementById('micro-rail');
  const readoutsEl = () => document.getElementById('micro-readouts');
  /** Baseline fingerprint of live optics (not decorative) — for rail “edited” chip. */
  let baselineFp = '';

  function ensureDom() {
    let stage = root();
    if (stage) return stage;
    const host = document.querySelector('.display-bezel') || document.getElementById('stage');
    if (!host) return null;
    stage = document.createElement('div');
    stage.id = 'micro-stage';
    stage.className = 'micro-stage';
    stage.hidden = true;
    stage.innerHTML = `
      <div class="micro-gl-labels" id="micro-gl-labels" aria-hidden="true"></div>
      <div class="micro-readouts" id="micro-readouts" aria-label="Optical readouts"></div>
      <aside class="micro-rail" id="micro-rail" aria-label="Optical parameters">
        <div class="micro-rail-head">
          <span class="micro-rail-kicker" data-i18n="ui.microRailKicker">Optical rail</span>
          <strong class="micro-rail-title" data-i18n="ui.microRailTitle">Finite tube</strong>
          <span class="micro-rail-dirty" id="micro-rail-dirty" hidden>params edited</span>
        </div>
        <div class="micro-field">
          <span class="micro-field-label" data-i18n="ui.microRailObj">Objective</span>
          <div class="micro-chips" id="micro-obj" role="group"></div>
          <div class="micro-ring-legend" id="micro-ring-legend" aria-label="DIN objective rings"></div>
        </div>
        <div class="micro-field">
          <span class="micro-field-label" data-i18n="ui.microRailEye">Eyepiece</span>
          <div class="micro-chips" id="micro-eye" role="group"></div>
        </div>
        <label class="micro-field">
          <span class="micro-field-label" data-i18n="ui.microRailTube">Tube length L</span>
          <div class="micro-slider-row">
            <input type="range" id="micro-tube" min="120" max="200" step="1" />
            <output id="micro-tube-out">160 mm</output>
          </div>
        </label>
        <label class="micro-field">
          <span class="micro-field-label" data-i18n="ui.microRailNA">NA</span>
          <div class="micro-slider-row">
            <input type="range" id="micro-na" min="0.05" max="1.4" step="0.01" />
            <output id="micro-na-out">0.25</output>
          </div>
          <span class="micro-cap" id="micro-na-cap"></span>
        </label>
        <label class="micro-field">
          <span class="micro-field-label" data-i18n="ui.microRailWD">Working distance</span>
          <div class="micro-slider-row">
            <input type="range" id="micro-wd" min="0.05" max="25" step="0.05" />
            <output id="micro-wd-out">6.5 mm</output>
          </div>
        </label>
        <label class="micro-field">
          <span class="micro-field-label" data-i18n="ui.microRailFocus">Focus Δz</span>
          <div class="micro-slider-row">
            <input type="range" id="micro-focus" min="-2" max="2" step="0.05" />
            <output id="micro-focus-out">0 mm</output>
          </div>
        </label>
        <label class="micro-field">
          <span class="micro-field-label" data-i18n="ui.microRailStageX">Stage X</span>
          <div class="micro-slider-row">
            <input type="range" id="micro-stage-x" min="-15" max="15" step="0.5" />
            <output id="micro-stage-x-out">0 mm</output>
          </div>
        </label>
        <label class="micro-field">
          <span class="micro-field-label" data-i18n="ui.microRailStageY">Stage Y</span>
          <div class="micro-slider-row">
            <input type="range" id="micro-stage-y" min="-10" max="10" step="0.5" />
            <output id="micro-stage-y-out">0 mm</output>
          </div>
        </label>
        <label class="micro-field">
          <span class="micro-field-label" data-i18n="ui.microRailFieldIris">Field iris</span>
          <div class="micro-slider-row">
            <input type="range" id="micro-field-iris" min="0.1" max="1" step="0.01" />
            <output id="micro-field-iris-out">0.55</output>
          </div>
        </label>
        <label class="micro-field">
          <span class="micro-field-label" data-i18n="ui.microRailLambda">Wavelength λ</span>
          <div class="micro-slider-row">
            <input type="range" id="micro-lambda-in" min="400" max="700" step="1" />
            <output id="micro-lambda">550 nm</output>
          </div>
        </label>
        <div class="micro-field">
          <span class="micro-field-label" data-i18n="ui.microRailLamp">Lamp</span>
          <div class="micro-chips" id="micro-lamp" role="group">
            <button type="button" class="micro-chip" data-lamp="1" data-i18n="ui.microRailLampOn">On</button>
            <button type="button" class="micro-chip" data-lamp="0" data-i18n="ui.microRailLampOff">Off</button>
          </div>
        </div>
        <label class="micro-field">
          <span class="micro-field-label" data-i18n="ui.microRailIpd">Interpupillary</span>
          <div class="micro-slider-row">
            <input type="range" id="micro-ipd" min="50" max="75" step="0.5" />
            <output id="micro-ipd-out">64 mm</output>
          </div>
        </label>
        <div class="micro-field">
          <span class="micro-field-label" data-i18n="ui.microRailLabels">3D labels</span>
          <div class="micro-chips" id="micro-labels" role="group">
            <button type="button" class="micro-chip" data-labels="1" data-i18n="ui.microRailLabelsOn">Show</button>
            <button type="button" class="micro-chip" data-labels="0" data-i18n="ui.microRailLabelsOff">Hide</button>
          </div>
        </div>
        <div class="micro-field">
          <span class="micro-field-label" data-i18n="ui.microRailImmersion">Immersion</span>
          <div class="micro-chips" id="micro-imm" role="group">
            <button type="button" class="micro-chip" data-imm="dry" data-i18n="ui.microRailDry">Dry</button>
            <button type="button" class="micro-chip" data-imm="oil" data-i18n="ui.microRailOil">Oil</button>
          </div>
          <span class="micro-cap" id="micro-imm-note">Follows the objective (100× → oil)</span>
        </div>
      </aside>
    `;
    host.appendChild(stage);

    const objHost = stage.querySelector('#micro-obj');
    for (const obj of OBJECTIVES) {
      const ring = objectiveRingColor(obj.mag);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'micro-chip';
      b.dataset.obj = obj.id;
      b.textContent = `${obj.mag}×`;
      b.title = obj.immersion ? `${obj.mag}× oil · ${ring.name}` : `${obj.mag}× · ${ring.name}`;
      b.style.setProperty('--micro-ring', ring.hex);
      objHost.appendChild(b);
    }
    const legend = stage.querySelector('#micro-ring-legend');
    for (const row of OBJECTIVE_RING_LEGEND) {
      const sw = document.createElement('span');
      sw.className = 'micro-ring-swatch';
      sw.style.setProperty('--micro-ring', row.hex);
      const dot = document.createElement('i');
      dot.setAttribute('aria-hidden', 'true');
      sw.appendChild(dot);
      sw.appendChild(document.createTextNode(`${row.mag}× ${row.name}`));
      legend?.appendChild(sw);
    }
    const eyeHost = stage.querySelector('#micro-eye');
    for (const eye of EYEPIECES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'micro-chip';
      b.dataset.eye = eye.id;
      b.textContent = `${eye.mag}×`;
      eyeHost.appendChild(b);
    }

    const readHost = stage.querySelector('#micro-readouts');
    for (const row of READOUTS) {
      const card = document.createElement('div');
      card.className = 'micro-metric';
      card.dataset.key = row.key;
      card.innerHTML = `<span class="micro-metric-label">${row.label}</span><span class="micro-metric-value" data-v>—</span>`;
      readHost.appendChild(card);
    }

    objHost.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-obj]');
      if (!btn) return;
      const state = api.getState();
      if (!state?.params) return;
      state.params.objective = btn.dataset.obj;
      applyTurretDefaults(state, 'obj');
      state._lastObj = state.params.objective;
      state.pick = `obj-${btn.textContent}`;
      paint();
      api.onChange();
    });
    eyeHost.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-eye]');
      if (!btn) return;
      const state = api.getState();
      if (!state?.params) return;
      state.params.eyepiece = btn.dataset.eye;
      applyTurretDefaults(state, 'eye');
      state._lastEye = state.params.eyepiece;
      state.pick = `eye-${btn.textContent}`;
      paint();
      api.onChange();
    });
    stage.querySelector('#micro-imm')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-imm]');
      if (!btn) return;
      const state = api.getState();
      if (!state?.params) return;
      if (btn.dataset.imm === 'oil') {
        state.params.objective = '100x';
      } else if (state.params.objective === '100x') {
        state.params.objective = '40x';
      }
      applyTurretDefaults(state, 'obj');
      state._lastObj = state.params.objective;
      paint();
      api.onChange();
    });
    const tube = stage.querySelector('#micro-tube');
    tube?.addEventListener('input', () => {
      const state = api.getState();
      if (!state?.params) return;
      state.params.tubeL_mm = Number(tube.value);
      paint();
      api.onChange();
    });
    const na = stage.querySelector('#micro-na');
    na?.addEventListener('input', () => {
      const state = api.getState();
      if (!state?.params) return;
      const o = opticsFromParams(state.params);
      state.params.NA = Math.min(Number(na.value), o.NAcap);
      paint();
      api.onChange();
    });
    const lambdaIn = stage.querySelector('#micro-lambda-in');
    lambdaIn?.addEventListener('input', () => {
      const state = api.getState();
      if (!state?.params) return;
      state.params.lambda_nm = Number(lambdaIn.value);
      paint();
      api.onChange();
    });
    const bindSlider = (id, key, cast = Number) => {
      const el = stage.querySelector(id);
      el?.addEventListener('input', () => {
        const state = api.getState();
        if (!state?.params) return;
        state.params[key] = cast(el.value);
        paint();
        api.onChange();
      });
    };
    bindSlider('#micro-wd', 'WD_mm');
    bindSlider('#micro-focus', 'focusZ_mm');
    bindSlider('#micro-stage-x', 'stageX_mm');
    bindSlider('#micro-stage-y', 'stageY_mm');
    bindSlider('#micro-field-iris', 'fieldIris');
    bindSlider('#micro-ipd', 'interpupillary_mm');
    stage.querySelector('#micro-lamp')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-lamp]');
      if (!btn) return;
      const state = api.getState();
      if (!state?.params) return;
      state.params.lampOn = Number(btn.dataset.lamp) ? 1 : 0;
      paint();
      api.onChange();
    });
    stage.querySelector('#micro-labels')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-labels]');
      if (!btn) return;
      const state = api.getState();
      if (!state?.params) return;
      state.params.showLabels = Number(btn.dataset.labels) ? 1 : 0;
      paint();
      api.onChange();
    });
    return stage;
  }

  function captureBaseline(state = api.getState()) {
    if (!state?.params) return;
    baselineFp = opticsFingerprint(state.params);
    const dirty = document.getElementById('micro-rail-dirty');
    if (dirty) dirty.hidden = true;
  }

  function paint() {
    const stage = ensureDom();
    if (!stage) return;
    const state = api.getState();
    if (!state?.params) return;
    const o = opticsFromParams(state.params);
    const values = fmtReadouts(o);
    const t = typeof api.t === 'function' ? api.t : (k) => k;
    for (const el of stage.querySelectorAll('[data-i18n]')) {
      const key = el.getAttribute('data-i18n');
      if (!key) continue;
      const val = t(key);
      if (val && val !== key) el.textContent = val;
    }
    const kicker = stage.querySelector('.micro-rail-kicker');
    if (kicker) kicker.textContent = t('ui.microRailKicker');
    const title = stage.querySelector('.micro-rail-title');
    if (title) title.textContent = t('ui.microRailTitle');
    if (!baselineFp) baselineFp = opticsFingerprint(state.params);
    const dirty = stage.querySelector('#micro-rail-dirty');
    if (dirty) {
      const edited = opticsFingerprint(state.params) !== baselineFp;
      dirty.hidden = !edited;
      dirty.textContent = edited
        ? t('ui.microRailDirtyLive')
          .replace('{M}', formatNum(o.M, 1))
          .replace('{d}', formatNum(o.dResM * 1e6, 2))
        : t('ui.microRailDirty');
    }
    for (const row of READOUTS) {
      const el = stage.querySelector(`.micro-metric[data-key="${row.key}"] [data-v]`);
      if (el) el.textContent = values[row.key];
    }
    for (const btn of stage.querySelectorAll('#micro-obj .micro-chip')) {
      btn.classList.toggle('is-active', btn.dataset.obj === o.obj.id);
      const mag = OBJECTIVES.find((obj) => obj.id === btn.dataset.obj)?.mag;
      if (mag != null) btn.style.setProperty('--micro-ring', objectiveRingColor(mag).hex);
    }
    for (const btn of stage.querySelectorAll('#micro-eye .micro-chip')) {
      btn.classList.toggle('is-active', btn.dataset.eye === o.eye.id);
    }
    for (const btn of stage.querySelectorAll('#micro-imm .micro-chip')) {
      btn.classList.toggle('is-active', (btn.dataset.imm === 'oil') === o.immersion);
    }
    const tube = stage.querySelector('#micro-tube');
    const tubeOut = stage.querySelector('#micro-tube-out');
    if (tube) tube.value = String(Math.round(o.Lmm));
    if (tubeOut) tubeOut.textContent = `${formatNum(o.Lmm, 0)} mm`;
    const na = stage.querySelector('#micro-na');
    const naOut = stage.querySelector('#micro-na-out');
    const naCap = stage.querySelector('#micro-na-cap');
    if (na) {
      na.max = String(o.NAcap);
      na.value = String(o.NA);
    }
    if (naOut) naOut.textContent = formatNum(o.NA, 3);
    if (naCap) naCap.textContent = `cap ${formatNum(o.NAcap, 3)} · n=${formatNum(o.n, 3)}`;
    const lambdaIn = stage.querySelector('#micro-lambda-in');
    const lambdaOut = stage.querySelector('#micro-lambda');
    if (lambdaIn) lambdaIn.value = String(Math.round(o.lambdaNm));
    if (lambdaOut) lambdaOut.textContent = `${formatNum(o.lambdaNm, 0)} nm`;
    const wd = stage.querySelector('#micro-wd');
    const wdOut = stage.querySelector('#micro-wd-out');
    if (wd) wd.value = String(o.WD);
    if (wdOut) wdOut.textContent = `${formatNum(o.WD, 2)} mm`;
    const focusZ = Number(state.params.focusZ_mm) || 0;
    const focus = stage.querySelector('#micro-focus');
    const focusOut = stage.querySelector('#micro-focus-out');
    if (focus) focus.value = String(focusZ);
    if (focusOut) focusOut.textContent = `${formatNum(focusZ, 2)} mm`;
    const sx = Number(state.params.stageX_mm) || 0;
    const sy = Number(state.params.stageY_mm) || 0;
    const stageX = stage.querySelector('#micro-stage-x');
    const stageXOut = stage.querySelector('#micro-stage-x-out');
    const stageY = stage.querySelector('#micro-stage-y');
    const stageYOut = stage.querySelector('#micro-stage-y-out');
    if (stageX) stageX.value = String(sx);
    if (stageXOut) stageXOut.textContent = `${formatNum(sx, 1)} mm`;
    if (stageY) stageY.value = String(sy);
    if (stageYOut) stageYOut.textContent = `${formatNum(sy, 1)} mm`;
    const fieldIris = Math.min(1, Math.max(0.1, Number(state.params.fieldIris) || 0.55));
    const field = stage.querySelector('#micro-field-iris');
    const fieldOut = stage.querySelector('#micro-field-iris-out');
    if (field) field.value = String(fieldIris);
    if (fieldOut) fieldOut.textContent = formatNum(fieldIris, 2);
    const lampOn = Number(state.params.lampOn) !== 0;
    for (const btn of stage.querySelectorAll('#micro-lamp .micro-chip')) {
      btn.classList.toggle('is-active', (btn.dataset.lamp === '1') === lampOn);
    }
    const ipd = Math.min(75, Math.max(50, Number(state.params.interpupillary_mm) || 64));
    const ipdEl = stage.querySelector('#micro-ipd');
    const ipdOut = stage.querySelector('#micro-ipd-out');
    if (ipdEl) ipdEl.value = String(ipd);
    if (ipdOut) ipdOut.textContent = `${formatNum(ipd, 1)} mm`;
    const showLabels = Number(state.params.showLabels) !== 0;
    for (const btn of stage.querySelectorAll('#micro-labels .micro-chip')) {
      btn.classList.toggle('is-active', (btn.dataset.labels === '1') === showLabels);
    }
    const labelHost = stage.querySelector('#micro-gl-labels');
    if (labelHost) labelHost.hidden = !showLabels;
    const note = stage.querySelector('#micro-imm-note');
    if (note) {
      note.textContent = o.immersion
        ? 'Oil film on the stage · n ≥ 1.515'
        : 'Dry objective · immersion follows 100×';
    }
    stage.dataset.immersion = o.immersion ? '1' : '0';
    stage.dataset.labels = showLabels ? '1' : '0';
  }

  function setVisible(on) {
    const stage = ensureDom();
    if (stage) stage.hidden = !on;
    if (on) captureBaseline();
  }

  /** Screen-space L / eyepiece labels from the WebGL stage (same optics as readouts). */
  function syncOverlayLabels(labels = []) {
    const host = document.getElementById('micro-gl-labels');
    if (!host) return;
    const next = Array.isArray(labels) ? labels : [];
    const kids = [...host.children];
    while (kids.length > next.length) {
      kids.pop()?.remove();
    }
    next.forEach((lab, i) => {
      let el = kids[i];
      if (!el) {
        el = document.createElement('span');
        el.className = 'micro-gl-label';
        host.appendChild(el);
      }
      el.dataset.id = lab.id || '';
      el.dataset.role = lab.role || '';
      el.textContent = lab.text || '';
      el.classList.toggle('is-active', !!lab.active);
      el.classList.toggle('is-dim', lab.id === 'L');
      el.classList.toggle('is-knob', lab.role === 'knob');
      el.classList.toggle('is-obj', lab.role === 'obj');
      el.classList.toggle('is-eye', lab.role === 'eye');
      el.classList.toggle('is-din', lab.role === 'din');
      if (lab.ring) el.style.setProperty('--micro-ring', lab.ring);
      else el.style.removeProperty('--micro-ring');
      el.style.transform = `translate(${Math.round(lab.x || 0)}px, ${Math.round(lab.y || 0)}px)`;
    });
  }

  function setRailOpen(open) {
    const el = rail();
    if (!el) return;
    el.classList.toggle('is-open', open);
    document.getElementById('btn-micro-params')?.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function toggleRail() {
    const el = rail();
    if (!el) return;
    setRailOpen(!el.classList.contains('is-open'));
  }

  return {
    ensureDom,
    paint,
    setVisible,
    setRailOpen,
    toggleRail,
    captureBaseline,
    syncOverlayLabels,
    READOUTS,
  };
}

export { fmtReadouts, READOUTS };
