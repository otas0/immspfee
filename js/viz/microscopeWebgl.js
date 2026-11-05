/**
 * Single WebGL stage for the compound microscope (AGENTS: one 3D experience).
 * Reuses js/models/microscopeOptics.js params — no parallel physics.
 * Turret picks share onPointer semantics with the 2D structure sketch.
 */
import {
  OBJECTIVES,
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
 * @param {{ onPick?: (state: object) => void }} [opts]
 */
export function createMicroscopeWebgl(canvas, opts = {}) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const prog = link(gl, VS, FS);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  const aCol = gl.getAttribLocation(prog, 'aCol');
  const uMVP = gl.getUniformLocation(prog, 'uMVP');
  const buf = gl.createBuffer();

  let lastKey = '';
  let vertCount = 0;
  let yaw = 0.55;
  let pitch = 0.42;
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let autoSpin = 0.12;
  let hits = [];
  let lastMvp = null;
  let lastView = { width: 1, height: 1 };
  let lastState = null;

  function turretWorld(optics) {
    const mag = optics.obj.mag;
    const tubeH = 1.6 + MagScale(mag) * 0.15;
    const turY = 0.95 - tubeH / 2 - 0.15;
    const pts = [];
    OBJECTIVES.forEach((obj, i) => {
      const ang = -Math.PI / 2 + i * (Math.PI / 2);
      pts.push({
        kind: 'obj',
        index: i,
        x: Math.cos(ang) * 0.28,
        y: turY,
        z: Math.sin(ang) * 0.28,
        id: obj.id,
      });
    });
    return { turY, tubeH, pts };
  }

  function buildMesh(optics, tSec) {
    const data = [];
    const mag = optics.obj.mag;
    const { turY, tubeH } = turretWorld(optics);
    box(0, 0.05, 0, 1.4, 0.08, 0.8, 0.22, 0.24, 0.28, data);
    box(0.45, 0.7, 0, 0.12, 1.3, 0.12, 0.32, 0.36, 0.4, data);
    box(0, 0.95, 0, 0.22, tubeH, 0.22, 0.18, 0.42, 0.58, data);
    box(0, 0.95 + tubeH / 2 + 0.12, 0, 0.28, 0.18, 0.28, 0.45, 0.72, 0.95, data);
    box(0, turY, 0, 0.55, 0.12, 0.55, 0.28, 0.62, 0.4, data);
    OBJECTIVES.forEach((obj, i) => {
      const ang = -Math.PI / 2 + i * (Math.PI / 2);
      const active = obj.id === optics.obj.id;
      const ox = Math.cos(ang) * 0.28;
      const oz = Math.sin(ang) * 0.28;
      const len = 0.18 + MagScale(obj.mag) * 0.03;
      const g = active ? 0.85 : 0.55;
      box(ox, turY - len / 2 - 0.02, oz, 0.08, len, 0.08, 0.2, g, 0.4, data);
    });
    const objLen = 0.22 + MagScale(mag) * 0.04;
    const stageY = turY - objLen - 0.16;
    box(0, stageY, 0, 0.95, 0.05, 0.62, 0.3, 0.32, 0.36, data);
    if (optics.immersion) {
      const pulse = 0.04 + 0.02 * Math.sin(tSec * 3.2);
      const glow = 0.55 + 0.25 * (0.5 + 0.5 * Math.sin(tSec * 2.4));
      box(0, stageY + 0.04 + pulse / 2, 0, 0.26, 0.035 + pulse, 0.26, 0.25, 0.55, glow, data);
    }
    return new Float32Array(data);
  }

  function rebuildHits(mvp, width, height, optics) {
    const { pts } = turretWorld(optics);
    hits = [];
    for (const p of pts) {
      const s = project(mvp, p.x, p.y, p.z, width, height);
      if (!s) continue;
      hits.push({ kind: p.kind, index: p.index, x: s.x, y: s.y, r: 28 });
    }
  }

  function pickAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(rect.width, 1)) * lastView.width;
    const y = ((clientY - rect.top) / Math.max(rect.height, 1)) * lastView.height;
    for (const h of hits) {
      if (Math.hypot(x - h.x, y - h.y) <= h.r) return h;
    }
    return null;
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
    return false;
  }

  const onDown = (ev) => {
    dragging = true;
    moved = false;
    autoSpin = 0;
    lastX = ev.clientX;
    lastY = ev.clientY;
  };
  const onMove = (ev) => {
    if (!dragging) return;
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    if (Math.hypot(dx, dy) > 4) moved = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
    yaw += dx * 0.005;
    pitch = Math.max(0.12, Math.min(1.15, pitch + dy * 0.004));
  };
  const onUp = (ev) => {
    if (!dragging) return;
    dragging = false;
    if (!moved) {
      const hit = pickAt(ev.clientX, ev.clientY);
      if (hit) applyHit(hit);
    }
  };
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  return {
    kind: 'webgl3d',
    draw(state, view) {
      lastState = state;
      lastView = { width: view.width, height: view.height };
      const optics = opticsFromParams(state.params || {});
      const tSec = performance.now() * 0.001;
      const oilTick = optics.immersion ? Math.floor(tSec * 8) : 0;
      const key = `${optics.obj.id}:${optics.eye.id}:${optics.immersion}:${oilTick}:${view.width}x${view.height}`;
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
        const mesh = buildMesh(optics, tSec);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
        vertCount = mesh.length / 6;
        lastKey = key;
      }

      if (!dragging && autoSpin) yaw += autoSpin * 0.016;

      const radius = 3.05;
      const ex = Math.cos(yaw) * Math.cos(pitch) * radius;
      const ey = Math.sin(pitch) * radius + 0.35;
      const ez = Math.sin(yaw) * Math.cos(pitch) * radius;
      const aspect = view.width / Math.max(view.height, 1);
      const proj = perspective(38, aspect, 0.1, 20);
      const viewM = lookAt(ex, ey, ez, 0, 0.72, 0, 0, 1, 0);
      const mvp = multiply(proj, viewM);
      lastMvp = mvp;
      rebuildHits(mvp, view.width, view.height, optics);

      gl.useProgram(prog);
      gl.uniformMatrix4fv(uMVP, false, mvp);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.enableVertexAttribArray(aCol);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
      gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 24, 12);
      gl.drawArrays(gl.TRIANGLES, 0, vertCount);
    },
    dispose() {
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    },
  };
}
