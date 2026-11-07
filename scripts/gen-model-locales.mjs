#!/usr/bin/env node
/**
 * Build lazy-loadable model locale packs (en / ja) from catalog.json.
 * English names must not keep Han when a gloss or ASCII id title is available.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { translateCatalogText } from '../js/i18n/catalogText.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(root, 'data/catalog.json'), 'utf8'));
const models = Array.isArray(catalog) ? catalog : catalog.models;
const prevEnPath = join(root, 'data/locales/models-en.json');
const prevEn = existsSync(prevEnPath)
  ? JSON.parse(readFileSync(prevEnPath, 'utf8'))
  : {};

const HAND_EN = {
  'free-fall': { name: 'Free fall', description: 'Vertical fall y″=−g−(k/m)y′; tune g, height, and linear drag' },
  projectile: { name: 'Projectile motion', description: 'Launch: x=v₀ cosθ t, y=v₀ sinθ t−½gt², with optional drag' },
  pendulum: { name: 'Pendulum', description: 'Simple pendulum θ″=−(g/L)sinθ−c θ′ (large angle); tune L, g, damping, θ₀' },
  heat: { name: 'Heat conduction', description: '1D heat equation ∂T/∂t=α ∂²T/∂x² with live Dirichlet end temperatures' },
  wave: { name: 'Transverse wave', description: 'String wave y_tt=c² y_xx; length sets the grid spacing dx=L/(N+1)' },
  'double-pendulum': { name: 'Double pendulum', description: 'Two-link pendulum from the Lagrangian; chaotic sensitivity to the initial angles' },
  photoelectric: { name: 'Photoelectric effect', description: 'Einstein: K_max=max(0, hf−W) in eV; yield tracks intensity, not K_max' },
  bohr: { name: 'Bohr model', description: 'Hydrogen Bohr levels E_n=−13.6 eV/n²' },
  sorting: { name: 'Sorting', description: 'Bubble, insertion, and quicksort with compare/swap highlights' },
  'pid-tune': { name: 'PID tuning', description: 'Second-order plant ÿ+2ζωnẏ+ωn²y=Kωn²u with ideal PID; OS%, ts, IAE' },
  'beam-sfd-bmd': { name: 'Beam SFD/BMD', description: 'Shear and bending diagrams' },
  'hodgkin-huxley': { name: 'Hodgkin–Huxley', description: 'Neuron membrane dynamics' },
  lorenz: { name: 'Lorenz attractor', description: 'Lorenz (1963): x′=σ(y−x), y′=x(ρ−z)−y, z′=xy−βz' },
  orbit: { name: 'Kepler orbit', description: 'Central gravity a=−GM r̂/r²' },
  spring: { name: 'Spring oscillator', description: 'm x″=−kx−c x′; tune mass, stiffness, damping, and x₀' },
  'inclined-plane': { name: 'Inclined plane', description: 'Block on an incline: a=g(sinθ−μ cosθ)' },
  'rc-circuit': { name: 'RC circuit', description: 'RC charge and discharge with time constant τ=RC' },
  rlc: { name: 'RLC circuit', description: 'Series RLC: L I″ + R I′ + I/C = 0' },
  'standing-wave': { name: 'Standing wave', description: 'Standing wave y=sin(kx)cos(ωt) with nodes and antinodes' },
  'longitudinal-wave': { name: 'Longitudinal wave', description: 'Compressional wave: density and pressure disturbance along the direction of travel' },
  'binary-search': { name: 'Binary search', description: 'Search an ordered array by shrinking the interval' },
  'friction-pendulum': { name: 'Friction pendulum isolator', description: 'Seismic isolation hysteresis; tune friction and radius of curvature' },
  'inverted-pendulum': { name: 'Inverted pendulum', description: 'Cart–pole under PID; angle and position response' },
  'seismic-waves': { name: 'Seismic travel time', description: 'Wavefront travel time from source depth and wave speed' },
  'em-wave': { name: 'Electromagnetic wave', description: 'Plane wave with E and B perpendicular to the direction of travel' },
  'social-force': { name: 'Social-force pedestrians', description: 'Pedestrian social-force model: avoidance and crowding at an exit' },
  'crc-hamming': { name: 'CRC and Hamming', description: 'Error detection: data bits, parity bits, and an injected error' },
  'r009-玻尔兹曼分布': { name: 'Boltzmann distribution', description: 'Boltzmann factor n₂/n₁=exp(−ΔE/kT) at thermal equilibrium' },
  'r018-光电效应': { name: 'Photoelectric effect', description: 'Einstein photoelectric equation K_max=hf−W' },
  'r018-玻尔模型': { name: 'Bohr Model', description: 'Bohr hydrogen levels E_n=−13.6 eV/n²' },
  'r027-格子玻尔兹曼': { name: 'Lattice Boltzmann', description: 'D2Q9 lattice sound speed c_s=1/√3 (lattice units)' },
  'fam-orbit-v01': { name: 'Orbital motion', description: 'Kepler / central gravity: central mass, initial speed, r₀, eccentricity' },
  'fam-heat-engine-v01': { name: 'Heat engine', description: 'Heat-engine cycle (Carnot / Otto and related); compression ratio and temperature ratio' },
  'fam-photoelectric-v01': { name: 'Photoelectric effect', description: 'Einstein: K=hf−W; frequency, intensity, and work function' },
  'nasch-ca': { name: 'Nagel–Schreckenberg', description: 'Traffic cellular automaton' },
  polarization: { name: 'Polarization (Malus)', description: 'I = I₀ cos²θ' },
  'ohms-law': { name: 'Ohm’s law', description: 'V = IR readout' },
  collision: { name: '1D collision', description: 'Elastic / inelastic head-on collision' },
  'collision-2d': { name: '2D collision', description: 'Planar particle collisions' },
  'r016-显微镜': { name: 'Compound microscope', description: 'Finite-tube angular magnification and resolution' },
  dijkstra: { name: 'Dijkstra shortest path', description: 'Force-directed graph layout and shortest-path search' },
  'bfs-grid': { name: 'BFS / A* pathfinding', description: 'Grid search with walls and frontier expansion' },
  pipeline: { name: 'CPU pipeline', description: 'Five-stage pipeline with stalls and data hazards' },
  'cache-lru': { name: 'LRU cache', description: 'Hit / miss stream with capacity eviction' },
};

const HAND_JA = {
  'free-fall': { name: '自由落下', description: '小球・地面・速度ベクトル；g・高さ・抗力' },
  projectile: { name: '斜方投射', description: '斜方／水平投射と抗力' },
  sorting: { name: 'ソート', description: '比較／交換のハイライト' },
  'pid-tune': { name: 'PID調整', description: '目標追従とIAE' },
  'beam-sfd-bmd': { name: '梁のSFD/BMD', description: 'せん断力・曲げモーメント図' },
  lorenz: { name: 'ローレンツアトラクタ', description: '古典的カオスODE' },
};

const HAS_HAN = /[\u4e00-\u9fff]/;

function titleFromId(id) {
  return String(id || '')
    .replace(/^fam-/, '')
    .replace(/-v\d+$/, '')
    .replace(/^r\d+-/, '')
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function titleCaseAscii(s) {
  const raw = String(s || '').replace(/\s+/g, ' ').trim();
  if (!raw) return raw;
  return raw.replace(/(^|[^\p{L}\p{N}])([\p{L}])/gu, (_, a, b) => a + b.toUpperCase());
}

function englishName(m) {
  const hand = HAND_EN[m.id];
  if (hand?.name) return hand.name;
  const kept = prevEn[m.id]?.name;
  if (kept && !HAS_HAN.test(kept)) return kept;
  if (m.name && !HAS_HAN.test(m.name)) return m.name;
  let gloss = translateCatalogText('en', m.name || '');
  if (!gloss || HAS_HAN.test(gloss)) gloss = titleFromId(m.id);
  if (HAS_HAN.test(gloss)) gloss = translateCatalogText('en', gloss);
  if (HAS_HAN.test(gloss) || !gloss) {
    const ascii = String(m.id || '').replace(/[^\x00-\x7F]+/g, ' ').replace(/[-_]+/g, ' ').trim();
    gloss = titleFromId(ascii) || m.id;
  }
  return titleCaseAscii(gloss);
}

function packEn(m) {
  const hand = HAND_EN[m.id];
  if (hand) return { ...hand };
  const name = englishName(m);
  const prevDesc = prevEn[m.id]?.description;
  let description = prevDesc && !HAS_HAN.test(prevDesc)
    ? prevDesc
    : (/^[\x00-\x7F]+$/.test(m.description || '')
      ? m.description
      : (m.formula ? `Model · ${m.formula}` : name));
  if (HAS_HAN.test(description)) description = translateCatalogText('en', description);
  if (HAS_HAN.test(description)) description = name;
  return { name, description };
}

function packJa(m) {
  const hand = HAND_JA[m.id];
  if (hand) return hand;
  const name = /[\u3040-\u30ff\u3400-\u9fff]/.test(m.name || '') ? m.name : titleFromId(m.id);
  return { name, description: m.description || m.formula || name };
}

const en = {};
const ja = {};
let hanLeft = 0;
for (const m of models) {
  if (!m?.id) continue;
  en[m.id] = packEn(m);
  ja[m.id] = packJa(m);
  if (HAS_HAN.test(en[m.id].name || '')) hanLeft += 1;
}

const outDir = join(root, 'data/locales');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'models-en.json'), JSON.stringify(en));
writeFileSync(join(outDir, 'models-ja.json'), JSON.stringify(ja));
console.log(`wrote models-en.json / models-ja.json (${Object.keys(en).length} ids, en Han names left ${hanLeft})`);
if (hanLeft) process.exitCode = 1;
