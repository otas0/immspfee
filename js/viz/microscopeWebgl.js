/**
 * Single WebGL stage for the compound microscope (AGENTS: one 3D experience).
 * Reuses js/models/microscopeOptics.js params — no parallel physics.
 * Drag orbit · wheel zoom · click objectives / eyepieces (same semantics as 2D).
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

function box(cx, cy, cz, sx, sy, sz, r, g, b, out) {
  const hx = sx / 2; const hy = sy / 2; const hz = sz / 2;
  const v = [
    [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz],
    [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz], [-hx, -hy, -hz], [hx, hy, -hz], [hx, -hy, -hz],
    [-hx, hy, -hz], [-hx, hy, hz], [hx, hy, hz], [-hx, hy, -hz], [hx, hy, hz], [hx, hy, -hz],
    [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz],
    [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [hx, -hy, -hz], [hx, hy, hz], [hx, -hy, hz],
    [-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, -hy, -hz], [-hx, hy, hz], [-hx, hy, -hz],
  ];
  for (const [x, y, z] of v) {
    out.push(cx + x, cy + y, cz + z, r, g, b);
  }
}

/** Stacked discs ≈ cylinder along +Y. */
function cylinderY(cx, cy0, cz, radius, height, r, g, b, out, slices = 10, stacks = 4) {
  const hy = height / 2;
  for (let s = 0; s < stacks; s += 1) {
    const t0 = s / stacks;
    const t1 = (s + 1) / stacks;
    const y0 = cy0 - hy + t0 * height;
    const y1 = cy0 - hy + t1 * height;
    const midY = (y0 + y1) / 2;
    const segH = Math.max(height / stacks, 0.01);
    for (let i = 0; i < slices; i += 1) {
      const a0 = (i / slices) * Math.PI * 2;
      const a1 = ((i + 1) / slices) * Math.PI * 2;
      const x0 = cx + Math.cos(a0) * radius;
      const z0 = cz + Math.sin(a0) * radius;
      const x1 = cx + Math.cos(a1) * radius;
      const z1 = cz + Math.sin(a1) * radius;
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      const chord = Math.hypot(x1 - x0, z1 - z0) || radius * 0.4;
      box(mx, midY, mz, chord, segH, radius * 0.55, r, g, b, out);
    }
  }
}

