import {
  ACTIVITY_RING,
  EYEPIECES,
  OBJECTIVES,
  applyTurretDefaults,
  objectiveRingColor,
  opticsFromParams
} from "./chunk-chunk-DBGF6KTB.js";
import {
  mobileBudget
} from "./chunk-chunk-ZIYIE64H.js";
import "./chunk-chunk-KX6VIJEB.js";

// js/viz/microscopeLayout.js
function MagScale(m) {
  return Math.log10(Math.max(4, m));
}
var OBJECTIVE_COLLAR_DY = -0.094;
function activityCollarWorld(layout, objectiveId) {
  const activeIdx = Math.max(0, OBJECTIVES.findIndex((o) => o.id === objectiveId));
  const ang = layout.turretRot + activeIdx * (Math.PI / 2);
  return {
    x: Math.cos(ang) * 0.32,
    y: layout.turY + OBJECTIVE_COLLAR_DY,
    z: Math.sin(ang) * 0.32
  };
}
function armPoint(t) {
  const heelZ = -0.56;
  const y = 0.24 + t * 1.3;
  const z = heelZ - Math.sin(t * Math.PI) * 0.38 + t * (-0.08 - heelZ);
  const x = 0.05 * Math.sin(t * Math.PI);
  return [x, y, z];
}
function microscopeLayout(optics, params = {}) {
  const mag = optics.obj.mag;
  const Lscale = 1;
  const tubeH = (1.35 + MagScale(mag) * 0.22) * Lscale;
  const headY = 1.55;
  const turY = headY - 0.28;
  const tubeCenterY = headY + tubeH / 2 - 0.05;
  const tubeTopY = tubeCenterY + tubeH / 2;
  const tubeBotY = tubeCenterY - tubeH / 2;
  const activeIdx = Math.max(0, OBJECTIVES.findIndex((o) => o.id === optics.obj.id));
  const turretRot = -Math.PI / 2 - activeIdx * (Math.PI / 2);
  const focusZmm = Number(params.focusZ_mm) || 0;
  const stageXmm = Number(params.stageX_mm) || 0;
  const stageYmm = Number(params.stageY_mm) || 0;
  const slideX = stageXmm * 4e-3;
  const slideZ = stageYmm * 4e-3;
  const WD = Math.max(0.05, Number(optics.WD) || 6.5);
  const wdT = Math.min(1, Math.max(0, (WD - 0.15) / (18 - 0.15)));
  const condenserGap = 0.08 + wdT * 0.27;
  const objLen = 0.26 + MagScale(mag) * 0.055;
  const tipY = turY - objLen;
  const clearWorld = 0.05 + Math.min(0.7, WD * 0.032);
  const stageY = tipY - clearWorld - focusZmm * 0.02;
  const NAcap = Math.max(0.05, Number(optics.NAcap) || 0.25);
  const NA = Math.max(0.05, Math.min(NAcap, Number(optics.NA) || 0.25));
  const irisOpen = Math.min(0.95, Math.max(0.08, NA / NAcap));
  const fieldIris = Math.min(1, Math.max(0.1, Number(params.fieldIris) || 0.55));
  const lampOn = Number(params.lampOn) !== 0;
  const ipdMm = Math.min(75, Math.max(50, Number(params.interpupillary_mm) || 64));
  const ipdScale = ipdMm / 64;
  const ocularHalf = 0.09 * ipdScale;
  const tilt = 34 * Math.PI / 180;
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
      x0,
      y0,
      z0,
      x1,
      y1,
      z1,
      tipX: x1 + side * 8e-3,
      tipY: y1 + dirY * flange,
      tipZ: z1 + dirZ * flange
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
      kind: "obj",
      index: i,
      x: Math.cos(ang) * 0.32,
      y: turY - 0.1,
      z: Math.sin(ang) * 0.32,
      rWorld: 0.12,
      id: obj.id
    });
  });
  const eyeSlots = [
    { x: oculars[0].tipX, y: oculars[0].tipY, z: oculars[0].tipZ },
    { x: 0, y: tubeTopY + 0.22, z: 0.14 },
    { x: oculars[1].tipX, y: oculars[1].tipY, z: oculars[1].tipZ }
  ];
  EYEPIECES.forEach((eye, i) => {
    const slot = eyeSlots[i] || eyeSlots[1];
    pts.push({
      kind: "eye",
      index: i,
      x: slot.x,
      y: slot.y,
      z: slot.z,
      rWorld: 0.1,
      id: eye.id
    });
  });
  for (const side of [0, 1]) {
    const s = side === 0 ? -1 : 1;
    pts.push({
      kind: "focusCoarse",
      index: side,
      x: focus[0] + s * 0.155,
      y: focus[1],
      z: focus[2],
      rWorld: 0.12
    });
    pts.push({
      kind: "focusFine",
      index: side,
      x: focus[0] + s * 0.21,
      y: focus[1],
      z: focus[2],
      rWorld: 0.09
    });
  }
  pts.push({
    kind: "stageX",
    index: 0,
    x: 0.58,
    y: stageY - 5e-3,
    z: 0.16,
    rWorld: 0.1
  });
  pts.push({
    kind: "stageY",
    index: 0,
    x: 0.6,
    y: stageY - 5e-3,
    z: -0.02,
    rWorld: 0.09
  });
  pts.push({
    kind: "condenser",
    index: 0,
    x: 0.16,
    y: condenserY - 0.05,
    z: 0.1,
    rWorld: 0.1
  });
  pts.push({
    kind: "iris",
    index: 0,
    x: 0,
    y: condenserY,
    z: 0.02,
    rWorld: 0.14
  });
  pts.push({
    kind: "fieldIris",
    index: 0,
    x: 0,
    y: lampY + 0.185,
    z: 0.02,
    rWorld: 0.12
  });
  pts.push({
    kind: "lamp",
    index: 0,
    x: 0,
    y: lampY,
    z: 0.02,
    rWorld: 0.16
  });
  pts.push({
    kind: "interpupillary",
    index: 0,
    x: 0,
    y: tubeTopY + 0.12,
    z: 0.05,
    rWorld: 0.1
  });
  pts.push({
    kind: "immersion",
    index: 0,
    x: 0.08 + slideX,
    y: stageY + 0.06,
    z: 0.03 + slideZ,
    rWorld: 0.12
  });
  pts.push({
    kind: "clip",
    index: 0,
    x: -0.2 + slideX,
    y: stageY + 0.07,
    z: 0.12 + slideZ,
    rWorld: 0.09
  });
  pts.push({
    kind: "clip",
    index: 1,
    x: 0.22 + slideX,
    y: stageY + 0.07,
    z: 0.12 + slideZ,
    rWorld: 0.09
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
    pts
  };
}
var DRAG_KINDS = /* @__PURE__ */ new Set([
  "focusCoarse",
  "focusFine",
  "stageX",
  "stageY",
  "condenser",
  "iris",
  "fieldIris",
  "interpupillary"
]);
var CLICK_KINDS = /* @__PURE__ */ new Set([
  "obj",
  "eye",
  "lamp",
  "immersion",
  "clip"
]);

