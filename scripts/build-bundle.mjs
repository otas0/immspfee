#!/usr/bin/env node
/**
 * Bundle the lab shell into js/bundle/ so Pages does not fetch dozens of modules.
 * glyphRows stays a dynamic chunk: Chinese UI can skip it until needed.
 */
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outdir = path.join(root, 'js/bundle');
fs.mkdirSync(outdir, { recursive: true });

const entrySrc = fs.readFileSync(path.join(root, 'js/entry.js'), 'utf8');
const loadsBundle = /import\s*\([^)]*bundle\/lab\.js/.test(entrySrc) || entrySrc.includes('./bundle/lab.js');
const loadsMain = /import\s*\([^)]*\.\/main\.js/.test(entrySrc);
if (!loadsBundle || loadsMain) {
  console.error('js/entry.js must import ./bundle/lab.js (not ./main.js) — another agent may have reverted it');
  process.exit(1);
}
const result = await esbuild.build({
  absWorkingDir: root,
  entryPoints: [path.join(root, 'js/main.js')],
  bundle: true,
  format: 'esm',
  splitting: true,
  outdir,
  entryNames: 'lab',
  chunkNames: 'chunk-[name]-[hash]',
  sourcemap: false,
  target: ['es2022'],
  logLevel: 'info',
  metafile: true,
});

const outputs = Object.keys(result.metafile.outputs)
  .filter((rel) => rel.endsWith('.js'))
  .map((rel) => ({
    file: rel.replace(/^js\/bundle\//, ''),
    bytes: result.metafile.outputs[rel].bytes,
  }))
  .sort((a, b) => b.bytes - a.bytes);
fs.writeFileSync(
  path.join(outdir, 'meta.json'),
  `${JSON.stringify({ at: new Date().toISOString(), outputs }, null, 2)}\n`,
);
console.log('bundle ok', outputs.map((o) => `${o.file}:${Math.round(o.bytes / 1024)}kb`).join(' '));
