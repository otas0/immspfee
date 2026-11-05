/**
 * 代数型条目的示意图：碰撞速度、透镜光路、波形。
 * 读数不随时间变化时不再画一条水平线。
 */
import { P } from '../utils/params.js';
import { C } from '../utils/theme.js';

function ink() {
  return C.body || '#fff';
}
function muted() {
  return C.muted || '#888';
}

function arrow(ctx, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  const ux = dx / len;
  const uy = dy / len;
  const s = 8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ux * s - uy * 4, y1 - uy * s + ux * 4);
  ctx.lineTo(x1 - ux * s + uy * 4, y1 - uy * s - ux * 4);
  ctx.closePath();
  ctx.fill();
}

function drawCollision(ctx, W, H, state, spec) {
  const blob = `${spec?.id || ''} ${spec?.name || ''} ${spec?.formula || ''}`;
  const oblique = /斜碰|法向/.test(blob);
  const e = P(state.params, 'e', oblique ? 0.8 : 1);
  ctx.fillStyle = muted();
  ctx.font = '12px IBM Plex Mono, monospace';
  ctx.fillText(`e = ${Number(e).toFixed(2)}`, 16, 36);
  if (oblique) {
    const un = P(state.params, 'un', 3);
    const vn = Number.isFinite(state.y) ? state.y : -e * un;
    const maxV = Math.max(1, Math.abs(un), Math.abs(vn));
    const y = H * 0.55;
    ctx.fillText('法向', 16, y - 28);
    [un, vn].forEach((vel, k) => {
      const cx = W * (0.32 + k * 0.4);
      ctx.beginPath();
      ctx.fillStyle = k ? '#9ad' : '#fc8';
      ctx.arc(cx, y, 16, 0, Math.PI * 2);
      ctx.fill();
      const len = (vel / maxV) * (W * 0.18);
      ctx.strokeStyle = ink();
      ctx.fillStyle = ink();
      arrow(ctx, cx + 18 * Math.sign(len || 1), y, cx + 18 * Math.sign(len || 1) + len, y);
      ctx.fillStyle = muted();
      ctx.fillText(vel.toFixed(2), cx - 18, y + 36);
    });
    const ut = P(state.params, 'ut', 2);
    const yT = Math.min(H - 28, y + 70);
    ctx.fillStyle = muted();
    ctx.fillText('切向 ut（不参与 e）', 16, yT - 16);
    ctx.save?.();
    ctx.setLineDash?.([5, 4]);
    ctx.strokeStyle = muted();
    ctx.fillStyle = muted();
    const lenT = (ut / Math.max(maxV, Math.abs(ut), 1)) * (W * 0.18);
    arrow(ctx, W * 0.32, yT, W * 0.32 + lenT, yT);
    ctx.setLineDash?.([]);
    ctx.restore?.();
    ctx.fillText(Number(ut).toFixed(2), W * 0.32 - 18, yT + 18);
    return true;
  }
  const u1 = P(state.params, 'u1', P(state.params, 'v2', 4));
  const u2 = P(state.params, 'u2', 0);
  const v1 = Number.isFinite(state.v1) ? state.v1 : (Number.isFinite(state.y) ? state.y : u1);
  const v2 = Number.isFinite(state.v2) ? state.v2 : P(state.params, 'v2', 0);
  const rows = [
    ['碰前', u1, u2],
    ['碰后', v1, v2],
  ];
  const maxV = Math.max(1, ...rows.flatMap((r) => [Math.abs(r[1]), Math.abs(r[2])]));
  ctx.strokeStyle = ink();
  ctx.fillStyle = ink();
  ctx.lineWidth = 1.6;
  rows.forEach((row, i) => {
    const y = 78 + i * ((H - 100) / 2);
    ctx.fillStyle = muted();
    ctx.font = '12px IBM Plex Mono, monospace';
    ctx.fillText(row[0], 16, y - 28);
    [0, 1].forEach((k) => {
      const cx = W * (0.32 + k * 0.4);
      ctx.beginPath();
      ctx.fillStyle = k ? '#9ad' : '#fc8';
      ctx.arc(cx, y, 16, 0, Math.PI * 2);
      ctx.fill();
      const vel = row[k + 1];
      const len = (vel / maxV) * (W * 0.18);
      ctx.strokeStyle = ink();
      ctx.fillStyle = ink();
      arrow(ctx, cx + 18 * Math.sign(len || 1), y, cx + 18 * Math.sign(len || 1) + len, y);
      ctx.fillStyle = muted();
      ctx.fillText(vel.toFixed(2), cx - 18, y + 36);
    });
  });
  return true;
}

