/**
 * Single WebGL stage for the compound microscope (AGENTS: one 3D experience).
 * Reuses js/models/microscopeOptics.js params — no parallel physics.
 * Layout-driven dual buffers · orbit / pinch zoom · drag knobs · click picks.
 */
import {
  OBJECTIVES,
  EYEPIECES,
  opticsFromParams,
  applyTurretDefaults,
  objectiveRingColor,
} from '../models/microscopeOptics.js';
import { buildMicroscopeSolid, meshStaticKey, meshDynamicKey } from './microscopeMeshBuild.js';
import { microscopeLayout, DRAG_KINDS, CLICK_KINDS } from './microscopeLayout.js';
import { mobileBudget } from '../utils/mobilePerf.js';

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

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
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
  const staticBuf = gl.createBuffer();
  const dynamicBuf = gl.createBuffer();

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

  let staticKey = '';
  let dynamicKey = '';
  let staticVertCount = 0;
  let dynamicVertCount = 0;
  let yaw = 0.85;
  let pitch = 0.22;
  const narrowStage = typeof matchMedia === 'function'
    && matchMedia('(max-width: 480px)').matches;
  let radius = narrowStage ? 9.4 : 7.5;
  /** @type {'orbit' | 'part' | null} */
  let dragMode = null;
  /** @type {{ kind: string, index: number } | null} */
  let partHit = null;
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
  let oilSlideX = 0;
  let oilSlideZ = 0;
  let oilActive = false;
  /** Screen-space labels refreshed each draw (L dimension + picks). */
  let overlayLabels = [];
  /** @type {Map<number, { x: number, y: number }>} */
  const pointers = new Map();
  let pinchDist = 0;

  function hitRadiusPx(mvp, p, width, height) {
    const rw = Math.max(0.04, Number(p.rWorld) || 0.12);
    const c = project(mvp, p.x, p.y, p.z, width, height);
    const e = project(mvp, p.x + rw, p.y, p.z, width, height);
    if (!c || !e) return 36;
    const r = Math.hypot(e.x - c.x, e.y - c.y);
    return Math.max(28, Math.min(64, r * 1.35));
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

  function notifyParams(meta = {}) {
    opts.onPick?.(lastState, meta);
  }

  function applyDrag(kind, dx, dy) {
    if (!lastState?.params) return;
    const p = lastState.params;
    const o = opticsFromParams(p);
    if (kind === 'focusCoarse') {
      p.focusZ_mm = clamp((Number(p.focusZ_mm) || 0) + dy * -0.028, -2, 2);
      p.WD_mm = clamp((Number(p.WD_mm) || o.WD) + dy * -0.09, 0.05, 25);
    } else if (kind === 'focusFine') {
      p.focusZ_mm = clamp((Number(p.focusZ_mm) || 0) + dy * -0.006, -2, 2);
      p.WD_mm = clamp((Number(p.WD_mm) || o.WD) + dy * -0.02, 0.05, 25);
    } else if (kind === 'stageX') {
      p.stageX_mm = clamp((Number(p.stageX_mm) || 0) + dx * 0.06, -15, 15);
    } else if (kind === 'stageY') {
      p.stageY_mm = clamp((Number(p.stageY_mm) || 0) + dy * -0.06, -10, 10);
    } else if (kind === 'condenser') {
      p.WD_mm = clamp((Number(p.WD_mm) || o.WD) + dy * -0.07, 0.05, 25);
    } else if (kind === 'iris') {
      p.NA = clamp((Number(p.NA) || o.NA) + dx * 0.0025, 0.05, o.NAcap);
    } else if (kind === 'fieldIris') {
      p.fieldIris = clamp((Number(p.fieldIris) || 0.55) + dx * 0.003, 0.1, 1);
    } else if (kind === 'tubeL') {
      p.tubeL_mm = clamp((Number(p.tubeL_mm) || 160) + dy * -0.2, 120, 200);
    } else {
      return;
    }
    notifyParams({ live: true });
  }

  function applyClick(hit) {
    if (!lastState?.params || !hit || !CLICK_KINDS.has(hit.kind)) return false;
    const p = lastState.params;
    if (hit.kind === 'obj') {
      const obj = OBJECTIVES[hit.index];
      if (!obj) return false;
      p.objective = obj.id;
      applyTurretDefaults(lastState, 'obj');
      lastState._lastObj = p.objective;
      lastState.pick = `obj-${obj.mag}×`;
      notifyParams();
      return true;
    }
    if (hit.kind === 'eye') {
      const eye = EYEPIECES[hit.index];
      if (!eye) return false;
      p.eyepiece = eye.id;
      applyTurretDefaults(lastState, 'eye');
      lastState._lastEye = p.eyepiece;
      lastState.pick = `eye-${eye.mag}×`;
      notifyParams();
      return true;
    }
    if (hit.kind === 'lamp') {
      p.lampOn = Number(p.lampOn) !== 0 ? 0 : 1;
      lastState.pick = p.lampOn ? 'lamp-on' : 'lamp-off';
      notifyParams();
      return true;
    }
    if (hit.kind === 'immersion') {
      if (p.objective === '100x') p.objective = '40x';
      else p.objective = '100x';
      applyTurretDefaults(lastState, 'obj');
      lastState._lastObj = p.objective;
      lastState.pick = p.objective === '100x' ? 'immersion-oil' : 'immersion-dry';
      notifyParams();
      return true;
    }
    if (hit.kind === 'clip') {
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
      dragMode = 'part';
      partHit = { kind: hit.kind, index: hit.index };
      canvas.style.cursor = 'ns-resize';
    } else {
      dragMode = 'orbit';
      partHit = null;
      canvas.style.cursor = 'grabbing';
    }
    try { canvas.setPointerCapture(ev.pointerId); } catch { /* ignore */ }
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
        opts.onViewChange?.();
      }
      pinchDist = dist;
      moved = true;
      return;
    }
    if (dragMode === 'part' && partHit) {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      if (Math.hypot(dx, dy) > 2) moved = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
      applyDrag(partHit.kind, dx, dy);
      return;
    }
    if (dragMode === 'orbit') {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      if (Math.hypot(dx, dy) > 3) moved = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
      yaw += dx * 0.006;
      pitch = clamp(pitch + dy * 0.005, 0.05, 1.15);
      opts.onViewChange?.();
      return;
    }
    const hit = pickAt(ev.clientX, ev.clientY);
    const nextKey = hit ? `${hit.kind}:${hit.index}` : '';
    const prevKey = hoverHit ? `${hoverHit.kind}:${hoverHit.index}` : '';
    if (nextKey !== prevKey) {
      hoverHit = hit ? { kind: hit.kind, index: hit.index } : null;
      canvas.style.cursor = hit ? 'pointer' : 'grab';
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
      dragMode = 'orbit';
      partHit = null;
      return;
    }
    pinchDist = 0;
    if (!dragMode) {
      canvas.style.cursor = hoverHit ? 'pointer' : 'grab';
      return;
    }
    const wasMode = dragMode;
    const wasPart = partHit;
    dragMode = null;
    partHit = null;
    try { canvas.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
    if (!moved && wasMode !== 'part') {
      const hit = pickAt(ev.clientX, ev.clientY);
      if (hit) applyClick(hit);
    } else if (!moved && wasMode === 'part' && wasPart && CLICK_KINDS.has(wasPart.kind)) {
      applyClick(wasPart);
    }
    canvas.style.cursor = hoverHit ? 'pointer' : 'grab';
  };

  const onUp = (ev) => endPointer(ev);
  const onCancel = (ev) => endPointer(ev);

  const onLeave = () => {
    if (dragMode) return;
    if (hoverHit) {
      hoverHit = null;
      canvas.style.cursor = 'grab';
      opts.onViewChange?.();
    }
  };

  const onWheel = (ev) => {
    ev.preventDefault();
    autoSpin = 0;
    radius = clamp(radius + Math.sign(ev.deltaY) * 0.22, 2.4, 12);
    opts.onViewChange?.();
  };

  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });

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
    const tSec = performance.now() * 0.001;

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
        { layout, tess, part: needStatic ? 'all' : 'dynamic' },
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

    if (!dragMode && pointers.size < 2 && autoSpin) yaw += autoSpin * 0.016;

    // Aim mid-head so Siedentopf ocular tips stay inside vertical FOV.
    const lookY = 2.05;
    const ex = Math.cos(yaw) * Math.cos(pitch) * radius;
    const ey = Math.sin(pitch) * radius + 0.2;
    const ez = Math.sin(yaw) * Math.cos(pitch) * radius;
    const aspect = view.width / Math.max(view.height, 1);
    const proj = perspective(38, aspect, 0.15, 56);
    const viewM = lookAt(ex, ey, ez, 0, lookY, 0, 0, 1, 0);
    const mvp = multiply(proj, viewM);
    rebuildHits(mvp, view.width, view.height, layout);

    overlayLabels = [];
    const tubeHit = layout.pts.find((row) => row.kind === 'tubeL');
    const Lpt = tubeHit
      ? project(mvp, tubeHit.x, tubeHit.y, tubeHit.z, view.width, view.height)
      : project(mvp, -0.28, layout.tubeCenterY, 0, view.width, view.height);
    if (Lpt) {
      overlayLabels.push({
        id: 'L',
        text: `L = ${Math.round(optics.Lmm)} mm`,
        x: Lpt.x,
        y: Lpt.y,
      });
    }
    for (const p of layout.pts) {
      if (p.kind === 'obj') {
        const obj = OBJECTIVES[p.index];
        if (!obj) continue;
        const s = project(mvp, p.x, p.y, p.z, view.width, view.height);
        if (!s) continue;
        overlayLabels.push({
          id: `obj-${obj.id}`,
          text: `${obj.mag}×`,
          x: s.x,
          y: s.y - 12,
          active: obj.id === optics.obj.id,
        });
      } else if (p.kind === 'eye') {
        const eye = EYEPIECES[p.index];
        if (!eye) continue;
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
    }

    gl.useProgram(prog);
    gl.uniformMatrix4fv(uMVP, false, mvp);
    drawBuffer(staticBuf, staticVertCount);
    drawBuffer(dynamicBuf, dynamicVertCount);

    if (oilActive) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.useProgram(oilProg);
      gl.uniformMatrix4fv(oilUMVP, false, mvp);
      gl.uniform3f(oilUCenter, oilSlideX, oilStageY, oilSlideZ);
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
    getHits() {
      return hits.slice();
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
      window.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
      gl.deleteBuffer(staticBuf);
      gl.deleteBuffer(dynamicBuf);
      gl.deleteBuffer(oilBuf);
      gl.deleteProgram(prog);
      gl.deleteProgram(oilProg);
      pointers.clear();
    },
  };
}
