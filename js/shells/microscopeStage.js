/**
 * Isolated optical stage UI for lab-microscope3d.
 * Does not use the catalog param bench or generic HUD cards.
 */
import {
  OBJECTIVES,
  EYEPIECES,
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
  const o = opticsFromParams(params || {});
  return [
    o.obj.id,
    o.eye.id,
    Math.round(o.Lmm),
    o.NA.toFixed(3),
    Math.round(o.lambdaNm),
    o.immersion ? 'oil' : 'dry',
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
          <span class="micro-rail-kicker">Optical rail</span>
          <strong class="micro-rail-title">Finite tube</strong>
          <span class="micro-rail-dirty" id="micro-rail-dirty" hidden>params edited</span>
        </div>
        <div class="micro-field">
          <span class="micro-field-label">Objective</span>
          <div class="micro-chips" id="micro-obj" role="group"></div>
        </div>
        <div class="micro-field">
          <span class="micro-field-label">Eyepiece</span>
          <div class="micro-chips" id="micro-eye" role="group"></div>
        </div>
        <label class="micro-field">
          <span class="micro-field-label">Tube length L</span>
          <div class="micro-slider-row">
            <input type="range" id="micro-tube" min="120" max="200" step="1" />
            <output id="micro-tube-out">160 mm</output>
          </div>
        </label>
        <label class="micro-field">
          <span class="micro-field-label">NA</span>
          <div class="micro-slider-row">
            <input type="range" id="micro-na" min="0.05" max="1.4" step="0.01" />
            <output id="micro-na-out">0.25</output>
          </div>
          <span class="micro-cap" id="micro-na-cap"></span>
        </label>
        <label class="micro-field">
          <span class="micro-field-label">Wavelength λ</span>
          <div class="micro-slider-row">
            <input type="range" id="micro-lambda-in" min="400" max="700" step="1" />
            <output id="micro-lambda">550 nm</output>
          </div>
        </label>
        <div class="micro-field">
          <span class="micro-field-label">Immersion</span>
          <div class="micro-chips" id="micro-imm" role="group">
            <button type="button" class="micro-chip" data-imm="dry">Dry</button>
            <button type="button" class="micro-chip" data-imm="oil">Oil</button>
          </div>
          <span class="micro-cap" id="micro-imm-note">Follows the objective (100× → oil)</span>
        </div>
      </aside>
    `;
    host.appendChild(stage);

    const objHost = stage.querySelector('#micro-obj');
    for (const obj of OBJECTIVES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'micro-chip';
      b.dataset.obj = obj.id;
      b.textContent = `${obj.mag}×`;
      b.title = obj.immersion ? `${obj.mag}× oil` : `${obj.mag}×`;
      objHost.appendChild(b);
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
    if (!baselineFp) baselineFp = opticsFingerprint(state.params);
    const dirty = stage.querySelector('#micro-rail-dirty');
    if (dirty) {
      const edited = opticsFingerprint(state.params) !== baselineFp;
      dirty.hidden = !edited;
      const t = typeof api.t === 'function' ? api.t : (k) => k;
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
    const note = stage.querySelector('#micro-imm-note');
    if (note) {
      note.textContent = o.immersion
        ? 'Oil film on the stage · n ≥ 1.515'
        : 'Dry objective · immersion follows 100×';
    }
    stage.dataset.immersion = o.immersion ? '1' : '0';
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
      el.textContent = lab.text || '';
      el.classList.toggle('is-active', !!lab.active);
      el.classList.toggle('is-dim', lab.id === 'L');
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
