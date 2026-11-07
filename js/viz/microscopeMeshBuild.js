/**
 * Compound-microscope solid for the single WebGL stage.
 * Layout-driven: static chassis (horseshoe / C-arm / heel) never rebuilds on
 * hover; dynamic optics (tube, Siedentopf, turret, stage, condenser, lamp)
 * follow microscopeLayout().
 *
 * Vertex format: [x,y,z, r,g,b] × N — soft key+fill baked into RGB.
 */
import { armPoint, MagScale } from './microscopeLayout.js';

/** Bake a soft key+fill light into vertex RGB (no extra attributes). */
function shade(nx, ny, nz, r, g, b, gloss = 0.12) {
  const lx = 0.42; const ly = 0.82; const lz = 0.38;
  const len = Math.hypot(lx, ly, lz) || 1;
  const ndl = Math.max(0, (nx * lx + ny * ly + nz * lz) / len);
  const fill = Math.max(0, -nx * 0.25 + ny * 0.15 + nz * 0.1);
  const amb = 0.32;
  const spec = gloss * (ndl ** 12);
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
  const hx = sx / 2; const hy = sy / 2; const hz = sz / 2;
  const faces = [
    [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz], 0, 0, 1],
    [[-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz], [hx, -hy, -hz], 0, 0, -1],
    [[-hx, hy, -hz], [-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], 0, 1, 0],
    [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz], 0, -1, 0],
    [[hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [hx, -hy, hz], 1, 0, 0],
    [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], -1, 0, 0],
  ];
  for (const [a, b2, c, d, nx, ny, nz] of faces) {
    tri(out,
      cx + a[0], cy + a[1], cz + a[2],
      cx + b2[0], cy + b2[1], cz + b2[2],
      cx + c[0], cy + c[1], cz + c[2],
      nx, ny, nz, r, g, b, gloss);
    tri(out,
      cx + a[0], cy + a[1], cz + a[2],
      cx + c[0], cy + c[1], cz + c[2],
      cx + d[0], cy + d[1], cz + d[2],
      nx, ny, nz, r, g, b, gloss);
  }
}

