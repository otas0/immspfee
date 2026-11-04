#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(root, '..');
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
if (failures && failures.ids?.length) {
  const outDir = path.join(repo, 'artifacts');
  fs.mkdirSync(outDir, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    total: failures.total,
    ok: failures.ok,
    failedCount: failures.ids.length,
    failedModelIds: failures.ids,
    details: failures.details,
  };
  const jsonPath = path.join(outDir, 'contract-failures.json');
  const txtPath = path.join(outDir, 'contract-failed-ids.txt');
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(txtPath, `${failures.ids.join('\n')}\n`);
  console.error(`contract artifact → ${jsonPath} (${failures.ids.length} ids)`);
}

if (pass !== total) process.exit(1);
