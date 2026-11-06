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

/** Immersion oil disc — pulse driven only by uImmersion + uTime (optics.immersion). */
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
  float pulse = 0.55 + 0.35 * sin(uTime * 3.1 + r * 4.0);
  float edge = smoothstep(1.0, 0.55, r);
  float sheen = smoothstep(0.15, 0.0, abs(r - 0.35 - 0.08 * sin(uTime * 2.2)));
  vec3 col = mix(vec3(0.18, 0.42, 0.62), vec3(0.55, 0.82, 1.0), sheen);
  float alpha = edge * pulse * 0.72;
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

/** Flat ring around an objective (hover / selected). */
function ring(cx, cy, cz, radius, thick, height, r, g, b, out, segs = 20) {
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
  let yaw = 0.55;
  let pitch = 0.42;
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let autoSpin = 0.12;
  let hits = [];
  let lastView = { width: 1, height: 1 };
  let lastState = null;
  let hoverIndex = -1;
  let oilStageY = 0.4;
  let oilActive = false;

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

  function buildMesh(optics, hover) {
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
      const hovered = i === hover;
      const ox = Math.cos(ang) * 0.28;
      const oz = Math.sin(ang) * 0.28;
      const len = 0.18 + MagScale(obj.mag) * 0.03;
      const g = active ? 0.9 : hovered ? 0.75 : 0.55;
      const rb = active ? 0.35 : hovered ? 0.28 : 0.2;
      box(ox, turY - len / 2 - 0.02, oz, 0.08, len, 0.08, rb, g, 0.42, data);
      if (active) {
        ring(ox, turY + 0.02, oz, 0.11, 0.025, 0.02, 0.45, 0.85, 1.0, data);
      } else if (hovered) {
        ring(ox, turY + 0.02, oz, 0.105, 0.02, 0.016, 0.7, 0.88, 1.0, data);
      }
    });
    const objLen = 0.22 + MagScale(mag) * 0.04;
    const stageY = turY - objLen - 0.16;
    box(0, stageY, 0, 0.95, 0.05, 0.62, 0.3, 0.32, 0.36, data);
    oilStageY = stageY + 0.045;
    oilActive = !!optics.immersion;
    return new Float32Array(data);
  }

  function hitRadiusPx(mvp, p, width, height) {
    const c = project(mvp, p.x, p.y, p.z, width, height);
    const e = project(mvp, p.x + 0.12, p.y, p.z, width, height);
    if (!c || !e) return 32;
    const r = Math.hypot(e.x - c.x, e.y - c.y);
    return Math.max(26, Math.min(52, r * 1.35));
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
    if (dragging) {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      if (Math.hypot(dx, dy) > 4) moved = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
      yaw += dx * 0.005;
      pitch = Math.max(0.12, Math.min(1.15, pitch + dy * 0.004));
      return;
    }
    const hit = pickAt(ev.clientX, ev.clientY);
    const next = hit ? hit.index : -1;
    if (next !== hoverIndex) {
      hoverIndex = next;
      lastKey = '';
      canvas.style.cursor = next >= 0 ? 'pointer' : 'grab';
    }
  };
  const onUp = (ev) => {
    if (!dragging) return;
    dragging = false;
    if (!moved) {
      const hit = pickAt(ev.clientX, ev.clientY);
      if (hit) applyHit(hit);
    }
    canvas.style.cursor = hoverIndex >= 0 ? 'pointer' : 'grab';
  };
  const onLeave = () => {
    if (hoverIndex !== -1) {
      hoverIndex = -1;
      lastKey = '';
      canvas.style.cursor = 'grab';
    }
  };
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);

  function drawScene(state, view) {
    lastState = state;
    lastView = { width: view.width, height: view.height };
    const optics = opticsFromParams(state.params || {});
    const tSec = performance.now() * 0.001;
    const key = `${optics.obj.id}:${optics.eye.id}:${optics.immersion}:${hoverIndex}:${view.width}x${view.height}`;
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
      const mesh = buildMesh(optics, hoverIndex);
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
    rebuildHits(mvp, view.width, view.height, optics);

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
      gl.uniform1f(oilUScale, 0.34);
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
    /** Force one preserved frame then return a PNG data URL (no black exports). */
    capturePng(state, view) {
      drawScene(state, view);
      gl.finish();
      try {
        return canvas.toDataURL('image/png');
      } catch {
        return '';
      }
    },
    dispose() {
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      gl.deleteBuffer(buf);
      gl.deleteBuffer(oilBuf);
      gl.deleteProgram(prog);
      gl.deleteProgram(oilProg);
    },
  };
}
