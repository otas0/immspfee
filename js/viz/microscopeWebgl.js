/**
 * Single WebGL stage for the compound microscope (AGENTS: one 3D experience).
 * Reuses js/models/microscopeOptics.js params — no parallel physics.
 * Drag orbit · wheel zoom · click objectives / eyepieces (same semantics as 2D).
 *
 * Mesh aims at NOBOOK-class teaching fidelity: lit cylinders / tori, horseshoe
 * base, focus knobs, stage clips, condenser, illuminator — still one WebGL path.
 */
import {
  OBJECTIVES,
  EYEPIECES,
  opticsFromParams,
  applyTurretDefaults,
} from '../models/microscopeOptics.js';

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const msg = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(msg || 'shader compile');
  }
  return sh;
}

function link(gl, vsSrc, fsSrc) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) || 'link');
  }
  return prog;
}

const VS = `
attribute vec3 aPos;
attribute vec3 aCol;
uniform mat4 uMVP;
varying vec3 vCol;
void main(){
  vCol = aCol;
  gl_Position = uMVP * vec4(aPos, 1.0);
}`;

const FS = `
precision mediump float;
varying vec3 vCol;
void main(){ gl_FragColor = vec4(vCol, 1.0); }`;

const OIL_VS = `
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

const OIL_FS = `
precision mediump float;
uniform float uTime;
uniform float uImmersion;
varying vec2 vUv;
void main(){
  if (uImmersion < 0.5) discard;
  vec2 d = vUv - vec2(0.5);
  float r = length(d) * 2.0;
  if (r > 1.0) discard;
  float pulse = 0.62 + 0.38 * sin(uTime * 3.1 + r * 4.0);
  float edge = smoothstep(1.0, 0.42, r);
  float sheen = smoothstep(0.18, 0.0, abs(r - 0.32 - 0.1 * sin(uTime * 2.2)));
  float rim = smoothstep(0.92, 0.72, r) * smoothstep(0.55, 0.82, r);
  vec3 col = mix(vec3(0.22, 0.55, 0.78), vec3(0.72, 0.92, 1.0), sheen);
  col = mix(col, vec3(0.95, 0.82, 0.35), rim * 0.55);
  float alpha = edge * pulse * 0.88;
  gl_FragColor = vec4(col, alpha);
}`;

function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan((fovy * Math.PI) / 360);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

function multiply(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1]
        + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

function lookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz) {
  let zx = ex - cx; let zy = ey - cy; let zz = ez - cz;
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len; zy /= len; zz /= len;
  let xx = uy * zz - uz * zy;
  let xy = uz * zx - ux * zz;
  let xz = ux * zy - uy * zx;
  len = Math.hypot(xx, xy, xz) || 1;
  xx /= len; xy /= len; xz /= len;
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  return new Float32Array([
    xx, yx, zx, 0,
    xy, yy, zy, 0,
    xz, yz, zz, 0,
    -(xx * ex + xy * ey + xz * ez),
    -(yx * ex + yy * ey + yz * ez),
    -(zx * ex + zy * ey + zz * ez),
    1,
  ]);
}

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
    // +Z -Z +Y -Y +X -X
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

/** Smooth Y-axis cylinder (triangle strip sides + optional caps). */
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
    // two triangles; average normal per corner uses radial dir
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

/** Truncated cone along +Y (objective barrels). */
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
    // approximate outward normal from radius slope
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

/** Torus in XZ plane (nosepiece / focus dial rim). */
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
        const nx = cosA * cosB;
        const ny = sinB;
        const nz = sinA * cosB;
        return [x, y, z, nx, ny, nz];
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

/** Cylinder along +X (focus knobs on the arm). */
function cylinderX(cx0, cy, cz, radius, length, r, g, b, out, slices = 20, gloss = 0.18) {
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
  }
}

function ring(cx, cy, cz, radius, thick, height, r, g, b, out, segs = 28) {
  torusY(cx, cy, cz, radius, Math.max(thick * 0.55, 0.012), r, g, b, out, segs, 10);
  // thin washer for flat-looking bands
  cylinderY(cx, cy, cz, radius + thick * 0.15, height, r * 0.92, g * 0.92, b * 0.92, out, segs, false, 0.1);
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
    y: (1 - (ndcY * 0.5 + 0.5)) * height,
  };
}

function MagScale(m) {
  return Math.log10(Math.max(4, m));
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ onPick?: (state: object) => void, onViewChange?: () => void }} [opts]
 */
export function createMicroscopeWebgl(canvas, opts = {}) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const prog = link(gl, VS, FS);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  const aCol = gl.getAttribLocation(prog, 'aCol');
  const uMVP = gl.getUniformLocation(prog, 'uMVP');
  const buf = gl.createBuffer();

  const oilProg = link(gl, OIL_VS, OIL_FS);
  const oilAUv = gl.getAttribLocation(oilProg, 'aUv');
  const oilUMVP = gl.getUniformLocation(oilProg, 'uMVP');
  const oilUCenter = gl.getUniformLocation(oilProg, 'uCenter');
  const oilUScale = gl.getUniformLocation(oilProg, 'uScale');
  const oilUTime = gl.getUniformLocation(oilProg, 'uTime');
  const oilUImm = gl.getUniformLocation(oilProg, 'uImmersion');
  const oilBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, oilBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 0, 1, 0, 1, 1,
    0, 0, 1, 1, 0, 1,
  ]), gl.STATIC_DRAW);

  let lastKey = '';
  let vertCount = 0;
  let yaw = 0.72;
  let pitch = 0.38;
  let radius = 3.35;
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let autoSpin = 0.08;
  let hits = [];
  let lastView = { width: 1, height: 1 };
  let lastState = null;
  /** @type {{ kind: string, index: number } | null} */
  let hoverHit = null;
  let oilStageY = 0.4;
  let oilActive = false;
  let prevImmersion = null;
  /** Screen-space labels refreshed each draw (L dimension + picks). */
  let overlayLabels = [];

  function turretWorld(optics) {
    const mag = optics.obj.mag;
    const Lscale = Math.max(0.85, Math.min(1.25, (optics.Lmm || 160) / 160));
    const tubeH = (1.35 + MagScale(mag) * 0.22) * Lscale;
    const headY = 1.55;
    const turY = headY - 0.28;
    const tubeCenterY = headY + tubeH / 2 - 0.05;
    const tubeTopY = tubeCenterY + tubeH / 2;
    const tubeBotY = tubeCenterY - tubeH / 2;
    const pts = [];
    OBJECTIVES.forEach((obj, i) => {
      const ang = -Math.PI / 2 + i * (Math.PI / 2);
      pts.push({
        kind: 'obj',
        index: i,
        x: Math.cos(ang) * 0.32,
        y: turY - 0.08,
        z: Math.sin(ang) * 0.32,
        id: obj.id,
      });
    });
    EYEPIECES.forEach((eye, i) => {
      const x = (i - (EYEPIECES.length - 1) / 2) * 0.16;
      pts.push({
        kind: 'eye',
        index: i,
        x,
        y: tubeTopY + 0.42,
        z: 0.22,
        id: eye.id,
      });
    });
    return { turY, tubeH, headY, tubeCenterY, tubeTopY, tubeBotY, Lscale, pts };
  }

  function buildMesh(optics, hover) {
    const data = [];
    const mag = optics.obj.mag;
    const { turY, tubeH, headY, tubeCenterY, tubeTopY, tubeBotY } = turretWorld(optics);

    // —— Horseshoe base (NOBOOK-style cast iron silhouette) ——
    const metal = [0.42, 0.45, 0.5];
    const metalDark = [0.22, 0.24, 0.28];
    box(0, 0.05, 0.08, 1.62, 0.1, 1.05, ...metalDark, data, 0.06);
    // rear heel
    box(0, 0.08, -0.42, 0.95, 0.12, 0.38, ...metal, data, 0.08);
    // front forks
    box(-0.48, 0.07, 0.38, 0.42, 0.1, 0.48, ...metal, data, 0.08);
    box(0.48, 0.07, 0.38, 0.42, 0.1, 0.48, ...metal, data, 0.08);
    cylinderY(0, 0.12, 0.05, 0.22, 0.06, 0.18, 0.2, 0.23, data, 24, true, 0.05);

    // —— Pillar + curved arm ——
    cylinderY(0.55, 0.55, 0, 0.09, 0.95, ...metal, data, 28, true, 0.15);
    // arm sweep (stacked offset cylinders ≈ C-arm)
    for (let i = 0; i < 7; i += 1) {
      const t = i / 6;
      const ax = 0.55 - t * 0.48;
      const ay = 1.05 + t * 0.42;
      const az = 0;
      cylinderY(ax, ay, az, 0.08 - t * 0.01, 0.16, ...metal, data, 20, true, 0.14);
    }
    box(0.18, 1.42, 0, 0.42, 0.14, 0.2, ...metal, data, 0.1);

    // —— Coarse + fine focus knobs (side of pillar) ——
    cylinderX(0.72, 0.72, 0, 0.11, 0.14, 0.55, 0.58, 0.62, data, 22, 0.22);
    cylinderX(0.78, 0.72, 0, 0.06, 0.08, 0.7, 0.72, 0.75, data, 18, 0.25);
    torusY(0.72, 0.72, 0, 0.095, 0.018, 0.35, 0.38, 0.42, data, 20, 8, 0.2);
    // opposite side twin
    cylinderX(0.38, 0.72, 0, 0.11, 0.14, 0.55, 0.58, 0.62, data, 22, 0.22);

    // —— Body tube (finite L) ——
    const tubeR = 0.115;
    cylinderY(0, tubeCenterY, 0, tubeR, tubeH, 0.55, 0.72, 0.88, data, 32, true, 0.2);
    // decorative rings on tube
    torusY(0, tubeCenterY + tubeH * 0.22, 0, tubeR + 0.005, 0.014, 0.75, 0.82, 0.9, data, 28, 8, 0.25);
    torusY(0, tubeCenterY - tubeH * 0.18, 0, tubeR + 0.005, 0.014, 0.75, 0.82, 0.9, data, 28, 8, 0.25);

    // —— Head / eyepiece tube ——
    cylinderY(0, tubeTopY + 0.12, 0, 0.085, 0.26, 0.62, 0.78, 0.95, data, 28, true, 0.22);
    // rubber eyecup
    frustumY(0, tubeTopY + 0.28, 0, 0.09, 0.07, 0.08, 0.12, 0.12, 0.14, data, 24, 0.05);
    cylinderY(0, tubeTopY + 0.34, 0, 0.055, 0.05, 0.08, 0.1, 0.14, data, 20, true, 0.08);

    // Eyepiece pick chips (clickable 5× / 10× / 15×)
    EYEPIECES.forEach((eye, i) => {
      const active = eye.id === optics.eye.id;
      const hovered = hover?.kind === 'eye' && hover.index === i;
      const x = (i - (EYEPIECES.length - 1) / 2) * 0.16;
      const y = tubeTopY + 0.42;
      const g = active ? 0.92 : hovered ? 0.78 : 0.48;
      const rb = active ? 0.38 : hovered ? 0.3 : 0.2;
      cylinderY(x, y, 0.22, 0.055, 0.07, rb, g, 0.88, data, 16, true, 0.18);
      if (active || hovered) {
        torusY(x, y + 0.04, 0.22, 0.07, 0.012, 0.55, 0.92, 1.0, data, 16, 8, 0.3);
      }
    });

    // Tube-length dimension line (mechanical L along the body tube)
    const dimX = -0.28;
    box(dimX, tubeCenterY, 0, 0.01, tubeH, 0.01, 0.95, 0.85, 0.35, data, 0.05);
    box(dimX, tubeTopY, 0, 0.1, 0.01, 0.01, 0.95, 0.85, 0.35, data, 0.05);
    box(dimX, tubeBotY, 0, 0.1, 0.01, 0.01, 0.95, 0.85, 0.35, data, 0.05);

    // —— Revolving nosepiece ——
    cylinderY(0, turY + 0.05, 0, 0.34, 0.12, 0.28, 0.62, 0.42, data, 36, true, 0.16);
    torusY(0, turY + 0.11, 0, 0.34, 0.025, 0.4, 0.78, 0.55, data, 36, 10, 0.22);
    torusY(0, turY + 0.02, 0, 0.28, 0.02, 0.22, 0.5, 0.35, data, 32, 8, 0.15);

    // Objective barrels (tapered, immersion gold band)
    OBJECTIVES.forEach((obj, i) => {
      const ang = -Math.PI / 2 + i * (Math.PI / 2);
      const active = obj.id === optics.obj.id;
      const hovered = hover?.kind === 'obj' && hover.index === i;
      const ox = Math.cos(ang) * 0.32;
      const oz = Math.sin(ang) * 0.32;
      const len = 0.22 + MagScale(obj.mag) * 0.05;
      const rTop = active ? 0.048 : 0.042;
      const rBot = active ? 0.038 : 0.032;
      const g = active ? 0.88 : hovered ? 0.72 : 0.48;
      const rb = active ? 0.35 : hovered ? 0.28 : 0.2;
      frustumY(ox, turY - len / 2 - 0.02, oz, rTop, rBot, len, rb, g, 0.42, data, 22, 0.2);
      // chrome collar
      cylinderY(ox, turY - 0.02, oz, rTop + 0.008, 0.04, 0.7, 0.74, 0.78, data, 18, true, 0.25);
      if (obj.immersion) {
        torusY(ox, turY - len - 0.01, oz, 0.05, 0.012, 0.92, 0.78, 0.22, data, 16, 8, 0.3);
      }
      if (active) {
        torusY(ox, turY + 0.04, oz, 0.11, 0.016, 0.5, 0.9, 1.0, data, 20, 8, 0.35);
      } else if (hovered) {
        torusY(ox, turY + 0.04, oz, 0.105, 0.014, 0.72, 0.92, 1.0, data, 18, 8, 0.3);
      }
    });

    // —— Stage + clips + aperture ——
    const objLen = 0.26 + MagScale(mag) * 0.055;
    const stageY = turY - objLen - 0.18;
    box(0, stageY, 0, 1.12, 0.055, 0.78, 0.32, 0.34, 0.38, data, 0.1);
    // stage plate polish ring
    torusY(0, stageY + 0.03, 0, 0.18, 0.02, 0.18, 0.18, 0.2, data, 28, 8, 0.08);
    cylinderY(0, stageY + 0.02, 0, 0.14, 0.02, 0.06, 0.06, 0.07, data, 24, true, 0.04);
    // specimen clips
    box(-0.28, stageY + 0.05, 0.12, 0.22, 0.02, 0.04, 0.75, 0.78, 0.82, data, 0.2);
    box(0.28, stageY + 0.05, 0.12, 0.22, 0.02, 0.04, 0.75, 0.78, 0.82, data, 0.2);
    cylinderY(-0.18, stageY + 0.06, 0.12, 0.025, 0.04, 0.55, 0.58, 0.62, data, 12, true, 0.15);
    cylinderY(0.18, stageY + 0.06, 0.12, 0.025, 0.04, 0.55, 0.58, 0.62, data, 12, true, 0.15);

    // —— Condenser stack + iris ——
    frustumY(0, stageY - 0.14, 0, 0.14, 0.1, 0.18, 0.4, 0.43, 0.48, data, 24, 0.14);
    torusY(0, stageY - 0.2, 0, 0.12, 0.018, 0.55, 0.58, 0.62, data, 24, 8, 0.2);
    cylinderY(0, stageY - 0.28, 0, 0.08, 0.1, 0.35, 0.38, 0.42, data, 20, true, 0.12);

    // —— Lamp house + collector ——
    box(0, stageY - 0.42, 0, 0.32, 0.16, 0.32, 0.58, 0.5, 0.28, data, 0.12);
    cylinderY(0, stageY - 0.34, 0, 0.1, 0.06, 0.95, 0.9, 0.55, data, 20, true, 0.35);
    // soft glow disc under stage (baked bright)
    cylinderY(0, stageY - 0.48, 0, 0.2, 0.04, 0.35, 0.32, 0.2, data, 20, true, 0.05);

    oilStageY = stageY + 0.05;
    oilActive = !!optics.immersion;
    return new Float32Array(data);
  }

  function hitRadiusPx(mvp, p, width, height) {
    const c = project(mvp, p.x, p.y, p.z, width, height);
    const e = project(mvp, p.x + 0.14, p.y, p.z, width, height);
    if (!c || !e) return 36;
    const r = Math.hypot(e.x - c.x, e.y - c.y);
    return Math.max(30, Math.min(58, r * 1.45));
  }

  function rebuildHits(mvp, width, height, optics) {
    const { pts } = turretWorld(optics);
    hits = [];
    for (const p of pts) {
      const s = project(mvp, p.x, p.y, p.z, width, height);
      if (!s) continue;
      hits.push({
        kind: p.kind,
        index: p.index,
        x: s.x,
        y: s.y,
        r: hitRadiusPx(mvp, p, width, height),
      });
    }
  }

  function pickAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(rect.width, 1)) * lastView.width;
    const y = ((clientY - rect.top) / Math.max(rect.height, 1)) * lastView.height;
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

  function applyHit(hit) {
    if (!lastState?.params || !hit) return false;
    if (hit.kind === 'obj') {
      lastState.params.objective = OBJECTIVES[hit.index].id;
      applyTurretDefaults(lastState, 'obj');
      lastState._lastObj = lastState.params.objective;
      lastState.pick = `obj-${OBJECTIVES[hit.index].mag}×`;
      opts.onPick?.(lastState);
      return true;
    }
    if (hit.kind === 'eye') {
      lastState.params.eyepiece = EYEPIECES[hit.index].id;
      applyTurretDefaults(lastState, 'eye');
      lastState._lastEye = lastState.params.eyepiece;
      lastState.pick = `eye-${EYEPIECES[hit.index].mag}×`;
      opts.onPick?.(lastState);
      return true;
    }
    return false;
  }

  const onDown = (ev) => {
    ev.preventDefault();
    dragging = true;
    moved = false;
    autoSpin = 0;
    lastX = ev.clientX;
    lastY = ev.clientY;
    try { canvas.setPointerCapture(ev.pointerId); } catch { /* ignore */ }
  };
  const onMove = (ev) => {
    if (dragging) {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      if (Math.hypot(dx, dy) > 3) moved = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
      yaw += dx * 0.006;
      pitch = Math.max(0.08, Math.min(1.25, pitch + dy * 0.005));
      opts.onViewChange?.();
      return;
    }
    const hit = pickAt(ev.clientX, ev.clientY);
    const nextKey = hit ? `${hit.kind}:${hit.index}` : '';
    const prevKey = hoverHit ? `${hoverHit.kind}:${hoverHit.index}` : '';
    if (nextKey !== prevKey) {
      hoverHit = hit ? { kind: hit.kind, index: hit.index } : null;
      lastKey = '';
      canvas.style.cursor = hit ? 'pointer' : 'grab';
      opts.onViewChange?.();
    }
  };
  const onUp = (ev) => {
    if (!dragging) return;
    dragging = false;
    try { canvas.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
    if (!moved) {
      const hit = pickAt(ev.clientX, ev.clientY);
      if (hit) applyHit(hit);
    }
    canvas.style.cursor = hoverHit ? 'pointer' : 'grab';
  };
  const onLeave = () => {
    if (hoverHit) {
      hoverHit = null;
      lastKey = '';
      canvas.style.cursor = 'grab';
      opts.onViewChange?.();
    }
  };
  const onWheel = (ev) => {
    ev.preventDefault();
    autoSpin = 0;
    const next = radius + Math.sign(ev.deltaY) * 0.18;
    radius = Math.max(1.8, Math.min(5.5, next));
    opts.onViewChange?.();
  };

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  function drawScene(state, view) {
    lastState = state;
    lastView = { width: view.width, height: view.height };
    const optics = opticsFromParams(state.params || {});
    const tSec = performance.now() * 0.001;
    if (prevImmersion !== null && prevImmersion !== !!optics.immersion) lastKey = '';
    prevImmersion = !!optics.immersion;
    const hoverKey = hoverHit ? `${hoverHit.kind}:${hoverHit.index}` : '-';
    const key = `${optics.obj.id}:${optics.eye.id}:${optics.Lmm}:${optics.immersion}:${optics.lambdaNm}:${hoverKey}:${view.width}x${view.height}`;
    const dpr = Math.min(window.devicePixelRatio || 1, Number(document.documentElement.dataset.dprCap) || 3);
    const bw = Math.max(1, Math.floor(view.width * dpr));
    const bh = Math.max(1, Math.floor(view.height * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      canvas.style.width = '';
      canvas.style.height = '';
    }
    gl.viewport(0, 0, bw, bh);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.012, 0.016, 0.022, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (key !== lastKey) {
      const mesh = buildMesh(optics, hoverHit);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
      vertCount = mesh.length / 6;
      lastKey = key;
    }

    if (!dragging && autoSpin) yaw += autoSpin * 0.016;

    const ex = Math.cos(yaw) * Math.cos(pitch) * radius;
    const ey = Math.sin(pitch) * radius + 0.4;
    const ez = Math.sin(yaw) * Math.cos(pitch) * radius;
    const aspect = view.width / Math.max(view.height, 1);
    const proj = perspective(36, aspect, 0.1, 24);
    const viewM = lookAt(ex, ey, ez, 0, 0.85, 0, 0, 1, 0);
    const mvp = multiply(proj, viewM);
    rebuildHits(mvp, view.width, view.height, optics);

    const tw = turretWorld(optics);
    const mid = project(mvp, -0.28, tw.tubeCenterY, 0, view.width, view.height);
    overlayLabels = [];
    if (mid) {
      overlayLabels.push({
        id: 'L',
        text: `L = ${Math.round(optics.Lmm)} mm`,
        x: mid.x,
        y: mid.y,
      });
    }
    for (const eye of EYEPIECES) {
      const i = EYEPIECES.indexOf(eye);
      const p = tw.pts.find((row) => row.kind === 'eye' && row.index === i);
      if (!p) continue;
      const s = project(mvp, p.x, p.y, p.z, view.width, view.height);
      if (!s) continue;
      overlayLabels.push({
        id: `eye-${eye.id}`,
        text: `${eye.mag}×`,
        x: s.x,
        y: s.y - 14,
        active: eye.id === optics.eye.id,
      });
    }

    gl.useProgram(prog);
    gl.uniformMatrix4fv(uMVP, false, mvp);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 24, 12);
    gl.drawArrays(gl.TRIANGLES, 0, vertCount);

    if (oilActive) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.useProgram(oilProg);
      gl.uniformMatrix4fv(oilUMVP, false, mvp);
      gl.uniform3f(oilUCenter, 0, oilStageY, 0);
      gl.uniform1f(oilUScale, 0.58);
      gl.uniform1f(oilUTime, tSec);
      gl.uniform1f(oilUImm, 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, oilBuf);
      gl.enableVertexAttribArray(oilAUv);
      gl.vertexAttribPointer(oilAUv, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
  }

  return {
    kind: 'webgl3d',
    draw(state, view) {
      drawScene(state, view);
    },
    getOverlayLabels() {
      return overlayLabels.slice();
    },
    capturePng(state, view) {
      drawScene(state, view);
      gl.finish();
      try {
        const href = canvas.toDataURL('image/png');
        if (!href || href === 'data:,' || href.length < 64) return '';
        return href;
      } catch {
        return '';
      }
    },
    dispose() {
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
      gl.deleteBuffer(buf);
      gl.deleteBuffer(oilBuf);
      gl.deleteProgram(prog);
      gl.deleteProgram(oilProg);
    },
  };
}