// js/viz/microscopeMeshBuild.js
function shade(nx, ny, nz, r, g, b, gloss = 0.12) {
  const lx = 0.42;
  const ly = 0.82;
  const lz = 0.38;
  const len = Math.hypot(lx, ly, lz) || 1;
  const ndl = Math.max(0, (nx * lx + ny * ly + nz * lz) / len);
  const fill = Math.max(0, -nx * 0.25 + ny * 0.15 + nz * 0.1);
  const amb = 0.32;
  const spec = gloss * ndl ** 12;
  const f = Math.min(1.15, amb + 0.58 * ndl + 0.18 * fill + spec);
  return [Math.min(1, r * f), Math.min(1, g * f), Math.min(1, b * f)];
}
function pushV(out, x, y, z, nx, ny, nz, r, g, b, gloss) {
  const [cr, cg, cb] = shade(nx, ny, nz, r, g, b, gloss);
  out.push(x, y, z, cr, cg, cb);
}
function tri(out, ax, ay, az, bx, by, bz, cx, cy, cz, nx, ny, nz, r, g, b, gloss = 0.1) {
  pushV(out, ax, ay, az, nx, ny, nz, r, g, b, gloss);
  pushV(out, bx, by, bz, nx, ny, nz, r, g, b, gloss);
  pushV(out, cx, cy, cz, nx, ny, nz, r, g, b, gloss);
}
function box(cx, cy, cz, sx, sy, sz, r, g, b, out, gloss = 0.08) {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const faces = [
    [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz], 0, 0, 1],
    [[-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz], [hx, -hy, -hz], 0, 0, -1],
    [[-hx, hy, -hz], [-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], 0, 1, 0],
    [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz], 0, -1, 0],
    [[hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [hx, -hy, hz], 1, 0, 0],
    [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], -1, 0, 0]
  ];
  for (const [a, b2, c, d, nx, ny, nz] of faces) {
    tri(
      out,
      cx + a[0],
      cy + a[1],
      cz + a[2],
      cx + b2[0],
      cy + b2[1],
      cz + b2[2],
      cx + c[0],
      cy + c[1],
      cz + c[2],
      nx,
      ny,
      nz,
      r,
      g,
      b,
      gloss
    );
    tri(
      out,
      cx + a[0],
      cy + a[1],
      cz + a[2],
      cx + c[0],
      cy + c[1],
      cz + c[2],
      cx + d[0],
      cy + d[1],
      cz + d[2],
      nx,
      ny,
      nz,
      r,
      g,
      b,
      gloss
    );
  }
}
function cylinderY(cx, cy0, cz, radius, height, r, g, b, out, slices = 28, caps = true, gloss = 0.14) {
  const y0 = cy0 - height / 2;
  const y1 = cy0 + height / 2;
  for (let i = 0; i < slices; i += 1) {
    const a0 = i / slices * Math.PI * 2;
    const a1 = (i + 1) / slices * Math.PI * 2;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const x0 = cx + c0 * radius;
    const z0 = cz + s0 * radius;
    const x1 = cx + c1 * radius;
    const z1 = cz + s1 * radius;
    pushV(out, x0, y0, z0, c0, 0, s0, r, g, b, gloss);
    pushV(out, x1, y0, z1, c1, 0, s1, r, g, b, gloss);
    pushV(out, x1, y1, z1, c1, 0, s1, r, g, b, gloss);
    pushV(out, x0, y0, z0, c0, 0, s0, r, g, b, gloss);
    pushV(out, x1, y1, z1, c1, 0, s1, r, g, b, gloss);
    pushV(out, x0, y1, z0, c0, 0, s0, r, g, b, gloss);
    if (caps) {
      tri(out, cx, y1, cz, x0, y1, z0, x1, y1, z1, 0, 1, 0, r, g, b, gloss * 0.6);
      tri(out, cx, y0, cz, x1, y0, z1, x0, y0, z0, 0, -1, 0, r, g, b, gloss * 0.6);
    }
  }
}
function frustumY(cx, cy0, cz, rBot, rTop, height, r, g, b, out, slices = 24, gloss = 0.16) {
  const y0 = cy0 - height / 2;
  const y1 = cy0 + height / 2;
  for (let i = 0; i < slices; i += 1) {
    const a0 = i / slices * Math.PI * 2;
    const a1 = (i + 1) / slices * Math.PI * 2;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const x0b = cx + c0 * rBot;
    const z0b = cz + s0 * rBot;
    const x1b = cx + c1 * rBot;
    const z1b = cz + s1 * rBot;
    const x0t = cx + c0 * rTop;
    const z0t = cz + s0 * rTop;
    const x1t = cx + c1 * rTop;
    const z1t = cz + s1 * rTop;
    const slope = (rBot - rTop) / Math.max(height, 1e-4);
    const nx0 = c0;
    const ny = slope;
    const nz0 = s0;
    const n0l = Math.hypot(nx0, ny, nz0) || 1;
    const nx1 = c1;
    const nz1 = s1;
    const n1l = Math.hypot(nx1, ny, nz1) || 1;
    pushV(out, x0b, y0, z0b, nx0 / n0l, ny / n0l, nz0 / n0l, r, g, b, gloss);
    pushV(out, x1b, y0, z1b, nx1 / n1l, ny / n1l, nz1 / n1l, r, g, b, gloss);
    pushV(out, x1t, y1, z1t, nx1 / n1l, ny / n1l, nz1 / n1l, r, g, b, gloss);
    pushV(out, x0b, y0, z0b, nx0 / n0l, ny / n0l, nz0 / n0l, r, g, b, gloss);
    pushV(out, x1t, y1, z1t, nx1 / n1l, ny / n1l, nz1 / n1l, r, g, b, gloss);
    pushV(out, x0t, y1, z0t, nx0 / n0l, ny / n0l, nz0 / n0l, r, g, b, gloss);
  }
}
function torusY(cx, cy, cz, R, tube, r, g, b, out, segR = 28, segT = 12, gloss = 0.2) {
  for (let i = 0; i < segR; i += 1) {
    const a0 = i / segR * Math.PI * 2;
    const a1 = (i + 1) / segR * Math.PI * 2;
    for (let j = 0; j < segT; j += 1) {
      const b0 = j / segT * Math.PI * 2;
      const b1 = (j + 1) / segT * Math.PI * 2;
      const ring = (a, bAng) => {
        const cosA = Math.cos(a);
        const sinA = Math.sin(a);
        const cosB = Math.cos(bAng);
        const sinB = Math.sin(bAng);
        const x = cx + (R + tube * cosB) * cosA;
        const y = cy + tube * sinB;
        const z = cz + (R + tube * cosB) * sinA;
        return [x, y, z, cosA * cosB, sinB, sinA * cosB];
      };
      const p00 = ring(a0, b0);
      const p10 = ring(a1, b0);
      const p11 = ring(a1, b1);
      const p01 = ring(a0, b1);
      pushV(out, p00[0], p00[1], p00[2], p00[3], p00[4], p00[5], r, g, b, gloss);
      pushV(out, p10[0], p10[1], p10[2], p10[3], p10[4], p10[5], r, g, b, gloss);
      pushV(out, p11[0], p11[1], p11[2], p11[3], p11[4], p11[5], r, g, b, gloss);
      pushV(out, p00[0], p00[1], p00[2], p00[3], p00[4], p00[5], r, g, b, gloss);
      pushV(out, p11[0], p11[1], p11[2], p11[3], p11[4], p11[5], r, g, b, gloss);
      pushV(out, p01[0], p01[1], p01[2], p01[3], p01[4], p01[5], r, g, b, gloss);
    }
  }
}
function cylinderX(cx0, cy, cz, radius, length, r, g, b, out, slices = 20, gloss = 0.18, caps = true) {
  const x0 = cx0 - length / 2;
  const x1 = cx0 + length / 2;
  for (let i = 0; i < slices; i += 1) {
    const a0 = i / slices * Math.PI * 2;
    const a1 = (i + 1) / slices * Math.PI * 2;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const y0 = cy + c0 * radius;
    const z0 = cz + s0 * radius;
    const y1 = cy + c1 * radius;
    const z1 = cz + s1 * radius;
    pushV(out, x0, y0, z0, 0, c0, s0, r, g, b, gloss);
    pushV(out, x1, y0, z0, 0, c0, s0, r, g, b, gloss);
    pushV(out, x1, y1, z1, 0, c1, s1, r, g, b, gloss);
    pushV(out, x0, y0, z0, 0, c0, s0, r, g, b, gloss);
    pushV(out, x1, y1, z1, 0, c1, s1, r, g, b, gloss);
    pushV(out, x0, y1, z1, 0, c1, s1, r, g, b, gloss);
    if (caps) {
      tri(out, x1, cy, cz, x1, y0, z0, x1, y1, z1, 1, 0, 0, r, g, b, gloss * 0.55);
      tri(out, x0, cy, cz, x0, y1, z1, x0, y0, z0, -1, 0, 0, r, g, b, gloss * 0.55);
    }
  }
}
function sphere(cx, cy, cz, radius, r, g, b, out, segU = 16, segV = 12, gloss = 0.22) {
  for (let j = 0; j < segV; j += 1) {
    const phi0 = j / segV * Math.PI;
    const phi1 = (j + 1) / segV * Math.PI;
    const y0 = Math.cos(phi0);
    const y1 = Math.cos(phi1);
    const r0 = Math.sin(phi0);
    const r1 = Math.sin(phi1);
    for (let i = 0; i < segU; i += 1) {
      const th0 = i / segU * Math.PI * 2;
      const th1 = (i + 1) / segU * Math.PI * 2;
      const c0 = Math.cos(th0);
      const s0 = Math.sin(th0);
      const c1 = Math.cos(th1);
      const s1 = Math.sin(th1);
      const p = (rr, yy, cc, ss) => [
        cx + cc * rr * radius,
        cy + yy * radius,
        cz + ss * rr * radius,
        cc * rr,
        yy,
        ss * rr
      ];
      const a = p(r0, y0, c0, s0);
      const b2 = p(r0, y0, c1, s1);
      const c = p(r1, y1, c1, s1);
      const d = p(r1, y1, c0, s0);
      pushV(out, a[0], a[1], a[2], a[3], a[4], a[5], r, g, b, gloss);
      pushV(out, b2[0], b2[1], b2[2], b2[3], b2[4], b2[5], r, g, b, gloss);
      pushV(out, c[0], c[1], c[2], c[3], c[4], c[5], r, g, b, gloss);
      pushV(out, a[0], a[1], a[2], a[3], a[4], a[5], r, g, b, gloss);
      pushV(out, c[0], c[1], c[2], c[3], c[4], c[5], r, g, b, gloss);
      pushV(out, d[0], d[1], d[2], d[3], d[4], d[5], r, g, b, gloss);
    }
  }
}
function tubeSeg(x0, y0, z0, x1, y1, z1, radius, r, g, b, out, slices = 16, caps = true, gloss = 0.16) {
  let dx = x1 - x0;
  let dy = y1 - y0;
  let dz = z1 - z0;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return;
  dx /= len;
  dy /= len;
  dz /= len;
  let hx = 0;
  let hy = 1;
  let hz = 0;
  if (Math.abs(dy) > 0.92) {
    hx = 1;
    hy = 0;
    hz = 0;
  }
  let ux = hy * dz - hz * dy;
  let uy = hz * dx - hx * dz;
  let uz = hx * dy - hy * dx;
  const ul = Math.hypot(ux, uy, uz) || 1;
  ux /= ul;
  uy /= ul;
  uz /= ul;
  const vx = dy * uz - dz * uy;
  const vy = dz * ux - dx * uz;
  const vz = dx * uy - dy * ux;
  for (let i = 0; i < slices; i += 1) {
    const a0 = i / slices * Math.PI * 2;
    const a1 = (i + 1) / slices * Math.PI * 2;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const n0x = ux * c0 + vx * s0;
    const n0y = uy * c0 + vy * s0;
    const n0z = uz * c0 + vz * s0;
    const n1x = ux * c1 + vx * s1;
    const n1y = uy * c1 + vy * s1;
    const n1z = uz * c1 + vz * s1;
    const rim = (x, y, z, nx, ny, nz) => [x + nx * radius, y + ny * radius, z + nz * radius, nx, ny, nz];
    const a = rim(x0, y0, z0, n0x, n0y, n0z);
    const b2 = rim(x1, y1, z1, n0x, n0y, n0z);
    const c = rim(x1, y1, z1, n1x, n1y, n1z);
    const d = rim(x0, y0, z0, n1x, n1y, n1z);
    pushV(out, a[0], a[1], a[2], a[3], a[4], a[5], r, g, b, gloss);
    pushV(out, b2[0], b2[1], b2[2], b2[3], b2[4], b2[5], r, g, b, gloss);
    pushV(out, c[0], c[1], c[2], c[3], c[4], c[5], r, g, b, gloss);
    pushV(out, a[0], a[1], a[2], a[3], a[4], a[5], r, g, b, gloss);
    pushV(out, c[0], c[1], c[2], c[3], c[4], c[5], r, g, b, gloss);
    pushV(out, d[0], d[1], d[2], d[3], d[4], d[5], r, g, b, gloss);
    if (caps) {
      tri(out, x1, y1, z1, b2[0], b2[1], b2[2], c[0], c[1], c[2], dx, dy, dz, r, g, b, gloss * 0.55);
      tri(out, x0, y0, z0, d[0], d[1], d[2], a[0], a[1], a[2], -dx, -dy, -dz, r, g, b, gloss * 0.55);
    }
  }
}
function irisWedges(cx, cy, cz, rIn, rOut, count, r, g, b, out) {
  for (let i = 0; i < count; i += 1) {
    const pitch = Math.PI * 2 / count;
    const a = i * pitch + 0.18;
    const span = pitch * 0.74;
    const a0 = a - span * 0.5;
    const a1 = a + span * 0.5;
    const tip = a + span * 0.12;
    const x0 = cx + Math.cos(a0) * rIn;
    const z0 = cz + Math.sin(a0) * rIn;
    const x1 = cx + Math.cos(a1) * rIn;
    const z1 = cz + Math.sin(a1) * rIn;
    const xt = cx + Math.cos(tip) * rOut;
    const zt = cz + Math.sin(tip) * rOut;
    tri(out, x0, cy, z0, x1, cy, z1, xt, cy + 4e-3, zt, 0, 1, 0, r, g, b, 0.22);
    tri(out, x0, cy - 8e-3, z0, xt, cy - 4e-3, zt, x1, cy - 8e-3, z1, 0, -1, 0, r * 0.72, g * 0.72, b * 0.72, 0.08);
  }
}
function clampTess(tess) {
  return Math.max(0.45, Math.min(1.15, Number(tess) || 1));
}
function meshStaticKey(tess) {
  return `static:${clampTess(tess)}`;
}
function condenserLensRadii(irisOpen) {
  const open = Math.min(0.95, Math.max(0.08, Number(irisOpen) || 0.08));
  return {
    irisOpen: open,
    lensBot: 0.04 + open * 0.04,
    lensTop: 0.055 + open * 0.03,
    rIn: 0.018 + open * 0.075,
    rOut: 0.1
  };
}
function meshDynamicKey(optics, hover, params = {}) {
  const p = params || {};
  const h = hover ? `${hover.kind}:${hover.index}` : "-";
  return [
    "dyn",
    optics?.obj?.id ?? "",
    optics?.eye?.id ?? "",
    optics?.Lmm ?? "",
    optics?.NA ?? "",
    optics?.NAcap ?? "",
    optics?.WD ?? "",
    optics?.immersion ? 1 : 0,
    p.focusZ_mm ?? 0,
    p.condenser_mm ?? 0,
    p.stageX_mm ?? 0,
    p.stageY_mm ?? 0,
    p.fieldIris ?? 0.55,
    Number(p.lampOn) !== 0 ? 1 : 0,
    p.interpupillary_mm ?? 64,
    h
  ].join("|");
}
function digitStrokes(ch) {
  const a = [0.16, 0.08, 0.84, 0.08];
  const b = [0.84, 0.12, 0.84, 0.46];
  const c = [0.84, 0.54, 0.84, 0.88];
  const d = [0.16, 0.92, 0.84, 0.92];
  const e = [0.16, 0.54, 0.16, 0.88];
  const f = [0.16, 0.12, 0.16, 0.46];
  const g = [0.18, 0.5, 0.82, 0.5];
  const times = [[0.22, 0.18, 0.78, 0.82], [0.78, 0.18, 0.22, 0.82]];
  const H = {
    0: [a, b, c, d, e, f],
    1: [b, c],
    2: [a, b, d, e, g],
    3: [a, b, c, d, g],
    4: [b, c, f, g],
    5: [a, c, d, f, g],
    6: [a, c, d, e, f, g],
    7: [a, b, c],
    8: [a, b, c, d, e, f, g],
    9: [a, b, c, d, f, g],
    "\xD7": times,
    x: times,
    X: times
  };
  return H[ch] || [];
}
function drawMagGlyph(cx, cy, cz, ang, mag, r, g, b, out, S) {
  const text = String(mag);
  const chars = text.split("");
  const tangential = [-Math.sin(ang), 0, Math.cos(ang)];
  const radial = [Math.cos(ang), 0, Math.sin(ang)];
  const charW = 0.028;
  const charH = 0.034;
  const totalW = chars.length * charW * 0.85;
  let ox = -totalW / 2;
  const at = (u, v, along) => {
    const px = cx + radial[0] * 0.052 + tangential[0] * (along + u * charW);
    const py = cy + (0.5 - v) * charH;
    const pz = cz + radial[2] * 0.052 + tangential[2] * (along + u * charW);
    return [px, py, pz];
  };
  for (const ch of chars) {
    for (const [u0, v0, u1, v1] of digitStrokes(ch)) {
      const du = Math.abs(u1 - u0);
      const dv = Math.abs(v1 - v0);
      if (du > 0.25 && dv > 0.25) {
        const p0 = at(u0, v0, ox);
        const p1 = at(u1, v1, ox);
        tubeSeg(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], 32e-4, r, g, b, out, 8, true, 0.35);
        continue;
      }
      const midU = (u0 + u1) / 2;
      const midV = (v0 + v1) / 2;
      const lenU = du * charW + 4e-3;
      const lenV = dv * charH + 4e-3;
      const [px, py, pz] = at(midU, midV, ox);
      const sx = Math.max(lenU, 6e-3);
      const sy = Math.max(lenV, 6e-3);
      box(px, py, pz, sx, sy, 8e-3, r, g, b, out, 0.35);
    }
    ox += charW * 0.85;
  }
  void S;
}
function hoverHi(hover, kind, index = 0) {
  return !!(hover && hover.kind === kind && (hover.index == null || hover.index === index));
}
function buildStatic(out, S) {
  const enamel = [0.11, 0.115, 0.125];
  const enamelHi = [0.16, 0.168, 0.18];
  const chrome = [0.74, 0.76, 0.8];
  const heelZ = -0.56;
  const shoeR = 0.66;
  const shoeZc = heelZ + shoeR;
  const shoeY = 0.09;
  const shoeRad = 0.09;
  const tipZ = 0.78;
  const arcSegs = S(56, 24);
  const arcSlice = S(80, 32);
  const chromeSlice = S(40, 16);
  for (let i = 0; i < arcSegs; i += 1) {
    const a0 = Math.PI + i / arcSegs * Math.PI;
    const a1 = Math.PI + (i + 1) / arcSegs * Math.PI;
    const x0 = Math.cos(a0) * shoeR;
    const z0 = shoeZc + Math.sin(a0) * shoeR;
    const x1 = Math.cos(a1) * shoeR;
    const z1 = shoeZc + Math.sin(a1) * shoeR;
    tubeSeg(x0, shoeY, z0, x1, shoeY, z1, shoeRad, ...enamel, out, arcSlice, false, 0.1);
    tubeSeg(x0, shoeY + 0.07, z0, x1, shoeY + 0.07, z1, 0.016, ...chrome, out, chromeSlice, false, 0.4);
  }
  tubeSeg(-shoeR, shoeY, shoeZc, -shoeR, shoeY, tipZ, shoeRad, ...enamel, out, arcSlice, false, 0.1);
  tubeSeg(shoeR, shoeY, shoeZc, shoeR, shoeY, tipZ, shoeRad, ...enamel, out, arcSlice, false, 0.1);
  sphere(-shoeR, shoeY + 0.02, tipZ, 0.115, ...chrome, out, S(48, 24), S(28, 16), 0.42);
  sphere(shoeR, shoeY + 0.02, tipZ, 0.115, ...chrome, out, S(48, 24), S(28, 16), 0.42);
  cylinderY(0, 0.22, heelZ, 0.095, 0.3, ...enamel, out, S(96, 36), true, 0.1);
  torusY(0, 0.34, heelZ, 0.1, 0.016, ...chrome, out, S(80, 32), S(24, 14), 0.36);
  torusY(0, 0.18, heelZ, 0.1, 0.012, ...chrome, out, S(64, 28), S(16, 10), 0.34);
  const armSegs = S(56, 24);
  const armSlice = S(80, 32);
  for (let i = 0; i < armSegs; i += 1) {
    const a = armPoint(i / armSegs);
    const b = armPoint((i + 1) / armSegs);
    tubeSeg(a[0], a[1], a[2], b[0], b[1], b[2], 0.074, ...enamel, out, armSlice, false, 0.11);
    tubeSeg(
      a[0],
      a[1] + 0.055,
      a[2] - 0.028,
      b[0],
      b[1] + 0.055,
      b[2] - 0.028,
      0.014,
      ...chrome,
      out,
      chromeSlice,
      false,
      0.4
    );
  }
  const armEnd = armPoint(1);
  sphere(armEnd[0], armEnd[1], armEnd[2], 0.086, ...enamelHi, out, S(28, 14), S(18, 10), 0.12);
}
function buildDynamic(out, optics, hover, OBJECTIVES2, EYEPIECES2, objectiveRingColor2, layout, S) {
  const enamel = [0.11, 0.115, 0.125];
  const enamelHi = [0.16, 0.168, 0.18];
  const chrome = [0.74, 0.76, 0.8];
  const chromeDim = [0.52, 0.55, 0.6];
  const ivory = [0.9, 0.86, 0.74];
  const ivoryEdge = [0.7, 0.64, 0.5];
  const glass = [0.7, 0.82, 0.9];
  const glassHi = [0.84, 0.92, 0.96];
  const gold = [0.92, 0.74, 0.22];
  const lampGlow = layout.lampOn ? [1, 0.92, 0.55] : [0.04, 0.035, 0.03];
  const hi = [0.45, 0.9, 1];
  const hiSoft = [0.62, 0.82, 1];
  const {
    turY,
    tubeH,
    headY,
    tubeCenterY,
    tubeTopY,
    tubeBotY,
    turretRot,
    stageY,
    slideX,
    slideZ,
    condenserY,
    irisOpen,
    fieldIris,
    lampY,
    focus,
    oculars
  } = layout;
  const tubeSlice = S(216, 72);
  const torusR = S(128, 52);
  const torusT = S(32, 14);
  const midSlice = S(108, 36);
  const fineSlice = S(56, 20);
  sphere(focus[0], focus[1], focus[2], 0.1, ...enamel, out, S(24, 12), S(16, 10), 0.12);
  for (const side of [-1, 1]) {
    const sideIdx = side < 0 ? 0 : 1;
    const coarseHot = hoverHi(hover, "focusCoarse", sideIdx);
    const fineHot = hoverHi(hover, "focusFine", sideIdx);
    cylinderX(focus[0] + side * 0.09, focus[1], focus[2], 0.026, 0.1, ...chromeDim, out, S(16, 8), 0.28, false);
    const coarseX = focus[0] + side * 0.155;
    const cCol = coarseHot ? hi : chrome;
    cylinderX(coarseX, focus[1], focus[2], 0.092, 0.05, ...cCol, out, S(36, 16), 0.4, true);
    for (let k = -2; k <= 2; k += 1) {
      cylinderX(coarseX + side * k * 8e-3, focus[1], focus[2], 0.098, 6e-3, ...chromeDim, out, S(28, 14), 0.28, false);
    }
    if (coarseHot) torusY(coarseX, focus[1], focus[2], 0.11, 0.012, ...hi, out, fineSlice, S(12, 8), 0.4);
    const fineX = focus[0] + side * 0.21;
    const fCol = fineHot ? hi : chrome;
    cylinderX(fineX, focus[1], focus[2], 0.05, 0.036, ...fCol, out, S(32, 14), 0.42, true);
    sphere(focus[0] + side * 0.232, focus[1], focus[2], 0.046, ...fineHot ? hi : chrome, out, S(24, 12), S(16, 10), 0.42);
    if (fineHot) torusY(fineX, focus[1], focus[2], 0.066, 0.01, ...hiSoft, out, fineSlice, S(10, 6), 0.36);
  }
  const tubeR = 0.118;
  const tubeHot = hoverHi(hover, "tubeL");
  cylinderY(0, tubeCenterY, 0, tubeR, tubeH, ...enamel, out, tubeSlice, true, 0.14);
  torusY(0, tubeCenterY + tubeH * 0.28, 0, tubeR + 4e-3, 0.015, ...chrome, out, torusR, torusT, 0.4);
  torusY(0, tubeCenterY, 0, tubeR + 4e-3, 0.012, ...chrome, out, torusR, S(12, 6), 0.38);
  torusY(0, tubeCenterY - tubeH * 0.28, 0, tubeR + 4e-3, 0.015, ...chrome, out, torusR, torusT, 0.4);
  torusY(0, headY, 0, tubeR + 0.01, 0.02, ...chrome, out, torusR, torusT, 0.4);
  const neckTop = tubeBotY;
  const neckBot = turY + 0.1;
  const neckH = neckTop - neckBot;
  if (neckH > 0.02) {
    cylinderY(0, (neckTop + neckBot) / 2, 0, 0.1, neckH, ...enamel, out, midSlice, true, 0.12);
    torusY(0, neckBot + 0.01, 0, 0.108, 0.014, ...chrome, out, S(48, 20), S(12, 6), 0.36);
  }
  const dimX = -0.28;
  const dimCol = tubeHot ? hi : [0.95, 0.85, 0.35];
  box(dimX, tubeCenterY, 0, 8e-3, tubeH, 8e-3, ...dimCol, out, 0.05);
  box(dimX, tubeTopY, 0, 0.09, 8e-3, 8e-3, ...dimCol, out, 0.05);
  box(dimX, tubeBotY, 0, 0.09, 8e-3, 8e-3, ...dimCol, out, 0.05);
  if (tubeHot) torusY(dimX, tubeCenterY, 0, 0.06, 0.01, ...hiSoft, out, fineSlice, S(10, 6), 0.3);
  box(0, tubeTopY + 0.07, 0.03, 0.36, 0.12, 0.24, ...enamel, out, 0.1);
  box(0, tubeTopY + 0.15, 0.07, 0.24, 0.08, 0.16, ...enamelHi, out, 0.12);
  {
    const prismY = tubeTopY + 0.07;
    const prismZ = 0.03;
    box(0, prismY, prismZ, 7e-3, 0.122, 0.242, ...chrome, out, 0.48);
    box(0, prismY + 0.06, prismZ, 0.362, 6e-3, 8e-3, ...chrome, out, 0.46);
    box(0, prismY, prismZ + 0.121, 0.362, 6e-3, 7e-3, ...chrome, out, 0.44);
    box(0, prismY, prismZ - 0.121, 0.362, 6e-3, 7e-3, ...chrome, out, 0.44);
    box(-0.181, prismY, prismZ, 6e-3, 0.122, 8e-3, ...chrome, out, 0.42);
    box(0.181, prismY, prismZ, 6e-3, 0.122, 8e-3, ...chrome, out, 0.42);
    box(0, tubeTopY + 0.19, 0.07, 0.242, 5e-3, 8e-3, ...chrome, out, 0.46);
  }
  const ipdHot = hoverHi(hover, "interpupillary");
  cylinderX(0, tubeTopY + 0.12, 0.05, 0.028, 0.3 * (layout.ipdScale || 1), ...ipdHot ? hi : chrome, out, S(32, 14), 0.38, true);
  torusY(0, tubeTopY + 0.12, 0.05, 0.05, 0.012, ...ipdHot ? hi : chrome, out, S(40, 18), S(14, 8), 0.4);
  if (ipdHot) torusY(0, tubeTopY + 0.12, 0.05, 0.068, 0.01, ...hiSoft, out, fineSlice, S(12, 8), 0.36);
  const oculSlice = S(112, 40);
  for (const oc of oculars) {
    tubeSeg(oc.x0, oc.y0, oc.z0, oc.x1, oc.y1, oc.z1, 0.044, ...enamel, out, oculSlice, true, 0.14);
    torusY(oc.x0, oc.y0, oc.z0, 0.05, 0.01, ...chrome, out, S(36, 16), S(14, 8), 0.34);
    tubeSeg(oc.x1, oc.y1, oc.z1, oc.tipX, oc.tipY, oc.tipZ, 0.06, ...chrome, out, oculSlice, true, 0.38);
    const dx = oc.tipX - oc.x1;
    const dy = oc.tipY - oc.y1;
    const dz = oc.tipZ - oc.z1;
    const dl = Math.hypot(dx, dy, dz) || 1;
    tubeSeg(
      oc.tipX,
      oc.tipY,
      oc.tipZ,
      oc.tipX + dx / dl * 0.028,
      oc.tipY + dy / dl * 0.028,
      oc.tipZ + dz / dl * 0.028,
      0.034,
      0.02,
      0.022,
      0.026,
      out,
      S(28, 14),
      true,
      0.06
    );
  }
  const eyeSlots = [
    oculars[0] && {
      x: oculars[0].tipX,
      y: oculars[0].tipY,
      z: oculars[0].tipZ,
      dx: oculars[0].tipX - oculars[0].x1,
      dy: oculars[0].tipY - oculars[0].y1,
      dz: oculars[0].tipZ - oculars[0].z1
    },
    {
      x: 0,
      y: tubeTopY + 0.22,
      z: 0.14,
      dx: 0,
      dy: Math.cos(34 * Math.PI / 180),
      dz: Math.sin(34 * Math.PI / 180)
    },
    oculars[1] && {
      x: oculars[1].tipX,
      y: oculars[1].tipY,
      z: oculars[1].tipZ,
      dx: oculars[1].tipX - oculars[1].x1,
      dy: oculars[1].tipY - oculars[1].y1,
      dz: oculars[1].tipZ - oculars[1].z1
    }
  ];
  EYEPIECES2.forEach((eye, i) => {
    const slot = eyeSlots[i] || eyeSlots[1];
    if (!slot) return;
    const active = eye.id === optics.eye.id;
    const hovered = hoverHi(hover, "eye", i);
    const { x, y, z } = slot;
    let dx = slot.dx;
    let dy = slot.dy;
    let dz = slot.dz;
    const dl = Math.hypot(dx, dy, dz) || 1;
    dx /= dl;
    dy /= dl;
    dz /= dl;
    const half = active ? 0.038 : 0.032;
    const rad = active ? 0.05 : 0.044;
    tubeSeg(
      x - dx * half,
      y - dy * half,
      z - dz * half,
      x + dx * half,
      y + dy * half,
      z + dz * half,
      rad,
      ...chromeDim,
      out,
      S(36, 18),
      true,
      0.3
    );
    tubeSeg(
      x + dx * (half * 0.15),
      y + dy * (half * 0.15),
      z + dz * (half * 0.15),
      x + dx * (half + 0.018),
      y + dy * (half + 0.018),
      z + dz * (half + 0.018),
      0.03,
      0.03,
      0.035,
      0.04,
      out,
      S(24, 12),
      true,
      0.08
    );
    if (active || hovered) {
      const gr = active ? 0.95 : 0.78;
      tubeSeg(
        x + dx * 0.01,
        y + dy * 0.01,
        z + dz * 0.01,
        x + dx * 0.028,
        y + dy * 0.028,
        z + dz * 0.028,
        0.064,
        0.45,
        gr,
        1,
        out,
        S(28, 14),
        true,
        0.36
      );
    }
  });
  cylinderY(0, turY + 0.055, 0, 0.36, 0.11, ...enamel, out, midSlice, true, 0.12);
  torusY(0, turY + 0.11, 0, 0.36, 0.022, ...chrome, out, torusR, torusT, 0.4);
  torusY(0, turY + 0.02, 0, 0.3, 0.016, ...chromeDim, out, S(48, 20), S(12, 6), 0.3);
  sphere(0, turY + 0.12, 0.36, 0.018, ...chrome, out, S(16, 8), S(12, 6), 0.4);
  OBJECTIVES2.forEach((obj, i) => {
    const ang = turretRot + i * (Math.PI / 2);
    const ox = Math.cos(ang) * 0.32;
    const oz = Math.sin(ang) * 0.32;
    const active = obj.id === optics.obj.id;
    const hovered = hoverHi(hover, "obj", i);
    const k = active ? 1.08 : hovered ? 1.04 : 1;
    let y = turY - 0.012;
    const band = (h) => {
      const c = y - h / 2;
      y -= h;
      return c;
    };
    const yCol = band(0.04);
    const ySh = band(0.042);
    y -= 0.01;
    const yBar = band(0.075);
    const yStep = band(0.026);
    const noseH = 0.055 + MagScale(obj.mag) * 0.028;
    const yNose = band(noseH);
    const yFront = band(0.016);
    const objSlice = S(72, 32);
    cylinderY(ox, yCol, oz, 0.05 * k, 0.04, ...chrome, out, objSlice, true, 0.38);
    cylinderY(ox, ySh, oz, 0.044 * k, 0.042, ...enamel, out, objSlice, true, 0.12);
    const [rr0, rg0, rb0] = objectiveRingColor2(obj.mag).rgb;
    const rr = Math.min(1, rr0 * 1.18 + 0.04);
    const rg = Math.min(1, rg0 * 1.18 + 0.04);
    const rb = Math.min(1, rb0 * 1.18 + 0.04);
    const collarY = turY + OBJECTIVE_COLLAR_DY;
    torusY(ox, collarY, oz, 0.05 * k, 0.016, rr, rg, rb, out, S(72, 32), S(22, 12), 0.34);
    cylinderY(ox, yBar, oz, 0.034 * k, 0.075, ...enamel, out, objSlice, true, 0.12);
    drawMagGlyph(ox, yBar, oz, ang, obj.mag, 0.94, 0.92, 0.88, out, S);
    {
      const phoneTess = S(100, 8) < 65;
      const threadN = phoneTess ? active ? 2 : 1 : active ? 6 : 4;
      const y0 = collarY - 0.016;
      const y1 = yNose + noseH * 0.2;
      const threadR = phoneTess ? S(14, 8) : S(24, 12);
      const threadT = phoneTess ? S(5, 5) : S(6, 6);
      for (let ti = 0; ti < threadN; ti += 1) {
        const u = (ti + 0.5) / threadN;
        const ty = y0 + (y1 - y0) * u;
        const rad = (0.04 - u * 0.01) * k;
        torusY(ox, ty, oz, rad, 32e-4, ...chromeDim, out, threadR, threadT, 0.34);
      }
    }
    cylinderY(ox, yStep, oz, 0.03 * k, 0.026, ...chrome, out, S(48, 20), true, 0.36);
    frustumY(ox, yNose, oz, 0.03 * k, 0.02 * k, noseH, ...chromeDim, out, S(48, 20), 0.3);
    cylinderY(ox, yFront, oz, 0.016 * k, 0.016, ...glass, out, S(36, 16), true, 0.45);
    if (obj.immersion) {
      torusY(ox, yNose - noseH * 0.28, oz, 0.028 * k, 0.01, ...gold, out, S(36, 16), S(14, 8), 0.36);
    }
    if (active) {
      const [ar, ag, ab] = ACTIVITY_RING.rgb;
      cylinderY(ox, collarY, oz, 0.086 * k, 0.046, ar, ag, ab, out, S(64, 28), true, 0.5);
      torusY(ox, collarY, oz, 0.098 * k, 0.016, ar, ag, ab, out, S(72, 32), S(20, 12), 0.55);
      torusY(ox, collarY + 0.012, oz, 0.062 * k, 6e-3, 1, 1, 1, out, S(56, 24), S(14, 8), 0.5);
      torusY(ox, turY + 0.045, oz, 0.112, 0.02, ar, ag, ab, out, S(64, 28), S(20, 12), 0.52);
      torusY(ox, turY + 0.045, oz, 0.084, 0.012, 1, 1, 1, out, S(56, 24), S(16, 10), 0.55);
      torusY(ox, turY + 0.06, oz, 0.096, 9e-3, ar, Math.min(1, ag + 0.32), Math.min(1, ab + 0.18), out, S(48, 20), S(14, 8), 0.44);
    } else if (hovered) {
      torusY(ox, turY + 0.045, oz, 0.104, 0.014, 0.62, 0.82, 1, out, S(48, 20), S(14, 8), 0.38);
    }
  });
  const stageHotX = hoverHi(hover, "stageX");
  const stageHotY = hoverHi(hover, "stageY");
  const clipHot0 = hoverHi(hover, "clip", 0);
  const clipHot1 = hoverHi(hover, "clip", 1);
  const immHot = hoverHi(hover, "immersion");
  box(0, stageY, 0.04, 1.02, 0.05, 0.7, ...ivory, out, 0.06);
  box(0, stageY - 0.032, 0.04, 0.94, 0.016, 0.62, ...ivoryEdge, out, 0.08);
  box(0, stageY - 0.05, 0.02, 0.7, 0.02, 0.46, ...chromeDim, out, 0.16);
  {
    const stageHx = 0.51;
    const stageHz = 0.35;
    const stageCz = 0.04;
    const rimY = stageY + 0.025;
    const rimR = 0.016;
    const xL = -stageHx;
    const xR = stageHx;
    const zB = stageCz - stageHz;
    const zF = stageCz + stageHz;
    const rimSlice = S(28, 12);
    tubeSeg(xL, rimY, zB, xR, rimY, zB, rimR, ...ivoryEdge, out, rimSlice, false, 0.12);
    tubeSeg(xL, rimY, zF, xR, rimY, zF, rimR, ...ivoryEdge, out, rimSlice, false, 0.12);
    tubeSeg(xL, rimY, zB, xL, rimY, zF, rimR, ...ivoryEdge, out, rimSlice, false, 0.12);
    tubeSeg(xR, rimY, zB, xR, rimY, zF, rimR, ...ivoryEdge, out, rimSlice, false, 0.12);
    const cornerU = S(16, 8);
    const cornerV = S(12, 6);
    for (const px of [xL, xR]) {
      for (const pz of [zB, zF]) {
        sphere(px, rimY, pz, rimR * 1.05, ...ivoryEdge, out, cornerU, cornerV, 0.14);
      }
    }
  }
  cylinderY(0, stageY + 0.02, 0.02, 0.1, 0.02, 0.08, 0.08, 0.09, out, S(48, 20), true, 0.05);
  torusY(0, stageY + 0.028, 0.02, 0.12, 0.012, ...chromeDim, out, S(48, 20), S(14, 8), 0.22);
  const railY = stageY + 0.036;
  box(0.02, railY, 0.2, 0.68, 0.01, 0.018, ...chromeDim, out, 0.18);
  box(0.02, railY, -0.14, 0.68, 0.01, 0.018, ...chromeDim, out, 0.18);
  box(-0.31, railY, 0.03, 0.018, 0.01, 0.36, ...chromeDim, out, 0.18);
  box(0.35, railY, 0.03, 0.018, 0.01, 0.36, ...chromeDim, out, 0.18);
  for (let i = 0; i < 6; i += 1) {
    box(-0.1 + i * 0.055, stageY + 0.032, 0.3, 0.012, 0.01, 0.02, ...chrome, out, 0.22);
  }
  const sx = slideX;
  const sz = slideZ;
  box(0.02 + sx, stageY + 0.046, 0.03 + sz, 0.62, 0.01, 0.22, ...glass, out, 0.42);
  box(-0.22 + sx, stageY + 0.052, 0.03 + sz, 0.14, 0.012, 0.22, 0.86, 0.84, 0.74, out, 0.1);
  cylinderY(0.08 + sx, stageY + 0.056, 0.03 + sz, immHot ? 0.078 : 0.07, 6e-3, ...immHot ? hi : glassHi, out, S(28, 14), true, 0.48);
  if (immHot) torusY(0.08 + sx, stageY + 0.06, 0.03 + sz, 0.09, 0.01, ...hiSoft, out, fineSlice, S(10, 6), 0.34);
  const clipCol0 = clipHot0 ? hi : chrome;
  const clipCol1 = clipHot1 ? hi : chrome;
  box(-0.2 + sx, stageY + 0.066, 0.12 + sz, 0.2, 0.012, 0.028, ...clipCol0, out, 0.28);
  box(0.22 + sx, stageY + 0.066, 0.12 + sz, 0.2, 0.012, 0.028, ...clipCol1, out, 0.28);
  cylinderY(-0.1 + sx, stageY + 0.07, 0.12 + sz, 0.02, 0.028, ...chromeDim, out, S(16, 8), true, 0.24);
  cylinderY(0.14 + sx, stageY + 0.07, 0.12 + sz, 0.02, 0.028, ...chromeDim, out, S(16, 8), true, 0.24);
  if (clipHot0) torusY(-0.2 + sx, stageY + 0.072, 0.12 + sz, 0.08, 0.01, ...hiSoft, out, fineSlice, S(10, 6), 0.3);
  if (clipHot1) torusY(0.22 + sx, stageY + 0.072, 0.12 + sz, 0.08, 0.01, ...hiSoft, out, fineSlice, S(10, 6), 0.3);
  for (const px of [-0.46, 0.46]) {
    for (const pz of [-0.26, 0.32]) {
      cylinderY(px, stageY + 0.03, pz, 0.016, 0.012, ...chrome, out, S(14, 8), true, 0.34);
    }
  }
  cylinderX(0.58, stageY - 5e-3, 0.16, 0.042, 0.12, ...stageHotX ? hi : chrome, out, S(28, 14), 0.38, true);
  cylinderX(0.6, stageY - 5e-3, -0.02, 0.03, 0.1, ...stageHotY ? hi : chromeDim, out, S(24, 12), 0.34, true);
  cylinderX(0.5, stageY - 5e-3, 0.16, 0.016, 0.1, ...chromeDim, out, S(16, 8), 0.24, false);
  if (stageHotX) torusY(0.58, stageY - 5e-3, 0.16, 0.055, 0.01, ...hiSoft, out, fineSlice, S(10, 6), 0.34);
  if (stageHotY) torusY(0.6, stageY - 5e-3, -0.02, 0.045, 0.01, ...hiSoft, out, fineSlice, S(10, 6), 0.34);
  const tStage = Math.min(0.82, Math.max(0.08, (stageY - 0.24) / 1.3));
  const limb = armPoint(tStage);
  tubeSeg(limb[0], limb[1], limb[2], 0, stageY - 0.02, -0.22, 0.048, ...enamel, out, S(24, 12), false, 0.1);
  box(0, stageY - 0.04, -0.24, 0.16, 0.08, 0.16, ...enamel, out, 0.08);
  const irisHot = hoverHi(hover, "iris");
  const condHot = hoverHi(hover, "condenser");
  const { lensBot, lensTop, rIn, rOut } = condenserLensRadii(irisOpen);
  frustumY(0, condenserY + 0.055, 0.02, 0.07, 0.11, 0.08, ...chrome, out, S(32, 16), 0.34);
  frustumY(0, condenserY + 0.02, 0.02, lensBot, lensTop, 0.035, ...glass, out, S(28, 14), 0.42);
  torusY(0, condenserY + 0.02, 0.02, (lensBot + lensTop) * 0.5, 35e-4, ...glassHi, out, S(28, 14), S(8, 6), 0.4);
  irisWedges(0, condenserY, 0.02, rIn, rOut, 12, irisHot ? 0.4 : 0.22, irisHot ? 0.55 : 0.23, irisHot ? 0.7 : 0.26, out);
  torusY(0, condenserY, 0.02, 0.112, 0.016, ...irisHot ? hi : chrome, out, S(32, 16), S(10, 6), 0.36);
  cylinderX(0.15, condenserY, 0.02, 0.012, 0.08, ...chrome, out, S(14, 8), 0.32, true);
  cylinderY(0, condenserY - 0.06, 0.02, 0.088, 0.1, ...enamel, out, S(32, 16), true, 0.12);
  frustumY(0, condenserY - 0.135, 0.02, 0.08, 0.05, 0.07, ...chrome, out, S(28, 14), 0.32);
  cylinderX(0.16, condenserY - 0.05, 0.1, 0.038, 0.06, ...condHot ? hi : chrome, out, S(24, 12), 0.36, true);
  if (condHot) torusY(0.16, condenserY - 0.05, 0.1, 0.05, 0.01, ...hiSoft, out, fineSlice, S(10, 6), 0.34);
  const lampHot = hoverHi(hover, "lamp");
  const fieldHot = hoverHi(hover, "fieldIris");
  const frIn = 0.012 + fieldIris * 0.05;
  const frOut = 0.068;
  const houseCol = layout.lampOn ? lampHot ? enamelHi : enamel : [0.045, 0.04, 0.038];
  box(0, lampY, 0.02, 0.3, 0.16, 0.3, ...houseCol, out, layout.lampOn ? 0.08 : 0.04);
  torusY(0, lampY + 0.08, 0.02, 0.1, 0.016, ...chrome, out, S(40, 18), S(14, 8), 0.36);
  box(0, lampY, 0.17, 0.1, 0.07, 0.016, ...lampGlow, out, layout.lampOn ? 0.12 : 0.04);
  sphere(0, lampY, 0.04, layout.lampOn ? 0.052 : 0.018, ...lampGlow, out, S(28, 14), S(18, 10), layout.lampOn ? 0.28 : 0.05);
  if (layout.lampOn) {
    torusY(0, lampY, 0.02, 0.09, 0.016, ...gold, out, S(40, 18), S(14, 8), 0.42);
  } else {
    torusY(0, lampY, 0.02, 0.09, 0.012, 0.12, 0.13, 0.15, out, S(36, 16), S(12, 8), 0.12);
  }
  cylinderY(0, lampY + 0.125, 0.02, 0.09, 0.03, ...glass, out, S(48, 20), true, layout.lampOn ? 0.48 : 0.18);
  cylinderY(0, lampY + 0.158, 0.02, 0.064, 0.02, ...glassHi, out, S(40, 18), true, layout.lampOn ? 0.5 : 0.2);
  irisWedges(0, lampY + 0.185, 0.02, frIn, frOut, 10, fieldHot ? 0.45 : 0.28, fieldHot ? 0.55 : 0.29, fieldHot ? 0.72 : 0.32, out);
  torusY(0, lampY + 0.185, 0.02, 0.076, 0.012, ...fieldHot ? hi : chrome, out, S(40, 18), S(12, 8), 0.36);
  const floorCol = layout.lampOn ? [1, 0.9, 0.52] : [0.02, 0.018, 0.016];
  cylinderY(0, lampY - 0.1, 0.02, 0.14, 0.028, ...floorCol, out, S(40, 18), true, layout.lampOn ? 0.22 : 0.03);
  if (lampHot) torusY(0, lampY, 0.02, 0.18, 0.014, ...hiSoft, out, S(32, 14), S(12, 8), 0.34);
}
function buildMicroscopeSolid(optics, hover, OBJECTIVES2, EYEPIECES2, objectiveRingColor2, opts) {
  if (!opts || !opts.layout) {
    throw new Error("buildMicroscopeSolid: opts.layout is required");
  }
  const layout = opts.layout;
  const tess = clampTess(opts.tess);
  const part = opts.part || "all";
  const S = (n, lo = 8) => Math.max(lo, Math.round(n * tess));
  const staticArr = [];
  const dynamicArr = [];
  if (part === "static" || part === "all") buildStatic(staticArr, S);
  if (part === "dynamic" || part === "all") {
    buildDynamic(dynamicArr, optics, hover, OBJECTIVES2, EYEPIECES2, objectiveRingColor2, layout, S);
  }
  const staticData = new Float32Array(staticArr);
  const dynamicData = new Float32Array(dynamicArr);
  const data = new Float32Array(staticData.length + dynamicData.length);
  data.set(staticData, 0);
  data.set(dynamicData, staticData.length);
  return {
    staticData,
    dynamicData,
    data,
    // Sit the immersion film on the cover slip (above the slide box) so the oil pass is visible.
    oilStageY: layout.stageY + 0.066,
    oilActive: !!optics.immersion
  };
}