/** Smooth Y-axis cylinder (triangle sides + optional caps). */
function cylinderY(cx, cy0, cz, radius, height, r, g, b, out, slices = 28, caps = true, gloss = 0.14) {
  const y0 = cy0 - height / 2;
  const y1 = cy0 + height / 2;
  for (let i = 0; i < slices; i += 1) {
    const a0 = (i / slices) * Math.PI * 2;
    const a1 = ((i + 1) / slices) * Math.PI * 2;
    const c0 = Math.cos(a0); const s0 = Math.sin(a0);
    const c1 = Math.cos(a1); const s1 = Math.sin(a1);
    const x0 = cx + c0 * radius; const z0 = cz + s0 * radius;
    const x1 = cx + c1 * radius; const z1 = cz + s1 * radius;
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

/** Truncated cone along +Y (objective noses, condenser lenses). */
function frustumY(cx, cy0, cz, rBot, rTop, height, r, g, b, out, slices = 24, gloss = 0.16) {
  const y0 = cy0 - height / 2;
  const y1 = cy0 + height / 2;
  for (let i = 0; i < slices; i += 1) {
    const a0 = (i / slices) * Math.PI * 2;
    const a1 = ((i + 1) / slices) * Math.PI * 2;
    const c0 = Math.cos(a0); const s0 = Math.sin(a0);
    const c1 = Math.cos(a1); const s1 = Math.sin(a1);
    const x0b = cx + c0 * rBot; const z0b = cz + s0 * rBot;
    const x1b = cx + c1 * rBot; const z1b = cz + s1 * rBot;
    const x0t = cx + c0 * rTop; const z0t = cz + s0 * rTop;
    const x1t = cx + c1 * rTop; const z1t = cz + s1 * rTop;
    const slope = (rBot - rTop) / Math.max(height, 1e-4);
    const nx0 = c0; const ny = slope; const nz0 = s0;
    const n0l = Math.hypot(nx0, ny, nz0) || 1;
    const nx1 = c1; const nz1 = s1;
    const n1l = Math.hypot(nx1, ny, nz1) || 1;
    pushV(out, x0b, y0, z0b, nx0 / n0l, ny / n0l, nz0 / n0l, r, g, b, gloss);
    pushV(out, x1b, y0, z1b, nx1 / n1l, ny / n1l, nz1 / n1l, r, g, b, gloss);
    pushV(out, x1t, y1, z1t, nx1 / n1l, ny / n1l, nz1 / n1l, r, g, b, gloss);
    pushV(out, x0b, y0, z0b, nx0 / n0l, ny / n0l, nz0 / n0l, r, g, b, gloss);
    pushV(out, x1t, y1, z1t, nx1 / n1l, ny / n1l, nz1 / n1l, r, g, b, gloss);
    pushV(out, x0t, y1, z0t, nx0 / n0l, ny / n0l, nz0 / n0l, r, g, b, gloss);
  }
}

/** Torus in the XZ plane (machined rings, nosepiece rim). */
function torusY(cx, cy, cz, R, tube, r, g, b, out, segR = 28, segT = 12, gloss = 0.2) {
  for (let i = 0; i < segR; i += 1) {
    const a0 = (i / segR) * Math.PI * 2;
    const a1 = ((i + 1) / segR) * Math.PI * 2;
    for (let j = 0; j < segT; j += 1) {
      const b0 = (j / segT) * Math.PI * 2;
      const b1 = ((j + 1) / segT) * Math.PI * 2;
      const ring = (a, bAng) => {
        const cosA = Math.cos(a); const sinA = Math.sin(a);
        const cosB = Math.cos(bAng); const sinB = Math.sin(bAng);
        const x = cx + (R + tube * cosB) * cosA;
        const y = cy + tube * sinB;
        const z = cz + (R + tube * cosB) * sinA;
        return [x, y, z, cosA * cosB, sinB, sinA * cosB];
      };
      const p00 = ring(a0, b0); const p10 = ring(a1, b0);
      const p11 = ring(a1, b1); const p01 = ring(a0, b1);
      pushV(out, p00[0], p00[1], p00[2], p00[3], p00[4], p00[5], r, g, b, gloss);
      pushV(out, p10[0], p10[1], p10[2], p10[3], p10[4], p10[5], r, g, b, gloss);
      pushV(out, p11[0], p11[1], p11[2], p11[3], p11[4], p11[5], r, g, b, gloss);
      pushV(out, p00[0], p00[1], p00[2], p00[3], p00[4], p00[5], r, g, b, gloss);
      pushV(out, p11[0], p11[1], p11[2], p11[3], p11[4], p11[5], r, g, b, gloss);
      pushV(out, p01[0], p01[1], p01[2], p01[3], p01[4], p01[5], r, g, b, gloss);
    }
  }
}

/** Cylinder along +X (focus knobs, stage XY knobs, hinge). */
function cylinderX(cx0, cy, cz, radius, length, r, g, b, out, slices = 20, gloss = 0.18, caps = true) {
  const x0 = cx0 - length / 2;
  const x1 = cx0 + length / 2;
  for (let i = 0; i < slices; i += 1) {
    const a0 = (i / slices) * Math.PI * 2;
    const a1 = ((i + 1) / slices) * Math.PI * 2;
    const c0 = Math.cos(a0); const s0 = Math.sin(a0);
    const c1 = Math.cos(a1); const s1 = Math.sin(a1);
    const y0 = cy + c0 * radius; const z0 = cz + s0 * radius;
    const y1 = cy + c1 * radius; const z1 = cz + s1 * radius;
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

/** UV sphere (fork toes, knob caps, lamp filament). */
function sphere(cx, cy, cz, radius, r, g, b, out, segU = 16, segV = 12, gloss = 0.22) {
  for (let j = 0; j < segV; j += 1) {
    const phi0 = (j / segV) * Math.PI;
    const phi1 = ((j + 1) / segV) * Math.PI;
    const y0 = Math.cos(phi0);
    const y1 = Math.cos(phi1);
    const r0 = Math.sin(phi0);
    const r1 = Math.sin(phi1);
    for (let i = 0; i < segU; i += 1) {
      const th0 = (i / segU) * Math.PI * 2;
      const th1 = ((i + 1) / segU) * Math.PI * 2;
      const c0 = Math.cos(th0); const s0 = Math.sin(th0);
      const c1 = Math.cos(th1); const s1 = Math.sin(th1);
      const p = (rr, yy, cc, ss) => [
        cx + cc * rr * radius,
        cy + yy * radius,
        cz + ss * rr * radius,
        cc * rr,
        yy,
        ss * rr,
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

/**
 * Cylinder between two points (C-arm sweep, tilted Siedentopf oculars).
 * Axis-aligned helpers cannot carry the binocular tilt.
 */
function tubeSeg(x0, y0, z0, x1, y1, z1, radius, r, g, b, out, slices = 16, caps = true, gloss = 0.16) {
  let dx = x1 - x0;
  let dy = y1 - y0;
  let dz = z1 - z0;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return;
  dx /= len; dy /= len; dz /= len;
  let hx = 0; let hy = 1; let hz = 0;
  if (Math.abs(dy) > 0.92) { hx = 1; hy = 0; hz = 0; }
  let ux = hy * dz - hz * dy;
  let uy = hz * dx - hx * dz;
  let uz = hx * dy - hy * dx;
  const ul = Math.hypot(ux, uy, uz) || 1;
  ux /= ul; uy /= ul; uz /= ul;
  const vx = dy * uz - dz * uy;
  const vy = dz * ux - dx * uz;
  const vz = dx * uy - dy * ux;
  for (let i = 0; i < slices; i += 1) {
    const a0 = (i / slices) * Math.PI * 2;
    const a1 = ((i + 1) / slices) * Math.PI * 2;
    const c0 = Math.cos(a0); const s0 = Math.sin(a0);
    const c1 = Math.cos(a1); const s1 = Math.sin(a1);
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

/** Abbe / field iris leaves in the XZ plane. */
function irisWedges(cx, cy, cz, rIn, rOut, count, r, g, b, out) {
  for (let i = 0; i < count; i += 1) {
    const pitch = (Math.PI * 2) / count;
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
    tri(out, x0, cy, z0, x1, cy, z1, xt, cy + 0.004, zt, 0, 1, 0, r, g, b, 0.22);
    tri(out, x0, cy - 0.008, z0, xt, cy - 0.004, zt, x1, cy - 0.008, z1, 0, -1, 0, r * 0.72, g * 0.72, b * 0.72, 0.08);
  }
}

function clampTess(tess) {
  return Math.max(0.45, Math.min(1.15, Number(tess) || 1));
}

/** Cache key for the static chassis (horseshoe / C-arm / heel). */
export function meshStaticKey(tess) {
  return `static:${clampTess(tess)}`;
}

/** Cache key for the dynamic optics stack (layout + hover). */
export function meshDynamicKey(optics, hover, params = {}) {
  const p = params || {};
  const h = hover ? `${hover.kind}:${hover.index}` : '-';
  return [
    'dyn',
    optics?.obj?.id ?? '',
    optics?.eye?.id ?? '',
    optics?.Lmm ?? '',
    optics?.NA ?? '',
    optics?.NAcap ?? '',
    optics?.WD ?? '',
    optics?.immersion ? 1 : 0,
    p.focusZ_mm ?? 0,
    p.stageX_mm ?? 0,
    p.stageY_mm ?? 0,
    p.fieldIris ?? 0.55,
    Number(p.lampOn) !== 0 ? 1 : 0,
    h,
  ].join('|');
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

  // —— Horseshoe: curved rear arc, straight forks, chrome sphere toes ——
  // ~2× older teaching mesh denseness (S(24)/S(32) bases).
  const arcSegs = S(24, 16);
  const arcSlice = S(32, 16);
  const chromeSlice = S(16, 8);
  for (let i = 0; i < arcSegs; i += 1) {
    const a0 = Math.PI + (i / arcSegs) * Math.PI;
    const a1 = Math.PI + ((i + 1) / arcSegs) * Math.PI;
    const x0 = Math.cos(a0) * shoeR;
    const z0 = shoeZc + Math.sin(a0) * shoeR;
    const x1 = Math.cos(a1) * shoeR;
    const z1 = shoeZc + Math.sin(a1) * shoeR;
    tubeSeg(x0, shoeY, z0, x1, shoeY, z1, shoeRad, ...enamel, out, arcSlice, false, 0.1);
    tubeSeg(x0, shoeY + 0.07, z0, x1, shoeY + 0.07, z1, 0.016, ...chrome, out, chromeSlice, false, 0.4);
  }
  tubeSeg(-shoeR, shoeY, shoeZc, -shoeR, shoeY, tipZ, shoeRad, ...enamel, out, arcSlice, false, 0.1);
  tubeSeg(shoeR, shoeY, shoeZc, shoeR, shoeY, tipZ, shoeRad, ...enamel, out, arcSlice, false, 0.1);
  sphere(-shoeR, shoeY + 0.02, tipZ, 0.115, ...chrome, out, S(24, 14), S(16, 10), 0.42);
  sphere(shoeR, shoeY + 0.02, tipZ, 0.115, ...chrome, out, S(24, 14), S(16, 10), 0.42);

  // Pillar / heel rises out of the rear arc into the limb.
  cylinderY(0, 0.22, heelZ, 0.095, 0.3, ...enamel, out, S(48, 24), true, 0.1);
  torusY(0, 0.34, heelZ, 0.1, 0.016, ...chrome, out, S(32, 16), S(12, 8), 0.36);

  // —— C-arm (opens toward the optical axis) ——
  const armSegs = S(24, 16);
  const armSlice = S(32, 16);
  for (let i = 0; i < armSegs; i += 1) {
    const a = armPoint(i / armSegs);
    const b = armPoint((i + 1) / armSegs);
    tubeSeg(a[0], a[1], a[2], b[0], b[1], b[2], 0.074, ...enamel, out, armSlice, false, 0.11);
    tubeSeg(
      a[0], a[1] + 0.055, a[2] - 0.028,
      b[0], b[1] + 0.055, b[2] - 0.028,
      0.014, ...chrome, out, chromeSlice, false, 0.4,
    );
  }
  const armEnd = armPoint(1);
  sphere(armEnd[0], armEnd[1], armEnd[2], 0.086, ...enamelHi, out, S(20, 12), S(14, 8), 0.12);
}

function buildDynamic(out, optics, hover, OBJECTIVES, EYEPIECES, objectiveRingColor, layout, S) {
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
    turY, tubeH, headY, tubeCenterY, tubeTopY, tubeBotY,
    turretRot, stageY, slideX, slideZ, condenserY, irisOpen, fieldIris,
    lampY, focus, oculars,
  } = layout;

  const tubeSlice = S(112, 48);
  const torusR = S(80, 32);
  const torusT = S(20, 10);
  const midSlice = S(48, 20);
  const fineSlice = S(28, 12);

  // —— Bilateral coaxial coarse + fine focus (hover-sensitive → dynamic) ——
  sphere(focus[0], focus[1], focus[2], 0.1, ...enamel, out, S(24, 12), S(16, 10), 0.12);
  for (const side of [-1, 1]) {
    const sideIdx = side < 0 ? 0 : 1;
    const coarseHot = hoverHi(hover, 'focusCoarse', sideIdx);
    const fineHot = hoverHi(hover, 'focusFine', sideIdx);
    cylinderX(focus[0] + side * 0.09, focus[1], focus[2], 0.026, 0.1, ...chromeDim, out, S(16, 8), 0.28, false);
    const coarseX = focus[0] + side * 0.155;
    const cCol = coarseHot ? hi : chrome;
    cylinderX(coarseX, focus[1], focus[2], 0.092, 0.05, ...cCol, out, S(28, 14), 0.4, true);
    cylinderX(coarseX - side * 0.012, focus[1], focus[2], 0.102, 0.01, ...chromeDim, out, S(28, 14), 0.32, false);
    cylinderX(coarseX + side * 0.012, focus[1], focus[2], 0.102, 0.01, ...chromeDim, out, S(28, 14), 0.32, false);
    if (coarseHot) torusY(coarseX, focus[1], focus[2], 0.11, 0.012, ...hi, out, fineSlice, S(10, 6), 0.4);
    const fineX = focus[0] + side * 0.21;
    const fCol = fineHot ? hi : chrome;
    cylinderX(fineX, focus[1], focus[2], 0.05, 0.036, ...fCol, out, S(22, 12), 0.42, true);
    sphere(focus[0] + side * 0.232, focus[1], focus[2], 0.046, ...(fineHot ? hi : chrome), out, S(16, 10), S(12, 8), 0.42);
    if (fineHot) torusY(fineX, focus[1], focus[2], 0.066, 0.01, ...hiSoft, out, fineSlice, S(10, 6), 0.36);
  }

  // —— High-tess body tube ——
  const tubeR = 0.118;
  const tubeHot = hoverHi(hover, 'tubeL');
  cylinderY(0, tubeCenterY, 0, tubeR, tubeH, ...enamel, out, tubeSlice, true, 0.14);
  torusY(0, tubeCenterY + tubeH * 0.28, 0, tubeR + 0.004, 0.015, ...chrome, out, torusR, torusT, 0.4);
  torusY(0, tubeCenterY, 0, tubeR + 0.004, 0.012, ...chrome, out, torusR, S(12, 6), 0.38);
  torusY(0, tubeCenterY - tubeH * 0.28, 0, tubeR + 0.004, 0.015, ...chrome, out, torusR, torusT, 0.4);
  torusY(0, headY, 0, tubeR + 0.01, 0.02, ...chrome, out, torusR, torusT, 0.4);

  const neckTop = tubeBotY;
  const neckBot = turY + 0.1;
  const neckH = neckTop - neckBot;
  if (neckH > 0.02) {
    cylinderY(0, (neckTop + neckBot) / 2, 0, 0.1, neckH, ...enamel, out, midSlice, true, 0.12);
    torusY(0, neckBot + 0.01, 0, 0.108, 0.014, ...chrome, out, S(48, 20), S(12, 6), 0.36);
  }

  // Tube-length witness (hover = tubeL).
  const dimX = -0.28;
  const dimCol = tubeHot ? hi : [0.95, 0.85, 0.35];
  box(dimX, tubeCenterY, 0, 0.008, tubeH, 0.008, ...dimCol, out, 0.05);
  box(dimX, tubeTopY, 0, 0.09, 0.008, 0.008, ...dimCol, out, 0.05);
  box(dimX, tubeBotY, 0, 0.09, 0.008, 0.008, ...dimCol, out, 0.05);
  if (tubeHot) torusY(dimX, tubeCenterY, 0, 0.06, 0.01, ...hiSoft, out, fineSlice, S(10, 6), 0.3);

  // —— Siedentopf binocular from layout.oculars ——
  box(0, tubeTopY + 0.07, 0.03, 0.36, 0.12, 0.24, ...enamel, out, 0.1);
  box(0, tubeTopY + 0.15, 0.07, 0.24, 0.08, 0.16, ...enamelHi, out, 0.12);
  cylinderX(0, tubeTopY + 0.12, 0.05, 0.028, 0.3, ...chrome, out, S(24, 12), 0.38, true);

  const oculSlice = S(48, 20);
  for (const oc of oculars) {
    tubeSeg(oc.x0, oc.y0, oc.z0, oc.x1, oc.y1, oc.z1, 0.044, ...enamel, out, oculSlice, true, 0.14);
    torusY(oc.x0, oc.y0, oc.z0, 0.05, 0.01, ...chrome, out, S(36, 16), S(14, 8), 0.34);
    tubeSeg(oc.x1, oc.y1, oc.z1, oc.tipX, oc.tipY, oc.tipZ, 0.06, ...chrome, out, oculSlice, true, 0.38);
    const dx = oc.tipX - oc.x1;
    const dy = oc.tipY - oc.y1;
    const dz = oc.tipZ - oc.z1;
    const dl = Math.hypot(dx, dy, dz) || 1;
    tubeSeg(
      oc.tipX, oc.tipY, oc.tipZ,
      oc.tipX + (dx / dl) * 0.028, oc.tipY + (dy / dl) * 0.028, oc.tipZ + (dz / dl) * 0.028,
      0.034, 0.02, 0.022, 0.026, out, S(28, 14), true, 0.06,
    );
  }

  // Eyepiece picks mapped onto left / prism-center / right (layout eye slots).
  // Mesh follows ocular tip axis — no floating cylinderY on tips.
  const eyeSlots = [
    oculars[0] && {
      x: oculars[0].tipX, y: oculars[0].tipY, z: oculars[0].tipZ,
      dx: oculars[0].tipX - oculars[0].x1,
      dy: oculars[0].tipY - oculars[0].y1,
      dz: oculars[0].tipZ - oculars[0].z1,
    },
    {
      x: 0, y: tubeTopY + 0.22, z: 0.14,
      dx: 0,
      dy: Math.cos((34 * Math.PI) / 180),
      dz: Math.sin((34 * Math.PI) / 180),
    },
    oculars[1] && {
      x: oculars[1].tipX, y: oculars[1].tipY, z: oculars[1].tipZ,
      dx: oculars[1].tipX - oculars[1].x1,
      dy: oculars[1].tipY - oculars[1].y1,
      dz: oculars[1].tipZ - oculars[1].z1,
    },
  ];
  EYEPIECES.forEach((eye, i) => {
    const slot = eyeSlots[i] || eyeSlots[1];
    if (!slot) return;
    const active = eye.id === optics.eye.id;
    const hovered = hoverHi(hover, 'eye', i);
    const { x, y, z } = slot;
    let dx = slot.dx; let dy = slot.dy; let dz = slot.dz;
    const dl = Math.hypot(dx, dy, dz) || 1;
    dx /= dl; dy /= dl; dz /= dl;
    const half = active ? 0.038 : 0.032;
    const rad = active ? 0.05 : 0.044;
    tubeSeg(
      x - dx * half, y - dy * half, z - dz * half,
      x + dx * half, y + dy * half, z + dz * half,
      rad, ...chromeDim, out, S(36, 18), true, 0.3,
    );
    tubeSeg(
      x + dx * (half * 0.15), y + dy * (half * 0.15), z + dz * (half * 0.15),
      x + dx * (half + 0.018), y + dy * (half + 0.018), z + dz * (half + 0.018),
      0.03, 0.03, 0.035, 0.04, out, S(24, 12), true, 0.08,
    );
    if (active || hovered) {
      const gr = active ? 0.95 : 0.78;
      // Selection collar along tip direction (not a floating torusY).
      tubeSeg(
        x + dx * 0.01, y + dy * 0.01, z + dz * 0.01,
        x + dx * 0.028, y + dy * 0.028, z + dz * 0.028,
        0.064, 0.45, gr, 1, out, S(28, 14), true, 0.36,
      );
    }
  });

  // —— Revolving nosepiece ——
  cylinderY(0, turY + 0.055, 0, 0.36, 0.11, ...enamel, out, midSlice, true, 0.12);
  torusY(0, turY + 0.11, 0, 0.36, 0.022, ...chrome, out, torusR, torusT, 0.4);
  torusY(0, turY + 0.02, 0, 0.3, 0.016, ...chromeDim, out, S(48, 20), S(12, 6), 0.3);
  sphere(0, turY + 0.12, 0.36, 0.018, ...chrome, out, S(16, 8), S(12, 6), 0.4);

  // Objectives: layout.turretRot puts the active objective on the −Z optical axis.
  OBJECTIVES.forEach((obj, i) => {
    const ang = turretRot + i * (Math.PI / 2);
    const ox = Math.cos(ang) * 0.32;
    const oz = Math.sin(ang) * 0.32;
    const active = obj.id === optics.obj.id;
    const hovered = hoverHi(hover, 'obj', i);
    const k = active ? 1.08 : hovered ? 1.04 : 1;
    let y = turY - 0.012;
    const band = (h) => {
      const c = y - h / 2;
      y -= h;
      return c;
    };
    const yCol = band(0.04);
    const ySh = band(0.042);
    const yRing = y;
    y -= 0.01;
    const yBar = band(0.075);
    const yStep = band(0.026);
    const noseH = 0.055 + MagScale(obj.mag) * 0.028;
    const yNose = band(noseH);
    const yFront = band(0.016);
    const objSlice = S(24, 14);
    cylinderY(ox, yCol, oz, 0.05 * k, 0.04, ...chrome, out, objSlice, true, 0.38);
    cylinderY(ox, ySh, oz, 0.044 * k, 0.042, ...enamel, out, objSlice, true, 0.12);
    const [rr0, rg0, rb0] = objectiveRingColor(obj.mag).rgb;
    // DIN ring slightly brighter than catalog RGB.
    const rr = Math.min(1, rr0 * 1.18 + 0.04);
    const rg = Math.min(1, rg0 * 1.18 + 0.04);
    const rb = Math.min(1, rb0 * 1.18 + 0.04);
    torusY(ox, yRing, oz, 0.05 * k, 0.012, rr, rg, rb, out, S(24, 12), S(10, 6), 0.34);
    cylinderY(ox, yBar, oz, 0.034 * k, 0.075, ...enamel, out, objSlice, true, 0.12);
    cylinderY(ox, yStep, oz, 0.03 * k, 0.026, ...chrome, out, S(20, 12), true, 0.36);
    frustumY(ox, yNose, oz, 0.03 * k, 0.02 * k, noseH, ...chromeDim, out, S(20, 12), 0.3);
    cylinderY(ox, yFront, oz, 0.016 * k, 0.016, ...glass, out, S(16, 8), true, 0.45);
    if (obj.immersion) {
      torusY(ox, yNose - noseH * 0.28, oz, 0.028 * k, 0.01, ...gold, out, S(18, 10), S(10, 6), 0.36);
    }
    if (active) {
      // Magenta outer + white inner — separate from DIN band colors.
      torusY(ox, turY + 0.045, oz, 0.1, 0.014, 1, 0.2, 0.85, out, S(24, 12), S(10, 6), 0.4);
      torusY(ox, turY + 0.045, oz, 0.078, 0.01, 1, 1, 1, out, S(24, 12), S(10, 6), 0.42);
    } else if (hovered) {
      torusY(ox, turY + 0.045, oz, 0.096, 0.012, 0.62, 0.82, 1, out, S(20, 10), S(10, 6), 0.32);
    }
  });

  // —— Mechanical ivory stage, slide, clips, XY knobs ——
  const stageHotX = hoverHi(hover, 'stageX');
  const stageHotY = hoverHi(hover, 'stageY');
  const clipHot0 = hoverHi(hover, 'clip', 0);
  const clipHot1 = hoverHi(hover, 'clip', 1);
  const immHot = hoverHi(hover, 'immersion');

  box(0, stageY, 0.04, 1.02, 0.05, 0.7, ...ivory, out, 0.06);
  box(0, stageY - 0.032, 0.04, 0.94, 0.016, 0.62, ...ivoryEdge, out, 0.08);
  box(0, stageY - 0.05, 0.02, 0.7, 0.02, 0.46, ...chromeDim, out, 0.16);
  cylinderY(0, stageY + 0.02, 0.02, 0.1, 0.02, 0.08, 0.08, 0.09, out, S(32, 16), true, 0.05);
  torusY(0, stageY + 0.028, 0.02, 0.12, 0.012, ...chromeDim, out, S(32, 16), S(10, 6), 0.22);

  const railY = stageY + 0.036;
  box(0.02, railY, 0.2, 0.68, 0.01, 0.018, ...chromeDim, out, 0.18);
  box(0.02, railY, -0.14, 0.68, 0.01, 0.018, ...chromeDim, out, 0.18);
  box(-0.31, railY, 0.03, 0.018, 0.01, 0.36, ...chromeDim, out, 0.18);
  box(0.35, railY, 0.03, 0.018, 0.01, 0.36, ...chromeDim, out, 0.18);
  for (let i = 0; i < 6; i += 1) {
    box(-0.1 + i * 0.055, stageY + 0.032, 0.3, 0.012, 0.01, 0.02, ...chrome, out, 0.22);
  }

  // Slide / cover-slip / immersion follow layout.slideX / slideZ.
  const sx = slideX;
  const sz = slideZ;
  box(0.02 + sx, stageY + 0.046, 0.03 + sz, 0.62, 0.01, 0.22, ...glass, out, 0.42);
  box(-0.22 + sx, stageY + 0.052, 0.03 + sz, 0.14, 0.012, 0.22, 0.86, 0.84, 0.74, out, 0.1);
  cylinderY(0.08 + sx, stageY + 0.056, 0.03 + sz, immHot ? 0.078 : 0.07, 0.006, ...(immHot ? hi : glassHi), out, S(28, 14), true, 0.48);
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

  cylinderX(0.58, stageY - 0.005, 0.16, 0.042, 0.12, ...(stageHotX ? hi : chrome), out, S(28, 14), 0.38, true);
  cylinderX(0.6, stageY - 0.005, -0.02, 0.03, 0.1, ...(stageHotY ? hi : chromeDim), out, S(24, 12), 0.34, true);
  cylinderX(0.5, stageY - 0.005, 0.16, 0.016, 0.1, ...chromeDim, out, S(16, 8), 0.24, false);
  if (stageHotX) torusY(0.58, stageY - 0.005, 0.16, 0.055, 0.01, ...hiSoft, out, fineSlice, S(10, 6), 0.34);
  if (stageHotY) torusY(0.6, stageY - 0.005, -0.02, 0.045, 0.01, ...hiSoft, out, fineSlice, S(10, 6), 0.34);

  const tStage = Math.min(0.82, Math.max(0.08, (stageY - 0.24) / 1.3));
  const limb = armPoint(tStage);
  tubeSeg(limb[0], limb[1], limb[2], 0, stageY - 0.02, -0.22, 0.048, ...enamel, out, S(24, 12), false, 0.1);
  box(0, stageY - 0.04, -0.24, 0.16, 0.08, 0.16, ...enamel, out, 0.08);

  // —— Abbe condenser + iris (layout.condenserY / irisOpen) ——
  const irisHot = hoverHi(hover, 'iris');
  const condHot = hoverHi(hover, 'condenser');
  const rIn = 0.018 + irisOpen * 0.075;
  const rOut = 0.1;
  frustumY(0, condenserY + 0.055, 0.02, 0.07, 0.11, 0.08, ...chrome, out, S(32, 16), 0.34);
  irisWedges(0, condenserY, 0.02, rIn, rOut, 12, irisHot ? 0.4 : 0.22, irisHot ? 0.55 : 0.23, irisHot ? 0.7 : 0.26, out);
  torusY(0, condenserY, 0.02, 0.112, 0.016, ...(irisHot ? hi : chrome), out, S(32, 16), S(10, 6), 0.36);
  cylinderX(0.15, condenserY, 0.02, 0.012, 0.08, ...chrome, out, S(14, 8), 0.32, true);
  cylinderY(0, condenserY - 0.06, 0.02, 0.088, 0.1, ...enamel, out, S(32, 16), true, 0.12);
  frustumY(0, condenserY - 0.135, 0.02, 0.08, 0.05, 0.07, ...chrome, out, S(28, 14), 0.32);
  cylinderX(0.16, condenserY - 0.05, 0.1, 0.038, 0.06, ...(condHot ? hi : chrome), out, S(24, 12), 0.36, true);
  if (condHot) torusY(0.16, condenserY - 0.05, 0.1, 0.05, 0.01, ...hiSoft, out, fineSlice, S(10, 6), 0.34);

  // —— Köhler lamp house + collector + field iris ——
  const lampHot = hoverHi(hover, 'lamp');
  const fieldHot = hoverHi(hover, 'fieldIris');
  const frIn = 0.012 + fieldIris * 0.05;
  const frOut = 0.068;
  box(0, lampY, 0.02, 0.3, 0.16, 0.3, ...(lampHot ? enamelHi : enamel), out, 0.08);
  torusY(0, lampY + 0.08, 0.02, 0.1, 0.016, ...chrome, out, S(28, 14), S(10, 6), 0.36);
  box(0, lampY, 0.17, 0.1, 0.07, 0.016, ...lampGlow, out, 0.12);
  sphere(0, lampY, 0.04, layout.lampOn ? 0.052 : 0.022, ...lampGlow, out, S(20, 10), S(14, 8), layout.lampOn ? 0.28 : 0.08);
  if (layout.lampOn) {
    torusY(0, lampY, 0.02, 0.09, 0.016, ...gold, out, S(32, 16), S(12, 8), 0.42);
  }
  cylinderY(0, lampY + 0.125, 0.02, 0.09, 0.03, ...glass, out, S(32, 16), true, 0.48);
  cylinderY(0, lampY + 0.158, 0.02, 0.064, 0.02, ...glassHi, out, S(28, 14), true, 0.5);
  irisWedges(0, lampY + 0.185, 0.02, frIn, frOut, 8, fieldHot ? 0.45 : 0.28, fieldHot ? 0.55 : 0.29, fieldHot ? 0.72 : 0.32, out);
  torusY(0, lampY + 0.185, 0.02, 0.076, 0.012, ...(fieldHot ? hi : chrome), out, S(28, 14), S(10, 6), 0.36);
  // Floor plate: bright when lamp on, near-black when off.
  const floorCol = layout.lampOn ? [1, 0.9, 0.52] : [0.035, 0.03, 0.028];
  cylinderY(0, lampY - 0.1, 0.02, 0.14, 0.028, ...floorCol, out, S(28, 14), true, layout.lampOn ? 0.22 : 0.04);
  if (lampHot) torusY(0, lampY, 0.02, 0.18, 0.014, ...hiSoft, out, S(24, 12), S(10, 6), 0.34);
}

/**
 * @param {object} optics
 * @param {{ kind: string, index: number } | null} hover
 * @param {{ id: string, mag: number, immersion?: boolean }[]} OBJECTIVES
 * @param {{ id: string, mag: number }[]} EYEPIECES
 * @param {(mag: number) => { rgb: number[] }} objectiveRingColor
 * @param {{ layout: object, tess?: number, part?: 'static'|'dynamic'|'all' }} opts
 * @returns {{ staticData: Float32Array, dynamicData: Float32Array, data: Float32Array, oilStageY: number, oilActive: boolean }}
 */
export function buildMicroscopeSolid(optics, hover, OBJECTIVES, EYEPIECES, objectiveRingColor, opts) {
  if (!opts || !opts.layout) {
    throw new Error('buildMicroscopeSolid: opts.layout is required');
  }
  const layout = opts.layout;
  const tess = clampTess(opts.tess);
  const part = opts.part || 'all';
  const S = (n, lo = 8) => Math.max(lo, Math.round(n * tess));

  const staticArr = [];
  const dynamicArr = [];
  if (part === 'static' || part === 'all') buildStatic(staticArr, S);
  if (part === 'dynamic' || part === 'all') {
    buildDynamic(dynamicArr, optics, hover, OBJECTIVES, EYEPIECES, objectiveRingColor, layout, S);
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
    oilStageY: layout.stageY + 0.05,
    oilActive: !!optics.immersion,
  };
}
