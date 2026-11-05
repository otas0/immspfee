import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

/**
 * Compound microscope — Structure P0 (2D assembly).
 * Visual magnification M ≈ −(L / f_obj) · (0.25 m / f_eye) (Hecht, Optics; finite tube).
 * NA and working distance are first-class editable params; resolution d = 0.61 λ / NA.
 */

const OBJECTIVES = [
  { mag: 4, fMm: 40, na: 0.10, wdMm: 18.0 },
  { mag: 10, fMm: 16, na: 0.25, wdMm: 6.5 },
  { mag: 40, fMm: 4.0, na: 0.65, wdMm: 0.60 },
  { mag: 100, fMm: 1.6, na: 1.25, wdMm: 0.15 },
];

const EYEPIECES = [
  { mag: 5, fMm: 50 },
  { mag: 10, fMm: 25 },
  { mag: 15, fMm: 16.7 },
];

function clampSlot(v, n) {
  const i = Math.round(Number(v) || 0);
  return Math.max(0, Math.min(n - 1, i));
}

function opticsFromParams(params) {
  const oi = clampSlot(P(params, 'objSlot', 1), OBJECTIVES.length);
  const ei = clampSlot(P(params, 'eyeSlot', 1), EYEPIECES.length);
  const obj = OBJECTIVES[oi];
  const eye = EYEPIECES[ei];
  const Lmm = Math.max(80, P(params, 'tubeL_mm', 160));
  const n = Math.max(1, P(params, 'n', 1));
  const NA = Math.max(0.05, Math.min(n * 0.95, P(params, 'NA', obj.na)));
  const WD = Math.max(0.05, P(params, 'WD_mm', obj.wdMm));
  const lambdaNm = Math.max(380, Math.min(780, P(params, 'lambda_nm', 550)));
  const fObjM = (P(params, 'fObj_mm', obj.fMm) * 1e-3);
  const fEyeM = (P(params, 'fEye_mm', eye.fMm) * 1e-3);
  const L = Lmm * 1e-3;
  // Finite-tube angular / visual magnification (near-point convention, D = 0.25 m)
  const M = -(L / Math.max(fObjM, 1e-6)) * (0.25 / Math.max(fEyeM, 1e-6));
  const mObj = -(L / Math.max(fObjM, 1e-6));
  const Meye = 0.25 / Math.max(fEyeM, 1e-6);
  const dResM = (0.61 * (lambdaNm * 1e-9)) / Math.max(NA, 1e-6);
  return {
    oi, ei, obj, eye, Lmm, n, NA, WD, lambdaNm, fObjM, fEyeM, L, M, mObj, Meye, dResM,
  };
}

function applyTurretDefaults(state, which) {
  const oi = clampSlot(P(state.params, 'objSlot', 1), OBJECTIVES.length);
  const ei = clampSlot(P(state.params, 'eyeSlot', 1), EYEPIECES.length);
  const obj = OBJECTIVES[oi];
  const eye = EYEPIECES[ei];
  if (which === 'obj' || which === 'all') {
    state.params.fObj_mm = obj.fMm;
    state.params.NA = obj.na;
    state.params.WD_mm = obj.wdMm;
    if (obj.mag >= 100) state.params.n = Math.max(state.params.n, 1.515);
  }
  if (which === 'eye' || which === 'all') {
    state.params.fEye_mm = eye.fMm;
  }
  state.params.objSlot = oi;
  state.params.eyeSlot = ei;
}

function hitTest(px, py, layout) {
  for (const h of layout.hits) {
    if (px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h) return h;
  }
  return null;
}

