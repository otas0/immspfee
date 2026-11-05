/**
 * Single WebGL stage for the compound microscope (AGENTS: one 3D experience).
 * Reuses js/models/microscopeOptics.js params — no parallel physics.
 */
import { opticsFromParams } from '../models/microscopeOptics.js';

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

/**
 * @param {HTMLCanvasElement} canvas
 */
export function createMicroscopeWebgl(canvas) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
  if (!gl) return null;
  const prog = link(gl, VS, FS);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  const aCol = gl.getAttribLocation(prog, 'aCol');
  const uMVP = gl.getUniformLocation(prog, 'uMVP');
  const buf = gl.createBuffer();

  function buildMesh(optics) {
    const data = [];
    const mag = optics.obj.mag;
    const tubeH = 1.6 + MagScale(mag) * 0.15;
    box(0, 0.05, 0, 1.4, 0.08, 0.8, 0.22, 0.24, 0.28, data);
    box(0.45, 0.7, 0, 0.12, 1.3, 0.12, 0.32, 0.36, 0.4, data);
    box(0, 0.95, 0, 0.22, tubeH, 0.22, 0.18, 0.42, 0.58, data);
    box(0, 0.95 + tubeH / 2 + 0.12, 0, 0.28, 0.18, 0.28, 0.45, 0.72, 0.95, data);
    const turY = 0.95 - tubeH / 2 - 0.15;
    box(0, turY, 0, 0.55, 0.12, 0.55, 0.28, 0.62, 0.4, data);
    const objLen = 0.22 + MagScale(mag) * 0.04;
    box(0, turY - objLen / 2 - 0.02, 0, 0.1 + MagScale(mag) * 0.01, objLen, 0.1, 0.25, 0.78, 0.42, data);
    if (optics.immersion) {
      box(0, turY - objLen - 0.08, 0, 0.22, 0.05, 0.22, 0.35, 0.65, 0.95, data);
    }
    box(0, turY - objLen - 0.16, 0, 0.95, 0.05, 0.62, 0.3, 0.32, 0.36, data);
    return new Float32Array(data);
  }

  function MagScale(m) {
    return Math.log10(Math.max(4, m));
  }

  let lastKey = '';
  let vertCount = 0;
  let yaw = 0.55;
  let pitch = 0.42;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let autoSpin = 0.12;

  const onDown = (ev) => {
    dragging = true;
    autoSpin = 0;
    lastX = ev.clientX;
    lastY = ev.clientY;
  };
  const onMove = (ev) => {
    if (!dragging) return;
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    yaw += dx * 0.005;
    pitch = Math.max(0.12, Math.min(1.15, pitch + dy * 0.004));
  };
  const onUp = () => { dragging = false; };
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  return {
    kind: 'webgl3d',
    draw(state, view) {
      const optics = opticsFromParams(state.params || {});
      const key = `${optics.obj.id}:${optics.eye.id}:${optics.immersion}:${view.width}x${view.height}`;
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
        const mesh = buildMesh(optics);
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