function drawLens(ctx, W, H, state) {
  const f = Math.abs(P(state.params, 'f', 0.1)) || 0.1;
  const u = P(state.params, 'u', -0.3);
  const v = Number.isFinite(state.v) ? state.v : (Number.isFinite(state.y) ? state.y : 0.15);
  const midY = H * 0.55;
  const cx = W * 0.48;
  const scale = Math.min(W, H) * 0.9 / Math.max(0.2, Math.abs(u) + Math.abs(v) + 2 * f);
  ctx.strokeStyle = ink();
  ctx.fillStyle = ink();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(28, midY);
  ctx.lineTo(W - 20, midY);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, midY, 8, 54, 0, 0, Math.PI * 2);
  ctx.stroke();
  const objX = cx + u * scale;
  const imgX = cx + v * scale;
  const objH = 36;
  const imgH = objH * (Number.isFinite(v / u) ? Math.abs(v / u) : 1);
  ctx.strokeStyle = '#fc8';
  arrow(ctx, objX, midY, objX, midY - objH);
  ctx.strokeStyle = '#9ad';
  const dir = v * u < 0 ? 1 : -1;
  arrow(ctx, imgX, midY, imgX, midY - dir * Math.min(80, imgH));
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.moveTo(objX, midY - objH);
  ctx.lineTo(cx, midY - objH);
  ctx.lineTo(imgX, midY - dir * Math.min(80, imgH));
  ctx.stroke();
  ctx.fillStyle = muted();
  ctx.font = '12px IBM Plex Mono, monospace';
  ctx.fillText(`f=${f.toFixed(3)}  u=${u.toFixed(3)}  v=${Number.isFinite(v) ? v.toFixed(3) : '—'}`, 16, H - 16);
  return true;
}

