#!/usr/bin/env node
/**
 * Fail if browser sources import data/palettes.json (monolith).
 * Gen scripts under scripts/ may still read it; runtime must use cold-stub + domains.
 * Pure Node walk — no ripgrep dependency (CI runners may lack `rg`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsRoot = path.join(root, 'js');
const bad = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'bundle' || ent.name === 'node_modules') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(js|mjs|cjs|ts)$/.test(ent.name)) continue;
    const text = fs.readFileSync(full, 'utf8');
    const rel = path.relative(root, full);
    for (const [i, line] of text.split('\n').entries()) {
      if (!/palettes\.json/.test(line)) continue;
      const n = i + 1;
      if (/import\s+.*palettes\.json|from\s+['"].*palettes\.json|fetch\([^)]*palettes\.json|new URL\([^)]*palettes\.json/.test(line)) {
        bad.push(`${rel}:${n}:${line.trim()}`);
        continue;
      }
      if (/data\/palettes\.json/.test(line) && !/must not|gen-only|deprecated|cold-stub|do not/.test(line)) {
        bad.push(`${rel}:${n}:${line.trim()}`);
      }
    }
  }
}

walk(jsRoot);
if (bad.length) {
  console.error('Browser path must not reference data/palettes.json:\n' + bad.join('\n'));
  process.exit(1);
}
console.log('assert-no-monolith-palette ok');
