#!/usr/bin/env node
/**
 * Build lazy-loadable model locale packs (en / ja) from catalog.json.
 * Heuristic English/Japanese titles from id + optional name; safe to re-run.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(root, 'data/catalog.json'), 'utf8'));
const models = Array.isArray(catalog) ? catalog : catalog.models;

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
};

const HAND_JA = {
  'free-fall': { name: '自由落下', description: '小球・地面・速度ベクトル；g・高さ・抗力' },
  projectile: { name: '斜方投射', description: '斜方／水平投射と抗力' },
  sorting: { name: 'ソート', description: '比較／交換のハイライト' },
  'pid-tune': { name: 'PID調整', description: '目標追従とIAE' },
  'beam-sfd-bmd': { name: '梁のSFD/BMD', description: 'せん断力・曲げモーメント図' },
  lorenz: { name: 'ローレンツアトラクタ', description: '古典的カオスODE' },
};

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

function packEn(m) {
  const hand = HAND_EN[m.id];
  if (hand) return hand;
  const name = /^[\x00-\x7F]+$/.test(m.name || '') ? m.name : titleFromId(m.id);
  const description = /^[\x00-\x7F]+$/.test(m.description || '')
    ? m.description
    : (m.formula ? `Model · ${m.formula}` : name);
  return { name, description };
}

function packJa(m) {
  const hand = HAND_JA[m.id];
  if (hand) return hand;
  // Prefer existing CJK name when present
  const name = /[\u3040-\u30ff\u3400-\u9fff]/.test(m.name || '') ? m.name : titleFromId(m.id);
  return { name, description: m.description || m.formula || name };
}

const en = {};
const ja = {};
for (const m of models) {
  if (!m?.id) continue;
  en[m.id] = packEn(m);
  ja[m.id] = packJa(m);
}

const outDir = join(root, 'data/locales');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'models-en.json'), JSON.stringify(en));
writeFileSync(join(outDir, 'models-ja.json'), JSON.stringify(ja));
console.log(`wrote models-en.json / models-ja.json (${Object.keys(en).length} ids)`);
