#!/usr/bin/env node
/**
 * Refresh authority-templates.json → verifiedUserFamilies from the completed catalog.
 * Excludes hand / gauge / variant (not allowed for custom-model mounts).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cat = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json'), 'utf8'));
const templatesPath = path.join(root, 'data/authority-templates.json');
const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
const blocked = new Set(['variant', 'hand', 'gauge']);
const fams = [...new Set(cat.map((m) => m.family).filter((f) => f && !blocked.has(f)))].sort();
templates.verifiedUserFamilies = fams;
fs.writeFileSync(templatesPath, `${JSON.stringify(templates, null, 2)}\n`);
console.log(`verifiedUserFamilies=${fams.length}`);