function drawWave(ctx, W, H, state, standing) {
  const A = P(state.params, 'A', 1) || 1;
  const k = P(state.params, 'k', P(state.params, 'omega', 3)) || 3;
  const w = P(state.params, 'w', P(state.params, 'omega', 4)) || 4;
  const t = state.t || 0;
  const l = 36;
  const r = W - 20;
  const mid = H * 0.55;
  const amp = Math.min(70, (H - 120) / 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(l, mid);
  ctx.lineTo(r, mid);
  ctx.stroke();
  ctx.strokeStyle = ink();
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  const n = 120;
  for (let i = 0; i <= n; i += 1) {
    const x = i / n;
    const phase = standing ? Math.sin(k * x * Math.PI) * Math.cos(w * t) : Math.sin(k * x * Math.PI * 2 - w * t);
    const px = l + x * (r - l);
    const py = mid - phase * amp * Math.sign(A || 1);
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = muted();
  ctx.font = '12px IBM Plex Mono, monospace';
  ctx.fillText(standing ? '驻波  y ∝ sin(kx) cos(ωt)' : '行波  y ∝ sin(kx − ωt)', 16, 48);
  return true;
}

function drawBar(ctx, W, H, state, equation) {
  const hist = state.hist || [];
  const v = hist.length ? hist[hist.length - 1] : 0;
  const span = Math.max(1, Math.abs(v));
  const l = 48;
  const r = W - 36;
  const y = H * 0.58;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.moveTo(l, y);
  ctx.lineTo(r, y);
  ctx.stroke();
  const mid = (l + r) / 2;
  const tip = mid + (v / span) * (r - l) * 0.42;
  ctx.strokeStyle = ink();
  ctx.fillStyle = ink();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(mid, y);
  ctx.lineTo(tip, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(tip, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = muted();
  ctx.font = '12px IBM Plex Mono, monospace';
  const label = String(equation || '').slice(0, 72);
  ctx.fillText(label, 16, H - 18);
  ctx.fillStyle = ink();
  ctx.font = '600 18px IBM Plex Mono, monospace';
  ctx.fillText(Number.isFinite(v) ? v.toExponential(3) : '—', 16, y - 16);
  return true;
}

function drawBohr(ctx, W, H, state) {
  const nSel = Math.max(1, Math.round(P(state.params, 'n', 2)));
  const top = 52;
  const bot = H - 36;
  const yOf = (e) => top + ((0 - e) / 13.6) * (bot - top);
  ctx.fillStyle = muted();
  ctx.font = '12px IBM Plex Mono, monospace';
  ctx.fillText(`n=${nSel}  E=${(-13.6 / (nSel * nSel)).toFixed(2)} eV`, 16, 40);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(28, yOf(0));
  ctx.lineTo(W * 0.46, yOf(0));
  ctx.stroke();
  for (let n = 1; n <= 6; n += 1) {
    const e = -13.6 / (n * n);
    const y = yOf(e);
    ctx.strokeStyle = n === nSel ? '#fc8' : ink();
    ctx.lineWidth = n === nSel ? 2.4 : 1.2;
    ctx.beginPath();
    ctx.moveTo(28, y);
    ctx.lineTo(W * 0.46, y);
    ctx.stroke();
    ctx.fillStyle = n === nSel ? '#fc8' : muted();
    ctx.fillText(`${n}`, 14, y - 3);
  }
  const cx = W * 0.74;
  const cy = H * 0.56;
  ctx.fillStyle = '#fc8';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  for (let n = 1; n <= 4; n += 1) {
    const r = 14 + n * n * 3.2;
    ctx.strokeStyle = n === nSel ? '#9ad' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = n === nSel ? 2 : 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = muted();
  ctx.fillText('轨道 r∝n²', cx - 28, H - 16);
  return true;
}

function drawNeutron(ctx, W, H) {
  const l = 36;
  const r = W - 20;
  const mid = H * 0.58;
  const amp = Math.min(78, Math.max(36, (H - 110) / 2));
  ctx.fillStyle = muted();
  ctx.font = '12px IBM Plex Mono, monospace';
  ctx.fillText('φ = φ₀ cos(πx/a)', 16, 64);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(l, mid);
  ctx.lineTo(r, mid);
  ctx.stroke();
  ctx.strokeStyle = '#9d9';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  const n = 96;
  for (let i = 0; i <= n; i += 1) {
    const x = -0.5 + i / n;
    const phi = Math.cos(Math.PI * x);
    const px = l + (i / n) * (r - l);
    const py = mid - phi * amp;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.stroke();
  return true;
}

function drawRiver(ctx, W, H, state) {
  const xi = P(state.params, 'xi', 0);
  const Ed = Math.max(1e-3, P(state.params, 'E', 5));
  const t = Math.max(0.05, state.t || 0.05);
  const sigma = Math.sqrt(2 * Ed * t);
  const l = 36;
  const r = W - 20;
  const base = H * 0.72;
  const amp = Math.min(90, Math.max(40, H * 0.42));
  ctx.fillStyle = muted();
  ctx.font = '12px IBM Plex Mono, monospace';
  const apart = Math.abs(xi) > 1e-6;
  ctx.fillText(apart ? `探针距峰 ξ=${Number(xi).toFixed(2)} m` : '探针在峰 ξ=0', 16, 44);
  ctx.strokeStyle = '#9cf';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  const n = 80;
  const span = Math.max(4 * sigma, Math.abs(xi) + 2 * sigma, 1);
  for (let i = 0; i <= n; i += 1) {
    const x = -span + (2 * span * i) / n;
    const g = Math.exp(-(x * x) / (4 * Ed * t));
    const px = l + (i / n) * (r - l);
    const py = base - g * amp;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.stroke();
  const xToPx = (x) => l + ((x + span) / (2 * span)) * (r - l);
  const peakX = xToPx(0);
  const probeX = xToPx(xi);
  ctx.strokeStyle = '#fc8';
  ctx.beginPath();
  ctx.moveTo(peakX, base);
  ctx.lineTo(peakX, base - amp);
  ctx.stroke();
  ctx.fillText('峰', peakX - 6, base + 16);
  if (apart) {
    ctx.strokeStyle = '#f88';
    ctx.beginPath();
    ctx.moveTo(probeX, base);
    ctx.lineTo(probeX, base - amp * Math.exp(-(xi * xi) / (4 * Ed * t)));
    ctx.stroke();
    ctx.fillStyle = '#f88';
    ctx.fillText('探针', probeX - 12, base + 16);
  }
  return true;
}

function histFlat(state) {
  const hist = state.hist || [];
  if (hist.length < 2) return true;
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of hist) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return !Number.isFinite(lo) || hi - lo < 1e-6 * Math.max(1, Math.abs(hi));
}

/**
 * @returns {boolean} 已画完，调用方不必再画折线
 */
export function sketchKind(spec) {
  const blob = `${spec?.id || ''} ${spec?.name || ''} ${spec?.formula || ''}`;
  if (/玻尔模型|玻尔能级|E_n\s*=\s*[−-]13\.6|E_n=[−-]13\.6/.test(blob) && !/玻尔兹曼/.test(blob)) return 'bohr';
  if (/中子扩散|neutron-diffusion|π\s*x\s*\/\s*a|πx\/a/.test(blob)) return 'neutron';
  if (/污染物扩散|探针在峰位|距峰 ξ/.test(blob)) return 'river';
  if (/碰撞|斜碰|法向|撞墙|反冲|collision/i.test(blob)) return 'collision';
  if (/透镜|lens/i.test(blob)) return 'lens';
  if (/驻波|行波|横波|纵波|standing-wave|waveTravel|sin\(kx/i.test(blob)) return 'wave';
  return '';
}

export function drawTopicSketch(ctx, spec, state, view) {
  const W = view?.width || 640;
  const H = view?.height || 360;
  const kind = sketchKind(spec);
  if (kind === 'bohr') return drawBohr(ctx, W, H, state);
  if (kind === 'neutron') return drawNeutron(ctx, W, H);
  if (kind === 'river') return drawRiver(ctx, W, H, state);
  if (kind === 'collision') return drawCollision(ctx, W, H, state, spec);
  if (kind === 'lens') return drawLens(ctx, W, H, state);
  if (kind === 'wave') return drawWave(ctx, W, H, state, /驻波|standing/.test(`${spec?.id || ''} ${spec?.name || ''} ${spec?.formula || ''}`));
  if (histFlat(state)) return drawBar(ctx, W, H, state, spec?.formula);
  return false;
}