// js/viz/microscopeWebgl.js
function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const msg = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(msg || "shader compile");
  }
  return sh;
}
function link(gl, vsSrc, fsSrc) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) || "link");
  }
  return prog;
}
var VS = `
attribute vec3 aPos;
attribute vec3 aCol;
uniform mat4 uMVP;
varying vec3 vCol;
void main(){
  vCol = aCol;
  gl_Position = uMVP * vec4(aPos, 1.0);
}`;
var FS = `
precision mediump float;
varying vec3 vCol;
void main(){ gl_FragColor = vec4(vCol, 1.0); }`;
var OIL_VS = `
attribute vec2 aUv;
uniform mat4 uMVP;
uniform vec3 uCenter;
uniform float uScale;
varying vec2 vUv;
void main(){
  vUv = aUv;
  vec3 pos = uCenter + vec3((aUv.x - 0.5) * uScale, 0.0, (aUv.y - 0.5) * uScale);
  gl_Position = uMVP * vec4(pos, 1.0);
}`;
var OIL_FS = `
precision mediump float;
uniform float uTime;
uniform float uImmersion;
varying vec2 vUv;
void main(){
  if (uImmersion <= 0.02) discard;
  vec2 d = vUv - vec2(0.5);
  float r = length(d) * 2.0;
  if (r > 1.0) discard;
  float pulse = 0.62 + 0.38 * sin(uTime * 3.1 + r * 4.0);
  float edge = smoothstep(1.0, 0.42, r);
  float sheen = smoothstep(0.18, 0.0, abs(r - 0.32 - 0.1 * sin(uTime * 2.2)));
  float rim = smoothstep(0.92, 0.72, r) * smoothstep(0.55, 0.82, r);
  vec3 col = mix(vec3(0.22, 0.55, 0.78), vec3(0.45, 0.72, 0.92), sheen * pulse);
  col = mix(col, vec3(0.95, 0.82, 0.35), rim * 0.55);
  float alpha = edge * (0.62 + 0.38 * uImmersion);
  gl_FragColor = vec4(col, alpha);
}`;
function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy * Math.PI / 360);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) * nf,
    -1,
    0,
    0,
    2 * far * near * nf,
    0
  ]);
}
function multiply(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}
function lookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz) {
  let zx = ex - cx;
  let zy = ey - cy;
  let zz = ez - cz;
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len;
  zy /= len;
  zz /= len;
  let xx = uy * zz - uz * zy;
  let xy = uz * zx - ux * zz;
  let xz = ux * zy - uy * zx;
  len = Math.hypot(xx, xy, xz) || 1;
  xx /= len;
  xy /= len;
  xz /= len;
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  return new Float32Array([
    xx,
    yx,
    zx,
    0,
    xy,
    yy,
    zy,
    0,
    xz,
    yz,
    zz,
    0,
    -(xx * ex + xy * ey + xz * ez),
    -(yx * ex + yy * ey + yz * ez),
    -(zx * ex + zy * ey + zz * ez),
    1
  ]);
}
function project(mvp, x, y, z, width, height) {
  const clipX = mvp[0] * x + mvp[4] * y + mvp[8] * z + mvp[12];
  const clipY = mvp[1] * x + mvp[5] * y + mvp[9] * z + mvp[13];
  const clipW = mvp[3] * x + mvp[7] * y + mvp[11] * z + mvp[15];
  if (Math.abs(clipW) < 1e-6) return null;
  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;
  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (1 - (ndcY * 0.5 + 0.5)) * height
  };
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function overlayCaptionPolicy({ showLabels = 1, hot = false } = {}) {
  const standing = Number(showLabels) !== 0;
  return {
    standing,
    hoverCaption: !standing && !!hot
  };
}
var CAMERA_VIEWS = {
  free: null,
  overview: { yaw: 0.85, pitch: 0.22, radius: 7.5, lookX: 0, lookY: 2.05, lookZ: 0 },
  binocular: { yaw: 0.18, pitch: 0.58, radius: 4.35, lookX: 0, lookY: 2.55, lookZ: 0 },
  turret: { yaw: -Math.PI / 2, pitch: 0.36, radius: 5.4, lookX: 0, lookY: 1.55, lookZ: 0 },
  stage: { yaw: -Math.PI / 2 + 0.28, pitch: 0.82, radius: 4.7, lookX: 0, lookY: 0.95, lookZ: 0 },
  lamp: { yaw: 0.62, pitch: 0.2, radius: 3.55, lookX: 0, lookY: 0.32, lookZ: 0.02 },
  condenser: { yaw: 1.05, pitch: 0.48, radius: 3.35, lookX: 0.06, lookY: 0.58, lookZ: 0.04 },
  side: { yaw: 0.02, pitch: 0.18, radius: 8.1, lookX: 0, lookY: 1.35, lookZ: -0.04 }
};
var VIEW_HOTKEYS = {
  0: "free",
  1: "overview",
  2: "binocular",
  3: "turret",
  4: "stage",
  5: "lamp",
  6: "condenser",
  7: "side"
};
var STAGE_CAPTURE_KEYS = Object.freeze([
  "getMeshDynamicKey",
  "getHeldCameraKeys",
  "getActivityRing",
  "getCameraState",
  "setCameraView",
  "handleCameraKey",
  "getOilBlend",
  "oilVisible",
  "getOilScreen"
]);
var CAMERA_HOLD = {
  KeyW: "dollyIn",
  ArrowUp: "dollyIn",
  Equal: "dollyIn",
  NumpadAdd: "dollyIn",
  KeyS: "dollyOut",
  ArrowDown: "dollyOut",
  Minus: "dollyOut",
  NumpadSubtract: "dollyOut",
  KeyA: "yawLeft",
  ArrowLeft: "yawLeft",
  KeyD: "yawRight",
  ArrowRight: "yawRight",
  KeyQ: "craneUp",
  KeyE: "craneDown",
  KeyR: "pitchUp",
  KeyF: "pitchDown",
  KeyZ: "strafeLeft",
  KeyC: "strafeRight"
};
function createMicroscopeWebgl(canvas, opts = {}) {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const tFn = typeof opts.t === "function" ? opts.t : (k) => k;
  const prog = link(gl, VS, FS);
  const aPos = gl.getAttribLocation(prog, "aPos");
  const aCol = gl.getAttribLocation(prog, "aCol");
  const uMVP = gl.getUniformLocation(prog, "uMVP");
  const staticBuf = gl.createBuffer();
  const dynamicBuf = gl.createBuffer();
  const oilProg = link(gl, OIL_VS, OIL_FS);
  const oilAUv = gl.getAttribLocation(oilProg, "aUv");
  const oilUMVP = gl.getUniformLocation(oilProg, "uMVP");
  const oilUCenter = gl.getUniformLocation(oilProg, "uCenter");
  const oilUScale = gl.getUniformLocation(oilProg, "uScale");
  const oilUTime = gl.getUniformLocation(oilProg, "uTime");
  const oilUImm = gl.getUniformLocation(oilProg, "uImmersion");
  const oilBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, oilBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0,
    0,
    1,
    0,
    1,
    1,
    0,
    0,
    1,
    1,
    0,
    1
  ]), gl.STATIC_DRAW);
  let staticKey = "";
  let dynamicKey = "";
  let staticVertCount = 0;
  let dynamicVertCount = 0;
  const narrowStage = typeof matchMedia === "function" && matchMedia("(max-width: 480px)").matches;
  let yaw = narrowStage ? -Math.PI / 2 : 0.85;
  let pitch = narrowStage ? 0.32 : 0.22;
  let radius = narrowStage ? 9.4 : 7.5;
  let lookX = 0;
  let lookY = 2.05;
  let lookZ = 0;
  let cameraView = "free";
  let viewLocked = false;
  const heldKeys = /* @__PURE__ */ new Set();
  const onCamBlur = () => {
    heldKeys.clear();
  };
  window.addEventListener("blur", onCamBlur);
  let dragMode = null;
  let partHit = null;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let autoSpin = 0;
  function markFreeView() {
    if (cameraView === "free" && !viewLocked) return;
    cameraView = "free";
    viewLocked = false;
    opts.onCameraView?.("free");
  }
  function applyCameraView(id) {
    const key = CAMERA_VIEWS[id] !== void 0 ? id : "free";
    cameraView = key;
    const preset = CAMERA_VIEWS[key];
    if (!preset) {
      viewLocked = false;
      opts.onCameraView?.(key);
      opts.onViewChange?.();
      return key;
    }
    yaw = preset.yaw;
    pitch = preset.pitch;
    radius = narrowStage ? Math.max(preset.radius, 6.2) : preset.radius;
    lookX = preset.lookX ?? 0;
    lookY = preset.lookY ?? 2.05;
    lookZ = preset.lookZ ?? 0;
    viewLocked = true;
    autoSpin = 0;
    opts.onCameraView?.(key);
    opts.onViewChange?.();
    return key;
  }
  function applyHeldCamera(dt) {
    if (!heldKeys.size || !(dt > 0)) return false;
    const fine = heldKeys.has("shift") ? 0.25 : 1;
    const step = dt * fine;
    let movedCam = false;
    const dolly = (heldKeys.has("dollyOut") ? 1 : 0) - (heldKeys.has("dollyIn") ? 1 : 0);
    if (dolly) {
      radius = clamp(radius + dolly * 2.4 * step, 2.4, 12);
      movedCam = true;
    }
    const yawDir = (heldKeys.has("yawRight") ? 1 : 0) - (heldKeys.has("yawLeft") ? 1 : 0);
    if (yawDir) {
      yaw += yawDir * 1.15 * step;
      movedCam = true;
    }
    const crane = (heldKeys.has("craneUp") ? 1 : 0) - (heldKeys.has("craneDown") ? 1 : 0);
    if (crane) {
      lookY = clamp(lookY + crane * 0.95 * step, -0.4, 4.2);
      movedCam = true;
    }
    const pitchDir = (heldKeys.has("pitchUp") ? 1 : 0) - (heldKeys.has("pitchDown") ? 1 : 0);
    if (pitchDir) {
      pitch = clamp(pitch + pitchDir * 0.55 * step, 0.05, 1.15);
      movedCam = true;
    }
    const strafe = (heldKeys.has("strafeRight") ? 1 : 0) - (heldKeys.has("strafeLeft") ? 1 : 0);
    if (strafe) {
      const s = strafe * 1.35 * step;
      lookX = clamp(lookX + Math.sin(yaw) * s, -4, 4);
      lookZ = clamp(lookZ - Math.cos(yaw) * s, -4, 4);
      movedCam = true;
    }
    if (movedCam) markFreeView();
    return movedCam;
  }
  function handleCameraKey(e) {
    const down = e.type !== "keyup";
    if (e.key === "Shift" || e.code === "ShiftLeft" || e.code === "ShiftRight") {
      if (down) heldKeys.add("shift");
      else heldKeys.delete("shift");
      return false;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return false;
    const snapId = VIEW_HOTKEYS[e.key];
    if (snapId || e.key === "Home" || e.key === " " || e.code === "Space") {
      if (!down) return false;
      e.preventDefault();
      if (e.repeat) return true;
      if (e.key === " " || e.code === "Space") {
        autoSpin = autoSpin ? 0 : 0.06;
        return true;
      }
      applyCameraView(e.key === "Home" ? "overview" : snapId);
      return true;
    }
    const action = CAMERA_HOLD[e.code];
    if (!action) return false;
    if (down) {
      heldKeys.add(action);
      applyHeldCamera(1 / 45);
      opts.onViewChange?.();
    } else {
      heldKeys.delete(action);
    }
    e.preventDefault();
    return true;
  }
  let hits = [];
  let lastView = { width: 1, height: 1 };
  let lastState = null;
  let hoverHit = null;
  let oilStageY = 0.4;
  let oilSlideX = 0;
  let oilSlideZ = 0;
  let oilActive = false;
  const OIL_RISE_SEC = 0.45;
  const OIL_FALL_SEC = 0.32;
  let oilBlend = 0;
  let oilRiseElapsed = 0;
  let oilFallElapsed = 0;
  let oilAim = 0;
  let lastOilT = 0;
  let lastMvp = null;
  let lastLayout = null;
  let overlayLabels = [];
  const pointers = /* @__PURE__ */ new Map();
  let pinchDist = 0;
  function hitRadiusPx(mvp, p, width, height) {
    const rw = Math.max(0.04, Number(p.rWorld) || 0.12);
    const c = project(mvp, p.x, p.y, p.z, width, height);
    const e = project(mvp, p.x + rw, p.y, p.z, width, height);
    const dpr = Math.min(window.devicePixelRatio || 1, Number(document.documentElement.dataset.dprCap) || 3);
    const narrow = narrowStage || width <= 420;
    const floor = narrow ? Math.round(34 + dpr * 4) : 28;
    const ceil = narrow ? Math.round(70 + dpr * 6) : 64;
    const fat = narrow ? 1.28 + Math.min(0.28, (dpr - 1) * 0.12) : 1.18;
    if (!c || !e) return floor + 8;
    const r = Math.hypot(e.x - c.x, e.y - c.y);
    return Math.max(floor, Math.min(ceil, r * 1.35 * fat));
  }
  function resolveLabelCollisions(labels) {
    const rows = labels.slice();
    const est = (lab) => ({
      w: Math.max(28, String(lab.text || "").length * (lab.role === "din" ? 5.5 : 7.2)),
      h: lab.role === "din" ? 12 : lab.role === "knob" ? 14 : 16
    });
    for (let pass = 0; pass < 4; pass += 1) {
      for (let i = 0; i < rows.length; i += 1) {
        for (let j = 0; j < i; j += 1) {
          const a = rows[i];
          const b = rows[j];
          const ea = est(a);
          const eb = est(b);
          const dx = Math.abs(a.x - b.x);
          const dy = Math.abs(a.y - b.y);
          if (dx < (ea.w + eb.w) * 0.5 && dy < (ea.h + eb.h) * 0.55) {
            const push = (ea.h + eb.h) * 0.55 - dy + 2 + pass;
            if (a.y <= b.y) a.y -= push;
            else a.y += push;
          }
        }
      }
    }
    return rows;
  }
  function rebuildHits(mvp, width, height, layout) {
    hits = [];
    for (const p of layout.pts || []) {
      const s = project(mvp, p.x, p.y, p.z, width, height);
      if (!s) continue;
      hits.push({
        kind: p.kind,
        index: p.index,
        x: s.x,
        y: s.y,
        r: hitRadiusPx(mvp, p, width, height)
      });
    }
  }
  function pickAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / Math.max(rect.width, 1) * lastView.width;
    const y = (clientY - rect.top) / Math.max(rect.height, 1) * lastView.height;
    let best = null;
    let bestD = Infinity;
    for (const h of hits) {
      const d = Math.hypot(x - h.x, y - h.y);
      if (d <= h.r && d < bestD) {
        best = h;
        bestD = d;
      }
    }
    return best;
  }
  function notifyParams(meta = {}) {
    opts.onPick?.(lastState, meta);
  }
  function applyDrag(kind, dx, dy) {
    if (!lastState?.params) return;
    const p = lastState.params;
    const o = opticsFromParams(p);
    if (kind === "focusCoarse") {
      p.focusZ_mm = clamp((Number(p.focusZ_mm) || 0) + dy * -0.035, -2, 2);
      p.WD_mm = clamp((Number(p.WD_mm) || o.WD) + dy * -0.14, 0.05, 25);
    } else if (kind === "focusFine") {
      const z0 = Number(p.focusZ_mm) || 0;
      p.focusZ_mm = clamp(z0 + dy * -8e-3, -2, 2);
      p.WD_mm = clamp((Number(p.WD_mm) || o.WD) + dy * -0.028, 0.05, 25);
    } else if (kind === "stageX") {
      p.stageX_mm = clamp((Number(p.stageX_mm) || 0) + dx * 0.06, -15, 15);
    } else if (kind === "stageY") {
      p.stageY_mm = clamp((Number(p.stageY_mm) || 0) + dy * -0.06, -10, 10);
    } else if (kind === "condenser") {
      p.condenser_mm = clamp((Number(p.condenser_mm) || 0) + dy * -0.08, -3, 3);
    } else if (kind === "iris") {
      p.NA = clamp((Number(p.NA) || o.NA) + dx * 25e-4, 0.05, o.NAcap);
    } else if (kind === "fieldIris") {
      p.fieldIris = clamp((Number(p.fieldIris) || 0.55) + dx * 3e-3, 0.1, 1);
    } else if (kind === "interpupillary") {
      p.interpupillary_mm = clamp((Number(p.interpupillary_mm) || 64) + dx * 0.08, 50, 75);
    } else {
      return;
    }
    notifyParams({ live: true });
  }
  function applyClick(hit) {
    if (!lastState?.params || !hit || !CLICK_KINDS.has(hit.kind)) return false;
    const p = lastState.params;
    if (hit.kind === "obj") {
      const obj = OBJECTIVES[hit.index];
      if (!obj) return false;
      p.objective = obj.id;
      applyTurretDefaults(lastState, "obj");
      lastState._lastObj = p.objective;
      lastState.pick = `obj-${obj.mag}\xD7`;
      notifyParams();
      return true;
    }
    if (hit.kind === "eye") {
      const eye = EYEPIECES[hit.index];
      if (!eye) return false;
      p.eyepiece = eye.id;
      applyTurretDefaults(lastState, "eye");
      lastState._lastEye = p.eyepiece;
      lastState.pick = `eye-${eye.mag}\xD7`;
      notifyParams();
      return true;
    }
    if (hit.kind === "lamp") {
      p.lampOn = Number(p.lampOn) !== 0 ? 0 : 1;
      lastState.pick = p.lampOn ? "lamp-on" : "lamp-off";
      notifyParams();
      return true;
    }
    if (hit.kind === "immersion") {
      if (p.objective === "100x") p.objective = "40x";
      else p.objective = "100x";
      applyTurretDefaults(lastState, "obj");
      lastState._lastObj = p.objective;
      lastState.pick = p.objective === "100x" ? "immersion-oil" : "immersion-dry";
      notifyParams();
      return true;
    }
    if (hit.kind === "clip") {
      const nudge = hit.index === 1 ? 1.5 : -1.5;
      p.stageX_mm = clamp((Number(p.stageX_mm) || 0) + nudge, -15, 15);
      lastState.pick = `clip-${hit.index}`;
      notifyParams();
      return true;
    }
    return false;
  }
  function pointerPairDist() {
    if (pointers.size < 2) return 0;
    const pts = [...pointers.values()];
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }
  const onDown = (ev) => {
    ev.preventDefault();
    autoSpin = 0;
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.size >= 2) {
      dragMode = null;
      partHit = null;
      pinchDist = pointerPairDist();
      moved = true;
      return;
    }
    moved = false;
    lastX = ev.clientX;
    lastY = ev.clientY;
    const hit = pickAt(ev.clientX, ev.clientY);
    if (hit && DRAG_KINDS.has(hit.kind)) {
      dragMode = "part";
      partHit = { kind: hit.kind, index: hit.index };
      canvas.style.cursor = "ns-resize";
    } else {
      dragMode = "orbit";
      partHit = null;
      canvas.style.cursor = "grabbing";
    }
    try {
      canvas.setPointerCapture(ev.pointerId);
    } catch {
    }
  };
  const onMove = (ev) => {
    if (pointers.has(ev.pointerId)) {
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    }
    if (pointers.size >= 2) {
      const dist = pointerPairDist();
      if (pinchDist > 1) {
        const delta = dist - pinchDist;
        radius = clamp(radius - delta * 0.012, 2.4, 12);
        markFreeView();
        opts.onViewChange?.();
      }
      pinchDist = dist;
      moved = true;
      return;
    }
    if (dragMode === "part" && partHit) {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      if (Math.hypot(dx, dy) > 2) moved = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
      applyDrag(partHit.kind, dx, dy);
      return;
    }
    if (dragMode === "orbit") {
      if (viewLocked) {
        markFreeView();
      }
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      if (Math.hypot(dx, dy) > 3) moved = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
      yaw += dx * 6e-3;
      pitch = clamp(pitch + dy * 5e-3, 0.05, 1.15);
      opts.onViewChange?.();
      return;
    }
    const hit = pickAt(ev.clientX, ev.clientY);
    const nextKey = hit ? `${hit.kind}:${hit.index}` : "";
    const prevKey = hoverHit ? `${hoverHit.kind}:${hoverHit.index}` : "";
    if (nextKey !== prevKey) {
      hoverHit = hit ? { kind: hit.kind, index: hit.index } : null;
      if (hit && (DRAG_KINDS.has(hit.kind) || CLICK_KINDS.has(hit.kind))) autoSpin = 0;
      canvas.style.cursor = hit ? "pointer" : "grab";
      opts.onViewChange?.();
    }
  };
  const endPointer = (ev) => {
    pointers.delete(ev.pointerId);
    if (pointers.size >= 2) {
      pinchDist = pointerPairDist();
      return;
    }
    if (pointers.size === 1) {
      pinchDist = 0;
      const rem = [...pointers.values()][0];
      lastX = rem.x;
      lastY = rem.y;
      dragMode = "orbit";
      partHit = null;
      return;
    }
    pinchDist = 0;
    if (!dragMode) {
      canvas.style.cursor = hoverHit ? "pointer" : "grab";
      return;
    }
    const wasMode = dragMode;
    const wasPart = partHit;
    dragMode = null;
    partHit = null;
    try {
      canvas.releasePointerCapture(ev.pointerId);
    } catch {
    }
    if (!moved && wasMode !== "part") {
      const hit = pickAt(ev.clientX, ev.clientY);
      if (hit) applyClick(hit);
    } else if (!moved && wasMode === "part" && wasPart && CLICK_KINDS.has(wasPart.kind)) {
      applyClick(wasPart);
    }
    canvas.style.cursor = hoverHit ? "pointer" : "grab";
  };
  const onUp = (ev) => endPointer(ev);
  const onCancel = (ev) => endPointer(ev);
  const onLeave = () => {
    if (dragMode) return;
    if (hoverHit) {
      hoverHit = null;
      canvas.style.cursor = "grab";
      opts.onViewChange?.();
    }
  };
  const onWheel = (ev) => {
    ev.preventDefault();
    autoSpin = 0;
    radius = clamp(radius + Math.sign(ev.deltaY) * 0.22, 2.4, 12);
    markFreeView();
    opts.onViewChange?.();
  };
  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  function drawBuffer(buf, count) {
    if (!count) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 24, 12);
    gl.drawArrays(gl.TRIANGLES, 0, count);
  }
  function drawScene(state, view) {
    lastState = state;
    lastView = { width: view.width, height: view.height };
    const params = state.params || {};
    const optics = opticsFromParams(params);
    const layout = microscopeLayout(optics, params);
    const tess = mobileBudget().microTess ?? 1;
    const tSec = performance.now() * 1e-3;
    const dpr = Math.min(window.devicePixelRatio || 1, Number(document.documentElement.dataset.dprCap) || 3);
    const bw = Math.max(1, Math.floor(view.width * dpr));
    const bh = Math.max(1, Math.floor(view.height * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      canvas.style.width = "";
      canvas.style.height = "";
    }
    gl.viewport(0, 0, bw, bh);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.012, 0.016, 0.022, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const nextStatic = meshStaticKey(tess);
    const nextDynamic = meshDynamicKey(optics, hoverHit, params);
    const needStatic = nextStatic !== staticKey;
    const needDynamic = nextDynamic !== dynamicKey;
    if (needStatic || needDynamic) {
      const built = buildMicroscopeSolid(
        optics,
        hoverHit,
        OBJECTIVES,
        EYEPIECES,
        objectiveRingColor,
        { layout, tess, part: needStatic ? "all" : "dynamic" }
      );
      if (needStatic) {
        gl.bindBuffer(gl.ARRAY_BUFFER, staticBuf);
        gl.bufferData(gl.ARRAY_BUFFER, built.staticData, gl.STATIC_DRAW);
        staticVertCount = built.staticData.length / 6;
        staticKey = nextStatic;
      }
      if (needStatic || needDynamic) {
        gl.bindBuffer(gl.ARRAY_BUFFER, dynamicBuf);
        gl.bufferData(gl.ARRAY_BUFFER, built.dynamicData, gl.DYNAMIC_DRAW);
        dynamicVertCount = built.dynamicData.length / 6;
        dynamicKey = nextDynamic;
      }
      oilStageY = built.oilStageY;
      oilActive = built.oilActive;
    }
    oilSlideX = layout.slideX;
    oilSlideZ = layout.slideZ;
    const dt = lastOilT ? Math.min(0.05, Math.max(0, tSec - lastOilT)) : 0.016;
    lastOilT = tSec;
    const oilTarget = oilActive ? 1 : 0;
    if (oilTarget > oilAim) {
      oilRiseElapsed = 0;
      oilFallElapsed = 0;
    } else if (oilTarget < oilAim) {
      oilFallElapsed = 0;
    }
    oilAim = oilTarget;
    if (oilBlend < oilTarget) {
      oilBlend = Math.min(oilTarget, oilBlend + dt / OIL_RISE_SEC);
      oilRiseElapsed += dt;
    } else if (oilBlend > oilTarget) {
      oilBlend = Math.max(oilTarget, oilBlend - dt / OIL_FALL_SEC);
      oilFallElapsed += dt;
      if (oilTarget === 0 && oilBlend <= 0) oilRiseElapsed = 0;
    }
    const hoverBusy = hoverHit && (DRAG_KINDS.has(hoverHit.kind) || CLICK_KINDS.has(hoverHit.kind));
    const camDt = dt;
    if (!viewLocked && !dragMode && pointers.size < 2 && autoSpin && !hoverBusy) {
      yaw += autoSpin * camDt;
    }
    if (dragMode !== "part") applyHeldCamera(camDt);
    const ox = Math.cos(yaw) * Math.cos(pitch) * radius;
    const oy = Math.sin(pitch) * radius;
    const oz = Math.sin(yaw) * Math.cos(pitch) * radius;
    const ex = lookX + ox;
    const ey = lookY + oy;
    const ez = lookZ + oz;
    const aspect = view.width / Math.max(view.height, 1);
    const proj = perspective(38, aspect, 0.15, 56);
    const viewM = lookAt(ex, ey, ez, lookX, lookY, lookZ, 0, 1, 0);
    const mvp = multiply(proj, viewM);
    lastMvp = mvp;
    lastLayout = layout;
    rebuildHits(mvp, view.width, view.height, layout);
    overlayLabels = [];
    const dragHot = dragMode === "part" && partHit ? partHit : null;
    const pointerHot = dragHot || hoverHit;
    const hotMatch = (kind, index = 0) => !!(pointerHot && pointerHot.kind === kind && (pointerHot.index == null || pointerHot.index === index));
    const knobLabels = {
      focusCoarse: tFn("ui.microKnobCoarse"),
      focusFine: tFn("ui.microKnobFine"),
      stageX: tFn("ui.microKnobStageX"),
      stageY: tFn("ui.microKnobStageY"),
      condenser: tFn("ui.microKnobCondenser"),
      iris: tFn("ui.microKnobIris"),
      fieldIris: tFn("ui.microKnobFieldIris"),
      lamp: tFn("ui.microKnobLamp"),
      interpupillary: tFn("ui.microKnobIPD"),
      immersion: tFn("ui.microKnobOil"),
      clip: tFn("ui.microKnobClip")
    };
    const caption = overlayCaptionPolicy({
      showLabels: params.showLabels,
      hot: !!pointerHot
    });
    if (caption.standing) {
      const Lpt = project(mvp, -0.28, layout.tubeCenterY, 0, view.width, view.height);
      if (Lpt) {
        overlayLabels.push({
          id: "L",
          text: `L = ${Math.round(optics.Lmm)} mm (fixed)`,
          x: Lpt.x,
          y: Lpt.y
        });
      }
      const shownKnob = /* @__PURE__ */ new Set();
      for (const p of layout.pts) {
        if (p.kind === "obj") {
          const obj = OBJECTIVES[p.index];
          if (!obj) continue;
          const s = project(mvp, p.x, p.y, p.z, view.width, view.height);
          if (!s) continue;
          const ring = objectiveRingColor(obj.mag);
          overlayLabels.push({
            id: `din-${obj.id}`,
            text: String(obj.mag),
            x: s.x,
            y: s.y + 6,
            active: obj.id === optics.obj.id,
            ring: ring.hex,
            role: "din"
          });
          overlayLabels.push({
            id: `obj-${obj.id}`,
            text: `${obj.mag}\xD7 ${ring.name}`,
            x: s.x,
            y: s.y - 18,
            active: obj.id === optics.obj.id,
            ring: ring.hex,
            role: "obj"
          });
        } else if (p.kind === "eye") {
          const eye = EYEPIECES[p.index];
          if (!eye) continue;
          const s = project(mvp, p.x, p.y, p.z, view.width, view.height);
          if (!s) continue;
          overlayLabels.push({
            id: `eye-${eye.id}`,
            text: `Eye ${eye.mag}\xD7`,
            x: s.x,
            y: s.y - 14,
            active: eye.id === optics.eye.id,
            role: "eye"
          });
        } else if (knobLabels[p.kind] != null) {
          const key = p.kind === "clip" ? `clip-${p.index}` : p.kind;
          if (shownKnob.has(key)) continue;
          const primary = p.kind === "focusCoarse" || p.kind === "focusFine" || p.kind === "stageX" || p.kind === "stageY" || p.kind === "iris" || p.kind === "lamp" || p.kind === "condenser" || p.kind === "interpupillary";
          const hot = hoverHit && hoverHit.kind === p.kind || partHit && partHit.kind === p.kind;
          if (!primary && !hot) continue;
          if (primary && p.index !== 0 && !hot) continue;
          const s = project(mvp, p.x, p.y, p.z, view.width, view.height);
          if (!s) continue;
          shownKnob.add(key);
          overlayLabels.push({
            id: `knob-${key}`,
            text: knobLabels[p.kind],
            x: s.x,
            y: s.y + 16,
            active: hot,
            role: "knob"
          });
        }
      }
      overlayLabels = resolveLabelCollisions(overlayLabels);
    } else if (caption.hoverCaption) {
      const p = (layout.pts || []).find((row) => hotMatch(row.kind, row.index));
      if (p) {
        const s = project(mvp, p.x, p.y, p.z, view.width, view.height);
        if (s) {
          if (p.kind === "obj") {
            const obj = OBJECTIVES[p.index];
            if (obj) {
              const ring = objectiveRingColor(obj.mag);
              overlayLabels.push({
                id: `obj-${obj.id}`,
                text: `${obj.mag}\xD7 ${ring.name}`,
                x: s.x,
                y: s.y - 18,
                active: true,
                ring: ring.hex,
                role: "obj"
              });
            }
          } else if (p.kind === "eye") {
            const eye = EYEPIECES[p.index];
            if (eye) {
              overlayLabels.push({
                id: `eye-${eye.id}`,
                text: `Eye ${eye.mag}\xD7`,
                x: s.x,
                y: s.y - 14,
                active: true,
                role: "eye"
              });
            }
          } else if (knobLabels[p.kind]) {
            const key = p.kind === "clip" ? `clip-${p.index}` : p.kind;
            overlayLabels.push({
              id: `knob-${key}`,
              text: knobLabels[p.kind],
              x: s.x,
              y: s.y + 16,
              active: true,
              role: "knob"
            });
          }
        }
      }
    }
    gl.useProgram(prog);
    gl.uniformMatrix4fv(uMVP, false, mvp);
    drawBuffer(staticBuf, staticVertCount);
    drawBuffer(dynamicBuf, dynamicVertCount);
    if (oilBlend > 0.02) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(oilProg);
      gl.uniformMatrix4fv(oilUMVP, false, mvp);
      gl.uniform3f(oilUCenter, oilSlideX, oilStageY, oilSlideZ);
      gl.uniform1f(oilUScale, 0.58 * (0.35 + 0.65 * oilBlend));
      gl.uniform1f(oilUTime, tSec);
      gl.uniform1f(oilUImm, oilBlend);
      gl.bindBuffer(gl.ARRAY_BUFFER, oilBuf);
      gl.enableVertexAttribArray(oilAUv);
      gl.vertexAttribPointer(oilAUv, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
  }
  return {
    kind: "webgl3d",
    draw(state, view) {
      drawScene(state, view);
    },
    getOverlayLabels() {
      return overlayLabels.slice();
    },
    getHits() {
      return hits.slice();
    },
    /** CSS px of the active objective barrel collar (DIN-ring height) from the last draw. */
    getActivityRing() {
      if (!lastMvp || !lastLayout || !lastState) return null;
      const optics = opticsFromParams(lastState.params || {});
      const w = activityCollarWorld(lastLayout, optics.obj.id);
      const { width, height } = lastView;
      const c = project(lastMvp, w.x, w.y, w.z, width, height);
      if (!c) return null;
      const edge = project(lastMvp, w.x + 0.1, w.y, w.z, width, height);
      const r = edge ? Math.max(6, Math.hypot(edge.x - c.x, edge.y - c.y)) : 16;
      return { x: c.x, y: c.y, r };
    },
    getOilBlend() {
      return oilBlend;
    },
    /** Oil film is drawn only while blend is above the shader discard. */
    oilVisible() {
      return oilBlend > 0.02;
    },
    /** CSS pixels of the immersion-film center from the last draw. */
    getOilScreen() {
      if (!lastMvp) return null;
      const { width, height } = lastView;
      const c = project(lastMvp, oilSlideX, oilStageY, oilSlideZ, width, height);
      if (!c) return null;
      const scale = 0.58 * (0.35 + 0.65 * oilBlend);
      const edge = project(lastMvp, oilSlideX + scale * 0.5, oilStageY, oilSlideZ, width, height);
      const r = edge ? Math.max(4, Math.hypot(edge.x - c.x, edge.y - c.y)) : 12;
      return { x: c.x, y: c.y, r };
    },
    getOilRiseSec() {
      return OIL_RISE_SEC;
    },
    getOilRiseElapsed() {
      return oilRiseElapsed;
    },
    getOilFallSec() {
      return OIL_FALL_SEC;
    },
    getOilFallElapsed() {
      return oilFallElapsed;
    },
    /** Free orbit or named fixed viewpoint (overview / binocular / turret / stage / lamp / condenser / side). */
    setCameraView(id) {
      return applyCameraView(id);
    },
    getCameraView() {
      return cameraView;
    },
    handleCameraKey,
    /** Held camera actions (blur / release contracts). */
    getHeldCameraKeys() {
      return [...heldKeys];
    },
    getCameraState() {
      return {
        yaw,
        pitch,
        radius,
        lookX,
        lookY,
        lookZ,
        autoSpin,
        view: cameraView,
        viewLocked
      };
    },
    /** Last meshDynamicKey after draw (NA / irisOpen / turret rebuild fingerprint). */
    getMeshDynamicKey() {
      return dynamicKey;
    },
    capturePng(state, view) {
      drawScene(state, view);
      gl.finish();
      try {
        const href = canvas.toDataURL("image/png");
        if (!href || href === "data:," || href.length < 64) return "";
        return href;
      } catch {
        return "";
      }
    },
    dispose() {
      window.removeEventListener("blur", onCamBlur);
      heldKeys.clear();
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
      gl.deleteBuffer(staticBuf);
      gl.deleteBuffer(dynamicBuf);
      gl.deleteBuffer(oilBuf);
      gl.deleteProgram(prog);
      gl.deleteProgram(oilProg);
      pointers.clear();
    }
  };
}
export {
  CAMERA_HOLD,
  CAMERA_VIEWS,
  STAGE_CAPTURE_KEYS,
  VIEW_HOTKEYS,
  createMicroscopeWebgl,
  overlayCaptionPolicy
};
