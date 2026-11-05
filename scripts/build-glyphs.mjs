#!/usr/bin/env node
/**
 * Build js/i18n/glyphRows.js from data/locales/glyph.tsv.
 * Columns: zh, en, ja, ko, es, fr, de.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'data/locales');
const files = fs.readdirSync(dir).filter((n) => /^glyph-(words|phrases)/.test(n) && n.endsWith('.tsv')).sort();
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
const chars = fs.readFileSync('/tmp/chars.txt', 'utf8').trim().split('\n');
const rows = [];
for (const line of src.split('\n')) {
  if (!line.trim()) continue;
  const parts = line.split('\t');
  if (parts.length !== 7) {
    console.error('bad row', JSON.stringify(line));
    process.exit(1);
  }
  rows.push(parts);
}
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
fs.writeFileSync(path.join(root, 'js/i18n/glyphRows.js'), out);
console.log('glyph rows', rows.length);
