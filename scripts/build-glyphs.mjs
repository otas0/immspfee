#!/usr/bin/env node
/**
 * Build js/i18n/glyphRows.js from data/locales/glyph.tsv.
 * Columns: zh, en, ja, ko, es, fr, de.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'data/locales');
const files = fs.readdirSync(dir).filter((n) => /^glyph-(words|phrases|full)/.test(n) && n.endsWith('.tsv')).sort();
const pack = new Map();
const packPath = path.join(dir, 'glyph-pack.tsv');
if (fs.existsSync(packPath)) {
  for (const line of fs.readFileSync(packPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const [en, ja, ko, es, fr, de] = line.split('\t');
    pack.set(en, [ja, ko, es, fr, de]);
  }
}
const charFiles = fs.readdirSync(dir).filter((n) => n.startsWith('glyph-chars') && n.endsWith('.tsv')).sort();
const charLines = [];
for (const name of charFiles) {
  for (const line of fs.readFileSync(path.join(dir, name), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const [zh, en] = line.split('\t');
    const hit = pack.get(en);
    if (!hit) {
      console.error('pack missing', JSON.stringify(en), 'for', zh);
      process.exit(1);
    }
    charLines.push([zh, en, ...hit].join('\t'));
  }
}
const src = files.map((n) => fs.readFileSync(path.join(dir, n), 'utf8')).join('\n') + '\n' + charLines.join('\n');
const catalogHan = new Set();
for (const name of ['catalog.json', 'models.json']) {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
  const entries = Array.isArray(data) ? data : (data.models || data.entries || Object.values(data));
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    for (const field of ['assumptions', 'formula']) {
      for (const ch of String(entry[field] || '').match(/[\u4e00-\u9fff]/g) || []) catalogHan.add(ch);
    }
  }
}
const extra = fs.existsSync('/tmp/chars.txt') ? fs.readFileSync('/tmp/chars.txt', 'utf8').trim().split('\n') : [];
const chars = [...new Set([...catalogHan, ...extra.filter(Boolean)])];
const byZh = new Map();
for (const line of src.split('\n')) {
  if (!line.trim()) continue;
  const parts = line.split('\t');
  if (parts.length !== 7) {
    console.error('bad row', JSON.stringify(line));
    process.exit(1);
  }
  byZh.set(parts[0], parts);
}
const rows = [...byZh.values()];
const have = new Set(rows.filter((r) => r[0].length === 1).map((r) => r[0]));
const missing = chars.filter((c) => !have.has(c));
if (missing.length) {
  console.error('missing chars', missing.length, missing.join(''));
  process.exit(1);
}
for (const row of rows) {
  const [zh, en, ja, ko, es, fr, de] = row;
  if (/[\u4e00-\u9fff]/.test([en, ko, es, fr, de].join(' '))) {
    console.error('Han in translation', zh);
    process.exit(1);
  }
  if (!/[\u3040-\u30ff]/.test(ja)) {
    console.error('ja lacks kana', zh, ja);
    process.exit(1);
  }
}
const out = `/** Generated six-language catalog phrases. */\nexport const ROWS = ${JSON.stringify(rows)};\n`;
const dest = path.join(root, 'js/i18n/glyphRows.js');
fs.writeFileSync(dest, out);
let committed = '';
try {
  committed = execSync('git show HEAD:js/i18n/glyphRows.js', { cwd: root, encoding: 'utf8' });
} catch {
  console.error('glyphRows.js is not committed');
  process.exit(1);
}
if (committed !== out) {
  let first = '';
  try {
    const oldRows = JSON.parse(committed.replace(/^[\s\S]*?export const ROWS = /, '').replace(/;\s*$/, ''));
    const neu = new Map(rows.map((r) => [r[0], r]));
    const old = new Map(oldRows.map((r) => [r[0], r]));
    for (const [zh, row] of neu) {
      const prev = old.get(zh);
      if (!prev || prev.join('\t') !== row.join('\t')) {
        first = zh;
        break;
      }
    }
    if (!first) {
      for (const zh of old.keys()) {
        if (!neu.has(zh)) {
          first = zh;
          break;
        }
      }
    }
  } catch {
    first = '';
  }
  console.error('glyphRows.js differs from the committed file', first ? `first key ${first}` : '');
  process.exit(1);
}
console.log('glyph rows', rows.length);
