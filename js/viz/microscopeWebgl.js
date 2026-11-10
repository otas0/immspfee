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
  focusStatus,
  clampObjectiveGap,
  stepWdTween,
} from '../models/microscopeOptics.js';
import { buildMicroscopeSolid, meshStaticKey, meshDynamicKey } from './microscopeMeshBuild.js';
import { activityCollarWorld, microscopeLayout, DRAG_KINDS, CLICK_KINDS } from './microscopeLayout.js';
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
 * Standing captions vs one temporary hover caption.
 * showLabels off + a hot pick → hover caption only.
 * showLabels on → standing captions.
 */
export function overlayCaptionPolicy({ showLabels = 1, hot = false } = {}) {
  const standing = Number(showLabels) !== 0;
  return {
    standing,
    hoverCaption: !standing && !!hot,
  };
}

/** Named viewpoints — free orbit or snap-to-fixed. Eye = look + yaw/pitch/radius offset. */
export const CAMERA_VIEWS = {
  free: null,
  overview: { yaw: 0.85, pitch: 0.22, radius: 7.5, lookX: 0, lookY: 2.05, lookZ: 0 },
  binocular: { yaw: 0.18, pitch: 0.58, radius: 4.35, lookX: 0, lookY: 2.55, lookZ: 0 },
  turret: { yaw: -Math.PI / 2, pitch: 0.36, radius: 5.4, lookX: 0, lookY: 1.55, lookZ: 0 },
  stage: { yaw: -Math.PI / 2 + 0.28, pitch: 0.82, radius: 4.7, lookX: 0, lookY: 0.95, lookZ: 0 },
  lamp: { yaw: 0.62, pitch: 0.2, radius: 3.55, lookX: 0, lookY: 0.32, lookZ: 0.02 },
  condenser: { yaw: 1.05, pitch: 0.48, radius: 3.35, lookX: 0.06, lookY: 0.58, lookZ: 0.04 },
  side: { yaw: 0.02, pitch: 0.18, radius: 8.1, lookX: 0, lookY: 1.35, lookZ: -0.04 },
};

/** Digit keys 0–7 snap to viewpoint ids. Home also snaps overview. */
export const VIEW_HOTKEYS = {
  0: 'free',
  1: 'overview',
  2: 'binocular',
  3: 'turret',
  4: 'stage',
  5: 'lamp',
  6: 'condenser',
  7: 'side',
};

/** Capture-stage methods Playwright / suite must keep (API regression guard). */
export const STAGE_CAPTURE_KEYS = Object.freeze([
  'getMeshDynamicKey',
  'getHeldCameraKeys',
  'getActivityRing',
  'getCameraState',
  'setCameraView',
  'handleCameraKey',
  'getOilBlend',
  'oilVisible',
  'getOilScreen',
]);

/** Physical keys held for dolly / yaw / crane / pitch / strafe. Shift is separate. */
export const CAMERA_HOLD = {
  KeyW: 'dollyIn',
  ArrowUp: 'dollyIn',
  Equal: 'dollyIn',
  NumpadAdd: 'dollyIn',
  KeyS: 'dollyOut',
  ArrowDown: 'dollyOut',
  Minus: 'dollyOut',
  NumpadSubtract: 'dollyOut',
  KeyA: 'yawLeft',
  ArrowLeft: 'yawLeft',
  KeyD: 'yawRight',
  ArrowRight: 'yawRight',
  KeyQ: 'craneUp',
  KeyE: 'craneDown',
  KeyR: 'pitchUp',
  KeyF: 'pitchDown',
  KeyZ: 'strafeLeft',
  KeyC: 'strafeRight',
};

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ onPick?: (state: object) => void, onViewChange?: () => void, t?: (key: string) => string, onCameraView?: (id: string) => void }} [opts]
 */
