#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
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
if (pass !== total) process.exit(1);
