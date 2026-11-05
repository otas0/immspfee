#!/usr/bin/env node
/**
 * 把权威来源 / 假设 / 保真度 / 弃用标记写入 catalog.json 与 models.json。
 * 模板：data/authority-templates.json（族级 + 手写 id 覆盖）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const templates = JSON.parse(fs.readFileSync(path.join(root, 'data/authority-templates.json'), 'utf8'));
const families = templates.families || {};
const ids = templates.ids || {};
const deprecatedFamilies = templates.deprecatedFamilies || {};

export function stampEntry(entry) {
  const fam = families[entry.family] || families.gauge;
  const byId = ids[entry.id] || {};
  const depReason = deprecatedFamilies[entry.family];
  const next = { ...entry };
  const staleAuth = !entry.authority || String(entry.authority).includes('占位量表');
  const staleAsm = !entry.assumptions || String(entry.assumptions).includes('不保证与模型名称');
  next.authority = staleAuth ? (byId.authority || fam.authority) : entry.authority;
  next.assumptions = staleAsm ? (byId.assumptions || fam.assumptions) : entry.assumptions;
  next.fidelity = entry.fidelity || byId.fidelity || fam.fidelity || 'principle';
  if (depReason && entry.family !== 'hand') {
    next.deprecated = true;
    next.deprecatedReason = depReason;
  } else {
    delete next.deprecated;
    delete next.deprecatedReason;
  }
  return next;
}

function stampFile(rel) {
  const file = path.join(root, rel);
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = list.map(stampEntry);
  fs.writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
  const missing = out.filter((m) => !m.authority || String(m.authority).length < 8 || !m.assumptions);
  const dep = out.filter((m) => m.deprecated).length;
  console.log(`${rel}: n=${out.length} missing=${missing.length} deprecated=${dep}`);
  return missing.length;
}

const missing = stampFile('data/catalog.json') + stampFile('data/models.json');
if (missing) {
  console.error('stamp left entries without authority');
  process.exit(1);
}
console.log('authority stamp ok');