export function createMicroscopeWebgl(canvas, opts = {}) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const tFn = typeof opts.t === 'function' ? opts.t : (k) => k;
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
  const narrowStage = typeof matchMedia === 'function'
    && matchMedia('(max-width: 480px)').matches;
  // Narrow: face the −Z optical axis so the magenta activity collar fills the FOV.
  let yaw = narrowStage ? -Math.PI / 2 : 0.85;
  let pitch = narrowStage ? 0.32 : 0.22;
  let radius = narrowStage ? 9.4 : 7.5;
  let lookX = 0;
  let lookY = 2.05;
  let lookZ = 0;
  /** @type {keyof typeof CAMERA_VIEWS} */
  let cameraView = 'free';
  let viewLocked = false;
  /** @type {Set<string>} */
  const heldKeys = new Set();
  const onCamBlur = () => { heldKeys.clear(); };
  window.addEventListener('blur', onCamBlur);
  /** @type {'orbit' | 'part' | null} */
  let dragMode = null;
  /** @type {{ kind: string, index: number } | null} */
  let partHit = null;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let autoSpin = 0;

  function markFreeView() {
    if (cameraView === 'free' && !viewLocked) return;
    cameraView = 'free';
    viewLocked = false;
    opts.onCameraView?.('free');
  }

  function applyCameraView(id) {
    const key = CAMERA_VIEWS[id] !== undefined ? id : 'free';
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

  /**
   * Integrate held WASD / arrows / QE / RF / ZC / +/-.
   * Does not call onViewChange — drawScene already owns the frame (no paint recursion).
   * @param {number} dt seconds
   */
  function applyHeldCamera(dt) {
    if (!heldKeys.size || !(dt > 0)) return false;
    const fine = heldKeys.has('shift') ? 0.25 : 1;
    const step = dt * fine;
    let movedCam = false;
    const dolly = (heldKeys.has('dollyOut') ? 1 : 0) - (heldKeys.has('dollyIn') ? 1 : 0);
    if (dolly) {
      radius = clamp(radius + dolly * 2.4 * step, 2.4, 12);
      movedCam = true;
    }
    const yawDir = (heldKeys.has('yawRight') ? 1 : 0) - (heldKeys.has('yawLeft') ? 1 : 0);
    if (yawDir) {
      yaw += yawDir * 1.15 * step;
      movedCam = true;
    }
    const crane = (heldKeys.has('craneUp') ? 1 : 0) - (heldKeys.has('craneDown') ? 1 : 0);
    if (crane) {
      lookY = clamp(lookY + crane * 0.95 * step, -0.4, 4.2);
      movedCam = true;
    }
    const pitchDir = (heldKeys.has('pitchUp') ? 1 : 0) - (heldKeys.has('pitchDown') ? 1 : 0);
    if (pitchDir) {
      pitch = clamp(pitch + pitchDir * 0.55 * step, 0.05, 1.15);
      movedCam = true;
    }
    const strafe = (heldKeys.has('strafeRight') ? 1 : 0) - (heldKeys.has('strafeLeft') ? 1 : 0);
    if (strafe) {
      const s = strafe * 1.35 * step;
      lookX = clamp(lookX + Math.sin(yaw) * s, -4, 4);
      lookZ = clamp(lookZ - Math.cos(yaw) * s, -4, 4);
      movedCam = true;
    }
    if (movedCam) markFreeView();
    return movedCam;
  }

  /**
   * keydown / keyup. Digits snap presets, Home = overview, Space toggles autoSpin.
   * @param {KeyboardEvent} e
   * @returns {boolean} true when the microscope consumed the key
   */
  function handleCameraKey(e) {
    const down = e.type !== 'keyup';
    if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      if (down) heldKeys.add('shift');
      else heldKeys.delete('shift');
      return false;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return false;
    const snapId = VIEW_HOTKEYS[e.key];
    if (snapId || e.key === 'Home' || e.key === ' ' || e.code === 'Space') {
      if (!down) return false;
      e.preventDefault();
      if (e.repeat) return true;
      if (e.key === ' ' || e.code === 'Space') {
        autoSpin = autoSpin ? 0 : 0.06;
        return true;
      }
      applyCameraView(e.key === 'Home' ? 'overview' : snapId);
      return true;
    }
    const action = CAMERA_HOLD[e.code];
    if (!action) return false;
    if (down) {
      heldKeys.add(action);
      // One-shot so a tap still moves before the next rAF/draw.
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
  /** @type {{ kind: string, index: number } | null} */
  let hoverHit = null;
  let oilStageY = 0.4;
  let oilSlideX = 0;
  let oilSlideZ = 0;
  let oilActive = false;
  /** 0..1 linear blend toward real immersion (rise 0.45 s, fall 0.32 s). */
  const OIL_RISE_SEC = 0.45;
  const OIL_FALL_SEC = 0.32;
  let oilBlend = 0;
  let oilRiseElapsed = 0;
  let oilFallElapsed = 0;
  /** Previous immersion aim (0 dry / 1 oil) so a new rise restarts the clock. */
  let oilAim = 0;
  let lastOilT = 0;
  let lastMvp = null;
  let lastLayout = null;
  /** Screen-space labels refreshed each draw (L dimension + picks). */
  let overlayLabels = [];
  /** @type {Map<number, { x: number, y: number }>} */
  const pointers = new Map();
  let pinchDist = 0;

  function hitRadiusPx(mvp, p, width, height) {
    const rw = Math.max(0.04, Number(p.rWorld) || 0.12);
    const c = project(mvp, p.x, p.y, p.z, width, height);
    const e = project(mvp, p.x + rw, p.y, p.z, width, height);
    const dpr = Math.min(window.devicePixelRatio || 1, Number(document.documentElement.dataset.dprCap) || 3);
    const narrow = narrowStage || width <= 420;
    // Narrow / retina: larger CSS-px floors so 390 picks stay fat-finger friendly.
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
      w: Math.max(28, String(lab.text || '').length * (lab.role === 'din' ? 5.5 : 7.2)),
      h: lab.role === 'din' ? 12 : lab.role === 'knob' ? 14 : 16,
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
            const push = ((ea.h + eb.h) * 0.55 - dy) + 2 + pass;
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
      // Coarse focus screw: large change in objective–stage gap (WD).
      p.focusZ_mm = clamp((Number(p.focusZ_mm) || 0) + dy * -0.035, -2, 2);
      const next = clampObjectiveGap(p, (Number(p.WD_mm) || o.WD) + dy * -0.14);
      p.WD_mm = next.WD_mm;
      lastState._crashWarn = next.atCrash || next.nearCrash;
    } else if (kind === 'focusFine') {
      // Fine focus screw: small gap change; WD still moves when focusZ saturates.
      const z0 = Number(p.focusZ_mm) || 0;
      p.focusZ_mm = clamp(z0 + dy * -0.008, -2, 2);
      const next = clampObjectiveGap(p, (Number(p.WD_mm) || o.WD) + dy * -0.028);
      p.WD_mm = next.WD_mm;
      lastState._crashWarn = next.atCrash || next.nearCrash;
    } else if (kind === 'stageX') {
      p.stageX_mm = clamp((Number(p.stageX_mm) || 0) + dx * 0.06, -15, 15);
    } else if (kind === 'stageY') {
      p.stageY_mm = clamp((Number(p.stageY_mm) || 0) + dy * -0.06, -10, 10);
    } else if (kind === 'condenser') {
      // Condenser height only — does not replace coarse/fine stage focus.
      p.condenser_mm = clamp((Number(p.condenser_mm) || 0) + dy * -0.08, -3, 3);
    } else if (kind === 'iris') {
      p.NA = clamp((Number(p.NA) || o.NA) + dx * 0.0025, 0.05, o.NAcap);
    } else if (kind === 'fieldIris') {
      p.fieldIris = clamp((Number(p.fieldIris) || 0.55) + dx * 0.003, 0.1, 1);
    } else if (kind === 'interpupillary') {
      p.interpupillary_mm = clamp((Number(p.interpupillary_mm) || 64) + dx * 0.08, 50, 75);
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
      applyTurretDefaults(lastState, 'obj', { animate: true });
      lastState._lastObj = p.objective;
      lastState.pick = `obj-${obj.mag}×`;
      notifyParams({ live: true });
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
      applyTurretDefaults(lastState, 'obj', { animate: true });
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
        markFreeView();
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
      if (viewLocked) {
        markFreeView();
      }
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
      // Hovering any interactive part kills auto-orbit so knobs stay grab-stable.
      if (hit && (DRAG_KINDS.has(hit.kind) || CLICK_KINDS.has(hit.kind))) autoSpin = 0;
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
    markFreeView();
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

  let lastDrawMs = performance.now();

  function drawScene(state, view) {
    lastState = state;
    lastView = { width: view.width, height: view.height };
    const now = performance.now();
    const frameDt = Math.min(0.05, Math.max(0, (now - lastDrawMs) / 1000));
    lastDrawMs = now;
    if (stepWdTween(state, frameDt)) notifyParams({ live: true });
    const params = state.params || {};
    const optics = opticsFromParams(params);
    const layout = microscopeLayout(optics, params);
    const focus = focusStatus(params);
    state._focusStatus = focus;
    const tess = mobileBudget().microTess ?? 1;
    const tSec = now * 0.001;

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
    // Linear drip toward the real immersion flag (100× oil / dry). Not exponential.
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

    const hoverBusy = hoverHit
      && (DRAG_KINDS.has(hoverHit.kind) || CLICK_KINDS.has(hoverHit.kind));
    const camDt = dt;
    if (!viewLocked && !dragMode && pointers.size < 2 && autoSpin && !hoverBusy) {
      yaw += autoSpin * camDt;
    }
    // Held keys move the camera inside this draw. No onViewChange — that would re-enter paint.
    if (dragMode !== 'part') applyHeldCamera(camDt);

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
    const dragHot = dragMode === 'part' && partHit ? partHit : null;
    const pointerHot = dragHot || hoverHit;
    const hotMatch = (kind, index = 0) => !!(
      pointerHot
      && pointerHot.kind === kind
      && (pointerHot.index == null || pointerHot.index === index)
    );
    const knobLabels = {
      focusCoarse: tFn('ui.microKnobCoarse'),
      focusFine: tFn('ui.microKnobFine'),
      stageX: tFn('ui.microKnobStageX'),
      stageY: tFn('ui.microKnobStageY'),
      condenser: tFn('ui.microKnobCondenser'),
      iris: tFn('ui.microKnobIris'),
      fieldIris: tFn('ui.microKnobFieldIris'),
      lamp: tFn('ui.microKnobLamp'),
      interpupillary: tFn('ui.microKnobIPD'),
      immersion: tFn('ui.microKnobOil'),
      clip: tFn('ui.microKnobClip'),
    };
    const caption = overlayCaptionPolicy({
      showLabels: params.showLabels,
      hot: !!pointerHot,
    });
    if (caption.standing) {
      // Design tube length caption only (not a focus control).
      const Lpt = project(mvp, -0.28, layout.tubeCenterY, 0, view.width, view.height);
      if (Lpt) {
        overlayLabels.push({
          id: 'L',
          text: `L = ${Math.round(optics.Lmm)} mm (fixed)`,
          x: Lpt.x,
          y: Lpt.y,
        });
      }
      const shownKnob = new Set();
      for (const p of layout.pts) {
        if (p.kind === 'obj') {
          const obj = OBJECTIVES[p.index];
          if (!obj) continue;
          const s = project(mvp, p.x, p.y, p.z, view.width, view.height);
          if (!s) continue;
          const ring = objectiveRingColor(obj.mag);
          // Compact DIN sticker near the ring + name caption above.
          overlayLabels.push({
            id: `din-${obj.id}`,
            text: String(obj.mag),
            x: s.x,
            y: s.y + 6,
            active: obj.id === optics.obj.id,
            ring: ring.hex,
            role: 'din',
          });
          overlayLabels.push({
            id: `obj-${obj.id}`,
            text: `${obj.mag}× ${ring.name}`,
            x: s.x,
            y: s.y - 18,
            active: obj.id === optics.obj.id,
            ring: ring.hex,
            role: 'obj',
          });
        } else if (p.kind === 'eye') {
          const eye = EYEPIECES[p.index];
          if (!eye) continue;
          const s = project(mvp, p.x, p.y, p.z, view.width, view.height);
          if (!s) continue;
          overlayLabels.push({
            id: `eye-${eye.id}`,
            text: `Eye ${eye.mag}×`,
            x: s.x,
            y: s.y - 14,
            active: eye.id === optics.eye.id,
            role: 'eye',
          });
        } else if (knobLabels[p.kind] != null) {
          const key = p.kind === 'clip' ? `clip-${p.index}` : p.kind;
          if (shownKnob.has(key)) continue;
          const primary = p.kind === 'focusCoarse' || p.kind === 'focusFine'
            || p.kind === 'stageX' || p.kind === 'stageY'
            || p.kind === 'iris' || p.kind === 'lamp' || p.kind === 'condenser'
            || p.kind === 'interpupillary';
          const hot = (hoverHit && hoverHit.kind === p.kind)
            || (partHit && partHit.kind === p.kind);
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
            role: 'knob',
          });
        }
      }
      overlayLabels = resolveLabelCollisions(overlayLabels);
    } else if (caption.hoverCaption) {
      // Standing captions are off; hover and knob-drag still get one temporary label.
      const p = (layout.pts || []).find((row) => hotMatch(row.kind, row.index));
      if (p) {
        const s = project(mvp, p.x, p.y, p.z, view.width, view.height);
        if (s) {
          if (p.kind === 'obj') {
            const obj = OBJECTIVES[p.index];
            if (obj) {
              const ring = objectiveRingColor(obj.mag);
              overlayLabels.push({
                id: `obj-${obj.id}`,
                text: `${obj.mag}× ${ring.name}`,
                x: s.x,
                y: s.y - 18,
                active: true,
                ring: ring.hex,
                role: 'obj',
              });
            }
          } else if (p.kind === 'eye') {
            const eye = EYEPIECES[p.index];
            if (eye) {
              overlayLabels.push({
                id: `eye-${eye.id}`,
                text: `Eye ${eye.mag}×`,
                x: s.x,
                y: s.y - 14,
                active: true,
                role: 'eye',
              });
            }
          } else if (knobLabels[p.kind]) {
            const key = p.kind === 'clip' ? `clip-${p.index}` : p.kind;
            overlayLabels.push({
              id: `knob-${key}`,
              text: knobLabels[p.kind],
              x: s.x,
              y: s.y + 16,
              active: true,
              role: 'knob',
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
      // Film sits on the cover slip; draw it over the stage so the tint stays readable.
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
        viewLocked,
      };
    },
    /** Last meshDynamicKey after draw (NA / irisOpen / turret rebuild fingerprint). */
    getMeshDynamicKey() {
      return dynamicKey;
    },
    /** World Y of the stage after last draw (coarse focus moves this). */
    getLayoutStageY() {
      return lastLayout?.stageY ?? null;
    },
    getFocusStatus() {
      return lastState?._focusStatus || focusStatus(lastState?.params || {});
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
      window.removeEventListener('blur', onCamBlur);
      heldKeys.clear();
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