export default {
  id: 'r016-显微镜',
  name: 'Compound microscope (structure)',
  formula: 'M ≈ −(L/f_obj)·(25 cm/f_eye); d = 0.61 λ / NA',
  description: '2D structure assembly: turret objectives + eyepiece; real optical params',
  authority: 'Hecht, Optics — compound microscope magnification; Abbe resolution d = 0.61 λ / NA',
  assumptions: 'Paraxial finite-tube; thin-lens objectives; near-point 25 cm; no aberrations / immersion ray fan',
  fidelity: 'engineering',
  capabilities: {
    interaction: 'canvas',
    formalism: 'optics',
    viz: 'phet-optics',
    fidelity: 'engineering',
    pointer: true,
    hint: 'Click objective turret or eyepiece to assemble',
  },
  params: {
    objSlot: 1,
    eyeSlot: 1,
    tubeL_mm: 160,
    fObj_mm: 16,
    fEye_mm: 25,
    NA: 0.25,
    WD_mm: 6.5,
    n: 1.0,
    lambda_nm: 550,
  },
  paramSchema: {
    objSlot: { group: 'dynamics', unit: '', label: 'Objective slot', min: 0, max: 3 },
    eyeSlot: { group: 'dynamics', unit: '', label: 'Eyepiece slot', min: 0, max: 2 },
    tubeL_mm: { group: 'dynamics', unit: 'mm', label: 'Tube length L', min: 120, max: 200 },
    fObj_mm: { group: 'dynamics', unit: 'mm', label: 'f_obj', min: 1, max: 50 },
    fEye_mm: { group: 'dynamics', unit: 'mm', label: 'f_eye', min: 10, max: 60 },
    NA: { group: 'dynamics', unit: '—', label: 'NA', min: 0.05, max: 1.4 },
    WD_mm: { group: 'dynamics', unit: 'mm', label: 'Working distance', min: 0.05, max: 25 },
    n: { group: 'dynamics', unit: '—', label: 'n (medium)', min: 1, max: 1.6 },
    lambda_nm: { group: 'dynamics', unit: 'nm', label: 'λ', min: 400, max: 700 },
  },

  init(state) {
    applyTurretDefaults(state, 'all');
    state.t = 0;
    state._layout = null;
    state.pick = null;
  },

  refresh(state) {
    const oi = clampSlot(P(state.params, 'objSlot', 1), OBJECTIVES.length);
    const ei = clampSlot(P(state.params, 'eyeSlot', 1), EYEPIECES.length);
    if (state._lastObj !== oi) {
      state._lastObj = oi;
      applyTurretDefaults(state, 'obj');
    }
    if (state._lastEye !== ei) {
      state._lastEye = ei;
      applyTurretDefaults(state, 'eye');
    }
  },

  step(state, dt) {
    state.t += Math.max(0, dt);
    this.refresh(state);
  },

  onPointer(state, ev) {
    const layout = state._layout;
    if (!layout) return false;
    if (ev.type === 'down' || ev.type === 'tap') {
      const hit = hitTest(ev.x, ev.y, layout);
      if (!hit) return false;
      if (hit.kind === 'obj') {
        state.params.objSlot = hit.index;
        applyTurretDefaults(state, 'obj');
        state.pick = `obj-${OBJECTIVES[hit.index].mag}×`;
        return true;
      }
      if (hit.kind === 'eye') {
        state.params.eyeSlot = hit.index;
        applyTurretDefaults(state, 'eye');
        state.pick = `eye-${EYEPIECES[hit.index].mag}×`;
        return true;
      }
    }
    return false;
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const o = opticsFromParams(state.params);
    const cx = W * 0.42;
    const baseY = H * 0.88;
    const hits = [];

    ctx.fillStyle = C.muted || '#888';
    ctx.font = '600 13px IBM Plex Mono, monospace';
    ctx.fillText('Compound microscope · structure', 14, 22);
    ctx.font = '12px IBM Plex Mono, monospace';
    ctx.fillText(`M=${formatNum(o.M, 1)}×  NA=${formatNum(o.NA, 2)}  WD=${formatNum(o.WD, 2)} mm`, 14, 40);

    // Stand + arm
    ctx.strokeStyle = C.body || '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 70, baseY);
    ctx.lineTo(cx + 90, baseY);
    ctx.moveTo(cx + 70, baseY);
    ctx.lineTo(cx + 70, H * 0.18);
    ctx.lineTo(cx + 20, H * 0.18);
    ctx.stroke();

    // Body tube
    const tubeTop = H * 0.22;
    const tubeBot = H * 0.55;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(cx - 18, tubeTop, 36, tubeBot - tubeTop);
    ctx.strokeStyle = C.body || '#fff';
    ctx.strokeRect(cx - 18, tubeTop, 36, tubeBot - tubeTop);

    // Eyepiece bank (clickable)
    const eyeY = tubeTop - 36;
    const eyeW = 44;
    const eyeH = 28;
    EYEPIECES.forEach((eye, i) => {
      const x = cx - 70 + i * (eyeW + 8);
      const active = i === o.ei;
      ctx.fillStyle = active ? 'rgba(180,220,255,0.35)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(x, eyeY, eyeW, eyeH);
      ctx.strokeStyle = active ? '#b4dcff' : (C.muted || '#888');
      ctx.strokeRect(x, eyeY, eyeW, eyeH);
      ctx.fillStyle = C.body || '#fff';
      ctx.font = '11px IBM Plex Mono, monospace';
      ctx.fillText(`${eye.mag}×`, x + 12, eyeY + 18);
      hits.push({ kind: 'eye', index: i, x, y: eyeY, w: eyeW, h: eyeH });
    });
    ctx.fillStyle = C.muted || '#888';
    ctx.fillText('eyepiece', cx - 70, eyeY - 8);

    // Objective turret
    const turY = tubeBot + 8;
    const turR = 52;
    ctx.beginPath();
    ctx.arc(cx, turY + 10, turR, 0, Math.PI * 2);
    ctx.strokeStyle = C.body || '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    OBJECTIVES.forEach((obj, i) => {
      const ang = -Math.PI / 2 + i * (Math.PI / 2);
      const lx = cx + Math.cos(ang) * 34;
      const ly = turY + 10 + Math.sin(ang) * 34;
      const s = 28;
      const active = i === o.oi;
      ctx.fillStyle = active ? 'rgba(180,255,200,0.35)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(lx - s / 2, ly - s / 2, s, s);
      ctx.strokeStyle = active ? '#b4ffc8' : (C.muted || '#888');
      ctx.strokeRect(lx - s / 2, ly - s / 2, s, s);
      ctx.fillStyle = C.body || '#fff';
      ctx.font = '10px IBM Plex Mono, monospace';
      ctx.fillText(`${obj.mag}×`, lx - 10, ly + 4);
      hits.push({ kind: 'obj', index: i, x: lx - s / 2, y: ly - s / 2, w: s, h: s });
    });
    ctx.fillStyle = C.muted || '#888';
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillText('objective turret', cx - 48, turY + turR + 28);

    // Stage + WD marker
    const stageY = turY + turR + 48;
    ctx.strokeStyle = C.body || '#fff';
    ctx.beginPath();
    ctx.moveTo(cx - 55, stageY);
    ctx.lineTo(cx + 55, stageY);
    ctx.stroke();
    const wdPx = Math.min(40, o.WD * 3);
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, turY + 10 + 20);
    ctx.lineTo(cx, stageY - wdPx);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.muted || '#888';
    ctx.fillText(`WD ${formatNum(o.WD, 2)} mm`, cx + 60, stageY - wdPx / 2);

    // Spec panel
    const px = W * 0.68;
    let py = H * 0.22;
    ctx.fillStyle = C.body || '#fff';
    ctx.font = '12px IBM Plex Mono, monospace';
    const lines = [
      `Objective ${o.obj.mag}×  f=${formatNum(o.fObjM * 1e3, 1)} mm`,
      `Eyepiece ${o.eye.mag}×  f=${formatNum(o.fEyeM * 1e3, 1)} mm`,
      `L = ${formatNum(o.Lmm, 0)} mm`,
      `n = ${formatNum(o.n, 3)}`,
      `NA = ${formatNum(o.NA, 3)}`,
      `|M| ≈ ${formatNum(Math.abs(o.M), 1)}×`,
      `d ≈ ${formatNum(o.dResM * 1e6, 2)} µm`,
    ];
    for (const line of lines) {
      ctx.fillText(line, px, py);
      py += 18;
    }
    if (state.pick) {
      ctx.fillStyle = C.muted || '#888';
      ctx.fillText(`selected ${state.pick}`, px, py + 8);
    }

    state._layout = { hits };
  },

  getReadouts(state, opts = {}) {
    const digits = opts.digits ?? 3;
    const o = opticsFromParams(state.params);
    return [
      { label: 'M', value: `${formatNum(o.M, digits)}×` },
      { label: '|M|', value: `${formatNum(Math.abs(o.M), digits)}×` },
      { label: 'm_obj', value: formatNum(o.mObj, digits) },
      { label: 'M_eye', value: formatNum(o.Meye, digits) },
      { label: 'NA', value: formatNum(o.NA, digits) },
      { label: 'WD', value: `${formatNum(o.WD, digits)} mm` },
      { label: 'f_obj', value: `${formatNum(o.fObjM * 1e3, digits)} mm` },
      { label: 'f_eye', value: `${formatNum(o.fEyeM * 1e3, digits)} mm` },
      { label: 'L', value: `${formatNum(o.Lmm, digits)} mm` },
      { label: 'n', value: formatNum(o.n, digits) },
      { label: 'd (Abbe)', value: `${formatNum(o.dResM * 1e6, digits)} µm` },
      { label: 'obj', value: `${o.obj.mag}×` },
      { label: 'eye', value: `${o.eye.mag}×` },
    ];
  },
};
