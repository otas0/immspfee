/**
 * Shared compound-microscope layout for mesh + pick hits.
 * Keeps Siedentopf / turret / stage / condenser in one place.
 */
import { OBJECTIVES, EYEPIECES } from '../models/microscopeOptics.js';

export function MagScale(m) {
  return Math.log10(Math.max(4, m));
}

/**
 * DIN ring / activity-collar height relative to `turY`.
 * Matches the objective band stack in microscopeMeshBuild (0.012 + 0.04 + 0.042).
 */
export const OBJECTIVE_COLLAR_DY = -0.094;

/** World point of the active objective's barrel collar (DIN-ring height). */
export function activityCollarWorld(layout, objectiveId) {
  const activeIdx = Math.max(0, OBJECTIVES.findIndex((o) => o.id === objectiveId));
  const ang = layout.turretRot + activeIdx * (Math.PI / 2);
  return {
    x: Math.cos(ang) * 0.32,
    y: layout.turY + OBJECTIVE_COLLAR_DY,
    z: Math.sin(ang) * 0.32,
  };
}

/** C-arm parametric point (t∈[0,1]) — focus knobs sit near t≈0.3. */
export function armPoint(t) {
  const heelZ = -0.56;
  const y = 0.24 + t * 1.3;
  const z = heelZ - Math.sin(t * Math.PI) * 0.38 + t * (-0.08 - heelZ);
  const x = 0.05 * Math.sin(t * Math.PI);
  return [x, y, z];
}

/**
 * @param {ReturnType<import('../models/microscopeOptics.js').opticsFromParams>} optics
 * @param {Record<string, number|string>} [params]
 */
