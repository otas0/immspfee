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
  'free-fall': { name: 'Free fall', description: 'Ball, ground, velocity vector; tune g, height, drag' },
  projectile: { name: 'Projectile motion', description: 'Oblique / horizontal launch with optional drag' },
  sorting: { name: 'Sorting', description: 'Compare / swap highlights; classroom step mode' },
  'pid-tune': { name: 'PID tuning', description: 'Setpoint tracking and IAE metrics' },
  'beam-sfd-bmd': { name: 'Beam SFD/BMD', description: 'Shear and bending diagrams' },
  'hodgkin-huxley': { name: 'Hodgkin–Huxley', description: 'Neuron membrane dynamics' },
  lorenz: { name: 'Lorenz attractor', description: 'Classic chaotic ODE' },
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