function ring(cx, cy, cz, radius, thick, height, r, g, b, out, segs = 22) {
  for (let i = 0; i < segs; i += 1) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const x0 = cx + Math.cos(a0) * radius;
    const z0 = cz + Math.sin(a0) * radius;
    const x1 = cx + Math.cos(a1) * radius;
    const z1 = cz + Math.sin(a1) * radius;
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    const len = Math.hypot(x1 - x0, z1 - z0) || thick;
    box(mx, cy, mz, len, height, thick, r, g, b, out);
  }
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

    // Base plate + feet
    box(0, 0.04, 0.05, 1.55, 0.08, 0.95, 0.16, 0.18, 0.22, data);
    box(-0.55, 0.02, 0.28, 0.22, 0.04, 0.22, 0.12, 0.13, 0.15, data);
    box(0.55, 0.02, 0.28, 0.22, 0.04, 0.22, 0.12, 0.13, 0.15, data);
    box(0, 0.02, -0.35, 0.28, 0.04, 0.22, 0.12, 0.13, 0.15, data);

    // Arm / pillar
    cylinderY(0.52, 0.78, 0, 0.075, 1.45, 0.28, 0.32, 0.36, data, 12, 5);
    box(0.42, 1.35, 0, 0.35, 0.12, 0.18, 0.3, 0.34, 0.38, data);

    // Body tube (finite L scales height)
    cylinderY(0, tubeCenterY, 0, 0.11, tubeH, 0.2, 0.48, 0.62, data, 14, 6);
    // Eyepiece tube + ocular
    cylinderY(0, tubeTopY + 0.14, 0, 0.08, 0.28, 0.42, 0.7, 0.92, data, 12, 3);
    box(0, tubeTopY + 0.3, 0, 0.16, 0.06, 0.16, 0.55, 0.78, 0.95, data);

    // Eyepiece pick chips (clickable 5× / 10× / 15×)
    EYEPIECES.forEach((eye, i) => {
      const active = eye.id === optics.eye.id;
      const hovered = hover?.kind === 'eye' && hover.index === i;
      const x = (i - (EYEPIECES.length - 1) / 2) * 0.16;
      const y = tubeTopY + 0.42;
      const g = active ? 0.9 : hovered ? 0.75 : 0.45;
      const rb = active ? 0.35 : hovered ? 0.28 : 0.18;
      box(x, y, 0.22, 0.12, 0.06, 0.1, rb, g, 0.85, data);
      if (active || hovered) {
        ring(x, y + 0.04, 0.22, 0.08, 0.02, 0.015, 0.5, 0.9, 1.0, data, 12);
      }
    });

    // Tube-length dimension line (mechanical L along the body tube)
    const dimX = -0.28;
    box(dimX, tubeCenterY, 0, 0.012, tubeH, 0.012, 0.95, 0.85, 0.35, data);
    box(dimX, tubeTopY, 0, 0.1, 0.012, 0.012, 0.95, 0.85, 0.35, data);
    box(dimX, tubeBotY, 0, 0.1, 0.012, 0.012, 0.95, 0.85, 0.35, data);

    // Head / turret disk
    cylinderY(0, turY + 0.06, 0, 0.3, 0.1, 0.25, 0.55, 0.38, data, 16, 2);
    ring(0, turY + 0.12, 0, 0.3, 0.03, 0.025, 0.35, 0.7, 0.5, data);

    // Objective nose-pieces
    OBJECTIVES.forEach((obj, i) => {
      const ang = -Math.PI / 2 + i * (Math.PI / 2);
      const active = obj.id === optics.obj.id;
      const hovered = hover?.kind === 'obj' && hover.index === i;
      const ox = Math.cos(ang) * 0.32;
      const oz = Math.sin(ang) * 0.32;
      const len = 0.2 + MagScale(obj.mag) * 0.045;
      const taper = active ? 0.055 : 0.045;
      const g = active ? 0.92 : hovered ? 0.78 : 0.5;
      const rb = active ? 0.4 : hovered ? 0.3 : 0.18;
      cylinderY(ox, turY - len / 2 - 0.02, oz, taper, len, rb, g, 0.45, data, 10, 3);
      if (obj.immersion) {
        ring(ox, turY - len - 0.02, oz, 0.06, 0.02, 0.015, 0.9, 0.75, 0.2, data, 12);
      }
      if (active) {
        ring(ox, turY + 0.03, oz, 0.12, 0.028, 0.022, 0.45, 0.88, 1.0, data);
      } else if (hovered) {
        ring(ox, turY + 0.03, oz, 0.115, 0.022, 0.018, 0.72, 0.9, 1.0, data);
      }
    });

    // Stage + aperture
    const objLen = 0.24 + MagScale(mag) * 0.05;
    const stageY = turY - objLen - 0.2;
    box(0, stageY, 0, 1.05, 0.06, 0.72, 0.26, 0.28, 0.32, data);
    ring(0, stageY + 0.04, 0, 0.16, 0.03, 0.02, 0.12, 0.12, 0.14, data, 16);
    // Condenser + lamp house
    cylinderY(0, stageY - 0.18, 0, 0.12, 0.22, 0.35, 0.38, 0.42, data, 10, 3);
    box(0, stageY - 0.38, 0, 0.28, 0.14, 0.28, 0.55, 0.48, 0.22, data);

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
    // Immersion toggles must rebuild mesh + oil pass even if other key parts collide.
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
      canvas.style.width = `${view.width}px`;
      canvas.style.height = `${view.height}px`;
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
      // Preserve buffer: draw once, finish GPU, then encode (avoids black Safari exports).
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
