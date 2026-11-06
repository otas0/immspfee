#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(root, '..');
const gen = spawnSync(process.execPath, [path.join(root, 'gen-equation-index.mjs')], { cwd: repo, stdio: 'inherit' });
if (gen.status) process.exit(gen.status ?? 1);
const indexHtml = fs.readFileSync(path.join(repo, 'equation-index.html'), 'utf8');
if (!indexHtml.includes('d = 0.61') || !indexHtml.includes('handwritten assembly') || !indexHtml.includes('f_obj = 16 mm')) {
  console.error('equation-index.html is missing the microscope pair');
  process.exit(1);
}
if (!indexHtml.includes('course u = 1.950') || !indexHtml.includes('overshoot = 0.408')) {
  console.error('equation-index.html is missing the locked PID numbers');
  process.exit(1);
}
{
  const topicSrc = fs.readFileSync(path.join(repo, 'js/lab/topicModel.js'), 'utf8');
  const sliceFn = (name) => {
    const start = topicSrc.indexOf(`function ${name}(`);
    if (start < 0) return '';
    const next = topicSrc.indexOf('\nfunction ', start + 1);
    return next < 0 ? topicSrc.slice(start) : topicSrc.slice(start, next);
  };
  for (const name of ['hall', 'quantumHall']) {
    const body = sliceFn(name);
    if (!body) {
      console.error(`topicModel.js is missing ${name}()`);
      process.exit(1);
    }
    if (/\bparams\.t\b/.test(body) || /P\(\s*state\.params\s*,\s*['"]t['"]/.test(body)) {
      console.error(`${name}() tick still reads params.t`);
      process.exit(1);
    }
  }
}
const {
  assertBundleMeta, assertDomainCoverage, assertIndexBudget, assertStampIndependence, fingerprint, readCatalog,
} = await import(pathToFileURL(path.join(root, 'static-boot.mjs')).href);
const { HAND_FORMALISM } = await import(pathToFileURL(path.join(repo, 'js/lab/formalism.js')).href);
const catalog = readCatalog(repo);
assertDomainCoverage(catalog);
const indexBytes = assertIndexBudget(catalog);
const stamp = fingerprint(repo);
assertStampIndependence(stamp);
assertBundleMeta(stamp, repo);
const bareHands = catalog.filter((spec) => !spec.family || spec.family === 'hand');
const handIds = bareHands.map((spec) => spec.id);
const missingForm = handIds.filter((id) => !HAND_FORMALISM[id]);
const extraForm = Object.keys(HAND_FORMALISM).filter((id) => !handIds.includes(id));
if (missingForm.length || extraForm.length) {
  console.error(`HAND_FORMALISM drift missing=${missingForm.join(',') || '-'} extra=${extraForm.join(',') || '-'}`);
  process.exit(1);
}
{
  const { HEAVY_MODEL_IDS } = await import(pathToFileURL(path.join(repo, 'js/utils/mobilePerf.js')).href);
  const heavyPath = path.join(repo, 'data/perf-heavy.json');
  const heavyJson = JSON.parse(fs.readFileSync(heavyPath, 'utf8'));
  const fromCode = [...HEAVY_MODEL_IDS].sort();
  const fromJson = [...(heavyJson.ids || [])].sort();
  const miss = fromCode.filter((id) => !fromJson.includes(id));
  const extra = fromJson.filter((id) => !fromCode.includes(id));
  if (miss.length || extra.length || fromCode.length !== fromJson.length) {
    console.error(`perf-heavy drift code≠json missing=${miss.join(',') || '-'} extra=${extra.join(',') || '-'}`);
    process.exit(1);
  }
  console.log('perf-heavy sync ok', fromCode.length, 'ids');
}
console.log('domain chunks cover', catalog.length, 'index', indexBytes, 'bytes', 'hands', bareHands.length);
const { ensureHandModels } = await import(pathToFileURL(path.join(repo, 'js/models/assemble.js')).href);
await ensureHandModels();
const suiteUrl = pathToFileURL(path.join(root, '../js/tests/suite.js')).href;
const { runSuite } = await import(suiteUrl);
const results = runSuite();
let pass = 0;
for (const r of results) {
  const mark = r.ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
  if (r.ok) pass += 1;
}
const total = results.length;
console.log(`\n${pass}/${total} passed`);

const failures = results._contractFailures;
if (failures) {
  const outDir = path.join(repo, 'artifacts');
  fs.mkdirSync(outDir, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    total: failures.total,
    ok: failures.ok,
    failedCount: failures.ids?.length || 0,
    failedModelIds: failures.ids || [],
    constantReadoutCount: failures.constantReadoutIds?.length || 0,
    constantReadoutIds: failures.constantReadoutIds || [],
    details: failures.details || [],
  };
  const jsonPath = path.join(outDir, 'contract-failures.json');
  const txtPath = path.join(outDir, 'contract-failed-ids.txt');
  const constPath = path.join(outDir, 'constant-readout-ids.txt');
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(txtPath, `${(failures.ids || []).join('\n')}${(failures.ids || []).length ? '\n' : ''}`);
  fs.writeFileSync(constPath, `${(failures.constantReadoutIds || []).join('\n')}${(failures.constantReadoutIds || []).length ? '\n' : ''}`);
  if (failures.ids?.length) {
    console.error(`contract artifact → ${jsonPath} (${failures.ids.length} ids)`);
  }
  if (failures.constantReadoutIds?.length) {
    console.log(`constant-readout artifact → ${constPath} (${failures.constantReadoutIds.length} ids, non-blocking)`);
  }
}

if (pass !== total) process.exit(1);
