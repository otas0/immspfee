#!/usr/bin/env node
/**
 * CI gate: forbid new course-mass ids (/^r\d/) unless they are handwritten
 * (family: hand) or famPhysics generated (dims/generated).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json'), 'utf8'));

const bad = [];
for (const m of catalog) {
  if (!/^r\d/.test(m.id || '')) continue;
  const hand = m.family === 'hand';
  const fam = !!(m.generated || m.dims);
  if (!hand && !fam) bad.push(m.id);
}

if (bad.length) {
  console.error('Course-shell ids without hand/fam implementation:');
  for (const id of bad.slice(0, 40)) console.error(` - ${id}`);
  if (bad.length > 40) console.error(` ... +${bad.length - 40} more`);
  process.exit(1);
}

const course = catalog.filter((m) => /^r\d/.test(m.id || ''));
console.log(`course-id gate ok (allowed ${course.length}: ${course.map((m) => m.id).join(', ') || 'none'})`);
