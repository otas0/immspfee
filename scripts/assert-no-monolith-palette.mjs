#!/usr/bin/env node
/**
 * Fail if browser sources import data/palettes.json (monolith).
 * Gen scripts under scripts/ may still read it; runtime must use cold-stub + domains.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let out = '';
try {
  out = execFileSync(
    'rg',
    [
      '-n',
      '--glob', '!**/bundle/**',
      '--glob', '!**/*.map',
      String.raw`palettes\.json`,
      'js',
    ],
    { cwd: root, encoding: 'utf8' },
  );
} catch (err) {
  if (err.status === 1) {
    console.log('assert-no-monolith-palette ok (no palettes.json under js/)');
    process.exit(0);
  }
  console.error(err.stderr || err.message);
  process.exit(err.status || 1);
}

const lines = out.trim().split('\n').filter(Boolean);
const bad = lines.filter((line) => {
  if (/import\s+.*palettes\.json|from\s+['"].*palettes\.json|fetch\([^)]*palettes\.json|new URL\([^)]*palettes\.json/.test(line)) {
    return true;
  }
  if (/data\/palettes\.json/.test(line) && !/must not|gen-only|deprecated|cold-stub|do not/.test(line)) {
    return true;
  }
  return false;
});

if (bad.length) {
  console.error('Browser path must not reference data/palettes.json:\n' + bad.join('\n'));
  process.exit(1);
}
console.log('assert-no-monolith-palette ok');
