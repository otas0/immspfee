/**
 * Single WebGL stage for the compound microscope (AGENTS: one 3D experience).
 * Reuses js/models/microscopeOptics.js params — no parallel physics.
 * Drag orbit · wheel zoom · click objectives / eyepieces (same semantics as 2D).
 *
 * The solid lives in microscopeMeshBuild.js (enamel + chrome, horseshoe,
 * 16-segment C-arm, Siedentopf head, DIN rings) — above a typical NOBOOK
 * teaching mesh. turretWorld stays here for picks; eye height is tubeTopY+0.52.
 */
import {
  OBJECTIVES,
  EYEPIECES,
  opticsFromParams,
  applyTurretDefaults,
  objectiveRingColor,
} from '../models/microscopeOptics.js';
import { buildMicroscopeSolid } from './microscopeMeshBuild.js';

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
        y: tubeTopY + 0.52,
        z: 0.22,
        id: eye.id,
      });
    });
    return { turY, tubeH, headY, tubeCenterY, tubeTopY, tubeBotY, Lscale, pts };
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
      const built = buildMicroscopeSolid(optics, hoverHit, OBJECTIVES, EYEPIECES, objectiveRingColor);
      oilStageY = built.oilStageY;
      oilActive = built.oilActive;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, built.data, gl.STATIC_DRAW);
      vertCount = built.data.length / 6;
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