export function microscopeLayout(optics, params = {}) {
  const mag = optics.obj.mag;
  // Classroom scopes keep a fixed mechanical tube; L only enters the M ≈ −(L/f) formula.
  // Do not stretch the barrel when tubeL_mm changes — that looked like “focusing by tube length”.
  const Lscale = 1;
  const tubeH = (1.35 + MagScale(mag) * 0.22) * Lscale;
  const headY = 1.55;
  const turY = headY - 0.28;
  const tubeCenterY = headY + tubeH / 2 - 0.05;
  const tubeTopY = tubeCenterY + tubeH / 2;
  const tubeBotY = tubeCenterY - tubeH / 2;

  const activeIdx = Math.max(0, OBJECTIVES.findIndex((o) => o.id === optics.obj.id));
  // Active objective hangs on the optical axis (toward −Z / front of stage look = −π/2).
  const turretRot = -Math.PI / 2 - activeIdx * (Math.PI / 2);

  const focusZmm = Number(params.focusZ_mm) || 0;
  const stageXmm = Number(params.stageX_mm) || 0;
  const stageYmm = Number(params.stageY_mm) || 0;
  const slideX = stageXmm * 0.004;
  const slideZ = stageYmm * 0.004;

  const WD = Math.max(0.05, Number(optics.WD) || 6.5);
  // Map WD → condenser clearance under the stage.
  const wdT = Math.min(1, Math.max(0, (WD - 0.15) / (18 - 0.15)));
  const condenserGap = 0.08 + wdT * 0.27;
  // Coarse/fine focus change objective–stage gap (WD). focusZ is a small extra rack offset.
  const objLen = 0.26 + MagScale(mag) * 0.055;
  const tipY = turY - objLen;
  const clearWorld = 0.05 + Math.min(0.7, WD * 0.032);
  const stageY = tipY - clearWorld - focusZmm * 0.02;

  const NAcap = Math.max(0.05, Number(optics.NAcap) || 0.25);
  const NA = Math.max(0.05, Math.min(NAcap, Number(optics.NA) || 0.25));
  const irisOpen = Math.min(0.95, Math.max(0.08, NA / NAcap));
  const fieldIris = Math.min(1, Math.max(0.1, Number(params.fieldIris) || 0.55));
  const lampOn = Number(params.lampOn) !== 0;

  // Siedentopf IPD — textbook binocular range ~50–75 mm (default 64 mm).
  const ipdMm = Math.min(75, Math.max(50, Number(params.interpupillary_mm) || 64));
  const ipdScale = ipdMm / 64;
  const ocularHalf = 0.09 * ipdScale;
  const tilt = (34 * Math.PI) / 180;
  const dirY = Math.cos(tilt);
  const dirZ = Math.sin(tilt);
  const ocularLen = 0.3;
  const oculars = [-1, 1].map((side) => {
    const x0 = side * ocularHalf;
    const y0 = tubeTopY + 0.12;
    const z0 = 0.04;
    const x1 = x0 + side * (0.032 * ipdScale);
    const y1 = y0 + dirY * ocularLen;
    const z1 = z0 + dirZ * ocularLen;
    const flange = 0.07;
    return {
      side,
      x0, y0, z0,
      x1, y1, z1,
      tipX: x1 + side * 0.008,
      tipY: y1 + dirY * flange,
      tipZ: z1 + dirZ * flange,
    };
  });

  const focus = armPoint(0.3);
  const condenserOffset = (Number(params.condenser_mm) || 0) * 0.04;
  const condenserY = stageY - condenserGap - condenserOffset;
  const lampY = stageY - 0.46;

  const pts = [];
  OBJECTIVES.forEach((obj, i) => {
    const ang = turretRot + i * (Math.PI / 2);
    pts.push({
      kind: 'obj',
      index: i,
      x: Math.cos(ang) * 0.32,
      y: turY - 0.1,
      z: Math.sin(ang) * 0.32,
      rWorld: 0.12,
      id: obj.id,
    });
  });

  // Three eyepiece picks: left tube, prism center, right tube.
  const eyeSlots = [
    { x: oculars[0].tipX, y: oculars[0].tipY, z: oculars[0].tipZ },
    { x: 0, y: tubeTopY + 0.22, z: 0.14 },
    { x: oculars[1].tipX, y: oculars[1].tipY, z: oculars[1].tipZ },
  ];
  EYEPIECES.forEach((eye, i) => {
    const slot = eyeSlots[i] || eyeSlots[1];
    pts.push({
      kind: 'eye',
      index: i,
      x: slot.x,
      y: slot.y,
      z: slot.z,
      rWorld: 0.1,
      id: eye.id,
    });
  });

  for (const side of [0, 1]) {
    const s = side === 0 ? -1 : 1;
    pts.push({
      kind: 'focusCoarse',
      index: side,
      x: focus[0] + s * 0.155,
      y: focus[1],
      z: focus[2],
      rWorld: 0.12,
    });
    pts.push({
      kind: 'focusFine',
      index: side,
      x: focus[0] + s * 0.21,
      y: focus[1],
      z: focus[2],
      rWorld: 0.09,
    });
  }

  pts.push({
    kind: 'stageX',
    index: 0,
    x: 0.58,
    y: stageY - 0.005,
    z: 0.16,
    rWorld: 0.1,
  });
  pts.push({
    kind: 'stageY',
    index: 0,
    x: 0.6,
    y: stageY - 0.005,
    z: -0.02,
    rWorld: 0.09,
  });
  pts.push({
    kind: 'condenser',
    index: 0,
    x: 0.16,
    y: condenserY - 0.05,
    z: 0.1,
    rWorld: 0.1,
  });
  pts.push({
    kind: 'iris',
    index: 0,
    x: 0,
    y: condenserY,
    z: 0.02,
    rWorld: 0.14,
  });
  pts.push({
    kind: 'fieldIris',
    index: 0,
    x: 0,
    y: lampY + 0.185,
    z: 0.02,
    rWorld: 0.12,
  });
  pts.push({
    kind: 'lamp',
    index: 0,
    x: 0,
    y: lampY,
    z: 0.02,
    rWorld: 0.16,
  });
  // tubeL is not a pick target: fixed mechanical tube (design L in the rail / formula only).
  pts.push({
    kind: 'interpupillary',
    index: 0,
    x: 0,
    y: tubeTopY + 0.12,
    z: 0.05,
    rWorld: 0.1,
  });
  pts.push({
    kind: 'immersion',
    index: 0,
    x: 0.08 + slideX,
    y: stageY + 0.06,
    z: 0.03 + slideZ,
    rWorld: 0.12,
  });
  pts.push({
    kind: 'clip',
    index: 0,
    x: -0.2 + slideX,
    y: stageY + 0.07,
    z: 0.12 + slideZ,
    rWorld: 0.09,
  });
  pts.push({
    kind: 'clip',
    index: 1,
    x: 0.22 + slideX,
    y: stageY + 0.07,
    z: 0.12 + slideZ,
    rWorld: 0.09,
  });

  return {
    turY,
    tubeH,
    headY,
    tubeCenterY,
    tubeTopY,
    tubeBotY,
    Lscale,
    turretRot,
    stageY,
    slideX,
    slideZ,
    condenserY,
    condenserGap,
    irisOpen,
    fieldIris,
    lampOn,
    lampY,
    focus,
    oculars,
    ipdMm,
    ipdScale,
    WD,
    NA,
    NAcap,
    pts,
  };
}

/** Continuous knobs — pointer-drag adjusts params. */
export const DRAG_KINDS = new Set([
  'focusCoarse',
  'focusFine',
  'stageX',
  'stageY',
  'condenser',
  'iris',
  'fieldIris',
  'interpupillary',
]);

/** Discrete click / tap targets. */
export const CLICK_KINDS = new Set([
  'obj',
  'eye',
  'lamp',
  'immersion',
  'clip',
]);
