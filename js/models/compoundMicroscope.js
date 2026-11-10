import { formatNum } from '../utils/draw.js';
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';
import {
  OBJECTIVES,
  EYEPIECES,
  opticsFromParams,
  applyTurretDefaults,
  DEFAULT_PARAMS,
  PARAM_SCHEMA,
} from './microscopeOptics.js';

/**
 * Compound microscope — Structure + finite-conjugate ray diagram (P1).
 * M ≈ −(L/f_obj)·(25 cm/f_eye); d = 0.61 λ / NA; NA ≤ n sin α.
 */

function hitTest(px, py, layout) {
  for (const h of layout.hits) {
    if (px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h) return h;
  }
  return null;
}

function drawRayDiagram(ctx, o, box) {
  const { x, y, w, h } = box;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = C.muted || '#888';
  ctx.font = '11px IBM Plex Mono, monospace';
  ctx.fillText('Finite conjugate · object → intermediate image → eyepiece', x + 8, y + 16);

  const axisY = y + h * 0.55;
  const objX = x + w * 0.12;
  const lensObjX = x + w * 0.32;
  const imgX = x + w * 0.62;
  const lensEyeX = x + w * 0.82;
  const eyeX = x + w * 0.94;

  // Optical axis
  ctx.strokeStyle = C.muted || '#888';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x + 8, axisY);
  ctx.lineTo(x + w - 8, axisY);
  ctx.stroke();
  ctx.setLineDash([]);

  const drawLens = (lx, half) => {
    ctx.strokeStyle = C.body || '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, axisY - half);
    ctx.quadraticCurveTo(lx + 6, axisY, lx, axisY + half);
    ctx.quadraticCurveTo(lx - 6, axisY, lx, axisY - half);
    ctx.stroke();
  };
  drawLens(lensObjX, 28);
  drawLens(lensEyeX, 20);

  // Object arrow
  const objH = 22;
  ctx.strokeStyle = '#9fd4ff';
  ctx.fillStyle = '#9fd4ff';
  ctx.beginPath();
  ctx.moveTo(objX, axisY);
  ctx.lineTo(objX, axisY - objH);
  ctx.lineTo(objX - 4, axisY - objH + 8);
  ctx.moveTo(objX, axisY - objH);
  ctx.lineTo(objX + 4, axisY - objH + 8);
  ctx.stroke();
  ctx.fillText('O', objX - 4, axisY + 14);

  // Intermediate image (inverted)
  const imgH = Math.min(36, objH * Math.abs(o.mObj) * 0.15);
  ctx.strokeStyle = '#b4ffc8';
  ctx.beginPath();
  ctx.moveTo(imgX, axisY);
  ctx.lineTo(imgX, axisY + imgH);
  ctx.lineTo(imgX - 4, axisY + imgH - 8);
  ctx.moveTo(imgX, axisY + imgH);
  ctx.lineTo(imgX + 4, axisY + imgH - 8);
  ctx.stroke();
  ctx.fillStyle = '#b4ffc8';
  ctx.fillText("I'", imgX - 6, axisY + imgH + 14);

  // Marginal rays object → objective → intermediate image
  ctx.strokeStyle = 'rgba(159,212,255,0.85)';
  ctx.lineWidth = 1.4;
  const rays = [
    [objX, axisY - objH, lensObjX, axisY - 18, imgX, axisY + imgH],
    [objX, axisY - objH, lensObjX, axisY, imgX, axisY + imgH],
    [objX, axisY - objH * 0.4, lensObjX, axisY + 14, imgX, axisY + imgH * 0.4],
  ];
  for (const [x0, y0, x1, y1, x2, y2] of rays) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Rays through eyepiece (to relaxed eye / near point)
  ctx.strokeStyle = 'rgba(255,210,120,0.9)';
  ctx.beginPath();
  ctx.moveTo(imgX, axisY + imgH);
  ctx.lineTo(lensEyeX, axisY - 10);
  ctx.lineTo(eyeX, axisY - 16);
  ctx.moveTo(imgX, axisY + imgH * 0.3);
  ctx.lineTo(lensEyeX, axisY + 6);
  ctx.lineTo(eyeX, axisY + 10);
  ctx.stroke();
  ctx.fillStyle = C.muted || '#888';
  ctx.fillText('eye', eyeX - 10, axisY + 28);
  ctx.fillText('obj', lensObjX - 10, axisY - 34);
  ctx.fillText('eye piece', lensEyeX - 18, axisY - 26);
  ctx.fillText(`m_obj=${formatNum(o.mObj, 1)}`, x + 8, y + h - 10);
  ctx.restore();
}

