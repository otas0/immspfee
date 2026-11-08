#!/usr/bin/env node
/**
 * Bundle the lab shell into js/bundle/ so Pages does not fetch dozens of modules.
 * glyphRows, factory.js, and topicModel.js stay dynamic chunks until a subject opens.
 */
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outdir = path.join(root, 'js/bundle');
fs.mkdirSync(outdir, { recursive: true });
// Drop stale hashed chunks so git / Pages never serve an orphan import graph.
for (const name of fs.readdirSync(outdir)) {
  fs.unlinkSync(path.join(outdir, name));
}

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
  // No palette-shell stub: theme imports data/palettes/cold-stub.json; gen scripts
  // alone read data/palettes.json. Re-add a stub only if a browser import regresses.
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
const labFile = path.join(outdir, 'lab.js');
const factoryFile = outputs.find((row) => row.file.startsWith('chunk-factory-'))?.file;
if (!factoryFile) {
  console.error('factory chunk missing');
  process.exit(1);
}
const factoryImport = `import("./${factoryFile}")`;
let stamped = false;
for (const name of fs.readdirSync(outdir)) {
  if (!name.endsWith('.js') || name.startsWith('chunk-factory-')) continue;
  const file = path.join(outdir, name);
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes(factoryImport)) continue;
  fs.writeFileSync(file, `${src.replace(
    factoryImport,
    `import(globalThis.__stampedChunk("./${factoryFile}"))`,
  )}\nglobalThis.__FACTORY_CHUNK = globalThis.__stampedChunk("./${factoryFile}");\n`);
  stamped = true;
}
if (!stamped) {
  console.error('factory chunk import was not rewritten with a stamp');
  process.exit(1);
}
/**
 * Inline static shared chunks into lab.js so cold boot is one JS body (entry + lab).
 * Factory may still import the same chunk file later — that is a second-visit cost.
 */
function inlineStaticChunks(entryFile) {
  let src = fs.readFileSync(entryFile, 'utf8');
  // Named imports: import { a } from "./chunk-….js"
  const namedImports = [...src.matchAll(/^import\s*\{([^}]+)\}\s*from\s*"\.\/(chunk-[^"]+\.js)";\s*$/gm)];
  // Side-effect helpers (esbuild __export etc.): import "./chunk-….js"
  const sideImports = [...src.matchAll(/^import\s*"\.\/(chunk-[^"]+\.js)";\s*$/gm)];
  if (!namedImports.length && !sideImports.length) return src;
  const bodies = [];
  const seen = new Set();
  const take = (fileName, wholeLine) => {
    if (fileName.includes('chunk-factory') || seen.has(fileName)) {
      src = src.replace(wholeLine, `/* static chunk skipped/dup: ${fileName} */`);
      return;
    }
    seen.add(fileName);
    const chunkPath = path.join(outdir, fileName);
    let chunk = fs.readFileSync(chunkPath, 'utf8');
    if (chunk.includes('js/lab/rows/') || chunk.includes('0.5*rho*v*v*c*Cl')) {
      throw new Error(`${fileName} is a static dependency of lab.js and still carries topic rows`);
    }
    chunk = chunk
      .replace(/\nexport\s*\{[\s\S]*?\};\s*$/m, '\n')
      .replace(/^export\s*\{[^}]+\};?\s*$/gm, '')
      .replace(/\bexport\s+(?=async\s+function|function|class|const|let|var)/g, '');
    bodies.push(`/* inlined ${fileName} */\n${chunk}`);
    src = src.replace(wholeLine, `/* static chunk inlined: ${fileName} */`);
  };
  for (const match of namedImports) take(match[2], match[0]);
  for (const match of sideImports) take(match[1], match[0]);
  src = `${bodies.join('\n')}\n${src}`;
  fs.writeFileSync(entryFile, src);
  return src;
}

const labSrc = inlineStaticChunks(labFile);
if (
  /^import\s*\{[^}]+\}\s*from\s*"\.\/chunk-(?!factory)[^"]+\.js"/m.test(labSrc)
  || /^import\s*"\.\/chunk-(?!factory)[^"]+\.js"/m.test(labSrc)
) {
  console.error('lab.js still has static chunk imports after inline');
  process.exit(1);
}
const outputsAfter = fs.readdirSync(outdir)
  .filter((name) => name.endsWith('.js'))
  .map((file) => ({ file, bytes: fs.statSync(path.join(outdir, file)).size }))
  .sort((a, b) => b.bytes - a.bytes);
fs.writeFileSync(
  path.join(outdir, 'meta.json'),
  `${JSON.stringify({
    at: new Date().toISOString(),
    outputs: outputsAfter,
    cold: { lab: 'js/bundle/lab.js', note: 'static shared chunks inlined into lab.js' },
  }, null, 2)}\n`,
);
const initialBytes = fs.statSync(labFile).size;
if (labSrc.includes('function buildTopicModel') || labSrc.includes('function createFactoryModel')) {
  console.error('lab.js still inlines factory/topicModel; open a subject before loading them');
  process.exit(1);
}
const mainMax = Math.floor(1.1 * 1024 * 1024);
if (initialBytes > mainMax) {
  console.error(`initial bundle is ${initialBytes} bytes, over ${mainMax}`);
  process.exit(1);
}
const { gzipSync } = await import('node:zlib');
const gz = gzipSync(fs.readFileSync(labFile), { level: 9 });
console.log(
  'bundle ok',
  outputsAfter.map((o) => `${o.file}:${Math.round(o.bytes / 1024)}kb`).join(' '),
  `lab.gz=${Math.round(gz.length / 1024)}kb`,
);