export default {
  id: 'r016-显微镜',
  name: 'Compound microscope (structure)',
  formula: 'M ≈ −(L/f_obj)·(25 cm/f_eye); d = 0.61 λ / NA; NA ≤ n sin α',
  description: 'Structure + finite-conjugate ray diagram; NA, WD, immersion editable',
  authority: 'Hecht, Optics — compound microscope; Abbe d = 0.61 λ / NA',
  assumptions: 'Paraxial finite-tube; thin lenses; near-point 25 cm; NA capped by n sin α',
  fidelity: 'engineering',
  capabilities: {
    interaction: 'canvas',
    formalism: 'optics',
    viz: 'phet-optics',
    fidelity: 'engineering',
    pointer: true,
    hint: 'Click turret / eyepiece · tune NA & immersion',
    stageModes: ['canvas2d', 'webgl3d'],
  },
  params: { ...DEFAULT_PARAMS },
  paramSchema: { ...PARAM_SCHEMA },

  init(state) {
    applyTurretDefaults(state, 'all');
    state.t = 0;
    state._layout = null;
    state.pick = null;
    state._lastObj = state.params.objective;
    state._lastEye = state.params.eyepiece;
  },

  refresh(state) {
    if (state._lastObj !== state.params.objective) {
      state._lastObj = state.params.objective;
      applyTurretDefaults(state, 'obj');
    }
    if (state._lastEye !== state.params.eyepiece) {
      state._lastEye = state.params.eyepiece;
      applyTurretDefaults(state, 'eye');
    }
    const o = opticsFromParams(state.params);
    state.params.n = o.n;
    state.params.NA = Math.min(Number(state.params.NA) || o.NA, o.NAcap);
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
        state.params.objective = OBJECTIVES[hit.index].id;
        applyTurretDefaults(state, 'obj');
        state._lastObj = state.params.objective;
        state.pick = `obj-${OBJECTIVES[hit.index].mag}×`;
        return true;
      }
      if (hit.kind === 'eye') {
        state.params.eyepiece = EYEPIECES[hit.index].id;
        applyTurretDefaults(state, 'eye');
        state._lastEye = state.params.eyepiece;
        state.pick = `eye-${EYEPIECES[hit.index].mag}×`;
        return true;
      }
    }
    return false;
  },

  draw(ctx, state, view) {
    const { width: W, height: H } = view;
    const o = opticsFromParams(state.params);
    const cx = W * 0.28;
    const baseY = H * 0.92;
    const hits = [];

    ctx.fillStyle = C.muted || '#888';
    ctx.font = '600 13px IBM Plex Mono, monospace';
    ctx.fillText('Compound microscope · structure + rays', 14, 22);
    ctx.font = '12px IBM Plex Mono, monospace';
    const imm = o.immersion ? ' · oil' : '';
    ctx.fillText(
      `M=${formatNum(o.M, 1)}×  NA=${formatNum(o.NA, 2)}≤${formatNum(o.NAcap, 2)}  WD=${formatNum(o.WD, 2)} mm  n=${formatNum(o.n, 3)}${imm}`,
      14,
      40,
    );

    ctx.strokeStyle = C.body || '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 70, baseY);
    ctx.lineTo(cx + 90, baseY);
    ctx.moveTo(cx + 70, baseY);
    ctx.lineTo(cx + 70, H * 0.28);
    ctx.lineTo(cx + 20, H * 0.28);
    ctx.stroke();

    const tubeTop = H * 0.30;
    const tubeBot = H * 0.58;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(cx - 18, tubeTop, 36, tubeBot - tubeTop);
    ctx.strokeStyle = C.body || '#fff';
    ctx.strokeRect(cx - 18, tubeTop, 36, tubeBot - tubeTop);

    const eyeY = tubeTop - 36;
    const eyeW = 44;
    const eyeH = 28;
    EYEPIECES.forEach((eye, i) => {
      const x = cx - 70 + i * (eyeW + 8);
      const active = eye.id === o.eye.id;
      ctx.fillStyle = active ? 'rgba(180,220,255,0.35)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(x, eyeY, eyeW, eyeH);
      ctx.strokeStyle = active ? '#b4dcff' : (C.muted || '#888');
      ctx.strokeRect(x, eyeY, eyeW, eyeH);
      ctx.fillStyle = C.body || '#fff';
      ctx.font = '11px IBM Plex Mono, monospace';
      ctx.fillText(`${eye.mag}×`, x + 12, eyeY + 18);
      hits.push({ kind: 'eye', index: i, x, y: eyeY, w: eyeW, h: eyeH });
    });

    const turY = tubeBot + 8;
    const turR = 48;
    ctx.beginPath();
    ctx.arc(cx, turY + 10, turR, 0, Math.PI * 2);
    ctx.strokeStyle = C.body || '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    OBJECTIVES.forEach((obj, i) => {
      const ang = -Math.PI / 2 + i * (Math.PI / 2);
      const lx = cx + Math.cos(ang) * 30;
      const ly = turY + 10 + Math.sin(ang) * 30;
      const s = 26;
      const active = obj.id === o.obj.id;
      ctx.fillStyle = active ? 'rgba(180,255,200,0.35)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(lx - s / 2, ly - s / 2, s, s);
      ctx.strokeStyle = active ? '#b4ffc8' : (C.muted || '#888');
      ctx.strokeRect(lx - s / 2, ly - s / 2, s, s);
      ctx.fillStyle = C.body || '#fff';
      ctx.font = '10px IBM Plex Mono, monospace';
      ctx.fillText(`${obj.mag}×`, lx - 10, ly + 4);
      hits.push({ kind: 'obj', index: i, x: lx - s / 2, y: ly - s / 2, w: s, h: s });
    });

    // Objective–stage gap tracks WD (coarse/fine focus), not tube length.
    const wdPx = 28 + Math.min(70, o.WD * 4);
    const stageY = turY + turR + wdPx;
    ctx.strokeStyle = C.body || '#fff';
    ctx.beginPath();
    ctx.moveTo(cx - 50, stageY);
    ctx.lineTo(cx + 50, stageY);
    ctx.stroke();
    ctx.fillStyle = C.muted || '#888';
    ctx.font = '10px IBM Plex Mono, monospace';
    ctx.fillText(`gap ${formatNum(o.WD, 1)} mm`, cx - 48, stageY + 14);
    if (o.immersion) {
      ctx.fillStyle = 'rgba(180,220,255,0.25)';
      ctx.fillRect(cx - 12, stageY - 14, 24, 14);
      ctx.fillStyle = C.muted || '#888';
      ctx.font = '10px IBM Plex Mono, monospace';
      ctx.fillText('oil', cx - 8, stageY - 16);
    }

    if (P(state.params, 'showRays', 1) > 0.5) {
      drawRayDiagram(ctx, o, {
        x: W * 0.48,
        y: H * 0.12,
        w: W * 0.48,
        h: H * 0.55,
      });
    }

    const px = W * 0.48;
    let py = H * 0.72;
    ctx.fillStyle = C.body || '#fff';
    ctx.font = '12px IBM Plex Mono, monospace';
    for (const line of [
      `${o.obj.mag}× / ${o.eye.mag}× · L=${formatNum(o.Lmm, 0)} mm`,
      `NA ${formatNum(o.NA, 3)} (cap ${formatNum(o.NAcap, 3)}) · WD ${formatNum(o.WD, 2)} mm`,
      `|M|≈${formatNum(Math.abs(o.M), 1)}× · d≈${formatNum(o.dResM * 1e6, 2)} µm`,
    ]) {
      ctx.fillText(line, px, py);
      py += 16;
    }
    if (state.pick) {
      ctx.fillStyle = C.muted || '#888';
      ctx.fillText(`selected ${state.pick}`, px, py + 4);
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
      { label: 'NA_cap', value: formatNum(o.NAcap, digits) },
      { label: 'WD', value: `${formatNum(o.WD, digits)} mm` },
      { label: 'f_obj', value: `${formatNum(o.fObjM * 1e3, digits)} mm` },
      { label: 'f_eye', value: `${formatNum(o.fEyeM * 1e3, digits)} mm` },
      { label: 'L', value: `${formatNum(o.Lmm, digits)} mm` },
      { label: 'n', value: formatNum(o.n, digits) },
      { label: 'd (Abbe)', value: `${formatNum(o.dResM * 1e6, digits)} µm` },
      { label: 'obj', value: `${o.obj.mag}×` },
      { label: 'eye', value: `${o.eye.mag}×` },
      { label: 'immersion', value: o.immersion ? 'oil' : 'dry' },
    ];
  },
};
